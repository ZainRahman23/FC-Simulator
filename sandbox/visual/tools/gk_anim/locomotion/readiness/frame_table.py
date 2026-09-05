#!/usr/bin/env python3
"""Per-frame W/SW/NW comparison table from a wsn_capture2 trace. python3 frame_table.py <cap_dir> <out.csv> <out.md>"""
import json, os, sys, csv
cap=sys.argv[1]; tr=json.load(open(os.path.join(cap,"trace.json"))); DIRS=["west","south-west","north-west"]
man=json.load(open("/Users/zainrahman/Downloads/FC Simulator/assets/visual_v1/goalkeeper/GK_ANIM_V1.json"))
variants={v["dir"]:v for v in man["clips"]["shuffle"]["variants"]}
def manifest_entry(c):
    if not c: return "states.%s (rotation still)"%("base" if False else "set/base")
    v=variants.get(c["vdir"]); return f"clips.shuffle variant dir={v['dir']} side={v['side']} ground={v['ground']} anchor={v['anchor']} stride_m={v['stride_m']} use={v['use']}" if v else "?"
cols=["t","facing_bin","sim_facing_deg","anim_state","anim_phase","resolved_clip","manifest_entry","source_asset_frame","cycle_pos_(odometer/stride*n)","odometer_m","bob_dy_px","root_x","root_y","screen_root_x","screen_root_y","sprite_anchor_ax_ay","blit_dx_dy","sprite_scale","sim_state","sim_v","ball_dist_m","art_label"]
with open(sys.argv[2],"w",newline="") as fo:
    w=csv.writer(fo); w.writerow(["dir"]+cols)
    for d in DIRS:
        for r in tr[d]:
            c=r["clip"]; bl=r["blit"] or {}
            w.writerow([d,r["t"],r["dir"],r["facing"],r["state"],r["phase"],(f"{c['name']}/{c['vdir']}{'(mirrored)' if c['mirrored'] else ''} side-approx={c['sideApprox']}" if c else ("states.base/"+r["dir"] if r["state"]=="IDLE" else "states.set/"+r["dir"])),
                        (manifest_entry(c) if c else ("states.base" if r["state"]=="IDLE" else "states.set")),(f"anim/shuffle_right/{c['vdir']}/{c['srcFrame']}.png" if c else (("idle/" if r["state"]=="IDLE" else "set/")+r["dir"]+".png")),
                        r["cyc"] if r["cyc"] is not None else "-", r["odo"], r["bob"], r["root"][0], r["root"][1], r["sp"][0], r["sp"][1], f"({bl.get('ax')}, {bl.get('ay')})", f"({bl.get('dx')}, {bl.get('dy')})", bl.get("s"), r["simState"], r["v"], r["ballD"], r["art"]])
# markdown excerpt at fixed sim times
times=[2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0,9.5,10.0,10.5]
def at(rows,t): return min(rows,key=lambda r:abs(r["t"]-t))
L=["| t (s) | facing | anim state · phase | drawn art (clip/variant/source frame · pos) | odometer m · cycle pos | bob dy | sim state · \\|v\\| | root (x, y) · screen root | sprite anchor (ax, ay) · blit (dx, dy) |","|---|---|---|---|---|---|---|---|---|"]
for t in times:
    for d in DIRS:
        r=at(tr[d],t); c=r["clip"]; bl=r["blit"] or {}
        art=(f"shuffle/{c['vdir']}{' mirrored' if c['mirrored'] else ''} · {c['vdir']}/{c['srcFrame']}.png · pos {c['pos']+1}/{c['n']}{' SIDE-APPROX' if c['sideApprox'] else ''}") if c else (("base/" if r["state"]=="IDLE" else "set/")+r["dir"]+".png (rotation still)")
        L.append(f"| {r['t']:.2f} | {d} | {r['state']} · {r['phase']} | {art} | {r['odo']:.3f} · {r['cyc'] if r['cyc'] is not None else '-'} | {r['bob']} | {r['simState']} · {r['v']:.3f} | ({r['root'][0]:.3f}, {r['root'][1]:.3f}) · ({r['sp'][0]:.1f}, {r['sp'][1]:.1f}) | ({bl.get('ax')}, {bl.get('ay')}) · ({bl.get('dx')}, {bl.get('dy')}) |")
open(sys.argv[3],"w").write("\n".join(L)+"\n"); print("wrote",sys.argv[2],sys.argv[3])
