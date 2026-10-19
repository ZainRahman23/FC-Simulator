#!/bin/zsh
# receive_control2/tools/rc2_matrix.sh — RECEIVE-CONTROL-1.1's matrix on the integrated pipeline, in parallel:
#   zsh rc2_matrix.sh <@block[+block] | ids> <seeds "1,2,3"> [P 9] [out.json]   (the scorecard: receive11/tools/rx_summary.py)
HERE="${0:A:h}"; SEL="$1"; SEEDS="$2"; P="${3:-9}"; OUT="${4:-}"; R="${TMPDIR:-/tmp}/rc2m.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/rc2_run.mjs" "$SEL" "$SEEDS" "$R/$i.json" "$i/$P" 2>"$R/$i.err" < /dev/null & done; wait
for f in "$R"/*.err; do [[ -s "$f" ]] && { echo "== $f"; head -20 "$f"; }; done
python3 "$HERE/../../receive11/tools/rx_summary.py" "$R" "$OUT"
