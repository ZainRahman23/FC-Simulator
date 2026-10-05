# Swing-foot and put-down trajectories: implementation study (delegated; recorded unchanged in substance)

**What this is:** a study by a research subagent, 2026-10-05, made from shallow clones read directly (not run).

| repository | commit | licence |
|---|---|---|
| BLF | bae82641 (2026-09-22) | BSD-3 |
| IHMC open robotics software | develop@1dfb74b0 (2026-10-04) | Apache-2.0 |
| PyPnC | 6ac1ebd8 | MIT |
| MIT Cheetah-Software (swing files only) | master | MIT |
| OCS2 (swing files only) | main | BSD-3 |
| Ruckig (cited) | — | MIT |

Equations may be referenced freely. Copied code keeps its notice; Apache-2.0 also needs the NOTICE file and a change statement. **No code is copied into Touchline; only the published equations are used.**

## 1. BLF `SwingFootPlanner` (`src/Planners/src/SwingFootPlanner.cpp`)

- **Shape:** planar xy spline + separate z spline. `interpolation_method`: `min_acceleration` (**the default**, `CubicSpline`, velocity boundary conditions only, so the initial acceleration is dropped) or `min_jerk` (`QuinticSpline`, C2).
- **Orientation:** `SO3Planner`, R(t) = exp(s(t)·log(R_f R_0ᵀ))·R_0, with s(t) a quintic (Lynch & Park §9.2). Initial ω and ω̇ must be parallel to the rotation error.
- **Quintic segment** (`QuinticSpline.h` 266–295), Δ = x_f − x_0:
  - c0 = x0, c1 = v0, c2 = a0/2;
  - c3 = [20Δ − (12v0 + 8vf)T − (3a0 − af)T²]/(2T³);
  - c4 = [−30Δ + (16v0 + 14vf)T + (3a0 − 2af)T²]/(2T⁴);
  - c5 = [12Δ − 6(v0 + vf)T + (af − a0)T²]/(2T⁵).
- **Parameters:** `step_height`, `foot_apex_time` ∈ (0, 1); optional (default 0) `foot_landing_velocity`, `foot_landing_acceleration`; take-off velocity / acceleration are parsed but unused. Apex = max(z_prev, z_next) + step_height. Test file: 0.1 m, apex 0.5.
- **End conditions:** planar v = a = 0; z v, a = the landing values; ω = ω̇ = 0.
- **Replanning:** `advance()` rebuilds the SE(3) trajectory every tick **from the planner's own previous output (p, v, a) at t − dt**, not from the measured state. The apex knot is dropped once past.
- **Contact semantics:** `PlannedContact` [activation, deactivation) is separate from `EstimatedContact` (`isActive`, `switchTime`). The planner's in-contact flag is plan-only. `FixedFootDetector`'s own header warns that it ignores the robot state and recommends `SchmittTriggerDetector`: make / break thresholds with dwell times, plus a separate `edgeTime` (first crossing).

## 2. IHMC (`ihmc-common-walking-control-modules/.../commonWalkingControlModules/`)

- **Start:** `SwingTrajectoryCalculator.setInitialConditionsToCurrent` uses the **measured** sole pose / twist, raises v_z to a minimum lift-off velocity, and clips the initial speed.
- **Shape:** `TwoWaypointSwingGenerator` (waypoints at 15 % / 85 %, swing height 0.1 m default; Zulu min 0.025 m) and `PositionOptimizedTrajectoryGenerator` (min ∫‖p̈‖², C2 but non-zero end accelerations). Executed as cubic segments.
- **Touchdown:** v_td = `desiredTouchdownVelocity`/min(T, 1) (Zulu −0.15 m/s, a_td −2 m/s², xy weights soft). For t > T: p = p_f + v_td(t − T) + ½a_td(t − T)², **unbounded**, until contact is sensed.
- **Swing ends only on sensed contact:** fraction > 0.6 AND `WrenchBasedFootSwitch` (F_z > low for 2 ticks with CoP inside by a margin for 3 ticks, OR F_z > high; 2-tick glitch filter; Zulu 50 N / 75 N / 4 mm). A late touchdown starts the fall transition.
- **Replanning:** step adjustment re-blends through `C1ContinuousTrajectorySmoother`: e0 = old reference − new base at the change, output base + e(t), ë = −Ke − 2ζ√K ė, **K = 600 s⁻², ζ = 0.8** (ω ≈ 24.5 rad/s ≈ 3.9 Hz). Swing speed-up is a time warp, k ≤ T/T_min (T_min 0.35–0.45 s).
- **Abort:** `AbortWalkingMessage` → TO_STANDING; `WalkingSingleSupportState.onExit` → `triggerTouchdown()` → `setFlatFootContactState`. **Contact is declared by the controller; there is no put-down trajectory. This contradicts Touchline's rule (physics owns contact) and is not adopted.**

