# Posture / twist policy: preregistered comparison (final pre-E1a stage, §1)

**Source:** `../sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md` §1.

**Written before the official battery runs.** Smoke runs (b50 × V2-REF × PY4 / SB / TURN / LIFT, k = 0) only checked that the tool executes. Thresholds are not changed after the battery runs.

**Tool:** `tools/twist_policy_battery.mjs`. **Controller:** `G3_STAND` + the policy's options. The LIFT scenario adds the experimental `lifecycle`.

## 1. What we want (the semantics, independent of any gate score)

- **A1. Legitimate voluntary turns are not dragged back.** A commanded change of the posture heading is a change of the *target*. The controller holds the new orientation; it does not keep pulling toward the original world orientation.
- **A2. Accidental twist is not adopted.** Twist acquired from a perturbation or contact (leg axial twist, pelvis yaw relative to the feet) is a *deviation*. The controller restores it, and it never silently becomes the new target. A sustained deviation held longer than any filter constant must still be restored once its cause ends.
- **A3. The controller is not an energy source.** No actuator-powered limit cycle in the twist direction.

The candidates differ exactly in A2:

| policy | twist-DOF target in the posture IK | adoption of accidental twist |
|---|---|---|
| current (validated G2/G3) | the current twist (zero restoring stiffness; hip spring world-referenced) | **immediate**; plus a measured limit cycle (runway) |
| ref | the anatomical reference | none: full restoring stiffness |
| b50 / b35 | (1 − α)·current + α·reference, α = 0.5 / 0.35 | none: restoring stiffness α·K, which recentres fully |
| d1 / d2 | a first-order filter of the current twist, τ = 1 / 2 s | **after ~τ**: by construction, a twist held longer than τ becomes the target |

The scenario SB exists to falsify d1 / d2 (a 6 s sustained deviation, longer than τ). Commanded turns enter through the heading command (`yawCmd`) in every policy. None of the candidates reads a voluntary turn from the twist state.

## 2. Battery: 6 policies × 8 bodies × 12 scenarios × k ∈ {0, 0.13} N·m/°

**Ankle stiffness:**
- k = 0 is the accepted control.
- k = 0.13 is the centre of the historical in-vivo evidence range 0.11–0.15.
- The ankle law itself is decided in §4. The policy and the ankle law are evaluated jointly because, at k = 0, the passive ab/adduction has zero stiffness in ±10°, so no policy can restore an ankle twist there by itself.

**Scenarios:**

| key | content | used for |
|---|---|---|
| Q | T0 bilateral, 20 s, untouched | quiet stance |
| PY4 | T0 + thorax yaw impulse 4 N·m·s at 2 s, 20 s | perturbation recovery, stability, energy |
| PR8 | T0 + thorax roll impulse 8 N·m·s at 2 s, 20 s | perturbation recovery, stability, energy |
| SB | T0 + pelvis yaw torque 2 N·m over 2–8 s, released, 16 s | the non-adoption test |
| TURN | T0 + commanded pelvis yaw 0 → 20° (min-jerk over 2–4 s), held to 12 s | voluntary heading change |
| T1, T5, UR | G3 strong transfer, near-single support, full unloading | weight transfer, near-single support, full unloading |
| LIFT | UR + lifecycle + external 30 N shank lift ramp 7.0–8.5 s | transition toward liftoff |
| HO1 | UR + pelvis yaw impulse 1 N·m·s at 8 s | held-out: single-support yaw |
| HO2 | T5 + thorax push L 15 N·s at 8 s | held-out: lateral push in near-single support |
| HO3 | T0 + thorax push B 15 N·s at 2 s | held-out: sagittal push |

HO1–HO3 were not used in any earlier tuning or comparison.

## 3. Acceptance criteria (per policy, per k; every criterion on all 8 bodies)

| # | criterion | scenarios | threshold |
|---|---|---|---|
| C1 | no sustained twist oscillation | PY4, PR8, HO3 | decay class QUIET or DECAYING (mean left-ankle ab/adduction window amplitude 15–20 s / 3–8 s < 0.5, or every window < 1°) |
| C1q | quiet stance quiet | Q | every 1 s window amplitude ≤ 1° over 10–20 s |
| C2 | not an energy source | PY4, PR8 | net hip-rotation actuator work, both hips, 12–20 s ≤ +0.5 J |
| C3 | accidental twist not adopted | SB | at 14 s (6 s after release): \|left-ankle ab/adduction\| ≤ max(1°, 25 % of its value at 8 s), and the same for \|pelvis yaw\| |
| C4 | voluntary turn kept | TURN | pelvis yaw at 12 s ≥ 18° (90 %), and \|yaw(12) − yaw(6)\| ≤ 1° |
| C5 | G3 tasks intact | T1, T5, UR | outcome stood / recovered; foot slip ≤ 1.0 mm (both feet) |
| C6 | toward liftoff | LIFT | stance foot slip ≤ 1.0 mm; no fall; stance-ankle ab/adduction excursion while the other foot is off the turf ≤ 5°; swing-foot yaw at touchdown ≤ 2° |
| C7 | held-out disturbances | HO1, HO2, HO3 | no fall; outcome stood / recovered (a policy that fails where "current" also fails is not penalised for that case) |

**Reported without thresholds:** twist peaks and end values, pelvis-yaw peak under SB (whole-body yaw compliance), settle times, hip-rotation work, controller torque, and slip.

## 4. Decision rule (fixed now)

1. A policy is **eligible at k** if it meets C1–C7 on all 8 bodies at that k.
2. **Adoption** requires eligibility at the ankle law adopted in §4. While §4 is undecided: eligibility at k = 0.13 (the candidate law) is required. Eligibility at k = 0 is reported but not required, since §2 argues it is physically impossible for the ankle part.
3. If several policies are eligible, pick by:
   1. the most eligible bodies across both k;
   2. the shortest median settle time over PY4 and PR8 (stability margin). This is overridden if its median SB pelvis-yaw peak exceeds 1.5× that of the runner-up (a compliance guard: we do not want the stiffest-looking but least plausible);
   3. at equal performance (within 10 %), a stateless policy over a stateful one.
4. **If no policy is eligible, the choice is reported as unresolved**, with the failing criteria.
5. **Falsification after selection:** the chosen policy is also run on PY4 at 180 and 480 Hz (3 bodies). A sustained or growing class at either rate blocks adoption.
