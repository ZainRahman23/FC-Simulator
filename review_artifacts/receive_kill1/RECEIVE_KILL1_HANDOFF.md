# RECEIVE-KILL-1 handoff

## State

18 Oct 2026, evening EEST. RECEIVE-KILL-1 (kill / deaden the ball, Ball Control calibration) is implemented, measured and **presented for review — not frozen**. The constants are calibration values, not locked.

- **Branch:** `prototype/dribble-1`.
- **Isolation:** the code is all new files in `sandbox/visual/receive_kill1/`.
- **Unchanged and re-verified:** RECEIVE-CONTROL-1.1 (also not frozen), DRIBBLE-V1 (tag `dribble-v1-foundation-1`), TURN-1.2, RUN-1.3 and the ball physics.

## Where things are

| What | Path |
|---|---|
| Model (surfaces, ideal, difficulty, execution; constants `RK`, `SURFACES`) | `sandbox/visual/receive_kill1/rk_model.js` |
| Simulation (incoming-pass solver, free-ball prediction, planner, exit table, one authoritative `schedule()`, measures) | `sandbox/visual/receive_kill1/rk_sim.js` |
| Matrices and benchmarks | `sandbox/visual/receive_kill1/rk_conditions.js` |
| Placeholder body (presentation only) | `sandbox/visual/receive_kill1/rk_body.js` |
| 2D views | `sandbox/visual/receive_kill1/rk_draw.js` |
| Calibration matrix page | `sandbox/visual/receive_kill1.html` + `receive_kill1/rk_matrix_page.js` |
| Control lab | `sandbox/visual/receive_kill1_lab.html` + `receive_kill1/rk_lab.js` |
| Report, contract, status | `review_artifacts/receive_kill1/RECEIVE_KILL1_REPORT.md`, `RECEIVE_KILL1_ANIMATION_CONTRACT.md`, `RECEIVE_KILL1_STATUS.json` |
| Review page (local only) | `review_artifacts/receive_kill1/review/RECEIVE_KILL1_REVIEW.html` |

## How to re-measure

All tools are in `sandbox/visual/receive_kill1/tools/`.

| What | Command |
|---|---|
| Distribution (all matrices × 10 ratings × N seeds) | `zsh rk_matrix.sh 200 <out.json> <scratch>` — 69 s wall |
| Tables | `python3 rk_tables.py <distribution.json> <out.md>` |
| Quick grid / constants experiment | `node rk_calib.mjs GROUND,CHEST 40` (override constants with `RKOVR='{"exec":{"eSkill":0.35}}'`) |
| One condition | `node rk_try.mjs '{"v":22}' '{"v":8,"h":1.32,"drop":20,"surface":"CHEST"}'` |
| Determinism / matched draws | `node rk_det.mjs <out.json>` |
| Chrome vs Node | `PUPPETEER_NODE_MODULES=<dir> node rk_chrome.cjs <out.json>` (lab server on :8361) |
| CPU (alone) | `node rk_cpu.mjs <out.json>` |
| Curves and surface map | `node rk_scaling.mjs <out.json>` |
| Regression (DRIBBLE-V1 + RECEIVE-CONTROL-1.1 before / after kills) | `node rk_regress.mjs 1 12 <out.json>` |
| Body contact check | `node rk_bodycheck.mjs` |
| Clips and stills | `S=<scratch with node_r + ffmpeg> zsh rk_videos.sh <videos> <stills> 3` |
| Screenshots | `node rk_shot.cjs <url> <png> RKM_READY` |
| Review page | `FFMPEG=<bin> node rk_review_build.mjs`, then `node rk_review_check.cjs <png>` |

## Rules the kill system keeps

- **One authoritative contact.** A single kernel `schedule()` at the CONTACT tick with a 6 cm contact window. Nothing else writes the ball.
- **Ball Control is only an error.** It never enters the surface choice, the contact tick, the ideal or the action's timing. The draw keys never contain it.
- **Presentation is passive.** The body is not in the ball's world.
- **Deterministic chain.** It uses only `+ − × ÷`, `sqrt` and the kernel's deterministic trig / exp / log.

## Next (owner decisions)

1. **Visual review** of the matrix and the lab: the BC 10–99 scaling, easy-ball compression, hard-ball spread, and each surface's ideal and limit.
2. **Constants:** lock or recalibrate.
   - Execution: eFloor 0.0068, eSkill 0.40, γ 1.1, Dc 1.0.
   - Per surface: m, w_h / w_z, κ / vAbs, k.
   - Question: are the aerial surfaces too harsh at the same D?
3. **Integration:** replace RECEIVE-CONTROL-1.1's CUSHION execution (`rx_exec.js`) with this model, then the moving receiver.
4. **Follow-up touch:** a second touch after a chest or thigh control or a loose kill.
5. **Production animation** against the contract.
