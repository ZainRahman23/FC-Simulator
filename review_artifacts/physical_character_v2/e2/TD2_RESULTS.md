# TD2 touchdown coordinator: DOES NOT VALIDATE as preregistered. Clean inside its certified window; fails on the uncertified-early condition, on the escalation continuation and on rate stability of touchdown time → STOPPED

**Authority:** `../sources/2026-10-07_user_decision_overnight_runway_coordinator.md`.

**Design study:** `TD2_DESIGN_STUDY.md`.

**Preregistration:** `TD2_PREREG.md`:
- design and criteria committed in d14d34f, before any TD2 code;
- freeze in 5015dc6 with amendments A1 – A5, before any battery run.

A3 recorded, before the battery, the prediction that the early condition fails.

**Battery:** `scripts/run_td2_val.sh` on a clean archive of 5015dc6. 1,824 / 1,824 runs (03:34 – 04:29).

**Evidence** (`evidence_td2/`):
- `td2_eval_summary.txt`, `td2_eval.json.gz`;
- `logs/run_logs.tgz`;
- `records_240_REF_198/`;
- `diagnostics/` (post-hoc, labelled).

**Stop rule applied:**
- no swing-servo re-qualification;
- no PG-1;
- no other prerequisite gate;
- no official E2.

1A / 1B stay unadopted. Every threshold, capacity and gain, T-1, AB / AB2, the execution-feasibility certifier, the 30 mm apex and recovery issue C are unchanged. Nothing is pushed.

## 1. Verdicts

| item | result | detail |
|---|---|---|
| TD-G1 identity | PASS | KV0 IDENTICAL; 99c29491; b62309f5; 3dd9f13d; b63184da (`ab_val` and `td2_val` AB); 58 / 58 |
| TD-G2 determinism | PASS | 432 / 432 AB end hashes equal the FB battery's |
| TD-G3 completeness | **FAIL** | 1,824 / 1,824 present, but 6 runtime reachability exclusions in the **early** condition: V2-short-legs H-D, both legs, all rates. The foothold commanded 2.8 mm below the turf is rejected by the pre-check, so exclusions differ from AB's |
| TD-1 AB2 swing contract on TD nominal | PASS | T-1, tracking, swing continuity, energy, orientation, airborne β_y, clearance, reach, rates, integrity, ledger: all pass |
| TD-2 design premise | PASS | 432 / 432 nominal runs: first touch at or after the search start. Not independent of qualification (iii) (A2) |
| TD-3 contact kinematics | **FAIL** (172, all early) | nominal / late: max potential-contact downward speed 30.6 mm/s (bound 62.2); E2-5 foot horizontal max 33.8 mm/s (≤ 50) |
| TD-4 touchdown | **FAIL** (255, all early) | nominal / late: one TOUCHDOWN, 0 rebounds, impact max **11.9 % BW** (≤ 25), penetration ≥ 0 |
| TD-5 torque continuity | **FAIL** (14 early, 28 beyond) | **nominal and late: 0 / 864 runs with any E1a-7 violation** (worst ratio 0.84) |
| TD-6 support | PASS | LOAD_ACCEPT once; LA → SUPPORT ≤ 0.104 s; no abort |
| TD-7 placement | PASS | ≤ 3.4 mm, yaw within 2° |
| TD-8 search bounds / escalation | PASS | reference never below the search floor; beyond: no contact before escalation, escalation in every run, no abort, both SUPPORT |
| TD-9 energy / integrity | PASS | |
| TD-10 rate stability | **FAIL** (2 nominal, 44 late, 14 early) | touchdown time vs 240 Hz up to 18.8 ms (late, 480 Hz) against the 10 ms bound taken from E2-15's provisional value |

## 2. Touchdown measurements (TD vs AB)

**Per set** (median / max; contact quantities on the last contact-free tick; impact over [t1, t1 + 100 ms]):

| | AB nominal | TD nominal | TD late |
|---|---|---|---|
| first touch after the search start | — (in the approach) | 144 – 148 ms (τ_c 146) | 173 – 177 ms |
| potential-contact downward speed (mm/s) | 59 – 77 / 122 | 23 – 25 / **31** | 13 – 16 / 26 |
| E2-5 foot horizontal speed (mm/s) | max 52 – 91 (**176 / 432 runs > 50**) | max **30** (0 > 50) | max 34 |
| impact, instantaneous (% BW) | 20 – 35 / **60** (**261 / 432 > 25**) | 5 – 6 / **12** (0 > 25) | 0.3 – 3 / 7 |
| impact, exact 10 ms window (% BW) | max 32 | max 7.6 | max 5.8 |
| 50 ms impulse (N·s) | max 4.9 | max 0.9 | max 0.04 |
| runs with E1a-7 violations | 14 / 432 | **0 / 432** | **0 / 432** |
| rebounds | 32 (H) | 0 | 0 |
| landed-foot slip / placement (mm) | 5.9 / 8.6 | 2.9 / 3.1 | 3.1 / 3.4 |

**New-region tracking deviation** (Decision 4; reported): reference minus actual lowest point, approach φ 0.8 – 1.0, max per set R / C / H = 1.36 / 1.44 / 2.17 mm; in the search ≤ 0.48 mm. This is consistent with the qualification (≤ 2.26 mm).

**Per rate, TD nominal:** impact max 7.7 / 11.6 / 11.9 % BW at 180 / 240 / 480 Hz; worst E1a-7 ratio 0.84 / 0.83 / 0.77; LA → SUPPORT ≤ 0.104 s.

## 3. Causal diagnosis of each failure (no change made)

