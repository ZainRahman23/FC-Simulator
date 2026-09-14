# VERTICAL HIGH SAVE — jump sequence around the approved VERTICAL_HIGH_CW25 contact pose (scale 1.00, 25° CW).
# The keeper starts on the real planted SET root; the pre-contact frames carry the presentation body from that root up into the
# contact pose: LOAD → CROUCH → PUSH → TOE-OFF on the SET rig (base lineage), then the last four ascent frames (ASCENT → EXTENSION →
# LATE BRIDGE → LATE 2) on the contact art's OWN parts, each worked backward from the untouched 25° PNG (roll, arm, leg fold and the
# hip height regress from the contact values), so there is no pose/scale/style change immediately before contact. The simulation root
# never moves (a HIGH_CATCH is a planted action); the drawn body translates. On the approved case (V_OVER_0, lat 0, z 2.25 m) the
# simulation calls the reach STANDING/LEAN and the art's glove-to-sole span at scale 1.00 equals the contact height, so the contact pose
# stands on the pitch 10 px toward the ball: the presentation is a low hop (soles up to 2 px off the pitch) that arrives on the pitch at
# the contact tick; on higher balls the hand-led placement lifts the late frames and the contact pose together (cap 5 live px).
# After contact a dedicated vertical landing on the contact parts (follow-through → settle → first load → both feet load → absorb) with
# the soles fixed on the landing spot (legs solved by IK, no sliding), then a two-step regain on the SET rig back under the planted root.
#   python3 author_vertical_jump.py <geometry.json (V_OVER_0)> <outdir>
import sys, os, json, math, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from v2_common import V2, glove_blob_centroid
from author_base import joint, pin
from gk_rig import mat_apply
from PIL import Image
GEO, OUT = sys.argv[1], sys.argv[2]
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
LM = {"head": ("joint", "head"), "lead_glove": ("distal", "fore_up"), "other_glove": ("distal", "arm_low"), "pelvis": ("joint", "pelvis"), "shoulder": ("joint", "arm_up"), "foot_L": ("distal", "legs_lower"), "foot_R": ("distal", "legs_lower")}
V = V2(GEO, OUT, "rig_vertical_cw25", LM, contact_canvas=(150, 260), contact_off=(50, 40), contact_label="VERTICAL_HIGH_CW25 (jump rig)", contact_scale=1.0)
A, S, C, R = V.A, V.S, V.C, V.RC
PS = S.ps; ROOTC = (C.root[0] + C.off[0], C.root[1] + C.off[1])
# ── palette bridge BASE → the new sprite (used on the last base frame only): per colour class, each base colour → nearest dominant new colour
def cls(p):
    r, g, b = p[:3]
    if g > 110 and g > r + 40 and g > b + 40: return "G"
    if r > 200 and g > 200 and b > 190: return "W"
    if r > 120 and g > 70 and b > 40 and r > g + 25 and r > b + 40: return "S"
    if max(r, g, b) < 70: return "K"
    return "?"
def palette_of(path):
    im = Image.open(path).convert("RGBA"); cnt = collections.Counter(im.getpixel((x, y))[:3] for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[3] >= 128)
    by = collections.defaultdict(list)
    for c, n in cnt.most_common(): by[cls(c)].append((c, n))
    return by
BASE = palette_of(S.R.parts["torso"].src.path); NEW = palette_of(os.path.join(REPO, "assets/visual_v1/goalkeeper/contextual/VERTICAL_HIGH_CW25.png"))
PAL = {}
for k, cols in BASE.items():
    tgt = [c for c, n in NEW.get(k, [])[:6]]
    if not tgt: continue
    for c, n in cols: PAL[c] = min(tgt, key=lambda t: sum((t[i] - c[i]) ** 2 for i in range(3)))
