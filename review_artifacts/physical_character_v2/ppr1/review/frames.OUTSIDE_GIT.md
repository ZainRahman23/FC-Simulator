# PPR-1 review frames, kept outside Git

**What:** the lossless PNG composites behind the 15 videos in `video/` (648 frames, 201 MB). There are 5 views, each in three variants: mesh, mesh + colliders, overlay.

**Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ppr1/review/frames/<view>_<variant>/NNNN.png`, with `SHA256SUMS`.

**Regenerate:**
1. Run `render/ppr1_clip_prep.mjs` on the battery records:
   - A_N2 / B_N2, steps 0–31, with the lead-in;
   - A_C0 / B_C0, with `--t0step 3`;
   - A_IMP / B_IMP from `*_IMP_shankR_back`, steps 0–48.
2. Then run `render/ppr1_capture.cjs`.

It needs the frozen tag archive, puppeteer-core and `mp4-muxer` 5.2.2.
