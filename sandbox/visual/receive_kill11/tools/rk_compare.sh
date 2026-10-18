#!/bin/zsh
# receive_kill11/tools/rk_compare.sh — MATCHED-RATING COMPARISONS: the same incoming ball and the same draws at BC 30 / 50 / 70 / 80 / 90 / 99, each
# a 720×400 lab tile (compare mode: 3D + side view + the episode's result), composed into one 2×3 side-by-side video and one still grid
# (rows = rating, columns = moments of the episode).   S=<scratch with node_r + ffmpeg> zsh rk_compare.sh <out dir> [parallel 3]
HERE="${0:A:h}"; OUT="$1"; P="${2:-3}"; mkdir -p "$OUT/tiles"; FF="$S/ffmpeg"; BCS=(30 50 70 80 90 99); TIMES="-0.10,0.00,0.25,0.50,0.80,1.20"
CASES=("hard|v=22" "chestM|v=8&h=1.32&drop=20&surface=CHEST" "chestH|v=20&h=1.32&drop=20&surface=CHEST" "thighM|v=6&h=0.95&drop=35&surface=THIGH" "thighH|v=16&h=0.95&drop=35&surface=THIGH" "headM|v=6&h=1.78&drop=15&surface=HEAD" "headH|v=15&h=1.78&drop=25&surface=HEAD")
i=0
for c in $CASES; do id="${c%%|*}"; q="${c#*|}"; for bc in $BCS; do
  ( PUPPETEER_NODE_MODULES="$S/node_r/node_modules" FFMPEG="$FF" node "$HERE/rk_capture.cjs" --q "$q&bc=$bc&draw=TYPICAL&compare=1&ladder=0&cam=side" --out "$OUT/tiles/${id}_bc$bc.mp4" --from -0.6 --to 1.6 --rate 0.5 --fps 30 --w 720 --h 400 --profile "$S/tmp/chrome_c_${id}_$bc" >/dev/null 2>&1 < /dev/null
    PUPPETEER_NODE_MODULES="$S/node_r/node_modules" node "$HERE/rk_capture.cjs" --q "$q&bc=$bc&draw=TYPICAL&compare=1&ladder=0&cam=side" --out "$OUT/tiles/${id}_bc$bc" --stills "$TIMES" --w 720 --h 400 --profile "$S/tmp/chrome_c_${id}_$bc" >/dev/null 2>&1 < /dev/null ) &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done; done; wait
python3 "$HERE/rk_compose.py" "$OUT" "$FF"; echo "compare done"
