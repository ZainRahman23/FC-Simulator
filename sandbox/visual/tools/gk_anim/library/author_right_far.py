# RIGHT FAR DIVE (GOAL_LEFT / north = screen up-left): SET → weight shift → crouch → plant on the RIGHT foot → push → toe-off → early
# flight → mid flight → bridge → [live contact DIVE_NORTH_CW50 @ 0.72] → follow-through → descent → landing on the right side → absorb →
# push-up → sit up → half kneel → kneel → rise → SET. Same timing architecture as LEFT_FAR; the geometry is re-cut for this side (the
# camera is not left/right symmetric): the approved contact art is a leap with the torso upright, both arms up-left and the legs
# trailing down-right, so the flight develops that shape instead of the LEFT's side roll.
#   python3 author_right_far.py <outdir>
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig
from rig_w_set import build as build_set
from rig_north_cw50 import build as build_north, ROOT as NROOT
OUT = sys.argv[1] if len(sys.argv) > 1 else "."; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_north()
S = SetRig(RS)
C = ContactRig(RC, NROOT, 0.72, (150, 260), (34, 40), {"head": ("joint", "head"), "lead_glove": ("joint", "glove_A"), "other_glove": ("joint", "glove_B"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve"),
                                                           "foot_L": ("distal", "shin_L"), "foot_R": ("distal", "shin_R")}, "DIVE_NORTH_CW50")
A = Author(S, C, OUT)
# ── paths (screen px rel. the SIMULATION root; y down). Standing: head (1.3,-33.6) hips (1.7,-18.9). Contact art (rel. its root):
# head (2.7,-32.9), hips (2.4,-12.4), gloves (-5.3,-39.4)/(-1.6,-32.9), boots (+6,+8)/(+11,+6). The root itself travels up-left
# (~(-5.7,-6.3) px on a 1.8 m dive), so the hips stay level in absolute terms while the arms shoot up-left.
HEAD = {"F01": (1.6, -33.0), "F02": (2.1, -31.9), "F03": (2.5, -30.8), "F04": (2.5, -31.5), "F05": (2.4, -32.0), "F05b": (2.1, -32.3),
        "F06": (1.8, -32.2), "F07": (1.7, -31.6), "F07b": (1.9, -31.6), "F07c": (2.1, -30.4), "F08": (2.5, -29.7), "F09": (3.0, -29.0)}
HIPS = {"F01": (1.8, -18.5), "F02": (1.7, -17.1), "F03": (1.3, -15.8), "F04": (1.1, -17.5), "F05": (1.0, -18.8), "F05b": (0.7, -19.5),
        "F06": (0.6, -19.8), "F07": (0.6, -19.7), "F07b": (0.9, -19.1), "F07c": (1.2, -17.4), "F08": (1.8, -16.7), "F09": (2.4, -16.0)}
NEAR, FAR = S.near_foot, S.far_foot           # near = keeper's RIGHT (upper on screen) = plant/drive; far = LEFT = trailing
A.set_frame("F00_READY", "READY / SET", "t 0.00–0.13 s", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)
# F01 WEIGHT SHIFT — weight onto the RIGHT (save-side, upper) foot; knees soften; hands drop
p, T, root = A.body(HEAD["F01"], HIPS["F01"]); p = A.arms(p, 84, T, 0.0); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR)
A.set_frame("F01_WEIGHT_SHIFT", "READ / WEIGHT SHIFT", "t 0.13–0.22 s", A.finish(p), "weight onto the RIGHT (save-side) foot, knees soften, head on the ball, hands drop", "both feet")
# F02 CROUCH — hips drop and move onto the RIGHT leg; RIGHT knee deeper; arms swing back
p, T, root = A.body(HEAD["F02"], HIPS["F02"]); p = A.arms(p, 80, T, 0.0); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR, tilt=4)
A.set_frame("F02_CROUCH", "ANTICIPATION CROUCH", "t 0.22–0.30 s", A.finish(p), "hips down and onto the RIGHT leg, RIGHT knee deeper than the LEFT, arms back", "both feet")
# F03 PLANT / LOAD — deepest: hips over the RIGHT foot, RIGHT knee loaded, LEFT heel up, arms at the back of the swing
p, T, root = A.body(HEAD["F03"], HIPS["F03"]); p = A.arms(p, 76, T, 0.15); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR, tilt=14)
A.set_frame("F03_PLANT_LOAD", "PLANT / LOAD (deepest)", "u 0.00–0.10", A.finish(p), "hips lowest and over the RIGHT foot; RIGHT leg accepts the weight, LEFT heel lifting (+14°), arms back, hands start toward the target", "both feet (left heel up)")
# F04 PUSH-OFF — the RIGHT leg extends, hips driven up and toward the save side (up-left), LEFT foot unloads, arms swing forward/up
p, T, root = A.body(HEAD["F04"], HIPS["F04"], sx=0.99, head_scale=0.99, root_shift=(0, 1)); p["_limb_sx"] = 0.99; p = A.arms(p, 120, T, 0.35, ext=1); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0], NEAR[1] - 1), tilt=8); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0] - 3, FAR[1] - 6))
A.set_frame("F04_PUSH_OFF", "EXPLOSIVE PUSH-OFF", "u 0.10–0.22", A.finish(p), "RIGHT leg extending from the planted toe (hips 2 px up), LEFT foot off the ground (−3,−6), both arms swinging forward and up toward the save side, elbows 35 % open", "right foot (toe)", root_shift=(0, 1), style=0.12)
# F05 TOE-OFF — RIGHT leg straight, only the toe down; LEFT leg trailing; arms rising past horizontal
p, T, root = A.body(HEAD["F05"], HIPS["F05"], sx=0.97, head_scale=0.98, root_shift=(0, 2)); p["_limb_sx"] = 0.97; p = A.arms(p, 160, T, 0.55, ext=2); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0] - 1, NEAR[1] - 2), tilt=30); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0] - 5, FAR[1] - 12))
A.set_frame("F05_TOE_OFF", "TOE-OFF (propelled)", "u 0.22–0.29", A.finish(p), "RIGHT leg fully extended on the toe (boot +30°), hips 2 px up and driving up-left, LEFT leg unloaded and trailing, elbows 55 % open, gloves rising past the shoulder line", "right toe", root_shift=(0, 2), style=0.28)
# flight — the legs trail DOWN-RIGHT behind the leap (negative rotations = toward screen-right), the arms rise to the up-left
def fl(key, name, phase, t, A_, k, ext, fs, sx, hs, lsx, legs, legsy, style, rs, note, spread=8):
    A.flight(name, phase, t, HEAD[key], HIPS[key], A_, k, ext, fs, sx, hs, lsx, legs, legsy, style, rs, note, spread=spread)
