# G2b walker: fit Controller A's measured step map from the identification runs (tools/g2walk_ident.js)
#   x  = capture-point offset from the stance foot at the step's DECISION instant (forward, inward-mirrored)   [+ optionally COM velocity]
#   u  = commanded forward foothold df, width dl, single-support duration T
#   x' = the same state at the next step's decision instant
import json, sys, numpy as np
P = sys.argv[1] if len(sys.argv) > 1 else "../json/ident_v2_s1.json"
D = json.load(open(P))
def trans(D, minSwing=0.25):
    out = []
    for run in D["runs"]:
        rows = {r["k"]: r for r in run["rows"]}; pushed = run["push"] is not None
        for k in (1, 2, 3):
            a, b = rows.get(k), rows.get(k + 1)
            if not a or not b or not a["atStart"] or not b["atStart"] or not b["upright"]: continue
            if pushed and k == run["push"]["step"]: continue                   # (the push acts inside this transition)
            if a["lift"] is None or a["td"] is None or a["td"] - a["lift"] < minSwing: continue
            u = run["steps"][str(k)]
            out.append(dict(run=run["i"], k=k, x=a["atStart"]["xi"], v=a["atStart"]["v"][:2], com=a["atStart"]["com"][:2], yaw=a["atStart"]["yaw"], yr=a["atStart"]["yawRate"],
                            u=[u["df"], u["dl"], u["T"]], x1=b["atStart"]["xi"], v1=b["atStart"]["v"][:2], fh=a["foothold"], ds=a["ds"], swing=a["td"] - a["lift"]))
    return out
Tr = trans(D)
nRuns = len(D["runs"]); print(f"runs {nRuns} · usable transitions {len(Tr)}")
X = np.array([t["x"] for t in Tr]); Uu = np.array([t["u"] for t in Tr]); Y = np.array([t["x1"] for t in Tr]); runs = np.array([t["run"] for t in Tr])
Vv = np.array([t["v"] for t in Tr]); C = np.array([t["com"] for t in Tr]); Yaw = np.array([[t["yaw"], t["yr"]] for t in Tr])
T0 = 0.42
def feats(X, U, kind, Vv=None, C=None, Yaw=None):
    n = len(X); one = np.ones((n, 1)); dT = (U[:, 2:3] - T0)
    if kind == "lin": return np.hstack([one, X, U])
    if kind == "linT": return np.hstack([one, X, U, X * dT, U[:, :2] * dT])
    if kind == "linT2": return np.hstack([one, X, U, X * dT, U[:, :2] * dT, dT ** 2, X ** 2, X[:, :1] * X[:, 1:2], U[:, :1] * X[:, :1], U[:, 1:2] * X[:, 1:2]])
    if kind == "comv": return np.hstack([one, C, Vv, U, C * dT, Vv * dT, U[:, :2] * dT])
    if kind == "linTyaw": return np.hstack([one, X, U, X * dT, U[:, :2] * dT, Yaw])
def cv(kind, folds=5):
    F = feats(X, Uu, kind, Vv, C, Yaw); ur = np.unique(runs); rng = np.random.default_rng(0); rng.shuffle(ur); errs = []
    for f in range(folds):
        te = np.isin(runs, ur[f::folds]); W, *_ = np.linalg.lstsq(F[~te], Y[~te], rcond=None); errs.append(Y[te] - F[te] @ W)
    E = np.vstack(errs); return np.sqrt((E ** 2).mean(0))
for kind in ("lin", "linT", "linT2", "comv", "linTyaw"):
    r = cv(kind); print(f"{kind:8s} CV rms residual  fwd {r[0]*100:.2f} cm  inward {r[1]*100:.2f} cm")
# the T-conditioned linear model (linT): A(T), B(T) at T = 0.36 … 0.48
F = feats(X, Uu, "linT"); W, *_ = np.linalg.lstsq(F, Y, rcond=None)
def AB(T):
    dT = T - T0; c = W[0] + 0 * dT
    A = (W[1:3] + W[6:8] * dT).T       # rows = outputs
    B = np.vstack([W[3:5].T.T + W[8:10] * dT, W[5]]).T if False else None
    Ax = (W[1:3] + dT * W[6:8]).T; Bdf_dl = (W[3:5] + dT * W[8:10]).T; BT = W[5]
    return W[0], Ax, Bdf_dl, BT
for T in (0.36, 0.40, 0.44, 0.48):
    c, A, B, BT = AB(T); ev = np.linalg.eigvals(A)
    print(f"T {T:.2f}: A = [[{A[0,0]:+.2f}, {A[0,1]:+.2f}], [{A[1,0]:+.2f}, {A[1,1]:+.2f}]]  eig {np.round(ev,2)}  B(df,dl) = [[{B[0,0]:+.2f}, {B[0,1]:+.2f}], [{B[1,0]:+.2f}, {B[1,1]:+.2f}]]  B_T = [{BT[0]:+.2f}, {BT[1]:+.2f}]")
# data coverage
print("x range fwd", np.percentile(X[:, 0], [5, 50, 95]).round(3), "inward", np.percentile(X[:, 1], [5, 50, 95]).round(3))
print("ds p10/50/90", np.percentile([t["ds"] for t in Tr if t["ds"]], [10, 50, 90]).round(3), "swing", np.percentile([t["swing"] for t in Tr], [10, 50, 90]).round(3))
# per-run step survival
import collections; cnt = collections.Counter(); 
for run in D["runs"]: cnt[sum(1 for r in run["rows"] if r["upright"] and r["td"] is not None)] += 1
print("landed-upright steps per run:", dict(sorted(cnt.items())))
json.dump(dict(T0=T0, kind="linT", W=W.tolist(), n=len(Tr)), open("../json/model_linT_v2_s1.json", "w"))