# ── contact art rel. its root (live px) from the rig at rest: pelvis pivot (seam), sole (shin distal), raised glove (blob centroid) ──
M0 = R.world({}); PELV0 = joint(R, M0, "pelvis", C.off); SOLE0 = mat_apply(M0["legs_lower"], *R.parts["legs_lower"].bone["to"]); SOLE0 = (SOLE0[0] + C.off[0], SOLE0[1] + C.off[1])
GLV0 = glove_blob_centroid(R, M0, ("fore_up",), C.off); SH0 = joint(R, M0, "arm_up", C.off)
def rel(p): return (round((p[0] - ROOTC[0]) * C.ps, 2), round((p[1] - ROOTC[1]) * C.ps, 2))
CPELV, CSOLE, CGLV, CSH = rel(PELV0), rel(SOLE0), rel(GLV0), rel(SH0)
pu, pl = R.parts["legs_upper"], R.parts["legs_lower"]
LEG_REACH = (math.hypot(pl.pivot[0] - pu.pivot[0], pl.pivot[1] - pu.pivot[1]) + math.hypot(pl.bone["to"][0] - pl.pivot[0], pl.bone["to"][1] - pl.pivot[1])) * C.ps
print("contact art rel root (live px): pelvis", CPELV, "sole", CSOLE, "glove", CGLV, "shoulder", CSH, "| leg reach (hip→sole, straight)", round(LEG_REACH, 2), "rest span", round(CSOLE[1] - CPELV[1], 2))
FR0, FL0 = V.FOOT_R0, V.FOOT_L0                    # SET ankles (near = keeper's RIGHT, far = LEFT), live px rel root
def order_far_front():
    z = {n: S.R.parts[n].z for n in S.R.order}
    for n in ("far_upper", "far_fore", "far_glove"): z[n] = S.R.parts["torso"].z + 0.5
    return sorted(S.R.order, key=lambda n: z[n])
IKW = {}                                            # hand-led weight per pre frame (schedule); post frames carry the contact placement
CARRY = {}
def tag(name, ikw=None, carry=None):
    f = A.FRAMES[-1]
    if ikw is not None: IKW[name.split("_")[0]] = ikw; f["ikw"] = ikw
    if carry is not None: CARRY[name.split("_")[0]] = carry; f["carry"] = carry
# ══ PRE-CONTACT, base lineage (W SET rig): the planted root, both feet on their spots, then the toe-off ══
NG = ("near_glove",)
V.base_frame("J01_LOAD", "LOAD (weight settles, eyes up)", 0.00, 0.10, (1.1, -32.6), (1.7, -18.0), 1.0, 1.0, 1.0, 0, 0, ((-2.6, -21.6), (4.4, -18.4)), 1.0, ("pin", 0), ("pin", 0), 0.0,
             "knees soften, hands drop a little, head goes up to the ball; feet planted on the root", "both feet", head_look=-14, anchor_parts=NG); tag("J01", ikw=0)
V.base_frame("J02_CROUCH", "CROUCH (deep load, arms back)", 0.10, 0.24, (0.4, -28.4), (1.2, -13.4), 1.0, 0.98, 1.0, 0, 0, ((1.0, -14.5), (6.5, -12.5)), 1.0, ("pin", 0), ("pin", 0), 0.0,
             "hips 4.6 px down, both knees bent, arms swung back for the jump, trunk leaning toward the ball; feet planted", "both feet", head_look=-18, anchor_parts=NG); tag("J02", ikw=0)
V.base_frame("J03_PUSH", "PUSH (legs driving up, heels lifting)", 0.24, 0.38, (0.2, -30.8), (0.6, -16.5), 1.0, 1.0, 1.0, 0, 0, ((-7.0, -29.0), (-2.0, -25.5)), 0.9, ("pin", 10), ("pin", 10), 0.15,
             "legs extending back through the SET height, heels lifting, both arms swinging forward and up, head on the ball", "both feet (heels up)", head_look=-20, draw_order=order_far_front(), anchor_parts=NG); tag("J03", ikw=0)
