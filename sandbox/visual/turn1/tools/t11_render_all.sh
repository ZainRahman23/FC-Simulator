#!/bin/bash
# TURN-1.1 review renders (all deterministic, frame-exact). Streams run in parallel (separate Chrome profiles): t11_render_all.sh <stream a|b|c|all>
H0="$(cd "$(dirname "$0")" && pwd)"; OUT="$H0/../../../../review_artifacts/turn1/turn11/review/video"; S=/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad; mkdir -p "$OUT"
BA="$H0/t11_ba.sh"; MX="$H0/t1_matrix.sh"
streamA() {   # before / after at the gameplay camera (zoom 3 = the TURN-1 matrix's player size) and magnified (zoom 6)
  for id in RUN_90R RUN_90L_TOWARD RUN_90R_AWAY RUN_60R RUN_120R RUN_135R RUN_180R SPRINT_90R SPRINT_180R ZIGZAG_RUN SLALOM_JOG JOG_30R; do PROF=a ZOOM=3 "$BA" $id "$OUT/BA_$id.mp4"; done
  for id in RUN_90R RUN_90L_TOWARD RUN_60R RUN_180R SPRINT_180R; do PROF=a ZOOM=6 "$BA" $id "$OUT/BAZ_$id.mp4"; done
}
streamB() {   # close-view before / after, 0.25× hero, silhouettes, real 1080p scale
  PROF=b VIEW=frontRC "$BA" RUN_90R "$OUT/BAC_RUN_90R.mp4"; PROF=b VIEW=frontRC RATE=0.25 T0=1.15 T1=2.25 "$BA" RUN_90R "$OUT/BAC_RUN_90R_025x.mp4"
  PROF=b VIEW=rearC "$BA" RUN_90R "$OUT/BAR_RUN_90R.mp4"; PROF=b VIEW=nearC "$BA" SPRINT_180R "$OUT/BAC_SPRINT_180R.mp4"; PROF=b VIEW=rearRC "$BA" RUN_180R "$OUT/BAC_RUN_180R.mp4"
  PROF=b VIEW=frontRC "$BA" RUN_60R "$OUT/BAC_RUN_60R.mp4"; PROF=b VIEW=rearC "$BA" RUN_60R "$OUT/BAR_RUN_60R.mp4"
  for id in RUN_90R RUN_90L_TOWARD SPRINT_180R RUN_60R RUN_180R; do PROF=b ZOOM=6 SIL=1 "$BA" $id "$OUT/SIL_$id.mp4"; done
  for id in RUN_90R RUN_90L_TOWARD SPRINT_180R ZIGZAG_RUN; do PROF=b ZOOM=2 W=960 H=540 "$BA" $id "$OUT/REAL_$id.mp4"; done
}
streamC() {   # TURN-1.1 focused matrix with diagnostics (gameplay zoom 2.2 | close | top-down debug), continuous input, mirroring, 0.25× diagnostics
  export PROFX=c; for id in RUN_90R RUN_90L_MIRROR RUN_60R RUN_120R RUN_135R RUN_180R SPRINT_90R SPRINT_180R SPRINT_180L_MIRROR JOG_90R ZIGZAG_RUN ZIGZAG_JOG SLALOM_JOG SLALOM_SPRINT JOG_30R CONT_CURVE CONT_PRE_RETARGET CONT_PRE_ABANDON CONT_PRE_FLIP CONT_POST; do
    VA=nearC VB=topClose XQ="&diag=1" DV=B "$MX" "$OUT" $id; done
  for id in RUN_90R SPRINT_180R RUN_60R CONT_PRE_RETARGET; do RATE=0.25 SUF=_025x T0=0.9 T1=${T1X:-2.9} VA=frontRC VB=topClose XQ="&diag=1" DV=B "$MX" "$OUT" $id; done
}
case "$1" in a) streamA;; b) streamB;; c) streamC;; all) streamA & streamB & streamC & wait;; esac
