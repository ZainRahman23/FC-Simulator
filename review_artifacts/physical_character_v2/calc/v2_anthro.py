#!/usr/bin/env python3
"""V2 anthropometric / mass / inertia calculator (design-time only; NOT runtime code).

Canonical character space (CCS): +X = anatomical RIGHT, +Y = up, +Z = anatomical forward (left-handed, Unity numeric
convention), metres / kg, ground = stud-tip plane y = 0. Canonical reference pose = T-pose (arms along +/-X).
Human evidence: de Leva (1996) male segment parameters; Drillis & Contini (1966) via Winter (2009) stature fractions.
Engineering choices are marked ENG.
"""
import json, math, sys
import numpy as np

# de Leva 1996, male: mass %, mean length (mm, 1741 mm / 73.0 kg sample), COM % from the listed proximal endpoint,
# radii of gyration % of length about [sagittal (AP) axis, transverse (ML) axis, longitudinal axis]
DL = {
    "head":     (6.94, 242.9, 50.02, (30.3, 31.5, 26.1)),   # vertex -> cervicale (C7)
    "UPT":      (15.96, 170.7, 29.99, (71.6, 45.4, 65.9)),  # suprasternale -> xiphoid
    "MPT":      (16.33, 215.5, 45.02, (48.2, 38.3, 46.8)),  # xiphoid -> omphalion
    "LPT":      (11.17, 145.7, 61.15, (61.5, 55.1, 58.7)),  # omphalion -> mid-hip joint centre
    "upperArm": (2.71, 281.7, 57.72, (28.5, 26.9, 15.8)),   # SJC -> EJC
    "forearm":  (1.62, 268.9, 45.74, (27.6, 26.5, 12.1)),   # EJC -> WJC
    "hand":     (0.61, 86.2, 79.00, (62.8, 51.3, 40.1)),    # WJC -> 3rd metacarpale
    "thigh":    (14.16, 422.2, 40.95, (32.9, 32.9, 14.9)),  # HJC -> KJC
    "shank":    (4.33, 440.3, 43.95, (25.1, 24.6, 10.2)),   # KJC -> AJC (de Leva alternative row; our distal endpoint is the AJC)
    "foot":     (1.37, 258.1, 44.15, (25.7, 24.5, 12.4)),   # heel -> toe tip
}
H0 = 1.741
assert abs(sum(v[0] for k, v in DL.items() if k in ("head", "UPT", "MPT", "LPT")) + 2 * sum(DL[k][0] for k in ("upperArm", "forearm", "hand", "thigh", "shank", "foot")) - 100.0) < 1e-9

def frac(seg):
    return DL[seg][1] / 1000.0 / H0          # segment length as a fraction of stature

