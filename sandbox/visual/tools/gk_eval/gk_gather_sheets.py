#!/usr/bin/env python3
"""Review sheets for the gather / chest / reach pass.
   python3 gather_sheets.py <ground_before> <ground_after> <chest_before> <chest_after> <outdir>"""
import json,sys,math,os
import numpy as np, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
gb,ga,cb,ca,OUT=sys.argv[1:6]; os.makedirs(OUT,exist_ok=True)
PROFS=["K1","K2","K3","COURTOIS"]; COL={"K1":"#d7301f","K2":"#fc8d59","K3":"#1a9850","COURTOIS":"#2b6cb0"}
def load(f): D=json.load(open(f)); return [r for r in D["rows"] if not r.get("fail")]
def out(r):
    if not r["contacts"]: return "GOAL" if r["goal"] else "NO CONTACT"
    o=r["contacts"][0]["outcome"].split(" (")[0]; return o+("→GOAL" if r["goal"] else "")
def cls(o):
    if o.startswith(("CATCH","GATHER","SUPPORTED","CHEST CATCH")): return "held"
    if "FOOT" in o or "LEG" in o: return "foot/leg"
    if "PARRY" in o or "FINGERTIP" in o or "BODY" in o: return "parry/block"
    if o.startswith("GOAL"): return "goal"
    return "other"
def pct(rows,k): return 100*sum(cls(out(r))==k for r in rows)/max(1,len(rows))
def goalpct(rows): return 100*sum(r["goal"] for r in rows)/max(1,len(rows))
# ── sheet A: ground balls by speed band (roll+air+bounce+drop, excluding rollNear), held / legs / goal, BEFORE vs AFTER
GB,GA=load(gb),load(ga); SP=[1,2,3,4,5,6,8,10,12,15]
fig,axs=plt.subplots(3,4,figsize=(15,8.5),sharex=True)
for j,pn in enumerate(PROFS):
    for i,(lab,fn) in enumerate([("HELD (catch/gather) %",lambda rr:pct(rr,"held")),("FOOT/LEG %",lambda rr:pct(rr,"foot/leg")),("GOAL %",goalpct)]):
        ax=axs[i][j]
        for R,ls,tag in [(GB,"--","BEFORE"),(GA,"-","AFTER")]:
            ys=[fn([r for r in R if r["profile"]==pn and r["sp"]==sp and r["mode"]!="rollNear"]) for sp in SP]
            ax.plot(SP,ys,ls,marker="o",color=COL[pn],label=tag)
        ys=[fn([r for r in GA if r["profile"]==pn and r["sp"]==sp and r["mode"]=="roll"]) for sp in SP]
        ax.plot(SP,ys,":",marker="s",color="#555",label="AFTER rollers only")
        ax.set_ylim(-3,103); ax.grid(alpha=.3); ax.set_title("%s — %s"%(pn,lab),fontsize=9)
        if i==2: ax.set_xlabel("arrival speed (m/s)")
        if i==0 and j==0: ax.legend(fontsize=7)
fig.suptitle("A · Ground / low balls (1–15 m/s; rolling, low air, bounce, drop; laterals 0…±1.0 m) — BEFORE (dashed) vs AFTER (solid)",fontsize=11)
fig.tight_layout(); fig.savefig(os.path.join(OUT,"A_ground_speed_bands.png"),dpi=105); plt.close(fig)
# ── sheet B: centred rollers outcome strip BEFORE vs AFTER
fig,axs=plt.subplots(1,2,figsize=(15,4.2))
for ax,R,tag in [(axs[0],GB,"BEFORE"),(axs[1],GA,"AFTER")]:
    for j,pn in enumerate(PROFS):
        for i,sp in enumerate(SP):
            rr=[r for r in R if r["profile"]==pn and r["sp"]==sp and r["mode"]=="roll" and r["lat"]==0]
            o=out(rr[0]) if rr else "-"; k=cls(o); c={"held":"#1a9850","foot/leg":"#fc8d59","parry/block":"#fee08b","goal":"#7f0000"}.get(k,"#ccc")
            ax.add_patch(plt.Rectangle((i,j),1,1,color=c)); ax.text(i+.5,j+.5,o.replace(" DEFLECTION","-DEFL").replace("→GOAL","\n→GOAL"),ha="center",va="center",fontsize=5.5)
    ax.set_xlim(0,len(SP)); ax.set_ylim(0,4); ax.set_xticks([i+.5 for i in range(len(SP))]); ax.set_xticklabels(SP); ax.set_yticks([j+.5 for j in range(4)]); ax.set_yticklabels(PROFS)
    ax.set_title("%s — centred roller (lat 0), first-contact outcome by arrival speed (m/s)"%tag,fontsize=9)
