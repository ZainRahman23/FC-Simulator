#!/usr/bin/env python3
"""GK pose inventory: collect every PixelLab goalkeeper save/dive pose, hash-dedupe, assign GK_POSE_### ids, build review sheets + index.
   python3 inventory.py"""
import os, sys, json, hashlib, subprocess, glob
from PIL import Image, ImageDraw, ImageFont
import numpy as np
REPO="/Users/zainrahman/Downloads/FC Simulator"; SC="/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6efc52ee-40f3-49a1-86c1-362b38fe33cc/scratchpad"
OUT=os.path.join(REPO,"review_artifacts/gk_pose_inventory"); DER=os.path.join(OUT,"derived_sprites"); SRC=os.path.join(OUT,"sources_copied_from_scratchpad"); os.makedirs(DER,exist_ok=True); os.makedirs(SRC,exist_ok=True)
def rel(p): return os.path.relpath(p,REPO) if p.startswith(REPO) else p
items=[]   # dict(path, pass, model, label, raw=None, note="")
def add(path, pas, model, label, raw=None, note=""):
    if os.path.exists(path): items.append(dict(path=path,pas=pas,model=model,label=label,raw=raw,note=note))
    else: print("MISSING",path)
# A. V1 authored save clips (assets) — generated frames 1..8 (frame 0 is the SET reference frame)
ANIM=os.path.join(REPO,"assets/visual_v1/originals/character_f4838361/anim")
for clip,dirs in [("chest_catch",["east","south"]),("low_gather",["east","south"]),("low_collapse_right",["east"]),("medium_dive_right",["east"]),("high_dive_right",["east"]),("foot_save_right",["east"])]:
    for d in dirs:
        for i in range(1,9): add(os.path.join(ANIM,clip,d,f"{i}.png"),"V1 clips (assets/…/anim)","animate_character v3 (custom, non-Pro)",f"{clip}/{d} frame {i}")
# B. V1 rejected groups: failed dive-axis groups + ball-baked first attempts (downloaded from PixelLab into the inventory folder)
DL=os.path.join(OUT,"pixellab_downloads")
for g,dirs,lab in [("gk_dive_toward_viewer_b9ba4520",["east"],"gk_dive_toward_viewer"),("gk_dive_away_from_viewer_3a06e040",["east"],"gk_dive_away_from_viewer"),("gk_chest_catch_v1_ballbaked_d446b433",["east","south"],"gk_chest_catch v1 (ball baked)"),("gk_low_gather_v1_ballbaked_cbf8b433",["east","south"],"gk_low_gather v1 (ball baked)")]:
    for d in dirs:
        for i in range(1,9): add(os.path.join(DL,g,d,f"{i}.png"),"V1 rejected groups (PixelLab download)","animate_character v3 (custom, non-Pro)",f"{lab}/{d} frame {i}")
# staging copies (scratchpad) of the same groups — included so byte-identical duplicates are recorded
for g,dirs in [("dive_toward_viewer",["east"]),("dive_away_from_viewer",["east"]),("chest_catch_noball",["east","south"]),("low_gather_noball",["east","south"])]:
    for d in dirs:
        for i in range(1,9): add(os.path.join(SC,"gk_anim/staging",g,d,f"{i}.png"),"V1 staging (scratchpad)","animate_character v3 (custom, non-Pro)",f"staging {g}/{d} frame {i}")
# D. V1.1 contact-pose character states (8 rotations each)
P11=os.path.join(REPO,"review_artifacts/gk_anim_v1_1/poses")
for st in ["low_collapse","medium_dive","high_dive","full_stretch"]:
    for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]: add(os.path.join(P11,st,f"{d}.png"),"V1.1 contact states (review_artifacts/gk_anim_v1_1/poses)","create_character_state (Pro, 8 rotations)",f"state {st} / {d}")
