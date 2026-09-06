# PROTOTYPE full-stretch LEFT (south) dive — authored keyframes for ONE reproducible save (W_z190_L18_GOAL_RIGHT).
# Ground phase + flight from the W_SET rig (GK_BASE_V1 lineage); bridge / post-contact / landing from the SOUTH_CW20 contact rig
# (the approved art's own parts, Pro lineage @0.85); recovery from the V1 recover clip; F10 CONTACT = the untouched PNG (live path).
# SCREEN GEOMETRY (measured from the traced save, screen px relative to the simulation root, y down):
#   the simulation hand goes (+2.1,-29.2) → (+2.8,-33.2) — it barely moves on screen; the dive is IN DEPTH (toward the camera).
#   standing:   head (+1.3,-33.6)  gloves (-2.1,-23.1)/(+4.6,-20.2)  pelvis (+1.7,-18.9)  feet (-2.1,-8.4)/(+2.1,-5.5)
#   contact art (raw, before the live hand-led placement): head (+2.0,-35.2)  gloves (+0.8,-28.5)/(+2.5,-22.9)  pelvis (-5.9,-41.7)  feet (-13.4,-49.9)/(-9.1,-54.9)
#   → the head and gloves hold their height; the hips rise 23 px and the feet sweep 45 px UP the screen (north + airborne) to the left:
#     the body cartwheels about the head/gloves, foreshortening as it turns toward the camera. Frames are authored on that path.
#   python3 author_frames.py <outdir>
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import mat_apply
from rig_w_set import build as build_set
from rig_south_cw20 import build as build_contact, ROOT as CROOT
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else "."; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_contact()
S_LIVE = 0.4197                                          # renderer sprite scale at the keeper
CANVAS_S = (160, 200); OFF_S = (16, 40); ROOT_S = (63, 115)          # W_SET frames: source (0,0) → canvas (16,40); root (63,115) → (79,155)
CANVAS_C = (110, 240); OFF_C = (20, 40)                              # contact-rig frames: source (0,0) → (20,40); the PNG root (43.6,161.7) → (63.6,201.7)
PS_S, PS_C = S_LIVE * 1.0, S_LIVE * 0.85                             # screen px per sprite px for each lineage
FRAMES = []
def joint(R, M, name, off): x, y = mat_apply(M[name], *R.parts[name].pivot); return (x + off[0], y + off[1])
def pin(R, pose, name, target, off):
    """translate the whole figure (root part = pelvis) so the named joint lands on target (canvas px)"""
    M = R.world(pose); x, y = joint(R, M, name, off); q = pose.setdefault("pelvis", {}); q["dx"] = q.get("dx", 0) + (target[0] - x); q["dy"] = q.get("dy", 0) + (target[1] - y); return pose

