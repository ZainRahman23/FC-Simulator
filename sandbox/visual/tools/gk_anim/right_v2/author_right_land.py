# RIGHT FAR DIVE — LANDING + RECOVERY (post-contact), authored as a landing animation around the PRESENTATION root.
# Everything through the exact 60° contact frame is frozen (approved V2b + DIVE_NORTH_CW60). From the contact tick on:
#   ball contact → airborne follow-through → descent → first ground contact (lead forearm) → impact (elbow/upper arm, hip) → shoulder/side →
#   hip/outer thigh down, legs trailing then down → slide → settled → push-up → sit/knee under → half kneel → kneel → rise → SET.
# Method: a small WORLD-PLANE model (n = metres north of the simulation root along the dive, z = height, e = east) of the trunk, arms and
# legs per frame, with every joint clamped to the pitch plane by its own thickness; joints are projected with the camera's own vectors
# (north (-3.516,-7.842), up (1.443,-20.446), east (21.842,0) px/m at the keeper), expressed relative to the presentation root
# d(t) = V0·τ(1−e^(−t/τ)) along the dive direction (the live architecture; the simulation root is untouched), and the contact art's own
# components (NORTH_CW60 rig with the sleeve split at the elbow) are solved onto them part by part: rotation from the projected bone
# direction, foreshortening (sy) from the projected bone length. Nothing is a rigid rotation of the whole sprite: shoulders descend
# first, the torso pitches and narrows as it rolls onto the side, the hips keep travelling, the legs trail and then fold down, the arms
# yield at the elbows and brace. The recovery goes to the W SET rig (kneel → rise) like the approved LEFT sequence, mirrored roles.
#   python3 author_right_land.py <geometry.json (HIGH representative save)> <outdir>
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from v2_common import V2, glove_blob_centroid
from author_base import joint, pin
from gk_rig import mat_apply
GEO, OUT = sys.argv[1], sys.argv[2]
LM = {"head": ("joint", "head"), "lead_glove": ("joint", "glove_A"), "other_glove": ("joint", "glove_B"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "sleeve_up"), "foot_L": ("distal", "shin_R"), "foot_R": ("distal", "shin_L")}
V = V2(GEO, OUT, "rig_north_cw60_land", LM, contact_canvas=(150, 260), contact_off=(46, 40), contact_label="DIVE_NORTH_CW60 (landing rig)")
A, C, R, S = V.A, V.C, V.RC, V.S
PS = C.ps; OFF = C.off; ROOT = (C.root[0] + OFF[0], C.root[1] + OFF[1])
# ── camera at the keeper (screen px per metre) and the presentation root ──
cm = V.GEO["commit"]; PR = cm["proj"]; NORTH, UP, EAST = PR["north"], PR["up"], PR["east"]
def proj(n, z, e=0.0): return (NORTH[0] * n + UP[0] * z + EAST[0] * e, NORTH[1] * n + UP[1] * z + EAST[1] * e)
tr = V.tr; ct, kt = V.ct, V.kt; feet = cm["feet"]; rc = tr[kt]["root"]
TRAV = math.hypot(rc[0] - feet[0], rc[1] - feet[1]); V0 = TRAV / cm["execTime"]
PRES = {"tau": 0.45, "tLand": 0.55, "tEnd": 1.05}
def pres_d(t):
    P = PRES; dL = V0 * P["tau"] * (1 - math.exp(-P["tLand"] / P["tau"]))
    if t <= P["tLand"]: return V0 * P["tau"] * (1 - math.exp(-t / P["tau"]))
    if t < P["tEnd"]: return dL * (0.5 + 0.5 * math.cos(math.pi * (t - P["tLand"]) / (P["tEnd"] - P["tLand"])))
    return 0.0
