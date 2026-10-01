# FOOT GATE — report figures (fig/FG1…FG5) from the measurement files in ../json
import json, os, numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
H = os.path.dirname(os.path.abspath(__file__)); J = os.path.join(H, "../json"); FG = os.path.join(H, "../fig"); os.makedirs(FG, exist_ok=True)
FEET = ["F0", "F1", "F2", "F2h"]; COL = {"F0": "#3b5b8f", "F1": "#15803d", "F2": "#d97706", "F2h": "#a855f7"}
LAB = {"F0": "F0 current boot", "F1": "F1 human-sized rigid", "F2": "F2 articulated (boot outline)", "F2h": "F2h articulated (human outline)"}
plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
# FG1 — matched state cells
SM = json.load(open(os.path.join(J, "state_matched.json"))); keys = [k for k in SM["F0"]["cells"] if all(SM[f]["cells"][k]["fail"] is not None for f in FEET)]
fig, ax = plt.subplots(2, 1, figsize=(10, 6.2), sharex=True); x = np.arange(len(keys)); w = 0.2
for i, f in enumerate(FEET):
    fa = [SM[f]["cells"][k]["fail"] * 100 for k in keys]; co = [(SM[f]["cells"][k]["cont"] or 0) * 100 for k in keys]
    ax[0].bar(x + (i - 1.5) * w, fa, w, color=COL[f], label=LAB[f]); ax[1].bar(x + (i - 1.5) * w, co, w, color=COL[f])
    for j, k in enumerate(keys): ax[0].text(x[j] + (i - 1.5) * w, fa[j] + 1.5, str(SM[f]["cells"][k]["n"]), ha="center", fontsize=6, color="#555", rotation=90)
ax[0].set_ylabel("swing failure %"); ax[1].set_ylabel("continuation %\n(swing completes AND\nupright two steps later)"); ax[0].legend(ncol=4, fontsize=8, loc="upper left", frameon=False)
def klab(k): a, b = k.split("|"); return f"prev. step {a[1:].replace('-', '–')} m\nspeed {b[1:].replace('-', '–')} m/s"
ax[1].set_xticks(x); ax[1].set_xticklabels([klab(k) for k in keys], fontsize=7.5)
ax[0].set_title("FG1 — step-length capability at MATCHED states (identification runs, every transition kept; n above bars)", fontsize=10, loc="left")
fig.tight_layout(); fig.savefig(os.path.join(FG, "FG1_state_matched.png"), dpi=150); plt.close(fig)
# FG2 — walks
fig, ax = plt.subplots(figsize=(9, 3.6)); pos = 0; ticks = []
for tag, name in [("sameMaps", "Part 1\nF0's maps"), ("ownR1", "Part 2a\nown r1 maps"), ("ownR2", "Part 2b\nown r2 maps")]:
    for f in FEET:
        fn = os.path.join(J, f"walkA_{tag}_{f}.json")
        if tag == "ownR1" and f == "F0": fn = os.path.join(J, "walkA_sameMaps_F0.json")   # (F0's own round-1 maps ARE m8a)
        if not os.path.exists(fn): continue
        ups = [s["upright"] for s in json.load(open(fn))["starts"]]
        ax.scatter([pos] * len(ups) + np.linspace(-0.12, 0.12, len(ups)), ups, s=14, color=COL[f]); ax.plot([pos - 0.25, pos + 0.25], [np.mean(ups)] * 2, color=COL[f], lw=2)
        ticks.append((pos, f)); pos += 1
    pos += 0.8
for p0, nm in zip([0, 4.8, 9.6], ["Part 1 — F0's maps", "Part 2a — own round-1 maps", "Part 2b — own round-2 maps"]): ax.text(p0 + 1.5, 14.3, nm, ha="center", fontsize=8.5)
ax.set_xticks([t[0] for t in ticks]); ax.set_xticklabels([t[1] for t in ticks]); ax.set_ylabel("upright steps (of 30)"); ax.set_ylim(0, 15)
ax.set_title("FG2 — Controller-A walks, six deterministic starts each (bar = mean)", fontsize=10, loc="left"); fig.tight_layout(); fig.savefig(os.path.join(FG, "FG2_walks.png"), dpi=150); plt.close(fig)
# FG3 — F0's failure chain, aligned on the failing step
d = json.load(open(os.path.join(J, "walkA_sameMaps_F0.json"))); fig, ax = plt.subplots(1, 4, figsize=(12, 3.0))
for r in d["starts"]:
    S = r["steps"]; kf = next((i for i, s in enumerate(S) if s["k"] >= 2 and (s["chain"]["tdU"] is None or s["chain"]["tdU"] < 0.8)), len(S) - 1)
    xs = [i - kf for i in range(len(S))]
    ax[0].plot(xs, [s["chain"]["speedErr"][0] if s["chain"].get("speedErr") else np.nan for s in S], "-o", ms=3)
    ax[1].plot(xs, [s["u"][0] if s["u"] else np.nan for s in S], "-o", ms=3, color="#888"); ax[1].plot(xs, [s["achieved"][0] if s.get("achieved") else np.nan for s in S], "-o", ms=3)
    ax[2].plot(xs, [s["chain"]["trailExt"] for s in S], "-o", ms=3); ax[3].plot(xs, [s["chain"]["tdU"] if s["chain"]["tdU"] is not None else np.nan for s in S], "-o", ms=3)
