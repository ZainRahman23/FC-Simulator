#!/bin/zsh
# dribble12/tools/d12_matrix.sh — quick development matrix: the key scenarios × seeds 1..N (reliability summary line each), one process per scenario
# in parallel. usage: zsh d12_matrix.sh [ver d12] [N 8] [prof HIGH] [scenarios "CUT60_RUN CUT60L_RUN ..."]   (D1OVR / D1OPTS pass through)
HERE="${0:A:h}"; VER="${1:-d12}"; N="${2:-8}"; PROF="${3:-HIGH}"
SC="${4:-STRAIGHT_JOG STRAIGHT_RUN STRAIGHT_FAST CURVE_RUN CUT45_RUN CUT60_RUN CUT60L_RUN CUT90_RUN CUT90L_RUN}"
OUT="${TMPDIR:-/tmp}/d12mat.$$"; mkdir -p "$OUT"
for s in ${=SC}; do node "$HERE/d12_evidence.mjs" reliability "$s" "$N" "$VER" B "$PROF" "$OUT/$s.json" > "$OUT/$s.txt" 2>&1 & done; wait
for s in ${=SC}; do grep -h "^$s " "$OUT/$s.txt" || { echo "$s FAILED"; tail -3 "$OUT/$s.txt"; }; done
rm -rf "${OUT:?}"
