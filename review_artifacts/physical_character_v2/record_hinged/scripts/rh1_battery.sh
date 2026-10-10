#!/bin/zsh
# RH1 VALIDATION BATTERY (record_hinged/RH1_PREREG.md §6, frozen 50eae23a): the corrected-knee qualification-v2 sequence (knee_correction/QUALIFICATION_V2_PREREG.md,
# adopted configuration) on RH1 (subject) and the PI-1 runner R0 (control), with the 8 qualified bodies re-run as the regression. Scratch tree copied from the
# committed HEAD; the scratch VARIATION_SET additionally lists R0 and RH1 (scratch only). Frozen runners unmodified; where a runner hard-codes V2-REF / V1-matched,
# a scratch copy with RH1 / R0 substituted runs the identical job set. Body-independent and not re-run (declared): Q1 knee rig mechanics, Q5b/c browser = Node.
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/rh1; T=$C/tree; log() { echo "$(date +%H:%M:%S) $*" >> $C/queue.log; }
ST='{"ikRefTwist":true,"lifecycle":true}'; RH=PI1-runner-vinicius-RH1; R0=PI1-runner-vinicius
rm -rf $C; mkdir -p $C/{q0,q2,q3,q6,q7,policy,jobs} $T/sandbox/visual $T/review_artifacts/physical_character_v2/{g0,g1,g2,g3}/json
rsync -a --delete "$W/sandbox/visual/physchar2/" $T/sandbox/visual/physchar2/; cp "$W"/review_artifacts/physical_character_v2/*.json $T/review_artifacts/physical_character_v2/ 2>/dev/null
mkdir -p $T/assets/characters/outfield/vinicius && cp "$W/assets/characters/outfield/vinicius/rig.json" $T/assets/characters/outfield/vinicius/
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short > $C/tree_status.txt)
unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND V2_KNEE_CRIT B_TURF
log "start (commit $(cat $C/commit.txt), worktree status: $(wc -l < $C/tree_status.txt) changed)"
# ── scratch-only body set extension + substituted runner copies ──
(cd "$W" && node review_artifacts/physical_character_v2/record_hinged/scripts/rh1_varset_ext.mjs) >> $T/sandbox/visual/physchar2/spec/v2_human.js
cd $T/sandbox/visual/physchar2
V2_ANKLE_NEUTRAL_K=0.13 node --input-type=module -e 'const { generateSpec, specHash } = await import("./spec/v2_spec.js"); const { VARIATION_SET } = await import("./spec/v2_human.js"); const f = (id) => specHash(generateSpec(VARIATION_SET.find(h => h.id === id))); console.log("scratch VARIATION_SET", VARIATION_SET.length, "bodies; R0", f("PI1-runner-vinicius"), "RH1", f("PI1-runner-vinicius-RH1"));' > $C/q0/varset.txt 2>&1; log "Q0 $(cat $C/q0/varset.txt) (expected $(grep -o 'R0 [0-9a-f]*, RH1 [0-9a-f]*' spec/v2_human.js))"
sub() { sed -e "s/\"V2-REF\"/\"$RH\"/g" -e "s/\"V1-matched\"/\"$R0\"/g" "$1" > "$2"; }
sub tools/g1_run.js tools/g1_run_rh1.js; sed -i '' 's/const VARS = \["V2-165-62", "V2-198-92", "V2-long-legs", "V2-short-legs"\]/const VARS = []/' tools/g1_run_rh1.js
sub tools/b_sweep.mjs tools/b_sweep_rh1.mjs; sub tools/g2_run.js tools/g2_run_rh1.js; sub tools/g3_run.js tools/g3_run_rh1.js; sub tools/g3_mirror_v3.mjs tools/g3_mirror_v3_rh1.mjs; sub tools/k_premise.mjs tools/k_premise_rh1.mjs
grep -c "$RH" tools/g1_run_rh1.js tools/b_sweep_rh1.mjs tools/g2_run_rh1.js tools/g3_run_rh1.js tools/g3_mirror_v3_rh1.mjs tools/k_premise_rh1.mjs > $C/q0/substitutions.txt; grep -n "const VARS" tools/g1_run_rh1.js >> $C/q0/substitutions.txt
# ── Q0 ──
(cd $T && node sandbox/visual/physchar2/tools/rh1_spec_check.mjs "$W/review_artifacts/physical_character_v2/record_hinged/evidence/spec_hash_baseline_084f736d.json" > $C/q0/spec_check.log 2>&1); log "Q0 spec check (scratch tree, extended set): $(tail -1 $C/q0/spec_check.log)"
node tools/v2_component_regressions.mjs --json=$C/q0/regressions.json > $C/q0/regressions.log 2>&1; log "Q0 component regressions: $(tail -1 $C/q0/regressions.log)"
(cd "$W/sandbox/visual/physchar2" && bash tools/guard_v1.sh > $C/q0/guard_v1.log 2>&1); log "Q0 guard: $(tail -1 $C/q0/guard_v1.log)"
# ── parallel component jobs ──
rm -f $C/jobs/*.sh; n=0
job() { n=$((n+1)); printf '#!/bin/zsh\ncd %s\n%s\n' "$T/sandbox/visual/physchar2" "$1" > $C/jobs/$(printf 'j%03d' $n).sh; }
BODIES=(V2-REF V2-165-62 V2-198-92 V2-175-70 V2-190-85 V2-short-legs V2-long-legs V1-matched $R0 $RH)
for h in $BODIES; do job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$h --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --out=$C/q2/kv6c_$h.json > $C/q2/kv6c_$h.log 2>&1"; done
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$RH --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --out=$C/q2/kv6c_${RH}_rep2.json > $C/q2/kv6c_${RH}_rep2.log 2>&1"
for h in $RH $R0; do for hz in 180 480; do
  job "V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=$h --policy=reference --model=v2k --stand='{\"lifecycle\":true}' --hz=$hz --out=$C/q6/kv6c_${h}_hz$hz.json > $C/q6/kv6c_${h}_hz$hz.log 2>&1"
  job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/twist_policy_battery.mjs --policy=ref --human=$h --scen=PY4 --hz=$hz $C/q6/py4_${h}_hz$hz.json > $C/q6/py4_${h}_hz$hz.log 2>&1"; done
  for hz in 180 240 480; do job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/boundary_probe.mjs --human=$h --hz=$hz --stand='{\"ikRefTwist\":true}' $C/q6/boundary_${h}_hz$hz.json > $C/q6/boundary_${h}_hz$hz.log 2>&1"; done
  for m in v2k old; do job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=A --human=$h --policy=reference --model=$m --stand='{\"lifecycle\":true}' --out=$C/q7/yaw_A_${h}_$m.json > $C/q7/yaw_A_${h}_$m.log 2>&1"
    job "V2_ANKLE_NEUTRAL_K=0.13 node tools/yaw_decomp.mjs --scen=B --human=$h --policy=reference --model=$m --out=$C/q7/yaw_B_${h}_$m.json > $C/q7/yaw_B_${h}_$m.log 2>&1"; done; done
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/k_premise.mjs --stand='$ST' --knee=v2k $C/q3/k_margins.json > $C/q3/k_margins.log 2>&1"
job "V2_ANKLE_NEUTRAL_K=0.13 node tools/k_premise_rh1.mjs --stand='$ST' --knee=v2k $C/q3/k_margins_rh1.json > $C/q3/k_margins_rh1.log 2>&1"
for p in ref current; do for h in $BODIES; do for sc in Q PY4 PR8 SB TURN T1 T5 UR LIFT HO1 HO2 HO3; do
  job "V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/twist_policy_battery.mjs --policy=$p --human=$h --scen=$sc $C/policy/r_0.13_${p}_${h}_$sc.json > /dev/null 2> $C/policy/e_0.13_${p}_${h}_$sc.log"; done; done; done
log "component jobs: $n"; ls $C/jobs/*.sh | xargs -P 8 -n 1 zsh; log "component jobs done"; touch $C/phaseA.done
# ── gates (sequential; each runner has its own worker pool) ──
R=$T/review_artifacts/physical_character_v2
( export V2_KNEE_MODEL=v2k; node tools/g0_run.js --out $C/q3/g0 > $C/q3/g0.log 2>&1 ); log "G0: exit $? ($(grep -c 'PASS\|FAIL' $C/q3/g0.log) lines)"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2; node tools/g1_run.js --no-dx --no-v1 > $C/q3/g1.log 2>&1 ); cp $R/g1/json/g1_results.json $C/q3/g1_results_8bodies.json; log "G1 (8 bodies): $(grep 'G1 RESULT' $C/q3/g1.log | tail -1)"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2; node tools/g1_run_rh1.js --no-dx --no-v1 > $C/q3/g1_rh1.log 2>&1 ); cp $R/g1/json/g1_results.json $C/q3/g1_results_rh1.json; log "G1 (RH1 / R0 main): $(grep 'G1 RESULT' $C/q3/g1_rh1.log | tail -1)"
( export B_TURF=plane V2_KNEE_MODEL=v2k; node tools/b_sweep.mjs --set=perturb240 --k=0.13 --workers=9 --out=$C/q3/sweep_8bodies.json > $C/q3/sweep.log 2>&1 ); log "G1 perturbed (V2-REF / V1-matched) done"
( export B_TURF=plane V2_KNEE_MODEL=v2k; node tools/b_sweep_rh1.mjs --set=perturb240 --k=0.13 --workers=9 --out=$C/q3/sweep_rh1.json > $C/q3/sweep_rh1.log 2>&1 ); log "G1 perturbed (RH1 / R0) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND=$ST; node tools/g2_run.js > $C/q3/g2.log 2>&1 ); cp $R/g2/json/g2_results_xstand.json $C/q3/g2_results_10bodies.json; log "G2 (10 bodies) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND=$ST; node tools/g2_run_rh1.js --only=S4,S5,copSweep,determinism,snapshot > $C/q3/g2_rh1.log 2>&1 ); cp $R/g2/json/g2_results_xstand.json $C/q3/g2_results_rh1rows.json; log "G2 (RH1 in V2-REF's rows) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_run.js --stand=$ST --tag=qual > $C/q3/g3.log 2>&1 ); cp $R/g3/json/g3_results_qual.json $C/q3/g3_results_10bodies.json; log "G3 (10 bodies) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_run_rh1.js --stand=$ST --tag=qualrh1 > $C/q3/g3_rh1.log 2>&1 ); cp $R/g3/json/g3_results_qualrh1.json $C/q3/g3_results_rh1.json; log "G3 (RH1 in V2-REF's rows) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_mirror_v3.mjs --stand=$ST --out=$C/q3/g3_mirror_10bodies.json > $C/q3/g3_mirror.log 2>&1 ); log "J2a mirror (V2-REF + bodies) done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_mirror_v3_rh1.mjs --stand=$ST --out=$C/q3/g3_mirror_rh1.json > $C/q3/g3_mirror_rh1.log 2>&1 ); log "J2a mirror (RH1) done"
log "ALL DONE"; touch $C/all.done
