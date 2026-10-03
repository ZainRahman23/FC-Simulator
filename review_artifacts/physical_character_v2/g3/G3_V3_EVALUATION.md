# V2-G3 criteria v3 (J2 → J2a + J2b): **NOT PASSED, 19/20 (J2a fails as pre-registered). STOPPED for a decision**

**Sources:**
- the user decision (`../sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md`);
- criteria `G3_CRITERIA_v3.md`, pre-registered in `97a0c5d` before the gate run.

**Evidence:**
- gate run: `json/g3_mirror_v3.json`, `json/g3_checks_v3.json`, `G3_TABLES.md` (v3 / v2 / v1);
- floor: `json/g3_mirror_floor.json`;
- diagnostics, none of them a gate configuration: `symfix_diagnostic/`, `tools/b_sym_patch.mjs`.

**The ankle re-investigation has NOT started.** The decision allows it only if G3 passes after the correction.

## 1. The pre-registered result (same G3 run, no physical result changed)

- The G3 run is the committed `json/g3_results.json`, unchanged. The J2b pair re-runs reproduce its outcome class for **162/162** trials.
- **18 rows pass exactly as before.**
- **J2b passes: 81/81.**
  - non-sliding: 49 pairs, max 0.086 mm (limit 0.1);
  - sliding, recovered: 18 pairs, max 1.28 mm (limit 2.0);
  - failing: 14 pairs, max 0.27 mm through the common abort, with identical abort ticks and falls ≤ 1 tick apart;
  - T9 hold means within 1.5e-4.
- **J2a fails: 0/81 pairs.** 443,444 ticks were probed in both directions up to each fall.
  - The replay self-check is bit-exact everywhere, and no discrete decision ever differed (support, unloaded, holds, abort, bilateral flag).
  - The controller's continuous outputs, though, are **not** mirror-equivariant to the numerical floor:
    - median commanded-CoP mirror difference 2.7e-4 mm (tolerance 2.2e-11 mm); worst 1.66 mm commanded CoP, 23 mm per-foot CoP, 1.7 N·m joint torque, all in the back-right T8 pushes;
    - median torque 3.9e-4 N·m (tolerance 2.1e-6).

**My pre-registration error, stated plainly.** I gated `sigmaErr` (‖σ‖ − 1, my axis-correspondence check) at 2.2e-14. It is not a controller output, and it measures ~1e-6 on every tick because Jolt's float32-derived quaternions are not exactly unit length. As written, J2a could not pass even with a perfect controller. Every pair fails J2a on its real outputs anyway, so the verdict does not depend on it.

## 2. Why J2a fails: three genuine controller mirror-symmetry defects (each isolated diagnostically)

| # | defect | mechanism | size | diagnostic fix (patch only) |
|---|---|---|---|---|
| **1** | **The usable foot regions are not mirror images** | `hull2` keeps an exactly collinear sole-hull vertex (chord distance 0) on the left boot and drops it on the right; which way it goes depends on rounding. The radial 5 mm inset moves that mid-edge vertex, so the left region differs from the mirrored right one | 4.8 µm boundary, 0.43 µm centroid; amplified by the CoP allocation's clamp / "can this foot still move" branches to **1.66 mm commanded / 23 mm per-foot CoP / 1.7 N·m** when a per-foot CoP sits on the affected edge (BR pushes) | remove exactly collinear vertices before the inset (`region`) |
| **2** | **The leg IK is not mirror-symmetric** | one-sided finite-difference Jacobian (x + h): mirroring flips some DOFs, so the mirrored solve samples different points; plus a hard 1e-9 stopping threshold that rounding-level residual differences can straddle | pre-fall ≤ ~1e-4 N·m; **after a fall (targets 0.5–2.3 m out of reach) up to 1.2e3 N·m** (the earlier post-fall observation) | central-difference Jacobian (`ik`) and stopping tolerance 1e-12 (`iktol`) |
| **3** | **The unit-quaternion rotation formula is applied to non-unit orientations** | `Q.rot` assumes ‖q‖ = 1. Jolt's float32-derived body orientations have ‖q‖² − 1 ≈ 3e-7, which adds an unrotated (1 − ‖q‖²)·v term. The L and R joint frames differ by a fixed handedness rotation, so the term lands differently on the two sides | ~3e-7 rad joint-axis distortion → ~1e-5 N·m feed-forward torque differences | normalise orientations at the controller and actuator-layer input (`norm`) |

**Diagnostic validation of the whole package** (`region, ik, iktol, norm`; `symfix_diagnostic/g3_mirror_v3_sym-region+ik+iktol+norm.json.gz`), all 81 pairs, 443,441 ticks:
- **every controller output is within the pre-registered floor tolerances**: commanded CoP ≤ 6.8e-13 mm, per-foot CoP ≤ 9.2e-13 mm, forces ≤ 1.4e-12 N, torques ≤ 1.1e-7 N·m, bounds ≤ 3.0e-8 N·m, activations ≤ 1.9e-10;
- 0 discrete mismatches; bit-exact self-check;
- only the flawed `sigmaErr` exceeds its tolerance.

