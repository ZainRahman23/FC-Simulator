#!/bin/sh
# CF-6 walking-gait counterfactual — reproduces every run of the frozen protocol (CF6_PREREGISTRATION.md @1e98e1d) exactly as executed. Diagnostic only. Run from the worktree root.
#   L1 (0.4 m/s; V2 step 0.38 m, cadence 63.2 steps/min, each DS 0.4104 s, single support 0.5396 s) — V2-REF, stage A (fails at step 2: §4 bracketing follows)
#   bracket 0.2 m/s (step-length-related diagnosis → L1 cadence / timing held, step 60·v/63.2 = 0.19 m) — stages A / B / C (C fails at step 9)
#   bracket 0.1 m/s (step 0.095 m, same timing) — stages A / B / C / D (all pass); CF-6 then stops (§5)
# Deterministic: compare the end hashes with evidence/. usage: sh .../scripts/run_cf6.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf6}; mkdir -p "$OUT"; T=sandbox/visual/physchar2/tools/loco_probe.mjs; S=review_artifacts/physical_character_v2/diagnostics/loco_cf6_2026-10-08/scripts
C="--human=V2-REF --first=L --cf=6 --Tst=1.0 --Tds6=0.4104 --Tss6=0.5396"
{ echo "$C --steps=2 --S=0.38 --vw=0.4 --level=L1 --out=$OUT/L1_V2-REF_L_s2.json.gz"
  for N in 2 6 20; do echo "$C --steps=$N --S=0.19 --vw=0.2 --level=B0.2 --out=$OUT/B0.2_V2-REF_L_s$N.json.gz"; done
  for N in 2 6 20 60; do echo "$C --steps=$N --S=0.095 --vw=0.1 --level=B0.1 --out=$OUT/B0.1_V2-REF_L_s$N.json.gz"; done; } |
  xargs -P 8 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" | tail -1' _
python3 $S/cf6_analysis.py "$OUT"/*.json.gz > "$OUT/cf6_analysis.txt"
