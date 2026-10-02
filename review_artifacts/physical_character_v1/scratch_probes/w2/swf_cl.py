import json, sys, numpy as np, collections
for f in sys.argv[1:]:
    D = json.load(open(f)); n = 0; fl = 0; per = []; byL = collections.defaultdict(lambda: [0, 0])
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}; up = 0
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if a["upright"] and a["td"] is not None: up += 1
            if k < 2 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2; n += 1; fl += fail
            L = p["foothold"][0]; b = "<0.26" if L < 0.26 else "0.26–0.32" if L < 0.32 else "≥0.32"; byL[b][0] += 1; byL[b][1] += fail
        per.append(up)
    print(f.split("/")[-1][:40].ljust(40), f"swing failures {fl/n*100:4.0f}% (n {n}) · steps/run {np.mean(per):.2f}", {k: f"{v[1]/v[0]*100:.0f}%" for k, v in sorted(byL.items())})
