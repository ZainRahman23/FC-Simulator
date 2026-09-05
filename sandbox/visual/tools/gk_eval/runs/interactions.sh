#!/bin/zsh
# Phase C: interaction grids (Phase 10) on the NEW build — pairs of attributes on the POOR base, reduced corpus (41x48).
cd "$(dirname "$0")"; export GK_PAGE=match.html
node - <<'JS'
// generate the grid profile JSON args for gk_profile_goalface.js? (the harness only sweeps one attribute) -> we run sweeps per fixed second value
JS
for h in 183 199; do ./gk_run.sh attr/new HxJ_h$h --sweep "jumping=40,60,80,99" --base $( [ $h = 183 ] && echo POOR || echo K1_HGT ) --compact --determinismN 2 --aimN 41 --chargeN 48; done
for h in 183 199; do ./gk_run.sh attr/new HxD_h$h --sweep "diving=40,60,80,99" --base $( [ $h = 183 ] && echo POOR || echo K1_HGT ) --compact --determinismN 2 --aimN 41 --chargeN 48; done
for h in 183 199; do ./gk_run.sh attr/new HxR_h$h --sweep "reflexes=40,60,80,99" --base $( [ $h = 183 ] && echo POOR || echo K1_HGT ) --compact --determinismN 2 --aimN 41 --chargeN 48; done
./gk_run.sh attr/new DxA_a40 --sweep "diving=40,60,80,99" --base K1_ACC40 --compact --determinismN 2 --aimN 41 --chargeN 48
./gk_run.sh attr/new DxA_a99 --sweep "diving=40,60,80,99" --base K1_ACC99 --compact --determinismN 2 --aimN 41 --chargeN 48
for d in 30 12; do ./gk_run.sh attr/new RxD_d$d --sweep "reflexes=40,60,80,99" --base POOR --dist $d --compact --determinismN 2 --aimN 41 --chargeN 48; done
echo PHASE_C_DONE
