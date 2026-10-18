# RECEIVE-KILL-1.2 — handoff

**State (19 Oct 2026):** the owner chose **alternative B** ("Use Alternative B. Do not preserve the two anchors exactly."). B is built in and is the candidate, the default of the lab and the matrix. It is validated: it behaves as measured (99/99 vs the what-if evidence, Chrome = Node 180/180 at all scales, stills = measured results). NOT frozen, curve not locked, not integrated into RECEIVE-CONTROL-1.1 (owner: "Do not integrate into RECEIVE-CONTROL-1.1 or freeze it yet."). Read `RECEIVE_KILL12B_REPORT.md`, `RECEIVE_KILL12B_STATUS.json` and `review/RECEIVE_KILL12B_REVIEW.html`. The first round (candidate A, 18–19 Oct) stays as presented: `RECEIVE_KILL12_REPORT.md`, `RECEIVE_KILL12_STATUS.json`, `review/RECEIVE_KILL12_REVIEW.html`.

## Where things are

- **Code:** `sandbox/visual/receive_kill12/` is a copy of `receive_kill11/`. `receive_kill1/` and `receive_kill11/` are unchanged and are the ORIGINAL / CURRENT references.
  - `rk_model.js`:
    - `KNOTS = { A, B }`, `CANDIDATE = "B"`; `RK.exec.curve = "remap"` and `RK.exec.knots = KNOTS[CANDIDATE]`;
    - `pchip()`, `gBC()`, `qBC()`;
    - `SCALES` {original, current, A, B} and `setScale(name)`, which switches the error curve and the chest / head k; `scaleKey("candidate")` → B;
    - `BC_STEPS` adds 75.
  - `rk_conditions.js` → `THREE_BENCH`: the nine benchmarks of the three-scale comparison.
- **Pages:**
  - `receive_kill12.html` (matrix, `&scale=B|A|current|original`, 200-seed overlay for B, A and current);
  - `receive_kill12_lab.html` (lab, scale selector, `&compare=1`).
- **Tools (`receive_kill12/tools/`):**

  | tool | what it does |
  |---|---|
  | `rk_three.mjs` / `rk_three.sh` | four scales (original, current, A, B) × 11 ratings × 200 seeds per benchmark, plus the matched anchors per 1.2 scale |
  | `rk_asmeasured.py` | the built-in scales against the first round's evidence |
  | `rk_three_md.py` | the markdown tables |
  | `rk_whatif.mjs` | any alternative knots, same benchmarks and seeds |
  | `rk_scalecheck.mjs` | the CURRENT / ORIGINAL scales reproduce RECEIVE-KILL-1.1 / RECEIVE-KILL-1 |
  | `rk_det`, `rk_chrome` (scale list), `rk_cpu`, `rk_regress` | as in 1.1; regress also checks RECEIVE-KILL-1.1 |
  | `rk_compare.sh` (`SCALE=`, default B) + `rk_compose.py` | eight-rating comparisons |
  | `rk_review_build_b.mjs`, `rk_status_b.py` | the B review page and status (`rk12b_*` evidence, `compare_b/`, `screens_b/`) |
  | `rk_review_build.mjs`, `rk_status.py` | the first-round page and status, pinned to scale A |

## To change the curve

1. Edit `KNOTS.B` (or add a scale and point `CANDIDATE` at it) in `rk_model.js`. The knots must be monotone, and keep (99, ~98.5) for the elite end.
2. Rerun:
   - `zsh tools/rk_three.sh 200`, or `rk_whatif.mjs` for a quick look;
   - `rk_det`, `rk_chrome`, `rk_matrix.sh` (distribution overlay; point the matrix page's `DIST` at it) and `rk_compare.sh`;
   - then rebuild the review.
3. A remap's outcome at BC equals the CURRENT scale's outcome at g(BC), with the same keyed draws.

## Not to touch

DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL / BALL-PHYS, tackle, RECEIVE-CONTROL-1.1, PASSING, SHOOTING, RECEIVE-KILL-1 and RECEIVE-KILL-1.1. The hash list is in `evidence/frozen_sha256_start.txt`.

## Animation contract

Unchanged from RECEIVE-KILL-1.1 (`review_artifacts/receive_kill11/RECEIVE_KILL11_ANIMATION_CONTRACT.md`). B changes only the size of the execution error, not the actions.

## Review

LOCAL ONLY (the character is a real player's model):

- B (current candidate): http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12B_REVIEW.html
- First round (A): http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12_REVIEW.html
