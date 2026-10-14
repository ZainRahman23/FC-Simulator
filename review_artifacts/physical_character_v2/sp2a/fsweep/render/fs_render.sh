#!/bin/bash
# SP2A body-friction sweep renders (presentation only; records are read, nothing is re-simulated). Our own renders → fsweep/review/video/ (in Git).
# Per condition (F100 F75 F50 F25 F10 F0) and per view, one single-panel video with IDENTICAL timing (the review page switches conditions at the
# same time position); grids (all six, synchronised) are composed from them. Views (sim time from the plant touchdown):
#   CLEAN_1x   close side camera following the body, no overlays          0.25 → 2.75 s, 1×
#   CLEAN_025x close side, no overlays                                     0.35 → 1.50 s, 0.25×
#   DIAG_025x  close rear 3/4 + diagnostic overlays (COM trail, 0.5 m ruler, v_h, slide distance, contact normal / friction forces, studs)
#   GAME_1x    FIXED touchline gameplay camera, crop ×4.5 centred 3 m past ground entry (same framing for all six: slide distance comparable), no overlays   0.25 → 3.00 s
#   DIST_1x    the same fixed camera + diagnostic overlays
# usage (worktree root): fs_render.sh <scratch S> <records dir> <out video dir>
S=$1; REC=$2; OUT=$3; Q=$S/fsw; mkdir -p $Q/clips $Q/vid $OUT; F=/System/Library/Fonts/Helvetica.ttc
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2; IDS="F100 F75 F50 F25 F10 F0"
for id in $IDS; do node $R/slide_phys1/render/sp_clip.mjs --run $REC/$id.json.gz --key $id --out $Q/clips --steps 0-800 --fsweep 1 --hud 1 > /dev/null || exit 1; done
CAM='"camFix": [49.03, 34.26], "heading": 0'
V=$Q/views.json; { echo "["; first=1; for id in $IDS; do m=$(node -e "console.log(({F100:'1.00',F75:'0.75',F50:'0.50',F25:'0.25',F10:'0.10',F0:'0.00'})['$id'])");
  for v in "CLEAN_1x 4 60 660 close side false" "CLEAN_025x 1 84 360 close side false" "DIAG_025x 1 84 360 close rear34 true" "GAME_1x 4 60 720 game - false" "DIST_1x 4 60 720 game - true"; do set -- $v
    [ $first = 1 ] || echo ","; first=0
    if [ $5 = game ]; then P="\"view\": \"game\", \"zoom\": 4.5, $CAM"; else P="\"view\": \"close\", \"angle\": \"$6\", \"crop\": [60, 100, 360, 300]"; fi
    echo "{ \"id\": \"${1}_$id\", \"every\": $2, \"W\": 480, \"H\": 400, \"rate\": \"\", \"fromN\": $3, \"to\": $4, \"tlabel\": \"from the plant touchdown\", \"panels\": [ { \"k\": \"$id\", $P, \"contacts\": $7, \"diag\": $7, \"l\": \"$id · non-stud body friction ×$m\" } ] }"; done; done; echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*_F*.mp4; do cp "$f" $OUT/; done
# grids: 3 × 2, all six synchronised
for v in CLEAN_1x CLEAN_025x DIAG_025x GAME_1x DIST_1x; do
  $S/ffmpeg -loglevel error -y $(for id in $IDS; do echo -n "-i $OUT/${v}_$id.mp4 "; done) -filter_complex "[0][1][2]hstack=3[a];[3][4][5]hstack=3[b];[a][b]vstack=2" -c:v libx264 -pix_fmt yuv420p -crf 23 $OUT/GRID_$v.mp4 || exit 1; done
ls -la $OUT | head -40
