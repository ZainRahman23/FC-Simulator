#!/bin/zsh
# receive_turn1/tools/rt_matrix.sh — every turn-matrix block in parallel, merged: zsh rt_matrix.sh <nSeeds> <out.json> [scratch]   (FORCED at half the seeds)
HERE="${0:A:h}"; N="${1:-200}"; OUT="$2"; T="${3:-${TMPDIR:-/tmp}}/rtm_$$"; mkdir -p "$T"
BL=(MAIN:SLOW:R MAIN:SLOW:L MAIN:NORMAL:R MAIN:NORMAL:L MAIN:FIRM:R MAIN:FIRM:L MIRROR LATE LINE FORCED)
for b in $BL; do n=$N; [[ $b == FORCED ]] && n=$((N / 2)); node "$HERE/rt_matrix.mjs" "$b" "$n" "$T/${b//:/_}.json" > /dev/null 2>&1 < /dev/null & done; wait
python3 -c '
import json, sys, glob; T, out = sys.argv[1:3]; R = {"blocks": {}, "cells": {}}
for f in sorted(glob.glob(T + "/*.json")):
    j = json.load(open(f)); b = j["block"]; R["blocks"][b] = {"nSeeds": j["nSeeds"], "ms": j["ms"], "cells": len(j["cells"])}; R["bcs"] = j["bcs"]
    for k, c in j["cells"].items(): c["block"] = b; R["cells"][k] = c
    if "mirror" in j: R["mirror"] = j["mirror"]
json.dump(R, open(out, "w")); print("merged", len(R["blocks"]), "blocks,", len(R["cells"]), "cells →", out)' "$T" "$OUT"
