#!/bin/zsh
# technical_control13/tools/tc13_clips.sh — the transition review clips (TECHNICAL-CONTROL-1.2’s script), in parallel, each under a watchdog (a capture that hangs is killed; re-running
# the script captures only the missing clips).   S=<scratch with node_r + ffmpeg> zsh tc13_clips.sh <list> <out dir> [P 3] (from / to: absolute page s, or r<s> from the first contact)
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id from to rate q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.mp4" ]] && continue
  if [[ "$from" == r* ]]; then TA=(--rel0 "${from#r}" --rel1 "${to#r}"); else TA=(--from "$from" --to "$to"); fi
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" perl -e 'alarm shift; exec @ARGV' 600 node "$HERE/tc13_capture.cjs" --q "$q" --out "$OUT/$id.mp4" "${TA[@]}" --rate "$rate" --fps 30 --w 1280 --h 720 --profile "$S/tmp/tc13clip_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/tc13clip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips $i"
