#!/usr/bin/env python3
"""Assemble the SW/NW readiness/shuffle cycles: copy the original 9 frames into anim/shuffle_right_crouch/<dir>/, substitute the accepted
crouch frames, point the SW/NW CLIP_TABLE rows at the new folders, rebuild the manifest (anchors re-measured), and verify that every
pre-existing variant/anchor file is byte-identical. python3 integrate.py <spec.json>   spec = {"south-west": {"4": "plates/sw4_deep.png", ...}, "north-west": {...}}"""
import json, os, shutil, subprocess, sys, hashlib
REPO="/Users/zainrahman/Downloads/FC Simulator"; ASSETS=f"{REPO}/assets/visual_v1"; ANIM=f"{ASSETS}/originals/character_f4838361/anim"; ANCH=f"{ASSETS}/goalkeeper/anchors/clips"
spec=json.load(open(sys.argv[1]))
def md5(p): return hashlib.md5(open(p,"rb").read()).hexdigest()
before={f:md5(os.path.join(ANCH,f)) for f in os.listdir(ANCH) if f.endswith(".json")}
man_before=json.load(open(f"{ASSETS}/goalkeeper/GK_ANIM_V1.json"))
bp=f"{REPO}/sandbox/visual/tools/gk_anim/gk_build_manifest.py"; s=open(bp).read()
for d,cfg in spec.items():
    subs=cfg.get("substitute",{}); use=cfg.get("use")
    if subs:
        src=f"{ANIM}/shuffle_right/{d}"; dst=f"{ANIM}/shuffle_right_crouch/{d}"; os.makedirs(dst,exist_ok=True)
        for i in range(9): shutil.copyfile(f"{src}/{i}.png", f"{dst}/{i}.png")
        for i,p in subs.items(): shutil.copyfile(p, f"{dst}/{i}.png"); print("substituted",d,i,"<-",p)
        old=f'V("{d}", "shuffle_right/{d}", [1, 2, 3, 4, 5, 6, 7, 8],'; new=f'V("{d}", "shuffle_right_crouch/{d}", [1, 2, 3, 4, 5, 6, 7, 8],'
        assert s.count(old)==1, (d, s.count(old)); s=s.replace(old,new)
    if use:
        old=f'V("{d}", "shuffle_right/{d}", [1, 2, 3, 4, 5, 6, 7, 8],'; new=f'V("{d}", "shuffle_right/{d}", {use},'
        assert s.count(old)==1, (d, s.count(old)); s=s.replace(old,new); print("re-sequenced",d,"use =",use)
NOTE_OLD='note="2026-09-05: same PixelLab group ba999c22 (v3, non-Pro), appended directions; SW/NW facing presentation only; ground=bottom keeps the feet on the root row (PixelLab varied the foot row by up to 10 px across this cycle)"'
assert s.count(NOTE_OLD)==2
i1=s.index(NOTE_OLD); s=s[:i1]+'note="2026-09-05 readiness calibration vs WEST: PixelLab group ba999c22 (v3) shuffle frames; frames 4-6 re-authored as a deep ready crouch and 7 as a slight one with edit_image_pixen (non-Pro, seed 7) so the cycle carries WEST\'s crouch/rise amplitude in this perspective (shuffle_right_crouch/); ground=bottom keeps the feet on the root row"'+s[i1+len(NOTE_OLD):]
i2=s.index(NOTE_OLD); s=s[:i2]+'note="2026-09-05 readiness calibration vs WEST: PixelLab group ba999c22 (v3) frames unchanged, re-sequenced 1,2,3,6,7,8,7,6 so the clip\'s own crouched frames 7-8 form the crouch phase (body 101→92→101 px, WEST 100→90→97); ground=bottom keeps the feet on the root row"'+s[i2+len(NOTE_OLD):]
open(bp,"w").write(s)
subprocess.run([sys.executable,bp],check=True)
after={f:md5(os.path.join(ANCH,f)) for f in os.listdir(ANCH) if f.endswith(".json")}
changed=[f for f in before if f in after and before[f]!=after[f]]; added=[f for f in after if f not in before]
print("anchor files changed:",changed,"added:",added)
man_after=json.load(open(f"{ASSETS}/goalkeeper/GK_ANIM_V1.json"))
for name,c in man_before["clips"].items():
    for v in c["variants"]:
        v2=[x for x in man_after["clips"][name]["variants"] if x["dir"]==v["dir"] and x.get("side")==v.get("side")][0]
        if v["dir"] in spec and name=="shuffle": continue
        assert v==v2, ("variant changed", name, v["dir"])
print("all pre-existing variants identical; states:", man_before["states"]==man_after["states"])
