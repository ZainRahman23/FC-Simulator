#!/usr/bin/env python3
"""Attribute response curves from a gk_profile_goalface.js --sweep dataset.

  python3 gk_attr_curves.py sweep.json [--out outdir] [--label build]

For the swept attribute it reports, per value:
  * the OWNED quantity taken from the per-profile env record the harness computed on the live page
    (latency / hand acceleration / drives / reach axes / movement accel+vmax / secure-hold speed),
  * outcome metrics on the identical corpus: CONTACT %, SAVE|CONTACT %, TOTAL SAVE %, CATCH|CONTACT %,
    CONTROLLED PARRY|CONTACT %, WEAK PARRY|CONTACT %, hard-subset TOTAL SAVE by lateral band x height,
  * matched-shot MONOTONICITY between adjacent values: shots where the higher value concedes and the lower
    saves, classified as (a) no-contact->contact loss [reach/timing], (b) same first contact (volume, <10 cm,
    <1 tick) with a different Stage-4 outcome [post-contact quality], (c) different contact geometry [action/
    geometry], (d) rebound chain (second contact differs).
Writes <out>/<attr>_curves.png, <out>/<attr>_curves.md and <out>/<attr>_curves.json.
"""
import json, sys, os, math
import numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt

args = sys.argv[1:]
def opt(k, d=None):
    return args[args.index(k) + 1] if k in args else d
F = args[0]; OUT = opt("--out", os.path.dirname(os.path.abspath(F))); LABEL = opt("--label", "")
os.makedirs(OUT, exist_ok=True)
D = json.load(open(F)); META = D.get("meta", {}); PROFS = D["profileOrder"]; CY = 34.0
SWEEP = META.get("sweep") or ""; ATTR = SWEEP.split("=")[0] if SWEEP else "?"
def rating(nm):
    if "__" in nm: return float(nm.split("_")[-1])
    return float(D["profiles"][nm].get(ATTR, float("nan")))
order = sorted(PROFS, key=rating)
ZB4 = [("LOW", 0.11, 0.6), ("MID", 0.6, 1.5), ("HIGH", 1.5, 2.05), ("TOP", 2.05, 2.33)]
LB = [("centre", 0, 0.7), ("inner", 0.7, 1.9), ("outer", 1.9, 2.9), ("extreme", 2.9, 3.7)]
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs))
def on(fam): return [s for s in D["families"][fam]["shots"] if s.get("on")]
def hard(sh):
    h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]
    return (h, ">=21") if len(h) >= 40 else ([s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18], ">=18")
def first(rec):
    c = rec["contacts"]; return c[0] if c else None
def outcome_class(rec):
    c = first(rec)
    if not c: return "none"
    o = c["outcome"]
    if c.get("held"): return "held"
    if o.startswith("CONTROLLED PARRY"): return "ctrl"
    if o.startswith("WEAK PARRY"): return "weak"
    if o.startswith("FINGERTIP"): return "finger"
    if "BODY" in o: return "body"
    if "FOOT" in o or "LEG" in o: return "legs"
    return "other"
def metrics(sh, p):
    c = [s for s in sh if s["on"][p]["contacts"]]
    m = dict(n=len(sh), contact=pct(bool(s["on"][p]["contacts"]) for s in sh), sgc=pct(not s["on"][p]["goal"] for s in c),
             total=pct(not s["on"][p]["goal"] for s in sh), catch=pct(s["on"][p]["held"] for s in c),
             ctrl=pct(outcome_class(s["on"][p]) == "ctrl" for s in c), weak=pct(outcome_class(s["on"][p]) in ("weak", "finger") for s in c),
             legs=pct(outcome_class(s["on"][p]) == "legs" for s in c))
    return m
