#!/usr/bin/env python3
# CF-6 analysis — applies the FROZEN preregistration (CF6_PREREGISTRATION.md §6 – §7) to tools/loco_probe.mjs --cf=6 outputs. No simulation; nothing tuned.
#   P1 sustained genuine walking: ≥ 20 consecutive physical steps, every eligible step (2 … N) genuinely continuous (CF-5 criteria via cf5_continuity.evaluate)
#   P2 commanded speed achieved: realised mean speed within ± 20 % of the target
#   P3 physical invariants: no failure of any kind recorded by the harness (fall, relocation > 20 mm, hard-limit, non-finite, supervisor abort, CF-6 refusal, failed touchdown)
#   P4 no accumulation: the preregistered thirds rule on the listed metrics, with the preregistered resolution floors
#   gait timing from the per-tick 20 N vertical-force contact log (the pack's H threshold): stance / swing / single / double support as % of the complete stride.
#     Primary segmentation, event-anchored: each step starts at the swing foot's first 20 N onset after its measured liftoff; its double support ends at the trailing
#     foot's last 20 N release before that foot's own measured liftoff. Touchdown rebounds and trailing-toe reloads therefore cannot split a stride. Cross-check: the
#     per-foot contact-interval segmentation (gaps < 50 ms merged) — identical on clean runs (B0.1), invalid when a rebound exceeds 50 ms (B0.2: pseudo-strides).
#   human comparison (descriptive only): the pack's reference values at the target speed, quoted with their labels
# usage: python3 cf6_analysis.py [--json] <run.json.gz> [...]
import sys, os, json, gzip, statistics as stt
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../loco_cf5_2026-10-08/scripts")); from cf5_continuity import evaluate
inv = lambda w: sum(v for k, v in (w or {}).items() if k in ("ankle_L.z", "ankle_R.z"))
HUMAN = {0.4: {"step": "0.38 ± 0.04 m (S M)", "cadence": "64.8 ± 7.2 steps/min (S D)", "DS": "43.2 % (S D)", "SS": "0.55 ± 0.07 s (S M)"}, 0.6: {"step": "0.45 ± 0.04 m (S M)", "cadence": "80.4 ± 7.2 (S D)", "DS": "35.5 % (S D); H 32.0 % (F)", "SS": "0.50 ± 0.06 s (S M)"},
         0.8: {"step": "0.52 ± 0.04 m (S M)", "cadence": "91.8 ± 6.6 (S D)", "DS": "31.1 % (S D)", "SS": "0.46 ± 0.05 s (S M)"}, 1.1176: {"step": "0.634 m (C D, kinematic)", "cadence": "105.8 ± 6.1 (C M)", "DS": "28.8 % (H F/D)", "SS": "swing 35.5 % (H F)"},
         1.34112: {"step": "0.708 m (C D, kinematic)", "cadence": "113.6 ± 6.1 (C M)", "DS": "27.4 % (H F/D)", "SS": "swing 36.3 % (H F)"}}
FLOORS = {"xiErrTransferMm": 1, "xiErrSwingMm": 1, "captureHullTDmm": 1, "footholdErrMm": 1, "landingLatErrMm": 1, "slipMm": 0.5, "tdDownMmS": 5, "satAnkleInv": 2, "satAll": 2, "hardMarginDeg": 0.2, "dTau0Nm": 1, "energyResJ": 0.005, "pelvisYawDeg": 0.2, "footYawLDeg": 0.2, "footYawRDeg": 0.2, "widthMm": 2}
def thirds(y, floor):
    n = len(y); k = n // 3
    if n < 6: return {"n": n, "accumulates": None}
    A, B, C = y[:k], y[k:2 * k], y[2 * k:]; mA, mB, mC = stt.mean(A), stt.mean(B), stt.mean(C); sB = stt.pstdev(B)
    acc = (mB - mA) * (mC - mB) > 0 and abs(mC - mB) >= 0.5 * abs(mB - mA) and abs(mC - mA) > 2 * sB + floor
    return {"n": n, "mA": round(mA, 4), "mB": round(mB, 4), "mC": round(mC, 4), "sB": round(sB, 4), "range": [round(min(y), 4), round(max(y), 4)], "accumulates": bool(acc)}
