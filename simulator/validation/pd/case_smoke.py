"""30-seed MW03 funnel smoke: OFF vs P1P2 (final source)."""
import json, statistics, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
OUT = Path(__file__).parent / "out" / "case_smoke.jsonl"
ACT = ("PASS","CARRY","DRIBBLE","SHIELD","CLEARANCE","SHOT","CROSS")
def _run(task):
    label, flags, seed = task
    import pd_harness as H
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    _, events = H.replay(eng, cmds)
    poss = {}
    for e in events:
        pi = (e.get("detail") or {}).get("possession_id")
        if pi is None: continue
        p = poss.setdefault(pi, {"team": e["team_id"], "uniq": set(), "acts": 0, "t0": e["timestamp"], "t1": e["timestamp"]})
        p["t1"] = e["timestamp"]
        if e["event_type"] in ACT: p["acts"] += 1; p["uniq"].add(e["actor_id"])
    def team(t, f): return f([p for p in poss.values() if p["team"]==t])
    return {"label": label, "seed": seed,
            "box": {t: sum(1 for e in events if e["event_type"]=="BOX_ENTRY" and e["team_id"]==t) for t in ("HOME","AWAY")},
            "xg": {t: round(sum((e["detail"] or {}).get("xg",0) for e in events if e["event_type"]=="SHOT" and e["team_id"]==t),2) for t in ("HOME","AWAY")},
            "sh25": sum(1 for e in events if e["event_type"]=="SHOT" and e["detail"]["distance_m"]>=25),
            "shots": sum(1 for e in events if e["event_type"]=="SHOT"),
            "goals": [eng.score["HOME"], eng.score["AWAY"]],
            "uniq": {t: round(statistics.mean([len(p["uniq"]) for p in poss.values() if p["team"]==t]),2) for t in ("HOME","AWAY")},
            "dur": {t: round(statistics.mean([max(1,p["t1"]-p["t0"]+1) for p in poss.values() if p["team"]==t]),1) for t in ("HOME","AWAY")}}
if __name__ == "__main__":
    tasks = [("OFF", {}, 7700000+i) for i in range(30)] + [("P1P2", {"P1":True,"P2":True}, 7700000+i) for i in range(30)]
    done = set()
    if OUT.exists():
        for l in open(OUT):
            r = json.loads(l); done.add((r["label"], r["seed"]))
    tasks = [t for t in tasks if (t[0], t[2]) not in done]
    with ProcessPoolExecutor(max_workers=8) as ex, open(OUT, "a") as f:
        for m in ex.map(_run, tasks):
            f.write(json.dumps(m)+"\n"); f.flush()
    print("CASE-SMOKE-DONE")
