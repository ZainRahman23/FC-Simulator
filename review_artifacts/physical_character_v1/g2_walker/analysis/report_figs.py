# G2b walker review figures (from eval/*.json — tools/g2walk_eval.js — and the identification data json/ident_*.json)
import json, os, numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
H = os.path.dirname(os.path.abspath(__file__)); EV = os.path.join(H, "../eval"); JS = os.path.join(H, "../json"); FIG = os.path.join(H, "../fig"); os.makedirs(FIG, exist_ok=True)
L = lambda k: json.load(open(os.path.join(EV, k + ".json")))
runs = {"old G2b (Option 1)": L("G2b_dbg"), "Controller B (SIMBICON-style)": L("G2W_B8"), "Controller A (measured response)": L("G2W_A8")}
col = {"old G2b (Option 1)": "#888888", "Controller B (SIMBICON-style)": "#d9822b", "Controller A (measured response)": "#2b7bd9"}
plt.rcParams.update({"font.size": 9})

# W1 survival
fig, ax = plt.subplots(figsize=(8, 3.2)); w = 0.26
for i, (nm, D) in enumerate(runs.items()):
    ups = [s["upright"] for s in D["starts"]]; xs = np.arange(len(ups)) + (i - 1) * w
    ax.bar(xs, ups, w, color=col[nm], label=f"{nm}: mean {np.mean(ups):.1f}")
ax.set_xticks(range(6)); ax.set_xticklabels([f"{s['first']}@{s['at']}" for s in runs["Controller A (measured response)"]["starts"]]); ax.set_ylabel("steps landed before the fall"); ax.axhline(30, color="k", lw=0.5, ls=":")
ax.set_title("Upright steps from six deterministic starts (30 requested; fall-aware: COM < 0.75 m ends the count)"); ax.legend(fontsize=8, loc="upper right"); fig.tight_layout(); fig.savefig(os.path.join(FIG, "W1_survival.png"), dpi=130); plt.close(fig)

# W2 step-start states over the walk (A and B), and W3 closed-loop step-to-step map
def pairs(D):
    X, Y = [], []
    for s in D["starts"]:
        st = [q for q in s["steps"] if q["k"] >= 1]
        for i in range(len(st) - 3):
            if st[i]["upright"] and st[i + 1]["upright"]: X.append(st[i]["x"]); Y.append(st[i + 1]["x"])
    return np.array(X), np.array(Y)
fig, axs = plt.subplots(2, 2, figsize=(10, 6), sharex=True)
for j, nm in enumerate(["Controller A (measured response)", "Controller B (SIMBICON-style)"]):
    for s in runs[nm]["starts"]:
        st = [q for q in s["steps"] if q["k"] >= 1]; k = [q["k"] for q in st]
        axs[0, j].plot(k, [q["x"][0] for q in st], "-o", ms=2.5, lw=0.8, color=col[nm]); axs[1, j].plot(k, [q["x"][1] for q in st], "-o", ms=2.5, lw=0.8, color=col[nm])
    axs[0, j].set_title(nm); axs[0, j].set_ylabel("forward capture-point offset (m)"); axs[1, j].set_ylabel("inward capture-point offset (m)"); axs[1, j].set_xlabel("step")
    axs[0, j].axhspan(0.0, 0.15, color="g", alpha=0.07); axs[0, j].set_ylim(-0.4, 0.8); axs[1, j].set_ylim(-0.4, 0.6); axs[1, j].axhspan(0.03, 0.14, color="g", alpha=0.07)
fig.suptitle("The state at each step's decision instant (6 starts each). Green: the walkable band (forward: no stall / no C8; inward: recoverable widths)")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "W2_states.png"), dpi=130); plt.close(fig)