## 3. PyPnC (`pnc/wbc/manager/foot_trajectory_manager.py`)

- Measured start with zero initial velocity; two cubic Hermite segments through mean + `swing_height`; C1 only.
- **Derivatives are not rescaled by ds/dt = 2/T: the velocity / acceleration feed-forward is not in SI units. Not copied.**
- Swing end is time-based (the early-contact check is commented out). Contact transitions ramp `rf_z_max`.
- Draco3: 1.0 s swing, 0.03 m height, 1.0 s transition. Atlas: 0.75 s, 0.05 m, 0.45 s.

## 4. Other references

- **MIT Cheetah** `FootSwingTrajectory`: p0 + Δ(3φ² − 2φ³), z in two halves; zero end velocity, end acceleration ±6Δ/T² (C1).
- **OCS2** `SwingTrajectoryPlanner`: z two cubics, ż = 0 at the apex; lift-off 0.2, touchdown −0.4 m/s, height 0.1 m, scaled by min(1, T/0.15).
- **Flash & Hogan 1985** (*J. Neurosci.* 5:1688): minimum jerk x0 + Δ(10τ³ − 15τ⁴ + 6τ⁵); peak speed 1.875Δ/T, peak acceleration 5.77Δ/T², endpoint jerk 60Δ/T³.
- **Kröger & Wahl 2010** (Reflexxes, *IEEE T-RO* 26(1)); **Berscheid & Kröger 2021** (Ruckig): online trajectory generation from an arbitrary current (p, v, a), the formal "replan from current state".
- **Bledt et al. ICRA 2018** (contact-model fusion): early / late contact vs plan from sensed contact. Cited from memory; not re-read.

## 5. Recommended design (the reviewer's; adopted with the changes noted in `../ABORT_PUTDOWN_DESIGN.md`)

**Common rule:** start every (re)plan from the **current reference state** (p, ṗ, p̈) — the BLF pattern. Starting from the measured state steps the target by the tracking error (a K_p·e torque step).

**Duration from servo bandwidth (no failure data):** with PD + velocity feed-forward, ë + 2ζωė + ω²e = p̈_d, so |e| ≲ max|p̈_d|/ω². For a quintic of amplitude Δ, max|p̈_d| ≈ 5.77Δ/T², so **T ≥ √(5.77Δ/e_max)/ω_n**. With ω_n = 2π·4 rad/s: 10 % relative error → T ≥ 0.30 s; 5 % → 0.43 s. An ideal second-order simulation of h = 20 mm: peak error 5.9 mm (29 %) at T = 0.1 s, 1.6 mm (8 %) at T = 0.3 s.

**(a) Abort put-down:**
- T_put = 0.30 s; start = the current target (p, v, a); end = the anchor, horizontal v = 0, **v_z,td = −0.05 m/s**, a = 0, ω = 0.
- For h = 20 mm: monotone; peaks 0.105 m/s, 0.97 m/s², 31 m/s³ (vs the 0.1 s min-jerk ramp's 0.375 m/s, 11.5 m/s², 1200 m/s³). The target-side torque-rate proxy is about 6× lower.
- Past t_c: z = z_anchor + v_td(t − t_c) (C2 because a_f = 0), **bounded** by a quintic stop about 5 mm below the anchor, around t_abort + 0.4 s.
- Contact: only Jolt normal force through a Schmitt trigger (make / break thresholds + 2–3 tick dwell). Accept at any time (the foot is already unloaded; no minimum fraction).
- On contact: freeze the reference, hand over to the stance hold with a continuous vertical reference; blend the remaining velocity feed-forward to zero (or a C1 smoother). No contact by t_abort + 0.4 s → fault; never declare contact from the plan.

**(b) E2 first short step:** same machinery. xy quintic to the footstep (v = a = 0 at the end); z spline through the apex (α = 0.5, ż = 0) to (z_f, v_td, 0), C2 at the apex. T_sw 0.6–0.8 s, apex 3–5 cm, v_td −0.05 m/s; bandwidth check L = 0.15 m at T = 0.6 s ≈ 3.8 mm error, a 4 cm apex over 0.3 s ≈ 4.1 mm. An abort mid-swing is a replan from the current reference to the anchor with T_put.

**Planned vs detected contact:** t_c only schedules the reference. Contact state, stance switch and timing come from the physics-derived trigger; log the trigger's edge time as the touchdown time.
