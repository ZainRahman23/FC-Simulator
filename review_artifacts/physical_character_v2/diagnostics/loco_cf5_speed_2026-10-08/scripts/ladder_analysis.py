#!/usr/bin/env python3
# CF-5 SPEED LADDER (diagnostic) — per-run summary of commanded vs realized gait, the gait cycle, support timing, continuity (CF-5's fixed criteria) and per-step trends.
# No simulation: reads tools/loco_probe.mjs --cf=5 outputs. usage: python3 ladder_analysis.py [--json] <run.json.gz> [...]
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../loco_cf5_2026-10-08/scripts")); from cf5_continuity import evaluate
CONTACT = {"TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"}; SUPPORTING = {"SUPPORT", "LOAD_ACCEPT", "UNLOADING"}
inv = lambda w: sum(v for k, v in (w or {}).items() if k in ("ankle_L.z", "ankle_R.z"))
def slope(y):
    n = len(y); mx = (n - 1) / 2; my = sum(y) / n; sxx = sum((a - mx) ** 2 for a in range(n)); return sum((a - mx) * (b - my) for a, b in zip(range(n), y)) / sxx if sxx else 0.0
def rng(a, n=1): a = [x for x in a if x is not None]; return None if not a else [round(min(a), n), round(max(a), n)]
def analyse(d):
    R = d["run"]; c5 = R["cf5"]; WP = c5.get("walkPlan") or {}; S, Tst, Tsw = c5["S"], c5["Tst"], R["Tsw"]; Tnom = Tst + 0.1125 + 0.171 + Tsw
    e = evaluate(d); W = d["walkingFrame"]; w = W["w"]; ix = {k: i for i, k in enumerate(d["traceCols"])}; tr = d["trace"]
    st = [s for s in d["steps"] if s.get("result") and not s.get("tail")]; I = [s for s in st if s["k"] >= 2]
    fwd = lambda v: v[0] * w[0] + v[2] * w[1]
    # gait cycle from the trace: steps 2 … N, touchdown k-1 → touchdown k
    tds = [s["seq"]["tTDm"] for s in st if s["seq"].get("tTDm") is not None]; cyc = []
    for a, b in zip(tds[:-1], tds[1:]):
        rows = [r for r in tr if a <= r[0] < b]; vf = [fwd(r[ix["comV"]]) for r in rows]
        both = sum(1 for r in rows if all(x in CONTACT for x in r[ix["states"]])); bothSup = sum(1 for r in rows if all(x in SUPPORTING for x in r[ix["states"]])); none = sum(1 for r in rows if not any(x in CONTACT for x in r[ix["states"]]))
        dtT = rows[1][0] - rows[0][0] if len(rows) > 1 else 0
        post = min(rows, key=lambda r: abs(r[0] - (a + 0.1))) if rows else None
        cyc.append({"period": b - a, "vMean": sum(vf) / len(vf), "vMin": min(vf), "vMax": max(vf), "post01": fwd(post[ix["comV"]]) if post else None, "dsBothContact": both * dtT, "dsBothSupport": bothSup * dtT, "flight": none * dtT})
    land = [s["result"]["walkLanding"]["fwd"] for s in st if s["result"].get("walkLanding")]; adv = [b - a for a, b in zip(land[:-1], land[1:])]
    out = {"human": R["human"], "steps": R["steps"], "S": S, "Tst": Tst, "Tsw": Tsw, "physical": d["physicalSteps"], "fail": (d["fail"] or {}).get("why"), "failStep": (d["fail"] or {}).get("step"),
        "commanded": {"cycleS": round(Tnom, 4), "cadenceHz": round(1 / Tnom, 3), "speedMmS": round(S / Tnom * 1000, 1)},
        "realized": {"speedMmS": round(e["vbarMmS"], 1) if e["vbarMmS"] else None, "periodS": rng([x["period"] for x in cyc], 3), "cadenceHz": round(len(cyc) / sum(x["period"] for x in cyc), 3) if cyc else None,
                     "stepAdvanceM": rng(adv[1:], 4), "stepChosenM": rng([s["cmd"]["walk5"].get("chosenStepM") for s in I], 4)},
        "comCycleMmS": {"mean": rng([x["vMean"] * 1000 for x in cyc]), "min": rng([x["vMin"] * 1000 for x in cyc]), "max": rng([x["vMax"] * 1000 for x in cyc])},
        "comAtMmS": {k: rng([x["v"][k] * 1000 for x in e["rows"] if x["k"] >= 2 and x["v"][k] is not None]) for k in ["decision", "liftoff", "preTouchdown", "touchdown", "afterAcceptance", "nextLiftoff"]} | {"post01": rng([x["post01"] * 1000 for x in cyc if x["post01"] is not None])},
        "support": {"bothContactS": rng([x["dsBothContact"] for x in cyc], 3), "bothSupportS": rng([x["dsBothSupport"] for x in cyc], 3), "flightS": rng([x["flight"] for x in cyc], 3)},
        "continuity": {"vbarMmS": round(e["vbarMmS"], 1) if e["vbarMmS"] else None, "cminMmS": round(e["cminMmS"], 1), "maxConsecutive": e["maxConsecutiveContinuous"], "touchdownBelowCmin": e["touchdownBelowCmin"], "notContinuous": e["notContinuousWalking"]},
        "walkPlan": WP, "events": {"early": sum(1 for s in st if s["seq"]["early"]), "late": sum(1 for s in st if s["seq"]["late"]), "failedTD": sum(1 for s in st if s["seq"]["failedTD"]), "replans": sum(s["seq"]["replans"] for s in st),
                                     "nocertSwing": sum(s["seq"]["nocertSwing"] for s in st), "shadowAbort": sum(1 for s in st if s["transfer"].get("wouldAbort")), "rClamped": sum(1 for s in st if (s["cmd"].get("walk5") or {}).get("rClampedMm", 0) > 0),
                                     "contactLost": sum(1 for s in st for ev in s["seq"]["events"] if "contact lost" in ev[1])}}
    Q = {"xiErrTransferMm": lambda s: s["transfer"]["xiErrMax"] * 1000, "xiErrSwingMm": lambda s: s["result"]["xiErrMaxMm"], "captureHullTDmm": lambda s: s["result"]["cf4"]["atTouchdown"]["xiBothFeetHullMarginMm"],
         "xiLeadDecisionMm": lambda s: s["cmd"]["walk5"]["leadAtDecisionMm"], "xiLatDecisionMm": lambda s: abs(s["cmd"]["walk5"]["latAtDecisionMm"]), "vrpFwdMm": lambda s: s["cmd"]["walk5"]["rRelStanceMm"][0], "vrpLatMm": lambda s: abs(s["cmd"]["walk5"]["rRelStanceMm"][1]),
         "footholdErrMm": lambda s: s["result"]["tdPosErrMm"], "landingLatErrMm": lambda s: s["result"]["walkLanding"]["latErrMm"], "widthMm": lambda s: s["cmd"]["init"]["walkFrame"]["widthM"] * 1000, "tdDownMmS": lambda s: s["result"]["tdVel"]["down"] * 1000,
         "slipMm": lambda s: max(s["result"]["stanceSlipMm"], max(s["transfer"]["footSlip"]) * 1000), "releaseS": lambda s: s["cmd"]["swingInit"]["planEndToReleaseS"], "trailFzPct": lambda s: s["cmd"]["swingInit"]["trailFzBW"] * 100,
         "satAnkleInv": lambda s: inv(s["transfer"]["satWho"]) + inv(s["result"]["satWho"]), "satAll": lambda s: s["transfer"]["sat"] + s["result"]["satAxisTicks"], "hardMarginDeg": lambda s: min(s["result"]["legHardMarginMinDeg"], s["transfer"]["hardMin"]),
         "dTau0Nm": lambda s: max(s["result"]["dTau0MaxNm"], s["transfer"]["dTau0Max"]), "energyResJ": lambda s: s["result"]["energyClosurePosJ"] + s["transfer"]["eClosPos"], "pStarOutMm": lambda s: max(s["result"]["pStarOutsideMaxMm"], s["transfer"]["pOutMax"] * 1000),
         "pelvisTiltDeg": lambda s: s["result"]["pelvisTiltMaxDeg"], "pelvisYawDeg": lambda s: s["cmd"]["init"]["pelvisYawDrift"], "footYawLDeg": lambda s: s["cmd"]["init"]["footYawDrift"][0], "footYawRDeg": lambda s: s["cmd"]["init"]["footYawDrift"][1],
         "phiContact": lambda s: s["result"]["phiContact"], "touchdownToSupportS": lambda s: s["result"]["touchdownToSupportS"]}
    tr_ = {}
    for k, fn in Q.items():
        y = []
        for s in I:
            try: v = fn(s)
            except Exception: v = None
            if v is not None: y.append(v)
        if len(y) >= 3: tr_[k] = {"range": [round(min(y), 3), round(max(y), 3)], "first": round(y[0], 3), "last": round(y[-1], 3), "slopePerStep": round(slope(y), 4), "half1": round(sum(y[:len(y)//2]) / (len(y)//2), 3), "half2": round(sum(y[len(y)//2:]) / (len(y) - len(y)//2), 3)}
    out["trends"] = tr_; return out
if __name__ == "__main__":
    js = "--json" in sys.argv; fs = [a for a in sys.argv[1:] if not a.startswith("--")]
    for f in fs:
        a = analyse(json.load(gzip.open(f)))
        if js: print(json.dumps({"file": os.path.basename(f), **a})); continue
        print(f"== {os.path.basename(f)}: {a['human']} S {a['S']} Tst {a['Tst']} Tsw {a['Tsw']} | physical {a['physical']}/{a['steps']}{' FAIL step ' + str(a['failStep']) + ': ' + a['fail'] if a['fail'] else ''}")
        print(f"   commanded {a['commanded']} | realized {a['realized']}")
        print(f"   COM fwd cycle {a['comCycleMmS']} | at {a['comAtMmS']}")
        print(f"   support {a['support']} | continuity {a['continuity']} | events {a['events']}")
        for k, v in a["trends"].items(): print(f"     {k:20s} {v['range'][0]:9.3f} … {v['range'][1]:9.3f}  halves {v['half1']:9.3f} → {v['half2']:9.3f}  slope {v['slopePerStep']:+.4f}")
