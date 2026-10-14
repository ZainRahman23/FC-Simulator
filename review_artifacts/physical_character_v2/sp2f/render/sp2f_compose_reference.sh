#!/bin/bash
# SP2F REFERENCE composites (third-party broadcast footage → sp2f/review/local_reference/, gitignored; never committed): REFERENCE | SP2D | SP2E | SP2F.
# Alignment: the reference's first non-sole turf contact (f278, video 4.633 s; ≈ 0.4× slow motion) ↔ the sims' first fold-side contact (≈ 0.415 s). The
# window starts at sim 0.30 s = 0.115 s before contact → reference video 4.633 − 0.115/0.4 = 4.346 s. The crop follows the slider (sp2d/render/sp2d_ref_track.py).
# The reference lasts ≈ 2.28 s real after contact (it slides at ≈ 7.5 m/s and starts to get up at ≈ +1.13 s).
# usage: sp2f_compose_reference.sh <scratch S> <broadcast ref.mov> <our video dir> <out dir>
S=$1; REF="$2"; VID=$3; OUT=$4; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6"; }
REFD="$(dirname "$REF")"; TR=$S/sp2f/reftrack; python3 -I "$(dirname "$0")/../../sp2d/render/sp2d_ref_track.py" $S/ffmpeg "$REF" "$REFD/analysis/REFERENCE2_tracks.json" 4.346 $TR > /dev/null || exit 1
# 1×: 114 frames (1.9 s); 0.25×: 456 frames
$S/ffmpeg -loglevel error -y -framerate 60 -i $TR/c%05d.png -vf "setpts=0.4*PTS,fps=60,tpad=stop_mode=clone:stop_duration=4,$(lab 'REFERENCE · real time (retimed) · crop follows the slider')" -frames:v 114 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_1x.mp4" || exit 1
$S/ffmpeg -loglevel error -y -framerate 60 -i $TR/c%05d.png -vf "setpts=1.6*PTS,fps=60,tpad=stop_mode=clone:stop_duration=8,$(lab 'REFERENCE · 0.25× real · crop follows the slider')" -frames:v 456 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_025x.mp4" || exit 1
for v in "CLEAN_1x REF_1x" "SIDE_025x REF_025x" "R34_025x REF_025x" "F34_025x REF_025x" "FOCUS_SIDE_1x REF_1x" "FOCUS_R34_025x REF_025x"; do set -- $v
  $S/ffmpeg -loglevel error -y -i "$OUT/$2.mp4" -i "$VID/${1}_D.mp4" -i "$VID/${1}_E.mp4" -i "$VID/${1}_F.mp4" \
    -filter_complex "[0]scale=480:400,setsar=1[r];[1]scale=480:400[a];[2]scale=480:400[b];[3]scale=480:400[c];[r][a][b][c]hstack=4" -shortest -c:v libx264 -pix_fmt yuv420p -crf 23 "$OUT/LREF4_$1.mp4" || exit 1; done
ls -la "$OUT"
