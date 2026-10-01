import json, numpy as np
D = json.load(open("../json/ident_cl1.json")); T0 = 0.42; R_ = []
for run in D["runs"]:
    R = {r["k"]: r for r in run["rows"]}; pu = run["push"]
    for k in sorted(R):
        a, b = R.get(k), R.get(k + 1)
        if k < 1 or not a or not b or not b["atStart"] or not b["upright"] or not a["atStart"]: continue
        if pu and pu["step"] == k: continue
        if a["lift"] is None or a["td"] is None or a["td"] - a["lift"] < 0.2 or not a["foothold"] or a.get("ds") is None: continue
        s = (a.get("atDec") or {}).get("0.15");
        if not s: continue
        u = run["steps"][str(k)]; fh = a["foothold"]
        R_.append(dict(x=s["xiS"], x0=a["atStart"]["xiS"], u=[u["df"], u["dl"], u["T"]], y=b["atStart"]["xiS"], fh=[fh[0], -fh[1]], ds=a["ds"], sw=a["td"] - a["lift"], yaw=a["atStart"]["yaw"], yr=a["atStart"]["yawRate"], yawTd=a["atTd"]["yaw"] if a["atTd"] else 0, vS=a["atStart"]["v"][:2], tdx=a["atTd"]["xiS"] if a["atTd"] and a["atTd"].get("xiS") else None))
X = np.array([r["x"] for r in R_]); U = np.array([r["u"] for r in R_]); Y = np.array([r["y"] for r in R_]); FH = np.array([r["fh"] for r in R_])
ok = (np.abs(Y).max(1) < 0.3) & (np.abs(X).max(1) < 0.4); X, U, Y, FH = X[ok], U[ok], Y[ok], FH[ok]; RR = [r for r, o in zip(R_, ok) if o]
DS = np.array([r["ds"] for r in RR])[:, None]; SW = np.array([r["sw"] for r in RR])[:, None]; YAW = np.array([[r["yaw"], r["yr"], r["yawTd"]] for r in RR])
dT = U[:, 2:3] - T0; one = np.ones((len(X), 1))
def rms(F): W, *_ = np.linalg.lstsq(F, Y, rcond=None); E = Y - F @ W; return np.sqrt((E ** 2).mean(0)).round(4)
base = [one, X, U, X * dT, U[:, :2] * dT]
print("n", len(X)); print("commanded u (model)            ", rms(np.hstack(base)))
print("width/forward execution error  ", "fwd", np.round(np.std(FH[:, 0] - U[:, 0]), 3), "width", np.round(np.std(FH[:, 1] - U[:, 1]), 3), "mean", np.round(np.mean(FH - U[:, :2], 0), 3))
print("+ achieved foothold            ", rms(np.hstack(base + [FH])))
print("+ achieved foothold + DS + swing", rms(np.hstack(base + [FH, DS, SW])))
print("+ yaw state (start, rate, at td)", rms(np.hstack(base + [YAW])))
print("+ all                          ", rms(np.hstack(base + [FH, DS, SW, YAW])))
print("DS sd", np.std(DS).round(3), "swing sd", np.std(SW).round(3))
# 4-D state: COM offset + COM velocity at τ (and at the start)
def st4(r, key):
    return None
C4 = []; keep = []
D2 = D
for run in D2["runs"]:
    R = {r["k"]: r for r in run["rows"]}; pu = run["push"]
    for k in sorted(R):
        a, b = R.get(k), R.get(k + 1)
        if k < 1 or not a or not b or not b["atStart"] or not b["upright"] or not a["atStart"]: continue
        if pu and pu["step"] == k: continue
        if a["lift"] is None or a["td"] is None or a["td"] - a["lift"] < 0.2 or not a["foothold"] or a.get("ds") is None: continue
        s = (a.get("atDec") or {}).get("0.15")
        if not s: continue
        C4.append(s["com"][:2] + s["v"][:2] + [s["yaw"], s["yawRate"]] + s["pelvis"][:2] + s["pelvisV"][:2])
C4 = np.array(C4)[ok]
print("ξ only (τ 0.15)                  ", rms(np.hstack(base)))
print("+ COM offset & velocity (4-D)    ", rms(np.hstack(base + [C4[:, :4]])))
print("+ pelvis offset & velocity       ", rms(np.hstack(base + [C4[:, :4], C4[:, 6:10]])))
print("+ yaw, yaw rate                  ", rms(np.hstack(base + [C4[:, :6], C4[:, 6:10]])))
