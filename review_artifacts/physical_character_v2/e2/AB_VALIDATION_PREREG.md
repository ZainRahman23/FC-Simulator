# A + B (pelvis-motion compensation, passive ankle damping): implementation and factorial validation, PREREGISTRATION

**Authority:** user decision 2026-10-06, `../sources/2026-10-06_user_decision_AB_touchdown.md` (verbatim), stages 1–2 of its order of work.

**Design evidence:**
- `VERTICAL_RESIDUAL_DIAGNOSIS.md`: causes M1 and M2, counterfactuals.
- The decision names "the Astra research" as design evidence. No Astra document about swing or touchdown control exists in this workspace: the Astra files on disk are the football observatory specification, the evidence reports and the migration handoff. The design principles stated in the decision are therefore used as that evidence, and every quantity here is validated against Touchline's own physics.

**Frozen in the commit that adds this file, before any battery run:**
- code: `ctrl/v2_stand.js` (A, B, ledger), `gates/v2_e2.js` (configurations);
- harness `tools/ab_val.mjs` and evaluator `tools/ab_eval.mjs`;
- run list `AB_RUN_LIST.json`; runner `scripts/run_ab_val.sh`.

**Seen before freezing.** One smoke run per configuration (V2-REF L 240 Hz R-F) was used to check harness mechanics and the evaluator's units. Its values: T-1 β 0.254 / −0.025 / 0.256 / −0.026 (BASE / A / B / AB); β_y 0.402 / 0.155 / 0.402 / 0.153; mean tilt 0.82 / 0.70 / 0.04 / 0.09°.
- This is disclosed because AB-7 below was written after seeing it, as a relative criterion; its justification is in AB-7.
- No other threshold was chosen from data in this programme.

## 1. Implementation (all default OFF; default paths bit-identical)

### A: `vffPelvisAir`, pelvis-motion compensation of the commanded swing

The non-supporting leg's world-space foot velocity task has two parts:
- rT: the commanded target's own motion. Already singularity-robust (`vffRate "sr"`).
- rP: the motion of the leg's frame, the measured pelvis. It had kept the solver damping μ0.

**A solves rP with the same singularity-robust variable damping as rT, blended by w_A = a · c:**
- a is the lifecycle's airborne weight (continuous);
- c is a commanded-swing weight: it moves toward 1 while a swing target is commanded and toward 0 otherwise, at the lifecycle's support-weight ramp rate (`release`, 0.10 s).
- Damping is μ_P = (1 − w_A)·μ0 + w_A·μ_sr(λmin).

**Consequences:**
- Airborne in a commanded swing (w_A = 1), rP and rT share one damping. Because the solve is linear in the residual, their sum *is* the single consistently damped task solve.
- In contact (a = 0) and on every path without a commanded target (resting foot, external lift, abort hold, E1 protocols), rP keeps μ0 exactly. That excludes the paths on which the general variant (`srAll`) was refuted.
- Never switched in one tick: a is continuous, and c moves at most dt / 0.10 per tick.
- Joint-rate limits: the servo has no explicit rate limit, and the actuator's velocity-dependent capacity (f_ω) and activation limits are untouched.

### B: `vffPassiveRef`, passive ankle damping on the reference rate

The ankle's modelled passive tissue damping c_p (spec `joints[k].damping`, 0.2 N·m·s/rad) is compensated **once**, in the swing actuator command:

  τ_B = (1 − s) · c_p · ω_ref,  where ω_ref = rT + w_A · rP

- ω_ref is the task's **reference** joint rate, never the measured rate. Nominal trajectory drag is cancelled; contact- or disturbance-induced motion keeps its full physical damping.
- B applies to the ankle axes only. Hip and knee passive damping are 0.4 % and 1.6 % of their swing servo damping, so not compensated.
- B is zero without a commanded target, so grounded behaviour is unchanged.
- It is not switched at first contact: rT and w_A are continuous.
- B and the diagnostic `vffPassive` cannot both be set (exclusive by construction).

