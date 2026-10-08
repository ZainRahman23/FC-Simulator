# SLP-1 — Supported Locomotion Prototype 1: design / preregistration (DRAFT — SUPERSEDED by `SLP1_PREREGISTRATION.md`, frozen; changes listed there in §9)

**Status:** DRAFT for the user's approval. There is no SLP-1 implementation code and no SLP-1 run. Parameters marked *(to freeze)* are fixed at the freeze commit, before any run.

**Source:** `../sources/2026-10-08_user_decision_pivot_supported_locomotion_slp1.md` (verbatim). Decision record: `../DECISIONS.md`, 2026-10-08 architecture pivot.

**Scope:**
- Production-architecture feasibility. Not gait certification, not football calibration.
- Default off. All new code lives in new files. No edit to an existing V2 file.
- No V2 physical parameter changes, no football-simulation changes, no TD2C / E2. CF-1 … CF-6 untouched.

## 1. Question

Can V2-REF be externally driven along a prescribed straight line at about 1.2 / 3 / 6 m/s while remaining a genuine contactable articulated body? And can a small disturbance matrix produce sensible retained / disrupted / lost-support behaviour, without autonomous balance being responsible for ordinary locomotion?

## 2. What the existing architecture offers (inspected 8 Oct)

- **Plant** (`core/v2_jolt.js`, `gates/v2_g1.js`):
  - 14 Jolt dynamic bodies with full inertia and compound colliders (boot = 10 convex pieces);
  - SixDOF joints (translation fixed, pyramid-limited rotation, engine stop = hard limit + margin);
  - passive tissue drives on the joint motors (`sim/v2_passive.js`);
  - analytic turf plane; per-sub-shape friction (boot–turf 1.2);
  - 240 Hz, 150 velocity / 2 position iterations, single-threaded.
- **Actuators** (`sim/v2_actuation.js`):
  - one parallel SixDOF motor constraint per joint (implicit spring + damper);
  - torque limits exactly equal to the instantaneous capacity (Anderson angle, Hill velocity, activation 15 / 50 ms);
  - commands are per-axis `{K, D, τ0}`; impulse readback gives exact active torque and work.
- **Autonomous controller** (`ctrl/v2_stand.js` `StandController.compute`):
  - balance law: DCM, kξ = 1/3, p*;
  - G3 load allocation, inverse statics, posture PD with body-scaled gains;
  - bounded leg IK (`legIK` / `legIKBounded`);
  - support lifecycle and swing servo.
  - On top: the supervisor, T-A capture, the E2 planner / StepSequencer, and the CF gait layers (`tools/loco_probe.mjs`).
- **Disturbances and obstacles:**
  - `addForceAt` (force at a world point) and `addTorqueExt`, ledgered by G2;
  - static capsule obstacles; contact manifolds recorded per tick.
- **Measured CPU per 240 Hz step** (Apple M4, Node 22; `baseline/cpu_baseline_cf6_B0.1.txt`; `../perf/perf_bench.json`):

| per-step cost | CF-6 autonomous walk (0.1 m/s, 3 trials) | G2 quiet stance (perf bench, 4 Oct) |
|---|---|---|
| Jolt step | 330 – 341 µs (38 %) | 310 µs (45 %) |
| passive tissue (plan + apply) | 193 – 204 µs (22 %) | 144 µs (21 %) |
| controller + gait layer | 175 – 182 µs (20 %) | 80 µs (12 %), of which leg IK 69 µs |
| actuators | 18 – 19 µs | 11 µs |
| diagnostics (probes, G1 / G2 / G3 measurement, hash) | 126 – 132 µs (15 %) | (included in tick) |
| tick total | 862 – 900 µs | 689 µs |

## 3. Mechanism (the cheapest clean supported locomotion)

### 3.1 Support layer S: one compliant, capacity-limited 6-DOF spring between the turf and the pelvis

**The constraint:**
- A Jolt `SixDOFConstraint` between the existing static turf body and the pelvis, attached at the pelvis COM.
- All six axes are free (no hard constraint).
- Each axis has a motor in Position mode with an implicit spring (stiffness, damping) and its own force / torque limits.
- This is the same pattern as V2's parallel actuator constraints. The JS binding exposes `SetTargetPositionCS`, `SetTargetOrientationCS`, `SetTargetVelocityCS`, translational `mMin / mMaxForceLimit` and `GetTotalLambdaMotorTranslation / Rotation`; checked in `vendor/jolt-physics.wasm-compat.js`.

**Targets, set each tick:**
- the prescribed pelvis position (trajectory point plus the support height h_s), velocity v_ref, facing yaw, upright;
- the axes are the trajectory frame (forward, vertical, lateral).

**Readback:** exact support impulse per tick, hence support force, torque, work and saturation.

**Parameters** *(to freeze)*, derived before any run from V2's own quantities, never tuned to disturbance outcomes:
- **Horizontal cap:** F_h = M·ω²·R.
  - ω = √(g / h_COM).
  - R = V2-REF's one-step capture reach: the largest lateral and forward foothold adjustment its bounded leg IK can reach from the reference pelvis at mid-swing (the existing `ikFeasible` / reach-tool method).
  - Rationale: the support stands in for the balance capability a runner has through foot placement, and no more.
