#!/bin/zsh
# receive_turn1/tools/var_dist.sh — the phase-1 distributions, all nine benchmarks in parallel, merged: zsh var_dist.sh <nSeeds> <out.json> [scratch]
HERE="${0:A:h}"; N="${1:-1000}"; OUT="$2"; T="${3:-${TMPDIR:-/tmp}}/rtv_$$"; mkdir -p "$T"; IDS=(EASY NORMAL HARD THIGH_M THIGH_H CHEST_M CHEST_H HEAD_M HEAD_H)
for id in $IDS; do node "$HERE/var_dist.mjs" "$id" "$N" "$T/$id.json" > /dev/null 2>&1 < /dev/null & done; wait
python3 -c '
import json, sys; T, out, *ids = sys.argv[1:]; R = {"benchmarks": {}}
for i in ids: j = json.load(open(f"{T}/{i}.json")); R["benchmarks"][i] = j; R["nSeeds"] = j["nSeeds"]; R["bc"] = j["bc"]
json.dump(R, open(out, "w")); print("merged", len(ids), "benchmarks →", out)' "$T" "$OUT" $IDS