**F1. Early condition** (TD-3, TD-4, TD-5, TD-10, TD-G3): predicted before the battery (A3).
- dz = −h_B puts the turf exactly at the band top, so the approach ends on the turf. Every early run is **the AB baseline run**: same approach, same contact in the descent at φ ≈ 0.9, same hand-back.
- The failing statistics equal the AB rows of the same table.
- This terrain error is 56× the certified terrain uncertainty (Δ_T 0.05 mm; measured flat-turf spread 0.012 mm).

**Post-hoc tolerance counterfactual** (`diagnostics/counterfactuals.txt`; 6 cases × turf 0.5 / 1.0 / 1.5 / 2.0 mm higher than planned):
- no E1a-7 violation at any offset;
- with ≥ 1 – 1.5 mm, contact moves into the approach;
- **the fast H-T45 swing contacts in the approach already at 0.5 mm** (49 – 105 mm/s; its band margin is 0.04 mm);
- **H-D at 480 Hz reaches 37 – 40 % BW at ≈ 30 mm/s** (contact near the search's peak speed).

**TD2's certified window is narrow by construction:** the band is set from the worst tracking deviation.

**F2. Beyond condition** (TD-5, 28 / 96 runs, worst ratio 1.85).
- The coordinator behaves as specified (TD-8 passes: no contact in the certified search, escalation on time).
- The violations occur in the **escalation continuation** (amendment A1), which emulates E2's frozen failed-touchdown re-plan. That is a C2 drop of ≈ 12.8 mm to the planner's turf height over the planner's tracking-bound T_min (≈ 0.1 s). It arrives at 50 – 80 mm/s with impact up to 49 % BW, i.e. AB-like touchdown quality.
- **Counterfactual** (`diagnostics/counterfactuals.txt`): continuing the escalation **as a TD2 step** (re-target to the planner's turf + h_B, settle, search): 18 / 18 runs with 0 violations, contact at 19 – 27 mm/s, impact 4 – 16 % BW, 0 rebounds. Not adopted.
- **Consequence for E2:** the official S-LATE probe (foothold 10 mm above the turf) uses the same frozen failed-touchdown re-plan, so it would show the same AB-like contact.

**F3. Rate stability of touchdown time** (TD-10; `diagnostics/rate_sensitivity.txt`).
- The swing servo's tracking deviation at the approach end is **rate-dependent**: vs 240 Hz, +0.2 … +0.4 mm at 180 Hz and −0.2 … −0.6 mm at 480 Hz.
- A low-speed, measured-contact touchdown converts deviation into time at 1 / v: **42 ms / mm** (nominal), **73 ms / mm** (late, slower contact).
- Hence touchdown-time differences up to 10.4 ms (nominal, 2 / 288 rate pairs) and up to 18.8 ms (late, 44 / 288).
- The 10 ms value is E2-15's provisional bound, designed for a clock-driven swing touchdown (fast final descent, little time per mm).
- **Consequence for E2:** with contact-seeking touchdown, official E2-15's provisional "touchdown time within 10 ms" faces the same arithmetic.

## 4. What this establishes

Inside its certified window (nominal and late conditions, 864 runs, 8 bodies × 2 legs × 3 rates × R / C / H), TD2:
- removes every AB contact-transition E1a-7 violation (14 → 0);
- cuts the instantaneous impact from max 60 % to 12 % BW (261 → 0 runs above 25 %);
- brings tangential speed at contact under E2-5's 0.05 m/s (176 → 0 runs above);
- eliminates rebounds;
- keeps the AB2 swing contract, support establishment and placement.

## 5. Decisions needed (none taken)

1. **Uncertified early contact (F1).** Which terrain mismatch must the coordinator tolerate, and with what touchdown quality?
   - (a) Treat terrain beyond Δ_T as out of the coordinator's certified window, handled by E2 §2a-style handling criteria. This would be a criterion change for the early condition, a user decision.
   - (b) Require a larger certified terrain allowance and widen the band accordingly. Cost: time, and the slower search's rate sensitivity (F3).
   - (c) A longer approach whose final descent is slow over the whole mismatch range (Decision 6, priority 2).
2. **Escalation continuation (F2).** Adopt "the failed-touchdown re-plan continues as a TD2 step" for commanded steps (counterfactual: clean). It needs a versioned amendment touching E2's frozen failed-touchdown semantics (S-LATE). Recovery steps are not affected.
3. **Touchdown-time rate stability (F3).** Whether the 10 ms bound (TD-10 / E2-15 provisional) applies to measured-contact touchdowns. Alternatives:
   - bound the rate dependence of the **pre-contact state** instead (deviation, contact speed, impact);
   - or reduce the servo's rate-dependent deviation (out of scope: servo change).
4. **Then:** a fresh, versioned TD2 battery. On a pass, the prerequisite sequence (SV-2 re-qualification with the §6 allowance → PG-1 → …).

**External architecture evidence** (fetched while the battery ran): IHMC's open-robotics walking controller exposes the same three ingredients in `SwingTrajectoryParameters`:
- a "desired touchdown height offset" ("force the swing foot to end up with an height offset with respect to the given footstep");
- a "desired touchdown velocity" and a "desired touchdown acceleration" ("force the swing foot go towards the ground once the desired final position is reached but the foot has not touched the ground yet").

That is borrowed architecture, consistent with TD2's band-top approach + search. No IHMC numerical values were used; the per-robot values could not be retrieved.

Source: https://raw.githubusercontent.com/ihmcrobotics/ihmc-open-robotics-software/develop/ihmc-common-walking-control-modules/src/main/java/us/ihmc/commonWalkingControlModules/configurations/SwingTrajectoryParameters.java
