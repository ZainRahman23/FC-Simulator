# clip_frames — kept outside Git (EVIDENCE_STORAGE_POLICY.md)

These are the lossless PNG frames of every IFM-1 gameplay-camera capture, for all 24 trajectories.
- **Normal speed:** labelled and blind, 25 frames each.
- **Diagnostic 0.25×:** 97 frames.

The committed `clips/` folder holds lossy animated WebP encodings and magnified sheets made from these frames.

- **Location:** `~/Downloads/FC Simulator worktrees/_preserved_2026-10-11_evidence_outside_git/review_artifacts/physical_character_v2/ifm1/evidence/run3/clip_frames/`
- **Contents:** 3,528 PNG files, 1.6 GB; `<trajectory>/{lab,blind,diag}/NNNNN.png`.
- **Checksums:** `SHA256SUMS` beside the frames, itself sha256 `fe37ae4f12c3fccf489969ef14334f0b3a33f9c41dc68decb86a2fcb4c8082e9`.
- **Regenerate:** the run-3 records (`records/`) → `ifm1/render/ifm1_clip_prep.mjs` → `ifm1/render/ifm1_clip_capture.cjs`. The frozen tag archive is required.
  - The tooling hashes are in `render/IFM1_RENDER_MANIFEST.json`.
  - Re-captured frames were bit-identical in the pinned runtime (`render/RENDER_DETERMINISM.md`).
