# Track A preregistration: the D-1F1 toe / contact-warm-start energy injection (mechanism first, fixes second)

**Authority:** `../../sources/2026-10-09_user_decision_trackA_toe_solver_trackB_pose_compatible_pi1.md` (decision commit 7111a04).

**Background:** `../f1/F1_TOE_FAILURE_REPORT.md` (0ddba2b).

**Status:** frozen at the commit that adds this file, before any instrumented run.

**Time box:** about 3 h of wall clock.
- If the mechanism is not identified within about 2 h, or no clean local fix emerges after **at most 3** causally justified candidates, Track A closes as an engine / configuration limitation and the rigid foot (F0) is retained.

## 1. Objective

- **What is wanted:** the exact mechanism by which contact-lambda warm starting produces the one-step positive energy gain when the separate articulated toe (D-1F1) meets the turf.
- **What is not wanted:** "make F1 pass".
- **Then:** decide whether a principled correction exists that preserves all of these:
  - normal toe collision;
  - the articulated foot geometry;
  - the accepted Jolt configuration (240 Hz, 150 / 2, plane turf, contact and joint warm start on, manifold reduction off, pair cache off);
  - the energy / integrity criteria;
  - determinism;
  - F0's historical behaviour;
  - the toe as an ordinary collision body during promotion.

**Nothing changes.** F1 stays unadopted. F1 parameters, G1 criteria, the accepted configuration and every F0 path are unchanged. All tools are `tools/track_a_*.mjs`, process-local and default-off.

## 2. What the Jolt source says (v5.6.0, the vendored `jolt-physics@1.1.0`; read before any run)

**`ContactConstraintManager::AddContactConstraint`** (pair cache off) does three things when a manifold with the same `SubShapeIDPair` key existed in the previous step:
- **Non-penetration lambda, per point.** It copies a cached point's lambda if the new point lies within `mContactPointPreserveLambdaMaxDistSq` (1 cm²). The test is made in **both** bodies' centre-of-mass local frames.
- **Friction lambdas, per manifold.** It copies the manifold's friction lambdas (2 linear + 1 angular) **unconditionally**.
- **No normal-rotation check.** `mContactNormalCosMaxDeltaRotation` applies only to the body-pair cache path, which is off here.

**What follows from this:**
- The accepted diagnostic "contact warm start off" (`mContactPointPreserveLambdaMaxDistSq = 0`) removes only the **non-penetration** carry-over. It removed the rise. So the candidate carrier is a preserved **non-penetration** lambda, possibly together with the manifold friction.
- `BodyInterface::InvalidateContactCache` only bypasses the body-pair cache. It does **not** affect lambda preservation, so it is excluded as a fix by source reading.

## 3. Instrumentation (`tools/track_a_probe.mjs`)

**Sampling.** Every event is sampled at the jump step and the steps around it, n − 2 … n + 1:
- **drop1m, F1:** n = 110 at 240 Hz (t = 0.4583 s);
- **leanF, F1:** n = 112 (t = 0.4667 s).

