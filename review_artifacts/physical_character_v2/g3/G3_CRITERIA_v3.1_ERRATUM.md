# V2-G3 criteria v3.1: ERRATUM to v3 row J2a, and the J2a floor of the corrected controller (pre-registered before the J2a re-run)

**Source:** `../sources/2026-10-04_user_decision_option1_controller_symmetry.md` §4:
- "Remove it from J2a gating because it measures quaternion/unit-length numerical state rather than a controller output. Preserve it as a diagnostic if useful. Record that the preregistered J2a formulation contained this category error; do not rewrite history."

## What is recorded, not rewritten

- `G3_CRITERIA_v3.md` (pre-registered in `97a0c5d`) **contained a category error.** Its J2a gated `sigmaErr` (‖σ‖ − 1 of the axis correspondence σ = (−M·a_A)·a_B) at 2.2e-14.
  - σ is not a controller output.
  - It measured ~1e-6 on every tick because Jolt's float32-derived orientations were not exactly unit length.
  - As written, J2a could not pass even with a perfect controller.
- The v3 evaluation (`G3_V3_EVALUATION.md`, 19/20) stands as recorded. v3's file is unchanged.

## v3.1 = v3 with exactly these changes

1. **`sigmaErr` is not gated.** It stays a reported diagnostic. With the quaternion correction it reads ~1e-15 and serves as a check of the boundary normalisation.
2. **The J2a tolerances are re-derived for the corrected controller with v3's unchanged rule:** max(10 × floor, 100·ε·scale).
   - The controller changed (commit `e9bcf96`: canonical foot regions, central-difference LM leg IK, unit quaternions), so its deterministic numerical floor must be demonstrated again.
   - The floor experiment is v3's: ≤ 4-ulp perturbations of every physical input, unmirrored, every 8th tick of trial A of all 81 pairs, 2 draws, supervisor bookkeeping exact. It was re-run on the corrected controller **before** the J2a re-run.
   - The resulting tolerances are listed below.
3. **J2b keeps D4's 0.1 / 2.0 mm** until the user approves the characterisation-based recommendation (`J2B_FLOOR_PREREG.md`). **G3 is not declared passed in this pass** (decision stop point).

Everything else is v3 (and v2): the outputs compared, the self-check, the scope up to each fall, and the discrete decisions identical.

## J2a floor of the corrected controller and the resulting tolerances

*(filled from `json/g3_mirror_floor.json` before the J2a re-run; the pre-correction floor is preserved in `../symmetry_corrections/before/g3_mirror_floor_v3.json.gz`)*

The floor of the corrected controller (27,708 states, 0 discrete flips, bit-exact replay self-check), and the tolerances from v3's rule:

| category | floor, v3 (former controller) | **floor, corrected controller** | **v3.1 tolerance** |
|---|---|---|---|
| lam | 0 | 0 | 2.2e-14 |
| copMm | 1.59e-12 | 1.91e-12 mm | 2.2e-11 mm |
| share | 7.66e-15 | 1.05e-14 | 1.1e-13 |
| footCopMm | 2.40e-12 | 1.25e-12 mm | 2.2e-11 mm |
| forceN | 7.16e-12 | 9.18e-12 N | 9.2e-11 N |
| cmdTauNm / actTauNm | 2.14e-7 | **1.16e-11 N·m** | **1.2e-10 N·m** |
| cmdGain / actGain | 0 | 0 | 2.2e-10 |
| actBoundNm | 6.47e-8 | 3.50e-12 N·m | 3.5e-11 N·m |
| actCapNm | 5.97e-13 | 6.11e-13 N·m | 2.2e-11 N·m |
| activation | 4.21e-10 | 2.83e-14 | 2.8e-13 |
| holdMm | 1.2e-13 | 1.20e-13 mm | 2.2e-11 mm |
| holdRad | 1.2e-15 | 1.26e-15 rad | 7.0e-14 rad |
| g3OutS | 0 | 0 | 2.2e-14 s |
| ikResM | 2.24e-11 | **1.44e-15** | **2.2e-14** |
| sigmaErr | (gated in v3: category error) | — | **not gated** (reported) |

**Disclosure.** The torque and IK floors dropped by ~10⁴, because the former IK's convergence noise dominated the old floor. The v3.1 tolerances are therefore much tighter than v3's.
- The former diagnostic package reached torques ≤ 1.1e-7 N·m, with a different IK (Newton). Mirrored LM solves can still stop on either side of the 1e-12 residual threshold at rare ticks.
- J2a v3.1 may therefore fail on such threshold coincidences. If so, it is reported with its mechanism; the rule is not changed.
