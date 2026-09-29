"""RECEIVING + PASSING V1 — summarise probe dumps (one per body) into the review tables.
Per body: reception and pass boot-to-ball residuals at the FINAL solved state (inside face, or toe for laces), reach applied / capped,
plant state at contact, and transition continuity around every contact (max pop = per-tick change of a joint's displacement, max
planted-foot slide while in contact) over [contact - 30, contact + 60] ticks.
    python3 of_rp_summary.py <out.json> <probe dir> [<probe dir> ...]
"""
import sys, json, os, statistics as st

def q(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))] if v else None

def main():
    out, dirs = sys.argv[1], sys.argv[2:]
    rows, cells = [], []
    for d in dirs:
        body = os.path.basename(d.rstrip("/")).replace("mx_", "")
        R = json.load(open(os.path.join(d, "probe.json")))["results"]
        rv, pv, caps, pcaps, pops, slides, plants, outcomes = [], [], 0, 0, [], [], [], {}
        for scen, r in R.items():
            idx = {}  # actor index per pid in the pres rows: 3 values per actor after the tick
            for rec in r["recv"]:
                outcomes[rec["outcome"]] = outcomes.get(rec["outcome"], 0) + 1
                if rec["outcome"] == "CLEAN" or rec["outcome"] == "HEAVY": rv.append(rec["surf"]); caps += 1 if rec["reachCapped"] else 0
                win = [row for row in r.get("pres", []) if rec["tick"] - 30 <= row[0] <= rec["tick"] + 60]
                pid = rec["pid"]
                if win:
                    pops.append(max(row[1 + 3 * pid] for row in win)); slides.append(max(row[2 + 3 * pid] for row in win))
                cells.append({ "body": body, "scen": scen, "kind": "recv", "foot": rec["foot"], "style": rec["style"], "outcome": rec["outcome"], "surf": rec["surf"],
                               "reach": rec["reachApplied"], "capped": rec["reachCapped"], "plant": rec["plantMode"], "plantContact": rec["plantContact"],
                               "pop": pops[-1] if win else None, "slide": slides[-1] if win else None, "rv": rec["sim"]["rv"], "standing": rec["standing"] })
            for rec in r["pass"]:
                pv.append(rec["surf"]); pcaps += 1 if rec["reachCapped"] else 0; plants.append(rec["plantContact"])
                cells.append({ "body": body, "scen": scen, "kind": "pass", "foot": rec["foot"], "tech": rec["tech"], "fam": rec["fam"], "surfName": rec["surfName"], "surf": rec["surf"],
                               "reach": rec["reachApplied"], "capped": rec["reachCapped"], "plant": rec["plantMode"], "plantContact": rec["plantContact"], "speed": rec["speed"], "warp": rec["warp"] })
        a = lambda v: [abs(x) for x in v]
        rows.append({ "body": body, "recvN": len(rv), "recvMedian": st.median(a(rv)) if rv else None, "recvP95": q(a(rv), 0.95), "recvMax": max(a(rv)) if rv else None, "recvCapped": caps,
                      "passN": len(pv), "passMedian": st.median(a(pv)) if pv else None, "passP95": q(a(pv), 0.95), "passMax": max(a(pv)) if pv else None, "passCapped": pcaps,
                      "passPlantLocked": sum(1 for x in plants if x), "popMax": max(pops) if pops else None, "popP95": q(pops, 0.95), "slideMax": max(slides) if slides else None, "outcomes": outcomes })
    json.dump({ "rows": rows, "cells": cells }, open(out, "w"), indent=1)
    f = lambda x: "-" if x is None else f"{x * 100:5.1f}"
    print("body         recv n  med   p95   max  cap | pass n  med   p95   max  cap plantLocked | pop p95  max (cm/tick) | slide max")
    for r in rows:
        print(f"{r['body']:<12} {r['recvN']:6} {f(r['recvMedian'])} {f(r['recvP95'])} {f(r['recvMax'])} {r['recvCapped']:4} | {r['passN']:6} {f(r['passMedian'])} {f(r['passP95'])} {f(r['passMax'])} {r['passCapped']:4} {r['passPlantLocked']:5}/{r['passN']:<5} | {f(r['popP95'])} {f(r['popMax'])} | {f(r['slideMax'])}  {r['outcomes']}")

main()