| tool | what it captures |
|---|---|
| (a) contact-cache decoder | Through the JS `StateRecorderJS`, save `EStateRecorderState.Contacts` and decode the `ManifoldCache` stream (layout from `ContactConstraintManager.cpp` §SaveState).<br>Per body pair: Δposition and Δrotation.<br>Per manifold: the `SubShapeIDPair` key (body, sub-shape, body, sub-shape), the contact normal in body-2 space, the friction lambdas.<br>Per point: the local positions on both bodies and the non-penetration lambda.<br>Each saved cache holds the solved impulses of the step just taken, which are the warm-start values offered to the next. |
| (b) pre-solve manifolds | The existing contact listener: world points on both bodies, the normal and the penetration depth (+ penetrating, − speculative), with Added / Persisted. |
| (c) warm-start match | For each new point, whether a cached point lies within 1 cm in both local frames (Jolt's own test, recomputed), and the lambda inherited. |
| (d) work attribution | Per contact point:<br>W = λ_n · n · (v_rel,pre + v_rel,post) / 2, where v_pre is the start-of-step velocity plus g·dt, the velocity the solver starts from.<br>Also the effective mass m_eff = 1 / (n · K · n) for the body against the static turf, the relative normal and tangential velocities, and the separation.<br>Friction is attributed per manifold in the same way. Joint lambdas (MTP, ankle) are read with `SixDOFConstraint.GetTotalLambda*` where exposed.<br>The attributed sum is checked against ΔKE, with gravity and the passive drives accounted for. |
| (e) single-step counterfactuals | From the full saved state at n − 1 (`EStateRecorderState.All`; the passive drives for the step re-applied from the same pre-step evaluation):<br>**C0** full restore. Must reproduce the original step **bit-identically**, or the method is invalid.<br>**C1** restore with the contact cache dropped entirely.<br>**C2** drop only the toe↔turf pairs.<br>**C3** drop only the foot↔turf pairs.<br>**C4** zero individual points' cached non-penetration lambdas, or the manifold friction, by byte-editing the decoded cache.<br>Each reports ΔE of the step and the per-body change. |

## 4. Hypotheses to discriminate

| id | hypothesis | discriminating evidence |
|---|---|---|
| H1 | **Stale speculative lambda.** A toe↔turf point that was speculative (separated, approaching) in step n − 1 carried a positive lambda. It is re-matched within 1 cm and re-applied in step n, where the solver does not remove the excess. | The cached point had positive separation at n − 1 and a lambda > 0. C4 on that point removes the rise. |
| H2 | **Load transfer across the joint (topology change).** New foot pieces join at n while toe pieces carried the load at n − 1. The redundant toe + foot + MTP system with a light toe does not converge in 150 iterations, so warm-started toe impulses persist. | Manifold set changes at n. C2 removes the rise. The residual of the toe constraints is > 0 after the solve. Equivalent (non-unique) contact configurations exist. |
| H3 | **Point re-matching error.** A toe point inherits the lambda of a different physical point, because the toe rotates or translates relative to the turf by an amount near the 1 cm matching scale. | The matched cached point's local positions differ from the new point's by a large fraction of 1 cm, or match across a feature change. C4 on it removes the rise. |
| H4 | **Manifold friction carry-over.** Friction is copied regardless of distance. | Zeroing only the friction lambdas (C4) removes the rise. Excluded if C4 on non-penetration alone removes it. |
| H5 | **Joint warm start.** | Joint lambdas abnormal at n. Already weakened: joint warm start off did not remove the rise (`f1_energy_diag.json`). |

H1 – H4 are not exclusive. The results report which are supported, refuted or not determined.

## 5. Candidate fixes (only after the mechanism is identified; at most 3)

**Allowed:**
- only fixes whose causal path follows from the identified mechanism;
- no blind parameter sweep.

**Forbidden:**
- energy deletion;
- position or velocity writes;
- post-contact velocity correction;
- outcome-dependent logic;
- PI-1-specific tuning;
- changes to the F1 parameters or the accepted configuration's global settings.

**Preferred class:** leaf-local invalidation or reinitialisation of stale warm-start data for the articulated foot / toe contacts, applied when the toe's contact topology or manifold changes, or by a rule the mechanism justifies.

**Implementation for evaluation:** a per-step cache filter, `SaveState` / `RestoreState` restricted to the leaf's manifolds.

**Every candidate is classified:**
- **leaf-local:** affects only toe / foot manifolds of F1 bodies; F0 bit-identical;
- **engine-global:** affects other contacts, or needs a Jolt change beyond the leaf.

An engine-global candidate is **not adopted**. It is only described as a future versioned engine configuration with its own preregistration.

**Implementation honesty:** a filter applied from JS through `SaveState` / `RestoreState` emulates a per-body warm-start policy. The results state whether production would need a custom Jolt build, and whether the approach is principled or a workaround.

## 6. Acceptance for a candidate (unchanged criteria; frozen before any candidate run)

1. **G1 rows on F1, accepted configuration, unchanged:**
   - drop1m, leanF and singleLeg pass 1.2a / 1.2b;
   - no other gating row newly fails relative to F1 without the fix;
   - singleLeg 1.4f remains classified as before (record-length toe, `../f1/` §4).
2. **D4a ensembles** (RATE_EPS, 5 members) of drop1m and leanF pass 1.2a / 1.2b in 5 / 5.
3. **G1 ESSENTIAL, F1 with the fix:** no gating failure beyond F1's documented baseline (isoSelfCol 1.4d; singleLeg 1.4f).
4. **F0 ESSENTIAL hashes bit-identical** to the accepted F0 (`../f1/f1_regression.json`), as a leaf-local fix requires. If they are not identical, the fix is engine-global (§5).
5. **Determinism ×2:** identical hashes.
6. **CPU:** measured as interleaved runs with and without the fix in one process, reported relative. Track B may run concurrently; this is noted.

**Freezing:** a candidate that passes 1 – 2 in development is frozen (committed) **before** its final validation battery, items 1 – 6.

## 7. Outputs

- `TRACK_A_RESULTS.md`: the mechanism, evidence tables, candidates and verdicts, locality, CPU, conclusion A, and whether any evidence suggests an unavoidable body / joint / contact-architecture limitation (as opposed to a Jolt warm-start implementation issue).
- JSON evidence in this directory.
- Tools `sandbox/visual/physchar2/tools/track_a_*.mjs`.
