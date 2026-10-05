# E1b fix: design (configuration version PSTAR2)

**Authority:** the user instruction of 2026-10-05 (`../sources/2026-10-05_user_instruction_close_e1b_prepare_e2_reuse_first.md`).

**Status:** written and committed **before any run of the final mechanisms**. Every parameter below is fixed here, from evidence or from established practice, never from E1a / E1b results. The earlier diagnostics (`../e1a/e1b/diag_abortramp/`, the interim foot-yaw diagnostic recorded in E1-4) used different mechanisms or parameters. They showed what was missing; they did not set any value used here.

**Evidence:**
- `research/YAW_PATH_REVIEW.md`: stance foot-yaw evidence (two reports; the final one supersedes).
- `research/SWING_PUTDOWN_STUDY.md`: BLF / IHMC / PyPnC / Cheetah / OCS2 swing and put-down code.
- `../e2/research/E2_REUSE_STUDY.md`: first-step reuse study.

## 0. Summary

| failure | root cause (`../e1a/E1B_RESULTS.md`) | fix | option (default off) |
|---|---|---|---|
| **E1b-17** (V2-REF yaw 2.27° at +3 s) | the stance foot-yaw axis is passive-only. Its tissue spring (k 0.13 N·m/°) is the only yaw restoring path in single support, so the mode is lightly damped | an **active, finite-torque foot-yaw actuator**, sharing the subtalar capacity with inversion, driven by the controller's **existing** ankle rows | stand `footYaw: true` |
| **E1b-7** (P15 abort Δτ 22–38 N·m) | the supervisor clears the swing target in one tick (a 20 mm target step) | a **quintic put-down from the current reference state** to the contact anchor (BLF `SwingFootPlanner` min-jerk segment), over the swing servo's bandwidth duration; physics decides touchdown | stand `lcPutDown: true` |

**PSTAR2** = PSTAR (`../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`) + `footYaw: true` + `lcPutDown: true`.

**Unchanged:**
- anatomy, skeleton contract, joint axes, ROM / soft / hard limits;
- mass;
- the passive tissue laws, including the ankle foot-yaw spring k 0.13 N·m/° and its evidence;
- the spec capacity table (`CAPACITY`);
- feet, physics rate, and every PSTAR option;
- the E1 protocol and criteria.

With both options off, the code is bit-identical: KV0 identical, suite 58 / 58, and the official PSTAR E1b runs reproduce hash-identically (V2-REF none 23 / 23, P15 21 / 21 marks).

## 1. E1b-17: the active foot-yaw path

### 1.1 Reuse-first

| question | answer |
|---|---|
| Is it solved in PyPnC / IHMC / BLF? | **Yes, by construction:** their robots have no yaw joint below the hip. Foot yaw is rigid to the shank, and the stance-leg actuators react yaw against contact friction. IHMC holds a stance foot with a zero-acceleration task, and a lightly loaded foot's yaw with PD. |
| Can it be adapted directly? | **No.** |
| What Touchline-specific difference prevents direct adaptation? | Touchline's ankle has an anatomical foot ab/adduction axis (subtalar-type, ROM ±10° active, ±15° hard). It is approved as **passive-only**, so making it rigid would change anatomy. The human path is muscular: the subtalar supinators / pronators, with about 20 mm moment arms. Every character model checked except Geijtenbeek 2013 motorises foot yaw, e.g. dm_control's CMU humanoid uses a 20 N·m axial motor + 10 N·m/rad spring + 2 N·m·s/rad damping. |
| What we adopt | The established **mechanism**: an active, finite-torque actuator on that axis. Its capacity comes from human evidence, not from robot stiffness. The passive tissue law stays exactly as approved. |

### 1.2 Capacity (fixed from evidence)

