# CONTACT RIG — DIVE_NORTH_CW60 (the approved RIGHT / GOAL_LEFT far-dive contact pose since 2026-09-07: the same preserved source as
# DIVE_NORTH_CW50 rotated 60 deg CW instead of 50, body scale 0.72). The part polygons, pivots, attach points and bone end points are the
# CW50 rig's tables mapped rigidly into the CW60 canvas (10 deg CW about the builder's hip pivot, translation fitted on the landmarks the
# builder tracked through both rotations), so the cut is the same cut of the same pixels. Used ONLY for the bridge frames before contact
# and post-contact frames: the contact frame itself is the untouched PNG. Opaque pixels a rotated polygon misses are given to the nearest
# part so the rest pose reproduces the sprite exactly.
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import Rig, Part, Source
import rig_north_cw50 as CW50
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
CW60 = os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/DIVE_NORTH_CW60.png")
AN60 = os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/DIVE_NORTH_CW60_anchors.json")
ROOT = tuple(json.load(open(AN60))["root"])                       # anchors root (sprite px) — the simulation root
DEG = 10.0                                                        # CW60 = CW50 turned 10 deg clockwise on screen about the hip pivot
# landmarks the builder tracked through both rotations (contact-orientation test, tracked marker layer): hip pivot, head, feet, gloves
LM50 = {"hip": (46.3, 121.3), "head": (43.22, 42.56), "feet": (63.0, 163.0), "glove_far": (13.0, 14.5), "glove_near": (21.89, 26.67)}
LM60 = {"hip": (26.0, 124.5), "head": (36.56, 46.78), "feet": (35.4, 168.7), "glove_far": (13.78, 13.56), "glove_near": (24.89, 24.33)}
_c, _s = math.cos(math.radians(DEG)), math.sin(math.radians(DEG))
def _rot(p): return (_c * p[0] - _s * p[1], _s * p[0] + _c * p[1])          # +DEG clockwise on screen (y down)
# translation: least squares over the body landmarks (hip, head, feet; the glove markers sit on the merged glove blob and are less exact)
_FIT = ("hip", "head", "feet"); _T = [0.0, 0.0]
for k in _FIT:
    r = _rot(LM50[k]); _T[0] += LM60[k][0] - r[0]; _T[1] += LM60[k][1] - r[1]
_T = (_T[0] / len(_FIT), _T[1] / len(_FIT))
def map50(p):
    r = _rot(p); return (r[0] + _T[0], r[1] + _T[1])
def fit_residual():
    return {k: round(math.hypot(map50(LM50[k])[0] - LM60[k][0], map50(LM50[k])[1] - LM60[k][1]), 2) for k in LM50}
def build():
    R50, _ = CW50.build()
    src = Source(CW60, label="DIVE_NORTH_CW60")
    R = Rig("NORTH_CW60")
    for name in R50.order:
        p = R50.parts[name]
        poly = [tuple(round(v, 2) for v in map50(q)) for q in p.poly]
        pivot = map50(p.pivot); attach = map50(p.attach) if p.attach else None
        bone = None
        if p.bone: bone = dict(p.bone); bone["to"] = map50(p.bone["to"])
        R.add(Part(name, src, poly, pivot=pivot, parent=p.parent, attach=attach, z=p.z, classes=p.classes, colour=p.colour, bone=bone))
    left = R.assign()
    # pixels the rotated polygons miss → nearest part (by distance to that part's pixels), so the rest pose is the sprite itself
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
    return R, left
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    print("landmark fit residual (px):", fit_residual(), "translation", tuple(round(v, 2) for v in _T))
    R, left = build()
    for n in R.order: print(f"{n:10s} z{R.parts[n].z:2d} pivot {tuple(round(v,1) for v in R.parts[n].pivot)} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
    from PIL import Image
    src = Image.open(CW60).convert("RGBA"); W, H = src.size
    R.viz(scale=6, canvas=(W, H), title="NORTH_CW60 rig").save(os.path.join(out, "rig_NORTH_CW60_viz.png")); R.legend().save(os.path.join(out, "rig_NORTH_CW60_legend.png"))
    img, M = R.render({}, canvas=(W, H)); img.save(os.path.join(out, "rig_NORTH_CW60_rest.png"))
    diff = sum(1 for y in range(H) for x in range(W) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
    print("rest-pose pixels differing from the source:", diff, "| canvas", (W, H), "root", ROOT)
