#!/bin/zsh
# SLIDE CONTACT GEOMETRY V1.2 — the validation gates. Servers (any static server of each git worktree; ports by default):
#   HEAD (this build) :8150   baseline/tackled-player-v1 :8151   baseline/outfield-runtime-v1 :8152   baseline/possession-v1.1-handoff :8153
#   PUPPETEER_NODE_MODULES set.      zsh of_slide_gates.sh <outdir>
OUT=$1; mkdir -p $OUT; cd ${0:a:h}
H=${HEAD_URL:-http://127.0.0.1:8150/sandbox/visual/match.html}; X=${TAG_URL:-http://127.0.0.1:8151/sandbox/visual/match.html}
B=${OUTFIELD_URL:-http://127.0.0.1:8152/sandbox/visual/match.html}; V=${POSS_URL:-http://127.0.0.1:8153/sandbox/visual/match.html}
U=$OUT/udd; DEF=$(node -e 'console.log(Object.keys(require("./of_def_scenarios.js").SCEN).join(","))')
if [[ "$SKIP12" != "1" ]]; then
echo "== 1. frozen single-player baseline (baseline/outfield-runtime-v1, 60 scenarios, authoritative + pose)"
node of_rp_baseline.js --url $B --out $OUT/base_tag.json --udd $U/b1 > $OUT/base_tag.log 2>&1 &
node of_rp_baseline.js --url $H --out $OUT/base_head.json --udd $U/b2 > $OUT/base_head.log 2>&1 &
echo "== 2. squad fixtures (27) + auto pass / receive vs baseline/possession-v1.1-handoff"
node of_rp_probe.js --scen all --url $V --out $OUT/sq_tag --udd $U/s1 > $OUT/sq_tag.log 2>&1 &
node of_rp_probe.js --scen all --url $H --out $OUT/sq_head --udd $U/s2 > $OUT/sq_head.log 2>&1 &
wait
node of_rp_baseline.js --compare $OUT/base_tag.json $OUT/base_head.json | tail -2
node of_rp_regress.js $OUT/sq_tag/probe.json $OUT/sq_head/probe.json | tail -1
node of_def_presdiff.js $OUT/sq_tag/probe.json $OUT/sq_head/probe.json | tail -1
node of_autopass_run.js --url $V --fams SHORT,DRIVEN,THROUGH --ticks 1800 --out $OUT/ap_tag.json --udd $U/a1 > $OUT/ap_tag.log 2>&1 &
node of_autopass_run.js --url $H --fams SHORT,DRIVEN,THROUGH --ticks 1800 --out $OUT/ap_head.json --udd $U/a2 > $OUT/ap_head.log 2>&1 &
fi
echo "== 3. defending fixtures (24) vs baseline/tackled-player-v1: non-slide IDENTICAL, slide changes itemised; ON/OFF; determinism"
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --url $X --out $OUT/def_tag --udd $U/d0 > $OUT/def_tag.log 2>&1 &
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --url $H --out $OUT/def_on --udd $U/d1 > $OUT/def_on.log 2>&1 &
wait
[[ "$SKIP12" != "1" ]] && node of_def_tracediff.js $OUT/ap_tag.json $OUT/ap_head.json | tail -1
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --url $H --anim off --out $OUT/def_off --udd $U/d2 > $OUT/def_off.log 2>&1 &
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --url $H --out $OUT/def_on2 --udd $U/d3 > $OUT/def_on2.log 2>&1 &
wait
node of_slide_gate.js $OUT/def_tag/probe.json $OUT/def_on/probe.json > $OUT/slide_gate_def.txt; cat $OUT/slide_gate_def.txt
echo -n "defending ON/OFF      "; node of_rp_regress.js $OUT/def_on/probe.json $OUT/def_off/probe.json | tail -1
echo -n "defending determinism "; node of_rp_regress.js $OUT/def_on/probe.json $OUT/def_on2/probe.json | tail -1
echo "== 4. tackled-player fixtures (17) + side-on slide fixtures: vs tag (itemised), ON/OFF, determinism"
for S in react:of_react_scenarios.js slide:of_slide_scenarios.js; do N=${S%%:*}; F=${S#*:}
  node of_rp_probe.js --scenfile ./$F --scen all --url $X --out $OUT/${N}_tag --udd $U/${N}0 > $OUT/${N}_tag.log 2>&1 &
  node of_rp_probe.js --scenfile ./$F --scen all --url $H --out $OUT/${N}_on --udd $U/${N}1 > $OUT/${N}_on.log 2>&1 &
  node of_rp_probe.js --scenfile ./$F --scen all --url $H --anim off --out $OUT/${N}_off --udd $U/${N}2 > $OUT/${N}_off.log 2>&1 &
  node of_rp_probe.js --scenfile ./$F --scen all --url $H --out $OUT/${N}_on2 --udd $U/${N}3 > $OUT/${N}_on2.log 2>&1 &
  wait
  node of_slide_gate.js $OUT/${N}_tag/probe.json $OUT/${N}_on/probe.json > $OUT/slide_gate_${N}.txt; tail -1 $OUT/slide_gate_${N}.txt
  echo -n "$N ON/OFF      "; node of_rp_regress.js $OUT/${N}_on/probe.json $OUT/${N}_off/probe.json | tail -1
  echo -n "$N determinism "; node of_rp_regress.js $OUT/${N}_on/probe.json $OUT/${N}_on2/probe.json | tail -1
done
echo "== 5. small-sided games (D7-D9, 7200 ticks) + defending demos: vs tag (divergence only after a slide request), ON/OFF, determinism"
DEM=jockey,stand_win,stand_miss,retention,slide_win,slide_miss,intercept
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --url $X --out $OUT/ssg_tag.json --udd $U/g0 > $OUT/ssg_tag.log 2>&1 &
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --url $H --out $OUT/ssg_on.json --udd $U/g1 > $OUT/ssg_on.log 2>&1 &
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --url $H --anim off --out $OUT/ssg_off.json --udd $U/g2 > $OUT/ssg_off.log 2>&1 &
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --url $H --out $OUT/ssg_on2.json --udd $U/g3 > $OUT/ssg_on2.log 2>&1 &
wait
node of_def_run.js --demo $DEM --ticks 3600 --url $X --out $OUT/demo_tag.json --udd $U/h0 > $OUT/demo_tag.log 2>&1 &
node of_def_run.js --demo $DEM --ticks 3600 --url $H --out $OUT/demo_on.json --udd $U/h1 > $OUT/demo_on.log 2>&1 &
node of_def_run.js --demo $DEM --ticks 3600 --url $H --anim off --out $OUT/demo_off.json --udd $U/h2 > $OUT/demo_off.log 2>&1 &
wait
node of_slide_gate_run.js $OUT/ssg_tag.json $OUT/ssg_on.json > $OUT/slide_gate_ssg.txt; cat $OUT/slide_gate_ssg.txt
echo -n "SSG ON/OFF      "; node of_def_tracediff.js $OUT/ssg_on.json $OUT/ssg_off.json | tail -1
echo -n "SSG determinism "; node of_def_tracediff.js $OUT/ssg_on.json $OUT/ssg_on2.json | tail -1
node of_slide_gate_run.js $OUT/demo_tag.json $OUT/demo_on.json > $OUT/slide_gate_demo.txt; cat $OUT/slide_gate_demo.txt
echo -n "demos ON/OFF    "; node of_def_tracediff.js $OUT/demo_on.json $OUT/demo_off.json | tail -1
echo GATES_DONE
