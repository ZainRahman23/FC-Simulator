#!/bin/zsh
# RH1 CPU item (RH1_PREREG.md §6 "isolated physics / controller step cost RH1 vs R0"): the frozen tools/perf_bench.mjs (fresh child process per scenario,
# cold run + N warm trials; per-tick controller / leg IK / actuators / passive / physics / whole tick) run ALONE after the battery, in the battery's
# scratch tree, once per body: V2-REF (reference), R0 and RH1. Copies differ from the frozen tool only in the body id and the output path.
# Adopted configuration environment (v2k, ankle K 0.13); 5 warm trials.
S=/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad; C=$S/rh1; T=$C/tree/sandbox/visual/physchar2; mkdir -p $C/cpu
[ -f $C/all.done ] || { echo "battery not finished"; exit 1; }
cd $T
for h in V2-REF PI1-runner-vinicius PI1-runner-vinicius-RH1; do
  sed -e "s/h.id === \"V2-REF\"/h.id === \"$h\"/" -e "s#review_artifacts/physical_character_v2/perf/perf_bench.json#review_artifacts/physical_character_v2/perf/perf_bench_$h.json#" tools/perf_bench.mjs > tools/perf_bench_$h.mjs
  grep -c "h.id === \"$h\"" tools/perf_bench_$h.mjs >> $C/cpu/substitutions.txt
  V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/perf_bench_$h.mjs 5 > $C/cpu/perf_$h.log 2>&1
  cp $C/tree/review_artifacts/physical_character_v2/perf/perf_bench_$h.json $C/cpu/
done
echo done > $C/cpu/done