fl("F05b", "F05b_LEAVING_GROUND", "LEAVING THE GROUND", "u 0.29–0.36", 190, 0.70, 2, 1, 0.97, 0.99, 0.97, ((-14, -12, 6), (-6, -6, 24)), 1.0, 0.40, (0, 3),
   "first airborne tick: both feet just off the pitch, RIGHT leg still nearly straight from the push, LEFT knee bent behind, arms above the shoulders reaching up-left, elbows 70 % open")
fl("F06", "F06_EARLY_FLIGHT", "EARLY FLIGHT", "u 0.36–0.46", 215, 0.85, 3, 2, 0.95, 0.98, 0.95, ((-24, -22, 8), (-14, -16, 16)), 1.0, 0.55, (0, 3),
   "hands leading up-left at the ball, torso stretching tall, legs trailing down-right and folding (0.90)")
fl("F07", "F07_MID_FLIGHT", "MID FLIGHT", "u 0.46–0.57", 232, 1.0, 3, 3, 0.94, 0.97, 0.93, ((-30, -30, 10), (-20, -24, 12)), 1.0, 0.72, (0, 4),
   "arms straight and nearly at the contact angle, hips level with standing, legs folded and trailing down-right (0.86): the most compact moment of the leap")
fl("F07b", "F07b_BRIDGE", "BRIDGE (contact proportions)", "u 0.57–0.68", 240, 1.0, 5, -2, 0.93, 0.96, 0.92, ((-20, -14, 9), (-12, -10, 10)), 1.0, 1.0, (0, 5),
   "the last GK_BASE_V1 frame with the contact art's proportions, palette and thinned outlines: arms fully extended up-left together, legs at the contact angle", spread=2)
