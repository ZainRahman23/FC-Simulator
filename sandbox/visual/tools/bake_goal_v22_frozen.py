#!/usr/bin/env python3
"""One-time authoring bake: rectify Goal V2.2 into the frozen CAMERA_V1
projection (deterministic local image processing; V2.2 files untouched).

Three measured art panels (mouth plane, roof net, near-side net; the back net
is baked through-view content inside them) are homography-mapped onto the
authoritative frozen box-goal faces:
    mouth 7.32 x 2.44 m exactly on the goal line, depth 2.0 m, rear 2.44 m.
Shared panel edges map to identical destination lines (no seams). Outer
edges carry a margin so the natural sag silhouette survives. Resampling is
cord-preserving: each destination pixel takes the best structural sample of
its source footprint (max alpha, structure-biased) — nearest-neighbour
family, no blur, no halos, no broken cords.

Outputs (derived assets; originals byte-identical):
  assets/visual_v1/originals/goal_v2_oblique/goal_v2_3_frozen_bake.png
  assets/visual_v1/originals/goal_v2_oblique/goal_v2_3_frozen_bake.json
plus comparison images under sandbox/visual/compare/.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "assets/visual_v1/originals/goal_v2_oblique/goal_v2_2_surgical.png"
OUT_PNG = ROOT / "assets/visual_v1/originals/goal_v2_oblique/goal_v2_3_frozen_bake.png"
OUT_JSON = ROOT / "assets/visual_v1/originals/goal_v2_oblique/goal_v2_3_frozen_bake.json"
CMP = ROOT / "sandbox/visual/compare"

# ── frozen CAMERA_V1 projection (must mirror match.js buildFrozenBasis) ──
AUTHOR = {"height": 30, "dist": 43, "fov": 28, "depthoff": 3, "pitch": 22, "yaw": 0}
VIEW_W, VIEW_H = 1280, 720
_th = AUTHOR["pitch"] * math.pi / 180
_fy, _fh = -math.sin(_th), math.cos(_th)
C = (52.5, AUTHOR["height"], 68 + AUTHOR["dist"])
FPX = (VIEW_H / 2) / math.tan((AUTHOR["fov"] * math.pi / 180) / 2)

def vproj3(wx, wy, wz):
    vx, vy, vz = wx - C[0], wy - C[1], wz - C[2]
    cy = vy * _fh + vz * _fy
    cz = vy * _fy + vz * (-_fh)
    return (VIEW_W / 2 + FPX * vx / cz, VIEW_H / 2 - FPX * cy / cz)

# ── authoritative frozen destination geometry (right goal) ──
GX, DEPTH, H, RH = 105.0, 2.0, 2.44, 2.44
YF, YN = 30.34, 37.66
FT = vproj3(GX, H, YF);  NT = vproj3(GX, H, YN)
FF = vproj3(GX, 0, YF);  NF = vproj3(GX, 0, YN)
RFT = vproj3(GX + DEPTH, RH, YF); RNT = vproj3(GX + DEPTH, RH, YN)
RFG = vproj3(GX + DEPTH, 0, YF);  RNG = vproj3(GX + DEPTH, 0, YN)

# ── measured V2.2 correspondence points (art px) ──
aFT, aNT = (42, 40), (105, 183)          # front post tops (crossbar ends)
aFF, aNF = (44, 194), (94, 327)          # front post feet
aRFT, aRNT = (168, 40), (232, 186)       # rear top corners
aRNG = (222, 320)                        # rear near ground
# (rear far ground (160,181) is interior/occluded content; not a panel corner)

# panels: (source quad, destination quad, outer-edge expansion per edge px)
# edges are (v0->v1, v1->v2, v2->v3, v3->v0); expansion in DEST pixels.
PANELS = [
    ("mouth", [aFT, aNT, aNF, aFF], [FT, NT, NF, FF],   [0, 0, 4, 6]),
    ("roof",  [aFT, aRFT, aRNT, aNT], [FT, RFT, RNT, NT], [3, 8, 0, 0]),
    ("side",  [aNT, aRNT, aRNG, aNF], [NT, RNT, RNG, NF], [0, 8, 4, 0]),
]

def homography(src, dst):
    """4-point homography src->dst (rows of 3x3 matrix)."""
    A, b = [], []
    for (x, y), (X, Y) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.append(Y)
    # solve 8x8 (Gaussian elimination)
    M = [row[:] + [bb] for row, bb in zip(A, b)]
    n = 8
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i and M[r][i] != 0:
                f = M[r][i] / M[i][i]
                for c2 in range(i, n + 1):
                    M[r][c2] -= f * M[i][c2]
    h = [M[i][8] / M[i][i] for i in range(n)] + [1.0]
    return [h[0:3], h[3:6], h[6:9]]

def apply_h(Hm, x, y):
    d = Hm[2][0] * x + Hm[2][1] * y + Hm[2][2]
    return ((Hm[0][0] * x + Hm[0][1] * y + Hm[0][2]) / d,
            (Hm[1][0] * x + Hm[1][1] * y + Hm[1][2]) / d)

def expand_quad(q, exp):
    """Offset each edge outward by exp[i] px (outward = away from centroid)."""
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    lines = []
    for i in range(4):
        a, b2 = q[i], q[(i + 1) % 4]
        dx, dy = b2[0] - a[0], b2[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L                    # normal
        mx, my = (a[0] + b2[0]) / 2 - cx, (a[1] + b2[1]) / 2 - cy
        if nx * mx + ny * my < 0: nx, ny = -nx, -ny  # ensure outward
        off = exp[i]
        lines.append(((a[0] + nx * off, a[1] + ny * off), (b2[0] + nx * off, b2[1] + ny * off)))
    out = []
    for i in range(4):
        (a1, a2), (b1, b2q) = lines[(i - 1) % 4], lines[i]
        # intersect the two offset lines
        x1, y1 = a1; x2, y2 = a2; x3, y3 = b1; x4, y4 = b2q
        den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if abs(den) < 1e-9:
            out.append(b1); continue
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
        out.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
    return out

def point_in_poly(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def main():
    art = Image.open(SRC).convert("RGBA")
    apx = art.load()
    AW, AH = art.size
    panels = []
    for name, sq, dq, exp in PANELS:
        Hfwd = homography(sq, dq)
        Hinv = homography(dq, sq)
        dqx = expand_quad(dq, exp)
        panels.append({"name": name, "sq": sq, "dq": dq, "dqx": dqx,
                       "H": Hfwd, "Hi": Hinv})
    # destination raster bbox (V-space)
    xs = [p[0] for pn in panels for p in pn["dqx"]]
    ys = [p[1] for pn in panels for p in pn["dqx"]]
    bx0, by0 = math.floor(min(xs)) - 1, math.floor(min(ys)) - 1
    bx1, by1 = math.ceil(max(xs)) + 1, math.ceil(max(ys)) + 1
    W, Hh = bx1 - bx0, by1 - by0
    out = Image.new("RGBA", (W, Hh), (0, 0, 0, 0))
    opx = out.load()

    def deep_inside(x, y, quad, margin=3.0):
        """point strictly inside quad by ~margin px (art space)"""
        if not point_in_poly(x, y, quad): return False
        for i in range(4):
            a, b2 = quad[i], quad[(i + 1) % 4]
            dx, dy = b2[0] - a[0], b2[1] - a[1]
            L = math.hypot(dx, dy) or 1
            d = abs((x - a[0]) * dy - (y - a[1]) * dx) / L
            if d < margin: return False
        return True

    # cord-preserving footprint sampling: for a dest pixel, examine a 3x3 grid
    # of source positions across its preimage; prefer the most structural
    # sample (alpha, then brightness), never averaging (no blur/halos).
    OFF = [(-0.33, -0.33), (0, -0.33), (0.33, -0.33),
           (-0.33, 0), (0, 0), (0.33, 0),
           (-0.33, 0.33), (0, 0.33), (0.33, 0.33)]
    for py in range(Hh):
        vy = by0 + py + 0.5
        for px_ in range(W):
            vx = bx0 + px_ + 0.5
            pn = None
            for cand in panels:                    # base quads have priority
                if point_in_poly(vx, vy, cand["dq"]): pn = cand; break
            if pn is None:
                for cand in panels:
                    if point_in_poly(vx, vy, cand["dqx"]): pn = cand; break
            if pn is None: continue
            best = None; bestKey = -1
            for ox, oy in OFF:
                sx, sy = apply_h(pn["Hi"], vx + ox, vy + oy)
                ix, iy = int(round(sx)), int(round(sy))
                if not (0 <= ix < AW and 0 <= iy < AH): continue
                # margin content may not steal pixels that belong deep inside
                # ANOTHER panel's source quad
                steal = False
                if not point_in_poly(sx, sy, pn["sq"]):
                    for other in panels:
                        if other is pn: continue
                        if deep_inside(sx, sy, other["sq"]): steal = True; break
                if steal: continue
                r, g, b2, a = apx[ix, iy]
                if a <= 8: continue
                key = a * 2 + (r + g + b2) / 3     # structure bias: alpha then brightness
                if key > bestKey: bestKey = key; best = (r, g, b2, a)
            if best: opx[px_, py] = best
    out.save(OUT_PNG, optimize=True)

    # verification: forward-map the 8 correspondence points
    corr = [("far post foot", aFF, FF, "mouth"), ("near post foot", aNF, NF, "mouth"),
            ("far post top", aFT, FT, "mouth"), ("near post top", aNT, NT, "mouth"),
            ("rear far top", aRFT, RFT, "roof"), ("rear near top", aRNT, RNT, "roof"),
            ("rear near ground", aRNG, RNG, "side"),
            ("rear far ground(dest)", None, RFG, None)]
    report = {}
    print("── correspondence verification (bake-space, zoom 1) ──")
    for label, ap, tv, pname in corr:
        if ap is None:
            print(f"{label:22s} target ({tv[0]:.1f},{tv[1]:.1f}) [interior content]")
            continue
        pn = next(p for p in panels if p["name"] == pname)
        mx, my = apply_h(pn["H"], *ap)
        e = math.hypot(mx - tv[0], my - tv[1])
        report[label] = round(e, 4)
        print(f"{label:22s} mapped ({mx:.2f},{my:.2f}) target ({tv[0]:.2f},{tv[1]:.2f}) err {e:.4f}px")
    meta = {
        "derived_from": "goal_v2_2_surgical.png (byte-untouched)",
        "author_projection": AUTHOR, "view": [VIEW_W, VIEW_H],
        "v_offset": [bx0, by0], "size": [W, Hh],
        "dest_geometry": {"mouth_m": [7.32, 2.44], "depth_m": DEPTH, "rear_h_m": RH,
                          "goal_line_x_m": GX},
        "correspondence_errors_px": report,
        "panels": [{"name": p["name"], "src_quad": p["sq"],
                    "dst_quad": [[round(a, 2), round(b, 2)] for a, b in p["dq"]]}
                   for p in panels],
        "mirror_rule": "left goal = horizontal mirror about V x=640 (projection is x-symmetric)",
    }
    OUT_JSON.write_text(json.dumps(meta, indent=1))
    print(f"\nbaked: {W}x{Hh} at V offset ({bx0},{by0}) -> {OUT_PNG.name}")

    # ── comparison images ──
    CMP.mkdir(exist_ok=True)
    def on_bg(img, scale=1, bg=(25, 60, 25, 255)):
        b2 = Image.new("RGBA", img.size, bg); b2.alpha_composite(img)
        return b2.resize((img.width * scale, img.height * scale), Image.NEAREST)
    # panel 1: original vs bake (x2)
    a2 = on_bg(art, 2); b2i = on_bg(out, 2)
    pan = Image.new("RGBA", (a2.width + b2i.width + 24, max(a2.height, b2i.height)), (18, 22, 27, 255))
    pan.paste(a2, (0, 0)); pan.paste(b2i, (a2.width + 24, 0))
    pan.save(CMP / "goal_v23_vs_v22.png")
    # panel 2: bake over frozen pitch geometry (goal line, six-yard, box)
    ctxW, ctxH = W + 260, Hh + 160
    ctx = Image.new("RGBA", (ctxW, ctxH), (34, 102, 38, 255))
    dr = ImageDraw.Draw(ctx)
    ox, oy = 130 - 0, 80                     # context origin: V -> ctx offset
    def V2C(p): return (p[0] - bx0 + ox - 130 + 130, p[1] - by0 + oy)
    def wline(w1, w2, width=2, fill=(250, 250, 250, 235)):
        a = V2C(vproj3(*w1)); b3 = V2C(vproj3(*w2))
        dr.line([a, b3], fill=fill, width=width)
    for seg in [((GX, 0, 20), (GX, 0, 48)),                       # goal line
                ((GX - 5.5, 0, YF - 5.5 + 0), (GX, 0, YF - 5.5)),  # (approx 6yd edges)
                ((GX - 5.5, 0, 24.84), (GX - 5.5, 0, 43.16)),
                ((GX - 5.5, 0, 24.84), (GX, 0, 24.84)),
                ((GX - 5.5, 0, 43.16), (GX, 0, 43.16))]:
        wline(*seg)
    ctx.alpha_composite(out, (130, 80))
    for wpt in [(GX, 0, YF), (GX, 0, YN)]:
        p = V2C(vproj3(*wpt))
        dr.ellipse([p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3], fill=(255, 60, 60, 255))
    ctx.resize((ctx.width * 2, ctx.height * 2), Image.NEAREST).save(CMP / "goal_v23_on_pitch.png")
    # panel 3: gameplay scale (zoom 1.0 == V scale, and zoom 1.5)
    ctx.save(CMP / "goal_v23_gameplay_z1.png")
    ctx.resize((int(ctx.width * 1.5), int(ctx.height * 1.5)), Image.NEAREST).save(CMP / "goal_v23_gameplay_z15.png")
    print("comparison images written to sandbox/visual/compare/")

if __name__ == "__main__":
    main()
