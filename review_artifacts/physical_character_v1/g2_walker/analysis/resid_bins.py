import json, numpy as np
exec(open("fit_maps.py").read().split("for tau in TAUS:")[0].replace("out_pre = sys.argv[1]; files = sys.argv[2:]", "files = ['../json/ident_v2_s1.json', '../json/ident_cl1.json']"))
tau = 0.15; Rw = sum((rows(D, tau, i) for D, i in Ds), [])
X = np.array([r[3] for r in Rw]); U = np.array([r[4] for r in Rw]); Y = np.array([r[5] for r in Rw]); ok = (np.abs(Y).max(1) < 0.3) & (np.abs(X).max(1) < 0.4)
F = feats(X, U, "linT"); W, *_ = np.linalg.lstsq(F[ok], Y[ok], rcond=None); E = Y - F @ W
print("lateral residual (mean ± sd) by commanded width:")
for a, b in [(0.15, 0.19), (0.19, 0.23), (0.23, 0.27), (0.27, 0.31), (0.31, 0.36)]:
    m = ok & (U[:, 1] >= a) & (U[:, 1] < b); print(f"  dl {a:.2f}–{b:.2f}: n {m.sum():4d} resid {E[m,1].mean()*100:+.1f} ± {E[m,1].std()*100:.1f} cm   fwd {E[m,0].mean()*100:+.1f} ± {E[m,0].std()*100:.1f}")
print("lateral residual by inward state x_l(τ):")
qs = np.percentile(X[ok, 1], [0, 20, 40, 60, 80, 100])
for a, b in zip(qs[:-1], qs[1:]):
    m = ok & (X[:, 1] >= a) & (X[:, 1] <= b); print(f"  x_l {a:.3f}–{b:.3f}: n {m.sum():4d} resid {E[m,1].mean()*100:+.1f} ± {E[m,1].std()*100:.1f} cm")
print("lateral residual by T:")
for a, b in [(0.34, 0.38), (0.38, 0.42), (0.42, 0.46), (0.46, 0.51)]:
    m = ok & (U[:, 2] >= a) & (U[:, 2] < b); print(f"  T {a:.2f}–{b:.2f}: n {m.sum():4d} resid {E[m,1].mean()*100:+.1f} ± {E[m,1].std()*100:.1f} cm")
# local slope dx_l'/d dl in bins of dl (partial residual)
print("partial slope of x_l' on dl by dl bin (from residual + model term):")
for a, b in [(0.15, 0.21), (0.21, 0.27), (0.27, 0.36)]:
    m = ok & (U[:, 1] >= a) & (U[:, 1] < b); pr = E[m, 1] + U[m, 1] * W[4, 1]; c = np.polyfit(U[m, 1], pr, 1); print(f"  dl {a:.2f}–{b:.2f}: slope {c[0]:+.2f}")
