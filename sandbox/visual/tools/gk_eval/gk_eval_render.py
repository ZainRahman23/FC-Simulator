#!/usr/bin/env python3
"""Render the GOALKEEPER V1 evaluation battery (gk_eval_battery.js output) into review sheets.

Usage:  python3 sandbox/visual/tools/gk_eval/gk_eval_render.py gk_eval.json [out_dir]
        python3 sandbox/visual/tools/gk_eval/gk_eval_render.py before.json --compare after.json [out_dir]

Sheets (PNG, matplotlib):
  gk_eval_rates.png     contact rate / save|contact / total save per technique and per origin (bar charts)
  gk_eval_goalface.png  goal-face maps per technique: keeper-OFF crossing bins coloured by outcome
                        (SAVE / contact-but-goal / clean goal) — the three numbers are kept SEPARATE
  gk_eval_outcomes.png  Stage-4 outcome mix per technique (CATCH / parries / body / foot-leg / fingertip / miss)
  gk_eval_delta.png     (compare mode) per-bin transitions SAVE→GOAL / GOAL→SAVE between two runs
  gk_eval_summary.json  the numbers behind the sheets
The battery is a MEASUREMENT: never tune keeper constants against it.
"""
import json, sys, os, collections, itertools
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

args = sys.argv[1:]
if not args:
    print(__doc__); sys.exit(1)
cmp_path = None
if "--compare" in args:
    i = args.index("--compare"); cmp_path = args[i + 1]; del args[i:i + 2]
src = args[0]; out = args[1] if len(args) > 1 else os.path.dirname(os.path.abspath(src))
os.makedirs(out, exist_ok=True)
D = json.load(open(src)); M = D["meta"]; V = [s for s in D["shots"] if s.get("valid")]
techs = M["techs"]; origins = [o["name"] for o in M["origins"]]
postA, postB = M["postA"], M["postB"]

def rates(rows):
    n = len(rows); c = sum(1 for s in rows if s.get("contact")); sv = sum(1 for s in rows if s.get("contact") and not s.get("goal"))
    return dict(n=n, contact=c, saves=sv, contactRate=(c / n if n else 0), saveGivenContact=(sv / c if c else 0), totalSave=(sv / n if n else 0))

summary = {"overall": rates(V), "byTech": {t: rates([s for s in V if s["tech"] == t]) for t in techs},
           "byOrigin": {o: rates([s for s in V if s["origin"] == o]) for o in origins},
           "byBand": {}, "cfg": M.get("cfg"), "source": os.path.abspath(src), "generated": D.get("generated")}
# height × lateral bands on the keeper-OFF crossing
def band(s):
    u = s["u"]; z = u["z"]; lat = abs(u["y"] - 34.0)
    zb = "low(<0.5)" if z < 0.5 else "mid(0.5-1.5)" if z < 1.5 else "high(>=1.5)"
    lb = "central(<1.2)" if lat < 1.2 else "inner(1.2-2.4)" if lat < 2.4 else "corner(>=2.4)"
    return zb + " × " + lb
for k, g in itertools.groupby(sorted(V, key=band), key=band):
    summary["byBand"][k] = rates(list(g))

