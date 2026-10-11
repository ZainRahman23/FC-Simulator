# PVP-1A-DX: evaluation corrections after run 1 (tooling only; no run, physics, entry or criterion changed)

**Run 1:** executed at 0a829068 (the DX pre-run freeze). The records are in `evidence/dx_run1/records/`.
- The original evaluation is preserved unchanged: `evidence/dx_run1/PVP1A_DX_EVAL_original.json`.
- The corrected evaluation, from the same records: `evidence/dx_run1/PVP1A_DX_EVAL_corrected.json`.
- No trajectory was re-run.

| id | defect | effect on the original | correction |
|---|---|---|---|
| **DX-C1** | The evaluator's entry verdict omitted the frozen §4 entry check "self-penetration ≤ 10 mm". It checked read-back, momentum, the cache and the writes only. Yet the fixture itself recorded tackler self-overlap (forearm_L ↔ thigh_L), and step 1 shows a 39.5 mm self-manifold | the DX verdict read DX-CONTROL_INVALID instead of **DX-BLOCKED** | the entry verdict now includes both characters' self-penetration (fixture GJK overlap plus the deepest self manifold of step 1). Tackler: 39.5 mm > 10 mm → INITIALIZATION_INVALID. This is also an H3 condition for PVP-1A, beside its H2 stop |
| **DX-C2** | CG-6 normalised 2-D vectors with the 3-D helper `V.norm` (it returns garbage for 2-D input) and reported 0° for both angles | CG-6 values wrong (0° / 0°). Its pass status is unchanged | a 2-D normalisation. Normal **14.4°**, approach relative velocity **0.12°**. Both pass ≤ 45° |

**Also recorded, not corrected (they are frozen definitions, kept as written):**
- **The C0 runner criterion conflicts with the grounding rule.** "Turf impulse > 0 on both boots in every primary step" contradicts the frozen +0.5 mm grounding gap: step 1 has no load. Post-hoc, IFM-1's style counts 13 of 14 loaded steps.
- **OC-3 cannot discriminate here.** It applies the simulation's balance law to the physical XcoM relative to the physical left ankle, plus the authoritative obstacle term. That evaluator classifies the **pre-contact** standing runner, and the whole C0 control, as FALL:
  - eH 0.358–0.36 at rest vs the boundary 0.352;
  - the static COM-to-left-ankle offset (0.22 m) plus the obstacle term already exceeds the boundary.
  - The authoritative e0 (0.312) is lower only because the simulation's contact-normal push points **toward** the left foot.
  - See the morning report and `evidence/dx_run1/PVP1A_DX_POSTHOC.json`.
