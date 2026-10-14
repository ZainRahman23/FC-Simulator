#!/bin/bash
# SP2C REFERENCE material (third-party broadcast footage → sp2c/review/local_reference/, gitignored; never committed).
# Alignment (as FSWEEP): the reference's first non-sole turf contact (f278, video 4.633 s; ≈ 0.4× slow motion → t_real = 0.4·Δvideo,
# REFERENCE2_ANALYSIS.md) ↔ the sim's first fold-side contact (≈ 0.415 s after the plant). The clip holds ≈ 1.85 s real before that contact and
# ≈ 2.28 s after it (then its last frame is held, labelled); it does not show the end of the slide, so the end-of-slide views have no reference.
# The reference enters at ≈ 9 m/s, the sim at 5.0 m/s: compare the body organisation, not the distance.
# Singles: REF_1x (sim −0.30 s → 4.50 s, 1×), REF_025x (−0.20 → 1.00 s, 0.25×), REF_FOLD_025x (−0.30 → 0.92 s, 0.25×).
# Composites, in the brief's order: LREF_<view> = REFERENCE | SP2A F100 | SP2A F50 | SP2A F25 | BEST SP2C (F37.5); LREF37_<view> = REFERENCE | SP2A F37.5 | SP2C F37.5
# usage: sp2c_compose_reference.sh <scratch S> <broadcast ref.mov> <our video dir> <out dir>
S=$1; REF="$2"; VID=$3; OUT=$4; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6"; }
end() { echo "drawtext=fontfile=$F:text='reference clip ends':x=8:y=h-28:fontsize=15:fontcolor=yellow:box=1:boxcolor=black@0.6:enable='gte(t,$1)'"; }
CROP="crop=480:400:250:220"
# 1×: start 0.715 s real before contact (video 4.633 − 0.715/0.4 = 2.846 s); 288 frames at 60 fps; the clip has 2.28 s real after contact → ends at 2.995 s
$S/ffmpeg -loglevel error -y -ss 2.846 -i "$REF" -vf "setpts=0.4*(PTS-STARTPTS),fps=60,$CROP,tpad=stop_mode=clone:stop_duration=6,$(lab 'REFERENCE broadcast · real time (retimed)'),$(end 2.99)" -frames:v 288 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_1x.mp4" || exit 1
# 0.25×: start 0.615 s real before contact (video 3.096 s); 289 frames
$S/ffmpeg -loglevel error -y -ss 3.096 -i "$REF" -vf "setpts=1.6*(PTS-STARTPTS),fps=60,$CROP,tpad=stop_mode=clone:stop_duration=6,$(lab 'REFERENCE broadcast · 0.25× real')" -frames:v 289 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_025x.mp4" || exit 1
# fold close-up, 0.25×: start 0.715 s real before contact (video 2.846 s); 293 frames
$S/ffmpeg -loglevel error -y -ss 2.846 -i "$REF" -vf "setpts=1.6*(PTS-STARTPTS),fps=60,$CROP,tpad=stop_mode=clone:stop_duration=6,$(lab 'REFERENCE broadcast · 0.25× real')" -frames:v 293 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_FOLD_025x.mp4" || exit 1
five() { $S/ffmpeg -loglevel error -y -i "$OUT/$2.mp4" -i "$VID/${1}_A100.mp4" -i "$VID/${1}_A50.mp4" -i "$VID/${1}_A25.mp4" -i "$VID/${1}_C37.mp4" \
  -filter_complex "[0]scale=384:320,setsar=1[r];[1]scale=384:320[a];[2]scale=384:320[b];[3]scale=384:320[c];[4]scale=384:320[d];[r][a][b][c][d]hstack=5" -shortest -c:v libx264 -pix_fmt yuv420p -crf 23 "$OUT/LREF_$1.mp4" || exit 1; }
three() { $S/ffmpeg -loglevel error -y -i "$OUT/$2.mp4" -i "$VID/${1}_A37.mp4" -i "$VID/${1}_C37.mp4" \
  -filter_complex "[0]scale=480:400,setsar=1[r];[1]scale=480:400[a];[2]scale=480:400[b];[r][a][b]hstack=3" -shortest -c:v libx264 -pix_fmt yuv420p -crf 22 "$OUT/LREF37_$1.mp4" || exit 1; }
for v in "CLOSE_1x REF_1x" "GAME_1x REF_1x" "SIDE_025x REF_025x" "R34_025x REF_025x" "DIAG_025x REF_025x" "FOLD_025x REF_FOLD_025x" "FOLDS_025x REF_FOLD_025x"; do set -- $v; five $1 $2; three $1 $2; done
ls -la "$OUT"
