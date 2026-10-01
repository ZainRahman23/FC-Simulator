# E2: the REACHABLE SET measured at matched states — step K's request swept over forward foothold × single-support time from identical
# states (Controller A's walk up to step K), base swing execution vs the swing with the pelvis-rate internal model
import json, sys, numpy as np, os; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
STARTS = ["R@0.5", "R@0.55", "R@0.6", "L@0.5", "L@0.55", "L@0.6"]; KS = [3, 4, 5]
DF = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45]; TS = [0.32, 0.38, 0.44, 0.50]
if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "base"; extra = sys.argv[2] if len(sys.argv) > 2 else ""; var = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    cases = [{"start": s, "K": k, "req": [df, 0.27, T], **({"mode": "ds", "var": var} if var else {})} for s in STARTS for k in KS for df in DF for T in TS]
    rows = run("e2_" + tag, cases, shards=8, extra=extra); print(tag, len(rows))
