#!/bin/sh
# COUNTERFACTUAL DIAGNOSTIC CF-3 (= CF-1 + CF-2 + CF-3 walking frame, forward only) — reproduces Stage 1 (quasi-static, 20 steps; with the harness's original 3 s release window and
# with 10 s) and Stage 2 (the cadence ladder: V2-REF 5 / 3 / 2 / 1.5 s nominal; the boundary pair 2 / 1.5 s on the other bodies). Nothing adopted. Run from the worktree root.
# Ladder rule: the three settling intervals (transfer 4 s, release dwell 0.5 s, DS plan 4 s = 8.5 s) scale uniformly so that with the unchanged liftoff + swing (~0.73 s) the
# nominal cycle is C: s = (C − 0.73) / 8.5; Ttr = Tds = 4s, rel = 0.5s.
# usage: sh review_artifacts/physical_character_v2/diagnostics/loco_cf3_2026-10-08/scripts/run_cf3.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf3}; mkdir -p "$OUT/stage1_relmax3" "$OUT/stage1" "$OUT/stage2"; T=sandbox/visual/physchar2/tools/loco_probe.mjs; E="V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13"
lv() { python3 -c "s=($1-0.73)/8.5; print(f'{4*s:.4f} {4*s:.4f} {0.5*s:.4f}')"; }
{ for h in V2-REF V2-165-62 V2-198-92 V2-long-legs; do
    echo "--human=$h --first=L --steps=20 --cf=3 --out=$OUT/stage1_relmax3/s1_${h}_L.json.gz"
    echo "--human=$h --first=L --steps=20 --cf=3 --relMax=10 --out=$OUT/stage1/s1_${h}_L.json.gz"; done
  for C in 5 3 2 1.5; do set -- $(lv $C); echo "--human=V2-REF --first=L --steps=20 --cf=3 --relMax=10 --Ttr=$1 --Tds=$2 --rel=$3 --out=$OUT/stage2/c${C}_V2-REF_L.json.gz"; done
  for C in 2 1.5; do set -- $(lv $C); for h in V2-165-62 V2-198-92 V2-long-legs; do echo "--human=$h --first=L --steps=20 --cf=3 --relMax=10 --Ttr=$1 --Tds=$2 --rel=$3 --out=$OUT/stage2/c${C}_${h}_L.json.gz"; done; done; } |
  xargs -P 8 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" | tail -1' _
node sandbox/visual/physchar2/tools/loco_probe_report.mjs "$OUT/stage1"
