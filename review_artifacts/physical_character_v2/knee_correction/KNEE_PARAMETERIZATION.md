# Corrected knee axial model (`v2k`): reconciled parameterization

**Date:** 2026-10-04.
**Instruction:** `../sources/2026-10-04_user_instruction_knee_correction_before_e1a.md` (verbatim). It approves the architecture correction before E1a: conservative and evidence-first, with deep flexion provisional.

**Evidence:**
- `../knee_axial_review/KNEE_AXIAL_MODEL_REVIEW.md` and its four tagged literature reports.
- The low-flexion fit `evidence/lowflex_fit.mjs` / `.txt` (this document, §3).

**The independent Astra knee review was not provided as a file.** Only the summary of its conclusion in the instruction is available. This document therefore reconciles against the primary evidence directly, not against my earlier table. Its architecture matches the instruction's summary point for point (§1).

**Status:**
- **Written before any implementation or validation run.**
- Nothing here is "validated anatomy" unless marked **evidence-calibrated**.
- **Provisional** = a deliberate engineering or sensitivity choice, carried as a named parameter.

## 1. Architecture (as approved)

| approved decision | how `v2k` implements it |
|---|---|
| 1. flexion and axial stay separate coordinates | unchanged 2-DOF knee (flexion + axial; varus locked as now) |
| 2. flexion-dependent reference + finite compliance | passive reference path θ0(φ); compliant J-curve torque on θ − θ0(φ); envelope widths depend on φ |
| 3. no rigid prescription of axial from flexion | there is no coupling constraint. θ0 is only the zero of a finite passive law |
| 4. energy-consistent coupled formulation | one passive potential U(θ, φ) for the knee axial term. The passive layer applies **−∇U with respect to the joint's full rotation**, so the flexion reaction −∂U/∂φ (from θ0′(φ) and from the φ-dependent widths) is applied automatically. **No per-tick rest-angle move** |
| 5. finite active axial control kept | the knee axial actuator is unchanged |
| 6. active capacity unchanged provisionally | 0.35 N·m/kg each way. No new strength curve |
| 7. no generic weight-bearing multiplier | none |
| 8. stance-yaw observability | the yaw-decomposition validation (prereg KV10) separates ground, foot / ankle, knee, hip and upper-body contributions |

**Flag:**
- `V2_KNEE_MODEL=v2k` (Node env) or `PassiveLayer` option `kneeModel: "v2k"`. **Default off.**
- Off reproduces the accepted plant bit for bit. The old knee stays the historical comparator.

## 2. Four quantities kept distinct

| category | what it is | role in the model | evidence status |
|---|---|---|---|
| **A. passive reference trajectory θ0(φ)** | the unloaded, lightly compressed zero-torque axial path | zero of the passive law | 0–120°: moderate (evidence-calibrated). 120–155°: **provisional** |
| **B. torque-defined laxity** | rotation from θ0 at a defined torque (2.5 / 5 / 6 / 10 / 15 N·m), bone-level, in vivo, relaxed | calibrates the passive torque–angle law | 2.5–6 N·m: moderate. 10–15 N·m: low (one CT study, n = 6). > 15 N·m: none in vivo |
| **C. actively used rotation** | what the controller commands and tasks use | reference policy commands θ0(φ) (no planned offset in E1a). Task deviation from the coupled path is 3–6° (±5°) in landing (Myers 2011) | used only as a plausibility band for validation, never as a limit |
| **D. hard / emergency limits** | where the model stops trusting tissue data, and the numerical safety stop | (i) **calibrated-range bound** a15 = the angle at which the calibrated law reaches 15 N·m (the highest torque applied at bone level in vivo). (ii) **engineering end-stop**: a stiffening spring reaching actuator capacity 3° beyond a15. (iii) **Jolt emergency stop**: static, numerical | (i)–(iii) are **provisional engineering bounds, not anatomical stops**. No physiological "wall" exists below the injury band (≥ 25–35 N·m) |

**No 5 N·m laxity endpoint is used as a stop.** The 5 N·m points calibrate the law (category B). The only bound the gates see as "hard" is the calibrated-range bound (category D i). It is labelled provisional because its own calibration (10–15 N·m) rests on one small study.

## 3. Low-flexion derivation (the E1a envelope is 0–30° flexion; validated 0–40°)

**E1a's knee-angle envelope** (geometry, `final_pre_e1a/E1_PREREGISTRATION.md`):
- about 4° standing;
- about 27° after the planned 2.5 cm pelvis drop (two-link leg, thigh = shank: d = 2L·cos(φ/2));
- slightly more on the lifted leg.

Validation covers 0–40°.

**Law shape:** the existing V2 shape, so no new mechanics.
- Zero torque inside a slack s.
- A(e^{B(x−s)} − 1) from s to a15, reaching τcal at a15. B = 6/rad.
- Beyond a15, a linear end-stop added so the total reaches the opposing actuator capacity 3° beyond a15.
- τcal = 0.55 × the opposing capacity (= 15.0 N·m at 78 kg). Torques scale with body mass, as in the rest of the spec.

