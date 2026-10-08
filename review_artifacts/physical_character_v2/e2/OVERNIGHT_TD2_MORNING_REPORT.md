# Overnight runway, 2026-10-07: morning report

**Authority:** `../sources/2026-10-07_user_decision_overnight_runway_coordinator.md` (saved verbatim).

The message referred to "the decisions in my previous message" and "the design study described above". No such separate message was in the session. I used the decisions restated in the runway itself (do not adopt 1A, reject 1B, proceed from AB) and the touchdown architecture of Decisions 2 – 7 (`2026-10-06_user_decision_1A1B_touchdown_timing.md`).

## 1. How far I got

| step of the runway | status |
|---|---|
| 1. terminal-approach / contact-search design study | **done** (`TD2_DESIGN_STUDY.md`) |
| 2. finite candidate structures compared offline, infeasible ones rejected | **done:** C0 AB baseline, C1 corridor, C5 clock, C6 creep rejected; C2 feasible |
| 3. simplest evidence-supported design selected | **done:** C2 "TD2", band-top approach + settling dwell + bounded rest-to-rest search |
| 4. preregistration committed before implementation | **done** (d14d34f [published as 3bb6752]) |
| 5. implemented behind default-off configuration | **done:** `ctrl/v2_td2.js`, CFG `PSTAR5CHABTD`; default paths bit-identical |
| 6. full independent validation (8 bodies × 2 legs × 3 rates × R / C / H × early / nominal / late / beyond) | **done**, 1,824 runs. **DOES NOT VALIDATE** as preregistered |
| 7. causal diagnosis of failures | **done** (§5), with labelled counterfactuals |
| swing / servo re-qualification, PG-1, other prerequisites, official E2 | **not attempted:** the stop rule applies because TD2 failed |
| E3 / continuous gait | not started (as instructed) |

## 2. Configurations, preregistrations, commits (all local; nothing pushed)

| commit | content |
|---|---|
| d14d34f [published as 3bb6752] | runway decision verbatim; TD2 design study; **TD2 preregistration** (freeze step 1, before any code) |
| 5015dc6 [published as d285f10] | TD2 implementation (default-off) + harness `tools/td2_val.mjs` + evaluator `tools/td2_eval.mjs` + `TD2_RUN_LIST.json` + `scripts/run_td2_val.sh`; amendments A1 – A5; qualification evidence `evidence_td2_design/` (**freeze step 2, before any battery run**) |
| 63d489b [published as 20d7837] | TD2 results (`TD2_RESULTS.md`, `evidence_td2/`), DECISIONS E2-15 |

**Configurations:**
- PSTAR5CHAB (AB baseline, AB2-qualified);
- **PSTAR5CHABTD** = PSTAR5CHAB + `e2td: "search"`. Read only by the commanding layer; the StandController does not read it.

1A (`d1FloatBase`) and 1B (`lcTransition`) stay default-off and unused. Earlier commits from yesterday: d6d4868 [published as c4c7061], 452cc60 [published as 0150ce8], 9610cb6 [published as e658953] (1A / 1B).

## 3. Gates attempted

| gate | result |
|---|---|
| TD-G1 identity (KV0, 99c29491, b62309f5, 3dd9f13d, b63184da, 58 / 58) | PASS |
| TD-G2 determinism (AB vs FB battery, 432 / 432) | PASS |
| TD-G3 completeness / exclusions | FAIL: 6 early-condition reach rejections (V2-short-legs H-D, foothold 2.8 mm below the turf) |
| TD-1 AB2 swing contract on TD | PASS |
| TD-2 design premise (no contact before the search) | PASS |
| TD-3 contact kinematics | FAIL (early only) |
| TD-4 touchdown (single TOUCHDOWN, no rebound, impact ≤ 25 % BW, penetration) | FAIL (early only) |
| TD-5 torque continuity, whole run | FAIL: early 14, beyond 28. **Nominal + late: 0 / 864** |
| TD-6 support / load acceptance | PASS |
| TD-7 placement | PASS |
| TD-8 search bounds / escalation | PASS |
| TD-9 energy / integrity | PASS |
| TD-10 rate stability | FAIL: touchdown time 10.4 – 18.8 ms vs 240 Hz (2 nominal, 44 late, 14 early) |
| SV-2 servo re-qualification | not attempted |
| **PG-1** | **not attempted** (the PG-1 path needs the SV-2 §6 allowance from a re-qualification of the final configuration) |
| PG-2 / PG-3, E1 / G / W / DET, official E2 | not attempted; **official E2 not reached** |

