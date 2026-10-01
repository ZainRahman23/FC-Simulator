import json, numpy as np, sys
exec(open("ident_fit.py").read().split("Tr = trans(D)")[0])
Tr = trans(D)
X = np.array([t["x"] for t in Tr]); Uu = np.array([t["u"] for t in Tr]); Y = np.array([t["x1"] for t in Tr]); runs = np.array([t["run"] for t in Tr]); K = np.array([t["k"] for t in Tr])
Vv = np.array([t["v"] for t in Tr]); sw = np.array([t["swing"] for t in Tr]); ds = np.array([t["ds"] or np.nan for t in Tr]); fh = np.array([t["fh"] for t in Tr])
F = np.hstack([np.ones((len(X), 1)), X, Uu]); W, *_ = np.linalg.lstsq(F, Y, rcond=None); E = Y - F @ W
print("abs residual percentiles fwd", np.percentile(np.abs(E[:, 0]), [50, 75, 90, 98]).round(3), "inward", np.percentile(np.abs(E[:, 1]), [50, 75, 90, 98]).round(3))
# foothold execution error: achieved vs commanded
dfe = fh[:, 0] - Uu[:, 0]; dle = fh[:, 1] - Uu[:, 1]
print("foothold error fwd p10/50/90", np.percentile(dfe, [10, 50, 90]).round(3), "width", np.percentile(dle, [10, 50, 90]).round(3))
# residual vs achieved foothold: refit with ACHIEVED foothold instead of commanded
F2 = np.hstack([np.ones((len(X), 1)), X, fh, Uu[:, 2:3]]); W2, *_ = np.linalg.lstsq(F2, Y, rcond=None); E2 = Y - F2 @ W2
print("with achieved foothold: rms", np.sqrt((E2 ** 2).mean(0)).round(3))
# + swing duration and DS
ok = ~np.isnan(ds); F3 = np.hstack([np.ones((ok.sum(), 1)), X[ok], fh[ok], sw[ok, None], ds[ok, None]]); W3, *_ = np.linalg.lstsq(F3, Y[ok], rcond=None); E3 = Y[ok] - F3 @ W3
print("with achieved foothold + swing + ds: rms", np.sqrt((E3 ** 2).mean(0)).round(3))
# by step index
for k in (1, 2, 3): m = K == k; print("k", k, "n", m.sum(), "rms", np.sqrt((E[m] ** 2).mean(0)).round(3), "x mean", X[m].mean(0).round(3), "x sd", X[m].std(0).round(3))
# near-nominal subset: |x - median| small and u near centre
xm = np.median(X, 0); near = (np.abs(X[:, 0] - xm[0]) < 0.05) & (np.abs(X[:, 1] - xm[1]) < 0.05)
Fn = F[near]; Wn, *_ = np.linalg.lstsq(Fn, Y[near], rcond=None); En = Y[near] - Fn @ Wn
print("near-nominal subset n", near.sum(), "rms", np.sqrt((En ** 2).mean(0)).round(3), "A", Wn[1:3].T.round(2).tolist(), "B", Wn[3:6].T.round(2).tolist())
# the swing duration actually executed vs commanded T
print("swing/T p10/50/90", np.percentile(sw / Uu[:, 2], [10, 50, 90]).round(2), "corr(swing,T)", np.corrcoef(sw, Uu[:, 2])[0, 1].round(2))
