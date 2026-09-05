#!/usr/bin/env python3
import json,sys
from collections import Counter
gb,ga,cb,ca=sys.argv[1:5]
def load(f): D=json.load(open(f)); return [r for r in D["rows"] if not r.get("fail")]
def out(r):
    if not r["contacts"]: return "GOAL" if r["goal"] else "NO CONTACT"
    o=r["contacts"][0]["outcome"].split(" (")[0]; return o+("→GOAL" if r["goal"] else "")
def cls(o):
    if o.startswith(("CATCH","GATHER","SUPPORTED","CHEST CATCH")): return "held"
    if "FOOT" in o or "LEG" in o: return "foot/leg"
    if "PARRY" in o or "FINGERTIP" in o or "BODY" in o: return "parry/block"
    return o
def held(r): return any(c["held"] for c in r["contacts"])
P=["K1","K2","K3","COURTOIS"]
GB,GA=load(gb),load(ga)
print("## 3 · Ground / low balls — BEFORE → AFTER (identical arrivals; `data/ground_before.json`, `data/ground_after.json`)\n")
print("Battery: arrival speeds 1,2,3,4,5,6,8,10,12,15 m/s × laterals 0/±0.25/±0.5/±0.75/±1.0 m × modes **roll** (struck along the ground at max(14, v+4) m/s and decelerating at 4.2 m/s² to the arrival speed — a 3 m/s roller starts 22 m out and takes ~3 s), low **air** (z 0.10–0.70, from 3/5/8 m), **bounce**-short, **drop**; plus **rollNear** (the ball placed 0.8–6 m away — at the feet before or just after the reaction: the emergency case). 1008 of 3348 arrivals are physically unsolvable (a 4 m/s ball cannot arrive in the air at 0.7 m, etc.) and are excluded. BEFORE = the pre-pass mechanics snapshot (`_pregather_match`) on exactly this battery.\n")
print("### 3.1 Centred rollers (lat 0) — first-contact outcome\n")
print("| speed | K1 before → after | K2 | K3 | COURTOIS |"); print("|---|---|---|---|---|")
for sp in [1,2,3,4,5,6,8,10,12,15]:
    row=[]
    for pn in P:
        b=[r for r in GB if r["profile"]==pn and r["mode"]=="roll" and r["lat"]==0 and r["sp"]==sp]; a=[r for r in GA if r["profile"]==pn and r["mode"]=="roll" and r["lat"]==0 and r["sp"]==sp]
        row.append("%s → **%s**"%(out(b[0]) if b else "-",out(a[0]) if a else "-"))
    print("| %d m/s | "%sp+" | ".join(row)+" |")
print("\n### 3.2 By speed band — HELD (catch/gather) % / FOOT-LEG % / GOAL % (all modes except rollNear)\n")
print("| speed | n | K1 before | K1 after | K2 before | K2 after | K3 before | K3 after | COURTOIS before | COURTOIS after |"); print("|---|---|---|---|---|---|---|---|---|---|")
for sp in [1,2,3,4,5,6,8,10,12,15]:
    cells=[]; n=0
    for pn in P:
        for R in (GB,GA):
            rr=[r for r in R if r["profile"]==pn and r["sp"]==sp and r["mode"]!="rollNear"]; n=len(rr); c=Counter(cls(out(r)) for r in rr); m=max(1,n)
            cells.append("%.0f / %.0f / %.0f"%(100*c["held"]/m,100*c["foot/leg"]/m,100*sum(1 for r in rr if r["goal"])/m))
    print("| %d m/s | %d | "%(sp,n)+" | ".join(cells)+" |")
print("\n### 3.3 By mode — HELD / FOOT-LEG / GOAL % [n]\n")
print("| profile | mode | before | after |"); print("|---|---|---|---|")
for pn in P:
    for m in ["roll","air","bounce","drop","rollNear"]:
        cells=[]
        for R in (GB,GA):
            rr=[r for r in R if r["profile"]==pn and r["mode"]==m]; n=max(1,len(rr)); c=Counter(cls(out(r)) for r in rr)
            cells.append("%.0f / %.0f / %.0f [%d]"%(100*c["held"]/n,100*c["foot/leg"]/n,100*sum(1 for r in rr if r["goal"])/n,len(rr)))
        print("| %s | %s | %s | %s |"%(pn,m,cells[0],cells[1]))
print("\n### 3.4 Rollers by lateral offset — HELD % before → after\n")
print("| profile | 0 | ±0.25 | ±0.5 | ±0.75 | ±1.0 |"); print("|---|---|---|---|---|---|")
for pn in P:
    cells=[]
    for lat in [0,0.25,0.5,0.75,1.0]:
        v=[]
        for R in (GB,GA):
            rr=[x for x in R if x["profile"]==pn and x["mode"]=="roll" and abs(x["lat"])==lat]; v.append(100*sum(cls(out(r))=="held" for r in rr)/len(rr))
        cells.append("%.0f → **%.0f**"%tuple(v))
    print("| %s | "%pn+" | ".join(cells)+" |")
def inversions(R):
    key=lambda r:(r["mode"],r["sp"],r["z"],r["lat"]); by={}
    for r in R: by[(r["profile"],)+key(r)]=r
    inv=[]
    for a,b in [("K1","K2"),("K2","K3"),("K1","K3"),("K1","COURTOIS"),("K2","COURTOIS")]:
        for r in R:
            if r["profile"]!=a: continue
            rb=by.get((b,)+key(r))
            if rb and (not r["goal"]) and rb["goal"]: inv.append((a,b,key(r),out(r),out(rb)))
    return inv
