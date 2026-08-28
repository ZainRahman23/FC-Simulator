"""P2 gates: displacement amplitude, switch-created gaps, penetration follow-up."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import pd_harness as H

def run(flags, seed=None):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    return samples, events

def displacement(samples, events):
    def corr(xs, ys):
        n=len(xs); mx,my=sum(xs)/n,sum(ys)/n
        sxx=sum((a-mx)**2 for a in xs); syy=sum((b-my)**2 for b in ys)
        sxy=sum((a-mx)*(b-my) for a,b in zip(xs,ys))
        return sxy/(sxx*syy)**0.5 if sxx*syy else 0
    bys, dys = [], []
    for s in samples:
        dteam = "AWAY" if s["poss"]=="HOME" else "HOME"
        ys = [p[4] for p in s["players"] if p[0]==dteam and p[2]!="GK"]
        bys.append(s["by"]); dys.append(statistics.mean(ys))
    amp = statistics.pstdev(dys)/statistics.pstdev(bys)
    # switch gaps
    opens, allgaps = [], []
    for i in range(4, len(samples)):
        s0, s1 = samples[i-4], samples[i]
        if s0["poss"] != s1["poss"]: continue
        dteam = "AWAY" if s1["poss"]=="HOME" else "HOME"
        ys1 = sorted(p[4] for p in s1["players"] if p[0]==dteam and p[2]!="GK")
        gap = max(b-a for a,b in zip(ys1, ys1[1:]))
        if abs(s1["by"] - s0["by"]) >= 25: opens.append(gap)
    for s in samples[::7]:
        dteam = "AWAY" if s["poss"]=="HOME" else "HOME"
        ys1 = sorted(p[4] for p in s["players"] if p[0]==dteam and p[2]!="GK")
        allgaps.append(max(b-a for a,b in zip(ys1, ys1[1:])))
    box = sum(1 for e in events if e["event_type"]=="BOX_ENTRY")
    # penetration within 12s after a switch second
    switch_secs = [samples[i]["t"] for i in range(4, len(samples))
                   if samples[i-4]["poss"]==samples[i]["poss"] and abs(samples[i]["by"]-samples[i-4]["by"])>=25]
    pen = sum(1 for e in events if e["event_type"] in ("BOX_ENTRY","SHOT")
              and any(0 <= e["timestamp"]-t <= 12 for t in switch_secs))
    return {"amplitude": round(amp,3), "corr": round(corr(bys,dys),3),
            "switch_gap": round(statistics.mean(opens),1) if opens else None, "n_switch_windows": len(opens),
            "baseline_gap": round(statistics.mean(allgaps),1),
            "box_entries": box, "pen_within_12s_of_switch": pen}

if __name__ == "__main__":
    out = {}
    for label, flags in (("OFF", {}), ("P2", {"P2": True}), ("P1P2", {"P1": True, "P2": True})):
        agg = None
        for seed in (None, 991, 992):
            s, e = run(dict(flags), seed)
            m = displacement(s, e)
            if agg is None: agg = {k: [] for k in m}
            for k, v in m.items():
                if v is not None: agg[k].append(v)
        out[label] = {k: round(statistics.mean(v),3) if v else None for k, v in agg.items()}
        print(label, json.dumps(out[label]), flush=True)
    json.dump(out, open(H.OUT/"p2_probe.json","w"), indent=1)
