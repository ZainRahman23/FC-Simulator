#!/bin/zsh
# receive_elite1/tools/re1_strips.sh — frame strips (owner §17): every elite review action, NEW close view, 12 frames from 0.3 s before to 1.1 s after the first
# contact; the priority comparisons CURRENT | NEW, 8 frames.   S=<scratch with node_r + ffmpeg> zsh re1_strips.sh <out dir> [P 3]
HERE="${0:A:h}"; OUT="$1"; P="${2:-3}"; mkdir -p "$OUT"; FF="$S/ffmpeg"; NM="$S/node_r/node_modules"; i=0
REL="-0.3,-0.12,0,0.08,0.16,0.24,0.34,0.44,0.56,0.7,0.88,1.1"; RELC="-0.3,0,0.12,0.24,0.4,0.6,0.85,1.1"
ALL=$(cd "$HERE/.." && node -e "import('./re1_cases.js').then(({ALL,PRIORITY})=>console.log(ALL.map(x=>'new|'+x).concat(PRIORITY.map(x=>'cmp|'+x)).join(' ')))")
for job in ${=ALL}; do kind=${job%%|*}; id=${job#*|}; f="$OUT/${kind}_$id.jpg"; [[ -s "$f" ]] && continue
  if [[ $kind == new ]]; then q="case=$id&single=nearC&graph=0"; rel=$REL; cols=6; else q="case=$id&compare=1&A=nearC&graph=0"; rel=$RELC; cols=4; fi
  ( PUPPETEER_NODE_MODULES="$NM" FFMPEG="$FF" node "$HERE/re1_capture.cjs" --q "$q" --out "$S/tmp/strip_${kind}_$id" --rel "$rel" --strip "$f" --cols $cols --scale 0.5 --w 1280 --h 720 --profile "$S/tmp/re1strip_${kind}_$id" > "$OUT/${kind}_$id.log" 2>&1; rm -rf "$S/tmp/re1strip_${kind}_$id" "$S/tmp/strip_${kind}_$id" ) < /dev/null &
  i=$((i+1)); if (( i % P == 0 )); then wait; fi; done; wait; echo "strips $i"
