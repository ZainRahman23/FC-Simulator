#!/bin/bash
# SP2A reference composites (presentation only). Both references are third-party footage: outputs go to sp2a/review/local_reference/ (gitignored).
#  • TACKLE: REFERENCE (broadcast, ≈ 0.4× slow motion → retimed to real time; REFERENCE2_ANALYSIS.md) | SP2 | SP2A — aligned at the plant touchdown
#    (reference real −0.12 s before the trailing shin touchdown, video 4.333 s; sim t = 0).
#  • START: START REFERENCE (stylised trailer, 60 fps taken as real time) | SP2 | SP2A — aligned at the commitment / last support (reference f80
#    = 1.333 s ↔ sim t = 0 plant touchdown); the sim video covers t −0.70 … +0.50 s.
# usage: sp2a_compose_reference.sh <scratch S> <broadcast ref.mov> <start ref.mov> <our video dir> <out dir>
S=$1; REF="$2"; START="$3"; VID=$4; OUT=$5; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=10:y=10:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6"; }
for r in "1x 0.4 1.6" "025x 1.6 1.25"; do set -- $r; id=$1; k=$2; dur=$3
  $S/ffmpeg -loglevel error -y -ss 4.333 -t $(echo "$dur / 0.4 + 0.2" | bc -l) -i "$REF" -i $VID/CMP_$id.mp4 -filter_complex "[0:v]setpts=${k}*(PTS-STARTPTS),fps=60,crop=480:400:250:220,scale=520:434,$(lab "REFERENCE broadcast (retimed to real time) ${id/x/×}")[a];[1:v]crop=960:434:0:0[b];[a][b]hstack=2" -frames:v $([ $id = 1x ] && echo 96 || echo 300) -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_SP2_SP2A_TACKLE_$id.mp4"
done
for r in "1x 1 73" "025x 4 289"; do set -- $r; id=$1; k=$2; n=$3
  $S/ffmpeg -loglevel error -y -ss 0.633 -t 1.3 -i "$START" -i $VID/START_$id.mp4 -filter_complex "[0:v]setpts=${k}*(PTS-STARTPTS),fps=60,crop=1500:1150:1250:180,scale=-2:454,$(lab "START REFERENCE ${id/x/×} (60 fps = real time, assumed)")[a];[a][1:v]hstack=2" -frames:v $n -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/START_REF_SP2_SP2A_$id.mp4"
done
ls -la "$OUT"
