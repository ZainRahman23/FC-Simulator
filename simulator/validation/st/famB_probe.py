"""Family B acceptance (§14): slopes, phase table, team length, formation identity."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator" / "validation" / "st"))
import st_harness as H

GROUPS = {"GK":"GK","LCB":"CB","RCB":"CB","LB":"FB","RB":"FB","CDM":"DM","LDM":"DM","RDM":"DM",
          "LCM":"CM","RCM":"CM","LM":"W","RM":"W","LW":"W","RW":"W","LAM":"AM","CAM":"AM","RAM":"AM","ST":"ST"}
LINE = {"CB":"back","FB":"back","DM":"mid","CM":"mid","AM":"fwd","W":"fwd","ST":"fwd"}
def relx(team, x): return x if team == "HOME" else 100.0 - x

def corr_slope(xs, ys):
    n = len(xs); mx, my = sum(xs)/n, sum(ys)/n
    sxx = sum((a-mx)**2 for a in xs); syy = sum((b-my)**2 for b in ys)
    sxy = sum((a-mx)*(b-my) for a, b in zip(xs, ys))
    return (sxy/(sxx*syy)**0.5 if sxx*syy else 0), (sxy/sxx if sxx else 0)

def shape_metrics(samples):
    xs = []; lines = {"back": [], "mid": [], "fwd": []}; lens = []
    phase = {}
    for s in samples:
        poss = s["poss"]; brx = relx(poss, s["bx"])
        L = {"back": [], "mid": [], "fwd": []}; G = {}
        for p in s["players"]:
            if p[0] != poss or p[2] == "GK": continue
            g = GROUPS.get(p[2], "CM"); rx = relx(p[0], p[3])
            L[LINE[g]].append(rx); G.setdefault(g, []).append(rx)
        if not (L["back"] and L["fwd"]): continue
        xs.append(brx)
        for k in L: lines[k].append(statistics.mean(L[k]))
        allv = L["back"]+L["mid"]+L["fwd"]; lens.append((max(allv)-min(allv), brx))
        b = "def(<25)" if brx<25 else "defmid(25-40)" if brx<40 else "mid(40-60)" if brx<60 else "final(60-78)" if brx<78 else "box(78+)"
        d = phase.setdefault(b, {"n":0, "sum":{}, "len":0.0})
        d["n"] += 1; d["len"] += max(allv)-min(allv)
        for g, v in G.items(): d["sum"][g] = d["sum"].get(g,0.0)+statistics.mean(v)
    res = {"slopes": {k: round(corr_slope(xs, lines[k])[1],3) for k in lines},
           "corr": {k: round(corr_slope(xs, lines[k])[0],3) for k in lines},
           "phase": {b: {"n": d["n"], "len": round(d["len"]/d["n"],1),
                         **{g: round(v/d["n"],1) for g,v in sorted(d["sum"].items())}}
                     for b, d in sorted(phase.items())}}
    return res

if __name__ == "__main__":
    out = {}
    for label, flags in (("B_off", {}), ("B_on", {"B": True})):
        H.set_flags(**flags)
        eng, cmds, _ = H.build_case_engine()
        samples = []
        H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
        m = shape_metrics(samples)
        m["score"] = [eng.score["HOME"], eng.score["AWAY"]]
        out[label] = m
    json.dump(out, open(H.OUT / "famB_case.json", "w"), indent=1)
    print(json.dumps(out, indent=1))
