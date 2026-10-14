#!/bin/bash
# SP2F3 review renders — the posting arm corrected from the hand outward (presentation only: records are read, nothing is re-simulated). Our renders →
# sp2f/v3/review/video/ (in Git); REFERENCE3 composites by sp2f3_compose_reference.sh (local, gitignored).
# Conditions (5.0 m/s run-in, TEMPORARY friction F37.5): F = SP2F (first pass), G = SP2F2 (addendum, current), H = SP2F3 (corrected arm); Hs / Hf = SP2F3 at 4.5 / 5.5.
# Window: sim 0.30 s (≈ 0.12 s before the first fold-side contact) → 2.20 s. TIGHT views: crop [110, 170, 280, 233] of the close camera at zoom 1.35 (≈ 1.3× of the
# earlier close views) so the torso, shoulder, elbow, forearm and hand stay readable throughout:
#   TIGHT_R34_1x / TIGHT_R34_025x     rear 3/4 (≈ the REFERENCE3 camera: behind the slider), no overlays
#   TIGHT_SIDE_1x / TIGHT_SIDE_025x   side, no overlays
#   FOCUS_R34_1x / FOCUS_R34_025x     ONLY torso + pelvis + posting arm (colliders + skeleton; no mesh, no legs, no tackling-side arm), rear 3/4, turf contacts
#   DIAG_025x                         rear 3/4 colliders + skeleton + turf contact forces
#   SPEEDS_TIGHT_R34_1x               SP2F3 at 4.5 / 5.0 / 5.5 m/s
# usage (worktree root): sp2f3_render.sh <scratch S> <records dir (SP2F_/SP2F2_/SP2F3_run1g_*.json.gz)> <out video dir>
S=$1; REC=$2; OUT=$3; Q=$S/arm/fin_render; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2; UP=pelvis,abdomen,thorax,head,upperArm_L,forearm_L
clip() { node $R/slide_phys1/render/sp_clip.mjs --run "$1" --key $2 --out $Q/clips --steps 0-720 --prefix 1 --wire 1 --hud 1 --fsweep 1 $3 > $Q/clip_$2.log 2>&1 || { tail -3 $Q/clip_$2.log; exit 1; }; }
for k in F G H; do n=$([ $k = F ] && echo SP2F || ([ $k = G ] && echo SP2F2 || echo SP2F3)); clip $REC/${n}_run1g_4.608.json.gz $k; done
for k in G H; do n=$([ $k = G ] && echo SP2F2 || echo SP2F3); clip $REC/${n}_run1g_4.608.json.gz ${k}u "--wireBodies $UP"; done
clip $REC/SP2F3_run1g_4.147.json.gz Hs; clip $REC/SP2F3_run1g_5.069.json.gz Hf
lab() { case $1 in F) echo "SP2F (first pass)";; G) echo "SP2F2 (current)";; H) echo "SP2F3 (corrected arm)";; Hs) echo "SP2F3 · 4.5 m/s";; Hf) echo "SP2F3 · 5.5 m/s";; esac; }
CR='"zoom": 1.35, "crop": [110, 170, 280, 233]'
V=$Q/views.json; { echo "["; first=1; for id in F G H; do L="$(lab $id)"
  for v in "TIGHT_R34_1x|4|$id|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": false" "TIGHT_R34_025x|1|$id|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": false" \
           "TIGHT_SIDE_1x|4|$id|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": false" "TIGHT_SIDE_025x|1|$id|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": false"; do
    IFS='|' read -r vid ev key pp <<< "$v"; [ $first = 1 ] || echo ","; first=0; rate=$([ $ev = 4 ] && echo "1×" || echo "0.25×")
    echo "{ \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown (first fold contact ≈ 0.42 s)\", \"panels\": [ { \"k\": \"$key\", $pp, \"l\": \"$L · 5.0 m/s\" } ] }"; done; done
  for id in G H; do L="$(lab $id)"; for v in "FOCUS_R34_1x|4" "FOCUS_R34_025x|1"; do IFS='|' read -r vid ev <<< "$v"; rate=$([ $ev = 4 ] && echo "1×" || echo "0.25×")
    echo ", { \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown\", \"panels\": [ { \"k\": \"${id}u\", \"view\": \"close\", \"angle\": \"rear34\", $CR, \"wire\": true, \"mesh\": false, \"contacts\": true, \"l\": \"$L · torso + pelvis + posting arm only\" } ] }"; done; done
  echo ", { \"id\": \"DIAG_025x_H\", \"every\": 1, \"W\": 480, \"H\": 400, \"rate\": \"0.25×\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown\", \"panels\": [ { \"k\": \"H\", \"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"contacts\": true, \"diag\": true, \"l\": \"SP2F3 · diagnostic\" } ] }"
  echo ", { \"id\": \"SPEEDS_TIGHT_R34_1x\", \"every\": 4, \"W\": 480, \"H\": 400, \"rate\": \"1×\", \"fromN\": 72, \"to\": 528, \"tlabel\": \"from the plant touchdown\", \"panels\": ["
  echo "  { \"k\": \"Hs\", \"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": false, \"l\": \"$(lab Hs)\" }, { \"k\": \"H\", \"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": false, \"l\": \"SP2F3 · 5.0 m/s\" }, { \"k\": \"Hf\", \"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": false, \"l\": \"$(lab Hf)\" } ] }"
  echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json
for v in TIGHT_R34_1x TIGHT_R34_025x TIGHT_SIDE_1x TIGHT_SIDE_025x FOCUS_R34_1x FOCUS_R34_025x; do
  $S/ffmpeg -loglevel error -y -i $OUT/${v}_G.mp4 -i $OUT/${v}_H.mp4 -filter_complex "[0][1]hstack=2" -c:v libx264 -pix_fmt yuv420p -crf 21 $OUT/ROW2_$v.mp4 || exit 1; done
for v in TIGHT_R34_1x TIGHT_SIDE_1x; do $S/ffmpeg -loglevel error -y -i $OUT/${v}_F.mp4 -i $OUT/${v}_G.mp4 -i $OUT/${v}_H.mp4 -filter_complex "[0][1][2]hstack=3" -c:v libx264 -pix_fmt yuv420p -crf 21 $OUT/ROW3_$v.mp4 || exit 1; done
ls -la $OUT | head -40
