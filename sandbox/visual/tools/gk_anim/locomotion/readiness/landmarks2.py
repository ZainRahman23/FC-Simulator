#!/usr/bin/env python3
"""Colour-based body landmarks per rendered frame (sprite rows), relative to the planted-foot (ground) anchor the renderer uses.
head  = anchors head centre row;  top = silhouette top;  waist = shorts top (first dark row under the jersey, column median);
knee  = median row of exposed leg skin below the waist;  body = ground - top.  python3 landmarks2.py <trace.json> <out.csv>"""
import json, sys, collections
import numpy as np
from PIL import Image
ROOT="/Users/zainrahman/Downloads/FC Simulator/assets/visual_v1"
man=json.load(open(f"{ROOT}/goalkeeper/GK_ANIM_V1.json")); shv={v["dir"]:v for v in man["clips"]["shuffle"]["variants"]}
stanchors={st:json.load(open(f"{ROOT}/{man['states'][st]['anchors']}")) for st in ("base","set")}
_c={}
def clipmeta(vdir):
    if vdir not in _c: v=shv[vdir]; _c[vdir]=(v,json.load(open(f"{ROOT}/{v['anchors']}")))
    return _c[vdir]
_im={}
def rgba(rel):
    if rel not in _im: _im[rel]=np.array(Image.open(f"{ROOT}/{rel}").convert("RGBA"))
    return _im[rel]
def classes(a):
    r,g,b,al=a[...,0].astype(int),a[...,1].astype(int),a[...,2].astype(int),a[...,3]>0
    green=al&(g>150)&(r<190)&(b<120)&(g>r+30)          # jersey (neon green + lit shades)
    dgreen=al&(g>90)&(g<=150)&(r<80)&(b<90)             # jersey shading
    jersey=green|dgreen
    dark=al&(r<60)&(g<60)&(b<60)                        # shorts, socks, boots, hair
    skin=al&(r>120)&(r>g+25)&(g>b+5)&(b<140)&(r<240)    # skin tones
    return jersey,dark,skin,al
def landmarks_for(a, ground):
    jersey,dark,skin,al=classes(a); H,W=al.shape
    ys=np.where(al.any(axis=1))[0]; top=int(ys.min())
    waist=[]; 
    for x in range(W):
        jy=np.where(jersey[:,x])[0]
        if len(jy)<6: continue
        jb=jy.max()
        dy_=np.where(dark[jb+1:min(H,jb+12),x])[0]
        if len(dy_): waist.append(jb+1+dy_[0])
    waist_row=float(np.median(waist)) if len(waist)>=4 else None
    knee_row=None
    if waist_row is not None:
        legs=np.where(skin & (np.arange(H)[:,None]>waist_row+2) & (np.arange(H)[:,None]<ground))
        if len(legs[0])>=6: knee_row=float(np.median(legs[0]))
    return {"top_row":top,"waist_row":waist_row,"knee_row":knee_row}
def frame_geometry(r):
    c=r.get("clip"); bl=r.get("blit") or {}
    if c:
        v,meta=clipmeta(c["vdir"]); idx=c.get("src",c.get("srcFrame")); f=meta["frames"][idx]; rel=v["frames"].replace("{i}",str(idx))
        ground=f["bottom_row"] if v["ground"]=="bottom" else meta["ground_row"]; src=f"shuffle/{c['vdir']}{' mirrored' if c['mirrored'] else ''} frame {idx}"; head=f["head"][1]
        glove=min((g[1] for g in f.get("gloves",[])),default=None)
    else:
        st="base" if r["state"]=="IDLE" else "set"; an=stanchors[st][r["dir"]]; rel=man["states"][st]["path"].replace("{direction}",r["dir"]); ground=an["foot_row"]; src=f"{st}/{r['dir']} (rotation still)"; head=an["head"][1]
        glove=an["hands"]["screenLeft"][1] if an.get("hands") and an["hands"].get("screenLeft") else None
    a=rgba(rel); L=landmarks_for(a,ground); s=bl.get("s"); dy=bl.get("dy")
    scr=lambda row:(dy+round(row*s)) if (s is not None and dy is not None and row is not None) else None
    out={"src":src,"sprite_w":a.shape[1],"sprite_h":a.shape[0],"ground_row":ground,"head_row":head,"top_row":L["top_row"],"waist_row":L["waist_row"],"knee_row":L["knee_row"],"glove_row":glove,
         "head_h":round(ground-head,1),"body_h":ground-L["top_row"],"hip_h":(round(ground-L["waist_row"],1) if L["waist_row"] is not None else None),"knee_h":(round(ground-L["knee_row"],1) if L["knee_row"] is not None else None),"glove_h":(round(ground-glove,1) if glove is not None else None),
         "screen_head_y":scr(head),"screen_hip_y":scr(L["waist_row"]),"screen_knee_y":scr(L["knee_row"]),"screen_glove_y":scr(glove),"screen_foot_y":scr(ground),"screen_top_y":scr(L["top_row"]),"screen_bbox_h":(round(s*(ground-L["top_row"])) if s else None)}
    return out
def main():
    tr=json.load(open(sys.argv[1])); rows=[]
    for r in tr:
        g=frame_geometry(r); rows.append({**{k:r.get(k) for k in ("t","seg","keys","dir","state","phase","sim","v","gx","gy","odo","cyc","bx","by","ballD","bob","art")},"pos":(r["clip"]["pos"] if r.get("clip") else None),**g,"s":(r.get("blit") or {}).get("s"),"blit_dy":(r.get("blit") or {}).get("dy")})
    import csv
    with open(sys.argv[2],"w",newline="") as fo: w=csv.DictWriter(fo,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    segs=collections.OrderedDict()
    for x in rows: segs.setdefault(x["seg"],[]).append(x)
    print(f"{'segment':18s} {'facing(s)':22s} {'n':5s} {'states':40s} | head_h | hip_h | knee_h | body_h | glove_h | frames used (src×ticks) | cycle s")
    for name,xs in segs.items():
        dirs=collections.Counter(x["dir"] for x in xs); sts=collections.Counter(x["state"] for x in xs)
        def rng(k):
            v=[x[k] for x in xs if x[k] is not None]; return f"{min(v):.0f}..{max(v):.0f} ({max(v)-min(v):.0f})" if v else "-"
        used=[]
        for x in xs:
            key=x["src"].split("frame ")[-1] if "frame" in x["src"] else x["src"].split("/")[0]
            if not used or used[-1][0]!=key: used.append([key,1])
            else: used[-1][1]+=1
        idxs=[(x["t"],x["pos"]) for x in xs if x["pos"] is not None]; cyc="-"
        if idxs:
            starts=[t for i,(t,pz) in enumerate(idxs) if pz==0 and (i==0 or idxs[i-1][1]!=0)]
            if len(starts)>=2: cyc=f"{np.mean(np.diff(starts)):.2f}"
        print(f"{name:18s} {'/'.join(f'{d}:{n}' for d,n in dirs.items()):22s} {len(xs):5d} {str(dict(sts))[:40]:40s} | {rng('head_h'):12s} | {rng('hip_h'):12s} | {rng('knee_h'):12s} | {rng('body_h'):12s} | {rng('glove_h'):12s} | {' '.join(f'{k}×{n}' for k,n in used)[:110]} | {cyc}")
if __name__=="__main__": main()
