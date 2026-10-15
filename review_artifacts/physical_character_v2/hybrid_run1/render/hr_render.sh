#!/bin/bash
# HYBRID-RUN-1 review renders (presentation only: the records are read, nothing is re-simulated). Output → hybrid_run1/review/ (video + stills in
# Git); the REFERENCE3 composite → hybrid_run1/review/local_reference/ (gitignored).
#   A  NO CONTACT     ORIGINAL RUN-1 | HYBRID RUN-1 | HYBRID diagnostic (authority-coloured skeleton, RUN-1's own pose dashed, velocity arrows,
#                     region bars), side (az 90) and front 3/4 (az 35), 1× and 0.25×, 0 → 2.9 s
#   B  SHOULDER       BRUSH | BUMP | STRONG (one panel per severity, each following its own pair): behind (az 165) and in front (az 15),
#                     the contact side), 1× and 0.25×, and the diagnostic (RUN-1 joint targets dashed on the physical pelvis, authority
#                     colours on both runners, A's bars); first contact −0.5 → +2.0 s
#   B' BRUSH, LATE    the BRUSH pair from the extended record (hr_extend.mjs: run on to the end of RUN-1's data), +0.8 → +2.35 s after the
#                     first contact: A's late stumble and fall (behind | in front | diagnostic), 1× and 0.25×
#   C  SLIDE TACKLE   the PVP-1 collision views on the hybrid recipient (camera azimuths relative to the tackler's travel, as PVP-1):
#                     PVP-F2 | PVP-F3 + the hybrid TWIN inset: CLOSE (az 60) 1× / 0.25× / 0.10×, SIDE (az 90), REAR34 (az 145, the
#                     REFERENCE3 camera), DIAG; first contact −0.3 → +1.2 s; stills at −100 … +1000 ms; REFERENCE3 | PVP-F2 | PVP-F3 (local)
# usage (worktree root): hr_render.sh <scratch S> <runs dir> <out review dir> <extended runs dir (hr_extend.mjs)>
S=$1; RUNS=$2; OUT=$3; EXT=$4; Q=$S/hr/render; rm -rf $Q; mkdir -p $Q/clips $Q/vid $OUT/video $OUT/stills $OUT/local_reference
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2/hybrid_run1/render
clip() { node $R/hr_clip.mjs "$@" > $Q/clip_$4.log 2>&1 || { tail -3 $Q/clip_$4.log; exit 1; }; }
# A
clip --run $RUNS/NC.json.gz --key NC_O --out $Q/clips --mode original --refStep 0 --from 0.004 --to 2.9
clip --run $RUNS/NC.json.gz --key NC_H --out $Q/clips --refStep 0 --from 0.004 --to 2.9
# B
for s in BRUSH BUMP STRONG; do clip --run $RUNS/SH_$s.json.gz --key SH_$s --out $Q/clips --who both --from -0.5 --to 2.0; done
clip --run $EXT/SH_BRUSH.json.gz --key SH_BRUSH_EXT --out $Q/clips --who both --from 0.8 --to 2.35
# C (each tackler run aligned on its own first contact; the TWIN on PVP-F2's, through its camera path)
F2N=$(node -e 'const z=require("zlib"),f=require("fs");const o=JSON.parse(z.gunzipSync(f.readFileSync(process.argv[1])));for(const r of o.recs)if(r.contacts.some(c=>c.kind==="cross"&&c.Jn>0)){console.log(Math.round(r.t*240));break;}' $RUNS/PVP_F2.json.gz)
for k in F2 F3; do clip --run $RUNS/PVP_$k.json.gz --key PVP_$k --out $Q/clips --who both --frame tackler --from -0.3 --to 1.2; done
clip --run $RUNS/PVP_TWIN.json.gz --key PVP_TWIN --out $Q/clips --who both --frame tackler --focus $RUNS/PVP_F2.json.gz --refStep $F2N --from -0.3 --to 1.2
python3 - "$Q" <<'PY'
import json, sys
Q = sys.argv[1]; V = []
def P(k, az, el, d, l, **x): return { "k": k, "az": az, "el": el, "d": d, "fov": 34, "l": l, **x }
def vid(id, every, rate, W, H, panels, fromN=-100000, stills=None, tl=""): V.append({ "id": id, "every": every, "rate": rate, "W": W, "H": H, "fromN": fromN, "to": 100000, "panels": panels, **({ "stillsN": stills } if stills else {}), "tlabel": tl })
for ang, az, el in [("SIDE", 90, 8), ("FRONT34", 35, 12)]:
    for every, rate in [(4, "1×"), (1, "0.25×")]:
        vid(f"A_{ang}_{rate.replace('×','x').replace('.','')}", every, rate, 560, 480, [P("NC_O", az, el, 4.2, "ORIGINAL RUN-1"), P("NC_H", az, el, 4.2, "HYBRID RUN-1"), P("NC_H", az, el, 4.2, "HYBRID · diagnostic", mesh=False, hyb=True, ghost="abs")], fromN=1, tl="from the start of the run")
for ang, az, el in [("BEHIND", 165, 14), ("FRONT", 15, 10)]:
    for every, rate in [(4, "1×"), (1, "0.25×")]:
        vid(f"B_{ang}_{rate.replace('×','x').replace('.','')}", every, rate, 560, 480, [P(f"SH_{s}", az, el, 4.6, f"{s}  (A left, B right)") for s in ["BRUSH", "BUMP", "STRONG"]], tl="from first player contact")
