# D6 diagnostic — analysis probes (2026-09-30)

Exploration and verification scripts from the D6 diagnostic session, preserved from the session scratchpad (it does not survive a reboot).
Run from `sandbox/visual/physchar` as `node <probe> "$PWD" …` (the first argument is the physchar directory). All are read-only against the
gate modules; none changes a default.

| file | what it did |
|---|---|
| `d6_probe.mjs` | first baseline causal-chain probe (per-body Newton impulse estimate; `--plate` for the force-plate twin) — the "mixed" estimates that motivated the plate |
| `d6x_try.mjs` | quick knob exploration: `node d6x_try.mjs "$PWD" '[{"name":"v6.0","A":{"init":{"speed":6.0}}}]'` (speed, lead-leg raise, load, width, yaw, controller, friction, geometry) |
| `mu.mjs` | traced B's friction belief (`muObs`, `fricR`) during the hit — exposed the friction-observer bug (μ 0.037 on 0.9 turf) |
| `trace.mjs` | step-by-step classification / feet / stepper trace (the C1 release-while-replanting window, `D6X_load20`) |
| `one.mjs` | one D6X test through `pc_d6diag` (optionally `--plate`): the hKnee step and the hLowShin bistability |
| `uismoke.mjs` + `uismoke_d6ui_snippet.js` | Node smoke test of the harness D6 panel / chart / overlay functions with stubbed canvas + DOM (no browser) |
| `matrix_table.md` | the report's matrix table, generated from `../json/d6x_matrix.json` |
| `regress_post_mu_fix.txt` | `tools/review/regress.sh` after the fix (Gate D vs the post-fix baseline) + the same run vs the preserved pre-fix baseline |

The matrix itself is produced by `sandbox/visual/physchar/tools/d6x_run.js` (measurement code `pc_d6diag.js`, variants `pc_d6x.js`).
