"""BX dose-response: LIV boxCommitment ladder vs a counter-attacking AVL."""
import json, sys, copy, os, statistics
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "simulator"))
SEEDS = [900001 + 7919 * k for k in range(16)]
DOSES = ["Cautious", "Balanced", "Commit"]

def _run(args):
    dose, seed, cfg = args
    import bridge
    from fc_simulator import engine as em
    from fc_simulator.engine import MatchEngine
    from fc_simulator.geometry import attack_relative_x
    em.BX["P"] = "P" in cfg; em.BX["Q"] = "Q" in cfg
    sr = copy.deepcopy(json.load(open(ROOT / "simulator/validation/forensics/case7/start_request.json")))
    sr["away_team"]["tactics"]["boxCommitment"] = dose
    t = sr["home_team"]["tactics"]; t["afterWinningPossession"] = "Counter"; t["passingDirectness"] = "Direct"; t["buildUpTempo"] = "Quick"
    eng = MatchEngine(bridge.build_team(sr["home_team"],"HOME"), bridge.build_team(sr["away_team"],"AWAY"),
                      bridge.ATTRIBUTE_STATS, seed, bridge.build_config(sr.get("config"), sr.get("coach_ai")))
    staff2 = []
    pend = []
    seen = 0
    while not eng.is_finished:
        eng.advance(1)
        for e in eng.events[seen:]:
            if e.event_type == "BOX_ENTRY" and e.team_id == "AWAY": pend.append(e.timestamp)
        seen = len(eng.events)
        for t0 in pend[:]:
            if eng.clock - t0 == 2:
                n = sum(1 for s in eng._team_states("AWAY")
                        if s.slot != "GK" and attack_relative_x("AWAY", s.pos) >= 84.3 and 20.3 <= s.pos.y <= 79.7)
                staff2.append(n); pend.remove(t0)
    r = eng.result()
    pl = bridge.full_time_payload(eng, r)
    return {"dose": dose, "cfg": cfg, "a_xg": pl["team_stats"]["away"]["xg"],
            "a_box": pl["team_stats"]["away"]["box_entries"],
            "h_txg": pl["team_stats"]["home"]["transition_xg"], "h_xg": pl["team_stats"]["home"]["xg"],
            "staff2": (sum(staff2)/len(staff2)) if staff2 else 0.0}

def _star(a): return _run(a)

if __name__ == "__main__":
    tasks = [(d, s, c) for c in ("OFF","PQ") for d in DOSES for s in SEEDS]
    res = []
    with ProcessPoolExecutor(max_workers=8) as ex:
        for r in ex.map(_star, tasks): res.append(r)
    json.dump(res, open(Path(__file__).parent / "out" / "dose.json", "w"))
    m = statistics.median
    print(f"{'cfg':>4s} {'dose':>9s} {'a_xg':>6s} {'a_box':>6s} {'staff@2':>8s} {'AVL_txg':>8s} {'AVL_xg':>7s}")
    for c in ("OFF","PQ"):
        for d in DOSES:
            R = [r for r in res if r["dose"]==d and r["cfg"]==c]
            print(f"{c:>4s} {d:>9s} {m([r['a_xg'] for r in R]):>6.2f} {m([r['a_box'] for r in R]):>6.1f} "
                  f"{m([r['staff2'] for r in R]):>8.2f} {m([r['h_txg'] for r in R]):>8.2f} {m([r['h_xg'] for r in R]):>7.2f}")
    print("DOSE-DONE")
