# Swing-foot tracking lag: causal accounting (diagnostic only, nothing changed)

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_lcvff_diagnostic.md`).

**Unchanged:** controller behaviour, gains, lifecycle constants, trajectories, criteria, physical parameters. D1 stays default-off. No E2 run.

**Tools** (diagnostic):
- `tools/swing_lag_diag.mjs`: instruments every stage of the command path on simple trajectories at hover. Options: `--pelvis=fixed` (pelvis made kinematic: a rig, 1 authority write); `--vff=undamped` (counterfactual, below).
- `tools/swing_lag_analyze.mjs`: stage-by-stage amplitude ratio and phase (sinusoids) or effective delay (constant velocity).

**Evidence:** `evidence_lag/` (records, `stage_analysis_all.txt`, `gn_conditioning.txt`, `counterfactual_servo/`).

**Trajectories** (independent of E2): constant Cartesian velocity forward / outward / vertical (and back), sinusoids 1 Hz forward, 2 Hz vertical, 1 Hz outward and 3 Hz forward, and a chirp 0.5 → 3 Hz. Reversals are included.

## 1. Where the loss enters

Canonical case: V2-REF, left leg, 240 Hz, floating pelvis, vertical 2 Hz sinusoid. Every stage is compared with the Jacobian-ideal joint velocity ω_id (the analytic reference mapped through the exact IK Jacobian).

| stage | result | verdict |
|---|---|---|
| reference generation | analytic p / v / a | exact |
| Cartesian target | = the reference; no filtering or interpolation | exact |
| IK conversion | finite difference of the converged IK targets: **×0.99 – 1.00**, ±2 ms (the half-tick backward difference) | correct (H2 frame / convention rejected) |
| **desired joint velocity ω\*** (lcVff "lin") | **knee ×0.26 – 0.37 and hip ×0.2 – 0.5 for vertical foot motion; ×0.84 – 0.97 for forward** | **the loss enters here** |
| velocity feed-forward term | vff = (1 − s)(D + dt·K)·ω\*, exactly (rms residual 0) | H3 rejected: correct arithmetic of a wrong input |
| joint damping | passive viscous damping = 0.4 % (hip) / 2 % (knee) of the swing servo's | negligible |
| actuator command → Jolt motor | measured actuator torque = τ0 − (D + dt·K)·ω_end to **1e-4 N·m rms** (against 4.4 N·m), no limited rows; all bodies and rates | H1 rejected |
| actual joint velocity | knee ×0.80, 36 ms lag | consequence |
| actual foot velocity | **×0.86, 43 ms** (vertical 2 Hz); constant velocity down 34 ms; forward constant velocity ≤ 2 ms | consequence |

**Generality:** the same pattern holds for both legs, V2-REF / V2-165-62 / V2-198-92, and 240 / 480 Hz:
- knee ω\*/ω_id 0.26 – 0.44;
- vertical 2 Hz delay 42 – 43 ms everywhere.

## 2. Why the desired joint velocity is attenuated

`lcVff "lin"` estimates ω\* with **one Levenberg–Marquardt step** from the current IK solution toward the previous problem, using the solver's **initial** damping μ0 = 0.01 in Marquardt form μ(1 + H_ii).
- At swing poses (knee about 35°, **not** singular), the Gauss–Newton matrix H = JᵀJ of the foot-pose problem has its smallest eigenvalue at **0.010 – 0.012**. That eigen-direction is "lift the foot while keeping its orientation" (hip + knee flexion together).
- One damped step therefore returns **×0.31 – 0.34 of the true joint rate for vertical foot motion and ×0.86 – 0.88 for forward**. Measured: ×0.26 – 0.37 and ×0.84 – 0.97 (`gn_conditioning.txt`).
- The iterated IK itself is unaffected: its damping decays toward μmin as it converges. Only the single-step rate keeps the large initial value.

**Counterfactual:** the same rate solve with the solver's terminal damping μmin, a harness wrapper of that one function only:
- ω\* = ω_id (×0.99 – 1.00);
- joint lag ≤ 2 ms;
- vertical 2 Hz 43 → −1.4 ms and amplitude 0.86 → 1.03;
- constant velocity down 34 → −3 ms;
- knee error amplitude 32 → 1.3 mrad.

That counterfactual demonstrates the cause.

## 3. Causal accounting of "~20 ms / ~70 %"

1. **Main term: attenuated velocity feed-forward.**
   - With k = ω\*/ω_id, the uncompensated (1 − k)(D + dt·K)·q̇\* acts as a drag. It gives a lag of about (1 − k)·(D + dt·K)/K ≈ (1 − k)·2ζ/ωn ≈ (1 − k)·64 ms.
   - Vertical (k ≈ 0.3): about 45 ms (measured 34 – 43). Forward (k ≈ 0.9): about 6 ms (measured 0.3 – 12).
   - The E2-like swings mix both directions. The battery's pooled velocity-lag coefficient of about 0.3 (≈ 20 ms, "~70 % effective") is that mixture.
2. **Second term: the missing inertial feed-forward.** With a correct velocity feed-forward, the PD + velocity feed-forward servo responds as (Ds + K)/(Is² + Ds + K).
   - It overshoots ×1.06 / 1.22 at 1 / 3 Hz (predicted) vs ×1.10 / 1.25 measured.
   - It carries an acceleration-correlated phase error. This is what D1 targets.
   - **D1's "overcompensation" in the validation (β_ON ≈ −0.5) is explained by term 1.** An exact inertial term added to a servo still carrying the k ≈ 0.3 drag shifts the error into an acceleration-correlated lead.
   - With the velocity rate corrected, D1 behaves as designed: sinusoid and chirp ×1.00 – 1.06 at about 0 ms (counterfactual).
3. **Liftoff gain blend (H5): secondary.**
   - Over 0.1 s after the measured liftoff the hip stiffness ramps 298 → 1896 N·m/rad and the knee damping 75 → 19.
   - Liftoff-start peak error is about 4.5 mm vs 2.3 mm from hover. Partly confounded by that run's vertical move.
   - The blend's damping change only hurts because ω\* is too small (damping acts on ω − ω\*). The stiffness ramp remains.
4. **Floating-base coupling (H4): an amplifier, not a cause.**
   - Fixed vs floating pelvis gives 32 vs 43 ms (vertical 2 Hz) while the joints lag.
   - −1.4 vs −1.4 ms once the rate is corrected.
5. **Diagnostic artefact, not part of the lag.** At hover + 22 mm (about 42 mm above the turf), the IK targets themselves slow down (soft-limit box): upward constant velocity foot ×0.59 – 0.77; V2-165-62 more. The E2 swing does not go that high.

**Why E1a / E1b never showed it:** the validated lift was vertical, 20 mm in 0.6 s (about 0.05 m/s peak), and hover error was gated only while stationary. The lag cost was about 2 mm during the lift and invisible at hover.

## 4. Predicted effect of correcting it (counterfactual, representative + harder trajectories, 3 bodies × rates)

Values are RMS / peak (mm).

| servo | L1 | R1 | L2 | R2 | H1 – H5 |
|---|---|---|---|---|---|
| validated (lin, no D1) | 7.4 – 7.9 / 12.5 – 13.5 | 5.3 – 6.0 / 7.3 – 8.7 | 7.2 – 8.0 / 11 – 12 | 4.4 – 5.0 / 7 – 8 | 4.3 – 11 / 7 – 16 |
| D1 only (validation result) | 6.1 – 6.4 / 9.7 – 10.7 | 3.8 – 4.2 / 5.8 – 6.8 | 6.4 – 7.3 / 9.4 – 11 | 3.8 – 4.3 / 6.8 – 7.7 | 1.8 – 7.3 / 2.4 – 11 |
| corrected rate only | 4.3 – 4.5 / 7.1 – 7.4 | 3.6 – 4.2 / 6.5 – 7.2 | 3.4 – 3.7 / 5.3 – 6.0 | 2.4 – 2.8 / 3.9 – 4.5 | 3.6 – 8.0 / 5.9 – 11.9 |
| **corrected rate + D1** | **0.7 – 0.9 / 0.9 – 1.1** | **0.3 – 1.2 / 0.4 – 1.7** | **0.4 – 2.3 / 0.5 – 5.9** | **0.5 – 1.0 / 0.8 – 1.6** | **0.5 – 2.0 / 1.0 – 4.9** |

- The worst corrected cell, V2-165-62 L2 / H3, is the IK-target saturation of item 5, not a servo lag.
- With both corrections, the lowest-boot-point deficit is **0.5 – 2.6 mm**. In the reach-saturated V2-165-62 cases it is 4.8 – 6.0 mm.

## 5. Smallest principled correction (not applied)

**The velocity feed-forward's desired joint velocity must be the resolved rate, not a heavily damped one-step estimate.** Smallest form: the μ argument of that one rate solve, using **singularity-robust damped least squares with variable damping** (Nakamura & Hanafusa 1986; Chiaverini 1997):
- the solver's terminal damping when the leg's smallest singular value is well above zero;
- damping rising smoothly only as it approaches the straight-knee singularity, the case that motivated μ0.

**Alternative (E2-only):** ω\* from the analytic swing reference through the exact Jacobian (resolved-rate, D1's own machinery). No differentiation, but it needs an analytic reference, which the E1b lift protocol does not supply.

**Scope decision needed:**
- `lcVff: "lin"` is in the validated PSTAR configuration, so a general fix changes E1a / E1b behaviour and needs their regressions (E1a, E1b closing set, G0 – G3).
- Scoping it to swing targets that carry an analytic reference keeps PSTAR bit-identical.

**Then:**
1. Re-run the servo battery.
2. Re-preregister its representative trajectories to the E2 vertical profile. Mine rise about 1.8× higher.
3. Re-derive the clearance allowance.

**Advance warning, independent of the servo.** The frozen 25 mm apex with BLF's spline leaves the reference at 5.4 mm at φ 0.8 of the post-liftoff swing. The tracked-clearance certificate needs the allowance there ≤ 0.4 mm. The corrected servo's counterfactual descent deficit is 0.5 – 2.6 mm. So the planning gate will very likely still fail at the descent end until the apex / window question (currently frozen by decision) is revisited.
