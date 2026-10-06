#!/bin/zsh
# BOUNDED 30 mm TOUCHDOWN DIAGNOSTIC MATRIX (e2/SWING_SERVO_VALIDATION_V2_PREREG.md §7; reading rules e2/TOUCHDOWN_A30_ANALYSIS_PLAN.md). Runs ONLY if the SV-2 battery validated
# and PG-1 certified 32 / 32 under the SV-2 allowance. PSTAR5CH, trajectory A30, certificate ENFORCED (no --diag), non-test nominal steps (forward 0.07 m, lateral 0.06 m), 8 bodies
# × both legs × 180 / 240 / 480 Hz = 96 runs. Not the official E2 battery: no preregistered test step. Clean copy of the COMMITTED tree.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2tdA30/run; T=$C/tree; P=$T/sandbox/visual/physchar2; EV="$W/review_artifacts/physical_character_v2/e2/evidence_td_A30"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{runs,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt))"
n=0; for b in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sd in L R; do for hz in 180 240 480; do for k in f l; do
  if [ $k = f ]; then A="--kind=forward --nominal=0.07,0"; else A="--kind=lateral --nominal=0,0.06"; fi; n=$((n+1))
  printf '#!/bin/zsh\ncd %s\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e2_run.mjs --protocol=step --human=%s --side=%s --hz=%s %s --config=PSTAR5CH --traj=A30 --out=%s/runs/td_%s_%s_%s_%s.json.gz > %s/runs/td_%s_%s_%s_%s.log 2>&1\n' "$P" $b $sd $hz "$A" $C $b $sd $hz $k $C $b $sd $hz $k > $C/jobs/$(printf 'j%03d' $n).sh; done; done; done; done
log "jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json.gz | wc -l)"
(cd $P && node tools/e2_td_metrics.mjs $C/runs/td_*.json.gz --json=$C/td_metrics.json > $C/td_metrics.txt 2>&1; node tools/e2_eval.mjs $C/runs/td_*.json.gz --json=$C/eval.json > $C/eval.txt 2>&1); log "metrics + criteria (information) done"
mkdir -p "$EV/runs"; cp $C/runs/*.log "$EV/runs/"; for f in commit.txt tree_status.txt queue.log td_metrics.json td_metrics.txt eval.json eval.txt; do cp $C/$f "$EV/" 2>/dev/null; done
(cd $C/runs && tar -czf "$EV/runs_records_240_REF_165.tgz" td_V2-REF_*_240_*.json.gz td_V2-165-62_*_240_*.json.gz); log "ALL DONE"; touch $C/all.done
