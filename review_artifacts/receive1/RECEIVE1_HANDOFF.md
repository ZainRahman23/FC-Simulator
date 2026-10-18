# RECEIVE-CONTROL-1 handoff

## State

18 Oct 2026, about 07:30 EEST. RECEIVE-CONTROL-1 is implemented, tested and **presented for review. It is not frozen.**
- **Branch:** `prototype/dribble-1`.
- **Recommendation:** not ready to freeze (see `RECEIVE1_REPORT.md`, Decision).
- **DRIBBLE-V1** (tag `dribble-v1-foundation-1`) is unchanged and was re-verified.

## Where things are

| What | Path |
|---|---|
| Receive adapter | `sandbox/visual/receive1/rc1_core.js` (`ReceiveSim` extends the frozen `DribbleSim`; parameters in `RC1`) |
| Cases | `sandbox/visual/receive1/rc1_cases.js` (`makeCase`, `parseCase`, `seedCase`, `matrix`, `VISUAL`) |
| Lab | `sandbox/visual/receive1.html?case=<id>&seed=1&diag=1` (viewer `receive1/rc1_viewer.js`, a copy of the frozen DRIBBLE-V1 viewer) |
| Tools | `sandbox/visual/receive1/tools/` |
| Report, status | `review_artifacts/receive1/RECEIVE1_REPORT.md`, `RECEIVE1_STATUS.json` |
| Review page (local only: real player names) | `review_artifacts/receive1/review/RECEIVE1_REVIEW.html` |
| Evidence | `review_artifacts/receive1/evidence/` (matrix of record `matrix_714.json`) |
| Videos and frame strips | `review_artifacts/receive1/videos/`, `stills/` |

A case id is `DIR_ANGLE[R|L]_RECEIVER_PASS`, for example `F_180R_JOG_MED`:
- `DIR` is where the pass comes from: F, FR, R, RR, RL, L, FL;
- `ANGLE` is `receiveTurnAngle`, 0–359;
- `RECEIVER` is STAND / JOG / RUN / FAST;
- `PASS` is SOFT / MED / FIRM.

## How to re-measure

| What | Command | Notes |
|---|---|---|
| Matrix | `TMPDIR=<scratch> zsh tools/rc1_matrix.sh all 1,2,3 9 out.json` | 714 runs, about 10 min with 9 processes. Prints the scorecard. Then `python3 tools/rc1_analysis.py out.json analysis.json` |
| CPU | `node tools/rc1_cpu.mjs "<ids>" out.json` | Run alone on an idle machine |
| Chrome / Node | `PUPPETEER_NODE_MODULES=<dir> node tools/rc1_chrome.cjs "<ids>" out.json` | Lab server on :8361 |
| DRIBBLE-V1 unchanged | `node tools/rc1_regress.mjs 1 12 out.json` | Also re-check sha256 against `evidence/frozen_sha256_start.txt` |
| Boundaries | `node tools/rc1_boundary.mjs out.json` | |
| Videos | `S=<scratch> OUT=<videos> LIST=<…>/receive1/tools/rc1_videos.txt zsh ../dribble15/tools/d15_render.sh` | Then `FFMPEG=<bin> node tools/rc1_review_build.mjs` |
| Experiments | `RC1OVR='{"key": value}'` | Overrides `RC1` for one process; never used by the evidence of record |

## Rules the adapter keeps

- **It never edits the frozen core.** Frozen planner parameters it needs differently (contact sampling, search horizon, sideways reach) are set only inside the receive planner's own generator slices and restored at every pause. `rc1_regress.mjs` checks that nothing leaks.
- **Approach lines are ordinary motions,** not releases. Marked as a release, the frozen solver would treat a touch in them as the cut touch.
- **The handoff is the kernel's launch event** of the first touch. From the next tick the frozen DRIBBLE-V1 resolver runs unchanged.

## Next (owner decision)

1. **A receiving contact model.** The frozen dribble contact / launch model rejects most launches for hard incoming balls:
   - geometry: the surface must face the incoming ball;
   - the follow-through floor after the slowed receiving foot.

   Options: a receive module beside DRIBBLE-V1 (a receive-specific cushion / follow-through and a first-touch launch solve toward the exit motion), or opening the frozen core.
2. **Body shape before the pass.** An open / side-on stance and slower-than-jog movement are not in TURN-1.2.
3. **The attribute layer:** Ball Control on first-touch execution, weak foot, reach and agility, reactions.
4. **CPU** of the receive search, and its GC pressure.
