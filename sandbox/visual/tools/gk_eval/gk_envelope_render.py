#!/usr/bin/env python3
"""Render gk_envelope.js outputs: goal-face CONTACT / SAVE / CATCH maps (goal-line bins) and the same
contact map in KEEPER-PLANE coordinates, for one JSON or a grid of JSONs (profiles x flight times).

  python3 gk_envelope_render.py env.json out.png
  python3 gk_envelope_render.py --grid "POOR,BELOW,GOOD,VGOOD,ELITE" --times "0.55,0.85,1.25" \
        --pattern "envout/{p}_S_f{t}.json" --metric contact [--plane] out.png
"""
import json, sys, math, os
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
POSTA, POSTB, BAR = 30.34, 37.66, 2.44
CM = LinearSegmentedColormap.from_list("sv", ["#7f0000", "#d7301f", "#fc8d59", "#fee08b", "#d9ef8b", "#66bd63", "#1a9850", "#006837"])

def load(f): return json.load(open(f))

def metric_of(c, metric):
    if c.get("unsolved"): return np.nan
    if metric == "contact": return 1.0 if c.get("contact") else 0.0
    if metric == "save":    return 0.0 if c.get("goal") else 1.0
    if metric == "catch":   return 1.0 if (c.get("contact") and c["contact"].get("held")) else 0.0
    if metric == "parry":   return 1.0 if (c.get("contact") and not c["contact"].get("held") and not c.get("goal")) else 0.0
    if metric == "through": return 1.0 if (c.get("contact") and c.get("goal")) else 0.0
    if metric == "norm":    return c["commit"]["norm"] if c.get("commit") and c["commit"].get("norm") is not None else np.nan
    if metric == "execT":   return c["commit"]["execT"] if c.get("commit") else np.nan
    if metric == "usable":  return c.get("usable", np.nan)
    raise ValueError(metric)

def grid(D, metric, plane=False):
    ys, zs = D["ys"], D["zs"]; G = np.full((len(zs), len(ys)), np.nan)
    for c in D["cells"]:
        i = zs.index(c["z"]); j = ys.index(c["y"]); G[i, j] = metric_of(c, metric)
    if not plane: return np.array(ys), np.array(zs), G
    py = [c["plane"]["y"] for c in D["cells"] if c.get("plane")]; pz = [c["plane"]["z"] for c in D["cells"] if c.get("plane")]
    if not py: return None
    ye = np.linspace(min(py) - 0.05, max(py) + 0.05, len(ys) + 1); ze = np.linspace(0, max(max(pz) + 0.05, 2.6), len(zs) + 1)
    S = np.zeros((len(zs), len(ys))); N = np.zeros_like(S)
    for c in D["cells"]:
        if not c.get("plane") or c.get("unsolved"): continue
        i = min(len(zs) - 1, max(0, np.searchsorted(ze, c["plane"]["z"]) - 1)); j = min(len(ys) - 1, max(0, np.searchsorted(ye, c["plane"]["y"]) - 1))
        S[i, j] += metric_of(c, metric); N[i, j] += 1
    with np.errstate(invalid="ignore"): G = np.where(N > 0, S / np.maximum(N, 1), np.nan)
    return 0.5 * (ye[1:] + ye[:-1]), 0.5 * (ze[1:] + ze[:-1]), G

def draw(ax, ys, zs, G, title, plane=False, setY=None, env=None, vmin=0, vmax=1, label=True):
    dy = (ys[1] - ys[0]) if len(ys) > 1 else 0.3; dz = (zs[1] - zs[0]) if len(zs) > 1 else 0.2
    im = ax.imshow(G, origin="lower", extent=[ys[0] - dy / 2, ys[-1] + dy / 2, zs[0] - dz / 2, zs[-1] + dz / 2],
                   cmap=CM, vmin=vmin, vmax=vmax, aspect="equal", interpolation="nearest")
    if not plane:
        ax.plot([POSTA, POSTA, POSTB, POSTB], [0, BAR, BAR, 0], color="#111", lw=3)
    else:
        ax.axhline(BAR, color="#111", lw=1, ls=":")
        if setY is not None: ax.axvline(setY, color="#111", lw=1, ls=":")
        if env and setY is not None:
            p = 2.2; L = np.linspace(-env["maxLat"], env["maxLat"], 200)
            up = env["comfortZ"] + env["maxVertUp"] * (1 - np.abs(L / env["maxLat"]) ** p) ** (1 / p)
            dn = env["comfortZ"] - env["maxVertDown"] * (1 - np.abs(L / env["maxLat"]) ** p) ** (1 / p)
            ax.plot(setY + L, up, color="#111", lw=1.2, ls="--"); ax.plot(setY + L, dn, color="#111", lw=1.2, ls="--")
    if label and G.shape[1] <= 19:
        for i in range(G.shape[0]):
            for j in range(G.shape[1]):
                v = G[i, j]
                if not np.isnan(v):
                    ax.text(ys[j], zs[i], "%d" % round(100 * v), ha="center", va="center", fontsize=5, color="#111" if 0.25 < v < 0.85 else "#fff")
    ax.set_title(title, fontsize=8); ax.set_xlim(POSTA - 0.6, POSTB + 0.6); ax.set_ylim(0, 2.9); ax.tick_params(labelsize=6)
    return im