# ── sheet 1: rates
fig, axes = plt.subplots(1, 2, figsize=(15, 5.2))
for ax, (title, keys, getter) in zip(axes, [("by technique", techs, lambda k: summary["byTech"][k]), ("by shooter origin", origins, lambda k: summary["byOrigin"][k])]):
    x = np.arange(len(keys)); w = 0.27
    for j, (lab, key, col) in enumerate([("contact rate", "contactRate", "#4c9be8"), ("save | contact", "saveGivenContact", "#f0b429"), ("total save", "totalSave", "#3fbf6f")]):
        vals = [100 * getter(k)[key] for k in keys]
        ax.bar(x + (j - 1) * w, vals, w, label=lab, color=col)
        for xi, v in zip(x + (j - 1) * w, vals): ax.text(xi, v + 1, f"{v:.0f}", ha="center", fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels([f"{k}\n(n={getter(k)['n']})" for k in keys], fontsize=8); ax.set_ylim(0, 110); ax.set_ylabel("%")
    ax.set_title(f"GK eval — {title}"); ax.legend(fontsize=8, loc="upper right"); ax.grid(axis="y", alpha=0.3)
o = summary["overall"]
fig.suptitle(f"Goalkeeper V1 evaluation battery — {o['n']} on-target shots: contact {100*o['contactRate']:.1f}%  save|contact {100*o['saveGivenContact']:.1f}%  total save {100*o['totalSave']:.1f}%   [{M.get('cfg',{}).get('select','')} strict≤{M.get('cfg',{}).get('strictNorm','')} back≤{M.get('cfg',{}).get('backMax','')}]", fontsize=10)
fig.tight_layout(); fig.savefig(os.path.join(out, "gk_eval_rates.png"), dpi=130); plt.close(fig)

# ── sheet 2: goal-face maps per technique
cols = len(techs); fig, axes = plt.subplots(1, cols, figsize=(4.2 * cols, 4.4), squeeze=False)
for ax, t in zip(axes[0], techs):
    rows = [s for s in V if s["tech"] == t]
    for s in rows:
        u = s["u"]; kind = "save" if (s.get("contact") and not s.get("goal")) else ("leak" if s.get("contact") else "goal")
        ax.scatter(u["y"], u["z"], s=14, c={"save": "#3fbf6f", "leak": "#f0b429", "goal": "#e05252"}[kind], edgecolors="none", alpha=0.85)
    ax.plot([postA, postA, postB, postB], [0, 2.44, 2.44, 0], color="#333", lw=1.5)
    ax.set_xlim(postA - 0.6, postB + 0.6); ax.set_ylim(-0.1, 2.9); ax.set_aspect("equal"); ax.invert_xaxis()
    r = summary["byTech"][t]; ax.set_title(f"{t}  n={r['n']}  save {100*r['totalSave']:.0f}%", fontsize=9); ax.set_xlabel("keeper-OFF crossing y (m, viewed from the pitch)"); ax.set_ylabel("z (m)")
fig.suptitle("Goal-face outcome maps (green SAVE · amber contact-but-goal · red clean goal) — bins are keeper-OFF crossings", fontsize=10)
fig.tight_layout(); fig.savefig(os.path.join(out, "gk_eval_goalface.png"), dpi=130); plt.close(fig)

# ── sheet 3: outcome mix
order = ["CATCH", "CONTROLLED PARRY", "WEAK PARRY", "FINGERTIP", "BODY BLOCK", "FOOT SAVE", "LEG SAVE", "DEFLECTION/through", "MISS"]
def okey(s):
    if not s.get("contact"): return "MISS"
    oc = s["contact"].get("outcome") or "?"
    if "through" in oc or "DEFLECTION" in oc: return "DEFLECTION/through"
    for k in order:
        if oc.startswith(k): return k
    return "?"
mix = {t: collections.Counter(okey(s) for s in V if s["tech"] == t) for t in techs}
summary["outcomeMix"] = {t: dict(c) for t, c in mix.items()}
fig, ax = plt.subplots(figsize=(11, 4.6)); x = np.arange(len(techs)); bottom = np.zeros(len(techs))
palette = ["#3fbf6f", "#7fd8a5", "#f0b429", "#f6d27a", "#4c9be8", "#9bc7f2", "#b8e0ff", "#e08f52", "#e05252"]
for k, col in zip(order, palette):
    vals = np.array([mix[t].get(k, 0) for t in techs], float)
    ax.bar(x, vals, 0.6, bottom=bottom, label=k, color=col); bottom += vals
ax.set_xticks(x); ax.set_xticklabels(techs); ax.set_ylabel("on-target shots"); ax.legend(fontsize=7, ncol=3); ax.set_title("Stage-4 outcome mix per technique"); ax.grid(axis="y", alpha=0.3)
fig.tight_layout(); fig.savefig(os.path.join(out, "gk_eval_outcomes.png"), dpi=130); plt.close(fig)

# ── compare mode
if cmp_path:
    D2 = json.load(open(cmp_path)); V2 = {(s["band"], s["mom"], s["origin"], s["tech"], s["charge"], s["aimY"]): s for s in D2["shots"] if s.get("valid")}
    trans = collections.Counter(); pts = []
    for s in V:
        k = (s["band"], s["mom"], s["origin"], s["tech"], s["charge"], s["aimY"]); b = V2.get(k)
        if not b: continue
        a_s = bool(s.get("contact") and not s.get("goal")); b_s = bool(b.get("contact") and not b.get("goal"))
        key = ("SAVE" if a_s else "GOAL") + "→" + ("SAVE" if b_s else "GOAL"); trans[key] += 1
        if a_s != b_s: pts.append((s["u"]["y"], s["u"]["z"], key, s["tech"]))
    summary["compare"] = {"other": os.path.abspath(cmp_path), "transitions": dict(trans), "flips": [{"y": y, "z": z, "t": k, "tech": tt} for y, z, k, tt in pts]}
    fig, ax = plt.subplots(figsize=(7.5, 4.8))
    for y, z, k, tt in pts: ax.scatter(y, z, s=40, c="#3fbf6f" if k == "GOAL→SAVE" else "#e05252", marker="^" if k == "GOAL→SAVE" else "v", edgecolors="k", linewidths=0.4)
    ax.plot([postA, postA, postB, postB], [0, 2.44, 2.44, 0], color="#333", lw=1.5); ax.set_xlim(postA - 0.6, postB + 0.6); ax.set_ylim(-0.1, 2.9); ax.set_aspect("equal"); ax.invert_xaxis()
    ax.set_title(f"A→B flips: {dict(trans)}  (green ▲ GOAL→SAVE, red ▼ SAVE→GOAL)", fontsize=9)
    fig.tight_layout(); fig.savefig(os.path.join(out, "gk_eval_delta.png"), dpi=130); plt.close(fig)

json.dump(summary, open(os.path.join(out, "gk_eval_summary.json"), "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("overall",)}, indent=0))
for t in techs: r = summary["byTech"][t]; print(f"  {t:<12} n={r['n']:<4} contact {100*r['contactRate']:5.1f}%  save|contact {100*r['saveGivenContact']:5.1f}%  total {100*r['totalSave']:5.1f}%")
if cmp_path: print("transitions", summary["compare"]["transitions"])
print("sheets in", out)
