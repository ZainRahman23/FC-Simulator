#!/bin/zsh
# receive_moving1/tools/rm1_matrix714.sh — RECEIVE-CONTROL-1.1's matrix of record on RECEIVE-MOVING-1 in parallel: zsh rm1_matrix714.sh <@block[+block]> <seeds> [P 9] [out.json]
HERE="${0:A:h}"; SEL="$1"; SEEDS="$2"; P="${3:-9}"; OUT="${4:-}"; R="${TMPDIR:-/tmp}/rm714.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/rm1_run714.mjs" "$SEL" "$SEEDS" "$R/$i.json" "$i/$P" 2>"$R/$i.err" < /dev/null & done; wait
for f in "$R"/*.err; do [[ -s "$f" ]] && { echo "== $f"; head -20 "$f"; }; done
python3 "$HERE/../../receive11/tools/rx_summary.py" "$R" "$OUT"
