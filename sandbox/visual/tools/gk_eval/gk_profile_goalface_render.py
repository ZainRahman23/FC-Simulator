#!/usr/bin/env python3
"""Analyse + render gk_profile_goalface.js output: matched CONTACT / SAVE|CONTACT / TOTAL SAVE /
CATCH|CONTACT goal-face maps for every keeper profile on identical axes, bins and scales, plus the
speed-conditioned (hard-shot) tables, lateral-band tables, corner tables, INSIDE_R skew and the
K1->K2->K3 monotonicity audit.
  python3 gk_profile_goalface_render.py gf_profiles.json out_dir/
"""
import json, sys, os, math, statistics as st
from collections import Counter, defaultdict
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

POSTA, POSTB, BAR, CY, LINE, BALLR = 30.34, 37.66, 2.44, 34.0, 105.0, 0.11
NY, NZ = 19, 11
YE = np.linspace(POSTA + BALLR, POSTB - BALLR, NY + 1); ZE = np.linspace(BALLR, BAR - BALLR, NZ + 1)
YC = 0.5 * (YE[1:] + YE[:-1]); ZC = 0.5 * (ZE[1:] + ZE[:-1])
CM = LinearSegmentedColormap.from_list("sv", ["#7f0000", "#d7301f", "#fc8d59", "#fee08b", "#d9ef8b", "#66bd63", "#1a9850", "#006837"])
# the previous audit's band definitions, unchanged
ZB4 = [("LOW", 0.11, 0.6), ("MID", 0.6, 1.5), ("HIGH", 1.5, 2.05), ("TOP", 2.05, 2.33)]
LB  = [("centre", 0, 0.7), ("inner", 0.7, 1.9), ("outer", 1.9, 2.9), ("extreme", 2.9, 3.7)]

D = json.load(open(sys.argv[1])); OUTD = sys.argv[2]; os.makedirs(OUTD, exist_ok=True)
PROFS = D["profileOrder"]; SETY = D["geometry"]["set"][1]
FAMS = [f for f in ["STRAIGHT", "INSIDE_R"] if f in D["families"]]
report = []
def P(*a):
    line = " ".join(str(x) for x in a); print(line); report.append(line)
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs))
def onshots(fam): return [s for s in D["families"][fam]["shots"] if s.get("on") and s["on"]]
def binidx(y, z):
    i = int(np.searchsorted(YE, y) - 1); j = int(np.searchsorted(ZE, z) - 1)
    return None if (i < 0 or i >= NY or j < 0 or j >= NZ) else (j, i)
def cellmaps(shots, prof):
    cells = defaultdict(list)
    for s in shots:
        k = binidx(s["off"]["line"]["y"], s["off"]["line"]["z"])
        if k: cells[k].append(s)
    n = np.zeros((NZ, NY)); ct = np.full((NZ, NY), np.nan); sc = np.full((NZ, NY), np.nan)
    ts = np.full((NZ, NY), np.nan); cc = np.full((NZ, NY), np.nan)
    for (j, i), ss in cells.items():
        n[j, i] = len(ss); c = [s for s in ss if s["on"][prof]["contacts"]]
        ct[j, i] = len(c) / len(ss); ts[j, i] = sum(1 for s in ss if not s["on"][prof]["goal"]) / len(ss)
        if c:
            sc[j, i] = sum(1 for s in c if not s["on"][prof]["goal"]) / len(c)
            cc[j, i] = sum(1 for s in c if s["on"][prof]["held"]) / len(c)
    return dict(n=n, contact=ct, sgc=sc, total=ts, catch=cc)
def draw(ax, G, title, n=None):
    ax.imshow(G, origin="lower", extent=[YE[0], YE[-1], ZE[0], ZE[-1]], cmap=CM, vmin=0, vmax=1, aspect="equal", interpolation="nearest")
    ax.plot([POSTA, POSTA, POSTB, POSTB], [0, BAR, BAR, 0], color="#111", lw=3)
    ax.axvline(CY, color="#333", lw=0.7, ls=":"); ax.axhline(BAR / 2, color="#333", lw=0.7, ls=":")
    ax.axvline(SETY, color="#0044cc", lw=1.0, ls="--")
    for j in range(NZ):
        for i in range(NY):
            v = G[j, i]
            if not np.isnan(v):
                ax.text(YC[i], ZC[j], "%d" % round(100 * v), ha="center", va="center", fontsize=4.2,
                        color="#111" if 0.30 < v < 0.85 else "#fff")
    ax.set_title(title, fontsize=8); ax.set_xlim(POSTA - 0.4, POSTB + 0.4); ax.set_ylim(-0.1, 2.72); ax.tick_params(labelsize=5.5)

P("BUILD/DEFAULTS:", json.dumps(D["defaults"]))
P("GEOMETRY:", json.dumps(D["geometry"]))
P("CHECKS:", json.dumps(D["checks"]))
P("\n=== KEEPER PROFILES (individual attributes only; OVR is metadata and never an engine input) ===")
hdr = "  %-22s" % "" + "".join("%12s" % p for p in PROFS)
P(hdr)
for k in ["height", "weight", "diving", "handling", "reflexes", "jumping", "positioning", "acceleration", "speed", "strength", "ovr"]:
    P("  %-22s" % k + "".join("%12s" % (D["profiles"][p].get(k) if D["profiles"][p].get(k) is not None else "-") for p in PROFS))
