# V2-G3 pass criteria, v1 (pre-registered before the final validation run)

**Sources:**
- the user's G3 instruction (`../sources/2026-10-03_user_instruction_g3_weight_transfer.md`, §0–29);
- spec §22 V2-G3 (rows 3.1–3.5, mapped in `../DECISIONS.md`: 3.3 "lift a foot 5 cm" is replaced by the brief's no-lift unloading);
- the G3 development measurements (`../DECISIONS.md`, G3 entries).

These criteria are written and committed **before** the final validation run (`tools/g3_run.js`). Like the G2 criteria, they were written after the exploratory development runs, so some thresholds were informed by measured physics. That history is in DECISIONS. Any later change is a recorded amendment, with both evaluations kept.

## Configuration under test

**Plant:** the accepted G2 plant, unchanged:
- G1 physics (240 Hz, 150 velocity / 2 position iterations, 10-piece boot, passive tissue as approved);
- G2 actuators (§14 capacity, activation).

**Controller:** `ctrl/v2_stand.js` (the accepted G2 standing controller) plus the G3 options `G3_STAND`:
- `contactSupport`;
- `holdUnloaded` (loadOff 1 % BW, loadOn 3 % BW);
- `ikFeasible`;
- `dcmFF`, the analytic DCM reference feed-forward, active only while a transfer is requested.

The transfer request is λ_R(t), a min-jerk profile. Everything else is at G2 defaults: no hip strategy, no arms, no latency, no noise, kξ = 1/3, κ = 1.5, ζ = 0.7. There is one configuration for every body.

**Supervisor:** `supervised()` in `gates/v2_g3.js`, used in T7, T8 and T11:sup. It applies only once the stance share is ≥ 0.85. If the required CoP lies more than 1 cm outside the stance foot's region for 20 ms, the request returns to λ = 0.5 over 0.6 s along a min-jerk path, without feed-forward.

## Definitions

| term | definition |
|---|---|
| **Load fraction** | load_R = Fz_R / (Fz_L + Fz_R). Fz is each boot's measured vertical contact force (per-foot probe: vertical contact impulse / dt). load_L = 1 − load_R. |
| **Transfer classes** (per tick; stance = the more loaded foot) | **bilateral**: stance load < 0.60. **partial**: 0.60–0.85. **strong**: 0.85–0.95. **near-single-support**: stance load ≥ 0.95, with the other foot still touching and carrying > 1 % BW. **unloaded**: the other foot carries ≤ 1 % BW but still touches. **contact loss**: the other foot has 0 touching boot pieces. |
| **Hold window** | From 0.5 s after a ramp ends to the end of the hold. |
| **Tracking RMS** | RMS of (load_R − λ_R) over every tick with total vertical force > 0.5 BW. |
| **Support geometry** | The convex hull of the usable regions of the feet that have ≥ 1 touching boot piece. A foot with no touching piece is excluded. |
| **Foot displacement (slip)** | The largest horizontal displacement of a foot origin from its start. **Lift**: the largest rise of a foot origin. **Tilt**: the largest tilt of the foot's up axis. |
| **Outcome** | As G2: stood / recovered (QUIET ≥ 0.5 s at the end), foot relocated (slip > 20 mm), not settled, fell, step required → fell (ξ left the support before the fall). |
| **Inward push** | Toward the less loaded foot (L, FL, BL when standing on R). **Outward push**: toward the stance side. |
| **Mirror pair** | The same test on the other side: λ ↔ 1 − λ, and push directions mirrored L ↔ R. |

## Gate rows

| # | criterion | pass |
|---|---|---|
| **run** | Every job completes | 0 errors |
| **A** | **T0 bilateral baseline**: λ_R = 0.5 held for 20 s, G3 controller | Stood. Hold mean load_R in [0.47, 0.53]. Slip ≤ 1 mm. Contact loss 0 s. |
| **B** | **T1 / T2 strong transfer** 50 → 85 % → 50 (4 s ramps, 4 s hold), R and L | Stood. Hold load mean ≥ 0.83 and min ≥ 0.80. Tracking RMS ≤ 0.05. Final load_R within 0.5 ± 0.03. Slip ≤ 1 mm. Contact loss 0 s. Pelvis roll ≤ 5°, trunk lean ≤ 5°. |
| **C** | **T3 cycle** R 85 % → 50 → L 85 % → 50 | Row B for both holds. |
| **D** | **T4 repeated cycles**: 5 × (R 90 % ↔ L 90 %, 2 s ramps, 1 s holds) | Stood. Between the end of cycle 1 and the end of cycle 5: pelvis drift changes ≤ 5 mm and pelvis yaw changes ≤ 1°. Slip ≤ 2 mm. Hold load means of cycle 5 within 0.01 of cycle 1 (R and L). Final load_R within 0.5 ± 0.03. |
| **E** | **T5 / T6 near-single-support** R and L: λ → 0.97 over 4 s, hold 10 s, back | Stood. In the hold window: stance load min ≥ 0.95; the other foot touches throughout (≥ 1 piece); the COM stays inside the stance foot's region; the measured stance CoP stays inside it; ξ margin inside the stance foot ≥ 1.0 cm. Slip ≤ 1 mm. Pelvis roll ≤ 5°, trunk lean ≤ 5°. Final load_R within 0.5 ± 0.03. |
| **F** | **U unloading** the opposite foot, R and L: λ → 1.0 / 0.0 over 4 s, hold 6 s, back | Stood. The opposite foot is unloaded (≤ 1 % BW) for ≥ 3.0 s cumulatively. Unloaded foot: slip ≤ 2 mm, lift ≤ 5 mm (no active lift), tilt ≤ 3°. The COM stays inside the stance foot during the hold window. Final load_R within 0.5 ± 0.03. |
| **G** | **T7 speed sweep** (0.95, ramps 4 / 2 / 1 / 0.75 / 0.5 / 0.25 s, supervised) | 4 s and 2 s ramps, both sides: stood, slip ≤ 1 mm, no abort, hold load mean ≥ 0.93. Faster ramps are classified and reported as the speed envelope. They may fail, but only physically: row L applies. |
| **H** | **T8 perturbation during transfer** (thorax, 100 ms, 8 directions × 5 / 10 / 15 / 20 N·s; at the near-single-support hold and mid-ramp; both stances; supervised) | **H1:** every 5 N·s push (8 directions × 2 timings × 2 stances = 32) recovers with slip ≤ 20 mm. **H2:** every inward push of ≤ 15 N·s during the hold (3 directions × 3 magnitudes × 2 stances = 18) recovers with slip ≤ 20 mm. **H3:** no abort in the unperturbed supervised transfers T7 4 / 2 / 1 s. Boundaries per direction are reported. |
| **I** | **T9 body variants**: the near-single-support cycle (97 %, 4 s ramps, 4 s holds), all 8 bodies | Every body: stood; both holds have stance load min ≥ 0.95, the other foot touching and the COM inside the stance foot; slip ≤ 1 mm; final load_R within 0.5 ± 0.03. |
| **J** | **T10 mirror symmetry** (no per-side gains) | Mirror pairs T1/T2, T5/T6, U:R/U:L, T7 R/L (every ramp), and the T9 R/L holds of every body: \|Δ hold load mean\| ≤ 0.005, \|Δ tracking RMS\| ≤ 0.005, \|Δ max slip\| ≤ 0.5 mm (non-falling runs). T8 mirrored pairs: the same outcome class in ≥ 95 % of pairs, and in every 5 N·s pair. |
| **K** | **T11 excessive request**: λ → 1.2, 1.4, and 1.4 supervised | Not realised as a stable stance: the outcome is fell, step required → fell, foot relocated, or not settled. Row L holds, so there is no hidden rescue. The rate requests (0.97 in 0.25 / 0.1 s) are reported. |
| **L** | **Authority / energy / actuators**: every gate run | Authority writes 0. External impulse = the scheduled test impulse (to 1e-9 relative). Actuator over-capacity ticks 0. Energy residual ΔE − (W_active + W_external − damping) ≤ +0.5 J. |
| **M** | **Contact / foot**: T1–T6, U, T9 | Per-foot CoP change per tick ≤ 5 mm (t ≥ 0.5 s, foot load > 5 % BW), i.e. smooth across boot-piece seams. Seam crossings are reported. |
| **N** | **Determinism** | ×3 identical hashes for T3, T5, U:R and T8 hold R push R 10. Snapshot / restore bit-exact on U:R at 8 s (unloaded foot held), T8 hold R push L 15 at 3.9 s (before the push, supervised) and T3 at 10 s. |
| **O** | **Browser = Node** | Identical hashes for T5, U:R, T3 and T8 hold R push R 10. |
| **P** | **Earlier gates** | G0 8/8. G1 curated hashes and full results unchanged. G2 final run (620 jobs) re-run with every hash unchanged. |
| **Q** | **Force-plate twin** (spec 3.4): T0–T6, U | Whole-body momentum change vs (Σ per-foot contact impulses + gravity + test impulse): residual max ≤ 1e-3 of M·g·dt. |
| **S** | **Controller cost**: T5, V2-REF | Controller (state estimation, balance, transfer, leg IK, supervisor) mean ≤ 0.15 ms per tick, the spec §20 budget, as at G2. Physics cost reported separately (TD-1). |

## Reported, not gated

- **Speed envelope (T7)** and perturbation boundaries per direction and timing (T8). The supervisor-off grid is compared against them.
- **Mechanism ablations:** each G3 addition removed in the final configuration, i.e. what measured deficiency each one fixes.
- **Strategies:**
  - knee strategy: reference knee flexion 10 / 15 / 20°;
  - hip strategy: bounded and unbounded;
  - arm counter-motion;
  - abort variants: with planned feed-forward, or an immediate switch;
  - leg-load gain scheduling;
  - twist-DOF posture reference.
- **Transverse plane (open finding, TD-3, decision item):**
  - the excursions of the passive ankle ab/adduction, knee rotation and hip rotation;
  - pelvis yaw;
  - the static yaw stiffness (constant 1 / 2 / 4 N·m pelvis torque at λ 0.5 / 0.95);
  - the same audit on the accepted G2 controller.

  The passive-only ankle ab/adduction has zero passive torque inside ±10°. Changing it means changing approved anatomy, passive tissue or actuation, which is the user's decision. It is reported, not tuned.
- **Spec 3.2:** heel ↔ forefoot transfer on the stance foot during near-single-support.
- **Spec 3.5:** 10 seeded perturbed starts followed by a T5 transfer.
- **Human plausibility:**
  - transfer durations;
  - COM / CoP excursions;
  - stance-hip abduction moment (N·m/kg);
  - pelvis roll (Trendelenburg) and trunk lean;
  - unloaded-foot behaviour;
  - compared with the literature, without tuning toward it.
- **Energy and actuator audit:** utilisation by axis, work, saturation.
- **Contact audit:** seam crossings, piece transitions.
- **Failure classification** of every non-recovery.
- **Cost per component:** physics step, passive layer, controller (of which IK), actuators, probes, G3 measurement.
