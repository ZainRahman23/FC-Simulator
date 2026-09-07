# SOUTH-WEST FAR DIVES (SW-facing keeper, SW_FAR_DIVE @ 0.74: LEFT = original orientation, dive to screen down-right; RIGHT = the
# same still MIRRORED, dive to screen up-left). Trunk from the SOUTH-WEST SET rig (the sprite the keeper shows at commit), bridges and
# landing from the SW_FAR contact rig. For the RIGHT side the whole Pro-part set is baked mirrored (like the still).
#   python3 author_swfar.py <side LEFT|RIGHT> <outdir> [facing=south-west]   (another facing = only its F01–F03 are used, as far-dive facing variants)
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig
from rig_set_dirs import build as build_dir
from rig_swfar import build as build_swf, ROOT as SROOT
SIDE = sys.argv[1]; OUT = sys.argv[2]; FACING = sys.argv[3] if len(sys.argv) > 3 else "south-west"; os.makedirs(OUT, exist_ok=True)
RS, _ = build_dir(FACING, OUT); RC, _ = build_swf()
an = json.load(open("assets/visual_v1/goalkeeper/anchors/set.json"))[FACING]; SROOT_SET = (round(an["content_cx"]), round(an["foot_row"]))
S = SetRig(RS, root=SROOT_SET, label="SET/" + FACING, torso_vec=(RS.parts["head"].pivot[0] - RS.parts["torso"].pivot[0], RS.parts["head"].pivot[1] - RS.parts["torso"].pivot[1]))
C = ContactRig(RC, SROOT, 0.74, (200, 170), (32, 40), {"head": ("joint", "head"), "lead_glove": ("joint", "glove_B"), "other_glove": ("joint", "glove_A"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve"),
                                                       "foot_L": ("distal", "shin_1"), "foot_R": ("distal", "shin_2")}, "SW_FAR_DIVE")
A = Author(S, C, OUT)
NEAR, FAR = S.near_foot, S.far_foot           # near = keeper's RIGHT (screen-left on this facing), far = keeper's LEFT (screen-right, nearer the camera)
# Geometry (screen px rel. the simulation root). Contact art (original orientation): waist (-5.4,-10.6), neck (7.9,-18.9), lead glove
# (15.0,-16.1), feet (-19,-2)/(-9.6,+1). Root travel on the LEFT dive ≈ (+8,+7) (down-right) over the action; for the RIGHT dive
# (mirrored art) ≈ (-6.3,-7) — authored in the keeper frame and mirrored at bake, so the paths below are the LEFT ones.
# The whole figure sits LOW: the dive is nearly horizontal toward the camera-right, the trunk ends only 11 px above the root.
sx = 1 if SIDE == "LEFT" else -1               # screen direction of the dive for the AUTHORED (unmirrored) frames: LEFT = +x (right)
HEAD = {"F01": (1.0, -33.2), "F02": (1.8, -32.2), "F03": (2.8, -31.0), "F04": (3.6, -31.4), "F05": (4.4, -31.0), "F05b": (5.4, -29.5), "F06": (6.4, -26.5), "F07": (7.2, -22.5), "F07b": (7.8, -20.0)}
HIPS = {"F01": (1.4, -18.7), "F02": (1.2, -17.4), "F03": (1.0, -16.2), "F04": (1.0, -17.8), "F05": (0.6, -18.8), "F05b": (0.0, -18.4), "F06": (-1.6, -16.0), "F07": (-3.6, -13.2), "F07b": (-4.8, -11.6)}
def H(k): return (HEAD[k][0] * sx, HEAD[k][1])
def P(k): return (HIPS[k][0] * sx, HIPS[k][1])
plant, trail = ("far", "near") if SIDE == "LEFT" else ("near", "far")        # the keeper drives off the foot on the dive side
PF, TF = (FAR, NEAR) if SIDE == "LEFT" else (NEAR, FAR)
sf = A.set_frame
sf("F00_READY", "READY / SET", "t 0", {}, "GK_BASE_V1 SET/" + FACING + ", untouched", "both feet", clean=False)
def arms_dir(p, T, k, ext=0, far_short=0, spread=8):
    # A: 90 = hanging; rotation sign flips with the dive side (positive = the arms swing to screen-left)
    return A.arms(p, 90 + (-1 * sx) * abs(k), T, 0, ext=ext, far_short=far_short, spread=spread)
p, T, _ = A.body(H("F01"), P("F01")); p = A.arms(p, 90 + 6 * sx, T, 0.0); p = A.leg_ik(p, f"{plant}_thigh", f"{plant}_shin", f"{plant}_boot", PF); p = A.leg_ik(p, f"{trail}_thigh", f"{trail}_shin", f"{trail}_boot", TF)
sf("F01_WEIGHT_SHIFT", "READ / WEIGHT SHIFT", "t 0.13–0.22 s", A.finish(p), f"weight onto the {SIDE} (save-side) foot, knees soften, hands drop", "both feet")
p, T, _ = A.body(H("F02"), P("F02")); p = A.arms(p, 90 + 12 * sx, T, 0.0); p = A.leg_ik(p, f"{plant}_thigh", f"{plant}_shin", f"{plant}_boot", PF); p = A.leg_ik(p, f"{trail}_thigh", f"{trail}_shin", f"{trail}_boot", TF, tilt=4)
sf("F02_CROUCH", "ANTICIPATION CROUCH", "t 0.22–0.30 s", A.finish(p), f"hips down and onto the {SIDE} leg, arms back", "both feet")
p, T, _ = A.body(H("F03"), P("F03")); p = A.arms(p, 90 + 18 * sx, T, 0.15); p = A.leg_ik(p, f"{plant}_thigh", f"{plant}_shin", f"{plant}_boot", PF); p = A.leg_ik(p, f"{trail}_thigh", f"{trail}_shin", f"{trail}_boot", TF, tilt=14)
sf("F03_PLANT_LOAD", "PLANT / LOAD (deepest)", "u 0.00–0.10", A.finish(p), f"hips lowest and over the {SIDE} foot, the other heel lifting, arms at the back of the swing", "both feet (heel up)")
p, T, _ = A.body(H("F04"), P("F04"), sx=0.98, root_shift=(0, 1)); p = A.arms(p, 90 - 30 * sx, T, 0.35, ext=1); p = A.leg_ik(p, f"{plant}_thigh", f"{plant}_shin", f"{plant}_boot", (PF[0], PF[1] - 1), tilt=8); p = A.leg_ik(p, f"{trail}_thigh", f"{trail}_shin", f"{trail}_boot", (TF[0] - 3 * sx, TF[1] - 6))
sf("F04_PUSH_OFF", "EXPLOSIVE PUSH-OFF", "u 0.10–0.22", A.finish(p), f"{SIDE} leg extending from the planted toe, the other foot off the ground, arms swinging toward the save side", "one foot (toe)", root_shift=(0, 1), style=0.12)
p, T, _ = A.body(H("F05"), P("F05"), sx=0.96, head_scale=0.98, root_shift=(0, 2)); p = A.arms(p, 90 - 62 * sx, T, 0.55, ext=2); p = A.leg_ik(p, f"{plant}_thigh", f"{plant}_shin", f"{plant}_boot", (PF[0] + 1 * sx, PF[1] - 2), tilt=30); p = A.leg_ik(p, f"{trail}_thigh", f"{trail}_shin", f"{trail}_boot", (TF[0] - 5 * sx, TF[1] - 12))
sf("F05_TOE_OFF", "TOE-OFF (propelled)", "u 0.22–0.29", A.finish(p), "leg fully extended on the toe, hips driving toward the save side, elbows 55 % open", "toe", root_shift=(0, 2), style=0.28)
def fl(key, name, phase, t, Aoff, k, ext, fs, sxw, hs, lsx, legs, legsy, style, rs, note):
    (ft, fs_, fb), (nt, ns, nb) = legs
    lg = ((ft * sx, fs_ * sx, fb * sx), (nt * sx, ns * sx, nb * sx))
    A.flight(name, phase, t, H(key), P(key), 90 - Aoff * sx, k, ext, fs, sxw, hs, lsx, lg, legsy, style, rs, note, spread=-8 * sx, far_dx=2 * sx)
fl("F05b", "F05b_LEAVING_GROUND", "LEAVING THE GROUND", "u 0.29–0.36", 78, 0.70, 2, 1, 0.94, 0.98, 0.96, ((10, 14, -6), (18, 24, -8)), 0.95, 0.40, (0, 3), "first airborne tick: legs trailing behind the hips, arms past the shoulder line toward the ball")
fl("F06", "F06_EARLY_FLIGHT", "EARLY FLIGHT", "u 0.36–0.46", 88, 0.85, 3, 2, 0.90, 0.95, 0.92, ((40, 30, -8), (52, 36, -10)), 0.85, 0.55, (0, 3), "hands leading at the ball, trunk laying out toward the camera-side, legs trailing")
fl("F07", "F07_MID_FLIGHT", "MID FLIGHT", "u 0.46–0.57", 96, 1.0, 3, 3, 0.86, 0.92, 0.88, ((70, 22, -10), (82, 30, -12)), 0.80, 0.72, (0, 4), "arms straight at the ball, body nearly horizontal, legs folded and trailing")
fl("F07b", "F07b_BRIDGE", "BRIDGE (contact proportions)", "u 0.57–0.68", 102, 1.0, 4, -2, 0.82, 0.88, 0.84, ((86, 10, -10), (98, 18, -12)), 0.84, 1.0, (0, 5), "the last GK_BASE_V1 frame with the contact art's proportions, palette and thinned outlines: horizontal layout, arms fully extended")
fl("F06", "F06m_EARLY_FLIGHT_MOD", "EARLY FLIGHT (moderate)", "u 0.37–0.46 (norm < 0.8)", 80, 0.70, 1, 2, 0.90, 0.95, 0.92, ((34, 26, -6), (44, 30, -8)), 0.88, 0.55, (0, 3), "moderate variant")
fl("F07", "F07m_MID_FLIGHT_MOD", "MID FLIGHT (moderate)", "u 0.46–0.56 (norm < 0.8)", 90, 0.85, 2, 3, 0.86, 0.92, 0.88, ((62, 20, -8), (72, 26, -10)), 0.82, 0.72, (0, 4), "moderate variant")
# contact-rig frames are authored in the ORIGINAL orientation (dive to screen-right); the RIGHT side is mirrored at bake
cf = A.contact_frame
HB = {"F07c": (-5.0, -11.2), "F08": (-5.2, -10.9), "F09": (-5.4, -10.7)}
cf("F07c_BRIDGE_PRO_A", "BRIDGE (Pro parts, arms 18° short, 75 % outline)", "u 0.65–0.73 (hand-led)", {"sleeve": {"rot": 18}, "glove_A": {"rot": -5}, "glove_B": {"rot": -6}, "thigh_1": {"rot": -10}, "shin_1": {"rot": -30}, "thigh_2": {"rot": -10}, "shin_2": {"rot": -34}, "torso": {"rot": 2}, "head": {"rot": 5}},
   "the contact art's own components with the arms 18° short and the knees folded, 75 % outline", "airborne", 0, HB["F07c"], out_style=0.75)
cf("F08_BRIDGE_PRO", "BRIDGE (Pro parts, arms 10° short)", "u 0.73–0.84 (hand-led)", {"sleeve": {"rot": 10}, "glove_A": {"rot": -3}, "glove_B": {"rot": -4}, "thigh_1": {"rot": -6}, "shin_1": {"rot": -16}, "thigh_2": {"rot": -6}, "shin_2": {"rot": -18}, "torso": {"rot": 1}, "head": {"rot": 3}},
   "arms 10° short, knees opening, 50 % outline", "airborne", 0, HB["F08"], out_style=0.5)
cf("F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.84–0.95 (hand-led)", {"sleeve": {"rot": 4}, "glove_A": {"rot": -1}, "glove_B": {"rot": -2}, "thigh_1": {"rot": -2}, "shin_1": {"rot": -6}, "thigh_2": {"rot": -2}, "shin_2": {"rot": -7}, "torso": {"rot": 0}, "head": {"rot": 1}},
   "arms 4° short, knees 2° short, 25 % outline: the last authored frame before the untouched contact PNG", "airborne", 0, HB["F09"], out_style=0.25)
# landing: the horizontal dive comes down onto the front/left side further along the dive direction (presentation root), hips to the ground
LAND = {"F11": (-4.8, -10.2), "F11b": (-4.2, -9.4), "F12": (-3.2, -7.6), "F12b": (-2.2, -5.6), "F13": (-1.2, -4.0), "F13b": (-0.6, -3.4), "F14": (0.0, -3.0), "F15a": (0.0, -3.6), "F15a2": (0.4, -5.2)}
cf("F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.05–0.11 s", {"sleeve": {"rot": -6}, "glove_A": {"rot": 3}, "glove_B": {"rot": 4}, "thigh_1": {"rot": 3}, "shin_1": {"rot": 8}, "thigh_2": {"rot": 3}, "shin_2": {"rot": 8}, "torso": {"rot": 1}, "head": {"rot": -3}}, "momentum: gloves through the ball line, body turning further over", "airborne", 4, LAND["F11"])
cf("F11b_APEX", "APEX", "+0.11–0.17 s", {"sleeve": {"rot": -12}, "glove_A": {"rot": 6}, "glove_B": {"rot": 8}, "thigh_1": {"rot": 6}, "shin_1": {"rot": 16}, "thigh_2": {"rot": 6}, "shin_2": {"rot": 16}, "torso": {"rot": 2}, "head": {"rot": -5}}, "the rise has stopped", "airborne", 8, LAND["F11b"])
cf("F12_DESCENT", "DESCENT", "+0.17–0.23 s", {"sleeve": {"rot": -22}, "glove_A": {"rot": 10}, "glove_B": {"rot": 12}, "thigh_1": {"rot": 10}, "shin_1": {"rot": 26}, "thigh_2": {"rot": 10}, "shin_2": {"rot": 26}, "torso": {"rot": 3}, "head": {"rot": -7}}, "falling, arms folding to brace", "airborne (falling)", 14, LAND["F12"])
cf("F12b_FALLING", "FALLING", "+0.23–0.30 s", {"sleeve": {"rot": -34}, "glove_A": {"rot": 14}, "glove_B": {"rot": 16}, "thigh_1": {"rot": 14}, "shin_1": {"rot": 38}, "thigh_2": {"rot": 14}, "shin_2": {"rot": 38}, "torso": {"rot": 4}, "head": {"rot": -9}}, "arms reaching for the pitch, knees folding", "airborne (falling)", 20, LAND["F12b"])
cf("F13_GROUND_CONTACT", "FIRST GROUND CONTACT", "+0.30–0.37 s", {"sleeve": {"rot": -46}, "glove_A": {"rot": 18}, "glove_B": {"rot": 22}, "thigh_1": {"rot": 18}, "shin_1": {"rot": 50}, "thigh_2": {"rot": 18}, "shin_2": {"rot": 50}, "torso": {"rot": 5}, "head": {"rot": -11}}, "hip and forearm meet the pitch at the presentation root", "side + forearm", 26, LAND["F13"])
cf("F13b_SETTLING", "SETTLING", "+0.37–0.45 s", {"sleeve": {"rot": -54}, "glove_A": {"rot": 21}, "glove_B": {"rot": 26}, "thigh_1": {"rot": 22}, "shin_1": {"rot": 58}, "thigh_2": {"rot": 22}, "shin_2": {"rot": 58}, "torso": {"rot": 5, "sy": 0.97}, "head": {"rot": -12}}, "trunk settling, knees drawing up", "side + forearm", 30, LAND["F13b"])
cf("F14_ABSORB", "ABSORB IMPACT", "+0.45–0.55 s", {"sleeve": {"rot": -62}, "glove_A": {"rot": 24}, "glove_B": {"rot": 30}, "thigh_1": {"rot": 26}, "shin_1": {"rot": 66}, "thigh_2": {"rot": 26}, "shin_2": {"rot": 66}, "torso": {"rot": 6, "sy": 0.94}, "head": {"rot": -13}}, "flat on the side, torso compressed, knees up", "side", 34, LAND["F14"])
cf("F15a_PUSH_UP", "RECOVERY TURN (pushing up)", "+0.55–0.63 s", {"sleeve": {"rot": -120}, "glove_A": {"rot": 30}, "glove_B": {"rot": 36}, "thigh_1": {"rot": 30}, "shin_1": {"rot": 84}, "thigh_2": {"rot": 26}, "shin_2": {"rot": 78}, "torso": {"rot": -40, "sy": 0.72}, "head": {"rot": 30}}, "upper body pushing up off the forearm, knees drawn under", "hip + hands", 30, LAND["F15a"], out_style=0.35)
cf("F15a2_SITTING_UP", "SITTING UP", "+0.63–0.71 s", {"sleeve": {"rot": -160}, "glove_A": {"rot": 30}, "glove_B": {"rot": 36}, "thigh_1": {"rot": 34}, "shin_1": {"rot": 100}, "thigh_2": {"rot": 30}, "shin_2": {"rot": 94}, "torso": {"rot": -92, "sy": 0.80}, "head": {"rot": 26}}, "trunk upright to the knees, hands on the pitch (last Pro-part frame)", "knees + hands", 26, LAND["F15a2"], out_style=0.6)
# get-up in the SOUTH-WEST view from the SET rig: knee on the dive side
kn = "far" if SIDE == "LEFT" else "near"; ext = "near" if kn == "far" else "far"; lk = 1 if sx == 1 else -1
kf = A.kneel_frame
p = {"pelvis": {"dy": 33, "dx": -1 * lk}, "torso": {"rot": 34 * lk, "sy": 0.58, "sx": 0.9}, "head": {"rot": -22 * lk, "sx": 0.88, "sy": 0.88},
     f"{kn}_thigh": {"rot": 22 * lk}, f"{kn}_shin": {"rot": -128 * lk, "sy": 0.8}, f"{kn}_boot": {"rot": 102 * lk}, f"{ext}_thigh": {"rot": -70 * lk, "sy": 0.9}, f"{ext}_shin": {"rot": 96 * lk}, f"{ext}_boot": {"rot": -14 * lk},
     "near_upper": {"rot": 44 * lk, "sx": 0.9}, "near_fore": {"rot": 16 * lk, "sx": 0.9}, "far_upper": {"rot": 22 * lk, "sx": 0.9}, "far_fore": {"rot": -2 * lk, "sx": 0.9}}
kf("F15a3_HALF_KNEEL", "HALF KNEEL (trunk low)", "+0.71–0.79 s", p, "sitting back on the heel, trunk low and lifting; style 80 % toward the Pro look", "knee/heel + foot", (0.0, 0.0), style=0.8)
p = {"pelvis": {"dy": 26, "dx": -2 * lk}, "torso": {"rot": 10 * lk, "sy": 0.96, "sx": 0.92}, "head": {"rot": -8 * lk, "sx": 0.92, "sy": 0.92},
     f"{kn}_thigh": {"rot": 18 * lk}, f"{kn}_shin": {"rot": -125 * lk, "sy": 0.8}, f"{kn}_boot": {"rot": 100 * lk}, f"{ext}_thigh": {"rot": -78 * lk}, f"{ext}_shin": {"rot": 88 * lk}, f"{ext}_boot": {"rot": -6 * lk},
     "near_upper": {"rot": 62 * lk}, "near_fore": {"rot": 10 * lk}, "far_upper": {"rot": 30 * lk}, "far_fore": {"rot": -10 * lk}}
kf("F15b_KNEELING", "KNEELING (one knee, one foot)", "+0.79–0.88 s", p, "one knee down, the other foot forward, torso up; style 55 %", "knee + foot", (0.0, 0.0), style=0.55)
p = {"pelvis": {"dy": 10, "dx": 0}, "torso": {"rot": 6 * lk, "sy": 0.97}, "head": {"rot": -5 * lk}, "near_upper": {"rot": 30 * lk}, "near_fore": {"rot": 0}, "far_upper": {"rot": 20 * lk}, "far_fore": {"rot": -6 * lk}}
p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0] - 2 * lk, FAR[1])); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0] + 2 * lk, NEAR[1]))
kf("F16_RISING", "RISING", "+0.88–0.97 s", p, "up on both feet in a deep crouch, hands coming up; style 25 %", "both feet", (0.0, 0.0), style=0.25)
sf("F17_READY", "RETURN TO READY", "+0.97–1.05 s → live SET", {}, "GK_BASE_V1 SET/" + FACING + ", untouched", "both feet", clean=False)
A.save({"family": "SW_FAR", "side": SIDE, "facing": FACING})
