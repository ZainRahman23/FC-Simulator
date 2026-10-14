#!/bin/bash
# Body-friction sweep REFERENCE material (third-party broadcast footage → fsweep/review/local_reference/, gitignored).
# Alignment: the reference's first non-sole turf contact (f278, video 4.633 s; ≈ 0.4× slow motion → t_real = 0.4·Δvideo, REFERENCE2_ANALYSIS.md)
# ↔ the sim's ground entry (first non-boot contact, 0.4125 s after the plant). 1× views start at sim 0.25 s (reference real −0.1625 s → video 4.227 s),
# 0.25× views at sim 0.35 s (real −0.0625 s → video 4.477 s). The reference enters at ≈ 9 m/s, the sim at 5.0 m/s: compare the look and the
# deceleration, not the distance.
# usage: fs_compose_reference.sh <scratch S> <broadcast ref.mov> <our video dir> <out dir>
S=$1; REF="$2"; VID=$3; OUT=$4; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6"; }
# singles (same timing as our per-condition singles: 1× 2.5 s / 2.75 s; 0.25× 4.6 s)
$S/ffmpeg -loglevel error -y -ss 4.227 -t 7.0 -i "$REF" -vf "setpts=0.4*(PTS-STARTPTS),fps=60,crop=480:400:250:220,$(lab 'REFERENCE broadcast · real time (retimed)')" -frames:v 165 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_1x.mp4"
$S/ffmpeg -loglevel error -y -ss 4.477 -t 3.0 -i "$REF" -vf "setpts=1.6*(PTS-STARTPTS),fps=60,crop=480:400:250:220,$(lab 'REFERENCE broadcast · 0.25× real')" -frames:v 277 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_025x.mp4"
# REFERENCE | six conditions (grid 3 × 2), synchronised
for v in "CLEAN_1x REF_1x" "DIAG_025x REF_025x" "CLEAN_025x REF_025x" "GAME_1x REF_1x"; do set -- $v
  $S/ffmpeg -loglevel error -y -i "$OUT/$2.mp4" -i "$VID/GRID_$1.mp4" -filter_complex "[0:v]scale=-2:868,pad=iw:868:0:0[a];[a][1:v]hstack=2" -shortest -c:v libx264 -pix_fmt yuv420p -crf 23 "$OUT/REF_GRID_$1.mp4"; done
ls -la "$OUT"