V.base_frame("J04_TOE_OFF", "TOE-OFF (on the toes, RIGHT arm reaching)", 0.38, 0.50, (-0.8, -33.4), (-0.6, -18.9), 1.0, 1.0, 1.0, 1, 1, ((-3.5, -41.0), (-6.0, -27.5)), 0.6, ("pin", 32), ("pin", 32), 0.4,
             "hips at the SET height on straight legs, toes down (ankles 0.7 px up), the RIGHT arm reaching up in front, the LEFT arm crossing at chest height: the last base frame", "both toes", head_look=-22, palette=PAL, draw_order=order_far_front(), anchor_parts=NG); tag("J04", ikw=0)
# ══ contact-parts frames: whole-body roll (pelvis rot, 0 = the art's 25° lean; negative = back toward upright), explicit hips, the raised
# arm aimed at the simulation hand of the frame's u within bounds, the legs solved so the SOLE sits on an explicit takeoff/landing path ══
def leg_ik(pose, roll, sole_live, knee_forward=True):
    """legs_upper/legs_lower rots so the shin distal (the boots' sole) lands on sole_live (live px rel root); returns the shortfall (px)"""
    pose["legs_upper"] = {**pose.get("legs_upper", {}), "rot": 0}; pose["legs_lower"] = {**pose.get("legs_lower", {}), "rot": 0}
    M = R.world(pose); P0 = joint(R, M, "legs_upper", C.off)
    d1 = (pl.pivot[0] - pu.pivot[0], pl.pivot[1] - pu.pivot[1]); d2 = (pl.bone["to"][0] - pl.pivot[0], pl.bone["to"][1] - pl.pivot[1])
    L1, L2 = math.hypot(*d1), math.hypot(*d2)
    T = (ROOTC[0] + sole_live[0] / C.ps, ROOTC[1] + sole_live[1] / C.ps)
    dx, dy = T[0] - P0[0], T[1] - P0[1]; dist = math.hypot(dx, dy); d = max(1e-6, min(L1 + L2 - 1e-3, dist))
    base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
    best = None
    for sgn in (1, -1):
        th1 = base + sgn * a; K = (P0[0] + L1 * math.cos(th1), P0[1] + L1 * math.sin(th1)); cross = dx * (K[1] - P0[1]) - dy * (K[0] - P0[0])
        score = cross if knee_forward else -cross
        if best is None or score > best[0]: best = (score, th1, K)
    _, th1, K = best; th2 = math.atan2(T[1] - K[1], T[0] - K[0])
    rest1 = math.atan2(d1[1], d1[0]) + math.radians(roll); rest2 = math.atan2(d2[1], d2[0]) + math.radians(roll)
    r1 = math.degrees(th1 - rest1); r2 = math.degrees(th2 - rest2) - r1
    pose["legs_upper"]["rot"] = r1; pose["legs_lower"]["rot"] = r2
    return max(0.0, (dist - (L1 + L2)) * C.ps)
