#!/bin/zsh
# PVP-1A-DX execution (after the DX pre-run freeze is committed). usage: zsh pvp1a_execute.sh <runs dir>
set -u
W=$(git rev-parse --show-toplevel); mkdir -p $1; RUNS=$(cd $1 && pwd); cd "$W"; export V2_KNEE_MODEL=v2k
R=review_artifacts/physical_character_v2/pvp1/scripts; FIX=review_artifacts/physical_character_v2/pvp1/fixture/PVP1A_FIXTURE.json; LOG=$RUNS/execute.log
log() { echo "$(date +%H:%M:%S) $*" | tee -a $LOG; }
log "PVP-1A-DX execution — commit $(git rev-parse HEAD) — tree changes $(git status --porcelain -- review_artifacts/physical_character_v2/pvp1 | wc -l | tr -d ' ')"
log "ib_verify before: $(cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1)"
for m in C0 N2 X2 SOLO_R SOLO_T; do node $R/pvp1a_run.mjs --mode $m --fixture $FIX --out $RUNS/$m.json.gz 2>&1 | tee -a $LOG; done
for m in C0 N2; do node $R/pvp1a_run.mjs --mode $m --fixture $FIX --out $RUNS/${m}_rep.json.gz 2>&1 | tee -a $LOG; done
node $R/pvp1a_batch.mjs $FIX $RUNS/batch_reverse.json 2>&1 | tee -a $LOG
node $R/pvp1a_cpu.mjs $FIX $RUNS/cpu.json 2>&1 | tee -a $LOG
log "ib_verify after: $(cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1)"
node --input-type=module -e 'const PL=await import(process.argv[1]); const {OFF,LOCO}=PL.records(); console.log("gameplay hash after:", PL.gameplayHashOf(OFF), PL.gameplayHashOf(LOCO))' "$W/$R/pvp1a_lib.mjs" 2>&1 | tee -a $LOG || true
node $R/pvp1a_eval.mjs $RUNS $FIX $RUNS/PVP1A_DX_EVAL.json 2>&1 | tee -a $LOG
log "DONE"
