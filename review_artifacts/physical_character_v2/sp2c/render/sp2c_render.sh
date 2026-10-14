#!/bin/bash
# SP2C review renders (presentation only: records are read, nothing is re-simulated). Our own renders → sp2c/review/video/ (in Git).
# Conditions (all on the 5.0 m/s run-in unless noted):
#   A100 / A50 / A25   SP2A at body friction ×1.00 / ×0.50 / ×0.25 (the FSWEEP records, unchanged)
#   A37                SP2A at the TEMPORARY F37.5            C37   BEST SP2C at F37.5        C37s / C37f   BEST SP2C at 4.5 / 5.5 m/s
# Per condition and view, one single-panel video with IDENTICAL timing (the page switches conditions at the same time position); comparison rows are
# composed from them. Views (sim time from the plant touchdown; negative = the RUN-1 run-in):
#   CLOSE_1x    close side camera following the body                         −0.30 → 4.50 s, 1×
#   GAME_1x     fixed touchline gameplay camera, crop ×4.5 (FSWEEP framing)    −0.30 → 4.50 s, 1×
#   SIDE_025x   close side                                                   −0.20 → 1.00 s, 0.25×
#   R34_025x    close rear 3/4 (the folded leg toward the camera)            −0.20 → 1.00 s, 0.25×
#   DIAG_025x   rear 3/4 colliders + skeleton (yellow) + intent ghost (magenta) + contact forces, −0.20 → 1.00 s, 0.25×
#   FOLD_025x   CLOSE-UP pelvis + folded hip + knee + ankle + boot, rear 3/4 crop ×2, final stride → first fold contact + 0.5 s (−0.30 → 0.92 s), 0.25×
#   FOLDS_025x  the same close-up from the side
#   END_1x / END_05x   the FINAL ~1 s OF THE SLIDE and 1 s after: each condition from its own stop − 1.0 s to stop + 1.0 s (aligned at the stop), side
#   END_R34_05x        the same, rear 3/4, 0.5×
#   SPEEDS_1x   BEST SP2C at 4.5 / 5.0 / 5.5 m/s, close side, 1×
# usage (worktree root): sp2c_render.sh <scratch S> <SP2C records dir (C37*.json.gz + .diag.json)> <SP2C opts.json> <out video dir>
S=$1; CREC=$2; COPTS=$3; OUT=$4; Q=$S/sp2c/fin; mkdir -p $Q/clips $Q/vid $OUT
export LV2_ARCHIVE=$S/lv2arch PUPPETEER_NODE_MODULES=$S/node_r/node_modules MP4_MUXER=$S/node_r/node_modules/mp4-muxer/build/mp4-muxer.js
R=review_artifacts/physical_character_v2; P=../_preserved_2026-10-14_evidence_outside_git/sp2a/fsweep/records; RI5=$S/sp2a/run1g_4.608.json; AOPTS=$R/sp2a/evidence/SP2A_opts.json
clip() { node $R/slide_phys1/render/sp_clip.mjs --run "$1" --key $2 --out $Q/clips --steps 0-1440 --prefix 1 --wire 1 --hud 1 --fsweep 1 --intent2a "$(cat $3)" --runin "$4" > $Q/clip_$2.log 2>&1 || { tail -3 $Q/clip_$2.log; exit 1; }; }
clip $P/F100.json.gz A100 $AOPTS $RI5; clip $P/F50.json.gz A50 $AOPTS $RI5; clip $P/F25.json.gz A25 $AOPTS $RI5; clip $CREC/A37_run1g_4.608.json.gz A37 $AOPTS $RI5
clip $CREC/C37_run1g_4.608.json.gz C37 $COPTS $RI5; clip $CREC/C37_run1g_4.147.json.gz C37s $COPTS $S/sp2a/run1g_4.147.json; clip $CREC/C37_run1g_5.069.json.gz C37f $COPTS $S/sp2a/run1g_5.069.json
# stop times (end of slide): FSWEEP summary for A100 / A50 / A25, the SP2C diagnosis for A37 / C37
STOPS=$(node -e '
const fs = require("fs"), sum = JSON.parse(fs.readFileSync(process.argv[1] + "/sp2a/fsweep/evidence/fsweep_summary.json")).conditions, d = (f) => JSON.parse(fs.readFileSync(f)).milestones.endOfSlide.t;
const st = { A100: sum.F100.stopped.t, A50: sum.F50.stopped.t, A25: sum.F25.stopped.t, A37: d(process.argv[2]), C37: d(process.argv[3]) };
console.log(Object.entries(st).map(([k, t]) => k + "=" + Math.round(t * 240)).join(" "));' $R $CREC/A37_run1g_4.608.diag.json $CREC/C37_run1g_4.608.diag.json); echo "stop steps: $STOPS"
IDS="A100 A50 A25 A37 C37"; lab() { case $1 in A100) echo "SP2A · F100 (friction ×1.00)";; A50) echo "SP2A · F50 (×0.50)";; A25) echo "SP2A · F25 (×0.25)";; A37) echo "SP2A · F37.5 (temporary ×0.375)";; C37) echo "SP2C · F37.5 (temporary ×0.375)";; C37s) echo "SP2C · 4.5 m/s";; C37f) echo "SP2C · 5.5 m/s";; esac; }
stopOf() { for kv in $STOPS; do [ "${kv%%=*}" = "$1" ] && echo "${kv#*=}"; done; }
CAM='"camFix": [49.03, 34.26], "heading": 0'; CR='"crop": [60, 100, 360, 300]'; FC='"crop": [110, 190, 260, 217]'
V=$Q/views.json; { echo "["; first=1; for id in $IDS; do L="$(lab $id)"; st=$(stopOf $id)
  for v in "CLOSE_1x|4|-72|1080|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": false" "GAME_1x|4|-72|1080|\"view\": \"game\", \"zoom\": 4.5, $CAM, \"contacts\": false" \
           "SIDE_025x|1|-48|240|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" "R34_025x|1|-48|240|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": true" \
           "DIAG_025x|1|-48|240|\"view\": \"close\", \"angle\": \"rear34\", \"wire\": true, \"mesh\": false, \"ghost\": true, \"contacts\": true, \"diag\": true" \
           "FOLD_025x|1|-72|220|\"view\": \"close\", \"angle\": \"rear34\", $FC, \"contacts\": true" "FOLDS_025x|1|-72|220|\"view\": \"close\", \"angle\": \"side\", $FC, \"contacts\": true" \
           "END_1x|4|$((st - 240))|$((st + 240))|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" "END_05x|2|$((st - 240))|$((st + 240))|\"view\": \"close\", \"angle\": \"side\", $CR, \"contacts\": true" \
           "END_R34_05x|2|$((st - 240))|$((st + 240))|\"view\": \"close\", \"angle\": \"rear34\", $CR, \"contacts\": true"; do
    IFS='|' read -r vid ev fr to pp <<< "$v"; [ $first = 1 ] || echo ","; first=0
    rate=$([ $ev = 4 ] && echo "1×" || ([ $ev = 2 ] && echo "0.5×" || echo "0.25×")); tl=$([[ $vid == END* ]] && echo "from the plant touchdown · end of slide at $(node -e "console.log(($st/240).toFixed(2))") s" || echo "from the plant touchdown")
    echo "{ \"id\": \"${vid}_$id\", \"every\": $ev, \"W\": 480, \"H\": 400, \"rate\": \"$rate\", \"fromN\": $fr, \"to\": $to, \"tlabel\": \"$tl\", \"panels\": [ { \"k\": \"$id\", $pp, \"l\": \"$L\" } ] }"; done; done
  echo ", { \"id\": \"SPEEDS_1x\", \"every\": 4, \"W\": 480, \"H\": 400, \"rate\": \"1×\", \"fromN\": -72, \"to\": 1080, \"tlabel\": \"from the plant touchdown\", \"panels\": ["
  echo "  { \"k\": \"C37s\", \"view\": \"close\", \"angle\": \"side\", $CR, \"l\": \"$(lab C37s)\" }, { \"k\": \"C37\", \"view\": \"close\", \"angle\": \"side\", $CR, \"l\": \"SP2C · 5.0 m/s\" }, { \"k\": \"C37f\", \"view\": \"close\", \"angle\": \"side\", $CR, \"l\": \"$(lab C37f)\" } ] }"
  echo "]"; } > $V