# ── body model (metres; segment lengths chosen so the contact art's rest bones project at scale ≈ 1) ──
L = {"torso": 0.56, "head": 0.13, "up": 0.36, "fore": 0.42, "thigh": 0.30, "shin": 0.36}
THICK = {"glove": 0.04, "forearm": 0.06, "elbow": 0.06, "shoulder": 0.20, "head": 0.12, "torso": 0.16, "waist": 0.16, "hip": 0.16, "knee": 0.08, "foot": 0.07}
# rest bone directions/lengths of the rig in canvas px (live px = ×PS)
def rest_vec(part, distal):
    p = R.parts[part]; a = p.pivot; b = distal if isinstance(distal, tuple) else R.parts[distal].pivot
    return (b[0] - a[0], b[1] - a[1])
REST = {"torso": rest_vec("torso", R.parts["torso"].bone["to"]), "head": rest_vec("head", (R.parts["head"].pivot[0] + 4, R.parts["head"].pivot[1] - 16)),
        "sleeve_up": rest_vec("sleeve_up", "sleeve_fore"), "sleeve_fore": rest_vec("sleeve_fore", "glove_A"),
        "thigh_L": rest_vec("thigh_L", "shin_L"), "shin_L": rest_vec("shin_L", "boot_L"), "thigh_R": rest_vec("thigh_R", "shin_R"), "shin_R": rest_vec("shin_R", "boot_R"), "pelvis": (0.0, -1.0)}
CHILD = {"torso": None, "head": None, "sleeve_up": "sleeve_fore", "sleeve_fore": "glove_A", "thigh_L": "shin_L", "shin_L": "boot_L", "thigh_R": "shin_R", "shin_R": "boot_R"}


def world_distal(pose, part):
    """current canvas position of the part's distal point (child pivot or bone end) and of its own pivot"""
    M = R.world(pose); piv = joint(R, M, part, OFF)
    ch = CHILD.get(part)
    if ch: d = joint(R, M, ch, OFF)
    else:
        b = R.parts[part].bone["to"] if R.parts[part].bone else (R.parts[part].pivot[0] + REST[part][0], R.parts[part].pivot[1] + REST[part][1])
        x, y = mat_apply(M[part], *b); d = (x + OFF[0], y + OFF[1])
    return piv, d


def aim(pose, part, target, smin=0.45, smax=1.15, iters=3, scale=True):
    """rotate the part about its pivot so its bone points at `target` (canvas px) and foreshorten it (sy) to the target length"""
    for _ in range(iters):
        piv, d = world_distal(pose, part)
        a_have = math.atan2(d[1] - piv[1], d[0] - piv[0]); a_want = math.atan2(target[1] - piv[1], target[0] - piv[0])
        q = pose.setdefault(part, {}); q["rot"] = q.get("rot", 0) + math.degrees(a_want - a_have)
        if scale:
            piv, d = world_distal(pose, part); have = math.hypot(d[0] - piv[0], d[1] - piv[1]); want = math.hypot(target[0] - piv[0], target[1] - piv[1])
            q["sy"] = max(smin, min(smax, q.get("sy", 1.0) * (want / max(1e-6, have))))
    return pose


def canvas(pt_live):   # live px rel. the presentation root → canvas px
    return (ROOT[0] + pt_live[0] / PS, ROOT[1] + pt_live[1] / PS)


# ── the plan: per frame, trunk (waist n,z; torso pitch θT from vertical toward north; torso narrowing sx), head lift, arms (absolute
# upper-arm angle from vertical toward north, elbow bend), legs (thigh angle from vertical-down toward north, knee bend) for the
# keeper's LEFT leg (rig R, e +) and RIGHT leg (rig L, e −). Heights are clamped by thickness afterwards (ground plane).
def frame_plan(name, t0, t1, waist, thT, tsx, head_lift, armU, elbow, legL, legR, arm_e=-0.12, note="", phase="", style=0.0, outline_k=0.0):
    return dict(name=name, t=(t0, t1), waist=waist, thT=thT, tsx=tsx, head_lift=head_lift, armU=armU, elbow=elbow, legL=legL, legR=legR, arm_e=arm_e, note=note, phase=phase, style=style, outline=outline_k)
