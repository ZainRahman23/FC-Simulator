# receive11/tools/rx_summary.py — merge the shards of a receive matrix and print the scorecard: python3 rx_summary.py <dir | file.json> [out.json]
import json, sys, os, glob, statistics as st
from collections import Counter
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else ""
rows = []
if os.path.isdir(src):
    for f in sorted(glob.glob(os.path.join(src, "*.json"))): rows += json.load(open(f))
else: rows = json.load(open(src))
rows.sort(key=lambda r: (r["id"], r["seed"]))
if out: json.dump(rows, open(out, "w"))
N = len(rows); C = Counter(r["outcome"] for r in rows)
print(f"{N} runs · " + " · ".join(f"{k} {v}" for k, v in sorted(C.items(), key=lambda x: -x[1])))
go = [r for r in rows if r["intent"] == "go"]
def line(name, sub):
    c = Counter(r["cls5"] for r in sub); n = len(sub)
    if not n: return
    print(f"  {name:<26} n {n:>4} · CLEAN {c['CLEAN']:>4} ({100*c['CLEAN']/n:4.0f}%) TAKEN {c['TAKEN']:>3} RECEIVED {c['RECEIVED']:>3} RECOVERED {c['RECOVERED']:>3} MISSED {c['MISSED']:>3} ({100*c['MISSED']/n:4.0f}%)")
if go:
    print("GO receives:"); line("all", go)
    for k in ["ordinary", "turning"]: line(k, [r for r in go if r["cls"] == k])
    for a in sorted(set(r["angle"] for r in go)): line(f"angle {a}", [r for r in go if r["angle"] == a])
    for d in ["F", "FL", "FR", "L", "R", "RL", "RR"]: line(f"from {d}", [r for r in go if r["dir"] == d])
    for s in ["STAND", "JOG", "RUN", "FAST"]: line(f"receiver {s}", [r for r in go if r["rs"] == s])
    for p in ["SOFT", "MED", "FIRM"]: line(f"pass {p}", [r for r in go if r["ps"] == p])
    fam = Counter(r["action"]["fam"] for r in go if r["action"]); print("  families:", dict(fam))
    surf = Counter((r["action"]["F"], r["action"]["surface"]) for r in go if r["action"]); print("  foot/surface:", {f"{a}-{b}": v for (a, b), v in surf.items()})
    rej = Counter(); [rej.update(r["rej"]) for r in go]; print("  candidate rejections:", dict(rej.most_common(10)))
    mi = [r for r in go if r["cls5"] == "MISSED"]; print("  missed:", dict(Counter(r["outcome"] for r in mi)), "examples:", [f'{r["id"]}#{r["seed"]}' for r in mi[:14]])
    ct = [r for r in go if r["contact"] and r["contact"]["launched"]]
    if ct:
        de = [abs(r["contact"]["dirErr"]) for r in ct]; print(f"  contact made {len(ct)}/{len(go)} · |dir err| median {st.median(de):.1f}° · heavy {sum(1 for r in ct if r['heavy'])} short {sum(1 for r in ct if r['short'])} · reconnection miss median {st.median([r['recon']['miss'] for r in ct if r['recon']]):.2f} m · double touches {sum(r['doubleTouches'] for r in go)} · recontacts {sum(r['recontacts'] for r in go)}")
        br = [r for r in ct if r["speed"]["start"] and r["speed"]["start"] > 4]
        if br:
            o = [r for r in br if r["cls"] == "ordinary"]
            print(f"  braking (start > 4 m/s): min prep speed / start median {st.median([r['speed']['minPrep']/r['speed']['start'] for r in br]):.2f}" + (f" · ordinary: contact / start median {st.median([r['speed']['atContact']/r['speed']['start'] for r in o]):.2f}, ≥ 0.9 in {sum(1 for r in o if r['speed']['atContact'] >= 0.9*r['speed']['start'])}/{len(o)}" if o else ""))
        ho = [r for r in ct if r["handoff"]]
        if ho: print(f"  handoff: n {len(ho)} · acc median {st.median([r['handoff']['acc'] for r in ho]):.1f} m/s² max {max(r['handoff']['acc'] for r in ho):.1f} · yaw step max {max(r['handoff']['yawStep'] for r in ho):.2f}° · request vs exit max {max(r['handoff']['reqVsExit'] for r in ho):.1f}°")
    cp = [r["cpu"] for r in go]; rp = [c["recvPerS"] for c in cp if c["recvPerS"]]; ap = [c["afterPerS"] for c in cp if c["afterPerS"]]
    print(f"  CPU (this run's processes): receive phase {st.median(rp):.0f} ms/s median (mean {st.mean(rp):.0f}) · after handoff {st.median(ap) if ap else 0:.0f} ms/s · worst step {max(c['worst'] for c in cp):.1f} ms · candidates per run {st.mean([r['cands'] for r in go]):.0f}")
kl = [r for r in rows if r["intent"] == "kill"]
if kl: print("KILL receives:", dict(Counter(r["outcome"] for r in kl)))
