#!/bin/zsh
# Foot-yaw independent regression (e1b_close/E1B_CLOSE_PREREG.md set GY): configuration PSTARY = PSTAR + footYaw only; the same items, rules and frozen
# (Derived from e1b_fix/scripts/regress_battery_pstar2.sh after its erratum E1bF-e3 fix; file names *_vPY.json, copied to the frozen evaluator's *_v4 names.)
# evaluators as the PSTAR regression (preswing/scripts/regress_battery_pstar.sh, V15). Runs from a clean copy of the committed tree.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/vPY; T=$C/tree; log() { echo "$(date +%H:%M:%S) $*" >> $C/queue.log; }
ST='{"ikRefTwist":true,"lifecycle":true,"ffLockedAxis":true,"touchRest":true,"lcVff":"lin","lcTouch":{"reseed":true},"footYaw":true}'; FL='{"ffLockedAxis":true,"touchRest":true,"lcVff":"lin","lcTouch":{"reseed":true},"footYaw":true}'
mkdir -p $C/{q1,q2,q3,q5,q6,q7,policy,jobs} $T/sandbox/visual $T/review_artifacts/physical_character_v2/{g0,g1,g2,g3}/json
[ -z "$(cd "$W" && git status --porcelain sandbox/visual/physchar2)" ] || { echo "uncommitted changes under sandbox/visual/physchar2 — refusing"; exit 1; }
rsync -a --delete "$W/sandbox/visual/physchar2/" $T/sandbox/visual/physchar2/; cp "$W"/review_artifacts/physical_character_v2/*.json $T/review_artifacts/physical_character_v2/ 2>/dev/null
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt); cp $S/b/hash_head.txt $C/
cd $T/sandbox/visual/physchar2; unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt), worktree status: $(wc -l < $C/tree_status.txt) changed)"
node $S/b/hashcmp.mjs . T5 U:R T7:R:0.25 T8:hold:L:FR:15 > $C/q0_hashcmp.txt 2>&1; diff -q $C/q0_hashcmp.txt $C/hash_head.txt > /dev/null && log "V3.1 KV0 IDENTICAL" || log "V3.1 KV0 DIFFERS"
node tools/v2_component_regressions.mjs --json=$C/q0_regressions.json > $C/q0_regressions.log 2>&1; log "V3.1 suite: $(tail -1 $C/q0_regressions.log)"
(cd "$W/sandbox/visual/physchar2" && bash tools/guard_v1.sh > $C/q0_guard_v1.log 2>&1); log "V3.1 guard: $(tail -1 $C/q0_guard_v1.log)"
rm -f $C/jobs/*.sh; n=0; job() { n=$((n+1)); printf '#!/bin/zsh\ncd %s\n%s\n' "$T/sandbox/visual/physchar2" "$1" > $C/jobs/$(printf 'j%03d' $n).sh; }
job "node tools/knee_v2k_bench.mjs --crit=v2 --out=$C/q1/bench.json > $C/q1/bench.log 2>&1"
job "node tools/knee_v2k_rig.mjs --part=all --crit=v2 --out=$C/q1/rig_v2k.json > $C/q1/rig_v2k.log 2>&1"
job "node tools/b1_bench.mjs $C/q1/b1_bench.json > $C/q1/b1_bench.log 2>&1"
for h in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do
  job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$h --policy=reference --model=v2k --stand='{\"lifecycle\":true,\"ffLockedAxis\":true,\"touchRest\":true,\"lcVff\":\"lin\",\"lcTouch\":{\"reseed\":true},\"footYaw\":true}' --out=$C/q2/kv6c_$h.json > $C/q2/kv6c_$h.log 2>&1"; done
for h in V2-REF V2-165-62 V2-198-92; do for hz in 180 240 480; do job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/boundary_probe.mjs --human=$h --hz=$hz --stand='{\"ikRefTwist\":true,\"ffLockedAxis\":true,\"touchRest\":true,\"lcVff\":\"lin\",\"lcTouch\":{\"reseed\":true},\"footYaw\":true}' $C/q6/boundary_${h}_hz$hz.json > $C/q6/boundary_${h}_hz$hz.log 2>&1"; done
  for m in v2k old; do job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=A --human=$h --policy=reference --model=$m --stand='{\"lifecycle\":true,\"ffLockedAxis\":true,\"touchRest\":true,\"lcVff\":\"lin\",\"lcTouch\":{\"reseed\":true},\"footYaw\":true}' --out=$C/q7/yaw_A_${h}_$m.json > $C/q7/yaw_A_${h}_$m.log 2>&1"
    job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=B --human=$h --policy=reference --model=$m --stand='$FL' --out=$C/q7/yaw_B_${h}_$m.json > $C/q7/yaw_B_${h}_$m.log 2>&1"; done; done
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/k_premise.mjs --stand='$ST' --knee=v2k $C/q3/k_margins.json > $C/q3/k_margins.log 2>&1"
for p in ref current; do for h in V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched; do for sc in Q PY4 PR8 SB TURN T1 T5 UR LIFT HO1 HO2 HO3; do
  job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND='$FL' node tools/twist_policy_battery.mjs --policy=$p --human=$h --scen=$sc $C/policy/r_0.13_${p}_${h}_$sc.json > /dev/null 2> $C/policy/e_0.13_${p}_${h}_$sc.log"; done; done; done
log "component jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "component jobs done"; touch $C/phaseA.done
R=$T/review_artifacts/physical_character_v2
( export V2_KNEE_MODEL=v2k; node tools/g0_run.js --out $C/q3/g0 > $C/q3/g0.log 2>&1 ); log "V3.3 G0: $(grep 'G0 RESULT' $C/q3/g0.log)"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2; node tools/g1_run.js --no-dx --no-v1 > $C/q3/g1.log 2>&1 ); cp $R/g1/json/g1_results.json $C/q3/g1_results_vPY.json; log "V3.4 G1: $(grep 'G1 RESULT' $C/q3/g1.log | tail -1)"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND=$ST; node tools/g2_run.js > $C/q3/g2.log 2>&1 ); cp $R/g2/json/g2_results_xstand.json $C/q3/g2_results_vPY.json; log "V3.5 G2 done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_run.js --stand=$ST --tag=vPY > $C/q3/g3.log 2>&1 ); cp $R/g3/json/g3_results_vPY.json $C/q3/g3_results_vPY.json; log "V3.6 G3 done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_mirror_v3.mjs --stand=$ST --out=$C/q3/g3_mirror_vPY.json > $C/q3/g3_mirror.log 2>&1 ); log "V3.6 J2a done"
Q="$W/review_artifacts/physical_character_v2/e1b_close/evidence_regression_pstary"; mkdir -p "$Q"; cp $C/q3/g1_results_vPY.json $C/q3/g2_results_vPY.json $C/q3/g3_results_vPY.json "$Q/"
STQ=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$ST'))"); REL=../../e1b_close/evidence_regression_pstary
cd "$W/sandbox/visual/physchar2"
node tools/g1_browser.mjs --qs="knee=v2k&ankleK=0.13&results=$REL/g1_results_vPY.json" --out=$C/q5/g1_browser.json > $C/q5/g1_browser.log 2>&1; log "V3 G1 browser: $(tail -1 $C/q5/g1_browser.log)"
node tools/g2_browser.mjs --qs="knee=v2k&ankleK=0.13&stand=$STQ&results=$REL/g2_results_vPY.json" --out=$C/q5/g2_browser.json > $C/q5/g2_browser.log 2>&1; log "V3 G2 browser: $(tail -1 $C/q5/g2_browser.log)"
node tools/g3_browser.mjs --qs="knee=v2k&ankleK=0.13&stand=$STQ&results=$REL/g3_results_vPY.json" --out=$C/q5/g3_browser.json > $C/q5/g3_browser.log 2>&1; log "V3 G3 browser: $(tail -1 $C/q5/g3_browser.log)"
RA="$W/review_artifacts/physical_character_v2"
node tools/qual_eval.mjs --g2=$C/q3/g2_results_vPY.json --g2browser=$C/q5/g2_browser.json --g3=$C/q3/g3_results_vPY.json --g3browser=$C/q5/g3_browser.json --mirror=$C/q3/g3_mirror_vPY.json --margins=$C/q3/k_margins.json --ra="$RA" --out=$C/q3/qual_eval_vPY.json > $C/q3/qual_eval_vPY.log 2>&1
node tools/twist_policy_eval.mjs $C/policy $C/q3/twist_eval_vPY.json > $C/q3/twist_eval_vPY.log 2>&1; node tools/close_eval.mjs --policy=$C/policy --out=$C/q3/close_eval_policy_vPY.json > $C/q3/close_eval_policy_vPY.log 2>&1
# the frozen evaluator reads the *_v4 file names (7b0ecf6): copied inside this battery directory only
for f in g1_results qual_eval twist_eval close_eval_policy; do cp $C/q3/${f}_vPY.json $C/q3/${f}_v4.json; done
node tools/touchrest_regress_eval.mjs $C "$RA/knee_correction/evidence/qual" "$RA/unload_fix/evidence" $C/regress_eval.json > $C/regress_eval.log 2>&1; log "REGRESSION: $(tail -1 $C/regress_eval.log)"
log "ALL DONE"; touch $C/all.done
