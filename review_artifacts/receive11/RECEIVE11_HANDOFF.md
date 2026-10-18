# RECEIVE-CONTROL-1.1 handoff

## State

18 Oct 2026, evening EEST. RECEIVE-CONTROL-1.1 is implemented, tested and **presented for review. It is not frozen** (owner instruction: "DO NOT FREEZE RECEIVE-CONTROL YET").
- **Branch:** `prototype/dribble-1`.
- **DRIBBLE-V1** (tag `dribble-v1-foundation-1`) and TURN-1.2 are unchanged and were re-verified.
- **Superseded approach:** RECEIVE-CONTROL-1 (`receive1/`) remains as it was. RECEIVE-CONTROL-1.1 imports only its `receiveTurnAngle` / `exitTurn` (the validated convention) and its case definitions.

## Where things are

| What | Path |
|---|---|
| Receive system | `sandbox/visual/receive11/rx_core.js` (`ReceiveSim11` extends the frozen `DribbleSim`; parameters in `RX`) |
| Families, surfaces, footwork, root paths | `sandbox/visual/receive11/rx_actions.js` (`FAMILIES`, `SURF`, `planSteps`, `herm`, `HANDOFF_AHEAD`, `RECONNECT_TAU`) |
| Ball Control execution model | `sandbox/visual/receive11/rx_exec.js` (`RXE`: calibration values, not locked) |
| Placeholder body (presentation only) | `sandbox/visual/receive11/rx_body.js` |
| Cases | `sandbox/visual/receive11/rx_cases.js` (RECEIVE-CONTROL-1's situations; intents `_KILL` / `_KILLGO`; overrides `_BC##`, `_WF#`; blocks `all`, `K`, `KG`, `BC`; `VISUAL`) |
| Lab | `sandbox/visual/receive11.html?case=<id>&seed=1&diag=1[&single=top&bc=60&anim=0]` (viewer `receive11/rx_viewer.js`, a copy of the frozen DRIBBLE-V1 viewer plus the receive debugger) |
| Report, contract, status | `review_artifacts/receive11/RECEIVE11_REPORT.md`, `RECEIVE11_ANIMATION_CONTRACT.md`, `RECEIVE11_STATUS.json` |
| Review page (local only: real player names) | `review_artifacts/receive11/review/RECEIVE11_REVIEW.html` |
| Evidence | `review_artifacts/receive11/evidence/` (matrix of record `matrix_714.json`) |
| Videos and frame strips | `review_artifacts/receive11/videos/` (33 clips), `stills/` |

A case id is `DIR_ANGLE[R|L]_RECEIVER_PASS[_KILL|_KILLGO][_BC##][_WF#]`, as RECEIVE-CONTROL-1 plus the suffixes.

## How to re-measure

All tools are in `sandbox/visual/receive11/tools/`.

| What | Command | Notes |
|---|---|---|
| Matrix | `TMPDIR=<scratch> zsh tools/rx_matrix.sh @all 1,2,3 9 out.json` | About 1 min with 9 processes; prints the scorecard. Blocks: `@K+KG+BC` |
| Analysis | `python3 tools/rx_analysis.py <evidence dir> analysis.json` | |
| CPU | `node tools/rx_cpu.mjs "<ids>" out.json 1 [1 = animated]` | Alone, on an idle machine |
| Chrome / Node | `PUPPETEER_NODE_MODULES=<dir> node tools/rx_chrome.cjs "<ids>" out.json` | Lab server on :8361 |
| Animation on/off, replay, draws | `node tools/rx_det.mjs "<ids>" out.json 1,2,3` | |
| DRIBBLE-V1 unchanged | `node tools/rx_regress.mjs 1 12 out.json` | Plus the sha256 check against `evidence/frozen_sha256_start.txt` |
| Boundaries | `node tools/rx_boundary.mjs out.json` | |
| Mirror | `node tools/rx_mirror.mjs out.json` | |
| Ball Control calibration | `node tools/rx_calib.mjs out.json` | Try other constants with `RXEOVR='{...}'` |
| DRIBBLE-V1 takeover map | `node tools/rx_d1accept.mjs out.json [i/n]` | |
| Stills / contact sheets | `S=<scratch> zsh tools/rx_stills.sh <case> <dir>`, `tools/rx_sheet.sh` | |
| Videos | `S=<scratch> OUT=<videos> LIST=<…>/receive11/tools/rx_videos.txt zsh ../dribble15/tools/d15_render.sh` | Then `FFMPEG=<bin> node tools/rx_review_build.mjs` |
| Experiments | `RXOVR='{"key": value}'` | Never used by the evidence of record |

## Rules the receive system keeps

- **It never edits the frozen core.** It imports `DribbleSim` and overrides only these methods: `step`, `intent11`, `resolve`, `classify`, `rawInput`, `record`. `rx_regress.mjs` checks that nothing leaks.
- **One contact.** The authoritative contact is a single kernel `schedule()` at the CONTACT marker, with a 6 cm contact window. No `colliderId` is used, and nothing else writes the ball.
- **Presentation is passive.** During an action the receiver's colliders are parked out of the ball's world. At the handoff the collider history restarts from TURN-1.2's own pose, so the presentation never affects the outcome.
- **Deterministic launch chain.** The authoritative chain uses the kernel's dsin/dcos.
- **Keyed draws.** Execution draws are keyed by seed, player, receive event and contact tick.

## Next (owner decisions)

1. **Visual review** of the action geometry, the Ball Control scaling and the transitions (the review page's cases A–J).
2. **DRIBBLE-V1's takeover gap.** In 79 matrix runs DRIBBLE-V1 never touches a ball on the line about 1.4 m ahead. Options:
   - accept;
   - a dedicated first dribble touch inside the receive system;
   - DRIBBLE-V1 changes (frozen).
3. **Production animation** against `RECEIVE11_ANIMATION_CONTRACT.md`; the placeholder body is procedural.
4. **Ball Control constants.** Lock them or recalibrate; and decide which extension points to build next (agility on rotation, weak foot, pressure, fatigue).