for every, rate in [(4, "1×"), (1, "0.25×")]:
    vid(f"B_DIAG_{rate.replace('×','x').replace('.','')}", every, rate, 560, 480, [P(f"SH_{s}", 160, 18, 4.6, f"{s} · diagnostic", mesh=False, hyb=True, ghost="joint") for s in ["BRUSH", "BUMP", "STRONG"]], tl="from first player contact")
for every, rate in [(4, "1×"), (1, "0.25×")]:
    vid(f"B_BRUSH_LATE_{rate.replace('×','x').replace('.','')}", every, rate, 560, 480, [P("SH_BRUSH_EXT", 165, 14, 4.6, "BRUSH, late · behind"), P("SH_BRUSH_EXT", 15, 10, 4.6, "BRUSH, late · in front"), P("SH_BRUSH_EXT", 160, 18, 4.6, "BRUSH, late · diagnostic", mesh=False, hyb=True, ghost="joint")], tl="from first player contact")
ST = [96, 108, 120, 126, 132, 144, 168, 216, 288, 360]
for name, az, el, d, extra in [("CLOSE", 60, 12, 4.0, {}), ("SIDE", 90, 9, 4.0, {}), ("REAR34", 145, 12, 4.2, {}), ("DIAG", 60, 18, 4.2, { "mesh": False, "hyb": True, "ghost": "joint", "diag": True })]:
    speeds = [(4, "1×"), (1, "0.25×")] + ([(1, "0.10×")] if name in ("CLOSE", "DIAG") else [])
    for every, rate in speeds:
        tag = rate.replace('×', 'x').replace('.', '')
        vid(f"C_{name}_{tag}", every, rate, 640, 540, [P("PVP_F2", az, el, d, "PVP-F2 (SP2F2) · hybrid recipient", **extra), P("PVP_F3", az, el, d, "PVP-F3 (SP2F3) · hybrid recipient", **extra)], stills=None, tl="from first player contact")
        vid(f"C_{name}_{tag}_TWIN", every, rate, 320, 270, [P("PVP_TWIN", az, el, d, "TWIN · no tackle", **extra)], tl="from first player contact")
json.dump(V, open(Q + "/views.json", "w"), indent=1)
PY
node $R/hr_capture.cjs --clips $Q/clips --views $Q/views.json --archive $S/lv2arch --out $Q/vid > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/A_*.mp4 $Q/vid/B_*.mp4; do cp "$f" $OUT/video/; done
for f in $Q/vid/C_*_TWIN.mp4; do b=$(basename $f _TWIN.mp4); slow=1; [[ $b == *_010x ]] && slow=2.5
  $S/ffmpeg -loglevel error -y -i $Q/vid/$b.mp4 -i $f -filter_complex "[1:v]crop=320:270:0:0,pad=320:574:0:0:color=0x0b0f0d[t];[0:v][t]hstack=2,setpts=$slow*PTS,fps=60[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 18 $OUT/video/$b.mp4 || exit 1; done
cp $Q/vid/CAPTURE.json $OUT/video/CAPTURE.json; cp $Q/clips/meta.json $OUT/video/CLIPS_META.json
# C stills from the 0.25× videos (one recorded step per frame): −100, −50, 0, +25, +50, +100, +200, +400, +700, +1000 ms; frame index = step − (first contact − 72)
python3 - "$Q" "$OUT/stills" "$S/ffmpeg" <<'PY'
import sys, os, subprocess, json
Q, dst, ff = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(dst, exist_ok=True)
MS = [-100, -50, 0, 25, 50, 100, 200, 400, 700, 1000]
for name in ["CLOSE", "SIDE", "REAR34", "DIAG"]:
    src = f"{dst}/../video/C_{name}_025x.mp4"; idx = [72 + round(ms * 0.24) for ms in MS]
    sel = "+".join(f"eq(n\\,{i})" for i in idx)
    subprocess.run([ff, "-loglevel", "error", "-y", "-i", src, "-vf", f"select='{sel}',scale=800:-1,tile=2x5", "-frames:v", "1", "-q:v", "3", f"{dst}/GRID_C_{name}.jpg"], check=True)
print("stills grids written")
PY
# REFERENCE3 | PVP-F2 | PVP-F3 (LOCAL ONLY): REFERENCE3 mirrored, aligned on its first boot-to-foot contact (≈ 0.72 s ± 0.05 s), REAR34 view
REF="/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov"; REF_FC=0.72
for v in REAR34_1x REAR34_025x CLOSE_1x; do sl=$([ ${v##*_} = 025x ] && echo 4 || echo 1)
  $S/ffmpeg -loglevel error -y -ss $(python3 -c "print($REF_FC-0.3)") -t 1.5 -i "$REF" -i $Q/vid/C_$v.mp4 -filter_complex "[0:v]crop=640:533:20:250,hflip,scale=640:540,setpts=$sl*(PTS-STARTPTS),fps=60,pad=640:574:0:0:color=0x121a16[r];[r][1:v]hstack=2[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 20 -shortest $OUT/local_reference/REF_F2_F3_$v.mp4 || exit 1; done
ls $OUT/video | wc -l; ls $OUT/local_reference
