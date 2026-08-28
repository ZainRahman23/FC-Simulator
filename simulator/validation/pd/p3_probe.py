"""P3 gates: unique participation, one-twos, third-man chains, network breadth."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import pd_harness as H
ACT = ("PASS","CARRY","DRIBBLE","SHIELD","CLEARANCE","SHOT","CROSS")
GOOD = {"COMPLETED","AERIAL_COMPLETED","COMPLETED_INTO_SPACE"}

def run(flags, seed):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    _, events = H.replay(eng, cmds)
    poss = {}
    for e in events:
        pi = (e.get("detail") or {}).get("possession_id")
        if pi is None: continue
        p = poss.setdefault(pi, {"team": e["team_id"], "uniq": set(), "acts": 0, "seq": []})
        if e["event_type"] in ACT:
            p["acts"] += 1; p["uniq"].add(e["actor_id"])
        if e["event_type"] == "PASS" and e["detail"].get("outcome") in GOOD:
            p["seq"].append((e["timestamp"], e["actor_id"], e["detail"]["target_id"]))
    uniq_poss = [len(p["uniq"]) for p in poss.values() if p["team"] == "HOME" and p["acts"] >= 3]
    one_two = third = 0
    edges = set()
    for p in poss.values():
        for t, a, b in p["seq"]: edges.add((a, b))
        for i in range(len(p["seq"]) - 1):
            t0, a, b = p["seq"][i]; t1, b2, c = p["seq"][i+1]
            if b2 != b or t1 - t0 > 8: continue
            if c == a: one_two += 1
            else: third += 1
    return {"uniq_mean_3plus": round(statistics.mean(uniq_poss), 2) if uniq_poss else None,
            "share_uniq>=4": round(sum(1 for u in uniq_poss if u >= 4)/max(1,len(uniq_poss)), 2),
            "one_twos": one_two, "third_man": third, "pass_network_edges": len(edges),
            "completed_passes": sum(len(p["seq"]) for p in poss.values())}

if __name__ == "__main__":
    for label, flags in (("OFF", {}), ("P3", {"P3": True}), ("P1P2P3", {"P1": True, "P2": True, "P3": True})):
        rows = [run(dict(flags), sd) for sd in (None, 991, 992)]
        agg = {k: round(statistics.mean(r[k] for r in rows), 2) for k in rows[0]}
        print(label, json.dumps(agg), flush=True)
