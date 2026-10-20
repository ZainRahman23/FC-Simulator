#!/bin/zsh
# technical_control15/tools/tc15_clips.sh — the reference clips (TECHNICAL-CONTROL-1.4's script), in parallel, each under a watchdog (re-running captures only
# the missing clips).   S=<scratch with node_r + ffmpeg> zsh tc15_clips.sh <list> <out dir> [P 3]   (rel0 / rel1: s from the decisive contact)
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id r0 r1 rate q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.mp4" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" perl -e 'alarm shift; exec @ARGV' 900 node "$HERE/tc15_capture.cjs" --q "$q" --out "$OUT/$id.mp4" --rel0 "$r0" --rel1 "$r1" --rate "$rate" --fps 30 --w 1280 --h 720 --profile "$S/tmp/tc15clip_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/tc15clip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips $i"
