# TRC-1 review frames, kept outside Git

**What:** the lossless PNG composites behind the 18 videos in `video/` (2,168 frames, 663 MB). There are 9 views, each in a mesh variant and a mesh + colliders variant.

**Where and how:**
- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/trc1/review/frames/<view>_<mesh|colliders>/NNNN.png`, with `SHA256SUMS`.
- **Regenerate:**
  1. Run `render/trc1_clip_prep.mjs` for each record. These are DX_N2, DX_C0, CF1_A/B/C, CF1_A0 and V075_A/B/C, from the committed PVP-1A-DX / ABI-1 records and the S-IMPACT 0.75× records preserved outside Git under `abi1/evidence/impact`.
  2. Then run `render/trc1_capture.cjs`.

  It needs the frozen tag archive (`LV2_ARCHIVE`, `V2_KNEE_MODEL=v2k`), puppeteer-core and `mp4-muxer` 5.2.2.
- **Nothing is re-simulated.** Each frame is drawn from a recorded body state.
