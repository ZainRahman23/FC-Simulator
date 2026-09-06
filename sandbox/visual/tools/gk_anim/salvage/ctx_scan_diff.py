#!/usr/bin/env python3
"""diff two ctx_regression_scan outputs: every pre-existing pose's score/why per case, the pick, the art and the classifier must be identical
except where a NEW pose (present only in the second run) takes a case that previously had NO pick.  python3 ctx_scan_diff.py before.json after.json"""
import json, sys
A, B = (json.load(open(p)) for p in sys.argv[1:3]); newp = [p for p in B["poses"] if p not in A["poses"]]
print("poses before", len(A["poses"]), "after", len(B["poses"]), "new:", newp)
ok = True; taken = []
for a, b in zip(A["cases"], B["cases"]):
    assert a["id"] == b["id"]
    issues = []
    if a["cls"] != b["cls"]: issues.append("classifier changed")
    if a["committed"] != b["committed"]: issues.append("committed action changed")
    if a["contact"] != b["contact"]: issues.append("contact changed")
    sa = {s["id"]: (s["score"], s["why"]) for s in (a["scored"] or [])}; sb = {s["id"]: (s["score"], s["why"]) for s in (b["scored"] or [])}
    for pid, v in sa.items():
        if pid not in sb: issues.append(f"pose {pid} missing after")
        elif sb[pid] != v: issues.append(f"pose {pid} score changed {v[0]} -> {sb[pid][0]}")
    pa, pb = a["pick"] and a["pick"]["id"], b["pick"] and b["pick"]["id"]
    if pa != pb:
        if pa is None and pb in newp: taken.append((a["id"], pb, b["pick"]["score"]))
        else: issues.append(f"PICK changed {pa} -> {pb}")
    elif a["pick"] and b["pick"] and (a["pick"]["score"] != b["pick"]["score"] or a["pick"]["transform"] != b["pick"]["transform"]): issues.append("pick score/transform changed")
    if pa == pb and (a["art"] != b["art"]): issues.append(f"art changed: {a['art']} -> {b['art']}")
    if pa == pb and a["place"] != b["place"]: issues.append("placement changed")
    if issues: ok = False; print(f"{a['id']:20s} ISSUES: " + "; ".join(issues))
    else: print(f"{a['id']:20s} unchanged" + (f"  (new pose takes it: {pb} {b['pick']['score']})" if pa is None and pb in newp else ""))
print("\nNEW POSE took", len(taken), "cases that previously had no pick:", ", ".join(f"{c} ({s})" for c, _, s in taken))
print("EXISTING POSES UNCHANGED IN EVERY CASE:", "YES" if ok else "NO")
