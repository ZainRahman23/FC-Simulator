#!/bin/bash
# SP2D REFERENCE composites (third-party broadcast footage → sp2d/review/local_reference/, gitignored; never committed): A | SP2C | SP2D | REFERENCE.
# Alignment: the reference's first non-sole turf contact (f278, video 4.633 s; ≈ 0.4× slow motion → t_real = 0.4·Δvideo) ↔ the sims' first fold-side
# contact (≈ 0.415 s). The SP2D window starts at sim 0.30 s = 0.115 s before contact → reference video 4.633 − 0.115/0.4 = 4.346 s. The clip holds
# ≈ 2.28 s real after contact, then its last frame is held (labelled). The reference slides at ≈ 7.5 m/s and lies down within 0.3 s; our 5.0 m/s slides
# take ≈ 2.4 s — compare the organisation and the order of events, not the clock.
# usage: sp2d_compose_reference.sh <scratch S> <broadcast ref.mov> <our video dir> <out dir>
S=$1; REF="$2"; VID=$3; OUT=$4; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6"; }
end() { echo "drawtext=fontfile=$F:text='reference clip ends':x=8:y=h-28:fontsize=15:fontcolor=yellow:box=1:boxcolor=black@0.6:enable='gte(t,$1)'"; }
# the reference crop FOLLOWS the slider (sp2d_ref_track.py: REFERENCE2 auto tracks, 300 × 250 px window → 480 × 400), frames from video 4.346 s
REFD="$(dirname "$REF")"; TR=$S/sp2d/reftrack; python3 -I "$(dirname "$0")/sp2d_ref_track.py" $S/ffmpeg "$REF" "$REFD/analysis/REFERENCE2_tracks.json" 4.346 $TR > /dev/null || exit 1
# 1×: 216 frames (3.6 s); the reference ends 2.28 + 0.115 = 2.395 s into the window
$S/ffmpeg -loglevel error -y -framerate 60 -i $TR/c%05d.png -vf "setpts=0.4*PTS,fps=60,tpad=stop_mode=clone:stop_duration=6,$(lab 'REFERENCE · real time (retimed) · crop follows the slider'),$(end 2.39)" -frames:v 216 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_1x.mp4" || exit 1
# 0.5×: 432 frames; the reference ends at 4.79 s into the video
$S/ffmpeg -loglevel error -y -framerate 60 -i $TR/c%05d.png -vf "setpts=0.8*PTS,fps=60,tpad=stop_mode=clone:stop_duration=8,$(lab 'REFERENCE · 0.5× real · crop follows the slider'),$(end 4.79)" -frames:v 432 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF_05x.mp4" || exit 1
for v in "SIDE_1x REF_1x" "GAME_1x REF_1x" "SIDE_05x REF_05x" "R34_05x REF_05x" "F34_05x REF_05x" "DIAG_05x REF_05x"; do set -- $v
  $S/ffmpeg -loglevel error -y -i "$VID/${1}_A.mp4" -i "$VID/${1}_C.mp4" -i "$VID/${1}_D.mp4" -i "$OUT/$2.mp4" -filter_complex "[0]scale=480:400[a];[1]scale=480:400[b];[2]scale=480:400[c];[3]scale=480:400,setsar=1[r];[a][b][c][r]hstack=4" -shortest -c:v libx264 -pix_fmt yuv420p -crf 23 "$OUT/LREF4_$1.mp4" || exit 1; done
ls -la "$OUT"
