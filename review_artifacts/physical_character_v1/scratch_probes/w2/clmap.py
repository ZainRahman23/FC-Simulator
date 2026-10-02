# the CLOSED-LOOP step-to-step map from walking data: x_{k+1} = c + A_cl x_k over consecutive upright step starts (k ≥ 1), excluding the last
# two steps before each fall (the failure itself); eigenvalues of A_cl, residual, and the stationary spread
import json, sys, numpy as np
for f in sys.argv[1:]:
    D = json.load(open(f)); X = []; Y = []
    for s in D["starts"]:
        st = [q for q in s["steps"] if q["k"] >= 1]; n = len(st)
        for i in range(n - 3):
            a, b = st[i], st[i + 1]
            if a["upright"] and b["upright"]: X.append(a["x"]); Y.append(b["x"])
    X = np.array(X); Y = np.array(Y); F = np.hstack([np.ones((len(X), 1)), X]); W, *_ = np.linalg.lstsq(F, Y, rcond=None); E = Y - F @ W; A = W[1:].T
    ev = np.linalg.eigvals(A); xs = np.linalg.solve(np.eye(2) - A, W[0])
    print(f"{f.split('/')[-1]}: pairs {len(X)} · A_cl [[{A[0,0]:+.2f}, {A[0,1]:+.2f}], [{A[1,0]:+.2f}, {A[1,1]:+.2f}]] · eigenvalues {np.round(ev, 2)} |λ|max {np.abs(ev).max():.2f} · residual {E.std(0).round(3)} · fixed point {xs.round(3)} · state sd {X.std(0).round(3)}")
