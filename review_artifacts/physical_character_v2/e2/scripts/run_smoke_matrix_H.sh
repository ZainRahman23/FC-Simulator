#!/bin/zsh
# DIAGNOSTIC NON-TEST SMOKE MATRIX (Decision 3 physical measurement; not an E2 stage, not a criterion run): the corrected commanded step (PSTAR5CH = estimator correction + continuous
# re-anchor + D1, and PSTAR5BH = without D1) on non-test nominal steps (forward 0.07 m, lateral 0.06 m — the SMK-1 convention; the official steps are 0.10 / 0.08), 8 bodies × both
# legs × 180 / 240 / 480 Hz, with the planner's clearance certificate LOGGED, NOT ENFORCED (--diag=noclear), so the frozen trajectory executes and its physical clearance can be
# decomposed (tools/e2_swing_track.mjs). Usage: run_smoke_matrix_H.sh <rise,apex,descent allowance mm | "placeholder"> . Clean copy of the COMMITTED tree.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2vffr/smokeH; T=$C/tree; P=$T/sandbox/visual/physchar2; EV="$W/review_artifacts/physical_character_v2/e2/evidence_smoke_H"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
ALLOW=${1:-placeholder}; mkdir -p $C/{runs,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt)), allowance $ALLOW"
DA=""; [ "$ALLOW" = placeholder ] && DA="--diagAllow=0,0,0"
n=0; for cf in PSTAR5CH PSTAR5BH; do for b in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sd in L R; do for hz in 180 240 480; do for k in f l; do
  [ $cf = PSTAR5BH ] && [ $hz != 240 ] && continue
  if [ $k = f ]; then A="--kind=forward --nominal=0.07,0"; else A="--kind=lateral --nominal=0,0.06"; fi; X=""; [ $cf = PSTAR5CH ] && X="$DA"; n=$((n+1))
  printf '#!/bin/zsh\ncd %s\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e2_run.mjs --protocol=step --human=%s --side=%s --hz=%s %s --config=%s --diag=noclear %s --out=%s/runs/smk_%s_%s_%s_%s_%s.json.gz > %s/runs/smk_%s_%s_%s_%s_%s.log 2>&1\n' "$P" $b $sd $hz "$A" $cf "$X" $C $cf $b $sd $hz $k $C $cf $b $sd $hz $k > $C/jobs/$(printf 'j%03d' $n).sh; done; done; done; done; done
log "jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json.gz | wc -l)"
(cd $P && node tools/e2_swing_track.mjs $C/runs/smk_PSTAR5CH_*.json.gz --json=$C/track_5CH.json > $C/track_5CH.txt 2>&1; node tools/e2_swing_track.mjs $C/runs/smk_PSTAR5BH_*.json.gz --json=$C/track_5BH.json > $C/track_5BH.txt 2>&1)
(cd $P && node tools/e2_eval.mjs $C/runs/smk_PSTAR5CH_*.json.gz --json=$C/eval_5CH.json > $C/eval_5CH.txt 2>&1); log "tracking + criteria (diagnostic) done"
mkdir -p "$EV/runs"; cp $C/runs/*.log "$EV/runs/"; for f in commit.txt tree_status.txt queue.log track_5CH.json track_5CH.txt track_5BH.json track_5BH.txt eval_5CH.json eval_5CH.txt; do cp $C/$f "$EV/" 2>/dev/null; done
# records are large (≈ 6 MB each): the committed subset is the 240 Hz V2-REF / V2-165-62 records; all records stay in the scratch run directory
(cd $C/runs && tar -czf "$EV/runs_records_240_REF_165.tgz" smk_*_V2-REF_*_240_*.json.gz smk_*_V2-165-62_*_240_*.json.gz); log "ALL DONE"; touch $C/all.done
