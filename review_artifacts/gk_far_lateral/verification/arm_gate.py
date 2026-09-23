#!/usr/bin/env python3
"""Approximate self-collision gate from per-layer joint data (probe_layers output): capsules for the torso (abdomen pelvis→mid, chest mid→shoulder line),
upper arms, forearms, hands; min clearance per tick per layer; penetration = clearance < 0."""
import json, math, sys
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def add(a,b): return [a[i]+b[i] for i in range(3)]
def mul(a,s): return [x*s for x in a]
def dot(a,b): return sum(a[i]*b[i] for i in range(3))
def norm(a): return math.sqrt(dot(a,a))
def nrm(a):
    n=norm(a) or 1e-9; return [x/n for x in a]
def segseg(p1,q1,p2,q2):
    d1=sub(q1,p1); d2=sub(q2,p2); r=sub(p1,p2); a=dot(d1,d1); e=dot(d2,d2); f=dot(d2,r); EPS=1e-9
    if a<=EPS and e<=EPS: return norm(sub(p1,p2))
    if a<=EPS: s=0.0; t=max(0,min(1,f/e))
    else:
        c=dot(d1,r)
        if e<=EPS: t=0.0; s=max(0,min(1,-c/a))
        else:
            b=dot(d1,d2); den=a*e-b*b; s=max(0,min(1,(b*f-c*e)/den)) if den else 0.0
            t=(b*s+f)/e
            if t<0: t=0.0; s=max(0,min(1,-c/a))
            elif t>1: t=1.0; s=max(0,min(1,(b-c)/a))
    c1=add(p1,mul(d1,s)); c2=add(p2,mul(d2,t)); return norm(sub(c1,c2))
R = dict(abd=0.125, chest=0.145, chestTop=0.09, neck=0.06, neckLen=0.11, head=0.10, uarm=0.045, farm=0.040, hand=0.035)   # metres at H≈2.0 (scaled by H/2.0)
def capsules(J, H, reachHand):
    hs=H/2.0; pel=J["pelvis"]; ch=J["chest"]; up=J.get("chestUp") or [0,1,0]
    shoulderMid=mul(add(J["upperArm_R"],J["upperArm_L"]),0.5)
    upv=nrm(sub(shoulderMid,pel)); mid=add(pel,mul(sub(shoulderMid,pel),0.45)); chestEnd=sub(shoulderMid,mul(upv,R["chestTop"]*hs)); neckEnd=add(shoulderMid,mul(upv,R["neckLen"]*hs)); headC=add(neckEnd,mul(upv,R["head"]*hs))
    torso=[("abdomen",pel,mid,R["abd"]*hs),("chest",mid,chestEnd,R["chest"]*hs),("neck",shoulderMid,neckEnd,R["neck"]*hs),("head",headC,headC,R["head"]*hs)]
    arms={}
    for h in ("R","L"):
        s=J["upperArm_"+h]; e=J["foreArm_"+h]; w=J["hand_"+h]
        fd=sub(w,e); fl=norm(fd) or 1e-9; tip=J["tipHand"] if (h==reachHand and J.get("tipHand")) else add(w,mul(fd,0.10/fl))
        arms[h]=[("uarm",add(s,mul(sub(e,s),0.35)),e,R["uarm"]*hs),("farm",e,w,R["farm"]*hs),("hand",w,tip,R["hand"]*hs)]
    return torso,arms
def clearance(J,H,reachHand):
    torso,arms=capsules(J,H,reachHand); out={}
    for h,segs in arms.items():
        best=(9,None)
        for nm,p,q,r in segs:
            for tn,tp,tq,tr in torso:
                c=segseg(p,q,tp,tq)-r-tr
                if c<best[0]: best=(c,f"{nm}-{tn}")
        out[h]=best
    # arm vs opposite arm (forearm/hand only)
    best=(9,None)
    for nm,p,q,r in arms["R"][1:]:
        for nm2,p2,q2,r2 in arms["L"][1:]:
            c=segseg(p,q,p2,q2)-r-r2
            if c<best[0]: best=(c,f"{nm}R-{nm2}L")
    out["arms"]=best; return out
def run(path, layersel=("raw","redir","plan","final"), phases=None):
    res={}
    for rec in json.load(open(path)):
        H=rec["H"]; rows=[r for r in rec["rows"] if r.get("final")]; out=[]
        for r in rows:
            e={"k":r["k"],"phase":r.get("sub") or r.get("phase"),"mode":r.get("mode"),"ikW":r.get("ikW"),"landing":(r.get("landing") or {}).get("L",{}).get("stage") if isinstance(r.get("landing"),dict) else None}
            for lay in layersel:
                J=r.get(lay)
                if J and J.get("upperArm_R"): e[lay]=clearance(J,H,r.get("hand") or "R")
            out.append(e)
        res[str(rec["idx"])]={"name":rec["name"],"H":H,"rows":out}
    return res
if __name__=="__main__":
    res=run(sys.argv[1]); fx=sys.argv[2:] or list(res.keys())
    for k in fx:
        v=res[k]; print("==",k,v["name"],"H",v["H"])
        for e in v["rows"]:
            if e["k"]<30 or e["k"]>100: continue
            cells=[]
            for lay in ("raw","redir","plan","final"):
                c=e.get(lay)
                if c: cells.append(f"{lay}: R {c['R'][0]*100:+5.1f}cm({c['R'][1]}) L {c['L'][0]*100:+5.1f}cm({c['L'][1]}) RL {c['arms'][0]*100:+5.1f}")
            print(f"{e['k']:3d} {str(e['phase'])[:12]:12s} w{e['ikW'] or 0:.2f} | "+" | ".join(cells))
