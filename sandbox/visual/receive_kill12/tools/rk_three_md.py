# receive_kill12/tools/rk_three_md.py — markdown tables of the three-scale benchmarks: python3 rk_three_md.py <rk12_three_scales.json> <out.md>
import json, sys, math
J = json.load(open(sys.argv[1])); out = open(sys.argv[2], "w"); BC = J["bc"]; SC = [("original", "ORIGINAL (1)"), ("current", "CURRENT (1.1)"), ("candidate", "CANDIDATE (1.2)")]
M = [("resid", "immediate residual velocity (m/s)"), ("velErr", "first-touch velocity error (m/s)"), ("place", "first-touch placement error (m)"), ("e025", "0.25 s error (m)"), ("e05", "0.50 s error (m)"), ("e1", "1.0 s error (m)"), ("d2", "2.0 s legacy distance (m)"), ("recDist", "recovery distance (m)"), ("recTime", "recovery time (s)"), ("contacts", "contacts (mean)"), ("tStable", "stable-control time (s)")]
def w(s=""): out.write(s + "\n")
def f(x): return "–" if x is None else f"{x:.2f}"
def pc(x): return int(math.floor(100 * x + 0.5 + 1e-9))  # half-up, as the review page (JS toFixed)
w(f"# RECEIVE-KILL-1.2 — three scales, {J['nSeeds']} keyed seeds per cell (the same draws in every scale and rating)\n\nMedians unless stated. Placement error: the drop point (aerial) or where the touch leaves the ball (ground, 2 s). Recovery distance / time: the extra adjustment / extra time to stable control against the ideal episode.\n")
for bid, B in J["benchmarks"].items():
    w(f"## {bid} — {B['title']} (D {B['scales']['candidate'][0]['D']})\n"); w("| measure | scale | " + " | ".join(f"BC {b}" for b in BC) + " |"); w("|---|---|" + "---|" * len(BC))
    for k, lbl in M:
        for sc, name in SC: w(f"| {lbl if sc == 'original' else ''} | {name} | " + " | ".join(f(r[k]['mean'] if k == 'contacts' else r[k]['med']) for r in B["scales"][sc]) + " |")
    for sc, name in SC: w(f"| {'immediate / adjusted / recovery / unstable %' if sc == 'original' else ''} | {name} | " + " | ".join(f"{pc(r['cls']['IMMEDIATE'])}/{pc(r['cls']['ADJUSTED'])}/{pc(r['cls']['RECOVERY'])}/{pc(r['cls']['UNSTABLE'])}" for r in B["scales"][sc]) + " |")
    w(); w("Matched anchors (per seed): " + "; ".join(f"{k}: E {a['E']['candidate']}/{a['E']['current']}, same class {pc(a['sameClass'])} %, immediate {pc(a['immediate']['candidate'])}/{pc(a['immediate']['current'])} %" for k, a in B["anchors"].items())); w()
