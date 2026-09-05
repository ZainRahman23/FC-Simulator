#!/usr/bin/env python3
"""BEFORE/AFTER live dribbling comparison: two runs (two rows), W | SW | NW windows each, shared clock from each window start.
python3 compose_live3.py <run_before> <lm_before.csv> <win_before.json> <run_after> <lm_after.csv> <win_after.json> <out.gif>"""
import json, sys, os, csv
from PIL import Image, ImageDraw, ImageFont
a=sys.argv
runs=[(a[1],a[2],a[3],"BEFORE (art as shipped)"),(a[4],a[5],a[6],"AFTER (SW crouch frames, NW re-sequenced)")]; out=a[7]
try: fb=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",13); f=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",11); fh=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",16)
except Exception: fb=f=fh=ImageFont.load_default()
Z=2; CW=180*Z; CH=170*Z; W=100+3*(CW+10); H=44+2*(CH+80)
data=[]
for run,lmp,winp,label in runs:
    tr=json.load(open(os.path.join(run,"trace.json"))); lm={round(float(x["t"]),3):x for x in csv.DictReader(open(lmp))}; win=json.load(open(winp)); cols=[]
    for d in ("west","south-west","north-west"):
        w=win[d]; rows=[r for r in tr if r.get("file") and w["win_t0"]<=r["t"]<=w["win_t1"]]; cols.append((d,rows,w["win_t0"]))
    data.append((run,lm,cols,label))
n=min(len(c[1]) for _,_,cols,_ in data for c in cols)
frames=[]
for k in range(n):
    im=Image.new("RGB",(W,H),(22,24,28)); dr=ImageDraw.Draw(im); tt=data[0][2][0][1][k]["t"]-data[0][2][0][2]
    dr.text((8,6),f"LIVE DRIBBLING, before vs after — real page, real keys, real controller, real state machine; W | SW | NW windows of each run, shared clock   +{tt:5.2f} s",fill=(255,255,255),font=fh)
    dr.text((8,26),"zoom 2.99 (sprite scale 1.0), rail centred on the keeper, ×2 nearest. Readout: drawn source frame · head / hip / knee / body height above the planted-foot anchor (sprite px)",fill=(200,200,200),font=f)
    for ri,(run,lm,cols,label) in enumerate(data):
        y=44+ri*(CH+80); dr.text((8,y+CH//2-20),label.replace(" (","\n("),fill=(255,210,74),font=fb)
        for ci,(d,rows,t0) in enumerate(cols):
            r=rows[k]; x=100+ci*(CW+10); cell=Image.open(os.path.join(run,r["file"])).convert("RGB").resize((CW,CH),Image.NEAREST); im.paste(cell,(x,y))
            L=lm.get(round(r["t"],3),{}); c=r["clip"]; art=(f"shuffle/{c['vdir']}{' mirrored' if c['mirrored'] else ''} frame {c['src']}") if c else ("base rotation (IDLE)" if r["state"]=="IDLE" else "SET rotation")
            dr.text((x+3,y+CH+3),f"{d.upper()}  ·  {r['state']}  ·  t {r['t']:.2f} s   {art}",fill=(200,230,255),font=fb)
            dr.text((x+3,y+CH+20),f"head {float(L.get('head_h',0)):.0f}   hip {L.get('hip_h','?')}   knee {L.get('knee_h','?')}   body {L.get('body_h','?')}",fill=(255,220,140),font=f)
            dr.text((x+3,y+CH+34),f"sim {r['sim']}  |v| {r['v']:.3f} m/s  odometer {r['odo']:.2f} m  ball {r['ballD']} m  keys {r['keys']}",fill=(180,180,180),font=f)
    frames.append(im)
frames[0].save(out,save_all=True,append_images=frames[1:],duration=33,loop=0); print("wrote",out,"frames",len(frames),"size",frames[0].size)
