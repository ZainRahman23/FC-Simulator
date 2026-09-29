# Verification records — Courtois integration (2026-09-23)
- `final_gate_all.md` / `final_gate_dist.md`: gk3d_gate.js --precision full comparisons (sprite / OFF / 3D test / 3D Courtois), 80 fixtures x 260 ticks and 12 distribution fixtures x 300 ticks; `*_hashes.json` = the per-fixture trace hashes + final rows (full traces are in the scratch run).
- `final_manifest_cmp.md`: frozen TEST-character motion manifests vs the v13.1 baseline (42 identical; others ball-radius only / cradle hands).
- `survey_final_*.json`: every fixture through the 3D backend, 300 ticks (asserts, hand/ball flags, cradle flags, sole clearance, palm / laces contact, solve ms).
