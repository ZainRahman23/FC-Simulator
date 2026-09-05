#!/usr/bin/env python3
"""Acceptance table (Phase 20) for reference profiles from: a matched goal-face dataset (--goalface), an analytic reach
dataset with --finite (--analytic), and the fixture ground/chest batteries (--ground, --chest).

  python3 gk_acceptance_table.py --goalface fixtures.json --analytic analytic.json --ground ground.json --chest chest.json
        --profiles POOR,AVERAGE,GOOD,ELITE,COURTOIS [--fam STRAIGHT] > table.md
"""
import json, sys, math
args = sys.argv[1:]
def opt(k, d=None): return args[args.index(k) + 1] if k in args else d
PROFS = opt("--profiles", "POOR,AVERAGE,GOOD,ELITE,COURTOIS").split(","); FAM = opt("--fam", "STRAIGHT"); CY = 34.0
G = json.load(open(opt("--goalface"))) if opt("--goalface") else None
A = json.load(open(opt("--analytic"))) if opt("--analytic") else None
GR = [r for r in json.load(open(opt("--ground")))["rows"] if not r.get("fail")] if opt("--ground") else []
CH = [r for r in json.load(open(opt("--chest")))["rows"] if not r.get("fail")] if opt("--chest") else []
def pct(xs):
    xs = list(xs); return 100.0 * sum(1 for x in xs if x) / max(1, len(xs)) if xs else float("nan")
def held(r): return any(c["held"] for c in r["contacts"])
rows = []
def add(label, vals, fmt="%.0f"):
    rows.append((label, [("—" if v is None or (isinstance(v, float) and math.isnan(v)) else (fmt % v if isinstance(v, (int, float)) else str(v))) for v in vals]))
if G:
    prof = G["profiles"]
    for k, lab in [("reflexes", "GK Reflexes"), ("diving", "GK Diving"), ("handling", "GK Handling"), ("positioning", "GK Positioning (held at %s in the corpus)" % G["geometry"].get("posHeldAt")), ("jumping", "Jumping"), ("acceleration", "Acceleration"), ("speed", "Sprint speed"), ("strength", "Strength"), ("height", "Height (cm)"), ("weight", "Weight (kg)")]:
        add(lab, [prof[p].get(k) for p in PROFS], "%g")
    sh = [s for s in G["families"][FAM]["shots"] if s.get("on")]
    h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 21]
    if len(h) < 40: h = [s for s in sh if s["off"]["bounces"] == 0 and s["off"]["line"]["sp"] >= 18]
    def band(y0, y1, z0, z1, p):
        ss = [s for s in h if y0 <= abs(s["off"]["line"]["y"] - CY) < y1 and z0 <= s["off"]["line"]["z"] < z1]; return pct(not s["on"][p]["goal"] for s in ss)
    add("hard save %% (in-air hard subset, %s, n=%d)" % (FAM, len(h)), [pct(not s["on"][p]["goal"] for s in h) for p in PROFS], "%.1f")
    add("total save % (all on-target)", [pct(not s["on"][p]["goal"] for s in sh) for p in PROFS], "%.1f")
    add("contact % (all on-target)", [pct(bool(s["on"][p]["contacts"]) for s in sh) for p in PROFS], "%.1f")
    add("centre MID (hard)", [band(0, 0.7, 0.6, 1.5, p) for p in PROFS]); add("inner MID", [band(0.7, 1.9, 0.6, 1.5, p) for p in PROFS]); add("outer MID", [band(1.9, 2.9, 0.6, 1.5, p) for p in PROFS])
    add("inner HIGH", [band(0.7, 1.9, 1.5, 2.05, p) for p in PROFS]); add("outer HIGH", [band(1.9, 2.9, 1.5, 2.05, p) for p in PROFS]); add("extreme HIGH", [band(2.9, 3.7, 1.5, 2.05, p) for p in PROFS])
    add("outer TOP", [band(1.9, 2.9, 2.05, 2.33, p) for p in PROFS])
    tt = [s for s in h if abs(s["off"]["line"]["y"] - CY) >= 2.9 and s["off"]["line"]["z"] >= 2.05]
    add("true TOP corner (|off|≥2.9, z≥2.05; n=%d)" % len(tt), [pct(not s["on"][p]["goal"] for s in tt) for p in PROFS])
    tb = [s for s in h if abs(s["off"]["line"]["y"] - CY) >= 2.9 and s["off"]["line"]["z"] < 0.4]
    add("true BOTTOM corner (n=%d)" % len(tb), [pct(not s["on"][p]["goal"] for s in tb) for p in PROFS])
    c = {p: [s for s in sh if s["on"][p]["contacts"]] for p in PROFS}
    def oc(rec):
        k = rec["contacts"][0]; o = k["outcome"]
        return "held" if k.get("held") else "ctrl" if o.startswith("CONTROLLED") else "weak" if (o.startswith("WEAK") or o.startswith("FINGERTIP")) else "other"
    add("catch | contact %", [pct(s["on"][p]["held"] for s in c[p]) for p in PROFS], "%.1f")
    add("controlled parry | contact %", [pct(oc(s["on"][p]) == "ctrl" for s in c[p]) for p in PROFS], "%.1f")
    add("weak parry / fingertip | contact %", [pct(oc(s["on"][p]) == "weak" for s in c[p]) for p in PROFS], "%.1f")
    add("reaction latency (s)", [G["envs"][p]["latency"] for p in PROFS], "%.3f")