# ─────────────────────────── W_SET rig (ground phase + flight) ───────────────────────────
def leg_ik(pose, thigh, shin, boot, target, forward=-1, tilt=0):
    M = RS.world(pose); H = joint(RS, M, thigh, (0, 0))
    K0 = RS.parts[shin].pivot; A0 = RS.parts[boot].pivot; T0 = RS.parts[thigh].pivot
    L1 = math.hypot(K0[0] - T0[0], K0[1] - T0[1]); L2 = math.hypot(A0[0] - K0[0], A0[1] - K0[1])
    rest1 = math.atan2(K0[1] - T0[1], K0[0] - T0[0]); rest2 = math.atan2(A0[1] - K0[1], A0[0] - K0[0])
    dx, dy = target[0] - H[0], target[1] - H[1]; d = max(1e-6, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
    base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
    best = None
    for sgn in (1, -1):
        th1 = base + sgn * a; K = (H[0] + L1 * math.cos(th1), H[1] + L1 * math.sin(th1)); th2 = math.atan2(target[1] - K[1], target[0] - K[0])
        score = forward * (K[0] - (H[0] + target[0]) / 2)
        if best is None or score > best[0]: best = (score, th1, th2)
    _, th1, th2 = best; par = pose.get("pelvis", {}).get("rot", 0)
    r1 = math.degrees(th1 - rest1) - par; r2 = math.degrees(th2 - rest2) - par - r1
    pose[thigh] = {**pose.get(thigh, {}), "rot": r1}; pose[shin] = {**pose.get(shin, {}), "rot": r2}; pose[boot] = {**pose.get(boot, {}), "rot": -(r1 + r2) + tilt}
    return pose
NEAR_FOOT = RS.parts["near_boot"].pivot; FAR_FOOT = RS.parts["far_boot"].pivot   # near = keeper's RIGHT (north, drawn higher) = trailing foot; far = keeper's LEFT (south, drawn lower) = plant/drive foot
REST_BEND_NEAR, REST_BEND_FAR = 20.3, 15.3                                       # elbow bend at rest (forearm vs upper arm), degrees
def arms(pose, A, T, k, ext=0, far_dx=0):
    """both arms pointing at screen angle A (deg, y-down, 0 = right, 90 = down) while the body is rotated T; k = elbow straightening 0..1"""
    pose["near_upper"] = {"rot": A - 90 - T, "ext": ext}; pose["near_fore"] = {"rot": -REST_BEND_NEAR * k, "ext": ext}
    pose["far_upper"] = {"rot": (A + 8) - 90 - T, "ext": ext, "dx": far_dx}; pose["far_fore"] = {"rot": -REST_BEND_FAR * k, "ext": max(0, ext - 1)}
    return pose
def set_frame(name, phase, t, pose, note, grounded, root_shift=(0, 0), head_screen=None, sources=("SET/west",)):
    """render a W_SET-rig frame. root_shift (sprite px) = where the SIM root sits relative to the sprite's rest ground anchor: planted feet
    keep their pitch pixels while the simulation root moves under the keeper. head_screen = pin the head at (x,y) screen px rel. root."""
    root = (ROOT_S[0] + OFF_S[0] + root_shift[0], ROOT_S[1] + OFF_S[1] + root_shift[1])
    if head_screen: pin(RS, pose, "head", (root[0] + head_screen[0] / PS_S, root[1] + head_screen[1] / PS_S), OFF_S)
    if "near_thigh" in pose: pose["near_thigh_edge"] = dict(pose["near_thigh"])
    img, M = RS.render(pose, canvas=CANVAS_S, offset=OFF_S)
    j = {n: tuple(round(v, 1) for v in joint(RS, M, n, OFF_S)) for n in RS.order}
    # foot tips (toe of each boot) for the continuity table: boot part's far corner along its own axis
    lm = {"head": j["head"], "lead_glove": j["near_glove"], "other_glove": j["far_glove"], "pelvis": j["pelvis"], "foot_L": j["far_boot"], "foot_R": j["near_boot"], "shoulder": j["near_upper"]}
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "W_SET", "pose": pose, "note": note, "sources": list(sources), "grounded": grounded, "pixel_scale": 1.0,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm})
    return pose
# The physical pivot of the whole action is the SHOULDER: the gloves stay at the ball and the body cartwheels under them. Every frame
# pins the lead shoulder on one smooth path (screen px rel. the sim root): standing (0.0,-30.2) → contact art (-2.4,-32.7). The head
# direction from the shoulder turns from straight up (270°) to the contact art's 330° (looking at the ball); the legs lead the body
# rotation (they whip up-left and are foreshortened as they go north), and the arms keep pointing at the ball as the body turns.
SH = {"F01": (0.2, -29.8), "F02": (0.5, -28.8), "F03": (0.6, -27.8), "F04": (0.8, -28.2), "F05": (0.6, -29.2), "F05b": (0.4, -29.8), "F06": (0.0, -30.2), "F07": (-0.8, -31.2), "F07b": (-1.6, -32.0),
      "F08": (-2.2, -32.5), "F09": (-2.4, -32.7), "F11": (-2.0, -31.0), "F11b": (-1.5, -28.0), "F12": (-1.0, -22.5), "F12b": (-0.5, -15.0), "F13": (0.0, -6.0), "F13b": (0.3, -0.5), "F14": (0.5, 4.0)}
