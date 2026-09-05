#!/usr/bin/env python3
"""Reach-envelope figures + numeric ovals for the keeper-profile audit.

  python3 gk_envelope_plots.py analytic.json pgf_full.json env_dir out_dir

Inputs
  analytic.json  gk_reach_analytic.js   — the engine's own superellipse, in hand-centre / fingertip / ball-centre
  pgf_full.json  gk_profile_goalface.js — production shots; gives 90/50/10 % CONTACT contours in the keeper plane
  env_dir        gk_reach_envelope.js grids (<PROFILE>_u<T>.json, <PROFILE>_fine.json, DEC_<PROFILE>.json)
Outputs
  envelope_individual.png · envelope_combined.png · envelope_time.png · envelope_tables.txt · envelope_data.json
"""
import json, sys, os, math
from collections import defaultdict
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt

AN = json.load(open(sys.argv[1])); PG = json.load(open(sys.argv[2])); ENVD = sys.argv[3]; OUT = sys.argv[4]
PROBED = sys.argv[5] if len(sys.argv) > 5 else None
os.makedirs(OUT, exist_ok=True)
POSTA, POSTB, BAR, CY, BALLR = 30.34, 37.66, 2.44, 34.0, 0.11
HANDR = AN["consts"]["handR"]; R = HANDR + BALLR
SETY = PG["geometry"]["set"][1]; SETX = PG["geometry"]["set"][0]
MAIN = ["K1", "K2", "K3", "COURTOIS"]
AN_KEY = {"K1": "K1P", "K2": "K2P", "K3": "K3P", "COURTOIS": "COURTOIS"}
COL = {"K1": "#d7301f", "K2": "#2166ac", "K3": "#1a9850", "COURTOIS": "#6a3d9a"}
rep = []
def P(*a):
    s = " ".join(str(x) for x in a); print(s); rep.append(s)

# ── 1. production-shot CONTACT probability in the keeper's plane (both families pooled)
NYB, NZB = 29, 17
YB = np.linspace(-4.2, 4.2, NYB + 1); ZB = np.linspace(0.0, 3.05, NZB + 1)
YBC = 0.5 * (YB[1:] + YB[:-1]); ZBC = 0.5 * (ZB[1:] + ZB[:-1])
def prod_contact_grid(prof):
    n = np.zeros((NZB, NYB)); c = np.zeros((NZB, NYB))
    for fam in PG["families"]:
        for s in PG["families"][fam]["shots"]:
            if not s.get("on") or not s["on"] or not s["off"].get("plane"): continue
            dy = s["off"]["plane"]["y"] - SETY; z = s["off"]["plane"]["z"]
            i = int(np.searchsorted(YB, dy) - 1); j = int(np.searchsorted(ZB, z) - 1)
            if i < 0 or i >= NYB or j < 0 or j >= NZB: continue
            n[j, i] += 1
            if s["on"][prof]["contacts"]: c[j, i] += 1
    with np.errstate(invalid="ignore"): p = np.where(n > 0, c / np.maximum(n, 1), np.nan)
    return p, n
def contour_halfwidth(p, n, level, minn=4):
    """largest |dy| whose cell (with enough samples) still has contact prob >= level, per z row"""
    out = []
    for j in range(NZB):
        best = np.nan
        for i in range(NYB):
            if n[j, i] >= minn and not np.isnan(p[j, i]) and p[j, i] >= level:
                best = np.nanmax([best if not np.isnan(best) else -9, abs(YBC[i]) + 0.5 * (YB[1] - YB[0])])
        out.append(best)
    return np.array(out)

# ── 2. controlled-grid empirical boundary
def load_grid(tag):
    f = os.path.join(ENVD, tag + ".json")
    if not os.path.exists(f) and tag.endswith("_u1.60"):
        f = os.path.join(ENVD, tag[:-6] + "_fine.json")          # the generous-time fine grid IS the 1.60 s case
    if not os.path.exists(f): return None
    return json.load(open(f))
