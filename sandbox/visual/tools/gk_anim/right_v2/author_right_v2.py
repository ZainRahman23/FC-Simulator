# RIGHT FAR DIVE V2 — pre-contact only, authored BACKWARD from the approved DIVE_NORTH_CW50 contact pose using the geometry of the
# representative save (right_geometry.js → geometry.json): a west-facing keeper, physical RIGHT = north, which the camera projects as
# (-2.6,-7.8) px per metre (mostly UP the screen, slightly left); the simulation root travels (-6,-7) px, the simulation hand rises
# from (+2.1,-29.2) to (-5.2,-38.9) px rel. root, contact at u 1.00.
# Backward chain: CONTACT (untouched PNG) ← F09 late flight ← F08 full extension ← F07 late-flight bridge (all NORTH_CW50 parts, outline
# fading in) ← F06 mid flight ← F05 early flight ← F04 toe-off ← F03 push-off ← F02 plant ← F01 load (W SET rig, proportions and palette
# morphing toward the Pro art frame by frame so the lineage switch at F06→F07 changes as little as possible). Every frame's lead glove is
# placed on the simulation hand for its u (measured path), so the hand-led placement stays near zero and the drawn root never steps.
# The planted RIGHT foot is pinned to its absolute ground position while the root moves (no sliding).
#   python3 author_right_v2.py <geometry.json> <outdir>
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.join(HERE, "..", "library"); sys.path.insert(0, LIB); sys.path.insert(0, os.path.join(HERE, "..", "rig"))
from author_base import Author, SetRig, ContactRig, joint, pin
from rig_w_set import build as build_set
from rig_north_cw50 import build as build_north, ROOT as NROOT
from pixel_ops import stylize, outline, cleanup
GEO = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
RS, _ = build_set(OUT); RC, _ = build_north()
S = SetRig(RS)
C = ContactRig(RC, NROOT, 0.72, (150, 260), (34, 40), {"head": ("joint", "head"), "lead_glove": ("joint", "glove_A"), "other_glove": ("joint", "glove_B"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve"),
                                                           "foot_L": ("distal", "shin_L"), "foot_R": ("distal", "shin_R")}, "DIVE_NORTH_CW50")
A = Author(S, C, OUT)
tr = GEO["trace"]; ct = GEO["committedTick"]; kt = GEO["contactTick"]; sp0 = tr[ct]["sp"]
def at_u(u):
    """root screen offset (rel. commit root) and sim hand (rel. root) at a given u of the representative save (linear in u between ticks)"""
    rows = [t for t in tr[ct:kt + 1] if t.get("u") is not None]
    for a, b in zip(rows, rows[1:]):
        if a["u"] <= u <= b["u"]:
            k = (u - a["u"]) / max(1e-6, b["u"] - a["u"])
            root = (a["sp"][0] + (b["sp"][0] - a["sp"][0]) * k - sp0[0], a["sp"][1] + (b["sp"][1] - a["sp"][1]) * k - sp0[1])
            ha = (a["handSp"][0] - a["sp"][0], a["handSp"][1] - a["sp"][1]); hb = (b["handSp"][0] - b["sp"][0], b["handSp"][1] - b["sp"][1])
            return root, (ha[0] + (hb[0] - ha[0]) * k, ha[1] + (hb[1] - ha[1]) * k)
    t = rows[-1]; return (t["sp"][0] - sp0[0], t["sp"][1] - sp0[1]), (t["handSp"][0] - t["sp"][0], t["handSp"][1] - t["sp"][1])
NEAR, FAR = S.near_foot, S.far_foot          # near = the keeper's RIGHT foot (screen up-left), the DRIVE foot for a dive to his right; far = LEFT (trailing)
PS = S.ps
# ground positions of the feet at SET, in screen px rel. the commit root (they must stay put on the pitch while the root moves)
FOOT_R0 = ((NEAR[0] - S.root[0]) * PS, (NEAR[1] - S.root[1]) * PS); FOOT_L0 = ((FAR[0] - S.root[0]) * PS, (FAR[1] - S.root[1]) * PS)
def pinned_foot(foot0, u):
    r, _ = at_u(u); return ((foot0[0] - r[0]) / PS + S.root[0], (foot0[1] - r[1]) / PS + S.root[1])          # sprite px target for leg_ik (canvas = root + offset)
def arm_to(pose, glove_target, side="near", elbow_back=True, ext=0):
    """exact 2-bone IK of an arm so its glove pivot lands on glove_target (sprite px, canvas coords); the elbow bends as far as the
    target distance requires (a target at full arm length gives a straight arm), on the side chosen by elbow_back (elbow behind =
    screen-right of the shoulder→glove line for a keeper reaching left/up)"""
    R = S.R; M = R.world(pose); Sh = joint(R, M, f"{side}_upper", (0, 0))
    K0 = R.parts[f"{side}_fore"].pivot; G0 = R.parts[f"{side}_glove"].pivot; U0 = R.parts[f"{side}_upper"].pivot
    L1 = math.hypot(K0[0] - U0[0], K0[1] - U0[1]) + ext; L2 = math.hypot(G0[0] - K0[0], G0[1] - K0[1]) + ext
    rest1 = math.atan2(K0[1] - U0[1], K0[0] - U0[0]); rest2 = math.atan2(G0[1] - K0[1], G0[0] - K0[0])
    dx, dy = glove_target[0] - Sh[0], glove_target[1] - Sh[1]; d = max(1e-6, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
    base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
    best = None
    for sgn in (1, -1):
        th1 = base + sgn * a; K = (Sh[0] + L1 * math.cos(th1), Sh[1] + L1 * math.sin(th1))
        cross = dx * (K[1] - Sh[1]) - dy * (K[0] - Sh[0])          # which side of the shoulder→target line the elbow lies
        score = -cross if elbow_back else cross
        if best is None or score > best[0]: best = (score, th1, K)
    _, th1, K = best; th2 = math.atan2(glove_target[1] - K[1], glove_target[0] - K[0])
    tor = pose.get("torso", {}).get("rot", 0) + pose.get("pelvis", {}).get("rot", 0)
    r1 = math.degrees(th1 - rest1) - tor; r2 = math.degrees(th2 - rest2) - tor - r1
    pose[f"{side}_upper"] = {**pose.get(f"{side}_upper", {}), "rot": r1, "ext": ext}; pose[f"{side}_fore"] = {**pose.get(f"{side}_fore", {}), "rot": r2, "ext": ext}
    return pose
def base_frame(name, phase, u_from, u_to, head, hips, torso_sx, torso_sy, head_scale, leg_ext, arm_ext, gloves, elbow, near_leg, far_leg, style, note, grounded, head_look=0, far_glove_rel=None):
    """W-rig frame: hips/head from the screen paths (rel. the root at that u), gloves on the simulation hand, feet pinned or trailing"""
    um = 0.5 * (u_from + u_to); root_off, hand = at_u(um)
    root = (S.root[0] + S.off[0], S.root[1] + S.off[1])
    p, T, _ = A.body(head, hips, sx=torso_sx, head_scale=head_scale, limb_sx=1.0, head_look=head_look)
    p["torso"]["sy"] = torso_sy; p.pop("_limb_sx", None)
    # legs: planted foot pinned to its ground position (absolute), trailing foot given explicitly (screen px rel. root) or pinned too
    for leg, spec in (("near", near_leg), ("far", far_leg)):
        if spec[0] == "pin": tgt = pinned_foot(FOOT_R0 if leg == "near" else FOOT_L0, um); A.leg_ik(p, f"{leg}_thigh", f"{leg}_shin", f"{leg}_boot", tgt, tilt=spec[1])
        elif spec[0] == "foot": A.leg_ik(p, f"{leg}_thigh", f"{leg}_shin", f"{leg}_boot", (S.root[0] + spec[1][0] / PS, S.root[1] + spec[1][1] / PS), tilt=spec[2])
        else: p[f"{leg}_thigh"] = {"rot": spec[1], "sy": spec[4] if len(spec) > 4 else 1.0}; p[f"{leg}_shin"] = {"rot": spec[2], "sy": spec[4] if len(spec) > 4 else 1.0}; p[f"{leg}_boot"] = {"rot": spec[3]}
        for part in (f"{leg}_thigh", f"{leg}_shin"): p[part]["ext"] = leg_ext
    # arms: near (RIGHT) glove on the simulation hand (+ offset), far (LEFT) glove beside it
    gt, gtf = gloves                                                   # absolute screen px rel. root: the arms swing on their own arc and meet the simulation hand only in the last frames
    arm_to(p, (S.root[0] + gt[0] / PS, S.root[1] + gt[1] / PS), "near", elbow_back=True, ext=arm_ext)
    arm_to(p, (S.root[0] + gtf[0] / PS, S.root[1] + gtf[1] / PS), "far", elbow_back=True, ext=arm_ext)
    A.set_frame(name, phase, f"u {u_from:.2f}–{u_to:.2f}", p, note, grounded, style=style)
    A.FRAMES[-1]["u"] = [u_from, u_to]; A.FRAMES[-1]["sim_hand"] = [round(hand[0], 1), round(hand[1], 1)]; A.FRAMES[-1]["root_off"] = [round(root_off[0], 1), round(root_off[1], 1)]
def pro_frame(name, phase, u_from, u_to, pose, hips, out_style, note):
    um = 0.5 * (u_from + u_to); root_off, hand = at_u(um)
    A.contact_frame(name, phase, f"u {u_from:.2f}–{u_to:.2f}", pose, note, "airborne", 0, hips, out_style=out_style)
    A.FRAMES[-1]["u"] = [u_from, u_to]; A.FRAMES[-1]["sim_hand"] = [round(hand[0], 1), round(hand[1], 1)]; A.FRAMES[-1]["root_off"] = [round(root_off[0], 1), round(root_off[1], 1)]
# ── the CONTACT reference (rel. the contact root): from the NORTH rig at rest — waist (3.0,-15.4), neck (3.6,-28.4), lead glove pivot
# (-4.0,-38.6), gloves' centre (-5.3,-39.4), boots (+4.8,+2.7)/(+10.8,+2.7)
A.set_frame("F00_SET", "SET (live sprite)", "pre-commit", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)
# hips/head paths rel. the moving root: absolute waist stays ~level then rises 4 px; the neck rises ~1 px; the torso compresses toward the
# Pro's 13 px (from 14.7) by F06. (rel-root numbers = absolute − root travel at that u)
HEAD = {"F01": (1.5, -33.2), "F02": (2.2, -31.6), "F03": (2.4, -31.9), "F04": (2.2, -32.3), "F05": (1.9, -32.0), "F06": (1.9, -31.2)}
HIPS = {"F01": (1.7, -18.6), "F02": (1.4, -16.2), "F03": (1.3, -17.6), "F04": (1.0, -18.9), "F05": (0.7, -19.6), "F06": (0.9, -19.0)}
# F01 LOAD  u 0.00–0.06: weight onto the RIGHT foot, both knees soften, hands drop, head turns up-left toward the ball
base_frame("F01_LOAD", "LOAD (weight to the RIGHT foot)", 0.00, 0.06, HEAD["F01"], HIPS["F01"], 1.0, 1.0, 1.0, 0, 0, ((-3.0, -21.5), (3.5, -19.5)), 1.0, ("pin", 0), ("pin", 0), 0.0,
           "weight transfers onto the RIGHT (drive) foot, knees soften, hands drop, head on the ball", "both feet", head_look=-6)
# F02 PLANT  u 0.06–0.15: deepest load over the RIGHT foot, LEFT heel lifting, arms swung back (east, behind the keeper)
base_frame("F02_PLANT", "PLANT / deepest load", 0.06, 0.15, HEAD["F02"], HIPS["F02"], 0.99, 0.985, 1.0, 0, 0, ((1.5, -19.0), (6.0, -17.0)), 1.0, ("pin", 0), ("pin", 14), 0.04,
           "hips lowest and over the planted RIGHT foot, RIGHT knee fully loaded, LEFT heel lifting, arms at the back of the swing", "both feet (LEFT heel up)", head_look=-10)
# F03 PUSH  u 0.15–0.24: RIGHT leg driving, hips up and toward the save (up-left), LEFT foot unloads and trails, arms swing forward-left and up
base_frame("F03_PUSH", "PUSH-OFF (RIGHT leg driving)", 0.15, 0.24, HEAD["F03"], HIPS["F03"], 0.97, 0.965, 0.99, 1, 1, ((-6.0, -25.5), (-1.5, -23.0)), 0.75, ("pin", 8), ("foot", (FOOT_L0[0] + 2.5, FOOT_L0[1] - 4.5), 0), 0.14,
           "the RIGHT leg extends from the planted toe, hips driven up and toward the save side, the LEFT foot unloads and trails, both arms swinging forward-left and up", "RIGHT foot (toe)", head_look=-12)
# F04 TOE-OFF  u 0.24–0.32: RIGHT leg straight on the toe, hips 3 px higher, arms horizontal-left at shoulder height
base_frame("F04_TOE_OFF", "TOE-OFF (RIGHT toe only)", 0.24, 0.32, HEAD["F04"], HIPS["F04"], 0.95, 0.945, 0.985, 2, 2, ((-8.5, -31.5), (-4.5, -29.0)), 0.45, ("pin", 30), ("foot", (FOOT_L0[0] + 4.0, FOOT_L0[1] - 5.0), 0), 0.30,
           "RIGHT leg fully extended on the toe (boot +30°), hips rising and moving up-left, LEFT leg trailing behind, arms at the shoulder line reaching for the ball", "RIGHT toe", head_look=-14)
# F05 EARLY FLIGHT  u 0.32–0.44: both feet off the pitch; hands lead up-left (60°), shoulders follow, legs trail down-right
base_frame("F05_EARLY_FLIGHT", "EARLY FLIGHT (hands lead)", 0.32, 0.44, HEAD["F05"], HIPS["F05"], 0.93, 0.925, 0.975, 4, 3, ((-6.5, -36.0), (-3.0, -33.5)), 0.25, ("rot", -10, -6, 24, 1.0), ("rot", -20, -22, 8, 0.96), 0.50,
           "first airborne frames: the RIGHT leg still nearly straight from the drive, the LEFT knee folding behind, arms 60° up-left and opening, shoulders following, torso narrowing as the chest turns toward the ball", "airborne")
# F06 MID FLIGHT  u 0.44–0.58: the last base-lineage frame — Pro proportions (torso 13 px, longer shins, longer arms), Pro palette, thinned outlines
base_frame("F06_MID_FLIGHT", "MID FLIGHT (last base frame, Pro proportions)", 0.44, 0.58, HEAD["F06"], HIPS["F06"], 0.91, 0.90, 0.96, 6, 4, ((-5.0, -39.0), (-1.5, -36.5)), 0.10, ("rot", -9, -12, 12, 1.0), ("rot", -17, -26, 10, 1.0), 0.90,
           "arms nearly straight at the ball (70° up-left), hips level with standing height, both legs trailing down-right with the knees folding: the shape the Pro parts continue from", "airborne")
# ── NORTH rig (Pro parts). rot: the sleeve short of contact swings CCW (lower, more to the left); knees more bent; body otherwise at the contact orientation
HB = {"F07": (1.6, -18.2), "F08": (2.3, -16.8), "F09": (2.8, -15.8)}          # waist rel. root, converging on the contact art's (3.0,-15.4)
pro_frame("F07_LATE_BRIDGE", "LATE FLIGHT (Pro parts, 75 % outline)", 0.58, 0.72, {"sleeve": {"rot": 4, "sy": 0.90, "sx": 0.96}, "glove_A": {"rot": -2}, "glove_B": {"rot": -1}, "thigh_L": {"rot": 12}, "shin_L": {"rot": -34}, "thigh_R": {"rot": 12}, "shin_R": {"rot": -38}, "torso": {"rot": -1}, "head": {"rot": -3}}, HB["F07"], 0.75,
          "the contact art's own components with the sleeve 10 % foreshortened (the arms not yet at full length) and the knees folded 42° (heels up behind): the first Pro-lineage frame, matching F06's silhouette")
pro_frame("F08_FULL_EXTENSION", "FULL EXTENSION (Pro parts, 45 % outline)", 0.72, 0.85, {"sleeve": {"rot": 2, "sy": 0.96}, "glove_A": {"rot": -1}, "glove_B": {"rot": 0}, "thigh_L": {"rot": 6}, "shin_L": {"rot": -18}, "thigh_R": {"rot": 6}, "shin_R": {"rot": -20}, "torso": {"rot": 0}, "head": {"rot": -1}}, HB["F08"], 0.45,
          "arms 96 % of their length, knees 22°: the body at full stretch toward the ball")
pro_frame("F09_LATE_FLIGHT", "LATE FLIGHT (Pro parts, 20 % outline)", 0.85, 0.95, {"sleeve": {"rot": 1, "sy": 0.99}, "glove_A": {"rot": 0}, "glove_B": {"rot": 0}, "thigh_L": {"rot": 2}, "shin_L": {"rot": -7}, "thigh_R": {"rot": 2}, "shin_R": {"rot": -8}, "torso": {"rot": 0}, "head": {"rot": 0}}, HB["F09"], 0.20,
          "arms at 99 %, knees 9°: the last authored frame before the untouched contact PNG")
A.save({"family": "RIGHT_V2_PRECONTACT", "contact_pose": "DIVE_NORTH_MEDHIGH", "geometry": os.path.abspath(sys.argv[1])})
json.dump([{k: f[k] for k in ("name", "u", "sim_hand", "root_off") if k in f} for f in A.FRAMES], open(os.path.join(OUT, "schedule_meta.json"), "w"), indent=1)
