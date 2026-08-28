import json, statistics
from pathlib import Path
OUT = Path("simulator/validation/st/out")
on = [json.loads(l) for l in open(OUT/"st_guardrails.jsonl")]
off = [json.loads(l) for l in open(OUT/"st_guardrails_off.jsonl")]
def row(rows, kind, nm):
    rs = [r for r in rows if r["kind"]==kind and r["name"]==nm]
    if not rs: return None
    xh = statistics.mean(r["xg"]["HOME"] for r in rs); xa = statistics.mean(r["xg"]["AWAY"] for r in rs)
    return {"n": len(rs), "xh": xh, "xa": xa, "tot": xh+xa, "share": xh/(xh+xa) if xh+xa else 0,
            "shots": statistics.mean(r["shots"]["HOME"]+r["shots"]["AWAY"] for r in rs),
            "s25": statistics.mean(r["shots25"] for r in rs),
            "dur": statistics.mean(r["dur_mean"] for r in rs),
            "beats": statistics.mean(r["beats"] for r in rs),
            "dist": statistics.mean(r["dist_km"]["HOME"] for r in rs),
            "gh": statistics.mean(r["goals"][0] for r in rs), "ga": statistics.mean(r["goals"][1] for r in rs)}
print(f"{'scenario':22s} {'xG tot OFF->ON':>18s} {'Δ%':>6s} {'shareH OFF->ON':>16s} {'dur OFF->ON':>13s} {'25+ OFF->ON':>12s} {'dist OFF->ON':>13s}")
for kind, nm in (("matrix","ultra"),("matrix","controlled"),("matrix","balanced"),("matrix","aggressive"),
                 ("quality","avg_vs_avg"),("quality","strong_vs_avg"),("quality","elite_vs_avg"),("quality","avg_vs_weak"),
                 ("press","PASSIVE"),("press","SELECTIVE"),("press","AGGRESSIVE"),("press","RELENTLESS")):
    a, b = row(off, kind, nm), row(on, kind, nm)
    if not a or not b: print(kind, nm, "missing"); continue
    d = (b["tot"]/a["tot"]-1)*100 if a["tot"] else 0
    print(f"{kind+'/'+nm:22s} {a['tot']:7.2f} -> {b['tot']:5.2f} {d:+5.0f}% {a['share']:.3f} -> {b['share']:.3f}   {a['dur']:5.1f}->{b['dur']:5.1f}  {a['s25']:4.1f}->{b['s25']:4.1f}  {a['dist']:5.1f}->{b['dist']:5.1f}")
# pressing net table
print("\npressing dial net xG (home presses, away balanced):")
for nm in ("PASSIVE","SELECTIVE","AGGRESSIVE","RELENTLESS"):
    a, b = row(off,"press",nm), row(on,"press",nm)
    if a and b:
        print(f"  {nm:11s} OFF {a['xh']:.2f}/{a['xa']:.2f} (net {a['xh']-a['xa']:+.2f})   ON {b['xh']:.2f}/{b['xa']:.2f} (net {b['xh']-b['xa']:+.2f})")