def arm_ik(pose, roll, target_live, elbow_forward=True):
    """arm_up/fore_up rots so the forearm distal (the raised glove's centre) lands on target_live (live px rel root); returns the shortfall (px)"""
    au, fu = R.parts["arm_up"], R.parts["fore_up"]
    pose["arm_up"] = {**pose.get("arm_up", {}), "rot": 0, "sy": 1.0}; pose["fore_up"] = {**pose.get("fore_up", {}), "rot": 0}
    M = R.world(pose); P0 = joint(R, M, "arm_up", C.off)
    d1 = (fu.pivot[0] - au.pivot[0], fu.pivot[1] - au.pivot[1]); d2 = (fu.bone["to"][0] - fu.pivot[0], fu.bone["to"][1] - fu.pivot[1])
    L1, L2 = math.hypot(*d1), math.hypot(*d2)
    T = (ROOTC[0] + target_live[0] / C.ps, ROOTC[1] + target_live[1] / C.ps)
    dx, dy = T[0] - P0[0], T[1] - P0[1]; dist = math.hypot(dx, dy); d = max(1e-6, min(L1 + L2 - 1e-3, dist))
    base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
    best = None
    for sgn in (1, -1):
        th1 = base + sgn * a; K = (P0[0] + L1 * math.cos(th1), P0[1] + L1 * math.sin(th1)); cross = dx * (K[1] - P0[1]) - dy * (K[0] - P0[0])
        score = -cross if elbow_forward else cross                 # the target is above the shoulder: a forward (screen-left) elbow has cross < 0
        if best is None or score > best[0]: best = (score, th1, K)
    _, th1, K = best; th2 = math.atan2(T[1] - K[1], T[0] - K[0])
    tor = math.radians(roll + pose.get("torso", {}).get("rot", 0))
    rest1 = math.atan2(d1[1], d1[0]) + tor; rest2 = math.atan2(d2[1], d2[0]) + tor
    r1 = math.degrees(th1 - rest1); r2 = math.degrees(th2 - rest2) - r1
    pose["arm_up"]["rot"] = r1; pose["fore_up"]["rot"] = r2
    return max(0.0, (dist - (L1 + L2)) * C.ps)
def measure(q, h):
    q = {k: dict(v) for k, v in q.items()}; pin(R, q, "pelvis", (ROOTC[0] + h[0] / C.ps, ROOTC[1] + h[1] / C.ps), C.off, root="pelvis")
    M = R.world(q); g = glove_blob_centroid(R, M, ("fore_up",), C.off); sh = joint(R, M, "arm_up", C.off); so = mat_apply(M["legs_lower"], *pl.bone["to"])
    return ((g[0] - ROOTC[0]) * C.ps, (g[1] - ROOTC[1]) * C.ps), ((sh[0] - ROOTC[0]) * C.ps, (sh[1] - ROOTC[1]) * C.ps), ((so[0] + C.off[0] - ROOTC[0]) * C.ps, (so[1] + C.off[1] - ROOTC[1]) * C.ps)
