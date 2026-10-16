#!/bin/bash
# contact sheet: one row per clip (t1_matrix.sh layout), 9 crops of a view region from the request (+0 … +1.6 s); t1_sheet.sh <clip dir> <out.jpg> <region: near|top|game> <ids…>
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; DIR=$1; OUT=$2; REG=$3; shift 3; T=$(mktemp -d "$S/t1/sheet.XXXX")
case $REG in near) CROP="482:358:798:0";; top) CROP="482:358:798:362";; game) CROP="560:420:118:150";; esac
i=0; for id in "$@"; do i=$((i+1)); r=$(printf "%03d" $i)
  for k in 0 1 2 3 4 5 6 7 8; do ts=$(python3 -c "print(0.5 + 0.2*$k)"); $S/ffmpeg -loglevel error -y -ss $ts -i $DIR/$id.mp4 -frames:v 1 -vf "crop=$CROP,scale=240:-2" $T/r${r}_$k.png; done
  $S/ffmpeg -loglevel error -y -i $T/r${r}_0.png -i $T/r${r}_1.png -i $T/r${r}_2.png -i $T/r${r}_3.png -i $T/r${r}_4.png -i $T/r${r}_5.png -i $T/r${r}_6.png -i $T/r${r}_7.png -i $T/r${r}_8.png -filter_complex "hstack=9" $T/row_$r.png
done
$S/ffmpeg -loglevel error -y -pattern_type glob -i "$T/row_*.png" -vf "tile=1x$i" -frames:v 1 -q:v 3 $OUT && rm -rf $T && echo "$OUT ($i rows)"
