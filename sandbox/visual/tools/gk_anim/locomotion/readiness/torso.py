#!/usr/bin/env python3
"""Torso lean per sprite frame: hip centre (shorts blob centroid under the jersey) → head centre (top-of-silhouette blob centroid);
lean = angle of that axis from vertical, in degrees (absolute, view-independent). Also body height, head/hip heights above the foot row."""
import sys, numpy as np
from PIL import Image
import landmarks2 as L
def torso(path):
    a=np.array(Image.open(path).convert("RGBA")); jersey,dark,skin,al=L.classes(a); H,W=al.shape
    ys,xs=np.where(al); top=int(ys.min()); bot=int(ys.max())
    Lm=L.landmarks_for(a,bot); waist=Lm["waist_row"]
    # head: silhouette pixels in the top 20 rows (hair + face)
    hy,hx=np.where(al[top:top+20,:]); head=(hx.mean(), top+hy.mean())
    # hip: dark (shorts) pixels in the 12 rows under the waist
    if waist is None: return None
    w0=int(round(waist)); sy,sx=np.where(dark[w0:w0+12,:]); hip=(sx.mean(), w0+sy.mean())
    dx=head[0]-hip[0]; dy=hip[1]-head[1]; lean=abs(np.degrees(np.arctan2(dx,dy)))
    # shoulder-over-hip offset in px (horizontal distance head↔hip) and torso length
    return dict(lean_deg=round(lean,1), head=(round(head[0],1),round(head[1],1)), hip=(round(hip[0],1),round(hip[1],1)), torso_len=round(float(np.hypot(dx,dy)),1), body_h=bot-top, head_h=round(bot-head[1],1), hip_h=round(bot-hip[1],1), bottom=bot)
if __name__=="__main__":
    for p in sys.argv[1:]: print(p.split("/")[-2:], torso(p))
