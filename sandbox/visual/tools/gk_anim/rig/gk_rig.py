# GK RIG — articulated pixel-component model for goalkeeper sprites (presentation tooling only; nothing here touches the runtime).
#
# A Rig is a set of Parts cut out of ONE OR MORE source sprites by polygons (+ optional colour-class filters) with a joint hierarchy.
# Every part keeps its ORIGINAL pixels; posing = per-part rotation about its own pivot (proximal joint) and integer translation,
# composed down the hierarchy. Rendering is inverse-mapped nearest-neighbour (no holes, no filtering, no scaling), composited in an
# explicit draw order. Pivots are in the part's own source-sprite pixel coordinates; a parent's `attach` point (where the child's
# pivot sits) is in the parent's source coordinates, so a child can come from a different sprite than its parent.
import json, math
from PIL import Image, ImageDraw, ImageFont

def cls_of(p):
    r, g, b, a = p
    if a == 0: return "T"
    if r < 70 and g < 70 and b < 70: return "K"
    if g > r + 25 and g > b + 25: return "G"
    if r > 185 and g > 185 and b > 170: return "W"
    if r > 110 and r >= g >= b: return "S"
    return "?"

def point_in_poly(x, y, poly):
    inside = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi: inside = not inside
    return inside

def mat_mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
def mat_trans(dx, dy): return [[1, 0, dx], [0, 1, dy], [0, 0, 1]]
def mat_rot(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg)); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]
def mat_apply(M, x, y): return (M[0][0] * x + M[0][1] * y + M[0][2], M[1][0] * x + M[1][1] * y + M[1][2])
def mat_inv(M):
    a, b, c = M[0]; d, e, f = M[1]; det = a * e - b * d
    return [[e / det, -b / det, (b * f - c * e) / det], [-d / det, a / det, (c * d - a * f) / det], [0, 0, 1]]

class Source:
    """one source sprite (optionally mirrored horizontally before anything else is measured)"""
    def __init__(self, path, mirror=False, label=None):
        im = Image.open(path).convert("RGBA")
        if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        self.im, self.px, self.path, self.mirror = im, im.load(), path, mirror
        self.label = label or path.split("/")[-1] + (" (mirrored)" if mirror else "")
        self.w, self.h = im.size

class Part:
    def __init__(self, name, source, poly, pivot, parent=None, attach=None, z=0, classes=None, exclude=None, include=None, colour=None, bone=None):
        self.name, self.src, self.poly, self.pivot, self.parent = name, source, poly, tuple(pivot), parent
        self.bone = bone      # optional {"to": (x,y) distal point in source coords, "w": width px, "rgba": colour}: a capsule drawn UNDER the part
        self.attach = tuple(attach) if attach else None   # where this part's pivot sits, in the PARENT's source coords (default: pivot itself)
        self.z, self.classes, self.exclude, self.include = z, classes, set(map(tuple, exclude or [])), set(map(tuple, include or []))
        self.colour = colour or (200, 200, 200)
        self.pixels = set()

