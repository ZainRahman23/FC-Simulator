# fit the wide step map (e7) with a 6-D state (ξf, vf, ξl, vl, swing foot fwd / lat) and design the regulator; linear Monte Carlo check
import json, sys, numpy as np
from scipy.linalg import solve_discrete_are
tag = sys.argv[1] if len(sys.argv) > 1 else "wide"
rows = json.load(open(f"../json/sb_e7_{tag}.json"))["rows"]
ok = [r for r in rows if r.get("reached") and r["swing"]["landed"] and r.get("next") and r["next"].get("view") and r["land"].get("ach")]
def st6(v): return [v["xi"][0], v["vF"], v["xi"][1], v["vL"], v["swFoot"][0], v["swFoot"][1]]
def st4(v): return [v["xi"][0], v["vF"], v["xi"][1], v["vL"]]
# the next state's swing-foot position = the foot that will swing next = this step's stance foot, relative to the new stance foot (≈ −step)
def nxt6(r): n = r["next"]["view"]; a = r["land"]["ach"]; return st4(n) + [-a[0], a[1]]
g = np.array([hash((r["case"]["start"], r["case"]["K"], json.dumps(r["case"].get("push")))) % 100003 for r in ok])
def cv(X, Y, g):
    ug = np.unique(g); rng = np.random.default_rng(0); rng.shuffle(ug); E = []
    for f in range(5):
        te = np.isin(g, ug[f::5]); W, *_ = np.linalg.lstsq(X[~te], Y[~te], rcond=None); E.append(Y[te] - X[te] @ W)
    return np.sqrt((np.vstack(E) ** 2).mean(0))
U = np.array([[r["land"]["ach"][0], r["land"]["ach"][1], r["case"]["req"][2]] for r in ok])
S4 = np.array([st4(r["dec"]["view"]) for r in ok]); Y4 = np.array([st4(r["next"]["view"]) for r in ok]); X4 = np.hstack([np.ones((len(ok), 1)), S4, U]); print("n", len(ok), "| 4-D CV", np.round(cv(X4, Y4, g), 3))
S6 = np.array([st6(r["dec"]["view"]) for r in ok]); Y6 = np.array([nxt6(r) for r in ok]); X6 = np.hstack([np.ones((len(ok), 1)), S6, U]); c6 = cv(X6, Y6, g); print("6-D CV", np.round(c6, 3))
W, *_ = np.linalg.lstsq(X6, Y6, rcond=None); A, B, c = W[1:7].T, W[7:10].T, W[0]
# (the swing-foot rows are kinematic: next swf = −df, swl = dl — overwrite with the exact relation)
A[4] = 0; A[5] = 0; B[4] = [-1, 0, 0]; B[5] = [0, 1, 0]; c[4] = 0; c[5] = 0
print("open-loop eig", np.round(np.linalg.eigvals(A), 2))
# operating point: the orbit (L@0.6 steps ≥ 14, own decisions not in this file → mean of design rows near the orbit request)
s0 = np.array([-0.028, 0.439, 0.108, -0.146, -0.257, 0.268]); u0 = np.array([0.257, 0.268, 0.385]); bias = A @ s0 + B @ u0 + c - s0; print("bias at the orbit", np.round(bias, 3)); cb = c - bias
rms = np.array(list(c6[:4]) + [0.01, 0.01])
def sim(K, seed, n=60, lo=(-0.10, 0.20, 0.30), hi=(0.45, 0.40, 0.54)):
    rng = np.random.default_rng(seed); s = s0.copy(); sat = 0; Us = []
    for k in range(n):
        u = u0 - K @ (s - s0); uc = np.clip(u, lo, hi); sat += np.any(np.abs(uc - u) > 1e-9); Us.append(uc); s = A @ s + B @ uc + cb + rng.standard_normal(6) * rms
        if abs(s[0] - s0[0]) > 0.25 or abs(s[2] - s0[2]) > 0.25: return k, sat, np.array(Us)
    return n, sat, np.array(Us)
out = {}
for nm, q, r in [("W1", [0.02, 0.05, 0.02, 0.1, 0.1, 0.1], [0.06, 0.05, 0.03]), ("W2", [0.03, 0.08, 0.03, 0.2, 0.2, 0.2], [0.08, 0.06, 0.04]), ("W3", [0.04, 0.1, 0.03, 0.2, 0.2, 0.2], [0.1, 0.06, 0.05])]:
    Q, R = np.diag(1 / np.array(q) ** 2), np.diag(1 / np.array(r) ** 2); P = solve_discrete_are(A, B, Q, R); K = np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A)
    runs = [sim(K, sd) for sd in range(300)]; full = np.mean([x[0] == 60 for x in runs]); sat = np.mean([x[1] / max(1, x[0]) for x in runs]); Us = np.vstack([x[2] for x in runs])
    print(f"{nm}: |eig| {np.round(np.abs(np.linalg.eigvals(A - B @ K)), 2)} | 60-step {full*100:.0f}% | sat {sat*100:.0f}% | input sd {np.round(Us.std(0), 3)}")
    out[nm] = {"K": np.round(K, 4).tolist(), "s0": s0.round(4).tolist(), "u0": u0.round(4).tolist(), "state": ["xf", "vf", "xl", "vl", "swf", "swl"]}
json.dump(out, open(f"../json/lqr_gains_{tag}.json", "w"))
