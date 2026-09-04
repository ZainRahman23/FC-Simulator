# Goalkeeper V1 evaluation battery (deterministic)

A reusable measurement harness for the JS playtest keeper in `sandbox/visual/match.js`. It fires
**real production shots** (the same charge/launch path the player uses) from a fixed matrix of
shooter positions × techniques × charges × aims, twice each: keeper OFF (the untouched goal-line
crossing is the shot's bin coordinate) and keeper ON, and records per shot whether the keeper made a
physical contact, the Stage-4 outcome, and whether a goal resulted.

It reports three numbers **separately** (never a single "save %"):

| metric | meaning |
|--------|---------|
| contact rate | on-target shots the keeper physically touched (Stage-3 reach/timing) |
| save given contact | touched shots that did not become goals (Stage-4 contact quality) |
| total save | product of the two, per class, band and goal-face cell |

The battery is a **measurement, not an objective**: never tune keeper constants against it.

## Run
```
# preview server (engine on :8000) as usual:
python3 sandbox/visual/serve_match.py                      # serves http://127.0.0.1:8124/...

# harness (puppeteer-core + Google Chrome; install puppeteer-core once in a scratch dir)
PUPPETEER_NODE_MODULES=/path/to/scratch/node_modules \
node sandbox/visual/tools/gk_eval/gk_eval_battery.js --out gk_eval.json           # full: 2730 shots ≈ 8 min
node sandbox/visual/tools/gk_eval/gk_eval_battery.js --quick --out gk_eval_q.json  # 405 shots ≈ 1 min
node sandbox/visual/tools/gk_eval/gk_eval_battery.js --bands K1,K2,K3 --momentum SET,TOWARD,AWAY --select S2

# sheets
python3 sandbox/visual/tools/gk_eval/gk_eval_render.py gk_eval.json out_dir/
python3 sandbox/visual/tools/gk_eval/gk_eval_render.py before.json --compare after.json out_dir/
```
Options: `--url` (page to test; use a mirror server to compare builds), `--bands` (K1 reference by
default), `--momentum` (SET / TOWARD / AWAY wrong-way momentum presets), `--select` (interception
selection policy override S2/S3/S1; default = build default), `--quick`.

## Determinism
The playtest is a fixed 60 Hz step with no RNG. Two runs of the same build produce byte-identical
JSON (apart from the `generated` timestamp); a change in any number is a change in the keeper or
the ball physics. Keep a reference JSON per frozen build and diff with `--compare`.

## Output JSON
`meta` (matrix, keeper config, policy constants), `shots[]` with the shot spec, keeper-OFF crossing `u`,
keeper-plane crossing `plane`, `commit` (time, tier, envelope norm, depth of the chosen point relative
to the SET position), `contact` (time, surface, outcome, held, point, reach norm, in/out speed),
`minSep` (closest hand-ball approach when no contact) and `goal`.

---

## Integration-pass tooling (2026-09-04)

All tools take `--url` (default the mirror server `http://127.0.0.1:8126/sandbox/visual/match.html`) and need
`PUPPETEER_NODE_MODULES` / `GK_EVAL_PROFILE_DIR` as above. Everything is deterministic; identical inputs give
byte-identical JSON.

| tool | purpose |
|---|---|
| `gk_envelope.js` | save-envelope maps from controlled synthetic launches: dense goal-face grid at the goal line (`--target line`) or at the keeper's SET plane (`--target plane`); controlled `--flight` / `--usable` / `--speed`; `--family STRAIGHT|INSIDE_R`; `--profile K1|K2|K3|POOR|BELOW|GOOD|VGOOD|ELITE|{json}` (explicit attributes + height/weight, no OVR); `--model CAUSAL|TIER`; `--x3 A|B|C|D`. Records keeper-OFF reference (goal-line crossing, keeper-plane position), Stage-3 commit (action, execT, norm, feasibility), Stage-4 contact (surface, outcome, held, quality factors), goal, closest approach. |
| `gk_envelope_render.py` | one JSON → CONTACT / SAVE / CATCH maps, keeper-plane rebin, norm & execT maps; `--grid "P1,P2" --times "t1,t2" --pattern "…{p}…{t}.json" --metric contact|save|catch [--plane]` → profile × time sheets |
| `gk_failure_classify.py` | tags every conceded on-target cell from measured state (REACTION / ACTION-TIME / PREPARE / LATERAL- / VERTICAL- / ABSOLUTE-REACH / PREDICTION / POSITIONING / FINGERTIP-THROUGH / WEAK-PARRY-THROUGH / BODY-THROUGH / FOOT-LEG-THROUGH / REBOUND-GOAL / HANDLING-FAILURE) and names the binding constraint |
| `gk_attr_monotonic.js` | every attribute × 5–7 levels: owned causal quantities must be monotone; unowned quantities must not move (e.g. handling must not touch reach or latency; height must not touch latency/accel) |
| `gk_rebound_chains.js` | solver-aimed multi-contact scenarios (crossbar → keeper → goal, keeper → post → out, …) with a per-tick tunnelling detector (ball inside a frame capsule or keeper volume without an event); `--search` scans launch/keeper families |
| `gk_eval_battery.js` | (pre-existing) the real production shot corpus, keeper OFF/ON |

Profiles in `gk_envelope.js`: `POOR / BELOW / GOOD / VGOOD / ELITE` are synthetic evaluation bands with plausible
attribute mixes; their OVR-equivalent labels are documentation only — the engine never sees an OVR.