**Partial packages fall short:**
- one-sided IK with only the tighter tolerance stalls near 1e-8 (70 exceedances);
- central differences with the 1e-9 threshold leave 2 threshold coincidences (≤ 1.3e-5 N·m).

**After a fall, the leg IK stays non-equivariant even with the package** (1.2e3 N·m). Grossly infeasible Newton solves amplify rounding-level differences. What this shows for G4 so far: equivariance held at every pre-fall tick of all 81 pairs, including every G3 swing-ready and unloaded-foot hold, all with reachable targets. The breakdown was observed **only** in post-fall states, with targets 0.5–2.3 m out of reach.
- **Not yet tested:** swing targets **near** the reach limit (an almost straight knee), which G4 swing will meet. That targeted test belongs to the IK characterisation still owed.

## 3. What the fixes do to the physics (diagnostic G2 and G3 runs with the package)

| | current controller | with the fix package |
|---|---|---|
| **G2 (620)** | PASS | **619/620 outcomes identical.** 1 change, in a report-only kξ = 0.5 alternative (R 25 N·s: fell → recovered). **0 push-boundary changes**; symmetry 12/12; every behavioural row passes |
| G2 row 2.5 (in-run, 9 workers) | 0.109 ms | **0.212 ms (over the 0.15 budget)**. Inflated by the diagnostic wrapper's per-call state copies; an in-controller implementation would be cheaper, but the central-difference IK alone adds ~50 % |
| **G3 S2 (isolated)** | 0.046 ms | **0.065 ms (passes, budget 0.15)**; T5 controller alone 0.035 → 0.053 ms |
| **G3 rows** | 18 pass (+ J2b) | all of A–I2, K–N, P2, Q, S2 pass (O not run in the diagnostic). Outcome change: 1 report-only strategy variant (T8 hold R10: fell → recovered); abort times moved ≤ 1 tick in nominal T7 and ≤ 67 ms in report-only variants |
| integrity | 0 invalid turf manifolds | 0 invalid; teleport ≤ 1.6 mm |

**The consequence that needs your decision: with a mirror-exact controller, J2b fails 2/81 by small margins.**

| J2b | current controller | with the package | region fix only | norm fix only |
|---|---|---|---|---|
| non-sliding max (≤ 0.1) | 0.086 | **0.126** (T8 ramp BL 10) | 0.083 | 0.089 |
| sliding, recovered max (≤ 2.0) | 1.28 | **2.08** (T8 ramp FR 10) | **2.07** | 1.30 |
| failing, through the abort | 0.27 | 0.34 | 0.33 | 0.31 |
| paired difference vs current (median ratio) | 1 | 1.16–1.26 | **1.19–1.29** | 1.05–1.15 |

- The increase is systematic and comes from the **region** fix.
- The old controller's left-only extra vertex was a small, consistent L/R bias that partly offset the plant's own deterministic L/R asymmetry (D4's probable cause: sequential-impulse solver order). Remove it, and the plant's floor shows.
- That floor is **≈ 2.1 mm when feet slide** and **up to 0.13 mm when they don't**. Non-sliding differences also shift by several hundredths of a millimetre between IK variants.
- So the D4 numbers (0.1 / 2.0 mm) were measured with a controller whose asymmetry happened to mask part of the plant floor.

## 4. Decision requested

There is no route to "G3 PASS under v3" without your decision:

| option | what it means |
|---|---|
| **1 (my recommendation)** | **Adopt the three controller fixes** (genuine defects; no anatomy, actuator, criteria or plant change). **Correct the `sigmaErr` measurement** (compute σ on normalised axes, or make it report-only; it is not a controller output). **Re-measure the J2b physical floor with the symmetric controller using D4's own method** (≈ 2 × the non-sliding floor; the sliding floor rounded up), and approve the resulting numbers explicitly. Then do a full official G2 + G3 re-validation, with G2 row 2.5 measured by the isolated method as D5 did for G3 (or I first reduce the IK cost: central differences only in the final Newton iterations) |
| 2 | Adopt the fixes and keep D4's 0.1 / 2.0 mm. J2b fails 2/81 (0.126 / 2.08 mm), and G3 stays blocked unless the plant's solver-order asymmetry is removed, which is an engine change |
| 3 | Keep the current controller. J2a fails (controller asymmetry up to mm in boundary cases); G3 is accepted only with J2a recorded as an explained deviation |
| 4 | Adopt only the `region` and `norm` fixes (no IK change or extra cost) and set J2a's torque tolerance to include the IK's documented 1e-9 convergence tolerance (≤ ~1e-4 N·m). J2b still needs the floor decision in option 1 |

**Recorded but not yet done** (they wait for G3, per the decision):
- the ankle experiment (drafted: `../ankle_plane/ANKLE_REINVESTIGATION_PREREG.md`);
- the separate 180 Hz passive-layer investigation;
- a deeper IK characterisation, if you want more than the reachable / unreachable boundary above.
