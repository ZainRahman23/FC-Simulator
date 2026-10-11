# Slow-motion review frames — kept outside Git (EVIDENCE_STORAGE_POLICY.md)

These are the lossless PNG composites behind every video: 8 case/body pairs × 61 frames × CLEAN / DIAG, 976 files, 163 MB.

- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ifm1/visual_review_slowmo/frames/<case>_<body>/{clean,diag}/NNNN.png`
- **Checksums:** `SHA256SUMS` beside them, itself sha256 `ce1c79d3a649a615b5c01573062352fff4208ce387f940a3d203d7a55a0d1c92`.
- **Regenerate:**
  1. `ifm1/render/slowmo/ifm1_slowmo_prep.mjs`
  2. `ifm1/render/slowmo/ifm1_slowmo_capture.cjs` (needs the frozen tag archive and `mp4-muxer` 5.2.2)
