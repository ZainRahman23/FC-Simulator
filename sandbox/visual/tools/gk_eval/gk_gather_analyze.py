#!/usr/bin/env python3
import json,sys
from collections import Counter,defaultdict
D=json.load(open(sys.argv[1])); R=[r for r in D["rows"] if not r.get("fail")]; which=sys.argv[2] if len(sys.argv)>2 else "ground"
def out(r):
    if not r["contacts"]: return "GOAL" if r["goal"] else "NO CONTACT (no goal)"
    o=r["contacts"][0]["outcome"].split(" (")[0]; return ("GATHER" if r["contacts"][0].get("gather") else o)+("→GOAL" if r["goal"] else "")
def cls(o):
    if o.startswith("CATCH") or o.startswith("GATHER") or o.startswith("SUPPORTED") or o.startswith("CHEST CATCH"): return "CATCH/GATHER"
    if "FOOT" in o or "LEG" in o: return "FOOT/LEG"
    if "PARRY" in o or "FINGERTIP" in o or "BODY" in o: return "parry/block"
    return o
def pct(xs): return 100.0*sum(1 for x in xs if x)/max(1,len(xs))
print("rows",len(R),"| unsolved",len(D["rows"])-len(R),"| set",D["setX"],D["setY"])
if which=="ground":
    print("\n=== GROUND/LOW BALLS — outcome class by speed band (all heights/laterals/modes), per profile ===")
    for pn in D["profiles"]:
        print("  %s"%pn); print("   %6s %5s |%13s %10s %12s %7s %8s | actions"%("speed","n","CATCH/GATHER","FOOT/LEG","parry/block","GOAL","noCont"))
        for sp in [1,2,3,4,5,6,8,10,12,15]:
            rr=[r for r in R if r["profile"]==pn and r["sp"]==sp]; C=Counter(cls(out(r)) for r in rr); A=Counter((r["commit"] or {}).get("action") for r in rr)
            print("   %6d %5d |%12.0f%% %9.0f%% %11.0f%% %6.0f%% %7.0f%% | %s"%(sp,len(rr),100*sum(v for k,v in C.items() if k=="CATCH/GATHER")/max(1,len(rr)),100*C["FOOT/LEG"]/max(1,len(rr)),100*C["parry/block"]/max(1,len(rr)),100*sum(1 for r in rr if r["goal"])/max(1,len(rr)),100*C["NO CONTACT (no goal)"]/max(1,len(rr)),dict(A.most_common(3))))
    print("\n=== centred rollers (lat 0, mode roll) — outcome per speed x profile ===")
    for sp in [1,2,3,4,5,6,8,10,12,15]:
        row=[]
        for pn in D["profiles"]:
            rr=[r for r in R if r["profile"]==pn and r["sp"]==sp and r["mode"]=="roll" and r["lat"]==0]; row.append("%-22s"%(out(rr[0]) if rr else "-"))
        print("   %2d m/s  "%sp+" | ".join(row))
    print("\n=== by mode (all speeds) — CATCH/GATHER % / FOOT-LEG % / goal % ===")
    for pn in D["profiles"]:
        row=[]
        for m in ["roll","air","bounce","drop"]:
            rr=[r for r in R if r["profile"]==pn and r["mode"]==m]; C=Counter(cls(out(r)) for r in rr); row.append("%s %3.0f/%3.0f/%3.0f [%d]"%(m,100*C["CATCH/GATHER"]/max(1,len(rr)),100*C["FOOT/LEG"]/max(1,len(rr)),100*sum(1 for r in rr if r["goal"])/max(1,len(rr)),len(rr)))
        print("  %-9s"%pn+"  ".join(row))
    print("\n=== outcome vocabulary (all profiles) ===",Counter(out(r) for r in R).most_common(12))
    inv=[]
    keyf=lambda r:(r["mode"],r["sp"],r["z"],r["lat"])
    by=defaultdict(dict)
    for r in R: by[keyf(r)][r["profile"]]=r
    for k,d in by.items():
        for a,b in [("K1","K2"),("K2","K3"),("K1","COURTOIS")]:
            if a in d and b in d and (not d[a]["goal"]) and d[b]["goal"]: inv.append((a,b,k,out(d[a]),out(d[b])))
    print("\n=== monotonicity inversions (better profile concedes where weaker saves): %d ==="%len(inv))
    for x in inv[:12]: print("  ",x)
else:
    print("\n=== CHEST BALLS — outcome by speed x profile (all heights, laterals ≤0.4) ===")
    print("   %5s |"%"speed"+"".join("%26s"%pn for pn in D["profiles"]))
    for sp in [8,10,12,15,18,20,22,24,26,28,30,32]:
        row=[]
        for pn in D["profiles"]:
            rr=[r for r in R if r["profile"]==pn and r["sp"]==sp]; C=Counter(cls(out(r)) for r in rr)
            row.append("catch %3.0f pry %3.0f gl %3.0f [%2d]"%(100*C["CATCH/GATHER"]/max(1,len(rr)),100*C["parry/block"]/max(1,len(rr)),100*sum(1 for r in rr if r["goal"])/max(1,len(rr)),len(rr)))
        print("   %5d |"%sp+"".join("%26s"%x for x in row))
    print("\n=== CATCH %% by height name x speed (K1 | COURTOIS), lateral 0 ===")
    for hn in ["stomach","lowerChest","sternum","upperChest","shoulder","head"]:
        row=[]
        for pn in ["K1","COURTOIS"]:
            row.append(" ".join("%3.0f"%pct([cls(out(r))=="CATCH/GATHER" for r in R if r["profile"]==pn and r["hn"]==hn and r["lat"]==0 and r["sp"]==sp]) for sp in [8,10,12,15,18,20,22,24,26,28,30,32]))
        print("   %-11s K1: %s | COURTOIS: %s"%(hn,row[0],row[1]))
    print("\n=== surfaces / outcomes (all) ===",Counter(out(r) for r in R).most_common(10))
    print("=== first-contact volumes ===",Counter(r["contacts"][0]["volume"] for r in R if r["contacts"]).most_common())
