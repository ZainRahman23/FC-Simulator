#!/bin/zsh
# dribble15/tools/d15_take.sh — 16-seed cut comparison: each scenario's seeds in chunks of 4, all in parallel (≤ 10 at a time); prints taken / clean
# per scenario and a per-seed pattern (T = taken, c = cleanly). Cut outcomes are chaotic in the planner's parameters: compare on 16 seeds, not 8.
# usage: zsh d15_take.sh "CUT60_RUN CUT60L_RUN CUT90_RUN CUT90L_RUN" [16] [ver d12]     (D1OVR='{"cut12":{...}}' / D15CORE pass through)
HERE="${0:A:h}"; SC="${1:-CUT60_RUN CUT60L_RUN CUT90_RUN CUT90L_RUN}"; N="${2:-16}"; VER="${3:-d12}"; R="${TMPDIR:-/tmp}/d12take.$$"; mkdir -p "$R"
jobs=(); for s in ${=SC}; do for ((a=1; a<=N; a+=4)); do b=$((a+3)); ((b>N)) && b=$N; jobs+=("$s $a $b $VER"); done; done
i=0; for j in "${jobs[@]}"; do node "$HERE/d15_take.mjs" ${=j} > "$R/$i.json" 2>"$R/$i.err" & i=$((i+1)); if (( i % 10 == 0 )); then wait; fi; done; wait
cat "$R"/*.json | python3 -c '
import sys,json; rows=[r for l in sys.stdin if l.strip() for r in json.loads(l)]; by={}
for r in rows: by.setdefault(r["id"],[]).append(r)
tot=[0,0]
for k,v in by.items():
  v.sort(key=lambda r:r["sd"]); t=sum(r["t"] for r in v); c=sum(r["c"] for r in v); tot[0]+=t; tot[1]+=c
  b=sorted(r["b20"] for r in v if r["b20"] is not None); med=b[len(b)//2] if b else None
  print(f"{k:14s} taken {t}/{len(v)} clean {c}/{len(v)} ball20 med {med} | " + "".join(("T" if r["t"] else "-")+("c" if r["c"] else " ") for r in v))
print("TOTAL taken",tot[0],"clean",tot[1])'
for f in "$R"/*.err; do [ -s "$f" ] && { echo "ERR $f"; head -3 "$f"; }; done
rm -rf "${R:?}"
