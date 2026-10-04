#!/bin/zsh
# corrected-knee QUALIFICATION v2 (review_artifacts/physical_character_v2/knee_correction/QUALIFICATION_V2_PREREG.md) — frozen commit in commit.txt;
# scratch tree (the worktree is read-only except evidence/qual for the browser checks)
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/q2; T=$C/tree; log() { echo "$(date +%H:%M:%S) $*" >> $C/queue.log; }
ST='{"ikRefTwist":true,"lifecycle":true}'
mkdir -p $C/{q1,q2,q3,q5,q6,q7,policy,jobs} $T/sandbox/visual $T/review_artifacts/physical_character_v2/{g0,g1,g2,g3}/json
rsync -a --delete "$W/sandbox/visual/physchar2/" $T/sandbox/visual/physchar2/; cp "$W"/review_artifacts/physical_character_v2/*.json $T/review_artifacts/physical_character_v2/ 2>/dev/null
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt)
cd $T/sandbox/visual/physchar2; unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt), worktree status: $(wc -l < $C/tree_status.txt) changed)"
# ── Q0a (default path) ──
node $S/b/hashcmp.mjs . T5 U:R T7:R:0.25 T8:hold:L:FR:15 > $C/q0_hashcmp.txt 2>&1; diff -q $C/q0_hashcmp.txt $S/b/hash_head.txt > /dev/null && log "Q0a hashcmp IDENTICAL" || log "Q0a hashcmp DIFFERS"
node tools/v2_component_regressions.mjs --json=$C/q0_regressions.json > $C/q0_regressions.log 2>&1; log "Q0a suite: $(tail -1 $C/q0_regressions.log)"
(cd "$W/sandbox/visual/physchar2" && bash tools/guard_v1.sh > $C/q0_guard_v1.log 2>&1); log "Q0a guard: $(tail -1 $C/q0_guard_v1.log)"
# ── parallel component jobs (8 at a time; one script per job) ──
rm -f $C/jobs/*.sh; n=0
job() { n=$((n+1)); printf '#!/bin/zsh\ncd %s\n%s\n' "$T/sandbox/visual/physchar2" "$1" > $C/jobs/$(printf 'j%03d' $n).sh; }
# Q1 mechanics + controls
job "node tools/knee_v2k_bench.mjs --crit=v2 --out=$C/q1/bench.json > $C/q1/bench.log 2>&1"
job "node tools/knee_v2k_rig.mjs --part=all --crit=v2 --out=$C/q1/rig_v2k.json > $C/q1/rig_v2k.log 2>&1"
for p in kv3b kv4b kv8; do job "node tools/knee_v2k_rig.mjs --part=$p --model=old --crit=v2 --out=$C/q1/rig_old_$p.json > $C/q1/rig_old_$p.log 2>&1"; done
for a in naive inject spring; do job "node tools/knee_v2k_rig.mjs --part=all --crit=v2 --adv=$a --out=$C/q1/rig_adv_$a.json > $C/q1/rig_adv_$a.log 2>&1"; done
job "node tools/g1_row5_audit.mjs > $C/q1/g1_row5_audit.log 2>&1"
# Q2 E1a-envelope knee behaviour (adopted configuration), determinism, deep-family irrelevance
for h in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do
  job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$h --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --out=$C/q2/kv6c_$h.json > $C/q2/kv6c_$h.log 2>&1"; done
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=V2-REF --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --out=$C/q2/kv6c_V2-REF_rep2.json > $C/q2/kv6c_V2-REF_rep2.log 2>&1"
for h in V2-REF V2-165-62 V2-198-92; do job "V2_ANKLE_NEUTRAL_K=0.13 node tools/deep_irrelevance.mjs --human=$h > $C/q2/deep_$h.log 2>&1"; done
# Q6 timestep
for h in V2-REF V2-165-62 V2-198-92; do
  for hz in 180 480; do job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$h --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --hz=$hz --out=$C/q6/kv6c_${h}_hz$hz.json > $C/q6/kv6c_${h}_hz$hz.log 2>&1"
    job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/twist_policy_battery.mjs --policy=ref --human=$h --scen=PY4 --hz=$hz $C/q6/py4_${h}_hz$hz.json > $C/q6/py4_${h}_hz$hz.log 2>&1"; done
  for hz in 180 240 480; do job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/boundary_probe.mjs --human=$h --hz=$hz --stand='{\"ikRefTwist\":true}' $C/q6/boundary_${h}_hz$hz.json > $C/q6/boundary_${h}_hz$hz.log 2>&1"; done; done
# Q7 yaw decomposition (adopted configuration; old-knee comparator)
for h in V2-REF V2-165-62 V2-198-92; do for m in v2k old; do
  job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=A --human=$h --policy=reference --model=$m --stand='{\"lifecycle\":true}' --out=$C/q7/yaw_A_${h}_$m.json > $C/q7/yaw_A_${h}_$m.log 2>&1"
  job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=B --human=$h --policy=reference --model=$m --out=$C/q7/yaw_B_${h}_$m.json > $C/q7/yaw_B_${h}_$m.log 2>&1"; done; done
# Q3e K′ geometry (adopted configuration)
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/k_premise.mjs --stand='$ST' --knee=v2k $C/q3/k_margins.json > $C/q3/k_margins.log 2>&1"
# Q3f twist battery (reference + current, k 0.13, v2k)
for p in ref current; do for h in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sc in Q PY4 PR8 SB TURN T1 T5 UR LIFT HO1 HO2 HO3; do
  job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/twist_policy_battery.mjs --policy=$p --human=$h --scen=$sc $C/policy/r_0.13_${p}_${h}_$sc.json > /dev/null 2> $C/policy/e_0.13_${p}_${h}_$sc.log"; done; done; done
log "component jobs: $n"
ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "component jobs done"
touch $C/phaseA.done
# ── Q3 gates (sequential; each runner has its own worker pool) ──
R=$T/review_artifacts/physical_character_v2
( export V2_KNEE_MODEL=v2k; node tools/g0_run.js --out $C/q3/g0 > $C/q3/g0.log 2>&1 ); log "Q3a G0: exit $?"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2; node tools/g1_run.js --no-dx --no-v1 > $C/q3/g1.log 2>&1 ); cp $R/g1/json/g1_results.json $C/q3/g1_results_qual.json; log "Q3b G1: $(grep 'G1 RESULT' $C/q3/g1.log | tail -1)"
( export B_TURF=plane V2_KNEE_MODEL=v2k; node tools/b_sweep.mjs --set=perturb240 --k=0.13 --workers=9 --out=$C/q3/sweep.json > $C/q3/sweep.log 2>&1 ); log "Q3c sweep done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND=$ST; node tools/g2_run.js > $C/q3/g2.log 2>&1 ); cp $R/g2/json/g2_results_xstand.json $C/q3/g2_results_qual.json; log "Q3d G2 done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_run.js --stand=$ST --tag=qual > $C/q3/g3.log 2>&1 ); cp $R/g3/json/g3_results_qual.json $C/q3/g3_results_qual.json; log "Q3e G3 done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_mirror_v3.mjs --stand=$ST --out=$C/q3/g3_mirror_v3_qual.json > $C/q3/g3_mirror.log 2>&1 ); log "Q3e J2a mirror done"
touch $C/gates.done
# ── Q5 browser (served from the worktree on 8172; Node results placed in the worktree evidence dir) ──
Q="$W/review_artifacts/physical_character_v2/knee_correction/evidence/qual"; mkdir -p "$Q"
cp $C/q3/g1_results_qual.json $C/q3/g2_results_qual.json $C/q3/g3_results_qual.json "$Q/"
STQ=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$ST'))"); REL=../../knee_correction/evidence/qual
cd "$W/sandbox/visual/physchar2"
node tools/g1_browser.mjs --qs="knee=v2k&ankleK=0.13&results=$REL/g1_results_qual.json" --out=$C/q5/g1_browser_qual.json > $C/q5/g1_browser_qual.log 2>&1; log "Q5b G1 browser: $(tail -1 $C/q5/g1_browser_qual.log)"
node tools/g2_browser.mjs --qs="knee=v2k&ankleK=0.13&stand=$STQ&results=$REL/g2_results_qual.json" --out=$C/q5/g2_browser_qual.json > $C/q5/g2_browser_qual.log 2>&1; log "Q5b G2 browser: $(tail -1 $C/q5/g2_browser_qual.log)"
node tools/g3_browser.mjs --qs="knee=v2k&ankleK=0.13&stand=$STQ&results=$REL/g3_results_qual.json" --out=$C/q5/g3_browser_qual.json > $C/q5/g3_browser_qual.log 2>&1; log "Q5b G3 browser: $(tail -1 $C/q5/g3_browser_qual.log)"
for g in g1 g2 g3; do node tools/${g}_browser.mjs --out=$C/q5/${g}_browser_default.json > $C/q5/${g}_browser_default.log 2>&1; log "Q5c $g browser default: $(tail -1 $C/q5/${g}_browser_default.log)"; done
log "ALL DONE"; touch $C/all.done
