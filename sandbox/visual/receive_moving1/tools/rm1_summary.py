# receive_moving1/tools/rm1_summary.py — the momentum scorecard of a movement-matrix run: python3 rm1_summary.py <rows.json> [label]
import json, sys, statistics as st
from collections import Counter, defaultdict
rows = json.load(open(sys.argv[1])); lab = sys.argv[2] if len(sys.argv) > 2 else ""
med = lambda a: st.median(a) if a else float("nan")
print(f"{lab} {len(rows)} runs · " + " · ".join(f"{k} {v}" for k, v in Counter(r["cls5"] for r in rows).most_common()))
g = defaultdict(list)
for r in rows: g[(r["rs"], abs(r["turn"]))].append(r)
print("receiver turn | n | CLEAN | v before | v min (median) | min/before | v contact | v +0.5 | v +1.0 | ball ahead +0.5 | 1st dribble after contact")
for rs in ["STAND", "WALK", "JOG", "RUN", "SPRINT", "ALLOUT"]:
  for t in [0, 30, 60, 90, 120, 150, 180]:
    R = g.get((rs, t));
    if not R: continue
    m = [r["momentum"] for r in R]; ok = sum(1 for r in R if r["cls5"] == "CLEAN")
    br = [x["brakeRatio"] for x in m if x["brakeRatio"] is not None]
    print(f"{rs:>6} {t:>3} | {len(R):>3} | {ok:>3} | {med([x['vBefore'] for x in m]):.1f} | {med([x['vMin'] for x in m if x['vMin'] is not None]):.2f} | {med(br) if br else float('nan'):.2f} | {med([x['vContact'] for x in m if x['vContact'] is not None]):.2f} | {med([x['v050'] for x in m if x['v050'] is not None]):.2f} | {med([x['v100'] for x in m if x['v100'] is not None]):.2f} | {med([x['ballAfter']['ahead'] for x in m if x['ballAfter']]):.2f} | {med([x['tStable'] for x in m if x['tStable'] is not None]):.2f}")
