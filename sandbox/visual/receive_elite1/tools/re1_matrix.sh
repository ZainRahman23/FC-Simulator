#!/bin/zsh
# receive_elite1/tools/re1_matrix.sh — the movement matrix in parallel: zsh re1_matrix.sh <@matrix | ids> <seeds> <out.json> [P 9] [CURRENT|NEW] [B,D,A]
HERE="${0:A:h}"; SEL="$1"; SEEDS="$2"; OUT="$3"; P="${4:-9}"; PIPE="${5:-NEW}"; RT="${6:-99,99,99}"; R="${TMPDIR:-/tmp}/re1m.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/re1_run.mjs" "$SEL" "$SEEDS" "$R/$i.json" "$i/$P" "$PIPE" "$RT" 2>"$R/$i.err" < /dev/null & done; wait
for f in "$R"/*.err; do [[ -s "$f" ]] && { echo "== $f"; head -20 "$f"; }; done
python3 -c "import json,glob,sys; rows=[r for f in sorted(glob.glob('$R/*.json')) for r in json.load(open(f))]; rows.sort(key=lambda r:(r['id'],r['seed'])); json.dump(rows,open('$OUT','w')); print(len(rows),'runs')"