if A:
    ap = A["profiles"]
    add("max lateral hand-centre at MID/comfort (m)", [ap[p]["env"]["maxLat"] if p in ap else None for p in PROFS], "%.2f")
    add("max lateral ball-centre at z 1.9 (m)", [next((r["ballLat"] for r in ap[p]["lateralByHeight"] if abs(r["z"] - 1.8) < 0.01), None) if p in ap else None for p in PROFS], "%.2f")
    add("max lateral ball-centre at the bar (m)", [ap[p]["coupling"]["latAtBarBall"] if p in ap else None for p in PROFS], "%.2f")
    add("max vertical ball-centre (m)", [ap[p]["anatomy"]["maxBallCentreZ"] if p in ap else None for p in PROFS], "%.2f")
    add("standing fingertip (m)", [ap[p]["anatomy"]["standingFingertipZ"] if p in ap else None for p in PROFS], "%.2f")
    add("jumping fingertip (m)", [ap[p]["anatomy"]["jumpFingertipZ"] if p in ap else None for p in PROFS], "%.2f")
    add("lateral at max vertical (coupling, m)", [ap[p]["coupling"]["latAtMaxVertHand"] if p in ap else None for p in PROFS], "%.2f")
    for T in ("0.2", "0.3", "0.4", "0.5", "0.7", "1"):
        add("finite-time lateral hand-centre @ comfort, %s s (m)" % T, [ap[p]["finite"][T]["latAtComfort"] if p in ap and ap[p].get("finite") and T in ap[p]["finite"] else None for p in PROFS], "%.2f")
    add("full-stretch execution time (s, hand to maxLat at comfort)", [ap[p]["finiteFull"] if p in ap and "finiteFull" in ap[p] else None for p in PROFS], "%.3f")
if GR:
    add("slow gather % (rollers 1–15 m/s, 0…±1.0 m)", [pct(held(r) for r in GR if r["profile"] == p and r["mode"] == "roll") for p in PROFS], "%.0f")
    add("slow roller ≤ 6 m/s held %", [pct(held(r) for r in GR if r["profile"] == p and r["mode"] == "roll" and r["sp"] <= 6) for p in PROFS], "%.0f")
if CH:
    for sp in (20, 24, 28, 32):
        add("chest catch @ %d m/s (12 m, all heights, |lat| ≤ 0.4) %%" % sp, [pct(held(r) for r in CH if r["profile"] == p and r["sp"] == sp and r.get("dist") == 12) for p in PROFS], "%.0f")
    for sp in (20, 24, 28, 32):
        add("sternum band @ %d m/s (12 m, |lat| ≤ 0.2) %%" % sp, [pct(held(r) for r in CH if r["profile"] == p and r["sp"] == sp and r.get("dist") == 12 and r["hn"] in ("stomach", "lowerChest", "sternum", "upperChest") and abs(r["lat"]) <= 0.2) for p in PROFS], "%.0f")
print("| | " + " | ".join(PROFS) + " |"); print("|---|" + "---|" * len(PROFS))
for lab, vals in rows: print("| %s | %s |" % (lab, " | ".join(vals)))
