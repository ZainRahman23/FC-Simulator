# SV-2R: swing / servo re-qualification for PG-1 on the final configuration: preregistration, frozen before the TD2C battery runs

**Authority:**
- the user's instruction 2026-10-08, item 3 ("swing/servo/SV-2 requalification required for PG-1");
- `D1G_TD2C_PREREG.md` III.1 step 6.2: "SV-2's frozen criteria and §6 allowance rule on the final configuration, preregistered as a versioned run, criteria unchanged";
- `DVG_PREREG.md` §5.4.

**Why it is needed:**
- PG-1 under A30 certifies only with a tracked-clearance allowance validated for the servo (`E2_PREREG_AMENDMENT_A30.md` §4).
- SV-2 did not validate (`SWING_SERVO_VALIDATION_V2_RESULTS.md`), so no allowance exists.
- The swing servo and the swing reference have since changed: A + B (AB2), DVG and the TD2C approach.

**Preserved, not reinterpreted:** SV-1, S2 and SV-2 and their verdicts.

## 1. Configuration: the final one

**PSTAR5CHABTDV:**
- PSTAR5CH (D1 `swingAccFF`, `vffRate: "sr"`, `e2reanchorVel`);
- A + B (`vffPelvisAir`, `vffPassiveRef`; qualified by AB2);
- the TD2B / TD2C touchdown options;
- DVG (`d1Guard: 2`; adopted iff DVG2 passes);
- trajectory amendment A30 (apex 30 mm).

This is TD2C's TD configuration after amendment A5.

## 2. Runs: TD2C's own nominal block (no additional runs)

**The SV-2 harness, with the final touchdown behaviour:**
- `tools/td2c_val.mjs` is a versioned copy of `td2b_val`, itself the SV-2 timeline with the TD2 coordinator. It is independent of the E2 planner and sequencer, as SV-2's harness is.
- The sequence is:
  1. the E1b pre-lift timeline;
  2. at the step command, the reachability pre-check;
  3. the B1 lift to measured AIRBORNE;
  4. the A30 swing from the measured state, ending at rest at the certified band top (`approachGoal`);
  5. the tangential-settling dwell, then the bounded search to measured contact;
  6. E2's hand-back, then the frozen rest / return.

**Runs:**
- the **TD2C battery's nominal-terrain runs of PSTAR5CHABTDV**: 9 trajectories (R-F, R-L, C-F7, C-F13, C-L5, H-T45, H-A40, H-D, H-F15) × 8 bodies × 2 legs × 180 / 240 / 480 Hz = **432 runs**, with no separate SV-2R run;
- VAL-OFF counterparts are not run. SV-2 never gated them (T-1 is β_ON; the ON / OFF ratio is reported only), so they are not reported.

**Inclusion (SV-2 §3, "the planner's own certifier … exactly as the E2 planner poses a commanded step"):**
- The planner's certifier now includes the execution-feasibility extension (`EXECUTION_FEASIBILITY.md`). The user required: "The V2-long-legs lateral counterexample must be rejected before runtime if it remains dynamically unexecutable" (`sources/2026-10-06_user_decision_AB2_coordinator.md`).
- **The DVG2 step-0 classification** (`evidence_dvg2/classification/`; the frozen certifier, DVG off, 480 cases) is:
  - every one of the 9 trajectories QUALIFIED for every body, leg and rate;
  - C-L11 NOT QUALIFIED for every body, leg and rate.
- C-L11 is therefore excluded before runtime, as TD2, TD2B and TD2C already exclude it.
- **Runtime confirmation is unchanged:** a runtime pre-check rejection, or an unreached IK target in the swing window, excludes that run from every verdict and from the allowance (`reachRT`, verbatim).

## 3. Criteria: SV-2 §4 and §5 verbatim

The criteria are T-1 … T-3 and I-1 … I-7, with SV-2's scopes (T-2, I-1, I-2, I-3, I-5, I-6 on every set; T-3, I-4, I-7 on R and C; T-1 per trajectory id).

**Evaluator:** `tools/sv2r_eval.mjs`, a versioned copy of `swing_servo_eval2.mjs`. Every criterion line, the validation rule and the allowance rule are verbatim; only the input file names and the run list differ.

**One consequence of verbatim application, stated now:**
- SV-2's saturation window ("swing rows") is the rows whose phase is "swing" until contact. In TD2C's records these include the dwell and the bounded search after the approach ends.
- I-4 is therefore evaluated over a longer window than in SV-2 (stricter, not looser).
- φ = (t − t_liftoff) / T, with T = 0.60 s (the approach), as in SV-2.

**SV-2R validates iff** T-1 … T-3 and I-1 … I-7 all pass and all 432 runs are present.

## 4. The clearance allowance: SV-2 §6 verbatim

- **Per 0.05-φ bin of [0.20, 0.80]:** A_b = the maximum downward deviation (actual lowest boot point vs the reference pose's) over every reachable R and C run, all bodies, legs and rates, in both conventions, rounded up to 0.05 mm.
- **Computed only if SV-2R validates.**
- **Entered as** `FS.clearAllow = { servo, bins: { phi0: 0.2, width: 0.05, mm: [A_b] }, source }`.
- **The servo key** is the final swing servo's defining options:
  - `{ swingAccFF: true, vffRate: "sr", e2reanchorVel: true, vffPelvisAir: true, vffPassiveRef: true, d1Guard: 2 }`;
  - so any other servo has no allowance (SV-2 §6: "servo-keyed").
- **The swing reference measured here is the one the planner certifies** for TD2C commanded steps (the A30 approach to the band top).

## 5. Then: PG-1 (A30 §4), after E2 integration

- `tools/e2_pg.mjs --traj=A30`: the 32 preregistered commanded decisions, 240 Hz, with the final configuration through the integrated E2 planner (TD2C swing semantics).
- **PG-1 passes iff all 32 are CERTIFIED_ONE_STEP.**
- The apex is not changed.

## 6. Stop rules

Stop and report:
- if SV-2R does not validate (no gain, bandwidth, trajectory, apex, threshold or window change);
- if TD2C fails (SV-2R is then reported only as a diagnostic);
- if PG-1 does not certify all 32.

## 7. Known before this freeze

- SV-1, S2 and SV-2 results; the vertical-residual diagnosis (A + B take T-1 from 0.26 / 0.28 to 0.01 / 0.09); AB2 (A + B qualified).
- **TD2 / TD2B results.** TD2B's nominal runs (PSTAR5CHABTDB, without DVG): 0 E1a-7 violations, impact ≤ 14.3 % BW, no rebounds. TD2C's nominal runs with DVG are expected to be bit-identical to them wherever DVG never engages (TD-G2).
- **The SV-2 criteria were never evaluated on TD2 / TD2B records.**
- No TD2C battery run exists.
