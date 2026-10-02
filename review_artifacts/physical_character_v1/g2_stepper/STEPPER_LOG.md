# Physical Stepper consolidation — working log (2026-10-02)

Branch `prototype/physical-character-v1`. The last commit before this phase is 39c8dd2. Nothing has been pushed.

## Tooling built (offline, never in the controller)

- **`tools/stepper/session.mjs`: a simulation session with exact snapshot and restore.**
  - Physics is saved with Jolt `SaveState`/`RestoreState` (`EStateRecorderState_All`).
  - Controller, sensor and loop state are saved with one deep clone that preserves identity.
  - `exec.refSwing` is rebound after a restore.
  - The controller's observation buffer is bounded in the session only. `pc_loco` never trims it, because its trim sits inside a comment at `pc_loco.js:240`. The controller only ever reads the newest `max(delayFb, delayPlan)·hz + 1` entries, so every read stays identical. Snapshot cost fell from 700 ms to 22 ms.
- **`tools/stepper/session_check.mjs`: validation, 16/16 PASS.**
  - A straight session run hash-equals `runG2a` (4089b1c8).
  - Branches restored from a snapshot equal from-scratch replays **bit for bit**: K = 6, 12 (R@0.5) and 9 (L@0.55).
  - No leakage: A, then B, then A again gives A.
