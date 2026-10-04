// ═══ physchar2/spec/v2_knee.js — CORRECTED KNEE AXIAL MODEL "v2k" (EXPERIMENTAL, default OFF) ═══════════════════════════════════════
// review_artifacts/physical_character_v2/knee_correction/KNEE_PARAMETERIZATION.md (parameters, provenance, status) and KNEE_CORRECTION_PREREG.md.
// Selected by env V2_KNEE_MODEL=v2k (Node) or PassiveLayer option kneeModel: "v2k". Off: the accepted plant, bit for bit (the old knee stays the
// historical comparator).
// Pure functions of ANATOMICAL degrees: φ = knee flexion, θ = tibial axial rotation (+ = internal), zero = the tibia's orientation at full extension.
//   θ0(φ)    passive reference trajectory (zero of the passive law): Walker 1988 average-knee coupling R_I(φ), evidence-calibrated 0–120°, the same
//            polynomial continued beyond (PROVISIONAL) plus a named sensitivity offset deep.delta150·S((φ − 120)/30) (default 0);
//   f(φ)     per-side width factor: [f0 + (1 − f0)·S(φ / rampDeg)] · g(φ), g = 1 − (1 − deep.width150)·S((φ − 125)/25) (deep narrowing PROVISIONAL,
//            default none);
//   law      per side, from θ0: zero torque inside slack·f; A(e^{B(x − s)} − 1) from s to a15·f, reaching τcal = tauCalFracOfCapacity × the opposing
//            actuator capacity at a15·f (the CALIBRATED-RANGE BOUND — the 15 N·m point at 78 kg; a provisional engineering bound, not an anatomical
//            stop); beyond it a linear end-stop whose stiffness makes the total reach endStopFracOfCapacity × capacity endStopDeg beyond the bound.
// Everything is a function of the configuration only, so the passive potential is a scalar U(θ, φ) and the passive layer's −∇U (with respect to
// the joint's full rotation) carries the flexion reaction −∂U/∂φ automatically (approved decision 4: no per-tick rest-angle move).
import { dexp } from "../core/v2_math.js";   // deterministic exp (the passive layer's; cross-engine exact)
export const KNEE_V2K = Object.freeze({
  theta0: Object.freeze({ c1: 0.3695, c2: -2.958e-3, c3: 7.666e-6 }),       // deg; Walker, Rovick & Robertson 1988 (verified vs Rajagopal2016 / LaiUhlrich2022 .osim)
  deep: Object.freeze({ delta150: 0, width150: 1.0 }),                       // > 120°: PROVISIONAL sensitivity parameters (outside the certified envelope)
  IR: Object.freeze({ slack: 1, a15: 14, f0: 1.0 }),                          // deg (per side from θ0) — §3 weighted fit, chosen set
  ER: Object.freeze({ slack: 1, a15: 25, f0: 0.5 }),
  rampDeg: 35,                                                                 // PROVISIONAL shape (15–40°)
  B: 6.0,                                                                      // 1/rad (the V2 law exponent)
  tauCalFracOfCapacity: 0.55,                                                  // τ at the calibrated-range bound = 0.55 × opposing capacity (15.0 N·m at 78 kg)
  endStopDeg: 3, endStopFracOfCapacity: 1.0,                                   // PROVISIONAL engineering end-stop
});
const S = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const merge = (a, b) => { if (!b || typeof b !== "object") return a; const o = { ...a }; for (const k of Object.keys(b)) o[k] = a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]; return o; };
const ENV = typeof process !== "undefined" && process.env ? process.env : {};
// model selection (Node env; browsers: pass PassiveLayer opts.kneeModel)
export const kneeModelEnv = () => (ENV.V2_KNEE_MODEL === "v2k" ? "v2k" : null);
// parameters: the frozen central set, optionally overridden for the PREREGISTERED sensitivity runs only (env V2_KNEE_V2K = partial JSON)
let cached = null;
export function kneeV2KParams(over) {
  if (over) return merge(KNEE_V2K, over);
  if (!cached) cached = ENV.V2_KNEE_V2K ? merge(KNEE_V2K, JSON.parse(ENV.V2_KNEE_V2K)) : KNEE_V2K;
  return cached;
}
export function kneeTheta0(f, P = kneeV2KParams()) { const c = P.theta0; return c.c1 * f + c.c2 * f * f + c.c3 * f * f * f + P.deep.delta150 * S((f - 120) / 30); }
export function kneeWidthFactor(f, side, P = kneeV2KParams()) { const s = P[side], g = 1 - (1 - P.deep.width150) * S((f - 125) / 25); return (s.f0 + (1 - s.f0) * S(f / P.rampDeg)) * g; }
// the envelope in the interface of the diagnostic envelopes (anatomical degrees, [external end, internal end])
export function kneeEnvelopeV2K(f, P = kneeV2KParams()) {
  const t0 = kneeTheta0(f, P), fi = kneeWidthFactor(f, "IR", P), fe = kneeWidthFactor(f, "ER", P);
  return { theta0: t0, fIR: fi, fER: fe, soft: [t0 - P.ER.slack * fe, t0 + P.IR.slack * fi], hard: [t0 - P.ER.a15 * fe, t0 + P.IR.a15 * fi] };
}
// one end of the law (x ≥ 0 = excursion beyond the soft end toward the bound; span = bound − soft > 0; all rad): torque magnitude, energy, stiffness.
// tauCal / cap in N·m. The SAME expression is used by the passive layer (sim/v2_passive.js) and by the independent specification law below.
export function kneeEndTerm(x, span, tauCal, cap, P = kneeV2KParams()) {
  if (x <= 0) return { T: 0, U: 0, k: 0, kS: 0 };
  const B = P.B, d = P.endStopDeg * Math.PI / 180, A = tauCal / (dexp(B * Math.max(1e-4, span)) - 1), kS = Math.max(0, (P.endStopFracOfCapacity * cap - A * (dexp(B * (Math.max(1e-4, span) + d)) - 1)) / d);
  const e = dexp(B * x), y = x - span;
  return { T: A * (e - 1) + (y > 0 ? kS * y : 0), U: A * ((e - 1) / B - x) + (y > 0 ? 0.5 * kS * y * y : 0), k: A * B * e + (y > 0 ? kS : 0), kS };
}
// INDEPENDENT SPECIFICATION LAW (tests; KV1e, the G1 passive rig): anatomical restoring torque (N·m; + = toward internal rotation) and energy (J) at
// flexion f (deg) and axial rotation th (deg), with the opposing capacities capVsInt (resisting an internal excess) / capVsExt (resisting an external one).
export function kneeAxialTorque(f, th, capVsInt, capVsExt, P = kneeV2KParams()) {
  const e = kneeEnvelopeV2K(f, P), r = Math.PI / 180;
  if (th > e.soft[1]) { const t = kneeEndTerm((th - e.soft[1]) * r, (e.hard[1] - e.soft[1]) * r, P.tauCalFracOfCapacity * capVsInt, capVsInt, P); return { tau: -t.T, U: t.U, env: e }; }
  if (th < e.soft[0]) { const t = kneeEndTerm((e.soft[0] - th) * r, (e.soft[0] - e.hard[0]) * r, P.tauCalFracOfCapacity * capVsExt, capVsExt, P); return { tau: t.T, U: t.U, env: e }; }
  return { tau: 0, U: 0, env: e };
}
