# Swing-servo validation v2 (SV-2): PREREGISTRATION, frozen before any battery run

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_sv2_battery.md`), approving `SWING_SERVO_VALIDATION_V2_PROPOSAL.md` with constraints.

**Frozen in the commit that adds this file. Code:**
- `tools/swing_servo_val2.mjs` (harness);
- `tools/swing_servo_eval2.mjs` (evaluator);
- `ctrl/v2_footstep.js` (per-bin certificate form);
- run list `SV2_FROZEN_RUN_LIST.json`;
- runner `scripts/run_sv2.sh`.

**Preserved, not reinterpreted:** the v1 battery (`SWING_SERVO_VALIDATION_PREREG.md`, `_RESULTS.md`, `evidence_servo/`), amendment S (superseded, never run) and amendment S2 (`_PREREG_AMENDMENT_S2.md`, `_RESULTS_S2.md`, `evidence_servo_H/`). Their verdicts stand.

**Before freezing, run:**
1. The reachability pre-check (§3). It runs only to the step command; no servo tracking.
2. Harness mechanics, at **300 Hz, a rate outside the battery**: V2-REF L R-F on / off and one rejected case. Only the event logs (liftoff, contact, completion, rejection path) and the evaluator's field list were inspected. These runs are not part of the battery and nothing below was chosen from them.

**Configurations** (they differ only in D1):
- VAL-OFF = PSTAR5BH = PSTAR5B + `vffRate: "sr"` + `e2reanchorVel`;
- VAL-ON = PSTAR5CH = PSTAR5BH + `swingAccFF`.

**Coverage:** 8 bodies × both legs × 180 / 240 / 480 Hz. Trajectory amendment A30 (apex 30 mm) for R and C.

## 1. Harness: one E2-shaped step per run (`tools/swing_servo_val2.mjs`)

It is independent of the E2 planner and sequencer: no footstep planning, no DCM layer, no certificate in the loop. The sequence:
1. The E1b pre-lift timeline: settle, 25 mm pelvis drop, 4 s transfer to the stance foot, release TOUCHING ≥ 0.5 s.
2. **At the step command:** the reachability pre-check (§3).
3. The E1b / B1 lift reference until the measured, confirmed AIRBORNE.
4. The swing from the **measured** foot state:
   - `stepSegment`;
   - apex knot max(start, goal) + apex at T/2;
   - goal **on the turf** at the planner's own candidate pose `candPose(anchor, stance frame, dx, dy, 0)`;
   - the continuous re-anchor.
5. Measured touchdown, then E2's own hand-back to the landed contact anchor: from the reference state, over max(T − u, accept).
6. Swing target cleared, so the lifecycle holds the anchor.
7. 0.5 s rest (contact ≠ support).
8. The stance share returns to 0.5 over 4 s (the landed foot accepts load), then 3 s.

Commands go only through the swing target and its analytic reference; Jolt decides.

**Conventions:**
- φ = (t − t_liftoff) / T, with t the time of the measured state.
- **Evaluator convention:** the row's foot state vs the reference computed one tick earlier. This is how E2-3 measures.
- **Time-matched:** vs the next row's reference.
- Window for tracking: φ ∈ [0, 0.8], before contact.

## 2. Trajectory set

| id | set | goal offset (stance frame) | T | apex above max(start, goal) |
|---|---|---|---|---|
| R-F | **representative** (E2 S-F) | +0.10 m forward | 0.60 s | 30 mm |
| R-L | **representative** (E2 S-L) | +0.08 m outward | 0.60 s | 30 mm |
| C-F7, C-F13 | corridor extreme | +0.07 / +0.13 m forward | 0.60 s | 30 mm |
| C-L5, C-L11 | corridor extreme | +0.05 / +0.11 m outward | 0.60 s | 30 mm |
| H-T45 | harder | +0.10 m forward | 0.45 s | 30 mm |
| H-A40 | harder | +0.10 m forward | 0.60 s | 40 mm |
| H-D | harder | +0.10 forward, +0.08 outward | 0.60 s | 30 mm |
| H-F15 | harder | +0.15 m forward | 0.60 s | 30 mm |

- The proposal's report-only H-R21 (0.21 s, no knot) is dropped. With the goal on the turf and no apex knot it is in contact from the start, so it is no swing-tracking case. It was never part of the user's required list.
- **Uses of each set:**
  - R and C: tracking, integrity **and the allowance**;
  - H: tracking and integrity only (it discriminates the servo beyond the E2 envelope).

## 3. Reachability (separate verdict; never feeds tracking, integrity or the allowance)

**Pre-check (before freezing).** At the step command of every body × leg × rate (`--mode=reach`, evidence `evidence_sv2/reach_precheck/`), the planner's own certifier evaluates each trajectory exactly as the E2 planner poses a commanded step:
- `landingValid` of the goal;
- `ikFeasible` of the goal (bounded IK in the soft-limit box);
- `certifyPath` of the swing planned from the predicted liftoff state: 11 samples, each IK-feasible from the current swing frame.

**Inclusion rule:** a (body, leg, trajectory) is included iff reachable at all three rates.

| result | detail |
|---|---|
| reachable | every trajectory for every body and leg, **except C-L11** |
| C-L11 (0.11 m outward) | **rejected** for V2-REF, V2-165-62, V2-198-92, V2-175-70, V2-190-85, V2-short-legs and V1-matched, both legs, all rates: goal pose not IK-feasible. Reachable only for V2-long-legs |
| frozen list | **876 runs** = 10 trajectories × 16 body-legs × 3 rates × 2 configurations − 84 rejected |

All four harder cases (0.45 s, 40 mm, diagonal, 0.15 m) are proven reachable for every body and leg.

**Runtime confirmation**, per run:
- the harness repeats the pre-check at its step command, and a rejection skips the step;
- every swing-window row must have its IK target reached (residual ≤ 1e-6).

A run failing either is **excluded from every other verdict and from the allowance** and listed separately.

## 4. Tracking accuracy validation (VAL-ON, reachable runs)

| # | criterion | scope |
|---|---|---|
| T-1 | **D1 mechanism** (the approved V-2 change): pooled acceleration-correlation slope \|β_ON\| ≤ 0.25 per trajectory id, with β = LS slope of e_p on −a_ref / ωn² over φ ∈ [0, 0.8], pooled over axes, bodies, legs and rates | every trajectory id |
| T-2 | E2-level tracking: peak ≤ 10 mm and RMS ≤ 5 mm over φ ∈ [0, 0.8], evaluator convention (E2-3's thresholds) | every run, R, C, H |
| T-3 | rate stability: \|peak(hz) − peak(240)\| ≤ 2 mm, \|RMS(hz) − RMS(240)\| ≤ 1 mm | R, C |

**Reported, not gating:** RMS ON / OFF and their ratio (the old V-1), β_OFF, the joint fit (β, γ = velocity-lag fraction of 2ζ/ωn, bias), tilt.

**Why the ON / OFF ratio is no longer gating:** the decision approves evaluating "the D1-on acceleration/tracking mechanism rather than requiring a specific improvement ratio against a known-defective controller". D1 is validated on its own mechanism (T-1) and its own accuracy (T-2, T-3). The ratio stays reported.

## 5. Integrity / energy / torque (VAL-ON, reachable runs)

| # | criterion | scope |
|---|---|---|
| I-1 | over-capacity events 0 | all |
| I-2 | E1a-7 torque continuity over the run (t ≥ 0.5 s), rate rule `maxJumpSmooth`: applied Δτ ≤ 10 · max(1, 240 / hz) N·m (≤ 25 · in the contact-onset windows); commanded Δτ0 ≤ 30 · 240 / hz N·m. No exemption for liftoff, re-anchor or touchdown beyond E1a-7's onset window | all |
| I-3 | E1a-8 energy, per run (one E1a-length step run): closure increment ≤ 0.05 J / tick, Σ positive ≤ 0.5 J, authority writes 0 | all |
| I-4 | saturation ≤ 5 % of the swing rows and ≤ 50 ms continuous per leg axis | R, C (H reported) |
| I-5 | no swing-foot contact before φ 0.6; a liftoff; no failed touchdown | all |
| I-6 | exactly one TOUCHDOWN of the swing foot, no TOUCHDOWN → AIRBORNE, no state re-entered within 60 ms (either foot, from the step command) | all |
| I-7 | no supervisor abort; both feet SUPPORT at the end | R, C |

**The servo validates iff T-1 … T-3 and I-1 … I-7 all pass and all 876 frozen runs are present.** Otherwise stop and report. No gain, bandwidth, trajectory, apex or threshold is changed.

## 6. Clearance allowance (separate; computed only if the servo validates)

**Per 0.05-φ bin b** of [0.20, 0.80] (12 bins):

  A_b = ⌈ max(0, max over runs, rows with φ ∈ b, conventions of (lowRef − low)) ⌉ rounded up to 0.05 mm

- The max is over every reachable VAL-ON run of the **R and C** sets, all bodies, legs and rates.
- "low" is the actual lowest boot hull point; "lowRef" is that of the reference pose.
- Both conventions count (evaluator and time-matched), whichever is lower for the boot.

**Why this is conservative:**
- it is the worst observed downward error over 8 bodies × 2 legs × 3 rates × all R / C trajectories;
- it takes the worse of the two conventions;
- it is rounded up;
- the certificate takes the larger bin at a boundary.

**What it never includes:**
- H trajectories (outside the E2 envelope);
- unreachable cases (§3);
- any E2 run, smoke, PG or official result.

**Certificate** (`ctrl/v2_footstep.js` `certifyClearance`, SV-2 form):
- predicted clearance(φ) = reference lowest boot point(φ) − A_bin(φ) ≥ 5 mm for φ ∈ [0.2, 0.8];
- a sample exactly on a bin boundary uses the larger bin.

The allowance is entered as `FS.clearAllow = { servo: { swingAccFF: true, vffRate: "sr", e2reanchorVel: true }, bins: { phi0: 0.2, width: 0.05, mm: [A_b] }, source }`. It is servo-keyed: any other servo configuration has none.

**Then PG-1 under A30:** PSTAR5CH, `--traj=A30`, the 32 preregistered commanded decisions. PG-1 passes iff all 32 are CERTIFIED_ONE_STEP. The apex is not changed again.

## 7. Then, only if PG-1 certifies: the bounded 30 mm touchdown diagnostic matrix

**Matrix:**
- PSTAR5CH, A30, certificate enforced (no `--diag=noclear`);
- the same design as the 25 mm diagnostic matrix for comparability: 8 bodies × 2 legs × non-test nominal steps (forward 0.07 m, lateral 0.06 m) × 180 / 240 / 480 Hz = 96 runs.
- **Not** the official E2 battery: no preregistered test step is run.

**Reported per run and per rate:**
- instantaneous solver-step peak load;
- max load averaged over an exact **10 ms** physical-time window (and 20 ms);
- 20 ms and 50 ms impulse;
- touchdown normal and tangential speed;
- contact φ;
- penetration and rebound;
- actuator torque steps (E2-9 values);
- the frozen E2 criteria, for information.

E2-5 is **not** changed. The analysis states what physical quantity E2-5's 25 % BW clause is meant to limit, and, if the 10 ms measure stays rate-stable at 30 mm, gives the evidence and sources for a versioned E2-5 amendment for decision.

## 8. Stop rules

Stop and report:
- if the servo does not validate;
- if PG-1 does not certify all 32;
- after the touchdown matrix, before any E2-5 change, any touchdown-behaviour change, any new criterion adoption or any official E2 run.

Everything stays local.
