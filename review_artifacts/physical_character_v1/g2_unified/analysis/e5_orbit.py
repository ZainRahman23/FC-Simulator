# E5: the step map AROUND THE STEADY ORBIT — the sustained walk (maps placement, mU1, L@0.6, 40 steps) replayed unchanged to step K (10…26), then
# step K commanded over a small design around its own steady values; the next start state (capture point and velocity, both axes)
import json, sys, os, numpy as np; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
CTRL = {"kind": "U", "vd": 0.5, "from": 1, "ramp": {"a": 0.3}, "place": "maps", "uRefSim": False, "lat": {"rho": 0.4}, "adapt": None, "identFixed": True}
WALK = {"swingBase": {"w": "model", "learn": {"rate": 0.05}, "pure": [0]}}
KS = [10, 12, 14, 16, 18, 20, 22, 24, 26]
DES = [(df, 0.27, T) for df in (0.20, 0.24, 0.28, 0.32) for T in (0.36, 0.40, 0.44)] + [(0.26, dl, T) for dl in (0.21, 0.25, 0.29, 0.33) for T in (0.36, 0.44)]
if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "orbit"
    cases = [{"start": "L@0.6", "K": k, "req": list(u)} for k in KS for u in DES] + [{"start": "L@0.6", "K": k} for k in KS]
    extra = "--models mU1_tau --after 3 --ctrl '" + json.dumps(CTRL) + "' --walk '" + json.dumps(WALK) + "'"
    rows = run("e5_" + tag, cases, shards=8, extra=extra); print(tag, len(rows), "reached", sum(1 for r in rows if r.get("reached")))
