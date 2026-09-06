# REFINED V2 keyframes for the prototype full-stretch LEFT (south) dive — same save, same simulation, same timings, same frozen contact art.
# Principles (user brief): explosive dive, not a screen-plane cartwheel. Hands/shoulders lead → torso follows → hips follow → legs trail.
# The body centre (hips) translates on its own path; the torso progressively ROLLS into the side-rolled contact orientation (width
# compression + rotation driven by the head/hip vector); the legs trail below/behind the hips, foreshortened, then extend up-left into the
# contact angle; the arms start extending at push-off and open the elbows progressively toward the ball. The last base frame (F07b) has the
# contact art's head size, shoulder width, torso proportions, limb thickness AND palette/outline style; the first Pro-part frames carry a
# fading outline, so the switch changes as little as possible. Baked frames get a cleanup pass. Landing frames are authored around the
# PRESENTATION root (the simulation root + a decaying momentum continuation applied by the harness); recovery stays in the 3/4 camera.
#   python3 author_frames_v2.py <outdir>
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "rig")); sys.path.insert(0, HERE)
from gk_rig import mat_apply
from rig_w_set import build as build_set
from rig_south_cw20 import build as build_contact, ROOT as CROOT
from pixel_ops import stylize, outline, cleanup
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else "."; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_contact()
S_LIVE = 0.4197
CANVAS_S = (160, 200); OFF_S = (16, 40); ROOT_S = (63, 115)
CANVAS_C = (110, 240); OFF_C = (20, 40)
PS_S, PS_C = S_LIVE * 1.0, S_LIVE * 0.85
FRAMES = []
def joint(R, M, name, off): x, y = mat_apply(M[name], *R.parts[name].pivot); return (x + off[0], y + off[1])
def pin(R, pose, name, target, off):
    M = R.world(pose); x, y = joint(R, M, name, off); q = pose.setdefault("pelvis", {}); q["dx"] = q.get("dx", 0) + (target[0] - x); q["dy"] = q.get("dy", 0) + (target[1] - y); return pose

# ───────────── paths (screen px relative to the SIMULATION root; y down). Measured anchors: standing head (1.3,-33.6) hips (1.7,-18.9)
# shoulder (0.0,-30.2) gloves (-2.1,-23.1)/(4.6,-20.1) feet (-2.1,-8.4)/(2.1,-5.5); contact art head (2.0,-35.2) hips (-5.9,-41.7)
# shoulder (-2.4,-32.7) gloves (0.8,-28.5)/(2.5,-22.9) feet (-13.4,-49.9)/(-9.1,-54.9).
HEAD = {"F01": (1.6, -33.2), "F02": (2.2, -32.2), "F03": (2.6, -31.2), "F04": (3.0, -31.6), "F05": (3.2, -32.0), "F05b": (3.4, -32.4),
        "F06": (3.6, -32.8), "F07": (3.8, -33.6), "F07b": (3.2, -34.6), "F08": (2.6, -35.0), "F09": (2.2, -35.2)}
HIPS = {"F01": (1.8, -18.7), "F02": (2.3, -17.6), "F03": (2.8, -16.6), "F04": (2.9, -19.4), "F05": (2.4, -22.6), "F05b": (0.8, -25.6),
        "F06": (-2.2, -27.6), "F07": (-4.4, -32.0), "F07b": (-5.3, -36.0), "F08": (-5.6, -39.0), "F09": (-5.8, -41.0)}