**Width scaling:** per side, both s and a15 are multiplied by the flexion factor

f(φ) = [f0 + (1 − f0)·S(φ/35°)] · g(φ), with S = smoothstep (C¹) and g the deep-flexion factor (§4).

**Fit:**
- Weighted least squares on the in vivo bone-level laxity points, each z-scored by its reported SD. Where no SD is reported, 3–4° is assumed and marked.
- **Script:** `evidence/lowflex_fit.mjs`. **Output:** `evidence/lowflex_fit.txt`.

| side | best fit | compatible region (Δχ² ≤ 3, 3 parameters) | **chosen** | why the chosen value differs from the best fit |
|---|---|---|---|---|
| internal | s 0°, a15 14°, f0 1.2 | s 0–4°, a15 10–16°, f0 0.7–1.2 | **s 1°, a15 14°, f0 1.0** | f0 capped at 1.0: no envelope wider at extension than in mid-flexion, because cadaver data contradict it (ratio 0.3–0.55). s 1° is a minimal numerical dead zone inside the compatible region, not an anatomical claim |
| external | s 0°, a15 25°, f0 0.5 | s 0–5°, a15 22.5–27.5°, f0 0.3–0.75 | **s 1°, a15 25°, f0 0.5** | same 1° dead zone |

**Chosen set vs every data point** (per side from θ0; |z| ≤ 1.11 everywhere):

| φ | torque | IR data | IR model | z | ER data | ER model | z | source |
|---|---|---|---|---|---|---|---|---|
| 0° | 5 N·m | 9.6 ± 3.5 | 7.5 | −0.60 | 6.6 ± 2.8 | 6.3 | −0.10 | Hemmerich 2011, MRI [SEC: Zee 2020] |
| 20° | 5 | 10.8 (± 4, assumed) | 7.5 | −0.83 | 7.4 (± 4, assumed) | 11.8 | +1.11 | Nordt 1999, CT, n = 21 [SEC] |
| 30° | 5 | 8.8 ± 4.3 | 7.5 | −0.32 | 14.3 ± 5.2 | 15.3 | +0.21 | Hemmerich 2011 |
| 30° | 2.5 | 3.7 ± 1.4 | 4.8 | +0.76 | 7.6 ± 3.5 | 10.6 | +0.87 | Moewis 2016 [FT] |
| 90° | 2.5 | 4.0 ± 2.0 | 4.8 | +0.38 | 10.0 ± 3.1 | 11.1 | +0.37 | Moewis 2016 |
| 90° | 6 | 10 (± 4, assumed) | 8.4 | −0.41 | 16 (± 4, assumed) | 17.3 | +0.34 | Almquist 2002, RSA [SEC] |
| 30° | 5 / 10 / 15 | (5–8) / 7–15 / 9–15 | 7.5 / 11.3 / 14.0 | — / +0.09 / +0.67 | 16–20 / 22–23 / 24–25 | 15.3 / 20.8 / 24.3 | −0.88 / −0.55 / −0.06 | Neumann 2015a, CT, n = 6 [FT] (SD 3 assumed) |

**Totals at 5 N·m:**

| φ | model | in vivo |
|---|---|---|
| 0° | 13.8° | 15.8–16.5° |
| 30° | 22.8° | 22.7–23.5° |
| 90° (6 N·m) | 25.7° | about 26° |

**What the data cannot resolve:**
- The in vivo IR points at 2.5 N·m (Moewis) and at 5 N·m (Hemmerich, Nordt) cannot both be met by any monotonically stiffening curve from one zero. The studies define zero differently: Moewis uses the centre of the hysteresis zero-crossings; MRI/CT uses the unloaded resting scan.
- The fit balances the two (z +0.76 vs −0.32 to −0.83).
- The ER flexion ramp (35°) is a shape choice (provisional; 15–40°). Nordt's low ER at 20° (z +1.11) argues for a later ramp; cadaver plateaus by 15° argue for an earlier one.

## 4. Passive reference trajectory θ0(φ)

