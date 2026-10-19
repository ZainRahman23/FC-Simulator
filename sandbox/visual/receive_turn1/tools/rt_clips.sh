#!/bin/zsh
# receive_turn1/tools/rt_clips.sh — capture a set of lab tiles (mp4 + stills) in parallel: S=<scratch with node_r + ffmpeg> zsh rt_clips.sh <list file> <out dir> [parallel 3]
#   list file lines: <tile id>|<page: turn|kill>|<lab query>   (compare mode, external, paused are added)
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT/tiles"; FF="$S/ffmpeg"; TIMES="-0.30,0.00,0.20,0.40,0.70,1.10"; i=0
while IFS='|' read -r id page q; do [[ -z "$id" ]] && continue
  ( PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$FF" node "$HERE/rt_capture.cjs" --page "$page" --q "$q&compare=1&ladder=0" --out "$OUT/tiles/$id.mp4" --from -0.7 --to 1.5 --rate 0.5 --fps 30 --w 960 --h 540 --profile "$S/tmp/chrome_clip_$id" >/dev/null 2>&1 < /dev/null
    PUPPETEER_NODE_MODULES="$S/node_r/node_modules" node "$HERE/rt_capture.cjs" --page "$page" --q "$q&compare=1&ladder=0" --out "$OUT/tiles/$id" --stills "$TIMES" --w 960 --h 540 --profile "$S/tmp/chrome_clip_$id" >/dev/null 2>&1 < /dev/null; rm -rf "$S/tmp/chrome_clip_$id" ) &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips done $i"
