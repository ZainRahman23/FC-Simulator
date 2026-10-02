# E6: the step map around the steady orbit WITH STATE VARIETY — a seeded push during step K−1 (fwd / lateral / yaw), then step K commanded over a design
import json, sys, os, numpy as np; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
CTRL = {"kind": "U", "vd": 0.5, "from": 1, "ramp": {"a": 0.3}, "place": "maps", "uRefSim": False, "lat": {"rho": 0.4}, "adapt": None, "identFixed": True}
WALK = {"swingBase": {"w": "model", "learn": {"rate": 0.05}, "pure": [0]}}
KS = [int(k) for k in os.environ.get("E6KS", "10,13,16,19,22,25").split(",")]
PUSH = [None, [5, 0, 0], [-5, 0, 0], [0, 4, 0], [0, -4, 0], [0, 0, 0.8], [0, 0, -0.8], [4, 3, 0], [-4, -3, 0]]
DES = [(df, dl, T) for df in (0.21, 0.27, 0.33) for dl in (0.22, 0.28, 0.34) for T in (0.36, 0.42)]
if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "orbitpush"; cases = []
    for k in KS:
        for p in PUSH:
            pu = {"step": k - 1, "u": 0.3, "J": [p[0], p[1]], "Lz": p[2]} if p else None
            for u in DES: cases.append({"start": "L@0.6", "K": k, "req": list(u), **({"push": pu} if pu else {})})
    extra = "--models mU1_tau --after 2 --ctrl '" + json.dumps(CTRL) + "' --walk '" + json.dumps(WALK) + "'"
    rows = run("e6_" + tag, cases, shards=8, extra=extra); print(tag, len(rows), "reached", sum(1 for r in rows if r.get("reached")), "landed", sum(1 for r in rows if r.get("reached") and r["swing"]["landed"]))
