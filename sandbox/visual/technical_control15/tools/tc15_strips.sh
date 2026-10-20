#!/bin/zsh
# technical_control15/tools/tc15_strips.sh — (two at a time: the local server) still strips around each reference's decisive contact (quad: front 3/4 · rear 3/4 · side · top), 6 moments, 3 per row.
#   S=<scratch with node_r + ffmpeg> zsh tc15_strips.sh <out dir>
HERE="${0:A:h}"; OUT="$1"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"
i=0; for id in CHOP90 OUTCUT45 CRUYFF120 HOOK150 DRAGBACK180; do [[ -s "$OUT/${id}_quad_strip.jpg" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" node "$HERE/tc15_capture.cjs" --q "tech=$id&single=quad" --out "$S/tmp/strip_$id" --rel "-0.12,-0.04,0,0.06,0.14,0.26" --strip "$OUT/${id}_quad_strip.jpg" --cols 3 --scale 0.5 --profile "$S/tmp/tc15strip_$id" > "$OUT/${id}.log" 2>&1; rm -rf "$S/tmp/tc15strip_$id" "$S/tmp/strip_$id" ) &
  i=$((i+1)); if (( i % 2 == 0 )); then wait; fi; done; wait; echo strips
