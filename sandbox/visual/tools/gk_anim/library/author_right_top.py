# RIGHT TOP-CORNER full-stretch dive (GOAL_LEFT TOP with real lateral demand → TOP_LEFT_CORNER_CW50 @ 0.72): shares the RIGHT_FAR
# trunk F01–F07 (the same leap up-left) and its get-up F15a3–F17; authors here: the base bridge F07b (one arm high, the other spread
# left, as the corner art), the Pro-part bridges F07c–F09 and the post-contact / landing F11–F15a2 from the corner rig.
#   python3 author_right_top.py <outdir>
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig
from rig_w_set import build as build_set
from rig_topcorner_cw50 import build as build_tc, ROOT as TROOT
OUT = sys.argv[1] if len(sys.argv) > 1 else "."; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_tc()
S = SetRig(RS)
C = ContactRig(RC, TROOT, 0.72, (170, 260), (28, 40), {"head": ("joint", "head"), "lead_glove": ("joint", "glove_lead"), "other_glove": ("joint", "glove_far"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "arm_lead"),
                                                           "foot_L": ("distal", "shin_A"), "foot_R": ("distal", "shin_B")}, "TOP_LEFT_CORNER_CW50")
A = Author(S, C, OUT)
# contact art rel. its root: waist (-1.8,-20.9), neck (-4.3,-30.9), lead glove (-2.7,-43.2), far glove (-17.2,-30.9), feet (0,0)/(6.6,-3.4);
# the root travels ~(-5.7,-6.3) on this dive, so the waist rises 8 px in absolute terms (a full stretch), the neck 3.6 px.
HEAD = {"F07b": (0.5, -31.5), "F07c": (0.0, -31.3), "F08": (-0.6, -31.1), "F09": (-1.4, -31.0)}
HIPS = {"F07b": (0.1, -20.0), "F07c": (-0.1, -20.0), "F08": (-0.9, -20.5), "F09": (-1.5, -20.9)}
# F07b — base bridge: RIGHT (near) arm straight up-left to the lead glove, LEFT (far) arm spread to the left at shoulder height
p, T, root = A.body(HEAD["F07b"], HIPS["F07b"], sx=0.92, head_scale=0.96, limb_sx=0.92, root_shift=(0, 5)); p["_limb_sx"] = 0.92
p = A.arms(p, 250, T, 1.0, ext=5, spread=0); p["far_upper"] = {"rot": 62 - T, "ext": 3, "dx": -1, "sx": 0.92}; p["far_fore"] = {"rot": 4, "ext": 3, "sx": 0.92}
for part, rot in (("far_thigh", -16), ("far_shin", -10), ("far_boot", 8), ("near_thigh", -8), ("near_shin", -6), ("near_boot", 10)): p[part] = {"rot": rot, "sy": 1.0, "sx": 0.92} if "boot" not in part else {"rot": rot}
for part in ("far_thigh", "far_shin", "near_thigh", "near_shin"): p[part]["ext"] = 3
A.set_frame("F07b_BRIDGE_TOP", "BRIDGE (corner proportions)", "u 0.57–0.68", A.finish(p), "the last GK_BASE_V1 frame shaped like the corner art: RIGHT arm straight up-left, LEFT arm spread to the left, legs trailing down-right", "airborne", root_shift=(0, 5), style=1.0)
cf = A.contact_frame
cf("F07c_BRIDGE_PRO_A", "BRIDGE (Pro parts, arms 22° short, 75 % outline)", "u 0.65–0.73 (hand-led)",
   {"arm_lead": {"rot": -22}, "glove_lead": {"rot": 6}, "arm_far": {"rot": -20}, "glove_far": {"rot": 6}, "thigh_A": {"rot": 10}, "shin_A": {"rot": 46}, "thigh_B": {"rot": 10}, "shin_B": {"rot": 50}, "torso": {"rot": -2}, "head": {"rot": -5}},
   "the corner art's own components with both arms 20° short of their contact directions and the knees folded, 75 % outline", "airborne", 0, HIPS["F07c"], out_style=0.75)
cf("F08_BRIDGE_PRO", "BRIDGE (Pro parts, arms 12° short)", "u 0.73–0.84 (hand-led)",
   {"arm_lead": {"rot": -12}, "glove_lead": {"rot": 4}, "arm_far": {"rot": -11}, "glove_far": {"rot": 4}, "thigh_A": {"rot": 6}, "shin_A": {"rot": 24}, "thigh_B": {"rot": 6}, "shin_B": {"rot": 26}, "torso": {"rot": -1}, "head": {"rot": -3}},
   "arms 12° short, knees opening, 50 % outline", "airborne", 0, HIPS["F08"], out_style=0.5)
cf("F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.84–0.95 (hand-led)",
   {"arm_lead": {"rot": -5}, "glove_lead": {"rot": 2}, "arm_far": {"rot": -4}, "glove_far": {"rot": 2}, "thigh_A": {"rot": 2}, "shin_A": {"rot": 8}, "thigh_B": {"rot": 2}, "shin_B": {"rot": 9}, "torso": {"rot": 0}, "head": {"rot": -1}},
   "arms 5° short, knees 2° short, 25 % outline: the last authored frame before the untouched contact PNG", "airborne", 0, HIPS["F09"], out_style=0.25)
