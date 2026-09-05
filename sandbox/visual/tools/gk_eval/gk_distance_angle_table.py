#!/usr/bin/env python3
"""Distance / angle validation tables from several gk_profile_goalface.js datasets (one per shooter placement).

  python3 gk_distance_angle_table.py label=path [label=path ...] [--fam STRAIGHT] [--profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS]

Per dataset (distance or angle) and profile: CONTACT %, TOTAL SAVE %, CATCH|CONTACT % on all on-target shots and on the
in-air hard subset (≥ 21 m/s at the line, falling back to ≥ 18), the mean available time after the reaction at commit,
the share of commits that were reaction-bound (commit within one tick of the READ end), and the SET geometry (depth,
lateral offset) so the D2 U-shape can be checked directly.
"""
import json, sys
args = [a for a in sys.argv[1:] if "=" in a]; flags = [a for a in sys.argv[1:] if "=" not in a]
def opt(k, d=None): return flags[flags.index(k) + 1] if k in flags else d
FAM = opt("--fam", "STRAIGHT"); PROFS = opt("--profiles", None); CY = 34.0
DS = [(a.split("=", 1)[0], json.load(open(a.split("=", 1)[1]))) for a in args]
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs)) if xs else float("nan")
print("| dataset | shooter dist / angle | SET depth / lateral | profile | n | contact % | total save % | catch\\|contact % | hard n | hard contact % | hard save % | hard catch\\|c % | reaction-bound commits % | mean usable time at commit (s) |")
print("|" + "---|" * 14)
for lab, D in DS:
    if FAM not in D["families"]: continue
    g = D["geometry"]; profs = (PROFS.split(",") if PROFS else D["profileOrder"])
    sh = [s for s in D["families"][FAM]["shots"] if s.get("on")]
    h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]
    if len(h) < 40: h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18]
    for p in profs:
        if p not in D["profileOrder"]: continue
        c = [s for s in sh if s["on"][p]["contacts"]]; ch = [s for s in h if s["on"][p]["contacts"]]
        lat = D["envs"][p]["latency"]
        cm = [s["on"][p]["commit"] for s in sh if s["on"][p].get("commit")]
        rb = pct((x["t"] - lat) <= 0.017 for x in cm) if cm else float("nan")
        av = sum(x["avail"] for x in cm if x.get("avail") is not None) / max(1, sum(1 for x in cm if x.get("avail") is not None)) if cm else float("nan")
        print("| %s | %.1f m / %g° | %.2f / %+.2f | %s | %d | %.1f | %.1f | %.1f | %d | %.1f | %.1f | %.1f | %.0f | %.3f |" % (
            lab, g.get("dist", g.get("distToCentre")), g.get("angleDeg", 0), g["setDepth"], g["set"][1] - CY, p, len(sh),
            pct(bool(s["on"][p]["contacts"]) for s in sh), pct(not s["on"][p]["goal"] for s in sh), pct(s["on"][p]["held"] for s in c),
            len(h), pct(bool(s["on"][p]["contacts"]) for s in h), pct(not s["on"][p]["goal"] for s in h), pct(s["on"][p]["held"] for s in ch), rb, av))