def head_dir_from_shoulder(T): return None
def set_frame(name, phase, t, pose, note, grounded, root_shift=(0, 0), sources=("SET/west",), style=0.0, clean=True, extra_landmarks=None):
    root = (ROOT_S[0] + OFF_S[0] + root_shift[0], ROOT_S[1] + OFF_S[1] + root_shift[1])
    if "near_thigh" in pose: pose["near_thigh_edge"] = dict(pose["near_thigh"])
    if "torso" in pose: pose["torso_under"] = dict(pose["torso"])
    img, M = RS.render(pose, canvas=CANVAS_S, offset=OFF_S)
    if clean: img = cleanup(img)
    if style > 0: img = stylize(img, style)
    j = {n: tuple(round(v, 1) for v in joint(RS, M, n, OFF_S)) for n in RS.order}
    lm = {"head": j["head"], "lead_glove": j["near_glove"], "other_glove": j["far_glove"], "pelvis": j["pelvis"], "foot_L": j["far_boot"], "foot_R": j["near_boot"], "shoulder": j["near_upper"]}
    if extra_landmarks: lm.update(extra_landmarks)
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "W_SET", "pose": pose, "note": note, "sources": list(sources), "grounded": grounded, "pixel_scale": 1.0,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": style})
    return pose
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
NEAR_FOOT = RS.parts["near_boot"].pivot; FAR_FOOT = RS.parts["far_boot"].pivot        # far = keeper's LEFT (south, lower) = plant/drive; near = RIGHT = trailing
REST_BEND_NEAR, REST_BEND_FAR = 20.3, 15.3
TORSO_VEC = (-1.0, -31.0)                                                              # head pivot relative to the torso pivot (sprite px); torso pivot is 4 px above the pelvis pivot
def torso_for(head_s, hips_s, sx):
    """torso rot + sy so the head pivot lands at head_s given the hips at hips_s (both screen px rel. root)"""
    wx, wy = (head_s[0] - hips_s[0]) / PS_S, (head_s[1] - hips_s[1]) / PS_S + 4          # vector from the torso pivot to the head, sprite px
    L = math.hypot(wx, wy); sy = max(0.3, math.sqrt(max(1e-6, L * L - (TORSO_VEC[0] * sx) ** 2)) / abs(TORSO_VEC[1]))
    rest = math.atan2(TORSO_VEC[1] * sy, TORSO_VEC[0] * sx); T = math.degrees(math.atan2(wy, wx) - rest)
    return T, sy
def arms(pose, A, T, k, ext=0, far_short=0, far_dx=0, spread=8):
    pose["near_upper"] = {"rot": A - 90 - T, "ext": ext, "sx": pose.get("_limb_sx", 1.0)}; pose["near_fore"] = {"rot": -REST_BEND_NEAR * k, "ext": ext, "sx": pose.get("_limb_sx", 1.0)}
    pose["far_upper"] = {"rot": (A + spread) - 90 - T, "ext": -far_short, "dx": far_dx, "sx": pose.get("_limb_sx", 1.0)}; pose["far_fore"] = {"rot": -REST_BEND_FAR * k, "ext": -far_short, "sx": pose.get("_limb_sx", 1.0)}
    return pose
def body(key, sx=1.0, head_scale=1.0, head_look=0, limb_sx=1.0, root_shift=(0, 0)):
    """pelvis pinned on HIPS[key]; torso rot/sy solved for HEAD[key]; returns pose + T"""
    root = (ROOT_S[0] + OFF_S[0] + root_shift[0], ROOT_S[1] + OFF_S[1] + root_shift[1])
    T, sy = torso_for(HEAD[key], HIPS[key], sx)
    pose = {"pelvis": {"rot": 0}, "torso": {"rot": T, "sy": sy, "sx": sx}, "head": {"rot": head_look - T * 0.35, "sx": head_scale, "sy": head_scale}, "_limb_sx": limb_sx}
    pin(RS, pose, "pelvis", (root[0] + HIPS[key][0] / PS_S, root[1] + HIPS[key][1] / PS_S), OFF_S)
    return pose, T, root
def finish(pose):
    pose.pop("_limb_sx", None); return pose
