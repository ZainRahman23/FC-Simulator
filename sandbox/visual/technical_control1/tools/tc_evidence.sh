#!/bin/zsh
# technical_control1/tools/tc_evidence.sh — every number of the report, regenerated from the code of record into review_artifacts/technical_control1/evidence:
# the sweeps (independent BC / DRI / AGI, presets, mixed archetypes, styles, preferred foot; the full chain with / without the DRIBBLE-V1 bridge), the
# human-motion diagnostics + animation neutrality, RECEIVE-ELITE-1 vs NEW (phases 1 – 2), the body A/B, the vocabulary spread, the regressions,
# determinism, CPU (run it alone: nothing else on the machine), the protected-file end check.   S=<scratch> zsh tc_evidence.sh [P 9]
HERE="${0:A:h}"; EV="$HERE/../../../../review_artifacts/technical_control1/evidence"; P="${1:-9}"; mkdir -p "$EV"; cd "$HERE/.."
zsh tools/tc_sweep.sh all "$EV/tc_sweep.jsonl" $P 1,2,3 && python3 tools/tc_sweep_sum.py "$EV/tc_sweep.jsonl" "$EV/tc_sweep_summary.json" > "$EV/tc_sweep_summary.txt"
zsh tools/tc_sweep.sh chain "$EV/tc_chain.jsonl" $P 1,2,3 && python3 tools/tc_sweep_sum.py "$EV/tc_chain.jsonl" "$EV/tc_chain_summary.json" > "$EV/tc_chain_summary.txt"
IDS=($(node -e 'import("./tc_course.js").then(m=>{ const out=[]; for (const r of [99,80,50]) { for (const c of m.COURSE.concat(m.EXTRA)) out.push(`${c}_B${r}_D${r}_A${r}`); for (const c of m.RECEIVE_CHAIN) out.push(`${c}_B${r}_D${r}_A${r}`); } for (const st of ["DOMINANT_FOOT","TWO_FOOT","DIRECT_RUNNER","CLOSE_CONTROL","FEINT_HEAVY"]) for (const c of ["CUT90","CUT180","LR","CONTEST45"]) out.push(`${c}_B90_D90_A90_S${st}`); console.log(out.join(" ")); })'))
rm -f "$EV"/tc_neutral_*.json(N); for ((s=0; s<P; s++)); do L=(); for ((i=s+1; i<=${#IDS}; i+=P)); do L+=(${IDS[$i]}); done; node tools/tc_neutral.mjs "$EV/tc_neutral_$s.json" ${(j:,:)L} new > /dev/null & done; wait
python3 - "$EV" <<'PY'
import json, glob, sys
ev = sys.argv[1]; rows = []
for f in sorted(glob.glob(ev + "/tc_neutral_*.json")): rows += json.load(open(f))["rows"]
import os; [os.remove(f) for f in glob.glob(ev + "/tc_neutral_*.json")]
p = lambda k: sorted(r[k] for r in rows if r.get(k) is not None)
s = { "runs": len(rows), "identical": sum(r["identical"] for r in rows), "faults": [r["id"] for r in rows if r.get("fault")], "contactPoseErrMax": max(p("contactPoseErr")), "slipMax": max(p("slip")), "footAccP95Median": p("footAccP95")[len(rows) // 2], "footAccMaxMax": max(p("footAccMax")), "ikErrP99Median": p("ikErrP99")[len(rows) // 2], "ikErrP99Max": max(p("ikErrP99")), "ikErrMax": max(p("ikErrMax")), "fullExtShareMedian": p("fullExtShare")[len(rows) // 2] }
json.dump({ "summary": s, "rows": rows }, open(ev + "/tc_neutral.json", "w"), indent=1); print(json.dumps(s))
PY
node tools/tc_vs_re1.mjs "$EV/tc_vs_re1.json" > /dev/null; node tools/tc_body_ab.mjs "$EV/tc_body_ab.json" > /dev/null; node tools/tc_vocab_spread.mjs "$EV/tc_vocab_spread.json" > /dev/null
node tools/tc_regress.mjs "$EV/tc_regress.json"; node tools/tc_det.mjs "$EV/tc_det.json" 1,2; node tools/tc_cpu.mjs "$EV/tc_cpu.json"; python3 tools/tc_frozen.py end