## 4. The coordinator actually implemented (TD2)

1. **Planned approach:** the validated E2 swing segment (unchanged knot rule, anchor + 30 mm at T / 2, T unchanged) to the commanded foothold **raised by h_B = 2.80 mm**. It ends at rest at T with tangential position and orientation complete.
   - Offline: every kinematic peak is equal or lower than the validated swing's; +1.68 mm clearance at φ 0.8.
2. **Tangential settling interval** at the band top: τ_d = 0.085 s (Decision 2's independent timings).
3. **Bounded search:** normal coordinate only, rest-to-rest quintic of depth D_max = 2.70 mm over τ_s = 0.205 s (peak 24.7 mm/s, 0.36 m/s², 18 m/s³). Tangential position and orientation held. It then holds 0.10 mm above the foothold.
4. **Measured contact:** at the lifecycle TOUCHDOWN, E2's existing acceptance and hand-back to the landed anchor. Then the lifecycle's validated accommodation and load acceptance; no clock-declared support.
5. **Escalation:** no contact by the planned touchdown (T + τ_d + τ_c = T + 0.231 s) + 0.3 s → an E2-style failed-touchdown re-target to the planner's turf height over T_min.

**Parameters**, derived from Touchline's own quantities, no donor constants:
- h_B = ⌈u_dn + d_c⌉ with u_dn = 2.26 mm, the **qualified** worst downward deviation of the new region (turf-off qualification of all 432 cases);
- D_max = ⌈h_B − (d_c − u_up) + Δ_T⌉ with u_up 0.31 and Δ_T 0.05 (measured flat-turf rest spread 0.012 mm);
- τ_s from the validated late-descent jerk envelope and the E2-5 impact bound;
- τ_d from the qualified horizontal-speed settling.

**Planned touchdown time** (used by the harness's late-contact rule; the E2 planner integration is not done) = T + 0.231 s.

## 5. Touchdown, contact and load-transfer measurements

**TD nominal + late vs AB, 864 / 432 runs:**

| | AB | TD |
|---|---|---|
| contact-point downward speed | median 59 – 77, max 122 mm/s | median 13 – 25, max 31 mm/s |
| E2-5 horizontal speed > 50 mm/s | 176 runs (max 91) | 0 (max 34) |
| instantaneous impact | max 60 % BW, 261 runs > 25 % | **max 11.9 % BW, 0 > 25 %** |
| exact 10 ms window | max 32 % | max 7.6 % |
| 50 ms impulse | ≤ 4.9 N·s | ≤ 0.9 N·s |
| contact-transition E1a-7 violating runs | 14 | **0** (worst ratio 0.84) |
| rebounds | 32 | **0** |
| landed-foot slip | ≤ 5.9 mm | ≤ 3.1 mm |
| placement | ≤ 8.6 mm | ≤ 3.4 mm |

TD additionally: LOAD_ACCEPT → SUPPORT ≤ 0.104 s; penetration 0.

**Mechanism behind AB's load peak** (new finding): not the first impact, but a **flat-foot slap ≈ 20 ms after an edge-first contact**. The foot pivots about the touched edge, driven by the leg's ≈ 50 mm/s descent.

## 6. Remaining failures and causal diagnosis

1. **Early condition (turf 2.80 mm higher than planned).**
   - By construction the approach ends on the turf, so every run is **bit-identical to the AB baseline**. The coordinator does nothing there, and AB's failures reappear (impact, tangential speed, 14 continuity violations, rebounds, reach rejections).
   - Predicted before the battery and not relaxed.
   - **Tolerance counterfactual:** 0.5 – 2.0 mm higher turf gives no continuity violations. But the fast H-T45 swing (band margin 0.04 mm) contacts in the approach at 49 – 105 mm/s already at 0.5 mm, and H-D at 480 Hz reaches 37 – 40 % BW at ≈ 30 mm/s.
2. **Beyond condition (escalation).**
   - The search behaves as specified.
   - The 28 violating runs come from the **E2-style failed-touchdown continuation**: a ≈ 12.8 mm drop over T_min ≈ 0.1 s, arriving at 50 – 80 mm/s, impact up to 49 %.
   - **Counterfactual:** escalation continued as a TD2 step gives 18 / 18 runs clean (0 violations, 19 – 27 mm/s, ≤ 16 % BW).
   - Official S-LATE would hit the same frozen re-plan behaviour.
3. **TD-10 touchdown-time rate stability.**
   - The swing servo's tracking deviation is rate-dependent: +0.3 mm at 180 Hz, −0.4 mm at 480 Hz vs 240.
   - A low-speed measured-contact touchdown converts that into 42 – 73 ms / mm, so differences reach 18.8 ms against the 10 ms bound that I took from E2-15's provisional value.
   - Official E2-15 would face the same arithmetic with contact-seeking touchdown.

## 7. Tooling and process errors (all disclosed in the preregistration amendments or here)

- The design-study kinematics first used the wrong apex-knot rule (max(start, goal) + apex instead of anchor + apex). Corrected before the battery; conclusion unchanged.
- **The preregistered band (h_B 2.05 mm from the AB late-descent u_dn 1.53 mm) was inadequate for the new region.** Smoke showed early contact on H-T45. It was re-derived from a turf-off qualification. Decision 4 required that qualification; I should have run it before the first preregistration.
- The first qualification (beyond condition) was unrepresentative: its shorter descent comes from the anchor-based knot. It was redone with turf removed.
- I edited the harness mid-qualification batch. The edit only affects behaviour after escalation, and the analysis used only rows before escalation.
- **The preregistered escalation "release to the lifecycle hold" was a target step** (9× E1a-7 ratio). Replaced before the battery by the E2-style re-target (A1). That re-target is what still fails (F2).
- **The early condition was defined so that it equals the AB baseline.** A test-design weakness on my part. Kept as preregistered: no post-hoc loosening.
- TD-10 copied E2-15's provisional 10 ms without accounting for the time sensitivity of a slow search.
- A smoke-analysis script mis-reported a reference height briefly (caught by direct inspection).
- The counterfactual job script had an unexported variable; rerun.
- A background waiter hit its time limit (harmless).
- The web-search budget was exhausted (200 / 200), so the external research is limited to one fetched IHMC source file: `SwingTrajectoryParameters`, with a touchdown height offset plus touchdown velocity / acceleration after the final position. Architecture only, no constants.

## 8. Smallest remaining blocker

Three user decisions stand between TD2 and the prerequisite gates:
- **F2**: the escalation continuation as a TD2 step. This is the smallest, and the counterfactual is already clean.
- **F1**: the scope of uncertified early contact.
- **F3**: the touchdown-time rate criterion.

F1 and F3 are criterion / requirement questions I may not change myself.

## 9. Recommended next action

Decide F1 – F3. My recommendation:
- **F1:** define the coordinator's certified window explicitly (tracking band + Δ_T) and judge larger terrain mismatch with E2 §2a-style handling criteria. Separately consider whether the fast H-T45 class (0.04 mm band margin; outside E2's own envelope) should keep gating.
- **F2:** adopt the TD2-step escalation as a versioned amendment.
- **F3:** bound the rate dependence of the pre-contact state (contact speed, impact, placement) rather than touchdown time.

Then:
1. a fresh, versioned TD2 battery;
2. on a pass, the SV-2 re-qualification of PSTAR5CHABTD (frozen SV-2 criteria and §6 allowance);
3. PG-1;
4. the remaining E2 prerequisites;
5. official E2.
