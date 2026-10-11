#!/bin/zsh
# ABI-1 execution, frozen at the pre-run freeze (ABI1_PRERUN_FREEZE.md): primary A / B / C (N2, C0, EXT) + determinism repeats, the preregistered
# secondary arms S-DX, S-TONE, S-DELAY, S-ABL, ib_verify before / after, evaluations, CPU. S-IMPACT is NOT run here (only after A / B / C are committed).
# usage: zsh abi1_execute.sh <runs dir>
set -u
W=$(git rev-parse --show-toplevel); mkdir -p $1; RUNS=$(cd $1 && pwd); cd "$W"; export V2_KNEE_MODEL=v2k
A=review_artifacts/physical_character_v2/abi1/scripts; P=review_artifacts/physical_character_v2/pvp1; FIX=$P/evidence/diag_cf1/PVP1A_DX_CF1_FIXTURE.json; DXF=$P/fixture/PVP1A_FIXTURE.json; LOG=$RUNS/execute.log
log() { echo "$(date +%H:%M:%S) $*" | tee -a $LOG; }
ib() { (cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1); }
ibs() { echo "$1" | sed -E 's/.*\(([0-9]+) pass, ([0-9]+) note, ([0-9]+) fail\).*/\1\/\2\/\3/'; }
run() { local name=$1; shift; node $A/abi1_run.mjs "$@" --out $RUNS/$name.json.gz 2>&1 | tee -a $LOG; }
trio() { local pre=$1 c=$2; shift 2; run ${pre}${c}_N2_ALL --cond $c --mode N2 "$@"; run ${pre}${c}_C0_ALL --cond $c --mode C0 "$@"; run ${pre}${c}_N2_LEGS --cond $c --mode N2 --contact LEGS "$@"; }
log "ABI-1 execution — commit $(git rev-parse HEAD) — uncommitted changes in abi1/scripts: $(git status --porcelain -- $A | wc -l | tr -d ' ')"
IB0=$(ib); log "ib_verify before: $IB0"
log "── primary (CF1 fixture) ──"
for c in A B C; do trio "" $c --fixture $FIX; done
for c in B C; do run ${c}_N2_ALL_rep --cond $c --mode N2 --fixture $FIX; done
log "── S-DX (DX fixture) ──";      for c in A B C; do trio DX_ $c --fixture $DXF; done
log "── S-TONE ──";                 for c in A B C; do trio T_ $c --fixture $FIX --tone 1; done
log "── S-DELAY ──";                for dd in 24 36; do for c in B C; do trio D${dd}_ $c --fixture $FIX --d $dd; done; done
log "── S-ABL ──";                  trio B0_ B --fixture $FIX --hip 0 --arms 0; trio B1_ B --fixture $FIX --arms 0
IB1=$(ib); log "ib_verify after: $IB1"
I0=$(ibs "$IB0"); I1=$(ibs "$IB1")
log "── evaluations ──"
node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL.json --ib-before $I0 --ib-after $I1 2>&1 | tee -a $LOG
node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-DX.json --prefix DX_ --ib-before $I0 --ib-after $I1 2>&1 | tee -a $LOG
node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-TONE.json --prefix T_ --ib-before $I0 --ib-after $I1 2>&1 | tee -a $LOG
for dd in 24 36; do node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-DELAY${dd}.json --prefix D${dd}_ --aref "" --d $dd --ib-before $I0 --ib-after $I1 2>&1 | tee -a $LOG; done
for ab in B0 B1; do node $A/abi1_eval.mjs $RUNS $RUNS/ABI1_EVAL_S-ABL-${ab}.json --prefix ${ab}_ --aref "" --ib-before $I0 --ib-after $I1 2>&1 | tee -a $LOG; done
log "── S-CPU ──"; node $A/abi1_cpu.mjs $FIX $RUNS/ABI1_CPU.json 2>&1 | tee -a $LOG
log "DONE"
