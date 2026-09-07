# RIGHT TOP-CORNER BRANCH (V2) — shares the RIGHT trunk F00–F05 (load, plant, push, toe-off, early flight: identical tables, identical
# baked files) and branches during late flight into the approved TOP_LEFT_CORNER_CW50 contact art (unchanged, body scale 0.72):
#   F06t (W SET rig, last base frame, shaped toward the corner art: torso leaning into the dive, LEFT arm starting to spread)
#   → F07t → F08t → F09t (the corner art's own components: whole-body roll developing from the trunk's orientation to the art's, the far
#     arm sweeping out from beside the lead arm to its spread contact line, knees unfolding, outline fading in) → CONTACT (untouched PNG).
# Geometry = the representative full-stretch TOP save (right_geometry.js on lat -1.8 z 1.9 v 24). Lead glove on the simulation hand.
#   python3 author_right_top_v2.py <geometry.json (TOP representative save)> <outdir> <geometry.json (HIGH save, for the shared trunk)> [trunk_dir to assert the shared frames are identical]
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from v2_common import V2, author_trunk, HEAD, HIPS
GEO, OUT, GEO_HIGH = sys.argv[1], sys.argv[2], sys.argv[3]; TRUNK = sys.argv[4] if len(sys.argv) > 4 else None
LM = {"head": ("joint", "head"), "lead_glove": ("joint", "glove_lead"), "other_glove": ("joint", "glove_far"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "arm_lead"), "foot_L": ("distal", "shin_B"), "foot_R": ("distal", "shin_A")}   # physical: foot_L = keeper's left = trailing screen-right shin_B
V = V2(GEO_HIGH, OUT, "rig_topcorner_cw50", LM, contact_canvas=(170, 260), contact_off=(28, 40), contact_label="TOP_LEFT_CORNER_CW50")
author_trunk(V, through="F05")                 # shared trunk: the HIGH save's geometry → byte-identical files
V.use_geometry(GEO)                            # the branch: this save's own root travel and hand path
# F06t — last base frame, shaped toward the corner art: head a little to the left of the hips (the torso starts to lean into the dive),
# RIGHT (lead) arm straight up at the ball, LEFT (far) arm spreading left of it, legs trailing down-right as in F06
V.base_frame("F06t_MID_FLIGHT_TOP", "MID FLIGHT (last base frame, TOP branch)", 0.44, 0.58, (0.3, -30.6), HIPS["F06"], 1.0, 0.84, 0.96, 6, 4, ((-1.5, -40.5), (-5.5, -36.0)), 0.10, ("rot", -4, -8, 12, 1.0), ("rot", -14, -22, 10, 1.0), 0.90,
             "TOP branch: lead arm straight at the ball, the LEFT arm beginning to spread left, torso leaning into the dive, legs trailing", "airborne")
# ── corner-art parts: roll (pelvis rot, + = clockwise) from the trunk's orientation toward the art's (0); arm_far sweeps out (positive =
# clockwise = the leftward arm rising toward the lead arm), knees unfold, outline fades in
ROLL = {"F07t": 9.0, "F08t": 5.0, "F09t": 2.0}
SY = {"F07t": 0.80, "F08t": 0.87, "F09t": 0.94}                                # lead-arm foreshortening growing uniformly to the art's 1.0
TSY = {"F07t": 1.10, "F08t": 1.05, "F09t": 1.02}                               # the corner art's torso is foreshortened (10.3 px vs the trunk's 13.4): eased in
# waist (rig pelvis pivot) rel. root: from F06t's base hips (0.9,-19.0) toward the corner art's waist (-1.8,-20.9)
HB = {"F07t": (0.3, -19.5), "F08t": (-0.5, -20.0), "F09t": (-1.2, -20.5)}
V.pro_frame("F07t_LATE_TOP", "LATE FLIGHT (corner parts, roll +9°, 75 % outline)", 0.58, 0.70,
            {"arm_lead": {"rot": -14, "sy": 0.92}, "glove_lead": {"rot": 4}, "arm_far": {"rot": 34, "sy": 0.92}, "glove_far": {"rot": 6}, "thigh_A": {"rot": -28}, "shin_A": {"rot": 38}, "thigh_B": {"rot": -38}, "shin_B": {"rot": 34}, "torso": {"rot": -1, "sy": TSY["F07t"], "sx": 0.90}, "head": {"rot": -3}},
            ROLL["F07t"], 0.75, "the corner art's components 9° short of its orientation: lead arm 14° short and 8 % short, the far arm still raised 34° above its spread line, legs trailing right (as the trunk), knees bent", hips=HB["F07t"], aim_arm="arm_lead", aim_gloves=("glove_lead",), sy_bounds=(SY["F07t"], SY["F07t"]))
