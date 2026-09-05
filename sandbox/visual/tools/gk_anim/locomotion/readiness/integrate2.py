#!/usr/bin/env python3
"""Posture pass: substitute frames inside the existing SW crouch folder, rebuild the manifest, verify everything else byte-identical.
python3 integrate2.py <spec.json>   spec = {"4": "plates2/sw4_post.png", ...}"""
import json, os, shutil, subprocess, sys, hashlib
REPO="/Users/zainrahman/Downloads/FC Simulator"; ASSETS=f"{REPO}/assets/visual_v1"; FOLDER=f"{ASSETS}/originals/character_f4838361/anim/shuffle_right_crouch/south-west"; ANCH=f"{ASSETS}/goalkeeper/anchors/clips"
spec=json.load(open(sys.argv[1])); md5=lambda p:hashlib.md5(open(p,"rb").read()).hexdigest()
before={f:md5(os.path.join(ANCH,f)) for f in os.listdir(ANCH) if f.endswith(".json")}; man_before=json.load(open(f"{ASSETS}/goalkeeper/GK_ANIM_V1.json"))
for i,p in spec.items(): shutil.copyfile(p, f"{FOLDER}/{i}.png"); print("substituted south-west",i,"<-",p)
subprocess.run([sys.executable, f"{REPO}/sandbox/visual/tools/gk_anim/gk_build_manifest.py"], check=True)
after={f:md5(os.path.join(ANCH,f)) for f in os.listdir(ANCH) if f.endswith(".json")}
changed=[f for f in before if before[f]!=after.get(f)]; print("anchor files changed:",changed)
assert changed==["shuffle_right_crouch_south-west.json"], changed
man_after=json.load(open(f"{ASSETS}/goalkeeper/GK_ANIM_V1.json"))
for name,c in man_before["clips"].items():
    for v in c["variants"]:
        v2=[x for x in man_after["clips"][name]["variants"] if x["dir"]==v["dir"] and x.get("side")==v.get("side")][0]; assert v==v2, (name,v["dir"])
print("all variants identical (frame paths/orders unchanged); states identical:", man_before["states"]==man_after["states"])
