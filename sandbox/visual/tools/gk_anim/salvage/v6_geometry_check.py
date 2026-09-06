# GEOMETRY LOCK CHECK for the V6 manual cleanup: measures the locked quantities on the original and the cleaned sprite
# and prints the deltas. All landmarks are measured the same way on both files.
#   python3 v6_geometry_check.py <orig.png> <clean.png> [report.json]
import sys, json, math
from PIL import Image

A, B = sys.argv[1], sys.argv[2]
REPORT = sys.argv[3] if len(sys.argv) > 3 else None

def load(p):
    im = Image.open(p).convert("RGBA"); return im, im.load()

def cls(p):
    r, g, b, a = p
    if a == 0: return "T"
    if r < 70 and g < 70 and b < 70: return "K"            # black: hair, shorts, boots, outlines
    if g > r + 25 and g > b + 25: return "G"               # kit green (any shade)
    if r > 185 and g > 185 and b > 170: return "W"         # glove white
    if r > 110 and r >= g >= b: return "S"                 # skin
    return "?"

def centroid(pts):
    n = len(pts); return (round(sum(p[0] for p in pts) / n, 2), round(sum(p[1] for p in pts) / n, 2)) if n else None

def measure(p):
    im, px = load(p)
    W, H = im.size
    op = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] > 0]
    n = len(op); mx = sum(q[0] for q in op) / n; my = sum(q[1] for q in op) / n
    sxx = sum((q[0] - mx) ** 2 for q in op) / n; syy = sum((q[1] - my) ** 2 for q in op) / n
    sxy = sum((q[0] - mx) * (q[1] - my) for q in op) / n
    axis = math.degrees(0.5 * math.atan2(2 * sxy, sxx - syy)) % 180
    tr, det = sxx + syy, sxx * syy - sxy * sxy
    l1 = tr / 2 + math.sqrt(max(tr * tr / 4 - det, 0)); l2 = tr / 2 - math.sqrt(max(tr * tr / 4 - det, 0))
    bb = im.getbbox()
    # landmark windows (fixed, identical for both files): head = skin+hair cluster, torso = green, hips = shorts black
    head  = [(x, y) for (x, y) in op if 60 <= x <= 82 and 76 <= y <= 101 and cls(px[x, y]) in ("S", "K")]
    torso = [(x, y) for (x, y) in op if 78 <= x <= 108 and 70 <= y <= 106 and cls(px[x, y]) == "G"]
    hips  = [(x, y) for (x, y) in op if 94 <= x <= 118 and 62 <= y <= 92 and cls(px[x, y]) == "K"]
    # foot endpoints from the alpha silhouette: the topmost opaque pixel (upper boot) and the rightmost (lower boot)
    topmost = min(op, key=lambda q: (q[1], q[0]))
    rightmost = max(op, key=lambda q: (q[0], -q[1]))
    return {"file": p, "opaque_px": n, "bbox": bb, "footprint": (bb[2] - bb[0], bb[3] - bb[1]),
            "body_axis_deg": round(axis, 2), "elongation": round(math.sqrt(l1 / max(l2, 1e-9)), 3),
            "alpha_centroid": (round(mx, 2), round(my, 2)),
            "head_center": centroid(head), "torso_center": centroid(torso), "hip_center": centroid(hips),
            "foot_top": topmost, "foot_right": rightmost,
            "alpha_bytes": im.getchannel("A").tobytes()}

a, b = measure(A), measure(B)
same_alpha = a["alpha_bytes"] == b["alpha_bytes"]
ia, ib = load(A)[1], load(B)[1]
W, H = Image.open(A).size
changed = [(x, y) for y in range(H) for x in range(W) if ia[x, y] != ib[x, y]]
changed_alpha = [(x, y) for (x, y) in changed if ia[x, y][3] != ib[x, y][3]]
def d(k):
    va, vb = a[k], b[k]
    if isinstance(va, (tuple, list)) and va is not None:
        return tuple(round(vb[i] - va[i], 2) for i in range(len(va)))
    return round(vb - va, 3)
rows = ["body_axis_deg", "elongation", "footprint", "bbox", "opaque_px", "alpha_centroid", "head_center", "torso_center", "hip_center", "foot_top", "foot_right"]
print(f"{'quantity':16} {'ORIGINAL':28} {'CLEANUP':28} delta")
for k in rows:
    print(f"{k:16} {str(a[k]):28} {str(b[k]):28} {d(k)}")
print(f"alpha silhouette identical: {same_alpha}   pixels changed: {len(changed)} (alpha changed: {len(changed_alpha)})")
if REPORT:
    out = {"original": {k: a[k] for k in rows}, "cleanup": {k: b[k] for k in rows}, "delta": {k: d(k) for k in rows},
           "alpha_identical": same_alpha, "pixels_changed": len(changed), "alpha_pixels_changed": len(changed_alpha),
           "changed_pixels": changed}
    json.dump(out, open(REPORT, "w"), indent=1)
