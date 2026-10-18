#!/bin/zsh
# receive_kill1/tools/rk_videos.sh — the review clips + their still strips: S=<scratch with node_r + ffmpeg> zsh rk_videos.sh <videos dir> <stills dir> [parallel 3]
HERE="${0:A:h}"; OUT="$1"; ST="$2"; P="${3:-3}"; mkdir -p "$OUT" "$ST"; i=0
grep -v '^#' "$HERE/rk_videos.txt" | while IFS='|' read id q; do
  ( PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$S/ffmpeg" node "$HERE/rk_capture.cjs" --q "$q" --out "$OUT/$id.mp4" --from -0.8 --to 2.2 --rate 0.5 --fps 30 --profile "$S/tmp/chrome_v_$id" >/dev/null 2>&1 < /dev/null
    PUPPETEER_NODE_MODULES="$S/node_r/node_modules" node "$HERE/rk_capture.cjs" --q "$q" --out "$ST/$id" --stills "-0.30,-0.10,0.00,0.12,0.30,0.60,1.00,2.00" --profile "$S/tmp/chrome_v_$id" 2>&1 < /dev/null | tail -1
    "$S/ffmpeg" -loglevel error -y -i "$OUT/$id.mp4" -ss 1.6 -frames:v 1 -vf scale=720:-1 "$OUT/$id.jpg" < /dev/null ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi
done; wait; echo "videos done"