# the world pose the contact art is read as (n 0 = the simulation root): waist 0.72 m up, trunk pitched 30° into the dive, arms 72° from
# vertical up the dive line to the ball (n 1.08, z 1.52), legs hanging and trailing, feet just off the pitch
CONTACT_MODEL = frame_plan("CONTACT", 0.0, 0.0, (0.0, 0.72), 30, 1.0, 0, 72, 0, (-20, 30, 0.0), (-26, 36, 0.0), note="the untouched 60° PNG", phase="BALL CONTACT (airborne)")


PLAN = [
    # name              t0    t1    waist(n,z)     θT   tsx  head armU elbow  legL(θH,κ,e+)      legR(θH,κ,e+)
    frame_plan("P01_FOLLOW_THROUGH", 0.02, 0.08, (0.06, 0.74), 34, 1.00,  0,  80, 12, (-24, 30, 0.00), (-30, 36, 0.00), note="still airborne: hands through the ball line, elbows starting to yield, shoulders beginning to come down, legs trailing", phase="FOLLOW-THROUGH (airborne)"),
    frame_plan("P02_DESCENT",        0.08, 0.15, (0.14, 0.70), 44, 0.96, -4, 116, 30, (-32, 36, 0.00), (-38, 42, 0.00), note="descent: the trunk pitches into the dive, the arms swing down ahead of the body to brace, height starting to go", phase="DESCENT (airborne)"),
    frame_plan("P03_DESCENT_2",      0.15, 0.22, (0.22, 0.60), 56, 0.90, -8, 144, 32, (-42, 40, 0.02), (-48, 46, 0.02), note="falling: arms nearly down, hips dropping, legs trailing behind", phase="DESCENT 2 (airborne)"),
    frame_plan("P04_FIRST_GROUND",   0.22, 0.29, (0.30, 0.46), 68, 0.84, -10, 158, 22, (-54, 40, 0.04), (-60, 46, 0.04), note="FIRST GROUND CONTACT: the lead hand / forearm reaches the pitch ahead of the body while the hip is still 0.46 m up", phase="FIRST GROUND CONTACT (lead hand / forearm)"),
    frame_plan("P05_IMPACT_1",       0.29, 0.36, (0.36, 0.30), 78, 0.78, -8, 165, 20, (-66, 24, 0.08), (-72, 30, 0.08), note="IMPACT 1: elbow and upper arm take the load, the hip drops to 0.30 m, trunk compressing, feet touching down behind", phase="IMPACT 1 (forearm + elbow)"),
    frame_plan("P06_IMPACT_2",       0.36, 0.44, (0.42, 0.17), 87, 0.72, -4, 168, 16, (-84, 20, 0.12), (-88, 22, 0.12), note="IMPACT 2: shoulder / side of the torso meets the pitch, hip 0.17 m, legs laid out behind", phase="IMPACT 2 (shoulder / side)"),
    frame_plan("P07_HIP_SIDE_DOWN",  0.44, 0.50, (0.47, 0.16), 88, 0.70,  0, 170, 12, (-74, 8, 0.15), (-80, 10, 0.15), note="HIP / SIDE DOWN: lying on the right side, outer thigh down, the whole body carried by the presentation root", phase="HIP / SIDE DOWN"),
    frame_plan("P07b_SLIDE",         0.50, 0.57, (0.49, 0.16), 88, 0.70,  4, 170, 12, (-74, 8, 0.15), (-80, 10, 0.15), note="SLIDE: the same body while the horizontal momentum decays to rest", phase="SLIDE"),
    frame_plan("P08_SETTLED",        0.57, 0.66, (0.50, 0.16), 88, 0.70, 14, 166, 16, (-72, 10, 0.15), (-78, 12, 0.15), note="SETTLED: at rest on the side, head lifting to find the ball", phase="SETTLED (ground pose)"),
    frame_plan("P09_PUSH_UP",        0.66, 0.74, (0.45, 0.22), 66, 0.76, 24, 152, 36, (-60, 40, 0.12), (-70, 34, 0.12), note="RECOVERY: pushing up on the forearm and hand, trunk rising off the side, knees drawing under", phase="RECOVERY (push-up)", outline_k=0.35),
    frame_plan("P10_SIT_KNEE",       0.74, 0.81, (0.35, 0.30), 52, 0.86, 26, 160, 30, (-20, 90, 0.06), (-40, 80, 0.06), note="sitting up, the near knee coming under the body, hands on the pitch: the last Pro-part frame", phase="RECOVERY (sit / knee under)", outline_k=0.6),
]