def sh_target(key, root): return (root[0] + SH[key][0] / PS_S, root[1] + SH[key][1] / PS_S)
def head_rot_set(D, T): return D - 270 - T                        # head direction D (deg) from the shoulder, body rotated T
# F0 READY
set_frame("F00_READY", "READY / SET", "t 0.00–0.13 s (shot struck; reaction latency)", {}, "GK_BASE_V1 SET/west, untouched", "both feet")
def ground(key, name, phase, t, T, sy, D, A, k, feet, note, grounded, root_shift=(0, 0), tilts=(0, 0), ext=0, head_scale=1.0):
    root = (ROOT_S[0] + OFF_S[0] + root_shift[0], ROOT_S[1] + OFF_S[1] + root_shift[1])
    p = {"pelvis": {"rot": T}, "torso": {"sy": sy}, "head": {"rot": head_rot_set(D, T), "sx": head_scale, "sy": head_scale}}; p = arms(p, A, T, k, ext=ext)
    p = pin(RS, p, "near_upper", sh_target(key, root), OFF_S)
    p = leg_ik(p, "far_thigh", "far_shin", "far_boot", feet[0], tilt=tilts[0]); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", feet[1], tilt=tilts[1])
    set_frame(name, phase, t, p, note, grounded, root_shift=root_shift)
ground("F01", "F01_WEIGHT_SHIFT", "READ / WEIGHT SHIFT", "t 0.13–0.22 s", 2, 0.98, 271, 126, 0.0, (FAR_FOOT, NEAR_FOOT),
       "body +2° toward the dive side, torso 2 % shorter (leaning toward the camera), head tracking the ball; both arms drop; feet planted (IK)", "both feet")
ground("F02", "F02_CROUCH", "ANTICIPATION CROUCH", "t 0.22–0.30 s (to commit)", 4, 0.95, 272, 118, 0.0, (FAR_FOOT, NEAR_FOOT),
       "shoulders 1.5 px lower, hips down, both knees bent (IK, feet on their pixels), body +4°, torso 5 % shorter, arms swinging back", "both feet")
ground("F03", "F03_PLANT_LOAD", "PLANT / LOAD (deepest)", "u 0.00–0.10 (commit)", 7, 0.92, 273, 112, 0.2, (FAR_FOOT, NEAR_FOOT),
       "shoulders 2.5 px below ready, hips at their lowest, LEFT leg loaded, RIGHT heel lifting (+12°), body +7°, torso 8 % shorter, arms fully back", "both feet (right heel up)", tilts=(0, 12))
ground("F04", "F04_PUSH_OFF", "EXPLOSIVE PUSH-OFF", "u 0.10–0.22", 13, 0.93, 278, 104, 0.4, ((FAR_FOOT[0], FAR_FOOT[1] - 1), (NEAR_FOOT[0] + 2, NEAR_FOOT[1] - 5)),
       "body tipping +13° about the shoulder, LEFT leg straightening onto the toe (planted), RIGHT foot off the ground (+2,−5), arms swinging forward-down toward the save side", "left foot (toe)", root_shift=(0, 1), tilts=(6, 0))
ground("F05", "F05_TAKEOFF", "TAKEOFF (toe leaving)", "u 0.22–0.32", 24, 0.91, 285, 96, 0.6, ((FAR_FOOT[0] + 1, FAR_FOOT[1] - 2), (NEAR_FOOT[0] + 4, NEAR_FOOT[1] - 12)),
       "body +24°, LEFT leg straight with only the toe down (boot +26°), RIGHT leg trailing (+4,−12), elbows 60 % straight, arms pointing down at the save side", "left toe", root_shift=(0, 2), tilts=(26, 0), ext=1, head_scale=0.96)
def flight(key, name, phase, t, T, sy, D, A, k, ext, leg, legsy, shin, note, root_shift, far_short=0, head_scale=1.0):
    root = (ROOT_S[0] + OFF_S[0] + root_shift[0], ROOT_S[1] + OFF_S[1] + root_shift[1])
    p = {"pelvis": {"rot": T}, "torso": {"sy": sy}, "head": {"rot": head_rot_set(D, T), "sx": head_scale, "sy": head_scale},
         "near_thigh": {"rot": leg + 4, "sy": legsy}, "near_shin": {"rot": shin, "sy": legsy}, "near_boot": {"rot": 10}, "far_thigh": {"rot": leg, "sy": legsy}, "far_shin": {"rot": shin - 4, "sy": legsy}, "far_boot": {"rot": 8}}
    p = arms(p, A, T, k, ext=ext, far_dx=-2); p["far_upper"]["ext"] = -far_short; p["far_fore"]["ext"] = -far_short
    p = pin(RS, p, "near_upper", sh_target(key, root), OFF_S)
    set_frame(name, phase, t, p, note, "airborne", root_shift=root_shift)
