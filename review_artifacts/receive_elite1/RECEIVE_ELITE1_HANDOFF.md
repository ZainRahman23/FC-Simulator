# RECEIVE-ELITE-1 — handoff

**State:** presented for owner review. NOT frozen: RECEIVE-V1 is not frozen, nothing is integrated beyond the receive pipeline. Nothing further is queued.

## What is where
- `sandbox/visual/receive_elite1/re1_attrs.js` — the attribute anchors (`ATTR.dri`, `ATTR.agi`; Ball Control is the existing curve) and `eliteParams(ratings)`.
- `re1_core.js` — `ReceiveSimE extends ReceiveSimM` (RECEIVE-MOVING-1, unchanged) and `EliteEpisode`:
  - `RE` — the sequence constants: contact point ahead / lateral, the exit conditions (`exitTol`, `velTol`, `exitGo`), `smallTurn`, `runGap`, `exitAhead` × `exitAheadK`, the takeover window, the recovery window, the selection weights `wLate` / `wFirst`;
  - `stationaryPath` / `movingPath` — Agility's authored body paths;
  - `EliteEpisode` — `buildSwings` (the footwork), `plan` / `firstPlan` / `towardIdeal` / `exitIdeal`, `pre` (the contact: Ball Control's execution, one `schedule()`), `post` / `findNext` (the closed loop on the real ball), `dryCheck` (the first touch's dry run), `preview` (the presentation body's next contact);
  - `ReceiveSimE` — `resolve2` (a standing receiver's turn → elite, or declined), `beginAction` (a moving receiver's action → elite, or declined), `evalCand` / `rxApproach` under Agility's limits (`withAgility`), `scoreFirst`, the takeover window and run-out steering in `step`, the summary for the scorecard.
- `re1_body.js` — `EliteBody`, RECEIVE-TURN-1.1's human body generalised (several contacts, a moving entry, blends with TURN-1.2's poses; legs always IK to the plan's feet).
- `re1_cases.js` — the elite review set (`SET`, `PRIORITY`, `ALL`); ids `ST_<turn>_V12` and RECEIVE-MOVING-1's `<DIR>_<turn>_<RS>_<PS>`, ratings appended as `_B##_D##_A##`.
- `re1_viewer.js` + `sandbox/visual/receive_elite1.html` — the lab (CURRENT / NEW / CURRENT vs NEW / NEW vs NEW at other ratings; contact markers; the separation graph).
- `tools/` — `re1_env` (makeCurrent / makeElite; `RE1OVR` for experiments), `re1_metrics` (the owner's required metrics), `re1_set` / `re1_cases_run` (the 99 reference), `re1_run` + `re1_matrix.sh` + `re1_summary.py` (the movement matrix), `re1_sweep` + `re1_sweep.sh` + `re1_sweep_sum.py` (the attribute series), `re1_cur_series` (CURRENT at the combined ratings), `re1_exit_ab` (the exit distance), `re1_regress`, `re1_det`, `re1_neutral`, `re1_chrome(.cjs, _node.mjs)`, `re1_cpu`, `re1_frozen.py`, `re1_capture.cjs`, `re1_clips.sh` + `clip_lists/`, `re1_strips.sh`, `re1_review_build.mjs`, `re1_report_build.py`, `re1_baseline` / `re1_try` (development).

## Evidence (`evidence/`)
`re1_cases.json` (the 99 reference, CURRENT vs NEW × 3 seeds, separation curves) · `re1_matrix_current.json` / `re1_matrix_new.json` / `re1_matrix_summary.txt` (672 runs each) · `re1_sweep.json` / `re1_sweep_summary.txt` (BC / DRI / AGI / combined × 99 … 50 × 20 actions × 3 seeds) · `re1_current_series.json` · `re1_exit_ab.json` · `re1_regress.json` · `re1_det.json` · `re1_neutrality.json` · `re1_chrome_node.json` · `re1_cpu.json` · `frozen_sha256_start.txt` / `frozen_sha256_end_check.txt`.

## For the owner's next decision
- The exit touch hands DRIBBLE-V1 the ball at its takeover distance (1.6 – 2.0 m ahead); closer was measured and is not reliably accepted by the frozen DRIBBLE-V1. Keeping the ball tighter after the turn needs either DRIBBLE-V1's attribute layer or the receive layer dribbling longer.
- The anchors are first values; the 99 column was tuned by eye from stills.
- Low-Agility sprints into big turns decline the elite sequence; an Agility-aware approach (braking earlier) would let them plant.

## Rebuild
```
cd sandbox/visual/receive_elite1/tools
node re1_cases_run.mjs <ev>/re1_cases.json 1,2,3
TMPDIR=<w> zsh re1_matrix.sh @matrix "1,2" <ev>/re1_matrix_new.json 9 NEW ; … CURRENT ; python3 re1_summary.py <cur> <new>
TMPDIR=<w> zsh re1_sweep.sh <ev>/re1_sweep.json "1,2,3" 9 ; python3 re1_sweep_sum.py <ev>/re1_sweep.json all|move
node re1_cur_series.mjs … ; node re1_exit_ab.mjs … ; node re1_regress.mjs … ; node re1_det.mjs <ev>/re1_det.json "" 1,2
node re1_neutral.mjs <ev>/re1_neutrality.json "" 1 "99,99,99;50,99,99;99,50,99;99,99,50;50,50,50" ; node re1_cpu.mjs <ev>/re1_cpu.json
node re1_chrome_node.mjs <tmp>/node.json <specs> && PUPPETEER_NODE_MODULES=<dir> node re1_chrome.cjs <ev>/re1_chrome_node.json <tmp>/node.json <profile>
python3 re1_frozen.py start|end
S=<scratch with node_r + ffmpeg> zsh re1_clips.sh clip_lists/re1_clips.txt <ra>/clips 3 ; zsh re1_strips.sh <ra>/strips 3
node re1_review_build.mjs && python3 re1_report_build.py
```
