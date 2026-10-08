#!/bin/sh
# COUNTERFACTUAL DIAGNOSTIC CF-4 (momentum-carrying continuous gait: direct stance-to-stance transfer + planned trailing-foot unloading, on CF-2 + CF-3's walking frame;
# forward, step-through) — reproduces: the schedule ladder (V2-REF, Tst 3 / 2.5 / 2 s, 4 steps), the staged 2 → 4 → 6 → 10 → 20 runs at the selected schedule (Tst 2 s) on the four
# bodies, the optional moderately faster regime (Tst 1 s, 20 steps, four bodies) and the extended saturation / drift check (Tst 1 s, 60 steps,
# V2-REF and V2-198-92). Nothing adopted. Run from the worktree root. Deterministic: compare the end hashes.
# usage: sh review_artifacts/physical_character_v2/diagnostics/loco_cf4_2026-10-08/scripts/run_cf4.sh <outdir>
set -e; OUT=${1:-/tmp/loco_cf4}; mkdir -p "$OUT/ladder" "$OUT/staged" "$OUT/faster" "$OUT/extended"; T=sandbox/visual/physchar2/tools/loco_probe.mjs
{ for S in 3 2.5 2; do echo "--human=V2-REF --first=L --steps=4 --cf=4 --Tst=$S --out=$OUT/ladder/ladder_Tst${S}_V2-REF_s4.json.gz"; done
  for h in V2-REF V2-198-92; do echo "--human=$h --first=L --steps=60 --cf=4 --Tst=1 --out=$OUT/extended/Tst1_${h}_s60.json.gz"; done
  for h in V2-REF V2-165-62 V2-198-92 V2-long-legs; do for N in 20 10 6 4 2; do echo "--human=$h --first=L --steps=$N --cf=4 --Tst=2 --out=$OUT/staged/Tst2_${h}_s${N}.json.gz"; done
    echo "--human=$h --first=L --steps=20 --cf=4 --Tst=1 --out=$OUT/faster/Tst1_${h}_s20.json.gz"; done; } |
  xargs -P 8 -L 1 sh -c 'V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node '"$T"' "$@" | tail -1' _
for d in ladder staged faster extended; do node sandbox/visual/physchar2/tools/loco_probe_report.mjs "$OUT/$d" > "$OUT/$d/tables.md"; done
P=review_artifacts/physical_character_v2/diagnostics/loco_cf4_2026-10-08/scripts/plot_cf4_trends.py
python3 $P "$OUT/trends_Tst2.png" "CF-4 (diagnostic) — Tst 2 s, 20 steps: per-step trends" "$OUT"/staged/Tst2_*_s20.json.gz
python3 $P "$OUT/trends_Tst1.png" "CF-4 (diagnostic) — Tst 1 s, 20 steps: per-step trends" "$OUT"/faster/Tst1_*_s20.json.gz
python3 $P "$OUT/trends_Tst1_60steps.png" "CF-4 (diagnostic) — Tst 1 s, 60 steps: per-step trends" "$OUT"/extended/Tst1_*_s60.json.gz
