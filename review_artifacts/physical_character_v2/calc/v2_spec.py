#!/usr/bin/env python3
"""Builds PHYSICAL_CHARACTER_V2_SPEC.json and the markdown tables of the V2 design from one source of truth.
Design-time only (not runtime code). Run: python3 v2_spec.py <out_dir>"""
import json, math, sys, os
import numpy as np
from v2_anthro import build_v2, build_v11, whole, leg_about_hip, arm_about_shoulder, single_leg_abduction, DL, PROFILE, EQUIP

REF = (1.82, 78.0)          # V2-REF: professional outfield male (CIES 2022 182.3 cm; WC2018 182.4 cm / 77.2 kg; EPL DXA 182.7 / 78.9)
V1M = (1.90, 78.0)          # V1-matched instance

# ---------------- joints (anatomical sign: flex/abd/IR/DF/inversion/pronation/right-bend/right-rotation positive) -------------
# rom: {motion: (active_lo, active_hi, hard_lo, hard_hi, evidence)}  degrees
JOINTS = [
 dict(name="lumbar", parent="pelvis", child="abdomen", anat="L3-L5 lumbar spine (lumped)", dof=3,
      rom={"flex(+)/ext(-)": (-25, 60, -30, 70, "Troke 2005 young: flex 73 / ext 29 [H]; ENG split of thoracolumbar total"),
           "lat bend R(+)/L(-)": (-25, 25, -30, 30, "Troke 2005: 28 [H]"),
           "axial rot R(+)/L(-)": (-7, 7, -10, 10, "Troke 2005: 7 [H]")},
      centre={"flex": 17.5}, motor="3 axes", cap="trunk"),
 dict(name="thoracic", parent="abdomen", child="thorax", anat="T9-T12 thoracolumbar + thoracic (lumped)", dof=3,
      rom={"flex(+)/ext(-)": (-15, 30, -20, 40, "AAOS thoracolumbar 80 / 25 total (recalled) minus lumbar [ENG]"),
           "lat bend": (-20, 20, -25, 25, "AAOS 35 total (recalled) minus lumbar [ENG]"),
           "axial rot": (-35, 35, -40, 40, "AAOS 45 total (recalled) minus lumbar 7 [ENG]")},
      centre={"flex": 7.5}, motor="3 axes", cap="trunk"),
 dict(name="neck", parent="thorax", child="head", anat="C0-C7 cervical spine (lumped at C7/T1)", dof=3,
      rom={"flex(+)/ext(-)": (-60, 50, -70, 60, "AAOS / Youdas ranges (recalled)"),
           "lat bend": (-40, 40, -45, 45, "recalled"),
           "axial rot": (-70, 70, -80, 80, "recalled; 73 % of it at C1-C2 (Zhou 2020) [H] -> render split")},
      centre={"flex": -5}, motor="3 axes", cap="neck"),
 dict(name="shoulder", parent="thorax", child="upperArm", anat="glenohumeral + shoulder girdle (lumped; centre fixed in thorax)", dof=3,
      rom={"flexion (+)": (0, 170, -5, 180, "Soucie 2011 168.8 passive [H]"),
           "extension (-)": (-55, 0, -65, 0, "AAOS 50-60 (recalled)"),
           "abduction (+)": (0, 170, 0, 180, "AAOS 180 (recalled); scapulohumeral rhythm 1.25-1.7:1 above 30 deg [H]"),
           "horizontal adduction": (0, 130, 0, 140, "recalled"),
           "IR(+)/ER(-)": (-90, 70, -100, 80, "AAOS 70 / 90 (recalled); range varies with elevation")},
      centre={"elevation": 60, "plane_fwd_of_coronal": 30}, motor="3 axes", cap="shoulder"),
 dict(name="elbow", parent="upperArm", child="forearm", anat="humeroulnar flexion + radioulnar pronation/supination", dof=2,
      rom={"flex(+)/hyperext(-)": (0, 145, -5, 150, "Soucie 2011 144.6 / 0.8 [H]"),
           "pron(+)/sup(-)": (-85, 77, -90, 85, "Soucie 2011 pron 76.9 / sup 85.0 [H]")},
      centre={"flex": 70}, motor="2 axes (carrying angle locked)", cap="elbow"),
 dict(name="hip", parent="pelvis", child="thigh", anat="hip (femoral head)", dof=3,
      rom={"flex(+)/ext(-)": (-15, 120, -25, 140, "Soucie 2011 flex 130.4 (p95 142) / ext 17.4 passive; Roaas ext 9.4 prone [H]"),
           "abd(+)/add(-)": (-25, 40, -35, 50, "Roaas 1982 38.8 / 30.5 passive; AAOS 48 / 31 [H]"),
           "IR(+)/ER(-)": (-40, 30, -50, 45, "pro soccer IR 28.9, total 65.6 (Tak 2016); sitting active 44 / 44 [H]")},
      centre={"flex": 52.5, "abd": 7.5, "rot": -5}, motor="3 axes", cap="hip",
      pose="hamstrings: straight-leg hip flexion ~70-90 deg (passive torque grows with knee extension) [recalled]; rotation range changes with flexion (Han 2015, Simoneau 1998) [H]"),
 dict(name="knee", parent="thigh", child="shank", anat="tibiofemoral flexion + tibial axial rotation", dof=2,
      rom={"flex(+)/hyperext(-)": (0, 140, -5, 155, "Soucie 2011 137.7, hyperext 1.2 +/- 2.1 (p95 6); loaded deep squat 157 (Hemmerich 2006) [H]"),
           "tibial IR(+)/ER(-)": (-30, 20, -40, 30, "~0 at full extension, tens of degrees at 90 deg flexion (recalled)")},
      centre={"flex": 70}, motor="2 axes (varus/valgus locked)", cap="knee",
      pose="axial rotation stiffened near extension (screw-home) by passive torque [ENG]"),
 dict(name="ankle", parent="shank", child="foot", anat="talocrural + subtalar (orthogonal approximation)", dof=3,
      rom={"DF(+)/PF(-)": (-50, 20, -60, 45, "Soucie 2011 DF 12.7 (knee ext, NWB) / PF 54.6; knee-bent DF 40.5 (Cho 2016); WB lunge 38.8-43.2 [H]"),
           "inv(+)/ev(-)": (-20, 25, -30, 35, "Roaas 1982 whole foot 27.7 / 27.6 passive; AAOS 35 / 15 (recalled)"),
           "foot abd/add (passive)": (-10, 10, -15, 15, "forefoot ab/adduction ~10-20 (recalled) [ENG passive-only]")},
      centre={"df": -12.5, "inv": 2.5}, motor="2 axes (DF/PF, inv/ev) + 1 passive", cap="ankle",
      pose="dorsiflexion limit grows with knee flexion (gastrocnemius): ~20 knee straight -> ~40 knee bent [H]"),
]

