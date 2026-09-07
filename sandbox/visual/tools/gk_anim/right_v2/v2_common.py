# RIGHT V2 authoring machinery shared by the far-dive trunk (author_right_v2b.py) and the TOP branch (author_right_top_v2.py).
# Everything here is presentation tooling: frames are rendered from the component rigs (W SET rig for the base lineage, a contact-pose
# rig for the Pro lineage) against the geometry of ONE representative save (right_geometry.js → geometry.json): per-u root travel and
# simulation-hand path. No simulation code, no asset is touched.
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.join(HERE, "..", "library"); RIG = os.path.join(HERE, "..", "rig"); PD = os.path.join(HERE, "..", "proto_dive")
for p in (LIB, RIG, PD):
    if p not in sys.path: sys.path.insert(0, p)
from author_base import Author, SetRig, ContactRig, joint, pin
from rig_w_set import build as build_set
from gk_rig import mat_apply, mat_mul, mat_trans
from pixel_ops import stylize, outline, cleanup


def glove_blob_centroid(R, M, names, off):
    """centroid of the BRIGHT glove pixels (the builder's glove class r>230 g>230 b>200) of the given parts, forward-mapped to canvas px —
    the same convention as the live anchors' lead_glove (white-blob centroid), so a frame's anchor and the contact art's agree"""
    xs = ys = 0.0; n = 0
    for name in names:
        p = R.parts[name]; Mw = mat_mul(mat_trans(off[0], off[1]), M[name])
        for (x, y) in p.pixels:
            r, g, b, a = p.src.px[x, y]
            if a >= 128 and r > 230 and g > 230 and b > 200:
                u, v = mat_apply(Mw, x + 0.5, y + 0.5); xs += u; ys += v; n += 1
    return (xs / n, ys / n) if n else part_centroid(R, M, names[0], off)


def part_centroid(R, M, name, off):
    """rendered centroid of a part's pixels (canvas px) — the convention the live anchors use for the glove (blob centroid)"""
    p = R.parts[name]; Mw = mat_mul(mat_trans(off[0], off[1]), M[name]); xs = ys = 0.0
    for (x, y) in p.pixels:
        u, v = mat_apply(Mw, x + 0.5, y + 0.5); xs += u; ys += v
    n = max(1, len(p.pixels)); return (xs / n, ys / n)


