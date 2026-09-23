#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator"; S=/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad; export PUPPETEER_NODE_MODULES=$S/pptr/node_modules
cap() { node sandbox/visual/tools/anim3d/capture.js --backend 3d "$@" 2>&1 | grep -v "^\s*at " | tail -1 | cut -c1-100; }
CL="--crop 2 --zoom 3.5 --camx 100 --pixel 1 --outline 0 --bands 6"; FR="--crop 2 --zoom 3.5 --camx 104 --pixel 1 --outline 0 --bands 6"; GP="--crop 0 --clip 600,150,500,450 --pixel 1 --outline 0 --bands 6"
run() { tag=$1; shift; d=$S/lt_$tag; rm -rf $d; cap "$@" --band COURTOIS --out $d --udd $S/chrome-lt3; echo "cap $tag $(ls $d/*.png 2>/dev/null | wc -l)"; }
C="--character COURTOIS"
for sc in 15 13; do
  run ${sc}_arm_cl --scenario $sc --ticks 0-179 ${=CL} ${=C}; run ${sc}_arm_gp --scenario $sc --ticks 0-179 ${=GP} ${=C}; run ${sc}_arm_ov --scenario $sc --ticks 30-100 ${=CL} --dbg arms ${=C}
  run ${sc}_armbroken_cl --scenario $sc --ticks 0-179 ${=CL} ${=C} --preset armbroken; run ${sc}_armbroken_ov --scenario $sc --ticks 30-100 ${=CL} --dbg arms ${=C} --preset armbroken
  run ${sc}_arm_fr --scenario $sc --ticks 30-100 ${=FR} ${=C}; run ${sc}_armbroken_fr --scenario $sc --ticks 30-100 ${=FR} ${=C} --preset armbroken; run ${sc}_before_fr --scenario $sc --ticks 30-100 ${=FR} ${=C} --preset before
done
run 2_arm_cl --scenario 2 --ticks 0-179 ${=CL} ${=C}; run 2_arm_ov --scenario 2 --ticks 30-100 ${=CL} --dbg arms ${=C}
run a1_6_arm_cl --adhoc $S/lat_adhoc.json --adhocIndex 6 --ticks 0-179 ${=CL} ${=C}; run a1_6_arm_ov --adhoc $S/lat_adhoc.json --adhocIndex 6 --ticks 0-100 ${=CL} --dbg arms ${=C}
run 15_TEST_arm_cl --scenario 15 --ticks 0-179 ${=CL}; run 15_TEST_armbroken_cl --scenario 15 --ticks 0-179 ${=CL} --preset armbroken; run 13_TEST_arm_cl --scenario 13 --ticks 0-179 ${=CL}
echo LAT_CAPS3_DONE