### Ledger: `torqueLedger`, recording only

For each actuator axis of a non-supporting leg, the command is recorded as its parts:
- statics feed-forward (gravity, common acceleration, support share);
- D1 inertial feed-forward;
- proportional term K·e;
- servo-damping velocity feed-forward (D + dt·K)·ω*;
- B;
- the weights w_A and c.

Each contribution appears exactly once. τ0 = Σ parts is checked on every row (L-1).
- Passive tissue torque is a separate physical quantity, read from the passive motor rows. It is never part of the command.
- The applied actuator torque is read from the actuator impulse.

**Configurations:**

| name | config |
|---|---|
| BASE | PSTAR5CH |
| A | PSTAR5CHA = BASE + `vffPelvisAir` |
| B | PSTAR5CHB = BASE + `vffPassiveRef` |
| AB | PSTAR5CHAB = both |

## 2. Identity, verified before freezing

**G-1 (default path):**
- KV0 IDENTICAL;
- PSTAR5B 99c29491; PSTAR5CH b62309f5;
- SV-2 record V2-REF L 240 R-F hash 3dd9f13d, also reproduced by `tools/ab_val.mjs` BASE with the recording on;
- component regressions 58 / 58.

**G-2 (grounded / contact behaviour):**
- The external-lift harness (`tools/boundary_probe.mjs`, the 12 cases that refuted `srAll`), run with A + B options, is **bit-identical to the plain runs (12 / 12, every per-tick row)**.
- Every summary field equals the committed `evidence_vffrate/external_lift/sr_*` records.

**G-3 (in the battery):** every A / B / AB run is identical to its BASE run at the 7 s hash, i.e. before the step command.

## 3. Run matrix (`AB_RUN_LIST.json`, 1,728 runs)

**Factors:**
- 4 configurations;
- 8 bodies;
- left and right leg;
- 180 / 240 / 480 Hz;
- 9 trajectories, the SV-2 definitions with the A30 apex: R-F, R-L (representative); C-F7, C-F13, C-L5 (corridor; C-F7 / C-L5 are the T-1 failures); H-T45, H-A40, H-D, H-F15 (harder, reachable).

C-L11 is excluded: rejected by reachability for 7 bodies and not executable for V2-long-legs. It belongs to stage 6.

**Protocol:** the SV-2 protocol unchanged (timeline, reachability pre-check, hand-back, post-contact sequence, λ return). The harness is `tools/ab_val.mjs`, a versioned copy; `tools/swing_servo_val2.mjs` stays frozen.

## 4. Criteria (evaluator `tools/ab_eval.mjs`)

**A + B validates iff every item below passes and all 1,728 runs are present.**
- A runtime reachability rejection excludes a run and is listed.
- R = representative, C = corridor, H = harder.
- Definitions are SV-2's unless stated.

