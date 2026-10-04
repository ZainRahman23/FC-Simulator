# E1a / E1b preregistration, v2 (re-frozen for the corrected knee)

**Status:**
- **PREREGISTERED. NOT RUN.** No E1 execution of any kind has happened.
- Written after the corrected-knee qualification battery and before any E1 run.
- **The criteria (§1, §3) are frozen from this commit.** A later defect is recorded as an erratum, never edited in place.
- **The configuration (§2) is NOT yet fixed:** it awaits your decisions (`KNEE_CORRECTION_RESULTS.md` §6). E1a may run only after §2 is completed in a dated addendum and committed.
- **v1** (`../final_pre_e1a/E1_PREREGISTRATION.md`) stays frozen and unedited. v2 replaces it only for runs made with the corrected knee.

**Source:** `../sources/2026-10-04_user_instruction_knee_correction_before_e1a.md`: "re-freeze the E1a preregistration before running E1a".

## 1. What changes from v1

| item | v1 | v2 |
|---|---|---|
| knee axial model | the accepted knee | **`v2k`** (`KNEE_PARAMETERIZATION.md`; flag `V2_KNEE_MODEL=v2k`), frozen at the qualification commit |
| configuration | "the configuration your E1a authorisation fixes" | stated explicitly (§2). **Every open decision is listed, and E1a cannot start until each is made** |
| E1a-10 (anatomical limits) | knee axial vs the old hard limit | knee axial vs the `v2k` **calibrated-range bound** at the current flexion (a provisional engineering bound) |
| E1a-14 (recovery) | "every leg twist within 2° of its start" | ankle ab/adduction within 2° of its start; **knee axial deviation from θ0(φ)** within 2° of its start value (the absolute knee axial moves with flexion by design) |
| new E1a-16 | — | **qualified knee envelope:** both knees stay within 0–40° flexion throughout. A run that leaves it is reported as **outside the certified envelope** (invalid for knee claims), not as a pass |
| new E1a-17 | — | **knee reference path:** both knees' axial deviation from θ0(φ) ≤ 3° throughout, except ≤ 6° within 0.2 s after a contact onset (KV6c measured ≤ 1.4°; in vivo load-driven deviation is 3.7–5.6°, Myers 2011) |
| everything else | v1 §1–§6 | **unchanged**: lift height, protocol, E1a-1 … 9, 11 … 13, 15, E1b, and the declared discoveries |

## 2. Configuration under test (all must be fixed before E1a; nothing here is decided by this document)

| element | value proposed for E1a | status |
|---|---|---|
| controller | the validated G3 stand controller | accepted |
| support / contact lifecycle | `lifecycle: true` | **your decision.** The G3 I2 / K findings at standing height are the open lifecycle debt (FP-14; re-measured with `v2k` in KV9f) |
| twist policy | reference (`ikRefTwist`): twist DOFs target their anatomical neutral, and under `v2k` the knee's neutral is θ0(φ) | **your decision** (FP-14) |
| ankle law | k = 0.13 N·m/° (the evidence centre) | **your decision.** The G1 evidence at k = 0.13 with `v2k` is in KV9c / the k = 0.13 G1 run |
| knee | `v2k`, central parameters, deep-flexion parameters provisional (unused below 40°) | **your decision** on the qualification errata (`KNEE_CORRECTION_RESULTS.md` §3) |
| planned pelvis drop | −2.5 cm (min-jerk) | as v1 |

## 3. Criteria

v1 §3 and §5 apply unchanged, with E1a-10 and E1a-14 as amended in §1 and E1a-16 / E1a-17 added. E1a-15 (morphology) covers all of E1a-1 … 14 and 16–17.