# F00 READY
set_frame("F00_READY", "READY / SET", "t 0.00–0.13 s", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)
# F01 WEIGHT SHIFT — weight onto the LEFT (save-side, lower) foot: hips 0.5 px toward it, both knees soften, head tracks the ball, hands drop
p, T, root = body("F01"); p = arms(p, 124, T, 0.0); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR_FOOT); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR_FOOT)
set_frame("F01_WEIGHT_SHIFT", "READ / WEIGHT SHIFT", "t 0.13–0.22 s", finish(p), "weight onto the LEFT (save-side) foot, knees soften, head on the ball, hands drop", "both feet")
# F02 CROUCH — hips drop 1.3 px and move 0.5 px further onto the left foot; LEFT knee bends more (asymmetric), arms swing back
p, T, root = body("F02"); p = arms(p, 116, T, 0.0); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR_FOOT); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR_FOOT, tilt=4)
set_frame("F02_CROUCH", "ANTICIPATION CROUCH", "t 0.22–0.30 s", finish(p), "hips down and onto the LEFT leg, LEFT knee deeper than the RIGHT, arms back", "both feet")
# F03 PLANT / LOAD — deepest and most asymmetric: hips over the LEFT foot (2.8 px right of standing), LEFT knee fully loaded, RIGHT heel up, arms at the back of the swing
p, T, root = body("F03"); p = arms(p, 110, T, 0.15); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR_FOOT); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR_FOOT, tilt=14)
set_frame("F03_PLANT_LOAD", "PLANT / LOAD (deepest)", "u 0.00–0.10", finish(p), "hips lowest and over the LEFT foot; LEFT leg accepts the weight (deep knee), RIGHT heel lifting (+14°), arms fully back, hands start toward the target", "both feet (right heel up)")
# F04 PUSH-OFF — the LEFT leg extends: hips driven 2 px UP and toward the save side, RIGHT foot leaves the ground (unloads), arms swing to the target, elbows opening
p, T, root = body("F04", sx=0.97, head_scale=0.98, root_shift=(0, 1)); p["_limb_sx"] = 0.98; p = arms(p, 98, T, 0.35, ext=1); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR_FOOT[0], FAR_FOOT[1] - 1), tilt=8); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR_FOOT[0] + 3, NEAR_FOOT[1] - 6))
set_frame("F04_PUSH_OFF", "EXPLOSIVE PUSH-OFF", "u 0.10–0.22", finish(p), "LEFT leg extending from the planted toe (hips 2 px up), RIGHT foot off the ground (+3,−6), both arms swinging forward to the save side, elbows 35 % open", "left foot (toe)", root_shift=(0, 1), style=0.12)
# F05 TOE-OFF — LEFT leg straight, only the toe down; hips 2.6 px higher and moving; RIGHT leg trailing behind; arms half open toward the ball
p, T, root = body("F05", sx=0.94, head_scale=0.96, root_shift=(0, 2)); p["_limb_sx"] = 0.96; p = arms(p, 90, T, 0.55, ext=2); p = leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR_FOOT[0] + 1, FAR_FOOT[1] - 2), tilt=30); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR_FOOT[0] + 5, NEAR_FOOT[1] - 12))
set_frame("F05_TOE_OFF", "TOE-OFF (propelled)", "u 0.22–0.29", finish(p), "LEFT leg fully extended on the toe (boot +30°), hips 2.6 px up and driving, RIGHT leg unloaded and trailing (+5,−12), elbows 55 % open, gloves at the target line", "left toe", root_shift=(0, 2), style=0.28)
# flight: legs trail (explicit rotations in the pelvis frame; 0 = hanging straight down), foreshortened as they go north
def flight(key, name, phase, t, A, k, ext, far_short, sx, head_scale, limb_sx, legs, legsy, style, root_shift, note, head_look=0):
    p, T, root = body(key, sx=sx, head_scale=head_scale, limb_sx=limb_sx, root_shift=root_shift, head_look=head_look); p["_limb_sx"] = limb_sx
    p = arms(p, A, T, k, ext=ext, far_short=far_short, far_dx=-2, spread=(2 if key == "F07b" else 8))
    (ft, fs, fb), (nt, ns, nb) = legs
    p["far_thigh"] = {"rot": ft, "sy": legsy, "sx": limb_sx}; p["far_shin"] = {"rot": fs, "sy": legsy, "sx": limb_sx}; p["far_boot"] = {"rot": fb}
    p["near_thigh"] = {"rot": nt, "sy": legsy, "sx": limb_sx}; p["near_shin"] = {"rot": ns, "sy": legsy, "sx": limb_sx}; p["near_boot"] = {"rot": nb}
    set_frame(name, phase, t, finish(p), note, "airborne", root_shift=root_shift, style=style)
flight("F05b", "F05b_LEAVING_GROUND", "LEAVING THE GROUND", "u 0.29–0.36", 86, 0.70, 2, 1, 0.92, 0.97, 0.94, ((6, -10, 4), (14, -22, 6)), 0.92, 0.40, (0, 3),
       "first airborne tick: both feet just off the pitch, legs hanging behind the hips (LEFT leg still nearly straight from the push, RIGHT knee bent), hips 3 px up, elbows 70 % open")
