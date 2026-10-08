#!/bin/sh
# CF-5 SPEED LADDER (diagnostic stress test of the validated CF-5 continuous walk; nothing adopted, no new mechanism) — reproduces every run as executed:
#   L0 = CF-5's own evidence (Tst 1.0 s, swing 0.6 s: ../loco_cf5_2026-10-08/evidence/staged/), not re-run here;
#   L1 Tst 0.70 / swing 0.55 — V2-REF 4 / 10 / 20, then light / short, heavy / tall, long-legs 4 / 10 / 20 (run after L2's mixed result, to give each body a passing level);
#   L2 Tst 0.50 / swing 0.50 — V2-REF 4 / 10 / 20, then the three bodies 4 / 10 / 20;
#   L3 Tst 0.35 / swing 0.45 — V2-REF 4 / 10 / 20 (first unsuccessful level); L2b Tst 0.42 / swing 0.47 — V2-REF 4 / 10 / 20 (the one bisection between L2 and L3).
# Only the cadence quantities CF-5 already takes are varied (the transfer duration --Tst and the swing duration --Tsw); S stays 0.06 m (the planner's corridor caps it at 0.065).
# Run from the worktree root; deterministic: compare the end hashes with evidence/. usage: sh .../scripts/run_speed_ladder.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf5_speed}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/loco_probe.mjs; S=review_artifacts/physical_character_v2/diagnostics/loco_cf5_speed_2026-10-08/scripts
lvl() { case $1 in L1) echo "0.7 0.55";; L2) echo "0.5 0.5";; L2b) echo "0.42 0.47";; L3) echo "0.35 0.45";; esac; }
{ for L in L1 L2; do set -- $(lvl $L); for h in V2-REF V2-165-62 V2-198-92 V2-long-legs; do for N in 4 10 20; do echo "--human=$h --first=L --steps=$N --cf=5 --Tst=$1 --Tsw=$2 --out=$OUT/${L}_${h}_s$N.json.gz"; done; done; done
  for L in L2b L3; do set -- $(lvl $L); for N in 4 10 20; do echo "--human=V2-REF --first=L --steps=$N --cf=5 --Tst=$1 --Tsw=$2 --out=$OUT/${L}_V2-REF_s$N.json.gz"; done; done; } |
  xargs -P 8 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" | tail -1' _
python3 $S/ladder_analysis.py "$OUT"/*_s20.json.gz > "$OUT/ladder_analysis.txt"
python3 $S/../../loco_cf5_2026-10-08/scripts/cf5_continuity.py "$OUT"/*.json.gz > "$OUT/continuity.txt"
python3 $S/plot_ladder.py "$OUT/ladder_trends.png" "$OUT" review_artifacts/physical_character_v2/diagnostics/loco_cf5_2026-10-08/evidence/staged
