# P8 review records, kept outside Git

**What is outside Git:** the two 14 s C3 records the P8 clip was rendered from: the undisturbed twin and B2M back.small, 5.84 N·s (`P8TWIN_C3.json.gz`, `P8BACKS_C3.json.gz`, 79 MB), with `SHA256SUMS_P8` and `FINAL_HASHES_P8.txt`.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance2/records/`

**Not preserved:** the clip data (≈ 0.4 GB). It regenerates from the records.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:
1. Records: `node review_artifacts/physical_character_v2/balance2/p8/p8_save_runs.mjs --out <records>`
2. Clip data: `ppr3_clip_prep.mjs --key <K> --run <records>/<K>.json.gz --fixture review_artifacts/physical_character_v2/ppr3/fixture/PPR3_STANDING_ENTRY.json --steps 0-3360 [--t0step 480] --out <clips>`
3. Video and stills: `ppr3_capture.cjs --clips <clips> --views review_artifacts/physical_character_v2/balance2/p8/review/video/VIEWS_P8.json --archive <tag archive> --out <dir> --only <view id>`
