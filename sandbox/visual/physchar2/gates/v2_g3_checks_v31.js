// ═══ physchar2/gates/v2_g3_checks_v31.js — G3 criteria v3.1 (g3/G3_CRITERIA_v3.1_ERRATUM.md): v3 with the sigmaErr category error removed from J2a
// gating (kept as a reported diagnostic) and the J2a tolerances re-derived — by v3's unchanged rule max(10 × floor, 100·ε·scale) — from the
// numerical floor of the CORRECTED controller (commit e9bcf96; floor json/g3_mirror_floor.json). J2b keeps D4's 0.1 / 2.0 mm until the user
// approves new numbers. v3's own evaluator and result are unchanged.
import { evaluateV3 } from "./v2_g3_checks_v3.js";
export const J2A_TOL_V31 = { lam: 2.2e-14, copMm: 2.2e-11, share: 1.1e-13, footCopMm: 2.2e-11, forceN: 9.2e-11, g3OutS: 2.2e-14, ikResM: 2.2e-14, cmdTauNm: 1.2e-10, cmdGain: 2.2e-10,
  actTauNm: 1.2e-10, actGain: 2.2e-10, actBoundNm: 3.5e-11, actCapNm: 2.2e-11, activation: 2.8e-13, holdMm: 2.2e-11, holdRad: 7e-14 };
export const evaluateV31 = (R, ext = {}) => evaluateV3(R, ext, { tol: J2A_TOL_V31, label: "G3_CRITERIA_v3.1_ERRATUM.md (v3 with sigmaErr not gated; J2a floor of the corrected controller)" });
