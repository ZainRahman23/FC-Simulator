#!/bin/zsh
# receive1/tools/rc1_matrix.sh — the receive matrix in parallel: zsh rc1_matrix.sh <block A|B|C|all> <seeds "1,2"> [P 9] [out.json]
HERE="${0:A:h}"; B="$1"; SEEDS="$2"; P="${3:-9}"; OUT="${4:-}"; R="${TMPDIR:-/tmp}/rc1m.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/rc1_run.mjs" "$B" "$i" "$P" "$SEEDS" "$R/$i.json" 2>"$R/$i.err" & done; wait
python3 "$HERE/rc1_summary.py" "$R" "$OUT"
