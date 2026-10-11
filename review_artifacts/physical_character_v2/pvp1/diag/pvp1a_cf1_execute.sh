#!/bin/zsh
# POST-HOC DIAGNOSTIC "PVP-1A-DX-CF1" execution: the FROZEN plant / runner / corrected evaluator on the CF1 fixture variant (arms cleared). Not PVP-1A.
# usage: zsh pvp1a_cf1_execute.sh <runs dir>
set -u
W=$(git rev-parse --show-toplevel); mkdir -p $1; RUNS=$(cd $1 && pwd); cd "$W"; export V2_KNEE_MODEL=v2k
R=review_artifacts/physical_character_v2/pvp1/scripts; DG=review_artifacts/physical_character_v2/pvp1/diag; FIX=$RUNS/PVP1A_DX_CF1_FIXTURE.json; LOG=$RUNS/execute.log
log() { echo "$(date +%H:%M:%S) $*" | tee -a $LOG; }
log "PVP-1A-DX-CF1 (post-hoc diagnostic) — commit $(git rev-parse HEAD) — frozen scripts unchanged: $(git status --porcelain -- $R | wc -l | tr -d ' ') changes in scripts/"
node $DG/pvp1a_cf1_fixture.mjs $FIX 2>&1 | tee -a $LOG
for m in C0 N2 X2 SOLO_R SOLO_T; do node $R/pvp1a_run.mjs --mode $m --fixture $FIX --out $RUNS/$m.json.gz 2>&1 | tee -a $LOG; done
node $R/pvp1a_run.mjs --mode N2 --fixture $FIX --out $RUNS/N2_rep.json.gz 2>&1 | tee -a $LOG
log "ib_verify after: $(cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1)"
node $R/pvp1a_eval.mjs $RUNS $FIX $RUNS/PVP1A_DX_CF1_EVAL.json 2>&1 | tee -a $LOG
log "DONE"
