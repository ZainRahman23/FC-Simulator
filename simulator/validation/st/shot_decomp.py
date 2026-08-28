import sys, json, statistics
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_harness as H
import concurrent.futures as cf

def run(args):
    cfg, seed = args
    import st_harness as H2
    H2.set_flags(**cfg)
    eng, cmds, _ = H2.build_case_engine(seed=seed)
    from fc_simulator.geometry import attack_relative_x
    dec_ft = [0]
    orig = eng._decision
    def wrapped():
        c = eng._carrier()
        if attack_relative_x(c.team_id, c.pos) >= 66: dec_ft[0] += 1
        orig()
    eng._decision = wrapped
    _, events = H2.replay(eng, cmds)
    shots = [e for e in events if e["event_type"]=="SHOT"]
    return {"dec_ft": dec_ft[0],
            "shots": len(shots),
            "sh25": sum(1 for e in shots if e["detail"]["distance_m"]>=25),
            "sh_trans": sum(1 for e in shots if e["detail"].get("transition")),
            "sh_big": sum(1 for e in shots if e["detail"]["xg"]>=0.15),
            "xg": round(sum(e["detail"]["xg"] for e in shots),2)}

if __name__ == "__main__":
    for label, cfg in (("OFF", {}), ("A", {"A":True}), ("ABCDE", {"A":True,"B":True,"C":True,"D":True,"E":True})):
        rows = []
        with cf.ProcessPoolExecutor(max_workers=6) as ex:
            for m in ex.map(run, [(cfg, 8200000+i) for i in range(6)]):
                rows.append(m)
        agg = {k: round(statistics.mean(r[k] for r in rows),1) for k in rows[0]}
        print(label, json.dumps(agg), flush=True)