# post-contact / landing around the PRESENTATION root: the full stretch carries over onto the right side (screen up-left)
LAND = {"F11": (-1.6, -19.5), "F11b": (-1.4, -18.5), "F12": (-1.0, -15.5), "F12b": (-0.6, -11.5), "F13": (-0.4, -7.2), "F13b": (-0.4, -5.6), "F14": (0.0, -4.6), "F15a": (0.0, -5.0), "F15a2": (0.4, -6.4)}
cf("F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.05–0.11 s", {"arm_lead": {"rot": 6}, "glove_lead": {"rot": -4}, "arm_far": {"rot": 8}, "glove_far": {"rot": -4}, "thigh_A": {"rot": -4}, "shin_A": {"rot": 6}, "thigh_B": {"rot": -4}, "shin_B": {"rot": 8}, "torso": {"rot": -2}, "head": {"rot": 3}},
   "momentum: body 5° past contact, gloves through the ball line, knees starting to fold", "airborne", -5, LAND["F11"])
cf("F11b_APEX", "APEX", "+0.11–0.17 s", {"arm_lead": {"rot": 12}, "glove_lead": {"rot": -7}, "arm_far": {"rot": 14}, "glove_far": {"rot": -7}, "thigh_A": {"rot": -8}, "shin_A": {"rot": 14}, "thigh_B": {"rot": -8}, "shin_B": {"rot": 16}, "torso": {"rot": -3}, "head": {"rot": 5}},
   "the rise has stopped; the body keeps turning over to the right side", "airborne", -11, LAND["F11b"])
cf("F12_DESCENT", "DESCENT", "+0.17–0.23 s", {"arm_lead": {"rot": 22}, "glove_lead": {"rot": -10}, "arm_far": {"rot": 24}, "glove_far": {"rot": -10}, "thigh_A": {"rot": -14}, "shin_A": {"rot": 18}, "thigh_B": {"rot": -12}, "shin_B": {"rot": 20}, "torso": {"rot": -4}, "head": {"rot": 7}},
   "falling toward the right side, arms folding down to brace, knees bending", "airborne (falling)", -20, LAND["F12"])
cf("F12b_FALLING", "FALLING", "+0.23–0.30 s", {"arm_lead": {"rot": 34}, "glove_lead": {"rot": -14}, "arm_far": {"rot": 36}, "glove_far": {"rot": -14}, "thigh_A": {"rot": -20}, "shin_A": {"rot": 26}, "thigh_B": {"rot": -18}, "shin_B": {"rot": 28}, "torso": {"rot": -5}, "head": {"rot": 9}},
   "arms reaching for the pitch, knees folding further", "airborne (falling)", -30, LAND["F12b"])
cf("F13_GROUND_CONTACT", "FIRST GROUND CONTACT", "+0.30–0.37 s", {"arm_lead": {"rot": 48}, "glove_lead": {"rot": -18}, "arm_far": {"rot": 50}, "glove_far": {"rot": -20}, "thigh_A": {"rot": -26}, "shin_A": {"rot": 30}, "thigh_B": {"rot": -24}, "shin_B": {"rot": 32}, "torso": {"rot": -6}, "head": {"rot": 11}},
   "right hip and forearm meet the pitch at the presentation root, gloves bracing, knees folded", "right side + forearm", -42, LAND["F13"])
cf("F13b_SETTLING", "SETTLING", "+0.37–0.45 s", {"arm_lead": {"rot": 56}, "glove_lead": {"rot": -21}, "arm_far": {"rot": 58}, "glove_far": {"rot": -24}, "thigh_A": {"rot": -30}, "shin_A": {"rot": 34}, "thigh_B": {"rot": -28}, "shin_B": {"rot": 36}, "torso": {"rot": -6, "sy": 0.97}, "head": {"rot": 12}},
   "trunk settling onto the right side, knees drawing up", "right side + forearm", -48, LAND["F13b"])
cf("F14_ABSORB", "ABSORB IMPACT", "+0.45–0.55 s", {"arm_lead": {"rot": 64}, "glove_lead": {"rot": -24}, "arm_far": {"rot": 66}, "glove_far": {"rot": -28}, "thigh_A": {"rot": -34}, "shin_A": {"rot": 38}, "thigh_B": {"rot": -32}, "shin_B": {"rot": 40}, "torso": {"rot": -7, "sy": 0.94}, "head": {"rot": 13}},
   "flat on the right side, torso compressed 6 %, arms tucked, knees up", "right side", -53, LAND["F14"])
cf("F15a_PUSH_UP", "RECOVERY TURN (pushing up)", "+0.55–0.63 s", {"arm_lead": {"rot": 215}, "glove_lead": {"rot": -30}, "arm_far": {"rot": 150}, "glove_far": {"rot": -30}, "thigh_A": {"rot": -40}, "shin_A": {"rot": 60}, "thigh_B": {"rot": -34}, "shin_B": {"rot": 56}, "torso": {"rot": 42, "sy": 0.72}, "head": {"rot": 30}},
   "upper body pushing up off the forearm/gloves, head turning to the play, knees drawn under", "hip + hands", -46, LAND["F15a"], out_style=0.35)
cf("F15a2_SITTING_UP", "SITTING UP", "+0.63–0.71 s", {"arm_lead": {"rot": 170}, "glove_lead": {"rot": -30}, "arm_far": {"rot": 110}, "glove_far": {"rot": -30}, "thigh_A": {"rot": -46}, "shin_A": {"rot": 72}, "thigh_B": {"rot": -38}, "shin_B": {"rot": 68}, "torso": {"rot": 96, "sy": 0.80}, "head": {"rot": 26}},
   "trunk upright to the knees, hands on the pitch: the last Pro-part frame (60 % outline)", "knees + hands", -50, LAND["F15a2"], out_style=0.6)
A.save({"family": "RIGHT_TOP", "contact_pose": "TOP_LEFT_CORNER", "shared_from": "RIGHT_FAR: F01–F07 (+moderate), F15a3–F17"})
