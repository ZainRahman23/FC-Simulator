#!/bin/sh
# SLP-2 calibration (SLP2_PREREGISTRATION.md §4.2, frozen 03455b8): undisturbed D0, version 2, walk / jog / run × f ∈ {1, 2, 4} Hz, each executed twice (a / b).
# usage (worktree root): sh review_artifacts/physical_character_v2/slp2/scripts/run_calibration.sh <outdir>
set -e; OUT=${1:-review_artifacts/physical_character_v2/slp2/evidence/calibration}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/slp1_probe.mjs
for rep in a b; do for sp in walk jog run; do for f in 1 2 4; do echo "--version=2 --speed=$sp --case=D0 --f=$f --out=$OUT/D0_${sp}_f${f}_$rep.json.gz"; done; done; done |
  xargs -P 6 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" 2>&1 | tail -1' _
