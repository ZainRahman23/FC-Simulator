#!/usr/bin/env python3
"""Hand-centre reach envelopes (keeper plane, feet at 0) for the four profiles: BEFORE (linear maps, p=2.2) vs AFTER (chosen).
   python3 reach_sheet.py <after_json_from_reach_analytic_candidates> <after_key> <out.png>"""
import json,sys,math
import numpy as np, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
res=json.load(open(sys.argv[1])); AK=sys.argv[2]; OUT=sys.argv[3]
PROF={"K1":dict(div=45,jump=48,h=1.83),"K2":dict(div=72,jump=72,h=1.90),"K3":dict(div=92,jump=92,h=1.97),"COURTOIS":dict(div=91,jump=68,h=1.99)}
COL={"K1":"#d7301f","K2":"#fc8d59","K3":"#1a9850","COURTOIS":"#2b6cb0"}
def n01(a): return max(0,min(1,(a-20)/70))
def env(p,R):
    h=p["h"]; comfort=0.62*h; stand=1.30*h; x=n01(p["jump"]); dv=n01(p["div"])
    jump=0.85*x if R["jumpModel"]=="LINEAR" else R["jb"]+R["js"]*(1-(1-x)**R["je"])
    lat=1.40*dv if R["latModel"]=="LINEAR" else R["ls"]*(1-(1-dv)**R["le"])
    return dict(comfort=comfort,high=stand+jump,maxLat=1.70+lat+0.60*(h-1.75),up=max(0.45,stand+jump-comfort),down=1.35+0.40*dv)
CANDS={"LINEAR p2.2":(dict(jumpModel="LINEAR",latModel="LINEAR"),2.2),
       "J1 L1 p2.2":(dict(jumpModel="B",latModel="B",jb=0.15,js=0.40,je=1.30,ls=1.10,le=1.372),2.2),
       "J1 L1 p2.0":(dict(jumpModel="B",latModel="B",jb=0.15,js=0.40,je=1.30,ls=1.10,le=1.372),2.0),
       "J1 L1 p1.8":(dict(jumpModel="B",latModel="B",jb=0.15,js=0.40,je=1.30,ls=1.10,le=1.372),1.8),
       "J1 L1 p2.1":(dict(jumpModel="B",latModel="B",jb=0.15,js=0.40,je=1.30,ls=1.10,le=1.372),2.1)}
fig,axs=plt.subplots(1,2,figsize=(15,6.2),sharey=True)
for ax,key in zip(axs,["LINEAR p2.2",AK]):
    R,P=CANDS[key]
    for nm,p in PROF.items():
        e=env(p,R); L=np.linspace(-e["maxLat"],e["maxLat"],400)
        up=e["comfort"]+e["up"]*(1-np.abs(L/e["maxLat"])**P)**(1/P); dn=e["comfort"]-e["down"]*(1-np.abs(L/e["maxLat"])**P)**(1/P)
        ax.plot(L,up,color=COL[nm],lw=1.6,label="%s (maxLat %.2f, top %.2f)"%(nm,e["maxLat"],e["high"])); ax.plot(L,dn,color=COL[nm],lw=1.6)
    ax.axhline(2.44,color="#111",ls=":",lw=1); ax.text(-3.5,2.47,"crossbar 2.44",fontsize=8)
    ax.axhline(0,color="#111",lw=1); ax.set_xlim(-3.8,3.8); ax.set_ylim(-0.6,3.6); ax.set_aspect("equal"); ax.grid(alpha=.3)
    ax.set_title("%s — HAND-CENTRE envelope in the keeper's plane (feet at 0)"%key,fontsize=10); ax.legend(fontsize=7,loc="lower left"); ax.set_xlabel("lateral from the feet (m)")
axs[0].set_ylabel("height (m)")
fig.suptitle("E · Reach envelopes — BEFORE (linear jump/diving maps) vs AFTER (bounded maps); crossbar for scale",fontsize=11)
fig.tight_layout(); fig.savefig(OUT,dpi=130); print("wrote",OUT)