for part in ("far_thigh", "far_shin", "near_thigh", "near_shin"): A.FRAMES[-1]["pose"][part]["ext"] = 3
A.FRAMES[-1]["img"], _M = S.R.render(A.FRAMES[-1]["pose"], canvas=S.canvas, offset=S.off); A.FRAMES[-1]["img"] = __import__("pixel_ops").stylize(__import__("pixel_ops").cleanup(A.FRAMES[-1]["img"]), 1.0)
# MODERATE-extension variants (envNorm < 0.8): elbows less open, arms a little lower, legs less swept
fl("F06", "F06m_EARLY_FLIGHT_MOD", "EARLY FLIGHT (moderate extension)", "u 0.37–0.46 (norm < 0.8)", 205, 0.70, 1, 2, 0.95, 0.98, 0.95, ((-18, -18, 6), (-10, -12, 14)), 1.0, 0.55, (0, 3), "moderate variant: elbows 70 % open, arms lower, legs less swept")
fl("F07", "F07m_MID_FLIGHT_MOD", "MID FLIGHT (moderate extension)", "u 0.46–0.56 (norm < 0.8)", 222, 0.85, 2, 3, 0.94, 0.97, 0.93, ((-24, -24, 8), (-16, -18, 10)), 1.0, 0.72, (0, 4), "moderate variant: elbows 85 % open, arm reach +2 px")
# ── contact rig (bridge, post-contact, landing). rot is relative to the contact orientation (0 = contact); negative = CCW on screen
# (the head swinging to the up-left). Short of contact the arms are still lower/more to the left (sleeve CCW), the knees more bent.
cf = A.contact_frame
cf("F07c_BRIDGE_PRO_A", "BRIDGE (Pro parts, arms 16° short, 75 % outline)", "u 0.65–0.73 (hand-led)",
   {"sleeve": {"rot": -16}, "glove_A": {"rot": 5}, "glove_B": {"rot": 6}, "thigh_L": {"rot": 12}, "shin_L": {"rot": 58}, "thigh_R": {"rot": 12}, "shin_R": {"rot": 62}, "torso": {"rot": -2}, "head": {"rot": -6}},
   "the contact art's own components with the arms 24° short of the contact direction and the knees more bent, 75 % outline: the first Pro-part frame, posed to match F07b's silhouette", "airborne", 0, HIPS["F07c"], out_style=0.75)
cf("F08_BRIDGE_PRO", "BRIDGE (Pro parts, arms 9° short)", "u 0.73–0.84 (hand-led)",
   {"sleeve": {"rot": -9}, "glove_A": {"rot": 3}, "glove_B": {"rot": 4}, "thigh_L": {"rot": 7}, "shin_L": {"rot": 30}, "thigh_R": {"rot": 7}, "shin_R": {"rot": 32}, "torso": {"rot": -1}, "head": {"rot": -4}},
   "arms 14° short, knees 6–8° more bent, 50 % outline (fading the base style out)", "airborne", 0, HIPS["F08"], out_style=0.5)
cf("F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.84–0.95 (hand-led)",
   {"sleeve": {"rot": -4}, "glove_A": {"rot": 1}, "glove_B": {"rot": 1}, "thigh_L": {"rot": 2}, "shin_L": {"rot": 8}, "thigh_R": {"rot": 2}, "shin_R": {"rot": 9}, "torso": {"rot": 0}, "head": {"rot": -2}},
   "arms 6° short, knees 2° short, 25 % outline: the last authored frame before the untouched contact PNG", "airborne", 0, HIPS["F09"], out_style=0.25)
