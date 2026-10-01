# E1: swing landing error at MATCHED states — base vs the swing IK / FF / path reading the TRUE state (diagnostic oracle), Controller A's own step
import json, sys, numpy as np; sys.path.insert(0, __import__("os").path.dirname(__file__)); from bench import run
STARTS = ["R@0.5", "R@0.55", "R@0.6", "L@0.5", "L@0.55", "L@0.6"]; KS = [2, 3, 4, 5, 6]
V = {"base": None, "oracle": {"loco": {"oracleSwing": True}}}
def summ(tag, rows):
    ok = [r for r in rows if r.get("reached") and r.get("land", {}).get("err")]
    e = np.array([r["land"]["err"][0] for r in ok]) * 100; sw = np.array([r["swing"]["ok"] for r in ok]); ak = np.array([r["swing"]["ankleVsLand"] or np.nan for r in ok]) * 100
    lag = np.array([r["swing"]["lagMax"] for r in ok]) * 100; ld = np.array([r["swing"]["leadMax"] for r in ok]) * 100; vm = np.array([r["swing"]["vmax"] for r in ok]); u = np.array([r["swing"]["uCmdAtTd"] or np.nan for r in ok])
    print(f"{tag:10s} n {len(ok):3d} | landing err fwd {np.mean(e):+5.1f}±{np.std(e):4.1f} cm | ankle vs landing pose {np.nanmean(ak):+5.1f} | swing ok {np.mean(sw)*100:3.0f}% | peak lag {np.mean(lag):4.1f} lead {np.mean(ld):4.1f} cm | vmax {np.mean(vm):.2f} | u(cmd) at td {np.nanmean(u):.2f}")
if __name__ == "__main__":
    for tag, var in V.items():
        cases = [{"start": s, "K": k, **({"var": var} if var else {})} for s in STARTS for k in KS]
        summ(tag, run("e1_" + tag, cases))
