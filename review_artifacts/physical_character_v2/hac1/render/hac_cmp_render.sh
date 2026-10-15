#!/bin/bash
# HAC1_LOG §11: V1 vs candidate V1.1 comparison renders (presentation only; reads two battery record folders).
# usage (worktree root): hac_cmp_render.sh <scratch S> <runs V1> <runs V1.1> <out dir>   (records: hac_battery_opts.mjs … <dir>)
S=$1; R1=$2; R2=$3; OUT=$4; Q=$S/hac/cmp; rm -rf $Q; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2/hac1/render
clip() { node $R/hac_clip.mjs "$@" > $Q/clip_$4.log 2>&1 || { tail -3 $Q/clip_$4.log; exit 1; }; }
for v in 1 2; do RR=$([ $v = 1 ] && echo $R1 || echo $R2)
  for s in STRONG STRONG_OPP; do clip --run $RR/PUSH_$s.json.gz --key V${v}_PUSH_$s --out $Q/clips --refStep 180 --from -0.4 --to 2.2; done
  for P in "" _EARLY; do for k in F2 F3; do clip --run $RR/PVP_$k$P.json.gz --key V${v}_PVP_$k$P --out $Q/clips --who both --frame tackler --from -0.3 --to 1.3; done; done; done
python3 - "$Q" <<'PY'
import json, sys
Q = sys.argv[1]; V = []
def P(k, az, el, d, l, **x): return { "k": k, "az": az, "el": el, "d": d, "fov": 34, "l": l, **x }
def vid(id, every, rate, W, H, panels, tl=""): V.append({ "id": id, "every": every, "rate": rate, "W": W, "H": H, "fromN": -100000, "to": 100000, "panels": panels, "tlabel": tl })
for every, rate, tag in [(4, "1×", "1x"), (1, "0.25×", "025x")]:
    vid(f"V2_PUSH_STRONG_SIDE_{tag}", every, rate, 420, 400, [P("V1_PUSH_STRONG", 90, 10, 4.4, "V1 · STRONG 100 N·s"), P("V2_PUSH_STRONG", 90, 10, 4.4, "V2 · STRONG 100 N·s"), P("V1_PUSH_STRONG_OPP", 90, 10, 4.4, "V1 · STRONG, from the left"), P("V2_PUSH_STRONG_OPP", 90, 10, 4.4, "V2 · STRONG, from the left")], tl="from the push")
    vid(f"V2_C_REAR34_{tag}", every, rate, 420, 400, [P("V1_PVP_F2", 145, 12, 4.2, "V1 · PVP-F2 (canonical)"), P("V2_PVP_F2", 145, 12, 4.2, "V2 · PVP-F2 (canonical)"), P("V1_PVP_F3", 145, 12, 4.2, "V1 · PVP-F3 (canonical)"), P("V2_PVP_F3", 145, 12, 4.2, "V2 · PVP-F3 (canonical)")], tl="from first contact")
    vid(f"V2_C_SIDE_{tag}", every, rate, 420, 400, [P("V1_PVP_F2", 90, 9, 4.0, "V1 · PVP-F2 (canonical)"), P("V2_PVP_F2", 90, 9, 4.0, "V2 · PVP-F2 (canonical)"), P("V1_PVP_F3", 90, 9, 4.0, "V1 · PVP-F3 (canonical)"), P("V2_PVP_F3", 90, 9, 4.0, "V2 · PVP-F3 (canonical)")], tl="from first contact")
vid("V2_C_EARLY_REAR34_1x", 4, "1×", 420, 400, [P("V1_PVP_F2_EARLY", 145, 12, 4.2, "V1 · F2, foot freshly loaded"), P("V2_PVP_F2_EARLY", 145, 12, 4.2, "V2 · F2, foot freshly loaded"), P("V1_PVP_F3_EARLY", 145, 12, 4.2, "V1 · F3, foot freshly loaded"), P("V2_PVP_F3_EARLY", 145, 12, 4.2, "V2 · F3, foot freshly loaded")], tl="from first contact")
json.dump(V, open(Q + "/views.json", "w"), indent=1)
PY
node $R/hac_capture.cjs --clips $Q/clips --views $Q/views.json --archive $S/lv2arch --out $Q/vid > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
cp $Q/vid/*.mp4 $OUT/; cp $Q/vid/CAPTURE.json $OUT/CAPTURE_V2.json; ls $OUT
