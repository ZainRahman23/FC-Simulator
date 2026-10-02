// ═══ physchar2/spec/v2_actuators.js — the finite actuator CAPACITY model: data + pure functions (V2-G0) ═══════════════════════════════
// Spec §14 (approved, D10: athlete evidence with provenance; never run continuously at maximum voluntary torque; velocity-dependent
// capability and activation behaviour retained). G0 builds and validates the tables and units only — NO controller uses them yet.
//   τ_cap,d(t) = s_strength · T_iso,d · g_θ(θ) · f_ω(ω) · a_d(t) · (1 − φ_fatigue) · c_injury
// T_iso: isometric capacity at the optimum angle (N·m per kg body mass) — the dynamometer-anchored floor. T_dyn: verified athletic
// net-moment peaks (inverse dynamics) — the calibration target of the pre-running capacity gate (dynamic enhancement OFF until then).
import { dcos, dexp } from "../core/v2_math.js";

const A = (dir, Tiso, iso, Tdyn, dyn, w0, k, e) => ({ dir, Tiso, iso, Tdyn, dyn, w0, k, e });
export const CAPACITY = {
  hip: { flex: [A("flexion", 2.70, "Anderson & Madigan 2014 2.67; Anderson 2007 1.94 (young males) [H]", 4.30, "sprint initial swing (Schache 2011); kicks 194–309 N·m (Kellis & Katis 2007) [H]", 18, 0.45, 1.25),
                A("extension", 3.60, "Anderson 2007 2.76 @53°; Anderson & Madigan 2014 4.51 @68° [H]", 4.18, "sprint terminal swing (Schache 2011) [H]", 18, 0.45, 1.25)],
         abd: [A("abduction", 2.35, "Thorborg 2011 elite 2.25–2.35 [H]", 3.29, "sprint stance (Schache 2011); eccentric 2.6 (Mosler 2017) [H]", 15, 0.45, 1.25),
               A("adduction", 2.45, "Thorborg 2011 elite 2.37–2.45 [H]", 3.00, "eccentric 3.0 (Mosler 2017) [H]", 15, 0.45, 1.25)],
         rot: [A("internal rotation", 1.20, "≈1.2 at 90° flexion, protocol-dependent ×2 [H]", null, "", 15, 0.45, 1.25),
               A("external rotation", 1.00, "0.42–1.0, protocol-dependent [H]", 0.75, "side-foot kick 56 N·m (Nunome 2002) [H]", 15, 0.45, 1.25)] },
  knee: { flex: [A("flexion", 2.10, "Fousekis 2010 60°/s 1.7–1.9; Śliwowski 2017 1.66–2.11 [H]", 1.76, "sprint terminal swing, eccentric (Schache 2011) [H]", 26, 0.45, 1.35),
                 A("extension", 3.60, "Fousekis 2010 60°/s concentric 3.1–3.4 → isometric via f(60°/s); Šarabon 2021 3.19 [H]", 3.60, "sprint midstance 3.55 (Schache 2011); deceleration 3.58 (Harper 2022) [H]", 20, 0.45, 1.25)],
          rot: [A("tibial internal rotation", 0.35, "recalled ≈25–30 N·m [R]", null, "", 15, 0.45, 1.25), A("tibial external rotation", 0.35, "recalled [R]", null, "", 15, 0.45, 1.25)] },
  ankle: { df: [A("dorsiflexion", 0.60, "Billot 2022 net ≈45 N·m [H]", null, "", 17, 0.45, 1.20),
                A("plantarflexion", 2.60, "Anderson & Madigan 2014 2.64; Billot 2022 150 N·m (knee 60°) [H]", 4.00, "sprint midstance with tendon recoil (Schache 2011) [H]", 15, 0.45, 1.30)],
           inv: [A("inversion", 0.50, "Maciel 2022 34.8 N·m (mixed sex, 38 y) → athlete [H]+[ENG]", null, "", 12, 0.45, 1.20), A("eversion", 0.45, "Maciel 2022 29.9 N·m [H]+[ENG]", null, "", 12, 0.45, 1.20)] },
  trunk: { flex: [A("flexion", 2.00, "Pan 2025 isometric 1.15 (non-athletes); athletes isokinetic 211–297 N·m (Zouita 2020) [H]→[ENG] pick", null, "", 15, 0.45, 1.25),
                  A("extension", 3.00, "Pan 2025 isometric 1.74; athletes isokinetic 345–440 N·m (Zouita 2020) [H]→[ENG] pick", null, "", 15, 0.45, 1.25)],
           lat: [A("right lateral bend", 1.50, "Pan 2025 0.91–0.95 [H]→[ENG]", null, "", 15, 0.45, 1.25), A("left lateral bend", 1.50, "Pan 2025 [H]→[ENG]", null, "", 15, 0.45, 1.25)],
           rot: [A("right axial rotation", 0.90, "Pan 2025 0.64–0.74 [H]→[ENG]", null, "", 15, 0.45, 1.25), A("left axial rotation", 0.90, "Pan 2025 [H]→[ENG]", null, "", 15, 0.45, 1.25)] },
  neck: { flex: [A("flexion", 0.40, "Vasavada 2001 30 N·m [H]", null, "", 12, 0.45, 1.25), A("extension", 0.69, "Vasavada 2001 52 N·m [H]", null, "", 12, 0.45, 1.25)],
          lat: [A("right lateral bend", 0.48, "Vasavada 2001 36 N·m [H]", null, "", 12, 0.45, 1.25), A("left lateral bend", 0.48, "Vasavada 2001 [H]", null, "", 12, 0.45, 1.25)],
          rot: [A("right axial rotation", 0.20, "Vasavada 2001 15 N·m [H]", null, "", 12, 0.45, 1.25), A("left axial rotation", 0.20, "Vasavada 2001 [H]", null, "", 12, 0.45, 1.25)] },
  shoulder: { flex: [A("flexion", 0.95, "recalled 60–80 N·m [R]", null, "", 15, 0.45, 1.25), A("extension", 1.15, "recalled 70–100 N·m; ext:flex 5:4 (Ivey 1985) [R]+[H]", null, "", 15, 0.45, 1.25)],
              abd: [A("abduction", 0.85, "recalled 50–75 N·m [R]", null, "", 15, 0.45, 1.25), A("adduction", 1.40, "add:abd ≈ 2:1 (Holzbaur 2007) [H]", null, "", 15, 0.45, 1.25)],
              rot: [A("internal rotation", 0.70, "recalled 40–60; IR:ER 3:2 (Ivey 1985) [R]+[H]", null, "", 15, 0.45, 1.25), A("external rotation", 0.47, "recalled 30–45 [R]", null, "", 15, 0.45, 1.25)] },
  elbow: { flex: [A("flexion", 0.98, "Kotte 2018 76.7 N·m [H]", null, "", 18, 0.45, 1.25), A("extension", 0.62, "Kotte 2018 48.2 N·m [H]", null, "", 18, 0.45, 1.25)],
           pron: [A("pronation", 0.13, "Kotte 2018 10.0 N·m [H]", null, "", 18, 0.45, 1.25), A("supination", 0.14, "Kotte 2018 10.7 N·m [H]", null, "", 18, 0.45, 1.25)] },
};
// positive anatomical motion first, negative second, per axis key — the same order as v2_joints.js axes (pos, neg)
export const CAP_OF_JOINT = { lumbar: "trunk", thoracic: "trunk", neck: "neck", shoulder: "shoulder", elbow: "elbow", hip: "hip", knee: "knee", ankle: "ankle" };
// Anderson et al. 2007 young-male torque–angle coefficients (angles positive in flexion / dorsiflexion, 0 = anatomical position) [H]
export const ANDERSON_2007 = { HE: { C2: 0.958, C3: 0.932 }, HF: { C2: 0.738, C3: -0.214 }, KE: { C2: 1.258, C3: 1.133 }, KF: { C2: 0.869, C3: 0.522 },
  PF: { C2: 1.391, C3: 0.408 }, DF: { C2: 1.510, C3: -0.187 } };
