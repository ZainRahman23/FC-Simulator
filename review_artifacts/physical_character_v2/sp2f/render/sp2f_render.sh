#!/bin/bash
# SP2F review renders — SP2D | SP2E | SP2F (presentation only: records are read, nothing is re-simulated). Our renders → sp2f/review/video/ (in Git);
# REFERENCE composites by sp2f_compose_reference.sh (local, gitignored).
# Conditions (5.0 m/s run-in, TEMPORARY friction F37.5): D = SP2D, E = SP2E, F = SP2F; Fs / Ff = SP2F at 4.5 / 5.5 m/s.
# Window: sim 0.30 s (≈ 0.12 s before the first fold-side contact) → 2.20 s (≈ +1.8 s). Views:
#   CLEAN_1x        close side, no overlays, 1×
#   SIDE_025x / R34_025x / F34_025x   close side / rear 3/4 / front 3/4 with turf-contact markers, 0.25×
#   DIAG_025x       rear 3/4 colliders + skeleton + turf contact forces, 0.25×
#   FOCUS_SIDE_1x / FOCUS_R34_1x / FOCUS_SIDE_025x / FOCUS_R34_025x   ONLY torso + pelvis + posting arm (colliders + skeleton of pelvis, abdomen, thorax,
#                   head, upperArm_L, forearm_L; no character mesh, no legs) — side / rear 3/4, 1× / 0.25×
#   SPEEDS_1x       SP2F at 4.5 / 5.0 / 5.5 m/s, close side, 1×
# usage (worktree root): sp2f_render.sh <scratch S> <records dir (SP2D_/SP2E_/SP2F_run1g_*.json.gz)> <out video dir>
S=$1; REC=$2; OUT=$3; Q=$S/sp2f/fin; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2; UP=pelvis,abdomen,thorax,head,upperArm_L,forearm_L
clip() { node $R/slide_phys1/render/sp_clip.mjs --run "$1" --key $2 --out $Q/clips --steps 0-720 --prefix 1 --wire 1 --hud 1 --fsweep 1 $3 > $Q/clip_$2.log 2>&1 || { tail -3 $Q/clip_$2.log; exit 1; }; }
for k in D E F; do n=$([ $k = D ] && echo SP2D || ([ $k = E ] && echo SP2E || echo SP2F)); clip $REC/${n}_run1g_4.608.json.gz $k; clip $REC/${n}_run1g_4.608.json.gz ${k}u "--wireBodies $UP"; done
clip $REC/SP2F_run1g_4.147.json.gz Fs; clip $REC/SP2F_run1g_5.069.json.gz Ff
lab() { case $1 in D) echo "SP2D · F37.5";; E) echo "SP2E · F37.5";; F) echo "SP2F · F37.5";; Fs) echo "SP2F · 4.5 m/s";; Ff) echo "SP2F · 5.5 m/s";; esac; }
CR='"crop": [60, 100, 360, 300]'; IDS="D E F"
V=$Q/views.json; { echo "["; first=1; for id in $IDS; do L="$(lab $id)"
  for v in "CLEAN_1x|4|$id|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": false" "SIDE_025x|1|$id|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" \
           "R34_025x|1|$id|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": true" "F34_025x|1|$id|\"view\": \"close\", \"angle\": \"front34\", $CR, \"contacts\": true" \
           "DIAG_025x|1|$id|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"contacts\": true, \"diag\": true" \
           "FOCUS_SIDE_1x|4|${id}u|\"view\": \"close\", \"angle\": \"side\", \"wire\": true, \"mesh\": false, \"contacts\": true" "FOCUS_R34_1x|4|${id}u|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"contacts\": true" \
           "FOCUS_SIDE_025x|1|${id}u|\"view\": \"close\", \"angle\": \"side\", \"wire\": true, \"mesh\": false, \"contacts\": true" "FOCUS_R34_025x|1|${id}u|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"contacts\": true"; do
    IFS='|' read -r vid ev key pp <<< "$v"; [ $first = 1 ] || echo ","; first=0; rate=$([ $ev = 4 ] && echo "1×" || echo "0.25×"); ll="$L"; [[ $vid == FOCUS* ]] && ll="$L · torso + pelvis + posting arm only"
    echo "{ \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown (first fold contact ≈ 0.42 s)\", \"panels\": [ { \"k\": \"$key\", $pp, \"l\": \"$ll\" } ] }"; done; done
  echo ", { \"id\": \"SPEEDS_1x\", \"every\": 4, \"W\": 480, \"H\": 400, \"rate\": \"1×\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown\", \"panels\": ["
  echo "  { \"k\": \"Fs\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Fs)\" }, { \"k\": \"F\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"SP2F · 5.0 m/s\" }, { \"k\": \"Ff\", \"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true, \"l\": \"$(lab Ff)\" } ] }"
  echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json
for v in CLEAN_1x SIDE_025x R34_025x F34_025x DIAG_025x FOCUS_SIDE_1x FOCUS_R34_1x FOCUS_SIDE_025x FOCUS_R34_025x; do
  $S/ffmpeg -loglevel error -y -i $OUT/${v}_D.mp4 -i $OUT/${v}_E.mp4 -i $OUT/${v}_F.mp4 -filter_complex "[0][1][2]hstack=3" -c:v libx264 -pix_fmt yuv420p -crf 23 $OUT/ROW3_$v.mp4 || exit 1; done
ls -la $OUT | head -50