- **Vertical cap:** up = M·g, so the support can carry the body through flight / swing; down = 0.25·M·g. The support never presses the body into the ground.
- **Pitch / roll / yaw cap:** M·g·(boot half-length), the moment a stance-foot CoP could make.
- **Spring:** stiffness K = M(2πf)², damping ζ = 1, with f the softest of {1, 2, 4} Hz that meets §6.1 undisturbed tracking at all three speeds. Calibrated on undisturbed runs only, then frozen.
- **If the derived caps cannot carry undisturbed locomotion:** that is reported. It means the reference motion demands more authority than foot placement could provide. Caps are not raised silently.

### 3.2 Locomotion driver D: reference kinematics → existing actuators (replaces `StandController.compute` in SLP-1 runs only)

**Footstep schedule** from the prescribed trajectory and the gait timing (§5):
- footholds alternate at ± W0 / 2, placed so that mid-stance falls under the hip;
- stance foot: held at its measured landing pose;
- swing foot: one existing `stepSegment` from liftoff to the next foothold, apex +30 mm (E2 apex decision);
- foot pitch: heel-down at the scheduled touchdown, toe-down at the scheduled liftoff, within the ankle's range;
- timing is by the schedule, not by the lifecycle's release (the lifecycle is still run, as a measurement of foot phase).

**Leg joint targets:**
- the existing bounded leg IK (a `StandController` instance used for geometry and IK only), evaluated at the reference pelvis pose;
- the upper body: the quiet-stance posture.

**Actuator commands:** per-axis `{K, D, τ0}` to the unchanged `ActuatorLayer`.
- Gains are the controller's body-scaled law, K = κ·m_sup·g·L.
- τ0 = K·error + feed-forward. Feed-forward is the gravity statics of each leg subtree, plus, for the stance leg, the scheduled share of body weight.
- Whatever the legs do not carry, the support carries. That split is measured, not prescribed.

**Support height h_s per speed:** the highest constant pelvis height at which the bounded IK reaches both ends of the stance sweep (v·t_contact) with the foot pitched. It is computed from V2's geometry before any run. If no height works, that speed is reported as kinematically infeasible for a constant-height reference. That is a limit of the reference gait, not of the body.

### 3.3 Authority α ∈ [0, 1]: continuous, state-based, no impulse threshold

α scales all support caps. It is driven by a recoverability margin m = R − ‖ξ − ξ_ref‖:
- ξ = c + v/ω is the measured horizontal DCM, and ξ_ref is the trajectory's;
- R is the same capture reach that sets F_h, so m < 0 means even full support can no longer hold the deviation;
- this is a physical boundary derived from the support's own capacity, not a tuned impulse.

