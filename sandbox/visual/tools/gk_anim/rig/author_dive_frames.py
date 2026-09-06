# AUTHOR intermediate frames for the north (keeper-right / GOAL_LEFT) far dive from the W_SET rig: SET → anticipation → push-off →
# early flight → mid flight, ending on the existing authored contact pose (DIVE_NORTH_CW50). Poses are per-part rotations (deg,
# clockwise-positive on screen) and integer translations; legs are solved with two-bone IK so planted feet stay on their pixels.
#   python3 author_dive_frames.py <outdir>
import sys, os, math, json
sys.path.insert(0, os.path.dirname(__file__))
from gk_rig import Rig, Part, Source, mat_apply
from rig_w_set import build
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(OUT, exist_ok=True)
R, _ = build(OUT)
CANVAS = (128, 160); OFF = (0, 16)            # extra headroom above the 128 canvas for raised arms; root row 115 → 131 on the canvas
ROOT = (63, 115)                               # SET/west ground anchor (content_cx, foot_row) in source px

def joint(M, name): return mat_apply(M[name], *R.parts[name].pivot)
def leg_ik(pose, thigh, shin, boot, target, forward=-1):
    """solve thigh/shin local rotations so the ankle (boot pivot) lands on `target` (source coords), knee bending toward `forward` (x sign)"""
    M = R.world(pose)
    H = joint(M, thigh)
    K0 = R.parts[shin].pivot; A0 = R.parts[boot].pivot; T0 = R.parts[thigh].pivot
    L1 = math.hypot(K0[0] - T0[0], K0[1] - T0[1]); L2 = math.hypot(A0[0] - K0[0], A0[1] - K0[1])
    rest1 = math.atan2(K0[1] - T0[1], K0[0] - T0[0]); rest2 = math.atan2(A0[1] - K0[1], A0[0] - K0[0])
    dx, dy = target[0] - H[0], target[1] - H[1]; d = max(1e-6, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
    base = math.atan2(dy, dx); c = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d); c = max(-1, min(1, c)); a = math.acos(c)
    best = None
    for sgn in (1, -1):
        th1 = base + sgn * a; K = (H[0] + L1 * math.cos(th1), H[1] + L1 * math.sin(th1)); th2 = math.atan2(target[1] - K[1], target[0] - K[0])
        score = forward * (K[0] - (H[0] + target[0]) / 2)          # knee toward the forward side
        if best is None or score > best[0]: best = (score, th1, th2)
    _, th1, th2 = best
    # world angles → local rotations (parent chain: pelvis → thigh → shin); the pelvis may itself be rotated
    par = pose.get("pelvis", {}).get("rot", 0)
    r1 = math.degrees(th1 - rest1) - par; r2 = math.degrees(th2 - rest2) - par - r1
    pose[thigh] = {**pose.get(thigh, {}), "rot": r1}; pose[shin] = {**pose.get(shin, {}), "rot": r2}
    pose[boot] = {**pose.get(boot, {}), "rot": -(r1 + r2)}     # boot stays level with the ground
    return pose

NEAR_FOOT = R.parts["near_boot"].pivot; FAR_FOOT = R.parts["far_boot"].pivot

FRAMES = []
def frame(name, u, pose, note, root=ROOT):
    img, M = R.render(pose, canvas=CANVAS, offset=OFF)
    j = {n: tuple(round(v, 1) for v in joint(M, n)) for n in R.order}
    FRAMES.append({"name": name, "u": u, "pose": pose, "note": note, "root": [root[0] + OFF[0], root[1] + OFF[1]], "joints": j, "img": img})
    return img

# ---- F0 SET (rest)
frame("F0_SET", 0.0, {}, "GK_BASE_V1 SET/west, untouched")

# ---- F1 ANTICIPATION: knees bend, hips drop, torso leans forward, arms swing back, head drops slightly
p = {"pelvis": {"dy": 4, "dx": 0}, "torso": {"rot": -8}, "head": {"rot": -4},
     "near_upper": {"rot": -28}, "near_fore": {"rot": -14}, "far_upper": {"rot": -22}, "far_fore": {"rot": -10}}
p = leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR_FOOT); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR_FOOT)
p["near_thigh_edge"] = dict(p["near_thigh"])
frame("F1_ANTICIPATION", 0.12, p, "hips −4 px, both knees bent (IK, feet planted), torso −8°, arms swung back")

# ---- F2 PUSH-OFF: hips rise and move toward the dive (up-left), near leg drives, far leg trails, torso tilts up-left, arms swing forward/up
p = {"pelvis": {"dy": -1, "dx": -3, "rot": -6}, "torso": {"rot": -8}, "head": {"rot": 2},
     "near_upper": {"rot": 105}, "near_fore": {"rot": 25}, "far_upper": {"rot": 110}, "far_fore": {"rot": 20}}
p = leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR_FOOT[0] - 1, NEAR_FOOT[1]))          # drive leg: nearly straight, foot planted
p = leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR_FOOT[0] + 4, FAR_FOOT[1] - 3))           # trailing leg lifts off
p["near_thigh_edge"] = dict(p["near_thigh"])
frame("F2_PUSHOFF", 0.26, p, "hips +1 px up and 3 px toward the dive, body tilted −6°, drive leg straightening, trailing foot off the ground, arms swinging up")

# ---- F3 EARLY FLIGHT: whole body airborne and tilted toward the dive; legs trail; arms reach up-left
p = {"pelvis": {"dy": 1, "dx": -1, "rot": 0}, "torso": {"rot": 0, "dy": -3}, "head": {"rot": 0},
     "near_upper": {"rot": 132, "ext": 3}, "near_fore": {"rot": 6, "ext": 3}, "near_glove": {"rot": 0},
     "far_upper": {"rot": 122, "ext": 3, "dx": -10}, "far_fore": {"rot": 4, "ext": 3},
     "near_thigh": {"rot": -16, "ext": 2}, "near_shin": {"rot": 4, "ext": 3}, "near_boot": {"rot": 6},
     "far_thigh": {"rot": -24, "ext": 2}, "far_shin": {"rot": 6, "ext": 4}, "far_boot": {"rot": 8}}
p["near_thigh_edge"] = dict(p["near_thigh"])
frame("F3_EARLY_FLIGHT", 0.45, p, "airborne: spine extending (torso −3 px, hips +1), arms rising up-left beside the head, legs trailing down-right (toward the camera side) and lengthening")

# ---- F4 MID FLIGHT: arms fully up toward the ball, body more inclined, legs extended behind
p = {"pelvis": {"dy": 5, "dx": -1, "rot": 0}, "torso": {"rot": 0, "dy": -5}, "head": {"rot": 2},
     "near_upper": {"rot": 150, "ext": 5}, "near_fore": {"rot": 0, "ext": 6}, "near_glove": {"rot": 0},
     "far_upper": {"rot": 140, "ext": 5, "dx": -13}, "far_fore": {"rot": 0, "ext": 6},
     "near_thigh": {"rot": -26, "ext": 4}, "near_shin": {"rot": 6, "ext": 6}, "near_boot": {"rot": 8},
     "far_thigh": {"rot": -34, "ext": 4}, "far_shin": {"rot": 8, "ext": 7}, "far_boot": {"rot": 10}}
p["near_thigh_edge"] = dict(p["near_thigh"])
frame("F4_MID_FLIGHT", 0.65, p, "full extension toward the contact geometry: arms up-left (lengthened 11 px toward the Pro art's reach), spine stretched (hips +5, torso −5), legs long and trailing toward the camera side")

# ---- save frames + metadata; viz per frame
meta = []
for f in FRAMES:
    f["img"].save(os.path.join(OUT, f["name"] + ".png"))
    R.viz(f["pose"], scale=4, canvas=CANVAS, offset=OFF, title=f["name"]).save(os.path.join(OUT, f["name"] + "_viz.png"))
    meta.append({k: v for k, v in f.items() if k != "img"})
json.dump({"canvas": CANVAS, "offset": OFF, "frames": meta}, open(os.path.join(OUT, "frames.json"), "w"), indent=1)

