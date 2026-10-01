# swing failure rate from an identification file (the foot gate's definition: no liftoff, or re-contact < 0.2 s after liftoff), overall and by
# the previous step length — failed swings kept as viability evidence
import json, sys, numpy as np
for fn in sys.argv[1:]:
    D = json.load(open(fn)); out = []
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if k < 2 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            out.append((p["foothold"][0], a["atStart"]["v"][0], float(a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2)))
    A = np.array(out); L, v, y = A.T; up = np.mean([sum(1 for r in run["rows"] if r["upright"] and r["td"] is not None) for run in D["runs"]])
    bins = [(0, 0.2), (0.2, 0.26), (0.26, 0.32), (0.32, 0.38), (0.38, 0.6)]
    print(f"{fn.split('/')[-1]}: swings {len(A)} · failed {y.mean()*100:.0f}% · by previous step " + " ".join(f"{a:.2f}-{b:.2f}: {y[(L>=a)&(L<b)].mean()*100:.0f}%(n{((L>=a)&(L<b)).sum()})" for a, b in bins if ((L>=a)&(L<b)).sum() >= 10) + f" · upright steps per run {up:.1f}")
