# fit the orbit step map with state variety (e6), at the step start (view) and at τ = 0.1 (view10); LQR design + linear closed-loop check
import json, sys, numpy as np
from scipy.linalg import solve_discrete_are
tag = sys.argv[1] if len(sys.argv) > 1 else "orbitpush"
rows = json.load(open(f"../json/sb_e6_{tag}.json"))["rows"]
ok = [r for r in rows if r.get("reached") and r["swing"]["landed"] and r.get("next") and r["next"].get("view") and r["land"].get("ach")]
print("landed with next:", len(ok), "of", len(rows))
def st(v): return [v["xi"][0], v["vF"], v["xi"][1], v["vL"]]
Y = np.array([st(r["next"]["view"]) for r in ok]); U = np.array([[r["land"]["ach"][0], r["land"]["ach"][1], r["case"]["req"][2]] for r in ok]); g = np.array([r["case"]["K"] * 100 + hash(json.dumps(r["case"].get("push"))) % 97 for r in ok])
def cv(X, Y, g):
    ug = np.unique(g); rng = np.random.default_rng(0); rng.shuffle(ug); E = []
    for f in range(5):
        te = np.isin(g, ug[f::5]); W, *_ = np.linalg.lstsq(X[~te], Y[~te], rcond=None); E.append(Y[te] - X[te] @ W)
    return np.sqrt((np.vstack(E) ** 2).mean(0))
out = {}
for nm, key in [("t0", "view"), ("t10", "view10")]:
    S = np.array([st(r["dec"][key]) for r in ok]); X = np.hstack([np.ones((len(S), 1)), S, U]); W, *_ = np.linalg.lstsq(X, Y, rcond=None)
    A, B, c = W[1:5].T, W[5:8].T, W[0]; print(f"\n{nm}: state sd {np.round(S.std(0), 3)} | CV rms {np.round(cv(X, Y, g), 3)} | open-loop eig {np.round(np.linalg.eigvals(A), 2)}")
    print("A", np.round(A, 2).tolist()); print("B", np.round(B, 2).tolist())
    out[nm] = {"A": A.tolist(), "B": B.tolist(), "c": c.tolist(), "rms": cv(X, Y, g).tolist()}
json.dump(out, open(f"../json/orbit_model_{tag}.json", "w"))