# E. V1.2 camera-space candidates (extracted sprites; raw plate kept as 'raw')
P12=os.path.join(REPO,"review_artifacts/gk_anim_v1_2/save_poses")
for name,raw in [("LOW_COLLAPSE_GOAL_LEFT_LOW","pro_LOW_COLLAPSE_GOAL_LEFT_v2"),("AIRBORNE_DIVE_GOAL_LEFT_MID","pro_AIRBORNE_MID_GOAL_LEFT"),("AIRBORNE_DIVE_GOAL_LEFT_HIGH","pro_AIRBORNE_HIGH_GOAL_LEFT"),("AIRBORNE_DIVE_GOAL_LEFT_TOP","pro_AIRBORNE_TOP_GOAL_LEFT"),("LOW_COLLAPSE_GOAL_RIGHT_LOW","pro_LOW_COLLAPSE_GOAL_RIGHT"),("AIRBORNE_DIVE_GOAL_RIGHT_MID","pro_AIRBORNE_MID_GOAL_RIGHT"),("AIRBORNE_DIVE_GOAL_RIGHT_HIGH","pro_AIRBORNE_HIGH_GOAL_RIGHT"),("AIRBORNE_DIVE_GOAL_RIGHT_TOP","pro_AIRBORNE_TOP_GOAL_RIGHT")]:
    add(os.path.join(P12,name+".png"),"V1.2 camera-space candidates (review_artifacts/gk_anim_v1_2/save_poses)","edit_image Pro on a renderer plate + extraction",name,raw=os.path.join(P12,"authored",raw+".png"))
# F. V1.2 rejected raw plates → extract now (transparent) with the plate they were generated from
EX=os.path.join(SC,"gk_proof/extract_pose.py"); GS=os.path.join(SC,"gk_anim12/gen_small")
def extract(raw, plate_base, outname, meta_json=None):
    plate=os.path.join(GS,plate_base+"_c16.png"); meta=meta_json or os.path.join(GS,plate_base+".json"); pref=os.path.join(DER,outname)
    r=subprocess.run([sys.executable,EX,plate,raw,meta,pref],capture_output=True,text=True)
    if r.returncode!=0 or not os.path.exists(pref+".png"): print("EXTRACT FAILED",outname,r.stderr[-300:]); return None
    return pref+".png"
GR=os.path.join(REPO,"review_artifacts/gk_anim_v1_2/generation_record")
for raw,plate,name,lab in [("REJECTED_AIRBORNE_MID_GOAL_LEFT_v1_sideways.png","AIRBORNE_MID_GOAL_LEFT","v12_MID_GOAL_LEFT_v1","V1.2 MID GOAL_LEFT attempt 1"),("REJECTED_LOW_COLLAPSE_GOAL_LEFT_v1_drift_toward_shooter.png","LOW_COLLAPSE_GOAL_LEFT","v12_LOW_GOAL_LEFT_v1","V1.2 LOW GOAL_LEFT attempt 1"),("REJECTED_AIRBORNE_TOP_GOAL_RIGHT_v2_sideways.png","AIRBORNE_TOP_GOAL_RIGHT","v12_TOP_GOAL_RIGHT_v2","V1.2 TOP GOAL_RIGHT attempt 2"),("REJECTED_pixen_route_HIGH_LEFT_scene_rerendered.png","AIRBORNE_HIGH_GOAL_LEFT","v12_HIGH_GOAL_LEFT_pixen","V1.2 HIGH GOAL_LEFT pixen route")]:
    rp=os.path.join(GR,raw); ex=extract(rp,plate,name)
    if ex: add(ex,"V1.2 other attempts (review_artifacts/gk_anim_v1_2/generation_record)","edit_image "+("pixen (non-Pro)" if "pixen" in raw else "Pro")+" + extraction",lab,raw=rp)
    else: add(rp,"V1.2 other attempts (generation_record)","edit_image "+("pixen" if "pixen" in raw else "Pro")+" (raw frame, pitch inseparable)",lab)