def contact_pose(name, phase, t0, t1, pose, roll, out_style, note, hips, sole, grounded, ikw=None, carry=None, post=False, aim=True, pin_glove=False, sy_bounds=(0.85, 1.0), max_aim_deg=None, knee_forward=True, arm_over=None):
    um = 0.5 * (t0 + t1); root_off, hand = ((0.0, 0.0), None) if post else V.at_u(um)
    pose = {k: dict(v) for k, v in pose.items()}; pose["pelvis"] = {**pose.get("pelvis", {}), "rot": roll}; h = tuple(hips)
    arm_short = None
    if arm_over is not None and hand is not None:                           # the raised arm solved as a real two-bone chain toward the simulation hand
        pin(R, pose, "pelvis", (ROOTC[0] + h[0] / C.ps, ROOTC[1] + h[1] / C.ps), C.off, root="pelvis")
        _, sh, _ = measure(pose, h); vx, vy = hand[0] - sh[0], hand[1] - sh[1]; n = math.hypot(vx, vy) or 1.0
        arm_short = arm_ik(pose, roll, (hand[0] + vx / n * arm_over, hand[1] + vy / n * arm_over)); aim = False
    if aim and hand is not None:
        rot0 = pose.get("arm_up", {}).get("rot", 0)
        for _ in range(4):
            g, sh, _ = measure(pose, h)
            a_have = math.atan2(g[1] - sh[1], g[0] - sh[0]); a_want = math.atan2(hand[1] - sh[1], hand[0] - sh[0])
            d_have = math.hypot(g[0] - sh[0], g[1] - sh[1]); d_want = math.hypot(hand[0] - sh[0], hand[1] - sh[1])
            q = pose.setdefault("arm_up", {}); q["rot"] = q.get("rot", 0) + math.degrees(a_want - a_have)
            if max_aim_deg is not None: q["rot"] = max(rot0 - max_aim_deg, min(rot0 + max_aim_deg, q["rot"]))
            q["sy"] = max(sy_bounds[0], min(sy_bounds[1], q.get("sy", 1.0) * (d_want / max(1e-6, d_have))))
    if pin_glove and hand is not None:
        for _ in range(3): g, sh, _ = measure(pose, h); h = (h[0] + hand[0] - g[0], h[1] + hand[1] - g[1])
    pin(R, pose, "pelvis", (ROOTC[0] + h[0] / C.ps, ROOTC[1] + h[1] / C.ps), C.off, root="pelvis")
    short = leg_ik(pose, roll, sole, knee_forward)
    g, sh, so = measure(pose, h)
    A.contact_frame(name, phase, (f"endT +{t0:.2f}–{t1:.2f} s" if post else f"u {t0:.2f}–{t1:.2f}"), pose, note, grounded, roll, h, out_style=out_style)
    M = R.world(A.FRAMES[-1]["pose"]); anc = glove_blob_centroid(R, M, ("fore_up",), C.off)
    V._finish(t0, t1, hand, root_off, ("fore_up",), R, C.off, roll=roll, hips=h, arm=dict(pose.get("arm_up", {})), glove_err=((round(g[0] - hand[0], 2), round(g[1] - hand[1], 2)) if hand is not None else None), anchor=anc, hips_shift=(round(h[0] - hips[0], 2), round(h[1] - hips[1], 2)))
    f = A.FRAMES[-1]; f["sole"] = [round(so[0], 2), round(so[1], 2)]; f["sole_target"] = list(sole); f["leg_short_px"] = round(short, 2)
    if arm_short is not None: f["arm_over_px"] = arm_over; f["arm_short_px"] = round(arm_short, 2); f["arm_solved"] = {"arm_up": round(pose["arm_up"]["rot"], 1), "fore_up": round(pose["fore_up"]["rot"], 1)}
    if post: f["t_post"] = [t0, t1]; f["u"] = None
    tag(name, ikw=ikw, carry=carry)
    return pose
# ── ASCENT (u 0.50–0.95): worked backward from the PNG. roll → 0, raised arm → straight (world angle from vertical: −30 → −18 → −8 → −3 → +2 at
# the art), elbow bend → 0, other arm → the art's chest position, hips (pelvis seam) → (-9.5,-15.4), soles → (-9.9,+0.6) on the pitch.
ASC = [  # name             phase                              u0    u1    roll  hips (seam)      sole (boots)    over  arm_low  torso  head  style  ikw
    ("J05_ASCENT",      "ASCENT (apex, contact parts)",         0.50, 0.64, -18, (-2.9, -19.3),  (-3.2, -1.6),    4.0,   14,     -5,    -6,   0.85,  0.25),
    ("J06_EXTENSION",   "EXTENSION (elbow opening)",            0.64, 0.78, -11, (-5.6, -18.2),  (-6.0, -0.4),    2.5,    8,     -3,    -4,   0.60,  0.50),
    ("J07_LATE_BRIDGE", "LATE ASCENT (6° short of the pose)",   0.78, 0.89,  -6, (-7.6, -17.0),  (-7.8,  0.9),    1.0,    4,     -2,    -2,   0.35,  0.80),
    ("J08_LATE_2",      "LATE ASCENT 2 (2° short of the pose)", 0.89, 0.95,  -2, (-8.9, -16.0),  (-9.2,  1.7),    0.0,    1,     -1,    -1,   0.15,  1.00),
]
for name, phase, u0, u1, roll, hips, sole, over, al, to, hd, sty, ikw in ASC:
    contact_pose(name, phase, u0, u1, {"arm_low": {"rot": al}, "torso": {"rot": to}, "head": {"rot": hd}}, roll, sty,
                 f"contact parts rolled {roll:+d}° from the art, raised arm solved as a two-bone chain to {over:.1f} px beyond the simulation hand (elbow opening), soles {sole[1]:+.1f} px from the root line {abs(sole[0]):.1f} px toward the ball", hips, sole, "airborne" if sole[1] < 0.5 else "toes",
                 ikw=ikw, arm_over=over)