node $R/slide_phys1/render/sp_capture.cjs --clips $Q/clips --views $V --archive $S/lv2arch --out $Q/vid ${ONLY:+--only $ONLY} > $Q/capture.log 2>&1 || { tail -5 $Q/capture.log; exit 1; }
for f in $Q/vid/*.mp4; do cp "$f" $OUT/; done; cp $Q/vid/CAPTURE.json $OUT/CAPTURE.json
# comparison rows (no reference — that is composed locally): SP2A F100 | F50 | F25 | F37.5 | SP2C F37.5, each 384 × 320
# (only the composites the review page shows)
for v in CLOSE_1x GAME_1x SIDE_025x R34_025x DIAG_025x FOLD_025x END_1x END_05x END_R34_05x; do
  $S/ffmpeg -loglevel error -y $(for id in $IDS; do echo -n "-i $OUT/${v}_$id.mp4 "; done) -filter_complex "[0]scale=384:-2[a];[1]scale=384:-2[b];[2]scale=384:-2[c];[3]scale=384:-2[d];[4]scale=384:-2[e];[a][b][c][d][e]hstack=5" -c:v libx264 -pix_fmt yuv420p -crf 23 $OUT/ROW_$v.mp4 || exit 1; done
for v in FOLD_025x FOLDS_025x END_05x; do $S/ffmpeg -loglevel error -y -i $OUT/${v}_A37.mp4 -i $OUT/${v}_C37.mp4 -filter_complex "[0][1]hstack=2" -c:v libx264 -pix_fmt yuv420p -crf 22 $OUT/PAIR_$v.mp4 || exit 1; done
ls -la $OUT | head -80
