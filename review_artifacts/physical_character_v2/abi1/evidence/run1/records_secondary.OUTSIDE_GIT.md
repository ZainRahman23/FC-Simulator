# ABI-1 run 1: secondary and repeat records, kept outside Git (EVIDENCE_STORAGE_POLICY.md)

The 9 primary records (A / B / C × N2_ALL, C0_ALL, N2_LEGS), every evaluation JSON, the CPU JSON and the execution log are committed here.

**Kept outside Git** (each ≈ 3.7 MB):
- the determinism repeats `B_N2_ALL_rep` and `C_N2_ALL_rep` (final hashes identical to the primary runs: 27a1ee7ddc0880ff, ba7a08ab1a1fed84);
- the S-DX (`DX_*`), S-TONE (`T_*`), S-DELAY (`D24_*`, `D36_*`) and S-ABL (`B0_*`, `B1_*`) records.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/abi1/evidence/run1/`
- **Checksums:** `SHA256SUMS` beside them.
- **Regenerate:** `zsh abi1/scripts/abi1_execute.sh <dir>` at the pre-run freeze commit 5a8704ca. Every run is deterministic, and `execute.log` lists each final hash.