flight("F05b", "F05b_LEAVING_GROUND", "LEAVING THE GROUND", "u 0.29–0.36", 36, 0.96, 291, 92, 0.7, 1, 6, 0.95, -10,
       "first airborne tick: body +36°, drive leg still extended behind the hips (toe just off the pitch), trailing leg lifting, arms straightening at the ball", (0, 3), far_short=1, head_scale=0.95)
flight("F06", "F06_EARLY_FLIGHT", "EARLY FLIGHT", "u 0.36–0.46", 52, 0.94, 298, 90, 0.8, 2, 12, 0.90, -28,
       "airborne: body +52° about the shoulder (cartwheeling toward the camera), head 8 % smaller (toward the Pro head), torso 6 % foreshortened, legs whipping up-left (leading by 12°, knees folding), both arms straight down at the ball", (0, 3), far_short=2, head_scale=0.92)
flight("F07", "F07_MID_FLIGHT", "MID FLIGHT", "u 0.46–0.57", 84, 0.90, 313, 86, 1.0, 3, 25, 0.85, -22,
       "body +84°, head 14 % smaller, torso 10 % foreshortened, hips level with the shoulders, legs leading up-left (+25°, 15 % foreshortened), arms straight and lengthening (+3 px per segment) at the ball", (0, 4), far_short=4, head_scale=0.86)
flight("F07b", "F07b_ARMS_EXTENDING", "ARMS EXTENDING (bridge to Pro art)", "u 0.57–0.68", 112, 0.87, 324, 82, 1.0, 4, 35, 0.80, -24,
       "body +112° = the contact art's own orientation and proportions (head 0.80, shoulder→hip 0.87, legs 0.80), hips up-left of the shoulder, legs at the contact angle, arms fully extended (+4 px) at the ball; the last GK_BASE_V1 frame", (0, 5), far_short=6, head_scale=0.80)

# ─────────────────────────── contact rig (bridge, post-contact, landing) ───────────────────────────
def contact_frame(key, name, phase, t, pose, note, grounded, rot):
    pose["pelvis"] = {**pose.get("pelvis", {}), "rot": rot}
    root = (CROOT[0] + OFF_C[0], CROOT[1] + OFF_C[1])
    pin(RC, pose, "sleeve", (root[0] + SH[key][0] / PS_C, root[1] + SH[key][1] / PS_C), OFF_C)
    img, M = RC.render(pose, canvas=CANVAS_C, offset=OFF_C)
    j = {n: tuple(round(v, 1) for v in joint(RC, M, n, OFF_C)) for n in RC.order}
    def distal(n): x, y = mat_apply(M[n], *RC.parts[n].bone["to"]); return (round(x + OFF_C[0], 1), round(y + OFF_C[1], 1))
    lm = {"head": j["head"], "lead_glove": j["glove_B"], "other_glove": j["glove_A"], "pelvis": j["pelvis"], "foot_L": distal("shin_1"), "foot_R": distal("shin_2"), "shoulder": j["sleeve"]}
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "SOUTH_CW20", "pose": pose, "note": note, "sources": ["DIVE_SOUTH_CW20 (parts)"], "grounded": grounded, "pixel_scale": 0.85,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm})
# body rot is relative to the contact orientation (0 = contact). Head direction from the shoulder: contact = 330°; sleeve rot keeps the arms at the ball while the body turns under them.
contact_frame("F08", "F08_MID_FLIGHT_BRIDGE", "NEAR-FULL EXTENSION (bridge: Pro parts)", "u 0.68–0.82 (hand-led)",
    {"sleeve": {"rot": 33}, "glove_A": {"rot": -5}, "glove_B": {"rot": -7}, "thigh_1": {"rot": 15}, "shin_1": {"rot": 6}, "thigh_2": {"rot": 15}, "shin_2": {"rot": 8}, "torso": {"rot": -2}, "head": {"rot": 16}},
    "the contact art's own components 16° short of the contact orientation; the arms still 33° short of overhead (gloves held at the ball), knees 6–8° bent, legs already at the contact angle, head on the ball", "airborne", -16)