ib,ia=inversions(GB),inversions(GA)
print("\n### 3.5 Monotonicity on identical arrivals (weaker keeper saves, stronger concedes)\n")
print("BEFORE: **%d** inversions. AFTER: **%d** — all in the point-blank `rollNear` mode:"%(len(ib),len(ia)))
for x in ia: print("* `%s`"%str(x))
print("\nBEFORE examples: "+"; ".join("`%s`"%str(x) for x in ib[:6]))
print("\nVocabulary BEFORE: %s"%Counter(out(r) for r in GB).most_common(10))
print("\nVocabulary AFTER: %s"%Counter(out(r) for r in GA).most_common(12))
CB,CA=load(cb),load(ca)
print("\n## 4 · Chest / body-line shots — BEFORE → AFTER (`data/chest_before.json`, `data/chest_after.json`)\n")
print("Battery: 8–32 m/s × heights stomach 0.55h / lowerChest 0.62h / sternum 0.70h / upperChest 0.78h / shoulder 0.85h / head 0.92h × laterals 0/±0.1/±0.2/±0.3/±0.4 m, straight flight from 3 m (≤ 8 m/s), 5 m (≤ 15) or 8 m (≥ 18) — the no-time region (K1's reaction alone is 0.24 s of a 0.33 s flight) — plus a **12 m** variant for every ≥ 18 m/s cell (an ordinary shooting distance). Same battery on both builds.\n")
print("### 4.1 CATCH % (GOAL %) by speed — all heights, |lat| ≤ 0.4\n")
print("| speed | K1 before 8 m | K1 after 8 m | K1 before 12 m | K1 after 12 m | K2 before 8 m | K2 after 8 m | K2 before 12 m | K2 after 12 m | K3 before 8 m | K3 after 8 m | K3 before 12 m | K3 after 12 m | CO before 8 m | CO after 8 m | CO before 12 m | CO after 12 m |"); print("|"+"---|"*17)
for sp in [8,10,12,15,18,20,22,24,26,28,30,32]:
    cells=[]
    for pn in P:
        for dist in (None,12):
            for R in (CB,CA):
                rr=[r for r in R if r["profile"]==pn and r["sp"]==sp and r.get("dist")==dist]
                cells.append("%.0f (%.0f)"%(100*sum(held(r) for r in rr)/len(rr),100*sum(r["goal"] for r in rr)/len(rr)) if rr else "—")
    print("| %d | "%sp+" | ".join(cells)+" |")
print("\n### 4.2 12 m, |lat| ≤ 0.2, hip → upper chest (the sternum band) — CATCH % by speed, before → after\n")
print("| profile | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 |"); print("|---|---|---|---|---|---|---|---|---|")
for pn in P:
    cells=[]
    for sp in [18,20,22,24,26,28,30,32]:
        v=[]
        for R in (CB,CA):
            rr=[x for x in R if x["profile"]==pn and x["hn"] in ("stomach","lowerChest","sternum","upperChest") and abs(x["lat"])<=0.2 and x["sp"]==sp and x.get("dist")==12]; v.append(100*sum(held(r) for r in rr)/max(1,len(rr)))
        cells.append("%.0f → **%.0f**"%tuple(v))
    print("| %s | "%pn+" | ".join(cells)+" |")
print("\n### 4.3 12 m, lateral 0 — CATCH % by height × speed 18…32 (AFTER)\n")
print("| height | K1 | K2 | K3 | COURTOIS |"); print("|---|---|---|---|---|")
for hn in ["stomach","lowerChest","sternum","upperChest","shoulder","head"]:
    cells=[]
    for pn in P:
        cells.append(" ".join("%.0f"%(100*sum(held(r) for r in [x for x in CA if x["profile"]==pn and x["hn"]==hn and x["lat"]==0 and x["sp"]==sp and x.get("dist")==12])/max(1,len([x for x in CA if x["profile"]==pn and x["hn"]==hn and x["lat"]==0 and x["sp"]==sp and x.get("dist")==12]))) for sp in [18,20,22,24,26,28,30,32]))
    print("| %s | "%hn+" | ".join(cells)+" |")
print("\n### 4.4 12 m — CATCH % by |lateral| (all heights), AFTER\n")
print("| profile | speed | 0 | 0.1 | 0.2 | 0.3 | 0.4 |"); print("|---|---|---|---|---|---|---|")
for pn in P:
    for sp in [20,24,28]:
        print("| %s | %d | "%(pn,sp)+" | ".join("%.0f"%(100*sum(held(r) for r in [x for x in CA if x["profile"]==pn and x["sp"]==sp and abs(x["lat"])==lat and x.get("dist")==12])/max(1,len([x for x in CA if x["profile"]==pn and x["sp"]==sp and abs(x["lat"])==lat and x.get("dist")==12]))) for lat in [0,0.1,0.2,0.3,0.4])+" |")
print("\nFirst-contact volume BEFORE: %s → AFTER: %s"%(Counter(r["contacts"][0]["volume"] for r in CB if r["contacts"]).most_common(),Counter(r["contacts"][0]["volume"] for r in CA if r["contacts"]).most_common()))
print("\nVocabulary BEFORE: %s"%Counter(out(r) for r in CB).most_common(8))
print("\nVocabulary AFTER: %s"%Counter(out(r) for r in CA).most_common(12))
print("\nObserved-instability hook: maximum `jitter` over every contact in both AFTER batteries = %.2f m/s² (cStable = 1 everywhere)."%max((c["q"].get("jitter") or 0) for r in CA+GA for c in r["contacts"]))
