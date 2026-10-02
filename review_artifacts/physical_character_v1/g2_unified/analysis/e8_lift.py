# E8: swing execution vs the lift profile at matched states (Controller A's walk, steps 2–6, its own requests; swing internal model in all)
import json, sys, os, numpy as np; sys.path.insert(0, os.path.dirname(__file__)); from bench import run
STARTS = ["R@0.5", "R@0.55", "R@0.6", "L@0.5", "L@0.55", "L@0.6"]; KS = [2, 3, 4, 5, 6]
SB = {"w": "model", "learn": {"rate": 0.05}, "pure": [0], "use": False}
def summ(tag, rows):
    ok = [r for r in rows if r.get("reached") and r.get("land", {}).get("err")]
    e = np.array([r["land"]["err"][0] for r in ok]) * 100; sw = np.array([r["swing"]["landed"] for r in ok]); lag = np.array([r["swing"]["lagMax"] for r in ok]) * 100; clr = np.array([r["swing"]["minClr"] if r["swing"]["minClr"] is not None else np.nan for r in ok]) * 100
    trip = np.mean([r["swing"]["trip"] for r in ok]); rc = np.mean([len(r["swing"]["recons"]) for r in ok]); u = np.array([r["swing"]["uCmdAtTd"] or np.nan for r in ok])
    print(f"{tag:12s} n {len(ok):3d} | landing err {np.mean(e):+5.1f}±{np.std(e):4.1f} cm | landed {np.mean(sw)*100:3.0f}% | trips {trip*100:3.0f}% re-contacts/swing {rc:.2f} | peak lag {np.mean(lag):4.1f} cm | min toe clr {np.nanmedian(clr):4.1f} (p10 {np.nanpercentile(clr, 10):4.1f}) cm | u(cmd) at td {np.nanmean(u):.2f}")
if __name__ == "__main__":
    for tag, hum in [("base", {}), ("smooth20", {"liftShape": {"peak": 0.375}}), ("smooth14", {"liftShape": {"peak": 0.375}, "swingLiftH": 0.14}), ("smooth10", {"liftShape": {"peak": 0.375}, "swingLiftH": 0.10}), ("x12_14", {"swingLiftH": 0.14})]:
        cases = [{"start": s, "K": k, "mode": "ds", "var": {"walk": {"swingBase": {**SB, "use": True}}, **({"human": hum} if hum else {})}} for s in STARTS for k in KS]
        summ(tag, run("e8_" + tag, cases, extra="--walk '" + json.dumps({"swingBase": SB}) + "'"))
