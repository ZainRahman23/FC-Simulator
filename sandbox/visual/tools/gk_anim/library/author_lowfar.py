# LOW-FAR DIVE to the keeper's LEFT (LOW_DIVE_LEFT_FAR: the Pro side-roll drawn MIRRORED at 0.60, dive to screen down-right, contact
# only 3–6 px above the ground). Shares the LEFT_FAR ground frames F01–F05 (same plant on the LEFT foot); own low flight F05b–F07b
# (the body stays low, arms driving down-right), Pro-part bridges F07c–F09 and landing F11–F15a2 from the LOW_FAR rig (baked mirrored,
# like the still), then the LEFT_FAR get-up F15a3–F17.   python3 author_lowfar.py <outdir>
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig
from rig_w_set import build as build_set
from rig_lowfar import build as build_lf, ROOT as LROOT
OUT = sys.argv[1] if len(sys.argv) > 1 else "."; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_lf()
S = SetRig(RS)
C = ContactRig(RC, LROOT, 0.60, (200, 140), (28, 40), {"head": ("joint", "head"), "lead_glove": ("joint", "glove_B"), "other_glove": ("joint", "glove_A"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve"),
                                                       "foot_L": ("distal", "shin_1"), "foot_R": ("distal", "shin_2")}, "LOW_DIVE_LEFT")
A = Author(S, C, OUT)
# Geometry rel. the sim root (mirrored art, i.e. as drawn): waist ((80.5-96)*-1... measured on the mirrored image: hips ≈ (-3.9,-10.2),
# neck (+7.4,-13.8), lead glove (+9.3,-9.4)/(15.5,-5.6), feet (-11,-13)/(-11,-7). Root travel ≈ (+0.2,+7.1) (toward the camera).
HEAD = {"F05b": (3.0, -30.0), "F06": (4.4, -24.5), "F07": (6.0, -18.5), "F07b": (7.0, -15.0)}
HIPS = {"F05b": (0.6, -20.4), "F06": (-1.0, -17.0), "F07": (-2.6, -13.0), "F07b": (-3.6, -11.0)}
def fl(key, name, phase, t, A_, k, ext, fs, sx, hs, lsx, legs, legsy, style, rs, note):
    A.flight(name, phase, t, HEAD[key], HIPS[key], A_, k, ext, fs, sx, hs, lsx, legs, legsy, style, rs, note, spread=6, far_dx=-2)
# the arms drive DOWN and to the right (screen): A < 90 swings right; the body lays out low toward the camera-right
fl("F05b", "F05b_LEAVING_GROUND", "LEAVING THE GROUND (low)", "u 0.29–0.36", 40, 0.70, 2, 1, 0.94, 0.98, 0.96, ((8, -12, 4), (16, -24, 6)), 0.92, 0.40, (0, 3), "first airborne tick, the body already leaning low toward the ball, arms driving down-right")
fl("F06", "F06_EARLY_FLIGHT", "EARLY FLIGHT (low)", "u 0.36–0.46", 22, 0.85, 3, 2, 0.88, 0.94, 0.90, ((44, -46, 6), (56, -56, 8)), 0.72, 0.55, (0, 3), "hands leading down at the ball, trunk laying out low, legs trailing behind")
fl("F07", "F07_MID_FLIGHT", "MID FLIGHT (low)", "u 0.46–0.57", 8, 1.0, 3, 4, 0.83, 0.90, 0.86, ((118, -80, 8), (128, -74, 10)), 0.70, 0.72, (0, 4), "arms straight at the low ball, body nearly horizontal just above the pitch, legs folded behind")
fl("F07b", "F07b_BRIDGE", "BRIDGE (contact proportions)", "u 0.57–0.68", 0, 1.0, 4, -3, 0.78, 0.86, 0.82, ((150, -34, 10), (160, -30, 12)), 0.84, 1.0, (0, 5), "the last GK_BASE_V1 frame with the contact art's proportions, palette and thinned outlines: horizontal low layout, arms fully extended")
fl("F06", "F06m_EARLY_FLIGHT_MOD", "EARLY FLIGHT (moderate)", "u 0.37–0.46 (norm < 0.8)", 26, 0.70, 1, 2, 0.88, 0.94, 0.90, ((38, -50, 6), (48, -60, 8)), 0.66, 0.55, (0, 3), "moderate variant")
fl("F07", "F07m_MID_FLIGHT_MOD", "MID FLIGHT (moderate)", "u 0.46–0.56 (norm < 0.8)", 12, 0.85, 2, 4, 0.83, 0.90, 0.86, ((112, -92, 8), (120, -86, 10)), 0.62, 0.72, (0, 4), "moderate variant")
cf = A.contact_frame
# contact-rig frames in the ORIGINAL orientation (dive to screen-LEFT); baked mirrored. rot: negative = arms/head further from contact
HB = {"F07c": (3.9, -10.6), "F08": (3.9, -10.4), "F09": (3.9, -10.3)}          # hips in the ORIGINAL orientation (x mirrored at bake)
cf("F07c_BRIDGE_PRO_A", "BRIDGE (Pro parts, arms 18° short, 75 % outline)", "u 0.65–0.73 (hand-led)", {"sleeve": {"rot": 18}, "glove_A": {"rot": -5}, "glove_B": {"rot": -6}, "thigh_1": {"rot": 8}, "shin_1": {"rot": 30}, "thigh_2": {"rot": 8}, "shin_2": {"rot": 34}, "torso": {"rot": 2}, "head": {"rot": 5}},
   "the contact art's own components, arms 18° short and knees folded, 75 % outline", "airborne (low)", 0, HB["F07c"], out_style=0.75)
cf("F08_BRIDGE_PRO", "BRIDGE (Pro parts, arms 10° short)", "u 0.73–0.84 (hand-led)", {"sleeve": {"rot": 10}, "glove_A": {"rot": -3}, "glove_B": {"rot": -4}, "thigh_1": {"rot": 5}, "shin_1": {"rot": 16}, "thigh_2": {"rot": 5}, "shin_2": {"rot": 18}, "torso": {"rot": 1}, "head": {"rot": 3}},
   "arms 10° short, knees opening, 50 % outline", "airborne (low)", 0, HB["F08"], out_style=0.5)
cf("F09_FINAL_EXTENSION", "FINAL EXTENSION (bridge)", "u 0.84–0.95 (hand-led)", {"sleeve": {"rot": 4}, "glove_A": {"rot": -1}, "glove_B": {"rot": -2}, "thigh_1": {"rot": 2}, "shin_1": {"rot": 6}, "thigh_2": {"rot": 2}, "shin_2": {"rot": 7}, "torso": {"rot": 0}, "head": {"rot": 1}},
   "arms 4° short, knees 2° short, 25 % outline: the last authored frame before the untouched contact PNG", "airborne (low)", 0, HB["F09"], out_style=0.25)
# landing: already low — the hips drop the last few px, the body slides/settles on the front, then the push-up
LAND = {"F11": (3.6, -9.6), "F11b": (3.2, -8.4), "F12": (2.4, -6.6), "F12b": (1.6, -5.0), "F13": (0.8, -3.8), "F13b": (0.4, -3.4), "F14": (0.0, -3.0), "F15a": (0.0, -3.6), "F15a2": (-0.4, -5.2)}
cf("F11_POST_CONTACT", "POST-CONTACT (follow-through)", "endT +0.05–0.11 s", {"sleeve": {"rot": -6}, "glove_A": {"rot": 3}, "glove_B": {"rot": 4}, "thigh_1": {"rot": -3}, "shin_1": {"rot": -8}, "thigh_2": {"rot": -3}, "shin_2": {"rot": -8}, "torso": {"rot": 1}, "head": {"rot": -3}}, "momentum: gloves through the ball line", "airborne (low)", 3, LAND["F11"])
cf("F11b_APEX", "SETTLE", "+0.11–0.17 s", {"sleeve": {"rot": -12}, "glove_A": {"rot": 6}, "glove_B": {"rot": 8}, "thigh_1": {"rot": -6}, "shin_1": {"rot": -14}, "thigh_2": {"rot": -6}, "shin_2": {"rot": -14}, "torso": {"rot": 2}, "head": {"rot": -5}}, "the slide slows", "front", 6, LAND["F11b"])
cf("F12_DESCENT", "GROUND", "+0.17–0.23 s", {"sleeve": {"rot": -20}, "glove_A": {"rot": 10}, "glove_B": {"rot": 12}, "thigh_1": {"rot": -8}, "shin_1": {"rot": -22}, "thigh_2": {"rot": -8}, "shin_2": {"rot": -22}, "torso": {"rot": 3}, "head": {"rot": -7}}, "hips on the pitch, arms folding to brace", "front", 9, LAND["F12"])
cf("F12b_FALLING", "ABSORB", "+0.23–0.30 s", {"sleeve": {"rot": -30}, "glove_A": {"rot": 14}, "glove_B": {"rot": 16}, "thigh_1": {"rot": -10}, "shin_1": {"rot": -32}, "thigh_2": {"rot": -10}, "shin_2": {"rot": -32}, "torso": {"rot": 4}, "head": {"rot": -9}}, "arms bracing, knees drawing up", "front", 12, LAND["F12b"])
cf("F13_GROUND_CONTACT", "ABSORB (settled)", "+0.30–0.37 s", {"sleeve": {"rot": -40}, "glove_A": {"rot": 18}, "glove_B": {"rot": 22}, "thigh_1": {"rot": -14}, "shin_1": {"rot": -44}, "thigh_2": {"rot": -14}, "shin_2": {"rot": -44}, "torso": {"rot": 5}, "head": {"rot": -11}}, "settled on the front/side", "front + forearm", 15, LAND["F13"])
cf("F13b_SETTLING", "SETTLING", "+0.37–0.45 s", {"sleeve": {"rot": -48}, "glove_A": {"rot": 21}, "glove_B": {"rot": 26}, "thigh_1": {"rot": -18}, "shin_1": {"rot": -52}, "thigh_2": {"rot": -18}, "shin_2": {"rot": -52}, "torso": {"rot": 5, "sy": 0.97}, "head": {"rot": -12}}, "knees drawing up", "front + forearm", 18, LAND["F13b"])
cf("F14_ABSORB", "PUSH BEGINS", "+0.45–0.55 s", {"sleeve": {"rot": -60}, "glove_A": {"rot": 24}, "glove_B": {"rot": 30}, "thigh_1": {"rot": -22}, "shin_1": {"rot": -60}, "thigh_2": {"rot": -22}, "shin_2": {"rot": -60}, "torso": {"rot": 6, "sy": 0.94}, "head": {"rot": -13}}, "hands under the chest, knees up", "side", 20, LAND["F14"])
cf("F15a_PUSH_UP", "RECOVERY TURN (pushing up)", "+0.55–0.63 s", {"sleeve": {"rot": -110}, "glove_A": {"rot": 30}, "glove_B": {"rot": 36}, "thigh_1": {"rot": -30}, "shin_1": {"rot": -80}, "thigh_2": {"rot": -26}, "shin_2": {"rot": -74}, "torso": {"rot": -40, "sy": 0.72}, "head": {"rot": 30}}, "upper body pushing up off the forearm/gloves", "hip + hands", 16, LAND["F15a"], out_style=0.35)
cf("F15a2_SITTING_UP", "SITTING UP", "+0.63–0.71 s", {"sleeve": {"rot": -150}, "glove_A": {"rot": 30}, "glove_B": {"rot": 36}, "thigh_1": {"rot": -36}, "shin_1": {"rot": -96}, "thigh_2": {"rot": -32}, "shin_2": {"rot": -90}, "torso": {"rot": -92, "sy": 0.80}, "head": {"rot": 26}}, "trunk upright to the knees, hands on the pitch (last Pro-part frame)", "knees + hands", 12, LAND["F15a2"], out_style=0.6)
A.save({"family": "LOW_FAR_LEFT", "contact_pose": "LOW_DIVE_LEFT_FAR", "shared_from": "LEFT_FAR: F01–F05, F15a3–F17"})
