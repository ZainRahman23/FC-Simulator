# JUMP RIG — the user's vertical high-save contact sprite (VERTICAL_HIGH_CW25, body scale 1.00) cut into articulated parts for the
# final ascent frames before contact and the landing frames after it (the contact frame itself is the untouched PNG).
# The cut is authored on the UNROTATED recovered sprite (sources/VERTICAL_HIGH_RAW.png, a side view of a near-vertical leap) and mapped
# rigidly into the 25° canvas with the landmarks the rotation test tracked through both orientations (rotation known, translation fitted).
# Parts: head, torso, pelvis (shorts), the raised arm as upper + forearm(+glove), the bent arm (one part), thighs (both, one part),
# shins + boots (one part). Opaque pixels a polygon misses go to the nearest part so the rest pose is the sprite itself.
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import Rig, Part, Source
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
RAW = os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/sources/VERTICAL_HIGH_RAW.png")
CW25 = os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/VERTICAL_HIGH_CW25.png")
AN25 = os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/VERTICAL_HIGH_CW25_anchors.json")
ROOT = tuple(json.load(open(AN25))["root"])
DEG = 25.0
# landmarks tracked through the rotation (review_artifacts/gk_vertical_high/rotation_test*/rotation_test.json): 0° canvas → 25° canvas
LM0 = {"hip": (30.0, 87.0), "head": (23.1, 40.1), "torso": (25.0, 62.0), "feet": (44.0, 123.0), "glove_lead": (10.0, 12.0), "glove_other": (13.5, 71.0)}
LM25 = {"hip": (19.7, 87.4), "head": (33.3, 41.8), "torso": (25.7, 62.4), "feet": (17.33, 125.78), "glove_lead": (33.5, 10.88), "glove_other": (13.5, 71.0)}
_c, _s = math.cos(math.radians(DEG)), math.sin(math.radians(DEG))
def _rot(p): return (_c * p[0] - _s * p[1], _s * p[0] + _c * p[1])
_FIT = ("hip", "head", "torso", "feet", "glove_lead"); _T = [0.0, 0.0]
for k in _FIT:
    r = _rot(LM0[k]); _T[0] += LM25[k][0] - r[0]; _T[1] += LM25[k][1] - r[1]
_T = (_T[0] / len(_FIT), _T[1] / len(_FIT))
def map0(p): r = _rot(p); return (r[0] + _T[0], r[1] + _T[1])
def fit_residual(): return {k: round(math.hypot(map0(LM0[k])[0] - LM25[k][0], map0(LM0[k])[1] - LM25[k][1]), 2) for k in LM0}
# polygons in the 0° canvas (55x132: content x 4–50, y 4–127); pivots = proximal joints
PARTS0 = [
    # name         polygon                                                             pivot      parent      z  classes                bone
    # the HEAD is declared first: the raised arm's sleeve runs diagonally IN FRONT of the face (0° canvas x 8–17), so the face/hair/beard
    # pixels (skin, dark, unknown) inside the head outline must belong to the head, never to the arm parts that overlap it (the earlier
    # order put 20 skin + hair pixels on the forearm/upper arm, which then travelled with the arm as a second face). The arm parts take no
    # skin at all; the sleeve outline pixels that touch the face (x 17–19) go to the head (the arm's silhouette outline is restored by
    # the frame outline pass).
    ("head",      [(19, 28), (30, 28), (36, 31), (36, 44), (30, 48), (19, 48), (17, 44), (17, 34)], (27, 52), "torso", 12, {"S", "K", "W", "?"}, None),
    ("fore_up",   [(4, 4), (22, 4), (24, 20), (22, 36), (13, 38), (4, 22)],             (17, 34),  "arm_up",   14, {"W", "K", "?", "G"},      {"to": (11, 12), "w": 7, "rgba": (120, 215, 30, 255)}),   # forearm + raised glove
    ("arm_up",    [(11, 30), (24, 26), (30, 42), (30, 47), (13, 47), (13, 46)],         (27, 52),  "torso",    13, {"G", "K", "?", "W"},      {"to": (17, 34), "w": 8, "rgba": (120, 215, 30, 255)}),   # upper arm of the raised arm
    ("arm_low",   [(4, 62), (20, 58), (30, 60), (30, 78), (22, 82), (4, 82)],           (28, 60),  "torso",    11, {"W", "K", "?", "G", "S"}, {"to": (12, 74), "w": 7, "rgba": (110, 205, 28, 255)}),   # bent arm + glove
    ("torso",     [(18, 46), (30, 44), (40, 50), (42, 80), (36, 84), (20, 84), (14, 66)], (28, 84), "pelvis",  10, {"G", "K", "?", "S", "W"}, {"to": (28, 52), "w": 18, "rgba": (134, 228, 24, 255)}),
    ("pelvis",    [(16, 78), (42, 78), (44, 98), (26, 100), (16, 96)],                  (29, 88),  None,       9,  {"K", "?", "S", "G", "W"}, None),
    ("legs_upper", [(20, 92), (44, 92), (46, 108), (28, 110), (20, 104)],               (30, 92),  "pelvis",   8,  {"S", "K", "?", "G", "W"}, {"to": (35, 106), "w": 12, "rgba": (196, 140, 100, 255)}),  # thighs (both)
    ("legs_lower", [(26, 102), (46, 100), (54, 118), (54, 130), (34, 130), (28, 116)],  (35, 106), "legs_upper", 7, {"K", "G", "S", "?", "W"}, {"to": (44.5, 127), "w": 9, "rgba": (20, 20, 22, 255)}),   # shins + boots (both); distal = the boots' sole (lowest content row)
]