# ══ POST-CONTACT: dedicated vertical landing on the contact parts (the carried contact placement fades: on a higher ball the body descends
# with it); the soles stay on the landing spot (the art's own sole position) — the knees and hips absorb, the raised arm comes down in front.
SOLE_LAND = CSOLE
LAND = [  # name                phase                                  t0    t1    roll  hips             arm_up fore_up arm_low torso head  style  carry
    ("L01_FOLLOW_THROUGH", "FOLLOW-THROUGH (glove through the ball)", 0.02, 0.08,   0, (CPELV[0], CPELV[1] - 0.1),   6,    8,   -4,   1,   4,  0.00, 1.00),
    ("L02_SETTLE",         "SETTLE (weight onto the feet)",           0.08, 0.16,  -8, (CPELV[0] - 0.1, CPELV[1] + 0.2), -22, -14, -10,   2,   6,  0.15, 0.85),
    ("L03_FIRST_LOAD",     "FIRST LOAD (knees start to give)",        0.16, 0.24, -14, (CPELV[0] - 0.2, CPELV[1] + 1.0), -50, -24, -16,   3,   6,  0.35, 0.60),
    ("L04_BOTH_FEET",      "BOTH FEET LOADED (hips absorbing)",       0.24, 0.34, -19, (CPELV[0] - 0.1, CPELV[1] + 2.2), -80, -30, -22,   4,   5,  0.55, 0.35),
    ("L05_ABSORB",         "ABSORB (deepest knee bend)",              0.34, 0.46, -23, (CPELV[0] + 0.1, CPELV[1] + 3.4), -105, -34, -26,  6,   4,  0.75, 0.15),
]
for name, phase, t0, t1, roll, hips, au, fu, al, to, hd, sty, carry in LAND:
    contact_pose(name, phase, t0, t1, {"arm_up": {"rot": au}, "fore_up": {"rot": fu}, "arm_low": {"rot": al}, "torso": {"rot": to}, "head": {"rot": hd}}, roll, sty,
                 f"landing on the contact parts: roll {roll:+d}° (lean {25 + roll}°), hips {hips[1] - CPELV[1]:+.1f} px from the contact height, soles fixed on the landing spot, raised arm coming down in front", hips, SOLE_LAND, "both feet",
                 carry=carry, post=True, aim=False)
# ══ REGAIN on the SET rig (base lineage): two real steps back under the planted root — a lifted foot per frame, the planted foot never slides ══
def regain(name, phase, t0, t1, hips, head, near_foot, far_foot, gloves, style, note, grounded, near_tilt=0, far_tilt=0, palette=None):
    p, T, _ = A.body(head, hips, sx=1.0, head_scale=1.0, head_look=-6); p.pop("_limb_sx", None)
    A.leg_ik(p, "near_thigh", "near_shin", "near_boot", (S.root[0] + near_foot[0] / PS, S.root[1] + near_foot[1] / PS), tilt=near_tilt)
    A.leg_ik(p, "far_thigh", "far_shin", "far_boot", (S.root[0] + far_foot[0] / PS, S.root[1] + far_foot[1] / PS), tilt=far_tilt)
    V.arm_to(p, (S.root[0] + gloves[0][0] / PS, S.root[1] + gloves[0][1] / PS), "near", elbow_back=True); V.arm_to(p, (S.root[0] + gloves[1][0] / PS, S.root[1] + gloves[1][1] / PS), "far", elbow_back=True)
    A.set_frame(name, phase, f"endT +{t0:.2f}–{t1:.2f} s", p, note, grounded, style=style, palette=palette); f = A.FRAMES[-1]; f["t_post"] = [t0, t1]; f["u"] = None
    M = S.R.world(f["pose"]); gc = glove_blob_centroid(S.R, M, ("near_glove",), S.off); f["landmarks"]["lead_glove"] = (round(gc[0], 1), round(gc[1], 1)); f["landmarks"]["other_glove"] = f["landmarks"]["lead_glove"]
    tag(name, carry=0)
