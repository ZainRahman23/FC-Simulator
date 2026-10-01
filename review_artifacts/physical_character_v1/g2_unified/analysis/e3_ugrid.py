# E3: the step maps UNDER THE UNIFIED INNER LOOP, measured at matched states — step K's width, forward foothold and timing commanded from
# identical states (the unified controller's own walk up to step K; its stance reference / double-support target stay active at step K)
import json, sys, os; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
STARTS = ["R@0.5", "R@0.55", "R@0.6", "L@0.5", "L@0.55", "L@0.6"]; KS = [3, 4, 5]
DL = [0.17, 0.21, 0.25, 0.29, 0.33, 0.37]; DF = [0.18, 0.26]; TS = [0.36, 0.40, 0.44]
CTRL = {"kind": "U", "vd": 0.5, "from": 1, "ramp": {"a": 0.3}, "Tadapt": False, "identFixed": True}
WALK = {"swingBase": {"w": "model", "learn": {"rate": 0.05}, "pure": [0]}}
if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "u4map"; ctrl = {**CTRL, **(json.loads(sys.argv[2]) if len(sys.argv) > 2 else {})}
    cases = [{"start": s, "K": k, "req": [df, dl, T]} for s in STARTS for k in KS for dl in DL for df in DF for T in TS]
    extra = "--ctrl '" + json.dumps(ctrl) + "' --walk '" + json.dumps(WALK) + "'"
    rows = run("e3_" + tag, cases, shards=8, extra=extra); print(tag, len(rows))