# ---------------- default V2 proportion profile (fractions of stature unless noted) ----------------
PROFILE = {
    "ankleH": 0.039,          # AJC height, barefoot (Drillis & Contini 0.039 H; de Leva AJC = sphyrion - 12.6 mm; ANSUR LMAL 0.0415 H)
    "kneeH": 0.280,           # KJC height (ANSUR II lateral femoral epicondyle height 492/1756 mm)
    "hipH": 0.515,            # HJC height (ANSUR II trochanterion 901/1756 mm + de Leva HJC 3.2 mm above trochanterion)
    "hipHalf": 0.050,         # HJC half-spacing / H  (~90 mm at 1.80 m; Bardakos & Freeman 2012, Harrington 2007, Hara 2016)
    "shoulderHalf": 0.109,    # GH centre half-spacing / H: ANSUR II biacromial 0.231 H (footballer-sized subset) / 2 minus ~1.2 cm (ENG)
    "sjcH": 0.798,            # SJC height: acromion 0.818-0.821 H (Drillis / ANSUR) minus de Leva 34.5 mm (scaled) = 0.798 H
    "footLen": 0.153,         # barefoot foot length / H (Drillis 0.152; ANSUR II 0.1544; footballer-sized ANSUR subset 0.1525)
    "footBreadth": 0.0575,    # ball breadth / H = 0.376 foot length (ANSUR II)
    "heelBreadth": 0.041,     # heel breadth / H = 0.268 foot length (ANSUR II)
    "ankleFromHeel": 0.22,    # AJC horizontal position, fraction of barefoot foot length from the heel  (evidence 0.19-0.25; ENG pick)
    "mtpFromHeel": 0.741,     # MTP1: ANSUR II ball-of-foot length 0.741 FL (Thompson et al. 2019: 0.70-0.79)
    "spineAP": {"lumbar": -0.017, "thoracolumbar": -0.022, "cervical": -0.017},   # ENG: spinal joint centres posterior of the trunk COM line (/H)
    "legScale": 1.0, "armScale": 1.0, "trunkScale": 1.0,   # proportion multipliers (variation hooks; lengths renormalised to stature)
}
EQUIP = {  # ENG: kit worn during play (body mass M is measured without boots)
    "boot": 0.20,          # kg per boot (modern elite FG boots ~0.16-0.25 kg)
    "shinPad": 0.08,       # kg per shin guard
    "kitUpper": 0.20, "kitLower": 0.15,   # shirt / shorts+socks
    "soleStack": 0.020,    # m: stud tip -> plantar surface under the heel (studs ~12 mm + soleplate/insole ~8 mm)
    "bootToe": 0.010,      # m: toe box beyond the toe tip (football boots fitted tight, ~5-10 mm)
    "bootHeel": 0.005,     # m: heel counter behind the heel
    "bootWidthAdd": 0.008, # m: upper + sole flare beyond the barefoot ball breadth
}

def seg_inertia_local(m, L, r, axis):
    """inertia (3x3, CCS axes) of a segment whose long axis is 'axis' in the canonical pose.
    r = radii (% of L) about [AP, ML, long]."""
    kAP, kML, kL = (ri / 100.0 * L for ri in r)
    if axis == "y":      # vertical segment: X = ML, Y = long, Z = AP
        return np.diag([m * kML**2, m * kL**2, m * kAP**2])
    if axis == "x":      # T-pose arm: X = long, Y = (former ML), Z = AP
        return np.diag([m * kL**2, m * kML**2, m * kAP**2])
    if axis == "z":      # foot: V1 mapping  X = ML(transverse r), Y = vertical(sagittal r), Z = long
        return np.diag([m * kML**2, m * kAP**2, m * kL**2])
    raise ValueError(axis)