# ---------------- actuators: T_iso = isometric capacity at the optimum angle (N.m/kg); T_dyn = verified athletic net-moment peak ----
# w0: zero-torque joint velocity (rad/s); k: joint-level Hill curvature; e: eccentric plateau / T_iso
ACT = [
 ("hip", "flexion", 2.70, "Anderson & Madigan 2014 2.67; Anderson 2007 1.94 (young males)", 4.30, "sprint initial swing (Schache 2011); kicks 194-309 N.m (Kellis & Katis 2007)", 18, 0.45, 1.25),
 ("hip", "extension", 3.60, "Anderson 2007 2.76 @53 deg flex; Anderson & Madigan 2014 4.51 @68 deg", 4.18, "sprint terminal swing (Schache 2011)", 18, 0.45, 1.25),
 ("hip", "abduction", 2.35, "Thorborg 2011 elite 2.25-2.35", 3.29, "sprint stance (Schache 2011); eccentric 2.6 (Mosler 2017)", 15, 0.45, 1.25),
 ("hip", "adduction", 2.45, "Thorborg 2011 elite 2.37-2.45", 3.00, "eccentric 3.0 (Mosler 2017); kick ~115 N.m", 15, 0.45, 1.25),
 ("hip", "internal rot.", 1.20, "~1.2 at 90 deg flex (protocol-dependent x2)", None, "", 15, 0.45, 1.25),
 ("hip", "external rot.", 1.00, "0.42-1.0 (protocol-dependent)", 0.75, "side-foot kick 56 N.m (Nunome 2002)", 15, 0.45, 1.25),
 ("knee", "extension", 3.60, "soccer 60 deg/s concentric 3.1-3.4 (Fousekis 2010) / f(60 deg/s)=0.85; Sarabon 2021 3.19", 3.60, "sprint midstance 3.55 (Schache 2011); deceleration 3.58 (Harper 2022)", 20, 0.45, 1.25),
 ("knee", "flexion", 2.10, "soccer 60 deg/s 1.7-1.9 (Fousekis 2010), 1.66-2.11 (Sliwowski 2017)", 1.76, "sprint terminal swing, eccentric (Schache 2011)", 26, 0.45, 1.35),
 ("knee", "tibial IR / ER", 0.35, "recalled (~25-30 N.m)", None, "", 15, 0.45, 1.25),
 ("ankle", "plantarflexion", 2.60, "Anderson & Madigan 2014 2.64; Billot 2022 150 N.m (knee 60 deg)", 4.00, "sprint midstance (Schache 2011), with tendon recoil", 15, 0.45, 1.30),
 ("ankle", "dorsiflexion", 0.60, "Billot 2022 net ~45 N.m; Fousekis ecc 48-52", None, "", 17, 0.45, 1.20),
 ("ankle", "inversion", 0.50, "Maciel 2022 34.8 N.m at 30 deg/s (mixed sex, 38 y) -> athlete ENG", None, "", 12, 0.45, 1.20),
 ("ankle", "eversion", 0.45, "Maciel 2022 29.9 N.m", None, "", 12, 0.45, 1.20),
 ("trunk (lumbar = thoracic, in series)", "flexion", 2.00, "Pan 2025 iso 1.15 (non-athletes); athletes isokinetic 211-297 N.m (Zouita 2020)", None, "", 15, 0.45, 1.25),
 ("trunk", "extension", 3.00, "Pan 2025 iso 1.74; athletes isokinetic 345-440 N.m (Zouita 2020)", None, "", 15, 0.45, 1.25),
 ("trunk", "lateral bend", 1.50, "Pan 2025 0.91-0.95", None, "", 15, 0.45, 1.25),
 ("trunk", "axial rotation", 0.90, "Pan 2025 0.64-0.74", None, "", 15, 0.45, 1.25),
 ("neck", "extension", 0.69, "Vasavada 2001 52 N.m", None, "", 12, 0.45, 1.25),
 ("neck", "flexion", 0.40, "Vasavada 2001 30 N.m", None, "", 12, 0.45, 1.25),
 ("neck", "lateral bend", 0.48, "Vasavada 2001 36 N.m", None, "", 12, 0.45, 1.25),
 ("neck", "axial rotation", 0.20, "Vasavada 2001 15 N.m", None, "", 12, 0.45, 1.25),
 ("shoulder", "flexion", 0.95, "recalled 60-80 N.m", None, "", 15, 0.45, 1.25),
 ("shoulder", "extension", 1.15, "recalled 70-100 N.m; ext:flex 5:4 (Ivey 1985)", None, "", 15, 0.45, 1.25),
 ("shoulder", "abduction", 0.85, "recalled 50-75 N.m", None, "", 15, 0.45, 1.25),
 ("shoulder", "adduction", 1.40, "add:abd ~2:1 (Holzbaur 2007); 67.9 mixed-sex", None, "", 15, 0.45, 1.25),
 ("shoulder", "internal rot.", 0.70, "recalled 40-60; IR:ER 3:2 (Ivey 1985)", None, "", 15, 0.45, 1.25),
 ("shoulder", "external rot.", 0.47, "recalled 30-45", None, "", 15, 0.45, 1.25),
 ("elbow", "flexion", 0.98, "Kotte 2018 76.7 N.m", None, "", 18, 0.45, 1.25),
 ("elbow", "extension", 0.62, "Kotte 2018 48.2 N.m", None, "", 18, 0.45, 1.25),
 ("elbow", "pronation / supination", 0.13, "Kotte 2018 10.0 / 10.7 N.m", None, "", 18, 0.45, 1.25),
]
V1CAP = {("hip", "flexion"): 170, ("hip", "extension"): 230, ("hip", "abduction"): 140, ("hip", "adduction"): 140, ("hip", "internal rot."): 60, ("hip", "external rot."): 60,
         ("knee", "extension"): 250, ("knee", "flexion"): 130, ("ankle", "plantarflexion"): 150, ("ankle", "dorsiflexion"): 45, ("ankle", "inversion"): 35, ("ankle", "eversion"): 35,
         ("trunk (lumbar = thoracic, in series)", "flexion"): 180, ("trunk", "extension"): 250, ("trunk", "lateral bend"): 150, ("trunk", "axial rotation"): 80,
         ("neck", "extension"): 45, ("neck", "flexion"): 25, ("neck", "lateral bend"): 30, ("neck", "axial rotation"): 20,
         ("shoulder", "flexion"): 70, ("shoulder", "extension"): 80, ("shoulder", "abduction"): 60, ("shoulder", "adduction"): 60, ("shoulder", "internal rot."): 45, ("shoulder", "external rot."): 45,
         ("elbow", "flexion"): 60, ("elbow", "extension"): 50}

