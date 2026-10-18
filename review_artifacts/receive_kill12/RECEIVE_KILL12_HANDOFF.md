# RECEIVE-KILL-1.2 — handoff

**State:** presented for the owner's review, 18 Oct 2026. NOT frozen, curve not locked, not integrated into RECEIVE-CONTROL-1.1. **Decision pending:** candidate A (exact anchors, built) vs what-if B (anchors within 10 %, wider 50–75 band) vs restated anchors. See the report summary.

## Where things are

- **Code:** `sandbox/visual/receive_kill12/` is a copy of `receive_kill11/`. `receive_kill1/` and `receive_kill11/` are unchanged and are the ORIGINAL / CURRENT references.
  - `rk_model.js`:
    - `RK.exec.curve = "remap"` and `RK.exec.knots` (the PCHIP knots of candidate A);
    - `pchip()`, `gBC()`, `qBC()`;
    - `SCALES` {original, current, candidate} and `setScale(name)`, which switches the error curve and the chest / head k;
    - `BC_STEPS` adds 75.
  - `rk_conditions.js` → `THREE_BENCH`: the nine benchmarks of the three-scale comparison.
- **Pages:**
  - `receive_kill12.html` (matrix, `&scale=`, 200-seed overlay for candidate and current);
  - `receive_kill12_lab.html` (lab, scale selector, `&compare=1`).
- **Tools (`receive_kill12/tools/`):**

  | tool | what it does |
  |---|---|
  | `rk_three.mjs` / `rk_three.sh` | three scales × 11 ratings × 200 seeds per benchmark, plus the matched anchors |
  | `rk_three_md.py` | the markdown tables |
  | `rk_whatif.mjs` | any alternative knots, same benchmarks and seeds |
  | `rk_scalecheck.mjs` | the CURRENT / ORIGINAL scales reproduce RECEIVE-KILL-1.1 / RECEIVE-KILL-1 |
  | `rk_det`, `rk_chrome`, `rk_cpu`, `rk_regress` | as in 1.1; regress also checks RECEIVE-KILL-1.1 |
  | `rk_compare.sh` (`SCALE=`) + `rk_compose.py` | eight-rating comparisons |
  | `rk_review_build.mjs`, `rk_review_check.cjs`, `rk_status.py` | review page and status |

## To change the curve

1. Edit `RK.exec.knots` in `rk_model.js`. The knots must be monotone, and keep (99, ~98.5) for the elite end.
2. Rerun:
   - `zsh tools/rk_three.sh 200`, or `rk_whatif.mjs` for a quick look;
   - `rk_det`, `rk_chrome`, `rk_matrix.sh` (distribution overlay) and `rk_compare.sh`;
   - then rebuild the review.
3. A remap's outcome at BC equals the CURRENT scale's outcome at g(BC), with the same keyed draws.

## Not to touch

DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL / BALL-PHYS, tackle, RECEIVE-CONTROL-1.1, PASSING, SHOOTING, RECEIVE-KILL-1 and RECEIVE-KILL-1.1. The hash list is in `evidence/frozen_sha256_start.txt`.

## Animation contract

Unchanged from RECEIVE-KILL-1.1 (`review_artifacts/receive_kill11/RECEIVE_KILL11_ANIMATION_CONTRACT.md`). The candidate changes only the size of the execution error, not the actions.

## Review

LOCAL ONLY (the character is a real player's model):

- http://127.0.0.1:8361/review_artifacts/receive_kill12/review/RECEIVE_KILL12_REVIEW.html
