import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import pd_harness as H
from fc_simulator import engine as EM
ACT = ("PASS","CARRY","DRIBBLE","SHIELD","CLEARANCE","SHOT","CROSS")
def run(flags, seed):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    _, events = H.replay(eng, cmds)
    poss = {}
    for e in events:
        pi = (e.get("detail") or {}).get("possession_id")
        if pi is None: continue
        p = poss.setdefault(pi, {"team": e["team_id"], "uniq": set(), "acts": 0})
        if e["event_type"] in ACT:
            p["acts"] += 1; p["uniq"].add(e["actor_id"])
    u = statistics.mean([len(p["uniq"]) for p in poss.values() if p["team"]=="HOME"])
    box = sum(1 for e in events if e["event_type"]=="BOX_ENTRY")
    xg = sum((e["detail"] or {}).get("xg",0) for e in events if e["event_type"]=="SHOT")
    sh = sum(1 for e in events if e["event_type"]=="SHOT")
    return u, box, xg, sh
def sweep(label, flags, p3cfg=None, shade=None):
    if p3cfg: EM.PD_P3.update(p3cfg)
    if shade is not None: EM.PD_P2["shade"] = shade
    rows = [run(dict(flags), sd) for sd in (None, 991, 992, 993, 994)]
    print(f"{label:30s} uniq {statistics.mean(r[0] for r in rows):.2f}  box {statistics.mean(r[1] for r in rows):.1f}  xG {statistics.mean(r[2] for r in rows):.2f}  shots {statistics.mean(r[3] for r in rows):.1f}", flush=True)
if __name__ == "__main__":
    sweep("P1P2 (shade.22)", {"P1":True,"P2":True}, shade=0.22)
    sweep("P1P2 (shade.14)", {"P1":True,"P2":True}, shade=0.14)
    sweep("P1P2P3 g2g-only sh.14", {"P1":True,"P2":True,"P3":True}, {"rot":0.0,"weak":False,"g2g":6.0}, 0.14)
    sweep("P1P2P3 rot3+weak sh.14", {"P1":True,"P2":True,"P3":True}, {"rot":3.0,"weak":True,"g2g":6.0}, 0.14)