flight("F06", "F06_EARLY_FLIGHT", "EARLY FLIGHT", "u 0.36–0.46", 80, 0.85, 3, 2, 0.88, 0.94, 0.90, ((28, -36, 6), (38, -46, 8)), 0.66, 0.55, (0, 3),
       "hands leading at the ball, torso rolling (width 0.88) as the hips rise; legs trailing straight behind the hips — pointing away from the camera, so short (0.66) with the knees folding")
flight("F07", "F07_MID_FLIGHT", "MID FLIGHT", "u 0.46–0.57", 74, 1.0, 3, 4, 0.83, 0.90, 0.86, ((118, -104, 8), (126, -98, 10)), 0.60, 0.72, (0, 4),
       "arms straight at the ball, torso side-on (width 0.83, foreshortened), hips level with the head, legs folded tight behind/above the hips (0.60): the most compact moment of the dive")
flight("F07b", "F07b_BRIDGE", "BRIDGE (contact proportions)", "u 0.57–0.68", 68, 1.0, 4, -3, 0.78, 0.86, 0.82, ((164, -30, 10), (172, -26, 12)), 0.86, 1.0, (0, 5),
       "the last GK_BASE_V1 frame with the contact art's head (0.86 → 7.0 px area-equivalent, like the Pro head), shoulder width (0.78), limb thickness (0.82), palette and thinned outlines; legs extending up-left into the contact angle, arms fully extended (+4 px) with the far arm reaching past the near one")

# ───────────── contact rig (bridge, post-contact, landing) — hips pinned on HIPS[key] (rel. the ROOT the frame is drawn at)
def contact_frame(key, name, phase, t, pose, note, grounded, rot, hips, out_style=0.0, head_screen=None):
    pose["pelvis"] = {**pose.get("pelvis", {}), "rot": rot}
    root = (CROOT[0] + OFF_C[0], CROOT[1] + OFF_C[1])
    pin(RC, pose, "pelvis", (root[0] + hips[0] / PS_C, root[1] + hips[1] / PS_C), OFF_C)
    img, M = RC.render(pose, canvas=CANVAS_C, offset=OFF_C); img = cleanup(img)
    if out_style > 0: img = outline(img, out_style)
    j = {n: tuple(round(v, 1) for v in joint(RC, M, n, OFF_C)) for n in RC.order}
    def distal(n): x, y = mat_apply(M[n], *RC.parts[n].bone["to"]); return (round(x + OFF_C[0], 1), round(y + OFF_C[1], 1))
    lm = {"head": j["head"], "lead_glove": j["glove_B"], "other_glove": j["glove_A"], "pelvis": j["pelvis"], "foot_L": distal("shin_1"), "foot_R": distal("shin_2"), "shoulder": j["sleeve"]}
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "SOUTH_CW20", "pose": pose, "note": note, "sources": ["DIVE_SOUTH_CW20 (parts)"], "grounded": grounded, "pixel_scale": 0.85,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": out_style})
# rot is relative to the contact orientation (0 = contact). The arms stay on the ball while the body turns under them (sleeve +), legs at the contact angle.
contact_frame("F08", "F08_BRIDGE_PRO", "BRIDGE (Pro parts, 14° short)", "u 0.68–0.82 (hand-led)",
    {"sleeve": {"rot": 30}, "glove_A": {"rot": -5}, "glove_B": {"rot": -7}, "thigh_1": {"rot": 13}, "shin_1": {"rot": 6}, "thigh_2": {"rot": 13}, "shin_2": {"rot": 8}, "torso": {"rot": -2}, "head": {"rot": 14}},
    "the contact art's own components 14° short of the contact orientation with a 50 % outline (fading the base style out): arms 30° short of overhead, knees 6–8° bent, legs at the contact angle", "airborne", -14, HIPS["F08"], out_style=0.5)
