#!/bin/zsh
# technical_control1/tools/tc_strips.sh — frame strips (owner §29: close 3/4, side, top): 12 stills tiled 6 × 2 per id.   S=<scratch> zsh tc_strips.sh <list> <out dir> [P 3]
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
while IFS='|' read -r id mode ts view q; do [[ -z "$id" || "$id" == \#* ]] && continue; f="$OUT/$id.jpg"; [[ -s "$f" ]] && continue; [[ $mode == rel ]] && arg=(--rel "$ts") || arg=(--stills "$ts")
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" node "$HERE/tc_capture.cjs" --q "$q&single=$view&graph=0" --out "$S/tmp/tcstrip_$id" ${arg[@]} --strip "$f" --cols 6 --scale 0.5 --w 1280 --h 720 --profile "$S/tmp/tcstripp_$id" > "$OUT/$id.log" 2>&1; rm -rf "$S/tmp/tcstripp_$id" "$S/tmp/tcstrip_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "strips $i"