fig.tight_layout(); fig.savefig(os.path.join(OUT,"B_centred_rollers.png"),dpi=130); plt.close(fig)
# ── sheet C: chest catch % by speed, BEFORE vs AFTER (8 m default distance; AFTER also 12 m)
CB,CA=load(cb),load(ca); SPC=[8,10,12,15,18,20,22,24,26,28,30,32]
fig,axs=plt.subplots(2,4,figsize=(15,6.4),sharex=True)
for j,pn in enumerate(PROFS):
    ax=axs[0][j]
    for R,ls,tag,dist in [(CB,"--","BEFORE (3/5/8 m)",None),(CA,"-","AFTER (3/5/8 m)",None),(CA,"-.","AFTER 12 m",12)]:
        ys=[100*sum(any(c["held"] for c in r["contacts"]) for r in [x for x in R if x["profile"]==pn and x["sp"]==sp and x.get("dist")==dist])/max(1,len([x for x in R if x["profile"]==pn and x["sp"]==sp and x.get("dist")==dist])) if [x for x in R if x["profile"]==pn and x["sp"]==sp and x.get("dist")==dist] else float("nan") for sp in SPC]
        ax.plot(SPC,ys,ls,marker="o",color=COL[pn],label=tag)
    ax.set_ylim(-3,103); ax.grid(alpha=.3); ax.set_title("%s — CATCH %% (all heights, |lat| ≤ 0.4)"%pn,fontsize=9); ax.legend(fontsize=7)
    ax=axs[1][j]
    for R,ls,tag,dist in [(CB,"--","BEFORE",None),(CA,"-","AFTER",None),(CA,"-.","AFTER 12 m",12)]:
        ys=[goalpct([x for x in R if x["profile"]==pn and x["sp"]==sp and x.get("dist")==dist]) if [x for x in R if x["profile"]==pn and x["sp"]==sp and x.get("dist")==dist] else float("nan") for sp in SPC]
        ax.plot(SPC,ys,ls,marker="o",color=COL[pn],label=tag)
    ax.set_ylim(-3,103); ax.grid(alpha=.3); ax.set_title("%s — GOAL %%"%pn,fontsize=9); ax.set_xlabel("shot speed (m/s)")
fig.suptitle("C · Chest / body-line shots (stomach → head, laterals 0…±0.4 m) — catch % and goal % by speed",fontsize=11)
fig.tight_layout(); fig.savefig(os.path.join(OUT,"C_chest_catch_by_speed.png"),dpi=105); plt.close(fig)
# ── sheet D: chest catch by height x speed heat-strips at 12 m lateral 0 (AFTER) and 8 m (BEFORE) for each profile
HN=["stomach","lowerChest","sternum","upperChest","shoulder","head"]
fig,axs=plt.subplots(2,4,figsize=(15,6.2))
for j,pn in enumerate(PROFS):
    for i,(R,tag,dist) in enumerate([(CB,"BEFORE 8 m",None),(CA,"AFTER 12 m",12)]):
        ax=axs[i][j]; G=np.full((len(HN),len(SPC)),np.nan)
        for a,hn in enumerate(HN):
            for b,sp in enumerate(SPC):
                rr=[x for x in R if x["profile"]==pn and x["hn"]==hn and x["sp"]==sp and abs(x["lat"])<=0.2 and x.get("dist")==dist]
                if rr: G[a,b]=100*sum(any(c["held"] for c in x["contacts"]) for x in rr)/len(rr)
        ax.imshow(G,vmin=0,vmax=100,cmap="RdYlGn",aspect="auto"); ax.set_xticks(range(len(SPC))); ax.set_xticklabels(SPC,fontsize=7); ax.set_yticks(range(len(HN))); ax.set_yticklabels(HN,fontsize=7)
        for a in range(len(HN)):
            for b in range(len(SPC)):
                if not np.isnan(G[a,b]): ax.text(b,a,"%d"%G[a,b],ha="center",va="center",fontsize=6)
        ax.set_title("%s — %s — CATCH %% (|lat| ≤ 0.2)"%(pn,tag),fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(OUT,"D_chest_height_x_speed.png"),dpi=105); plt.close(fig)
print("sheets written to",OUT)