# strip: frames at 3x with the contact pose (DIVE_NORTH_CW50 at its 0.72 body scale, shown at canonical density for the strip only)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
S = 3; cells = []
for f in FRAMES:
    im = f["img"]; up = im.resize((im.width * S, im.height * S), Image.NEAREST)
    bg = Image.new("RGB", (up.width, up.height + 20), (238, 238, 240)); bg.paste(up, (0, 0), up)
    d = ImageDraw.Draw(bg); rx, ry = f["root"]; d.line([((rx - 6) * S, ry * S), ((rx + 6) * S, ry * S)], fill=(255, 0, 0), width=2)
    d.text((4, up.height + 3), f"{f['name']}  u={f['u']}", font=F, fill=(20, 20, 24)); cells.append(bg)
dn = Image.open("assets/visual_v1/goalkeeper/contextual/DIVE_NORTH_CW50.png").convert("RGBA")
dn2 = dn.resize((round(dn.width * 0.72), round(dn.height * 0.72)), Image.NEAREST)
up = dn2.resize((dn2.width * S, dn2.height * S), Image.NEAREST); bg = Image.new("RGB", (up.width, cells[0].height), (238, 238, 240))
bg.paste(up, (0, bg.height - 20 - up.height), up); ImageDraw.Draw(bg).text((4, bg.height - 17), "F5 CONTACT (existing DIVE_NORTH_CW50 @0.72)", font=F, fill=(20, 20, 24)); cells.append(bg)
W = sum(c.width + 10 for c in cells) + 10; H = max(c.height for c in cells) + 20
strip = Image.new("RGB", (W, H), (18, 19, 22)); x = 10
for c in cells: strip.paste(c, (x, 10)); x += c.width + 10
strip.save(os.path.join(OUT, "STRIP_routeA.png")); print("strip", strip.size)
# gameplay-scale row: every frame as the renderer would draw it (nearest, sprite scale 0.418 x body scale), then that result at 4x
GS = 0.41804; Z = 4; row = []
for f in FRAMES + [None]:
    if f is None: im = dn; body = 0.72
    else: im = f["img"]; body = 1.0
    dw = round(im.width * GS * body); dh = round(im.height * GS * body); g = im.resize((dw, dh), Image.NEAREST); b = g.getbbox(); g = g.crop(b)
    row.append(g)
Wr = sum(g.width * Z + 12 for g in row) + 12; Hr = max(g.height for g in row) * Z + 40
gs = Image.new("RGB", (Wr, Hr), (238, 238, 240)); x = 12
for g in row:
    up = g.resize((g.width * Z, g.height * Z), Image.NEAREST); gs.paste(up, (x, Hr - 30 - up.height), up); x += up.width + 12
ImageDraw.Draw(gs).text((6, Hr - 22), "GAMEPLAY SCALE (sprite scale 0.418, nearest) shown at 4x — F0 .. F4, then the existing contact pose at 0.72 body scale", font=F, fill=(20, 20, 24))
gs.save(os.path.join(OUT, "STRIP_routeA_gameplay_x4.png")); print("gameplay strip", gs.size)
DN_REL = {"head": (6.5, -78.5), "lead_glove": (-12.3, -93.7), "boots_bottom": 19}   # DIVE_NORTH_CW50 landmarks relative to its root, canonical px
print("target landmarks at contact (rel. root, canonical px):", DN_REL)
for f in FRAMES:
    rx, ry = ROOT; j = f["joints"]
    print(f"{f['name']:16s} rel-root head ({j['head'][0]-rx:+.0f},{j['head'][1]-ry:+.0f})  near_glove ({j['near_glove'][0]-rx:+.0f},{j['near_glove'][1]-ry:+.0f})  far_glove ({j['far_glove'][0]-rx:+.0f},{j['far_glove'][1]-ry:+.0f})  near_boot ({j['near_boot'][0]-rx:+.0f},{j['near_boot'][1]-ry:+.0f})  far_boot ({j['far_boot'][0]-rx:+.0f},{j['far_boot'][1]-ry:+.0f})")
for f in FRAMES: print(f["name"], "joints near_glove", f["joints"]["near_glove"], "far_glove", f["joints"]["far_glove"], "head", f["joints"]["head"], "near_boot", f["joints"]["near_boot"], "far_boot", f["joints"]["far_boot"])
