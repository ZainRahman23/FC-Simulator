#!/bin/bash
# HAC-1 review renders (presentation only: reads the battery's records; nothing is re-simulated). Output → hac1/review/video, stills (Git);
# REFERENCE3 composites → hac1/review/local_reference/ (gitignored).
#   A  NO CONTACT     ORIGINAL RUN-1 | HAC-1 | HAC-1 diagnostic; side; 1× and 0.25×
#   B  SHOULDER       TWIN (A alone) | BRUSH | BUMP | STRONG — fixture SH2 (bump and separate) and the HYBRID-RUN-1 fixture SH (pressed);
#                     behind and in front, 1× and 0.25×; diagnostic 1× and 0.25×; the other side (OPP) 1×
#   C  SLIDE TACKLE   TWIN | PVP-F2 | PVP-F3 at the canonical support phase: close (az 60), side (az 90), rear 3/4 (az 145) at 1× and 0.25×;
#                     diagnostic 1× / 0.25×; EARLY (foot freshly loaded) and UNLOAD (unloading) rear 3/4 1× and 0.25× and diagnostic 1×;
#                     stills grids; REFERENCE3 | TWIN | F2 | F3 (local only)
# usage (worktree root): hac_render.sh <scratch S> <runs dir> <out review dir>
S=$1; RUNS=$2; OUT=$3; Q=$S/hac/render; rm -rf $Q; mkdir -p $Q/clips $Q/vid $OUT/video $OUT/stills $OUT/local_reference
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2/hac1/render
clip() { node $R/hac_clip.mjs "$@" > $Q/clip_$4.log 2>&1 || { tail -3 $Q/clip_$4.log; exit 1; }; }
fcOf() { node -e 'const z=require("zlib"),f=require("fs");const o=JSON.parse(z.gunzipSync(f.readFileSync(process.argv[1])));for(const r of o.recs)if(r.contacts.some(c=>c.kind==="cross"&&c.Jn>0)){console.log(Math.round(r.t*240));break;}' $1; }
# A
clip --run $RUNS/NC.json.gz --key NC_O --out $Q/clips --mode original --refStep 0 --from 0.004 --to 3.0
clip --run $RUNS/NC.json.gz --key NC_H --out $Q/clips --refStep 0 --from 0.004 --to 3.0
# B (each shoulder clip aligned on its own first contact, −0.4 → +2.0 s; the TWIN on the BUMP's clock)
for F in SH2 SH; do for s in BRUSH BUMP STRONG; do clip --run $RUNS/${F}_$s.json.gz --key ${F}_$s --out $Q/clips --who both --from -0.4 --to 2.0; done
  clip --run $RUNS/NC.json.gz --key ${F}_TWIN --out $Q/clips --refStep $(fcOf $RUNS/${F}_BUMP.json.gz) --from -0.4 --to 2.0; done
for s in BRUSH BUMP STRONG; do clip --run $RUNS/SH2_${s}_OPP.json.gz --key SH2_${s}_OPP --out $Q/clips --who both --from -0.4 --to 2.0; done
# C (each tackle aligned on its own first contact, −0.3 → +1.3 s; each TWIN on its F2's clock and camera path)
for P in "" _EARLY _UNLOAD; do N=$(fcOf $RUNS/PVP_F2$P.json.gz)
  for k in F2 F3; do clip --run $RUNS/PVP_$k$P.json.gz --key PVP_$k$P --out $Q/clips --who both --frame tackler --from -0.3 --to 1.3; done
  clip --run $RUNS/PVP_TWIN$P.json.gz --key PVP_TWIN$P --out $Q/clips --who both --frame tackler --focus $RUNS/PVP_F2$P.json.gz --refStep $N --from -0.3 --to 1.3; done
python3 - "$Q" <<'PY'
import json, sys
Q = sys.argv[1]; V = []
def P(k, az, el, d, l, **x): return { "k": k, "az": az, "el": el, "d": d, "fov": 34, "l": l, **x }
def vid(id, every, rate, W, H, panels, tl=""): V.append({ "id": id, "every": every, "rate": rate, "W": W, "H": H, "fromN": -100000, "to": 100000, "panels": panels, "tlabel": tl })
SP = [(4, "1×", "1x"), (1, "0.25×", "025x")]
for every, rate, tag in SP:
    vid(f"A_SIDE_{tag}", every, rate, 520, 460, [P("NC_O", 90, 8, 4.2, "ORIGINAL RUN-1"), P("NC_H", 90, 8, 4.2, "HAC-1"), P("NC_H", 90, 8, 4.2, "HAC-1 · diagnostic", hyb=True, ghost="abs")], tl="from the start of the run")
for F, fl in [("SH2", "bump and separate"), ("SH", "HYBRID-RUN-1 fixture: B stays pressed")]:
    for ang, az, el in [("BEHIND", 165, 14), ("FRONT", 15, 10)]:
        for every, rate, tag in SP:
            vid(f"B_{F}_{ang}_{tag}", every, rate, 420, 400, [P(f"{F}_TWIN", az, el, 4.6, "TWIN (A alone)")] + [P(f"{F}_{s}", az, el, 4.6, f"{s} ({fl})" if s == "BRUSH" else s) for s in ["BRUSH", "BUMP", "STRONG"]], tl="from first player contact")
    for every, rate, tag in SP:
        vid(f"B_{F}_DIAG_{tag}", every, rate, 420, 400, [P(f"{F}_TWIN", 160, 18, 4.6, "TWIN · diagnostic", hyb=True, ghost="joint")] + [P(f"{F}_{s}", 160, 18, 4.6, f"{s} · diagnostic", hyb=True, ghost="joint") for s in ["BRUSH", "BUMP", "STRONG"]], tl="from first player contact")