def solve_frame(fp):
    t = 0.5 * (fp["t"][0] + fp["t"][1]); d = pres_d(t); pres = proj(d, 0.0)
    wn, wz = fp["waist"]; thT = math.radians(fp["thT"])
    J = {}                                                   # world joints (n, z, e)
    J["waist"] = (wn, max(THICK["waist"], wz), 0.0)
    neck = (wn + L["torso"] * math.sin(thT), J["waist"][1] + L["torso"] * math.cos(thT), 0.0); J["neck"] = (neck[0], max(THICK["shoulder"], neck[1]), 0.0)
    hl = math.radians(fp["thT"] + fp["head_lift"] - 10)      # the head keeps looking a little up the dive line
    head = (J["neck"][0] + L["head"] * math.sin(hl), J["neck"][1] + L["head"] * math.cos(hl), 0.02); J["head"] = (head[0], max(THICK["head"], head[1]), head[2])
    J["shoulder"] = (J["neck"][0] - 0.02, max(THICK["shoulder"], J["neck"][1] - 0.04), fp["arm_e"])
    aU = math.radians(fp["armU"]); el = (J["shoulder"][0] + L["up"] * math.sin(aU), J["shoulder"][1] + L["up"] * math.cos(aU), fp["arm_e"]); J["elbow"] = (el[0], max(THICK["elbow"], el[1]), el[2])
    aF = math.radians(fp["armU"] - fp["elbow"]); gl = (J["elbow"][0] + L["fore"] * math.sin(aF), J["elbow"][1] + L["fore"] * math.cos(aF), fp["arm_e"]); J["glove"] = (gl[0], max(THICK["glove"], gl[1]), gl[2])
    for leg, spec, e, rigL in (("L", fp["legL"], +0.12, "R"), ("R", fp["legR"], -0.12, "L")):     # keeper's LEFT leg = rig R (screen right)
        hj = (J["waist"][0] + 0.03 + 0.04 * math.sin(thT), max(THICK["hip"], J["waist"][1] - 0.22 * math.cos(thT)), e); J["hip" + leg] = hj
        aH = math.radians(spec[0]); kn = (hj[0] + L["thigh"] * math.sin(aH), hj[1] - L["thigh"] * math.cos(aH), e + 0.5 * spec[2]); J["knee" + leg] = (kn[0], max(THICK["knee"], kn[1]), kn[2])
        aS = math.radians(spec[0] - spec[1]); an = (J["knee" + leg][0] + L["shin"] * math.sin(aS), J["knee" + leg][1] - L["shin"] * math.cos(aS), e + spec[2]); J["ankle" + leg] = (an[0], max(THICK["foot"], an[1]), an[2])
    # screen (live px rel. the presentation root)
    Sx = {k: (proj(*v)[0] - pres[0], proj(*v)[1] - pres[1]) for k, v in J.items()}
    touching = [k for k, v in J.items() if v[1] <= THICK.get({"glove": "glove", "elbow": "elbow", "shoulder": "shoulder", "head": "head", "neck": "shoulder", "waist": "waist"}.get(k, "hip" if k.startswith("hip") else "knee" if k.startswith("knee") else "foot"), 0.1) + 1e-6]
    return t, d, pres, J, Sx, touching


