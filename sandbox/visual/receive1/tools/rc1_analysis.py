# receive1/tools/rc1_analysis.py — the report's numbers from a receive matrix (rc1_matrix.sh output JSON): outcomes per class / angle / direction /
# speeds, turning before contact, families and feet, incoming / player momentum, handoff, failure classes
import sys, json, statistics as st, collections as C
rows = json.load(open(sys.argv[1])); out = {}
med = lambda a: round(st.median(a), 3) if a else None
q = lambda a, p: round(sorted(a)[int(p * (len(a) - 1))], 3) if a else None
oc = lambda v: dict(C.Counter(r["outcome"] for r in v))
out["n"] = len(rows); out["outcomes"] = oc(rows)
real = [r for r in rows if r["outcome"] in ("CLEAN", "TAKEN", "RECEIVED")]
out["realReceives"] = len(real)
for key, f in [("byClass", lambda r: r["cls"]), ("byAngle", lambda r: r["angle"]), ("byDir", lambda r: r["dir"]), ("byReceiver", lambda r: r["rs"]), ("byPass", lambda r: r["ps"])]:
    g = C.defaultdict(list)
    for r in rows: g[str(f(r))].append(r)
    out[key] = {k: dict(oc(v), n=len(v)) for k, v in sorted(g.items())}
turn = [r for r in real if r["cls"] == "turning"]
pre = [r for r in turn if r["turnReleasedAt"] is not None and r["turnReleasedAt"] <= r["first"]["t"] + 1e-9 and r["turnBy"] == "receive-turn"]
out["turning"] = {"realReceives": len(turn), "turnReleasedBeforeContact": len(pre), "leadS_median": med([r["first"]["t"] - r["turnReleasedAt"] for r in pre]), "leadS_p10_p90": [q([r["first"]["t"] - r["turnReleasedAt"] for r in pre], 0.1), q([r["first"]["t"] - r["turnReleasedAt"] for r in pre], 0.9)],
  "bodyTurnedAtContactDeg_median": med([abs(r["first"]["facingAtContact"]) for r in pre]), "byRole": dict(C.Counter(r["first"]["role"] for r in turn)),
  "firstTouchExitErrDeg_median_clean": med([abs(r["first"]["exitErr"]) for r in turn if r["outcome"] == "CLEAN"]), "firstToLineS_median_clean": med([r["firstToLine"] for r in turn if r["outcome"] == "CLEAN"]),
  "touchOnExitIsFirst_clean": sum(1 for r in turn if r["outcome"] == "CLEAN" and r["touchOnExit"] and r["touchOnExit"]["isFirst"]), "clean": sum(1 for r in turn if r["outcome"] == "CLEAN")}
r180 = [r for r in rows if r["angle"] == 180]
out["r180"] = {"n": len(r180), "outcomes": oc(r180), "cleanFirstTouchIsTurn": sum(1 for r in r180 if r["outcome"] == "CLEAN" and r["turnWithFirst"]), "cleanFirstToLine_median": med([r["firstToLine"] for r in r180 if r["outcome"] == "CLEAN"])}
out["families"] = dict(C.Counter(r["first"]["family"] for r in real)); out["roles"] = dict(C.Counter(r["first"]["role"] for r in real))
side = lambda r: "right" if (r["rtaSigned"] or 0) > 0 else "left"
out["feetInTurns"] = {s: dict(C.Counter(r["first"]["F"] + " " + r["first"]["reg"] for r in turn if side(r) == s)) for s in ("right", "left")}
out["cleanTurnsBySide"] = {s: sum(1 for r in turn if side(r) == s and r["outcome"] == "CLEAN") for s in ("right", "left")}
out["incoming"] = {"speedIn_median": med([r["first"]["speedIn"] for r in real]), "speedOut_median": med([r["first"]["speedOut"] for r in real]), "redirect_median": med([r["first"]["redirect"] for r in real]), "sigmaK_median": med([r["first"]["sigmaK"] for r in real]), "sigmaK_max": max(r["first"]["sigmaK"] for r in real),
  "cleanRateBySpeedIn": {b: (lambda v: [len(v), sum(1 for r in v if r["outcome"] == "CLEAN")])([r for r in real if lo <= r["first"]["speedIn"] < hi]) for b, lo, hi in [("<5", 0, 5), ("5-7", 5, 7), ("7-9", 7, 9), (">=9", 9, 99)]}}
RS = {"STAND": 0, "JOG": 3.0, "RUN": 5.5, "FAST": 7.8}
out["player"] = {rs: {"atFirst_median": med([r["speed"]["atFirst"] for r in real if r["rs"] == rs]), "at1s_median": med([r["speed"]["at1s"] for r in real if r["rs"] == rs and r["speed"]["at1s"] is not None]), "max_median": med([r["speed"]["max"] for r in real if r["rs"] == rs]), "init": RS[rs]} for rs in RS}
out["handoff"] = {"doubleTouches": sum(r["doubleTouches"] for r in rows), "sameFootRecontacts": sum(r["recontacts"] for r in rows), "runsWithRecontact": sum(1 for r in rows if r["recontacts"]), "handoffAcc_median": med([r["handoffAcc"] for r in rows if r["handoffAcc"] is not None]), "handoffAcc_p95": q([r["handoffAcc"] for r in rows if r["handoffAcc"] is not None], 0.95), "handoffAcc_max": max([r["handoffAcc"] for r in rows if r["handoffAcc"] is not None])}
out["failures"] = {"heavyFirstTouch": sum(1 for r in rows if r["heavy"]), "deflectedBeforeFirst": sum(1 for r in rows if r["preDeflections"]), "lostAfterFirst": sum(1 for r in rows if r["lostAfterFirst"] is not None), "recoveryRoleFirst": sum(1 for r in real if r["first"]["role"] == "recovery"), "faults": sum(1 for r in rows if r["fault"])}
json.dump(out, open(sys.argv[2], "w"), indent=1)
for k in ["n", "outcomes", "realReceives", "turning", "r180", "families", "roles", "feetInTurns", "cleanTurnsBySide", "incoming", "player", "handoff", "failures"]: print(k, json.dumps(out[k]))
