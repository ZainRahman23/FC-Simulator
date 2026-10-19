# TECHNICAL-CONTROL-1.1 — handoff

**State:** presented for the owner's review.

- NOT frozen and NOT integrated: sandbox only.
- TECHNICAL-CONTROL-1 is unchanged and is the reference.
- TECHNICAL-CONTROL-1.2 (the carry model) plays with these legs.

## Code (`sandbox/visual/technical_control11/`)

| file | contents |
|---|---|
| `tc11_leg.js` | the anatomical leg (see below) |
| `tc11_body.js` | `LegBody extends TechBody` (see below) |
| `tc11_cases.js` | the feet review set: the owner's priority list, with seeds, feet, styles and windows |
| `tc11_viewer.js` + `../technical_control11.html` | the feet lab (TECHNICAL-CONTROL-1's lab, copied) |

### `tc11_leg.js`

The anatomical leg:

- rotation kit `Q`;
- ranges of motion `ROM` (hard / comfort) and the soft saturation `soft`;
- `legAngles` (hip swing–twist, knee, tibia, ankle DF / inversion / abduction) and `overROM`;
- DRIBBLE-1's boot hull: `bootHull`, `ballGap`, `faceSurface`, `surfaceDir`;
- the chain solve: `legIK` (soft knee limit), `footOut`, `swivelFor` (the yaw hierarchy, `SPLIT`), `ankleFor`;
- the joint-space interpolation: `pchip`, `pchipAt`.

### `tc11_body.js`

`LegBody extends TechBody`, configured by `LB`:

- **Contact:** the contact search (`contactPose` → `searchContact`, `placeBoot`), with the pelvis turn as hierarchy step 1 and two passes (estimate, then the real pelvis); the cross-re-plan contact memory.
- **Landing:** `plantYaw`, plus `plantClear` (the support-foot adjustment).
- **Pelvis:** `pelvisFull` (TECHNICAL-CONTROL-1's pelvis + `contactYaw`).
- **Stance:** `stanceLeg` — heel schedule, dorsiflexion rise, push-off, pivot, edge roll.
- **Swing:** `swingLeg`, `planSwing` (joint keys, RUN-1's channels, world windows), `avoidBall`.
- **Stride adjustment:** `earlyLifts`.
- **Continuity:** `inherit` (continuity + late-decision flags).

## Tools (`tools/`)

| tool | purpose |
|---|---|
| `tc11_diag` | the per-frame diagnostics + RUN-1 reference |
| `tc11_sweep` + `tc11_summary.py` | 16 cases × 3 ratings × 2 bodies |
| `tc11_neutral` | gameplay identical |
| `tc11_cpu` | CPU |
| `tc11_scan` | finds the cases |
| `tc11_capture.cjs` (+ `--contacts` strips) · `tc11_clips.sh` · `tc11_strips.sh` · `tc11_lists.mjs` · `clip_lists/` | clips and strips |
| `tc11_review_build.mjs` | the review page |

## Rebuild

```
cd sandbox/visual/technical_control11/tools
node tc11_sweep.mjs ../../../../review_artifacts/technical_control11/evidence/tc11_sweep.jsonl          # (3 shards: … i/3)
node tc11_diag.mjs <ev>/tc11_run1_ref.json tc11 STRAIGHT && python3 tc11_summary.py <ev>
node tc11_neutral.mjs <ev>/tc11_neutral.json && node tc11_cpu.mjs <ev>/tc11_cpu.json
node tc11_lists.mjs && S=<scratch> zsh tc11_clips.sh clip_lists/tc11_clips.txt <ra>/clips 3 && S=<scratch> zsh tc11_strips.sh clip_lists/tc11_strips.txt <ra>/strips 3
python3 ../../technical_control12/tools/tc12_frozen.py <ev>/frozen_check.txt && node tc11_review_build.mjs
```