BOUNCE = 0.05   # contact flicker at the 20 N threshold is merged with the lifecycle's own contact-flicker debounce (ctrl/v2_support.js LIFECYCLE.bounceDebounce = 0.05 s)
def timing(d):
    ev = d.get("fz20") or d["run"].get("fz20") or [[], []]; seg = []
    for j in (0, 1):   # contact intervals per foot from the 20 N transitions (initially loaded); gaps < BOUNCE merged
        on, s0, iv = True, 0.0, []
        for t, v in ev[j]:
            if v == 1 and not on:
                if iv and t - iv[-1][1] < BOUNCE: s0 = iv.pop()[0]
                else: s0 = t
                on = True
            elif v == 0 and on: on = False; iv.append((s0, t))
        if on: iv.append((s0, d["endT"]))
        seg.append(iv)
    st = [s for s in d["steps"] if s.get("result") and s["k"] >= 2 and not s.get("tail")]
    tds = sorted([s["seq"]["tTDm"] for s in d["steps"] if s.get("seq") and s["seq"].get("tTDm") is not None])
    out = []
    for j in (0, 1):   # strides of foot j: successive contact onsets (after the start-up)
        ons = [a for a, b in seg[j] if a > 3.5]
        for a, b in zip(ons[:-1], ons[1:]):
            stance = next((y - x for x, y in seg[j] if abs(x - a) < 1e-9), None)
            T = b - a
            # double support inside this stride = overlap of both feet in contact within [a, b)
            both = 0.0
            for x, y in seg[j]:
                for x2, y2 in seg[1 - j]:
                    lo, hi = max(x, x2, a), min(y, y2, b)
                    if hi > lo: both += hi - lo
            out.append({"foot": "LR"[j], "T": T, "stancePct": 100 * stance / T if stance else None, "swingPct": 100 * (T - stance) / T if stance else None, "dsPct": 100 * both / T})
    return out
def timing_events(d):
    ev = d.get("fz20") or d["run"].get("fz20") or [[], []]
    S = [s for s in d["steps"] if s.get("seq") and s["seq"].get("tAir") is not None and s["seq"].get("tTDm") is not None]
    first_on = lambda j, t0: next((t for t, v in ev[j] if v == 1 and t >= t0), None)
    def last_off(j, t1):
        xs = [t for t, v in ev[j] if v == 0 and t <= t1]; return xs[-1] if xs else None
    out = []
    for a, b in zip(S[:-1], S[1:]):
        if a["k"] < 2: continue
        j = 0 if a["swing"] == "L" else 1; on, on2, off = first_on(j, a["seq"]["tAir"]), first_on(1 - j, b["seq"]["tAir"]), last_off(1 - j, b["seq"]["tAir"])
        if on is None or on2 is None or off is None: continue
        nx = [(t, v) for t, v in ev[j] if on < t < on + 0.3]; rb = nx[1][0] - nx[0][0] if len(nx) >= 2 and nx[0][1] == 0 else 0.0
        out.append({"k": a["k"], "period": on2 - on, "ds": off - on, "reboundS": rb})
    if not out: return None
    per = stt.mean(x["period"] for x in out); ds = stt.mean(x["ds"] for x in out)
    return {"steps": len(out), "stepPeriodS": round(per, 4), "dsEachS": round(ds, 4), "dsEachRangeS": [round(min(x["ds"] for x in out), 4), round(max(x["ds"] for x in out), 4)],
            "dsCombinedPct": round(100 * ds / per, 1), "dsCombinedPctRange": [round(100 * min(x["ds"] / x["period"] for x in out), 1), round(100 * max(x["ds"] / x["period"] for x in out), 1)],
            "stancePct": round(100 * (per + ds) / (2 * per), 1), "swingPct": round(100 * (per - ds) / (2 * per), 1), "singleSupportS": round(per - ds, 4),
            "singleSupportRangeS": [round(min(x["period"] - x["ds"] for x in out), 4), round(max(x["period"] - x["ds"] for x in out), 4)], "touchdownReboundMaxS": round(max(x["reboundS"] for x in out), 4)}