# post-contact / landing: authored around the PRESENTATION root (sim root + decaying up-left continuation); the keeper's momentum
# carries him over to his RIGHT side (screen up-left): the body rotates CCW about the hips while the hips drop to the ground.
LAND = {"F11": (2.0, -14.6), "F11b": (1.4, -15.4), "F12": (0.8, -13.4), "F12b": (0.2, -10.4), "F13": (-0.4, -6.8), "F13b": (-0.5, -5.4), "F14": (0.0, -4.4), "F15a": (0.0, -4.8), "F15a2": (0.4, -6.4)}
cf("F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.05–0.11 s", {"sleeve": {"rot": 6}, "glove_A": {"rot": -4}, "glove_B": {"rot": -5}, "thigh_L": {"rot": -4}, "shin_L": {"rot": 6}, "thigh_R": {"rot": -4}, "shin_R": {"rot": 8}, "torso": {"rot": -2}, "head": {"rot": 3}},
   "momentum: body 6° past contact (CCW), gloves through the ball line, knees starting to fold", "airborne", -6, LAND["F11"])
cf("F11b_APEX", "APEX", "+0.11–0.17 s", {"sleeve": {"rot": 12}, "glove_A": {"rot": -7}, "glove_B": {"rot": -8}, "thigh_L": {"rot": -8}, "shin_L": {"rot": 14}, "thigh_R": {"rot": -8}, "shin_R": {"rot": 16}, "torso": {"rot": -3}, "head": {"rot": 5}},
   "the rise has stopped; the body keeps turning over to the right side, gloves easing off the ball line", "airborne", -13, LAND["F11b"])
cf("F12_DESCENT", "DESCENT", "+0.17–0.23 s", {"sleeve": {"rot": 20}, "glove_A": {"rot": -10}, "glove_B": {"rot": -12}, "thigh_L": {"rot": -14}, "shin_L": {"rot": 24}, "thigh_R": {"rot": -12}, "shin_R": {"rot": 26}, "torso": {"rot": -4}, "head": {"rot": 7}},
   "falling toward the right side, arms folding down to brace, knees bending", "airborne (falling)", -24, LAND["F12"])
cf("F12b_FALLING", "FALLING", "+0.23–0.30 s", {"sleeve": {"rot": 32}, "glove_A": {"rot": -14}, "glove_B": {"rot": -16}, "thigh_L": {"rot": -20}, "shin_L": {"rot": 36}, "thigh_R": {"rot": -18}, "shin_R": {"rot": 38}, "torso": {"rot": -5}, "head": {"rot": 9}},
   "arms reaching for the pitch, knees folding further", "airborne (falling)", -36, LAND["F12b"])
cf("F13_GROUND_CONTACT", "FIRST GROUND CONTACT", "+0.30–0.37 s", {"sleeve": {"rot": 46}, "glove_A": {"rot": -18}, "glove_B": {"rot": -22}, "thigh_L": {"rot": -26}, "shin_L": {"rot": 48}, "thigh_R": {"rot": -24}, "shin_R": {"rot": 50}, "torso": {"rot": -6}, "head": {"rot": 11}},
   "right hip and forearm meet the pitch at the presentation root, gloves bracing under the chest, knees folded", "right side + forearm", -54, LAND["F13"])
cf("F13b_SETTLING", "SETTLING", "+0.37–0.45 s", {"sleeve": {"rot": 54}, "glove_A": {"rot": -21}, "glove_B": {"rot": -26}, "thigh_L": {"rot": -30}, "shin_L": {"rot": 56}, "thigh_R": {"rot": -28}, "shin_R": {"rot": 58}, "torso": {"rot": -6, "sy": 0.97}, "head": {"rot": 12}},
   "trunk settling onto the right side, knees drawing up", "right side + forearm", -61, LAND["F13b"])
cf("F14_ABSORB", "ABSORB IMPACT", "+0.45–0.55 s", {"sleeve": {"rot": 62}, "glove_A": {"rot": -24}, "glove_B": {"rot": -30}, "thigh_L": {"rot": -34}, "shin_L": {"rot": 64}, "thigh_R": {"rot": -32}, "shin_R": {"rot": 66}, "torso": {"rot": -7, "sy": 0.94}, "head": {"rot": 13}},
   "flat on the right side, torso compressed 6 %, arms tucked, knees up: the impact goes into the hip/forearm", "right side", -67, LAND["F14"])
