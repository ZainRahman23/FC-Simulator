#!/usr/bin/env python3
# COUNTERFACTUAL DIAGNOSTIC CF-5 — continuous-walking evaluation (no simulation; reads tools/loco_probe.mjs --cf=5 outputs). The criteria are the ones fixed in the harness
# header before any staged run: v̄ = mean forward progression speed (walking-frame landing advance / touchdown interval over the run), C_min = max(10 mm/s, 0.25·v̄); step
# k ≥ 2 is a genuine continuous step iff physical, forward COM ≥ C_min at its decision, liftoff, 0.1 s before touchdown, touchdown, after load acceptance, the next decision
# and the next liftoff, and forward COM > 0 at every tick from its decision to the next decision. Touchdown forward COM < C_min on ≥ 2 steps → NOT CONTINUOUS WALKING.
# usage: python3 cf5_continuity.py <run.json.gz> [...]   (prints a per-run summary and per-step rows; --json for machine-readable output)
import sys, json, gzip
def evaluate(d):
    st = [s for s in d["steps"] if s.get("cmd")]; real = [s for s in st if not s.get("tail") and s.get("result")]
    land = [(s["seq"]["tTDm"], s["result"]["walkLanding"]["fwd"]) for s in real if s["result"].get("walkLanding") and s["seq"].get("tTDm") is not None]
    vbar = (land[-1][1] - land[0][1]) / (land[-1][0] - land[0][0]) if len(land) >= 2 else None
    cmin = max(0.010, 0.25 * vbar) if vbar else 0.010
    fwd = lambda g: None if not g or g.get("comV") is None else g["comV"][0]
    rows = []
    for i, s in enumerate(st):
        if s.get("tail"): continue
        r = s.get("result") or {}; rc = r.get("cf4") or {}; nx = st[i + 1] if i + 1 < len(st) else None
        nxRc = ((nx or {}).get("result") or {}).get("cf4") or {}
        v = {"decision": fwd(s["cmd"].get("swingInit")), "liftoff": fwd(rc.get("atLift")), "preTouchdown": fwd(rc.get("preTouchdown")), "touchdown": fwd(rc.get("atTouchdown")),
             "afterAcceptance": fwd(rc.get("afterAcceptance")), "nextDecision": fwd((nx or {}).get("cmd", {}).get("swingInit")) if nx else None, "nextLiftoff": fwd(nxRc.get("atLift")) if nx else None}
        vmin = min([x for x in [rc.get("vFwdMinStepMmS"), (nx["transfer"].get("vFwdMin") * 1000 if nx and nx["transfer"].get("vFwdMin") is not None else None)] if x is not None], default=None)
        ok = {k: (x is not None and x >= cmin) for k, x in v.items()}
        cont = s["k"] >= 2 and bool(r.get("physical")) and all(ok.values()) and vmin is not None and vmin > 0
        rows.append({"k": s["k"], "physical": bool(r.get("physical")), "v": v, "vMinCycleMmS": vmin, "ok": ok, "continuous": cont})
    run = 0; best = 0
    for x in rows:
        if x["k"] < 2: continue
        run = run + 1 if x["continuous"] else 0; best = max(best, run)
    tdFail = sum(1 for x in rows if x["k"] >= 2 and not x["ok"]["touchdown"])
    return {"vbarMmS": vbar * 1000 if vbar else None, "cminMmS": cmin * 1000, "rows": rows, "maxConsecutiveContinuous": best, "touchdownBelowCmin": tdFail, "notContinuousWalking": tdFail >= 2}
if __name__ == "__main__":
    js = "--json" in sys.argv
    for f in [a for a in sys.argv[1:] if not a.startswith("--")]:
        d = json.load(gzip.open(f)); e = evaluate(d)
        if js: print(json.dumps({"file": f, **e})); continue
        print(f"== {f.split('/')[-1]}: physical {d['physicalSteps']}/{d['run']['steps']} | v̄ {e['vbarMmS']:.1f} mm/s, C_min {e['cminMmS']:.1f} mm/s | max consecutive continuous {e['maxConsecutiveContinuous']} | touchdown < C_min on {e['touchdownBelowCmin']} steps{' → NOT CONTINUOUS WALKING' if e['notContinuousWalking'] else ''}")
        for x in e["rows"]:
            f1 = lambda k: "—" if x["v"][k] is None else f"{x['v'][k]*1000:5.1f}{'' if x['ok'][k] else '*'}"
            print(f"   k{x['k']:2d} phys {int(x['physical'])} dec {f1('decision')} lift {f1('liftoff')} preTD {f1('preTouchdown')} TD {f1('touchdown')} acc {f1('afterAcceptance')} nextDec {f1('nextDecision')} nextLift {f1('nextLiftoff')} min {x['vMinCycleMmS'] if x['vMinCycleMmS'] is None else round(x['vMinCycleMmS'],1)} → {'CONTINUOUS' if x['continuous'] else '—'}")
