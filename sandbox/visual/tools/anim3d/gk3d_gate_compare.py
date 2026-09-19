#!/usr/bin/env python3
"""Compare gk3d_gate JSONs: per-scenario trace hashes + first differing tick if any. python3 gk3d_gate_compare.py a.json b.json"""
import json, sys
runs = [json.load(open(p)) for p in sys.argv[1:]]
names = [r["backend"] for r in runs]; ok = True
print("| scenario | " + " | ".join(names) + " | commit tick | contact tick | identical |"); print("|---|" + "---|" * (len(runs) + 3))
for k in runs[0]["scenarios"]:
    ss = [r["scenarios"].get(k, {}) for r in runs]; hs = [s.get("hash", "?") for s in ss]; same = len(set(hs)) == 1; ok &= same
    print("| %s %s | %s | %s | %s | %s |" % (k, ss[0].get("name"), " | ".join(hs), "/".join(str(s.get("commitTick")) for s in ss), "/".join(str(s.get("contactTick")) for s in ss), "yes" if same else "**NO**"))
    if not same:
        t0 = ss[0]["trace"].split("\n"); t1 = ss[1]["trace"].split("\n")
        for i, (x, y) in enumerate(zip(t0, t1)):
            if x != y: print("   first difference at tick", i); print("   ", x[:200]); print("   ", y[:200]); break
print("\nALL IDENTICAL: %s" % ("YES" if ok else "NO"))
for r, n in zip(runs, names): print(n, "perf", r.get("perf"), "errors", r.get("errors")[:3])
