#!/bin/bash
# Before / after strip: t11_compare.sh <scn> <view> <times "a,b,c"> <out.jpg> [extra query] — one row per body in BODIES (default "t1 t11"; TURN-1.2
# reviews: "t1 t11 t12"), the same instants and camera. env W, H = frame size.
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; mkdir -p $S/t1; ins=""; k=0; dirs=""
for b in ${BODIES:-t1 t11}; do DD=$(mktemp -d "$S/t1/cmp.XXXX"); dirs="$dirs $DD"
  PUPPETEER_NODE_MODULES=$S/node_r/node_modules node "$(dirname "$0")/t1_capture.cjs" --q "scn=$1&single=$2&body=$b&$5" --out $DD --stills "$3" --w ${W:-300} --h ${H:-360} --profile $S/t1/prof >/dev/null 2>&1 || { echo capture failed; exit 1; }
  n=$(ls $DD/*.jpg | wc -l | tr -d ' '); $S/ffmpeg -loglevel error -y -pattern_type glob -i "$DD/t*.jpg" -vf "tile=${n}x1" -frames:v 1 $DD/row.png; ins="$ins -i $DD/row.png"; k=$((k+1)); done
if [ $k -gt 1 ]; then $S/ffmpeg -loglevel error -y $ins -filter_complex "vstack=$k" -q:v 3 "$4"; else $S/ffmpeg -loglevel error -y $ins -q:v 3 "$4"; fi
for d in $dirs; do rm -rf "${d:?}"; done; echo "$4 ($n × $k)"
