# receive_turn1/tools/rk12_unchanged.py — RECEIVE-KILL-1.2's own code still reproduces its B evidence of record: its rk_three tool rerun at scales current + B (its anchors need current)
# (200 seeds) for the given benchmarks, every row compared field for field with review_artifacts/receive_kill12/evidence/rk12b_four_scales.json
#   python3 rk12_unchanged.py <scratch dir> <out.json> <benchmark ids…>
import json, os, subprocess, sys
T, out, ids = sys.argv[1], sys.argv[2], sys.argv[3:]; HERE = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(HERE, "../../receive_kill12/tools/rk_three.mjs")
ev = json.load(open(os.path.join(HERE, "../../../../review_artifacts/receive_kill12/evidence/rk12b_four_scales.json")))["benchmarks"]
procs = [subprocess.Popen(["node", K, i, "200", os.path.join(T, f"rk12u_{i}.json"), "current,B"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) for i in ids]
for p in procs: p.wait()
cells = same = 0; diffs = []
for i in ids:
    r = json.load(open(os.path.join(T, f"rk12u_{i}.json")))["scales"]["B"]
    for a, b in zip(r, ev[i]["scales"]["B"]):
        cells += 1
        if json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True): same += 1
        else: diffs.append([i, a["bc"]])
json.dump({"what": "RECEIVE-KILL-1.2 B (receive_kill12/, untouched) rerun with its own tool vs its evidence of record, every measure", "benchmarks": ids, "cells": cells, "identical": same, "diffs": diffs}, open(out, "w"), indent=1); print(same, "/", cells)
