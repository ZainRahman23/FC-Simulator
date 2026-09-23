#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator"; S=/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad; export PUPPETEER_NODE_MODULES=$S/pptr/node_modules
G=sandbox/visual/tools/anim3d/gk3d_gate.js; M=sandbox/visual/tools/anim3d/gk_motion_manifest.js; DIST=64,65,66,67,68,69,70,71,72,73,74,75; FX=42,49,50,12,15,13,14,2,36,40,34,39,35
node $G --backend 3d --scenarios all --ticks 260 --precision full --out $S/lat_gate_3d.json --udd $S/chrome-latg 2>&1 | tail -1
node $G --backend 3d --scenarios $DIST --ticks 300 --precision full --out $S/lat_gated_3d.json --udd $S/chrome-latg 2>&1 | tail -1
node $M --out $S/lat_manifest_dist.json --scenarios $DIST --ticks 300 --udd $S/chrome-latg 2>&1 | tail -1
node $G --backend 3d --character COURTOIS --scenarios all --ticks 260 --precision full --out $S/lat_gate_courtois.json --udd $S/chrome-latg 2>&1 | tail -1
node $G --backend 3d --character COURTOIS --scenarios $DIST --ticks 300 --precision full --out $S/lat_gated_courtois.json --udd $S/chrome-latg 2>&1 | tail -1
(cd $S && UDD=$S/chrome-latgs node survey_all.js $S/survey_lat_courtois.json 300 COURTOIS 2>&1 | tail -1 && UDD=$S/chrome-latgs node survey_all.js $S/survey_lat_test.json 300 TEST 2>&1 | tail -1)
(cd $S && UDD=$S/chrome-latgp node probe_dive.js $S/dive5_fx_courtois.json COURTOIS 200 $FX 2>&1 | tail -1 && UDD=$S/chrome-latgp node probe_dive.js $S/dive5_adv_courtois.json COURTOIS 200 @$S/adhoc_dives.json 2>&1 | tail -1 && UDD=$S/chrome-latgp node probe_dive.js $S/dive5_fx_test.json TEST 200 $FX 2>&1 | tail -1 && UDD=$S/chrome-latgp node probe_dive.js $S/dive5_adv_test.json TEST 200 @$S/adhoc_dives.json 2>&1 | tail -1)
echo LAT_GATES_DONE
(cd $S && UDD=$S/chrome-latp node probe_layers.js $S/layers_lat_adhoc2_courtois.json COURTOIS COURTOIS @$S/lat_adhoc2.json 2>&1 | tail -1; UDD=$S/chrome-latp node probe_layers.js $S/layers_lat_adhoc_courtois.json COURTOIS COURTOIS @$S/lat_adhoc.json 2>&1 | tail -1; UDD=$S/chrome-latp node probe_layers.js $S/layers_lat_extra_courtois.json COURTOIS COURTOIS 42,14,39 2>&1 | tail -1; UDD=$S/chrome-latp2 node probe_layers.js $S/layers_lat_test.json TEST COURTOIS 2,13,15,42,14,39 2>&1 | tail -1)
echo LAT_LAYERS_DONE
