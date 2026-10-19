#!/bin/zsh
# technical_control11/tools/tc11_strips.sh — the contact strips: every contact in the window × −83 / −42 / 0 / +42 / +83 ms, one row per contact.
#   S=<scratch with node_r + ffmpeg> zsh tc11_strips.sh <list> <out dir> [P 3]
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id from to view q; do [[ -z "$id" || "$id" == \#* ]] && continue; [[ -s "$OUT/$id.jpg" ]] && continue
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" perl -e 'alarm shift; exec @ARGV' 420 node "$HERE/tc11_capture.cjs" --q "$q&single=$view&graph=0&bare=1" --out "$S/tmp/tc11strip_$id" --contacts "-0.083,-0.042,0,0.042,0.083" --cfrom "$from" --cto "$to" --maxc 8 --strip "$OUT/$id.jpg" --scale 0.5 --w 960 --h 540 --profile "$S/tmp/tc11stripp_$id" > "$OUT/$id.log" 2>&1
    cp "$S/tmp/tc11strip_$id/contacts.json" "$OUT/$id.contacts.json" 2>/dev/null; rm -rf "$S/tmp/tc11stripp_$id" "$S/tmp/tc11strip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "strips $i"
