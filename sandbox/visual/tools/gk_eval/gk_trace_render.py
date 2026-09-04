#!/usr/bin/env python3
"""Render gk_trace_cell.js traces: one row per trace, top-down + side view (keeper root/hand path, ball path,
SET root, PREPARE target, COMMIT root/target, contact point, events).  python3 gk_trace_render.py traces.json out.png"""
import json, sys
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
POSTA, POSTB, LINE, CY, BAR = 30.34, 37.66, 105.0, 34.0, 2.44
T = json.load(open(sys.argv[1])); T = [r for r in T if not r.get("fail")]
fig, axs = plt.subplots(len(T), 2, figsize=(15, 4.2 * len(T)), squeeze=False)
for i, r in enumerate(T):
    tr = r["tr"]; prof = r["prof"]; cm = r.get("commit"); ax = axs[i][0]
    ax.plot([LINE, LINE], [POSTA, POSTB], color="#111", lw=5, solid_capstyle="butt"); ax.axhline(CY, color="#eee", ls=":")
    ax.plot([p[0] for p in prof], [p[1] for p in prof], "-", color="#e8a33d", lw=2, label="ball (free flight)")
    ax.plot([s[1] for s in tr], [s[2] for s in tr], ":", color="#b05a00", lw=1.2, label="ball (live)")
    ax.plot([s[4] for s in tr], [s[5] for s in tr], "-", color="#3b7dd8", lw=2, label="keeper root")
    pre = [s for s in tr if s[8] and not s[7]]
    if pre: ax.plot([s[4] for s in pre], [s[5] for s in pre], "-", color="#d73027", lw=3.2, alpha=.85, label="PREPARE")
    dv = [s for s in tr if s[7]]
    if dv: ax.plot([s[9] for s in dv], [s[10] for s in dv], "--", color="#7b3fbf", lw=1.6, label="hand (dive)")
    ax.plot([r["set"][0]], [r["set"][1]], "s", ms=8, color="#1a9850", label="SET root")
    if r.get("prep") and r["prep"].get("tgt"): ax.plot([r["prep"]["tgt"][0]], [r["prep"]["tgt"][1]], "x", ms=9, mew=2.4, color="#d73027", label="PREPARE target")
    if cm: ax.plot([cm["feet"][0]], [cm["feet"][1]], "o", ms=7, color="#7b3fbf", label="COMMIT root"); ax.plot([cm["target"][0]], [cm["target"][1]], "*", ms=13, color="#7b3fbf", label="dive target")
    for e in r["ev"]:
        if e["e"].startswith("KEEPER") and e.get("pt"): ax.plot([e["pt"][0]], [e["pt"][1]], "o", ms=8, mfc="none", mec="#111", mew=2)
    ax.set_xlim(min(99.0, r["set"][0] - 3.5), 106.2); ax.set_ylim(28.5, 39.5); ax.invert_yaxis(); ax.set_aspect("equal"); ax.grid(alpha=.2)
    o = r["outcome"]; ax.set_title("%s — %s%s   [%s %s]\nv0 %.1f m/s · %s · %s" % (r["id"], o["contact"] or "no contact", " → GOAL" if o["goal"] else "", r["cell"].get("profile", "custom") if isinstance(r["cell"].get("profile"), str) else "custom", r["cell"].get("family", "STRAIGHT"), r["launch"]["v0"],
        ("commit %.2fs %s exec %.2fs norm %.2f" % (cm["t"], cm["action"], cm["execT"], cm["norm"])) if cm else "no commit", " · ".join(e["e"] for e in r["ev"])[:90]), fontsize=8)
    if i == 0: ax.legend(fontsize=6.5, loc="lower left", ncol=2)
    ax = axs[i][1]; env = r["env"]
    ax.plot([LINE, LINE], [0, BAR], color="#111", lw=5, solid_capstyle="butt"); ax.plot([LINE - 0.4, LINE], [BAR, BAR], color="#111", lw=4); ax.axhline(0, color="#bbb")
    ax.plot([p[0] for p in prof], [p[2] for p in prof], "-", color="#e8a33d", lw=2)
    ax.plot([s[1] for s in tr], [s[3] for s in tr], ":", color="#b05a00", lw=1.2)
    ax.plot([s[9] for s in tr], [s[11] for s in tr], "-", color="#7b3fbf", lw=2, label="hand z")
    ax.axvline(r["set"][0], color="#1a9850", lw=2, alpha=.8); ax.axhline(env["comfortZ"], color="#888", ls=":", lw=1); ax.axhline(env["highReachZ"], color="#888", ls="-.", lw=1)
    if cm: ax.axvline(cm["feet"][0], color="#d73027", ls="--", lw=1.6); ax.plot([cm["target"][0]], [cm["target"][2]], "*", ms=13, color="#7b3fbf")
    for e in r["ev"]:
        if e["e"].startswith("KEEPER") and e.get("pt"): ax.plot([e["pt"][0]], [e["pt"][2]], "o", ms=8, mfc="none", mec="#111", mew=2)
        if e.get("q"): ax.text(0.02, 0.96, "catch %.2f/thr %.2f · ctrl %.2f · sRel %.1f m/s · norm %.2f · two %.2f · align %.2f" % (e["q"]["catch"] or 0, e["q"]["thr"] or 0, e["q"]["ctrl"] or 0, e["q"]["sRel"] or 0, e["q"]["norm"] or 0, e["q"]["two"] or 0, e["q"]["align"] or 0), transform=ax.transAxes, fontsize=7, va="top")
    ax.set_xlim(min(99.0, r["set"][0] - 3.5), 106.2); ax.set_ylim(0, 3.1); ax.grid(alpha=.2); ax.set_title("side view", fontsize=8)
    if i == 0: ax.legend(fontsize=6.5, loc="lower left")
fig.tight_layout(); fig.savefig(sys.argv[2], dpi=115, bbox_inches="tight"); print("wrote", sys.argv[2])