for every, rate, tag in SP[:1]:
    vid(f"B_SH2_OPP_BEHIND_{tag}", every, rate, 420, 400, [P(f"SH2_{s}_OPP", 195, 14, 4.6, f"{s}, other side") for s in ["BRUSH", "BUMP", "STRONG"]], tl="from first player contact")
for P_, pl in [("", "canonical phase"), ("_EARLY", "foot freshly loaded"), ("_UNLOAD", "foot unloading")]:
    views = [("CLOSE", 60, 12, 4.0, {}), ("SIDE", 90, 9, 4.0, {}), ("REAR34", 145, 12, 4.2, {}), ("DIAG", 60, 18, 4.2, { "hyb": True, "ghost": "joint" })] if P_ == "" else [("REAR34", 145, 12, 4.2, {}), ("DIAG", 60, 18, 4.2, { "hyb": True, "ghost": "joint" })]
    for name, az, el, d, ex in views:
        for every, rate, tag in (SP if not (P_ and name == "DIAG") else SP[:1]):
            vid(f"C{P_}_{name}_{tag}", every, rate, 440, 420, [P(f"PVP_TWIN{P_}", az, el, d, f"TWIN · no tackle ({pl})", **ex), P(f"PVP_F2{P_}", az, el, d, f"PVP-F2 (SP2F2) · {pl}", **ex), P(f"PVP_F3{P_}", az, el, d, f"PVP-F3 (SP2F3) · {pl}", **ex)], tl="from first player contact")
json.dump(V, open(Q + "/views.json", "w"), indent=1)
PY
node $R/hac_capture.cjs --clips $Q/clips --views $Q/views.json --archive $S/lv2arch --out $Q/vid > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
cp $Q/vid/*.mp4 $OUT/video/; cp $Q/vid/CAPTURE.json $OUT/video/CAPTURE.json; cp $Q/clips/meta.json $OUT/video/CLIPS_META.json
# stills: the canonical tackle at −100 … +1000 ms (0.25× video: one step per frame; frame = step − (first contact − 72)); the SH2 shoulder set
python3 - "$OUT/stills" "$S/ffmpeg" <<'PY'
import sys, os, subprocess
dst, ff = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
def grid(src, ms, pre, out, cols):
    idx = [pre + round(m * 0.24) for m in ms]; sel = "+".join(f"eq(n\\,{i})" for i in idx)
    subprocess.run([ff, "-loglevel", "error", "-y", "-i", src, "-vf", f"select='{sel}',scale=900:-1,tile={cols}x{(len(ms) + cols - 1) // cols}", "-frames:v", "1", "-q:v", "3", out], check=True)
for name in ["CLOSE", "SIDE", "REAR34", "DIAG"]: grid(f"{dst}/../video/C_{name}_025x.mp4", [-100, 0, 50, 100, 200, 300, 500, 700, 1000, 1250], 72, f"{dst}/GRID_C_{name}.jpg", 2)
for P_ in ["_EARLY", "_UNLOAD"]: grid(f"{dst}/../video/C{P_}_REAR34_025x.mp4", [-100, 0, 50, 100, 200, 300, 500, 700, 1000, 1250], 72, f"{dst}/GRID_C{P_}_REAR34.jpg", 2)
for F in ["SH2", "SH"]: grid(f"{dst}/../video/B_{F}_BEHIND_025x.mp4", [0, 200, 400, 600, 800, 1000, 1300, 1600, 2000], 96, f"{dst}/GRID_B_{F}_BEHIND.jpg", 1)
print("grids written")
PY
# REFERENCE3 | TWIN | F2 | F3 (LOCAL ONLY): REFERENCE3 mirrored, aligned on its first boot-to-foot contact (≈ 0.72 s ± 0.05 s), rear 3/4
REF="/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-10-14_evidence_outside_git/slide_phys2/reference/REFERENCE3_2026-10-14_21.06.38.mov"; REF_FC=0.72
if [ -f "$REF" ]; then for v in REAR34_1x REAR34_025x CLOSE_1x; do sl=$([ ${v##*_} = 025x ] && echo 4 || echo 1)
  $S/ffmpeg -loglevel error -y -ss $(python3 -c "print($REF_FC-0.3)") -t 1.6 -i "$REF" -i $Q/vid/C_$v.mp4 -filter_complex "[0:v]crop=640:533:20:250,hflip,scale=504:420,setpts=$sl*(PTS-STARTPTS),fps=60,pad=504:454:0:0:color=0x121a16[r];[r][1:v]hstack=2[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 20 -shortest $OUT/local_reference/REF_TWIN_F2_F3_$v.mp4 || exit 1; done; fi
cp review_artifacts/physical_character_v2/hybrid_run1/review/.gitignore $OUT/.gitignore 2>/dev/null
ls $OUT/video | wc -l; ls $OUT/local_reference
