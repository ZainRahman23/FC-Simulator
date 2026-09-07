# RIGHT FAR DIVE V2b — pre-contact frames retargeted to the 60° CW NORTH contact pose (approved 2026-09-07).
# Trunk F00–F06 = V2 unchanged (W SET rig; planted drive foot, no sliding, proportions/palette morphing toward the Pro art).
# Late flight F07 → F07b → F08 → F09 → CONTACT@60: the contact art's own components (NORTH_CW60 rig) with a whole-body ROLL that
# develops progressively — F07 is drawn 10° short of the contact orientation (i.e. at the previous 50° orientation, which F06 was
# shaped for), then −7.5°, −5°, −2.5°, and the untouched PNG at 0 — while the knees unfold, the sleeve reaches full length and the Pro
# outline fades in. Every late frame has its lead glove's rendered centroid ON the simulation hand for its u (the live anchors' own
# convention), so the hand-led placement has nothing to correct and the hips/feet redistribute the new contact orientation's offset
# across the four frames instead of swinging at contact. Hands and shoulders lead, torso follows, hips follow, legs trail; no cartwheel.
#   python3 author_right_v2b.py <geometry.json (HIGH representative save)> <outdir>
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from v2_common import V2, author_trunk
GEO, OUT = sys.argv[1], sys.argv[2]
# foot labels are PHYSICAL (foot_L = the keeper's left, the trailing screen-right leg = the rig's screen-right shin_R), like the SET rig's far_boot
LM = {"head": ("joint", "head"), "lead_glove": ("joint", "glove_A"), "other_glove": ("joint", "glove_B"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve"), "foot_L": ("distal", "shin_R"), "foot_R": ("distal", "shin_L")}
V = V2(GEO, OUT, "rig_north_cw60", LM, contact_canvas=(150, 260), contact_off=(46, 40), contact_label="DIVE_NORTH_CW60")
author_trunk(V, through="F06")
# ── late flight: NORTH_CW60 parts. roll = pelvis rotation of the whole figure (deg, + clockwise); the art itself is at 0.
ROLL = {"F07": -8.0, "F07b": -6.0, "F08": -4.0, "F09": -2.0}          # CW60 torso axis 102.6°; F06's is 94.7° → F07 at −8° continues it, then 2° per frame
# waist (rig pelvis pivot) rel. root: continues F06's base-rig hips (0.9,-19.0) as V2 did (F07 1.6,-18.2) and converges on the CW60 art's
# waist (-0.85,-14.6) in ~1.1 px steps instead of V2's (3.0,-15.4): the new orientation's hip/feet offset is spread over four frames
HB = {"F07": (1.6, -18.2), "F07b": (1.0, -17.3), "F08": (0.4, -16.4), "F09": (-0.2, -15.5)}          # initial guesses; the reach solve moves them
# hand-led anchor: the LOWER glove at F07 (the leading hand a little beyond the simulation's reach point, the second hand on it), blending
# to the art's merged-blob anchor (all bright glove pixels) by F09 — the convention the untouched contact PNG is placed with
ANCHOR_K = {"F07": 1.0, "F07b": 0.67, "F08": 0.33, "F09": 0.0}
SY = {"F07": 0.85, "F07b": 0.89, "F08": 0.93, "F09": 0.97}                    # sleeve foreshortening growing uniformly to the art's 1.0
V.pro_frame("F07_LATE_BRIDGE", "LATE FLIGHT (Pro parts, roll −8°, 75 % outline)", 0.58, 0.68,
            {"sleeve": {"rot": 4, "sy": 0.90, "sx": 0.96}, "glove_A": {"rot": -2}, "glove_B": {"rot": -1}, "thigh_L": {"rot": 16}, "shin_L": {"rot": -36}, "thigh_R": {"rot": 16}, "shin_R": {"rot": -40}, "torso": {"rot": -1}, "head": {"rot": -3}},
            ROLL["F07"], 0.75, "the contact art's own components at the previous (50°) orientation F06 was shaped for: sleeve short, knees folded 42° (heels up behind)", hips=HB["F07"], lower_glove="glove_B", anchor_k=ANCHOR_K["F07"], sy_bounds=(SY["F07"], SY["F07"]))
V.pro_frame("F07b_ROLL", "LATE FLIGHT (Pro parts, roll −6°, 60 % outline)", 0.68, 0.77,
            {"sleeve": {"rot": 3, "sy": 0.93, "sx": 0.98}, "glove_A": {"rot": -1.5}, "glove_B": {"rot": -1}, "thigh_L": {"rot": 12}, "shin_L": {"rot": -27}, "thigh_R": {"rot": 12}, "shin_R": {"rot": -30}, "torso": {"rot": -0.5}, "head": {"rot": -2}},
            ROLL["F07b"], 0.60, "the body rolls 2.5° toward the contact orientation, knees 33°", hips=HB["F07b"], lower_glove="glove_B", anchor_k=ANCHOR_K["F07b"], sy_bounds=(SY["F07b"], SY["F07b"]))
V.pro_frame("F08_FULL_EXTENSION", "FULL EXTENSION (Pro parts, roll −4°, 45 % outline)", 0.77, 0.86,
            {"sleeve": {"rot": 2, "sy": 0.96}, "glove_A": {"rot": -1}, "glove_B": {"rot": 0}, "thigh_L": {"rot": 8}, "shin_L": {"rot": -18}, "thigh_R": {"rot": 8}, "shin_R": {"rot": -20}, "torso": {"rot": 0}, "head": {"rot": -1}},
            ROLL["F08"], 0.45, "knees 22°, body 5° short of the contact orientation", hips=HB["F08"], lower_glove="glove_B", anchor_k=ANCHOR_K["F08"], sy_bounds=(SY["F08"], SY["F08"]))
V.pro_frame("F09_LATE_FLIGHT", "LATE FLIGHT (Pro parts, roll −2°, 20 % outline)", 0.86, 0.95,
            {"sleeve": {"rot": 1, "sy": 0.99}, "glove_A": {"rot": 0}, "glove_B": {"rot": 0}, "thigh_L": {"rot": 4}, "shin_L": {"rot": -9}, "thigh_R": {"rot": 4}, "shin_R": {"rot": -10}, "torso": {"rot": 0}, "head": {"rot": 0}},
            ROLL["F09"], 0.20, "knees 9°, body 2.5° short of the contact orientation: the last authored frame before the untouched PNG", hips=HB["F09"], lower_glove="glove_B", anchor_k=ANCHOR_K["F09"], sy_bounds=(SY["F09"], SY["F09"]))
V.save({"family": "RIGHT_V2b_PRECONTACT", "contact_pose": "DIVE_NORTH_MEDHIGH (CW60)", "geometry": os.path.abspath(GEO), "roll": ROLL, "hips": HB})
for f in V.A.FRAMES:
    if "glove_minus_hand" in f: print(f"{f['name']:22s} roll {f['roll_deg']:6.1f} hips {f['hips_rel_root']} (shift {f['hips_shift_for_reach']}) arm {f['arm_solved']} anchor-hand {f['glove_minus_hand']}")
