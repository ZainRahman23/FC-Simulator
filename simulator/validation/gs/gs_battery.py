"""cal10 battery: SUN/EVE state-split multiseed, mirror symmetry, matrix/quality with coach AI."""
import json, sqlite3, statistics, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator" / "exp_gs"))
sys.path.insert(1, str(ROOT)); sys.path.insert(2, str(ROOT / "simulator"))
OUT = Path(__file__).parent / "out" / "gs_battery.jsonl"
DB = Path.home() / "TouchlineRC1" / "data" / "touchline.db"
GOOD = {"COMPLETED","AERIAL_COMPLETED","COMPLETED_INTO_SPACE"}

TASKS = ([("sun", pol, i) for pol in (0,1) for i in range(30)]
         + [("eve", pol, i) for pol in (0,1) for i in range(30)]
         + [("mirror_bal", pol, i) for pol in (0,1) for i in range(20)]
         + [("matrix_"+n, 1, i) for n in ("ultra","controlled","aggressive") for i in range(12)]
         + [("matrix_"+n, 0, i) for n in ("ultra","controlled","aggressive") for i in range(12)]
         + [("quality_"+n, pol, i) for pol in (0,1) for n in ("elite_vs_avg","avg_vs_weak") for i in range(12)])

def _run(kind, policy, idx):
    import fc_simulator.engine as EM
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig
    from fc_simulator.geometry import attack_relative_x
    EM.GS["policy"] = bool(policy)
    import bridge
    if kind in ("sun", "eve"):
        mid = "823b438c4890" if kind == "sun" else "ea63cd2c4c6d"
        c = sqlite3.connect(f"file:{DB}?mode=ro", uri=True); c.row_factory = sqlite3.Row
        sr = json.loads(dict(c.execute("SELECT * FROM matches WHERE match_id=?", (mid,)).fetchone())["start_request_json"])
        home = bridge.build_team(sr["home_team"], "HOME"); away = bridge.build_team(sr["away_team"], "AWAY")
        cfg = bridge.build_config(sr.get("config"), sr.get("coach_ai"))
        eng = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, 8800000+idx, cfg)
    else:
        from validation.scenarios import PLANS, registry, scenario_seed
        from fc_simulator.data import apply_plan, build_mirrored_demo_teams, load_players
        players, stats = load_players(ROOT / "simulator" / "data" / "players.json")
        home, away = build_mirrored_demo_teams(players)
        if kind.startswith("matrix_"):
            nm = kind.split("_",1)[1]
            if PLANS.get(nm): apply_plan(home, PLANS[nm]); apply_plan(away, PLANS[nm])
            seed = 8900000+idx
        elif kind == "mirror_bal":
            seed = 8950000+idx
        else:
            sc = registry()["quality/"+kind.split("_",1)[1]]
            if PLANS[sc.home_plan]: apply_plan(home, PLANS[sc.home_plan])
            if PLANS[sc.away_plan]: apply_plan(away, PLANS[sc.away_plan])
            if sc.home_transform: sc.home_transform(home)
            if sc.away_transform: sc.away_transform(away)
            seed = scenario_seed("quality/"+kind.split("_",1)[1], idx)
        eng = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=5400, coach_ai_enabled=True))
    # state-split sampling every 3s
    state_secs = {"level": 0, "down1": 0, "down2": 0, "up": 0}
    fb_by_state = {k: [0,0] for k in state_secs}
    while not eng.is_finished:
        eng.advance(3)
        m = eng.score["HOME"] - eng.score["AWAY"]
        k = "level" if m==0 else ("down1" if m==-1 else ("down2" if m<=-2 else "up"))
        state_secs[k] += 3
        for p in eng._team_states("HOME"):
            if p.slot in ("LB","RB"):
                fb_by_state[k][0] += 1
                if attack_relative_x("HOME", p.pos) > 50: fb_by_state[k][1] += 1
    eng.result()
    ev = [e.to_dict() for e in eng.events]
    def xs(t, pred=lambda e: True):
        return round(sum(e["detail"].get("xg",0) for e in ev if e["event_type"]=="SHOT" and e["team_id"]==t and pred(e)),3)
    ps = [e for e in ev if e["event_type"]=="PASS" and e["team_id"]=="HOME"]
    risk_events = [ (e["timestamp"]//60, e["team_id"], (e.get("detail") or {}).get("mode")) for e in ev if e["event_type"]=="TACTIC_CHANGE"]
    return {"kind": kind, "policy": policy, "idx": idx,
            "goals": [eng.score["HOME"], eng.score["AWAY"]],
            "xg_home": xs("HOME"), "xg_away": xs("AWAY"),
            "box_home": sum(1 for e in ev if e["event_type"]=="BOX_ENTRY" and e["team_id"]=="HOME"),
            "comp_home": round(sum(1 for e in ps if e["detail"].get("outcome") in GOOD)/max(1,len(ps)),3),
            "long_home": round(sum(1 for e in ps if e["detail"]["distance_m"]>=27)/max(1,len(ps)),3),
            "fb_down": {k: round(100*v[1]/max(1,v[0]),1) for k,v in fb_by_state.items()},
            "state_secs": state_secs,
            "dist_home": round(sum(s.distance_m for s in eng._team_states("HOME", active_only=False))/1000,1),
            "energy_min": round(min((s.energy for s in eng._team_states("HOME")), default=0),1),
            "risk_events": risk_events[:10]}

def _star(t): return _run(*t)
if __name__ == "__main__":
    done = set()
    if OUT.exists():
        for l in open(OUT):
            r = json.loads(l); done.add((r["kind"], r["policy"], r["idx"]))
    tasks = [t for t in TASKS if t not in done]
    print(len(tasks), "tasks")
    with ProcessPoolExecutor(max_workers=8) as ex, open(OUT,"a") as f:
        for i,m in enumerate(ex.map(_star, tasks)):
            f.write(json.dumps(m)+"\n"); f.flush()
            if i%20==0: print(i+1, flush=True)
    print("GS-BATTERY-DONE")
