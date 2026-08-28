"""§50 set-piece validation: direct FKs and penalties under attribute counterfactuals."""
import dataclasses, statistics as st, sys
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

_C = None
def _players():
    global _C
    if _C is None:
        from fc_simulator.data import load_players
        _C = load_players(Path(__file__).resolve().parents[1] / "data" / "players.json")
    return _C

def run_one(task):
    attr, delta, idx = task
    from validation.scenarios import scenario_seed
    from fc_simulator.data import build_mirrored_demo_teams
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig
    players, stats = _players()
    home, away = build_mirrored_demo_teams(players)
    eng = MatchEngine(home, away, stats, scenario_seed(f"setpiece/{attr}", idx),
                      MatchConfig(duration_seconds=90*60, coach_ai_enabled=False))
    for s in eng.states.values():
        if s.team_id == "HOME" and s.slot != "GK":
            p = s.player
            s.player = dataclasses.replace(p, attributes={**p.attributes, attr: float(delta)})
    eng.run()
    out = defaultdict(float)
    for e in eng.events:
        det = e.detail
        if e.event_type == "FREE_KICK" and e.team_id == "HOME":
            out["fk_awarded"] += 1
        elif e.event_type == "SHOT" and e.team_id == "HOME" and det.get("shot_type") == "DIRECT_FREE_KICK":
            out["fk_shots"] += 1
            out["fk_xg"] += det.get("xg", 0)
            out["fk_p_on"] += det.get("p_on_target", 0)
            if det.get("outcome") == "GOAL": out["fk_goals"] += 1
            if det.get("outcome") not in ("MISS",): out["fk_on_target"] += 1
        elif e.event_type == "PENALTY" and e.team_id == "HOME":
            out["pens_awarded"] += 1
            out["pen_p_goal"] += det.get("p_goal", 0)
            if det.get("outcome") == "GOAL": out["pen_goals"] += 1
    return attr, delta, dict(out)

def main():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    tasks = [(a, d, i) for a in ("free_kick_accuracy", "penalties") for d in (55, 90) for i in range(N)]
    agg = defaultdict(lambda: defaultdict(float))
    cnt = defaultdict(int)
    with ProcessPoolExecutor(max_workers=8) as ex:
        for attr, delta, m in ex.map(run_one, tasks, chunksize=2):
            k = (attr, delta); cnt[k] += 1
            for kk, v in m.items(): agg[k][kk] += v
    for (attr, delta), m in sorted(agg.items()):
        n = cnt[(attr, delta)]
        if attr == "free_kick_accuracy":
            shots = max(1, m["fk_shots"])
            print(f"FKA {f'={delta}'}: FK awarded {m['fk_awarded']/n:.2f}/m  direct shots {m['fk_shots']/n:.3f}/m  "
                  f"mean p_on {m['fk_p_on']/shots:.3f}  on-target {m['fk_on_target']/shots:.3f}  goals/shot {m['fk_goals']/shots:.4f}")
        else:
            pens = max(1, m["pens_awarded"])
            print(f"PEN {f'={delta}'}: pens awarded {m['pens_awarded']/n:.3f}/m  mean p_goal {m['pen_p_goal']/pens:.3f}  conversion {m['pen_goals']/pens:.3f}")

if __name__ == "__main__":
    main()