class Rig:
    def __init__(self, name):
        self.name, self.parts, self.order = name, {}, []
    def add(self, part):
        self.parts[part.name] = part; self.order.append(part.name); return part
    def assign(self):
        """cut every source into parts: a pixel goes to the FIRST part (in declaration order) whose polygon contains its centre and
        whose class filter admits it; explicit include/exclude lists override. Returns the unassigned opaque pixels per source."""
        for p in self.parts.values(): p.pixels = set()
        leftovers = {}
        sources = {}
        for p in self.parts.values(): sources.setdefault(id(p.src), p.src)
        for src in sources.values():
            for y in range(src.h):
                for x in range(src.w):
                    if src.px[x, y][3] == 0: continue
                    c = cls_of(src.px[x, y]); owner = None
                    for name in self.order:
                        p = self.parts[name]
                        if p.src is not src: continue
                        if (x, y) in p.exclude: continue
                        if (x, y) in p.include: owner = p; break
                        if point_in_poly(x + 0.5, y + 0.5, p.poly) and (p.classes is None or c in p.classes): owner = p; break
                    if owner: owner.pixels.add((x, y))
                    else: leftovers.setdefault(src.label, []).append((x, y))
        return leftovers
    def world(self, pose):
        """pose: {part: {"rot": deg, "dx": px, "dy": px}} → world matrices per part (source coords → canvas coords, before canvas offset)"""
        M = {}
        def get(name):
            if name in M: return M[name]
            p = self.parts[name]; q = pose.get(name, {})
            rot, dx, dy = q.get("rot", 0), q.get("dx", 0), q.get("dy", 0)
            sx, sy = q.get("sx", 1.0), q.get("sy", 1.0)                                          # optional non-uniform scale about the pivot (nearest-neighbour; foreshortening only)
            px, py = p.pivot
            scale = [[sx, 0, 0], [0, sy, 0], [0, 0, 1]]
            local = mat_mul(mat_trans(px, py), mat_mul(mat_rot(rot), mat_mul(scale, mat_trans(-px, -py))))   # scale, then rotate, about own pivot
            local = mat_mul(mat_trans(dx, dy), local)                                             # then translate
            if p.parent:
                par = self.parts[p.parent]; at = p.attach or p.pivot
                pe = pose.get(p.parent, {}).get("ext", 0)
                if pe and par.bone:                                                                # parent bone extended → this child rides out along it
                    to = par.bone["to"]; L = math.hypot(to[0] - par.pivot[0], to[1] - par.pivot[1]) or 1.0
                    at = (at[0] + (to[0] - par.pivot[0]) / L * pe, at[1] + (to[1] - par.pivot[1]) / L * pe)
                seat = mat_trans(at[0] - px, at[1] - py)                                           # put the pivot on the parent's attach point
                M[name] = mat_mul(get(p.parent), mat_mul(seat, local))
            else: M[name] = local
            return M[name]
        for n in self.order: get(n)
        return M
    def render(self, pose, canvas=(160, 200), offset=(0, 0), draw_order=None, hide=()):
        """nearest-neighbour inverse mapping per part, integer canvas. offset = where source (0,0) lands on the canvas for the root."""
        W, H = canvas; out = Image.new("RGBA", canvas, (0, 0, 0, 0)); op = out.load()
        M = self.world(pose)
        order = draw_order or sorted(self.order, key=lambda n: self.parts[n].z)
        placed = {}; owner = {}
        children = {n: [c for c in self.order if self.parts[c].parent == n] for n in self.order}
        def posed(n):                                    # is this part (or any ancestor) away from rest? bones only matter then
            while n:
                q = pose.get(n, {})
                if any(q.get(k) for k in ("rot", "dx", "dy", "ext")) or q.get("sx", 1) != 1 or q.get("sy", 1) != 1: return True
                n = self.parts[n].parent
            return False
        for name in order:
            if name in hide: continue
            p = self.parts[name]
            if not p.pixels: continue
            Mw = mat_mul(mat_trans(offset[0], offset[1]), M[name]); Mi = mat_inv(Mw)
            if p.bone and (posed(name) or any(posed(c) for c in children[name])):
                # capsule between the pivot and the distal point, under the part's own pixels. It may only fill canvas pixels that are
                # still empty or that belong to this part's own joint neighbours (parent / children) — never another part's pixels —
                # and it is drawn only when the chain is posed away from rest, so the rest pose stays pixel-identical to the source.
                to = p.bone["to"]; ext = pose.get(name, {}).get("ext", 0)
                if ext:                                    # extend the bone beyond its distal point (the child part is translated to match)
                    L = math.hypot(to[0] - p.pivot[0], to[1] - p.pivot[1]) or 1.0
                    to = (to[0] + (to[0] - p.pivot[0]) / L * ext, to[1] + (to[1] - p.pivot[1]) / L * ext)
                a = mat_apply(Mw, *p.pivot); b = mat_apply(Mw, *to); r = p.bone.get("w", 3) / 2.0; col = tuple(p.bone["rgba"])
                allowed = {None, p.parent} | set(children[name])
                for v in range(max(0, int(min(a[1], b[1]) - r - 1)), min(H, int(max(a[1], b[1]) + r + 2))):
                    for u in range(max(0, int(min(a[0], b[0]) - r - 1)), min(W, int(max(a[0], b[0]) + r + 2))):
                        if owner.get((u, v)) not in allowed: continue
                        px_, py_ = u + 0.5, v + 0.5; abx, aby = b[0] - a[0], b[1] - a[1]; L2 = abx * abx + aby * aby
                        t = 0 if L2 == 0 else max(0, min(1, ((px_ - a[0]) * abx + (py_ - a[1]) * aby) / L2))
                        if math.hypot(px_ - (a[0] + t * abx), py_ - (a[1] + t * aby)) <= r: op[u, v] = col; owner[(u, v)] = name
            xs = [x for x, _ in p.pixels]; ys = [y for _, y in p.pixels]
            corners = [mat_apply(Mw, cx, cy) for cx in (min(xs), max(xs) + 1) for cy in (min(ys), max(ys) + 1)]
            u0, u1 = int(math.floor(min(c[0] for c in corners))) - 1, int(math.ceil(max(c[0] for c in corners))) + 1
            v0, v1 = int(math.floor(min(c[1] for c in corners))) - 1, int(math.ceil(max(c[1] for c in corners))) + 1
            n = 0
            for v in range(max(0, v0), min(H, v1)):
                for u in range(max(0, u0), min(W, u1)):
                    sx, sy = mat_apply(Mi, u + 0.5, v + 0.5); ix, iy = int(math.floor(sx)), int(math.floor(sy))
                    if (ix, iy) in p.pixels:
                        op[u, v] = p.src.px[ix, iy]; owner[(u, v)] = name; n += 1
            placed[name] = n
        return out, M
    def owner_map(self, pose, canvas=(160, 200), offset=(0, 0), draw_order=None, hide=()):
        """which part owns each rendered canvas pixel (same inverse mapping and order as render); for measurements"""
        W, H = canvas; own = {}
        M = self.world(pose)
        order = draw_order or sorted(self.order, key=lambda n: self.parts[n].z)
        for name in order:
            if name in hide: continue
            p = self.parts[name]
            if not p.pixels: continue
            Mw = mat_mul(mat_trans(offset[0], offset[1]), M[name]); Mi = mat_inv(Mw)
            xs = [x for x, _ in p.pixels]; ys = [y for _, y in p.pixels]
            corners = [mat_apply(Mw, cx, cy) for cx in (min(xs), max(xs) + 1) for cy in (min(ys), max(ys) + 1)]
            u0, u1 = int(math.floor(min(c[0] for c in corners))) - 1, int(math.ceil(max(c[0] for c in corners))) + 1
            v0, v1 = int(math.floor(min(c[1] for c in corners))) - 1, int(math.ceil(max(c[1] for c in corners))) + 1
            for v in range(max(0, v0), min(H, v1)):
                for u in range(max(0, u0), min(W, u1)):
                    sx, sy = mat_apply(Mi, u + 0.5, v + 0.5); ix, iy = int(math.floor(sx)), int(math.floor(sy))
                    if (ix, iy) in p.pixels: own[(u, v)] = name
        return own
    def joint_screen(self, M, name, offset=(0, 0)):
        p = self.parts[name]; x, y = mat_apply(M[name], *p.pivot); return (x + offset[0], y + offset[1])
    def viz(self, pose=None, scale=6, canvas=(160, 200), offset=(0, 0), title=None):
        """component colour map + pivots + bones, at integer zoom"""
        pose = pose or {}
        W, H = canvas; img = Image.new("RGB", (W * scale, H * scale), (238, 238, 240)); d = ImageDraw.Draw(img)
        M = self.world(pose)
        for name in sorted(self.order, key=lambda n: self.parts[n].z):
            p = self.parts[name]
            Mw = mat_mul(mat_trans(offset[0], offset[1]), M[name]); Mi = mat_inv(Mw)
            if not p.pixels: continue
            xs = [x for x, _ in p.pixels]; ys = [y for _, y in p.pixels]
            corners = [mat_apply(Mw, cx, cy) for cx in (min(xs), max(xs) + 1) for cy in (min(ys), max(ys) + 1)]
            u0, u1 = int(math.floor(min(c[0] for c in corners))) - 1, int(math.ceil(max(c[0] for c in corners))) + 1
            v0, v1 = int(math.floor(min(c[1] for c in corners))) - 1, int(math.ceil(max(c[1] for c in corners))) + 1
            for v in range(max(0, v0), min(H, v1)):
                for u in range(max(0, u0), min(W, u1)):
                    sx, sy = mat_apply(Mi, u + 0.5, v + 0.5); ix, iy = int(math.floor(sx)), int(math.floor(sy))
                    if (ix, iy) in p.pixels:
                        r, g, b, a = p.src.px[ix, iy]; l = (r * 30 + g * 59 + b * 11) // 100
                        cr, cg, cb = p.colour; col = ((cr * 2 + l) // 3, (cg * 2 + l) // 3, (cb * 2 + l) // 3)
                        d.rectangle([u * scale, v * scale, (u + 1) * scale - 1, (v + 1) * scale - 1], fill=col)
        for name in self.order:
            p = self.parts[name]
            if p.parent:
                a = self.joint_screen(M, name, offset); b = self.joint_screen(M, p.parent, offset)
                d.line([(a[0] * scale, a[1] * scale), (b[0] * scale, b[1] * scale)], fill=(40, 40, 40), width=2)
        for name in self.order:
            p = self.parts[name]; a = self.joint_screen(M, name, offset); r = scale * 0.7
            d.ellipse([a[0] * scale - r, a[1] * scale - r, a[0] * scale + r, a[1] * scale + r], fill=(255, 40, 40), outline=(0, 0, 0))
        if title:
            f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 14); d.text((6, 4), title, font=f, fill=(20, 20, 24))
        return img
    def legend(self, scale=6):
        f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
        rows = [n for n in sorted(self.order, key=lambda n: self.parts[n].z)]
        img = Image.new("RGB", (330, 18 * len(rows) + 30), (238, 238, 240)); d = ImageDraw.Draw(img)
        d.text((6, 4), "draw order (back → front), pivot = red dot", font=f, fill=(20, 20, 24))
        for i, n in enumerate(rows):
            p = self.parts[n]; y = 24 + i * 18
            d.rectangle([8, y + 2, 22, y + 14], fill=p.colour, outline=(0, 0, 0))
            d.text((28, y), f"z{p.z:2d} {n:16s} pivot {p.pivot}" + (f"  ← {p.parent}" if p.parent else "  (root)") + f"  {len(p.pixels)} px", font=f, fill=(20, 20, 24))
        return img
    def to_json(self):
        return {"rig": self.name, "parts": [{"name": n, "source": self.parts[n].src.path, "mirrored": self.parts[n].src.mirror, "poly": self.parts[n].poly,
                                            "pivot": self.parts[n].pivot, "parent": self.parts[n].parent, "attach": self.parts[n].attach, "z": self.parts[n].z,
                                            "classes": sorted(self.parts[n].classes) if self.parts[n].classes else None, "pixels": len(self.parts[n].pixels)} for n in self.order]}