def grid_boundary(G):
    """max |dy| with a contact, per z, from a gk_reach_envelope plane grid"""
    if not G: return None, None, None
    sety = None
    for c in G["cells"]:
        if c.get("setY") is not None: sety = c["setY"]; break
    sety = sety if sety is not None else SETY
    byz = defaultdict(list)
    for c in G["cells"]:
        if c.get("unsolved"): continue
        byz[round(c["z"], 3)].append((abs(c["y"] - sety), bool(c.get("contact"))))
    zs = sorted(byz); lat = []
    for z in zs:
        hits = [d for d, ok in byz[z] if ok]
        lat.append(max(hits) if hits else np.nan)
    return np.array(zs), np.array(lat), G.get("planeX")

# ── 3. analytic boundary polylines
def analytic_curve(prof, which):
    b = AN["profiles"][AN_KEY[prof]]["boundary"]
    z = np.array([r[0] for r in b]); L = np.array([r[1] if which == "hand" else r[2] for r in b])
    return z, L

P("=" * 110)
P("REACH ENVELOPE — analytical (engine constants) vs executed (measured)")
P("  ball radius %.3f m, hand collision radius %.3f m -> a contact needs the centres within %.3f m." % (BALLR, HANDR, R))
P("  HAND CENTRE = what gkEnvNorm constrains · FINGERTIP = hand centre + %.3f · BALL CENTRE = hand centre + %.3f" % (HANDR, R))
P("  Ball radius is added exactly once (at the ball-centre step).")
P("=" * 110)

P("\n### PHASE 11 — maximum lateral BALL-CENTRE contact displacement from the keeper's centreline, by height")
P("  ANALYTIC = the static reach superellipse about the FEET (what gkEnvNorm allows).")
P("  EXECUTED = measured contact with a GENEROUS usable time (1.60 s): the feet move too (PREPARE step + dive root travel),")
P("             so it is legitimately wider; 4.20 m is the probe grid edge (saturated).")
P("  %-10s" % "height m" + "".join("%22s" % p for p in MAIN))
P("  %-10s" % "" + "".join("%22s" % "analytic / executed" for p in MAIN))
heights = [0.10, 0.40, 0.80, 1.20, 1.50, 1.80, 2.00, 2.20, 2.35, 2.44]
fine = {p: load_grid(AN_KEY[p] + "_fine") for p in MAIN}
fineB = {p: grid_boundary(fine[p]) for p in MAIN}
prodp = {}; prodn = {}
for p in MAIN:
    prodp[p], prodn[p] = prod_contact_grid(p)
tab_lat = {}
for zq in heights:
    row = []
    for p in MAIN:
        a = AN["profiles"][AN_KEY[p]]["lateralByHeight"]
        av = next((r["ballLat"] for r in a if abs(r["z"] - zq) < 1e-6), np.nan)
        zs, lat, _ = fineB[p]
        ev = np.nan
        if zs is not None and len(zs):
            k = int(np.argmin(np.abs(zs - zq)))
            if abs(zs[k] - zq) < 0.12: ev = lat[k]
        tab_lat.setdefault(p, {})[zq] = (av, None if np.isnan(ev) else round(float(ev), 3))
        row.append("%8.2f / %-8s" % (av, "-" if np.isnan(ev) else "%.2f" % ev))
    P("  %-10s" % ("%.2f" % zq) + "".join("%22s" % r for r in row))

