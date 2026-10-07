#!/bin/zsh
# D1G VALIDATION outside the TD2C battery (e2/D1G_TD2C_PREREG.md §I.4): the frozen e2/D1G_RUN_LIST.json — DG-2 reach stress (288, tools/d1g_val.mjs), DG-4 (a) repeats (24), DG-3 (a)
# mirror test (24, tools/d1g_unit.mjs), DG-1 (c) SV-2 servo-on runs with the guard (438, tools/d1g_wrap.mjs + the frozen tools/swing_servo_val2.mjs) — evaluated by tools/d1g_eval.mjs.
# Clean copy of the COMMITTED tree; refuses with uncommitted changes under sandbox/visual/physchar2. Evidence to e2/evidence_d1g/.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/d1gval/run; T=$C/tree; P=$T/sandbox/visual/physchar2; RA="$W/review_artifacts/physical_character_v2"; EV="$RA/e2/evidence_d1g"; log() { echo "$(date +%H:%M:%S) $*" | tee -a $C/queue.log; }
mkdir -p $C/{runs,rep,unit,sv2,jobs} $T "$EV"
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); (cd "$W" && git archive HEAD sandbox/visual/physchar2) | tar -x -C $T
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
cp "$RA/e2/D1G_RUN_LIST.json" $C/list.json; log "start (commit $(cat $C/commit.txt))"
node -e 'const fs=require("fs"), L=JSON.parse(fs.readFileSync(process.argv[1])); const [P,C]=process.argv.slice(2); let n=0; const job=(cmd)=>{ n++; fs.writeFileSync(`${C}/jobs/j${String(n).padStart(4,"0")}.sh`, `#!/bin/zsh\ncd "${P}"\nexport V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13\n${cmd}\n`); };
  for (const q of L.dg2) { const f=`d1g_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}`; job(`node tools/d1g_val.mjs --human=${q.body} --side=${q.side} --hz=${q.hz} --cfg=${q.cfg} --cond=${q.cond} --out=${C}/runs/${f}.json.gz > ${C}/runs/${f}.log 2>&1`); }
  for (const q of L.rep) { const f=`d1g_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}`; job(`node tools/d1g_val.mjs --human=${q.body} --side=${q.side} --hz=${q.hz} --cfg=${q.cfg} --cond=${q.cond} --out=${C}/rep/${f}.json.gz > ${C}/rep/${f}.log 2>&1`); }
  for (const q of L.unit) { const f=`d1gu_${q.body}_${q.cond}`; job(`node tools/d1g_unit.mjs --human=${q.body} --cond=${q.cond} --out=${C}/unit/${f}.json.gz > ${C}/unit/${f}.log 2>&1`); }
  for (const q of L.sv2) { const f=`${q.body}_${q.side}_${q.hz}_on_${q.traj}`; job(`node tools/d1g_wrap.mjs --d1gcfg=PSTAR5CH tools/swing_servo_val2.mjs --human=${q.body} --side=${q.side} --hz=${q.hz} --ff=on --traj=${q.traj} --out=${C}/sv2/sv2_${f}.json.gz > ${C}/sv2/sv2g_${f}.log 2>&1`); }
  console.log(n);' $C/list.json $P $C > $C/njobs.txt
log "jobs: $(cat $C/njobs.txt)"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "runs done: dg2 $(ls $C/runs/*.json.gz | wc -l) rep $(ls $C/rep/*.json.gz | wc -l) unit $(ls $C/unit/*.json.gz | wc -l) sv2 $(ls $C/sv2/*.log | wc -l)"
EA=(--list=$C/list.json --dir=$C/runs --rep=$C/rep --unit=$C/unit --sv2dir=$C/sv2 --sv2logs="$RA/e2/evidence_sv2/logs")
if grep -L "invalid 0$" $C/sv2/sv2g_*.log | grep -q .; then (cd $P && node tools/swing_servo_eval2.mjs --dir=$C/sv2 --list="$RA/e2/evidence_sv2/list.json" --json=$C/sv2_eval_guarded.json > $C/sv2_eval_guarded.txt 2>&1); EA+=(--sv2evalNew=$C/sv2_eval_guarded.json --sv2eval="$RA/e2/evidence_sv2/sv2_eval.json"); log "SV-2 engaged runs present: frozen SV-2 evaluator run on the guarded records"; fi
(cd $P && node tools/d1g_eval.mjs $EA --json=$C/d1g_eval.json > $C/d1g_eval_summary.txt 2>&1); log "EVAL: $(tail -1 $C/d1g_eval_summary.txt)"
mkdir -p "$EV/logs" "$EV/records"; (cd $C && tar -czf "$EV/logs/run_logs.tgz" runs/*.log rep/*.log unit/*.log sv2/*.log); cp $C/runs/*.json.gz "$EV/records/"; mkdir -p "$EV/unit" && cp $C/unit/*.json.gz "$EV/unit/"
gzip -c $C/d1g_eval.json > "$EV/d1g_eval.json.gz"; for f in commit.txt tree_status.txt queue.log list.json d1g_eval_summary.txt; do cp $C/$f "$EV/"; done; [ -f $C/sv2_eval_guarded.txt ] && cp $C/sv2_eval_guarded.txt "$EV/"; log "ALL DONE"; touch $C/all.done
