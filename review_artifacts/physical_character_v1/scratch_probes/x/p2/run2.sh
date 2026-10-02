#!/bin/bash
# usage: run2.sh cases.json out_prefix nshard humanJSON [ctrlExtraJSON]
PC="/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar"
BEST='{"kind":"U","vd":0.5,"from":1,"ramp":{"a":0.3},"place":"maps","uRefSim":false,"lat":{"rho":0.4},"adapt":null,"reachIter":false,"identFixed":true}'; SB='{"swingBase":{"w":"model","learn":{"rate":0.05},"pure":[0]}}'
N=${3:-6}; cd "$PC"
for i in $(seq 0 $((N-1))); do node tools/g2_stepbench.js --cases "$1" --shard $i/$N --models mU1_tau --ctrl "$BEST" --walk "$SB" --human "$4" --out "$2_$i.json" > /dev/null 2>&1 & done; wait
python3 - "$2" $N <<'PY'
import json,sys; rows=[]
for i in range(int(sys.argv[2])): rows+=json.load(open(f"{sys.argv[1]}_{i}.json"))['rows']
json.dump({'rows':rows},open(sys.argv[1]+'.json','w'))
PY