P("\n### PHASE 11 — reachable BALL-CENTRE height range at fixed lateral displacement (analytic, static envelope)")
P("  Negative lower bounds are below ground: the ball centre cannot go under +0.11 m, so read them as \"floor\".")
P("  %-10s" % "lateral m" + "".join("%22s" % p for p in MAIN))
for L in [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]:
    row = []
    for p in MAIN:
        a = AN["profiles"][AN_KEY[p]]
        if L == 0:
            row.append("%7.2f .. %-7.2f" % (a["anatomy"]["minBallCentreZ"], a["anatomy"]["maxBallCentreZ"]))
        else:
            c = next((r for r in a["heightByLateral"] if abs(r["L"] - L) < 1e-9), None)
            row.append(("%7.2f .. %-7.2f" % (c["zMinBall"], c["zMaxBall"])) if (c and c["zMaxBall"] > -8) else "unreachable")
    P("  %-10s" % ("%.1f" % L) + "".join("%22s" % r for r in row))

P("\n### PHASE 12 — vertical anatomy vs the 2.44 m crossbar")
labs = [("physical height (m)", lambda a: a["anatomy"]["heightM"]),
        ("standing fingertip (m)", lambda a: a["anatomy"]["standingFingertipZ"]),
        ("max jumping fingertip (m)", lambda a: a["anatomy"]["jumpFingertipZ"]),
        ("max diving fingertip (m)", lambda a: a["anatomy"]["diveMaxFingertipZ"]),
        ("max hand-centre (m)", lambda a: a["anatomy"]["diveMaxHandCentreZ"]),
        ("max BALL-CENTRE contact (m)", lambda a: a["anatomy"]["maxBallCentreZ"]),
        ("fingertip above bar (m)", lambda a: a["anatomy"]["aboveBar"]["fingertipM"]),
        ("fingertip above bar (cm)", lambda a: 100 * a["anatomy"]["aboveBar"]["fingertipM"]),
        ("fingertip above bar (in)", lambda a: a["anatomy"]["aboveBar"]["fingertipM"] / 0.0254),
        ("ball-centre above bar (m)", lambda a: a["anatomy"]["aboveBar"]["ballCentreM"]),
        ("ball-centre above bar (cm)", lambda a: 100 * a["anatomy"]["aboveBar"]["ballCentreM"]),
        ("ball-centre above bar (in)", lambda a: a["anatomy"]["aboveBar"]["ballCentreM"] / 0.0254),
        ("above the LEGAL top (m)", lambda a: a["anatomy"]["aboveBar"]["ballCentreAboveLegalTop"])]
P("  %-28s" % "" + "".join("%13s" % p for p in MAIN))
for lab, fn in labs:
    P("  %-28s" % lab + "".join("%13.3f" % fn(AN["profiles"][AN_KEY[p]]) for p in MAIN))
P("  (legal on-target requires the ball CENTRE at or below %.2f m; the crossbar is at 2.44 m)" % (BAR - BALLR))
P("  executed max ball-centre contact height (production shots + controlled grids):")
exz = {}
for p in MAIN:
    zs = []
    for fam in PG["families"]:
        for s in PG["families"][fam]["shots"]:
            if not s.get("on") or not s["on"]: continue
            for c in s["on"][p]["contacts"]:
                if c.get("point"): zs.append(c["point"][2])
    G = fine[p]
    if G:
        for c in G["cells"]:
            if c.get("contact") and c["contact"].get("point"): zs.append(c["contact"]["point"][2])
    if PROBED:
        import glob as _g
        for f in _g.glob(os.path.join(PROBED, "*_%s*.json" % AN_KEY[p])) + _g.glob(os.path.join(PROBED, "*_%s.json" % AN_KEY[p])):
            try: Q = json.load(open(f))
            except Exception: continue
            for c in Q.get("cells", []):
                if c.get("contact") and c["contact"].get("point"): zs.append(c["contact"]["point"][2])
    exz[p] = max(zs) if zs else float("nan")
P("  %-28s" % "executed max ball-centre z" + "".join("%13.3f" % exz[p] for p in MAIN))

