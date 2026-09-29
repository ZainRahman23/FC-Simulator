#!/bin/zsh
cd "/Users/zainrahman/Downloads/FC Simulator"; S=/private/tmp/claude-501/-Users-zainrahman/8e9ca3e0-10ae-4213-9c09-3ee98f6500ac/scratchpad; export PUPPETEER_NODE_MODULES=$S/pptr/node_modules
cap() { node sandbox/visual/tools/anim3d/capture.js --backend 3d "$@" 2>&1 | grep -v "^\s*at " | tail -1 | cut -c1-100; }
CL="--crop 2 --zoom 3.5 --camx 100 --pixel 1 --outline 0 --bands 6"; GP="--crop 0 --clip 600,150,500,450 --pixel 1 --outline 0 --bands 6"
run() { tag=$1; shift; d=$S/lt_$tag; rm -rf $d; cap "$@" --band COURTOIS --out $d --udd $S/chrome-lt4; echo "cap $tag $(ls $d/*.png 2>/dev/null | wc -l)"; }
C="--character COURTOIS"; A="--adhoc $S/reach_adhoc.json"
for i in 8 4 6 12 15 2 0; do run rc${i}_cl ${=A} --adhocIndex $i --ticks 0-199 ${=CL} ${=C}; run rc${i}_gp ${=A} --adhocIndex $i --ticks 0-199 ${=GP} ${=C}; done
run rc8_dbg ${=A} --adhocIndex 8 --ticks 0-160 ${=CL} --dbg roots,feet ${=C}
for i in 8 4 12; do run rc${i}_TEST_cl ${=A} --adhocIndex $i --ticks 0-199 ${=CL}; done
run rc9_cl ${=A} --adhocIndex 9 --ticks 0-199 ${=CL} ${=C}; run rc13_cl ${=A} --adhocIndex 13 --ticks 0-199 ${=CL} ${=C}
echo REACH_CAPS_DONE
