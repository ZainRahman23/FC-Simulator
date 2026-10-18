# receive11/tools/rx_analysis.py — the report's numbers from the evidence: python3 rx_analysis.py <evidence dir> <out analysis.json>
# (matrix_714.json = the RECEIVE-CONTROL-1 situations × seeds 1-3; blocks_K_KG_BC.json = kill / kill-and-go / Ball Control sweep; RECEIVE-CONTROL-1's
#  own analysis.json for the comparison)
import json, sys, os, statistics as st
from collections import Counter, defaultdict
EV = sys.argv[1]; OUT = sys.argv[2]
M = json.load(open(os.path.join(EV, "matrix_714.json"))); B = json.load(open(os.path.join(EV, "blocks_K_KG_BC.json")))
RC1 = os.path.join(EV, "../../receive1/evidence/analysis.json"); rc1 = json.load(open(RC1)) if os.path.exists(RC1) else None
med = lambda a: round(st.median(a), 3) if a else None
pct = lambda a, n: round(100 * a / n, 1) if n else None
A = {"n": len(M)}
A["outcomes"] = dict(Counter(r["outcome"] for r in M)); A["cls5"] = dict(Counter(r["cls5"] for r in M))
ct = [r for r in M if r["contact"] and r["contact"]["launched"]]; A["contactMade"] = len(ct)
def grp(key, order=None):
    g = defaultdict(Counter); n = Counter(); c = Counter()
    for r in M: k = key(r); g[k][r["cls5"]] += 1; n[k] += 1; c[k] += 1 if (r["contact"] and r["contact"]["launched"]) else 0
    return {str(k): {"n": n[k], "contact": c[k], **dict(g[k])} for k in (order or sorted(g))}
A["byClass"] = grp(lambda r: r["cls"], ["ordinary", "turning"]); A["byAngle"] = grp(lambda r: r["angle"]); A["byDir"] = grp(lambda r: r["dir"], ["F", "FL", "FR", "L", "R", "RL", "RR"])
A["byReceiver"] = grp(lambda r: r["rs"], ["STAND", "JOG", "RUN", "FAST"]); A["byPass"] = grp(lambda r: r["ps"], ["SOFT", "MED", "FIRM"])
A["families"] = dict(Counter(r["action"]["fam"] for r in M if r["action"])); A["footSurface"] = dict(Counter(f'{r["action"]["F"]}-{r["action"]["surface"]}' for r in M if r["action"]))
A["familyByAngle"] = {str(a): dict(Counter(r["action"]["fam"] for r in M if r["action"] and r["angle"] == a)) for a in sorted(set(r["angle"] for r in M))}
A["missed"] = {"n": sum(1 for r in M if r["cls5"] == "MISSED"), "why": dict(Counter(r["outcome"] for r in M if r["cls5"] == "MISSED")), "situations": dict(Counter(r["id"] for r in M if r["cls5"] == "MISSED"))}
A["missedOrdinaryNonRear"] = sum(1 for r in M if r["cls5"] == "MISSED" and r["cls"] == "ordinary" and r["dir"] not in ("RL", "RR"))
# turns: the intermediate ball vector (ideal touch direction vs the exit) by turn size; the families of the large turns
big = [r for r in ct if r["cls"] == "turning"]
A["intermediate"] = {f"{lo}-{hi}": {"n": len(s), "idealVsExitMedianAbs": med([abs(r["action"]["idealVsExit"]) for r in s]), "rotPreMedian": med([abs(r["action"]["rotPre"]) for r in s]), "rotExitMedian": med([abs(r["action"]["rotExit"]) for r in s]), "families": dict(Counter(r["action"]["fam"] for r in s))}
  for lo, hi in [(90, 90), (120, 135), (180, 180), (225, 240), (270, 271)] for s in [[r for r in big if lo <= r["angle"] <= hi]]}
A["deg180"] = {"n": sum(1 for r in M if r["angle"] == 180), **dict(Counter(r["cls5"] for r in M if r["angle"] == 180)), "families": dict(Counter(r["action"]["fam"] for r in M if r["angle"] == 180 and r["action"])), "contactSpeedMedian": med([r["speed"]["atContact"] for r in M if r["angle"] == 180 and r["speed"]["atContact"] is not None])}
# braking: ordinary receives of runners (start > 4 m/s): the speed at the contact against the speed at the action start
o = [r for r in ct if r["cls"] == "ordinary" and r["speed"]["start"] and r["speed"]["start"] > 4]
A["braking"] = {"ordinaryRunners": len(o), "contactOverStartMedian": med([r["speed"]["atContact"] / r["speed"]["start"] for r in o]), "atLeast90pct": sum(1 for r in o if r["speed"]["atContact"] >= 0.9 * r["speed"]["start"]),
  "frontAndFrontSide": {"n": len([r for r in o if r["dir"] in ("F", "FL", "FR")]), "contactOverStartMedian": med([r["speed"]["atContact"] / r["speed"]["start"] for r in o if r["dir"] in ("F", "FL", "FR")])},
  "sidePassesBehindRunner": {"n": len([r for r in o if r["dir"] in ("L", "R")]), "contactOverStartMedian": med([r["speed"]["atContact"] / r["speed"]["start"] for r in o if r["dir"] in ("L", "R")])}}
