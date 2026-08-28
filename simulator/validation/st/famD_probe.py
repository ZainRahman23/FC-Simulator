"""Family D acceptance (§26): wide 1v1 containment, concurrent closers, swarms."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator" / "validation" / "st"))
import st_harness as H

M = lambda ax, ay, bx, by: (((ax-bx)*1.05)**2 + ((ay-by)*0.68)**2) ** 0.5
def relx(team, x): return x if team == "HOME" else 100.0 - x

def defense_metrics(samples):
    prev = None; conv = {0:0,1:0,2:0,3:0,4:0,5:0}; swarm = 0; last_sw = -99
    wide = []
    for s in samples:
        car, bd = None, 1e9
        for p in s["players"]:
            if p[0] != s["poss"]: continue
            d = M(p[3], p[4], s["bx"], s["by"])
            if d < bd: bd, car = d, p
        if car is None: prev = s; continue
        dteam = "AWAY" if s["poss"] == "HOME" else "HOME"
        if prev is not None and prev["poss"] == s["poss"]:
            pp = {p[1]: p for p in prev["players"]}
            ncl = 0
            for p in s["players"]:
                if p[0] != dteam or p[2] == "GK" or p[1] not in pp: continue
                d_now = M(p[3], p[4], car[3], car[4])
                o = pp[p[1]]
                if d_now <= 14.0 and (M(o[3],o[4],car[3],car[4]) - d_now) >= 1.0: ncl += 1
            conv[min(ncl,5)] = conv.get(min(ncl,5),0)+1
            if ncl >= 3:
                if s["t"] - last_sw > 2: swarm += 1
                last_sw = s["t"]
        brx = relx(s["poss"], s["bx"])
        if brx >= 55 and abs(s["by"]-50) >= 24:
            dd = sorted(M(p[3],p[4],car[3],car[4]) for p in s["players"] if p[0]==dteam and p[2]!="GK")
            if dd and dd[0] <= 9.0 and (len(dd) < 2 or dd[1] > 9.0):
                wide.append(dd[0])
        prev = s
    tot = sum(conv.values())
    return {"closers": {k: round(v/max(1,tot),3) for k,v in conv.items()},
            "swarm_events": swarm,
            "wide_1v1_seconds": len(wide),
            "wide_min_d_mean": round(statistics.mean(wide),2) if wide else None,
            "wide_contact_share(<=2m)": round(sum(1 for d in wide if d<=2)/max(1,len(wide)),3),
            "wide_containband(1.5-3.5m)": round(sum(1 for d in wide if 1.5<=d<=3.5)/max(1,len(wide)),3)}

if __name__ == "__main__":
    out = {}
    for label, flags in (("base", {}), ("D_only", {"D": True}), ("ABCD", {"A":True,"B":True,"C":True,"D":True})):
        H.set_flags(**flags)
        eng, cmds, _ = H.build_case_engine()
        samples = []
        H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
        m = defense_metrics(samples)
        m["score"] = [eng.score["HOME"], eng.score["AWAY"]]
        # shots + possession quick sanity
        ev = [e.to_dict() for e in eng.events]
        m["shots"] = sum(1 for e in ev if e["event_type"]=="SHOT")
        m["poss_changes"] = sum(1 for e in ev if e["event_type"]=="POSSESSION_CHANGE")
        m["dribbles"] = sum(1 for e in ev if e["event_type"]=="DRIBBLE")
        out[label] = m
        print(label, "done", flush=True)
    json.dump(out, open(H.OUT / "famD_case.json", "w"), indent=1)
    print(json.dumps(out, indent=1))
