# SLP-1 — Supported Locomotion Prototype 1: PREREGISTRATION (FROZEN before any SLP-1 code or run)

**Status:** frozen at the commit that adds this file. No SLP-1 implementation code and no SLP-1 run existed at freezing. Any later change is a recorded amendment (§10), never a silent edit.

**Sources (verbatim, `../sources/`):**
- `2026-10-08_user_decision_pivot_supported_locomotion_slp1.md`: the architecture pivot and the SLP-1 brief;
- `2026-10-08_user_approval_slp1_with_amendments.md`: approval plus Amendments 1–4, extra reporting, stop rules.

**Draft:** `SLP1_DESIGN_PREREGISTRATION_DRAFT.md` (superseded; §9 lists every change).

**Scope:**
- Architecture / physics feasibility only. Not gait validation, not football calibration, not performance optimisation (Amendment 4).
- Default off; all new code in new files (`ctrl/v2_supported.js`, `gates/v2_slp.js`, `tools/slp1_probe.mjs`). No existing V2 file is edited.
- No V2 physical parameter changes. No football-simulation changes. TD2C / E2 untouched (E2-22). CF-1 … CF-6 untouched.

## 1. Question

Can V2-REF be externally driven along a prescribed straight line at 1.2 / 3 / 6 m/s while remaining a genuine contactable articulated body? And can a small disturbance matrix produce sensible retained / displaced / disrupted / lost-support behaviour, without autonomous balance being responsible for ordinary locomotion?

## 2. Mechanism

### 2.1 Support S

**Constraint:**
- One Jolt `SixDOFConstraint` between the existing static turf body (body 1) and the pelvis (body 2), at the pelvis COM, world-space frames (axes x lateral, y vertical, z forward).
- All six axes **free**. Each axis has a motor in **PositionAndVelocity** mode, the same Jolt motor state V2's actuators use.
  - Implicit spring and damper (StiffnessAndDamping) toward a target position / orientation **and** a target velocity.
  - The damper therefore acts on the velocity error relative to the prescribed motion, not on absolute velocity.
- Per-axis force / torque limits are the only route by which S applies force.
- S is solved by Jolt in the same velocity / position solve as every contact and joint (Amendment 2).

**Targets, set each tick before the step:**
- Pelvis COM position p_ref(t) and velocity v_ref(t) (§2.3.1), relative to the frame's initial point.
- Orientation = the initial pelvis orientation q0 (upright, facing +z), angular velocity 0.
- Vertical feed-forward: the vertical target is raised by α·F_ff,y / K_lin, so that at p_ref the spring delivers α·F_ff,y.
  - F_ff,y = (1 − Σ_n s_n)·M·g. s_n is foot n's scheduled load share (§2.3.5).
  - So S carries the body weight the schedule does not give to a stance leg (flight, swing-only instants) and 0 in single stance. It never senses foot loads.

**Caps (frozen, §3), each scaled by α:**
- horizontal (x and z): ±F_h;
- vertical: [−0.25·M·g, +1.5·M·g];
- rotational: ±T_c on each axis.

**Spring** (from §3 by the calibration rule §4.1):
- K_lin = M·(2πf)², D_lin = 2·M·(2πf);
- K_rot,a = I_a·(2πf)², D_rot,a = 2·I_a·(2πf), with I_a the whole-body inertia about the pelvis COM (initial pose) on world axis a.

**Readback:** the motors' total translation / rotation lambdas per step give the exact support impulse, force, torque, work (F·v + T·ω at mid-step) and per-axis saturation (|λ| ≥ α·cap·dt − 1e-9).

