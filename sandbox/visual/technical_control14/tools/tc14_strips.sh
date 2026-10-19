#!/bin/zsh
# technical_control14/tools/tc14_strips.sh — the frame strips around receive → carry (stills at offsets from the first contact, tiled), in parallel under a
# watchdog; re-running captures only the missing strips.   S=<scratch with node_r + ffmpeg> zsh tc13_strips.sh <list> <out dir> [P 3]
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id offs q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.jpg" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" perl -e 'alarm shift; exec @ARGV' 600 node "$HERE/tc14_capture.cjs" --q "$q" --out "$S/tmp/tc14strip_$id" --rel "$offs" --strip "$OUT/$id.jpg" --cols 6 --scale 0.5 --profile "$S/tmp/tc14sp_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/tc14sp_$id" "$S/tmp/tc14strip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "strips $i"
