# SLP-1b — versioned amendment of SLP-1: the legs carry ordinary locomotion (FROZEN before any SLP-1b code or run)

**Status:** frozen at the commit that adds this file. No SLP-1b code and no SLP-1b run existed at freezing.

**Sources:**
- `../sources/2026-10-09_user_decision_slp1b_option_a.md` (verbatim; option A);
- the SLP-1 protocol `SLP1_PREREGISTRATION.md` (frozen 49785b7, amendments 1 – 2);
- the SLP-1 result `SLP1_RESULTS.md` (627d935).

**SLP-1 stays exactly as recorded.** Its code path is version "1" and must reproduce its calibration hashes (verified, §6). SLP-1b is version "1b" of the driver only.

## 1. Principle (user decision)

- **Trajectory / locomotion driver:** schedules physically feasible footholds, leg motion, propulsion and pelvis orientation.
- **V2 body / actuators / contacts:** execute it within existing capacity and joint limits.
- **Finite artificial support:** supplies only the residual stabilisation that replaces autonomous balance.
- **Recoverability / authority:** decides, from the resulting state, whether a disturbance is recoverable, and yields continuously toward physical falling.

The support must no longer provide the majority of ordinary forward propulsion or body support in an undisturbed run.

## 2. What changes: driver version "1b" only

### B1 — pelvis orientation and height through the stance legs: the existing controller's validated mechanism

This is `StandController` `posture: "ik"`, the adopted default. Its own text: "joint-space PD of hips / knees toward the configuration that keeps each foot where it IS with the pelvis at its reference orientation and height and its CURRENT horizontal position". The "task" pelvis-wrench mode was rejected in G2 step 3.

