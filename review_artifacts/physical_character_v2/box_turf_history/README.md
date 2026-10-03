# Box-turf history (accepted plant before the flat-plane turf decision)

These are compressed copies of the accepted artifacts as they stood at commit `d7a7fcb`, before the turf representation changed. They were produced with the historical 100 × 2 × 100 m Jolt box turf.

- **g0/json:** G0 results.
- **g1/json:** the accepted **post-D1G1** G1 run, commit `3d9ebb7`.
- **g2/json:** the committed G2 run, which predates D1G1. The accepted post-D1G1 G2 run is `../g2/postD1G1/g2_results_postD1G1.json.gz`.
- **g3/json:** the committed G3 run 3 and resolution files.

**Source:** `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` (user decision: adopt the flat-plane turf, reopen G1, keep the box only as a diagnostic historical configuration).

**Investigation B evidence:** `../engine_blowup_B/`.

The box remains selectable for diagnostics only: `cfg.turf = "box"` in `core/v2_jolt.js`, or `B_TURF=box` for the investigation tools.
