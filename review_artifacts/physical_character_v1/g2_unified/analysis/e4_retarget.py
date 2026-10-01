# E4: SWING EXECUTION OF A MID-SWING FOOTHOLD CHANGE — at matched states (the unified controller's walk up to step K, step K commanded),
# the foothold moved by Δ forward at τ; landing error vs the final target, early touchdown, by Δ and τ
import json, sys, os, numpy as np; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
STARTS = ["R@0.5", "R@0.55", "R@0.6", "L@0.5", "L@0.55", "L@0.6"]; KS = [3, 4]
CTRL = {"kind": "U", "vd": 0.5, "from": 1, "ramp": {"a": 0.3}, "place": "maps", "uRefSim": False, "lat": {"rho": 0.4, "lo": 0.20}, "identFixed": True}
WALK = {"swingBase": {"w": "model", "learn": {"rate": 0.05}, "pure": [0]}}
def go(tag, human=None, taus=(0.1, 0.2, 0.3), ds=(-0.10, -0.05, 0.0, 0.05, 0.10), models="mU1_tau"):
    cases = [{"start": s, "K": k, "req": [0.26, 0.26, 0.40], **({"retarget": {"tau": t, "d": [d, 0]}} if d != 0 else {})} for s in STARTS for k in KS for t in taus for d in ds]
    extra = f"--models {models} --ctrl '" + json.dumps(CTRL) + "' --walk '" + json.dumps(WALK) + "'" + (" --human '" + json.dumps(human) + "'" if human else "")
    rows = run("e4_" + tag, cases, shards=8, extra=extra); print(tag, len(rows))
    for t in taus:
        line = []
        for d in ds:
            sub = [r for r in rows if r.get("reached") and abs((r["case"].get("retarget") or {"d": [0]})["d"][0] - d) < 1e-9 and (d == 0 or abs(r["case"]["retarget"]["tau"] - t) < 1e-9)]
            e = [r["land"]["err"][0] for r in sub if r["land"].get("err")]; u = [r["swing"]["uAtView"] for r in sub if r["swing"].get("uAtView")]
            line.append(f"Δ{d:+.2f}: err {np.mean(e)*100:+5.1f}±{np.std(e)*100:4.1f} uAt {np.mean(u):.2f}")
        print(f"  τ {t:.2f} | " + " | ".join(line))
if __name__ == "__main__": go(sys.argv[1] if len(sys.argv) > 1 else "base", json.loads(sys.argv[2]) if len(sys.argv) > 2 else None)