def author_frame(fp):
    t, d, pres, J, Sx, touching = solve_frame(fp)
    pose = {"pelvis": {"rot": 0}}
    # pelvis: pin the waist; its orientation follows the trunk's screen tilt partially
    torso_dir = math.degrees(math.atan2(Sx["neck"][1] - Sx["waist"][1], Sx["neck"][0] - Sx["waist"][0]))
    rest_t = math.degrees(math.atan2(REST["torso"][1], REST["torso"][0]))
    pose["pelvis"]["rot"] = 0.55 * (torso_dir - rest_t)
    pin(R, pose, "pelvis", canvas(Sx["waist"]), OFF, root="pelvis")
    pose.setdefault("torso", {})["sx"] = fp["tsx"]
    aim(pose, "torso", canvas(Sx["neck"]), smin=0.60, smax=1.1)          # readability floor: never a 40 % jersey; the head then sits a little further up the dive line (still on its ground line)
    aim(pose, "head", canvas(Sx["head"]), smin=0.90, smax=1.0)
    aim(pose, "sleeve_up", canvas(Sx["elbow"]), smin=0.45, smax=1.15)
    aim(pose, "sleeve_fore", canvas(Sx["glove"]), smin=0.45, smax=1.15)
    for leg, rigL in (("L", "R"), ("R", "L")):
        aim(pose, "thigh_" + rigL, canvas(Sx["knee" + leg]), smin=0.55, smax=1.15)
        aim(pose, "shin_" + rigL, canvas(Sx["ankle" + leg]), smin=0.55, smax=1.15)
        chain = pose["thigh_" + rigL].get("rot", 0) + pose["shin_" + rigL].get("rot", 0) + pose["pelvis"]["rot"]
        pose.setdefault("boot_" + rigL, {})["rot"] = (-chain - 25) if J["ankle" + leg][1] <= THICK["foot"] + 1e-6 else -0.3 * pose["shin_" + rigL].get("rot", 0)
    pose["glove_A"] = {"rot": -0.3 * pose["sleeve_fore"].get("rot", 0)}; pose["glove_B"] = {"rot": -0.3 * pose["sleeve_fore"].get("rot", 0)}
    grounded = ", ".join(touching) if touching else "airborne"
    A.contact_frame(fp["name"], fp["phase"], f"endT +{fp['t'][0]:.2f}–{fp['t'][1]:.2f} s", pose, fp["note"], grounded, pose["pelvis"]["rot"], Sx["waist"], out_style=fp["outline"])
    f = A.FRAMES[-1]; f["t_post"] = list(fp["t"]); f["pres_d"] = round(d, 4); f["pres_screen"] = [round(pres[0], 2), round(pres[1], 2)]
    f["world_joints"] = {k: [round(x, 3) for x in v] for k, v in J.items()}; f["screen_joints"] = {k: [round(x, 2) for x in v] for k, v in Sx.items()}; f["touching"] = touching
    return f


_t, _d, _pres, CJ, CS, CT = solve_frame(CONTACT_MODEL)
CONTACT_REC = {"name": "CONTACT", "phase": CONTACT_MODEL["phase"], "t_post": [0.0, 0.02], "pres_d": 0.0, "pres_screen": [0.0, 0.0], "world_joints": {k: [round(x, 3) for x in v] for k, v in CJ.items()}, "screen_joints": {k: [round(x, 2) for x in v] for k, v in CS.items()}, "touching": CT}
for fp in PLAN: author_frame(fp)
# ── recovery on the W SET rig (base lineage; style fading back from the Pro look) — the approved LEFT get-up mirrored in role:
# the keeper is on his RIGHT side, so the RIGHT (near) knee is down and the LEFT (far) foot comes forward
def kneel(name, phase, t, pose, note, grounded, style):
    A.kneel_frame(name, phase, t, pose, note, grounded, (0.0, 0.0), style); f = A.FRAMES[-1]; f["t_post"] = t; f["touching"] = [grounded]
