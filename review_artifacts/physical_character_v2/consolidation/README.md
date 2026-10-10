# Consolidation during the external architecture review (10 Oct 2026)

**Source:** `../sources/2026-10-10_user_instruction_pause_consolidate.md` (verbatim, 71129acf).

**Scope:**
- PI-1 architecture development is paused. No carrier, gait law, promotion rule, recovery, handoff, collision or presentation change was made.
- V2, the Jolt settings, gameplay geometry, simulation outcomes and frozen criteria are unchanged.
- No new development slice was started.

## Deliverables

| item | file |
|---|---|
| 1. canonical evidence document (incl. contradictions and the review questions) | `CANONICAL_EVIDENCE.md` |
| 2. interaction benchmark package IB-1 | `../interaction_benchmark/` (`README.md`, `MANIFEST.json`, `scenarios/`, `records/`, `SHA256SUMS`) |
| 3. architecture-neutral metrics (hard requirements vs quality metrics) | `../interaction_benchmark/METRICS.md` |
| 4. reusable-component audit | `COMPONENT_AUDIT.md` |
| 5. tooling | this file, below |

## Tooling (item 5)

**No existing tool, gate, exporter or evaluator was modified.**

**Added (read-only, new files only):**
- `../interaction_benchmark/scripts/ib_extract.mjs`: builds the manifest and scenario files from the frozen records.
  - The only derived quantity is the surface distance, computed with the exporter's own formula.
  - It reproduces the records' d_now column exactly (max |Δ| = 0 in all 5 cases).
- `../interaction_benchmark/scripts/ib_verify.mjs`: checks record checksums against the committed summaries, gameplay-hash recomputation and cross-mode equality (V1 – V6).

**Reproducibility checks run:**
- the extractor run twice: `MANIFEST.json` and all five scenario files byte-identical;
- the verifier run twice: identical reports (`../interaction_benchmark/evidence/ib_verify_run{1,2}.txt`), 59 pass, 1 note, 0 fail;
- the tracked files outside the new folders are unchanged (no diff);
- the frozen PCS-1 files' SHA-256 are unchanged.

**Issues found and deliberately not fixed.** Each sits in frozen tooling, or a fix would regenerate committed evidence. None affects a verdict. Details are in `CANONICAL_EVIDENCE.md` §4.

| issue | location | why not fixed |
|---|---|---|
| FULL / LOCO record bytes not reproducible (wall-clock `cpu` field) | AIR exporters | Changing the export schema would break every existing record comparison. IB-1 uses a content hash without `cpu` instead. |
| summary field `firstPredTick` is a row index | AIR exporters | Renaming breaks consumers. Documented in IB-1 §4. |
| `valid_*.json` "valid" flag excludes HG-T (the cause of the 39 / 38 error) | `../locomotion_continuity/scripts/lc_valid.mjs` | Frozen LC-1 evaluation. Erratum already recorded (fbdb6f55). |
| CG-5 overlap ratio −38,910,505.8 when the D-1 body is never struck | `../pi1/trackB/scripts/compat_gate_v13.mjs` output | Frozen gate. The pass value is unaffected. |
| scripts depend on `V13_WT`, a local copy of `5042230` (scratch) | `../pi1/trackB/scripts/pcg_f0.mjs` and dependants | Not a code bug. Recreate the copy with `git worktree add <dir> 5042230`. The scratch copy's `match.html` was checked identical to 5042230. |
