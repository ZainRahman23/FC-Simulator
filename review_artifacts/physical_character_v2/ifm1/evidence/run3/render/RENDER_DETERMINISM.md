# Rendered-pose and pixel repeatability (prereg §12; post-freeze presentation tooling)

- **Rendered pose:** `ifm1_clip_prep.mjs` was run twice in fresh processes on the run-3 records. All 26 per-trajectory clip-data files (23-bone world and skin matrices, landmarks, collider outlines) and `clip_meta.json` are **byte-identical**.
- **Pixels:** three trajectories (`C0_R0_S-FLAT`, `N_SH_RH1`, `X_TP_R0`) were captured a second time in a fresh browser on another port. Every lossless frame is **bit-identical**, in all three variants (labelled, blind, diagnostic), and so are the projected-landmark files.
  - This is within the pinned runtime only: HeadlessChrome 154, ANGLE/Metal, Apple M4. Another GPU or driver is not covered.
- **Projection cross-check:** the page's `rv1Proj` (float32 matrices) was compared against an independent float64 re-implementation of `rv1GameCam` / `rv1Proj` in `ifm1_clip_screen.mjs`. Over 15,360 projected points the maximum difference is 3.9e-5 px.
- **Evaluation reproduction:** `ifm1_eval.mjs` run on the committed `records/` reproduces `IFM1_EVAL.json` **byte for byte**.