def hill(w, w0, k):
    w = max(0.0, w); return max(0.0, (1 - w / w0) / (1 + w / (k * w0)))

def skeleton(H, M):
    B, L = build_v2(H, M, "T"); s = EQUIP["soleStack"]
    ap = {k: v * H for k, v in PROFILE["spineAP"].items()}
    fl = L["footLen"]; aH = PROFILE["ankleFromHeel"] * fl
    mtpZ = (0.741 - 0.22) * fl; mtp5 = (0.63 - 0.22) * fl
    ua, fa = L["Ls"]["upperArm"], L["Ls"]["forearm"]
    sk = [("root", None, (0, 0, 0)), ("hips", "root", (0, L["yH"], 0)), ("spine_01", "hips", (0, L["yOMPH"], ap["lumbar"])),
          ("spine_02", "spine_01", (0, L["yXYPH"], ap["thoracolumbar"])), ("spine_03", "spine_02", (0, (L["yXYPH"] + L["yCERV"]) / 2, ap["thoracolumbar"])),
          ("neck", "spine_03", (0, L["yCERV"], ap["cervical"])), ("head", "neck", (0, 0.924 * H + s, -0.0055 * H))]
    for side, g in (("L", -1), ("R", 1)):
        sx = L["sx"]
        sk += [(f"clavicle_{side}", "spine_03", (g * 0.011 * H, L["ySUPR"], 0.047 * H)), (f"upperArm_{side}", f"clavicle_{side}", (g * sx, L["ySJC"], 0)),
               (f"upperArm_twist_{side}", f"upperArm_{side}", (g * (sx + 0.5 * ua), L["ySJC"], 0)), (f"lowerArm_{side}", f"upperArm_{side}", (g * (sx + ua), L["ySJC"], 0)),
               (f"forearm_twist_{side}", f"lowerArm_{side}", (g * (sx + ua + 0.6 * fa), L["ySJC"], 0)), (f"hand_{side}", f"lowerArm_{side}", (g * (sx + ua + fa), L["ySJC"], 0))]
    for side, g in (("L", -1), ("R", 1)):
        hx = L["hx"]
        sk += [(f"upperLeg_{side}", "hips", (g * hx, L["yH"], 0)), (f"thigh_twist_{side}", f"upperLeg_{side}", (g * hx, (L["yH"] + L["yK"]) / 2, 0)),
               (f"lowerLeg_{side}", f"upperLeg_{side}", (g * hx, L["yK"], 0)), (f"calf_twist_{side}", f"lowerLeg_{side}", (g * hx, (L["yK"] + L["yA"]) / 2, 0)),
               (f"foot_{side}", f"lowerLeg_{side}", (g * hx, L["yA"], 0)), (f"toe_{side}", f"foot_{side}", (g * hx, s + 0.065 * fl, (mtpZ + mtp5) / 2))]
    return sk

