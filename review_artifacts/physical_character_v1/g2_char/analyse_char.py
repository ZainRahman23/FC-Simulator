# G2 plant characterisation — analysis and figures (reads json/*.json written by tools/g2char_run.js; writes fig/*.png + json/model.json)
import json, os, collections, numpy as np, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
H = os.path.dirname(os.path.abspath(__file__)); J = lambda n: json.load(open(os.path.join(H, "json", n)))
C = J("char_natural.json"); rows = C["sweep"]["rows"]; NOMS = C["sweep"]["nominal"]
COL = {"upright": "#2471a3", "fallen": "#c0392b", "swing-failed": "#e67e22", "fallen-before": "#7f8c8d"}
def inp(r, k):
    if k in ("df", "dl", "T"): return r["u"][k]
    p = r.get("push") or {}; Jp = p.get("J") or [0, 0]; return {"jf": Jp[0], "jl": Jp[1], "lz": p.get("Lz", 0)}[k]
model = {}
# ── 1. response curves: post capture-point offsets vs each control input (refs A and C), achieved foothold, double-support duration ──
fig, ax = plt.subplots(3, 4, figsize=(18, 11))
for col, (tag, key, lab) in enumerate([("df", "df", "commanded forward foothold df (m)"), ("dl", "dl", "commanded step width dl (m)"), ("T", "T", "commanded single support T (s)")]):
    for ref, mk in [("A", "o"), ("C", "s")]:
        R = [r for r in rows if r["ref"] == ref and r["tag"] == tag]; U = [r for r in R if r["cls"] == "upright" and r.get("post")]
        x = [inp(r, key) for r in U]
        ax[col, 0].plot(x, [r["post"]["xi"][0] * 100 for r in U], mk + "-", label=f"ref {ref} (T {NOMS[ref]['T']})", ms=5)
        ax[col, 1].plot(x, [r["post"]["xi"][1] * 100 for r in U], mk + "-", ms=5)
        for r in R:
            if r["cls"] != "upright": ax[col, 1].plot(inp(r, key), 0, "x", color=COL[r["cls"]], ms=9)
        if key in ("df", "dl"):
            Ra = [r for r in R if r.get("foothold")]; i = 0 if key == "df" else 1
            ax[col, 2].plot([inp(r, key) for r in Ra], [abs(r["foothold"][i]) for r in Ra], mk, ms=5); lim = [min(inp(r, key) for r in Ra), max(inp(r, key) for r in Ra)]; ax[col, 2].plot(lim, lim, "k:", lw=0.8)
        else: ax[col, 2].plot([inp(r, key) for r in R if r.get("swingT")], [r["swingT"] for r in R if r.get("swingT")], mk, ms=5)
        ax[col, 3].plot([inp(r, key) for r in U], [r["ds"] or np.nan for r in U], mk, ms=5)
    ax[col, 0].set_ylabel("next single-support start:\nforward ξ offset (cm)"); ax[col, 1].set_ylabel("next start: inward ξ offset (cm)\n(× = fell / swing failed)")
    ax[col, 2].set_ylabel("achieved |foothold| (m)" if key != "T" else "actual swing duration (s)"); ax[col, 3].set_ylabel("measured double support (s)")
    for c in range(4): ax[col, c].set_xlabel(lab); ax[col, c].grid(alpha=0.3)
    ax[col, 3].axhline(0.15, color="#999", ls="--", lw=0.8); ax[col, 3].text(ax[col, 3].get_xlim()[0], 0.155, " the 0.15 s every model assumed", fontsize=7, color="#666")