P("  %-22s" % "(positioning HELD at)" + "".join("%12s" % D["geometry"]["posHeldAt"] for p in PROFS))
P("\n=== DERIVED ENGINE QUANTITIES ===")
ek = ["comfortZ", "maxLat", "maxVertUp", "maxVertDown", "highReachZ", "standingReachZ", "handRestZ", "latency",
      "moveAccel", "moveVmax", "handAccel", "latDrive", "upDrive", "downDrive", "load"]
P(hdr)
for k in ek:
    P("  %-22s" % k + "".join("%12s" % D["envs"][p][k] for p in PROFS))

allmaps = {}
for fam in FAMS:
    on = onshots(fam)
    P("\n\n################ %s — %d on-target shots (wide %d, over %d, no crossing %d) ################"
      % (fam, len(on), D["families"][fam]["offTarget"]["wide"], D["families"][fam]["offTarget"]["over"], D["families"][fam]["offTarget"]["noCrossing"]))
    allmaps[fam] = {p: cellmaps(on, p) for p in PROFS}
    # ── headline comparison
    P("\n=== ALL ON-TARGET ===")
    P(hdr)
    rows = {}
    for p in PROFS:
        c = [s for s in on if s["on"][p]["contacts"]]
        rows[p] = dict(contact=pct(bool(s["on"][p]["contacts"]) for s in on),
                       sgc=pct(not s["on"][p]["goal"] for s in c),
                       total=pct(not s["on"][p]["goal"] for s in on),
                       catch=pct(s["on"][p]["held"] for s in c))
    for k, lab in [("contact", "CONTACT %"), ("sgc", "SAVE|CONTACT %"), ("total", "TOTAL SAVE %"), ("catch", "CATCH|CONTACT %")]:
        P("  %-22s" % lab + "".join("%12.1f" % rows[p][k] for p in PROFS))
    # ── speed-conditioned populations (previous audit's exact definitions)
    groups = [("ALL on-target", on),
              ("bounced before line", [s for s in on if s["off"]["bounces"] > 0]),
              ("in air, < 18 m/s", [s for s in on if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] < 18]),
              ("in air, 18-21 m/s", [s for s in on if s["off"]["bounces"] == 0 and 18 <= s["off"]["line"]["sp"] < 21]),
              ("in air, >= 21 m/s", [s for s in on if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21])]
    for gn, g in groups:
        if not g: P("\n=== %s — (none) ===" % gn); continue
        P("\n=== %s  [n=%d] — CONTACT / SAVE|CONTACT / TOTAL / CATCH|CONTACT ===" % (gn, len(g)))
        P(hdr)
        for k, lab in [("contact", "CONTACT %"), ("sgc", "SAVE|CONTACT %"), ("total", "TOTAL SAVE %"), ("catch", "CATCH|CONTACT %")]:
            vals = []
            for p in PROFS:
                c = [s for s in g if s["on"][p]["contacts"]]
                v = dict(contact=pct(bool(s["on"][p]["contacts"]) for s in g),
                         sgc=pct(not s["on"][p]["goal"] for s in c),
                         total=pct(not s["on"][p]["goal"] for s in g),
                         catch=pct(s["on"][p]["held"] for s in c))[k]
                vals.append(v)
            P("  %-22s" % lab + "".join("%12.1f" % v for v in vals))
    # ── hard subset: lateral band x height, per profile
    hard = [s for s in on if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]
    if len(hard) < 40:
        hard = [s for s in on if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18]
        hardlab = "in air >= 18 m/s (family cannot reach 21)"
    else:
        hardlab = "in air >= 21 m/s"
    P("\n=== HARD SUBSET (%s, n=%d) — TOTAL SAVE %% [n] by lateral band x height ===" % (hardlab, len(hard)))
    for p in PROFS:
        P("  -- %s" % p)
        P("     %-8s" % "" + "".join("%14s" % l[0] for l in LB))
        for zn, z0, z1 in ZB4:
            row = []
            for ln, y0, y1 in LB:
                ss = [s for s in hard if y0 <= abs(s["off"]["line"]["y"] - CY) < y1 and z0 <= s["off"]["line"]["z"] < z1]
                row.append("%5.0f%% [%3d]" % (pct(not s["on"][p]["goal"] for s in ss), len(ss)) if ss else "-")
            P("     %-8s" % zn + "".join("%14s" % r for r in row))
    # ── corners (hard subset)
    P("\n=== CORNERS (hard subset) — TOTAL SAVE %% [n] ===")
    cor = {"top-left": lambda s: s["off"]["line"]["y"] - CY <= -1.9 and s["off"]["line"]["z"] >= 1.7,
           "top-right": lambda s: s["off"]["line"]["y"] - CY >= 1.9 and s["off"]["line"]["z"] >= 1.7,
           "bottom-left": lambda s: s["off"]["line"]["y"] - CY <= -1.9 and s["off"]["line"]["z"] < 0.6,
           "bottom-right": lambda s: s["off"]["line"]["y"] - CY >= 1.9 and s["off"]["line"]["z"] < 0.6}
    P("  %-16s" % "" + "".join("%12s" % p for p in PROFS))
    for cn, fn in cor.items():
        ss = [s for s in hard if fn(s)]
        P("  %-16s" % ("%s [%d]" % (cn, len(ss))) + "".join("%12s" % ("%.0f%%" % pct(not s["on"][p]["goal"] for s in ss) if ss else "-") for p in PROFS))
    # ── monotonicity
    P("\n=== MONOTONICITY — matched shots where a WEAKER keeper saves and a STRONGER one concedes ===")
    order = [p for p in ["K1", "K2", "K3"] if p in PROFS]
    for a, b in zip(order, order[1:]):
        bad = [s for s in on if not s["on"][a]["goal"] and s["on"][b]["goal"]]
        P("  %s SAVE -> %s GOAL : %d of %d on-target" % (a, b, len(bad), len(on)))
        for s in bad[:12]:
            P("     aim %.3f charge %.4f  line (y%+.2f, z%.2f) sp %.1f  %s contacts=%d  %s contacts=%d"
              % (s["aimY"], s["c"], s["off"]["line"]["y"] - CY, s["off"]["line"]["z"], s["off"]["line"]["sp"],
                 a, len(s["on"][a]["contacts"]), b, len(s["on"][b]["contacts"])))
    for p in PROFS:
        if p in ("K1",): continue
        bad = [s for s in on if not s["on"]["K1"]["goal"] and s["on"][p]["goal"]] if "K1" in PROFS else []
        if bad: P("  K1 SAVE -> %s GOAL : %d" % (p, len(bad)))
    # ── INSIDE_R skew
    if fam == "INSIDE_R":
        dys = [s["off"]["plane"]["y"] - s["off"]["line"]["y"] for s in on if s["off"]["plane"]]
        dzs = [s["off"]["plane"]["z"] - s["off"]["line"]["z"] for s in on if s["off"]["plane"]]
        P("\n=== INSIDE_R keeper-plane vs goal-line displacement (profile independent, keeper-OFF) ===")
        P("  dy median %+.3f mean %+.3f min %+.3f max %+.3f | dz median %+.3f" % (st.median(dys), sum(dys)/len(dys), min(dys), max(dys), st.median(dzs)))
        P("  TOTAL SAVE left/right half of the goal line:")
        P("  %-16s" % "" + "".join("%12s" % p for p in PROFS))
        L = [s for s in on if s["off"]["line"]["y"] < CY]; R = [s for s in on if s["off"]["line"]["y"] >= CY]
        P("  %-16s" % ("left [%d]" % len(L)) + "".join("%12.1f" % pct(not s["on"][p]["goal"] for s in L) for p in PROFS))
        P("  %-16s" % ("right [%d]" % len(R)) + "".join("%12.1f" % pct(not s["on"][p]["goal"] for s in R) for p in PROFS))
    # ── figures: 4 metrics x N profiles
    for metric, lab in [("contact", "CONTACT %"), ("sgc", "SAVE | CONTACT %"), ("total", "TOTAL SAVE %"), ("catch", "CATCH | CONTACT %")]:
        pass
    fig, axs = plt.subplots(4, len(PROFS), figsize=(4.3 * len(PROFS), 13.0), squeeze=False)
    for r, (metric, lab) in enumerate([("contact", "CONTACT %"), ("sgc", "SAVE | CONTACT %"), ("total", "TOTAL SAVE %"), ("catch", "CATCH | CONTACT %")]):
        for c, p in enumerate(PROFS):
            draw(axs[r][c], allmaps[fam][p][metric], "%s — %s\n%s" % (p, lab, fam))
    fig.suptitle("%s — matched goal-face maps, identical shots / bins / scale (0-100%%), keeper viewed from the shooter" % fam, fontsize=11)
    fig.tight_layout(rect=[0, 0, 1, 0.975]); fig.savefig(os.path.join(OUTD, "maps_%s.png" % fam), dpi=130); plt.close(fig)
    # hard-subset TOTAL SAVE map
    fig, axs = plt.subplots(1, len(PROFS), figsize=(4.3 * len(PROFS), 3.6), squeeze=False)
    for c, p in enumerate(PROFS):
        draw(axs[0][c], cellmaps(hard, p)["total"], "%s — TOTAL SAVE %% (%s)" % (p, hardlab))
    fig.tight_layout(); fig.savefig(os.path.join(OUTD, "maps_hard_%s.png" % fam), dpi=130); plt.close(fig)

open(os.path.join(OUTD, "report.txt"), "w").write("\n".join(report) + "\n")
json.dump({f: {p: {k: (lambda a: [[None if np.isnan(v) else round(float(v), 4) for v in row] for row in a])(allmaps[f][p][k])
                   for k in ["contact", "sgc", "total", "catch", "n"]} for p in PROFS} for f in FAMS},
          open(os.path.join(OUTD, "cellmaps.json"), "w"))
print("wrote", OUTD)
