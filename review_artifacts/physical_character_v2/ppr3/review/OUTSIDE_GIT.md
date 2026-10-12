# PPR-3 review clip data and records, kept outside Git

**What:**
- the 12 run records the clips were rendered from (`records/*.json.gz`, ≈ 110 MB);
- the TRC-1 clip data (`review/clips/*.json`, ≈ 690 MB).

Both are deterministic. `records/FINAL_HASHES.txt` lists each run's final hash. All 12 were regenerated on the **frozen** `scripts/ppr3_ctrl.mjs` (it matches `PPR3_P2_FREEZE.json`) and reproduce bit for bit.

**Runs:**
- STAND_A / STAND_S2 / STAND_S2P2: 1,440 steps, undisturbed. STAND_S2 is S2 alone, with constant tone.
- PUSHF / PUSHL / PUSHX × A / S2R / S2P2: 840 steps, pelvis pulse at step 120 (t = 0.5 s), 50 ms:
  - PUSHF: 9.7 N·s forward;
  - PUSHL: 24.9 N·s left;
  - PUSHX: 36.4 N·s forward.
- S2R = S2 with STAND_S2P2's undisturbed P2 command log replayed (no feedback).

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ppr3/`, with `SHA256SUMS`.

**Regenerate** (from the worktree root, with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive>`):
1. `node review_artifacts/physical_character_v2/ppr3/render/ppr3_save_runs.mjs --out <records>`
2. `node review_artifacts/physical_character_v2/ppr3/render/ppr3_clip_prep.mjs --key <K> --run <records>/<K>.json.gz --fixture review_artifacts/physical_character_v2/ppr3/fixture/PPR3_STANDING_ENTRY.json --steps 0-1440` for the STAND runs, or `--steps 0-840 --t0step 120` for the push runs, `--out <clips>`
3. `node review_artifacts/physical_character_v2/ppr3/render/ppr3_capture.cjs --clips <clips> --views review/video/VIEWS.json --archive <tag archive> --out <dir>` (needs `PUPPETEER_NODE_MODULES` and `MP4_MUXER`)

**Not kept:** lossless PNG frames. The capture is deterministic; re-run step 3 with `"saveFrames": true` in a view to get them.
