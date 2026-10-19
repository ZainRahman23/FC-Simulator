#!/bin/zsh
# technical_control11/tools/tc11_clips.sh — the feet review clips, in parallel, each under a watchdog (a capture that hangs is killed; re-running
# the script captures only the missing clips).   S=<scratch with node_r + ffmpeg> zsh tc11_clips.sh <list> <out dir> [P 3]
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id from to rate q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.mp4" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" perl -e 'alarm shift; exec @ARGV' 420 node "$HERE/tc11_capture.cjs" --q "$q" --out "$OUT/$id.mp4" --from "$from" --to "$to" --rate "$rate" --fps 30 --w 1280 --h 720 --profile "$S/tmp/tc11clip_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/tc11clip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips $i"
