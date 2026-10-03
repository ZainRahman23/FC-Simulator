# V2-G3 pass criteria, **v3: a POST-INVESTIGATION CRITERION CORRECTION of v2 row J2** (pre-registered before the J2a / J2b gate run)

**Source:** `../sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md`: "approve A, with the following precise interpretation … Replace it with two explicitly separate checks and preserve the original J2 failure/results in the historical record."

## What is corrected, and what is preserved

- **v3 = v2 with row J2 replaced by J2a and J2b.** Every other row, limit, definition and benchmark method is v2's, unchanged. The configuration is the one in `G3_CRITERIA_v2_ADDENDUM_FLAT_PLANE.md`: flat plane, ankle k = 0.
- **Preserved, not rewritten:**
  - the v2 J2 definition (`G3_CRITERIA_v2.md`) and its evaluator (`gates/v2_g3_checks_v2.js`);
  - its result: **18/19, J2 failed** (`json/g3_checks_v2.json`, `json/g3_mirror_pairs.json`);
  - the finding that it conflated controller and plant symmetry (`G3_REVALIDATION_FLAT_PLANE.md` §2);
  - every earlier measurement (`flat_plane_validation/`).
- **Why J2 was wrong:**
  - It compared the commanded CoP of **two independently evolved physical runs**. That mixes the controller with the plant's deterministic L/R floor, and it reported 0.104 mm even where the two runs were the same physical run.
  - It banded falls (≤ 2 mm) after control had ended and the bodies were falling freely.
- **G3 under v3 is declared PASS only if** J2a and J2b pass exactly as pre-registered here, all 18 other rows remain passing, and no physical result changes: the same `json/g3_results.json`, and the pair re-runs reproduce its outcomes.

## J2a: controller mirror-equivariance (the controller-symmetry gate)

**Method** (`tools/g3_mirror_v3.mjs`, gate mode):
- **Input capture:** for every tick of both trials of all **81** mirrored pairs, from the first tick up to each trial's fall declaration, the controller's exact input is captured at the entry of `StandController.compute` and `ActuatorLayer.compute`:
  - body states;
  - the controller and supervisor state, including sensed foot loads and contacts, unloaded flags, holds and the previous tick's info;
  - actuator activations.
- **Mirror image:** the input's exact mirror image is formed. The sagittal reflection is exact in floating point: negations and swaps only.
  - Position, COM and velocity map to (−x, y, z); orientation quaternions (x, −y, −z, w); angular velocity (x, −y, −z).
  - L ↔ R bodies, joints, feet, holds and sensed loads swap; λ → 1 − λ.
  - Mirrored polygons keep the controller's winding.
- **Probe:** the mirror image is fed to a **fresh, never-stepped instance of the partner trial's controller and actuator layer**, in both directions (A → B and B → A). **No two independently evolved trajectories are compared.**
- **Joint-axis quantities** go through each axis's mirror correspondence σ = (−M·a_A)·a_B, since torques are pseudovectors. Bounds and capacities swap when σ = −1.
- **Self-check (validity):** the same captured input fed **unmirrored** to a fresh instance of the same trial must reproduce the original output bit-exactly. It is checked every 97th tick of every trial A. This proves that the captured state is the complete controller input.

**Outputs compared:**

| output | category |
|---|---|
| requested weight split λ | `lam` |
| commanded CoP (clamped, raw, ξ target) | `copMm` |
| load share | `share` |
| per-foot CoP | `footCopMm` |
| per-foot force | `forceN` |
| joint commands τ0 and feed-forward | `cmdTauNm` |
| joint gains K, D | `cmdGain` |
| actuator τ0 and request | `actTauNm` |
| actuator K, D | `actGain` |
| actuator torque bounds lo / hi | `actBoundNm` |
| actuator capacities | `actCapNm` |
| activations | `activation` |
| hold pose | `holdMm`, `holdRad` |
| supervisor dwell accumulator | `g3OutS` |
| leg-IK residuals | `ikResM` |
| axis correspondence ‖σ‖ − 1 | `sigmaErr` |
| **discrete, must be identical:** in-support flags, unloaded flags, hold presence, abort decision and its time stamp, bilateral-recovery flag, command / actuator row structure | — |

