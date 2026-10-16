#!/bin/bash
# TURN-1.1 before / after video: t11_ba.sh <scn> <out.mp4> — left = TURN-1 procedural body, right = TURN-1.1 authored body, the same camera, instants and
# path (identical plants). env: VIEW (game | a close view), ZOOM (game view), W H (per panel), RATE, T0 T1 (default: 0.6 s → plant toe-off + 0.9 s), SIL=1, XQ
S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; H0="$(dirname "$0")"; id=$1; out=$2; mkdir -p "$(dirname "$out")" $S/t1
rng=$(node -e "
const {X,T}=require('$H0/t1_metrics.cjs'); const S=require('$H0/../turn1_scenarios.js'); const s=S.get('$id'), A=T.t1Make(X.skel,s.init); for(let k=0;k<s.dur*240;k++) T.t1Step(A,T.t1Input(s,k/240));
const to=A.events.filter(e=>e[1]==='plantTO').pop(), last=s.cmds.length?s.cmds[s.cmds.length-1].t:1; const t1=Math.min(s.dur, Math.max(to?to[0]+0.9:last+1.6, last+1.2)); console.log((+'${T0:-0.6}').toFixed(3), (+'${T1:-0}'||t1).toFixed(3));")
set -- $rng; a=$1; b=$2; P=$(mktemp -d "$S/t1/ba.XXXX"); SILF=""; [ "${SIL:-0}" = 1 ] && SILF="--sil"
for body in t1 t11; do
  PUPPETEER_NODE_MODULES=$S/node_r/node_modules FFMPEG=$S/ffmpeg node "$H0/t1_capture.cjs" --q "scn=$id&single=${VIEW:-game}&zoom=${ZOOM:-3}&lab=short&body=$body${SIL:+&sil=$SIL}${XQ:-}" --out $P/$body.mp4 --t0 $a --t1 $b --rate ${RATE:-1} --w ${W:-640} --h ${H:-600} --profile $S/t1/prof_${PROF:-a} $SILF >/dev/null 2>&1 || { echo "FAIL $id $body"; rm -rf $P; exit 1; }
done
$S/ffmpeg -loglevel error -y -i $P/t1.mp4 -i $P/t11.mp4 -filter_complex "[0][1]hstack=2" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$out" && rm -rf $P && echo "ok $out ($a → $b s)"
