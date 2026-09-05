#!/usr/bin/env python3
"""Analyse + render gk_goalface_audit.js output: six primary maps (CONTACT, SAVE|CONTACT, TOTAL SAVE per family),
goal-probability maps, catch maps, keeper-plane physical envelope, central column, lateral bands, straight
symmetry, INSIDE_R skew, per-cell geometry medians, failure classification, comparison table.
  python3 gk_goalface_audit_render.py gf_audit.json out_dir/
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
CM_SAVE = LinearSegmentedColormap.from_list("sv", ["#7f0000", "#d7301f", "#fc8d59", "#fee08b", "#d9ef8b", "#66bd63", "#1a9850", "#006837"])
CM_GOAL = LinearSegmentedColormap.from_list("gl", ["#006837", "#1a9850", "#66bd63", "#d9ef8b", "#fee08b", "#fc8d59", "#d7301f", "#7f0000"])
D = json.load(open(sys.argv[1])); OUTD = sys.argv[2]; os.makedirs(OUTD, exist_ok=True)
SETY = D["geometry"]["set"][1]; SETX = D["geometry"]["set"][0]; ENV = D["env"]; LAT = ENV["latency"]
def onshots(fam): return [s for s in D["families"][fam]["shots"] if s.get("on")]
def binidx(y, z):
    i = int(np.searchsorted(YE, y) - 1); j = int(np.searchsorted(ZE, z) - 1)
    if i < 0 or i >= NY or j < 0 or j >= NZ: return None
    return (j, i)
def cellmaps(shots):
    """returns dict of NZxNY arrays: n, contact, saveGivenContact, totalSave, catchGivenContact, goal, plus per-cell lists"""
    cells = defaultdict(list)
    for s in shots:
        k = binidx(s["off"]["line"]["y"], s["off"]["line"]["z"])
        if k: cells[k].append(s)
    n = np.zeros((NZ, NY)); ct = np.full((NZ, NY), np.nan); sc = np.full((NZ, NY), np.nan); ts = np.full((NZ, NY), np.nan); cc = np.full((NZ, NY), np.nan); gl = np.full((NZ, NY), np.nan)
    for (j, i), ss in cells.items():
        n[j, i] = len(ss); c = [s for s in ss if s["on"]["contacts"]]; ng = [s for s in ss if not s["on"]["goal"]]
        ct[j, i] = len(c) / len(ss); ts[j, i] = len(ng) / len(ss); gl[j, i] = 1 - ts[j, i]
        if c: sc[j, i] = sum(1 for s in c if not s["on"]["goal"]) / len(c); cc[j, i] = sum(1 for s in c if any(x["held"] for x in s["on"]["contacts"])) / len(c)
    return dict(n=n, contact=ct, sgc=sc, total=ts, catch=cc, goal=gl, cells=cells)
def draw(ax, G, title, cmap=CM_SAVE, vmin=0, vmax=1, n=None, contour=None, label=True):
    im = ax.imshow(G, origin="lower", extent=[YE[0], YE[-1], ZE[0], ZE[-1]], cmap=cmap, vmin=vmin, vmax=vmax, aspect="equal", interpolation="nearest")
    ax.plot([POSTA, POSTA, POSTB, POSTB], [0, BAR, BAR, 0], color="#111", lw=3); ax.axvline(CY, color="#333", lw=0.8, ls=":"); ax.axhline(BAR / 2, color="#333", lw=0.8, ls=":")
    ax.axvline(SETY, color="#0044cc", lw=1.1, ls="--")
    if contour is not None:
        try: ax.contour(YC, ZC, np.nan_to_num(contour, nan=0.0), levels=[0.5], colors="#000", linewidths=1.8)
        except Exception: pass
    if label:
        for j in range(NZ):
            for i in range(NY):
                v = G[j, i]
                if not np.isnan(v): ax.text(YC[i], ZC[j], "%d" % round(100 * v) if n is None else "%d" % round(100 * v), ha="center", va="center", fontsize=4.6, color="#111" if 0.3 < (v if cmap is CM_SAVE else 1 - v) < 0.85 else "#fff")
    ax.set_title(title, fontsize=8.5); ax.set_xlim(POSTA - 0.5, POSTB + 0.5); ax.set_ylim(-0.1, 2.75); ax.tick_params(labelsize=6)
    return im
def nanmean(a): a = [x for x in a if x is not None and not (isinstance(x, float) and math.isnan(x))]; return sum(a) / len(a) if a else float("nan")
report = []
def P(*a): line = " ".join(str(x) for x in a); print(line); report.append(line)
P("BUILD/DEFAULTS:", json.dumps(D["defaults"])); P("GEOMETRY:", json.dumps(D["geometry"])); P("ENVELOPE:", json.dumps(ENV)); P("CHECKS:", json.dumps(D["checks"]))
FAMS = [f for f in ["STRAIGHT", "INSIDE_R"] if f in D["families"]]
maps = {f: cellmaps(onshots(f)) for f in FAMS}
# ── six primary maps + goal + catch
fig, axs = plt.subplots(len(FAMS), 3, figsize=(17, 4.6 * len(FAMS)), squeeze=False)
for r, f in enumerate(FAMS):
    m = maps[f]; on = onshots(f)
    draw(axs[r][0], m["contact"], "%s · MAP 1 CONTACT %% (n=%d on-target)  — black: 50%% contact boundary" % (f, len(on)), contour=m["contact"])
    draw(axs[r][1], m["sgc"], "%s · MAP 2 SAVE | CONTACT %%" % f)
    draw(axs[r][2], m["total"], "%s · MAP 3 TOTAL SAVE %% (non-goal / on-target)" % f, contour=m["contact"])
fig.suptitle("K1 goal-face audit — shooter at the D apex (%.2f m), binned by UNTOUCHED goal-line crossing, %d×%d cells, production shots" % (D["geometry"]["distToLine"], NY, NZ), fontsize=11)
fig.tight_layout(); fig.savefig(OUTD + "/maps_primary.png", dpi=140, bbox_inches="tight"); plt.close(fig)
fig, axs = plt.subplots(len(FAMS), 3, figsize=(17, 4.6 * len(FAMS)), squeeze=False)
for r, f in enumerate(FAMS):
    m = maps[f]
    draw(axs[r][0], m["goal"], "%s · TOTAL GOAL %% (green = easiest for keeper … red = hardest)" % f, cmap=CM_GOAL, contour=m["contact"])
    draw(axs[r][1], m["catch"], "%s · CATCH | CONTACT %%" % f)
    draw(axs[r][2], m["n"] / max(1, m["n"].max()), "%s · shots per cell (max %d; white = unpopulated by this family)" % (f, int(m["n"].max())), cmap=plt.cm.Blues, label=False)
    for j in range(NZ):
        for i in range(NY):
            if m["n"][j, i] > 0: axs[r][2].text(YC[i], ZC[j], "%d" % m["n"][j, i], ha="center", va="center", fontsize=4.6, color="#111")
fig.tight_layout(); fig.savefig(OUTD + "/maps_goal_catch_n.png", dpi=140, bbox_inches="tight"); plt.close(fig)
# ── keeper-plane physical envelope: contact vs ball position at the SET plane (binned) + per-shot scatter
fig, axs = plt.subplots(1, len(FAMS), figsize=(8.5 * len(FAMS), 5.2), squeeze=False)
for r, f in enumerate(FAMS):
    on = onshots(f); ax = axs[0][r]
    for s in on:
        pl = s["off"]["plane"]
        if not pl: continue
        c = s["on"]["contacts"]; held = any(x["held"] for x in c)
        col = "#006837" if held else ("#66bd63" if (c and not s["on"]["goal"]) else ("#fc8d59" if c else "#7f0000"))
        ax.plot([pl["y"]], [pl["z"]], "o", ms=3.2, color=col, alpha=.85)
    p = 2.2; L = np.linspace(-ENV["maxLat"], ENV["maxLat"], 200)
    ax.plot(SETY + L, ENV["comfortZ"] + ENV["maxVertUp"] * (1 - np.abs(L / ENV["maxLat"]) ** p) ** (1 / p), "--", color="#111", lw=1.2, label="static reach envelope (from SET)")
    ax.plot(SETY + L, ENV["comfortZ"] - ENV["maxVertDown"] * (1 - np.abs(L / ENV["maxLat"]) ** p) ** (1 / p), "--", color="#111", lw=1.2)
    ax.axvline(SETY, color="#0044cc", lw=1, ls=":"); ax.axhline(ENV["handZ"], color="#888", lw=0.8, ls=":"); ax.axhline(BAR, color="#555", lw=0.8)
    ax.set_xlim(POSTA - 1.2, POSTB + 1.2); ax.set_ylim(-0.05, 3.0); ax.set_aspect("equal"); ax.grid(alpha=.2)
    ax.set_title("%s — ball at the keeper's SET plane (x=%.2f): catch ● / other save ● / contact-but-goal ● / no contact ●" % (f, SETX), fontsize=8.5)
    if r == 0: ax.legend(fontsize=7, loc="upper left")
fig.suptitle("Keeper-plane physical contact envelope (each dot = one production shot; keeper SET at y=%.2f, hand rest z=%.2f)" % (SETY, ENV["handZ"]), fontsize=10)
fig.tight_layout(); fig.savefig(OUTD + "/keeper_plane_envelope.png", dpi=140, bbox_inches="tight"); plt.close(fig)
# ── tables
def pct(xs): return 100.0 * sum(1 for x in xs if x) / max(1, len(xs))
def fam_stats(f):
    on = onshots(f); c = [s for s in on if s["on"]["contacts"]]
    return dict(n=len(on), contact=pct([s["on"]["contacts"] for s in on]), sgc=pct([not s["on"]["goal"] for s in c]), total=pct([not s["on"]["goal"] for s in on]),
                catch=pct([any(x["held"] for x in s["on"]["contacts"]) for s in c]))
ZB8 = [("ground", 0.11, 0.33), ("low", 0.33, 0.6), ("low-mid", 0.6, 0.9), ("mid", 0.9, 1.25), ("mid-high", 1.25, 1.6), ("high", 1.6, 1.9), ("near-top", 1.9, 2.15), ("top", 2.15, 2.33)]
LB7 = [("extreme L", -3.7, -2.9), ("outer L", -2.9, -1.9), ("inner L", -1.9, -0.7), ("centre", -0.7, 0.7), ("inner R", 0.7, 1.9), ("outer R", 1.9, 2.9), ("extreme R", 2.9, 3.7)]
ZB4 = [("LOW", 0.11, 0.6), ("MID", 0.6, 1.5), ("HIGH", 1.5, 2.05), ("TOP", 2.05, 2.33)]
def sel(on, y0, y1, z0, z1): return [s for s in on if y0 <= s["off"]["line"]["y"] - CY < y1 and z0 <= s["off"]["line"]["z"] < z1]
def trio(ss):
    c = [s for s in ss if s["on"]["contacts"]]
    return (pct([s["on"]["contacts"] for s in ss]), pct([not s["on"]["goal"] for s in c]) if c else float("nan"), pct([not s["on"]["goal"] for s in ss]), len(ss))
P("\n=== CENTRAL COLUMN (|y − centre| ≤ 0.45 m) — CONTACT / SAVE|CONTACT / TOTAL SAVE (n) ===")
P("  %-9s | %-30s | %-30s" % ("band", "STRAIGHT", "INSIDE_R"))
for nm, z0, z1 in ZB8:
    row = []
    for f in FAMS:
        c, s, t_, n = trio(sel(onshots(f), -0.45, 0.45, z0, z1)); row.append("%5.0f%% / %5s / %5.0f%% (%3d)" % (c, ("%.0f%%" % s) if s == s else "  -  ", t_, n))
    P("  %-9s | %s" % (nm, " | ".join(row)))
for f in FAMS:
    on = onshots(f)
    P("\n=== %s · LATERAL BANDS × HEIGHT — TOTAL SAVE %% (CONTACT %% / SAVE|CONTACT %%) [n] ===" % f)
    P("  %-8s" % "" + "".join("%23s" % b[0] for b in LB7))
    for zn, z0, z1 in ZB4:
        cells = []
        for ln, y0, y1 in LB7:
            c, s, t_, n = trio(sel(on, y0, y1, z0, z1)); cells.append(("%5.0f%% (%3.0f/%3s) [%3d]" % (t_, c, ("%.0f" % s) if s == s else " -", n)) if n else "%23s" % "unpopulated")
        P("  %-8s" % zn + "".join("%23s" % x for x in cells))
# ── straight symmetry
if "STRAIGHT" in maps:
    m = maps["STRAIGHT"]; diffs = []
    for j in range(NZ):
        for i in range(NY // 2):
            a, b_ = m["total"][j, i], m["total"][j, NY - 1 - i]
            if not np.isnan(a) and not np.isnan(b_): diffs.append(abs(a - b_))
    P("\n=== STRAIGHT MIRROR SYMMETRY ===")
    P("  mirrored-cell TOTAL SAVE difference: mean %.3f  max %.3f  (%d cell pairs)" % (nanmean(diffs), max(diffs) if diffs else float("nan"), len(diffs)))
    P("  matched mirrored trials:", json.dumps(D["checks"].get("straightMirror", {})))
# ── INSIDE_R skew + keeper-plane displacement
if "INSIDE_R" in maps:
    on = onshots("INSIDE_R"); dy = [s["off"]["plane"]["y"] - s["off"]["line"]["y"] for s in on if s["off"]["plane"]]; dz = [s["off"]["plane"]["z"] - s["off"]["line"]["z"] for s in on if s["off"]["plane"]]
    P("\n=== INSIDE_R KEEPER-PLANE vs GOAL-LINE DISPLACEMENT (ball at SET plane minus goal-line crossing) ===")
    P("  Δy: median %+.3f  mean %+.3f  min %+.3f  max %+.3f   Δz: median %+.3f" % (st.median(dy), st.mean(dy), min(dy), max(dy), st.median(dz)))
    P("  setup angle (deg): median %.1f  min %.1f  max %.1f ; spin median %.2f ; target clamped %d/%d" % (st.median([s["off"]["launch"]["setupDeg"] for s in on if s["off"]["launch"]["setupDeg"] is not None] or [0]), min([s["off"]["launch"]["setupDeg"] for s in on if s["off"]["launch"]["setupDeg"] is not None] or [0]), max([s["off"]["launch"]["setupDeg"] for s in on if s["off"]["launch"]["setupDeg"] is not None] or [0]), st.median([s["off"]["launch"]["spin"] for s in on if s["off"]["launch"]["spin"]] or [0]), sum(1 for s in on if s["off"]["launch"]["tgtClamped"]), len(on)))
    m = maps["INSIDE_R"]; ms = maps.get("STRAIGHT")
    left = [s for s in on if s["off"]["line"]["y"] < CY - 0.4]; right = [s for s in on if s["off"]["line"]["y"] > CY + 0.4]
    P("  skew: TOTAL SAVE left %.0f%% vs right %.0f%%  (STRAIGHT %.0f%% vs %.0f%%)" % (pct([not s["on"]["goal"] for s in left]), pct([not s["on"]["goal"] for s in right]),
      pct([not s["on"]["goal"] for s in onshots("STRAIGHT") if s["off"]["line"]["y"] < CY - 0.4]) if ms else float("nan"), pct([not s["on"]["goal"] for s in onshots("STRAIGHT") if s["off"]["line"]["y"] > CY + 0.4]) if ms else float("nan")))
    # per-cell median plane position (written to csv)
    with open(OUTD + "/insideR_cell_plane_median.csv", "w") as fh:
        fh.write("cell_y,cell_z,n,median_plane_y,median_plane_z,median_dy,median_dz,total_save\n")
        for (j, i), ss in sorted(m["cells"].items()):
            py = [s["off"]["plane"]["y"] for s in ss if s["off"]["plane"]]; pz = [s["off"]["plane"]["z"] for s in ss if s["off"]["plane"]]
            if py: fh.write("%.3f,%.3f,%d,%.3f,%.3f,%+.3f,%+.3f,%.3f\n" % (YC[i], ZC[j], len(ss), st.median(py), st.median(pz), st.median(py) - YC[i], st.median(pz) - ZC[j], m["total"][j, i]))
# ── per-cell geometry medians (item 15)
for f in FAMS:
    m = maps[f]
    with open(OUTD + "/%s_cell_geometry.csv" % f, "w") as fh:
        fh.write("cell_y,cell_z,n,med_lateral_req,med_vertical_req,med_reach_norm,med_usable,action_mode,surface_mode,med_contact_margin,contact_pct,total_save_pct\n")
        for (j, i), ss in sorted(m["cells"].items()):
            lat = [abs(s["off"]["plane"]["y"] - SETY) for s in ss if s["off"]["plane"]]; ver = [s["off"]["plane"]["z"] - ENV["handZ"] for s in ss if s["off"]["plane"]]
            nrm = [s["on"]["commit"]["norm"] for s in ss if s["on"]["commit"] and s["on"]["commit"]["norm"] is not None]; us = [s["off"]["plane"]["t"] - LAT for s in ss if s["off"]["plane"]]
            act = Counter(s["on"]["commit"]["action"] for s in ss if s["on"]["commit"]).most_common(1); surf = Counter(s["on"]["contacts"][0]["surface"] for s in ss if s["on"]["contacts"]).most_common(1)
            mg = [s["on"]["contacts"][0]["q"]["reachMargin"] for s in ss if s["on"]["contacts"] and s["on"]["contacts"][0]["q"]]
            fh.write("%.3f,%.3f,%d,%.3f,%.3f,%.3f,%.3f,%s,%s,%.3f,%.1f,%.1f\n" % (YC[i], ZC[j], len(ss), st.median(lat) if lat else float("nan"), st.median(ver) if ver else float("nan"), st.median(nrm) if nrm else float("nan"), st.median(us) if us else float("nan"), act[0][0] if act else "-", surf[0][0] if surf else "-", st.median(mg) if mg else float("nan"), 100 * m["contact"][j, i], 100 * m["total"][j, i]))
# ── failure classification
def classify(s):
    o = s["on"]; c = o["contacts"]; cm = o["commit"]; pl = s["off"]["plane"]; tags = []
    if c:
        oc = c[0]["outcome"]; goalAfter = o["goal"]
        if oc.startswith("FINGERTIP"): tags.append("fingertip-through")
        elif oc.startswith("WEAK PARRY"): tags.append("weak-parry-through")
        elif oc.startswith("CONTROLLED PARRY") or oc.startswith("BODY BLOCK") or "SAVE" in oc: tags.append("rebound-goal")
        elif "DEFLECTION" in oc: tags.append("body/leg-through")
        else: tags.append("other-contact")
        q = c[0]["q"]
        if q and q["catchScore"] is not None and q["catchThresh"] is not None and q["catchScore"] < q["catchThresh"] and (q["sRel"] or 99) < 16: tags.append("handling-failure")
        return tags[0], tags
    usable = (pl["t"] - LAT) if pl else 0
    if usable < 0.10: tags.append("reaction-limited")
    if cm:
        lat = abs(pl["y"] - SETY) if pl else 0; dz = (pl["z"] - ENV["handZ"]) if pl else 0; vmax = ENV["maxVertUp"] if dz >= 0 else ENV["maxVertDown"]
        if cm["norm"] is not None and cm["norm"] > 1.0:
            if abs(dz) / vmax > lat / ENV["maxLat"] * 1.3: tags.append("vertical-reach")
            elif lat / ENV["maxLat"] > abs(dz) / vmax * 1.3: tags.append("lateral-reach")
            else: tags.append("absolute-reach")
        elif cm["feasible"] is False or (cm["avail"] is not None and cm["avail"] + 0.02 < cm["execT"]):
            tags.append("action-time-limited" if cm["dBody"] is not None and cm["dBody"] < 0.3 else "movement-limited")
    else: tags.append("commit-limited")
    if not tags: tags.append("no-contact")
    order = ["reaction-limited", "vertical-reach", "lateral-reach", "absolute-reach", "movement-limited", "action-time-limited", "commit-limited", "no-contact"]
    return next(t for t in order if t in tags), tags
P("\n=== FAILURE CLASSIFICATION of conceded on-target shots (binding cause) ===")
for f in FAMS:
    on = onshots(f); goals = [s for s in on if s["on"]["goal"]]; C = Counter(classify(s)[0] for s in goals)
    reach = sum(v for k, v in C.items() if k in ("reaction-limited", "vertical-reach", "lateral-reach", "absolute-reach", "movement-limited", "action-time-limited", "commit-limited", "no-contact"))
    P("  %s: %d goals of %d on-target — A (cannot reach) %d = %.0f%%, B (contact but not saved) %d = %.0f%%" % (f, len(goals), len(on), reach, 100 * reach / max(1, len(goals)), len(goals) - reach, 100 * (len(goals) - reach) / max(1, len(goals))))
    for k, v in C.most_common(): P("     %-22s %4d (%.0f%%)" % (k, v, 100 * v / max(1, len(goals))))
# ── comparison table
P("\n=== COMPARISON TABLE ===")
P("  %-18s %12s %12s" % ("", "STRAIGHT", "INSIDE_R"))
rows = {}
for f in FAMS:
    on = onshots(f); fs = fam_stats(f)
    def tot(ss): return pct([not s["on"]["goal"] for s in ss]) if ss else float("nan")
    rows[f] = {"CONTACT %": fs["contact"], "SAVE|CONTACT %": fs["sgc"], "TOTAL SAVE %": fs["total"], "CATCH|CONTACT %": fs["catch"],
               "centre MID": tot(sel(on, -0.7, 0.7, 0.6, 1.5)), "centre HIGH": tot(sel(on, -0.7, 0.7, 1.5, 2.05)), "inner MID": tot(sel(on, -1.9, -0.7, 0.6, 1.5) + sel(on, 0.7, 1.9, 0.6, 1.5)),
               "outer MID": tot(sel(on, -2.9, -1.9, 0.6, 1.5) + sel(on, 1.9, 2.9, 0.6, 1.5)), "top corners": tot(sel(on, -3.7, -1.9, 2.05, 2.33) + sel(on, 1.9, 3.7, 2.05, 2.33)),
               "bottom corners": tot(sel(on, -3.7, -1.9, 0.11, 0.6) + sel(on, 1.9, 3.7, 0.11, 0.6)), "extreme corners top": tot(sel(on, -3.7, -2.9, 2.05, 2.33) + sel(on, 2.9, 3.7, 2.05, 2.33)),
               "extreme corners bottom": tot(sel(on, -3.7, -2.9, 0.11, 0.6) + sel(on, 2.9, 3.7, 0.11, 0.6)), "on-target n": len(on)}
for k in rows[FAMS[0]]:
    P("  %-22s" % k + "".join("%12s" % (("%.0f" % rows[f][k]) if isinstance(rows[f][k], float) and rows[f][k] == rows[f][k] else str(rows[f][k])) for f in FAMS))
open(OUTD + "/report.txt", "w").write("\n".join(report)); json.dump(rows, open(OUTD + "/comparison.json", "w"), indent=1)
print("wrote", OUTD)
