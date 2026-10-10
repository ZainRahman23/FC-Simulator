#!/bin/zsh
# RH1 AUDIT VERIFICATION (2026-10-11; documentation only — no spec, criterion, simulation or collision-architecture change).
# Rebuilds a CLEAN tree from committed git objects only (git archive of <commit>; the frozen LV2 baseline = git archive of tag
# locomotion-v2-straight-baseline-1; the V1.3 simulation = git archive of 5042230) and re-derives the RH1 evidence from it:
#   A  RH1 spec: rh1_spec_check (13 rows) and rh1_spec_diff (exact differences RH1 / R0 / V2-REF)        → vs committed JSON
#   B  qualification: rh1_gate_eval on the COMMITTED raw battery outputs (a decompressed copy)            → vs committed gate_eval.json
#   C  the four failing rows re-run from committed code: rh1_g1_diag (G1 leanL / dropA / isoSelfCol; RH1, R0, two attribution variants) and
#      rh1_g3_diag (G3 T7 / T11; RH1, R0, two variants); RH1's hashes must equal the battery's                → vs committed diag JSON
#   D  R0 under the IDENTICAL G3 harness: the frozen tools/g3_run.js with R0 substituted in V2-REF's rows exactly as rh1_battery.sh ran RH1
#      (scratch-only VARIATION_SET extension, same flags and env), evaluated by rh1_audit_g3_body.mjs (self-checked on RH1's committed run)
#   E  handoff: rh1_handoff_eval and rh1_instantiate (0 Jolt steps)                                       → vs committed JSON, CPU fields excluded
#   F  the motivating RUN-1 handoff measurements: R2 lv2_handoff_probe and the upper-body study v2_upper_alt_probe re-run → vs their recorded
#      determinism hashes (lv2/out/determinism.txt, lv2/upper/out/determinism.txt)
# Not re-run: the full 50-min battery (its raw outputs are committed; rh1_battery.sh regenerates them — it hard-codes its scratch path).
# usage: zsh rh1_audit_verify.sh <scratch dir> [commit=HEAD]      (from anywhere inside the worktree)
set -u
W=$(git rev-parse --show-toplevel); SC=$1; COMMIT=$(git -C "$W" rev-parse ${2:-HEAD}); A=$SC/rh1_audit; T=$A/tree; RH=PI1-runner-vinicius-RH1; R0=PI1-runner-vinicius
RA=review_artifacts/physical_character_v2; RHD=$RA/record_hinged; ST='{"ikRefTwist":true,"lifecycle":true}'
rm -rf $A; mkdir -p $T $A/lv2 $A/v13 $A/bat $A/out; LOG=$A/audit.log; fails=0
log() { echo "$*" | tee -a $LOG; }
cmp_() { local label=$1; shift; local r; r=$(node $T/$RHD/scripts/rh1_audit_compare.mjs "$@" 2>&1); [ $? -eq 0 ] || fails=$((fails+1)); log "  $label: $r"; }
log "RH1 audit verification — commit $COMMIT — $(date '+%Y-%m-%d %H:%M:%S %Z') — node $(node -v)"
git -C "$W" archive $COMMIT sandbox/visual/physchar2 assets/characters/outfield/vinicius/rig.json $RA/record_hinged $RA/pi1 $RA/interaction_time/run1_handoff $RA/knee_correction/evidence/qual | tar -x -C $T
git -C "$W" archive locomotion-v2-straight-baseline-1 sandbox/visual/run1 sandbox/visual/anim3d review_artifacts/locomotion_v2_run1 assets/characters/outfield/vinicius/rig.json | tar -x -C $A/lv2
git -C "$W" archive 5042230 sandbox/visual | tar -x -C $A/v13
log "clean tree from git archive $COMMIT; LV2 = archive of $(git -C "$W" rev-parse locomotion-v2-straight-baseline-1^{commit}); V1.3 = archive of $(git -C "$W" rev-parse 5042230)"
E=$T/$RHD/evidence
# ── A ──
log "A. RH1 specification"
(cd $T && node sandbox/visual/physchar2/tools/rh1_spec_check.mjs $RHD/evidence/spec_hash_baseline_084f736d.json --json $A/out/spec_check.json > $A/out/spec_check.log 2>&1)
log "  rh1_spec_check: $(tail -1 $A/out/spec_check.log)"; cmp_ "spec check vs committed" spec $E/rh1_spec_check.json $A/out/spec_check.json
(cd $T && node $RHD/scripts/rh1_spec_diff.mjs $A/out/spec_diff.json > $A/out/spec_diff.log 2>&1); log "  $(head -1 $A/out/spec_diff.log)"
cmp_ "spec diff vs committed" json $E/spec_diff.json $A/out/spec_diff.json
# ── B ──
log "B. Qualification evaluation from the committed raw battery outputs"
cp -R $E/battery/. $A/bat/; find $A/bat -name '*.json.gz' -exec gunzip {} \;; rm -rf $A/bat/eval
node $T/$RHD/scripts/rh1_gate_eval.mjs $A/bat $A/out/gate_eval.json $E/g1_diag/rh1_g1_diag.json > $A/out/gate_eval.log 2>&1
log "  $(grep 'RH1 gating rows' $A/out/gate_eval.log)"; log "  $(grep 'R0 failing rows' $A/out/gate_eval.log)"; log "  $(grep '8-body regression' $A/out/gate_eval.log)"
cmp_ "gate evaluation vs committed (rows, regression, replaced, summary)" json $E/battery/eval/gate_eval.json $A/out/gate_eval.json --only=rows,regression,replaced,summary
# ── C ──
log "C. The four failing rows re-run from committed code"
P=$T/sandbox/visual/physchar2
(cd $P && V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2 node ../../../$RHD/scripts/rh1_g1_diag.mjs $A/bat/q3/g1_results_rh1.json $A/out/rh1_g1_diag.json > $A/out/rh1_g1_diag.txt 2>&1)
log "  G1 diag: $(grep -c '(= battery)' $A/out/rh1_g1_diag.txt) runs equal the battery hashes, $(grep -c 'DIFFERS' $A/out/rh1_g1_diag.txt) differ"; cmp_ "G1 diag vs committed" json $E/g1_diag/rh1_g1_diag.json $A/out/rh1_g1_diag.json
for w in RH1 R0 trunk elbow; do (cd $P && V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node ../../../$RHD/scripts/rh1_g3_diag.mjs $w $A/bat/q3/g3_results_rh1.json $A/out/g3diag_$w.json > $A/out/g3diag_$w.txt 2>&1) & done; wait
log "  G3 diag: RH1 $(grep -c '(= battery)' $A/out/g3diag_RH1.txt) / 11 jobs equal the battery hashes"
for w in RH1 R0 trunk elbow; do cmp_ "G3 diag $w vs committed" json $E/g3_diag/g3diag_$w.json $A/out/g3diag_$w.json; done
# ── D ──
log "D. R0 in V2-REF's G3 rows, frozen runner, the identical harness to RH1's battery run"
T2=$A/tree_r0; cp -R $T $T2; (cd $T && node $RHD/scripts/rh1_varset_ext.mjs) >> $T2/sandbox/visual/physchar2/spec/v2_human.js
(cd $T2/sandbox/visual/physchar2 && sed -e "s/\"V2-REF\"/\"$R0\"/g" tools/g3_run.js > tools/g3_run_r0.js && log "  substitutions in g3_run_r0.js: $(grep -c "$R0" tools/g3_run_r0.js) (RH1's battery copy: 2)" \
  && V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/g3_run_r0.js --stand=$ST --tag=auditr0 > $A/out/g3_r0.log 2>&1)
