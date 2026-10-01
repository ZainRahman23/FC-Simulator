# Controller A's measured maps x(τ) → x'(0) (sensor ξ, mirrored), conditioned on T, from open-loop + closed-loop identification runs
# usage: python3 fit_maps.py out_prefix file1.json [file2.json ...]
import json, sys, numpy as np
out_pre = sys.argv[1]; files = sys.argv[2:]; T0 = 0.42; TAUS = (0, 0.1, 0.15, 0.2, 0.25)
def rows(D, tau, src):
    out = []
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}; pu = run["push"]
        for k in sorted(R):
            if k < 1: continue
            a, b = R.get(k), R.get(k + 1)
            if not a or not b or not b["atStart"] or not b["upright"] or not a["atStart"]: continue
            if pu and pu["step"] == k: continue
            if a["lift"] is None or a["td"] is None or a["td"] - a["lift"] < 0.2: continue
            s = a["atStart"] if tau == 0 else (a.get("atDec") or {}).get(str(tau))
            if not s or s.get("xiS") is None or b["atStart"].get("xiS") is None: continue
            u = run["steps"].get(str(k)) or run["steps"].get(k)
            if not u: continue
            out.append((src, run["i"], k, s["xiS"], [u["df"], u["dl"], u["T"]], b["atStart"]["xiS"]))
    return out
Ds = [(json.load(open(f)), i) for i, f in enumerate(files)]
def feats(X, U, kind):
    n = len(X); one = np.ones((n, 1)); dT = U[:, 2:3] - T0
    base = [one, X, U, X * dT, U[:, :2] * dT]
    if kind == "linT": return np.hstack(base)
    if kind == "quad": return np.hstack(base + [X ** 2, X[:, :1] * X[:, 1:2], U[:, :2] ** 2, U[:, :1] * U[:, 1:2], X * U[:, :1], X * U[:, 1:2], dT ** 2])
for tau in TAUS:
    Rw = sum((rows(D, tau, i) for D, i in Ds), [])
    X = np.array([r[3] for r in Rw]); U = np.array([r[4] for r in Rw]); Y = np.array([r[5] for r in Rw]); src = np.array([r[0] for r in Rw]); rid = np.array([r[0] * 100000 + r[1] for r in Rw])
    ok = (np.abs(Y).max(1) < 0.3) & (np.abs(X).max(1) < 0.4)                       # (the walking region; beyond it the body is already falling)
    res = {}
    for kind in ("linT", "quad"):
        F = feats(X, U, kind); ur = np.unique(rid[ok]); rng = np.random.default_rng(0); rng.shuffle(ur); E = []
        for f in range(5):
            te = ok & np.isin(rid, ur[f::5]); tr = ok & ~np.isin(rid, ur[f::5]); W, *_ = np.linalg.lstsq(F[tr], Y[tr], rcond=None); E.append(Y[te] - F[te] @ W)
        E = np.vstack(E); res[kind] = np.sqrt((E ** 2).mean(0))
    F = feats(X, U, "linT"); W, *_ = np.linalg.lstsq(F[ok], Y[ok], rcond=None)
    A = W[1:3].T; ev = np.linalg.eigvals(A)
    print(f"τ {tau:.2f}: n {ok.sum():4d} (closed-loop {np.sum(ok & (src > 0))}) | CV rms linT {res['linT'].round(3)} quad {res['quad'].round(3)} | A eig {np.round(ev, 2)} | x mean {X[ok].mean(0).round(3)} sd {X[ok].std(0).round(3)}")
    json.dump(dict(T0=T0, kind="linT", tau=tau, W=W.tolist(), n=int(ok.sum()), files=files), open(f"../json/{out_pre}{tau}.json", "w"))
