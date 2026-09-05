#!/usr/bin/env python3
"""Point-blank audit (documentation only): every close-range case where a stronger keeper concedes what a weaker keeper
saved, from the ground battery (`rollNear` / `air` modes) and from a short-distance goal-face dataset.

  python3 gk_pointblank_audit.py --ground ground.json [--goalface dist8.json --profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS]

For each case: distance / trajectory (speed, height, lateral), keeper state at contact (phase, commit action, tier,
execution time, usable time), intended action, actual contact (volume, point, outcome), what a missing body/arm volume
would have covered (a ball passing within 0.45 m of the body axis at chest height with no torso contact = arm-at-rest gap),
and the outcome.
"""
import json, sys, math
args = sys.argv[1:]
def opt(k, d=None): return args[args.index(k) + 1] if k in args else d
CY = 34.0
def out(r):
    if not r["contacts"]: return "GOAL (no contact)" if r["goal"] else "no contact"
    return r["contacts"][0]["outcome"] + (" → GOAL" if r["goal"] else "")
if opt("--ground"):
    R = [r for r in json.load(open(opt("--ground")))["rows"] if not r.get("fail")]
    order = ["K1", "POOR", "AVERAGE", "K2", "GOOD", "K3", "ELITE", "COURTOIS"]; profs = [p for p in order if any(r["profile"] == p for r in R)]
    key = lambda r: (r["mode"], r["sp"], r["z"], r["lat"]); by = {(r["profile"],) + key(r): r for r in R}
    print("### Ground battery — close-range inversions (weaker saves, stronger concedes)\n")
    print("| pair | mode | arrival speed | height | lateral | weaker: commit / contact / outcome | stronger: commit / contact / outcome | note |"); print("|---|---|---|---|---|---|---|---|")
    n = 0
    for a, b in zip(profs, profs[1:]):
        for r in R:
            if r["profile"] != a: continue
            rb = by.get((b,) + key(r))
            if rb and (not r["goal"]) and rb["goal"] and r["mode"] in ("rollNear", "air"):
                n += 1
                def desc(x):
                    cm = x["commit"]; c = x["contacts"][0] if x["contacts"] else None
                    return "%s %s exec %.2f" % (cm["action"], cm["tier"][:9], cm["execT"]) if cm else "no commit", ("%s @%.2fs z%.2f" % (c["volume"], c["t"], c["point"][2]) if c else "none"), out(x)
                da, db = desc(r), desc(rb)
                note = "ball beside the body at leg height: leg tip lottery" if abs(r["lat"]) >= 0.5 else "central low ball at the feet"
                print("| %s→%s | %s | %g m/s | %.2f | %+.2f | %s / %s / %s | %s / %s / %s | %s |" % (a, b, r["mode"], r["sp"], r["z"], r["lat"], *da, *db, note))
    print("\n%d cases." % n)
if opt("--goalface"):
    D = json.load(open(opt("--goalface"))); profs = opt("--profiles", ",".join(D["profileOrder"])).split(",")
    sh = [s for s in D["families"]["STRAIGHT"]["shots"] if s.get("on")]
    print("\n### Goal-face at %.0f m — inversions and arm-gap passes\n" % D["geometry"].get("dist", 0))
    print("| pair | aim y | charge | speed at line | line z | weaker outcome | stronger outcome | stronger commit | stronger closest hand-ball (m) |"); print("|---|---|---|---|---|---|---|---|---|")
    n = 0
    for a, b in zip(profs, profs[1:]):
        for s in sh:
            if not s["on"][a]["goal"] and s["on"][b]["goal"]:
                n += 1; cm = s["on"][b]["commit"]
                if n <= 40: print("| %s→%s | %.2f | %.3f | %.1f | %.2f | %s | %s | %s | %s |" % (a, b, s["aimY"], s["c"], s["off"]["line"]["sp"], s["off"]["line"]["z"], out(s["on"][a]), out(s["on"][b]), ("%s exec %.2f avail %s" % (cm["action"], cm["execT"], cm.get("avail"))) if cm else "no commit", (s["on"][b].get("closest") or {}).get("d", "—")))
    print("\n%d inversions across adjacent pairs." % n)
    # arm-at-rest gap: shots that pass within 0.45 m of the SET body axis at chest height without any contact
    setY = D["geometry"]["set"][1]
    for p in profs:
        gap = [s for s in sh if not s["on"][p]["contacts"] and s["on"][p]["goal"] and 0.8 <= s["off"]["line"]["z"] <= 1.6 and abs(s["off"]["line"]["y"] - setY) <= 0.45]
        print("* %s: %d goals passed within 0.45 m of the body axis at chest height with NO contact (arm-at-rest gap candidates)" % (p, len(gap)))