contact_frame("F09", "F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.82–0.95 (hand-led)",
    {"sleeve": {"rot": 16}, "glove_A": {"rot": -2}, "glove_B": {"rot": -3}, "thigh_1": {"rot": 6}, "shin_1": {"rot": 2}, "thigh_2": {"rot": 6}, "shin_2": {"rot": 2}, "torso": {"rot": -1}, "head": {"rot": 7}},
    "6° short of the contact orientation, arms 16° short of overhead, knees 2° short: the last authored frame before the untouched contact PNG", "airborne", -6)
contact_frame("F11", "F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.00–0.12 s",
    {"sleeve": {"rot": 10}, "glove_A": {"rot": 5}, "glove_B": {"rot": 7}, "thigh_1": {"rot": -2}, "shin_1": {"rot": -10}, "thigh_2": {"rot": -2}, "shin_2": {"rot": -8}, "torso": {"rot": 2}, "head": {"rot": -3}},
    "momentum carries on: body 4° past the contact orientation, gloves swinging 10° through the ball line, knees starting to fold, shoulders 1.7 px lower", "airborne", 4)
contact_frame("F11b", "F11b_APEX", "APEX / STARTING TO DROP", "endT +0.11–0.17 s",
    {"sleeve": {"rot": 17}, "glove_A": {"rot": 7}, "glove_B": {"rot": 9}, "thigh_1": {"rot": -1}, "shin_1": {"rot": -18}, "thigh_2": {"rot": -1}, "shin_2": {"rot": -15}, "torso": {"rot": 2.5}, "head": {"rot": -4}},
    "in-between: the body has stopped rising, shoulders 3 px lower, gloves easing off the ball line, knees starting to fold", "airborne", 6)
contact_frame("F12", "F12_DESCENT", "BEGINNING DESCENT", "endT +0.12–0.25 s",
    {"sleeve": {"rot": 24}, "glove_A": {"rot": 10}, "glove_B": {"rot": 12}, "thigh_1": {"rot": 0}, "shin_1": {"rot": -26}, "thigh_2": {"rot": 0}, "shin_2": {"rot": -22}, "torso": {"rot": 3}, "head": {"rot": -5}},
    "falling on the contact diagonal: body 8° further over, shoulders 8.5 px below contact, arms folding under to brace, knees bending 22–26°", "airborne (falling)", 8)
contact_frame("F12b", "F12b_FALLING", "FALLING", "endT +0.21–0.29 s",
    {"sleeve": {"rot": 32}, "glove_A": {"rot": 13}, "glove_B": {"rot": 16}, "thigh_1": {"rot": 1}, "shin_1": {"rot": -37}, "thigh_2": {"rot": 1}, "shin_2": {"rot": -33}, "torso": {"rot": 3.5}, "head": {"rot": -6.5}},
    "in-between: shoulders 7.5 px lower again, arms reaching for the pitch, knees folding further", "airborne (falling)", 10)
contact_frame("F13", "F13_GROUND_CONTACT", "FIRST GROUND CONTACT", "endT +0.25–0.37 s",
    {"sleeve": {"rot": 40}, "glove_A": {"rot": 16}, "glove_B": {"rot": 20}, "thigh_1": {"rot": 2}, "shin_1": {"rot": -48}, "thigh_2": {"rot": 2}, "shin_2": {"rot": -44}, "torso": {"rot": 4}, "head": {"rot": -8}},
    "left hip and forearm on the pitch (shoulders 28 px lower = ground level, 0.6 m south of the frozen simulation root), gloves bracing under the chest, knees folded 44–48°, body still on the contact diagonal (feet toward the top-left = north)", "left side + forearm", 12)
contact_frame("F13b", "F13b_SETTLING", "SETTLING ONTO THE SIDE", "endT +0.37–0.45 s",
    {"sleeve": {"rot": 46}, "glove_A": {"rot": 19}, "glove_B": {"rot": 24}, "thigh_1": {"rot": 3}, "shin_1": {"rot": -55}, "thigh_2": {"rot": 3}, "shin_2": {"rot": -51}, "torso": {"rot": 4.5, "sy": 0.97}, "head": {"rot": -9}},
    "in-between: hip and forearm down, the trunk settling onto the left side, knees drawing up", "left side + forearm", 13)