LX = SOLE_LAND[0]                                  # the landing spot (both soles) is 9.9 px toward the ball of the planted root: LEFT (far) foot steps back first, then the RIGHT (near)
# SET rig feet: near = the keeper's RIGHT (north in this view, ankle FR0 (-2.1,-8.4), sole 2.9 px below it), far = LEFT (south, ankle FL0 (2.1,-5.5),
# sole 5.5 px below it = the root line). The landing spot's soles are at (-10.5,+2.2): the LEFT (south) foot stays planted there (its sole
# matches the contact soles), the RIGHT foot steps back first; then the LEFT; then both are on their SET spots. A planted foot never moves.
regain("L06_STEP_A", "REGAIN (RIGHT foot lifted, stepping back)", 0.46, 0.54, (-7.4, -15.5), (-6.8, -29.6), (LX + 4.0, FR0[1] - 1.5), (LX, FL0[1] + 2.2 + 0.0), ((-11.0, -19.5), (-4.0, -18.5)), 0.7,
       "rising out of the absorb, the RIGHT (north) foot lifted mid-step back toward its spot, the LEFT foot planted on the landing spot (sole where the contact art's soles were)", "left foot (right foot in the air)", palette=PAL)
regain("L07_STEP_B", "REGAIN 2 (RIGHT foot planted, LEFT foot lifted)", 0.54, 0.62, (-3.2, -16.0), (-2.4, -30.4), (FR0[0], FR0[1]), (LX + 4.5, FL0[1] - 2.5), ((-7.0, -20.5), (0.5, -19.0)), 0.35,
       "the RIGHT foot planted on its SET spot, the LEFT (south) foot lifted mid-step, hands coming to the ready", "right foot (left foot in the air)")
regain("L08_READY", "READY (both feet on their spots, near-SET crouch)", 0.62, 0.70, (1.2, -17.4), (1.1, -32.0), (FR0[0], FR0[1]), (FL0[0], FL0[1]), ((-2.6, -22.6), (4.2, -19.6)), 0.1,
       "both feet on their SET spots, hips 0.6 px below SET, hands in the ready position; then the live SET", "both feet", near_tilt=4)
V.save({"family": "VERTICAL_HIGH_JUMP", "contact_pose": "VERTICAL_HIGH (CW25)", "geometry": os.path.abspath(GEO), "ikw": IKW, "carry": CARRY, "palette_map_size": len(PAL),
        "contact_rel_root": {"pelvis": CPELV, "sole": CSOLE, "glove": CGLV, "shoulder": CSH}})
print(f"\n{'frame':20s} {'roll':>5s} {'hips (seam)':>16s} {'sole':>16s} {'sole tgt':>16s} {'glove':>16s} {'sim hand':>16s} {'glove-hand':>12s} {'arm rot/sy':>14s} short")
for f in A.FRAMES:
    if "sole" in f: print(f"{f['name']:20s} {f['roll_deg']:5.0f} {str(f['hips_rel_root']):>16s} {str(f['sole']):>16s} {str(f['sole_target']):>16s} {str(f['screen']['lead_glove']):>16s} {str(f.get('sim_hand')):>16s} {str(f.get('glove_minus_hand')):>12s} {str(tuple(f['arm_solved'].values())):>14s} {f['leg_short_px']} {f.get('arm_short_px','')}")
    else: print(f"{f['name']:20s} {'':5s} {str(f['screen']['pelvis']):>16s} {'feet ' + str(f['screen']['foot_R']) + '/' + str(f['screen']['foot_L']):>33s} {str(f['screen']['lead_glove']):>16s} {str(f.get('sim_hand')):>16s}")
