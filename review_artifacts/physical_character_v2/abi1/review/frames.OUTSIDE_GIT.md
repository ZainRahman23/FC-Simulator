# ABI-1 review frames, kept outside Git (EVIDENCE_STORAGE_POLICY.md)

**What:** the lossless PNG composites behind every video in `video/`: 9 views, 2,093 frames.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/abi1/review/frames/<view>/NNNN.png`, with `SHA256SUMS`.
- **Regenerate:**
  1. Run `render/abi1_clip_prep.mjs` for each clip set:
     - primary: `evidence/run1` + `ABI1_EVAL.json`;
     - v075: the impact runs with `--prefix V0.75_` and `ABI1_EVAL_S-IMPACT_V0.75.json`;
     - tone: `--prefix T_` with `ABI1_EVAL_S-TONE.json`.
  2. Run `render/abi1_capture.cjs`. It needs the frozen tag archive including gabriel, puppeteer-core and `mp4-muxer` 5.2.2.
