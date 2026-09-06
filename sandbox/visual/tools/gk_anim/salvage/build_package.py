#!/usr/bin/env python3
"""Salvage package: five inventory poses under neutral semantic names, anchors re-measured (root, gloves, lead glove, head, screen reach
vector), rotated variants of the overhead pose (pure transform about the root), and a candidate manifest the runtime can load with
?savePoses=<url> (family CONTEXTUAL / side ANY / key = semantic id)."""
import json, os, shutil, numpy as np
from PIL import Image
R="/Users/zainrahman/Downloads/FC Simulator/review_artifacts"; OUT=f"{R}/gk_pose_salvage"; P=f"{OUT}/poses"; os.makedirs(P,exist_ok=True)
V11=json.load(open(f"{R}/gk_anim_v1_1/poses/high_dive_anchors.json")); V12=json.load(open(f"{R}/gk_anim_v1_2/save_poses/AIRBORNE_DIVE_GOAL_LEFT_TOP_anchors.json"))
def gloves(a):
    """white glove blobs (r,g,b > 200), connected components, [cx, cy, area] sorted by area desc"""
    rgb=a[...,:3].astype(int); al=a[...,3]>0; w=al&(rgb.min(axis=2)>150)&(rgb.max(axis=2)-rgb.min(axis=2)<40)
    from collections import deque
    seen=np.zeros_like(w); out=[]
    for y,x in zip(*np.where(w)):
        if seen[y,x]: continue
        q=deque([(y,x)]); seen[y,x]=1; pts=[]
        while q:
            cy,cx=q.popleft(); pts.append((cy,cx))
            for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                if 0<=ny<w.shape[0] and 0<=nx<w.shape[1] and w[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; q.append((ny,nx))
        if len(pts)>=4: out.append([float(np.mean([p[1] for p in pts])), float(np.mean([p[0] for p in pts])), len(pts)])
    return sorted(out,key=lambda g:-g[2])
POSES=[
 ("TIGHT_S_NEAR_TOP","GK_POSE_129",f"{R}/gk_anim_v1_1/poses/high_dive/south.png","south", "SOUTH-facing keeper, tight attacker angle, high save to the NEAR/top corner (screen up-right)"),
 ("TIGHT_S_FAR_TOP","GK_POSE_136",f"{R}/gk_anim_v1_1/poses/high_dive/south-west.png","south-west","SOUTH-facing keeper, tight attacker angle, high save to the FAR/top corner (screen up-left)"),
 ("TIGHT_N_NEAR_TOP","GK_POSE_132",f"{R}/gk_anim_v1_1/poses/high_dive/north-east.png","north-east","NORTH-facing keeper, tight attacker angle, high save to the NEAR/top corner"),
 ("TIGHT_N_FAR_TOP","GK_POSE_133",f"{R}/gk_anim_v1_1/poses/high_dive/north.png","north","NORTH-facing keeper, tight attacker angle, high save to the FAR/top corner"),
 ("OVERHEAD_REACH","GK_POSE_148",f"{R}/gk_anim_v1_2/save_poses/AIRBORNE_DIVE_GOAL_LEFT_TOP.png",None,"ball above/over the keeper: upward reach, small lateral demand (original V1.2 TOP GOAL_LEFT candidate)"),
]
meta={}
def measure(path, root):
    a=np.array(Image.open(path).convert("RGBA")); al=a[...,3]>0; ys,xs=np.where(al); bbox=[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]
    gl=[g for g in gloves(a) if g[2]>=8]; lead=min(gl,key=lambda g:g[1]) if gl else None   # the RAISED glove = highest blob of real glove size
    hair=al&(a[...,0]<60)&(a[...,1]<60)&(a[...,2]<60); hy,hx=np.where(hair[:bbox[1]+30,:]); head=[float(hx.mean()),float(hy.mean())] if len(hx) else None
    reach=None
    if lead: v=np.array([lead[0]-root[0], lead[1]-root[1]]); reach=(v/np.linalg.norm(v)).round(4).tolist()
    return dict(root=root,bbox=bbox,gloves=gl,lead_glove=lead,head=head,reach_screen_unit=reach,canvas=[a.shape[1],a.shape[0]])
for sid,inv,src,rot,desc in POSES:
    dst=f"{P}/{sid}.png"; shutil.copyfile(src,dst)
    if rot: e=V11[rot]; root=[e["content_cx"], e["foot_row"]]
    else: root=list(V12["root"])
    m=measure(dst,root); m.update(inventory_id=inv, source=os.path.relpath(src,R), description=desc, original_label=(f"high_dive/{rot}" if rot else "AIRBORNE_DIVE_GOAL_LEFT_TOP")); meta[sid]=m
    json.dump(m,open(f"{P}/{sid}_anchors.json","w"),indent=1); print(sid, inv, "root",root,"lead glove",m["lead_glove"],"reach",m["reach_screen_unit"],"head",m["head"])
# rotated overhead variants: rotate about the root, nearest-neighbour, expanded canvas
src=Image.open(f"{P}/OVERHEAD_REACH.png").convert("RGBA"); r0=V12["root"]
for deg in (8,11,14):
    big=Image.new("RGBA",(src.width+80,src.height+40),(0,0,0,0)); big.paste(src,(40,20)); cx,cy=r0[0]+40,r0[1]+20
    rot=big.rotate(-deg, resample=Image.NEAREST, center=(cx,cy))   # PIL rotate: positive = counter-clockwise → negative = CLOCKWISE
    sid=f"OVERHEAD_REACH_CW{deg}"; rot.save(f"{P}/{sid}.png"); m=measure(f"{P}/{sid}.png",[cx,cy]); m.update(inventory_id="GK_POSE_148",source="transform of OVERHEAD_REACH.png",description=f"OVERHEAD_REACH rotated {deg}° clockwise about the root (nearest-neighbour, no scaling)",original_label="AIRBORNE_DIVE_GOAL_LEFT_TOP"); meta[sid]=m
    json.dump(m,open(f"{P}/{sid}_anchors.json","w"),indent=1)
    a=np.array(rot); al=a[...,3]>0; ys,xs=np.where(al); bot=int(ys.max()); fx=np.where(al[bot])[0]; feet=((fx.min()+fx.max())/2,bot); hd=m["head"]; lean=np.degrees(np.arctan2(hd[0]-feet[0], feet[1]-hd[1])) if hd else None
    print(sid,"canvas",rot.size,"root",[cx,cy],"lead",m["lead_glove"],"body lean now",round(float(lean),1) if lean is not None else None)
samples={sid:{"path":f"poses/{sid}.png","anchors":f"poses/{sid}_anchors.json","candidate":True,"approved":False,"note":m["description"]} for sid,m in meta.items()}
manifest={"version":"GK pose salvage — CONTEXTUAL tight-angle / overhead candidates (not approved)","convention":{"family":"CONTEXTUAL","side":"ANY","key":"semantic id"},
 "save_poses":{"CONTEXTUAL":{"ANY":{"samples":samples}}},
 "contextual_poses":[{"id":sid,"inventory_id":m["inventory_id"],"path":f"poses/{sid}.png","anchors":f"poses/{sid}_anchors.json","reach_screen_unit":m["reach_screen_unit"],
   **({"role":"tight_high","facing_deg":{"TIGHT_S_NEAR_TOP":90,"TIGHT_S_FAR_TOP":90,"TIGHT_N_NEAR_TOP":-90,"TIGHT_N_FAR_TOP":-90}[sid],"post":("near" if "NEAR" in sid else "far"),"height_classes":["HIGH","TOP"]} if sid.startswith("TIGHT") else {"role":"overhead","height_classes":["HIGH","TOP"]})} for sid,m in meta.items() if sid.startswith("TIGHT") or sid=="OVERHEAD_REACH_CW11"]}
json.dump(manifest,open(f"{OUT}/GK_CONTEXTUAL_POSES_CANDIDATES.json","w"),indent=1); print("manifest written", f"{OUT}/GK_CONTEXTUAL_POSES_CANDIDATES.json")
