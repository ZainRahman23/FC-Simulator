#!/bin/zsh
# receive_kill12/tools/rk_matrix.sh — every calibration matrix in parallel (one process per matrix), merged: zsh rk_matrix.sh <nSeeds> <out.json> [scratch dir]
HERE="${0:A:h}"; N="${1:-200}"; OUT="$2"; T="${3:-${TMPDIR:-/tmp}}/rk_mx_$$"; mkdir -p "$T"
IDS=(GROUND BOUNCE LOW THIGH CHEST HEAD HEIGHT DROP ENERGY SIDE BENCH)
for id in $IDS; do node "$HERE/rk_matrix.mjs" "$id" "$N" "$T/$id.json" 2>/dev/null & done; wait
node -e '
const fs = require("fs"), [T, out, ...ids] = process.argv.slice(1); let all = null;
for (const id of ids) { const j = JSON.parse(fs.readFileSync(T + "/" + id + ".json", "utf8")); if (!all) { all = j; all.ms = 0; all.msPer = {}; } else Object.assign(all.matrices, j.matrices); all.msPer[id] = j.ms; all.ms = Math.max(all.ms, j.ms); }
fs.writeFileSync(out, JSON.stringify(all)); console.log("merged", ids.length, "matrices →", out, "wall", (all.ms / 1000).toFixed(1), "s");' "$T" "$OUT" $IDS
