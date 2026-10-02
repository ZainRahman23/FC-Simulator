import json, sys, numpy as np
for f in sys.argv[1:]:
    D = json.load(open(f)); n = 0; fl = 0; byL = {}
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if k < 1 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2; n += 1; fl += fail
            L = p["foothold"][0]; b = "L<0.26" if L < 0.26 else "0.26–0.34" if L < 0.34 else "≥0.34"; byL.setdefault(b, [0, 0]); byL[b][0] += 1; byL[b][1] += fail
    print(f.split("/")[-1], D.get("human"), f"swing failures {fl}/{n} = {fl/n*100:.0f}%", {k: f"{v[1]/v[0]*100:.0f}% (n{v[0]})" for k, v in sorted(byL.items())})