export const ACTIVATION = { tauAct: 0.015, tauDeact: 0.050, source: "Thelen 2003 [H]" };
export const FATIGUE = { model: "three-compartment (Xia & Frey Law 2008), OFF until a fatigue gate", L: 10,
  FR: { ankle: [0.00589, 0.00058], knee: [0.01500, 0.00149], trunk: [0.00755, 0.00075], shoulder: [0.01820, 0.00168], elbow: [0.00912, 0.00094], hand: [0.00980, 0.00064], general: [0.00970, 0.00091] },
  source: "Frey-Law, Looft & Heitsman 2012 [H]" };

// concentric / eccentric joint-level torque–velocity. w = joint angular velocity IN the torque's direction (rad/s): w > 0 concentric.
export function fOmega(cap, w) {
  if (w >= 0) return Math.max(0, (1 - w / cap.w0) / (1 + w / (cap.k * cap.w0)));
  return 1 + (cap.e - 1) * Math.min(1, -w / (0.1 * cap.w0));
}
export const gTheta = (coef, theta) => { if (!coef) return 1; const v = dcos(coef.C2 * (theta - coef.C3)); return Math.max(0, v); };
// activation first-order step (exact exponential; deterministic dexp)
export function activationStep(a, u, dt) { const tau = u > a ? ACTIVATION.tauAct : ACTIVATION.tauDeact; return u + (a - u) * dexp(-dt / tau); }
// instantaneous capacity (N·m) of one axis / direction
export function capacity(cap, M, w, opt = {}) {
  const s = opt.strength ?? 1, a = opt.activation ?? 1, phi = opt.fatigue ?? 0, c = opt.injury ?? 1, g = opt.gTheta ?? 1;
  return s * cap.Tiso * M * g * fOmega(cap, w) * a * (1 - phi) * c;
}
// per joint and constraint axis: the isometric capacity (N·m) for motion in the +param and −param direction (structural motor limits)
export function jointAxisCapacities(joint, M) {
  const fam = CAP_OF_JOINT[joint.name.replace(/_[LR]$/, "")], C = CAPACITY[fam], out = {};
  for (const k of ["x", "y", "z"]) { const ax = joint.def.axes[k]; if (!ax || ax.locked || ax.passiveOnly) { out[k] = null; continue; }
    const row = C[ax.key]; if (!row) { out[k] = null; continue; }
    const capPos = row[0], capNeg = row[1];                                  // positive anatomical motion, negative anatomical motion
    const plus = ax.s > 0 ? capPos : capNeg, minus = ax.s > 0 ? capNeg : capPos;   // param + direction = s · anatomical
    out[k] = { plus: { dir: plus.dir, Nm: plus.Tiso * M, cap: plus }, minus: { dir: minus.dir, Nm: minus.Tiso * M, cap: minus } };
  }
  return out;
}