class V2:
    """one authoring session: SET rig + one contact rig, against one geometry"""
    def __init__(self, geometry_json, out, contact_module, contact_lm, contact_canvas=(150, 260), contact_off=(34, 40), contact_label=None):
        self.GEO = json.load(open(geometry_json)); self.OUT = out; os.makedirs(out, exist_ok=True)
        import importlib; CM = importlib.import_module(contact_module)
        RS, _ = build_set(out); RC, _ = CM.build()
        self.S = SetRig(RS); self.RC = RC
        self.C = ContactRig(RC, tuple(CM.ROOT), 0.72, contact_canvas, contact_off, contact_lm, contact_label or contact_module)
        self.A = Author(self.S, self.C, out)
        tr = self.GEO["trace"]; self.tr = tr; self.ct = self.GEO["committedTick"]; self.kt = self.GEO["contactTick"]; self.sp0 = tr[self.ct]["sp"]
        S = self.S; self.PS = S.ps; self.NEAR, self.FAR = S.near_foot, S.far_foot
        self.FOOT_R0 = ((self.NEAR[0] - S.root[0]) * self.PS, (self.NEAR[1] - S.root[1]) * self.PS)
        self.FOOT_L0 = ((self.FAR[0] - S.root[0]) * self.PS, (self.FAR[1] - S.root[1]) * self.PS)

    # ── geometry ──
    def use_geometry(self, geometry_json):
        """switch the per-u geometry (root travel, simulation hand) — the shared trunk is authored against the HIGH representative save,
        a branch's own late frames against its own representative save"""
        self.GEO = json.load(open(geometry_json)); tr = self.GEO["trace"]; self.tr = tr; self.ct = self.GEO["committedTick"]; self.kt = self.GEO["contactTick"]; self.sp0 = tr[self.ct]["sp"]
    def at_u(self, u):
        """root screen offset (rel. commit root) and sim hand (rel. root) at u of the representative save (linear between ticks)"""
        tr, ct, kt, sp0 = self.tr, self.ct, self.kt, self.sp0
        rows = [t for t in tr[ct:kt + 1] if t.get("u") is not None]
        for a, b in zip(rows, rows[1:]):
            if a["u"] <= u <= b["u"]:
                k = (u - a["u"]) / max(1e-6, b["u"] - a["u"])
                root = (a["sp"][0] + (b["sp"][0] - a["sp"][0]) * k - sp0[0], a["sp"][1] + (b["sp"][1] - a["sp"][1]) * k - sp0[1])
                ha = (a["handSp"][0] - a["sp"][0], a["handSp"][1] - a["sp"][1]); hb = (b["handSp"][0] - b["sp"][0], b["handSp"][1] - b["sp"][1])
                return root, (ha[0] + (hb[0] - ha[0]) * k, ha[1] + (hb[1] - ha[1]) * k)
        t = rows[-1]; return (t["sp"][0] - sp0[0], t["sp"][1] - sp0[1]), (t["handSp"][0] - t["sp"][0], t["handSp"][1] - t["sp"][1])
    def pinned_foot(self, foot0, u):
        r, _ = self.at_u(u); S = self.S; return ((foot0[0] - r[0]) / self.PS + S.root[0], (foot0[1] - r[1]) / self.PS + S.root[1])

    # ── SET-rig helpers ──
    def arm_to(self, pose, glove_target, side="near", elbow_back=True, ext=0):
        """exact 2-bone IK: the glove pivot lands on glove_target (sprite px, canvas coords); elbow side chosen by elbow_back"""
        R = self.S.R; M = R.world(pose); Sh = joint(R, M, f"{side}_upper", (0, 0))
        K0 = R.parts[f"{side}_fore"].pivot; G0 = R.parts[f"{side}_glove"].pivot; U0 = R.parts[f"{side}_upper"].pivot
        L1 = math.hypot(K0[0] - U0[0], K0[1] - U0[1]) + ext; L2 = math.hypot(G0[0] - K0[0], G0[1] - K0[1]) + ext
        rest1 = math.atan2(K0[1] - U0[1], K0[0] - U0[0]); rest2 = math.atan2(G0[1] - K0[1], G0[0] - K0[0])
        dx, dy = glove_target[0] - Sh[0], glove_target[1] - Sh[1]; d = max(1e-6, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
        base = math.atan2(dy, dx); c = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); a = math.acos(c)
        best = None
        for sgn in (1, -1):
            th1 = base + sgn * a; K = (Sh[0] + L1 * math.cos(th1), Sh[1] + L1 * math.sin(th1))
            cross = dx * (K[1] - Sh[1]) - dy * (K[0] - Sh[0]); score = -cross if elbow_back else cross
            if best is None or score > best[0]: best = (score, th1, K)
        _, th1, K = best; th2 = math.atan2(glove_target[1] - K[1], glove_target[0] - K[0])
        tor = pose.get("torso", {}).get("rot", 0) + pose.get("pelvis", {}).get("rot", 0)
        r1 = math.degrees(th1 - rest1) - tor; r2 = math.degrees(th2 - rest2) - tor - r1
        pose[f"{side}_upper"] = {**pose.get(f"{side}_upper", {}), "rot": r1, "ext": ext}; pose[f"{side}_fore"] = {**pose.get(f"{side}_fore", {}), "rot": r2, "ext": ext}
        return pose
    def base_frame(self, name, phase, u_from, u_to, head, hips, torso_sx, torso_sy, head_scale, leg_ext, arm_ext, gloves, elbow, near_leg, far_leg, style, note, grounded, head_look=0):
        """W-rig frame: hips/head from the screen paths (rel. the root at that u), gloves on authored arcs, feet pinned or trailing"""
        S, A, PS = self.S, self.A, self.PS
        um = 0.5 * (u_from + u_to); root_off, hand = self.at_u(um)
        p, T, _ = A.body(head, hips, sx=torso_sx, head_scale=head_scale, limb_sx=1.0, head_look=head_look)
        p["torso"]["sy"] = torso_sy; p.pop("_limb_sx", None)
        for leg, spec in (("near", near_leg), ("far", far_leg)):
            if spec[0] == "pin": tgt = self.pinned_foot(self.FOOT_R0 if leg == "near" else self.FOOT_L0, um); A.leg_ik(p, f"{leg}_thigh", f"{leg}_shin", f"{leg}_boot", tgt, tilt=spec[1])
            elif spec[0] == "foot": A.leg_ik(p, f"{leg}_thigh", f"{leg}_shin", f"{leg}_boot", (S.root[0] + spec[1][0] / PS, S.root[1] + spec[1][1] / PS), tilt=spec[2])
            else: p[f"{leg}_thigh"] = {"rot": spec[1], "sy": spec[4] if len(spec) > 4 else 1.0}; p[f"{leg}_shin"] = {"rot": spec[2], "sy": spec[4] if len(spec) > 4 else 1.0}; p[f"{leg}_boot"] = {"rot": spec[3]}
            for part in (f"{leg}_thigh", f"{leg}_shin"): p[part]["ext"] = leg_ext
        gt, gtf = gloves
        self.arm_to(p, (S.root[0] + gt[0] / PS, S.root[1] + gt[1] / PS), "near", elbow_back=True, ext=arm_ext)
        self.arm_to(p, (S.root[0] + gtf[0] / PS, S.root[1] + gtf[1] / PS), "far", elbow_back=True, ext=arm_ext)
        A.set_frame(name, phase, f"u {u_from:.2f}–{u_to:.2f}", p, note, grounded, style=style)
        self._finish(u_from, u_to, hand, root_off, ("near_glove", "far_glove"), S.R, S.off)
        return p
    # ── contact-rig frames ──
    def pro_frame(self, name, phase, u_from, u_to, pose, roll, out_style, note, hips, aim_arm="sleeve", aim_gloves=("glove_A", "glove_B"), lower_glove=None, anchor_k=0.0, sy_bounds=(0.85, 1.0), aim=True):
        """contact-rig frame: whole-body ROLL (pelvis rot, deg, + = clockwise on screen; the art itself is 0) and the hand-led anchor
        placed EXACTLY on the simulation hand for the frame's u, so the runtime has nothing to correct and drawn = authored.
        The anchor follows the live art's convention (centroid of ALL bright glove pixels, `aim_gloves`) blended toward the LOWER glove's
        own centroid by anchor_k (1 = the lower glove): early in the late flight the leading hand may sit a little beyond the simulation's
        reach point with the second hand on it, and the two converge on the art's merged-blob anchor by the last frame. The arm part is
        aimed at the hand (rot) and foreshortened to the reach (sy, bounded); the remaining offset moves the whole figure (hips)."""
        A, C, R = self.A, self.C, self.RC
        um = 0.5 * (u_from + u_to); root_off, hand = self.at_u(um)
        pose = {k: dict(v) for k, v in pose.items()}; pose["pelvis"] = {**pose.get("pelvis", {}), "rot": roll}
        root = (C.root[0] + C.off[0], C.root[1] + C.off[1])
        def anchor_of(M):
            gM = glove_blob_centroid(R, M, aim_gloves, C.off)
            if lower_glove and anchor_k > 0:
                gB = glove_blob_centroid(R, M, (lower_glove,), C.off); return (gM[0] + (gB[0] - gM[0]) * anchor_k, gM[1] + (gB[1] - gM[1]) * anchor_k)
            return gM
        def measure(q, h):
            q = {k: dict(v) for k, v in q.items()}
            pin(R, q, "pelvis", (root[0] + h[0] / C.ps, root[1] + h[1] / C.ps), C.off, root="pelvis")
            M = R.world(q); g = anchor_of(M); sh = joint(R, M, aim_arm, C.off)
            return ((g[0] - root[0]) * C.ps, (g[1] - root[1]) * C.ps), ((sh[0] - root[0]) * C.ps, (sh[1] - root[1]) * C.ps)
        h = tuple(hips)
        if aim:
            for _ in range(4):
                g, sh = measure(pose, h)
                a_have = math.atan2(g[1] - sh[1], g[0] - sh[0]); a_want = math.atan2(hand[1] - sh[1], hand[0] - sh[0])
                d_have = math.hypot(g[0] - sh[0], g[1] - sh[1]); d_want = math.hypot(hand[0] - sh[0], hand[1] - sh[1])
                q = pose.setdefault(aim_arm, {}); q["rot"] = q.get("rot", 0) + math.degrees(a_want - a_have)
                q["sy"] = max(sy_bounds[0], min(sy_bounds[1], q.get("sy", 1.0) * (d_want / max(1e-6, d_have))))
        for _ in range(3):                                   # whatever reach the bounded arm cannot cover moves the whole figure
            g, sh = measure(pose, h); h = (h[0] + hand[0] - g[0], h[1] + hand[1] - g[1])
        g, sh = measure(pose, h)
        A.contact_frame(name, phase, f"u {u_from:.2f}–{u_to:.2f}", pose, note, "airborne", roll, h, out_style=out_style)
        M = R.world(A.FRAMES[-1]["pose"]); anc = anchor_of(M)
        self._finish(u_from, u_to, hand, root_off, aim_gloves, R, C.off, roll=roll, hips=h, arm=dict(pose.get(aim_arm, {})), glove_err=(round(g[0] - hand[0], 2), round(g[1] - hand[1], 2)), anchor=anc, hips_shift=(round(h[0] - hips[0], 2), round(h[1] - hips[1], 2)))
        return pose
    def _finish(self, u_from, u_to, hand, root_off, glove_parts, R, off, roll=None, hips=None, arm=None, glove_err=None, anchor=None, hips_shift=None):
        f = self.A.FRAMES[-1]
        if anchor is None: M = R.world(f["pose"]); anchor = glove_blob_centroid(R, M, glove_parts, off)
        f["landmarks"]["lead_glove"] = (round(anchor[0], 1), round(anchor[1], 1)); f["landmarks"]["other_glove"] = (round(anchor[0], 1), round(anchor[1], 1))   # ONE anchor, blob-centroid convention like the live art
        f["u"] = [u_from, u_to]; f["sim_hand"] = [round(hand[0], 1), round(hand[1], 1)]; f["root_off"] = [round(root_off[0], 1), round(root_off[1], 1)]
        if roll is not None: f["roll_deg"] = roll
        if hips is not None: f["hips_rel_root"] = [round(hips[0], 2), round(hips[1], 2)]
        if arm is not None: f["arm_solved"] = {k: round(v, 2) for k, v in arm.items()}
        if glove_err is not None: f["glove_minus_hand"] = glove_err
        if hips_shift is not None: f["hips_shift_for_reach"] = hips_shift
    def save(self, extra=None):
        self.A.save(extra)
        json.dump([{k: f[k] for k in ("name", "u", "sim_hand", "root_off", "roll_deg", "hips_rel_root", "arm_solved", "glove_minus_hand", "hips_shift_for_reach") if k in f} for f in self.A.FRAMES], open(os.path.join(self.OUT, "schedule_meta.json"), "w"), indent=1)