def build_v2(H, M, pose="T", prof=None, equip=True):
    P = dict(PROFILE); P.update(prof or {})
    E = EQUIP if equip else {k: 0.0 for k in EQUIP}
    sole = EQUIP["soleStack"]            # geometry always in boots (stud-tip ground)
    Ls = {s: frac(s) * H for s in DL}
    Ls["shank"] = (P["kneeH"] - P["ankleH"]) * H * P["legScale"]
    Ls["thigh"] = (P["hipH"] - P["kneeH"]) * H * P["legScale"]
    Ls["upperArm"] *= P["armScale"]; Ls["forearm"] *= P["armScale"]; Ls["hand"] *= P["armScale"]
    # vertical landmarks (barefoot heights + sole stack)
    yA = P["ankleH"] * H + sole
    yK = yA + Ls["shank"]
    yH = yK + Ls["thigh"]                  # mid-hip joint centre height
    yOMPH = yH + Ls["LPT"]
    yXYPH = yOMPH + Ls["MPT"]
    ySUPR = yXYPH + Ls["UPT"]
    yVERT = H + sole
    yCERV = yVERT - Ls["head"]
    ySJC = (P["sjcH"] * H + sole) if P["sjcH"] else (0.630 * H + Ls["upperArm"] + sole)
    # stature closure check: hip + de Leva trunk (CERV->MIDH) + head must equal H
    closure = (yH - sole) + 603.3 / 1000 / H0 * H + Ls["head"] - H
    hx, sx = P["hipHalf"] * H, P["shoulderHalf"] * H
    ap = {k: v * H for k, v in P["spineAP"].items()}
    fl = P["footLen"] * H
    aHeel = P["ankleFromHeel"] * fl            # heel behind the AJC (barefoot)
    B = []   # bodies

    def add(name, seg, mass, com, I, joint=None, parent=None, extra=None):
        B.append({"name": name, "seg": seg, "mass": mass, "com": np.array(com, float), "I": I, "joint": None if joint is None else np.array(joint, float), "parent": parent, **(extra or {})})

    def mfrac(seg): return DL[seg][0] / 100.0 * M
    # --- trunk ---
    m = mfrac("LPT") + (E["kitLower"] * 0.6)
    com = [0, yOMPH - DL["LPT"][2] / 100 * Ls["LPT"], 0]
    add("pelvis", "LPT", m, com, seg_inertia_local(mfrac("LPT"), Ls["LPT"], DL["LPT"][3], "y"), joint=[0, yH, 0], parent=None)
    m = mfrac("MPT")
    com = [0, yXYPH - DL["MPT"][2] / 100 * Ls["MPT"], 0]
    add("abdomen", "MPT", m, com, seg_inertia_local(m, Ls["MPT"], DL["MPT"][3], "y"), joint=[0, yOMPH, ap["lumbar"]], parent="pelvis")
    m = mfrac("UPT") + E["kitUpper"]
    com = [0, ySUPR - DL["UPT"][2] / 100 * Ls["UPT"], 0]
    add("thorax", "UPT", m, com, seg_inertia_local(mfrac("UPT"), Ls["UPT"], DL["UPT"][3], "y"), joint=[0, yXYPH, ap["thoracolumbar"]], parent="abdomen")
    m = mfrac("head")
    com = [0, yVERT - DL["head"][2] / 100 * Ls["head"], 0]
    add("head", "head", m, com, seg_inertia_local(m, Ls["head"], DL["head"][3], "y"), joint=[0, yCERV, ap["cervical"]], parent="thorax")
    # --- arms ---
    for s, sg in (("R", 1), ("L", -1)):
        sj = np.array([sg * sx, ySJC, 0.0])
        if pose == "T":
            u = np.array([sg, 0, 0.0]); ax = "x"
        else:  # arms hanging
            u = np.array([0, -1.0, 0]); ax = "y"
        ej = sj + u * Ls["upperArm"]; wj = ej + u * Ls["forearm"]
        m = mfrac("upperArm")
        add("upperArm_" + s, "upperArm", m, sj + u * DL["upperArm"][2] / 100 * Ls["upperArm"], seg_inertia_local(m, Ls["upperArm"], DL["upperArm"][3], ax), joint=sj, parent="thorax", extra={"distal": ej})
        mf, mh = mfrac("forearm"), mfrac("hand")
        cf = ej + u * DL["forearm"][2] / 100 * Ls["forearm"]; ch = wj + u * DL["hand"][2] / 100 * Ls["hand"]
        c = (mf * cf + mh * ch) / (mf + mh)
        If = seg_inertia_local(mf, Ls["forearm"], DL["forearm"][3], ax); Ih = seg_inertia_local(mh, Ls["hand"], DL["hand"][3], ax)
        I = If + Ih + par(mf, cf - c) + par(mh, ch - c)
        add("forearm_" + s, "forearm+hand", mf + mh, c, I, joint=ej, parent="upperArm_" + s, extra={"distal": wj, "hand_com": ch})
    # --- legs (vertical, parallel, no splay) ---
    for s, sg in (("R", 1), ("L", -1)):
        hj = np.array([sg * hx, yH, 0.0]); kj = np.array([sg * hx, yK, 0.0]); aj = np.array([sg * hx, yA, 0.0])
        m = mfrac("thigh") + E["kitLower"] * 0.2
        add("thigh_" + s, "thigh", m, hj + [0, -DL["thigh"][2] / 100 * Ls["thigh"], 0], seg_inertia_local(mfrac("thigh"), Ls["thigh"], DL["thigh"][3], "y"), joint=hj, parent="pelvis")
        m = mfrac("shank"); mp = E["shinPad"]
        cs = kj + [0, -DL["shank"][2] / 100 * Ls["shank"], 0]
        cpad = kj + [0, -0.55 * Ls["shank"], 0.04 * H / 1.8]           # ENG: shin guard on the anterior tibia
        c = (m * cs + mp * cpad) / (m + mp)
        I = seg_inertia_local(m, Ls["shank"], DL["shank"][3], "y") + par(m, cs - c) + par(mp, cpad - c) + box_I(mp, 0.12, 0.17, 0.01)
        add("shank_" + s, "shank", m + mp, c, I, joint=kj, parent="thigh_" + s)
        m = mfrac("foot"); mb = E["boot"]
        heelZ = -aHeel; toeZ = fl - aHeel
        cf = aj + [0, -(P["ankleH"] * H) * 0.60, heelZ + DL["foot"][2] / 100 * fl]          # foot COM ~40 % of malleolus height above the plantar surface
        cb = aj + [0, -(P["ankleH"] * H) - sole * 0.55, heelZ + 0.47 * (fl + E["bootToe"] + E["bootHeel"]) - E["bootHeel"]]  # ENG: boot mass mostly in soleplate
        c = (m * cf + mb * cb) / (m + mb)
        If = seg_inertia_local(m, fl, DL["foot"][3], "z")
        bl, bw = fl + E["bootToe"] + E["bootHeel"], P["footBreadth"] * H + E["bootWidthAdd"]
        Ib = box_I(mb, bw, 0.03, bl)
        I = If + par(m, cf - c) + Ib + par(mb, cb - c)
        add("foot_" + s, "foot", m + mb, c, I, joint=aj, parent="shank_" + s,
            extra={"heelZ": heelZ - E["bootHeel"], "toeZ": toeZ + E["bootToe"], "bootLen": bl, "bootW": bw, "heelW": P["heelBreadth"] * H + E["bootWidthAdd"],
                   "mtpZ": P["mtpFromHeel"] * fl - aHeel, "anklePos": aj})
    land = dict(closure_m=closure, yA=yA, yK=yK, yH=yH, yOMPH=yOMPH, yXYPH=yXYPH, ySUPR=ySUPR, yCERV=yCERV, yVERT=yVERT, ySJC=ySJC, hx=hx, sx=sx, sole=sole, footLen=fl, Ls=Ls)
    return B, land

