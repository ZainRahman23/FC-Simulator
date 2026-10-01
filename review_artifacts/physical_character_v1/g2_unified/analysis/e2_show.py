import json, sys, numpy as np
from e2_reachgrid import STARTS, KS, DF, TS
tag = sys.argv[1] if len(sys.argv) > 1 else "base"; rows = json.load(open(f"../json/sb_e2_{tag}.json"))["rows"]
def cell(r):
    if not r.get("reached"): return "  ..  "
    s = r["swing"]; e = r["land"].get("err")
    if s["ok"]: c = "O"
    elif s.get("early"): c = "e"
    elif s.get("trip"): c = "r"
    elif e is not None and abs(e[0]) > 0.08: c = "x"
    else: c = "?"
    return c + str(r["after"])
print(f"{tag}: per (start,K) — rows T, cols df {DF}; O = swing ok, e = early touchdown, r = re-contact, x = > 8 cm off; digit = upright steps after K (of 3)")
tot = {}
for s in STARTS:
    for k in KS:
        sub = [r for r in rows if r["case"]["start"] == s and r["case"]["K"] == k]
        if not sub: continue
        r0 = sub[0]; dv = r0.get("dec", {}).get("real", {})
        print(f"{s} K{k}: real-time state at the command: ξ_f {dv.get('xi',[0])[0]:+.3f} vF {dv.get('vF',0):+.2f} trailExt {dv.get('trailExt',0):.3f} swFoot_f {dv.get('swFoot',[0])[0]:+.3f} swHip_f {dv.get('swHip',[0])[0]:+.3f}")
        for T in TS:
            line = []
            for df in DF:
                r = next((r for r in sub if abs(r["case"]["req"][0] - df) < 1e-9 and abs(r["case"]["req"][2] - T) < 1e-9), None)
                line.append(cell(r) if r else " -- "); 
                if r and r.get("reached"): tot.setdefault((T, df), []).append(r)
            print(f"   T {T:.2f} | " + " ".join(f"{c:>3}" for c in line))
print("\nOVERALL swing-ok rate / mean continuation, rows T, cols df")
for T in TS:
    print(f"   T {T:.2f} | " + " ".join(f"{np.mean([r['swing']['ok'] for r in tot[(T,df)]])*100:3.0f}%/{np.mean([r['after'] for r in tot[(T,df)]]):.1f}" for df in DF))
