#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator"; S=/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad; export PUPPETEER_NODE_MODULES=$S/pptr/node_modules
cap() { node sandbox/visual/tools/anim3d/capture.js --backend 3d "$@" 2>&1 | grep -v "^\s*at " | tail -1 | cut -c1-100; }
CL="--crop 2 --zoom 3.5 --camx 100 --pixel 1 --outline 0 --bands 6"
run() { tag=$1; shift; d=$S/lt_$tag; rm -rf $d; cap "$@" --band COURTOIS --out $d --udd $S/chrome-lt5; echo "cap $tag $(ls $d/*.png 2>/dev/null | wc -l)"; }
C="--character COURTOIS"
run 15_arm2_cl --scenario 15 --ticks 0-179 ${=CL} ${=C}; run 15_arm2_ov --scenario 15 --ticks 60-160 ${=CL} --dbg arms ${=C}
run 4_arm2_cl --scenario 4 --ticks 0-199 ${=CL} ${=C}; run 4_arm2_ov --scenario 4 --ticks 30-160 ${=CL} --dbg arms ${=C}; run 4_armbroken_cl --scenario 4 --ticks 0-199 ${=CL} ${=C} --preset armbroken
run 34_arm2_cl --scenario 34 --ticks 0-199 ${=CL} ${=C}; run 34_armbroken_cl --scenario 34 --ticks 0-199 ${=CL} ${=C} --preset armbroken
run 39_arm2_cl --scenario 39 --ticks 0-179 ${=CL} ${=C}; run 2_arm2_cl --scenario 2 --ticks 0-179 ${=CL} ${=C}
run 15_TEST_arm2_cl --scenario 15 --ticks 0-179 ${=CL}
echo ARM2_CAPS_DONE
