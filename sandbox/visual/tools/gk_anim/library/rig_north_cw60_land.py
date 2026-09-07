# LANDING RIG — DIVE_NORTH_CW60 with the sleeve split at the ELBOW (both arms are one drawn part in this art, so they fold as a pair):
# sleeve_up (shoulder → elbow) and sleeve_fore (elbow → gloves), gloves re-parented to the forearm. Everything else is rig_north_cw60.
# Presentation tooling for the post-contact / landing frames only; the contact frame itself stays the untouched PNG.
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import Rig, Part, Source
import rig_north_cw60 as CW60
ROOT = CW60.ROOT
ELBOW_T = 0.47        # elbow at 47 % of the shoulder → lead-glove line


def _clip(poly, a, b, keep_side):
    """Sutherland–Hodgman clip of `poly` against the line through a→b; keep_side = +1 keeps the left side of a→b, −1 the right"""
    def side(p): return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    out = []; n = len(poly)
    for i in range(n):
        P, Q = poly[i], poly[(i + 1) % n]; sp, sq = side(P) * keep_side, side(Q) * keep_side
        if sp >= 0: out.append(P)
        if (sp >= 0) != (sq >= 0):
            t = sp / (sp - sq); out.append((P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t))
    return out


def build():
    R60, _ = CW60.build()
    src = Source(CW60.CW60, label="DIVE_NORTH_CW60")
    sl = R60.parts["sleeve"]; sh = sl.pivot; ga = R60.parts["glove_A"].pivot
    elbow = (sh[0] + (ga[0] - sh[0]) * ELBOW_T, sh[1] + (ga[1] - sh[1]) * ELBOW_T)
    # the cut line is perpendicular to the arm axis through the elbow
    ax, ay = ga[0] - sh[0], ga[1] - sh[1]; L = math.hypot(ax, ay); ux, uy = ax / L, ay / L
    a = (elbow[0] - uy * 60, elbow[1] + ux * 60); b = (elbow[0] + uy * 60, elbow[1] - ux * 60)          # a→b along the perpendicular
    fore_poly = _clip(sl.poly, a, b, +1 if ((ga[0] - a[0]) * (b[1] - a[1]) - (ga[1] - a[1]) * (b[0] - a[0])) > 0 else -1)
    up_poly = _clip(sl.poly, a, b, -1 if ((ga[0] - a[0]) * (b[1] - a[1]) - (ga[1] - a[1]) * (b[0] - a[0])) > 0 else +1)
    R = Rig("NORTH_CW60_LAND")
    for name in R60.order:
        p = R60.parts[name]
        if name == "sleeve":
            R.add(Part("sleeve_fore", src, fore_poly, pivot=elbow, parent="sleeve_up", attach=elbow, z=p.z + 1, classes=p.classes, colour=(90, 190, 40), bone={"to": ga, "w": 9, "rgba": (120, 215, 30, 255)}))
            R.add(Part("sleeve_up", src, up_poly, pivot=p.pivot, parent=p.parent, attach=p.attach, z=p.z, classes=p.classes, colour=p.colour, bone={"to": elbow, "w": 10, "rgba": (120, 215, 30, 255)}))
        elif name in ("glove_A", "glove_B"):
            R.add(Part(name, src, p.poly, pivot=p.pivot, parent="sleeve_fore", attach=p.attach, z=p.z, classes=p.classes, colour=p.colour, bone=p.bone))
        else:
            R.add(Part(name, src, p.poly, pivot=p.pivot, parent=p.parent, attach=p.attach, z=p.z, classes=p.classes, colour=p.colour, bone=p.bone))
    left = R.assign()
    for key, pts in list(left.items()):
        for (x, y) in pts:
            best = None
            for n in R.order:
                for (px, py) in R.parts[n].pixels:
                    d = (px - x) ** 2 + (py - y) ** 2
                    if best is None or d < best[0]: best = (d, n)
                    if d <= 1: break
                if best and best[0] <= 1: break
            if best: R.parts[best[1]].pixels.add((x, y))
        left[key] = []
    R.elbow = elbow
    return R, left


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    R, left = build()
    for n in R.order: print(f"{n:12s} z{R.parts[n].z:2d} pivot {tuple(round(v,1) for v in R.parts[n].pivot)} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    from PIL import Image
    src = Image.open(CW60.CW60).convert("RGBA"); W, H = src.size
    R.viz(scale=6, canvas=(W, H), title="NORTH_CW60_LAND rig").save(os.path.join(out, "rig_NORTH_CW60_LAND_viz.png"))
    img, M = R.render({}, canvas=(W, H)); img.save(os.path.join(out, "rig_NORTH_CW60_LAND_rest.png"))
    diff = sum(1 for y in range(H) for x in range(W) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff, "| elbow", tuple(round(v, 1) for v in R.elbow))
    # a folded-arm test render (elbows bent 60°) to prove the joint works
    img2, _ = R.render({"sleeve_fore": {"rot": 60}}, canvas=(W + 20, H)); img2.save(os.path.join(out, "rig_NORTH_CW60_LAND_fold_test.png"))