- **`tools/stepper/oracle_fast.mjs`: the Jolt oracle on snapshots.**
  - It reproduces the replay oracle (`oracle.mjs`) **bit for bit**: every candidate cost at R@0.5 k2–k8 is identical.
  - It is about 5–20× faster than the replay oracle. Per-candidate cost is ≈ 0.5–1 s, about 1 s of simulated physics.
  - Grid centres: `ctrl`, a fixed `nominal`, `wr` (the speed-scaled walk-ratio nominal) and `union` (`ctrl` ∪ `wr`).
  - Modes: `--policy` (D), `--terminal` (F), and `--stepper … --commit ctrl` (data aggregation along the planner's own walk).
- **`tools/stepper/gait_metrics.mjs`: identical instrumentation for every configuration.**
  - It records gait geometry, stride speed and phase-matched velocity.
  - It records impulse by leg and phase (DS / SS), including the Jolt linear-damping impulse (≈ −2 N·s per stride).
  - It records energy, CoP at 25/50/75 % of single support, saturation and angular momentum.
- **`tools/stepper/surrogate.mjs`: surrogate fitting.**
  - Model classes: global linear, quadratic, and local (k-means regions).
  - Validation is leave-one-start-out.
  - The decisive metric is offline regret on the oracle's own candidate sets.
- **`tools/stepper/matrix_report.mjs`**: the matrix, a matched-state contrast between the one-step and two-step picks, and the instrumentation of the committed sequences.
- **`tools/stepper/stepper_run.mjs`**: live runs of the in-controller Physical Stepper. It reports contact-event outcomes, calibration and decision cost.
- **`tools/stepper/bench22.mjs`**: the planning-cost benchmark (Part 19).

## Runtime (opt-in, default path unchanged)

- **`pc_stepper.js`.**
  - The contact-event schema and lifecycle; illegal transitions throw.
  - `classifySupport`, which classifies an event from the executor's sensed touchdown only.
  - The nominal gait generator: a walk-ratio law scaled with speed and leg length.
  - The surrogate evaluator: `modelPredict`, which chains over the model's own input features.
  - `StepPlanner`: horizon 1, horizon 1 + terminal value, or horizon 2 with a beam.
- **`pc_plan.js`.** The `walk.ctrl.stepper` hook in the unified branch.
  - The planner decides at the step start from the feedback view, using the same state record as the oracle (`pc_stepfeat`).
  - The step is executed like the oracle's commanded steps, with no in-swing re-decision.
  - The support contact event goes `ACCEPTED → EXECUTING` and is classified at the next decision.
  - Calibration logging: the predicted next state vs the measured one.

## Findings so far

1. **The oracle reproduces at HEAD.**
   - legacy1 mean is 18.2 upright steps, against 17.0 yesterday. The difference is fully explained: yesterday's engine committed `toFixed(4)`-rounded commands while evaluating at full precision. Replaying yesterday's committed sequence at HEAD reproduces its state bitwise.
   - legacy2 is being re-run on the snapshot engine.
2. **G — two steps around a FIXED steady-state nominal (0.39 m / 0.40 s) — falls within 5 steps on 4 of 6 starts.**
   - The start transient needs short, state-dependent steps; the legacy1 oracle commands 0.10 m at k2.
   - A fixed nominal is not a usable centre during a speed transient.
   - The Gw / Gu variants (the speed-scaled nominal, and nominal ∪ feedback) are running.
3. **C — two steps around the feedback decision — gives 17 / 18 / 26 / 19 / 26 / 19 upright steps (mean 20.8).**
   - On 4 of 6 starts the search itself reaches a state where **every** candidate falls.
   - The model is perfect here, so this is not a model failure.
4. **The failure mode under every oracle is speed creep.**
   - The controller's stride-average speed estimate rises from 0.34 to 0.9–1.0 m/s. The speed-loop integrator saturates at its braking bound (−0.08).
   - Commanded steps lengthen to 0.4–0.7 m, COM height drops from 1.05 to 0.94–0.97 m, and the pelvis pitches 9–27° forward. A dead end follows.
   - The phase-matched step-start velocity creeps under legacy2 and Gu too: 0.45 → 0.55–0.61 by k8–15.
5. **The impulse audit locates the creep.**
   - In steady walking (ctrl L@0.6) the double support propels (+8–10 N·s per stride) and the single support brakes (−6 to −8). The net is ≈ +2 N·s, balancing −2 N·s of damping.
   - In every creeping run the **single support turns propulsive** (+10 to +46 N·s per stride).
   - The single-support CoP is near the heel in steady walking (−0.08 → −0.01 m relative to the ankle). In the creep it is already on the forefoot (+0.15 to +0.19 m by 75 % of single support). The COM still passes beyond it.
6. **Surrogate first look (C data, leave-one-start-out).**
   - Candidate outcomes span a huge range, up to runaway states, and global smooth models are poor overall.
   - Restricted to the walking region (cost < 25–50), the held-out error is ξ_f 3.5 cm, ξ_l 4.4 cm and v 4.2 cm/s.
   - At a matched state the model explains ≈ 80 % of the across-candidate variation of ξ_f: per-candidate error 2.5 cm vs a true spread of 5.8 cm.
   - It explains ≈ 0 % of the variation of the next-step velocity: 3.4 vs 3.4 cm/s.
   - Cause: the next step's start time jumps by 50–70 ms between neighbouring commands, because the double support ends on an event. The velocity sampled at that instant inherits the jumpiness.
7. **The plain controller with more speed-loop authority** (`speedI` max 0.2, gain 0.1 / 0.2) does not help. It fails within ~10 steps, before the integrator matters. Mean upright: 14.7 → 14.7 / 10.3.
8. **Planning cost** (smoke model; machine loaded with 14 simulation processes).
   - Horizon 1: 0.34 ms mean per decision.
   - Horizon 2, beam 3: 1.9 ms mean.
   - An idle-machine re-run is needed for the report.

9. **Matrix, partial** (upright steps; R@0.5 / L@0.5 / L@0.6 / R@0.55 / R@0.6 / L@0.55).
   - A (controller): 9 / 6 / 40 / 11 / 11 / 11, mean 14.7.
   - B (one step around the controller's decision): 16 / 15 / 17 / 15 / 15 / 13, mean 15.2.
   - C (two steps, same grid): 19 / 17 / 26 / 19 / 26 / 18, mean 20.8.
   - E (one step around the fixed nominal): 9 / 5 / 5 / 6 / … / 5. G (two steps around the fixed nominal): 22 / 5 / 5 / 5 / 26 / 5. Both fall at the start transient.
   - So foresight adds ≈ 5–6 steps around the feedback decision. A fixed nominal gait without state feedback fails at gait initiation.
10. **Reproducing yesterday's depth-2 beam (exact commits) does not reproduce its outcome.**
    - L@0.6 gives 13 upright (yesterday 34). R@0.5 gives 20 (yesterday 28).
    - Yesterday's committed sequences still give 28–34 when replayed at HEAD.
    - Through k3 the decisions are identical. From k4 the states differ by ≈ 3 mm, because yesterday's engine rounded the committed df and dl to 4 decimals.
    - A rounding-emulation run (`--round 4`) is running to prove the outcome is bit-identical to yesterday's under that rounding.
    - If it is, the beam oracle's 28–34 was a fragile path: 0.1 mm command differences decide between 13 and 34 steps.
11. **Braking authority of the stepping action space: none at creep speeds.**
    - At each decision (B, C, G data) every candidate's effect on the controller's stride-level speed estimate v̄ over one step was compared. v̄ is an EMA with τ 0.6 s, smooth.

      | v̄ (m/s) | most-braking candidate Δv̄ | the oracle's pick | most-accelerating |
      |---|---|---|---|
      | 0–0.45 | −0.032 | +0.013 | +0.032 |
      | 0.45–0.55 | −0.005 | +0.021 | +0.031 |
      | 0.55–0.65 | **+0.002** | +0.041 | +0.061 |
      | 0.65–0.8 | **+0.005** | +0.041 | +0.064 |
      | 0.8+ | −0.001 | +0.023 | +0.052 |

    - Above ≈ 0.55 m/s, on average **no** stepping candidate (15–19 per state, ±12 cm and ±60 ms around the decision) slows the walk.
    - The few that brake leave the capture point 0.3–0.5 m ahead, which is unrecoverable.
    - The stepping layer cannot regulate stride speed under this inner loop. This is the Part-15 evidence for testing stance-phase / ground-reaction speed regulation.
12. **Stance candidates under the oracle (the 2×2 gate).**
    - (a) `speedI.max` 0.25, the integral speed loop with more authority, on the legacy1 oracle: it still creeps (v 0.57 → 0.68–0.74 by k10–11). The integrator moves ≈ 1.5 cm per step, so it is too slow. Stopped early.
    - (b) `speedP` (opt-in, `pc_unified.orbit`): a proportional term on v̄ shifting the orbit's capture-point offsets, which acts through the single- and double-support CoP solvers that track the orbit.
      - On the plain controller it is worse (mean 8.5 at k 0.3, 8.2 at k 0.6, vs 14.7). That is expected: the controller's maps were identified under the original orbit.
      - Under the oracle (legacy1 grid): running.
13. **Previously recorded (g2_speed):** the single-support CoP regulator `vReg` (±4–5 cm) did not help. During creep the CoP is already on the forefoot late in stance. The double support, with CoP authority between the trailing toe and the leading foot, is still propulsive in creep (+5 to +15 N·s per stride).

## Running / pending

- Matrix batch 1: legacy2 and B / E running, C and G done.
- Matrix batch 2: Gu running; Gw, Bu and Ew queued.
- Part 15 2×2, first cell: the legacy1 oracle with `speedI.max` 0.25.
- After that: D (fitted linear policy, leave-one-start-out) and F (one step + terminal value).
- Then the surrogate on all the data, a live Physical Stepper with held-out tests, and data aggregation.