# G. Perspective proof
PP=os.path.join(REPO,"review_artifacts/gk_anim_perspective_proof")
add(os.path.join(PP,"save_poses/PROOF_GOAL_LEFT.png"),"perspective proof (review_artifacts/gk_anim_perspective_proof)","edit_image Pro + extraction","PROOF GOAL_LEFT",raw=os.path.join(PP,"pixellab/pro_GOAL_LEFT.png"))
add(os.path.join(PP,"save_poses/PROOF_GOAL_RIGHT.png"),"perspective proof (review_artifacts/gk_anim_perspective_proof)","edit_image Pro + extraction","PROOF GOAL_RIGHT attempt 2",raw=os.path.join(PP,"pixellab/pro_GOAL_RIGHT.png"))
grid=os.path.join(PP,"pixellab/REJECTED_GOAL_RIGHT_v1_bcd8c2f7_multi_figure_grid.png")
ex=extract(grid,os.path.join(SC,"gk_proof/plates/crop_GOAL_RIGHT"),"proof_GOAL_RIGHT_v1_grid",meta_json=os.path.join(SC,"gk_proof/plates/crop_GOAL_RIGHT.json")) if False else None
# the grid plate lives in gk_proof/plates (different naming) — call the extractor directly
pref=os.path.join(DER,"proof_GOAL_RIGHT_v1_grid"); r=subprocess.run([sys.executable,EX,os.path.join(SC,"gk_proof/plates/crop_GOAL_RIGHT_c16.png"),grid,os.path.join(SC,"gk_proof/plates/crop_GOAL_RIGHT.json"),pref],capture_output=True,text=True)
if os.path.exists(pref+".png"): add(pref+".png","perspective proof (generation_record)","edit_image Pro + extraction (six figures in one frame)","PROOF GOAL_RIGHT attempt 1 (grid)",raw=grid)
else: add(grid,"perspective proof (generation_record)","edit_image Pro (raw frame, pitch inseparable)","PROOF GOAL_RIGHT attempt 1 (grid)"); print("grid extract failed",r.stderr[-200:])
# H. WEST dive test, I. NORTH/SOUTH roll test
WT=os.path.join(REPO,"review_artifacts/gk_west_dive_test"); add(os.path.join(WT,"WEST_DIVE_GOAL_LEFT.png"),"WEST dive test (review_artifacts/gk_west_dive_test)","edit_image_pixen (non-Pro)","WEST_DIVE_GOAL_LEFT"); add(os.path.join(WT,"WEST_DIVE_GOAL_RIGHT.png"),"WEST dive test (review_artifacts/gk_west_dive_test)","edit_image_pixen (non-Pro)","WEST_DIVE_GOAL_RIGHT")
add(os.path.join(REPO,"review_artifacts/gk_north_south_roll_test/SOUTH_DIVE_ROLLED.png"),"NORTH/SOUTH roll test (review_artifacts/gk_north_south_roll_test)","edit_image_pixen (non-Pro)","SOUTH_DIVE_ROLLED")
# scratchpad gk_anim12 raw pro outputs that are NOT in the repo (v1 attempts kept there) → same bytes as generation_record copies; include for dedupe record
for f in ["pro_AIRBORNE_MID_GOAL_LEFT_v1.png","pro_LOW_COLLAPSE_GOAL_LEFT.png","pro_AIRBORNE_TOP_GOAL_RIGHT_retry_v2_REJECTED.png","trial_pixen_HIGH_LEFT.png"]: add(os.path.join(SC,"gk_anim12/gen_out",f),"V1.2 scratchpad raw (gk_anim12/gen_out)","edit_image (raw frame)",f)
# ---- hash + dedupe (byte-identical) ; scratchpad-only survivors are copied into the inventory folder for a durable path
def sha(p): return hashlib.sha256(open(p,"rb").read()).hexdigest()
seen={}; uniq=[]; dups=[]
for it in items:
    h=sha(it["path"]); it["sha"]=h
    if h in seen: seen[h]["dupes"].append(it["path"]); dups.append((it["path"],seen[h]["path"])); continue
    it["dupes"]=[]; seen[h]=it; uniq.append(it)
# raw plates with pitch: drop raw frames whose extracted counterpart exists (the extracted sprite carries raw= pointer); keep raw-only items
def is_raw_frame(it): return it["model"].endswith("(raw frame)") or "raw frame" in it["model"]
final=[]
for it in uniq:
    if is_raw_frame(it) and any(u.get("raw") and sha(u["raw"])==it["sha"] for u in uniq if u is not it): it["note"]="raw plate of an extracted pose (not shown)"; continue
    final.append(it)
for it in final:
    if it["path"].startswith(SC):
        dst=os.path.join(SRC,os.path.relpath(it["path"],SC).replace("/","__")); 
        if not os.path.exists(dst): Image.open(it["path"]).save(dst)
        it["copied"]=dst
# ---- ids
for k,it in enumerate(final,1): it["id"]="GK_POSE_%03d"%k
print("candidates",len(items),"byte-identical duplicates",len(dups),"unique poses",len(final))
# ---- sheets
def load(it):
    im=Image.open(it["path"]).convert("RGBA"); a=np.array(im); ys,xs=np.where(a[:,:,3]>8)
    if len(xs)==0: return im
    return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
