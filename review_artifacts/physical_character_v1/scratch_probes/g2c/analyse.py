import json, sys, numpy as np, collections
files = {"natural": "sweep.json", "neutral": "sweep_neutral.json", "ankle": "sweep_ankle.json"}
D = "/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator-worktrees-physical-character-v1/d4761610-c35f-4019-9308-cb83973e7b76/scratchpad/g2c/"
def load(n): return json.load(open(D + files[n]))["sweep"]["rows"]
def inp(r, key):
    if key in ("df", "dl", "T"): return r["u"][key]
    p = r.get("push") or {}; J = p.get("J") or [0, 0]
    return {"jf": J[0], "jl": J[1], "lz": p.get("Lz", 0)}[key]
for name in files:
    rows = load(name)
    for ref in "AB":
        R = [r for r in rows if r["ref"] == ref]; c = collections.Counter(r["cls"] for r in R)
        print(f"\n=== inner {name} · ref {ref} · {dict(c)}")
        for tag, key in [("df", "df"), ("dl", "dl"), ("T", "T"), ("pushF", "jf"), ("pushL", "jl"), ("yaw", "lz")]:
            S = [r for r in R if r["tag"] == tag and r["cls"] == "upright" and r.get("post") and r.get("pre")]
            if len(S) < 3: print(f"  {tag:6s}: {len(S)} upright"); continue
            x = np.array([inp(r, key) for r in S]); pf = np.array([r["post"]["xi"][0] for r in S]); pl = np.array([r["post"]["xi"][1] for r in S])
            prf = np.array([r["pre"]["xi"][0] for r in S]); prl = np.array([r["pre"]["xi"][1] for r in S])
            if tag in ("pushF", "pushL", "yaw"):   # state sensitivity: post vs the pre-state the push produced
                if tag == "pushF": z = prf; lab = "pre ξf"
                elif tag == "pushL": z = prl; lab = "pre ξl"
                else: z = np.array([r["pre"]["L"][1] for r in S]); lab = "pre Ly"
                a1 = np.polyfit(z, pf, 1)[0]; a2 = np.polyfit(z, pl, 1)[0]
                print(f"  {tag:6s}: n {len(S):2d} | ∂post ξf/∂{lab} {a1:+7.2f} · ∂post ξl/∂{lab} {a2:+7.2f} | range {lab} {z.min():+.3f}..{z.max():+.3f}")
            else:
                a1 = np.polyfit(x, pf, 1)[0]; a2 = np.polyfit(x, pl, 1)[0]; ds = np.array([r["ds"] or np.nan for r in S])
                print(f"  {tag:6s}: n {len(S):2d} | ∂post ξf/∂{key} {a1:+7.2f} · ∂post ξl/∂{key} {a2:+7.2f} | DS {np.nanmin(ds):.2f}..{np.nanmax(ds):.2f} s | {key} {x.min():.2f}..{x.max():.2f}")