def classify(a, b, shot=None):
    """a = record of the LOWER rating (saved), b = HIGHER rating (conceded)."""
    ca, cb = first(a), first(b)
    # boundary graze on an unreachable slow low ball (footwork-cap region): both keepers committed a best-effort
    # (UNREACHABLE) dive at a ball below 0.6 m and under 12 m/s; the "save" was a fingertip graze deflecting a trickle
    ta = (a.get("commit") or {}).get("tier", ""); tb = (b.get("commit") or {}).get("tier", "")
    if shot and shot["off"]["line"]["z"] < 0.6 and shot["off"]["line"]["sp"] < 12 and ta == "UNREACHABLE" and tb == "UNREACHABLE" and ca and ca["outcome"].startswith("FINGERTIP"):
        return "boundary graze, unreachable slow roller (footwork-cap region)"
    if ca and not cb: return "contact lost (reach/timing)"
    if not ca and cb: return "new contact, conceded (rebound)"
    if not ca and not cb: return "no contact either (goal both? inconsistent)"
    same = ca["volume"] == cb["volume"] and abs(ca["t"] - cb["t"]) <= 0.02 and ca.get("point") and cb.get("point") and \
        math.dist(ca["point"], cb["point"]) < 0.10
    if same:
        if ca["outcome"] == cb["outcome"]:
            return "same contact & outcome, rebound path differs" if len(a["contacts"]) == len(b["contacts"]) else "same contact & outcome, rebound chain differs"
        return "same contact, Stage-4 outcome differs"
    return "different contact geometry (action/timing)"
res = {"attr": ATTR, "label": LABEL, "values": [], "families": {}}
env_keys = ["latency", "handAccel", "latDrive", "upDrive", "downDrive", "load", "moveAccel", "moveVmax", "maxLat", "maxVertUp", "maxVertDown", "highReachZ", "standingReachZ", "comfortZ"]
for p in order:
    e = D["envs"].get(p, {}); res["values"].append({"profile": p, "rating": rating(p), "env": {k: e.get(k) for k in env_keys}})
for fam in D["families"]:
    sh = on(fam); h, hl = hard(sh); rows = []
    for p in order:
        m = metrics(sh, p); mh = metrics(h, p)
        bands = {}
        for zn, z0, z1 in ZB4:
            for ln, y0, y1 in LB:
                ss = [s for s in h if y0 <= abs(s["off"]["line"]["y"] - CY) < y1 and z0 <= s["off"]["line"]["z"] < z1]
                bands["%s %s" % (ln, zn)] = (pct(not s["on"][p]["goal"] for s in ss) if ss else None, len(ss))
        rows.append({"profile": p, "rating": rating(p), "all": m, "hard": mh, "bands": bands})
    inv = []
    for lo, hi in zip(order, order[1:]):
        bad = [s for s in sh if not s["on"][lo]["goal"] and s["on"][hi]["goal"]]
        cls = {}
        for s in bad:
            k = classify(s["on"][lo], s["on"][hi], s); cls[k] = cls.get(k, 0) + 1
        gain = sum(1 for s in sh if s["on"][lo]["goal"] and not s["on"][hi]["goal"])
        inv.append({"pair": [lo, hi], "ratings": [rating(lo), rating(hi)], "inversions": len(bad), "gains": gain, "classes": cls,
                    "examples": [{"aimY": s["aimY"], "c": s["c"], "lo": (first(s["on"][lo]) or {}).get("outcome"), "hi": (first(s["on"][hi]) or {}).get("outcome")} for s in bad[:4]]})
    res["families"][fam] = {"n": len(sh), "hard_n": len(h), "hard_label": hl, "rows": rows, "monotonicity": inv}
json.dump(res, open(os.path.join(OUT, "%s_curves.json" % ATTR), "w"), indent=1)
# ── markdown
L = ["### %s — response curve (%s; base %s; corpus %s)" % (ATTR, LABEL, META.get("base"), "/".join(D["families"].keys())), ""]
L.append("| rating | " + " | ".join(env_keys) + " |"); L.append("|" + "---|" * (len(env_keys) + 1))
for v in res["values"]:
    L.append("| %s | " % ("%g" % v["rating"]) + " | ".join("%s" % (("%.4g" % v["env"][k]) if isinstance(v["env"][k], (int, float)) else "—") for k in env_keys) + " |")
