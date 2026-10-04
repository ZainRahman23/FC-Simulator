#!/bin/zsh
# corrected knee (v2k) OFFICIAL qualification battery — frozen commit in $S/knee/frozen_commit.txt; scratch tree (accepted evidence untouched)
W="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2"; S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad
C=$S/kc; T=$C/tree; log() { echo "$(date +%H:%M:%S) $*" >> $C/queue.log; }
mkdir -p $C/{bench,rig,ctrl,yaw,gates,sweep,sens} $T/sandbox/visual $T/review_artifacts/physical_character_v2/{g0,g1,g2,g3}/json
rsync -a --delete "$W/sandbox/visual/physchar2/" $T/sandbox/visual/physchar2/; cp "$W"/review_artifacts/physical_character_v2/*.json $T/review_artifacts/physical_character_v2/ 2>/dev/null
(cd "$W" && git rev-parse HEAD > $C/commit.txt && git status --short sandbox > $C/tree_status.txt)
cd $T/sandbox/visual/physchar2; unset V2_KNEE_MODEL V2_KNEE_V2K V2_ANKLE_NEUTRAL_K V2_KNEE_ENVELOPE V2_XSTAND B_TURF
log "phase 1 start (commit $(cat $C/commit.txt))"
node tools/v2_component_regressions.mjs --json=$C/bench/regressions.json > $C/bench/regressions.log 2>&1; log "suite: $(tail -1 $C/bench/regressions.log)"
node tools/knee_v2k_bench.mjs --out=$C/bench/bench.json > $C/bench/bench.log 2>&1; log "bench: $(tail -1 $C/bench/bench.log)"
node tools/knee_v2k_rig.mjs --part=all --out=$C/rig/rig_v2k.json > $C/rig/rig_v2k.log 2>&1; log "rig: $(tail -1 $C/rig/rig_v2k.log)"
node tools/knee_v2k_rig.mjs --part=kv3b --model=old --out=$C/rig/rig_old_kv3b.json > $C/rig/rig_old_kv3b.log 2>&1
node tools/knee_v2k_rig.mjs --part=kv4b --model=old --out=$C/rig/rig_old_kv4b.json > $C/rig/rig_old_kv4b.log 2>&1; log "rig old comparators done"
# KV6c (+ old comparator) and KV10, 8 in parallel
: > $C/jobs1.txt
for h in V2-REF V2-165-62 V2-198-92; do for k in 0 0.13; do for p in current reference; do
  echo "V2_ANKLE_NEUTRAL_K=$k node tools/knee_v2k_ctrl.mjs --human=$h --policy=$p --model=v2k --out=$C/ctrl/ctrl_${h}_${p}_k${k}_v2k.json > $C/ctrl/ctrl_${h}_${p}_k${k}_v2k.log 2>&1" >> $C/jobs1.txt
  echo "V2_ANKLE_NEUTRAL_K=$k node tools/knee_v2k_ctrl.mjs --human=$h --policy=$p --model=old --out=$C/ctrl/ctrl_${h}_${p}_k${k}_old.json > $C/ctrl/ctrl_${h}_${p}_k${k}_old.log 2>&1" >> $C/jobs1.txt
  for sc in A B; do for m in v2k old; do echo "V2_ANKLE_NEUTRAL_K=$k node tools/yaw_decomp.mjs --scen=$sc --human=$h --policy=$p --model=$m --out=$C/yaw/yaw_${sc}_${h}_${p}_k${k}_${m}.json > $C/yaw/yaw_${sc}_${h}_${p}_k${k}_${m}.log 2>&1" >> $C/jobs1.txt; done; done
done; done; done
cat $C/jobs1.txt | xargs -P 8 -I{} zsh -c "{}"; log "phase 1 parallel done ($(wc -l < $C/jobs1.txt) jobs)"
# low-flexion band-edge sensitivity (KVS, report): bench KV4a + KV6c V2-REF reference k 0.13
for o in '{"IR":{"a15":10}}' '{"IR":{"a15":16}}' '{"ER":{"a15":22.5}}' '{"ER":{"a15":27.5}}' '{"ER":{"f0":0.3}}' '{"ER":{"f0":0.75}}' '{"rampDeg":15}' '{"rampDeg":40}'; do tag=$(echo $o | tr -cd 'A-Za-z0-9.'); 
  ( export V2_KNEE_V2K=$o; node tools/knee_v2k_bench.mjs --out=$C/sens/bench_$tag.json > $C/sens/bench_$tag.log 2>&1; V2_ANKLE_NEUTRAL_K=0.13 node tools/knee_v2k_ctrl.mjs --human=V2-REF --policy=reference --model=v2k --out=$C/sens/ctrl_$tag.json > $C/sens/ctrl_$tag.log 2>&1 ) & done; wait; log "low-flexion sensitivity done"
touch $C/phase1.done
# phase 2: gates (each runner uses its own worker pool)
R=$T/review_artifacts/physical_character_v2
( export V2_KNEE_MODEL=v2k; node tools/g0_run.js --out $C/gates/g0_v2k > $C/gates/g0_v2k.log 2>&1 ); log "G0 v2k: exit $?"
for k in 0 0.13; do ( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=$k; node tools/g1_run.js --no-dx --no-v1 > $C/gates/g1_k${k}_v2k.log 2>&1 ); cp $R/g1/json/g1_results.json $C/gates/g1_k${k}_v2k.json 2>/dev/null; log "G1 k $k v2k: $(grep -c . $C/gates/g1_k${k}_v2k.log) lines"; done
( export B_TURF=plane V2_KNEE_MODEL=v2k; node tools/b_sweep.mjs --set=perturb240 --k=0,0.13 --workers=9 --out=$C/sweep/perturb240_plane_v2k.json > $C/sweep/perturb240_plane_v2k.log 2>&1 ); log "sweep v2k done"
( export B_TURF=plane; node tools/b_sweep.mjs --set=perturb240 --k=0,0.13 --workers=9 --out=$C/sweep/perturb240_plane_old.json > $C/sweep/perturb240_plane_old.log 2>&1 ); log "sweep old done"
for k in 0 0.13; do ( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=$k; node tools/g2_run.js > $C/gates/g2_k${k}_v2k.log 2>&1 ); cp $R/g2/json/g2_results.json $C/gates/g2_k${k}_v2k.json 2>/dev/null; log "G2 k $k v2k done"; done
for k in 0 0.13; do tg=v2k_k$(echo $k | tr -d .); ( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=$k; node tools/g3_run.js --tag=$tg > $C/gates/g3_$tg.log 2>&1 ); cp $R/g3/json/g3_results_$tg.json $C/gates/ 2>/dev/null; log "G3 $tg done"; done
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_XSTAND='{"ikRefTwist":true,"lifecycle":true}'; node tools/g2_run.js > $C/gates/g2_e1acfg_v2k.log 2>&1 ); cp $R/g2/json/g2_results_xstand.json $C/gates/g2_e1acfg_v2k.json 2>/dev/null; log "G2 E1a cfg done"
( export V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13; node tools/g3_run.js --stand='{"ikRefTwist":true,"lifecycle":true}' --tag=e1acfg_v2k > $C/gates/g3_e1acfg_v2k.log 2>&1 ); cp $R/g3/json/g3_results_e1acfg_v2k.json $C/gates/ 2>/dev/null; log "G3 E1a cfg done"
touch $C/gates.done
# deep-flexion sensitivity (KVS, report): perturbed ensembles at k 0.13
for o in '{"deep":{"delta150":-4}}' '{"deep":{"delta150":5}}' '{"deep":{"delta150":10}}' '{"deep":{"width150":0.6}}' '{"deep":{"width150":0.3}}'; do tag=$(echo $o | tr -cd 'A-Za-z0-9.-');
  ( export B_TURF=plane V2_KNEE_MODEL=v2k V2_KNEE_V2K=$o; node tools/b_sweep.mjs --set=perturb240 --k=0.13 --workers=9 --out=$C/sens/sweep_$tag.json > $C/sens/sweep_$tag.log 2>&1 ); log "deep sensitivity $tag done"; done
log "ALL DONE"; touch $C/all.done
