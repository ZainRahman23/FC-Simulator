#!/usr/bin/env python3
"""Machine-readable baseline record of the keeper's behaviour for one build.

  python3 gk_baseline_record.py --constants constants.json --goalface goalface.json [--ground ground.json]
        [--chest chest.json] [--analytic analytic.json] --sha <match.js sha> --commit <git sha> --out baseline.json

Summarises, per profile in the goal-face dataset: contact / save|contact / total / catch|contact on all on-target shots
and on the hard in-air subset, the hard-subset band table, corners, monotonicity across the profile order; per profile
in the batteries: roller held %, chest catch % by speed (12 m) ; per profile in the analytic reach: envelope axes.
Everything is copied verbatim from the datasets so the record can be diffed against a later build.
"""
import json, sys, os
args = sys.argv[1:]
def opt(k, d=None): return args[args.index(k) + 1] if k in args else d
CY = 34.0
ZB4 = [("LOW", 0.11, 0.6), ("MID", 0.6, 1.5), ("HIGH", 1.5, 2.05), ("TOP", 2.05, 2.33)]
LB = [("centre", 0, 0.7), ("inner", 0.7, 1.9), ("outer", 1.9, 2.9), ("extreme", 2.9, 3.7)]
def pct(xs):
    xs = list(xs); return round(100.0 * sum(1 for x in xs if x) / max(1, len(xs)), 2)
rec = {"build": {"match_js_sha256_16": opt("--sha"), "commit": opt("--commit")}, "constants": None, "goalface": {}, "ground": {}, "chest": {}, "analytic": {}}
if opt("--constants"): rec["constants"] = json.load(open(opt("--constants")))
if opt("--goalface"):
    D = json.load(open(opt("--goalface"))); rec["goalface"]["meta"] = {k: D.get("meta", {}).get(k) for k in ("url", "aimN", "chargeN", "cmin", "cmax", "families", "profiles")}
    rec["goalface"]["geometry"] = D.get("geometry"); rec["goalface"]["envs"] = D.get("envs"); rec["goalface"]["profiles"] = D.get("profiles")
    for fam in D["families"]:
        sh = [s for s in D["families"][fam]["shots"] if s.get("on")]
        h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]; hl = ">=21"
        if len(h) < 40: h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18]; hl = ">=18"
        out = {"n": len(sh), "hard_n": len(h), "hard": hl, "profiles": {}}
        for p in D["profileOrder"]:
            c = [s for s in sh if s["on"][p]["contacts"]]; ch = [s for s in h if s["on"][p]["contacts"]]
            P = {"all": {"contact": pct(bool(s["on"][p]["contacts"]) for s in sh), "sgc": pct(not s["on"][p]["goal"] for s in c), "total": pct(not s["on"][p]["goal"] for s in sh), "catch": pct(s["on"][p]["held"] for s in c)},
                 "hard": {"contact": pct(bool(s["on"][p]["contacts"]) for s in h), "sgc": pct(not s["on"][p]["goal"] for s in ch), "total": pct(not s["on"][p]["goal"] for s in h), "catch": pct(s["on"][p]["held"] for s in ch)},
                 "bands": {}, "corners": {}}
            for zn, z0, z1 in ZB4:
                for ln, y0, y1 in LB:
                    ss = [s for s in h if y0 <= abs(s["off"]["line"]["y"] - CY) < y1 and z0 <= s["off"]["line"]["z"] < z1]
                    P["bands"]["%s %s" % (ln, zn)] = [pct(not s["on"][p]["goal"] for s in ss) if ss else None, len(ss)]
            for cn, fn in {"top": lambda s: abs(s["off"]["line"]["y"] - CY) >= 1.9 and s["off"]["line"]["z"] >= 1.7, "true_top": lambda s: abs(s["off"]["line"]["y"] - CY) >= 2.9 and s["off"]["line"]["z"] >= 2.05,
                           "bottom": lambda s: abs(s["off"]["line"]["y"] - CY) >= 1.9 and s["off"]["line"]["z"] < 0.6, "true_bottom": lambda s: abs(s["off"]["line"]["y"] - CY) >= 2.9 and s["off"]["line"]["z"] < 0.4}.items():
                ss = [s for s in h if fn(s)]; P["corners"][cn] = [pct(not s["on"][p]["goal"] for s in ss) if ss else None, len(ss)]
            out["profiles"][p] = P
        pr = D["profileOrder"]; out["monotonicity"] = {"%s>%s" % (a, b): sum(1 for s in sh if not s["on"][a]["goal"] and s["on"][b]["goal"]) for a, b in zip(pr, pr[1:])}
        rec["goalface"][fam] = out
def outc(r):
    if not r["contacts"]: return "GOAL" if r["goal"] else "NO CONTACT"
    return r["contacts"][0]["outcome"].split(" (")[0] + ("->GOAL" if r["goal"] else "")
def held(r): return any(c["held"] for c in r["contacts"])
if opt("--ground"):
    R = [r for r in json.load(open(opt("--ground")))["rows"] if not r.get("fail")]
    for p in sorted(set(r["profile"] for r in R)):
        rr = [r for r in R if r["profile"] == p]
        rec["ground"][p] = {"roll_held": pct(held(r) for r in rr if r["mode"] == "roll"), "modes": {m: {"held": pct(held(r) for r in rr if r["mode"] == m), "goal": pct(r["goal"] for r in rr if r["mode"] == m), "n": sum(1 for r in rr if r["mode"] == m)} for m in ("roll", "rollNear", "air", "bounce", "drop")},
                            "centred_rollers": {str(r["sp"]): outc(r) for r in rr if r["mode"] == "roll" and r["lat"] == 0}}
if opt("--chest"):
    R = [r for r in json.load(open(opt("--chest")))["rows"] if not r.get("fail")]
    for p in sorted(set(r["profile"] for r in R)):
        rr = [r for r in R if r["profile"] == p]
        rec["chest"][p] = {"catch_by_speed_12m": {str(sp): pct(held(r) for r in rr if r["sp"] == sp and r.get("dist") == 12) for sp in (18, 20, 22, 24, 26, 28, 30, 32)},
                           "catch_by_speed_near": {str(sp): pct(held(r) for r in rr if r["sp"] == sp and r.get("dist") is None) for sp in (8, 10, 12, 15, 18, 20, 22, 24, 26, 28, 30, 32)},
                           "sternum_band_12m": {str(sp): pct(held(r) for r in rr if r["sp"] == sp and r.get("dist") == 12 and r["hn"] in ("stomach", "lowerChest", "sternum", "upperChest") and abs(r["lat"]) <= 0.2) for sp in (18, 20, 22, 24, 26, 28, 30, 32)}}
if opt("--analytic"):
    A = json.load(open(opt("--analytic"))); rec["analytic"] = {"consts": A.get("consts"), "profiles": {k: {"env": v.get("env"), "anatomy": v.get("anatomy"), "timing": v.get("timing")} for k, v in A.get("profiles", {}).items()}}
json.dump(rec, open(opt("--out", "baseline.json"), "w"), indent=1)
print("wrote", opt("--out", "baseline.json"))