def analyse(d):
    R = d["run"]; c6 = R.get("cf6") or {}; e = evaluate(d); st = [s for s in d["steps"] if s.get("result") and not s.get("tail")]; I = [s for s in st if s["k"] >= 2]
    rows = [x for x in e["rows"] if x["k"] >= 2]
    tds = [(s["seq"]["tTDm"]) for s in st if s["seq"].get("tTDm") is not None]; per = [b - a for a, b in zip(tds[:-1], tds[1:])][1:]
    stepL = [s["result"]["cf4"].get("stepLengthAtTouchdownM") for s in I if s["result"].get("cf4") and s["result"]["cf4"].get("stepLengthAtTouchdownM") is not None]
    Q = {"xiErrTransferMm": lambda s: s["transfer"]["xiErrMax"] * 1000, "xiErrSwingMm": lambda s: s["result"]["xiErrMaxMm"], "captureHullTDmm": lambda s: s["result"]["cf4"]["atTouchdown"]["xiBothFeetHullMarginMm"],
         "footholdErrMm": lambda s: s["result"]["tdPosErrMm"], "landingLatErrMm": lambda s: s["result"]["walkLanding"]["latErrMm"], "slipMm": lambda s: max(s["result"]["stanceSlipMm"], max(s["transfer"]["footSlip"]) * 1000),
         "tdDownMmS": lambda s: s["result"]["tdVel"]["down"] * 1000, "satAnkleInv": lambda s: inv(s["transfer"]["satWho"]) + inv(s["result"]["satWho"]), "satAll": lambda s: s["transfer"]["sat"] + s["result"]["satAxisTicks"],
         "hardMarginDeg": lambda s: min(s["result"]["legHardMarginMinDeg"], s["transfer"]["hardMin"]), "dTau0Nm": lambda s: max(s["result"]["dTau0MaxNm"], s["transfer"]["dTau0Max"]), "energyResJ": lambda s: s["result"]["energyClosurePosJ"] + s["transfer"]["eClosPos"],
         "pelvisYawDeg": lambda s: s["cmd"]["init"]["pelvisYawDrift"], "footYawLDeg": lambda s: s["cmd"]["init"]["footYawDrift"][0], "footYawRDeg": lambda s: s["cmd"]["init"]["footYawDrift"][1], "widthMm": lambda s: s["cmd"]["init"]["walkFrame"]["widthM"] * 1000}
    acc = {}
    for k, fn in Q.items():
        y = []
        for s in I:
            try: v = fn(s)
            except Exception: v = None
            if v is not None: y.append(v)
        acc[k] = thirds(y, FLOORS[k])
    vbar = e["vbarMmS"] / 1000 if e["vbarMmS"] else None; tgt = c6.get("vTarget")
    P1 = d["physicalSteps"] >= 20 and e["maxConsecutiveContinuous"] >= d["physicalSteps"] - 1; P2 = bool(vbar and tgt and abs(vbar - tgt) <= 0.2 * tgt); P3 = d["fail"] is None; P4 = all(v.get("accumulates") is False for v in acc.values() if v.get("accumulates") is not None)
    tm = timing(d); tm2 = [x for x in tm if x["stancePct"] is not None]
    clr = [s["result"]["clearanceMinWinMm"] for s in I if s["result"].get("clearanceMinWinMm") is not None]
    out = {"human": R["human"], "first": R["first"], "level": c6.get("level"), "vTarget": tgt, "S": c6.get("S"), "TdsEach": c6.get("TdsEach"), "Tss": c6.get("Tss"), "steps": R["steps"], "physical": d["physicalSteps"], "fail": d["fail"]["why"] if d["fail"] else None, "failStep": d["fail"]["step"] if d["fail"] else None,
        "realized": {"speedMS": round(vbar, 4) if vbar else None, "cadenceStepsMin": round(60 / stt.mean(per), 1) if per else None, "stepLengthM": [round(min(stepL), 4), round(max(stepL), 4)] if stepL else None, "stepLengthMeanM": round(stt.mean(stepL), 4) if stepL else None,
                     "timingMergedCrossCheck_stancePct": round(stt.mean([x["stancePct"] for x in tm2]), 1) if tm2 else None, "timingMergedCrossCheck_swingPct": round(stt.mean([x["swingPct"] for x in tm2]), 1) if tm2 else None, "timingMergedCrossCheck_dsCombinedPct": round(stt.mean([x["dsPct"] for x in tm2]), 1) if tm2 else None, "strides": len(tm2),
                     "timingMergedCrossCheck_singleSupportS": round(stt.mean([(x["swingPct"] / 100) * x["T"] for x in tm2]), 3) if tm2 else None, "timingEventAnchored": timing_events(d), "clearanceMinWinMm": [round(min(clr), 2), round(max(clr), 2)] if clr else None},
        "momentum": {"maxConsecutiveContinuous": e["maxConsecutiveContinuous"], "touchdownBelowCmin": e["touchdownBelowCmin"], "comFwdTouchdownMmS": [round(min(x["v"]["touchdown"] * 1000 for x in rows if x["v"]["touchdown"] is not None), 1), round(max(x["v"]["touchdown"] * 1000 for x in rows if x["v"]["touchdown"] is not None), 1)] if rows and any(x["v"]["touchdown"] is not None for x in rows) else None,
                     "cycleMinMmS": [round(min(x["vMinCycleMmS"] for x in rows if x["vMinCycleMmS"] is not None), 1), round(max(x["vMinCycleMmS"] for x in rows if x["vMinCycleMmS"] is not None), 1)] if rows and any(x["vMinCycleMmS"] is not None for x in rows) else None},
        "pass": {"P1": P1, "P2": P2, "P3": P3, "P4": P4, "level": P1 and P2 and P3 and P4}, "accumulation": acc, "humanReference": HUMAN.get(tgt)}
    return out
if __name__ == "__main__":
    js = "--json" in sys.argv
    for f in [a for a in sys.argv[1:] if not a.startswith("--")]:
        a = analyse(json.load(gzip.open(f)))
        if js: print(json.dumps({"file": os.path.basename(f), **a})); continue
        print(f"== {os.path.basename(f)}: {a['human']} {a['first']} {a['level']} target {a['vTarget']} m/s | physical {a['physical']}/{a['steps']}{' FAIL step ' + str(a['failStep']) + ': ' + a['fail'] if a['fail'] else ''} | PASS {a['pass']}")
        print(f"   realized {a['realized']}"); print(f"   momentum {a['momentum']}"); print(f"   human ref {a['humanReference']}")
        print("   accumulating: " + (", ".join(k for k, v in a["accumulation"].items() if v.get("accumulates")) or "none") + " | untestable: " + (", ".join(k for k, v in a["accumulation"].items() if v.get("accumulates") is None) or "none"))
