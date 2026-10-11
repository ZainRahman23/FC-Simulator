# CXA-1 creation-order run records, kept outside Git

**Records:** `DX_RT`, `DX_TR`, `CF1_RT` and `CF1_TR`, ≈ 3.4 MB each.
- These are the N2 runs through the diagnostic copy of the frozen plant: default order and tackler-first.
- The RT runs reproduce the committed records bit for bit (DX `e5751b0cbdd7c2b9`, CF1 `20c6161b170403f8`).
- The TR runs' final hashes are DX `91e7b0899d4e42e7` and CF1 `12bbf3e3ee6f96e1`.
- Their audits (`CXA1_DX_TR.json.gz`, `CXA1_CF1_TR.json.gz`) are committed here.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/cxa1/evidence/`, with `SHA256SUMS`.
- **Regenerate:** `V2_KNEE_MODEL=v2k node cxa1/scripts/cxa1_order_runs.mjs --fixture <fixture> --order TR|RT --out <file>`. The runs are deterministic.
