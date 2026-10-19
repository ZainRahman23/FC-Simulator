# TECHNICAL-CONTROL-1.3 — handoff

**State:** presented for the owner's visual review of the transition / phasing pass.

- NOT frozen and NOT integrated.
- No new skills until it is approved (owner).

## Code (`sandbox/visual/technical_control13/`)

| file | contents |
|---|---|
| `tc13_body.js` | `FlowBody extends LegBody` (the transition body) · `FlowSim extends CarrySim` (TECHNICAL-CONTROL-1.2's simulation + the hand-off foot history, presentation data; its own contact-pose cache) · `FL` (constants) |
| `tc13_cases.js` | `TORTURE` (the owner's transition torture set, both turn sides), `tortureIds`, `specId` |
| `tc13_viewer.js` + `../technical_control13.html` | the transition lab (see below) |

### `FlowBody`, by topic

- **Hand-off:** `gaitLegs`, `blendGait`, `heelStart` / `heelFinal`, `toeOffPitch`, `handoffVel`.
- **Pelvis:** `pelvisFull` (the smoothing kernel + `_carry`), `reachWeight`, `reachClamp`.
- **Feet:**
  - `footAt` (+ `orbitOf` / `orbitAt` — swings round a planted foot in the turning body's frame — + the bumps);
  - `landAt` / `landAfterTouch` / `plantClear` (the other foot and its coming contact);
  - `buildFeet` (every landing re-cleared once both feet exist; the run-in plants);
  - `earlyLifts` (+ the 110° pivot test).
- **Clearance:** `planClearance` (+ early flags in `sim.rc2._tc13flags`), `legJoints`, `legObstacle`, `posedLeg` / `toePosed`, `bumpAt`, `residual`.
- **Re-plans:** `inherit` (posed history `_posed`, the carry, late lifts reach-bounded, key gaps, late-decision flags).
- **Per frame:** `poseAt`, `transitionState` (→ `sim.rc2._tc13state`).

### Hooks added to `technical_control11/tc11_body.js`

All are default-neutral: TECHNICAL-CONTROL-1.1's own posed skeleton is identical, 26/26 cases, every frame.

- `heelStart`, `heelFinal`, `reachWeight`, `pivotOnEdge`;
- `sim._tc11cache` (a per-simulation contact-pose cache instead of the module-wide one).

### The lab (`tc13_viewer.js`)

| URL parameter | effect |
|---|---|
| `body=tc13` (default) | TECHNICAL-CONTROL-1.3 |
| `body=tc11` | before: TECHNICAL-CONTROL-1.2's legs |
| `cmp=flow` | before beside after, on the same simulation |

- The case list starts with the torture set (`id@foot@style`).
- Every feet view shows the posed legs' clearances live.
- `D1V.clearAt(t)` returns the clearances at time t.

## Tools (`tools/`)

| tool | purpose |
|---|---|
| `tc13_phase.mjs` | the phasing diagnostics on the posed skeleton (`runPhase`, `analysePhase`, `makeFlow`; CLI) |
| `tc13_sweep.mjs` + `tc13_summary.py` | the torture sweep (before / after) and the evidence summary |
| `tc13_checks.mjs` | FlowSim neutral, body neutral, deterministic, posed skeleton repeatable |
| `tc13_cpu.mjs` | CPU |
| `tc13_before_equiv.mjs` | TECHNICAL-CONTROL-1.1's hooks are neutral |
| `tc13_frozen.py` | protected and reference files |
| `tc13_capture.cjs` · `tc13_clips.sh` · `tc13_strips.sh` · `tc13_lists.mjs` · `clip_lists/` | clips and frame strips |
| `tc13_review_build.mjs` | the review page |

## Rebuild

```
cd sandbox/visual/technical_control13/tools; E=../../../../review_artifacts/technical_control13/evidence
for r in 99 80 50; do for i in 0 1 2 3 4 5; do node tc13_sweep.mjs /tmp/sw${r}_$i.jsonl $r $i/6 & done; wait; cat /tmp/sw${r}_[0-5].jsonl > $E/tc13_sweep_$r.jsonl; done
for i in 0 1 2 3 4 5; do node tc13_checks.mjs /tmp/ck_$i.json $i/6 & done; wait   # merge the shards into $E/tc13_checks.json
node tc13_cpu.mjs $E/tc13_cpu.json
python3 tc13_summary.py $E $E/tc13_sweep_99.jsonl $E/tc13_sweep_80.jsonl $E/tc13_sweep_50.jsonl $E/tc13_checks.json $E/tc13_cpu.json
python3 tc13_frozen.py $E/frozen_check.txt
node tc13_lists.mjs clip_lists/tc13_clips.txt clip_lists/tc13_strips.txt
S=<scratch with node_r + ffmpeg> zsh tc13_strips.sh clip_lists/tc13_strips.txt <ra>/strips 3
S=<scratch with node_r + ffmpeg> zsh tc13_clips.sh clip_lists/tc13_clips.txt <ra>/clips 3
node tc13_review_build.mjs
```

## Open items

These are the report's §7 and §8:

- the F_180R sprint pivot (a landing yaw that anticipates the turn);
- CPU (2.3×, a 64 ms worst re-plan step);
- the three remaining intersections at 99, two of them flagged early.
