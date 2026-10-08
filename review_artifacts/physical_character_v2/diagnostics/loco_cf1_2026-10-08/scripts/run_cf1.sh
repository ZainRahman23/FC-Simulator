#!/bin/sh
# COUNTERFACTUAL DIAGNOSTIC CF-1 — reproduces the 16 CF-1 runs (nothing adopted; e2 qualification unaffected). Run from the worktree root.
# usage: sh review_artifacts/physical_character_v2/diagnostics/loco_cf1_2026-10-08/scripts/run_cf1.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf1}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/loco_probe.mjs
for h in V2-REF V2-165-62 V2-198-92 V2-long-legs; do for f in L R; do
  echo "$h $f forward cf1"; echo "$h $f lateral cf1lat"; done; done |
  xargs -P 8 -n 4 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' --human=$0 --first=$1 --kind=$2 --steps=20 --cf=1 --out='"$OUT"'/$3_$0_$1.json.gz | tail -1'
node sandbox/visual/physchar2/tools/loco_probe_report.mjs "$OUT"