**Deterministic numerical floor** (`json/g3_mirror_floor.json`, measured before this file was committed):
- **Samples:** the same captured inputs, every 8th tick of trial A of all 81 pairs before the fall: **27,709 states**.
- **Perturbation:** every physical floating-point input (body states, sensed loads, holds, the previous tick's measured info, activations) multiplied by (1 + U[−1, 1]·2⁻⁵⁰), i.e. ≤ 4 ulps; seeded; 2 draws. Unmirrored. The supervisor's bookkeeping (tick counter, event time stamps, dwell accumulator) is exact counting and is not perturbed.
- **Result:** max output change per category, below. No discrete decision changed in any draw. The replay self-check was bit-exact in every output.

**Tolerance rule** (fixed; applied, not chosen): tolerance = **max(10 × floor, 100·ε × scale)**, where ε = 2⁻⁵² and the scales are 1 m, 1,000 N, 1,000 N·m, 10⁴ N·m/rad, π rad, 1 s and 1 for unitless quantities.

| category | floor | **tolerance** |
|---|---|---|
| lam | 0 | 2.2e-14 |
| copMm | 1.59e-12 mm | 2.2e-11 mm |
| share | 7.66e-15 | 7.7e-14 |
| footCopMm | 2.40e-12 mm | 2.4e-11 mm |
| forceN | 7.16e-12 N | 7.2e-11 N |
| cmdTauNm / actTauNm | 2.14e-7 N·m | 2.1e-6 N·m |
| cmdGain / actGain | 0 | 2.2e-10 |
| actBoundNm | 6.47e-8 N·m | 6.5e-7 N·m |
| actCapNm | 5.97e-13 N·m | 2.2e-11 N·m |
| activation | 4.21e-10 | 4.2e-9 |
| holdMm | 1.2e-13 mm | 2.2e-11 mm |
| holdRad | 1.2e-15 rad | 7.0e-14 rad |
| g3OutS | 0 | 2.2e-14 s |
| ikResM | 2.24e-11 m | 2.2e-10 m |
| sigmaErr | 0 | 2.2e-14 |

**Pass:** in all 81 pairs, every probed tick before the fall (both directions) is within every tolerance, every discrete decision is identical, and the self-check is bit-exact.
- **Reported, not gated:** after the fall declaration (control has ended; the known post-fall leg-IK observation).

**Disclosure.** When this rule was fixed, the earlier 6-pair probe (`b_ctrl_mirror.mjs`) had already shown mirror differences of ~1e-4 mm in the commanded CoP. During the floor work a source was identified:
- The left and right **usable foot regions are not exact mirrors**. `hull2` keeps an exactly collinear sole-hull vertex on the left boot and drops it on the right; which way it goes depends on rounding. The radial 5 mm inset then turns that into a 4.8 µm boundary and 0.43 µm centroid difference.
- That is far above the measured floor, so **J2a is expected to fail as pre-registered**.
- The tolerances are nevertheless the floor rule's, unchanged. Per the decision, they are not widened to pass.

## J2b: mirrored physical-outcome symmetry (paired physical runs; the D4 interpretation)

`tools/g3_mirror_v3.mjs` re-runs both trials of every pair. The per-tick foot displacement is taken from each foot's start, in the mirrored frame (feet swapped, lateral sign flipped). "Meaningful sliding" means either trial has a foot displaced > 1.0 mm.

| pair type | pass |
|---|---|
| neither run slides (whole run), no fall | mirrored positional difference ≤ **0.1 mm**; same class; abort decision identical (≤ 1 tick); equal run lengths |
| sliding, controlled recovery continues (no fall) | same class; abort decision identical (≤ 1 tick); positional difference ≤ **2.0 mm** and per-foot mirrored \|Δslip\| ≤ **2.0 mm**; equal run lengths |
| request physically fails (fall declared) | **same qualitative failure** (identical class) and **compatible failure timing**: abort decision identical (≤ 1 tick) and fall declarations ≤ 1 tick apart. Positional symmetry is scored **only through the common abort / failure declaration**: the common supervisor abort when both trials aborted, otherwise the first fall declaration. The limit is 0.1 mm if no sliding occurred before that point, else 2.0 mm. Nothing after it is scored (control has ended; the bodies fall freely) |
| T9 cycles (both holds inside one run) | R vs L hold means within 1e-3 (as in v2) |

**Pass:** all 81 pairs plus T9.
- The abort window for failing requests is the one in option A, which the user approved ("Δpos up to the abort ≤ 2.0 mm").
- Its known values (≤ 0.27 mm up to the abort; 0.24–5.84 mm up to the fall) were measured before this file. The window follows the decision text, not those numbers.

## Evaluation

- `gates/v2_g3_checks_v3.js` (`evaluateV3`) is wired into `tools/g3_report_tables.mjs`. It writes `json/g3_checks_v3.json`, and `G3_TABLES.md` shows v3, v2 and v1.
- Gate run: `node tools/g3_mirror_v3.mjs` → `json/g3_mirror_v3.json`.

## If a row fails

If J2a or J2b fails as pre-registered:
- **G3 is NOT PASSED under v3** and the ankle re-investigation does not start (user decision);
- the cause is diagnosed and reported;
- any remedy that changes the controller or plant changes physical results, so it is a decision for the user, with diagnostic evidence prepared but nothing adopted.
