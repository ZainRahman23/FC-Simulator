#!/bin/bash
# SP2D review renders — the critical test A | SP2C | SP2D (presentation only: records are read, nothing is re-simulated). Our renders → sp2d/review/video/
# (in Git); the REFERENCE composites are made locally by sp2d_compose_reference.sh (gitignored).
# Conditions (5.0 m/s run-in, TEMPORARY friction F37.5): A = SP2A, C = SP2C, D = SP2D; Ds / Df = SP2D at 4.5 / 5.5 m/s.
# Window: sim 0.30 s (≈ 0.11 s before the first fold-side turf contact) → 3.90 s (≈ 1.1 s after the slides stop: the final resting posture). Views:
#   SIDE_1x     close side, 1×                 SIDE_05x   close side, 0.5×
#   R34_05x     close rear 3/4 (the posting arm and the folded side toward the camera), 0.5×
#   F34_05x     close front 3/4 (chest orientation, the tackling-side arm), 0.5×
#   DIAG_05x    rear 3/4 colliders + skeleton (yellow) + intent ghost (magenta) + turf contact forces, 0.5×
#   GAME_1x     fixed touchline gameplay camera, crop ×4.5 (FSWEEP framing), 1×
#   SPEEDS_1x   SP2D at 4.5 / 5.0 / 5.5 m/s, close side, 1×
# usage (worktree root): sp2d_render.sh <scratch S> <records dir (A_/SP2C_/SP2D_run1g_*.json.gz)> <SP2D opts.json> <out video dir>
S=$1; REC=$2; DOPTS=$3; OUT=$4; Q=$S/sp2d/fin; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2; RI=$S/sp2a/run1g_
clip() { node $R/slide_phys1/render/sp_clip.mjs --run "$1" --key $2 --out $Q/clips --steps 0-1440 --prefix 1 --wire 1 --hud 1 --fsweep 1 ${3:+--intent2a "$(cat $3)" --runin "$4"} > $Q/clip_$2.log 2>&1 || { tail -3 $Q/clip_$2.log; exit 1; }; }
clip $REC/A_run1g_4.608.json.gz A $R/sp2a/evidence/SP2A_opts.json ${RI}4.608.json; clip $REC/SP2C_run1g_4.608.json.gz C $R/sp2c/evidence/SP2C_opts.json ${RI}4.608.json
clip $REC/SP2D_run1g_4.608.json.gz D; clip $REC/SP2D_run1g_4.147.json.gz Ds; clip $REC/SP2D_run1g_5.069.json.gz Df
lab() { case $1 in A) echo "A = SP2A · F37.5";; C) echo "SP2C · F37.5";; D) echo "SP2D · F37.5";; Ds) echo "SP2D · 4.5 m/s";; Df) echo "SP2D · 5.5 m/s";; esac; }
CAM='"camFix": [49.03, 34.26], "heading": 0'; CR='"crop": [60, 100, 360, 300]'; IDS="A C D"
V=$Q/views.json; { echo "["; first=1; for id in $IDS; do L="$(lab $id)"
  for v in "SIDE_1x|4|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" "SIDE_05x|2|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" \
           "R34_05x|2|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": true" "F34_05x|2|\"view\": \"close\", \"angle\": \"front34\", $CR, \"contacts\": true" \
           "DIAG_05x|2|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, $( [ $id = D ] && echo '"ghost": false,' ) \"contacts\": true, \"diag\": true" "GAME_1x|4|\"view\": \"game\", \"zoom\": 4.5, $CAM, \"contacts\": false"; do
    IFS='|' read -r vid ev pp <<< "$v"; [ $first = 1 ] || echo ","; first=0; rate=$([ $ev = 4 ] && echo "1×" || echo "0.5×")
    echo "{ \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": 72, \"to\": 936, \"tlabel\": \"from the plant touchdown\", \"panels\": [ { \"k\": \"$id\", $pp, \"l\": \"$L\" } ] }"; done; done
  echo ", { \"id\": \"SPEEDS_1x\", \"every\": 4, \"W\": 480, \"H\": 400, \"rate\": \"1×\", \"fromN\": 72, \"to\": 1008, \"tlabel\": \"from the plant touchdown\", \"panels\": ["
  echo "  { \"k\": \"Ds\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Ds)\" }, { \"k\": \"D\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"SP2D · 5.0 m/s\" }, { \"k\": \"Df\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Df)\" } ] }"
  echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json
# A | SP2C | SP2D rows
for v in SIDE_1x SIDE_05x R34_05x F34_05x DIAG_05x GAME_1x; do
  $S/ffmpeg -loglevel error -y -i $OUT/${v}_A.mp4 -i $OUT/${v}_C.mp4 -i $OUT/${v}_D.mp4 -filter_complex "[0][1][2]hstack=3" -c:v libx264 -pix_fmt yuv420p -crf 23 $OUT/ROW3_$v.mp4 || exit 1; done
ls -la $OUT | head -40
