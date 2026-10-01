# FOOT GATE — swing failure vs the previous step length / speed, from the IDENTICAL closed-loop identification design on each foot (same seed,
# same dithered Controller A with F0's maps, inner loop v8): a controller-light comparison of the step-length capability.
# Failed swings are KEPT (viability evidence). A swing fails = no liftoff, or re-contact < 0.2 s after liftoff.
import json, os, sys, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); J = os.path.join(H, "../json"); WJ = os.path.join(H, "../../g2_walker/json")
SETS = {"F0": os.path.join(WJ, "ident_v8_cl1.json"), "F1": os.path.join(J, "ident_F1_r1.json"), "F2": os.path.join(J, "ident_F2_r1.json"), "F2h": os.path.join(J, "ident_F2h_r1.json")}
# (--r2: the SEPARATED recalibration round — each foot under its OWN round-1 maps (F0: m8a; F1/F2/F2h: maps fitted from their r1 data), seed 72)
R2 = "--r2" in sys.argv
if R2: SETS = {f: os.path.join(J, f"ident_{f}_r2.json") for f in ("F0", "F1", "F2", "F2h")}
def rows(f):
    D = json.load(open(f)); out = []
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if k < 2 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2
            out.append((p["foothold"][0], a["atStart"]["v"][0], fail))
    return np.array(out, dtype=float)
res = {}
for nm, f in SETS.items():
    if not os.path.exists(f): continue
    A = rows(f); L, v, y = A[:, 0], A[:, 1], A[:, 2]
    bins = [(0, 0.2), (0.2, 0.26), (0.26, 0.32), (0.32, 0.38), (0.38, 0.6)]
    br = {f"{a:.2f}-{b:.2f}": (float(y[(L >= a) & (L < b)].mean()) if ((L >= a) & (L < b)).sum() >= 15 else None, int(((L >= a) & (L < b)).sum())) for a, b in bins}
    vb = {f"{a:.2f}-{b:.2f}": (float(y[(v >= a) & (v < b)].mean()) if ((v >= a) & (v < b)).sum() >= 15 else None, int(((v >= a) & (v < b)).sum())) for a, b in [(-1, 0.3), (0.3, 0.45), (0.45, 0.6), (0.6, 2)]}
    # logistic fit of failure on step length (L ≥ 0.2: the long-step branch), L at 20 % and 50 % failure
    m = L >= 0.2; X = np.vstack([np.ones(m.sum()), L[m]]).T; w = np.zeros(2)
    for _ in range(200): p = 1 / (1 + np.exp(-X @ w)); g = X.T @ (y[m] - p); Hh = -(X.T * (p * (1 - p))) @ X; w = w - np.linalg.solve(Hh - 1e-6 * np.eye(2), g)
    L20 = (np.log(0.2 / 0.8) - w[0]) / w[1] if w[1] > 0 else None; L50 = -w[0] / w[1] if w[1] > 0 else None
    res[nm] = {"n": int(len(A)), "fail": float(y.mean()), "byL": br, "bySpeed": vb, "L20": L20, "L50": L50, "logit": w.tolist()}
    print(f"{nm:4s} n {len(A):4d} swing failures {y.mean()*100:4.0f}% | by previous step: " + " ".join(f"{k}: {('%.0f%%' % (r*100)) if r is not None else '-'}(n{n})" for k, (r, n) in br.items()) + f" | L at 20 % failure {L20 if L20 is None else round(L20, 3)} · at 50 % {L50 if L50 is None else round(L50, 3)}")
json.dump(res, open(os.path.join(J, "swing_vs_L_r2.json" if R2 else "swing_vs_L.json"), "w"), indent=1)