- **Stance leg:** bounded leg IK (hard box, unchanged) from the pelvis frame:
  - position = (measured pelvis origin x, reference pelvis origin height incl. B4's δy, measured pelvis origin z);
  - orientation = the reference orientation q0;
  - to the scheduled planted foot pose (stance roll unchanged).
- **Swing leg:** IK from the **measured** pelvis pose, the controller's non-supporting-leg "actual frame" (world-space foot servo), to the swing segment.
- **Blend:** frames blend with the stance weight w (the existing 0.03 s ramps) by linear position / normalised-quaternion interpolation.
- **Gains unchanged:** `gain` in stance, `gainSwing` in swing, blended by w.
- SLP-1 amendment 2 used the full reference pose for both legs. That is replaced in 1b.

### B2 — propulsion through the legs

- Each touchdown target is shifted back by the trajectory's acceleration at that stance's mid-time: sole-centroid forward position = hip_ref(t_mid) − a_ref(t_mid) / ω².
- The stance ground force keeps passing through the measured COM (unchanged inverse statics). Over a stance the legs' mean horizontal force is therefore M·a_ref: LIPM, ∫F_y·Δ / h = M·g·Δ / h per step.
- In steady motion (a_ref = 0) the footholds are as in SLP-1.

### B3 — body support through the legs

- **Walking-type schedules** (t_c ≥ T / 2, a foot always in contact): Σ F_y = M·g by the scheduled shares (unchanged).
- **Flight schedules** (t_c < T / 2, jog / run): each regular stance carries F_y(u) = F_pk·sin(πu), with F_pk = π·M·g·(T / 2) / (2·t_c), so the legs supply M·g per step on average.
  - Initial stances and the settle keep M·g by shares.
  - Ground force direction: through the measured COM (unchanged).

### B4 — the support tracks the motion the scheduled leg forces produce (residual-only support)

- Before t = 0, over the run's 240 Hz grid, the driver computes the deviation δ from the authoritative trajectory that its own scheduled leg forces cause. This is deterministic and open loop: scheduled footholds and contact points, the authoritative COM path; no measured state.
  - δa(t) = Σ_n F_n,sched(t) / M + g − a_ref(t);
  - F_n,sched = F_y,n·(1, horizontal (x_ref,COM − p_n,sched) / h_ref).
- δv = D(∫δa), δx = D(∫δv), with D(f)(t) = f(t) − mean of f over [t − T/4, t + T/4] (one step period, centred).
- So δ has zero mean over every step. It is the intra-step oscillation, not a new trajectory; the authoritative path stays the locomotion intent.
- **Support targets:** position p_ref + δx, velocity v_ref + δv.
- **Vertical feed-forward:** α·(M·(g + δa_y,impl) − Σ F_y,sched), with δa_y,impl = d(δv_y)/dt (≈ 0 when the legs carry the scheduled load).
- Walking-type schedules: δ_y = 0. δ_x is the LIPM speed oscillation of the scheduled footholds.
- The leg IK uses the same reference height (B1).

### Not restored (user)

- No balance law, CoP or capture-point planning, load-sharing decision, abort supervision or CF gait logic.
- No mechanism that decides the trajectory.
- Footholds, contact points, shares, forces and δ are fixed functions of the authoritative trajectory and the frozen gait inputs.
- The only measured-state terms are the existing ones: the inverse-statics force direction through the COM, the controller's measured-horizontal posture frame, and the swing leg's actual frame.

## 3. Unchanged

- **Support:** constraint, PositionAndVelocity motors, **caps** (walk / jog / run horizontal 313.85 / 274.95 / 333.94 N; vertical +1161.2 / −193.5 N; torque 81.80 N·m) and spring candidates {1, 2, 4} Hz.
- **Authority:** law, R, ω, J*.
- **Gait inputs:** timing, ramps, apex. Derived support heights and pitches.
- Leg IK hard box; gains; actuators; V2 body; 240 Hz; solver.
- Disturbance matrix and definitions (§2.4).
- Criteria A1 – A6 and the progression / cancellation / continuity tests.
- All Amendment 2 / 3 rules: no collision reading, no pose / velocity write, no cap excess, momentum preserved on support loss.

## 4. Added architecture criteria (user: "the support should no longer be expected to provide the majority …")

- **A7 — legs carry the majority of body weight.** Over the steady window: mean Σ ground F_y / (mean Σ ground F_y + mean support F_y) ≥ 0.5.
- **A8 — legs supply the majority of propulsion:**
  - (a) ramp window [t_g, t_g + T_ramp]: the support's net forward impulse ≤ 0.5·M·v (half the momentum the trajectory gains);
  - (b) steady window: the support's positive forward impulse ≤ 0.5·(support + ground positive forward impulses).
- Ground forces come from the existing ankle probes' contact impulse `Jc` (the foot's external contact impulse, world vector).

## 5. Procedure

1. **Calibration:** D0 at walk / jog / run × f ∈ {1, 2, 4} Hz, each executed twice. f = the softest value meeting **A1 – A8** at all three speeds.
   - If none: **stop and report** (user). Caps are never changed.
2. **Matrix (only if 1 passes):** the 21-case SLP-1 matrix (§2.4 of the SLP-1 protocol) with the 1b driver at the calibrated f, every run executed twice. Same reporting, plus §6.
3. **CPU:** sequential, as SLP-1 §4.3.
4. **Stop and report after SLP-1b.**

## 6. Reporting (in addition to SLP-1 §5)

**Per undisturbed speed:**
- achieved speed;
- body weight carried by support vs legs;
- forward propulsion by support vs ground (ramp net, steady positive);
- support saturation %;
- pelvis pitch / roll (vs q0);
- stance-contact fraction; foot slip; actuator saturation; joint-limit margins;
- tracking error (vs the authoritative path, and vs p_ref + δx); CPU;
- whether the motion is physical locomotion (A6 – A8, contacts, slip) rather than the support dragging the body.

**Time series** of support force, ground-reaction forces (per foot) and pelvis motion over one representative steady cycle at each speed: a figure plus the 60 Hz rows.

**SLP-1 preservation:** version "1" reproduces the SLP-1 calibration end hashes (walk f1 8619bbfb, jog f1 3841c86c, run f1 9a5908ef).

## 7. Amendments

None at freezing.
