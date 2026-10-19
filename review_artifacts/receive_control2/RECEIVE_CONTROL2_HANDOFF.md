# RECEIVE-CONTROL-2 — handoff (QUEUE #1)

**State:** presented for owner review, NOT frozen. Next (the owner's queue): QUEUE #2 — receiving while moving, a distinct phase.

## What is where
- `sandbox/visual/receive_control2/rc2_episode.js` — `TurnEpisode` / `KillEpisode`: RECEIVE-TURN-1's `runTurn` and RECEIVE-KILL's `runEpisode` as live controllers
  (`pre(W)` before a kernel step, `post(W)` after it) on any BallWorld; `Frame` (the receive frame ↔ the DRIBBLE-V1 kernel [x, h, y]); `predictK`, `predictKer`.
- `rc2_core.js` — `ReceiveSim2 extends ReceiveSim11`: the resolver (`resolve2`), the authored root (`root2`), the rejoin / set-off (`planRejoin`, `planSetOff`),
  `switchToT12`, `dribbleOn`, the moving receivers' unified execution (`contactNow`), `summary2()`. Constants in `RC2`.
- `rc2_bodies.js` — the presentation bodies in the receive frame (RECEIVE-TURN-1.1's HumanTurnBody, RECEIVE-KILL's KillBody).
- `rc2_cases.js` — the review cases A–M, A2, I2 (RECEIVE-CONTROL-1.1's case ids fall through to its parser).
- `rc2_viewer.js` + `sandbox/visual/receive_control2.html` — the lab (RECEIVE-CONTROL-1.1's viewer with the integrated debugger); `window.D1V.set / summary / ready`.
- `tools/` — `rc2_equiv` (controllers vs stand-alone), `rc2_equiv_full` (the pipeline vs stand-alone), `rc2_env` / `rc2_run` / `rc2_matrix.sh` (RECEIVE-CONTROL-1.1's matrix
  and scorecard on the pipeline), `rc2_cases_run`, `rc2_neutral`, `rc2_det`, `rc2_mirror`, `rc2_chrome(.cjs, _node.mjs)`, `rc2_regress`, `rc2_cpu`, `rc2_capture.cjs`,
  `rc2_clips.sh` + `clip_lists/`, `rc2_review_build.mjs`, `rc2_report_build.py`.

## For QUEUE #2 (receiving while moving)
- Moving receivers currently take `ReceiveSim11`'s planner (RECEIVE-CONTROL-1.1's moving families) with `ReceiveSim2.contactNow` (the unified execution). That is the one
  path QUEUE #2 replaces; the resolver's standing branch (`resolve2`) is the template (frames, the live controllers, the rejoin, the TURN-1.2 switch, DRIBBLE-V1).
- Keep: the draw keys (receiver | R<event> | c<contact>), the equivalence tests, animation neutrality, the TURN-1.2 switch at ≥ vFloor with a settle before DRIBBLE-V1, and
  RECEIVE-CONTROL-1.1's classification semantics (DRIBBLE-V1 reads its control state — forcing a label changed 6 of 108 takeovers).

## Rebuild
```
node sandbox/visual/receive_control2/tools/rc2_equiv.mjs       review_artifacts/receive_control2/evidence/rc2_equivalence.json
node sandbox/visual/receive_control2/tools/rc2_equiv_full.mjs  review_artifacts/receive_control2/evidence/rc2_equivalence_full.json
TMPDIR=<writable> zsh sandbox/visual/receive_control2/tools/rc2_matrix.sh @A+B+C "1,2,3" 9 review_artifacts/receive_control2/evidence/rc2_matrix714.json   (and @K+KG → rc2_matrix_kill.json)
node sandbox/visual/receive_control2/tools/rc2_cases_run.mjs   review_artifacts/receive_control2/evidence/rc2_cases.json 1,2,3 0
node …/rc2_neutral.mjs · rc2_det.mjs · rc2_mirror.mjs · rc2_cpu.mjs · rc2_regress.mjs 1 12 (each <out.json> in evidence/)
PUPPETEER_NODE_MODULES=<dir> node …/rc2_chrome.cjs review_artifacts/receive_control2/evidence/rc2_chrome_node.json <profile>
S=<scratch with node_r + ffmpeg> zsh …/rc2_clips.sh …/clip_lists/rc2_clips.txt <out> 3
node …/rc2_review_build.mjs && python3 …/rc2_report_build.py
```
