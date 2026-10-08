#!/bin/sh
# SLP-1b calibration (SLP1b_AMENDMENT.md §5.1, frozen 1137244): undisturbed D0, driver version 1b, walk / jog / run × f ∈ {1, 2, 4} Hz, each executed twice (a / b).
# usage (worktree root): sh review_artifacts/physical_character_v2/slp1/scripts/run_calibration_1b.sh <outdir>
set -e; OUT=${1:-review_artifacts/physical_character_v2/slp1/evidence/calibration_1b}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/slp1_probe.mjs
for rep in a b; do for sp in walk jog run; do for f in 1 2 4; do echo "--version=1b --speed=$sp --case=D0 --f=$f --out=$OUT/D0_${sp}_f${f}_$rep.json.gz"; done; done; done |
  xargs -P 6 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" 2>&1 | tail -1' _
