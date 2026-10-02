# LQR on the pushed orbit model; centred on the observed orbit; linear closed-loop Monte Carlo with the CV noise and the input bounds
import json, sys, numpy as np
from scipy.linalg import solve_discrete_are
M = json.load(open("../json/orbit_model_orbitpush.json"))
rows = json.load(open("../json/sb_e5_orbit2.json"))["rows"]; own = [r for r in rows if not r["case"].get("req") and r.get("reached") and r["land"].get("ach")]
s0 = np.array([[r["dec"]["view"]["xi"][0], r["dec"]["view"]["vF"], r["dec"]["view"]["xi"][1], r["dec"]["view"]["vL"]] for r in own]).mean(0); u0 = np.array([[r["land"]["ach"][0], r["land"]["ach"][1], r["dec"]["T"]] for r in own]).mean(0)
def sim(A, B, c, rms, K, n=60, seed=0, lo=(-0.10, 0.20, 0.30), hi=(0.45, 0.40, 0.54)):
    rng = np.random.default_rng(seed); s = s0.copy(); sat = 0; U = []
    for k in range(n):
        u = u0 - K @ (s - s0); uc = np.clip(u, lo, hi); sat += np.any(np.abs(uc - u) > 1e-9); U.append(uc); s = A @ s + B @ uc + c + rng.standard_normal(4) * rms
        if abs(s[0] - s0[0]) > 0.25 or abs(s[2] - s0[2]) > 0.25: return k, sat, np.array(U)
    return n, sat, np.array(U)
def run(key, designs):
    A, B, c, rms = (np.array(M[key][k]) for k in ("A", "B", "c", "rms")); cb = c - (A @ s0 + B @ u0 + c - s0); out = {}
    print(f"{key}: bias at the orbit {np.round(A @ s0 + B @ u0 + c - s0, 3)}")
    for nm, q, r in designs:
        Q, R = np.diag(1 / np.array(q) ** 2), np.diag(1 / np.array(r) ** 2); P = solve_discrete_are(A, B, Q, R); K = np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A)
        ev = np.linalg.eigvals(A - B @ K); runs = [sim(A, B, cb, rms, K, seed=sd) for sd in range(300)]
        full = np.mean([x[0] == 60 for x in runs]); sat = np.mean([x[1] / max(1, x[0]) for x in runs]); Us = np.vstack([x[2] for x in runs])
        print(f"  {nm} q {q} r {r}: |eig| {np.round(np.abs(ev), 2)} | 60-step survival {full*100:.0f}% | saturated {sat*100:.0f}% | input sd {np.round(Us.std(0), 3)}")
        out[nm] = {"K": np.round(K, 4).tolist(), "s0": np.round(s0, 4).tolist(), "u0": np.round(u0, 4).tolist()}
    return out
D = [("P1", [0.02, 0.05, 0.02, 0.1], [0.06, 0.05, 0.03]), ("P2", [0.03, 0.08, 0.03, 0.2], [0.08, 0.06, 0.04]), ("P3", [0.04, 0.1, 0.03, 0.2], [0.1, 0.06, 0.05]), ("P4", [0.02, 0.05, 0.015, 0.1], [0.1, 0.04, 0.06])]
G = {"t0": run("t0", D), "t10": run("t10", D)}; json.dump(G, open("../json/lqr_gains2.json", "w"))
