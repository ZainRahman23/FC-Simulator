# RECEIVE-MOVING-1 — handoff (QUEUE #2)

**State:** presented for owner review. NOT frozen: RECEIVE-V1 is not frozen. The owner's queue ends here; nothing further is queued.

## What is where
- `sandbox/visual/receive_moving1/rm1_core.js` — `ReceiveSimM extends ReceiveSim2` (QUEUE #1). Constants are in `RM`:
  - `prepBand` — the approach follows the meeting's need;
  - `lateRedirect` / `lateMax` — the contact at up to the run speed;
  - `velFirst` / `wTime` — the velocity-keeping meeting;
  - `settle` / `aRun` / `window` — the TAKEOVER WINDOW;
  - `steer*` — the run-out onto the ball's line;
  - `curveCut` — the TRIED and rejected speed law (kept off).

  RECEIVE-CONTROL-1.1's moving planner methods are copied (`rxIntercept`, `rxApproach`, `evalCand`) with each change marked `RECEIVE-MOVING-1`. The other
  overrides are `step` (the takeover window, the steering), `handoff` (the TURN-1.2 switch, settle) and `resolve2` (a standing receiver into space → the moving
  actions).
- `rm1_cases.js` — passes WEIGHTED FOR THE RUNNER, solved through the ball kernel.
  - Movement groups: STAND / WALK / JOG / RUN / SPRINT / ALLOUT.
  - Pass speeds at the receiver: SLOW / NORMAL / FIRM / HARD.
  - The movement `matrix()`, the owner's cases `CASES` (A–H + A′/B′/C′ into stride + extras).
  - Ids: `DIR_TURN[R|L]_RS_PS[_IS][_BC##]`. `_IS` is the pass into his stride (0.42 m ahead of his body).
- `rm1_viewer.js` + `sandbox/visual/receive_moving1.html` — the lab (RECEIVE-CONTROL-2's viewer).
- `tools/`:
  - `rm1_env` (makeReceiveM) and `rm1_metrics` (the §31 momentum metrics);
  - `rm1_run` + `rm1_matrix.sh` (the movement matrix; pipeline rc2 | rm1) and `rm1_summary.py`;
  - `rm1_run714` + `rm1_matrix714.sh` (RECEIVE-CONTROL-1.1's matrix of record);
  - `rm1_cases_run` (the owner's cases × BC × seeds, with speed traces) and `rm1_diag` (one case's planning trace);
  - `rm1_stationary`, `rm1_neutral`, `rm1_det`, `rm1_chrome(.cjs, _node.mjs)`, `rm1_regress`, `rm1_cpu`, `rm1_frozen.py`;
  - `rm1_capture.cjs`, `rm1_clips.sh` + `clip_lists/`, `rm1_review_build.mjs`, `rm1_report_build.py`.

## Evidence (`evidence/`)
- `baseline_rc2_matrix.json` — RECEIVE-CONTROL-2 on the movement matrix (the start).
- `rm1_tried_curvecut_*` — the rejected speed law.
- `rm1_step1_keepband_*` — RECEIVE-MOVING-1 before the approach change.
- `rm1_matrix.json` / `rm1_summary.txt` — the final movement matrix.
- `rm1_matrix714.json` — RECEIVE-CONTROL-1.1's matrix of record.
- `rm1_cases.json`, `rm1_stationary.json`, `rm1_det.json`, `rm1_neutrality.json`, `rm1_chrome_node.json`, `regression.json`, `rm1_cpu.json`.
- `frozen_sha256_start.txt` / `frozen_sha256_end_check.txt`.

## For the next step (owner's decision)
- The moving body is still RECEIVE-CONTROL-1.1's placeholder body on stride-fitted footwork. RECEIVE-TURN-1.1's human body (`HumanTurnBody`) is the natural
  successor for moving actions, via a framed body as in RECEIVE-CONTROL-2's `rc2_bodies.js`.
- An Agility attribute would scale the body-redirection capability, kept separate from Ball Control: `RX.aExit` (the exit acceleration), `RX.omegaMax`,
  TURN-1's entry speeds and `RM.lateMax`.
- The remaining takeover failures sit in DRIBBLE-V1, which is frozen: TAKEN after 120° – 150° turns.

## Rebuild
```
TMPDIR=<writable> zsh sandbox/visual/receive_moving1/tools/rm1_matrix.sh @matrix "1,2" review_artifacts/receive_moving1/evidence/rm1_matrix.json 10 rm1
python3 …/rm1_summary.py review_artifacts/receive_moving1/evidence/rm1_matrix.json "RECEIVE-MOVING-1" > …/rm1_summary.txt
TMPDIR=<writable> zsh …/rm1_matrix714.sh @A+B+C "1,2,3" 8 review_artifacts/receive_moving1/evidence/rm1_matrix714.json
node …/rm1_cases_run.mjs <evidence>/rm1_cases.json 1,2,3 · rm1_stationary.mjs · rm1_det.mjs · rm1_neutral.mjs · rm1_regress.mjs 1 12 · rm1_cpu.mjs (each <out.json>)
PUPPETEER_NODE_MODULES=<dir> node …/rm1_chrome.cjs <evidence>/rm1_chrome_node.json <profile>
python3 …/rm1_frozen.py start|end
S=<scratch with node_r + ffmpeg> zsh …/rm1_clips.sh …/clip_lists/rm1_clips.txt <out> 3
node …/rm1_review_build.mjs && python3 …/rm1_report_build.py
```
