#!/bin/bash
# SP2A review renders (presentation only: records are read, nothing is re-simulated). Our own renders → sp2a/review/video/ (in Git).
# usage (worktree root): sp2a_render.sh <scratch dir S> <SP2A record> <SP2 record> <SP2A opts.json> <run-in.json> <out video dir>
S=$1; REC=$2; SP2REC=$3; OPTS=$4; RUNIN=$5; OUT=$6; W="$(pwd)"; Q=$S/sp2a/fin; mkdir -p $Q/clips $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2
node $R/slide_phys1/render/sp_clip.mjs --run "$REC" --key SP2A --out $Q/clips --steps 0-400 --prefix 1 --wire 1 --hud 1 --intent2a "$(cat $OPTS)" --runin "$RUNIN" || exit 1
node $R/slide_phys1/render/sp_clip.mjs --run "$SP2REC" --key SP2 --out $Q/clips --steps 0-400 --wire 1 --hud 1 || exit 1
node $R/sp2a/render/sp2a_pad_clip.mjs $Q/clips SP2 -170 "SP2: no run-in - it begins in its committed entry state at t = 0" || exit 1
P='"contacts": true'
V=$Q/views.json; cat > $V <<EOV
[
 { "id": "SP2A_MAIN_1x", "every": 4, "W": 470, "H": 400, "rate": "1×", "fromN": -60, "to": 384, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2A", "view": "game", "zoom": 1, $P, "l": "SP2A · touchline gameplay camera" },
   { "k": "SP2A", "view": "game", "zoom": 5, $P, "l": "SP2A · same camera, crop ×5" },
   { "k": "SP2A", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "ghost": true, "l": "SP2A · rear 3/4 · colliders, skeleton (yellow), intent (magenta)" },
   { "k": "SP2A", "view": "close", "angle": "side", $P, "hud": true, "l": "SP2A · side" } ] },
 { "id": "SP2A_MAIN_05x", "every": 2, "W": 470, "H": 400, "rate": "0.5×", "fromN": -60, "to": 384, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2A", "view": "game", "zoom": 1, $P, "l": "SP2A · touchline gameplay camera" },
   { "k": "SP2A", "view": "game", "zoom": 5, $P, "l": "SP2A · same camera, crop ×5" },
   { "k": "SP2A", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "ghost": true, "l": "SP2A · rear 3/4 · colliders, skeleton (yellow), intent (magenta)" },
   { "k": "SP2A", "view": "close", "angle": "side", $P, "hud": true, "l": "SP2A · side" } ] },
 { "id": "SP2A_MAIN_025x", "every": 1, "W": 520, "H": 420, "rate": "0.25×", "fromN": -60, "to": 300, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2A", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "ghost": true, "l": "SP2A · rear 3/4 · colliders, skeleton, intent" },
   { "k": "SP2A", "view": "close", "angle": "rear34", $P, "hud": true, "l": "SP2A · rear 3/4" },
   { "k": "SP2A", "view": "close", "angle": "front34", $P, "l": "SP2A · front 3/4" } ] },
 { "id": "START_1x", "every": 4, "W": 520, "H": 420, "rate": "1×", "fromN": -168, "to": 120, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2", "view": "game", "zoom": 5, $P, "hud": true, "l": "SP2 · gameplay camera, crop ×5" },
   { "k": "SP2A", "view": "game", "zoom": 5, $P, "hud": true, "l": "SP2A · gameplay camera, crop ×5" },
   { "k": "SP2A", "view": "close", "angle": "side", $P, "hud": true, "l": "SP2A · side diagnostic" } ] },
 { "id": "START_025x", "every": 1, "W": 520, "H": 420, "rate": "0.25×", "fromN": -168, "to": 120, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2", "view": "close", "angle": "side", $P, "hud": true, "l": "SP2 · side" },
   { "k": "SP2A", "view": "close", "angle": "side", $P, "hud": true, "l": "SP2A · side" },
   { "k": "SP2A", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "ghost": true, "l": "SP2A · rear 3/4 · colliders, skeleton, intent" } ] },
 { "id": "CMP_1x", "every": 4, "W": 480, "H": 400, "rate": "1×", "fromN": 1, "to": 384, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2", "view": "game", "zoom": 5, $P, "l": "SP2 · gameplay crop ×5" }, { "k": "SP2A", "view": "game", "zoom": 5, $P, "l": "SP2A · gameplay crop ×5" },
   { "k": "SP2", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "l": "SP2 · rear 3/4 colliders" }, { "k": "SP2A", "view": "close", "angle": "rear34", $P, "wire": true, "mesh": false, "l": "SP2A · rear 3/4 colliders" } ] },
 { "id": "CMP_025x", "every": 1, "W": 480, "H": 400, "rate": "0.25×", "fromN": 1, "to": 300, "tlabel": "from the plant touchdown", "panels": [
   { "k": "SP2", "view": "close", "angle": "rear34", $P, "hud": true, "l": "SP2 · rear 3/4" }, { "k": "SP2A", "view": "close", "angle": "rear34", $P, "hud": true, "l": "SP2A · rear 3/4" },
   { "k": "SP2", "view": "close", "angle": "side", $P, "l": "SP2 · side" }, { "k": "SP2A", "view": "close", "angle": "side", $P, "l": "SP2A · side" } ] }
]
EOV
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} || exit 1
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json; ls -la $OUT
