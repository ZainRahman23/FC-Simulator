#!/bin/zsh
# IFM-1 EXECUTION (after the pre-run freeze IFM1_FREEZE.json is committed). Stages follow the preregistration; W and X are decided by the frozen
# evaluator's rules (no manual selection). usage: LV2_ARCHIVE=<git archive of the RUN-1 tag> zsh ifm1_execute.sh <runs dir>
set -u
W=$(git rev-parse --show-toplevel); mkdir -p $1; RUNS=$(cd $1 && pwd); cd "$W"; export V2_KNEE_MODEL=v2k   # correction C6: absolute runs path (selectors below read "$RUNS/…")
R=review_artifacts/physical_character_v2/ifm1/scripts; LOG=$RUNS/execute.log
log() { echo "$(date +%H:%M:%S) $*" | tee -a $LOG; }
run() { node $R/ifm1_run.mjs "$@" 2>&1 | tee -a $LOG | tail -1 > /dev/null; }
log "IFM-1 execution — commit $(git rev-parse HEAD) — status $(git status --porcelain -- . | wc -l | tr -d ' ') changed"
log "ib_verify before: $(cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1)"
# ── stage 1: the four shared controls (C0), plus the once-only placement-independence check (S-FLAT control with the PL and SH placements) ──
for b in R0 RH1; do for s in S-FLAT S-TOE; do run --body $b --state $s --mode C0 --out $RUNS/C0_${b}_${s}.json.gz; done
  for p in PL SH; do run --body $b --state S-FLAT --mode C0 --placement $p --out $RUNS/C0P_${b}_S-FLAT_${p}.json.gz; done; done
# ── stage 2: native contact N, eight cells ──
for r in SW PL SH TP; do for b in R0 RH1; do run --body $b --role $r --mode N --out $RUNS/N_${r}_${b}.json.gz; done; done
node $R/ifm1_eval.mjs $RUNS $RUNS/eval_stage2.json >> $LOG 2>&1
# ── stage 3: W where permitted (C0 primary valid and N's first step corresponds and is valid) ──
for c in $(node -e 'const e=require(process.argv[1]);for(const[k,c]of Object.entries(e.cells))if(c.W&&c.W.permitted)console.log(k.replace("/","_"))' "$RUNS/eval_stage2.json"); do
  r=${c%_*}; b=${c#*_}; run --body $b --role $r --mode W --wrench $RUNS/N_${r}_${b}.json.gz --out $RUNS/W_${r}_${b}.json.gz; done
node $R/ifm1_eval.mjs $RUNS $RUNS/eval_stage3.json >> $LOG 2>&1
# ── stage 4: X where triggered (W not state-matched, or N / W disagree on validity / detectability / equivalence) ──
for c in $(node -e 'const e=require(process.argv[1]);for(const[k,c]of Object.entries(e.cells))if(c.X&&c.X.triggered)console.log(k.replace("/","_"))' "$RUNS/eval_stage3.json"); do
  r=${c%_*}; b=${c#*_}; run --body $b --role $r --mode X --nref $RUNS/N_${r}_${b}.json.gz --out $RUNS/X_${r}_${b}.json.gz; done
node $R/ifm1_eval.mjs $RUNS $RUNS/eval_stage4.json >> $LOG 2>&1
# ── stage 5: determinism — every base trajectory again in a fresh process; then the whole available set in reverse order in one process ──
node -e '
const fs=require("fs"),p=require("path"),D=process.argv[1],J=[];
for(const b of ["R0","RH1"])for(const s of ["S-FLAT","S-TOE"])if(fs.existsSync(p.join(D,`C0_${b}_${s}.json.gz`)))J.push({name:`C0_${b}_${s}`,body:b,state:s,mode:"C0",file:`C0_${b}_${s}.json.gz`});
for(const r of ["SW","PL","SH","TP"])for(const b of ["R0","RH1"]){if(fs.existsSync(p.join(D,`N_${r}_${b}.json.gz`)))J.push({name:`N_${r}_${b}`,body:b,role:r,mode:"N",file:`N_${r}_${b}.json.gz`});
 if(fs.existsSync(p.join(D,`W_${r}_${b}.json.gz`)))J.push({name:`W_${r}_${b}`,body:b,role:r,mode:"W",wrench:`N_${r}_${b}.json.gz`,file:`W_${r}_${b}.json.gz`});}
fs.writeFileSync(p.join(D,"jobs_base.json"),JSON.stringify(J,null,1));' $RUNS
for j in $(node -e 'for(const j of require(process.argv[1]))console.log(j.name)' "$RUNS/jobs_base.json"); do
  case $j in C0_*) b=$(echo $j | cut -d_ -f2); s=$(echo $j | cut -d_ -f3); run --body $b --state $s --mode C0 --out $RUNS/${j}_rep.json.gz;;
    N_*) r=$(echo $j | cut -d_ -f2); b=$(echo $j | cut -d_ -f3); run --body $b --role $r --mode N --out $RUNS/${j}_rep.json.gz;;
    W_*) r=$(echo $j | cut -d_ -f2); b=$(echo $j | cut -d_ -f3); run --body $b --role $r --mode W --wrench $RUNS/N_${r}_${b}.json.gz --out $RUNS/${j}_rep.json.gz;; esac; done
node $R/ifm1_batch.mjs $RUNS/jobs_base.json $RUNS $RUNS/batch_reverse.json >> $LOG 2>&1
node $R/ifm1_determinism.mjs $RUNS/jobs_base.json $RUNS $RUNS/batch_reverse.json $RUNS/determinism.json 2>&1 | tee -a $LOG | tail -1
# ── stage 6: CPU (alone) ──
node $R/ifm1_cpu.mjs $RUNS/jobs_base.json $RUNS $RUNS/cpu.json >> $LOG 2>&1
log "ib_verify after: $(cd review_artifacts/physical_character_v2 && node interaction_benchmark/scripts/ib_verify.mjs 2>&1 | tail -1)"
node $R/ifm1_eval.mjs $RUNS $RUNS/IFM1_EVAL.json >> $LOG 2>&1; log "DONE"