ax[0, 0].legend(fontsize=8); fig.suptitle("G2 plant — response of the next single-support state to one commanded step input (natural inner loop; others nominal)", fontsize=12)
fig.tight_layout(); fig.savefig(os.path.join(H, "fig", "1_control_response.png"), dpi=95); plt.close(fig)
# ── 2. state sensitivity: post vs pre (the pre-state varied by pushes at the step start), with the fitted slopes ──
fig, ax = plt.subplots(2, 3, figsize=(17, 9)); sl = {}
for ri, ref in enumerate(["A", "C"]):
    for ci, (tag, si, lab) in enumerate([("pushF", 0, "forward"), ("pushL", 1, "inward"), ("yaw", None, "yaw L (kg·m²/s)")]):
        U = [r for r in rows if r["ref"] == ref and r["tag"] == tag and r["cls"] == "upright" and r.get("post")]
        z = np.array([r["pre"]["xi"][si] * 100 if si is not None else r["pre"]["L"][1] for r in U]); pf = np.array([r["post"]["xi"][0] * 100 for r in U]); pl = np.array([r["post"]["xi"][1] * 100 for r in U])
        a = ax[ri, ci]; a.plot(z, pf, "o", color="#16a085", label="next forward"); a.plot(z, pl, "s", color="#8e44ad", label="next inward")
        if len(U) >= 3:
            kf, cf = np.polyfit(z, pf, 1); kl, cl = np.polyfit(z, pl, 1); zz = np.linspace(z.min(), z.max(), 10); a.plot(zz, kf * zz + cf, "-", color="#16a085"); a.plot(zz, kl * zz + cl, "-", color="#8e44ad")
            sl[f"{ref}_{tag}"] = {"d_next_fwd": kf, "d_next_in": kl, "n": len(U)}; a.set_title(f"ref {ref}: slope next-fwd {kf:+.2f}, next-in {kl:+.2f}" + (" (per cm)" if si is not None else " (cm per kg·m²/s)"), fontsize=9)
        F = [r for r in rows if r["ref"] == ref and r["tag"] == tag and r["cls"] != "upright" and r.get("pre")]
        for r in F: a.axvline(r["pre"]["xi"][si] * 100 if si is not None else r["pre"]["L"][1], color="#c0392b", alpha=0.25)
        a.set_xlabel(f"state at liftoff: {lab}" + (" ξ offset (cm)" if si is not None else "")); a.set_ylabel("next start ξ offset (cm)"); a.grid(alpha=0.3); a.legend(fontsize=7)
fig.suptitle("G2 plant — how a different starting state carries into the next step (fixed foothold; red lines = runs that fell)", fontsize=12); fig.tight_layout(); fig.savefig(os.path.join(H, "fig", "2_state_sensitivity.png"), dpi=95); plt.close(fig)
# ── 3. local linear step map  x' = c + A x + B u  (x = [ξ_fwd, ξ_in], u = [df, dl, T]) by least squares on upright samples near nominal ──
for ref in ["A", "C"]:
    nm = NOMS[ref]; U = [r for r in rows if r["ref"] == ref and r["cls"] == "upright" and r.get("post") and abs(r["u"]["df"] - nm["df"]) <= 0.09 and abs(r["u"]["dl"] - nm["dl"]) <= 0.09 and abs(r["u"]["T"] - nm["T"]) <= 0.06]
    X = np.array([[1, r["pre"]["xi"][0], r["pre"]["xi"][1], r["u"]["df"] - nm["df"], r["u"]["dl"] - nm["dl"], r["u"]["T"] - nm["T"]] for r in U]); Y = np.array([r["post"]["xi"] for r in U])
    th, res, rk, sv = np.linalg.lstsq(X, Y, rcond=None); pred = X @ th; rms = np.sqrt(((pred - Y) ** 2).mean(axis=0))
    A = th[1:3].T; B = th[3:6].T; c = th[0]; model[ref] = {"n": len(U), "c": c.tolist(), "A": A.tolist(), "B": B.tolist(), "rms_cm": (rms * 100).tolist(), "nominal": nm, "slopes": {k: v for k, v in sl.items() if k.startswith(ref)}}
    print(f"ref {ref}: n {len(U)} | A = {np.round(A, 2).tolist()} | B (df, dl, T) = {np.round(B, 2).tolist()} | rms {np.round(rms * 100, 1).tolist()} cm | eig(A) {np.round(np.linalg.eigvals(A), 2).tolist()}")
