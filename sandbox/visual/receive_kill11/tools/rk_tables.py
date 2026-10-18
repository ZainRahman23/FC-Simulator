# receive_kill1/tools/rk_tables.py — markdown tables from the distribution evidence: python3 rk_tables.py <rk_distribution.json> <out.md>
import json, sys
J = json.load(open(sys.argv[1])); out = open(sys.argv[2], "w"); BC = J["bc"]
def w(s=""): out.write(s + "\n")
def f(x, n=2): return "–" if x is None else f"{x:.{n}f}"
w(f"# RECEIVE-KILL-1 calibration tables\n\nSource: `{sys.argv[1].split('/')[-1]}` — {J['nSeeds']} keyed seeds per cell (the same draws at every rating), plus the TYPICAL standardised draw. Distance = from the intended point 2.0 s after the touch (m). Heavy = beyond 1.2 m; lost = beyond 4.5 m.\n")
for mid, rows in J["matrices"].items():
    w(f"## {mid}\n")
    w("| incoming ball | surface | D | " + " | ".join(f"BC {b}" for b in BC) + " |"); w("|---|---|---|" + "---|" * len(BC))
    for r in rows:
        if r.get("none"): w(f"| {r['label']} | no feasible action | – | " + " | ".join("–" for _ in BC) + " |"); continue
        w(f"| {r['label']} — typical | {r['surface']} | {f(r['D'])} | " + " | ".join(f(t['d2']) for t in r["typical"]) + " |")
        if "dist" in r:
            w(f"| … median / p90 | | | " + " | ".join(f"{f(d['med'])} / {f(d['p90'])}" for d in r["dist"]) + " |")
            w(f"| … heavy / lost % | | | " + " | ".join(f"{100*d['heavy']:.0f} / {100*d['lost']:.0f}" for d in r["dist"]) + " |")
            w(f"| … residual mean / median m/s | | | " + " | ".join(f"{f(d['residMean'],1)} / {f(d['residMed'],1)}" for d in r["dist"]) + " |")
    w()
