#!/bin/bash
# TURN-1.1 before / after strip: t11_compare.sh <scn> <view> <times "a,b,c"> <out.jpg> [extra query] — row 1 = TURN-1 procedural body, row 2 = TURN-1.1
# authored body, the same instants and camera (identical path / plants). env W, H = frame size.
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; mkdir -p $S/t1; D1=$(mktemp -d "$S/t1/cmp.XXXX"); D2=$(mktemp -d "$S/t1/cmp.XXXX")
for b in t1 t11; do DD=$D1; [ $b = t11 ] && DD=$D2
  PUPPETEER_NODE_MODULES=$S/node_r/node_modules node "$(dirname "$0")/t1_capture.cjs" --q "scn=$1&single=$2&body=$b&$5" --out $DD --stills "$3" --w ${W:-300} --h ${H:-360} --profile $S/t1/prof >/dev/null 2>&1 || { echo capture failed; exit 1; }
done
n=$(ls $D1/*.jpg | wc -l | tr -d ' ')
$S/ffmpeg -loglevel error -y -pattern_type glob -i "$D1/t*.jpg" -vf "tile=${n}x1" -frames:v 1 $D1/row.png && $S/ffmpeg -loglevel error -y -pattern_type glob -i "$D2/t*.jpg" -vf "tile=${n}x1" -frames:v 1 $D2/row.png
$S/ffmpeg -loglevel error -y -i $D1/row.png -i $D2/row.png -filter_complex "vstack=2" -q:v 3 "$4" && rm -rf "$D1" "$D2" && echo "$4 ($n × 2)"
