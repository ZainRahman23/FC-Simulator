# FOOT GATE — STATE-MATCHED step-length capability from the identification runs (the controlled step test could not match the run-up state:
# each foot's own Controller A left it at a different speed). Every transition of the IDENTICAL dithered design (seed 71 under F0's maps,
# seed 72 under the foot's own round-1 maps; 600 runs each) is kept — failed swings included — and conditioned on the state that matters:
#   L = the previous step's achieved forward length (how far behind the trailing foot is), v = forward COM speed at the step start.
# Outcomes: SWING FAILURE (no liftoff, or re-contact < 0.2 s after liftoff) and CONTINUATION (the swing completes AND the body is still upright
# at the start of the step after next; transitions too close to the end of a run to know are excluded, not counted as successes).
# Reported: cells of matched (L, v) with n ≥ 15 on each foot, and a logistic fit P(fail | L, v) used ONLY inside each foot's data support.
import json, os, sys, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); J = os.path.join(H, "../json"); WJ = os.path.join(H, "../../g2_walker/json")
SETS = {"F0": [os.path.join(WJ, "ident_v8_cl1.json"), os.path.join(J, "ident_F0_r2.json")]}
for f in ("F1", "F2", "F2h"): SETS[f] = [os.path.join(J, f"ident_{f}_r1.json"), os.path.join(J, f"ident_{f}_r2.json")]
def rows(files):
    out = []
    for fi, f in enumerate(files):
        D = json.load(open(f))
        for run in D["runs"]:
            R = {r["k"]: r for r in run["rows"]}; kmax = max(R) if R else -1
            for k in sorted(R):
                a, p = R[k], R.get(k - 1)
                if k < 2 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
                fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2
                c2 = R.get(k + 2); known = (c2 is not None) or fail or (run.get("tFall") is not None)
                cont = (not fail) and c2 is not None and bool(c2["atStart"]) and bool(c2["upright"])
                out.append((p["foothold"][0], a["atStart"]["v"][0], float(fail), float(cont), float(known), fi))
    return np.array(out, dtype=float)
def logit(X, y):
    w = np.zeros(X.shape[1])
    for _ in range(100):
        p = 1 / (1 + np.exp(-X @ w)); g = X.T @ (y - p); Hh = -(X.T * (p * (1 - p))) @ X; w = w - np.linalg.solve(Hh - 1e-6 * np.eye(len(w)), g)
    return w
LB = [(0.20, 0.28), (0.28, 0.36), (0.36, 0.44), (0.44, 0.60)]; VB = [(0.15, 0.35), (0.35, 0.55), (0.55, 0.75)]
res = {}; A_ = {f: rows(fs) for f, fs in SETS.items()}
for f, A in A_.items():
    L, v, y, c, kn = A[:, 0], A[:, 1], A[:, 2], A[:, 3], A[:, 4]
    cells = {}
    for (la, lb) in LB:
        for (va, vb) in VB:
            m = (L >= la) & (L < lb) & (v >= va) & (v < vb); mk = m & (kn > 0)
            cells[f"L{la:.2f}-{lb:.2f}|v{va:.2f}-{vb:.2f}"] = {"n": int(m.sum()), "fail": float(y[m].mean()) if m.sum() >= 15 else None, "nCont": int(mk.sum()), "cont": float(c[mk].mean()) if mk.sum() >= 15 else None}
    X = np.vstack([np.ones(len(L)), L, v, L * v]).T; w = logit(X, y)
    # the step length at which P(fail) = 20 % at a matched speed, only where this foot has data within ±0.1 m/s and the L found lies inside its support
    lmax = {}
    for vv in (0.3, 0.45, 0.6):
        sup = (np.abs(v - vv) < 0.1); Ls = L[sup]
        if sup.sum() < 40: lmax[str(vv)] = None; continue
        a0, a1 = w[0] + w[2] * vv, w[1] + w[3] * vv; Lq = (np.log(0.2 / 0.8) - a0) / a1 if a1 > 0 else None
        lmax[str(vv)] = {"L20": None if Lq is None else float(Lq), "support": [float(np.percentile(Ls, 5)), float(np.percentile(Ls, 95))], "inside": bool(Lq is not None and np.percentile(Ls, 5) <= Lq <= np.percentile(Ls, 95)), "n": int(sup.sum())}
    res[f] = {"n": int(len(A)), "swingFail": float(y.mean()), "cells": cells, "logit": w.tolist(), "L20atV": lmax}
# matched cells: report only cells where EVERY foot has n ≥ 15
keys = [k for k in res["F0"]["cells"] if all(res[f]["cells"][k]["fail"] is not None for f in res)]
print("swing failure % (n) in state cells where all four feet have ≥ 15 transitions:")
print(f"{'cell':26s}" + "".join(f"{f:>16s}" for f in res))
for k in keys: print(f"{k:26s}" + "".join(f"{res[f]['cells'][k]['fail']*100:9.0f}% (n{res[f]['cells'][k]['n']:3d})" for f in res))
print("\ncontinuation % (swing completes AND upright two steps later), same cells (n known):")
for k in keys: print(f"{k:26s}" + "".join((f"{res[f]['cells'][k]['cont']*100:9.0f}% (n{res[f]['cells'][k]['nCont']:3d})" if res[f]['cells'][k]['cont'] is not None else f"{'-':>16s}") for f in res))
print("\nall cells per foot (fail %, n):")
for f in res: print(f, " ".join(f"{k}:{'%.0f' % (c['fail']*100) if c['fail'] is not None else '-'}({c['n']})" for k, c in res[f]["cells"].items()))
print("\nstep length at 20 % swing failure, matched speed (logistic in L, v, L·v; inside = within the foot's own 5–95 % L support at that speed):")
for f in res: print(f, " ".join(f"v{vv}: {('%.3f' % d['L20']) if d and d['L20'] is not None else '-'}{'' if not d else (' ok' if d['inside'] else ' (extrap.)')}" for vv, d in res[f]["L20atV"].items()))
json.dump(res, open(os.path.join(J, "state_matched.json"), "w"), indent=1)
