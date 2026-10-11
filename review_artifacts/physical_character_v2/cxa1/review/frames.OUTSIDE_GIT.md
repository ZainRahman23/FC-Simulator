# CXA-1 review frames, kept outside Git

**What:** the lossless PNG composites behind the 7 videos in `video/`.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/cxa1/review/frames/<view>/NNNN.png`, with `SHA256SUMS`.
- **Regenerate:** run `render/cxa1_clip_prep.mjs` for DX, CF1 and EXT (the audits and mesh audits in `../evidence/`), then `render/cxa1_capture.cjs`. It needs the frozen tag archive, puppeteer-core and `mp4-muxer` 5.2.2.