def par(m, d):
    d = np.asarray(d, float); return m * (np.dot(d, d) * np.eye(3) - np.outer(d, d))

def box_I(m, a, b, c):  # full extents along x, y, z
    return np.diag([m / 12 * (b * b + c * c), m / 12 * (a * a + c * c), m / 12 * (a * a + b * b)])

def whole(B):
    M = sum(b["mass"] for b in B); c = sum(b["mass"] * b["com"] for b in B) / M
    I = sum(b["I"] + par(b["mass"], b["com"] - c) for b in B)
    return M, c, I

def leg_about_hip(B, side="R", knee_flex_deg=0.0):
    """moment of inertia of thigh+shank+foot about the hip flexion (X) axis, knee straight or flexed (shank rotated about KJC)."""
    th = [b for b in B if b["name"] == "thigh_" + side][0]; sh = [b for b in B if b["name"] == "shank_" + side][0]; ft = [b for b in B if b["name"] == "foot_" + side][0]
    hj = th["joint"]; kj = sh["joint"]
    a = math.radians(knee_flex_deg); R = np.array([[1, 0, 0], [0, math.cos(a), math.sin(a)], [0, -math.sin(a), math.cos(a)]])   # flex: shank rotates back (+Y toward -Z)
    tot = 0.0
    for b in (th, sh, ft):
        com = b["com"]; I = b["I"]
        if b is not th:
            com = kj + R @ (com - kj); I = R @ I @ R.T
        d = com - hj; tot += I[0, 0] + b["mass"] * (d[1] ** 2 + d[2] ** 2)
    return tot