log "  $(tail -1 $A/out/g3_r0.log)"; cp $T2/$RA/g3/json/g3_results_auditr0.json $A/out/g3_results_r0.json
node $T/$RHD/scripts/rh1_audit_g3_body.mjs $RH $E/battery/q3/g3_results_rh1.json.gz $E/battery/q3/k_margins_rh1.json $A/out/g3_body_RH1.json --selfcheck=$E/battery/eval/gate_eval.json > $A/out/g3_body_RH1.txt 2>&1
log "  evaluator $(tail -1 $A/out/g3_body_RH1.txt)"; grep -q "15/15 identical" $A/out/g3_body_RH1.txt || fails=$((fails+1))
node $T/$RHD/scripts/rh1_audit_g3_body.mjs $R0 $A/out/g3_results_r0.json $E/battery/q3/k_margins_rh1.json $A/out/g3_body_R0.json > $A/out/g3_body_R0.txt 2>&1
for id in rows-id run G H K′; do log "  R0 $(grep " G3 $id " $A/out/g3_body_R0.txt | cut -c1-260)"; done
# ── E ──
log "E. Handoff evaluation and instantiation (0 Jolt steps)"
(cd $T && LV2_ARCHIVE=$A/lv2 V13_WT=$A/v13 STUDY=$RA/interaction_time/run1_handoff/lv2/upper/out/v2_upper_alt_probe.json.gz node $RHD/scripts/rh1_handoff_eval.mjs --n 240 --json $A/out/handoff.json > $A/out/handoff.txt 2>&1)
cmp_ "handoff evaluation vs committed" json $E/handoff/rh1_handoff_eval.json.gz $A/out/handoff.json --ignore='^([cC][pP][uU].*|wallS|date|generated)$'
(cd $T && LV2_ARCHIVE=$A/lv2 V13_WT=$A/v13 node $RHD/scripts/rh1_instantiate.mjs --n 240 --json $A/out/inst.json > $A/out/inst.txt 2>&1)
cmp_ "instantiation vs committed" json $E/instantiation/rh1_instantiate.json.gz $A/out/inst.json --ignore='^([cC][pP][uU].*|wallS|date|generated)$'; log "  $(tail -1 $A/out/inst.txt)"
# ── F ──
log "F. Motivating RUN-1 handoff measurements (R2 6a0cf340; upper-body study edfa2b8f)"
(cd $T && LV2_ARCHIVE=$A/lv2 V13_WT=$A/v13 node $RA/interaction_time/run1_handoff/lv2/probe/lv2_handoff_probe.mjs --n 240 --speeds 3.0,5.5,7.8,9.5 --json $A/out/lv2_handoff_probe.json > $A/out/lv2_handoff_probe.txt 2>&1)
cmp_ "R2 lv2_handoff_probe vs recorded determinism hash" sha $A/out/lv2_handoff_probe.json 57fb7b12574cdfc9c17f0b505977cec405fca466b21a0e4fec3b67f5c303804b
cmp_ "R2 committed lv2_handoff_probe.json.gz" sha $T/$RA/interaction_time/run1_handoff/lv2/out/lv2_handoff_probe.json.gz 57fb7b12574cdfc9c17f0b505977cec405fca466b21a0e4fec3b67f5c303804b
(cd $T && LV2_ARCHIVE=$A/lv2 V13_WT=$A/v13 node $RA/interaction_time/run1_handoff/lv2/upper/v2_upper_alt_probe.mjs --n 240 --speeds 3.0,5.5,7.8,9.5 --json $A/out/v2_upper_alt_probe.json > $A/out/v2_upper_alt_probe.txt 2>&1)
cmp_ "upper-body study vs recorded determinism hash (timing fields removed)" sha $A/out/v2_upper_alt_probe.json ecd3f64e7a1c055bdde50bbf1902a7a5b78a33da93c35368e7203a487b5e9a71 --ignore='^(tFitMs|tKktMs|fitMs|kktMs)$'
cmp_ "upper-body study committed .json.gz" sha $T/$RA/interaction_time/run1_handoff/lv2/upper/out/v2_upper_alt_probe.json.gz ecd3f64e7a1c055bdde50bbf1902a7a5b78a33da93c35368e7203a487b5e9a71 --ignore='^(tFitMs|tKktMs|fitMs|kktMs)$'
log "RESULT: $fails comparison(s) differ — $(date '+%H:%M:%S')"; exit $fails
