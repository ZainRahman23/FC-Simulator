"""Family C acceptance (§19): buildup support, back-line pass profile, typology."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator" / "validation" / "st"))
import st_harness as H
from st_harness import distance_m

GROUPS = {"GK":"GK","LCB":"CB","RCB":"CB","LB":"FB","RB":"FB","CDM":"DM","LDM":"DM","RDM":"DM",
          "LCM":"CM","RCM":"CM","LM":"W","RM":"W","LW":"W","RW":"W","LAM":"AM","CAM":"AM","RAM":"AM","ST":"ST"}

def run(flags):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine()
    from fc_simulator.geometry import attack_relative_x
    sup_rows = []
    orig = eng._decision
    def wrapped():
        c = eng._carrier()
        relx = attack_relative_x(c.team_id, c.pos)
        g = GROUPS.get(c.slot)
        if relx <= 33.3 and g in ("GK","CB","FB","DM"):
            mates = [m for m in eng._team_states(c.team_id) if m.slot != "GK" and m.active and m is not c]
            sup_rows.append({"grp": g,
                             "s8": sum(1 for m in mates if distance_m(m.pos, c.pos) <= 8),
                             "s12": sum(1 for m in mates if distance_m(m.pos, c.pos) <= 12)})
        orig()
    eng._decision = wrapped
    digest, events = H.replay(eng, cmds)
    pid_slot = {}
    for tid in ("HOME","AWAY"):
        for st_ in eng._team_states(tid, active_only=False):
            pid_slot[st_.player.player_id] = st_.slot
    def grp(pid): return GROUPS.get(pid_slot.get(pid, ""), "?")
    bl = [e for e in events if e["event_type"]=="PASS" and grp(e["actor_id"]) in ("GK","CB","FB","DM")]
    res = {
        "defthird_support": {g: {"n": len([r for r in sup_rows if r["grp"]==g]),
                                 "s8": round(statistics.mean([r["s8"] for r in sup_rows if r["grp"]==g]),2) if any(r["grp"]==g for r in sup_rows) else None,
                                 "s12": round(statistics.mean([r["s12"] for r in sup_rows if r["grp"]==g]),2) if any(r["grp"]==g for r in sup_rows) else None}
                             for g in ("GK","CB","FB","DM")},
        "backline_passes": len(bl),
        "backline_30m_share": round(sum(1 for e in bl if e["detail"]["distance_m"]>=30)/max(1,len(bl)),3),
        "backline_under_15m_share": round(sum(1 for e in bl if e["detail"]["distance_m"]<15)/max(1,len(bl)),3),
        "recycle": {},
        "score": [eng.score["HOME"], eng.score["AWAY"]],
        "pass_comp": {}
    }
    for pair in (("CB","CB"),("CB","FB"),("FB","CB"),("CB","DM"),("DM","CB"),("GK","CB"),("FB","DM")):
        res["recycle"]["->".join(pair)] = sum(1 for e in bl if grp(e["actor_id"])==pair[0] and grp(e["detail"].get("target_id",""))==pair[1])
    GOOD = {"COMPLETED","AERIAL_COMPLETED","COMPLETED_INTO_SPACE"}
    for team in ("HOME","AWAY"):
        ps = [e for e in events if e["event_type"]=="PASS" and e["team_id"]==team]
        res["pass_comp"][team] = round(sum(1 for e in ps if e["detail"].get("outcome") in GOOD)/max(1,len(ps)),3)
    return res

if __name__ == "__main__":
    out = {}
    for label, flags in (("base", {}), ("C_only", {"C":True}), ("BC", {"B":True,"C":True}), ("ABC", {"A":True,"B":True,"C":True})):
        out[label] = run(dict(flags))
        print(label, "done", flush=True)
    json.dump(out, open(H.OUT / "famC_case.json", "w"), indent=1)
    for k, v in out.items():
        print(k, json.dumps(v))
