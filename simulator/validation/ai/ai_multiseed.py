"""30-seed MW04 smoke: OFF vs ALL (final flags)."""
import json, statistics, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
OUT = Path(__file__).parent / "out" / "ai_multiseed.jsonl"

def _run(task):
    label, flags, seed = task
    import ai_harness as H
    from fc_simulator.geometry import attack_relative_x, distance_m, goal_center
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    GROUPS = {"LM":"W","RM":"W","LW":"W","RW":"W"}
    def relx(t,x): return x if t=="HOME" else 100.0-x
    corner = stranded4 = deep = over_w = 0
    win = False
    while not eng.is_finished:
        eng.advance(2)
        team = eng.possession_team
        brx = relx(team, eng.ball.pos.x)
        dteam = "AWAY" if team=="HOME" else "HOME"
        if brx >= 86 and abs(eng.ball.pos.y-50) >= 36: corner += 2
        if brx >= 72:
            deep += 2
            if sum(1 for p in eng._team_states(dteam) if p.slot!="GK" and relx(dteam,p.pos.x)>=45) >= 4: stranded4 += 2
        if brx >= 62:
            natt = sum(1 for p in eng._team_states(team) if p.slot!="GK" and relx(team,p.pos.x)>=62)
            ndef = sum(1 for p in eng._team_states(dteam) if p.slot!="GK" and relx(team,p.pos.x)>=62)
            if natt-ndef >= 1:
                if not win: over_w += 1; win = True
            else: win = False
        else: win = False
    eng.result()
    ev = [e.to_dict() for e in eng.events]
    shots = [e for e in ev if e["event_type"]=="SHOT"]
    return {"label": label, "seed": seed, "goals": [eng.score["HOME"], eng.score["AWAY"]],
            "xg": {t: round(sum(e["detail"]["xg"] for e in shots if e["team_id"]==t),2) for t in ("HOME","AWAY")},
            "shots": len(shots), "sh25": sum(1 for e in shots if e["detail"]["distance_m"]>=25),
            "sh35": sum(1 for e in shots if e["detail"]["distance_m"]>=35),
            "box": sum(1 for e in ev if e["event_type"]=="BOX_ENTRY"),
            "corner_s": corner, "stranded4": round(stranded4/max(1,deep),3), "overW": over_w,
            "dist": round(sum(s.distance_m for s in eng._team_states("HOME", active_only=False))/1000,1)}

if __name__ == "__main__":
    ALL = {"F1":True,"F2":True,"F4":True,"F5":True,"F6":True}
    tasks = [("OFF", {}, 6200000+i) for i in range(30)] + [("ALL", ALL, 6200000+i) for i in range(30)]
    done = set()
    if OUT.exists():
        for l in open(OUT):
            r = json.loads(l); done.add((r["label"], r["seed"]))
    tasks = [t for t in tasks if (t[0], t[2]) not in done]
    with ProcessPoolExecutor(max_workers=8) as ex, open(OUT,"a") as f:
        for m in ex.map(_run, tasks):
            f.write(json.dumps(m)+"\n"); f.flush()
    rows = [json.loads(l) for l in open(OUT)]
    for lab in ("OFF","ALL"):
        rs = [r for r in rows if r["label"]==lab]
        K = lambda f2: statistics.mean(f2(r) for r in rs)
        print(f"{lab:4s} n={len(rs)} goals {K(lambda r: r['goals'][0]):.2f}-{K(lambda r: r['goals'][1]):.2f} xG {K(lambda r: r['xg']['HOME']):.2f}/{K(lambda r: r['xg']['AWAY']):.2f} "
              f"shots {K(lambda r: r['shots']):.1f} sh25 {K(lambda r: r['sh25']):.1f} sh35 {K(lambda r: r['sh35']):.2f} box {K(lambda r: r['box']):.1f} "
              f"corner_s {K(lambda r: r['corner_s']):.0f} strand4 {K(lambda r: r['stranded4']):.3f} overW {K(lambda r: r['overW']):.1f} dist {K(lambda r: r['dist']):.0f}")
    print("AI-MS-DONE")
