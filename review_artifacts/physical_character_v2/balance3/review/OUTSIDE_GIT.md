# BALANCE-3 review records, kept outside Git

**What is outside Git:** the 9 deterministic B3 records the review panels were rendered from (`*_B3.json.gz`: the 7 BALANCE-2 scenarios, plus the 14 s P8 twin and back-small runs), with `SHA256SUMS` and `FINAL_HASHES_B3.txt`.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance3/records/`

**C3 panels** come from the preserved BALANCE-2 records (`…/balance2/records/`: `*_C3.json.gz`, `P8BACKS_C3.json.gz`).

**Not preserved:** the clip data. It regenerates deterministically.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:
1. Records: `node review_artifacts/physical_character_v2/balance3/render/b3_save_runs.mjs --out <records>`
2. Clip data: `ppr3_clip_prep.mjs`, exactly as in `balance2/review/OUTSIDE_GIT.md` (1440 steps; 3360 for P8).
3. Video: `ppr3_capture.cjs` with `balance3/review/video/VIEWS_B3.json` (stills: `VIEWS_B3_FRAMES.json`), one view per process.