def arm_about_shoulder(B, side="R"):
    ua = [b for b in B if b["name"] == "upperArm_" + side][0]; fa = [b for b in B if b["name"] == "forearm_" + side][0]
    sj = ua["joint"]; tot = 0.0
    for b in (ua, fa):
        d = b["com"] - sj; tot += b["I"][0, 0] + b["mass"] * (d[1] ** 2 + d[2] ** 2)
    return tot

def single_leg_abduction(B, stance="L"):
    """static frontal-plane hip moment about the stance HJC (upright trunk, swing leg hanging): g * sum m*(x - x_hjc)."""
    hj = [b for b in B if b["name"] == "thigh_" + stance][0]["joint"]
    tot = 0.0
    for b in B:
        if b["name"].endswith("_" + stance) and b["name"].split("_")[0] in ("thigh", "shank", "foot"):
            continue
        tot += b["mass"] * (b["com"][0] - hj[0])
    return abs(tot) * 9.81

# ---------------- V1.1 (frozen) body, reconstructed from pc_body.js rules and ANATOMY_V1_1_REPORT §4 ----------------
def build_v11():
    W, sH = 78.0, 1.9 / H0
    def k(seg, j): return DL[seg][3][j] / 100 * DL[seg][1] / 1000 * sH
    def vertI(seg, m): return np.diag([m * k(seg, 1) ** 2, m * k(seg, 2) ** 2, m * k(seg, 0) ** 2])
    B = []
    def add(n, m, com, I, joint=None): B.append({"name": n, "mass": m, "com": np.array(com, float), "I": I, "joint": None if joint is None else np.array(joint, float)})
    f = lambda s: DL[s][0] / 100 * W
    add("pelvis", f("LPT"), [0, 1.0575, 0], vertI("LPT", f("LPT")), [0, 1.0123, 0])
    add("abdomen", f("MPT"), [0, 1.2569, 0], vertI("MPT", f("MPT")), [0, 1.1288, 0])
    add("thorax", f("UPT"), [0, 1.5521, 0], vertI("UPT", f("UPT")), [0, 1.3618, 0])
    add("head", f("head"), [0, 1.7666, 0], vertI("head", f("head")), [0, 1.6336, 0])
    for s, sg in (("R", 1), ("L", -1)):
        add("upperArm_" + s, f("upperArm"), [sg * 0.2532, 1.3502, 0], vertI("upperArm", f("upperArm")), [sg * 0.245, 1.485, 0])
        mf, mh = f("forearm"), f("hand"); lf = 1.2514 - 0.9485
        cf = -DL["forearm"][2] / 100 * lf; ch = -(lf + DL["hand"][2] / 100 * DL["hand"][1] / 1000 * sH); c = (mf * cf + mh * ch) / (mf + mh)
        If, Ih = vertI("forearm", mf), vertI("hand", mh)
        I = If + Ih + np.diag([mf * (cf - c) ** 2 + mh * (ch - c) ** 2, 0, mf * (cf - c) ** 2 + mh * (ch - c) ** 2])
        add("forearm_" + s, mf + mh, [sg * 0.2583, 1.2514 + c, 0], I, [sg * 0.2583, 1.2514, 0])
        add("thigh_" + s, f("thigh"), [sg * 0.1068, 0.8150, 0], vertI("thigh", f("thigh")), [sg * 0.092, 1.0123, 0])
        add("shank_" + s, f("shank"), [sg * 0.1433, 0.3330, 0], vertI("shank", f("shank")), [sg * 0.128, 0.5301, 0])
        mft = f("foot"); z0, z1 = -0.08113, 0.27645
        Ift = np.diag([mft * k("foot", 1) ** 2, mft * k("foot", 0) ** 2, mft * k("foot", 2) ** 2])
        add("foot_" + s, mft, [sg * 0.1615, 0.045, z0 + DL["foot"][2] / 100 * (z1 - z0)], Ift, [sg * 0.1615, 0.088, 0])
    return B

