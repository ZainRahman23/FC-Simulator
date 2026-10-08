#!/bin/sh
# COUNTERFACTUAL DIAGNOSTIC CF-5 (continuous forward walk: CF-4 + one walking swing / foothold plan) — reproduces the staged test exactly as run: V2-REF 2 → 4 → 6 → 10 → 20
# steps; then light / short, heavy / tall and long-legs at 10, then 20 steps (Tst 1 s, S 0.06 m, 240 Hz, left first). Nothing adopted. Run from the worktree root.
# Deterministic: compare the end hashes with evidence/. Then the continuity evaluation (the criteria fixed in the harness header), the tables and the trend plot.
# usage: sh review_artifacts/physical_character_v2/diagnostics/loco_cf5_2026-10-08/scripts/run_cf5.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf5}; mkdir -p "$OUT/staged"; T=sandbox/visual/physchar2/tools/loco_probe.mjs; S=review_artifacts/physical_character_v2/diagnostics/loco_cf5_2026-10-08/scripts
{ for N in 2 4 6 10 20; do echo "--human=V2-REF --first=L --steps=$N --cf=5 --Tst=1 --out=$OUT/staged/V2-REF_s$N.json.gz"; done
  for h in V2-165-62 V2-198-92 V2-long-legs; do for N in 10 20; do echo "--human=$h --first=L --steps=$N --cf=5 --Tst=1 --out=$OUT/staged/${h}_s$N.json.gz"; done; done; } |
  xargs -P 6 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" | tail -1' _
python3 $S/cf5_continuity.py "$OUT"/staged/*.json.gz > "$OUT/continuity.txt"
node sandbox/visual/physchar2/tools/loco_probe_report.mjs "$OUT/staged" > "$OUT/tables.md"
python3 $S/plot_cf5_trends.py "$OUT/trends_20steps.png" "CF-5 (diagnostic) — continuous walk, 20 steps, four bodies: per-step trends" "$OUT"/staged/*_s20.json.gz