def colliders(H, M):
    B, L = build_v2(H, M, "T"); Ls = L["Ls"]
    def frustum(m, Lg, rho, k):
        V = m / rho; r2 = math.sqrt(3 * V / (math.pi * Lg * (k * k + k + 1))); return k * r2 - 0.003, r2 - 0.003
    sh = frustum(DL["shank"][0] / 100 * M, Ls["shank"], 1090, 1.45); ua = frustum(DL["upperArm"][0] / 100 * M, Ls["upperArm"], 1070, 1.15)
    fa = frustum(DL["forearm"][0] / 100 * M, Ls["forearm"], 1130, 1.45)
    fl = L["footLen"]; E = EQUIP
    return {
      "pelvis":  {"shape": "roundedBox", "size_m": [0.190 * H, L["yOMPH"] - (L["yH"] - 0.07), 0.125 * H], "convexRadius": 0.03, "centre": [0, (L["yOMPH"] + L["yH"] - 0.07) / 2, -0.010],
                  "evidence": "hip breadth 0.19-0.197 H (Drillis / ANSUR II); depth 0.125 H; extends 7 cm below the HJC (gluteal)"},
      "abdomen": {"shape": "roundedBox", "size_m": [0.155 * H, L["yXYPH"] - L["yOMPH"], 0.119 * H], "convexRadius": 0.03, "centre": [0, (L["yXYPH"] + L["yOMPH"]) / 2, 0],
                  "evidence": "waist depth 0.119 H (ANSUR II footballer-sized subset 215 mm); breadth ENG 0.155 H (arm clearance at 6 deg abduction)"},
      "thorax":  {"shape": "roundedBox + girdle capsule", "size_m": [0.165 * H, L["ySUPR"] - L["yXYPH"], 0.131 * H], "convexRadius": 0.03, "centre": [0, (L["ySUPR"] + L["yXYPH"]) / 2, 0],
                  "girdleCapsule": {"r": 0.033 * H, "axis": "ML", "halfLength": 0.0715 * H, "centre": [0, L["ySJC"] + 0.028, -0.02]},
                  "evidence": "chest depth 0.131 H (ANSUR subset 237 mm); breadth 0.165 H (< Drillis external chest 0.174 H)"},
      "head":    {"shape": "sphere + neck capsule", "sphere_r": 0.0525 * H, "sphere_centre": [0, H + E["soleStack"] - 0.0575 * H, 0.0055 * H], "neck_r": 0.030 * H,
                  "evidence": "head length 0.114 H, breadth 0.088 H (ANSUR II) -> sphere diameter 0.105 H between them"},
      "upperArm": {"shape": "deltoid sphere + taperedCapsule", "deltoid_r": 0.030 * H, "deltoid_offset_lateral": 0.0066 * H, "r_prox": ua[0], "r_dist": ua[1],
                   "evidence": "bideltoid 0.291 H (ANSUR II) reproduced; capsule volume-matched (de Leva mass / Dempster density 1070)"},
      "forearm": {"shape": "taperedCapsule + hand capsule", "r_prox": fa[0], "r_dist": fa[1], "hand_r": 0.0135 * H, "hand_len": Ls["hand"] + 0.02,
                  "evidence": "volume-matched (density 1130); hand capsule on the forearm body (core)"},
      "thigh":   {"shape": "taperedCapsule", "r_prox": 0.048 * H, "r_dist": 0.034 * H, "axis": "from 0.02 m lateral / 0.05 m below the HJC to 0.02 m above the KJC",
                  "evidence": "girth-based (proximal thigh circumference ~0.30 H); a volume match gives ~0.10 m and overlaps the opposite thigh"},
      "shank":   {"shape": "taperedCapsule", "r_prox": sh[0], "r_dist": sh[1], "axis": "KJC-0.03 to AJC+0.06, 0.01 m posterior (calf)", "evidence": "volume-matched (density 1090)"},
      "foot":    {"shape": "convexHull (boot)", "boot_len": fl + E["bootToe"] + E["bootHeel"], "ball_w": PROFILE["footBreadth"] * H + E["bootWidthAdd"],
                  "heel_w": PROFILE["heelBreadth"] * H + E["bootWidthAdd"], "heel_behind_AJC": PROFILE["ankleFromHeel"] * fl + E["bootHeel"],
                  "tip_ahead_AJC": (1 - PROFILE["ankleFromHeel"]) * fl + E["bootToe"], "mtp1_ahead_AJC": (0.741 - 0.22) * fl, "mtp5_ahead_AJC": (0.63 - 0.22) * fl,
                  "toeSpring": 0.012, "upper_heights": {"heelCounter": 0.065, "instep": 0.075, "toeBox": 0.045}, "convexRadius": 0.005},
    }