for fam, R in res["families"].items():
    L.append(""); L.append("**%s** (n = %d on-target; hard = in-air %s, n = %d) — CONTACT / SAVE|CONTACT / TOTAL / CATCH|CONTACT / CTRL-PARRY|C / WEAK|C / LEGS|C, then hard TOTAL SAVE by band" % (fam, R["n"], R["hard_label"], R["hard_n"]))
    L.append("| rating | all: contact | save\\|c | total | catch\\|c | ctrl\\|c | weak\\|c | legs\\|c | hard: total | centre MID | inner MID | outer MID | inner HIGH | outer HIGH | extreme HIGH | outer TOP | extreme TOP |")
    L.append("|" + "---|" * 18)
    for r in R["rows"]:
        a, hm, b = r["all"], r["hard"], r["bands"]
        f = lambda k: ("%.0f" % b[k][0]) if b[k][0] is not None else "—"
        L.append("| %g | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %s | %s | %s | %s | %s | %s | %s | %s |" % (
            r["rating"], a["contact"], a["sgc"], a["total"], a["catch"], a["ctrl"], a["weak"], a["legs"], hm["total"],
            f("centre MID"), f("inner MID"), f("outer MID"), f("inner HIGH"), f("outer HIGH"), f("extreme HIGH"), f("outer TOP"), f("extreme TOP")))
    L.append(""); L.append("Monotonicity (adjacent ratings, matched shots): higher rating concedes where the lower saved — count [gains the other way] and classes")
    for m in R["monotonicity"]:
        L.append("* %g → %g: **%d** inversions [%d gains] %s" % (m["ratings"][0], m["ratings"][1], m["inversions"], m["gains"], json.dumps(m["classes"])))
open(os.path.join(OUT, "%s_curves.md" % ATTR), "w").write("\n".join(L) + "\n")
# ── figure
fams = list(res["families"].keys()); xs = [v["rating"] for v in res["values"]]
fig, axs = plt.subplots(2, 3, figsize=(16, 8.5))
ax = axs[0][0]
owned = {"reflexes": ["latency", "handAccel"], "diving": ["maxLat", "maxVertDown", "latDrive", "load"], "jumping": ["highReachZ", "upDrive"], "height": ["standingReachZ", "highReachZ", "maxLat"],
         "acceleration": ["moveAccel"], "speed": ["moveVmax"], "handling": [], "strength": [], "weight": [], "positioning": []}.get(ATTR, env_keys[:3])
for k in owned:
    ys = [v["env"].get(k) for v in res["values"]]
    if all(isinstance(y, (int, float)) for y in ys): ax.plot(xs, ys, marker="o", label=k)
ax.set_title("%s — owned quantities (page env record)" % ATTR, fontsize=9); ax.grid(alpha=.3); ax.legend(fontsize=7); ax.set_xlabel("rating")
for j, fam in enumerate(fams[:2]):
    R = res["families"][fam]
    ax = axs[0][1 + j]
    for k, lab in [("contact", "CONTACT %"), ("total", "TOTAL SAVE %"), ("catch", "CATCH|CONTACT %"), ("ctrl", "CTRL PARRY|C %"), ("weak", "WEAK/FINGERTIP|C %")]:
        ax.plot(xs, [r["all"][k] for r in R["rows"]], marker="o", label=lab)
    ax.set_ylim(-3, 103); ax.set_title("%s — all on-target (n=%d)" % (fam, R["n"]), fontsize=9); ax.grid(alpha=.3); ax.legend(fontsize=7); ax.set_xlabel("rating")
    ax = axs[1][1 + j]
    for k in ["centre MID", "inner MID", "outer MID", "inner HIGH", "outer HIGH", "extreme HIGH", "outer TOP"]:
        ys = [r["bands"][k][0] if r["bands"][k][0] is not None else np.nan for r in R["rows"]]
        ax.plot(xs, ys, marker="o", label=k)
    ax.set_ylim(-3, 103); ax.set_title("%s — hard subset TOTAL SAVE by band" % fam, fontsize=9); ax.grid(alpha=.3); ax.legend(fontsize=6, ncol=2); ax.set_xlabel("rating")
ax = axs[1][0]
for fam in fams[:2]:
    R = res["families"][fam]
    ax.plot([m["ratings"][1] for m in R["monotonicity"]], [m["inversions"] for m in R["monotonicity"]], marker="s", label="%s inversions" % fam)
    ax.plot([m["ratings"][1] for m in R["monotonicity"]], [m["gains"] for m in R["monotonicity"]], marker="^", ls="--", label="%s gains" % fam)
ax.set_title("adjacent-step inversions (higher rating concedes, lower saves) vs gains", fontsize=9); ax.grid(alpha=.3); ax.legend(fontsize=7); ax.set_xlabel("upper rating of the step")
fig.suptitle("%s response curves — %s" % (ATTR, LABEL), fontsize=11); fig.tight_layout(); fig.savefig(os.path.join(OUT, "%s_curves.png" % ATTR), dpi=110); plt.close(fig)
print("wrote", os.path.join(OUT, "%s_curves.{json,md,png}" % ATTR))