fig, axs = plt.subplots(1, 2, figsize=(9, 3.6)); txt = []
X, Y = pairs(runs["Controller A (measured response)"]); F = np.hstack([np.ones((len(X), 1)), X]); W, *_ = np.linalg.lstsq(F, Y, rcond=None); A = W[1:].T; ev = np.linalg.eigvals(A); E = Y - F @ W
for i, nm in enumerate(["forward", "inward"]):
    axs[i].scatter(X[:, i], Y[:, i], s=10, color="#2b7bd9"); lo, hi = X[:, i].min(), X[:, i].max(); xx = np.linspace(lo, hi, 10)
    axs[i].plot(xx, W[0, i] + A[i, i] * xx + A[i, 1 - i] * X[:, 1 - i].mean(), "k-", lw=1); axs[i].plot(xx, xx, "k:", lw=0.6)
    axs[i].set_xlabel(f"{nm} offset at step k (m)"); axs[i].set_ylabel(f"{nm} offset at step k+1 (m)")
axs[0].set_title(f"Controller A closed loop: A_cl eigenvalues {ev[0]:+.2f}, {ev[1]:+.2f}", fontsize=9); axs[1].set_title(f"(design target 0.4 on both; residual {E.std(0)[0]*100:.1f} / {E.std(0)[1]*100:.1f} cm)", fontsize=9)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "W3_closed_loop.png"), dpi=130); plt.close(fig)
json.dump({"A_cl": A.tolist(), "eig": [complex(e).real for e in ev], "residual": E.std(0).tolist(), "pairs": len(X)}, open(os.path.join(EV, "closed_loop_A.json"), "w"))

# W4 the C8 boundary: swing failures vs previous step length, real boot (v7, base lift) / v8 lift / diagnostic foot
def swf(f):
    D = json.load(open(os.path.join(JS, f))); bins = [(0, 0.2), (0.2, 0.26), (0.26, 0.32), (0.32, 0.6)]; c = {b: [0, 0] for b in bins}
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if k < 2 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2; L_ = p["foothold"][0]
            for b in bins:
                if b[0] <= L_ < b[1]: c[b][0] += 1; c[b][1] += fail
    return [c[b][1] / max(1, c[b][0]) * 100 for b in bins], [c[b][0] for b in bins]
sets = [("real boot, inner loop v7", "ident_v7_cl1.json", "#c0392b"), ("real boot + higher swing lift (v8)", "ident_v8_cl1.json", "#2b7bd9"), ("DIAGNOSTIC human-sized foot (v7)", "ident_diagfoot_cl1.json", "#27ae60")]
fig, ax = plt.subplots(figsize=(8, 3.4)); w = 0.26
for i, (nm, f, c) in enumerate(sets):
    if not os.path.exists(os.path.join(JS, f)): continue
    r, n = swf(f); ax.bar(np.arange(4) + (i - 1) * w, r, w, color=c, label=nm)
ax.set_xticks(range(4)); ax.set_xticklabels(["< 0.20 m", "0.20–0.26", "0.26–0.32", "≥ 0.32 m"]); ax.set_xlabel("previous step length (achieved)"); ax.set_ylabel("swing failures (%)")
ax.set_title("The C8 boundary: swing failure (re-contact < 0.2 s after liftoff) — closed-loop identification, 600 runs each"); ax.legend(fontsize=8); fig.tight_layout(); fig.savefig(os.path.join(FIG, "W4_c8_boundary.png"), dpi=130); plt.close(fig)

# W5 yaw: whole-body vertical angular momentum range per stride (normalised by mass × stature) and pelvis yaw range per step
fig, axs = plt.subplots(1, 2, figsize=(9, 3.4))
for i, (nm, D) in enumerate(runs.items()):
    r = [v for s in D["starts"] for v in s["wbamRange"]]; py = [q["pelvisYawRange"] for s in D["starts"] for q in s["steps"] if q["upright"] and q["pelvisYawRange"] is not None]
    if r: axs[0].boxplot(r, positions=[i], widths=0.5, patch_artist=True, boxprops=dict(facecolor=col[nm]))
    if py: axs[1].boxplot(py, positions=[i], widths=0.5, patch_artist=True, boxprops=dict(facecolor=col[nm]))