def spec(H, M):
    B, L = build_v2(H, M, "T"); Bd, _ = build_v2(H, M, "down"); Bn, _ = build_v2(H, M, "down", equip=False)
    bodies = []
    for b in B:
        jl = b["joint"] if b["joint"] is not None else np.array([0, L["yH"], 0.0])
        bodies.append({"name": b["name"], "parent": b["parent"], "mass": round(b["mass"], 4), "com_ccs": [round(x, 4) for x in b["com"]],
                       "com_from_joint": [round(x, 4) for x in (b["com"] - jl)], "inertia_about_com_ccs": [[round(x, 5) for x in r] for r in b["I"]],
                       "joint_ccs": [round(x, 4) for x in jl]})
    Mw, c, I = whole(Bn)
    return {"H": H, "M": M, "landmarks": {k: (round(v, 4) if not isinstance(v, dict) else {kk: round(vv, 4) for kk, vv in v.items()}) for k, v in L.items()},
            "bodies": bodies, "skeleton": [{"bone": n, "parent": p, "pos_ccs": [round(x, 4) for x in pos]} for n, p, pos in skeleton(H, M)],
            "colliders": colliders(H, M),
            "whole_body_arms_down_no_equipment": {"mass": round(Mw, 3), "com_y": round(c[1], 4), "com_y_barefoot_over_H": round((c[1] - EQUIP["soleStack"]) / H, 4),
                                                  "I_pitch": round(I[0, 0], 3), "I_yaw": round(I[1, 1], 3), "I_roll": round(I[2, 2], 3)},
            "actuators": [{"joint": a[0], "direction": a[1], "T_iso_Nm_per_kg": a[2], "T_iso_Nm": round(a[2] * M, 1), "iso_evidence": a[3],
                           "T_dyn_peak_Nm_per_kg": a[4], "dyn_evidence": a[5], "w0_rad_s": a[6], "k": a[7], "eccentric": a[8]} for a in ACT],
            }

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    doc = {"title": "Touchline Physical Character V2 specification (design, not runtime)", "coordinate": "CCS +X anatomical right, +Y up, +Z forward (left-handed, Unity numeric); metres, kg, s, rad",
           "profile": PROFILE, "equipment": EQUIP, "deLeva_male": {k: {"mass_pct": v[0], "L_mm": v[1], "com_pct": v[2], "r_pct_AP_ML_long": v[3]} for k, v in DL.items()},
           "joints": JOINTS, "V2_REF": spec(*REF), "V1_matched": spec(*V1M),
           "V1_1_reference": {"note": "frozen V1.1 body reconstructed from pc_body.js rules", "bodies": [{"name": b["name"], "mass": round(b["mass"], 3), "com": [round(x, 4) for x in b["com"]]} for b in build_v11()]}}
    json.dump(doc, open(os.path.join(out, "PHYSICAL_CHARACTER_V2_SPEC.json"), "w"), indent=1, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o))
    # ---- markdown tables ----
    md = []
    S = doc["V2_REF"]; H, M = REF
    md.append("### BODY TABLE (V2-REF)\n| body | mass kg | COM from parent joint (m) | Ixx / Iyy / Izz about COM (kg·m²) |\n|---|---|---|---|")
    for b in S["bodies"]:
        I = b["inertia_about_com_ccs"]; md.append(f"| {b['name']} | {b['mass']:.3f} | ({b['com_from_joint'][0]:+.3f}, {b['com_from_joint'][1]:+.3f}, {b['com_from_joint'][2]:+.3f}) | {I[0][0]:.4f} / {I[1][1]:.4f} / {I[2][2]:.4f} |")
    md.append("\n### SKELETON\n| bone | pos |\n|---|---|")
    for s in S["skeleton"]: md.append(f"| {s['bone']} | ({s['pos_ccs'][0]:+.3f}, {s['pos_ccs'][1]:.3f}, {s['pos_ccs'][2]:+.3f}) |")
    md.append("\n### ACTUATORS\n| joint | direction | T_iso N·m/kg | T_iso N·m (78 kg) | V1 cap N·m | T_dyn peak N·m/kg | f(ω) at 3 / 6 / 10 rad/s | evidence (iso; dynamic) |\n|---|---|---|---|---|---|---|---|")
    for a in ACT:
        fw = " / ".join(f"{hill(w, a[6], a[7]):.2f}" for w in (3, 6, 10))
        v1 = V1CAP.get((a[0], a[1]), "—")
        md.append(f"| {a[0]} | {a[1]} | {a[2]:.2f} | {a[2]*M:.0f} | {v1} | {a[4] if a[4] else '—'} | {fw} | {a[3]}; {a[5] or '—'} |")
    md.append("\n### COLLIDERS\n" + json.dumps(S["colliders"], indent=1, default=float))
    md.append("\n### WHOLE BODY\n" + json.dumps({"REF": S["whole_body_arms_down_no_equipment"], "V1M": doc["V1_matched"]["whole_body_arms_down_no_equipment"]}, indent=1))
    open(os.path.join(out, "tables.md"), "w").write("\n".join(md))
    print("\n".join(md))
