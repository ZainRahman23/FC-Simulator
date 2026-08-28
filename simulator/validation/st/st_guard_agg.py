import json, statistics
from pathlib import Path
rows = [json.loads(l) for l in open(Path(__file__).parent / "out" / "st_guardrails.jsonl")]
def agg(kind, names):
    print(f"== {kind} ==")
    for nm in names:
        rs = [r for r in rows if r["kind"]==kind and r["name"]==nm]
        if not rs: continue
        xh = statistics.mean(r["xg"]["HOME"] for r in rs); xa = statistics.mean(r["xg"]["AWAY"] for r in rs)
        gh = statistics.mean(r["goals"][0] for r in rs); ga = statistics.mean(r["goals"][1] for r in rs)
        sh = statistics.mean(r["shots"]["HOME"]+r["shots"]["AWAY"] for r in rs)
        s25 = statistics.mean(r["shots25"] for r in rs)
        du = statistics.mean(r["dur_mean"] for r in rs)
        bt = statistics.mean(r["beats"] for r in rs)
        dh = statistics.mean(r["dist_km"]["HOME"] for r in rs)
        wins = sum(1 for r in rs if r["goals"][0]>r["goals"][1])/len(rs)
        share = xh/(xh+xa) if xh+xa else 0
        print(f"  {nm:18s} n={len(rs):2d} xG {xh:.2f}/{xa:.2f} (share {share:.3f}) goals {gh:.2f}/{ga:.2f} winH {wins:.2f} shots {sh:.1f} (25m+ {s25:.1f}) dur {du:.1f}s beats {bt:.1f} distH {dh:.1f}km")
agg("matrix", ["ultra","controlled","balanced","aggressive"])
agg("quality", ["avg_vs_avg","strong_vs_avg","elite_vs_avg","avg_vs_weak"])
agg("press", ["PASSIVE","SELECTIVE","AGGRESSIVE","RELENTLESS"])