p = {"pelvis": {"dy": 33, "dx": 1}, "torso": {"rot": -22, "sy": 0.68, "sx": 0.9}, "head": {"rot": 16, "sx": 0.88, "sy": 0.88},
     "near_thigh": {"rot": -22}, "near_shin": {"rot": 128, "sy": 0.8}, "near_boot": {"rot": -102}, "far_thigh": {"rot": 70, "sy": 0.9}, "far_shin": {"rot": -96}, "far_boot": {"rot": 14},
     "far_upper": {"rot": -44, "sx": 0.9}, "far_fore": {"rot": -16, "sx": 0.9}, "near_upper": {"rot": -22, "sx": 0.9}, "near_fore": {"rot": 2, "sx": 0.9}}
kneel("P11_HALF_KNEEL", "HALF KNEEL (trunk low)", [0.81, 0.89], p, "sitting back on the RIGHT heel, LEFT foot planted forward, trunk low and just lifting, hands on the pitch/thigh; style 80 % toward the Pro look", "right knee/heel + left foot", 0.8)
p = {"pelvis": {"dy": 26, "dx": 2}, "torso": {"rot": -10, "sy": 0.96, "sx": 0.92}, "head": {"rot": 8, "sx": 0.92, "sy": 0.92},
     "near_thigh": {"rot": -18}, "near_shin": {"rot": 125, "sy": 0.8}, "near_boot": {"rot": -100}, "far_thigh": {"rot": 78}, "far_shin": {"rot": -88}, "far_boot": {"rot": 6},
     "far_upper": {"rot": -62}, "far_fore": {"rot": -10}, "near_upper": {"rot": -30}, "near_fore": {"rot": 10}}
kneel("P12_KNEELING", "KNEELING (one knee, one foot)", [0.89, 0.97], p, "RIGHT knee down (shin folded back), LEFT foot forward and planted, torso up, hands on the thigh, head up; style 55 %", "right knee + left foot", 0.55)
p = {"pelvis": {"dy": 10, "dx": 0}, "torso": {"rot": -6, "sy": 0.97}, "head": {"rot": 5}, "near_upper": {"rot": -30}, "near_fore": {"rot": 0}, "far_upper": {"rot": -20}, "far_fore": {"rot": 6}}
p = A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (S.far_foot[0] + 2, S.far_foot[1])); p = A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (S.near_foot[0] - 2, S.near_foot[1]))
kneel("P13_RISING", "RISING", [0.97, 1.05], p, "up on both feet in a deep crouch (hips 10 px down), hands coming up to the ready position; style 25 % — then the live SET", "both feet", 0.25)
V.save({"family": "RIGHT_V2b_LANDING", "contact_pose": "DIVE_NORTH_MEDHIGH (CW60)", "geometry": os.path.abspath(GEO), "pres": PRES, "V0": round(V0, 4), "plan": PLAN, "lengths": L, "thickness": THICK})
json.dump({"pres": PRES, "V0": V0, "frames": [CONTACT_REC] + [{k: f[k] for k in ("name", "phase", "t_post", "pres_d", "pres_screen", "world_joints", "screen_joints", "touching", "grounded") if k in f} for f in A.FRAMES]},
          open(os.path.join(OUT, "ground_contacts.json"), "w"), indent=1)
for f in A.FRAMES:
    if "world_joints" in f:
        w = f["world_joints"]; print(f"{f['name']:20s} t {f['t_post']} d {f['pres_d']:.3f}  waist z {w['waist'][1]:.2f} neck z {w['neck'][1]:.2f} elbow z {w['elbow'][1]:.2f} glove z {w['glove'][1]:.2f} kneeL z {w['kneeL'][1]:.2f} ankleL z {w['ankleL'][1]:.2f} | touching: {', '.join(f['touching']) or 'airborne'}")
