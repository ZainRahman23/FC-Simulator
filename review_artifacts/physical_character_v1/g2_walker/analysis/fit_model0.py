import json, numpy as np
exec(open("ident_fit.py").read().split("Tr = trans(D)")[0])
Tr = trans(D); X = np.array([t["x"] for t in Tr]); U = np.array([t["u"] for t in Tr]); Y = np.array([t["x1"] for t in Tr])
xm = np.median(X, 0); near = (np.abs(X[:, 0] - xm[0]) < 0.06) & (np.abs(X[:, 1] - xm[1]) < 0.06) & (np.abs(Y[:, 0]) < 0.25) & (np.abs(Y[:, 1]) < 0.25)
T0 = 0.42; dT = U[:, 2:3] - T0; F = np.hstack([np.ones((len(X), 1)), X, U, X * dT, U[:, :2] * dT])
W, *_ = np.linalg.lstsq(F[near], Y[near], rcond=None); E = Y[near] - F[near] @ W
print("n", near.sum(), "rms", np.sqrt((E ** 2).mean(0)).round(3))
json.dump(dict(T0=T0, kind="linT", W=W.tolist(), n=int(near.sum()), note="model0: open-loop identification (ident_v2_s1), near-nominal transitions"), open("../json/model0.json", "w"))
print(json.dumps(np.round(W, 4).tolist()))
