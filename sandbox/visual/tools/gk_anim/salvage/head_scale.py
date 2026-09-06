# HEAD-GEOMETRY BODY SCALE (the low-save method): head blob = face skin + adjacent hair; box diagonal and PCA major extent vs GK_BASE_V1
# set/west.png. For Pro art the head is drawn smaller relative to the body than the stylised base, so the head ratio over-reads the body
# scale; the correction is taken from the Pro sprites whose body scale is already established (DIVE_NORTH 0.72 by body length).
#   python3 head_scale.py            (prints the table)
import math, json, sys
from PIL import Image
def load(p): im = Image.open(p).convert("RGBA"); return im.load(), im.size
def skin(p): r, g, b, a = p; return a >= 128 and r > 105 and r >= g >= b and (r - b) >= 28 and not (r > 225 and g > 215)
def dark(p): r, g, b, a = p; return a >= 128 and max(r, g, b) < 70
def head_blob(px, box, grow=2, iters=6):
    x0, y0, x1, y1 = box
    S = {(x, y) for y in range(y0, y1) for x in range(x0, x1) if skin(px[x, y])}
    H, frontier = set(), set(S)
    for _ in range(iters):
        new = set()
        for (x, y) in frontier:
            for dx in range(-grow, grow + 1):
                for dy in range(-grow, grow + 1):
                    q = (x + dx, y + dy)
                    if x0 <= q[0] < x1 and y0 <= q[1] < y1 and q not in S and q not in H and dark(px[q[0], q[1]]): new.add(q)
        if not new: break
        H |= new; frontier = new
    pts = list(S | H); xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    n = len(pts); mx = sum(xs) / n; my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs) / n; syy = sum((y - my) ** 2 for y in ys) / n; sxy = sum((x - mx) * (y - my) for x, y in pts) / n
    th = 0.5 * math.atan2(2 * sxy, sxx - syy); ux, uy = math.cos(th), math.sin(th)
    proj = [(x - mx) * ux + (y - my) * uy for x, y in pts]; major = max(proj) - min(proj) + 1
    return dict(skin=len(S), hair=len(H), box=(bw, bh), diag=round(math.hypot(bw, bh), 2), major=round(major, 2), centre=(round(mx, 1), round(my, 1)))
SOURCES = [  # (label, path, head box (x0,y0,x1,y1), established body scale or None)
    ("GK_BASE_V1 set/west", "assets/visual_v1/originals/character_f4838361/set/west.png", (50, 12, 84, 38), 1.0),
    ("LOW_SIDE_SW (GK_POSE_114)", "assets/visual_v1/goalkeeper/contextual/LOW_SIDE_SW.png", None, 0.86),
    ("LOW_SIDE_W (GK_POSE_115)", "assets/visual_v1/goalkeeper/contextual/LOW_SIDE_W.png", None, 0.87),
    ("DIVE_NORTH_RAW (Pro)", "assets/visual_v1/goalkeeper/contextual/sources/DIVE_NORTH_RAW.png", None, 0.72),
    ("SW_FAR_DIVE_RAW (Pro)", "assets/visual_v1/goalkeeper/contextual/sources/SW_FAR_DIVE_RAW.png", None, 0.74),
    ("LOW_DIVE_LEFT_RAW (Pro, user-picked 0.60)", "assets/visual_v1/goalkeeper/contextual/sources/LOW_DIVE_LEFT_RAW.png", None, 0.60),
    ("SOUTH_V6_CLEAN_MIRRORED (Pro)", "review_artifacts/gk_south_v6_calibration/SOUTH_V6_CLEAN_MIRRORED.png", (93, 74, 118, 104), None),
]
def auto_head_box(px, size):
    """for the reference stills: the topmost skin cluster (these poses all have the head at the top of the content)"""
    W, H = size; S = [(x, y) for y in range(H) for x in range(W) if skin(px[x, y])]
    top = min(q[1] for q in S); head = [q for q in S if q[1] < top + 24]
    xs = [q[0] for q in head]; ys = [q[1] for q in head]
    return (min(xs) - 8, min(ys) - 10, max(xs) + 9, max(ys) + 8)
rows = []
for label, path, box, est in SOURCES:
    px, size = load(path); b = box or auto_head_box(px, size); m = head_blob(px, b)
    rows.append((label, path, b, est, m))
ref = rows[0][4]
print(f"{'source':44s} {'head box':10s} {'diag':>6s} {'ratio':>6s} {'major':>6s} {'ratio':>6s} {'established':>11s} {'implied Pro corr (ratio/established)':>36s}")
out = []
for label, path, b, est, m in rows:
    rd, rm = ref["diag"] / m["diag"], ref["major"] / m["major"]
    corr = f"{(rd / est):.3f} / {(rm / est):.3f}" if est else "—"
    print(f"{label:44s} {m['box'][0]:2d}x{m['box'][1]:<7d} {m['diag']:6.2f} {rd:6.3f} {m['major']:6.2f} {rm:6.3f} {str(est):>11s} {corr:>36s}")
    out.append(dict(label=label, path=path, head_box=b, measure=m, ratio_diag=round(rd, 3), ratio_major=round(rm, 3), established=est))
json.dump(out, open("review_artifacts/gk_south_v6_calibration/head_scale_table.json", "w"), indent=1)
