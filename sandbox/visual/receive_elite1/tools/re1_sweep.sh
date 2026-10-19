#!/bin/zsh
# receive_elite1/tools/re1_sweep.sh — the attribute series in parallel: zsh re1_sweep.sh <out.json> [seeds] [P 9] [series] [ids]
HERE="${0:A:h}"; OUT="$1"; SEEDS="${2:-1,2,3}"; P="${3:-9}"; SER="${4:-BC,DRI,AGI,ALL}"; IDS="$5"; R="${TMPDIR:-/tmp}/re1s.$$"; mkdir -p "$R"
for ((i=0; i<P; i++)); do node "$HERE/re1_sweep.mjs" "$R/$i.json" "$SEEDS" "$i/$P" "$SER" $IDS 2>"$R/$i.err" < /dev/null & done; wait
for f in "$R"/*.err; do [[ -s "$f" ]] && { echo "== $f"; head -20 "$f"; }; done
python3 -c "import json,glob; rows=[r for f in sorted(glob.glob('$R/*.json')) for r in json.load(open(f))]; json.dump(rows,open('$OUT','w')); print(len(rows),'runs')"
