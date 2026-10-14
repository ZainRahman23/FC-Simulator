#!/bin/bash
# SP2F addendum REFERENCE composites (third-party footage → sp2f/v2/review/local_reference/, gitignored; never committed):
#   LREF3_*  REFERENCE3 (the addendum's side-slide clip) | SP2F (first pass) | SP2F2 — rear 3/4 (≈ the REFERENCE3 camera: behind the slider)
#   LREF2_*  REFERENCE (the earlier broadcast clip, the SP2F crop sp2f/review/local_reference/REF_*.mp4) | SP2F | SP2F2 — side
# REFERENCE3 alignment: its folded-side landing (knee ≈ 0.38 s, hip ≈ 0.45 s of the clip as recorded) ↔ the sims' first fold-side contact (≈ 0.42 s); the
# window starts 0.12 s before → clip 0.27 s. Its playback rate is unknown (it may be a slowed replay): it is shown AS RECORDED ("1×") and 4× slower ("0.25×").
# The crop follows the slider (hand-tracked centre: x 538 − 125 t until 0.4 s, then − 97 (t − 0.4) until 1.0 s; y 505 + 92 t until 0.6 s; clip pixels).
# usage: sp2f2_compose_reference.sh <scratch S> <REFERENCE3 .mov> <SP2F local_reference dir (REF_1x.mp4, REF_025x.mp4)> <our video dir> <out dir>
S=$1; REF3="$2"; REF2D=$3; VID=$4; OUT=$5; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p "$OUT"
lab() { echo "drawtext=fontfile=$F:text='$1':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6"; }
CX="if(lt(t+0.27\,0.4)\,538-125*(t+0.27)\,if(lt(t+0.27\,1.0)\,488-97*(t+0.27-0.4)\,430))"; CY="if(lt(t+0.27\,0.6)\,505+92*(t+0.27)\,560)"
$S/ffmpeg -loglevel error -y -ss 0.27 -i "$REF3" -vf "crop=360:300:'$CX-180':'$CY-150',scale=480:400,fps=60,$(lab 'REFERENCE3 · as recorded · crop follows the slider')" -frames:v 114 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF3_1x.mp4" || exit 1
$S/ffmpeg -loglevel error -y -ss 0.27 -i "$REF3" -vf "crop=360:300:'$CX-180':'$CY-150',scale=480:400,setpts=4*PTS,fps=60,$(lab 'REFERENCE3 · 4x slower than recorded')" -frames:v 456 -c:v libx264 -pix_fmt yuv420p -crf 20 "$OUT/REF3_025x.mp4" || exit 1
for v in "R34_1x REF3_1x LREF3" "FOCUS_R34_1x REF3_1x LREF3" "R34_025x REF3_025x LREF3" "FOCUS_R34_025x REF3_025x LREF3" "CLEAN_1x $REF2D/REF_1x LREF2" "SIDE_025x $REF2D/REF_025x LREF2" "FOCUS_SIDE_1x $REF2D/REF_1x LREF2"; do set -- $v
  src=$2; [[ $src == /* || $src == */* ]] && src="$src.mp4" || src="$OUT/$src.mp4"
  $S/ffmpeg -loglevel error -y -i "$src" -i "$VID/${1}_F.mp4" -i "$VID/${1}_G.mp4" \
    -filter_complex "[0]scale=480:400,setsar=1[r];[1]scale=480:400[a];[2]scale=480:400[b];[r][a][b]hstack=3" -shortest -c:v libx264 -pix_fmt yuv420p -crf 23 "$OUT/${3}_$1.mp4" || exit 1; done
ls -la "$OUT"
