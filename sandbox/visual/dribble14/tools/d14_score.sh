#!/bin/zsh
# dribble14/tools/d14_score.sh — the football scorecard in parallel (chunks of 4 seeds, ≤ P processes at a time) and its summary: per scenario taken /
# cleanly, and over all runs the decisive surfaces (FRONT = toe share), decisive / cut touch speeds, launches ≥ 9 m/s through cuts, same-foot second
# contacts within 250 ms per launch, request → redirect / ball-within-20° medians, set-ups.
# usage: zsh d14_score.sh "SCN1 SCN2 …" N [ver d14] [P 10] [out.json]           (D1OVR / D14CORE pass through)
HERE="${0:A:h}"; SC="$1"; N="${2:-16}"; VER="${3:-d13}"; P="${4:-10}"; OUT="${5:-}"; R="${TMPDIR:-/tmp}/d13score.$$"; mkdir -p "$R"
O="${SEED0:-0}"; jobs=(); for s in ${=SC}; do for ((a=1; a<=N; a+=4)); do b=$((a+3)); ((b>N)) && b=$N; jobs+=("$s $((a+O)) $((b+O))"); done; done   # (SEED0: seeds SEED0+1 … SEED0+N)
i=0; for j in "${jobs[@]}"; do set -- ${=j}; node "$HERE/d14_score.mjs" "$1" "$2" "$3" "$VER" "$R/$i.json" 2>"$R/$i.err" & i=$((i+1)); if (( i % P == 0 )); then wait; fi; done; wait
python3 - "$R" "$OUT" <<'PY'
import sys, json, glob, statistics as st
R, OUT = sys.argv[1], sys.argv[2]; rows = []
for f in glob.glob(R + "/*.json"):
    try: rows += json.load(open(f))
    except Exception as e: print("bad", f, e)
by = {}
for r in rows: by.setdefault(r["id"], []).append(r)
tot = [0, 0, 0]
for k in sorted(by):
    v = sorted(by[k], key=lambda r: r["sd"])
    if v[0]["taken"] is None:
        c = sum(1 for r in v if r["end"] == "CONTROLLED"); print(f"{k:16s} controlled at end {c}/{len(v)}"); continue
    t = sum(1 for r in v if r["taken"]); c = sum(1 for r in v if r["clean"]); tot[0] += t; tot[1] += c; tot[2] += len(v)
    t8 = sum(1 for r in v if r["taken"] and r["sd"] <= 8) if min(r["sd"] for r in v) == 1 else -1
    print(f"{k:16s} taken {t}/{len(v)} (seeds 1-8: {t8}/8) clean {c}/{len(v)} | " + "".join("T" if r["taken"] else "-" for r in v))
cut = [r for r in rows if r["taken"] is not None]
dec = [r["decisive"] for r in cut if r["decisive"]]
regs = {}
for d in dec: regs[d["reg"]] = regs.get(d["reg"], 0) + 1
n = max(1, len(dec)); cs = [x for r in cut for x in r["cutSpeeds"]]
red = [r["toRedirectS"] for r in cut if r["toRedirectS"] is not None]; b20 = [r["toBall20S"] for r in cut if r["toBall20S"] is not None]
launch = sum(r["launches"] for r in rows); same = sum(r["sameFoot250"] for r in rows)
summ = { "taken": tot[0], "clean": tot[1], "cutRuns": tot[2], "decisive": len(dec), "decisiveRegionsPct": {k: round(100 * v / n, 1) for k, v in sorted(regs.items())},
  "decisiveSpeedMean": round(st.mean([d["speed"] for d in dec]), 2) if dec else None, "cutTouchSpeedMean": round(st.mean(cs), 2) if cs else None, "cutTouches": len(cs),
  "over9": sum(r["over9"] for r in cut), "over9Roles": {k: sum(1 for r in cut for x in r.get("over9Roles", []) if x == k) for k in sorted(set(x for r in cut for x in r.get("over9Roles", [])))}, "launches": launch, "sameFoot250": same, "sameFoot250Pct": round(100 * same / max(1, launch), 2),
  "toRedirectMedian": round(st.median(red), 2) if red else None, "toRedirectMean": round(st.mean(red), 2) if red else None, "toBall20Median": round(st.median(b20), 2) if b20 else None,
  "setupUsed": sum(1 for r in cut if r["setupUsed"]), "setupTaken": sum(1 for r in cut if r["setupUsed"] and r["taken"]), "faults": sum(1 for r in rows if r["fault"]) }
print("SUMMARY", json.dumps(summ))
if OUT: json.dump({"summary": summ, "rows": rows}, open(OUT, "w"))
PY
for f in "$R"/*.err; do [ -s "$f" ] && { echo "ERR $f"; head -3 "$f"; }; done
rm -rf "${R:?}"
