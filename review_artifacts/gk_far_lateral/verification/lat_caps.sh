#!/bin/zsh
# far-lateral review captures (sequential — one headless chrome loading the 22 MB GLB at a time); zsh word splitting via ${=VAR}
cd "/Users/zainrahman/Downloads/FC Simulator"; S=/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad; export PUPPETEER_NODE_MODULES=$S/pptr/node_modules
cap() { node sandbox/visual/tools/anim3d/capture.js --backend 3d "$@" 2>&1 | grep -v "^\s*at " | tail -1 | cut -c1-100; }
CL="--crop 2 --zoom 3.5 --camx 100 --pixel 1 --outline 0 --bands 6"; GP="--crop 0 --clip 600,150,500,450 --pixel 1 --outline 0 --bands 6"
run() { tag=$1; shift; d=$S/lt_$tag; if [[ $tag == *before* && -d $d && $(ls $d/*.png 2>/dev/null | wc -l) -ge 100 ]]; then echo "skip $tag"; return; fi; rm -rf $d; cap "$@" --band COURTOIS --out $d --udd $S/chrome-lt; echo "cap $tag $(ls $d/*.png 2>/dev/null | wc -l)"; }
C="--character COURTOIS"; A1="--adhoc $S/lat_adhoc.json"; A2="--adhoc $S/lat_adhoc2.json"
# 1. the three reviewed fixtures + BEFORE (15, 13): close, gameplay, diagnostic
for sc in 15 13; do run ${sc}_before_cl --scenario $sc --ticks 0-179 ${=CL} ${=C} --preset before; run ${sc}_before_gp --scenario $sc --ticks 0-179 ${=GP} ${=C} --preset before; done
for sc in 15 13 2; do run ${sc}_cl --scenario $sc --ticks 0-179 ${=CL} ${=C}; run ${sc}_gp --scenario $sc --ticks 0-179 ${=GP} ${=C}; run ${sc}_dbg --scenario $sc --ticks 20-130 ${=CL} --dbg roots,ik ${=C}; done
# 2. layer isolation for 15 (final code) and 2 — auth exists already (ly_15_auth / ly_2_auth)
for pre in redir launch noik final; do run 15_ly_$pre --scenario 15 --ticks 0-149 ${=CL} ${=C} --preset $pre; done
for pre in redir launch noik final; do run 2_ly_$pre --scenario 2 --ticks 0-149 ${=CL} ${=C} --preset $pre; done
# 3. controls / other lateral fixtures
for sc in 42 14 39; do run ${sc}_cl --scenario $sc --ticks 0-179 ${=CL} ${=C}; run ${sc}_gp --scenario $sc --ticks 0-179 ${=GP} ${=C}; done
# 4. adhoc: reachable far corner R/L (a2: 0,1), near-max R/L (a2: 2,3), beyond reach R/L (a2: 8,9), fixture-15 mirror L (a1: 6)
for i in 0 1 2 3 8 9; do run a2_${i}_cl ${=A2} --adhocIndex $i --ticks 0-179 ${=CL} ${=C}; run a2_${i}_gp ${=A2} --adhocIndex $i --ticks 0-179 ${=GP} ${=C}; done
run a2_2_dbg ${=A2} --adhocIndex 2 --ticks 20-130 ${=CL} --dbg roots,ik ${=C}
run a1_6_cl ${=A1} --adhocIndex 6 --ticks 0-179 ${=CL} ${=C}; run a1_6_gp ${=A1} --adhocIndex 6 --ticks 0-179 ${=GP} ${=C}
# 5. shared test rig
for sc in 15 13 2; do run ${sc}_TEST_cl --scenario $sc --ticks 0-179 ${=CL}; done
run 15_TEST_before_cl --scenario 15 --ticks 0-179 ${=CL} --preset before
echo LAT_CAPS_DONE
