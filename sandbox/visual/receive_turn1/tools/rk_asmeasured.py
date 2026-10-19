# receive_kill12/tools/rk_asmeasured.py — does the BUILT-IN scale B behave as measured? Every benchmark × rating row (all measures, medians / means / p90,
# continuation shares) of the four-scale run against the first round's evidence: B vs the what-if B (knots overridden), A vs the first round's candidate,
# CURRENT and ORIGINAL vs theirs.   python3 rk_asmeasured.py <rk12b_four_scales.json> <rk12_three_scales.json> <rk12_whatif_B.json> <out.json>
import json, sys
F4, T3, WB = (json.load(open(p)) for p in sys.argv[1:4])
pairs = {"B": lambda b: WB["benchmarks"][b], "A": lambda b: T3["benchmarks"][b]["scales"]["candidate"], "current": lambda b: T3["benchmarks"][b]["scales"]["current"], "original": lambda b: T3["benchmarks"][b]["scales"]["original"]}
what = {"B": "the built-in scale B vs the first round's what-if B (rk12_whatif_B.json)", "A": "scale A vs the first round's candidate (rk12_three_scales.json)", "current": "vs the first round's current", "original": "vs the first round's original"}
R = {}
for sc, ref in pairs.items():
    cells = same = 0; diffs = []
    for b, B in F4["benchmarks"].items():
        for r, q in zip(B["scales"][sc], ref(b)):
            cells += 1
            if json.dumps(r, sort_keys=True) == json.dumps(q, sort_keys=True): same += 1
            else: diffs.append([b, r["bc"], [k for k in r if r.get(k) != q.get(k)]])
    R[sc] = {"what": what[sc] + ", every measure", "cells": cells, "identical": same, "diffs": diffs[:20]}
json.dump(R, open(sys.argv[4], "w"), indent=1); print({k: f"{v['identical']}/{v['cells']}" for k, v in R.items()})
