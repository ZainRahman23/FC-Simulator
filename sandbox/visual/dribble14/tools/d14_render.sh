#!/bin/zsh
# dribble14/tools/d14_render.sh — render the DRIBBLE-1.3 review videos from the lab pages (local server on :8361 serving the worktree root), then
# compose the side-by-side comparisons — DRIBBLE-1.2 | DRIBBLE-1.3 (SBS) or three clips (SBS3) — same scenario / seed / player, all at 1×,
# frame-synchronised by simulation time.
# env: S (scratch dir with ffmpeg + node_r/node_modules), OUT (videos dir). List: d14_videos.txt
#   clip line:  name | page (dribble12.html | dribble14.html) | query | t0 | t1 | view (game | layout | nearC | …) | rate
#   pair line:  SBS name | left clip | right clip | left label | right label
#   triple line: SBS3 name | clip 1 | clip 2 | clip 3 | label 1 / label 2 / label 3
set -u
HERE="${0:A:h}"; CAP="$HERE/d14_capture.cjs"; FF="$S/ffmpeg"; FONT="/System/Library/Fonts/Helvetica.ttc"
export PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$FF" TMPDIR="$S/d13"
render() { local name="$1" page="$2" q="$3" t0="$4" t1="$5" view="$6" rate="$7" extra=""
  if [[ "$view" == "game" ]]; then extra="--single game --w 1280 --h 720"; elif [[ "$view" == "half" ]]; then extra="--single game --w 960 --h 540"; elif [[ "$view" == "layout" ]]; then extra="--w 1600 --h 900"; else extra="--single $view --w 1280 --h 720"; fi
  [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  node "$CAP" --page "$page" --q "$q" --out "$OUT/$name.mp4" --t0 "$t0" --t1 "$t1" --rate "$rate" --profile "$S/d13/chrome_prof_${PTAG:-r}" ${=extra} 2>&1 | tail -1 | sed "s|^|$name: |"; }
sbs() { local name="$1" l="$2" r="$3" ll="$4" rl="$5"; [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  "$FF" -nostdin -loglevel error -y -i "$OUT/$l.mp4" -i "$OUT/$r.mp4" -filter_complex \
    "[0:v]drawtext=fontfile=${FONT}:text='$ll':x=16:y=14:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[a];[1:v]drawtext=fontfile=${FONT}:text='$rl':x=16:y=14:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[b];[a][b]hstack=inputs=2,pad=iw+0:ih+0" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$OUT/$name.mp4" && echo "$name: composed"; }
sbs3() { local name="$1" a="$2" b="$3" c="$4" la="$5" lb="$6" lc="$7"; [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  local dt="fontfile=${FONT}:x=16:y=14:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8"
  "$FF" -nostdin -loglevel error -y -i "$OUT/$a.mp4" -i "$OUT/$b.mp4" -i "$OUT/$c.mp4" -filter_complex \
    "[0:v]drawtext=${dt}:text='$la'[x];[1:v]drawtext=${dt}:text='$lb'[y];[2:v]drawtext=${dt}:text='$lc'[z];[x][y][z]hstack=inputs=3" \
    -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p "$OUT/$name.mp4" && echo "$name: composed"; }
while IFS='|' read -r a b c d e f g; do
  [[ -z "$a" || "$a" == \#* ]] && continue; a="${a// /}"
  if [[ "$a" == "SBS3" ]]; then IFS='/' read -r l1 l2 l3 <<< "$f"; sbs3 "${b// /}" "${c// /}" "${d// /}" "${e// /}" "$(echo $l1 | sed 's/^ *//;s/ *$//')" "$(echo $l2 | sed 's/^ *//;s/ *$//')" "$(echo $l3 | sed 's/^ *//;s/ *$//')"; continue; fi
  if [[ "$a" == "SBS" ]]; then sbs "${b// /}" "${c// /}" "${d// /}" "$(echo $e | sed 's/^ *//;s/ *$//')" "$(echo $f | sed 's/^ *//;s/ *$//')"; else render "$a" "${b// /}" "${c// /}" "${d// /}" "${e// /}" "${f// /}" "${g// /}"; fi
done < "${LIST:-$HERE/d14_videos.txt}"
echo DONE