**Amendment 2 rules, all recorded:**
- S never reads contacts, collision events, disturbance flags or foot loads.
- S never writes a body pose or velocity. The G2 `authorityWrites` counter must stay 0 after the initial placement.
- S never exceeds its caps (Jolt's motor limits; the readback is checked every tick).

### 2.2 Authority α ∈ [0, 1]

**Margin:**
- ω = √(g / h_COM,ref).
- ξ = c_h + v_h / ω: the measured whole-body COM horizontal DCM.
- ξ_ref = (p_ref + (c0 − p0))_h + v_ref,h / ω, with c0 − p0 the initial COM-minus-pelvis-COM offset.
- m̂ = 1 − ‖ξ − ξ_ref‖ / R (dimensionless). R is the frozen lateral one-step capture reach (§3). m̂ < 0 means even full support can no longer hold the deviation (F_h = M·ω²·R).

**Dynamics** (explicit Euler per tick, clamped to [0, 1]):
- α̇ = −α·ω·max(0, −m̂) + (1 − α)·ω·max(0, m̂)·[not FALLEN].
- α starts at 1. There is no impulse, contact or collision input.

**FALLEN** (G2's definition): whole-body COM below 70 % of its start height, or any non-boot body touching the turf. Once FALLEN, α never re-rises.

**Amendment 3:**
- α only scales S's force limits (and the feed-forward).
- Nothing resets, replaces or writes any velocity at any α. A body losing support keeps exactly the physical state that produced the loss.

### 2.3 Locomotion driver D (replaces `StandController.compute` in SLP-1 runs only)

**2.3.1 Prescribed trajectory:**
- t ∈ [0, 0.5) s: settle. v_ref = 0; the pelvis height target drops by dh (§3) with a min-jerk ramp over 0.5 s.
- From t_g = 0.5 s: v_ref(t) = v·mj((t − t_g) / T_ramp) along +z, where mj(u) = 10u³ − 15u⁴ + 6u⁵; position = its integral (closed form).
- Straight line, constant facing.

**2.3.2 Footstep schedule (time-based, from §3's gait inputs):**
- Stride T = 2 / f_step; contact t_c; swing t_sw = T − t_c.
- Left foot: liftoff at t_g + kT, touchdown at t_g + kT + t_sw (k ≥ 0).
- Right foot: stance from t = 0 until its first liftoff at t_g + T/2; then liftoff at t_g + T/2 + kT, touchdown at t_g + T/2 + kT + t_sw.
- Walking has double support; jog / run have flight.

**2.3.3 Foot poses:**
- **Touchdown target:**
  - flat pose of the foot with its sole centroid at the reference hip-midpoint's forward position at mid-stance (t_td + t_c/2);
  - lateral position and yaw = the foot's initial ones (W0 = 0.1745 m), height = initial;
  - then pitched about the heel edge (toe up) by θ_td.
- **Stance (u = (t − t_td) / t_c), with the planted flat pose captured at touchdown** (the scheduled flat pose shifted horizontally by the measured heel-point deviation, measured yaw):
  - heel pivot θ_td·(1 − mj(u / 0.2)) for u < 0.2;
  - flat for 0.2 ≤ u ≤ 0.6;
  - toe pivot θ_lo·mj((u − 0.6) / 0.4) for u > 0.6.
  - Pivots stay on the turf.
- **Swing:**
  - one existing `stepSegment` (ctrl/v2_swing.js) from the stance pose at liftoff (rest) to the touchdown target over t_sw;
  - apex knot at t_sw / 2, height max(start, goal) + apex.

**2.3.4 Joint targets:**
- Legs: the existing bounded leg IK `StandController.legIKBounded`, **hard anatomical box**, no fallback, evaluated at the **measured** pelvis pose to the foot pose of §2.3.3.
  - Unreachable → its least-squares optimum, with the residual recorded.
  - The engine stop (hard + margin) is unchanged.
- Upper body (lumbar, thorax, neck, arms): the quiet-stance posture `qref`.

**2.3.5 Actuator commands → the unchanged `ActuatorLayer` (`{K, D, τ0}` per axis):**
- **Error and torque:** e = 2·vec(q* ⊗ q_target) (the controller's convention); τ0 = τ_ff + K·e + (D + dt·K)·ω_ref (velocity feed-forward on swing legs only).
  - ω_ref = 2·vec(q_target,prev* ⊗ q_target) / dt, zeroed at schedule-phase changes.
- **Gains:**
  - upper body and stance legs: the controller's body-scaled `gain` (K = κ·m_sup·g·L, D = 2ζ√(K·m_sup·L²));
  - swing legs: `gainSwing` (validated 4 Hz bandwidth from the distal subtree inertia);
  - stance ↔ swing gains blend linearly over 0.03 s after each scheduled event.
- **τ_ff:** the controller's inverse statics, unchanged formula, with g_eff = (0, −g, 0) and stance-foot ground forces F_n = s_n·M·g·(u_x, 1, u_z).
  - u is the direction from the foot contact point (pivot edge, or sole centroid when flat) to the measured whole-body COM (LIPM: ground force through the COM).
  - The locked-axis B1 feed-forward (`lockedAxisFF`, `ffLockedAxis` of PSTAR5CHABV) is used as in the controller.
- **Shares s_n:**
  - 1 for the only scheduled stance foot;
  - in double support the trailing share falls 1 → 0 (min-jerk over the double-support interval) and the leading share rises;
  - 0 in swing / flight;
  - every share change after a touchdown / liftoff event is blended over 0.03 s.
- **FALLEN:** all joints hold `qref` with `gain` and gravity-only statics (no gait). Velocities are untouched.

### 2.4 Disturbances (deterministic, no randomness; all at an identical gait phase per speed)

**Timing:**
- t_d = the first left-foot mid-stance (D1, D2, D3, D5, D2c) or left-foot mid-swing (D4) at or after t_g + T_ramp + 3 s.
- The run continues 3 s after t_d, or ends 2 s after FALLEN.

**Pulses** (G2's `addForceAt`, ledgered):
- Force J / 0.03 s for 0.03 s, direction +x (toward the character's right, i.e. a hit from the left).
- The point is fixed in the struck body's frame:
  - **thorax-left:** the thorax collider vertex with minimum local x among the vertices in the top 25 % of its local y-range (shoulder level);
  - **shank-left:** the left-shank collider vertex with minimum local x among vertices within ± 10 % of its mid-height.
- The same body-local points are used at every speed.

**Impactor D2c (genuine collision):**
- A dynamic rigid capsule (radius 0.12 m, half-height 0.15 m, vertical axis), mass 20 kg (inertia from shape).
- Gravity factor 0, LinearCast CCD, body–body friction 0.4, restitution 0.
- Created in the existing world through its body interface (new file only); contacts are reported as an obstacle index.
- Velocity (v_i, 0, v_ref(t_s)) with v_i = 1.5·J_mod / 20 kg, i.e. incoming relative momentum = 2 × the moderate impulse.
- Spawned at t_s = t_d − 0.20 m / v_i, with its centre 0.12 + 0.20 m to the −x side of the thorax-left point's position at t_s (same height and forward position). It reaches the character with an unchanged relative path.
- Removed from the world 0.5 s after spawning.
- **Transferred impulse** = 20 kg × the impactor's velocity change (no other force acts on it). Struck segments and contact points come from the existing contact manifolds.

**Matrix** (per speed; × 3 speeds = 21 runs; every run executed twice):

| case | where | when | impulse |
|---|---|---|---|
| D0 | none | — | — |
| D1 small | thorax-left, +x | left mid-stance | 0.25·J* |
| D2 moderate | thorax-left, +x | left mid-stance | 0.75·J* |
| D3 large | thorax-left, +x | left mid-stance | 2·J* |
| D4 swing leg | shank-left, +x | left mid-swing | 0.75·J* |
| D5 stance leg | shank-left, +x | left mid-stance | 0.75·J* |
| D2c collision | impactor at the thorax-left point (it may strike the arm first) | left mid-stance | incoming 1.5·J* (transfer measured) |

## 3. Frozen numbers

From `derived.json` (`scripts/derive.mjs` on the t = 0 state; `derive_reach_explore.txt`) and `gait_inputs.mjs` (provenance inside).

**Body:** V2-REF, M = 78.91 kg.
- Boot half-length 0.1057 m, so T_c = M·g·0.1057 = 81.80 N·m on each rotational axis.
- Whole-body inertia about the pelvis COM (x, y, z) = 13.77 / 1.239 / 14.61 kg·m².
- Vertical caps: +1161.2 N / −193.5 N.

| | walk | jog | run |
|---|---|---|---|
| v (m/s) | 1.2 | 3.0 | 6.0 |
| step frequency (Hz) / step (m) | 1.8113 / 0.6625 **(pack-derived)** | 2.8 / 1.071 *(provisional)* | 3.2 / 1.875 *(provisional)* |
| contact t_c (s) / swing apex (m) / ramp (s) | 0.7082 / 0.03 / 1.0 | 0.26 / 0.10 / 1.5 | 0.15 / 0.18 / 3.0 |
| stance sweep v·t_c (m) | 0.850 | 0.780 | 0.900 |
| support height dh (m) | −0.09 | −0.07 | −0.10 |
| touchdown / liftoff pitch (°) | 5 / 15 | 10 / 15 | 10 / 15 |
| lateral reach R (m) | 0.38 | 0.34 | 0.40 |
| h_COM,ref (m) / ω (1/s) | 0.9373 / 3.2352 | 0.9573 / 3.2013 | 0.9273 / 3.2526 |
| F_h = M·ω²·R (N) | 313.85 | 274.95 | 333.94 |
| J* = M·ω·R (N·s) | 97.01 | 85.89 | 102.67 |
| D1 / D2, D4, D5 / D3 (N·s) | 24.25 / 72.76 / 194.02 | 21.47 / 64.42 / 171.78 | 25.67 / 77.00 / 205.33 |
| impactor v_i (m/s) | 5.457 | 4.831 | 5.775 |

**Notes:**
- Walking contact time is the pack's: interpolated cadence and double support at 1.2 m/s (C M / H F/D).
- Jog / run timing is **provisional diagnostic** (Amendment 1): not production locomotion parameters, not literature-verified here. Dorn, Schache & Pandy 2012, Table 2 was fetched but is image-only.
- Support height, pitches and R come from V2's own bounded IK in the hard anatomical box. The soft box cannot hold a flat mid-stance foot below 5 cm of pelvis drop (ankle dorsiflexion); `derive_reach_explore.txt`.

## 4. Procedure

### 4.1 Calibration of f (undisturbed D0 only; the only tuning in SLP-1)

- D0 at the three speeds for f ∈ {1, 2, 4} Hz (9 runs, each twice).
- **f = the softest value meeting every architecture criterion A1–A6 (§6.1) at all three speeds.** It is then frozen for the matrix, recorded in the results, never changed after any disturbance run.
- **If no f ≤ 4 Hz meets A1–A6:** stop (user stop rule: the support has to become effectively rigid, or undisturbed motion needs forces beyond the frozen caps). Report the limiting criterion, speed and cause. No cap is raised.

### 4.2 Matrix and runs

- The 21-case matrix at the calibrated f. Every run executed twice; end hashes must be identical.
- One physics rate (240 Hz), PSTAR5CHABV controller construction (geometry / IK / gains only), `V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13`, solver iterations as validated (150 velocity / 2 position). Nothing optimised (Amendment 4).

### 4.3 CPU

- Per-step component times from the simulator's own counters: Jolt step, passive, driver (SLP-1 control), actuators, diagnostics.
- Measured on D0 at each speed, 3 trials, same machine and instrumentation as `baseline/cpu_baseline_cf6_B0.1.txt` (autonomous CF-6 walk) and `../perf/perf_bench.json` (autonomous quiet stance).
- Plus a lean measurement with the ankle probes and the trace off.
- Like-for-like is per physics step. Autonomous V2 cannot walk at these speeds, so there is no per-speed comparison.

## 5. Recorded (every run; 60 Hz trace + per-step events + per-second hashes)

**Trajectory and support:**
- commanded vs realised pelvis / COM trajectory and speed;
- α, m̂ and ‖ξ − ξ_ref‖;
- support force / torque per axis, saturation flags, support work; `authorityWrites`.

**Articulated response:**
- per-segment pose; pelvis and thorax displacement and rotation vs reference;
- COM and DCM;
- joint hard-limit margin (min) and actuator saturation per tick;
- Δτ0 per tick.

**Feet:**
- per-foot 20 N contact (the pack's H threshold), touching pieces, schedule phase;
- planted-foot slip; IK residuals;
- leg-carried vertical load (both feet's ground Fz) vs S's vertical force.

**Disturbance:**
- applied impulse / point / body;
- impactor contacts (struck segments, points), transferred impulse;
- support impulse in the disturbance window;
- foot phase and contact state at the disturbance.

**Integrity:**
- energy ledger: E − E0 vs W_act + W_S + W_ext − passive damping (residual and its positive increments Σ+);
- finite state; G1 position-correction (teleport) invariant.

**Other:** CPU per component; end and per-second hashes.

## 6. Criteria

### 6.1 Architecture criteria (A); undisturbed steady window = [t_g + T_ramp + 1 s, end]

- **A1:** realised mean forward speed within ± 5 % of v.
- **A2:** pelvis horizontal position error RMS ≤ 30 mm and maximum ≤ 100 mm [ENG presentation tolerance].
- **A3:** S saturated (any axis) on ≤ 5 % of ticks.
- **A4:** α ≥ 0.99 throughout, and no FALLEN.
- **A5:** integrity.
  - Finite state; `authorityWrites` = 0; caps never exceeded.
  - No position correction > 20 mm in a tick (teleport scale).
  - Energy: no unledgered generation, i.e. cumulative positive closure Σ+ ≤ 5 J per run [ENG; ≈ 0.35 % of the body's kinetic energy at 6 m/s].
- **A6:** contacts stay live, i.e. the boots make physical turf contact in every scheduled stance (≥ 1 tick at ≥ 20 N), and no body is excluded from collision.

### 6.2 Locomotion-authoring metrics (L; reported, never pass / fail)

- foot-contact pattern vs schedule (early / late / missed, flight);
- leg-carried vs support vertical load fraction;
- planted-foot slip; IK residuals and swing tracking;
- actuator saturation and joint margins;
- visual / physical plausibility as an articulated runner (replay inspection, described).

A shortfall here is an **authoring deficiency** (LOC-1's domain), not an SLP-1 architecture failure, unless it breaks an A criterion.

### 6.3 Disturbance progression (descriptive, per case)

1. **retained:** α ≥ 0.99, and peak pelvis horizontal deviation ≤ the D0 maximum + 20 mm.
2. **displaced / recovering:** α ≥ 0.99, with a larger deviation that returns inside the D0 envelope within 1.5 s.
3. **substantially disrupted:** α < 0.99 at some time with recovery to ≥ 0.99, **or** stride disruption: a scheduled stance without contact, a planted-foot slip > 20 mm, or a touchdown > 50 mm from its target.
4. **support lost:** α < 0.05.
5. **fell:** FALLEN.

Each case reports the α and m̂ time series, peak deviations, support impulse, contacts and the final state. Torso (D2), swing leg (D4) and stance leg (D5) are compared at matched impulse.

### 6.4 Collision-cancellation test (user stop rule)

- For each disturbance: the support's impulse opposing the disturbance direction over [disturbance start, +0.10 s], divided by the disturbance impulse (D2c: transferred).
- **"Substantially cancelled" iff ≥ 0.5.**
- Also reported: the body's lateral momentum change over the same window, divided by the disturbance impulse.

### 6.5 Loss-continuity test (user stop rule)

- At the first α < 0.05: the largest per-tick whole-body COM velocity change within ± 0.1 s, and whether any write occurred (`authorityWrites`).
- **Discontinuous iff any per-tick change > 0.5 m/s, or any write.**

### 6.6 Stop rules (user's, verbatim intent)

Stop immediately and report, without tuning around the result, if any of these occurs:
- the support has to become effectively rigid to track (§4.1);
- collision response is substantially cancelled by support (§6.4);
- ordinary undisturbed motion requires forces beyond the frozen caps (A3 / A1 / A2 failing because of saturation);
- support loss produces discontinuous state / momentum (§6.5);
- the body becomes numerically unstable (A5);
- the architecture requires changing V2 physical properties.

### 6.7 Outcome

- **SLP-1 passes its architectural purpose** iff:
  - calibration finds f ≤ 4 Hz meeting A1–A6 at all three speeds;
  - no stop rule fires in the matrix;
  - D2c shows a collision propagating through the articulated body (struck segments, momentum transfer, ρ < 0.5).
- **Otherwise it fails**, with the first failing item and its classification:
  - architecture: support design, cap insufficiency, integrity;
  - locomotion authoring;
  - V2 body limit.

After reporting: no locomotion polishing, LOC-1, tackling, recovery, TD2C / E2 or further development without the user.

## 7. Unchanged and bypassed

**Unchanged:**
- All V2 bodies, masses, inertias, colliders, joints and hard / engine limits;
- the passive tissue layer; `ActuatorLayer` and capacities;
- contact model and friction; gravity; 240 Hz; solver settings;
- G1 / G2 integrity accounting and hashing.

**Reused unchanged:** `StandController` geometry, `legIKBounded`, `gain` / `gainSwing`, `qref`, `lockedAxisFF`; `stepSegment`; `bootSole`.

**Bypassed in SLP-1 runs:**
- `StandController.compute`: balance law, CoP planning, allocation, posture-height law, swing servo, lifecycle;
- the supervisor, T-A capture, the E2 planner / sequencer;
- every CF layer.

**Regression:** with SLP-1 code present, the probe / CF-1 … CF-6 battery must reproduce its 106 / 106 end hashes, and `tools/v2_component_regressions.mjs` must pass as before.

## 8. Not claimed

SLP-1 does not establish any of the following:
- gait quality or football validity, or final parameters;
- turning, acceleration patterns, multi-player play, tackles or recovery;
- robustness beyond 21 cases;
- realistic falls (no protective responses);
- 22-player real-time cost;
- reconciliation of a displaced body with the authoritative trajectory (an open architecture item).

## 9. Changes from the approved draft (before freezing, with reasons)

1. **Support motors in PositionAndVelocity mode** (target velocity = v_ref). A position-only spring damps absolute velocity: lag 2ζv/ω_s = 0.5 – 1.9 m at 6 m/s. Still the turf ↔ pelvis constraint of the draft.
2. **Vertical feed-forward through the target offset; vertical up-cap 1.5·M·g (draft M·g).** The schedule gives S the full body weight in flight / swing-only instants; the 0.5 g headroom is for vertical tracking.
3. **Leg IK in the hard anatomical box (draft: soft).** See §3. The engine stop is unchanged.
4. **R = lateral outward one-step reach at the support height** (the draft also named forward). The forward touchdown is at the reach boundary by construction of dh, so a forward adjustment reach is degenerate. The matrix is lateral.
5. **Leg IK at the measured pelvis (draft: reference).** Feet are placed at world footholds whatever the pelvis displacement; legs never fight S.
6. **Impactor speed rule v_i = 1.5·J_mod / m_i (draft: 2 m/s)**, so that D2c is comparable with D2.
7. **Disturbance points and direction fixed** (thorax-left / shank-left, +x).

## 10. Amendments

None at freezing.