contact_frame("F09", "F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.82–0.95 (hand-led)",
    {"sleeve": {"rot": 14}, "glove_A": {"rot": -2}, "glove_B": {"rot": -3}, "thigh_1": {"rot": 5}, "shin_1": {"rot": 2}, "thigh_2": {"rot": 5}, "shin_2": {"rot": 2}, "torso": {"rot": -1}, "head": {"rot": 6}},
    "5° short of the contact orientation, arms 14° short, knees 2° short, 25 % outline: the last authored frame before the untouched contact PNG", "airborne", -5, HIPS["F09"], out_style=0.25)
# post-contact / landing: authored around the PRESENTATION root (sim root + decaying momentum continuation, applied by the harness);
# the keeper drops onto his left side where he is: hips end 3 px below the presentation root (ground), body on the contact diagonal.
LAND = {"F11": (-5.0, -39.5), "F11b": (-4.0, -36.5), "F12": (-3.0, -31.5), "F12b": (-2.0, -24.0), "F13": (-1.0, -14.0), "F13b": (-0.5, -7.0), "F14": (0.0, -3.0), "F15a": (0.0, -3.5), "F15a2": (0.3, -5.0)}
contact_frame("F11", "F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.05–0.11 s", {"sleeve": {"rot": 10}, "glove_A": {"rot": 5}, "glove_B": {"rot": 7}, "thigh_1": {"rot": -2}, "shin_1": {"rot": -10}, "thigh_2": {"rot": -2}, "shin_2": {"rot": -8}, "torso": {"rot": 2}, "head": {"rot": -3}},
    "momentum: body 4° past contact, gloves 10° through the ball line, knees starting to fold", "airborne", 4, LAND["F11"])
contact_frame("F11b", "F11b_APEX", "APEX", "+0.11–0.17 s", {"sleeve": {"rot": 17}, "glove_A": {"rot": 7}, "glove_B": {"rot": 9}, "thigh_1": {"rot": -1}, "shin_1": {"rot": -18}, "thigh_2": {"rot": -1}, "shin_2": {"rot": -15}, "torso": {"rot": 2.5}, "head": {"rot": -4}},
    "the rise has stopped; gloves easing off the ball line", "airborne", 6, LAND["F11b"])
contact_frame("F12", "F12_DESCENT", "DESCENT", "+0.17–0.23 s", {"sleeve": {"rot": 24}, "glove_A": {"rot": 10}, "glove_B": {"rot": 12}, "thigh_1": {"rot": 0}, "shin_1": {"rot": -26}, "thigh_2": {"rot": 0}, "shin_2": {"rot": -22}, "torso": {"rot": 3}, "head": {"rot": -5}},
    "falling on the contact diagonal, arms folding under to brace, knees bending", "airborne (falling)", 8, LAND["F12"])
contact_frame("F12b", "F12b_FALLING", "FALLING", "+0.23–0.30 s", {"sleeve": {"rot": 32}, "glove_A": {"rot": 13}, "glove_B": {"rot": 16}, "thigh_1": {"rot": 1}, "shin_1": {"rot": -37}, "thigh_2": {"rot": 1}, "shin_2": {"rot": -33}, "torso": {"rot": 3.5}, "head": {"rot": -6.5}},
    "arms reaching for the pitch, knees folding further", "airborne (falling)", 10, LAND["F12b"])
contact_frame("F13", "F13_GROUND_CONTACT", "FIRST GROUND CONTACT", "+0.30–0.37 s", {"sleeve": {"rot": 40}, "glove_A": {"rot": 16}, "glove_B": {"rot": 20}, "thigh_1": {"rot": 2}, "shin_1": {"rot": -48}, "thigh_2": {"rot": 2}, "shin_2": {"rot": -44}, "torso": {"rot": 4}, "head": {"rot": -8}},
    "left hip and forearm meet the pitch at the presentation root, gloves bracing under the chest, knees folded", "left side + forearm", 12, LAND["F13"])
contact_frame("F13b", "F13b_SETTLING", "SETTLING", "+0.37–0.45 s", {"sleeve": {"rot": 46}, "glove_A": {"rot": 19}, "glove_B": {"rot": 24}, "thigh_1": {"rot": 3}, "shin_1": {"rot": -55}, "thigh_2": {"rot": 3}, "shin_2": {"rot": -51}, "torso": {"rot": 4.5, "sy": 0.97}, "head": {"rot": -9}},
    "trunk settling onto the left side, knees drawing up", "left side + forearm", 13, LAND["F13b"])
