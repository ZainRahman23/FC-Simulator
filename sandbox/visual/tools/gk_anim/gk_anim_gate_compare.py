#!/usr/bin/env python3
"""Compare gate JSONs (per-scenario simulation trace hashes). python3 gk_anim_gate_compare.py a.json b.json [c.json ...]"""
import json, sys
runs = [json.load(open(p)) for p in sys.argv[1:]]
names = [("%s/anim=%s" % (r["url"].split("/")[-1], r["anim"])) for r in runs]
ok = True
print("| scenario | " + " | ".join(names) + " | identical |"); print("|---|" + "---|" * (len(runs) + 1))
for k in runs[0]["scenarios"]:
    hs = [r["scenarios"].get(k, {}).get("hash", "?") for r in runs]; same = len(set(hs)) == 1; ok &= same
    print("| %s %s | %s | %s |" % (k, runs[0]["scenarios"][k]["name"], " | ".join(hs), "yes" if same else "**NO**"))
print("\nALL IDENTICAL: %s" % ("YES" if ok else "NO"))
for r, n in zip(runs, names):
    if r.get("errors"): print("errors in", n, r["errors"][:3])
