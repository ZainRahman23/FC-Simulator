#!/bin/zsh
# ABI-1 S-IMPACT (prereg §9; run only after the primary A / B / C evidence was committed, dc4da05a): the SAME conditions with the tackler's entry
# velocity scaled by the predetermined levels {0.25, 0.5, 0.75, 1.25, 1.5, 2.0} (1.0 = the primary runs); N2 with contact sets ALL and LEGS. No level is
# adopted; nothing is chosen for its look. Evaluation per level with the frozen evaluator (prefix V<level>_), then the cross-level summary.
# usage: zsh abi1_impact.sh <runs dir> <primary runs dir>
set -u
W=$(git rev-parse --show-toplevel); mkdir -p $1; RUNS=$(cd $1 && pwd); PRI=$(cd $2 && pwd); cd "$W"; export V2_KNEE_MODEL=v2k
A=review_artifacts/physical_character_v2/abi1/scripts; FIX=review_artifacts/physical_character_v2/pvp1/evidence/diag_cf1/PVP1A_DX_CF1_FIXTURE.json; LOG=$RUNS/impact.log
log() { echo "$(date +%H:%M:%S) $*" | tee -a $LOG; }
log "ABI-1 S-IMPACT — commit $(git rev-parse HEAD)"
for v in 0.25 0.5 0.75 1.25 1.5 2.0; do for c in A B C; do for cs in ALL LEGS; do
  node $A/abi1_run.mjs --cond $c --mode N2 --contact $cs --vscale $v --fixture $FIX --out $RUNS/V${v}_${c}_N2_${cs}.json.gz 2>&1 | tee -a $LOG; done; done
  node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-IMPACT_V${v}.json --prefix V${v}_ --set impact 2>&1 > /dev/null | tee -a $LOG; done
for c in A B C; do for cs in ALL LEGS; do ln -sf $PRI/${c}_N2_${cs}.json.gz $RUNS/V1.0_${c}_N2_${cs}.json.gz; done; done
node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-IMPACT_V1.0.json --prefix V1.0_ --set impact > /dev/null 2>&1
node $A/abi1_impact_summary.mjs $RUNS $RUNS/ABI1_S-IMPACT_SUMMARY.json 2>&1 | tee -a $LOG
log "DONE"
