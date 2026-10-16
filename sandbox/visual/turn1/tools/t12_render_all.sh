#!/bin/bash
# TURN-1.2 review renders (deterministic, frame-exact), three parallel streams (separate Chrome profiles): t12_render_all.sh <a|b|c>
H0="$(cd "$(dirname "$0")" && pwd)"; OUT="$H0/../../../../review_artifacts/turn1/turn12/review/video"; mkdir -p "$OUT"; BA="$H0/t11_ba.sh"; MX="$H0/t1_matrix.sh"
export BODIES="t1 t11 t12"
streamA() {   # THREE-WAY at the gameplay camera, synchronized 1× (TURN-1 | TURN-1.1 | TURN-1.2), 3× zoom = the TURN-1 matrix's player size
  for id in RUN_60R RUN_90R RUN_150R SPRINT_150R SPRINT_180R JOG_180R RUN_135R RUN_120R SPRINT_120R JOG_150R SPRINT_90R RUN_180R; do PROF=a ZOOM=3 W=560 H=520 "$BA" $id "$OUT/W3_$id.mp4"; done
}
streamB() {   # three-way magnified (6×), close views, real 1080p scale; TURN-1.2 0.25×
  for id in SPRINT_180R RUN_135R JOG_180R RUN_150R; do PROF=b ZOOM=6 W=560 H=520 "$BA" $id "$OUT/W3Z_$id.mp4"; done
  for id in SPRINT_180R RUN_135R JOG_180R; do PROF=b VIEW=nearC W=560 H=520 "$BA" $id "$OUT/W3C_$id.mp4"; done
  for id in SPRINT_180R RUN_135R; do PROF=b ZOOM=2 W=640 H=540 "$BA" $id "$OUT/W3R_$id.mp4"; done
  BODIES=t12 PROF=b VIEW=frontRC RATE=0.25 T0=0.9 T1=2.9 W=900 H=600 "$BA" SPRINT_180R "$OUT/T12_SPRINT_180R_025x.mp4"; BODIES=t12 PROF=b VIEW=rearRC RATE=0.25 T0=0.9 T1=2.7 W=900 H=600 "$BA" RUN_135R "$OUT/T12_RUN_135R_025x.mp4"
}
streamC() {   # the TURN-1.2 review matrix with diagnostics (gameplay 2.2× + close + top-down), curves, zig-zag, aborted / retargeted reversals
  export PROFX=c BODY=t12; for id in JOG_60R JOG_90R JOG_120R JOG_150R JOG_180R RUN_60R RUN_90R RUN_120R RUN_150R RUN_180R SPRINT_60R SPRINT_90R SPRINT_120R SPRINT_150R SPRINT_180R \
    LOW_180R JOG_30R SLALOM_JOG ZIGZAG_RUN REV_ABORT_60 REV_CANCEL REV_ABORT_RUN REV_RETARGET REV_FLIP SPRINT_180L_MIRROR; do
    VA=nearC VB=topClose XQ="&diag=1" DV=B "$MX" "$OUT" $id; done
}
case "$1" in a) streamA;; b) streamB;; c) streamC;; esac
