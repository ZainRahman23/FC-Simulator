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

## Run 1 (02:02:46, commit 365dfd99): defects found, run superseded

**What happened:** the full execution ran.
- Its physics records are unaffected by C3–C4. The log and evaluation are kept in `evidence/superseded_run1/`.
- Three defects and one binding discrepancy were found:

### C3: sub-shape decode in the evaluator

- The contact cache stores raw Jolt SubShapeID values (e.g. 4294967295 / 4294967294). The evaluator compared them with compound child indices.
- So **every native cell was wrongly labelled NATIVE_CORRESPONDENCE_FAILED**, and **no W was permitted**.
- **Correction:** the V2 world's own decode (`core/v2_jolt.js _sub`): index = value & (2^ceil(log2 n) − 1); single-shape bodies → 0.

### C4: double world destroy

- The runner destroyed the world twice (`G1Sim.destroy()` already destroys it).
- The single-process reverse-order batch then hit a wasm "memory access out of bounds" on its second trajectory, so the determinism comparison did not run.
- **Correction:** one destroy (runner and CPU tool).

### C5: handoff-label binding discrepancy (reporting added; frozen label unchanged)

- Freeze decision 8 applied P-14c … P-17c and PR-2 to the post-shift (entered) state.
- `pi1/hga/HGA_V2_ADOPTED.md` (bound in IFM1_INPUTS) states: "Everything else — P-1 … P-17 … — is unchanged. **P-16 remains the pre-shift mapping-fidelity row**". It bounds the shift itself by HG-A2.3.
- Post-shift P-16c equals \|s_h\| by construction (0.131–0.158 m/s > 0.05), so the frozen reading fails every entry.
- **Reporting (no relabel):** the evaluator now reports three readings side by side:
  - the frozen decision;
  - contract text with PR-2 on the post-shift state;
  - contract text with PR-2 on the pre-shift state.
- The cell status keeps the frozen label. The choice is the owner's.

**Hashes after C3–C5:**
- `scripts/ifm1_eval.mjs` 1e4102376f2f68268b7e73241cb6d28153067de1f236807d5457e20235b3f5e4
- `scripts/ifm1_run.mjs` 250d6842121692c62211ff544d89adc0d66bef9ed201471e9f92b7fbfce14c13
- `scripts/ifm1_cpu.mjs` b9283583d50c481342fbc1238cd0024b7f577e807d5dd546f31578b4d55b6690

**Run 2:** the complete execution re-run from scratch after these corrections.
