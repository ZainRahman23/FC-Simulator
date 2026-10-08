#!/bin/sh
# COUNTERFACTUAL DIAGNOSTIC CF-2 (= CF-1 + CF-2, forward only) — reproduces the staged 2-step runs and the 20-step runs (nothing adopted). Run from the worktree root.
# usage: sh review_artifacts/physical_character_v2/diagnostics/loco_cf2_2026-10-08/scripts/run_cf2.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf2}; mkdir -p "$OUT/staged_2step"; T=sandbox/visual/physchar2/tools/loco_probe.mjs
for h in V2-REF V2-165-62 V2-198-92 V2-long-legs; do for f in L R; do echo "$h $f"; done; done |
  xargs -P 8 -n 2 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' --human=$0 --first=$1 --steps=2 --cf=2 --out='"$OUT"'/staged_2step/s2_$0_$1.json.gz | tail -1;
    V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' --human=$0 --first=$1 --steps=20 --cf=2 --out='"$OUT"'/cf2_$0_$1.json.gz | tail -1'
node sandbox/visual/physchar2/tools/loco_probe_report.mjs "$OUT"
