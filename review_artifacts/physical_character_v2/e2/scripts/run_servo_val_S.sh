#!/bin/zsh
# SWING-SERVO VALIDATION, amendment S (e2/SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S.md): the preregistered battery (e2/SWING_SERVO_VALIDATION_PREREG.md §1, 192 runs) under
# VAL-OFF = PSTAR5BS, VAL-ON = PSTAR5CS (tools/swing_servo_val.mjs --vff=sr); evaluator tools/swing_servo_eval.mjs unchanged. Clean copy of the COMMITTED tree.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2vffr/servoS; T=$C/tree; P=$T/sandbox/visual/physchar2; EV="$W/review_artifacts/physical_character_v2/e2/evidence_servo_S"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{runs,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt))"
n=0; for b in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sd in L R; do for hz in 180 240 480; do for ff in off on; do for seq in A B; do n=$((n+1))
  printf '#!/bin/zsh\ncd %s\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/swing_servo_val.mjs --human=%s --side=%s --hz=%s --ff=%s --seq=%s --vff=sr --out=%s/runs/servo_%s_%s_%s_%s_%s.json.gz > %s/runs/servo_%s_%s_%s_%s_%s.log 2>&1\n' "$P" $b $sd $hz $ff $seq $C $b $sd $hz $ff $seq $C $b $sd $hz $ff $seq > $C/jobs/$(printf 'j%03d' $n).sh; done; done; done; done; done
log "jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json.gz | wc -l)"
(cd $P && node tools/swing_servo_eval.mjs --dir=$C/runs --json=$C/servo_eval.json > $C/servo_eval_summary.txt 2>&1); log "EVAL: $(tail -1 $C/servo_eval_summary.txt)"
mkdir -p "$EV/runs"; cp $C/runs/* "$EV/runs/"; for f in commit.txt tree_status.txt queue.log servo_eval.json servo_eval_summary.txt; do cp $C/$f "$EV/"; done; log "ALL DONE"; touch $C/all.done
