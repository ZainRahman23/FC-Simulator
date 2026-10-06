#!/bin/zsh
# PG-1 UNDER A30 WITH THE SV-2 ALLOWANCE (e2/SWING_SERVO_VALIDATION_V2_PREREG.md §6): PSTAR5CH, --traj=A30, the 32 preregistered commanded decisions (8 bodies × L / R ×
# forward 0.10 m / lateral 0.08 m, 240 Hz; the same cases as evidence_pg_A30/G). PASS iff all 32 are CERTIFIED_ONE_STEP. Runs only after the SV-2 battery validated and the per-bin
# allowance was entered in ctrl/v2_footstep.js FS.clearAllow (committed). Clean copy of the COMMITTED tree.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2pgsv2/run; T=$C/tree; P=$T/sandbox/visual/physchar2; EV="$W/review_artifacts/physical_character_v2/e2/evidence_pg_A30_sv2"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/runs $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt))"
mkdir -p $C/jobs; n=0; for b in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sd in L R; do for k in forward lateral; do n=$((n+1))
  printf '#!/bin/zsh\ncd "%s"\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e2_pg.mjs --protocol=step --human=%s --side=%s --kind=%s --hz=240 --config=PSTAR5CH --traj=A30 --out=%s/runs/pg_%s_%s_%s.json > %s/runs/pg_%s_%s_%s.log 2>&1\n' "$P" $b $sd $k $C $b $sd $k $C $b $sd $k > $C/jobs/$(printf 'j%02d' $n).sh; done; done; done
log "jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json 2>/dev/null | wc -l)"
cat $C/runs/*.log > $C/pg_all.txt; N=$(grep -c ": CERTIFIED_ONE_STEP" $C/pg_all.txt); log "PG-1: CERTIFIED_ONE_STEP $N / 32"
mkdir -p "$EV/runs"; cp $C/runs/* "$EV/runs/"; for f in commit.txt tree_status.txt queue.log pg_all.txt; do cp $C/$f "$EV/"; done; log "ALL DONE"; touch $C/all.done