# ── 4. closed-loop stability vs placement gains from the measured map: single axis (sideways δdl = K_l·δξ_in, forward δdf = K_f·δξ_fwd)
#       and the COUPLED 2-axis region (spectral radius of A + B₂·diag(K_f, K_l)) ──
fig, ax = plt.subplots(1, 3, figsize=(20, 5.6)); K = np.linspace(0, 14, 561)
for ref, ls in [("A", "-"), ("C", "--")]:
    A = np.array(model[ref]["A"]); B = np.array(model[ref]["B"])
    for a, i, nm in [(ax[0], 1, "sideways"), (ax[1], 0, "forward")]:
        lam = A[i, i] + B[i, i] * K; lo, hi = sorted([(-1 - A[i, i]) / B[i, i], (1 - A[i, i]) / B[i, i]]); model[ref][f"band_{nm}"] = [lo, hi]
        a.plot(K, lam, ls, lw=2, label=f"ref {ref} (single support {NOMS[ref]['T']} s): λ = {A[i,i]:+.1f} {B[i,i]:+.2f}·K → |λ|<1 for K ∈ [{lo:.1f}, {hi:.1f}]")
for a, xl, tt in [(ax[0], "sideways gain K_l (m of step width per m of inward ξ error)", "SIDEWAYS (single axis)"), (ax[1], "forward gain K_f (m of foothold per m of forward ξ error)", "FORWARD (single axis)")]:
    a.axhspan(-1, 1, color="#2ecc71", alpha=0.15); a.axhline(0, color="k", lw=0.6); a.set_ylim(-11, 6); a.grid(alpha=0.3); a.set_xlabel(xl); a.set_ylabel("step-to-step factor λ"); a.legend(fontsize=7.5, loc="lower right"); a.set_title(tt, fontsize=10)
    for y, t in [(3.5, "amplifies"), (0.35, "decays (green band)"), (-3.5, "amplifying oscillation")]: a.text(0.2, y, t, fontsize=8, color="#555")
A = np.array(model["A"]["A"]); B = np.array(model["A"]["B"])[:, :2]; kf = np.linspace(0, 8, 161); kl = np.linspace(0, 12, 241); R = np.zeros((len(kl), len(kf)))
for a_, l_ in enumerate(kl):
    for b_, f_ in enumerate(kf): R[a_, b_] = max(abs(np.linalg.eigvals(A + B @ np.diag([f_, l_]))))
cs = ax[2].contourf(kf, kl, np.minimum(R, 4), levels=[0, 0.5, 1, 1.5, 2, 3, 4], cmap="RdYlGn_r"); ax[2].contour(kf, kl, R, levels=[1], colors="k", linewidths=1.5); fig.colorbar(cs, ax=ax[2], label="spectral radius (≥ 4 clipped)")
ax[2].set_xlabel("forward gain K_f"); ax[2].set_ylabel("sideways gain K_l"); ax[2].set_title("COUPLED (ref A): the stable gain region (inside the black line)", fontsize=10); model["A"]["stableRegionFrac"] = float((R < 1).mean())
fig.suptitle("G2 plant — how a placement correction acts on the measured step map: decays / overshoots / reverses / amplifies", fontsize=12); fig.tight_layout(); fig.savefig(os.path.join(H, "fig", "3_stability_vs_gain.png"), dpi=95); plt.close(fig)
# ── 5. yaw: per-segment vertical angular momentum through the nominal sequence + the human reference ──
Y = J("yaw_A.json")["yaw"]; S = Y["series"]; t = [r["t"] for r in S]
fig, ax = plt.subplots(2, 1, figsize=(15, 9), gridspec_kw={"height_ratios": [2, 1]})
for k, c in [("swingLeg", "#c0392b"), ("stanceLeg", "#e67e22"), ("pelvis", "#7f8c8d"), ("trunk", "#8e44ad"), ("armL", "#2471a3"), ("armR", "#5dade2")]: ax[0].plot(t, [r["seg"][k] for r in S], color=c, label=k)
ax[0].plot(t, [r["Ly"] for r in S], "k", lw=2.2, label="whole body"); ax[0].set_ylabel("vertical angular momentum about the COM (kg·m²/s)"); ax[0].legend(ncol=7, fontsize=8); ax[0].grid(alpha=0.3)
for st in Y["steps"]:
    if st.get("lift") and st.get("td"): ax[0].axvspan(st["lift"], st["td"], color="#f4d03f", alpha=0.15); ax[0].text(st["lift"], ax[0].get_ylim()[1] * 0.9, f" SS {st['sw']}", fontsize=8)
