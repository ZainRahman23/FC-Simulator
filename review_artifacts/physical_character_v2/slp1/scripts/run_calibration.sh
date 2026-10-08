#!/bin/sh
# SLP-1 §4.1 calibration of the support spring frequency: undisturbed D0 at walk / jog / run × f ∈ {1, 2, 4} Hz, each executed twice (rep a / b; end hashes must match).
# Code: prereg 49785b7 + amendments 1–2 (a38e8fa). usage (worktree root): sh review_artifacts/physical_character_v2/slp1/scripts/run_calibration.sh <outdir>
set -e; OUT=${1:-review_artifacts/physical_character_v2/slp1/evidence/calibration}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/slp1_probe.mjs
for rep in a b; do for sp in walk jog run; do for f in 1 2 4; do echo "--speed=$sp --case=D0 --f=$f --out=$OUT/D0_${sp}_f${f}_$rep.json.gz"; done; done; done |
  xargs -P 6 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" 2>&1 | tail -1' _
