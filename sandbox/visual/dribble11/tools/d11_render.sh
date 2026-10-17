#!/bin/zsh
# dribble11/tools/d11_render.sh — render the DRIBBLE-1.1 review videos from the lab pages (local server on :8361 serving the worktree root), then
# compose the side-by-side DRIBBLE-1 | DRIBBLE-1.1 comparisons (same scenario / seed / player, both at 1×, frame-synchronised by simulation time).
# env: S (scratch dir with ffmpeg + node_r/node_modules), OUT (videos dir). List: d11_videos.txt
#   clip line:  name | page (dribble1.html | dribble11.html) | query | t0 | t1 | view (game | layout | nearC | …) | rate
#   pair line:  SBS name | left clip | right clip | left label | right label
set -u
HERE="${0:A:h}"; CAP="$HERE/d11_capture.cjs"; FF="$S/ffmpeg"; FONT="/System/Library/Fonts/Helvetica.ttc"
export PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$FF" TMPDIR="$S/d11"
render() { local name="$1" page="$2" q="$3" t0="$4" t1="$5" view="$6" rate="$7" extra=""
  if [[ "$view" == "game" ]]; then extra="--single game --w 1280 --h 720"; elif [[ "$view" == "half" ]]; then extra="--single game --w 960 --h 540"; elif [[ "$view" == "layout" ]]; then extra="--w 1600 --h 900"; else extra="--single $view --w 1280 --h 720"; fi
  [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  node "$CAP" --page "$page" --q "$q" --out "$OUT/$name.mp4" --t0 "$t0" --t1 "$t1" --rate "$rate" --profile "$S/d11/chrome_prof_r" ${=extra} 2>&1 | tail -1 | sed "s|^|$name: |"; }
sbs() { local name="$1" l="$2" r="$3" ll="$4" rl="$5"; [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  "$FF" -loglevel error -y -i "$OUT/$l.mp4" -i "$OUT/$r.mp4" -filter_complex \
    "[0:v]drawtext=fontfile=${FONT}:text='$ll':x=16:y=14:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[a];[1:v]drawtext=fontfile=${FONT}:text='$rl':x=16:y=14:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[b];[a][b]hstack=inputs=2,pad=iw+0:ih+0" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$OUT/$name.mp4" && echo "$name: composed"; }
while IFS='|' read -r a b c d e f g; do
  [[ -z "$a" || "$a" == \#* ]] && continue; a="${a// /}"
  if [[ "$a" == "SBS" ]]; then sbs "${b// /}" "${c// /}" "${d// /}" "$(echo $e | sed 's/^ *//;s/ *$//')" "$(echo $f | sed 's/^ *//;s/ *$//')"; else render "$a" "${b// /}" "${c// /}" "${d// /}" "${e// /}" "${f// /}" "${g// /}"; fi
done < "$HERE/d11_videos.txt"
echo DONE