| region | θ0 | status |
|---|---|---|
| 0–120° | **Walker 1988 average-knee coupling**: θ0 = 0.3695φ − 2.958·10⁻³φ² + 7.666·10⁻⁶φ³ (degrees). Gives 3.4 / 6.3 / 8.6 / 10.5 / 13.2 / 14.9 / 15.0° at 10 / 20 / 30 / 40 / 60 / 90 / 120° | **evidence-calibrated (moderate)**. Inside the in vivo / cadaver bands at every tabulated angle (review §3.4: 2–5 / 3–8 / 6–13 / — / 6–15 / 5–20 / 8–29°); between-subject SD 6–9°. Verified against Rajagopal2016.osim and LaiUhlrich2022.osim |
| 120–155° | **provisional**: the same polynomial continued (14.9° at 130°, 14.8° at 140°, 14.75° at 155°; this is also OpenSim / Lai's own extrapolation to 140°) plus a named sensitivity offset δ150·S((φ − 120°)/30°), **default δ150 = 0** | **provisional; outside the certified envelope.** Evidence at 145–150°: cadaver passive paths 7–20°, in vivo weight-bearing 15–29°. Sensitivity runs: δ150 ∈ {−4, +5, +10} (θ0(150°) ≈ 11 / 20 / 25°). **"About 20° at 145–150°" is NOT encoded as anatomy** |
| < 0° (hyperextension, to −5°) | the polynomial continued (−1.9° at −5°) | **provisional**: smooth continuation. Data: one model spline (Lenhart: −3.3° at −10°) |

**Why the polynomial and not a hold at 120°:**
- θ0′ is continuous, so the flexion reaction U′·θ0′ has no kink.
- Over 100–155° it is flat to within 0.3°, so it adds no claim.

## 5. Envelope widths vs flexion

| quantity | value | status |
|---|---|---|
| IR extension factor f0 | 1.0 (compatible 0.7–1.2; cadaver 0.3–0.55) | evidence-calibrated (low–moderate) |
| ER extension factor f0 | 0.5 (compatible 0.3–0.75) | evidence-calibrated (moderate) |
| ramp to plateau | smoothstep over 0–35° | **provisional shape** (15–40°) |
| plateau | 35–120° unchanged (cadaver plateau to ≥ 120°: high; in vivo to 90°: moderate) | evidence-calibrated |
| deep-flexion factor g(φ) | g = 1 − (1 − w150)·S((φ − 125°)/25°), **default w150 = 1.0 (no narrowing)** | **provisional; outside the certified envelope.** The evidence conflicts: Markolf 1976 (35 knees) shows none at 135°, against Li 2004, Kono 2018, van Kampen and Nielsen. Sensitivity: w150 ∈ {0.6, 0.3}. **"0.6×" is NOT encoded** |
| hyperextension factor | 1.0 (no claim) | provisional (one cadaver knee suggested narrowing) |

## 6. Resulting law (central, 78 kg; computed after implementation, to be checked against §3 by prereg KV4)

Per side from θ0:
- **IR:** s 1°, a15 14° (× f).
- **ER:** s 1°, a15 25° (× f; ×0.5 at 0°).
- τcal 15 N·m at a15.
- End-stop to 27.3 N·m (the capacity) at a15 + 3°.

**Absolute calibrated-range bounds** (θ0 ± a15·f):

| φ | bounds |
|---|---|
| 0° | [−12.5, +14] |
| 30° | [−15.7, +22.6] |
| 90° | [−10.1, +28.9] |
| 146° | [−10.2, +28.8] (deep defaults) |

The old knee is [−40, +30] at every φ.

## 7. Limits seen by the engine and the gates

| layer | `v2k` | status |
|---|---|---|
| G1 / G2 "anatomical hard" for the knee axial | the calibrated-range bound θ0 ± a15·f (flexion-dependent, via the passive layer's per-term `hard`, as the diagnostic envelopes did) | provisional engineering bound |
| end-stop | linear spring beyond the bound, total = capacity at bound + 3°. Its stiffness is recomputed from the current slack and bound, inside the potential, so it is conservative | provisional engineering |
| Jolt emergency stop | **unchanged static limits:** anatomical [−60°, +66°], the old knee hard [−40, +30] ± ENGINE_MARGIN (20° / 36°). Enclosure and overshoot are verified, not assumed (prereg KV7) | numerical safety stop |

## 8. Controller semantics under `v2k`

- **Reference twist policy (`ikRefTwist`)** (the proposed E1a policy): the knee axial target is **θ0 at the knee flexion being solved**, inside the IK's forward kinematics. So it is consistent with the IK Jacobian (central differences), and the hip rotation absorbs the coupled tibial rotation, as a planted human leg does.
  - **Without this, the actuator would hold the knee at the reference posture's twist and fight the passive reference path.**
  - This is the knee half of "twist DOFs targeted at their anatomical neutral" under the new definition of neutral. No other controller change.
- **"current" policy (the G3 default):** unchanged (knee axial held at its current value).
- **IK:** the knee axial is not an IK-solved coordinate (`legChain`), so no planning-box change is needed. The review's §5.7 concern does not apply.

## 9. What is NOT changed

- Anatomy, masses, inertias, the flexion ROM, other joints, actuator capacities (including the knee axial), foot geometry, the skeleton contract, the physics rate.
- The ankle law default (k = 0) and the twist-policy default ("current").
- The lifecycle default (off).
- The old knee (spec values and code path) is preserved and selected by default.
