#!/bin/bash
# SP2E review renders — A | SP2C | SP2D | SP2E (presentation only: records are read, nothing is re-simulated). Our renders → sp2e/review/video/ (in Git);
# REFERENCE composites by sp2e_compose_reference.sh (local, gitignored).
# Conditions (5.0 m/s run-in, TEMPORARY friction F37.5): A = SP2A, C = SP2C, D = SP2D, E = SP2E; Es / Ef = SP2E at 4.5 / 5.5 m/s.
# Window: sim 0.33 s (≈ 0.09 s before the first fold-side turf contact) → 2.10 s (≈ +1.7 s). Views:
#   CLEAN_1x   close side, no overlays, 1×           SIDE_025x  close side + contact markers, 0.25×
#   R34_025x   close rear 3/4 (the folded side and the posting arm toward the camera), 0.25×
#   F34_025x   close front 3/4 (chest orientation), 0.25×
#   DIAG_025x  rear 3/4 colliders + skeleton (yellow) + turf contact forces, 0.25×
#   SPEEDS_1x  SP2E at 4.5 / 5.0 / 5.5 m/s, close side, 1×
# usage (worktree root): sp2e_render.sh <scratch S> <records dir (A_/SP2C_/SP2D_/SP2E_run1g_*.json.gz)> <out video dir>
S=$1; REC=$2; OUT=$3; Q=$S/sp2e/fin; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2
clip() { node $R/slide_phys1/render/sp_clip.mjs --run "$1" --key $2 --out $Q/clips --steps 0-720 --prefix 1 --wire 1 --hud 1 --fsweep 1 > $Q/clip_$2.log 2>&1 || { tail -3 $Q/clip_$2.log; exit 1; }; }
clip $REC/A_run1g_4.608.json.gz A; clip $REC/SP2C_run1g_4.608.json.gz C; clip $REC/SP2D_run1g_4.608.json.gz D; clip $REC/SP2E_run1g_4.608.json.gz E; clip $REC/SP2E_run1g_4.147.json.gz Es; clip $REC/SP2E_run1g_5.069.json.gz Ef
lab() { case $1 in A) echo "A = SP2A · F37.5";; C) echo "SP2C · F37.5";; D) echo "SP2D · F37.5";; E) echo "SP2E · F37.5";; Es) echo "SP2E · 4.5 m/s";; Ef) echo "SP2E · 5.5 m/s";; esac; }
CR='"crop": [60, 100, 360, 300]'; IDS="A C D E"
V=$Q/views.json; { echo "["; first=1; for id in $IDS; do L="$(lab $id)"
  for v in "CLEAN_1x|4|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": false" "SIDE_025x|1|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" \
           "R34_025x|1|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": true" "F34_025x|1|\"view\": \"close\", \"angle\": \"front34\", $CR, \"contacts\": true" \
           "DIAG_025x|1|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"contacts\": true, \"diag\": true"; do
    IFS='|' read -r vid ev pp <<< "$v"; [ $first = 1 ] || echo ","; first=0; rate=$([ $ev = 4 ] && echo "1×" || echo "0.25×")
    echo "{ \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": 80, \"to\": 504, \"tlabel\": \"from the plant touchdown (first fold contact ≈ 0.42 s)\", \"panels\": [ { \"k\": \"$id\", $pp, \"l\": \"$L\" } ] }"; done; done
  echo ", { \"id\": \"SPEEDS_1x\", \"every\": 4, \"W\": 480, \"H\": 400, \"rate\": \"1×\", \"fromN\": 80, \"to\": 504, \"tlabel\": \"from the plant touchdown\", \"panels\": ["
  echo "  { \"k\": \"Es\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Es)\" }, { \"k\": \"E\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"SP2E · 5.0 m/s\" }, { \"k\": \"Ef\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Ef)\" } ] }"
  echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json
for v in CLEAN_1x SIDE_025x R34_025x F34_025x DIAG_025x; do
  $S/ffmpeg -loglevel error -y -i $OUT/${v}_A.mp4 -i $OUT/${v}_C.mp4 -i $OUT/${v}_D.mp4 -i $OUT/${v}_E.mp4 -filter_complex "[0]scale=384:320[a];[1]scale=384:320[b];[2]scale=384:320[c];[3]scale=384:320[d];[a][b][c][d]hstack=4" -c:v libx264 -pix_fmt yuv420p -crf 23 $OUT/ROW4_$v.mp4 || exit 1
  $S/ffmpeg -loglevel error -y -i $OUT/${v}_D.mp4 -i $OUT/${v}_E.mp4 -filter_complex "[0][1]hstack=2" -c:v libx264 -pix_fmt yuv420p -crf 22 $OUT/PAIR_DE_$v.mp4 || exit 1; done
ls -la $OUT | head -40