**Dynamics:**
- α̇ = −α·ω·max(0, −m) / R + (1 − α)·ω·max(0, m) / R.
- Loss rate is proportional to how far beyond recoverable the state is; the time constant is the body's own pendulum time 1/ω.
- Reacquisition only while not FALLEN (G2's definition: COM < 70 % of start height, or a non-boot body touching the turf). There is no recovery behaviour.
- At α → 0 the support is gone. The articulated body falls under physics, with the actuators holding the quiet-stance posture (no protective responses).

**Why it is location / direction / momentum / phase sensitive without being coded per case:** m is evaluated on the resulting physical state, never on the impulse.
- A support-leg sweep, a high torso hit or a swing-leg deflection change ξ and the pelvis differently from the same impulse at the COM.
- The same impulse matters differently at different speeds and foot phases.

**Recorded labels** (descriptive only; never a switch):
- retained: α ≥ 0.99 throughout;
- disrupted: α dipped and recovered, or the stride was disrupted (missed or > 50 mm misplaced foothold, scheduled stance without contact);
- lost: α < 0.05;
- fell: FALLEN.

### 3.4 Disturbances (deterministic, no randomness)

**Primary: applied impulse pulses** (the G2 `addForceAt` mechanism, at a body-local surface point of the struck segment, 30 ms, ledgered). These give identical impulses across speeds and locations.

**Confirmation: one genuine collision per speed** for the moderate torso case.
- A dynamic rigid impactor (20 kg capsule, body-like friction, lateral approach 2 m/s relative to the character) created in a new file through `w.bi`, aimed at the thorax.
- Transferred impulse = the impactor's momentum change. Struck segment and contact point come from the existing contact manifolds.

**Magnitudes:**
- J* = M·ω·R, the impulse whose COM-equivalent DCM jump equals R; computed and frozen before any run.
- small = 0.25 J*, moderate = 0.75 J*, large = 2 J*; reported in N·s.
- For scale against V2's standing evidence: E1b recovered 5 N·s and exceeded standing capacity at 15 N·s.

**Matrix** (per speed; 6 cases + 1 collision = 7 runs; × 3 speeds = 21 runs, each executed twice):

| case | where | when | magnitude |
|---|---|---|---|
| D0 | none | — | — |
| D1 small | thorax lateral surface (shoulder height), lateral | mid single support | 0.25 J* |
| D2 moderate | same | same | 0.75 J* |
| D3 large | same | same | 2 J* |
| D4 swing leg | swing shank lateral surface, lateral | mid-swing | 0.75 J* |
| D5 support leg | stance shank lateral surface, lateral | mid-stance | 0.75 J* |
| D2c collision | thorax, impactor | mid single support | ≈ moderate (measured) |

All disturbances come after 3 s of steady supported locomotion. The run continues 3 s after the disturbance, or 2 s after FALLEN.

## 4. Which V2 mechanisms stay active and which are bypassed

**Active:**
- Jolt world, bodies, masses / inertias, colliders, self-collision filter;
- joints and engine hard stops; the passive tissue layer (v2k knee, couplings);
- `ActuatorLayer` (capacity, activation, Hill velocity, exact limits);
- contact model and friction policy; gravity;
- G1 integrity invariants (finite state, position-correction teleport, penetration, hard-limit excursion);
- the energy ledger (plus support work), the hash chain, the ankle probes, the support lifecycle (measurement only);
- reused pieces: bounded leg IK, body-scaled gain law, quiet-stance posture, `stepSegment`.

**Bypassed in SLP-1 runs:**
- the balance law (DCM / p*, kξ) and CoP planning;
- the G3 load allocation (λ split);
- ankle balance torques; the posture-height law;
- the supervisor / abort and T-A capture / put-down;
- the E2 planner, StepSequencer and certificates;
- every CF-1 … CF-6 gait layer;
- lifecycle-gated swing release.

**Unchanged when off:** existing runs never construct SLP code. That is verified by the probe / CF-1 … CF-6 regression (106 / 106 end hashes) and the G-gate component regressions.

## 5. Gait timing inputs (open: research needed before freezing)

- **Walk 1.2 m/s:** from the CF-6 pack, linear between its 1.11760 and 1.34112 m/s rows (C M cadence, C D step, H F/D double support). Labelled as an interpolation.
- **Jog 3 m/s and run 6 m/s:** the pack covers walking only. Needed: step frequency, step length, ground-contact time (duty factor); optionally step width and vertical COM excursion.
- **Not to be guessed.** Candidate sources to verify: Cavanagh & Kram 1989; Weyand et al. 2000; Dorn, Schache & Pandy 2012.

## 6. Recorded per run, and outcome criteria

**6.1 Clean supported locomotion (undisturbed, per speed)** *(tolerances to freeze; [ENG] presentation tolerances)*:
- realised mean speed within ± 5 % of commanded;
- pelvis horizontal tracking RMS ≤ 30 mm and maximum ≤ 100 mm;
- support saturated on ≤ 5 % of ticks;
- every scheduled stance has a measured boot contact, and stance slip < 20 mm (G2 "relocated");
- no FALLEN; integrity invariants hold;
- energy closure E − E0 = W_act + W_support + W_ext − damping within the G-gate tolerance.

**6.2 Per run (the user's list):**
- commanded vs realised trajectory and speed;
- α and support state; support force / torque / work / saturation;
- articulated response: per-segment displacement and rotation, joint angles;
- struck segment, contact point, applied or transferred impulse;
- COM / pelvis displacement and rotation;
- foot phase and contact state at impact;
- the retained / disrupted / lost / fell label;
- joint hard-limit margins, actuator saturation and capacity use;
- energy and integrity; recovery (n/a, none implemented);
- hashes, with a double execution;
- CPU per step by component, measured like-for-like (same machine, instrumentation and rate) against §2's autonomous baselines, plus a diagnostics-off measurement.

**6.3 "Sensible" disturbance behaviour** (assessed and reported, not tuned toward):
- severity never decreases from D1 to D2 to D3 at a given speed;
- location differences at equal impulse (D2 / D4 / D5) are reported with their mechanism;
- D2c's collision response is consistent with D2's pulse;
- no non-physical artefact: no support "explosion", no teleport, no energy gain beyond ledgered work, no non-finite state;
- the support never writes a pose or velocity (`authorityWrites` stays 0).

**Stop rule:**
- If undisturbed supported locomotion is not clean at a speed, stop at that speed. Classify the limit as support-layer design, reference-gait geometry, actuator capacity (Hill / angle limits at running joint speeds) or contact, and report it.
- V2 physical parameters are never changed to pass.

## 7. Open architecture items, recorded and not decided in SLP-1

- **Reconciliation:** under disturbance, the support keeps pulling toward the authoritative trajectory with bounded force. In production, the football simulation decides collisions and outcomes. How a physically displaced body is reconciled with the authoritative trajectory is a later decision. SLP-1 only measures the gap.
- **Cost levers beyond SLP-1:** solver iterations (150 velocity steps, a G1 convergence choice), passive-tissue cost, IK rate, rate below 240 Hz, diagnostics off. None changed in SLP-1 without approval.
