"""cal8-candidate guardrails: matrix/quality/press on exp_ai P1+P2."""
import json, statistics, sys, os
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator" / "exp_ai"))
sys.path.insert(1, str(ROOT)); sys.path.insert(2, str(ROOT / "simulator"))
OUT = Path(__file__).parent / "out" / "ai_guardrails.jsonl"
FLAGS = {"F1": True, "F2": True, "F4": True, "F5": True, "F6": True}
SCEN = ([("matrix", n, i) for n in ("ultra","controlled","balanced","aggressive") for i in range(30)]
        + [("quality", n, i) for n in ("avg_vs_avg","strong_vs_avg","elite_vs_avg","avg_vs_weak") for i in range(25)]
        + [("press", n, i) for n in ("PASSIVE","SELECTIVE","AGGRESSIVE","RELENTLESS") for i in range(30)])

def _run(kind, name, idx):
    sys.path.insert(0, str(Path(__file__).parent))
    import ai_harness as H
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig
    from fc_simulator.data import apply_plan, build_mirrored_demo_teams, load_players
    from validation.scenarios import PLANS
    H.set_flags(**FLAGS)
    players, stats = load_players(ROOT / "simulator" / "data" / "players.json")
    if kind == "quality":
        from validation.scenarios import registry, scenario_seed
        sc = registry()["quality/" + name]
        home, away = build_mirrored_demo_teams(players)
        if PLANS[sc.home_plan]: apply_plan(home, PLANS[sc.home_plan])
        if PLANS[sc.away_plan]: apply_plan(away, PLANS[sc.away_plan])
        if sc.home_transform: sc.home_transform(home)
        if sc.away_transform: sc.away_transform(away)
        seed = scenario_seed("quality/" + name, idx)
    else:
        home, away = build_mirrored_demo_teams(players)
        if kind == "matrix":
            if PLANS.get(name):
                apply_plan(home, PLANS[name]); apply_plan(away, PLANS[name])
        else:
            import dataclasses
            if PLANS.get("balanced"):
                apply_plan(home, PLANS["balanced"]); apply_plan(away, PLANS["balanced"])
            home.tactics = dataclasses.replace(home.tactics, pressing_intensity=name)
        seed = 8600000 + hash((kind, name)) % 1000 * 1000 + idx
    eng = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=5400, coach_ai_enabled=False))
    eng.run(); eng.result()
    ev = [e.to_dict() for e in eng.events]
    xg = {t: round(sum((e["detail"] or {}).get("xg", 0) for e in ev if e["event_type"]=="SHOT" and e["team_id"]==t), 3) for t in ("HOME","AWAY")}
    dist = {t: round(sum(s.distance_m for s in eng._team_states(t, active_only=False))/1000, 1) for t in ("HOME","AWAY")}
    poss = {}
    for e in ev:
        pi = (e.get("detail") or {}).get("possession_id")
        if pi is None: continue
        p = poss.setdefault(pi, [e["timestamp"], e["timestamp"]]); p[1] = e["timestamp"]
    durs = [max(1,b-a+1) for a,b in poss.values()]
    return {"kind": kind, "name": name, "idx": idx, "xg": xg,
            "goals": [eng.score["HOME"], eng.score["AWAY"]],
            "shots": {t: sum(1 for e in ev if e["event_type"]=="SHOT" and e["team_id"]==t) for t in ("HOME","AWAY")},
            "shots25": sum(1 for e in ev if e["event_type"]=="SHOT" and e["detail"]["distance_m"]>=25),
            "box": sum(1 for e in ev if e["event_type"]=="BOX_ENTRY"),
            "poss_n": len(durs), "dur_mean": round(statistics.mean(durs),1) if durs else None,
            "trans_xg": round(sum((e["detail"] or {}).get("xg",0) for e in ev if e["event_type"]=="SHOT" and (e["detail"] or {}).get("transition")),2),
            "dist_km": dist}
def _star(t): return _run(*t)
if __name__ == "__main__":
    done = set()
    if OUT.exists():
        for l in open(OUT):
            r = json.loads(l); done.add((r["kind"], r["name"], r["idx"]))
    tasks = [t for t in SCEN if t not in done]
    print(len(tasks), "tasks")
    with ProcessPoolExecutor(max_workers=8) as ex, open(OUT, "a") as f:
        for i, m in enumerate(ex.map(_star, tasks)):
            f.write(json.dumps(m)+"\n"); f.flush()
            if i % 25 == 0: print(i+1, flush=True)
    print("PD-GUARDRAILS-DONE")