def build(rotated=True):
    src = Source(CW25 if rotated else RAW, label="VERTICAL_HIGH_CW25" if rotated else "VERTICAL_HIGH_RAW")
    R = Rig("VERTICAL_CW25" if rotated else "VERTICAL_RAW")
    M = map0 if rotated else (lambda p: p)
    for name, poly, pivot, parent, z, classes, bone in PARTS0:
        b = None
        if bone: b = dict(bone); b["to"] = M(bone["to"])
        R.add(Part(name, src, [M(q) for q in poly], pivot=M(pivot), parent=parent, attach=M(pivot) if parent else None, z=z, classes=classes, colour=(200, 200, 200), bone=b))
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
    return R, left


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    from PIL import Image
    print("landmark fit residual (px):", fit_residual(), "translation", tuple(round(v, 2) for v in _T))
    for rotated, png in ((False, RAW), (True, CW25)):
        R, left = build(rotated); src = Image.open(png).convert("RGBA"); W, H = src.size
        tag = "CW25" if rotated else "RAW"
        for n in R.order: print(f"  {tag} {n:11s} z{R.parts[n].z:2d} pivot {tuple(round(v,1) for v in R.parts[n].pivot)} parent {R.parts[n].parent} px {len(R.parts[n].pixels)}")
        R.viz(scale=6, canvas=(W, H), title="VERTICAL rig " + tag).save(os.path.join(out, f"rig_VERTICAL_{tag}_viz.png"))
        img, M = R.render({}, canvas=(W, H)); img.save(os.path.join(out, f"rig_VERTICAL_{tag}_rest.png"))
        diff = sum(1 for y in range(H) for x in range(W) if src.getpixel((x, y)) != img.getpixel((x, y)) and (src.getpixel((x, y))[3] or img.getpixel((x, y))[3]))
        print(f"{tag}: rest-pose pixels differing from the source: {diff} | canvas {(W, H)}")
    R, _ = build(True); W, H = Image.open(CW25).size
    img2, _ = R.render({"fore_up": {"rot": -25}, "arm_up": {"rot": -10}, "legs_lower": {"rot": 20}, "torso": {"rot": -8}}, canvas=(W + 30, H + 10), offset=(10, 5)); img2.save(os.path.join(out, "rig_VERTICAL_CW25_pose_test.png"))
