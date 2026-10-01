# measured step maps by decision instant τ (view time into the step): x(τ) → x'(0) of the next step, sensor ξ
import json, numpy as np
D = json.load(open("../json/ident_v2_s1.json")); T0 = 0.42
def rows(tau):
    out = []
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}; pu = run["push"]
        for k in (1, 2, 3):
            a, b = R.get(k), R.get(k + 1)
            if not a or not b or not b["atStart"] or not b["upright"]: continue
            if pu and pu["step"] == k: continue
            if a["lift"] is None or a["td"] is None or a["td"] - a["lift"] < 0.25: continue
            s = a["atStart"] if tau == 0 else (a["atDec"] or {}).get(str(tau)) or (a["atDec"] or {}).get(f"{tau}")
            if not s or s.get("xiS") is None or b["atStart"].get("xiS") is None: continue
            u = run["steps"][str(k)]; out.append((run["i"], k, s["xiS"], [u["df"], u["dl"], u["T"]], b["atStart"]["xiS"], a["atStart"]["xiS"]))
    return out
for tau in (0, 0.1, 0.15, 0.2, 0.25):
    Rw = rows(tau); X = np.array([r[2] for r in Rw]); U = np.array([r[3] for r in Rw]); Y = np.array([r[4] for r in Rw]); X0 = np.array([r[5] for r in Rw])
    xm = np.median(X0, 0); near = (np.abs(X0[:, 0] - xm[0]) < 0.06) & (np.abs(X0[:, 1] - xm[1]) < 0.06) & (np.abs(Y).max(1) < 0.25)
    dT = U[:, 2:3] - T0; F = np.hstack([np.ones((len(X), 1)), X, U, X * dT, U[:, :2] * dT])
    W, *_ = np.linalg.lstsq(F[near], Y[near], rcond=None); E = Y[near] - F[near] @ W
    A = W[1:3].T; ev = np.linalg.eigvals(A); B = W[3:6].T
    print(f"τ {tau:.2f}: n {near.sum():3d} rms fwd {np.sqrt((E[:,0]**2).mean())*100:.2f} cm inward {np.sqrt((E[:,1]**2).mean())*100:.2f} cm | A eig {np.round(ev,2)} | B(df,dl) [[{B[0,0]:+.2f},{B[0,1]:+.2f}],[{B[1,0]:+.2f},{B[1,1]:+.2f}]] B_T [{B[0,2]:+.2f},{B[1,2]:+.2f}] | x sd {X[near].std(0).round(3)}")
    json.dump(dict(T0=T0, kind="linT", tau=tau, W=W.tolist(), n=int(near.sum()), note="open-loop identification ident_v2_s1, sensor ξ, near-nominal"), open(f"../json/model0_tau{tau}.json", "w"))
