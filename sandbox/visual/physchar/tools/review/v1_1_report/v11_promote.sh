#!/bin/zsh
# V1.1 promotion checkpoint — sequential (one node process at a time)
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar" || exit 1
O="../../../review_artifacts/physical_character_v1/v1_1/json/promotion"; mkdir -p "$O"
W='{"hingeSoftHz":20,"velSteps":30,"posSteps":4}'
C1="SV_static,QS20,PF30,PF60,PB30,PB35,PR30,PR45,PR50,G_fall,H_ice_quiet,H_ice_push"
run() { local name=$1; shift; echo "$(date +%H:%M:%S) start $name"; node "$@" > "$O/$name.log" 2>&1; echo "$(date +%H:%M:%S) done  $name (exit $?)"; }
run pres_gatea_V1   tools/gatea_run.js  --calib V1 --drops A,B,C,D,E --tsc 240x1 --seconds 6 --world "$W" --out "$O/pres_gatea_V1.json"
run pres_gateb_V1   tools/gateb_run.js  --calib V1 --tests all --tsc 240x1 --out "$O/pres_gateb_V1.json"
run pres_gatec1_V1  tools/gatec1_run.js --calib V1 --tests all --out "$O/pres_gatec1_V1.json"
run pres_gatec2_V1  tools/gatec2_run.js --calib V1 --tests all --out "$O/pres_gatec2_V1.json"
run gatea_V1.1      tools/gatea_run.js  --calib V1.1 --drops A,B,C,D,E --tsc 240x1 --seconds 6 --world "$W" --repeat 3 --out "$O/gatea_V1.1.json"
run gateb_V1.1_all  tools/gateb_run.js  --calib V1.1 --tests all --tsc 240x1 --out "$O/gateb_V1.1_all.json"
run gateb_V1.1      tools/gateb_run.js  --calib V1.1 --tests A,C,E,F_chest --tsc 240x1 --repeat 3 --out "$O/gateb_V1.1.json"
run gatec1_V1.1_all tools/gatec1_run.js --calib V1.1 --tests all --out "$O/gatec1_V1.1_all.json"
run gatec1_V1.1     tools/gatec1_run.js --calib V1.1 --tests $C1 --repeat 3 --out "$O/gatec1_V1.1.json"
run gatec2_V1.1_working tools/gatec2_run.js --calib V1.1 --tests all --repeat 3 --out "$O/gatec2_V1.1_working.json"
echo "$(date +%H:%M:%S) ALL DONE"
