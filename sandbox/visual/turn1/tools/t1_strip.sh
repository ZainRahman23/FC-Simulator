#!/bin/bash
# frame strip of one scenario: t1_strip.sh <scn> <view> <t0> <t1> <dt> <cols> <out.jpg> [extra query]
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; D=$(mktemp -d "$S/t1/strip.XXXX")
T=$(python3 -c "import sys; a,b,d=map(float,sys.argv[1:4]); n=int(round((b-a)/d))+1; print(','.join(f'{a+i*d:.3f}' for i in range(n)))" $3 $4 $5)
PUPPETEER_NODE_MODULES=$S/node_r/node_modules node "$(dirname "$0")/t1_capture.cjs" --q "scn=$1&single=$2&$8" --out $D --stills "$T" --w ${W:-640} --h ${H:-460} --profile $S/t1/prof >/dev/null 2>&1 || { echo capture failed; exit 1; }
n=$(ls $D/*.jpg | wc -l | tr -d ' '); rows=$(( (n + $6 - 1) / $6 ))
$S/ffmpeg -loglevel error -y -pattern_type glob -i "$D/t*.jpg" -vf "tile=${6}x${rows}" -frames:v 1 -q:v 3 "$7" && rm -rf "$D" && echo "$7 ($n frames)"
