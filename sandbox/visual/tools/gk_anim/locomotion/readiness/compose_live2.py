#!/usr/bin/env python3
"""W | SW | NW synchronized crop from ONE live dribbling run using explicit time windows (windows.json), shared clock from each window start.
python3 compose_live2.py <run_dir> <landmarks.csv> <windows.json> <out.gif> [title]"""
import json, sys, os, csv
from PIL import Image, ImageDraw, ImageFont
run=sys.argv[1]; lm=list(csv.DictReader(open(sys.argv[2]))); win=json.load(open(sys.argv[3])); out=sys.argv[4]; title=sys.argv[5] if len(sys.argv)>5 else "LIVE DRIBBLING RUN"
tr=json.load(open(os.path.join(run,"trace.json")))
try: fb=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",13); f=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",11); fh=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",16)
except Exception: fb=f=fh=ImageFont.load_default()
byt={round(float(x["t"]),3):x for x in lm}
cols=[]
for d in ("west","south-west","north-west"):
    w=win[d]; rows=[r for r in tr if r.get("file") and w["win_t0"]<=r["t"]<=w["win_t1"]]; cols.append((d,rows,w["win_t0"]))
n=min(len(c[1]) for c in cols); Z=2; CW=180*Z; CH=170*Z; W=90+3*(CW+10); H=50+CH+94
frames=[]
for k in range(n):
    im=Image.new("RGB",(W,H),(22,24,28)); dr=ImageDraw.Draw(im); tt=cols[0][1][k]["t"]-cols[0][2]
    dr.text((8,6),f"{title} — real page, real keys, real controller, real state machine; W | SW | NW windows of the same run, shared clock   +{tt:5.2f} s",fill=(255,255,255),font=fh)
    dr.text((8,26),"zoom 2.99 (sprite scale 1.0), rail centred on the keeper, ×2 nearest. Readout: drawn source frame · head / hip / knee / body height above the planted-foot anchor (sprite px) · controller |v|",fill=(200,200,200),font=f)
    for ci,(d,rows,t0) in enumerate(cols):
        r=rows[k]; x=90+ci*(CW+10); y=50
        cell=Image.open(os.path.join(run,r["file"])).convert("RGB").resize((CW,CH),Image.NEAREST); im.paste(cell,(x,y))
        L=byt.get(round(r["t"],3),{}); c=r["clip"]
        art=(f"shuffle/{c['vdir']}{' mirrored' if c['mirrored'] else ''} frame {c['src']}") if c else ("base rotation (IDLE)" if r["state"]=="IDLE" else "SET rotation")
        dr.text((x+3,y+CH+3),f"{d.upper()}  ·  {r['state']}  ·  t {r['t']:.2f} s",fill=(200,230,255),font=fb)
        dr.text((x+3,y+CH+20),art,fill=(230,230,230),font=f)
        dr.text((x+3,y+CH+34),f"head {float(L.get('head_h',0)):.0f}   hip {L.get('hip_h','?')}   knee {L.get('knee_h','?')}   body {L.get('body_h','?')}   (px above foot anchor)",fill=(255,220,140),font=f)
        dr.text((x+3,y+CH+48),f"sim {r['sim']}   |v| {r['v']:.3f} m/s   odometer {r['odo']:.2f} m   ball {r['ballD']} m   keys {r['keys']}",fill=(180,180,180),font=f)
        dr.text((x+3,y+CH+62),f"screen y: head {L.get('screen_head_y','?')}  hip {L.get('screen_hip_y','?')}  knee {L.get('screen_knee_y','?')}  foot {L.get('screen_foot_y','?')}   bbox h {L.get('screen_bbox_h','?')} px",fill=(160,200,160),font=f)
    frames.append(im)
frames[0].save(out,save_all=True,append_images=frames[1:],duration=33,loop=0); print("wrote",out,"frames",len(frames),"size",frames[0].size)
