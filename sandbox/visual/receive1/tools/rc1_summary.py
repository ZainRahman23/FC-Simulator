# receive1/tools/rc1_summary.py — merge the chunk files of a receive matrix run and print the scorecard
import sys, json, glob, statistics as st, collections as C
R, OUT = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
rows = []
for f in sorted(glob.glob(R + "/*.json")) if not R.endswith(".json") else [R]:
    try: rows += json.load(open(f))
    except Exception as e: print("bad", f, e)
for f in glob.glob(R + "/*.err") if not R.endswith(".json") else []:
    t = open(f).read().strip()
    if t: print("STDERR", f, t[:600])
rows.sort(key=lambda r: (r["id"], r["seed"]))
if OUT: json.dump(rows, open(OUT, "w"), indent=0)
oc = C.Counter(r["outcome"] for r in rows)
print(f"runs {len(rows)}  " + "  ".join(f"{k} {oc[k]}" for k in ["CLEAN", "TAKEN", "RECEIVED", "MISSED"]) + f"  errors {sum(1 for r in rows if r.get('error'))}")
def grp(key, name):
    g = C.defaultdict(list)
    for r in rows: g[key(r)].append(r)
    print(f"-- by {name}")
    for k in sorted(g, key=lambda x: (str(type(x)), x)):
        v = g[k]; c = C.Counter(r["outcome"] for r in v); tl = [r["firstToLine"] for r in v if r["firstToLine"] is not None]
        print(f"  {str(k):12s} n {len(v):3d}  clean {c['CLEAN']:3d}  taken {c['TAKEN']:3d}  received {c['RECEIVED']:3d}  missed {c['MISSED']:3d}  | first→line med {st.median(tl) if tl else float('nan'):.2f}s  turnWithFirst {sum(1 for r in v if r['turnWithFirst'])}")
grp(lambda r: r["angle"], "receiveTurnAngle")
grp(lambda r: r["dir"], "pass direction")
grp(lambda r: r["rs"], "receiver speed")
grp(lambda r: r["ps"], "pass strength")
grp(lambda r: r["cls"], "class")
fam = C.Counter((r["first"] or {}).get("family", "none") for r in rows); print("-- first-touch family", dict(fam))
role = C.Counter((r["first"] or {}).get("role", "none") for r in rows); print("-- first-touch role", dict(role))
regs = C.Counter(((r["first"] or {}).get("F", "-") + (r["first"] or {}).get("reg", "-")) for r in rows); print("-- foot/surface", dict(regs))
heavy = sum(1 for r in rows if r["heavy"]); dbl = sum(r["doubleTouches"] for r in rows); rec = sum(r["recontacts"] for r in rows); defl = sum(1 for r in rows if r["preDeflections"])
print(f"-- heavy first touches {heavy}  double touches {dbl}  same-foot recontacts {rec}  deflected before the first touch {defl}  lost after first {sum(1 for r in rows if r['lostAfterFirst'] is not None)}  faults {sum(1 for r in rows if r['fault'])}")
cpu = [r["cpu"]["msPerSimS"] for r in rows]; rv = [r["cpu"]["recvMs"] / max(0.05, r["cpu"]["recvSimS"]) for r in rows]
print(f"-- CPU ms per sim-s: mean {st.mean(cpu):.0f}  median {st.median(cpu):.0f}  max {max(cpu):.0f} | receive phase ms/s: mean {st.mean(rv):.0f}  max {max(rv):.0f}")
