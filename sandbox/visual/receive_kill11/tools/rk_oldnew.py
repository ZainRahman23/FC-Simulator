# receive_kill11/tools/rk_oldnew.py — OLD (RECEIVE-KILL-1) vs NEW (RECEIVE-KILL-1.1) for every matrix row, the same seeds and draws:
#   python3 rk_oldnew.py <old rk_distribution.json> <new rk11_distribution.json> <out.md> <out.json>
import json, sys
O = json.load(open(sys.argv[1])); N = json.load(open(sys.argv[2])); out = open(sys.argv[3], "w"); BC = N["bc"]; res = {}
def w(s=""): out.write(s + "\n")
def f(x, n=2): return "–" if x is None else f"{x:.{n}f}"
def pc(x): return "–" if x is None else f"{100*x:.0f}%"
w(f"# RECEIVE-KILL-1 → RECEIVE-KILL-1.1: old vs new\n\nThe same incoming balls and the same keyed seeds ({N['nSeeds']} per cell; the first contact's draws are identical in both). **Old** = RECEIVE-KILL-1's median distance from the intended point 2.0 s after the first touch. **New 1st** = the same measure with the compressed Ball Control scale. **New episode** = the complete receive: share of IMMEDIATE / ADJUSTED / RECOVERY / UNSTABLE, the median extra adjustment against the ideal episode, the median time to stable control.\n")
for mid, rows in N["matrices"].items():
    orows = O["matrices"].get(mid, []); w(f"## {mid}\n"); res[mid] = []
    w("| incoming ball | measure | " + " | ".join(f"BC {b}" for b in BC) + " |"); w("|---|---|" + "---|" * len(BC))
    for i, r in enumerate(rows):
        if r.get("none") or "dist" not in r: continue
        o = orows[i] if i < len(orows) and not orows[i].get("none") else None
        old = [d["med"] for d in o["dist"]] if o else [None] * len(BC); new = [d["fc"]["d2"]["med"] for d in r["dist"]]
        w(f"| {r['label']} ({r['surface']}) | old: 2 s distance | " + " | ".join(f(x) for x in old) + " |")
        w(f"| | new: 2 s distance | " + " | ".join(f(x) for x in new) + " |")
        if r["group"] != "FOOT": w(f"| | new: drop-point error | " + " | ".join(f(d['fc']['dropErr']['med']) for d in r["dist"]) + " |")
        w(f"| | new: velocity error m/s | " + " | ".join(f(d['fc']['velErr']['med']) for d in r["dist"]) + " |")
        w(f"| | new: immediate / adjusted / recovery / unstable | " + " | ".join(f"{pc(d['cls']['IMMEDIATE'])} / {pc(d['cls']['ADJUSTED'])} / {pc(d['cls']['RECOVERY'])} / {pc(d['cls']['UNSTABLE'])}" for d in r["dist"]) + " |")
        w(f"| | new: extra adjustment m (median / p90) | " + " | ".join(f"{f(d['ep']['extraAdj']['med'])} / {f(d['ep']['extraAdj']['p90'])}" for d in r["dist"]) + " |")
        w(f"| | new: time to stable control s (median) | " + " | ".join(f(d['ep']['tStable']['med']) for d in r["dist"]) + " |")
        res[mid].append({"label": r["label"], "surface": r["surface"], "old2s": old, "new2s": new, "reduction": [None if (a is None or b is None or a <= 0) else round(1 - b / a, 3) for a, b in zip(old, new)],
                         "cls": [d["cls"] for d in r["dist"]], "extraAdjMed": [d["ep"]["extraAdj"]["med"] for d in r["dist"]], "tStableMed": [d["ep"]["tStable"]["med"] for d in r["dist"]], "dropErrMed": [d["fc"]["dropErr"]["med"] for d in r["dist"]], "velErrMed": [d["fc"]["velErr"]["med"] for d in r["dist"]]})
    w()
json.dump(res, open(sys.argv[4], "w"), indent=1); print("wrote", sys.argv[3])