f = [r for r in ct if r["rs"] == "FAST"]
A["fullThrottle"] = {"n": len(f), "ordinary": {"n": len([r for r in f if r["cls"] == "ordinary"]), "contactSpeedMedian": med([r["speed"]["atContact"] for r in f if r["cls"] == "ordinary"]), "handoffSpeedMedian": med([r["speed"]["atHandoff"] for r in f if r["cls"] == "ordinary" and r["speed"]["atHandoff"]])},
  "turning": {"n": len([r for r in f if r["cls"] == "turning"]), "contactSpeedMedian": med([r["speed"]["atContact"] for r in f if r["cls"] == "turning"]), "handoffSpeedMedian": med([r["speed"]["atHandoff"] for r in f if r["cls"] == "turning" and r["speed"]["atHandoff"]])}}
ho = [r for r in ct if r["handoff"]]
A["handoff"] = {"n": len(ho), "accMedian": med([r["handoff"]["acc"] for r in ho]), "accMax": max(r["handoff"]["acc"] for r in ho), "yawStepMax": max(r["handoff"]["yawStep"] for r in ho), "requestVsExitMax": max(r["handoff"]["reqVsExit"] for r in ho),
  "ballAheadMedian": med([r["handoff"]["ballRel"][0] for r in ho]), "ballLateralAbsMedian": med([abs(r["handoff"]["ballRel"][1]) for r in ho]), "doubleTouches": sum(r["doubleTouches"] for r in M), "recontacts": sum(r["recontacts"] for r in M),
  "nextTouchAfterHandoff": sum(1 for r in ho if r["nextTouch"]), "takenNoDribbleTouch": sum(1 for r in M if r["outcome"] == "TAKEN" and not r["nextTouch"])}
A["execution"] = {"dirErrAbsMedian": med([abs(r["contact"]["dirErr"]) for r in ct]), "heavy": sum(1 for r in ct if r["heavy"]), "short": sum(1 for r in ct if r["short"]), "reconMissMedian": med([r["recon"]["miss"] for r in ct if r["recon"]]), "DMedian": med([r["action"]["D"] for r in ct]), "Dp90": sorted([r["action"]["D"] for r in ct])[int(0.9 * len(ct))]}
A["cpuParallel"] = {"receiveMsPerSMedian": med([r["cpu"]["recvPerS"] for r in M if r["cpu"]["recvPerS"]]), "candidatesMean": round(st.mean([r["cands"] for r in M]), 1)}
# blocks
k = [r for r in B if r["intent"] == "kill" and "KILLGO" not in r["id"]]; kg = [r for r in B if "KILLGO" in r["id"]]
A["kill"] = {"hold": {"n": len(k), **dict(Counter(r["outcome"] for r in k)), "restDistMedian": med([r["kill"]["dist"] for r in k if r["kill"]]), "restAheadMedian": med([r["kill"]["ahead"] for r in k if r["kill"]]), "restTimeMedian": med([r["kill"]["restT"] for r in k if r["kill"] and r["kill"]["restT"] is not None]), "speedOutMedian": med([r["kill"]["speedOut"] for r in k if r["kill"]])},
  "go": {"n": len(kg), **dict(Counter(r["outcome"] for r in kg))}}
bc = [r for r in B if "_BC" in r["id"]]
A["ballControl"] = {}
for b in [99, 89, 80, 70, 60, 50, 40]:
    s = [r for r in bc if r["bc"] == b]; c2 = [r for r in s if r["contact"] and r["contact"]["launched"]]; de = sorted(abs(r["contact"]["dirErr"]) for r in c2); se = sorted(abs(r["contact"]["speedErr"]) for r in c2); rm = sorted(r["recon"]["miss"] for r in c2 if r["recon"])
    A["ballControl"][str(b)] = {"n": len(s), **dict(Counter(r["cls5"] for r in s)), "dirErrMedian": med(de), "dirErrP90": de[int(0.9 * len(de))] if de else None, "speedErrMedian": med(se), "speedErrP90": se[int(0.9 * len(se))] if se else None, "reconMissMedian": med(rm), "reconMissP90": rm[int(0.9 * len(rm))] if rm else None, "heavy": sum(1 for r in c2 if r["heavy"]), "short": sum(1 for r in c2 if r["short"])}
if rc1: A["rc1"] = {"n": rc1.get("n"), "outcomes": rc1.get("outcomes")}
json.dump(A, open(OUT, "w"), indent=1)
print(json.dumps({k: A[k] for k in ["outcomes", "contactMade", "missed", "braking", "fullThrottle", "handoff", "execution", "deg180", "kill"]}, indent=0)[:6000])
for b, v in A["ballControl"].items(): print("BC", b, v)
for kk, v in A["intermediate"].items(): print("turn", kk, v)
