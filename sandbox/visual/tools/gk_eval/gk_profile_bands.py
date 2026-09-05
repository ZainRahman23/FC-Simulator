#!/usr/bin/env python3
"""Band table + pairwise gain/loss maps for the profiles inside ONE gk_profile_goalface.js dataset.

  python3 gk_profile_bands.py dataset.json [--fam STRAIGHT] [--profiles A,B,C] [--ref AVERAGE] [--hard]

Prints, per profile: CONTACT / SAVE|CONTACT / TOTAL / CATCH|CONTACT on all on-target shots and the hard in-air subset,
the TOTAL SAVE table by lateral band × height (hard subset unless --all), and for every profile the matched-shot
GAINS (ref concedes, profile saves) and LOSSES (ref saves, profile concedes) against --ref by band — "where each
profile gains and loses saves". Losses are classified (contact lost / same contact different outcome / rebound).
"""
import json, sys, math
args = sys.argv[1:]
def opt(k, d=None): return args[args.index(k) + 1] if k in args else d
D = json.load(open(args[0])); FAM = opt("--fam", "STRAIGHT"); CY = 34.0
PROFS = opt("--profiles", ",".join(D["profileOrder"])).split(","); REF = opt("--ref", PROFS[0]); HARD = "--all" not in args
ZB4 = [("LOW", 0.11, 0.6), ("MID", 0.6, 1.5), ("HIGH", 1.5, 2.05), ("TOP", 2.05, 2.33)]
LB = [("centre", 0, 0.7), ("inner", 0.7, 1.9), ("outer", 1.9, 2.9), ("extreme", 2.9, 3.7)]
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs)) if xs else float("nan")
sh = [s for s in D["families"][FAM]["shots"] if s.get("on")]
h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]; hl = "in-air ≥ 21 m/s"
if len(h) < 40: h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18]; hl = "in-air ≥ 18 m/s"
pool = h if HARD else sh
print("### %s — %s (n = %d on-target, hard %s n = %d); band table on %s\n" % (args[0].split("/")[-1], FAM, len(sh), hl, len(h), "the hard subset" if HARD else "all on-target"))
print("| profile | contact | save\\|c | total | catch\\|c | hard contact | hard save | hard catch\\|c |"); print("|---|---|---|---|---|---|---|---|")
for p in PROFS:
    c = [s for s in sh if s["on"][p]["contacts"]]; ch = [s for s in h if s["on"][p]["contacts"]]
    print("| %s | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f |" % (p, pct(bool(s["on"][p]["contacts"]) for s in sh), pct(not s["on"][p]["goal"] for s in c), pct(not s["on"][p]["goal"] for s in sh), pct(s["on"][p]["held"] for s in c),
                                                                  pct(bool(s["on"][p]["contacts"]) for s in h), pct(not s["on"][p]["goal"] for s in h), pct(s["on"][p]["held"] for s in ch)))
print("\n| profile | " + " | ".join("%s %s" % (l[0], z[0]) for z in ZB4 for l in LB) + " |"); print("|---|" + "---|" * (len(ZB4) * len(LB)))
cells = {}
for zn, z0, z1 in ZB4:
    for ln, y0, y1 in LB:
        cells[(ln, zn)] = [s for s in pool if y0 <= abs(s["off"]["line"]["y"] - CY) < y1 and z0 <= s["off"]["line"]["z"] < z1]
for p in PROFS:
    print("| %s | " % p + " | ".join(("%.0f" % pct(not s["on"][p]["goal"] for s in cells[(l[0], z[0])])) if cells[(l[0], z[0])] else "—" for z in ZB4 for l in LB) + " |")
def first(r): return r["contacts"][0] if r["contacts"] else None
def cls(a, b):
    ca, cb = first(a), first(b)
    if ca and not cb: return "contact lost"
    if not ca and cb: return "new contact but conceded"
    if not ca and not cb: return "no contact"
    same = ca["volume"] == cb["volume"] and abs(ca["t"] - cb["t"]) <= 0.02 and ca.get("point") and cb.get("point") and math.dist(ca["point"], cb["point"]) < 0.10
    if same: return "same contact & outcome, rebound" if ca["outcome"] == cb["outcome"] else "same contact, Stage-4 differs"
    return "different contact geometry"
print("\nMatched-shot GAINS / LOSSES vs %s (hard subset) by band — gains: %s concedes & profile saves; losses: the reverse\n" % (REF, REF))
print("| profile | " + " | ".join("%s %s" % (l[0], z[0]) for z in ZB4 for l in LB) + " | total gains | total losses | loss classes |"); print("|---|" + "---|" * (len(ZB4) * len(LB) + 3))
for p in PROFS:
    if p == REF: continue
    row = []; G = L = 0; classes = {}
    for zn, _, _ in ZB4:
        for ln, _, _ in LB:
            ss = cells[(ln, zn)]; g = sum(1 for s in ss if s["on"][REF]["goal"] and not s["on"][p]["goal"]); l = sum(1 for s in ss if not s["on"][REF]["goal"] and s["on"][p]["goal"])
            G += g; L += l; row.append("+%d/−%d" % (g, l) if (g or l) else "·")
            for s in ss:
                if not s["on"][REF]["goal"] and s["on"][p]["goal"]:
                    k = cls(s["on"][REF], s["on"][p]); classes[k] = classes.get(k, 0) + 1
    print("| %s | " % p + " | ".join(row) + " | %d | %d | %s |" % (G, L, json.dumps(classes)))