- **T_yaw = k · T_subtalar.** k = 0.64 is the vertical direction cosine of the subtalar axis, i.e. sin(elevation): Inman 0.669, gait2392 0.605; review range 0.60–0.67.
- T_subtalar is the **approved** spec capacity: inversion 0.50, eversion 0.45 N·m/kg.
- **Adduction** (supination side) = 0.64 × 0.50 = **0.320 N·m/kg**. **Abduction** (pronation side) = 0.64 × 0.45 = **0.288 N·m/kg**.
- At 78 kg that is 25.0 / 22.5 N·m. The review's nominal is 25 / 21, its range 18–35 N·m.
- Code: `spec/v2_actuators.js` `footYawFromSubtalar()`, `FOOT_AXIAL_SHARE`. The capacity is **not** added to `CAPACITY`, so `jointAxisCapacities` and the passive layer are untouched.
- **Force–velocity and activation:** the subtalar axis's own Hill parameters (ω0 12 rad/s, curvature 0.45, eccentric 1.20) and the common activation dynamics (15 / 50 ms).
- **Sensitivity** (reported in the validation): k = 0.38 and k = 0.90, about 15 and 35 N·m at 78 kg (the review's sensitivity bounds).

### 1.3 Shared budget with inversion

The same muscles produce both components, so the two axes share one budget.

- **Rule:** |τ_inv|/T_inv + |τ_yaw|/T_yaw ≤ 1. This is the conservative sum bound; the review's inference is a max rule for same-sign pairs and a sum rule for opposite-sign pairs, and the sum rule covers both.
- **Inversion has priority** ("don't let the shared budget starve frontal balance"). The yaw axis gets the remainder of the inversion row's budget at its request (clipped to its activation limits): T_yaw,eff = (1 − |τ_inv,req|/T_inv,dir) · T_yaw.
- **Exact enforcement:** the yaw actuator's Jolt motor limits are [−a·T_yaw,eff,−, +a·T_yaw,eff,+], so the active torque never exceeds the budgeted capacity. The ledger's over-capacity check runs against the budgeted value.
- Code: `sim/v2_actuation.js` `compute()`. The yaw row is computed after the joint's other rows; without `footYaw` the order and values are unchanged.

### 1.4 Control: the existing ankle rows, no new gains

The yaw axis gets the same row the controller already computes for every ankle axis (`ctrl/v2_stand.js`):

| state | stiffness K | damping D | τ0 |
|---|---|---|---|
| support | 0 | `ankleD` = 2.0 N·m·s/rad | the inverse-statics projection on the axis |
| non-support | swing ankle gains (blended continuously in the support weight s) | swing ankle gains | swing feed-forward |

- **The damping is the existing value, not tuned.** It matches the only direct measurement of axial ankle damping: 2.25 N·m·s/rad (Ficanha 2015).
- **The active part stays separate from the passive part.** The tissue spring stays in the joint's passive motor rows. The active torque is the parallel actuator constraint, with its own ledger (work, saturation, capacity fraction).
- **Rejected alternative: a stiffer yaw target (the review's K 15–40, B 5–14).** It would introduce new controller gains. The existing rows are the minimal change. If they fail, that is reported, not tuned.

## 2. E1b-7: the abort put-down

### 2.1 Reuse-first

| question | answer |
|---|---|
| Is it solved in PyPnC / IHMC / BLF? | **Partly.** BLF `SwingFootPlanner` re-plans a **quintic (min_jerk) from its own previous reference output (p, v, a)** to the next contact every tick, so the reference stays C2 when the target changes. IHMC re-blends with a C1 smoother. **IHMC's abort declares contact (`triggerTouchdown` → flat-foot contact state) with no put-down trajectory; PyPnC's swing ends on time.** |
| Can it be adapted directly? | **The trajectory, yes:** the BLF quintic closed form, implemented from the equations (no code copied). **The contact semantics, no.** |
| What Touchline-specific difference prevents direct adaptation? | **Physics owns contact.** The plan only schedules the reference; touchdown, hand-back and timing come from the lifecycle's Jolt contact / load (BLF's `PlannedContact` vs `EstimatedContact` separation, with the estimate authoritative). Touchline's swing servo is a finite-torque joint PD with contact-consistent velocity feed-forward (`lcVff "lin"`), not an inverse-dynamics QP. The duration therefore comes from that servo's bandwidth. |

### 2.2 The trajectory (fixed)

- **Start: the current reference state, not the measured foot** (BLF pattern). This is the commanded swing target's pose, plus its velocity and acceleration from second-order backward differences of its last three ticks. Starting from the measured foot would step the target by the tracking error.
- **Goal:** the contact anchor (`lifecycle.feet[n].hold`, captured on the turf at release), **frozen at the abort**. Velocity and acceleration are 0 at the goal.
- **Shape:**
  - position: one BLF quintic per world axis;
  - orientation: R(t) = R_goal·exp(θ(t)), with θ a quintic of the rotation vector from log(R_goalᵀR_0) to 0.
- **Duration from the servo bandwidth (no failure data):** with PD + velocity feed-forward the tracking error satisfies |e| ≲ max|p̈_d|/ω². A rest-to-rest quintic of amplitude Δ peaks at (10/√3)Δ/T². So a relative error ε needs **T ≥ √(10/(√3·ε))/ω**.
  - ε = 0.10 and the lifecycle's `swingHz` = 4 (ω = 25.1 rad/s, ζ 0.8) give **T_put = 0.302 s**, about 1.2 servo periods.
  - For comparison, IHMC's minimum swing time is 0.35–0.45 s and the frozen E1 protocol's replace is 0.4 s (E1a) / 0.6 s (E1b).
  - For a 20 mm put-down the reference peaks at 0.124 m/s and 1.26 m/s² (the 0.1 s diagnostic ramp peaked at 0.375 m/s and 11.5 m/s²).
- **Terminal velocity 0** (BLF default `foot_landing_velocity` 0, PyPnC and Cheetah; the frozen protocol's replace).
  - Rejected: the study reviewer's −0.05 m/s with a bounded below-surface extension. The anchor is the surface the foot left, so no ground search is needed.
  - A below-surface reference would press the foot and step at the hand-back. Measured precedent: a 3.7 mm target step gave an 88 N·m τ0 jump.
  - In the protocol's own replace the foot touches down 17–25 ms **before** a rest-ending target reaches the anchor (all 8 official E1b runs).
- **After T_put** the reference holds the goal.

### 2.3 Contact and hand-back (physics-authoritative)

- **The supervisor never declares contact.** The lifecycle decides TOUCHING / TOUCHDOWN from Jolt contact and load, unchanged.
- **Hand-back** (swing target cleared): at the first contact-state tick once the segment has ended. This is the frozen protocol's replace rule. The cleared target is the lifecycle's anchor (with PSTAR's reseed, the resting foot's own horizontal pose), so it stays continuous.
- **The request stays at stance until contact** (H9). Return to bilateral starts at the first contact tick, as before.
- **If no contact occurs,** the reference stays at the anchor and nothing is declared. A late touchdown fails E1b-18; it is never rescued.
- **Logged:** each put-down's start, T, start velocity / acceleration, first contact tick and hand-back tick (`g3.putDownLog`; the harness `putDown` field).
- Code: `ctrl/v2_swing.js` (quintic, rotation log / exp, reference state, segment, duration); `gates/v2_g3.js` `supervised()` (option `lcPutDown`). The state is plain data, so JSON controller snapshots stay valid. The diagnostic `lcAbortRamp` is kept unchanged; `lcPutDown` supersedes it when both are set.

## 3. Risks declared before any run

1. **The yaw actuator changes G2 / G3 stance dynamics** wherever an ankle is in support, because the yaw axis gains active damping 2.0 plus the statics feed-forward. The G0–G3 regression must show no material change (the validation prereg defines this).
2. **Shared budget:** in strong single-stance inversion demand, the yaw path may have little capacity left. That is physical, and will be reported.
3. **E1b-18 timing:** T_put 0.302 s leaves about 0.1 s within the 0.4 s TOUCHDOWN bound. The protocol precedent (touchdown before the target ends) predicts touchdown at about 0.28–0.30 s. A miss is a failure, not a retune.
4. **The torque-step criterion is unchanged.** If the quintic put-down still exceeds 10 N·m applied, the abort trajectory is not tuned. It goes to the stop rule ("E1b still fails after the evidence-backed approaches have been exhausted").
