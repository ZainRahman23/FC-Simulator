#!/usr/bin/env python3
# technical_control12/tools/tc12_summary.py — the carry sweep (tc12_carry_sweep.jsonl) and the checks summarised: per reference player × model (TECHNICAL-CONTROL-1 / 1.2),
# per section, the owner's §19 – §20 metrics.   python3 tc12_summary.py <evidence dir>
import json, sys, os, statistics as st
ev = sys.argv[1]; rows = [json.loads(l) for l in open(os.path.join(ev, "tc12_carry_sweep.jsonl")) if l.strip()]; rows = [r for r in rows if "error" not in r]
ck = json.load(open(os.path.join(ev, "tc12_checks.json")))
def agg(rs):
    n = sum(r["contacts"] for r in rs); w = lambda f: round(sum((f(r) or 0) * r["contacts"] for r in rs) / max(1, n), 3); mean = lambda a: round(st.mean(a), 3) if a else None
    bins = {}
    for r in rs:
        for k, v in r["lane"]["binsCm"].items(): bins[k] = bins.get(k, 0) + v / len(rs)
    hist = {}
    for r in rs:
        for k, v in r["stepsBetween"]["hist"].items(): hist[k] = hist.get(k, 0) + v
    pref = rs[0]["prefShare"] is not None
    return {"runs": len(rs), "contacts": n, "left": w(lambda r: r["feet"]["L"]), "right": w(lambda r: r["feet"]["R"]), "preferred": w(lambda r: r["prefShare"]) if pref else None,
        "inside": w(lambda r: r["surfaces"]["inside"]), "outside": w(lambda r: r["surfaces"]["outside"]), "instep": w(lambda r: r["surfaces"]["instep"]), "sole": w(lambda r: r["surfaces"]["sole"]),
        "sameFoot": mean([r["sameFoot"] for r in rs if r["sameFoot"] is not None]), "runningStepsBetween": mean([r["stepsBetween"]["mean"] for r in rs if r["stepsBetween"]["mean"] is not None]), "stepsHist": dict(sorted(hist.items(), key=lambda kv: int(kv[0]))),
        "latMeanPrefSide_m": mean([r["lane"]["meanLatPrefSide"] for r in rs]) if pref else None, "latMeanAbs_m": mean([r["lane"]["meanAbs"] for r in rs]), "prefLaneShare": mean([r["lane"]["prefLaneShare"] for r in rs]) if pref else None,
        "centreCrossingsPerS": mean([r["lane"]["crossingsPerS"] for r in rs]), "centreCrossingsTotal": sum(r["lane"]["centreCrossings"] for r in rs), "touchesPerS": mean([r["touchesPerS"] for r in rs if r["touchesPerS"]]),
        "impulseMedian_ms": round(st.median([r["impulse"]["median"] for r in rs if r["impulse"]["median"] is not None]), 2), "sepMax_m": max(r["sep"]["max"] for r in rs), "failed": sum(1 for r in rs if r["failed"]), "latBinsCm": dict(sorted(bins.items(), key=lambda kv: float(kv[0])))}
out = {"players": {}, "sections": [], "checks": {}}
for p in ["Ldom", "Rdom", "two", "neutral"]:
    out["players"][p] = {m: agg([r for r in rows if r["player"] == p and r["model"] == m]) for m in ["old", "new"]}
for s in sorted(set(r["sec"] for r in rows)):
    for p in ["Ldom", "Rdom", "two", "neutral"]:
        e = {"sec": s, "player": p}
        for m in ["old", "new"]:
            rs = [r for r in rows if r["sec"] == s and r["player"] == p and r["model"] == m]; a = agg(rs); one = [r for r in rs if r["seed"] == 1]
            e[m] = {k: a[k] for k in ["left", "right", "inside", "outside", "instep", "sole", "sameFoot", "runningStepsBetween", "latMeanAbs_m", "prefLaneShare", "centreCrossingsPerS", "touchesPerS", "sepMax_m"]}; e[m]["seq"] = one[0]["seq"] if one else ""; e[m]["actions"] = one[0]["actions"] if one else []
        out["sections"].append(e)
ok = [r for r in ck if "error" not in r]
out["checks"] = {"runs": len(ck), "errors": len(ck) - len(ok), "deterministic": sum(r["det"] for r in ok), "bodyNeutral": sum(r["bodyNeutral"] for r in ok), "failedNew": sum(r["failed"] for r in ok), "failedOld": sum(r["oldFailed"] for r in ok),
    "sets": {s: {"n": len([r for r in ok if r["set"] == s]), "sepMedianNew": round(st.median([r["sep"] for r in ok if r["set"] == s]), 2), "sepMaxNew": max(r["sep"] for r in ok if r["set"] == s), "sepMedianOld": round(st.median([r["oldSep"] for r in ok if r["set"] == s]), 2), "sepMaxOld": max(r["oldSep"] for r in ok if r["set"] == s)} for s in ["carry", "course", "chain"]}}
json.dump(out, open(os.path.join(ev, "tc12_summary.json"), "w"), indent=1)
L = []
for p, v in out["players"].items():
    for m in ["old", "new"]: a = v[m]; L.append(f'{p:8s} {m}: L {a["left"]} R {a["right"]} pref {a["preferred"]} | inside {a["inside"]} outside {a["outside"]} instep {a["instep"]} sole {a["sole"]} | same-foot {a["sameFoot"]} | running steps between {a["runningStepsBetween"]} {a["stepsHist"]} | lateral |{a["latMeanAbs_m"]}| pref-side {a["latMeanPrefSide_m"]} pref-lane {a["prefLaneShare"]} | centre crossings {a["centreCrossingsPerS"]}/s ({a["centreCrossingsTotal"]}) | touches {a["touchesPerS"]}/s | impulse {a["impulseMedian_ms"]} m/s | sep max {a["sepMax_m"]} | failed {a["failed"]}')
L.append("checks: " + json.dumps(out["checks"]))
open(os.path.join(ev, "tc12_summary.txt"), "w").write("\n".join(L) + "\n"); print("\n".join(L))
