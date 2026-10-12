# BALANCE-1 review clip records and clip data, kept outside Git

**What is outside Git:**
- the 15 run records the clips were rendered from (`records/*.json.gz`, ≈ 140 MB);
- the TRC-1 clip data (`clips/*.json`, ≈ 835 MB).

Both are deterministic. `records/FINAL_HASHES.txt` lists each run's final hash.

**Runs** (`render/b1_save_runs.mjs`; pelvis pulse of 50 ms at step 120, t = 0.5 s):

| Scenario | Steps | Push |
|---|---|---|
| STAND | 1,440 | none (undisturbed) |
| SMALLF | 840 | 6.5 N·s forward |
| PUSHF | 840 | 12.0 N·s forward |
| PUSHL | 840 | 15.0 N·s left |
| PUSHX | 840 | 28.0 N·s forward (over-limit) |

Each scenario is run three ways:
- **A:** CURRENT V2;
- **S2P2:** PPR-3 S2 + old P2, the frozen candidates;
- **B1:** M1b + BALANCE-1 variant B (`params/B1_B.json`, body `params/B1_BODY.json`).

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-12_evidence_outside_git/review_artifacts/physical_character_v2/balance1/`, with `SHA256SUMS`.

**Regenerate** from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`:
1. Records:
   ```
   node review_artifacts/physical_character_v2/balance1/render/b1_save_runs.mjs --ctrl review_artifacts/physical_character_v2/balance1/params/B1_B.json --body review_artifacts/physical_character_v2/balance1/params/B1_BODY.json --out <records>
   ```
2. Clip data, once per run key `<K>`:
   ```
   node review_artifacts/physical_character_v2/ppr3/render/ppr3_clip_prep.mjs --key <K> --run <records>/<K>.json.gz --fixture review_artifacts/physical_character_v2/ppr3/fixture/PPR3_STANDING_ENTRY.json <steps> --out <clips>
   ```
   - STAND runs: `<steps>` = `--steps 0-1440`
   - push runs: `<steps>` = `--steps 0-840 --t0step 120`
3. Videos (needs `PUPPETEER_NODE_MODULES` and `MP4_MUXER`):
   ```
   node review_artifacts/physical_character_v2/ppr3/render/ppr3_capture.cjs --clips <clips> --views review_artifacts/physical_character_v2/balance1/review/video/VIEWS.json --archive <tag archive> --out <dir>
   ```

**In Git:** the 32 MP4s in `review/video/` (largest 3.9 MB) and `CAPTURE.json`.
