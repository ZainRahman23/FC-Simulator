# RECEIVE-TURN-1 — handoff

**State (19 Oct 2026):** presented for the owner's review. NOT frozen and NOT integrated. RECEIVE-CONTROL-1.1, DRIBBLE-V1, RECEIVE-KILL-1.2's evidence, passing and shooting are untouched.

Read, in this order: `RECEIVE_TURN1_REPORT.md` (the 24 deliverables + decisions), `RECEIVE_TURN1_RESEARCH.md`, `RECEIVE_TURN1_STATUS.json`, `review/RECEIVE_TURN1_REVIEW.html`.

## Where things are

- **Code:** `sandbox/visual/receive_turn1/`.
  - **Phase 1 kill engine:** `rk_*.js`, a copy of `receive_kill12/` at curve B, plus:
    - `rk_model.js`: `VAR`, `bounded()`, `setDraws()`;
    - `rk_sim.js`: `drawsFor()` with the v2 keys and bounded draws; `setDraws({ keys: "rk12", bounded: false })` reproduces RECEIVE-KILL-1.2 B exactly.
  - **Phase 2 receive-and-turn:**
    - `rt_actions.js`: the families, surfaces, movement model (Agility / Dribbling hooks `MOVE.ext`) and selection weights;
    - `rt_sim.js`: incoming ball, `selectTurn` (the feasible action set), the ideal touch, `executeTurn` (4 bounded keyed dimensions), the continuation (`findMeet` / the extra control via RECEIVE-KILL's `planFollow`), and `runTurn`;
    - `rt_body.js`: the presentation body (`TurnBody`);
    - `rt_draw.js`: the top view; `rt_gl.js`: shared WebGL;
    - `rt_lab.js`, `rt_matrix_page.js`, `rt_var_page.js`: the pages.
- **Pages:**
  - `receive_turn1_lab.html` (the receive-turn lab);
  - `receive_turn1.html` (the angle × rating matrix);
  - `receive_turn1_var.html` (variance: same rating × seeds / same draw × ratings);
  - `receive_turn1_kill_lab.html` and `receive_turn1_kill.html` (the phase-1 kill lab and matrix).
- **Tools (`receive_turn1/tools/`):**

  | tool | what it does |
  |---|---|
  | `var_dist.mjs` / `var_dist.sh` | phase-1 distributions in the B / bounded / v2 modes |
  | `var_legacy.mjs` | the RECEIVE-KILL-1.2 audit |
  | `rt_matrix.mjs` / `rt_matrix.sh` | the turn matrix: MAIN, MIRROR, LATE, LINE, FORCED |
  | `rt_det.mjs`, `rk_det.mjs` | determinism (turn / phase 1) |
  | `rt_chrome.cjs`, `rk_chrome.cjs` | Chrome = Node (turn lab / kill lab) |
  | `rt_cpu.mjs` | CPU |
  | `rk_regress.mjs` | DRIBBLE-V1, RECEIVE-CONTROL-1.1, RECEIVE-KILL-1 / 1.1 |
  | `rk12_unchanged.py` | RECEIVE-KILL-1.2 B |
  | `rt_capture.cjs`, `rt_clips.sh`, `rt_compose.py` | clips |
  | `rt_review_build.mjs` | the review page |

## To change something

- **A family:** edit `FAMILIES` in `rt_actions.js` (opening `prep`, comfortable range `theta`, geometry `variants`, difficulty `m`, `rotIn`).
- **Selection:** edit `SELECT` (the weights).
- **Execution budget:** edit `TEXEC.k` in `rt_sim.js`.
- **Then rerun** `zsh tools/rt_matrix.sh 200 …`, `rt_det`, `rt_chrome`, `rt_cpu` (alone), and rebuild the review.
- **The draws' bound:** `VAR.knee` / `VAR.cap` in `rk_model.js`, then rerun `var_dist.sh 1000`.

## Not to touch

DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL / BALL-PHYS, tackle, RECEIVE-CONTROL-1.1, PASSING, SHOOTING, RECEIVE-KILL-1 / 1.1 / 1.2. The hash list is `evidence/frozen_sha256_start.txt` (190 files).

## Review

The per-tile clip captures (`clips_*/tiles/`, ~110 MB) are git-ignored inputs of the committed mosaics; `tools/rt_clips.sh` with the lists in the report regenerates them.

LOCAL ONLY (the character is a real player's model):

- http://127.0.0.1:8361/review_artifacts/receive_turn1/review/RECEIVE_TURN1_REVIEW.html