ax[1].plot(t, [r["pelvisYaw"] for r in S], label="pelvis yaw (°)"); ax[1].plot(t, [r["chestYaw"] for r in S], label="chest yaw (°)"); ax2 = ax[1].twinx(); ax2.plot(t[1:], [r.get("Mext", 0) for r in S][1:], color="#555", lw=0.8, label="external vertical moment (N·m)"); ax2.set_ylabel("N·m")
ax[1].legend(loc="upper left", fontsize=8); ax2.legend(loc="upper right", fontsize=8); ax[1].grid(alpha=0.3); ax[1].set_xlabel("time (s)")
fig.suptitle("G2 single-support yaw — who carries the vertical angular momentum (nominal open-loop steps; shaded = single support)", fontsize=12); fig.tight_layout(); fig.savefig(os.path.join(H, "fig", "4_yaw_segments.png"), dpi=95); plt.close(fig)
yb = []
for st in Y["steps"]:
    if not (st.get("lift") and st.get("td")) or st["td"] - st["lift"] < 0.2: continue
    W = [r for r in S if st["lift"] <= r["t"] <= st["td"]]; pk = lambda a: float(a[np.argmax(np.abs(a))])
    yb.append({"k": st["k"], "sw": st["sw"], **{k: pk(np.array([r["seg"][k] for r in W])) for k in ["swingLeg", "stanceLeg", "pelvis", "trunk", "armL", "armR"]}, "total": pk(np.array([r["Ly"] for r in W])), "pelvisYawRange": [min(r["pelvisYaw"] for r in W), max(r["pelvisYaw"] for r in W)], "swingLat": float(np.mean([abs(r["swingLat"]) for r in W if r["swingLat"] is not None]))})
model["yaw"] = yb
# per-phase change of the whole-body vertical angular momentum: double support (touchdown → next liftoff) vs single support (liftoff → touchdown)
ph = []; st = Y["steps"]
for i, a in enumerate(st):
    if a.get("lift") and a.get("td"):
        W = [r for r in S if a["lift"] <= r["t"] <= a["td"]]
        if len(W) > 2: ph.append({"phase": "SS", "k": a["k"], "dL": W[-1]["Ly"] - W[0]["Ly"], "dur": a["td"] - a["lift"]})
    if a.get("td") and i + 1 < len(st) and st[i + 1].get("lift"):
        W = [r for r in S if a["td"] <= r["t"] <= st[i + 1]["lift"]]
        if len(W) > 2: ph.append({"phase": "DS", "k": a["k"], "dL": W[-1]["Ly"] - W[0]["Ly"], "dur": st[i + 1]["lift"] - a["td"]})
model["yawPhases"] = ph; print("yaw phases:", [(p["phase"], p["k"], round(p["dL"], 2), round(p["dur"], 2)) for p in ph])
# ── 6. human compatibility over the upright samples (refs A, C) ──
# (the human measures come from the re-run with the corrected mid-swing clearance window, json/char_natural_sweep2.json, when present)
rowsH = J("char_natural_sweep2.json")["sweep"]["rows"] if os.path.exists(os.path.join(H, "json", "char_natural_sweep2.json")) else rows
HC = [r for r in rowsH if r["ref"] in "AC" and r["cls"] == "upright" and r.get("human") and r["human"].get("clearance") is not None]
model["human"] = {"n": len(HC), "clearance_cm": [float(np.percentile([r["human"]["clearance"] * 100 for r in HC], p)) for p in (5, 50, 95)], "kneeTd_deg": [float(np.percentile([r["human"]["kneeTd"] for r in HC], p)) for p in (5, 50, 95)],
  "pelvisYawPeak_deg": [float(np.percentile([r["human"]["pelvisYawPeak"] for r in HC], p)) for p in (5, 50, 95)], "width_m": [float(np.percentile([abs(r["foothold"][1]) for r in HC], p)) for p in (5, 50, 95)], "length_m": [float(np.percentile([r["foothold"][0] for r in HC], p)) for p in (5, 50, 95)],
  "ds_s": [float(np.percentile([r["ds"] for r in HC if r["ds"]], p)) for p in (5, 50, 95)], "satPerStep": [float(np.percentile([r["human"]["sat"] for r in HC], p)) for p in (5, 50, 95)]}
