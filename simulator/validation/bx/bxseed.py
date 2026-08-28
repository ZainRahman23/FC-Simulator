"""cal11 BX validation: matched-seed battery over the MW07 AVL-LIV fixture.

Configs: OFF / P / Q / PQ. Read-only 1 Hz instrumentation (positions sampled
between engine seconds; digest-neutrality of this replay style is long proven).
"""
import json, sys, statistics
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "simulator"))
SEEDS = [1473406334] + [900001 + 7919 * k for k in range(29)]
CONFIGS = {"OFF": (False, False), "P": (True, False), "Q": (False, True), "PQ": (True, True)}
SR = ROOT / "simulator/validation/forensics/case7/start_request.json"

def _run(args):
    name, seed = args
    import bridge
    from fc_simulator import engine as em
    from fc_simulator.engine import MatchEngine
    from fc_simulator.geometry import attack_relative_x
    em.BX["P"], em.BX["Q"] = CONFIGS[name]
    sr = json.load(open(SR))
    eng = MatchEngine(bridge.build_team(sr["home_team"], "HOME"), bridge.build_team(sr["away_team"], "AWAY"),
                      bridge.ATTRIBUTE_STATS, seed, bridge.build_config(sr.get("config"), sr.get("coach_ai")))
    def M(a, b): return (((a.x-b.x)*1.05)**2 + ((a.y-b.y)*0.68)**2) ** 0.5
    def relx(tid, p): return attack_relative_x(tid, p)
    def inbox(tid, p): return relx(tid, p) >= 84.3 and 20.3 <= p.y <= 79.7
    entries = []      # dicts: t, tid, actor, staff0/2/4, rest_def, entrant
    beats = []        # trackers
    attrs = {}
    for tm in (eng.home, eng.away):
        for p in list(tm.lineup.values()) + list(tm.bench):
            attrs[p.player_id] = ((p.attributes.get("sprint_speed", 60) + p.attributes.get("acceleration", 60)) / 2,
                                  p.attributes.get("dribbling", 60))
    name2pid = {}
    for tm in (eng.home, eng.away):
        for p in list(tm.lineup.values()) + list(tm.bench):
            name2pid[p.name] = p.player_id
    def staff(tid, exclude):
        return sum(1 for s in eng._team_states(tid)
                   if s.slot != "GK" and s.player.player_id != exclude and inbox(tid, s.pos))
    def restdef(tid):
        return sum(1 for s in eng._team_states(tid) if s.slot != "GK" and relx(tid, s.pos) <= 45.0)
    seen = 0
    while not eng.is_finished:
        eng.advance(1)
        for e in eng.events[seen:]:
            if e.event_type == "BOX_ENTRY":
                entries.append({"t": e.timestamp, "tid": e.team_id, "actor": e.actor_id,
                                "staff": {0: None, 2: None, 4: None}, "rest": restdef(e.team_id)})
            elif e.event_type == "DRIBBLE" and e.detail.get("outcome") == "BEAT":
                dfd = name2pid.get(e.detail["defender"])
                if dfd:
                    st = eng.states.get(e.actor_id)
                    beats.append({"t": e.timestamp, "att": e.actor_id, "dfd": dfd, "tid": e.team_id,
                                  "rx0": relx(e.team_id, st.pos) if st else None, "press": e.detail.get("pressure"),
                                  "rows": [], "next_gap": None, "next_kind": None})
        seen = len(eng.events)
        # per-second sampling for open trackers
        for en in entries:
            dt = eng.clock - en["t"]
            if dt in (0, 2, 4) and en["staff"][dt] is None:
                en["staff"][dt] = staff(en["tid"], en["actor"])
        for tr in beats:
            dt = eng.clock - tr["t"]
            if 0 <= dt <= 5:
                sa = eng.states.get(tr["att"]); sd = eng.states.get(tr["dfd"])
                if sa and sd:
                    tr["rows"].append({"dt": dt, "sep": M(sa.pos, sd.pos),
                                       "arx": relx(tr["tid"], sa.pos),
                                       "ax": sa.pos.x, "ay": sa.pos.y,
                                       "poss": eng.possession_team == tr["tid"]})
    r = eng.result()
    pl = __import__("bridge").full_time_payload(eng, r)
    ev = [e for e in eng.events]
    # post-pass over the ledger for outcomes
    led = [dict(t=e.timestamp, k=e.event_type, a=e.actor_id, d=e.detail or {}, tid=e.team_id) for e in ev]
    pc = [(e["t"], e["d"].get("from")) for e in led if e["k"] == "POSSESSION_CHANGE"]
    onball = {"CARRY", "PASS", "SHOT", "DRIBBLE", "CROSS", "SHIELD", "CLEARANCE"}
    for en in entries:
        w = [e for e in led if en["t"] < e["t"] <= en["t"] + 8 and e["tid"] == en["tid"]]
        en["shot"] = next((e["d"].get("xg", 0.0) for e in w if e["k"] == "SHOT"), None)
        lost = any(en["t"] < t <= en["t"] + 6 and tt == en["tid"] for t, tt in pc)
        en["recycled"] = en["shot"] is None and not lost
    for tr in beats:
        nxt = next((e for e in led if e["t"] > tr["t"] + 1 and e["a"] == tr["att"] and e["k"] in onball), None)
        if nxt: tr["next_gap"], tr["next_kind"] = nxt["t"] - (tr["t"] + 1), nxt["k"]
        tr["lost5"] = any(tr["t"] < t <= tr["t"] + 5 and tt == tr["tid"] for t, tt in pc)
        tr["down_box"] = any(e["k"] == "BOX_ENTRY" and tr["t"] < e["t"] <= tr["t"] + 10 and e["tid"] == tr["tid"] for e in led)
        tr["down_shot"] = any(e["k"] == "SHOT" and tr["t"] < e["t"] <= tr["t"] + 10 and e["tid"] == tr["tid"] for e in led)
        tr["dpace"] = attrs[tr["att"]][0] - attrs[tr["dfd"]][0]
        tr["ddrib"] = attrs[tr["att"]][1] - attrs[tr["dfd"]][1]
        rows = [x for x in tr["rows"] if x["poss"]]
        tr["gain"] = (rows[-1]["arx"] - rows[0]["arx"]) * 1.05 if len(rows) >= 2 else None
        tr["aspd"] = (sum((((rows[i+1]["ax"]-rows[i]["ax"])*1.05)**2 + ((rows[i+1]["ay"]-rows[i]["ay"])*0.68)**2) ** 0.5
                      for i in range(len(rows)-1)) / (len(rows)-1)) if len(rows) >= 3 else None
        tr["sep"] = {x["dt"]: round(x["sep"], 2) for x in tr["rows"]}
        del tr["rows"]
    out = {"cfg": name, "seed": seed, "score": [eng.score["HOME"], eng.score["AWAY"]]}
    for tid, key in (("home", "h"), ("away", "a")):
        t = pl["team_stats"][tid]
        T = "HOME" if tid == "home" else "AWAY"
        shots = [e for e in led if e["k"] == "SHOT" and e["tid"] == T]
        out[key] = {"xg": t["xg"], "shots": t["shots"], "box": t["box_entries"],
                    "boxsh": sum(1 for e in shots if e["d"].get("distance_m", 99) <= 17.5),
                    "ch05": sum(1 for e in shots if e["d"].get("xg", 0) >= 0.05),
                    "ch10": sum(1 for e in shots if e["d"].get("xg", 0) >= 0.10),
                    "ch20": sum(1 for e in shots if e["d"].get("xg", 0) >= 0.20),
                    "cutwin": t["cutback_windows"], "crosses": t["crosses"], "contacts": t["cross_attacker_contacts"],
                    "txg_conceded": pl["team_stats"]["away" if tid == "home" else "home"]["transition_xg"],
                    "comp": t["pass_completion"]}
    out["entries"] = entries
    out["beats"] = beats
    return out

def _star(a): return _run(a)

if __name__ == "__main__":
    cfgs = sys.argv[1].split(",") if len(sys.argv) > 1 else list(CONFIGS)
    tasks = [(n, s) for n in cfgs for s in SEEDS]
    res = []
    with ProcessPoolExecutor(max_workers=8) as ex:
        for i, r in enumerate(ex.map(_star, tasks)):
            res.append(r)
            if i % 15 == 0: print(f"{i+1}/{len(tasks)}", flush=True)
    outp = Path(__file__).parent / "out"
    outp.mkdir(exist_ok=True)
    json.dump(res, open(outp / "bxseed.json", "w"))
    print("BXSEED-DONE", len(res))
