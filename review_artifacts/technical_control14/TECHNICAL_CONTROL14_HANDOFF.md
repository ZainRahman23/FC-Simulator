# TECHNICAL-CONTROL-1.4 — handoff

**State:** presented for the owner's visual review (owner §19).

- NOT frozen and NOT integrated.
- The fancy-move library is not expanded.

## Code (`sandbox/visual/technical_control14/`)

| file | contents |
|---|---|
| `tc14_core.js` | `EFF` (constants) · `effParams` · `lineTime` · `EffEpisode extends CarryEpisode` · `EffSim extends FlowSim` (see below) |
| `tc14_body.js` | `ChopBody extends FlowBody` — the chop / Cruyff standing foot lands just past and beside the ball (presentation) |
| `tc14_viewer.js` + `../technical_control14.html` | the efficiency lab (see below) |

### `EffEpisode` (gameplay)

| method | role |
|---|---|
| `selectAction` | family × swings, the contact on its way included; costs: contacts, time, the new-line time, difficulty vs `eff`, style |
| `diffOf` · `rangeOf` · `bodyOf` · `candLine` | the cost terms |
| `watch` | the between-contacts decision, window `adapt(D)` |
| `plan` | a carry touch before an action only when the time needs one |
| `carryNext` | the exit touch |
| `rebuildSwings` | mid-swing contact + the standing leg |
| `standingAt` · `quickPlant` | the standing foot: planted at the contact; the quick plant step on the contact on its way |
| `splice` | the chop's stronger redirection |
| `applyAction` | registers the action and rebuilds the gait with its standing leg |

`EffSim` hooks the watch into `afterPost` (TECHNICAL-CONTROL-1's `watch` was never called), and sets the Dribbling parameters and the style key.

**The chop:** `VOCAB.CHOP` and `ROLE_AT.chop` are added to TECHNICAL-CONTROL-1's objects at import. They are not in its selection order, so TECHNICAL-CONTROL-1 and 1.2 never choose it.

### The lab (`tc14_viewer.js`)

| URL parameter | effect |
|---|---|
| `body=tc14` (default) | TECHNICAL-CONTROL-1.4 |
| `body=tc13` | TC1.2 technique with the TC1.3 body |
| `cmp=dri` | Dribbling 99 \| 80 \| 50 |
| `cmp=eff` | TC1.2 vs TC1.4 |

- Each header shows the action and the contacts since the turn was asked.
- The case list adds the efficiency cuts (`CUT<deg>[_L]`).

## Tools (`tools/`)

| tool | purpose |
|---|---|
| `tc14_env.mjs` | `makeEff` |
| `tc14_eff.mjs` | the efficiency test (`--set=main\|attrs\|styles`; model `tc12\|tc14`) |
| `tc14_phase.mjs` | TECHNICAL-CONTROL-1.3's phasing diagnostics on the efficiency cases (`--before`: TC1.2's cuts on FlowBody) |
| `tc14_torture.mjs` | TECHNICAL-CONTROL-1.3's torture set on TECHNICAL-CONTROL-1.4 |
| `tc14_checks.mjs` | determinism, body neutral, pose repeatable, carry model |
| `tc14_open.mjs` | open / tight carrying |
| `tc14_cpu.mjs` | CPU |
| `tc14_summary.py` | evidence summary |
| `tc14_frozen.py` | protected and reference files |
| `tc14_capture.cjs` · `tc14_clips.sh` · `tc14_strips.sh` · `tc14_lists.mjs` · `clip_lists/` | clips and strips |
| `tc14_review_build.mjs` | the review page |

## Rebuild

```
cd sandbox/visual/technical_control14/tools; E=../../../../review_artifacts/technical_control14/evidence
for m in tc12 tc14; do for set in main attrs styles; do for i in 0 1 2 3 4 5; do node tc14_eff.mjs /tmp/e_${m}_${set}_$i.jsonl $m $i/6 --set=$set & done; wait; done; done   # merge → $E/tc14_eff_<set>_{before,after}.jsonl
for i in 0 1 2 3 4 5; do node tc14_phase.mjs /tmp/p14_$i.jsonl $i/6 & node tc14_phase.mjs /tmp/p12_$i.jsonl $i/6 --before & done; wait   # → tc14_phase_{after,before}.jsonl
for i in 0 1 2 3 4 5; do node tc14_torture.mjs /tmp/t_$i.jsonl 99 $i/6 & node tc14_checks.mjs /tmp/c_$i.json $i/6 & done; wait      # → tc14_torture_99.jsonl, tc14_checks.json
node tc14_open.mjs $E/tc14_open.json; node tc14_cpu.mjs $E/tc14_cpu.json; python3 tc14_summary.py $E; python3 tc14_frozen.py $E/frozen_check.txt
node tc14_lists.mjs clip_lists/tc14_clips.txt clip_lists/tc14_strips.txt
S=<scratch with node_r + ffmpeg> zsh tc14_strips.sh clip_lists/tc14_strips.txt <ra>/strips 3
S=<scratch with node_r + ffmpeg> zsh tc14_clips.sh clip_lists/tc14_clips.txt <ra>/clips 3
node tc14_review_build.mjs
```
