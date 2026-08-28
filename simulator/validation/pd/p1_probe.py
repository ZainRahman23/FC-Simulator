"""P1 gates: reachability ceilings, sustained-final-third CB/FB, staffing, rest defense."""
import dataclasses, json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import pd_harness as H
from fc_simulator.geometry import from_attack_frame, attack_relative_x, move_toward
GROUPS = {"GK":"GK","LCB":"CB","RCB":"CB","LB":"FB","RB":"FB","CDM":"DM","LDM":"DM","RDM":"DM",
          "LCM":"CM","RCM":"CM","LM":"W","RM":"W","LW":"W","RW":"W","LAM":"AM","CAM":"AM","RAM":"AM","ST":"ST"}
def relx(team,x): return x if team=="HOME" else 100.0-x

def reachability(p1):
    H.set_flags(P1=p1)
    eng, cmds, _ = H.build_case_engine(seed=42)
    eng.advance(30)
    eng.possession_team = "HOME"
    eng.teams["HOME"].tactics = dataclasses.replace(eng.teams["HOME"].tactics,
        progression_risk="AMBITIOUS", box_commitment="COMMIT", passing_directness="SHORT")
    eng.last_turnover_time = -999
    eng.possession_started_at = eng.clock - 25
    carrier = next(s for s in eng._team_states("HOME") if s.slot == "ST")
    carrier.pos = from_attack_frame("HOME", 76.0, 55.0)
    eng.ball.pos = carrier.pos
    eng.ball.controlling_player_id = carrier.player.player_id
    out = {}
    for slot in ("LCB","LB","LCM","ST","LW"):
        try: s = next(x for x in eng._team_states("HOME") if x.slot == slot)
        except StopIteration: continue
        orig = s.pos; best = -1
        for _ in range(40):
            t = eng._desired_target(s)
            s.pos, _m = move_toward(s.pos, t, 4.5)
            eng.clock += 1
            best = max(best, attack_relative_x("HOME", s.pos))
        s.pos = orig
        out[slot] = round(best, 1)
    return out

def case_metrics(p1, seed=None):
    H.set_flags(P1=p1)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    # sustained final third CBs + staffing + FB
    runs, cur = [], None
    for s in samples:
        inf = relx(s["poss"], s["bx"]) >= 62
        if inf and cur and cur["poss"] == s["poss"] and s["t"]-cur["t1"] <= 2:
            cur["t1"] = s["t"]; cur["secs"].append(s)
        elif inf:
            if cur and len(cur["secs"]) >= 10: runs.append(cur)
            cur = {"poss": s["poss"], "t1": s["t"], "secs": [s]}
        else:
            if cur and len(cur["secs"]) >= 10: runs.append(cur)
            cur = None
    if cur and len(cur["secs"]) >= 10: runs.append(cur)
    cbv, fbv, staff = [], [], []
    for r in runs:
        for s in r["secs"][9:]:
            for p in s["players"]:
                if p[0] != s["poss"]: continue
                g = GROUPS[p[2]]
                if g == "CB": cbv.append(relx(p[0], p[3]))
                if g == "FB": fbv.append(relx(p[0], p[3]))
            staff.append(sum(1 for p in s["players"] if p[0]==s["poss"] and p[2]!="GK" and relx(p[0],p[3])>=66.7))
    q = lambda v,f: sorted(v)[int(f*len(v))] if v else None
    box = {t: sum(1 for e in events if e["event_type"]=="BOX_ENTRY" and e["team_id"]==t) for t in ("HOME","AWAY")}
    xg = {t: round(sum((e["detail"] or {}).get("xg",0) for e in events if e["event_type"]=="SHOT" and e["team_id"]==t),2) for t in ("HOME","AWAY")}
    return {"cb_med": round(q(cbv,.5),1) if cbv else None, "cb_p90": round(q(cbv,.9),1) if cbv else None,
            "fb_med": round(q(fbv,.5),1) if fbv else None, "fb_beyond_half%": round(100*sum(1 for x in fbv if x>50)/max(1,len(fbv)),1),
            "staff_mean": round(statistics.mean(staff),2) if staff else None,
            "staff>=4.5%": round(100*sum(1 for x in staff if x>=5)/max(1,len(staff)),1),
            "box": box, "xg": xg, "score": [eng.score["HOME"], eng.score["AWAY"]],
            "goals_from_transitions": sum(1 for e in events if e["event_type"]=="SHOT" and (e["detail"] or {}).get("transition"))}

if __name__ == "__main__":
    print("reachability OFF:", json.dumps(reachability(False)))
    print("reachability P1 :", json.dumps(reachability(True)))
    print("case OFF:", json.dumps(case_metrics(False)))
    print("case P1 :", json.dumps(case_metrics(True)))