P("\n### PHASE 14 — lateral/vertical coupling (analytic; hand centre)")
P("  %-34s" % "" + "".join("%13s" % p for p in MAIN))
for lab, k in [("max lateral at comfort height", "latAtComfort"), ("lateral at 90 % of max vertical", "latAt90pctVert"),
               ("lateral at the crossbar height", "latAtBarHand"), ("lateral at MAXIMUM vertical", "latAtMaxVertHand")]:
    P("  %-34s" % lab + "".join("%13.3f" % AN["profiles"][AN_KEY[p]]["coupling"][k] for p in MAIN))

# ── figures
def draw_goal(ax):
    ax.add_patch(plt.Rectangle((-3.66, 0), 7.32, BAR, fill=False, ec="#111", lw=3))
    ax.plot([-4.6, 4.6], [0, 0], color="#444", lw=1.2)
    ax.axvline(0, color="#888", lw=0.7, ls=":")
    ax.set_xlim(-4.7, 4.7); ax.set_ylim(-0.15, 3.35); ax.set_aspect("equal")
    ax.set_xlabel("lateral from keeper centre (m)", fontsize=7); ax.set_ylabel("height (m)", fontsize=7)
    ax.tick_params(labelsize=6)
def plot_profile(ax, p, legend=False):
    draw_goal(ax)
    zh, Lh = analytic_curve(p, "hand"); zb, Lb = analytic_curve(p, "ball")
    ax.plot(np.r_[-Lb[::-1], Lb], np.r_[zb[::-1], zb], color=COL[p], lw=2.0, label="absolute physical boundary (ball centre)")
    ax.plot(np.r_[-Lh[::-1], Lh], np.r_[zh[::-1], zh], color=COL[p], lw=1.0, ls="--", alpha=.8, label="hand-centre superellipse")
    zs, lat, _ = fineB[p]
    if zs is not None:
        m = ~np.isnan(lat)
        ax.plot(np.r_[-lat[m][::-1], lat[m]], np.r_[zs[m][::-1], zs[m]], color="#000", lw=1.2, marker="o", ms=2.2,
                label="executed boundary (generous time)")
    pp, nn = prodp[p], prodn[p]
    for lv, st in [(0.9, "-"), (0.5, "--"), (0.1, ":")]:
        hw = contour_halfwidth(pp, nn, lv)
        m = ~np.isnan(hw)
        if m.sum() > 1:
            ax.plot(np.r_[-hw[m][::-1], hw[m]], np.r_[ZBC[m][::-1], ZBC[m]], color="#555", lw=1.0, ls=st,
                    label="%d %% contact (production shots)" % int(100 * lv))
    a = AN["profiles"][AN_KEY[p]]
    ax.plot([0], [a["env"]["comfortZ"]], marker="+", ms=9, color=COL[p])
    ax.axhline(a["anatomy"]["standingFingertipZ"], color="#999", lw=0.6, ls="-.")
    ax.set_title("%s — h %.2f m, diving %d, jumping %d, reflexes %d\nmax ball-centre %.2f m (bar 2.44) · max lateral %.2f m"
                 % (p, a["anatomy"]["heightM"], a["attrs"]["diving"], a["attrs"]["jumping"], a["attrs"]["reflexes"],
                    a["anatomy"]["maxBallCentreZ"], max(Lb)), fontsize=8)
    if legend: ax.legend(fontsize=5.6, loc="upper right")
fig, axs = plt.subplots(2, 2, figsize=(13, 8.4))
for ax, p in zip(axs.ravel(), MAIN): plot_profile(ax, p, legend=(p == "K1"))
fig.suptitle("Physical contact envelope in the keeper's plane (x = %.2f, %.2f m in front of the line), on a regulation 7.32 x 2.44 m goal"
             % (SETX, 105.0 - SETX), fontsize=10)
fig.tight_layout(rect=[0, 0, 1, 0.96]); fig.savefig(os.path.join(OUT, "envelope_individual.png"), dpi=140); plt.close(fig)

