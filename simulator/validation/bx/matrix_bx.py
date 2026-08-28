"""BX guardrail: tactical matchup matrix with BX config from argv[1] (OFF/P/Q/PQ)."""
import json, sys, copy
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "simulator"))

SEEDS = [900001 + 7919 * k for k in range(12)]

LOWRISK = {"buildUpTempo":"Patient","passingDirectness":"Short","progressionRisk":"Secure",
           "attackingWidth":"Balanced","chanceCreationFocus":"Balanced","boxCommitment":"Cautious",
           "afterWinningPossession":"Secure","afterLosingPossession":"Regroup",
           "defensiveBlockHeight":"Deep","pressingIntensity":"Passive","defensiveWidth":"Narrow",
           "markingOrientation":"Zonal","defensiveLineBehavior":"Drop"}
BALANCED = {"buildUpTempo":"Balanced","passingDirectness":"Mixed","progressionRisk":"Balanced",
            "attackingWidth":"Balanced","chanceCreationFocus":"Balanced","boxCommitment":"Balanced",
            "afterWinningPossession":"Balanced","afterLosingPossession":"Balanced",
            "defensiveBlockHeight":"Mid","pressingIntensity":"Selective","defensiveWidth":"Balanced",
            "markingOrientation":"Zonal","defensiveLineBehavior":"Hold"}
AGGRESSIVE = {"buildUpTempo":"Quick","passingDirectness":"Mixed","progressionRisk":"Ambitious",
              "attackingWidth":"Wide","chanceCreationFocus":"Balanced","boxCommitment":"Commit",
              "afterWinningPossession":"Counter","afterLosingPossession":"Counterpress",
              "defensiveBlockHeight":"High","pressingIntensity":"Relentless","defensiveWidth":"Balanced",
              "markingOrientation":"Man-Oriented","defensiveLineBehavior":"Step Up"}
DEEPPASSIVE = {"buildUpTempo":"Patient","passingDirectness":"Direct","progressionRisk":"Secure",
               "attackingWidth":"Narrow","chanceCreationFocus":"Vertical","boxCommitment":"Cautious",
               "afterWinningPossession":"Secure","afterLosingPossession":"Regroup",
               "defensiveBlockHeight":"Deep","pressingIntensity":"Passive","defensiveWidth":"Narrow",
               "markingOrientation":"Zonal","defensiveLineBehavior":"Drop"}

COMBOS = {
    "live-base":        (None, None),
    "lowrisk-lowrisk":  (LOWRISK, LOWRISK),
    "bal-bal":          (BALANCED, BALANCED),
    "aggr-aggr":        (AGGRESSIVE, AGGRESSIVE),
    "avlaggr-livpass":  (AGGRESSIVE, LOWRISK),
    "avl-deeppassive":  (DEEPPASSIVE, None),   # LIV keeps user tactics vs WHU-style block
    "avl-midpress-livdirect": (None, "LIVDIRECT"),
}
LIVDIRECT = {"passingDirectness":"Mixed","buildUpTempo":"Balanced","progressionRisk":"Ambitious"}

import os
def _run(args):
    name, seed = args
    import bridge
    from fc_simulator import engine as em
    from fc_simulator.engine import MatchEngine
    cfg = os.environ.get("BX_CFG", "OFF")
    em.BX["P"] = "P" in cfg
    em.BX["Q"] = "Q" in cfg
    sr = json.load(open(Path(__file__).resolve().parents[3] / "simulator/validation/forensics/case7/start_request.json"))
    sr = copy.deepcopy(sr)
    hom, awy = COMBOS[name]
    if hom: sr["home_team"]["tactics"] = dict(hom)
    if awy == "LIVDIRECT":
        t = dict(sr["away_team"]["tactics"]); t.update(LIVDIRECT)
        sr["away_team"]["tactics"] = t
    elif awy: sr["away_team"]["tactics"] = dict(awy)
    eng = MatchEngine(bridge.build_team(sr["home_team"],"HOME"), bridge.build_team(sr["away_team"],"AWAY"),
                      bridge.ATTRIBUTE_STATS, seed, bridge.build_config(sr.get("config"), sr.get("coach_ai")))
    r = eng.run()
    pl = bridge.full_time_payload(eng, r)
    out = {"name": name, "seed": seed, "score": [eng.score["HOME"], eng.score["AWAY"]]}
    for tid, key in (("home","h"), ("away","a")):
        t = pl["team_stats"][tid]
        shots = [e for e in eng.events if e.event_type=="SHOT" and e.team_id==("HOME" if tid=="home" else "AWAY")]
        out[key] = {"xg": t["xg"], "shots": t["shots"], "box": t["box_entries"],
                    "boxsh": sum(1 for e in shots if e.detail["distance_m"]<=17.5),
                    "ch10": sum(1 for e in shots if e.detail["xg"]>=0.10),
                    "comp": t["pass_completion"], "txg": t["transition_xg"]}
    return out

def _star(a): return _run(a)

if __name__ == "__main__":
    tasks = [(n, s) for n in COMBOS for s in SEEDS]
    res = []
    with ProcessPoolExecutor(max_workers=8) as ex:
        for r in ex.map(_star, tasks): res.append(r)
    import os as _os; json.dump(res, open(Path(__file__).parent / "out" / ("matrix_bx_" + _os.environ.get("BX_CFG","OFF") + ".json"), "w"))
    import statistics
    print(f"{'combo':26s} {'h_xg':>6s} {'a_xg':>6s} {'h_box':>6s} {'a_box':>6s} {'h_bs':>5s} {'a_bs':>5s} {'ch10':>5s} {'0-0':>4s} {'comp h/a':>10s} {'txg':>6s}")
    for name in COMBOS:
        R = [r for r in res if r["name"]==name]
        m = lambda k, s: round(statistics.median(x[s][k] for x in R), 2)
        zz = sum(1 for r in R if r["score"]==[0,0])
        print(f"{name:26s} {m('xg','h'):6.2f} {m('xg','a'):6.2f} {m('box','h'):6.1f} {m('box','a'):6.1f} {m('boxsh','h'):5.1f} {m('boxsh','a'):5.1f} {m('ch10','h')+m('ch10','a'):5.1f} {zz:3d}/12 {m('comp','h'):5.2f}/{m('comp','a'):4.2f} {round(m('txg','h')+m('txg','a'),2):6.2f}")
    print("MATRIX7-DONE")
