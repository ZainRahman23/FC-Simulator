# SPEED-99-V1: handoff

**Presented for the owner's playtest.** The playtest blocker is fixed: see `PLAYTEST_FIX_REPORT.md`. Ball-off only. Not frozen, not integrated, ratings 1–98 not defined. **LOCAL ONLY.** The brief is in `sources/`, verbatim. The results are in `SPEED99_V1_REPORT.md`; the research is in `RESEARCH.md`.

**Page:** `http://127.0.0.1:8361/sandbox/visual/speed99.html` (`?pace=CURRENT|A|B|C`, `&ref=off|CURRENT|A|B|C`, `&ball=1`, `&cam=…`)

## Code (`sandbox/visual/speed99/`)

The directory is a copy of `tc_controlled1/`: TC-CONTROLLED-1's simulation, page and tools. `tc_controlled1/` is untouched.

| File | What |
|---|---|
| `pace.js` | **The candidates:** vmax (Sprint Speed); the acceleration curve a0 (1 − (v / vmax)^p), with a0 = vmax / τ, held at aEnd near vmax (Acceleration); the steering friction circle. Also the body helpers: acceleration gait, top-speed cadence / lead / contact, acceleration lean. `applyPace(P, id)` writes a candidate into the baseline's parameters. CURRENT writes nothing. |
| `s_movement.js` | **A copy of Astra's `agility99/movement.js`** (Astra's file is untouched) with three optional hooks, all inert for CURRENT: `params.accel(s)`, `params.steerGain`, `params.envExtend`. |
| `c_sim.js` | ControlledSim: `o.pace` is applied after reset and after `setAttrs`. |
| `u_sim.js` | Imports `advance` from `./s_movement.js`. The acceleration lean is added in `demandChannels` (candidates only). |
| `u_gait.js` | The acceleration gait, top-speed cadence and contact cap in `cad()`, and the lead in `place()` / `gaitPlace()` (candidates only). |
| `s_tests.js`, `u_viewer.js`, `../speed99.html` | **The playground:** the pace switch, the reference runner, the pace panel, the presets. The page also has two fixes: the request is re-read when a test ends mid-frame, and no ball is drawn with BALL OFF. |

**CURRENT ≡ TC-CONTROLLED-1, bit-identical:** `tools/s_equiv.mjs`, 48 / 48 runs (ball off; ball on FREE; ball on CONTROLLED).

## Verify (`speed99/tools/`)

| Command | What |
|---|---|
| `node s_equiv.mjs --seeds 8 --dur 30` | CURRENT / no pace ≡ TC-CONTROLLED-1 |
| `node s_matrix.mjs --pace CURRENT,A,B,C` | starts over 5–60 m, slowing, cuts with recovery, repeated cuts, long sprint, curves |
| `node s_body.mjs --pace CURRENT,A,B,C [--sweep]` | body integrity and steps; the 4 angles × 6 phases cut sweep |
| `node s_trunk.mjs` | the drawn trunk lean |
| `node s_cpu.mjs --pace CURRENT,A,B,C` | CPU by part |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node s_browser.cjs --out <dir>`, then `node u_resim.mjs <session>` | the page in Chrome; node ≡ browser |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node s_manual.cjs --pace C` | every manual sprint input path, played with real mouse and keyboard events |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node s_manual_vs_scripted.cjs` | manual = scripted (preset) = node, tick by tick, all paces (uses `s_node_top.mjs`) |

## Next (only on the owner's word)

1. The owner chooses a ceiling (A / B / C or between) and rules on the two A99-C interaction rules.
2. Build CONTROLLED-99-PACE beside CONTROLLED-CURRENT-PACE: the same code, `o.pace` with the ball on, then Technical Control adapts (§22–25: long sprint touches in open space, tightening under steering, zero controller failures).
