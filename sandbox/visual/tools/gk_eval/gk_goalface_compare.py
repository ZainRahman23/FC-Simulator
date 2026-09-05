#!/usr/bin/env python3
"""Compare matched goal-face datasets (gk_profile_goalface.js) side by side: label=path pairs.
   python3 pgf_compare.py BEFORE=pgf/before.json AFTER=pgf/after.json [--fam STRAIGHT] [--hardonly]"""
import json,sys
args=[a for a in sys.argv[1:] if "=" in a]; flags=[a for a in sys.argv[1:] if "=" not in a]
DS=[(a.split("=",1)[0],json.load(open(a.split("=",1)[1]))) for a in args]
FAMS=[f for f in ["STRAIGHT","INSIDE_R"] if all(f in D["families"] for _,D in DS)]
if "--fam" in flags: FAMS=[flags[flags.index("--fam")+1]]
PROFS=DS[0][1]["profileOrder"]; CY=34.0
ZB4=[("LOW",0.11,0.6),("MID",0.6,1.5),("HIGH",1.5,2.05),("TOP",2.05,2.33)]
LB=[("centre",0,0.7),("inner",0.7,1.9),("outer",1.9,2.9),("extreme",2.9,3.7)]
def pct(xs):
    xs=list(xs); return 100.0*sum(1 for x in xs if x)/max(1,len(xs))
def on(D,fam): return [s for s in D["families"][fam]["shots"] if s.get("on")]
def hard(sh): 
    h=[s for s in sh if s["off"]["bounces"]==0 and s["off"]["line"]["sp"]>=21]
    return (h,">=21") if len(h)>=40 else ([s for s in sh if s["off"]["bounces"]==0 and s["off"]["line"]["sp"]>=18],">=18")
def stats(sh,p):
    c=[s for s in sh if s["on"][p]["contacts"]]
    return dict(n=len(sh),contact=pct(bool(s["on"][p]["contacts"]) for s in sh),sgc=pct(not s["on"][p]["goal"] for s in c),total=pct(not s["on"][p]["goal"] for s in sh),catch=pct(s["on"][p]["held"] for s in c))
for fam in FAMS:
    print("\n######## %s ########"%fam)
    for lab,D in DS:
        r=D.get("reach",{}); print("  [%s] shots on-target %d  reach %s  sets %s"%(lab,len(on(D,fam)),{k:r[k] for k in ("envExp","jumpModel","latModel") if k in r},D.get("sets",{})))
    # summary per profile
    print("\n  ALL on-target — CONTACT / SAVE|CONTACT / TOTAL SAVE / CATCH|CONTACT")
    print("  %-9s"%""+"".join("%26s"%lab for lab,_ in DS))
    for p in PROFS:
        row=[]
        for lab,D in DS: st=stats(on(D,fam),p); row.append("%5.1f %5.1f %5.1f %5.1f"%(st["contact"],st["sgc"],st["total"],st["catch"]))
        print("  %-9s"%p+"".join("%26s"%x for x in row))
    print("\n  HARD in-air subset — CONTACT / SAVE|CONTACT / TOTAL SAVE / CATCH|CONTACT")
    for p in PROFS:
        row=[]
        for lab,D in DS: h,hl=hard(on(D,fam)); st=stats(h,p); row.append("%5.1f %5.1f %5.1f %5.1f [%d %s]"%(st["contact"],st["sgc"],st["total"],st["catch"],st["n"],hl))
        print("  %-9s"%p+"".join("%34s"%x for x in row))
    if "--hardonly" in flags: continue
    print("\n  HARD subset TOTAL SAVE %% by lateral band x height — per profile, columns = datasets")
    for p in PROFS:
        print("   -- %s"%p)
        print("      %-6s"%""+"".join("%20s"%l[0] for l in LB))
        for zn,z0,z1 in ZB4:
            cells=[]
            for ln,y0,y1 in LB:
                vals=[]
                for lab,D in DS:
                    h,_=hard(on(D,fam)); ss=[s for s in h if y0<=abs(s["off"]["line"]["y"]-CY)<y1 and z0<=s["off"]["line"]["z"]<z1]
                    vals.append("%3.0f"%pct(not s["on"][p]["goal"] for s in ss) if ss else "  -")
                cells.append("/".join(vals)+"[%d]"%len(ss))
            print("      %-6s"%zn+"".join("%20s"%c for c in cells))
    print("\n  CORNERS (hard) TOTAL SAVE %% — top: |off|>=1.9 & z>=1.7; TRUE top: |off|>=2.9 & z>=2.05; bottom: |off|>=1.9 & z<0.6; TRUE bottom: |off|>=2.9 & z<0.4")
    cor={"top":lambda s:abs(s["off"]["line"]["y"]-CY)>=1.9 and s["off"]["line"]["z"]>=1.7,
         "TRUE top":lambda s:abs(s["off"]["line"]["y"]-CY)>=2.9 and s["off"]["line"]["z"]>=2.05,
         "bottom":lambda s:abs(s["off"]["line"]["y"]-CY)>=1.9 and s["off"]["line"]["z"]<0.6,
         "TRUE bottom":lambda s:abs(s["off"]["line"]["y"]-CY)>=2.9 and s["off"]["line"]["z"]<0.4}
    print("  %-12s"%""+"".join("%9s"%p for p in PROFS))
    for cn,fn in cor.items():
        for lab,D in DS:
            h,_=hard(on(D,fam)); ss=[s for s in h if fn(s)]
            print("  %-12s"%("%s %s[%d]"%(cn,lab,len(ss)))+"".join("%9s"%("%.0f"%pct(not s["on"][p]["goal"] for s in ss) if ss else "-") for p in PROFS))
    print("\n  MONOTONICITY (all on-target): weaker saves & stronger concedes")
    order=[p for p in ["K1","K2","K3"] if p in PROFS]
    for lab,D in DS:
        sh=on(D,fam); parts=[]
        for a,b in zip(order,order[1:]): parts.append("%s>%s %d"%(a,b,sum(1 for s in sh if not s["on"][a]["goal"] and s["on"][b]["goal"])))
        if "COURTOIS" in PROFS: parts.append("K1>COURTOIS %d"%sum(1 for s in sh if not s["on"]["K1"]["goal"] and s["on"]["COURTOIS"]["goal"]))
        print("   [%s] "%lab+"  ".join(parts)+"  of %d"%len(sh))
