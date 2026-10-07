# Touchdown coordinator TD2 (band-top approach + bounded contact search): PREREGISTRATION

**Authority:** `../sources/2026-10-07_user_decision_overnight_runway_coordinator.md` (the overnight runway) with Decisions 2 – 7 of `../sources/2026-10-06_user_decision_1A1B_touchdown_timing.md`.

**Design study:** `TD2_DESIGN_STUDY.md`.

**Baseline:** PSTAR5CHAB (A + B, AB2-qualified). 1A / 1B are not adopted.

**Frozen in two steps:**
1. This document (design and criteria) is committed **before** any TD2 code.
2. Before any battery run, a second commit adds:
   - the implementation (default-off);
   - the harness `tools/td2_val.mjs`;
   - the evaluator `tools/td2_eval.mjs`;
   - the run list `TD2_RUN_LIST.json`;
   - the runner `scripts/run_td2_val.sh`.

   Any design-verification smoke result and any detail forced by the implementation are disclosed as dated amendments (§8) before the battery.

**Unchanged:**
- every threshold, actuator capacity and servo gain;
- T-1;
- the AB / AB2 swing baseline;
- the execution-feasibility certifier;
- the 30 mm apex;
- recovery issue C (recovery steps get no search);
- E2-5 and its 25 % BW contract.

Default / off paths stay bit-identical. Failed evidence is kept. Nothing is pushed.

## 1. The coordinator (TD2)

**Parameters, derived in `TD2_DESIGN_STUDY.md` §3 (fixed here):**

| parameter | value |
|---|---|
| band height h_B | 2.05 mm |
| search depth D_max | 1.95 mm (the search ends 0.10 mm above the foothold) |
| search duration τ_s | 0.150 s (rest-to-rest quintic; peak 24.4 mm/s, 0.50 m/s², 34.7 m/s³) |
| nominal contact time τ_c | 0.1005 s after the search start |

**Phases of a commanded step:**
1. **Planned approach.** The E2 swing segment (`stepSegment`) from the measured liftoff state to the commanded foothold **raised by h_B** along the turf normal (world up), over T. The apex rule, T and the knot are unchanged. It ends at rest at T with tangential position and orientation complete.
2. **Bounded search.** From the approach end, only the normal coordinate advances: a rest-to-rest quintic of depth D_max over τ_s. Tangential position and orientation are held at the foothold (finite-torque servo, unchanged). It is then held at the search end.
3. **Measured contact.**
   - At the swing foot's lifecycle TOUCHDOWN (debounced measured Jolt contact), the commanded segment stops being followed.
   - E2's existing acceptance applies: the ≥ 60 % gate, now against the planned touchdown liftoff + T + τ_c.
   - The hand-back: a C2 segment from the current reference state to the lifecycle's landed anchor (realised horizontal position and yaw; turf-flat height and tilt) over max(remaining commanded-segment time, the lifecycle's `accept`). This is E2's `accept()` rule.
   - The planned foothold is kept for placement scoring.
