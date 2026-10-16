#!/bin/zsh
# dribble1/tools/d1_render_all.sh — render the DRIBBLE-1 review videos from the lab page (local server on :8361 serving the worktree root).
# env: S (scratch dir with ffmpeg + node_r/node_modules), OUT (videos dir). Each line: name | query | t0 | t1 | view | rate
set -u
HERE="${0:A:h}"; CAP="$HERE/d1_capture.cjs"
export PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$S/ffmpeg" TMPDIR="$S/d1"
render() { local name="$1" q="$2" t0="$3" t1="$4" view="$5" rate="$6" extra=""
  if [[ "$view" == "game" ]]; then extra="--single game --w 1280 --h 720"; elif [[ "$view" == "layout" ]]; then extra="--w 1600 --h 900"; else extra="--single $view --w 1280 --h 720"; fi
  [[ -f "$OUT/$name.mp4" ]] && { echo "skip $name"; return; }
  node "$CAP" --q "$q" --out "$OUT/$name.mp4" --t0 "$t0" --t1 "$t1" --rate "$rate" --profile "$S/d1/chrome_prof" ${=extra} 2>&1 | tail -1 | sed "s|^|$name: |"; }
while IFS='|' read -r name q t0 t1 view rate; do [[ -z "$name" || "$name" == \#* ]] && continue; render "${name// /}" "${q// /}" "${t0// /}" "${t1// /}" "${view// /}" "${rate// /}"; done < "$HERE/d1_videos.txt"
echo DONE
