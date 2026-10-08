// SLP-1 GAIT-TIMING INPUTS (frozen with the preregistration). Architecture / physics stress-test inputs ONLY: NOT production locomotion parameters and NOT gait validation
// (user Amendment 1, sources/2026-10-08_user_approval_slp1_with_amendments.md). Evidence-based locomotion design belongs to LOC-1.
//   stepHz     steps per second (cadence / 60); step length = v / stepHz
//   contactS   ground-contact (stance) time of one foot per stride
//   apexM      swing-foot apex height above the higher of liftoff / touchdown foot heights (one stepSegment apex knot at T_swing / 2)
//   rampS      prescribed-trajectory acceleration time from rest (min-jerk speed ramp; peak acceleration 1.875·v / rampS)
export const GAIT = {
  walk: { v: 1.2, stepHz: 1.8113, contactS: 0.7082, apexM: 0.03, rampS: 1.0,
    provenance: "RESEARCH-DERIVED (sources/2026-10-08_cf6_human_walking_calibration_pack.md): linear interpolation at 1.2 m/s between the pack's 1.11760 and 1.34112 m/s rows — cadence 105.8 / 113.6 steps/min (C M) → 108.68 steps/min = 1.8113 Hz (step 0.6625 m = v / f; pack C D kinematic step 0.6613 m); combined double support 28.8 / 27.4 % (H F/D) → 28.28 % → contact = stride × (50 % + DS / 2) = 1.1042 s × 64.14 % = 0.7082 s. Apex 0.03 m = Touchline E2 apex decision (sources/2026-10-06_user_decision_e2_apex30.md). Ramp 1.0 s: provisional." },
  jog: { v: 3.0, stepHz: 2.8, contactS: 0.26, apexM: 0.10, rampS: 1.5,
    provenance: "PROVISIONAL DIAGNOSTIC (Amendment 1): plausible-magnitude stress-test values from general running-biomechanics knowledge, NOT literature-verified in this session (web search budget exhausted; Dorn, Schache & Pandy 2012 J Exp Biol 215:1944 Table 2 fetched but its values are image-only). 168 steps/min, step 1.071 m, contact 0.26 s (duty factor 0.36), apex 0.10 m, ramp 1.5 s." },
  run: { v: 6.0, stepHz: 3.2, contactS: 0.15, apexM: 0.18, rampS: 3.0,
    provenance: "PROVISIONAL DIAGNOSTIC (Amendment 1): as jog. 192 steps/min, step 1.875 m, contact 0.15 s (duty factor 0.24, flight ≈ 0.16 s per step), apex 0.18 m, ramp 3.0 s." },
};
