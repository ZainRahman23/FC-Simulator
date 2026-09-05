#!/usr/bin/env python3
"""Deepest-crouch stills W | SW | NW from a live trace: for each facing the drawn frame with the smallest body height inside its window,
cropped from the run's screenshot, plus the source frame at ×4 with the hip→head torso axis and lean angle. python3 stills.py <run> <landmarks.csv> <windows.json> <out.png> [title]"""
import json, sys, os, csv, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
import torso
run=sys.argv[1]; lm=list(csv.DictReader(open(sys.argv[2]))); win=json.load(open(sys.argv[3])); out=sys.argv[4]; title=sys.argv[5] if len(sys.argv)>5 else "DEEPEST CROUCH"
tr=json.load(open(os.path.join(run,"trace.json"))); byt={r["t"]:r for r in tr}
try: fb=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",14); f=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",12); fh=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",17)
except Exception: fb=f=fh=ImageFont.load_default()
A="/Users/zainrahman/Downloads/FC Simulator/assets/visual_v1"; man=json.load(open(f"{A}/goalkeeper/GK_ANIM_V1.json")); shv={v["dir"]:v for v in man["clips"]["shuffle"]["variants"]}
Z=2; CW=180*Z; CH=170*Z; SZ=3; W=20+3*(CW+10+150*SZ//2+20); H=60+CH+120
im=Image.new("RGB",(W,H),(22,24,28)); dr=ImageDraw.Draw(im); dr.text((8,6),title,fill=(255,255,255),font=fh)
dr.text((8,30),"left: the live screenshot of that frame (zoom 2.99, ×2); right: its source frame ×4 with the hip→head torso axis (lean from vertical) and the foot row",fill=(200,200,200),font=f)
x=20
for d in ("west","south-west","north-west"):
    w=win[d]; rows=[r for r in lm if w["win_t0"]<=float(r["t"])<=w["win_t1"] and r["dir"]==d and r["body_h"] not in ("","None")]
    best=min(rows,key=lambda r:float(r["body_h"])); t=float(best["t"]); r=byt.get(t) or min(tr,key=lambda q:abs(q["t"]-t))
    # nearest screenshot
    cand=[q for q in tr if q.get("file") and abs(q["t"]-t)<0.05]; q=min(cand,key=lambda q:abs(q["t"]-t))
    cell=Image.open(os.path.join(run,q["file"])).convert("RGB").resize((CW,CH),Image.NEAREST); im.paste(cell,(x,60))
    c=r["clip"]; v=shv[c["vdir"]]; src=f"{A}/{v['frames'].replace('{i}',str(c['src']))}"; sp=Image.open(src).convert("RGBA")
    tt=torso.torso(src); mirrored=c["mirrored"]
    if mirrored: sp=ImageOps.mirror(sp)
    Wp,Hp=sp.size; big=Image.new("RGBA",(Wp,Hp),(70,110,60,255)); big.alpha_composite(sp); big=big.resize((Wp*SZ,Hp*SZ),Image.NEAREST); d2=ImageDraw.Draw(big)
    hx,hy=tt["head"]; px,py=tt["hip"]
    if mirrored: hx=Wp-1-hx; px=Wp-1-px
    d2.line([px*SZ,py*SZ,hx*SZ,hy*SZ],fill=(255,80,80),width=3); d2.ellipse([hx*SZ-5,hy*SZ-5,hx*SZ+5,hy*SZ+5],fill=(255,80,80)); d2.ellipse([px*SZ-5,py*SZ-5,px*SZ+5,py*SZ+5],fill=(255,220,60))
    d2.line([0,tt["bottom"]*SZ,Wp*SZ,tt["bottom"]*SZ],fill=(255,255,255),width=2)
    crop=big.crop((30*SZ,10*SZ,Wp*SZ-20*SZ,min(Hp,tt["bottom"]+8)*SZ)); crop=crop.resize((crop.width//2,crop.height//2),Image.LANCZOS); im.paste(crop.convert("RGB"),(x+CW+10,60))
    dr.text((x,60+CH+6),f"{d.upper()}  t {t:.2f} s  {r['state']}   shuffle/{c['vdir']}{' mirrored' if mirrored else ''} frame {c['src']}",fill=(200,230,255),font=fb)
    dr.text((x,60+CH+26),f"torso lean {tt['lean_deg']}° from vertical   body height {tt['body_h']} px   head {tt['head_h']} px   hip {tt['hip_h']} px above the foot row",fill=(255,220,140),font=f)
    dr.text((x,60+CH+44),f"sim {r['sim']}  |v| {r['v']:.3f} m/s  ball {r['ballD']} m  keys {r['keys']}",fill=(180,180,180),font=f)
    x+=CW+10+150*SZ//2+20
im.save(out); print("wrote",out,im.size)
