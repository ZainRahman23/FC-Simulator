#!/bin/zsh
# technical_control1/tools/tc_sweep.sh — a sweep in P parallel shards:  zsh tc_sweep.sh <set> <out.jsonl> [P 8] [seeds 1,2,3] [body]
HERE="${0:A:h}"; SET="$1"; OUT="$2"; P="${3:-8}"; SEEDS="${4:-1,2,3}"; BODY="$5"; TMP="${OUT}.d"; rm -rf "$TMP"; mkdir -p "$TMP"
node "$HERE/tc_jobs.mjs" "$SET" "$SEEDS" > "$TMP/jobs.json"
for ((s=0; s<P; s++)); do node "$HERE/tc_sweep.mjs" "$TMP/jobs.json" $s $P "$TMP/s$s.jsonl" $BODY & done; wait
cat "$TMP"/s*.jsonl > "$OUT"; echo "$(wc -l < "$OUT") runs → $OUT"; rm -rf "$TMP"