for a, t in zip(ax, ["forward speed error (m/s)", "forward foothold: request (grey) / achieved", "trailing-leg extension at the step start", "touchdown at fraction of the swing"]): a.set_title(t, fontsize=8.5); a.axvline(0, color="#c2410c", lw=0.8); a.set_xlabel("steps relative to the first early touchdown")
ax[1].axhline(0.30, color="#c2410c", ls="--", lw=0.8); ax[2].axhline(1.0, color="#c2410c", ls="--", lw=0.8)
fig.suptitle("FG3 — the current walker's failure (F0, Controller A, all six starts): speed creeps → request pinned at its 0.30 m bound → long achieved step → straight trailing leg → early touchdown", fontsize=9.5, x=0.01, ha="left")
fig.tight_layout(); fig.savefig(os.path.join(FG, "FG3_f0_failure_chain.png"), dpi=150); plt.close(fig)
# FG4 — stance / toe-off mechanics, own-map walks (upright steps k ≥ 1)
fig, ax = plt.subplots(1, 5, figsize=(13, 3.0))
for i, f in enumerate(FEET):
    S = [s for r in json.load(open(os.path.join(J, f"walkA_ownR2_{f}.json")))["starts"] for s in r["steps"] if s["k"] >= 1 and s["upright"]]
    for a, key, sc in zip(ax, ["ankleTauMax", "heelAtLift", "pitchAtLift", "minClr", "mtpMaxDeg"], [1, 100, 1, 100, 1]):
        v = [s["chain"].get(key) * sc for s in S if s["chain"].get(key) is not None and (key != "minClr" or (s["swing"] or 0) >= 0.2)]
        if v: a.boxplot([v], positions=[i], widths=0.6, patch_artist=True, boxprops=dict(facecolor=COL[f], alpha=0.5), medianprops=dict(color="k"), flierprops=dict(ms=2))
for a, t in zip(ax, ["peak ankle plantar-flexion τ (N·m)\nlate stance, limit 150", "heel height at liftoff (cm)", "hindfoot pitch at liftoff (°)\n(− = toes down)", "min toe clearance in the swing (cm)\n(completed swings)", "peak MTP dorsiflexion (°)"]):
    a.set_title(t, fontsize=8); a.set_xticks(range(4)); a.set_xticklabels(FEET)
ax[0].axhline(150, color="#c2410c", ls="--", lw=0.8); fig.suptitle("FG4 — stance and toe-off mechanics (Part 2b walks, each foot with its own maps)", fontsize=10, x=0.01, ha="left")
fig.tight_layout(); fig.savefig(os.path.join(FG, "FG4_stance_mechanics.png"), dpi=150); plt.close(fig)
# FG5 — the swing mechanism: commanded vs actual
D = json.load(open(os.path.join(J, "swing_cmd_vs_act.json"))); sel = [("F0_k4", "F0 step 4 (lands at 0.93)"), ("F0_k8", "F0 step 8 — the current failure (0.57)"), ("F2_k4", "F2 step 4 (0.67)"), ("F2h_k4", "F2h step 4 (0.80)")]
fig, ax = plt.subplots(3, 4, figsize=(13, 6.4), sharex=True)
for j, (k, title) in enumerate(sel):
    R = D[k]["rows"]; t = [r["t"] for r in R]
    for i, (a, b, sc, yl) in enumerate([("pCmd", "pAct", 1, "foot pitch (°)"), ("yCmd", "yAct", 100, "foot origin height (cm)"), ("lowCmd", "lowAct", 100, "lowest front point (cm)")]):
        ax[i, j].plot(t, [r[a] * sc for r in R], color="#888", label="commanded"); ax[i, j].plot(t, [r[b] * sc for r in R], color=COL[k.split("_")[0]], label="actual")
        if D[k]["lift"] is not None: ax[i, j].axvline(D[k]["lift"], color="#d97706", lw=0.7)
        if D[k]["td"] is not None: ax[i, j].axvline(D[k]["td"], color="#15803d", lw=0.7)
        if j == 0: ax[i, j].set_ylabel(yl)
    ax[2, j].axhline(0, color="#6f8f5a", lw=0.8); ax[0, j].set_title(title, fontsize=8.5); ax[2, j].set_xlabel("s from the swing start")
ax[0, 0].legend(fontsize=7, frameon=False)
fig.suptitle("FG5 — why F2 scuffs: the swing generator holds the toe-off pitch (steeper for an articulated foot) and the long boot toe hangs; F0's own failure looks the same (orange = liftoff, green = touchdown)", fontsize=9.5, x=0.01, ha="left")
fig.tight_layout(); fig.savefig(os.path.join(FG, "FG5_swing_mechanism.png"), dpi=150); plt.close(fig)
print("figures:", sorted(os.listdir(FG)))