def table(B, title):
    print(f"\n### {title}")
    print(f"{'body':12s} {'mass':>7s} {'com x':>7s} {'com y':>7s} {'com z':>7s}   Ixx     Iyy     Izz   (kg m^2, about own COM, CCS axes)")
    for b in B:
        I = b["I"]; print(f"{b['name']:12s} {b['mass']:7.3f} {b['com'][0]:7.3f} {b['com'][1]:7.3f} {b['com'][2]:7.3f}  {I[0,0]:.4f}  {I[1,1]:.4f}  {I[2,2]:.4f}")

def summary(B, H, label):
    M, c, I = whole(B)
    ev = np.linalg.eigvalsh(I)
    out = {"label": label, "mass": round(M, 3), "comY": round(c[1], 4), "comY_over_H": round(c[1] / H, 4), "comZ": round(c[2], 4),
           "I_wb_about_COM": {"Ixx_frontal_axis(pitch)": round(I[0, 0], 3), "Iyy_vertical(yaw)": round(I[1, 1], 3), "Izz_AP_axis(roll)": round(I[2, 2], 3)},
           "leg_about_hip_straight": round(leg_about_hip(B), 4), "leg_about_hip_knee90": round(leg_about_hip(B, knee_flex_deg=90), 4),
           "arm_about_shoulder": round(arm_about_shoulder(B), 4), "single_leg_hip_abd_Nm": round(single_leg_abduction(B), 1)}
    return out

if __name__ == "__main__":
    H = float(sys.argv[1]) if len(sys.argv) > 1 else 1.82
    M = float(sys.argv[2]) if len(sys.argv) > 2 else 77.0
    res = {}
    for pose in ("T", "down"):
        B, land = build_v2(H, M, pose)
        if pose == "T": table(B, f"V2 H={H} M={M} (+equipment) T-pose"); L0 = land
        res[f"V2_{H}_{M}_{pose}"] = summary(B, H, f"V2 {H} m {M} kg pose {pose}")
        B2, _ = build_v2(H, M, pose, equip=False)
        res[f"V2_{H}_{M}_{pose}_noequip"] = summary(B2, H, f"V2 {H} m {M} kg pose {pose} no equipment")
        B3, _ = build_v2(1.90, 78.0, pose)
        res[f"V2_1.90_78_{pose}"] = summary(B3, 1.90, f"V2 1.90 m 78 kg pose {pose} (V1-matched instance)")
        B4, _ = build_v2(1.90, 78.0, pose, equip=False)
        res[f"V2_1.90_78_{pose}_noequip"] = summary(B4, 1.90, f"V2 1.90 m 78 kg pose {pose} no equipment")
    V11 = build_v11(); table(V11, "V1.1 (frozen) bind, arms down")
    res["V1.1"] = summary(V11, 1.90, "V1.1 1.90 m 78 kg bind (arms down)")
    Bm, lm = build_v2(1.90, 78.0, "down"); table(Bm, "V2 1.90/78 arms down")
    print("\nlandmarks", {k: (round(v, 4) if not isinstance(v, dict) else {kk: round(vv, 4) for kk, vv in v.items()}) for k, v in L0.items()})
    print(json.dumps(res, indent=1))
    # mass ratio parent/child (solver conditioning)
    B, _ = build_v2(H, M, "T")
    nm = {b["name"]: b for b in B}
    print("\nmass ratios parent/child:")
    for b in B:
        if b["parent"]: print(f"  {b['parent']:10s}/{b['name']:12s} {nm[b['parent']]['mass']/b['mass']:6.2f}   I_min ratio {min(np.diag(nm[b['parent']]['I']))/min(np.diag(b['I'])):7.1f}")
    for b in B:
        if b["name"].startswith("foot_R"):
            print("foot R:", {k: (np.round(v, 4).tolist() if isinstance(v, np.ndarray) else round(v, 4)) for k, v in b.items() if k in ("heelZ", "toeZ", "bootLen", "bootW", "heelW", "mtpZ", "mass", "com")})

# (colliders, joints and actuators are generated by v2_spec.py, which imports this module)
