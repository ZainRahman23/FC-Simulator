# BALANCE-2 review records, kept outside Git

**What is outside Git:** the 28 deterministic run records the clips were rendered from (`records/*.json.gz`, 413 MB), with `SHA256SUMS` and `FINAL_HASHES.txt` (each run's final hash).

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance2/records/`

**Not preserved:** the clip data (2.3 GB). It regenerates deterministically from the records, and disk space was short (14 GB free).

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:

1. Records:
   ```
   node review_artifacts/physical_character_v2/balance2/render/b2_save_runs.mjs --out <records>
   ```
2. Clip data, once per run key `<K>`:
   ```
   node review_artifacts/physical_character_v2/ppr3/render/ppr3_clip_prep.mjs --key <K> --run <records>/<K>.json.gz --fixture review_artifacts/physical_character_v2/ppr3/fixture/PPR3_STANDING_ENTRY.json <steps> --out <clips>
   ```
   - QUIET runs: `<steps>` = `--steps 0-1440`
   - push runs: `<steps>` = `--steps 0-1440 --t0step 480`
3. Videos, one view per process (capturing all 14 views in one process ran out of memory). Needs `PUPPETEER_NODE_MODULES` and `MP4_MUXER`:
   ```
   node review_artifacts/physical_character_v2/ppr3/render/ppr3_capture.cjs --clips <clips> --views review_artifacts/physical_character_v2/balance2/review/video/VIEWS.json --archive <tag archive> --out <dir> --only <view id>
   ```