axs[0].axhspan(0.011, 0.017, color="g", alpha=0.25); axs[0].text(-0.4, 0.0175, "human level walking 0.014 ± 0.003", fontsize=7, color="g")
for a in axs: a.set_xticks(range(3)); a.set_xticklabels(["old G2b", "B", "A"])
axs[0].set_ylabel("transverse WBAM range per stride (m/s)"); axs[1].set_ylabel("pelvis yaw range per step (°)"); axs[1].axhspan(8, 12, color="g", alpha=0.25); axs[1].text(-0.4, 12.5, "human ≈ ±4–6° (8–12° range)", fontsize=7, color="g")
fig.suptitle("Yaw: whole-body angular momentum about the vertical axis and pelvis rotation"); fig.tight_layout(); fig.savefig(os.path.join(FIG, "W5_yaw.png"), dpi=130); plt.close(fig)

# W6 foot placement and timing (Controller A): final target vs achieved, the timing used, step length / width
D = runs["Controller A (measured response)"]; T_, A_, Tm = [], [], []
for s in D["starts"]:
    for q in s["steps"]:
        if q["k"] >= 1 and q["upright"] and q["target"] and q["achieved"]: T_.append(q["target"]); A_.append(q["achieved"]); Tm.append(q["u"][2] if q["u"] else np.nan)
T_ = np.array(T_); A_ = np.array(A_); fig, axs = plt.subplots(1, 3, figsize=(11, 3.4))
for i, nm in enumerate(["forward foothold (m)", "width (m)"]):
    axs[i].scatter(T_[:, i], A_[:, i], s=10, color="#2b7bd9"); lo, hi = min(T_[:, i].min(), A_[:, i].min()), max(T_[:, i].max(), A_[:, i].max()); axs[i].plot([lo, hi], [lo, hi], "k:", lw=0.7)
    e = A_[:, i] - T_[:, i]; axs[i].set_title(f"{nm}: achieved − target {e.mean()*100:+.1f} ± {e.std()*100:.1f} cm", fontsize=8); axs[i].set_xlabel("final target"); axs[i].set_ylabel("achieved")
axs[2].hist([t for t in Tm if t == t], bins=12, color="#2b7bd9"); axs[2].set_xlabel("single-support duration chosen (s)"); axs[2].set_title("timing (the controller's third input)", fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "W6_placement_timing.png"), dpi=130); plt.close(fig)

# W7 saturation and the external-impulse ledger / propulsion audit
fig, axs = plt.subplots(1, 2, figsize=(9, 3.2))
for i, (nm, D) in enumerate(runs.items()):
    sat = [q["sat"] for s in D["starts"] for q in s["steps"] if q["upright"] and q["sat"] is not None]
    if sat: axs[0].boxplot(sat, positions=[i], widths=0.5, patch_artist=True, boxprops=dict(facecolor=col[nm]))
    res = [s["ledger"]["resMax"] for s in D["starts"]]; axs[1].bar(i, max(res), color=col[nm])
for a in axs: a.set_xticks(range(3)); a.set_xticklabels(["old G2b", "B", "A"])
axs[0].set_ylabel("saturated motor axes per tick (mean over a swing)"); axs[1].set_ylabel("ledger residual max (N·s per tick)"); axs[1].set_title("external impulse: every N·s is turf + gravity (no hidden force)", fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "W7_saturation_ledger.png"), dpi=130); plt.close(fig)
# summary numbers
summ = {}
for nm, D in runs.items():
    ups = [s["upright"] for s in D["starts"]]; r = [v for s in D["starts"] for v in s["wbamRange"]]
    summ[nm] = {"upright_mean": float(np.mean(ups)), "upright": ups, "speed": [s["speed"] for s in D["starts"]], "wbam_median": float(np.median(r)) if r else None,
                "ledger_res_max": max(s["ledger"]["resMax"] for s in D["starts"]), "propulsion": [{"turfH": s["ledger"]["turfH"], "dPH": s["ledger"]["dPH"]} for s in D["starts"]]}
json.dump(summ, open(os.path.join(EV, "summary.json"), "w"), indent=1); print(json.dumps({k: {kk: v[kk] for kk in ("upright_mean", "wbam_median", "ledger_res_max")} for k, v in summ.items()}, indent=1))
print("closed loop A:", np.round(ev, 2), "residual", E.std(0).round(3))
