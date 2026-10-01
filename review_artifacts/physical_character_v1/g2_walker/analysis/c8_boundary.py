# the C8 boundary from identification data: does step k's swing fail (re-contact < 0.2 s after liftoff, or no liftoff) as a function of the
# previous step's ACHIEVED length / width, the forward speed at step k's start, and the commanded T
import json, numpy as np
rows = []
for f in ("../json/ident_v2_s1.json", "../json/ident_cl1.json"):
    D = json.load(open(f))
    for run in D["runs"]:
        R = {r["k"]: r for r in run["rows"]}
        for k in sorted(R):
            a, p = R[k], R.get(k - 1)
            if k < 1 or not p or not p["foothold"] or not a["atStart"] or not a["upright"]: continue
            fail = a["lift"] is None or a["td"] is None or (a["td"] - a["lift"]) < 0.2
            rows.append(dict(L=p["foothold"][0], W=-p["foothold"][1], v=a["atStart"]["v"][0], T=(run["steps"].get(str(k)) or {}).get("T", np.nan), fail=fail))
L = np.array([r["L"] for r in rows]); Wd = np.array([r["W"] for r in rows]); v = np.array([r["v"] for r in rows]); fl = np.array([r["fail"] for r in rows])
print("n", len(rows), "swing failures", fl.sum(), f"({fl.mean()*100:.0f} %)")
print("failure rate by previous ACHIEVED step length:")
for a, b in [(0.0, 0.2), (0.2, 0.26), (0.26, 0.30), (0.30, 0.34), (0.34, 0.38), (0.38, 0.42), (0.42, 0.6)]:
    m = (L >= a) & (L < b); print(f"  L {a:.2f}–{b:.2f}: n {m.sum():4d} fail {fl[m].mean()*100 if m.sum() else 0:5.1f} %")
print("by previous width:")
for a, b in [(0.1, 0.2), (0.2, 0.26), (0.26, 0.32), (0.32, 0.38), (0.38, 0.6)]:
    m = (Wd >= a) & (Wd < b); print(f"  W {a:.2f}–{b:.2f}: n {m.sum():4d} fail {fl[m].mean()*100 if m.sum() else 0:5.1f} %")
print("by forward speed at step start:")
for a, b in [(-1, 0.3), (0.3, 0.45), (0.45, 0.6), (0.6, 0.75), (0.75, 0.9), (0.9, 3)]:
    m = (v >= a) & (v < b); print(f"  v {a:.2f}–{b:.2f}: n {m.sum():4d} fail {fl[m].mean()*100 if m.sum() else 0:5.1f} %")
print("length × width (fail %):")
for a, b in [(0.2, 0.3), (0.3, 0.36), (0.36, 0.5)]:
    s = ""
    for c, d in [(0.1, 0.24), (0.24, 0.32), (0.32, 0.6)]:
        m = (L >= a) & (L < b) & (Wd >= c) & (Wd < d); s += f"  W{c:.2f}-{d:.2f}: {fl[m].mean()*100 if m.sum() else float('nan'):5.1f}% (n{m.sum()})"
    print(f"  L {a:.2f}–{b:.2f}:" + s)