# ── the shared RIGHT trunk (F00–F05): identical tables in every branch, so the baked files are shared ──
HEAD = {"F01": (1.5, -33.2), "F02": (2.2, -31.6), "F03": (2.4, -31.9), "F04": (2.2, -32.3), "F05": (1.9, -32.0), "F06": (1.9, -31.2)}
HIPS = {"F01": (1.7, -18.6), "F02": (1.4, -16.2), "F03": (1.3, -17.6), "F04": (1.0, -18.9), "F05": (0.7, -19.6), "F06": (0.9, -19.0)}
def author_trunk(V, through="F05"):
    A = V.A; FOOT_L0 = V.FOOT_L0
    A.set_frame("F00_SET", "SET (live sprite)", "pre-commit", {}, "GK_BASE_V1 SET/west, untouched", "both feet", clean=False)
    V.base_frame("F01_LOAD", "LOAD (weight to the RIGHT foot)", 0.00, 0.06, HEAD["F01"], HIPS["F01"], 1.0, 1.0, 1.0, 0, 0, ((-3.0, -21.5), (3.5, -19.5)), 1.0, ("pin", 0), ("pin", 0), 0.0,
                 "weight transfers onto the RIGHT (drive) foot, knees soften, hands drop, head on the ball", "both feet", head_look=-6)
    V.base_frame("F02_PLANT", "PLANT / deepest load", 0.06, 0.15, HEAD["F02"], HIPS["F02"], 0.99, 0.985, 1.0, 0, 0, ((1.5, -19.0), (6.0, -17.0)), 1.0, ("pin", 0), ("pin", 14), 0.04,
                 "hips lowest and over the planted RIGHT foot, RIGHT knee fully loaded, LEFT heel lifting, arms at the back of the swing", "both feet (LEFT heel up)", head_look=-10)
    V.base_frame("F03_PUSH", "PUSH-OFF (RIGHT leg driving)", 0.15, 0.24, HEAD["F03"], HIPS["F03"], 0.97, 0.965, 0.99, 1, 1, ((-6.0, -25.5), (-1.5, -23.0)), 0.75, ("pin", 8), ("foot", (FOOT_L0[0] + 2.5, FOOT_L0[1] - 4.5), 0), 0.14,
                 "the RIGHT leg extends from the planted toe, hips driven up and toward the save side, the LEFT foot unloads and trails, both arms swinging forward-left and up", "RIGHT foot (toe)", head_look=-12)
    V.base_frame("F04_TOE_OFF", "TOE-OFF (RIGHT toe only)", 0.24, 0.32, HEAD["F04"], HIPS["F04"], 0.95, 0.945, 0.985, 2, 2, ((-8.5, -31.5), (-4.5, -29.0)), 0.45, ("pin", 30), ("foot", (FOOT_L0[0] + 4.0, FOOT_L0[1] - 5.0), 0), 0.30,
                 "RIGHT leg fully extended on the toe (boot +30°), hips rising and moving up-left, LEFT leg trailing behind, arms at the shoulder line reaching for the ball", "RIGHT toe", head_look=-14)
    V.base_frame("F05_EARLY_FLIGHT", "EARLY FLIGHT (hands lead)", 0.32, 0.44, HEAD["F05"], HIPS["F05"], 0.93, 0.925, 0.975, 4, 3, ((-6.5, -36.0), (-3.0, -33.5)), 0.25, ("rot", -10, -6, 24, 1.0), ("rot", -20, -22, 8, 0.96), 0.50,
                 "first airborne frames: the RIGHT leg still nearly straight from the drive, the LEFT knee folding behind, arms 60° up-left and opening, shoulders following, torso narrowing as the chest turns toward the ball", "airborne")
    if through == "F06":
        V.base_frame("F06_MID_FLIGHT", "MID FLIGHT (last base frame, Pro proportions)", 0.44, 0.58, HEAD["F06"], HIPS["F06"], 0.91, 0.90, 0.96, 6, 4, ((-7.5, -39.0), (-4.0, -36.5)), 0.10, ("rot", -9, -12, 12, 1.0), ("rot", -17, -26, 10, 1.0), 0.90,
                     "arms nearly straight at the ball (70° up-left), hips level with standing height, both legs trailing down-right with the knees folding: the shape the Pro parts continue from", "airborne")
