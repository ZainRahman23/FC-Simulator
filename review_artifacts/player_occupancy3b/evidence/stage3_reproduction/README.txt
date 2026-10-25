STAGE 3 REPRODUCED on prototype/player-occupancy-stage3b1 BEFORE ANY CHANGE (branch cut from 88a964ba; 25 Oct 2026):
Stage 3's own tools (occupy3/tools: o3_identity, o3_metrics, o3_ball — sets review / matrix / moves / search —, o3_solo, o3_nearmiss, o3_torture)
re-run here; their outputs (these files) diffed against the committed Stage 3 evidence (review_artifacts/player_occupancy3/evidence/), the
progress-dot lines excluded. DIFF_SUMMARY.txt: 0 differing lines in every file but torture.txt, whose 1 line is the run-progress list
("0 0m 1 1m … 15 15m", printed to the same stream), not a result. Wall-clock timings are not part of these outputs.
After Stage 3's hooks were added (o3_world.js, o3_run.js), o3_metrics --set matrix and o3_ball --set review were re-run and again identical.
The final code's OLD-mode recheck is in ../old_recheck/.
