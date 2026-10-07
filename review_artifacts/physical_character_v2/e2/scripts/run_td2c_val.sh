#!/bin/zsh
# TD2C VALIDATION (e2/D1G_TD2C_PREREG.md Part II; DG-1 (a, b), DG-4 (b), DG-6 on its records): the frozen run list e2/TD2C_RUN_LIST.json (3,552 runs) with tools/td2c_val.mjs, evaluated by
# tools/td2c_eval.mjs (BASE values from the frozen FB battery e2/evidence_fb/; the hash references from the frozen TD2B battery e2/evidence_td2b/). Clean copy of the COMMITTED tree;
# refuses with uncommitted changes under sandbox/visual/physchar2. Evaluation, logs and the 240 Hz V2-REF (left) and V2-198-92 (both legs) records to e2/evidence_td2c/.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/td2cval/run; T=$C/tree; P=$T/sandbox/visual/physchar2; RA="$W/review_artifacts/physical_character_v2"; EV="$RA/e2/evidence_td2c"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{runs,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
cp "$RA/e2/TD2C_RUN_LIST.json" $C/list.json; log "start (commit $(cat $C/commit.txt))"
node -e 'const L=JSON.parse(require("fs").readFileSync(process.argv[1])); const [P,C]=process.argv.slice(2); let n=0; for (const q of L.runs) { n++; const f=`td2c_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}_${q.traj}`; require("fs").writeFileSync(`${C}/jobs/j${String(n).padStart(4,"0")}.sh`, `#!/bin/zsh\ncd "${P}"\nV2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/td2c_val.mjs --human=${q.body} --side=${q.side} --hz=${q.hz} --cfg=${q.cfg} --cond=${q.cond} --traj=${q.traj} --out=${C}/runs/${f}.json.gz > ${C}/runs/${f}.log 2>&1\n`); } console.log(n);' $C/list.json $P $C > $C/njobs.txt
log "jobs: $(cat $C/njobs.txt)"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done $(ls $C/runs/*.json.gz | wc -l)"
mkdir -p $C/td2blogs && tar -xzf "$RA/e2/evidence_td2b/logs/run_logs.tgz" -C $C/td2blogs
(cd $P && node tools/td2c_eval.mjs --dir=$C/runs --list=$C/list.json --fbjson="$RA/e2/evidence_fb/fb_eval.json.gz" --td2blogs=$C/td2blogs --json=$C/td2c_eval.json > $C/td2c_eval_summary.txt 2>&1); log "EVAL: $(tail -1 $C/td2c_eval_summary.txt)"
mkdir -p "$EV/logs" "$EV/records_240_REF_198"; (cd $C/runs && tar -czf "$EV/logs/run_logs.tgz" *.log); cp $C/runs/td2c_*_V2-REF_L_240_*.json.gz $C/runs/td2c_*_V2-198-92_*_240_*.json.gz "$EV/records_240_REF_198/" 2>/dev/null
gzip -c $C/td2c_eval.json > "$EV/td2c_eval.json.gz"; for f in commit.txt tree_status.txt queue.log list.json td2c_eval_summary.txt; do cp $C/$f "$EV/"; done; log "ALL DONE"; touch $C/all.done
