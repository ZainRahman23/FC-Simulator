#!/bin/zsh
# receive11/tools/rx_matrix.sh — the receive matrix in parallel: zsh rx_matrix.sh <@block[+block] | ids> <seeds "1,2,3"> [P 9] [out.json]
HERE="${0:A:h}"; SEL="$1"; SEEDS="$2"; P="${3:-9}"; OUT="${4:-}"; R="${TMPDIR:-/tmp}/rxm.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/rx_run.mjs" "$SEL" "$SEEDS" "$R/$i.json" "$i/$P" 2>"$R/$i.err" & done; wait
for f in "$R"/*.err; do [[ -s "$f" ]] && { echo "== $f"; head -20 "$f"; }; done
python3 "$HERE/rx_summary.py" "$R" "$OUT"