V.pro_frame("F08t_EXTENSION_TOP", "EXTENSION (corner parts, roll +5°, 50 % outline)", 0.70, 0.83,
            {"arm_lead": {"rot": -7, "sy": 0.96}, "glove_lead": {"rot": 2}, "arm_far": {"rot": 16, "sy": 0.96}, "glove_far": {"rot": 3}, "thigh_A": {"rot": -20}, "shin_A": {"rot": 18}, "thigh_B": {"rot": -22}, "shin_B": {"rot": 20}, "torso": {"rot": -0.5, "sy": TSY["F08t"], "sx": 0.95}, "head": {"rot": -1}},
            ROLL["F08t"], 0.50, "5° short of the contact orientation, far arm sweeping down to 16° above its line, knees opening", hips=HB["F08t"], aim_arm="arm_lead", aim_gloves=("glove_lead",), sy_bounds=(SY["F08t"], SY["F08t"]))
V.pro_frame("F09t_FINAL_TOP", "FINAL EXTENSION (corner parts, roll +2°, 25 % outline)", 0.83, 0.95,
            {"arm_lead": {"rot": -3, "sy": 0.99}, "glove_lead": {"rot": 1}, "arm_far": {"rot": 6, "sy": 0.99}, "glove_far": {"rot": 1}, "thigh_A": {"rot": -8}, "shin_A": {"rot": 8}, "thigh_B": {"rot": -9}, "shin_B": {"rot": 9}, "torso": {"rot": 0, "sy": TSY["F09t"]}, "head": {"rot": 0}},
            ROLL["F09t"], 0.25, "2° short, far arm 6° above its line, knees 5°: the last authored frame before the untouched corner PNG", hips=HB["F09t"], aim_arm="arm_lead", aim_gloves=("glove_lead",), sy_bounds=(SY["F09t"], SY["F09t"]))
V.save({"family": "RIGHT_V2b_TOP_BRANCH", "contact_pose": "TOP_LEFT_CORNER", "geometry": os.path.abspath(GEO), "roll": ROLL, "shared_trunk": ["F00_SET", "F01_LOAD", "F02_PLANT", "F03_PUSH", "F04_TOE_OFF", "F05_EARLY_FLIGHT"]})
for f in V.A.FRAMES:
    if "glove_minus_hand" in f: print(f"{f['name']:22s} roll {f['roll_deg']:6.1f} hips {f['hips_rel_root']} (shift {f['hips_shift_for_reach']}) arm {f['arm_solved']} anchor-hand {f['glove_minus_hand']}")
if TRUNK:
    from PIL import Image
    for n in ("F01_LOAD", "F02_PLANT", "F03_PUSH", "F04_TOE_OFF", "F05_EARLY_FLIGHT"):
        a = Image.open(os.path.join(OUT, n + ".png")).convert("RGBA"); b = Image.open(os.path.join(TRUNK, n + ".png")).convert("RGBA")
        print("shared", n, "identical to the trunk:", a.size == b.size and list(a.getdata()) == list(b.getdata()))
