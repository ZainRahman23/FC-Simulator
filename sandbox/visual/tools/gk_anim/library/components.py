# Colour-class connected components of a sprite (for planning rig polygons): prints bbox + size per component per class.
#   python3 components.py <sprite.png> [min_px]
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rig"))
from gk_rig import cls_of
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA"); px = im.load(); W, H = im.size; MIN = int(sys.argv[2]) if len(sys.argv) > 2 else 6
cls = {(x, y): cls_of(px[x, y]) for y in range(H) for x in range(W) if px[x, y][3]}
seen = set(); comps = []
for (x, y), c in cls.items():
    if (x, y) in seen: continue
    stack = [(x, y)]; seen.add((x, y)); pts = []
    while stack:
        u, v = stack.pop(); pts.append((u, v))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (u + dx, v + dy)
            if n in cls and n not in seen and cls[n] == c: seen.add(n); stack.append(n)
    comps.append((c, pts))
comps.sort(key=lambda t: (t[0], -len(t[1])))
print(f"{os.path.basename(sys.argv[1])} {W}x{H}")
for c, pts in comps:
    if len(pts) < MIN: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    print(f"  {c}  {len(pts):5d} px  bbox x {min(xs):3d}-{max(xs):3d}  y {min(ys):3d}-{max(ys):3d}  centre ({sum(xs)/len(xs):5.1f},{sum(ys)/len(ys):5.1f})")
