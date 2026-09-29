#!/bin/zsh
# SLIDE CONTACT GEOMETRY V1.2 → body interaction pass: the proof media. Per-tick rendered geometry and gameplay-camera frames for the cross-line
# cases, at identical starting states, from the V1.2 commit (a1357dd, :8154) and this build (:8150).   zsh of_slide_media13.sh <outdir>
OUT=$1; mkdir -p $OUT; cd ${0:a:h}
H=${HEAD_URL:-http://127.0.0.1:8150/sandbox/visual/match.html}; P=${V12_URL:-http://127.0.0.1:8154/sandbox/visual/match.html}; U=$OUT/udd
G="--fmt jpg --zoom 3 --overlay off --dpr 1"
for B in head:$H v12:$P; do N=${B%%:*}; URL=${B#*:}
  node of_slide_geo.js --scen all --url $URL --out $OUT/geo_sw_$N.json --udd $U/g1$N > $OUT/geo_sw_$N.log 2>&1 &
  node of_slide_geo.js --scenfile ./of_def_scenarios.js --scen sl_win,sl_early,sl_late,sl_from_behind,sl_left,sl_loose --url $URL --out $OUT/geo_def_$N.json --udd $U/g2$N > $OUT/geo_def_$N.log 2>&1 &
  wait
  node of_slide_geo.js --scenfile ./of_react_scenarios.js --scen all --url $URL --out $OUT/geo_rx_$N.json --udd $U/g3$N > $OUT/geo_rx_$N.log 2>&1 &
  node of_rp_probe.js --scenfile ./of_slide_scenarios.js --scen cf_right,cf_left,blk_front --frames 55-175 ${=G} --url $URL --out $OUT/game_$N --udd $U/p1$N > $OUT/game_$N.log 2>&1 &
  wait
  node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen sl_loose,sl_from_behind --frames 70-190 ${=G} --url $URL --out $OUT/game_def_$N --udd $U/p2$N > $OUT/game_def_$N.log 2>&1 &
  node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen rx_lateral,rx_standing --frames 30-150 ${=G} --url $URL --out $OUT/game_rx_$N --udd $U/p3$N > $OUT/game_rx_$N.log 2>&1 &
  wait
done
node of_slide_geo.js --scen cf_right,cf_left --pre 'PT_DEF.slide.rule="near"' --url $H --out $OUT/geo_sw_near.json --udd $U/g4 > $OUT/geo_sw_near.log 2>&1
echo MEDIA13_DONE
