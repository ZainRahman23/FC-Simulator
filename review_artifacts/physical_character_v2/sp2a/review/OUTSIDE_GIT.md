# SP2A: what is outside Git, and why

- **`review/local_reference/` (gitignored).** The REFERENCE | SP2 | SP2A and START REFERENCE | SP2 | SP2A composites. Both references are third-party footage: the broadcast slide tackle (SP2's reference) and the stylised "RABONA" game trailer supplied with the SP2A brief. Rebuild them with `render/sp2a_compose_reference.sh` from the preserved references and our own renders.
- **`FC Simulator worktrees/_preserved_2026-10-14_evidence_outside_git/sp2a/`:**
  - `reference/`: the start reference, sha256 `f53f9cc6…`;
  - `records/eval/`: SP2A run records at 4.5 / 5.0 / 5.5 m/s;
  - `records/obstacles/`: the O0–O3 records;
  - `search/`: the full S1–S8 search logs, gzipped.
- **What is in Git:** our own renders (`review/video/`), the reference analysis as text (`REFERENCE_SP2A_ANALYSIS.md`, with no frames), and the evidence summaries (`evidence/`).