fig, ax = plt.subplots(figsize=(9.5, 5.4)); draw_goal(ax)
for p in MAIN:
    zb, Lb = analytic_curve(p, "ball")
    ax.plot(np.r_[-Lb[::-1], Lb], np.r_[zb[::-1], zb], color=COL[p], lw=2.0, label="%s absolute boundary" % p)
    zs, lat, _ = fineB[p]
    if zs is not None:
        m = ~np.isnan(lat)
        ax.plot(np.r_[-lat[m][::-1], lat[m]], np.r_[zs[m][::-1], zs[m]], color=COL[p], lw=1.0, ls=":", alpha=.85)
ax.axhline(BAR, color="#111", lw=1.0, ls="--"); ax.text(-4.6, BAR + 0.03, "crossbar 2.44 m", fontsize=6.5)
ax.legend(fontsize=7, loc="upper right")
ax.set_title("K1 / K2 / K3 / COURTOIS — absolute ball-centre contact envelopes (solid) and executed boundaries (dotted)", fontsize=9)
fig.tight_layout(); fig.savefig(os.path.join(OUT, "envelope_combined.png"), dpi=140); plt.close(fig)

# time-conditioned
TIMES = ["0.20", "0.30", "0.40", "0.50", "0.70", "1.00", "1.60"]
fig, axs = plt.subplots(1, 4, figsize=(19, 4.6))
P("\n### PHASE 15 — executed envelope half-width (m) by usable post-reaction time, at the keeper's comfort height band")
P("  %-10s" % "usable s" + "".join("%13s" % p for p in MAIN))
tser = {p: {} for p in MAIN}
for ti, tt in enumerate(TIMES):
    row = []
    for p in MAIN:
        G = load_grid("%s_u%s" % (AN_KEY[p], tt)); zs, lat, _ = grid_boundary(G)
        v = np.nan
        if zs is not None and len(zs):
            band = [lat[k] for k in range(len(zs)) if 0.9 <= zs[k] <= 1.6 and not np.isnan(lat[k])]
            v = max(band) if band else np.nan
        tser[p][tt] = None if np.isnan(v) else round(float(v), 3)
        row.append("-" if np.isnan(v) else "%.2f" % v)
    P("  %-10s" % tt + "".join("%13s" % r for r in row))
for ax, p in zip(axs, MAIN):
    draw_goal(ax)
    cmap = plt.get_cmap("viridis")
    for k, tt in enumerate(TIMES):
        G = load_grid("%s_u%s" % (AN_KEY[p], tt)); zs, lat, _ = grid_boundary(G)
        if zs is None: continue
        m = ~np.isnan(lat)
        if m.sum() < 2: continue
        ax.plot(np.r_[-lat[m][::-1], lat[m]], np.r_[zs[m][::-1], zs[m]], color=cmap(k / (len(TIMES) - 1)), lw=1.3, label="%s s" % tt)
    zb, Lb = analytic_curve(p, "ball")
    ax.plot(np.r_[-Lb[::-1], Lb], np.r_[zb[::-1], zb], color="#111", lw=1.4, ls="--", label="anatomical max")
    ax.set_title("%s — envelope vs usable time" % p, fontsize=8.5); ax.legend(fontsize=5.4, loc="upper right")
fig.suptitle("Time-conditioned executed contact envelopes (usable post-reaction time; reaction latency removed per profile)", fontsize=10)
fig.tight_layout(rect=[0, 0, 1, 0.95]); fig.savefig(os.path.join(OUT, "envelope_time.png"), dpi=140); plt.close(fig)

json.dump({"lateralByHeight": {p: {str(k): v for k, v in tab_lat[p].items()} for p in MAIN},
           "timeSeries": tser, "executedMaxBallCentreZ": exz}, open(os.path.join(OUT, "envelope_data.json"), "w"), indent=1)
open(os.path.join(OUT, "envelope_tables.txt"), "w").write("\n".join(rep) + "\n")
print("wrote", OUT)