# inner-loop comparison (ref A, upright fraction + lateral / forward state slopes)
cmp = {}
for nm, fn in [("natural", None), ("neutral", "sweep_neutral.json"), ("ankle", "sweep_ankle.json"), ("dslat", "sweep_dslat.json"), ("dsboth", "sweep_dsboth.json")]:
    R = [r for r in (rows if fn is None else J(fn)["sweep"]["rows"]) if r["ref"] == "A" and r["tag"] in ("df", "dl", "T", "pushF", "pushL", "yaw")]; up = [r for r in R if r["cls"] == "upright"]
    def slope(tag, i):
        U = [r for r in up if r["tag"] == tag and r.get("post")]
        return float(np.polyfit([r["pre"]["xi"][i] for r in U], [r["post"]["xi"][i] for r in U], 1)[0]) if len(U) >= 3 else None
    cmp[nm] = {"upright": len(up), "of": len(R), "A_ff": slope("pushF", 0), "A_ll": slope("pushL", 1), "ds_median": float(np.median([r["ds"] for r in up if r.get("ds")])) if up else None}
model["innerLoops"] = cmp
# ── 7. controller families on the measured map ──
#  B-family (SIMBICON-style): DIAGONAL fixed gains (forward from forward, sideways from sideways) — the fraction of the gain plane that is stable
#  A-family (measured response): FULL-matrix gains from the identified map, K = −B₂⁻¹·A (deadbeat on the local model); its robustness when the
#  true plant is the OTHER timing reference (map uncertainty of the size this body shows between 0.40 s and 0.45 s single support)
def diag_frac(ref):
    A = np.array(model[ref]["A"]); B = np.array(model[ref]["B"])[:, :2]; kf = np.linspace(0, 8, 121); kl = np.linspace(0, 12, 181)
    return float(np.mean([[max(abs(np.linalg.eigvals(A + B @ np.diag([f_, l_])))) < 1 for f_ in kf] for l_ in kl]))
fam = {"diagStableFrac": {r: diag_frac(r) for r in "AC"}}
for d, t in [("A", "C"), ("C", "A")]:
    Ad = np.array(model[d]["A"]); Bd = np.array(model[d]["B"])[:, :2]; K = -np.linalg.solve(Bd, Ad); At = np.array(model[t]["A"]); Bt = np.array(model[t]["B"])[:, :2]
    fam[f"deadbeat_{d}_on_{t}"] = {"K": K.tolist(), "rho_nominal": float(max(abs(np.linalg.eigvals(Ad + Bd @ K)))), "rho_true": float(max(abs(np.linalg.eigvals(At + Bt @ K))))}
    for sc in (0.8, 1.2): fam[f"deadbeat_{d}_Bx{sc}"] = float(max(abs(np.linalg.eigvals(Ad + sc * Bd @ K))))
# the unpredictable part of the plant vs the correction room: residual rms (cm) vs the sideways width room / the deadbeat sideways gain
for r in "AC": fam[f"residual_vs_room_{r}"] = {"rms_cm": model[r]["rms_cm"], "width_room_cm": [ (model[r]["nominal"]["dl"] - 0.17) * 100, (0.42 - model[r]["nominal"]["dl"]) * 100 ]}
model["families"] = fam; print("families:", json.dumps(fam, indent=1, default=float))
json.dump(model, open(os.path.join(H, "json", "model.json"), "w"), indent=1, default=float)
print(json.dumps({k: model[k] for k in ("innerLoops", "human")}, indent=1, default=float)); print("yaw:", json.dumps(yb, default=float))