4. **Accommodation and load acceptance.** Unchanged lifecycle: a-blend to the validated contact hold, then LOAD_ACCEPT / SUPPORT on the measured load request. Support is never declared by the clock.
5. **Early contact** (before the search): E2's existing rule (accept at ≥ 60 %; hand-back from the approach reference).
6. **Escalation.**
   - No contact by the search end → the search-end pose is held.
   - No contact by the planned touchdown + 0.3 s (E2's late-contact rule, unchanged) → failed touchdown and E2's existing re-plan.
   - In the validation harness: release to the lifecycle hold, a physically feasible continuation. No contact is declared.

**Configuration:**
- PSTAR5CHABTD = PSTAR5CHAB + `e2td: "search"`.
- The StandController does not read `e2td`. It is read only by the commanding layer: the E2 step sequencer and planner, and the validation harness.

**E2 integration** (same module `ctrl/v2_td2.js`; implemented with this freeze; verified by identity now and by PG-1 later):
- **The planner** (commanded steps only):
  - certifies the approach segment it will execute (path, clearance, execution feasibility on the band-top segment);
  - checks that the search-end pose is IK-feasible;
  - uses the planned touchdown T + τ_c for timed capture and the DCM plan (Decision 6).
- **The sequencer:**
  - runs the search after the approach;
  - applies acceptance, hand-back and late / failed contact as above.
- Recovery steps are unchanged.

## 2. Validation harness and matrix

**`tools/td2_val.mjs`:** a versioned copy of `tools/fb_val.mjs`, itself the AB2 / SV-2 harness lineage:
- the identical timeline (settle, 25 mm pelvis drop, 4 s transfer, release TOUCHING ≥ 0.5 s, the reachability pre-check, the lift reference, the swing from the measured liftoff, the contact sequence, 0.5 s rest, the λ return over 4 s, then 3 s);
- trajectories R-F, R-L, C-F7, C-F13, C-L5, H-T45, H-A40, H-D, H-F15;
- configurations PSTAR5CHAB (AB, E2's existing swing and hand-back) and PSTAR5CHABTD (TD2 phases 1 – 6, implemented by the same module functions the sequencer uses).

**Terrain conditions,** emulated by the commanded foothold's height offset dz relative to the actual turf:

| condition | dz | meaning |
|---|---|---|
| **nominal** | 0 | |
| **early** | −h_B = −2.05 mm | turf 2.05 mm higher than planned: contact in the approach's final descent |
| **late** | +0.40 mm = D_max − (h_B − d_c) | turf lower than planned: the deepest certified contact for nominal tracking |
| **beyond** | +10 mm | E2's S-LATE offset: no contact within the certified depth, so escalation |

**Matrix (1,824 runs):**
- AB nominal: 8 bodies × 2 legs × 180 / 240 / 480 Hz × 9 trajectories = 432;
- TD nominal / early / late: 432 each;
- TD beyond: 8 × 2 × 3 × {R-F, R-L} = 96.

**Archived records:** 240 Hz V2-REF (left) and V2-198-92 (both legs), all configurations and conditions.

## 3. Definitions

- t1 = the first tick with touching pieces of the swing foot after the measured liftoff; t_nc = t1 − dt.
- T_s = the search start = liftoff + T.
- **Possible-contact interval** PCI = [min(T_s, t_nc), the landed foot's first SUPPORT).
- **Contact kinematics** on the t_nc row:
  - the potential-contact sole points (hull points within u_dn + d_c = 2.03 mm of the lowest): max downward and max tangential speed, v + ω × r;
  - E2-5's foot velocity (origin): downward and horizontal.
- **Impact (frozen E2-5 form):** max instantaneous probe normal force over [t1, t1 + 100 ms], / BW.
- **Penetration:** the lowest boot point minus its resting value (anchor), min over [t1, t1 + 100 ms].
- E1a-7 rule: rate rule `maxJumpSmooth` and onset windows, exactly as in AB2 / FB.
- BASE values for the relative AB2 items come from the frozen FB battery's BASE records (`evidence_fb/fb_eval.json.gz`).

## 4. Criteria (TD2 validates iff all pass)

**Identity and completeness:**

| # | criterion | scope |
|---|---|---|
| TD-G1 | identity of default / off paths: KV0 IDENTICAL; PSTAR5B 99c29491; PSTAR5CH b62309f5; SV-2 3dd9f13d; AB R-F 240 b63184da; component regressions 58 / 58 | at the freeze |
| TD-G2 | determinism: the AB nominal end hashes equal the FB battery's AB records | 432 / 432 |
| TD-G3 | completeness: all 1,824 runs present; runtime reachability exclusions identical to AB's | |

**The AB2 swing contract on TD nominal** (vs BASE where relative):

| # | criterion | scope |
|---|---|---|
| TD-1 | AB-1 (T-1), AB-2, AB-3, AB2-4a, AB2-4b (violations outside the PCI: TD ≤ BASE per set), AB-4c, AB-5, AB-6, AB2-7, AB-8, AB-9, AB-10, I-1, I-4, I-5, I-7, L-1, L-2, G-3 | AB2 definitions |

I-6 is replaced by TD-4, which applies to all sets.

**The coordinator's own requirements:**

| # | criterion | scope |
|---|---|---|
| TD-2 | **design premise:** no swing-foot contact before the search starts (t1 ≥ T_s − dt / 2) | every nominal run |
| TD-3 | **contact kinematics:** potential-contact downward speed ≤ 24.4 + 37.5 = 61.9 mm/s; E2-5 foot downward ≤ 0.15 m/s and horizontal ≤ 0.05 m/s | nominal and late: all three items. Early: the E2-5 items |
| TD-4 | **touchdown:** exactly one TOUCHDOWN of the swing foot after liftoff; no TOUCHDOWN → AIRBORNE; no state re-entered within 60 ms (either foot, from the step command); impact ≤ 25 % BW; penetration ≥ −2 mm | nominal, early, late, every run |
| TD-5 | **torque continuity:** zero E1a-7 violations (applied and commanded) over the whole run from 0.5 s. This includes the PCI, the coordinator's requirement from AB2 and FB | every run, all conditions |
| TD-6 | **support:** LOAD_ACCEPT exactly once; SUPPORT reached with LOAD_ACCEPT → SUPPORT ≤ `accept` + 0.1 s; no supervisor abort; both feet SUPPORT at the end | nominal, early, late |
| TD-7 | **placement:** the landed foot origin at its first SUPPORT within 10 mm horizontally of the commanded foothold; \|yaw\| ≤ 2° (E2-4 thresholds) | nominal, early, late |
| TD-8 | **search bounds and escalation:** the commanded reference never below foothold + 0.10 mm before contact. **Beyond:** no swing-foot TOUCHDOWN before the escalation tick (planned touchdown + 0.3 s); escalation occurs; no abort; both feet SUPPORT at the end | TD, all conditions |
| TD-9 | **energy and integrity:** E1a-8 (closure ≤ 0.05 J / tick, Σ+ ≤ 0.5 J, authority 0); over-capacity 0; saturation ≤ 5 % of swing rows and ≤ 50 ms continuous per leg axis | all runs; saturation R / C |
| TD-10 | **rate stability:** per (body, leg, trajectory, condition), the swing foot's lifecycle event sequence is identical at 180 / 240 / 480 Hz; touchdown time within 10 ms and placement within 3 mm of 240 Hz (E2-15's provisional values) | TD, nominal / early / late |

**Reported, not gated:**
- contact time vs planned (T + τ_c);
- contact speeds; foot ω at t_nc;
- impact: instantaneous, the exact 10 ms window, the 20 / 50 ms impulses, the first 12 ms vs later;
- landed-foot slip from t1 to SUPPORT; penetration;
- actuator work; requested vs measured load;
- **the hover / search-region tracking deviation** (reference minus actual lowest boot point, per phase: φ 0.8 – 1.0, the search). This is the qualification of the new trajectory region (Decision 4);
- the pre-contact commanded-rate demand;
- paired comparison with AB.

## 5. Stop rules

Any TD-G or TD-1 … TD-10 failure → stop, diagnose causally, no tuning.

## 6. If TD2 validates: the prerequisite sequence (each frozen before its result)

1. **E2 integration identity:** default and off unchanged; PSTAR5CHABTD planner and sequencer smoke at a non-test step (disclosed).
2. **Swing-servo re-qualification:** the SV-2 frozen run list and criteria (`SWING_SERVO_VALIDATION_V2_PREREG.md` §§1 – 5) on the final configuration PSTAR5CHABTD, and the §6 allowance rule if it validates, keyed to that configuration's servo. A versioned harness copy; criteria unchanged.
3. **PG-1** (`E2_PREREG_AMENDMENT_A30.md` §4 rule: all 32 CERTIFIED_ONE_STEP under the tracked certificate with that allowance).
4. PG-2 / PG-3 and the remaining frozen E2 prerequisites in the E2 preregistration's order.
5. The official E2 exactly as frozen.

## 7. What was known before freezing

- The AB baseline's touchdown behaviour (`TD2_DESIGN_STUDY.md` §1).
- The offline kinematics of the band-top approach.
- No TD2 run of any kind exists at this commit.

## 8. Amendments (dated, before any battery run)

(none yet)
