#!/bin/zsh
# DEFENDING V1 — the validation gates. Needs: the working tree on :8124, baseline/outfield-runtime-v1 on :8131,
# baseline/possession-v1.1-handoff on :8132 (git worktrees served by serve_match.py with PORT changed), PUPPETEER_NODE_MODULES set.
#   zsh of_def_gates.sh <outdir>
OUT=$1; mkdir -p $OUT; cd ${0:a:h}
H=http://127.0.0.1:8124/sandbox/visual/match.html; B=http://127.0.0.1:8131/sandbox/visual/match.html; V=http://127.0.0.1:8132/sandbox/visual/match.html
U=$OUT/udd; DEF=$(node -e 'console.log(Object.keys(require("./of_def_scenarios.js").SCEN).join(","))')
if [[ "$ONLY" != "45" ]]; then
echo "== 1. frozen single-player baseline (baseline/outfield-runtime-v1, 60 scenarios, authoritative + pose)"
node of_rp_baseline.js --url $B --out $OUT/base_tag.json --udd $U/b1 > $OUT/base_tag.log 2>&1
node of_rp_baseline.js --url $H --out $OUT/base_head.json --udd $U/b2 > $OUT/base_head.log 2>&1
node of_rp_baseline.js --compare $OUT/base_tag.json $OUT/base_head.json | tail -2
echo "== 2. squad fixtures vs baseline/possession-v1.1-handoff (27 fixtures: authoritative trace + events, presentation fingerprint + contact records)"
node of_rp_probe.js --scen all --url $V --out $OUT/sq_tag --udd $U/s1 > $OUT/sq_tag.log 2>&1
node of_rp_probe.js --scen all --url $H --out $OUT/sq_head --udd $U/s2 > $OUT/sq_head.log 2>&1
node of_rp_regress.js $OUT/sq_tag/probe.json $OUT/sq_head/probe.json | tail -1
node of_def_presdiff.js $OUT/sq_tag/probe.json $OUT/sq_head/probe.json | tail -1
echo "== 3. offense: auto pass / receive (4 patterns x SHORT/DRIVEN/THROUGH) vs baseline/possession-v1.1-handoff"
node of_autopass_run.js --url $V --fams SHORT,DRIVEN,THROUGH --ticks 1800 --out $OUT/ap_tag.json --udd $U/a1 > $OUT/ap_tag.log 2>&1
node of_autopass_run.js --url $H --fams SHORT,DRIVEN,THROUGH --ticks 1800 --out $OUT/ap_head.json --udd $U/a2 > $OUT/ap_head.log 2>&1
node of_def_tracediff.js $OUT/ap_tag.json $OUT/ap_head.json | tail -1
fi
echo "== 4. defending fixtures: animation ON/OFF neutrality and determinism"
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --out $OUT/def_on --udd $U/d1 > $OUT/def_on.log 2>&1
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --anim off --out $OUT/def_off --udd $U/d2 > $OUT/def_off.log 2>&1
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --out $OUT/def_on2 --udd $U/d3 > $OUT/def_on2.log 2>&1
echo -n "ON/OFF      "; node of_rp_regress.js $OUT/def_on/probe.json $OUT/def_off/probe.json | tail -1
echo -n "determinism "; node of_rp_regress.js $OUT/def_on/probe.json $OUT/def_on2/probe.json | tail -1
echo "== 5. small-sided drills + auto-defend demos: ON/OFF and determinism (full event logs)"
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --out $OUT/ssg_on.json --udd $U/g1 > $OUT/ssg_on.log 2>&1
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --anim off --out $OUT/ssg_off.json --udd $U/g2 > $OUT/ssg_off.log 2>&1
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --out $OUT/ssg_on2.json --udd $U/g3 > $OUT/ssg_on2.log 2>&1
echo -n "SSG ON/OFF      "; node of_def_tracediff.js $OUT/ssg_on.json $OUT/ssg_off.json | tail -1
echo -n "SSG determinism "; node of_def_tracediff.js $OUT/ssg_on.json $OUT/ssg_on2.json | tail -1
node of_def_run.js --demo jockey,stand_win,stand_miss,retention,slide_win,slide_miss,intercept --ticks 3600 --out $OUT/demo_on.json --udd $U/h1 > $OUT/demo_on.log 2>&1
node of_def_run.js --demo jockey,stand_win,stand_miss,retention,slide_win,slide_miss,intercept --ticks 3600 --anim off --out $OUT/demo_off.json --udd $U/h2 > $OUT/demo_off.log 2>&1
echo -n "demos ON/OFF    "; node of_def_tracediff.js $OUT/demo_on.json $OUT/demo_off.json | tail -1
echo "== 6. TACKLED-PLAYER V1: reaction fixtures ON/OFF + determinism; defending fixtures / games / demos vs baseline/defending-v1.1-slide (contact-aware)"
X=http://127.0.0.1:8133/sandbox/visual/match.html
node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen all --out $OUT/rx_on --udd $U/r1 > $OUT/rx_on.log 2>&1
node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen all --anim off --out $OUT/rx_off --udd $U/r2 > $OUT/rx_off.log 2>&1
node of_rp_probe.js --scenfile ./of_react_scenarios.js --scen all --out $OUT/rx_on2 --udd $U/r3 > $OUT/rx_on2.log 2>&1
echo -n "reactions ON/OFF      "; node of_rp_regress.js $OUT/rx_on/probe.json $OUT/rx_off/probe.json | tail -1
echo -n "reactions determinism "; node of_rp_regress.js $OUT/rx_on/probe.json $OUT/rx_on2/probe.json | tail -1
node of_rp_probe.js --scenfile ./of_def_scenarios.js --scen $DEF --url $X --out $OUT/tag_def --udd $U/t1 > $OUT/tag_def.log 2>&1
node of_rx_gate.js $OUT/tag_def/probe.json $OUT/def_on/probe.json > $OUT/rx_gate_def.txt; tail -1 $OUT/rx_gate_def.txt
node of_def_run.js --drill D7,D8,D9 --ticks 7200 --url $X --out $OUT/tag_ssg.json --udd $U/t2 > $OUT/tag_ssg.log 2>&1
node of_rx_gate_run.js $OUT/tag_ssg.json $OUT/ssg_on.json > $OUT/rx_gate_ssg.txt; tail -1 $OUT/rx_gate_ssg.txt
node of_def_run.js --demo jockey,stand_win,stand_miss,retention,slide_win,slide_miss,intercept --ticks 3600 --url $X --out $OUT/tag_demo.json --udd $U/t3 > $OUT/tag_demo.log 2>&1
node of_rx_gate_run.js $OUT/tag_demo.json $OUT/demo_on.json > $OUT/rx_gate_demo.txt; tail -1 $OUT/rx_gate_demo.txt
node of_rx_perf.js --ticks 3600 --out $OUT/perf.json --udd $U/p1 > $OUT/perf.txt 2>&1; cat $OUT/perf.txt
echo GATES_DONE
