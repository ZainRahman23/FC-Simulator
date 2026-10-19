#!/bin/zsh
# receive_turn11/tools/rt11_clips.sh — capture the human-motion review set in parallel: S=<scratch with node_r + ffmpeg> zsh rt11_clips.sh <list file> <out dir> [parallel 3]
#   list lines: <id>|<kind: mp4 | events | stills>|<page: human | v1>|<cam>|<rate>|<from>|<to>|<lab query>   (compare mode, external, paused are added)
#   events: a frame strip at the body's own event times (rt11_strip.py composes it); stills: the 3D view at the listed times (the <rate> field)
HERE="${0:A:h}"; LIST="$1"; OUT="$2"; P="${3:-3}"; mkdir -p "$OUT/tiles"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"
EVK="prepStart,supportPlant,swingStart,contact,maxHipRotation,weightTransfer,contactLand,aligned,rejoin"; i=0
while IFS='|' read -r id kind page cm rate from to q; do [[ -z "$id" || "$id" == \#* ]] && continue
  [[ -s "$OUT/tiles/$id.mp4" || -s "$OUT/tiles/$id.jpg" || ( "$kind" == stills && -d "$OUT/tiles/$id" ) ]] && continue   # (already captured)
  ( prof="$S/tmp/chrome_rt11_$id"; qq="$q&cam=$cm&compare=1&ladder=0"
    if [[ "$kind" == mp4 ]]; then PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" node "$HERE/rt11_capture.cjs" --page "$page" --q "$qq" --out "$OUT/tiles/$id.mp4" --from "$from" --to "$to" --rate "$rate" --fps 30 --w 960 --h 540 --profile "$prof" > "$OUT/tiles/$id.log" 2>&1 < /dev/null
    elif [[ "$kind" == events ]]; then PUPPETEER_NODE_MODULES="$NM" node "$HERE/rt11_capture.cjs" --page "$page" --q "$qq" --out "$OUT/tiles/$id" --events "$EVK" --w 800 --h 560 --profile "$prof" > "$OUT/tiles/$id.log" 2>&1 < /dev/null
      python3 "$HERE/rt11_strip.py" "$OUT/tiles/$id" "$OUT/tiles/$id.jpg" "$FF" 468 300 >> "$OUT/tiles/$id.log" 2>&1 < /dev/null
    else PUPPETEER_NODE_MODULES="$NM" node "$HERE/rt11_capture.cjs" --page "$page" --q "$qq" --out "$OUT/tiles/$id" --stills "$rate" --w 960 --h 540 --profile "$prof" > "$OUT/tiles/$id.log" 2>&1 < /dev/null; fi
    rm -rf "$prof" ) < /dev/null &   # (nothing in the subshell may read the list: ffmpeg reads stdin)
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done < "$LIST"; wait; echo "clips done $i"
