# RECEIVE-KILL-1.1 handoff

## State

18 Oct 2026, late evening EEST. RECEIVE-KILL-1.1 (compressed Ball Control + follow-up control) is implemented, measured and **presented for review — not frozen. The constants are not locked.**

- **Branch:** `prototype/dribble-1`.
- **Isolation:** the new module `sandbox/visual/receive_kill11/` is a copy of `receive_kill1/`, extended. Both modules run side by side, for old-vs-new comparisons.
- **Unchanged and re-verified:** RECEIVE-KILL-1, RECEIVE-CONTROL-1.1, DRIBBLE-V1, TURN-1.2, RUN-1.3 and the ball physics. Nothing is wired into RECEIVE-CONTROL-1.1 (owner: "Do NOT integrate this into the full RECEIVE-CONTROL-1.1 system yet").

## Where things are

| What | Path |
|---|---|
| Model: compressed curve, follow-up / stable / continuation constants (`RK.exec`, `RK.follow`, `RK.stable`, `RK.continuation`), `settleEst` | `sandbox/visual/receive_kill11/rk_model.js` |
| Control episode (`runEpisode`, `planFollow`, `predictFrom`, `stableNow`, `episodeMeasure`, `firstContact`) | `sandbox/visual/receive_kill11/rk_sim.js` |
| Placeholder body for the action sequence | `sandbox/visual/receive_kill11/rk_body.js` |
| 2D views with episode markers | `sandbox/visual/receive_kill11/rk_draw.js` |
| Episode matrix | `sandbox/visual/receive_kill11.html` + `rk_matrix_page.js` |
| Episode lab (`&compare=1` for the comparison tiles) | `sandbox/visual/receive_kill11_lab.html` + `rk_lab.js` |
| Report, episode animation contract, status | `review_artifacts/receive_kill11/RECEIVE_KILL11_REPORT.md`, `RECEIVE_KILL11_ANIMATION_CONTRACT.md`, `RECEIVE_KILL11_STATUS.json` |
| Review page (local only) | `review_artifacts/receive_kill11/review/RECEIVE_KILL11_REVIEW.html` |

## How to re-measure

All tools are in `sandbox/visual/receive_kill11/tools/`.

| What | Command |
|---|---|
| Distribution (first contact + episode, 74 balls × 10 ratings × N seeds) | `zsh rk_matrix.sh 200 <out.json> <scratch>` — ~7 min wall |
| Old vs new | `python3 rk_oldnew.py <receive_kill1 rk_distribution.json> <rk11_distribution.json> <out.md> <out.json>` |
| Episodes at a glance | `node rk_ep.mjs '{"v":8,"h":1.32,"drop":20,"surface":"CHEST"}'` (`DRAW=seed3` for a seed) |
| Determinism / matched draws | `node rk_det.mjs <out.json>` |
| Chrome vs Node | `PUPPETEER_NODE_MODULES=<dir> node rk_chrome.cjs <out.json>` |
| CPU (alone) | `node rk_cpu.mjs <out.json>` |
| Regression (+ RECEIVE-KILL-1 vs its evidence) | `node rk_regress.mjs 1 12 <out.json>` |
| Body contacts (every contact of an episode) | `node rk_bodycheck.mjs` |
| Matched-rating comparisons | `S=<scratch> zsh rk_compare.sh <out dir> 3` |
| Review page | `node rk_review_build.mjs` |

## Next (owner decisions)

1. **Visual review** of the compressed scale and the complete receives: the BENCH matrix, the comparison clips and still grids, and the lab.
2. **Constants:** lock or recalibrate.
   - The curve: eSkill 0.25, λ 0.68, eFloor 0.0068, Dc 1.
   - The chest and head error shapes.
   - Follow-up timing: free times, preparation 0.22 s, 3 m/s adjustment, reach 4 m.
   - Stable-control and continuation thresholds.
3. **Integration into RECEIVE-CONTROL-1.1:** the kill / cushion family and the moving receiver (after approval).
4. **The attribute split:** Agility for the adjustment speed, Dribbling for the foot actions' timing. Both are fixed today.
