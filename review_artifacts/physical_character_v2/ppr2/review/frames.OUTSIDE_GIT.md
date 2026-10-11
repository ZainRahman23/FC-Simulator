# PPR-2 review frames, clip data and records, kept outside Git

**What:**
- the lossless PNG composites behind the 6 videos in `video/` (726 frames). There are 2 views, STAND and PUSHF, each in three variants: mesh, mesh + colliders, overlay;
- the TRC-1 clip data (`clips/*.json`);
- the run records the clips were rendered from (`records/*.json.gz`). These are deterministic re-runs of battery jobs. The push records' final hashes equal the frozen evidence (`PPR2_Q_*.json` `T2.runs["fwd.moderate"].finalHash`); the standing records are the first 1.2 s of T1.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ppr2/`, under `review/frames/<view>_<variant>/NNNN.png`, `review/clips/` and `records/`, with `SHA256SUMS`.

**Regenerate:**
1. `render/ppr2_save_runs.mjs --out <records>`
2. `ppr1/render/ppr1_clip_prep.mjs`:
   - A_STAND / S_STAND, steps 0–288, `--t0step 24`;
   - A_PUSHF / S_PUSHF, steps 0–96, `--t0step 24`.
3. `render/ppr2_capture.cjs --zoom 16`.

**Not rendered:** the lateral pushes, where S\*'s 10–23° lumbar lateral bend appears. TRC-1's fixed CAMERA_V1 looks along the lateral axis, so that bend would point toward the lens. Its numbers are in the review page and the report.
