# Publication checks — 23 Oct 2026 (≈ 14:10–14:50 EEST)

These checks ran on the dribble-1 worktree at code commit `0c65eac3`, before anything was pushed. No gameplay source changed after that commit; the later commits are documentation and housekeeping only. Node v22.19.0. The runs were written to the scratchpad and compared with `review_artifacts/body_feint_v2/evidence/`.

| Check | Command (in `sandbox/visual/feint2/tools`) | Result | vs committed evidence |
|---|---|---|---|
| Baseline lock | `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` (root) | **PASS**, before every commit | — |
| Curated cases | `node v_cases_run.mjs --body 1` | 116 cases · 92/101 with every request PLAYED · 0 exits · 0 missed · normal-visible 10 (9 cases) | **identical** |
| Body Feint V2 cases | `node feint_measure.mjs` | 10 cases PLAYED; jog L→R touch 1.02 s, fake 0.12 m; the mirrors identical | **identical** |
| Rapid input | `node feint_rapid.mjs` | 28 runs · body normal 2 · slow 48 · spikes > 900°/s 59 · planted foot turned 0 · 0 exits · 0 missed · worst hand step 11.3 cm | **identical** |
| Determinism | `node v_det.mjs --seeds 18 --dur 30` | 18/18 simulated twice · 18/18 replay path | **identical** |
| Technique battery | `node v_battery.mjs` | 67/72 PLAYED | **identical** |
| Extreme, ball on | `node v_extreme.mjs --ball 1` | 140 runs · normal 61 · slow 131 · 0 missed · 0 exits | **identical** |
| Extreme, ball off | `node v_extreme.mjs --ball 0` | 140 runs · normal 61 · slow 69 | **identical** |
| Body torture | `node v_bodytort.mjs --seeds 18 --dur 60` | normal-visible 254 · slow-motion 328 · diag 21 | **identical** |
| Possession torture | `node c_torture.mjs --configs CONTROLLED --seeds 40 --dur 60 --pace D38 --vocab EXPANDED --carry B --verbose` | 39.2 simulated min · OBSERVED LOSSES 10 (0.26/min) · missed contacts 0 · touches/s 2.72 · sep max 1.76 m | **identical** apart from the CPU timing (96.5 vs 109.7 ms per simulated s); all 10 loss lines identical |

**Not re-run:**
- `v_cpu.mjs`: timing, not byte-comparable;
- `v_intent_torture.mjs`: its output includes CPU time;
- `v_browser.cjs`: this was a publication task with no source change, and its last run is `evidence/browser.json`, with 0 console errors and 0 HTTP errors.

The review server was serving the worktree at the time: `feint2_lab.html` returned HTTP 200.
