#!/usr/bin/env python3
"""Synchronized W | SW | NW GIF from a wsn_capture2 folder. python3 compose_sync.py <cap_dir> <out.gif> <title> [<cap_dir_before> <label_before>]
Phases (sim time): readiness 2–5 s → ball slide 5–8 s (genuine footwork) → readiness 8–11 s."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
cap=sys.argv[1]; out=sys.argv[2]; title=sys.argv[3]; before=sys.argv[4] if len(sys.argv)>4 else None; blabel=sys.argv[5] if len(sys.argv)>5 else "BEFORE"
try: fb=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",13); f=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",11); fh=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",16)
except Exception: fb=f=fh=ImageFont.load_default()
Z=3; CW=120*Z; CH=76*Z; DIRS=["west","south-west","north-west"]
def load(d): return json.load(open(os.path.join(d,"trace.json")))
tr=load(cap); trb=load(before) if before else None
def cond(rows,i):
    # controller condition over the surrounding 0.5 s: converged (|v|=0) / residual step (|v|>0, no net travel) / moving
    w=[r for r in rows[max(0,i-15):i+15]]; vmax=max(r["v"] for r in w); dx=max(r["root"][0] for r in w)-min(r["root"][0] for r in w); dy=max(r["root"][1] for r in w)-min(r["root"][1] for r in w)
    if vmax<0.001: return "controller converged (|v| = 0): SET hold"
    if (dx*dx+dy*dy)**0.5<0.01: return "controller residual step (|v| %.3f, no travel)"%vmax
    return "moving (|v| %.2f m/s)"%vmax
def phase(t): return "READINESS" if t<5 else ("BALL SLIDES 6 m ACROSS AND BACK — GENUINE FOOTWORK" if t<8 else "READINESS")
rowsets=[(tr,title)] if not trb else [(trb,blabel),(tr,title)]
n=min(len([r for r in tr[d] if "file" in r]) for d in DIRS)
frames=[]
H=44+len(rowsets)*(CH+64); W=120+3*(CW+10)
idx=[[i for i,r in enumerate(rs[0][d]) if "file" in r] for rs in rowsets for d in DIRS]
for k in range(n):
    im=Image.new("RGB",(W,H),(22,24,28)); dr=ImageDraw.Draw(im)
    t=tr[DIRS[0]][idx[0][k]]["t"]
    dr.text((8,6),f"W | SW | NW — same scenario, same simulation times, live zoom 1.25 (×3 nearest)   t = {t:5.2f} s   {phase(t)}",fill=(255,255,255),font=fh)
    # phase bar
    bx=8; bw=W-16; dr.rectangle([bx,28,bx+bw,34],fill=(60,60,66)); px=bx+int(bw*(t-2)/9); dr.rectangle([bx,28,px,34],fill=(255,210,74))
    for s in (5,8): sx=bx+int(bw*(s-2)/9); dr.line([sx,26,sx,36],fill=(255,255,255))
    y=44
    for ri,(rs,lab) in enumerate(rowsets):
        dr.text((8,y+CH//2-8),lab,fill=(255,210,74),font=fb)
        for di,d in enumerate(DIRS):
            rows=rs[d]; i=idx[ri*3+di][k]; r=rows[i]; cell=Image.open(os.path.join(cap if rs is tr else before,r["file"])).convert("RGB").resize((CW,CH),Image.NEAREST)
            x=120+di*(CW+10); im.paste(cell,(x,y))
            c=r["clip"]; art=(f"{c['name']}/{c['vdir']}{' mirrored' if c['mirrored'] else ''} frame {c['srcFrame']} (pos {c['pos']+1}/{c['n']})") if c else ("base rotation + bob dy %d px"%r["bob"] if r["state"]=="IDLE" else "SET rotation (hold)")
            dr.text((x+3,y+CH+2),f"{d.upper()}   {r['state']}",fill=(200,230,255),font=fb)
            dr.text((x+3,y+CH+18),art,fill=(230,230,230),font=f)
            dr.text((x+3,y+CH+31),f"sim {r['simState']}  |v| {r['v']:.3f} m/s  odometer {r['odo']:.2f} m",fill=(190,190,190),font=f)
            dr.text((x+3,y+CH+44),cond(rows,i),fill=(160,200,160),font=f)
        y+=CH+64
    frames.append(im)
frames[0].save(out,save_all=True,append_images=frames[1:],duration=33,loop=0); print("wrote",out,"frames",len(frames),"size",frames[0].size)