cf("F15a_PUSH_UP", "RECOVERY TURN (pushing up)", "+0.55–0.63 s", {"sleeve": {"rot": 230}, "glove_A": {"rot": -30}, "glove_B": {"rot": -36}, "thigh_L": {"rot": -40}, "shin_L": {"rot": 86}, "thigh_R": {"rot": -34}, "shin_R": {"rot": 80}, "torso": {"rot": 42, "sy": 0.72}, "head": {"rot": 30}},
   "upper body pushing up off the forearm/gloves (torso 42° up, foreshortened toward the camera), head turning to the play, knees drawn under", "hip + hands", -60, LAND["F15a"], out_style=0.35)
cf("F15a2_SITTING_UP", "SITTING UP", "+0.63–0.71 s", {"sleeve": {"rot": 180}, "glove_A": {"rot": -30}, "glove_B": {"rot": -36}, "thigh_L": {"rot": -46}, "shin_L": {"rot": 102}, "thigh_R": {"rot": -38}, "shin_R": {"rot": 98}, "torso": {"rot": 96, "sy": 0.80}, "head": {"rot": 26}},
   "trunk upright to the knees, head above the hips, hands on the pitch: the last Pro-part frame (60 % outline)", "knees + hands", -64, LAND["F15a2"], out_style=0.6)
# ── recovery in the 3/4 camera from the SET rig: RIGHT (near) knee down, LEFT (far) foot forward
kf = A.kneel_frame
p = {"pelvis": {"dy": 33, "dx": 1}, "torso": {"rot": -30, "sy": 0.58, "sx": 0.9}, "head": {"rot": 20, "sx": 0.88, "sy": 0.88},
     "near_thigh": {"rot": -22}, "near_shin": {"rot": 128, "sy": 0.8}, "near_boot": {"rot": -102}, "far_thigh": {"rot": 70, "sy": 0.9}, "far_shin": {"rot": -96}, "far_boot": {"rot": 14},
     "near_upper": {"rot": -40, "sx": 0.9}, "near_fore": {"rot": -14, "sx": 0.9}, "far_upper": {"rot": -20, "sx": 0.9}, "far_fore": {"rot": 4, "sx": 0.9}}
kf("F15a3_HALF_KNEEL", "HALF KNEEL (trunk low)", "+0.71–0.79 s", p, "sitting back on the RIGHT heel, LEFT foot planted forward, trunk low and just lifting, hands on the pitch/thigh; style 80 % toward the Pro look", "right knee/heel + left foot", (0.0, 0.0), style=0.8)
p = {"pelvis": {"dy": 26, "dx": 2}, "torso": {"rot": -10, "sy": 0.96, "sx": 0.92}, "head": {"rot": 8, "sx": 0.92, "sy": 0.92},
     "near_thigh": {"rot": -18}, "near_shin": {"rot": 125, "sy": 0.8}, "near_boot": {"rot": -100}, "far_thigh": {"rot": 78}, "far_shin": {"rot": -88}, "far_boot": {"rot": 6},
     "near_upper": {"rot": -58}, "near_fore": {"rot": -8}, "far_upper": {"rot": -28}, "far_fore": {"rot": 8}}
kf("F15b_KNEELING", "KNEELING (one knee, one foot)", "+0.79–0.88 s", p, "RIGHT knee down (shin folded back), LEFT foot forward and planted, torso up, hands on the thigh, head up; style 55 %", "right knee + left foot", (0.0, 0.0), style=0.55)
p = {"pelvis": {"dy": 10, "dx": 0}, "torso": {"rot": -6, "sy": 0.97}, "head": {"rot": 5}, "near_upper": {"rot": -28}, "near_fore": {"rot": 0}, "far_upper": {"rot": -18}, "far_fore": {"rot": 6}}
p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0] + 2, FAR[1])); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0] - 2, NEAR[1]))
kf("F16_RISING", "RISING", "+0.88–0.97 s", p, "up on both feet in a deep crouch (hips 10 px down), hands coming up to the ready position; style 25 %", "both feet", (0.0, 0.0), style=0.25)
A.set_frame("F17_READY", "RETURN TO READY", "+0.97–1.05 s → live SET", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)
A.save({"family": "RIGHT_FAR", "contact_pose": "DIVE_NORTH_MEDHIGH"})