Z=2; sprites=[(it,load(it)) for it in final]
cw=max(s.width for _,s in sprites)*Z+16; ch=max(s.height for _,s in sprites)*Z+16; TXT=62; CELL_H=ch+TXT
try: font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf",11); fontb=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",12); fonth=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",18)
except Exception: font=fontb=fonth=ImageFont.load_default()
COLS=8; per=(len(sprites)+1)//2; parts=[sprites[:per],sprites[per:]]
def trunc(s,w,dr):
    while dr.textlength(s,font=font)>w and len(s)>4: s=s[:-2]
    return s
for n,part in enumerate(parts,1):
    rows=(len(part)+COLS-1)//COLS; W=COLS*(cw+6)+6; H=44+rows*(CELL_H+6)
    sheet=Image.new("RGB",(W,H),(24,26,30)); dr=ImageDraw.Draw(sheet)
    dr.text((8,8),f"GK ALL DIVES / SAVE POSES — inventory sheet {n}/2  ({len(part)} of {len(sprites)} unique PixelLab poses; ×{Z} nearest; sprites cropped to their full opaque bounds — nothing clipped)",fill=(255,255,255),font=fonth)
    for i,(it,sp) in enumerate(part):
        x=6+(i%COLS)*(cw+6); y=44+(i//COLS)*(CELL_H+6)
        cell=Image.new("RGBA",(cw,ch),(44,48,54,255)); big=sp.resize((sp.width*Z,sp.height*Z),Image.NEAREST); cell.alpha_composite(big,((cw-big.width)//2,(ch-big.height)//2)); sheet.paste(cell.convert("RGB"),(x,y))
        dr.rectangle([x,y+ch,x+cw,y+ch+TXT],fill=(34,36,42))
        dr.text((x+4,y+ch+2),it["id"],fill=(255,210,74),font=fontb)
        dr.text((x+4,y+ch+16),trunc(os.path.basename(it["path"]) if not it.get("raw") else os.path.basename(it["raw"]),cw-8,dr),fill=(220,220,220),font=font)
        dr.text((x+4,y+ch+29),trunc(it["pas"].split(" (")[0],cw-8,dr),fill=(170,200,255),font=font)
        dr.text((x+4,y+ch+41),trunc(it["model"],cw-8,dr),fill=(170,255,200),font=font)
        dr.text((x+4,y+ch+52),trunc(it["label"],cw-8,dr),fill=(200,200,200),font=font)
    out=os.path.join(OUT,f"GK_ALL_DIVES_SHEET_{n}.png"); sheet.save(out); print("wrote",out,sheet.size)
# ---- index
with open(os.path.join(OUT,"GK_POSE_INDEX.md"),"w") as f:
    f.write("# GK pose inventory — index\n\nEvery unique (byte-level) PixelLab goalkeeper save/dive pose found. IDs are neutral and permanent for this review; nothing was moved or renamed.\n\n")
    f.write(f"Unique poses: **{len(final)}** (from {len(items)} candidate files; {len(dups)} byte-identical duplicates merged; raw pitch plates whose extracted sprite is shown are listed under the sprite).\n\n")
    f.write("| ID | shown file | original source path | pass | PixelLab model | original label | sha256 (12) | duplicates / raw source |\n|---|---|---|---|---|---|---|---|\n")
    for it in final:
        extra=[]
        if it.get("raw"): extra.append("raw plate: `"+rel(it["raw"])+"`")
        if it.get("copied"): extra.append("scratchpad copy kept at: `"+rel(it["copied"])+"`")
        for d in it["dupes"]: extra.append("identical: `"+rel(d)+"`")
        f.write(f"| {it['id']} | `{os.path.basename(it['path'])}` | `{rel(it['path'])}` | {it['pas']} | {it['model']} | {it['label']} | {it['sha'][:12]} | {'; '.join(extra)} |\n")
    f.write("\n## Not included (not save/dive poses)\n- SET / idle rotations (identity), shuffle clips, recover (getting-up) clips, frame 0 of every V1 clip (the SET reference frame PixelLab keeps as frame 0).\n")
json.dump([{k:(rel(v) if isinstance(v,str) and v.startswith("/") else v) for k,v in it.items()} for it in final],open(os.path.join(OUT,"inventory.json"),"w"),indent=1)
print("index written")
