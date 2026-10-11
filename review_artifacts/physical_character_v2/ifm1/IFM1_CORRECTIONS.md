# IFM-1 post-freeze implementation corrections (append-only)

**Freeze:** `IFM1_FREEZE.json` (commit 796a6e1b). Each correction below changes no physics, input, experiment parameter, gate or threshold. Every trajectory is re-run after the correction. The one trajectory run before C1 (C0 R0 S-FLAT) is discarded and re-run.

## C1 / C2 (2026-10-11 02:0x): small-angle-stable orientation metric

**What:**
- The runner's entry read-back rotation error (reported only, not gated) used 2·acos(|q_a · q_b|).
- The evaluator's orientation differences used the same formula.

**Defect:**
- Jolt returns float32-normalised quaternions (norm 1 − 2.6e-8). acos near 1 amplifies that.
- The entry read-back of thigh_R showed **4.5e-4 rad**. The true geodesic difference is **2.3e-8 rad**, verified at construction with no step.
- In the evaluator, the same artefact (≈ 0.03°) would contaminate the 0.1° detectability, 0.5° fidelity and 3° equivalence comparisons.

**Correction:** 2·atan2(|vec(q_a* q_b)|, |w|), as `ifm1_lib.mjs qangRad`. It is used in `ifm1_run.mjs` (read-back) and `ifm1_eval.mjs` (qang).

**Hashes after the correction:**
- `scripts/ifm1_lib.mjs` 5e881b98165397879d106c9ed92e95e8196e1b68c6d75b9bbcff56e22abeda45
- `scripts/ifm1_run.mjs` 242c618ddf6e9e284d06dcedab7540fd0324d37f7b83be3bdc6cd8c0c5da961b
- `scripts/ifm1_eval.mjs` 177bba3220c3195afde61047e606a932c6002877a1405cabd8536a3bdb8c2657
