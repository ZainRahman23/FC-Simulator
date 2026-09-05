#!/usr/bin/env python3
"""Phase-15 tables from a Handling-sweep ground battery and chest battery (gather_battery.js with SWEEP=handling=...).

  python3 gk_handling_battery_table.py --ground ground.json --chest chest.json

Per Handling value: roller held %, low-ball held % by speed band, chest catch % by speed (12 m and near), controlled /
weak parry shares, and the CONTACT-IDENTITY check: first-contact time+volume identical to the base for every arrival
(chest: must be 100 % — Handling never touches reach/contact; ground: may differ only where the GATHER decision, which
reads the secure-hold speed, chose to collect instead of dive).
"""
import json, sys
args = sys.argv[1:]
def opt(k, d=None): return args[args.index(k) + 1] if k in args else d
def load(f): D = json.load(open(f)); return [r for r in D["rows"] if not r.get("fail")], D
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs)) if xs else float("nan")
def held(r): return any(c["held"] for c in r["contacts"])
def rating(p): return float(p.split("_")[-1]) if "__" in p else None
def oc(r):
    if not r["contacts"]: return "none"
    o = r["contacts"][0]["outcome"]
    return "held" if held(r) else "ctrl" if o.startswith("CONTROLLED") else "weak" if (o.startswith("WEAK") or o.startswith("FINGERTIP")) else "body/legs"
for which in ("ground", "chest"):
    f = opt("--" + which)
    if not f: continue
    R, D = load(f); profs = sorted(set(r["profile"] for r in R), key=lambda p: (rating(p) is None, rating(p) or 0))
    base = [p for p in profs if rating(p) is None][0] if any(rating(p) is None for p in profs) else profs[0]
    key = lambda r: (r["mode"], r["sp"], r["z"], r["lat"], r.get("dist"), r.get("hn"))
    byb = {key(r): r for r in R if r["profile"] == base}
    print("### %s battery — Handling sweep (base %s; n = %d arrivals per profile)\n" % (which.upper(), base, sum(1 for r in R if r["profile"] == base)))
    if which == "ground":
        print("| handling | rollers held % | rollers ≤ 6 m/s | 8–15 m/s | low air held % | bounce held % | drop held % | ctrl parry | weak parry | first contact identical to base % | of which: action differs (GATHER vs dive) |"); print("|" + "---|" * 11)
    else:
        print("| handling | chest catch @18 (12 m) | @20 | @22 | @24 | @26 | @28 | @30 | @32 | near (3/5/8 m) catch all speeds | ctrl parry | weak parry | first contact identical to base % |"); print("|" + "---|" * 14)
    for p in profs:
        rr = [r for r in R if r["profile"] == p]
        same = 0; tot = 0; actdiff = 0
        for r in rr:
            b = byb.get(key(r))
            if not b: continue
            tot += 1
            ca = r["contacts"][0] if r["contacts"] else None; cb = b["contacts"][0] if b["contacts"] else None
            ident = (ca is None and cb is None) or (ca and cb and ca["volume"] == cb["volume"] and abs(ca["t"] - cb["t"]) <= 0.02)
            if ident: same += 1
            elif (r.get("commit") or {}).get("action") != (b.get("commit") or {}).get("action"): actdiff += 1
        c = [r for r in rr if r["contacts"]]
        if which == "ground":
            print("| %s | %.0f | %.0f | %.0f | %.0f | %.0f | %.0f | %.1f | %.1f | %.1f | %d |" % (rating(p) if rating(p) is not None else p,
                pct(held(r) for r in rr if r["mode"] == "roll"), pct(held(r) for r in rr if r["mode"] == "roll" and r["sp"] <= 6), pct(held(r) for r in rr if r["mode"] == "roll" and r["sp"] >= 8),
                pct(held(r) for r in rr if r["mode"] == "air"), pct(held(r) for r in rr if r["mode"] == "bounce"), pct(held(r) for r in rr if r["mode"] == "drop"),
                pct(oc(r) == "ctrl" for r in c), pct(oc(r) == "weak" for r in c), 100.0 * same / max(1, tot), actdiff))
        else:
            print("| %s | " % (rating(p) if rating(p) is not None else p) + " | ".join("%.0f" % pct(held(r) for r in rr if r["sp"] == sp and r.get("dist") == 12) for sp in (18, 20, 22, 24, 26, 28, 30, 32)) +
                  " | %.0f | %.1f | %.1f | %.1f |" % (pct(held(r) for r in rr if r.get("dist") is None), pct(oc(r) == "ctrl" for r in c), pct(oc(r) == "weak" for r in c), 100.0 * same / max(1, tot)))
    print()
