# TECHNICAL-CONTROL-1.2 — handoff

**State:** presented for the owner's visual acceptance of basic carrying (owner §24).

- NOT frozen and NOT integrated.
- Fancier skills wait for that acceptance.

## Code (`sandbox/visual/technical_control12/`)

| file | contents |
|---|---|
| `tc12_core.js` | the carry model (see below) |
| `tc12_cases.js` | the carry reference course and the reference players |
| `tc12_viewer.js` + `../technical_control12.html` | the carry lab (see below) |

### `tc12_core.js`

The carry model:

- `CM`;
- `CarryEpisode extends TechEpisode`:
  - `laneLat` / `contactPoint` — the ball lane;
  - `carryNext` — foot, rhythm and lane;
  - `fitStyled` — surfaces by function;
  - `selectAction` — the actions on the lane;
  - `findNext` / `findOn` — the dominant foot in the closed loop;
- `CarrySim extends TechSim` — episodes made carry episodes, the two-footed preferred-foot fix, the ball in the lane at a dribble start;
- the `DOMINANT_CLOSE` style.

### `tc12_viewer.js` + `../technical_control12.html`

The carry lab is the feet lab with `model=new|old` and `cmp=model`, run cameras (`fRun`, `fRear`, `fTopRun`), and the feet and surfaces counted in the header.

## Tools (`tools/`)

| tool | purpose |
|---|---|
| `tc12_carry` | the §19 – §20 metrics; `makeCarry` |
| `tc12_sweep` + `tc12_summary.py` | sweep and summary |
| `tc12_checks` | determinism, legs neutral, failures, separation |
| `tc12_cpu` | CPU |
| `tc12_frozen.py` | protected files |
| `tc12_capture.cjs` · `tc12_clips.sh` · `tc12_lists.mjs` · `clip_lists/` | clips |
| `tc12_review_build.mjs` | the review page |

## Rebuild

```
cd sandbox/visual/technical_control12/tools
for s in 1 2 3; do node tc12_sweep.mjs <ev>/tc12_carry_sweep.jsonl 99 $s; done && node tc12_checks.mjs <ev>/tc12_checks.json   # (shards: i/3, then merge)
python3 tc12_summary.py <ev> && node tc12_cpu.mjs <ev>/tc12_cpu.json && python3 tc12_frozen.py <ev>/frozen_check.txt
node tc12_lists.mjs && S=<scratch> zsh tc12_clips.sh clip_lists/tc12_clips.txt <ra>/clips 3 && node tc12_review_build.mjs
```
