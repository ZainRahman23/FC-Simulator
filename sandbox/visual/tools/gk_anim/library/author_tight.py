# TIGHT-ANGLE high saves (S- or N-facing keeper at the near post, chip to the near/far top corner → TIGHT_{S,N}_{NEAR,FAR}_TOP stills,
# GK_BASE_V1 lineage at scale 1.0). A shorter action than the far dives: crouch → push up and toward the post side → reach up (base rig,
# shaped like the still) → [live still] → come down → land in a crouch → SET. Frames from the SOUTH / NORTH SET rigs.
#   python3 author_tight.py <facing south|north> <post near|far> <outdir>
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig
from rig_set_dirs import build as build_dir
facing, post, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(OUT, exist_ok=True)
RS, _ = build_dir(facing, OUT)
an = json.load(open("assets/visual_v1/goalkeeper/anchors/set.json"))[facing]
S = SetRig(RS, root=(an["content_cx"], an["foot_row"]), label="SET/" + facing, torso_vec=(RS.parts["head"].pivot[0] - RS.parts["torso"].pivot[0], RS.parts["head"].pivot[1] - RS.parts["torso"].pivot[1]))
A = Author(S, None, OUT)
NEAR, FAR = S.near_foot, S.far_foot
# still gloves rel. root: S_NEAR (+20,-48.5), S_FAR (-20.8,-47.2), N_NEAR (+19.7,-48.9), N_FAR (-21,-50): the reach goes UP and to
# screen-right for the NEAR post, screen-left for the FAR post (both facings). d = screen direction of the reach.
d = 1 if post == "near" else -1
sf = A.set_frame
sf("F00_READY", "READY / SET", "t 0", {}, f"GK_BASE_V1 SET/{facing}, untouched", "both feet", clean=False)
# F01 crouch (shared per facing): hips 3 px down, arms back
p = {"pelvis": {"dy": 7}, "torso": {"rot": 0, "sy": 0.96}, "head": {"rot": 0}, "near_upper": {"rot": -6}, "near_fore": {"rot": 0}, "far_upper": {"rot": 6}, "far_fore": {"rot": 0}}
p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR)
sf("F01_CROUCH", "CROUCH / LOAD", "u 0.00–0.22", p, "hips down 3 px, knees loaded, arms back", "both feet")
# F02 push: hips rising, leaning toward the post side, arms swinging up on that side
p = {"pelvis": {"dy": -2, "dx": 1 * d}, "torso": {"rot": 8 * d, "sy": 1.0}, "head": {"rot": -4 * d}, "near_upper": {"rot": -70 * d}, "near_fore": {"rot": -10 * d}, "far_upper": {"rot": -70 * d}, "far_fore": {"rot": -10 * d}}
p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0], NEAR[1] - 2), tilt=20); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0], FAR[1] - 2), tilt=20)
sf(f"F02_PUSH_{post}", "PUSH UP", "u 0.22–0.45", p, "driving up off both toes, trunk leaning to the post side, arms swinging up", "toes")
# F03 rising: airborne, arms nearly straight up toward the corner, legs tucking
p = {"pelvis": {"dy": -8, "dx": 2 * d}, "torso": {"rot": 12 * d, "sy": 1.0}, "head": {"rot": -8 * d},
     "near_upper": {"rot": -150 * d, "ext": 2}, "near_fore": {"rot": -12 * d, "ext": 2}, "far_upper": {"rot": -150 * d, "ext": 2}, "far_fore": {"rot": -12 * d, "ext": 2},
     "near_thigh": {"rot": 8 * d, "sy": 0.9}, "near_shin": {"rot": 24 * d}, "near_boot": {"rot": -10 * d}, "far_thigh": {"rot": 8 * d, "sy": 0.9}, "far_shin": {"rot": 24 * d}, "far_boot": {"rot": -10 * d}}
sf(f"F03_RISING_{post}", "RISING (airborne)", "u 0.45–0.70", p, "airborne, arms nearly straight up toward the corner, legs tucking", "airborne")
# F04 reach: shaped like the still — arms fully up to the post side, body stretched, legs trailing
p = {"pelvis": {"dy": -14, "dx": 3 * d}, "torso": {"rot": 16 * d, "sy": 1.02}, "head": {"rot": -12 * d},
     "near_upper": {"rot": -168 * d, "ext": 4}, "near_fore": {"rot": -6 * d, "ext": 3}, "far_upper": {"rot": -168 * d, "ext": 4}, "far_fore": {"rot": -6 * d, "ext": 3},
     "near_thigh": {"rot": 12 * d, "sy": 0.88}, "near_shin": {"rot": 30 * d}, "near_boot": {"rot": -12 * d}, "far_thigh": {"rot": 12 * d, "sy": 0.88}, "far_shin": {"rot": 30 * d}, "far_boot": {"rot": -12 * d}}
sf(f"F04_REACH_{post}", "FULL REACH (bridge to the still)", "u 0.70–0.95", p, "arms fully extended up to the corner, body stretched, legs trailing: the frame before the untouched still", "airborne")
# landing: coming down feet-first into a crouch, arms coming down
p = {"pelvis": {"dy": -4, "dx": 2 * d}, "torso": {"rot": 8 * d, "sy": 1.0}, "head": {"rot": -4 * d}, "near_upper": {"rot": -90 * d}, "near_fore": {"rot": -10 * d}, "far_upper": {"rot": -90 * d}, "far_fore": {"rot": -10 * d},
     "near_thigh": {"rot": 4 * d}, "near_shin": {"rot": 10 * d}, "near_boot": {"rot": 0}, "far_thigh": {"rot": 4 * d}, "far_shin": {"rot": 10 * d}, "far_boot": {"rot": 0}}
sf(f"F11_DESCENT_{post}", "DESCENT", "+0.05–0.20 s", p, "coming down, arms lowering, feet reaching for the pitch", "airborne")
p = {"pelvis": {"dy": 8, "dx": 1 * d}, "torso": {"rot": 6 * d, "sy": 0.96}, "head": {"rot": -2 * d}, "near_upper": {"rot": -30 * d}, "near_fore": {"rot": 0}, "far_upper": {"rot": -30 * d}, "far_fore": {"rot": 0}}
p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR)
sf(f"F12_LAND_{post}", "LAND (absorb)", "+0.20–0.45 s", p, "both feet down, knees absorbing the landing, arms coming down", "both feet")
p = {"pelvis": {"dy": 3}, "torso": {"rot": 2 * d, "sy": 0.98}, "head": {"rot": 0}, "near_upper": {"rot": -8 * d}, "near_fore": {"rot": 0}, "far_upper": {"rot": -8 * d}, "far_fore": {"rot": 0}}
p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR)
sf(f"F13_RECOVER_{post}", "RECOVER", "+0.45–0.80 s", p, "rising out of the crouch, hands settling", "both feet")
sf("F17_READY", "RETURN TO READY", "+0.80–1.05 s → live SET", {}, f"GK_BASE_V1 SET/{facing}, untouched", "both feet", clean=False)
A.save({"family": "TIGHT", "facing": facing, "post": post})
