# ABI-1 S-IMPACT records, kept outside Git (EVIDENCE_STORAGE_POLICY.md)

**Records:** 36 runs: A / B / C × N2 ALL / LEGS × tackler entry velocity × {0.25, 0.5, 0.75, 1.25, 1.5, 2.0}, ≈ 3.7 MB each.
- Level 1.0 is the committed primary runs (`../run1/`).
- The per-level evaluations, the summary and the log are committed here.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/abi1/evidence/impact/`, with `SHA256SUMS`.
- **Regenerate:** `zsh abi1/scripts/abi1_impact.sh <dir> <primary runs dir>`. The runs are deterministic, and `impact.log` lists each final hash.