| # | criterion | scope |
|---|---|---|
| **AB-1** | **T-1 frozen:** pooled \|β\| ≤ 0.25 per trajectory id under AB | all 9 ids |
| AB-2 | T-2: peak ≤ 10 mm and RMS ≤ 5 mm over φ ∈ [0, 0.8] | every AB run |
| AB-3 | T-3: \|peak(hz) − peak(240)\| ≤ 2 mm, \|RMS(hz) − RMS(240)\| ≤ 1 mm | AB, R + C |
| AB-4a | command continuity in the swing: no E1a-7 violation (rate rule, all actuated axes, applied and commanded) from the measured liftoff to 2 ticks before the measured contact | every AB run |
| AB-4b | no regression: AB runs with an E1a-7 violation anywhere in the run ≤ BASE runs, per set | R, C, H |
| AB-4c | weights continuous: \|Δc\| ≤ dt / 0.10 per tick; \|Δw_A\| ≤ \|Δa\| + \|Δc\| per tick | every AB run |
| AB-5 | E1a-8 energy: closure ≤ 0.05 J / tick, Σ positive ≤ 0.5 J, authority writes 0 | AB, R + C |
| AB-6 | orientation: mean foot tilt error over φ ∈ [0.6, 0.85] under AB ≤ 0.5 × BASE | each R / C id |
| AB-7 | vertical residual: pooled vertical β_y under AB **and** under A ≤ 0.5 × BASE | each R / C id |
| AB-8 | clearance, binding window: worst downward deviation of the lowest boot point from the reference pose over φ ∈ [0.75, 0.80], both conventions, ≥ −0.80 mm (half of SV-2's 1.60 mm) | AB, all R + C runs |
| AB-9 | reach and soft-limit margin: IK residual ≤ 1e-6 and every solved coordinate strictly inside its soft limits from liftoff **to contact**; per run, min margin ≥ BASE min − 2° | AB, R + C |
| AB-10 | rate stability: \|tilt mean(hz) − (240)\| ≤ 0.2°, \|binding-window d_low(hz) − (240)\| ≤ 0.3 mm | AB, R + C |
| I-1, I-4 … I-7 | SV-2 integrity: over-capacity 0; saturation ≤ 5 % / ≤ 50 ms (R, C); no contact before φ 0.6, a liftoff, no failed touchdown; one TOUCHDOWN, no rebound, no re-entry < 60 ms (R, C); no abort, both feet SUPPORT at the end (R, C) | AB |
| L-1 | ledger closure \|τ0 − Σ parts\| ≤ 1e-9 (relative) on every row | every run |
| L-2 | B only on ankle axes, and only with c > 0 | every run |
| G-3 | identical to BASE at the 7 s hash | every A / B / AB run |

**Causal confirmations.** If any is contradicted, stop and diagnose: the explanation would be wrong even if AB passed.

| # | prediction | scope |
|---|---|---|
| **C-1** | **T-1 collapses for the predicted reason (M1):** BASE β > 0.25 (reproduces SV-2); A and AB β ≤ 0.25; \|β_B − β_BASE\| ≤ 0.05; \|β_AB − β_A\| ≤ 0.05 | C-F7, C-L5 |
| C-2 | the orientation reduction is M2's: B mean tilt ≤ 0.5 × BASE; A mean tilt within ± 25 % of BASE | each R / C id |
| C-3 | the vertical reduction is M1's: \|β_y(B) − β_y(BASE)\| ≤ 0.05 | each R / C id |

**Why each threshold:**
- AB-1 … AB-3, AB-5 and I-x are the frozen SV-2 thresholds, unchanged.
- AB-6 / C-2: M2 accounts for the whole orientation residual in the diagnosis (pinned-pelvis tilt is unchanged; passive compensation removes 85–95 %). A ≥ 50 % reduction is the prediction with margin. A should leave tilt within ± 25 %.
- AB-7 / C-3: M1 is 60–80 % of β_y. Diagnosis: pinned β_y 0.05–0.09 vs floating 0.21–0.38. Removing it predicts ≥ 50 % reduction, the margin allowing for A's continuous weighting. B should not move β_y (diagnosis: ± 0.03).
- AB-8: halving the SV-2 binding allowance is the improvement the diagnosis predicts (worst −1.11 → −0.37 mm on 3 bodies). It is not a certificate. PG-1 is stage 7.
- AB-9: a coordinate reaching its soft limit is the mechanism of the V2-long-legs runaway. The check runs to contact because SV-2's φ ≤ 0.8 window missed exactly that.
- AB-10: within the precision of the measures, and well below the effects being validated.

**Reported, not gating:**
- per-bin worst deviations (φ 0.20 … 0.80);
- ankle e_y at φ 0.85;
- contact φ;
- the ledger's B magnitude;
- touchdown metrics (the touchdown handoff is stages 3–5);
- H-set I-6 / I-7.

## 5. Stop rule

If A + B does not validate, or a causal confirmation is contradicted:
- stop at stage 2 and diagnose;
- no downstream value is tuned;
- the touchdown handoff is not started.

Everything stays local.
