# LQR on the step-to-step model identified around the steady orbit (state at the step start from the view: ξf, vf, ξl, vl; inputs: df, dl, T)
import json, sys, numpy as np
from scipy.linalg import solve_discrete_are
M = json.load(open("../json/orbit_model.json")); A, B, c, rms = np.array(M["A"]), np.array(M["B"]), np.array(M["c"]), np.array(M["rms"])
def design(q, r):
    Q, R = np.diag(1 / np.array(q) ** 2), np.diag(1 / np.array(r) ** 2); P = solve_discrete_are(A, B, Q, R); K = np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A); return K
def equilibrium(vd, Tstar=0.385, dlStar=None):
    # s* = A s* + B u* + c with vf* = vd, T* = Tstar (dl* free unless given): unknowns ξf, ξl, vl, df, dl → 4 equations + vf constraint
    # solve [I − A, −B] [s; u] = c with vf = vd and T = Tstar fixed: unknowns x = [ξf, ξl, vl, df, dl]
    I = np.eye(4); Mx = np.hstack([I - A, -B]); cols = [0, 2, 3, 4, 5]; fixed = {1: vd, 6: Tstar}
    rhs = c - sum(Mx[:, j] * v for j, v in fixed.items()); sol, *_ = np.linalg.lstsq(Mx[:, cols], rhs, rcond=None)
    s = np.array([sol[0], vd, sol[1], sol[2]]); u = np.array([sol[3], sol[4], Tstar]); return s, u
def simulate(K, s0, u0, n=60, seed=0, lo=(-0.10, 0.20, 0.30), hi=(0.45, 0.40, 0.54)):
    rng = np.random.default_rng(seed); s = s0.copy(); sat = 0; U = []
    for k in range(n):
        u = u0 - K @ (s - s0); uc = np.clip(u, lo, hi); sat += np.any(np.abs(uc - u) > 1e-9); U.append(uc)
        s = A @ s + B @ uc + c + rng.standard_normal(4) * rms
        if abs(s[0] - s0[0]) > 0.3 or abs(s[2] - s0[2]) > 0.3: return k, sat, np.array(U)
    return n, sat, np.array(U)
if __name__ == "__main__":
    for vd in (0.44, 0.5):
        s0, u0 = equilibrium(vd); print(f"vd {vd}: equilibrium s* {np.round(s0, 3)} u* {np.round(u0, 3)}")
    s0, u0 = equilibrium(0.44)
    for q, r in [([0.02, 0.05, 0.02, 0.1], [0.06, 0.05, 0.03]), ([0.02, 0.05, 0.02, 0.1], [0.10, 0.08, 0.05]), ([0.03, 0.08, 0.02, 0.2], [0.06, 0.04, 0.03]), ([0.02, 0.03, 0.015, 0.1], [0.08, 0.06, 0.04])]:
        K = design(q, r); ev = np.linalg.eigvals(A - B @ K); runs = [simulate(K, s0, u0, seed=sd) for sd in range(200)]
        surv = np.mean([x[0] for x in runs]); full = np.mean([x[0] == 60 for x in runs]); sat = np.mean([x[1] / max(1, x[0]) for x in runs]); Us = np.vstack([x[2] for x in runs])
        print(f"q {q} r {r}: |eig| max {np.abs(ev).max():.2f} | 60-step survival {full*100:.0f}% (mean {surv:.1f}) | saturated decisions {sat*100:.0f}% | input sd {np.round(Us.std(0), 3)}")
        print("   K =", np.round(K, 2).tolist())
