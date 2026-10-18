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
for c in $CASES; do id="${c%%|*}"; T="$OUT/tiles"
  "$FF" -loglevel error -y $(for bc in $BCS; do echo -i "$T/${id}_bc$bc.mp4"; done) -filter_complex "xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h1|w0_h0+h1[v]" -map "[v]" -c:v libx264 -crf 21 -pix_fmt yuv420p "$OUT/${id}_compare.mp4" < /dev/null
  "$FF" -loglevel error -y -ss 1.2 -i "$OUT/${id}_compare.mp4" -frames:v 1 -vf scale=960:-1 "$OUT/${id}_compare.jpg" < /dev/null
  ins=(); for bc in $BCS; do for t in ${(s:,:)TIMES}; do tt=$(printf "%+.2f" $t); ins+=(-i "$T/${id}_bc$bc/t$tt.jpg"); done; done
  lay=""; for r in 0 1 2 3 4 5; do for k in 0 1 2 3 4 5; do lay+="$((k*320))_$((r*178))|"; done; done
  "$FF" -loglevel error -y $ins -filter_complex "$(for n in $(seq 0 35); do printf "[%d:v]scale=320:178[s%d];" $n $n; done)$(for n in $(seq 0 35); do printf "[s%d]" $n; done)xstack=inputs=36:layout=${lay%|}[o]" -map "[o]" -frames:v 1 "$OUT/${id}_grid.jpg" < /dev/null
done; echo "compare done"
