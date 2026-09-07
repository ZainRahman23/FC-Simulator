# LOW / GROUND SAVE family (LOW_COLLAPSE and low AIRBORNE_DIVE into the approved LOW_SIDE_{W,SW,NW} stills): the keeper stays low —
# SET → weight shift + lower COM → lateral load toward the save side → collapse / reach down → bridge shaped like the still → [live
# still] → hold (absorb / secure) → half kneel → kneel → rise → SET. No airborne phase. Frames come from the SET rig of the keeper's
# facing (W / SW / NW), so the anticipation starts from the sprite he was showing.
#   python3 author_low.py <facing> <outdir>          facing: west | south-west | north-west
# Produces F01 (shared), F02_L/F02_R, F03_L/F03_R (L = save to GOAL_LEFT = keeper's RIGHT, R = GOAL_RIGHT = keeper's LEFT),
# F04 (bridge, one authored knee side per facing; the mirrored still gets it mirrored at bake), get-up frames for both knee sides
# (F15a3_far/near, F15b_far/near, F16_far/near) and F17 (SET).
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig
from rig_w_set import build as build_w
from rig_set_dirs import build as build_dir
facing = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
import json
if facing == "west": RS, _ = build_w(OUT)
else: RS, _ = build_dir(facing, OUT)
_an = json.load(open("assets/visual_v1/goalkeeper/anchors/set.json"))[facing]      # the live SET root of this facing (content_cx, foot_row)
S = SetRig(RS, root=(_an["content_cx"], _an["foot_row"]), label="SET/" + facing, torso_vec=(RS.parts["head"].pivot[0] - RS.parts["torso"].pivot[0], RS.parts["head"].pivot[1] - RS.parts["torso"].pivot[1]))
A = Author(S, None, OUT)                    # no contact rig: the still is the live pose
NEAR, FAR = S.near_foot, S.far_foot
# screen x of each foot relative to the pelvis pivot: which way is "toward the keeper's RIGHT (near)" on this facing
PX, PY = RS.parts["pelvis"].pivot
sgn_near = -1 if NEAR[0] < PX else 1          # -1: the near (RIGHT) foot is screen-left of the hips
KNEE = {"west": "far", "south-west": "far", "north-west": "near"}[facing]        # the knee the DRAWN still kneels on (unmirrored orientation)
def lean(side):                               # side: "near" (save to the keeper's RIGHT) or "far" — torso lean toward that foot on screen
    return (sgn_near if side == "near" else -sgn_near)
sf = A.set_frame
sf("F00_READY", "READY / SET", "t 0", {}, "GK_BASE_V1 SET/" + facing + ", untouched", "both feet", clean=False)
# F01 — weight shift + lower COM (shared by both sides): hips down 2 px, knees soften, hands drop
p = {"pelvis": {"dy": 5}, "torso": {"rot": 0, "sy": 0.98}, "head": {"rot": 0}, "near_upper": {"rot": 4}, "near_fore": {"rot": 4}, "far_upper": {"rot": 4}, "far_fore": {"rot": 4}}
p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR)
sf("F01_LOWER", "WEIGHT SHIFT / LOWER COM", "u 0.00–0.20", p, "hips 2 px lower, both knees soften, hands dropping", "both feet")
for side, tag in (("near", "L"), ("far", "R")):
    d = lean(side)                            # screen direction (+1 right / -1 left) of the save side
    # F02 — lateral load: hips move 2 px toward the save foot and drop 4 px; the save-side knee bends deeper; arms swing low to that side
    p = {"pelvis": {"dy": 10, "dx": 2 * d}, "torso": {"rot": 8 * d, "sy": 0.96}, "head": {"rot": -4 * d},
         "near_upper": {"rot": 28 * (-d)}, "near_fore": {"rot": 10 * (-d)}, "far_upper": {"rot": 28 * (-d)}, "far_fore": {"rot": 10 * (-d)}}
    p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", NEAR, tilt=(8 if side == "far" else 0)); p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", FAR, tilt=(8 if side == "near" else 0))
    sf(f"F02_LOAD_{tag}", "LATERAL LOAD", "u 0.20–0.45", p, f"hips 4 px lower and 1 px toward the save side, save-side knee loaded, the other heel lifting, arms swinging low toward the ball", "both feet")
    # F03 — collapse / reach: hips drop 9 px and lean over the save side; the kneeling knee drops toward the pitch, the other leg starts to extend
    kn = KNEE; ext = "far" if kn == "near" else "near"
    p = {"pelvis": {"dy": 12, "dx": 2 * d}, "torso": {"rot": 10 * d, "sy": 0.95}, "head": {"rot": -6 * d},
         "near_upper": {"rot": 50 * (-d)}, "near_fore": {"rot": 6 * (-d)}, "far_upper": {"rot": 50 * (-d)}, "far_fore": {"rot": 6 * (-d)},
         f"{kn}_thigh": {"rot": -24 * lean(kn)}, f"{kn}_shin": {"rot": -40 * lean(kn)}, f"{kn}_boot": {"rot": 20 * lean(kn)},
         f"{ext}_thigh": {"rot": -50 * lean(ext)}, f"{ext}_shin": {"rot": 20 * lean(ext)}, f"{ext}_boot": {"rot": -10 * lean(ext)}}
    sf(f"F03_COLLAPSE_{tag}", "COLLAPSE / REACH", "u 0.45–0.70", p, f"hips 9 px down, trunk leaning over the save side, the {kn} knee dropping to the pitch, the other leg extending, hands reaching down to the ball", "one knee dropping")
