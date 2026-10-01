# the FIRST step from standing: x(1) (state at step 1's decision instant) as a function of step 0's commanded (df, dl, T) — measured
import json, sys, numpy as np
files = sys.argv[1:] or ["../json/ident_v5_cl1.json"]; R = []
for f in files:
    D = json.load(open(f))
    for run in D["runs"]:
        rows = {r["k"]: r for r in run["rows"]}; u = run["steps"].get("0") or run["steps"].get(0); r1 = rows.get(1); r0 = rows.get(0)
        if not u or not r1 or not r1["atStart"] or not r1["upright"] or not r0 or r0["td"] is None: continue
        R.append([u["df"], u["dl"], u["T"]] + r1["atStart"]["xiS"] + [r1["atStart"]["v"][0], r1["atStart"]["v"][1]])
R = np.array(R); U = R[:, :3]; Y = R[:, 3:5]; F = np.hstack([np.ones((len(R), 1)), U]); W, *_ = np.linalg.lstsq(F, Y, rcond=None); E = Y - F @ W
print("n", len(R), "rms", np.sqrt((E ** 2).mean(0)).round(3)); print("x(1) = c + B u0:  c", W[0].round(3), "B(df, dl, T)", W[1:].T.round(3).tolist())
print("u0 range", U.min(0).round(3), U.max(0).round(3), "x(1) range", Y.min(0).round(3), Y.max(0).round(3))
# the first step that lands x(1) on a target (least-norm from the centre of the sampled range)
for tgt in ([0.05, 0.07], [0.06, 0.08], [0.04, 0.06]):
    u0 = U.mean(0); G = W[1:].T; r = np.array(tgt) - (W[0] + G @ u0); sg = np.array([0.03, 0.02, 0.03]); Wi = sg ** 2
    du = Wi * (G.T @ np.linalg.solve(G @ np.diag(Wi) @ G.T, r)); print("target", tgt, "→ first step u0", (u0 + du).round(3))
