#!/bin/zsh
# SLIDE CONTACT GEOMETRY V1.2 — review media capture. Gameplay-camera frames (every tick over the challenge), orbit renders at the key ticks,
# per-tick rendered geometry (of_slide_geo.js) — for this build (HEAD :8150), the frozen reference (baseline/tackled-player-v1 :8151) at the
# identical starting states, and the counterfactual V1 near-leg geometry (rule "near") on this build.   zsh of_slide_media.sh <outdir>
OUT=$1; mkdir -p $OUT; cd ${0:a:h}
H=${HEAD_URL:-http://127.0.0.1:8150/sandbox/visual/match.html}; X=${TAG_URL:-http://127.0.0.1:8151/sandbox/visual/match.html}; U=$OUT/udd
G="--fmt jpg --zoom 3 --overlay off --dpr 1"; NEAR='PT_DEF.slide.rule="near"'
SW=sw_right,sw_left,sw_right_tight,sw_left_tight,sw_right_wide,sw_right_early,sw_glance,blk_front,cf_right,cf_left,sw_right_aim
node of_rp_probe.js --scenfile ./of_slide_scenarios.js --scen $SW --frames 50-200 ${=G} --url $H --out $OUT/game_head --udd $U/1 > $OUT/game_head.log 2>&1 &
node of_rp_probe.js --scenfile ./of_slide_scenarios.js --scen sw_right_aim,sw_right,sw_left,blk_front --frames 50-200 ${=G} --url $X --out $OUT/game_tag --udd $U/2 > $OUT/game_tag.log 2>&1 &
node of_rp_probe.js --scenfile ./of_slide_scenarios.js --scen cf_right,cf_left --frames 50-160 ${=G} --pre $NEAR --url $H --out $OUT/game_near --udd $U/3 > $OUT/game_near.log 2>&1 &
wait
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen sl_win,sl_left --frames 45-160 ${=G} --url $H --out $OUT/game_head_def --udd $U/4 > $OUT/game_head_def.log 2>&1 &
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen sl_win,sl_left --frames 45-160 ${=G} --url $X --out $OUT/game_tag_def --udd $U/5 > $OUT/game_tag_def.log 2>&1 &
node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen rx_standing --frames 30-170 ${=G} --url $H --out $OUT/game_head_rx --udd $U/6 > $OUT/game_head_rx.log 2>&1 &
node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen rx_standing --frames 30-170 ${=G} --url $X --out $OUT/game_tag_rx --udd $U/7 > $OUT/game_tag_rx.log 2>&1 &
wait
V="--views side,sideR,front,tq,top --size 380 --dist 3.0"
node of_def_views.js --scenfile ./of_slide_scenarios.js --scen sw_right,sw_left --ticks 64,70,74,77,79,82,88,100 ${=V} --url $H --out $OUT/views_head --udd $U/8 > $OUT/views_head.log 2>&1 &
node of_def_views.js --scenfile ./of_slide_scenarios.js --scen cf_right,cf_left --ticks 70,74,78,82,90 ${=V} --url $H --out $OUT/views_cf_far --udd $U/9 > $OUT/views_cf_far.log 2>&1 &
node of_def_views.js --scenfile ./of_slide_scenarios.js --scen cf_right,cf_left --ticks 70,74,78,82,90 ${=V} --pre $NEAR --url $H --out $OUT/views_cf_near --udd $U/10 > $OUT/views_cf_near.log 2>&1 &
node of_def_views.js --scenfile ./of_slide_scenarios.js --scen sw_right_aim --ticks 72,78,84,90,100,120 ${=V} --url $X --out $OUT/views_tag --udd $U/11 > $OUT/views_tag.log 2>&1 &
wait
node of_def_views.js --scenfile ./of_slide_scenarios.js --scen sw_right_aim,blk_front,sw_right_tight --ticks 72,76,78,82,84,90,100,120 ${=V} --url $H --out $OUT/views_head2 --udd $U/12 > $OUT/views_head2.log 2>&1 &
node of_slide_geo.js --scen all --out $OUT/geo_head.json --url $H --udd $U/13 > $OUT/geo_head.log 2>&1 &
node of_slide_geo.js --scen all --out $OUT/geo_tag.json --url $X --udd $U/14 > $OUT/geo_tag.log 2>&1 &
node of_slide_geo.js --scen cf_right,cf_left --pre $NEAR --out $OUT/geo_near.json --url $H --udd $U/15 > $OUT/geo_near.log 2>&1 &
wait
DEFS=sl_win,sl_early,sl_late,sl_from_behind,sl_left,sl_loose
node of_slide_geo.js --scenfile ./of_def_scenarios.js --scen $DEFS --out $OUT/geo_def_head.json --url $H --udd $U/16 > $OUT/geo_def_head.log 2>&1 &
node of_slide_geo.js --scenfile ./of_def_scenarios.js --scen $DEFS --out $OUT/geo_def_tag.json --url $X --udd $U/17 > $OUT/geo_def_tag.log 2>&1 &
node of_slide_geo.js --scenfile ./of_react_scenarios.js --scen all --out $OUT/geo_rx_head.json --url $H --udd $U/18 > $OUT/geo_rx_head.log 2>&1 &
node of_slide_geo.js --scenfile ./of_react_scenarios.js --scen all --out $OUT/geo_rx_tag.json --url $X --udd $U/19 > $OUT/geo_rx_tag.log 2>&1 &
wait
echo MEDIA_DONE
