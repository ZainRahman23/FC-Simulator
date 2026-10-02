# E7: the step map over the WHOLE walk (initiation included) with state variety: steps 4…22 of the maps-placement walk (L@0.6 and R@0.5),
# a seeded push in step K−1, step K commanded over a design; for a regulator whose model covers the initiation transient
import json, sys, os, numpy as np; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
CTRL = {"kind": "U", "vd": 0.5, "from": 1, "ramp": {"a": 0.3}, "place": "maps", "uRefSim": False, "lat": {"rho": 0.4}, "adapt": None, "identFixed": True}
WALK = {"swingBase": {"w": "model", "learn": {"rate": 0.05}, "pure": [0]}}
SK = [("L@0.6", k) for k in (4, 6, 8, 10, 14, 18, 22)] + [("R@0.5", k) for k in (4, 6, 8)]
PUSH = [None, [5, 0, 0], [-5, 0, 0], [0, 4, 0], [0, -4, 0], [4, 3, 0], [-4, -3, 0]]
DES = [(df, dl, T) for df in (0.20, 0.27, 0.34) for dl in (0.22, 0.30, 0.38) for T in (0.36, 0.43)]
if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "wide"; cases = []
    for s, k in SK:
        for p in PUSH:
            pu = {"step": k - 1, "u": 0.3, "J": [p[0], p[1]], "Lz": p[2]} if p else None
            for u in DES: cases.append({"start": s, "K": k, "req": list(u), **({"push": pu} if pu else {})})
    extra = "--models mU1_tau --after 2 --ctrl '" + json.dumps(CTRL) + "' --walk '" + json.dumps(WALK) + "'"
    rows = run("e7_" + tag, cases, shards=8, extra=extra); print(tag, len(rows), "reached", sum(1 for r in rows if r.get("reached")), "landed", sum(1 for r in rows if r.get("reached") and r["swing"]["landed"]))