contact_frame("F14", "F14_ABSORB", "ABSORB IMPACT", "+0.45–0.55 s", {"sleeve": {"rot": 52}, "glove_A": {"rot": 22}, "glove_B": {"rot": 28}, "thigh_1": {"rot": 4}, "shin_1": {"rot": -62}, "thigh_2": {"rot": 4}, "shin_2": {"rot": -58}, "torso": {"rot": 5, "sy": 0.94}, "head": {"rot": -10}},
    "flat on the left side, torso compressed 6 %, arms tucked, knees up: the impact goes into the hip/forearm", "left side", 14, LAND["F14"])
# F15a / F15a2 RECOVERY TURN — Pro parts: the keeper pushes up off the forearm and sits up; the torso rotates about the hip with
# foreshortening so the head rises above the hips instead of swinging round to the east.
contact_frame("F15a", "F15a_PUSH_UP", "RECOVERY TURN (pushing up)", "+0.55–0.63 s", {"sleeve": {"rot": 100}, "glove_A": {"rot": 30}, "glove_B": {"rot": 36}, "thigh_1": {"rot": 16}, "shin_1": {"rot": -84}, "thigh_2": {"rot": 12}, "shin_2": {"rot": -78}, "torso": {"rot": -40, "sy": 0.72}, "head": {"rot": -30}},
    "upper body pushing up off the forearm/gloves (torso 40° up, foreshortened toward the camera), head turning to the play, knees drawn under", "hip + hands", -4, LAND["F15a"], out_style=0.35)
contact_frame("F15a2", "F15a2_SITTING_UP", "SITTING UP", "+0.63–0.71 s", {"sleeve": {"rot": 160}, "glove_A": {"rot": 34}, "glove_B": {"rot": 40}, "thigh_1": {"rot": 22}, "shin_1": {"rot": -100}, "thigh_2": {"rot": 16}, "shin_2": {"rot": -96}, "torso": {"rot": -92, "sy": 0.80}, "head": {"rot": -26}},
    "trunk upright to the knees, head above the hips, hands on the pitch: the last Pro-part frame (60 % outline)", "knees + hands", -6, LAND["F15a2"], out_style=0.6)

# ───────────── recovery in the 3/4 camera from the SET rig (base lineage, style fading back in from the Pro look)
def kneel_frame(name, phase, t, pose, note, grounded, ground_screen, style):
    root = (ROOT_S[0] + OFF_S[0] - ground_screen[0] / PS_S, ROOT_S[1] + OFF_S[1] - ground_screen[1] / PS_S)
    if "near_thigh" in pose: pose["near_thigh_edge"] = dict(pose["near_thigh"])
    if "torso" in pose: pose["torso_under"] = dict(pose["torso"])
    img, M = RS.render(pose, canvas=CANVAS_S, offset=OFF_S); img = cleanup(img)
    if style > 0: img = stylize(img, style)
    j = {n: tuple(round(v, 1) for v in joint(RS, M, n, OFF_S)) for n in RS.order}
    lm = {"head": j["head"], "lead_glove": j["near_glove"], "other_glove": j["far_glove"], "pelvis": j["pelvis"], "foot_L": j["far_boot"], "foot_R": j["near_boot"], "shoulder": j["near_upper"]}
    FRAMES.append({"name": name, "phase": phase, "t": t, "rig": "W_SET", "pose": pose, "note": note, "sources": ["SET/west (rig)"], "grounded": grounded, "pixel_scale": 1.0,
                   "root": [round(root[0], 1), round(root[1], 1)], "joints": j, "img": img, "landmarks": lm, "style": style})
# F15a3 HALF KNEEL — SET rig: sitting back on the heel with the trunk still low, head coming up to the play; style 80 % toward the Pro look
p = {"pelvis": {"dy": 31, "dx": -1}, "torso": {"rot": 20, "sy": 0.66, "sx": 0.9}, "head": {"rot": -16, "sx": 0.88, "sy": 0.88},
     "far_thigh": {"rot": 22}, "far_shin": {"rot": -128, "sy": 0.8}, "far_boot": {"rot": 102}, "near_thigh": {"rot": -70, "sy": 0.9}, "near_shin": {"rot": 96}, "near_boot": {"rot": -14},
     "near_upper": {"rot": 28, "sx": 0.9}, "near_fore": {"rot": 12, "sx": 0.9}, "far_upper": {"rot": 14, "sx": 0.9}, "far_fore": {"rot": -4, "sx": 0.9}}
