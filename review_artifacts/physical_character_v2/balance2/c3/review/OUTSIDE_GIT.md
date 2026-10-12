# BALANCE-2 C3 review records, kept outside Git

**What is outside Git:** the 7 deterministic C3 run records the C3 panels were rendered from (`*_C3.json.gz`, 113 MB), with `SHA256SUMS_C3` and `FINAL_HASHES_C3.txt`.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance2/records/`. They sit beside the 28 BALANCE-2 records (CURRENT V2, S2 + P2, BALANCE-1 B, C2) used for the other panels.

**Not preserved:** the clip data (≈ 0.6 GB for C3). It regenerates deterministically from the records.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:
1. Records: `node review_artifacts/physical_character_v2/balance2/render/c3_save_runs.mjs --out <records>`
2. Clip data, once per run key: `ppr3_clip_prep.mjs`, exactly as in `balance2/review/OUTSIDE_GIT.md` step 2.
3. Videos, one view per process: `ppr3_capture.cjs --views review_artifacts/physical_character_v2/balance2/c3/review/video/VIEWS_C3.json --only <view id>`.
4. Inspection stills: the same command with `VIEWS_C3_FRAMES.json`.