# F04 — bridge shaped like the still: kneeling on the KNEE leg (shin folded back on the pitch), the other leg extended sideways,
# trunk over the hands, both gloves at ground level in front
kn = KNEE; ext = "far" if kn == "near" else "near"; d = -lean(ext)              # hands go toward the extended leg's side? no: toward the kneeling side's front
p = {"pelvis": {"dy": 17, "dx": 1 * lean(kn)}, "torso": {"rot": 8 * lean(kn), "sy": 1.0}, "head": {"rot": -4 * lean(kn)},
     "near_upper": {"rot": 24 * (-lean(kn))}, "near_fore": {"rot": 6 * (-lean(kn))}, "far_upper": {"rot": 24 * (-lean(kn))}, "far_fore": {"rot": 6 * (-lean(kn))},
     f"{kn}_thigh": {"rot": -40 * lean(kn)}, f"{kn}_shin": {"rot": -80 * lean(kn), "sy": 0.9}, f"{kn}_boot": {"rot": 40 * lean(kn)},
     f"{ext}_thigh": {"rot": -85 * lean(ext), "sx": 0.95}, f"{ext}_shin": {"rot": 0}, f"{ext}_boot": {"rot": -10 * lean(ext)}}
sf("F04_BRIDGE_STILL", "BRIDGE (still shape)", "u 0.70–0.95", p, f"kneeling on the {kn} knee with the shin folded on the pitch, the other leg extended sideways, trunk over the hands, gloves at ground level", "knee + extended foot", style=0.0)
# get-up for each knee side (after the still's hold): half kneel → kneel → rise
kf = A.kneel_frame
for kn in ("far", "near"):
    ext = "far" if kn == "near" else "near"; lk = lean(kn)
    p = {"pelvis": {"dy": 33, "dx": -1 * lk}, "torso": {"rot": 34 * lk, "sy": 0.58, "sx": 0.9}, "head": {"rot": -22 * lk, "sx": 0.88, "sy": 0.88},
         f"{kn}_thigh": {"rot": 22 * lk}, f"{kn}_shin": {"rot": -128 * lk, "sy": 0.8}, f"{kn}_boot": {"rot": 102 * lk}, f"{ext}_thigh": {"rot": -70 * lk, "sy": 0.9}, f"{ext}_shin": {"rot": 96 * lk}, f"{ext}_boot": {"rot": -14 * lk},
         "near_upper": {"rot": 44 * lk, "sx": 0.9}, "near_fore": {"rot": 16 * lk, "sx": 0.9}, "far_upper": {"rot": 22 * lk, "sx": 0.9}, "far_fore": {"rot": -2 * lk, "sx": 0.9}}
    kf(f"F15a3_HALF_KNEEL_{kn}", "HALF KNEEL (trunk low)", "+0.25–0.50 s", p, f"sitting back on the {kn} heel, the other foot planted forward, trunk low and lifting", f"{kn} knee/heel + {ext} foot", (0.0, 0.0), style=0.0)
    p = {"pelvis": {"dy": 26, "dx": -2 * lk}, "torso": {"rot": 10 * lk, "sy": 0.96, "sx": 0.92}, "head": {"rot": -8 * lk, "sx": 0.92, "sy": 0.92},
         f"{kn}_thigh": {"rot": 18 * lk}, f"{kn}_shin": {"rot": -125 * lk, "sy": 0.8}, f"{kn}_boot": {"rot": 100 * lk}, f"{ext}_thigh": {"rot": -78 * lk}, f"{ext}_shin": {"rot": 88 * lk}, f"{ext}_boot": {"rot": -6 * lk},
         "near_upper": {"rot": 62 * lk}, "near_fore": {"rot": 10 * lk}, "far_upper": {"rot": 30 * lk}, "far_fore": {"rot": -10 * lk}}
    kf(f"F15b_KNEELING_{kn}", "KNEELING (one knee, one foot)", "+0.50–0.72 s", p, f"{kn} knee down, the other foot forward and planted, torso up, hands on the thigh", f"{kn} knee + {ext} foot", (0.0, 0.0), style=0.0)
    p = {"pelvis": {"dy": 10, "dx": 0}, "torso": {"rot": 6 * lk, "sy": 0.97}, "head": {"rot": -5 * lk}, "near_upper": {"rot": 30 * lk}, "near_fore": {"rot": 0}, "far_upper": {"rot": 20 * lk}, "far_fore": {"rot": -6 * lk}}
    p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (FAR[0] - 2 * lk, FAR[1])); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (NEAR[0] + 2 * lk, NEAR[1]))
    kf(f"F16_RISING_{kn}", "RISING", "+0.72–0.92 s", p, "up on both feet in a deep crouch, hands coming up to the ready position", "both feet", (0.0, 0.0), style=0.0)
sf("F17_READY", "RETURN TO READY", "+0.92–1.05 s → live SET", {}, "GK_BASE_V1 SET/" + facing + ", untouched", "both feet", clean=False)
A.save({"family": "LOW", "facing": facing, "knee": KNEE})