contact_frame("F14", "F14_ABSORB", "ABSORB IMPACT", "endT +0.37–0.52 s",
    {"sleeve": {"rot": 52}, "glove_A": {"rot": 22}, "glove_B": {"rot": 28}, "thigh_1": {"rot": 4}, "shin_1": {"rot": -62}, "thigh_2": {"rot": 4}, "shin_2": {"rot": -58}, "torso": {"rot": 5, "sy": 0.94}, "head": {"rot": -10}},
    "flat on the left side, torso compressed 6 %, arms tucked under the chest, knees up: the impact goes into the hip/forearm, not the gloves", "left side", 14)

# ─────────────────────────── recovery (V1 recover clip, base lineage, mirrored to face west) + return to SET ───────────────────────────
REC = "assets/visual_v1/originals/character_f4838361/anim/recover_getting_up/east"
def clip_frame(name, phase, t, path, note, grounded, ground_screen):
    """a V1 clip frame (its own ground anchor = SET's root) drawn with its feet at ground_screen (screen px rel. the sim root)"""
    im = Image.open(path).convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
    img = Image.new("RGBA", CANVAS_S, (0, 0, 0, 0)); img.paste(im, OFF_S, im)
    root = (ROOT_S[0] + OFF_S[0] - ground_screen[0] / PS_S, ROOT_S[1] + OFF_S[1] - ground_screen[1] / PS_S)
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "clip", "pose": {}, "note": note, "sources": [path.split("originals/")[-1] + " (mirrored)"], "grounded": grounded, "pixel_scale": 1.0,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": {}, "img": img, "landmarks": {}})
clip_frame("F15_RECOVERY", "RECOVERY (pushing up)", "endT +0.52–0.70 s", f"{REC}/1.png", "V1 recover_getting_up f1 (mirrored → facing west): on one knee, hand on the ground, at the landing spot (0.6 m south of the root)", "knee + hand", (2.5, 5.0))
clip_frame("F16_RISING", "RISING", "endT +0.70–0.88 s", f"{REC}/3.png", "V1 recover_getting_up f3 (mirrored): standing up, one step back toward the set spot", "both feet", (1.0, 2.0))
set_frame("F17_READY", "RETURN TO READY", "endT +0.88 s → live SET (+1.05 s)", {}, "GK_BASE_V1 SET/west, untouched (the live SET takes over at the root)", "both feet")

# ─────────────────────────── save frames + metadata ───────────────────────────
meta = []
for f in FRAMES:
    f["img"].save(os.path.join(OUT, f["name"] + ".png"))
    R = RS if f["rig"] == "W_SET" else RC if f["rig"] == "SOUTH_CW20" else None
    if R: R.viz(f["pose"], scale=3, canvas=CANVAS_S if R is RS else CANVAS_C, offset=OFF_S if R is RS else OFF_C, title=f["name"]).save(os.path.join(OUT, f["name"] + "_viz.png"))
    ps = PS_S if f["pixel_scale"] == 1.0 else PS_C; rx, ry = f["root"]
    f["screen"] = {k: (round((v[0] - rx) * ps, 1), round((v[1] - ry) * ps, 1)) for k, v in f["landmarks"].items()}
    meta.append({k: v for k, v in f.items() if k != "img"})
json.dump({"canvas_set": CANVAS_S, "offset_set": OFF_S, "canvas_contact": CANVAS_C, "offset_contact": OFF_C, "frames": meta}, open(os.path.join(OUT, "frames.json"), "w"), indent=1)
print("frames:", [f["name"] for f in FRAMES])
print(f"{'frame':22s} {'head':>14s} {'lead glove':>14s} {'other glove':>14s} {'pelvis':>14s} {'foot L':>14s} {'foot R':>14s}   (screen px rel. sim root)")
for f in FRAMES:
    s = f.get("screen") or {}
    if s: print(f"{f['name']:22s} " + " ".join(f"{str(s.get(k, '')):>14s}" for k in ("head", "lead_glove", "other_glove", "pelvis", "foot_L", "foot_R")) + f"  shoulder {s.get('shoulder')}")
