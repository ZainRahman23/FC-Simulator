#!/bin/bash
# TURN-1 review renders: t1_matrix.sh <out dir> <scenario ids…> — per scenario one 1× clip (gameplay camera CAMERA_V1 zoom 2.2 | close "near" | top-down debug)
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; OUT="$1"; shift; mkdir -p "$OUT"
for id in "$@"; do
  dur=$(node -e "const s=require('$(dirname "$0")/../turn1_scenarios.js').get('$id'); console.log(s.dur)")
  t0=${T0:-0.5}; t1=$(python3 -c "print(min($dur, ${T1:-4.2}))")
  PUPPETEER_NODE_MODULES=$S/node_r/node_modules FFMPEG=$S/ffmpeg node "$(dirname "$0")/t1_capture.cjs" --q "scn=$id&zoom=${ZOOM:-2.2}&A=${VA:-near}&B=${VB:-topClose}&diagViews=${DV:-B}&body=${BODY:-t11}${XQ:-}" --out "$OUT/${id}${SUF:-}.mp4" --t0 $t0 --t1 $t1 --rate ${RATE:-1} --w ${W:-1280} --h ${H:-720} --profile $S/t1/${PROFX:-prof} >/dev/null 2>&1 && echo "ok $id" || echo "FAIL $id"
done
