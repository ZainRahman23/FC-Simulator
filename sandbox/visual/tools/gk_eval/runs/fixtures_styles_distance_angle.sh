#!/bin/zsh
# Phase B runs on the NEW build (after the attribute sweeps): fixtures, styles, distance, angle, interactions, second-base sweep.
cd "$(dirname "$0")"; export GK_PAGE=match.html
FIX="POOR,AVERAGE,GOOD,ELITE,COURTOIS"
./gk_run.sh attr/new fixtures  --profiles $FIX --compact --determinismN 12
./gk_run.sh attr/new styles    --profiles AVERAGE,GOOD,TALL_SLOW,SHORT_EXPLOSIVE,HANDLER,STOPPER --compact --determinismN 8
for d in 30 25 16 12 8; do ./gk_run.sh attr/new dist$d --profiles $FIX --dist $d --compact --determinismN 4; done
for a in 20 40 60; do ./gk_run.sh attr/new ang$a --profiles $FIX --dist 16 --angle $a --compact --determinismN 4; done
./gk_run.sh attr/new ang0 --profiles $FIX --dist 16 --compact --determinismN 4
./gk_run.sh attr/new reflexes_AVG --sweep "reflexes=40,50,60,70,80,90,99" --base AVERAGE --compact --determinismN 4
echo PHASE_B_DONE
