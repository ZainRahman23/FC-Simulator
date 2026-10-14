#!/bin/bash
# SLIDE-PHYS-2 reference composites (presentation only; the reference is third-party broadcast footage: outputs stay OUT of Git).
# The reference is ≈ 0.4× slow motion (REFERENCE2_ANALYSIS.md): real time = video time × 0.4, so a "1×" composite plays it at 2.5× video speed.
S=$1; REF="$2"; OUT=$3; F=/System/Library/Fonts/Helvetica.ttc; mkdir -p $OUT; cd $OUT
for r in "1x 0.4" "05x 0.8" "025x 1.6"; do set -- $r; id=$1; k=$2
  # tackle: real −0.25 s before the trailing shin touchdown (video 4.633 s) → 1.45 s real
  $S/ffmpeg -loglevel error -y -ss 4.008 -t 3.7 -i "$REF" -i $S/sp2/fin/vidc/CMPSRC_$id.mp4 -filter_complex "[0:v]setpts=${k}*(PTS-STARTPTS),fps=60,crop=480:400:250:220,scale=576:480,pad=576:514:0:0:0x0b0f0d,drawtext=fontfile=${F}:text='REFERENCE (broadcast, real time)':x=8:y=8:fontsize=14:fontcolor=white:box=1:boxcolor=0x000000AA,tpad=stop_mode=clone:stop_duration=60[r];[r][1:v]hstack=inputs=2[o0];[o0]trim=duration=$(python3 -c "print(1.45/(0.4/$k)*0.4/0.4*(0.4/$k)**0 if False else 1.45*$k/0.4+0.05)")[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 21 -r 60 CMP_REF_SP1_SP2_$id.mp4
  # receiver: real −0.3 s before the dribbler's foot meets the slider's shin (video 5.22 s) → 2.3 s real
  $S/ffmpeg -loglevel error -y -ss 4.47 -t 5.8 -i "$REF" -i $S/sp2/fin/vidc/CMPRECV_$id.mp4 -filter_complex "[0:v]setpts=${k}*(PTS-STARTPTS),fps=60,crop=520:430:280:200,scale=576:480,pad=576:514:0:0:0x0b0f0d,drawtext=fontfile=${F}:text='REFERENCE RECEIVER (real time)':x=8:y=8:fontsize=14:fontcolor=white:box=1:boxcolor=0x000000AA,tpad=stop_mode=clone:stop_duration=60[r];[r][1:v]hstack=inputs=2[o0];[o0]trim=duration=$(python3 -c "print(2.3*$k/0.4+0.05)")[o]" -map "[o]" -c:v libx264 -pix_fmt yuv420p -crf 21 -r 60 CMP_REF_RECV_$id.mp4
done
# the reference itself, cropped, at real time / 0.5× / 0.25× real (= 2.5× / 1.25× / 0.625× video speed) and as recorded
$S/ffmpeg -loglevel error -y -i "$REF" -c:v libx264 -pix_fmt yuv420p -crf 20 REFERENCE_as_recorded.mp4
for r in "1x 0.4" "05x 0.8" "025x 1.6"; do set -- $r; $S/ffmpeg -loglevel error -y -ss 3.8 -t 5.0 -i "$REF" -vf "setpts=$2*(PTS-STARTPTS),fps=60,crop=520:430:250:200,scale=768:-2" -c:v libx264 -pix_fmt yuv420p -crf 20 REFERENCE_tackle_$1.mp4; done
