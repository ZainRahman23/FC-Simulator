#!/bin/zsh
# receive_elite1/tools/re1_clips.sh — capture the review clips in parallel (times from the first contact): S=<scratch with node_r + ffmpeg> zsh re1_clips.sh <list> <out dir> [P 3]
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id from to rate q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.mp4" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" node "$HERE/re1_capture.cjs" --q "$q" --out "$OUT/$id.mp4" --rel0 "$from" --rel1 "$to" --rate "$rate" --fps 30 --w 1280 --h 720 --profile "$S/tmp/re1clip_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/re1clip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips $i"