def summary(D):
    cs = [c for c in D["cells"] if not c.get("unsolved")]; n = len(cs)
    ct = sum(1 for c in cs if c.get("contact")); sv = sum(1 for c in cs if not c.get("goal")); ca = sum(1 for c in cs if c.get("contact") and c["contact"].get("held"))
    return n, 100 * ct / max(1, n), 100 * sv / max(1, n), 100 * ca / max(1, n)

def main():
    a = sys.argv[1:]
    if a and a[0] == "--grid":
        profs = a[1].split(","); times = a[a.index("--times") + 1].split(","); pat = a[a.index("--pattern") + 1]
        metric = a[a.index("--metric") + 1] if "--metric" in a else "contact"; out = a[-1]; plane = "--plane" in a
        fig, axs = plt.subplots(len(profs), len(times), figsize=(4.6 * len(times), 3.2 * len(profs)), squeeze=False)
        dist = None
        for i, pn in enumerate(profs):
            for j, tt in enumerate(times):
                f = pat.format(p=pn, t=tt.replace(".", "")); ax = axs[i][j]
                if not os.path.exists(f): ax.set_title(f + " (missing)", fontsize=7); ax.axis("off"); continue
                D = load(f); dist = D.get("meta", {}).get("dist", dist); g = grid(D, metric, plane)
                if g is None: ax.axis("off"); continue
                ys, zs, G = g; n, ct, sv, ca = summary(D); setY = D["cells"][0].get("setY") if D["cells"] else None
                isPlane = plane or D.get("target") == "plane"
                draw(ax, ys, zs, G, "%s · flight %s s · %s\ncontact %.0f%% · save %.0f%% · catch %.0f%% (n=%d)" % (pn, tt, metric.upper(), ct, sv, ca, n),
                     plane=isPlane, setY=setY, env=D.get("env"), label=(len(times) <= 4))
        tgt = load(pat.format(p=profs[0], t=times[0].replace(".", ""))).get("target", "line") if os.path.exists(pat.format(p=profs[0], t=times[0].replace(".", ""))) else "line"
        coords = "KEEPER-PLANE (plane-targeted grid)" if tgt == "plane" else ("KEEPER-PLANE (rebinned)" if plane else "GOAL-LINE")
        fig.suptitle("Goalkeeper save envelope — %s map, %s coordinates, shooter %s m central" % (metric.upper(), coords, dist), fontsize=11)
        fig.tight_layout(); fig.savefig(out, dpi=130, bbox_inches="tight"); print("wrote", out); return
    f, out = a[0], a[1]; D = load(f)
    fig, axs = plt.subplots(2, 3, figsize=(15, 7.6)); setY = D["cells"][0].get("setY")
    for ax, (metric, plane) in zip(axs.flat, [("contact", False), ("save", False), ("catch", False), ("contact", True), ("norm", False), ("execT", False)]):
        g = grid(D, metric, plane)
        if g is None: ax.axis("off"); continue
        ys, zs, G = g; vmax = 1 if metric in ("contact", "save", "catch") else (1.3 if metric == "norm" else 0.7)
        im = draw(ax, ys, zs, G, "%s (%s)" % (metric.upper(), "keeper plane" if plane else "goal line"), plane=plane, setY=setY, env=D.get("env"), vmin=0, vmax=vmax, label=metric in ("contact", "save", "catch"))
        if metric in ("norm", "execT"): fig.colorbar(im, ax=ax, fraction=0.04)
    n, ct, sv, ca = summary(D); m = D["meta"]
    cond = ("flight %s s" % m["flight"]) if m.get("flight") else ("usable %s s" % m["usable"]) if m.get("usable") else ("speed %s" % m["speed"])
    fig.suptitle("%s · %s · %.1f m · %s · latency %.3f s · contact %.0f%% · save %.0f%% · catch %.0f%% · action %s" % (
        m["profileName"], m["family"], m["dist"], cond, D["latency"], ct, sv, ca, D["frozen"]["actionModel"]), fontsize=10)
    fig.tight_layout(); fig.savefig(out, dpi=130, bbox_inches="tight"); print("wrote", out)

main()