kneel_frame("F15a3_HALF_KNEEL", "HALF KNEEL (trunk low)", "+0.71–0.79 s", p, "sitting back on the LEFT heel, RIGHT foot planted forward, trunk low (0.78) and just lifting, hands on the pitch/thigh; style 80 % toward the Pro look so it meets F15a2", "left knee/heel + right foot", (0.0, 0.0), style=0.8)
# F15b KNEELING — LEFT knee down (shin folded back), RIGHT foot forward and planted, torso up, near hand pushing on the thigh
p = {"pelvis": {"dy": 26, "dx": -2}, "torso": {"rot": 10, "sy": 0.96, "sx": 0.92}, "head": {"rot": -8, "sx": 0.92, "sy": 0.92},
     "far_thigh": {"rot": 18}, "far_shin": {"rot": -125, "sy": 0.8}, "far_boot": {"rot": 100}, "near_thigh": {"rot": -78}, "near_shin": {"rot": 88}, "near_boot": {"rot": -6},
     "near_upper": {"rot": 62}, "near_fore": {"rot": 10}, "far_upper": {"rot": 30}, "far_fore": {"rot": -10}}
kneel_frame("F15b_KNEELING", "KNEELING (one knee, one foot)", "+0.79–0.88 s", p, "LEFT knee down (shin folded back), RIGHT foot forward and planted, torso up, hands on the thigh, head up; style 55 %", "left knee + right foot", (0.0, 0.0), style=0.55)
# F16 RISING — deep crouch on both feet, hands coming up
p = {"pelvis": {"dy": 10, "dx": 0}, "torso": {"rot": 6, "sy": 0.97}, "head": {"rot": -5}, "near_upper": {"rot": 30}, "near_fore": {"rot": 0}, "far_upper": {"rot": 20}, "far_fore": {"rot": -6}}
p = leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR_FOOT[0] - 2, FAR_FOOT[1])); p = leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR_FOOT[0] + 2, NEAR_FOOT[1]))
kneel_frame("F16_RISING", "RISING", "+0.88–0.97 s", p, "up on both feet in a deep crouch (hips 10 px down), hands coming up to the ready position; style 25 %", "both feet", (0.0, 0.0), style=0.25)
set_frame("F17_READY", "RETURN TO READY", "+0.97–1.05 s → live SET", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)

# ───────────── save + report
meta = []
for f in FRAMES:
    f["img"].save(os.path.join(OUT, f["name"] + ".png"))
    R = RS if f["rig"] == "W_SET" else RC
    R.viz(f["pose"], scale=3, canvas=CANVAS_S if R is RS else CANVAS_C, offset=OFF_S if R is RS else OFF_C, title=f["name"]).save(os.path.join(OUT, f["name"] + "_viz.png"))
    ps = PS_S if f["pixel_scale"] == 1.0 else PS_C; rx, ry = f["root"]
    f["screen"] = {k: (round((v[0] - rx) * ps, 1), round((v[1] - ry) * ps, 1)) for k, v in f["landmarks"].items()}
    meta.append({k: v for k, v in f.items() if k != "img"})
json.dump({"canvas_set": CANVAS_S, "offset_set": OFF_S, "canvas_contact": CANVAS_C, "offset_contact": OFF_C, "frames": meta}, open(os.path.join(OUT, "frames.json"), "w"), indent=1)
print(f"{'frame':22s} {'head':>14s} {'lead glove':>14s} {'other glove':>14s} {'pelvis':>14s} {'foot L':>14s} {'foot R':>14s} {'shoulder':>14s}  (screen px rel. root)")
for f in FRAMES:
    s = f["screen"]; print(f"{f['name']:22s} " + " ".join(f"{str(s.get(k, '')):>14s}" for k in ("head", "lead_glove", "other_glove", "pelvis", "foot_L", "foot_R", "shoulder")))
