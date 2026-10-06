#!/bin/zsh
# SWING-SERVO VALIDATION v2 (SV-2; e2/SWING_SERVO_VALIDATION_V2_PREREG.md): the frozen run list e2/SV2_FROZEN_RUN_LIST.json (876 runs) with tools/swing_servo_val2.mjs, evaluated by
# tools/swing_servo_eval2.mjs (four separate verdicts: reachability, tracking accuracy, integrity, and — only if it validates — the per-bin clearance allowance).
# Clean copy of the COMMITTED tree; refuses with uncommitted changes under sandbox/visual/physchar2. Records stay in the scratch run directory (≈ 0.4 MB each); the evaluation,
# the logs and a 240 Hz record subset are copied to e2/evidence_sv2/.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/e2sv2/run; T=$C/tree; P=$T/sandbox/visual/physchar2; RA="$W/review_artifacts/physical_character_v2"; EV="$RA/e2/evidence_sv2"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{runs,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
cp "$RA/e2/SV2_FROZEN_RUN_LIST.json" $C/list.json; log "start (commit $(cat $C/commit.txt))"
node -e 'const L=JSON.parse(require("fs").readFileSync(process.argv[1])); const [P,C]=process.argv.slice(2); let n=0; for (const q of L.runs) { n++; const f=`sv2_${q.body}_${q.side}_${q.hz}_${q.ff}_${q.traj}`; require("fs").writeFileSync(`${C}/jobs/j${String(n).padStart(4,"0")}.sh`, `#!/bin/zsh\ncd "${P}"\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/swing_servo_val2.mjs --human=${q.body} --side=${q.side} --hz=${q.hz} --ff=${q.ff} --traj=${q.traj} --out=${C}/runs/${f}.json.gz > ${C}/runs/${f}.log 2>&1\n`); } console.log(n);' $C/list.json $P $C > $C/njobs.txt
log "jobs: $(cat $C/njobs.txt)"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json.gz | wc -l)"
(cd $P && node tools/swing_servo_eval2.mjs --dir=$C/runs --list=$C/list.json --json=$C/sv2_eval.json > $C/sv2_eval_summary.txt 2>&1); log "EVAL: $(grep 'VALIDATE' $C/sv2_eval_summary.txt)"
mkdir -p "$EV/logs" "$EV/records_240_REF_165"; cp $C/runs/*.log "$EV/logs/"; cp $C/runs/sv2_V2-REF_*_240_*.json.gz $C/runs/sv2_V2-165-62_*_240_*.json.gz "$EV/records_240_REF_165/" 2>/dev/null
for f in commit.txt tree_status.txt queue.log list.json sv2_eval.json sv2_eval_summary.txt; do cp $C/$f "$EV/"; done; log "ALL DONE"; touch $C/all.done
