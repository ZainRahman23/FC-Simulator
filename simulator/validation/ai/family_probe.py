"""Per-family gates on the exact MW04 case (same seed)."""
import gzip, json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import ai_harness as H
from ai_harness import distance_m
GROUPS = {"GK":"GK","LCB":"CB","RCB":"CB","LB":"FB","RB":"FB","CDM":"DM","LDM":"DM","RDM":"DM",
          "LCM":"CM","RCM":"CM","LM":"W","RM":"W","LW":"W","RW":"W","LAM":"AM","CAM":"AM","RAM":"AM","ST":"ST"}
def relx(t,x): return x if t=="HOME" else 100.0-x
M = lambda ax,ay,bx,by: (((ax-bx)*1.05)**2+((ay-by)*0.68)**2)**0.5

def run(flags, seed=None):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    return eng, samples, events

def metrics(samples, events):
    smap = {s["t"]: s for s in samples}
    # corner episodes
    eps, cur = [], None
    for s in samples:
        t = s["poss"]; brx = relx(t, s["bx"])
        inc = brx >= 86 and abs(s["by"]-50) >= 36
        if inc and cur and s["t"]-cur["t1"]<=2 and cur["poss"]==t: cur["t1"]=s["t"]
        elif inc:
            if cur and cur["t1"]-cur["t0"]>=8: eps.append(cur)
            cur = {"t0": s["t"], "t1": s["t"], "poss": t}
        else:
            if cur and cur["t1"]-cur["t0"]>=8: eps.append(cur)
            cur = None
    if cur and cur["t1"]-cur["t0"]>=8: eps.append(cur)
    # carry vectors (wingers, attacking half)
    vec = {}
    for e in events:
        if e["event_type"]!="CARRY" or e["detail"].get("outcome")!="PROGRESSED": continue
        t = e["timestamp"]; team = e["team_id"]; pid = e["actor_id"]
        s0, s1 = smap.get(t-1), smap.get(t)
        if not s0 or not s1: continue
        a0 = next((p for p in s0["players"] if p[1]==pid), None)
        a1 = next((p for p in s1["players"] if p[1]==pid), None)
        if not a0 or not a1 or GROUPS.get(a1[2]) != "W": continue
        if relx(team, a0[3]) < 50: continue
        dx = relx(team,a1[3]) - relx(team,a0[3]); dy = a1[4]-a0[4]
        wide = a0[4] >= 50
        inw = (dy < -1.5) if wide else (dy > 1.5)
        outw = (dy > 1.5) if wide else (dy < -1.5)
        cls = ("diag_in" if inw else "diag_out" if outw else "straight") if dx > 0.5 else ("cut_in" if inw else "hold")
        vec[cls] = vec.get(cls,0)+1
    # shots + stranded + overload
    shots = [e for e in events if e["event_type"]=="SHOT"]
    sh25 = sum(1 for e in shots if e["detail"]["distance_m"]>=25)
    sh35 = sum(1 for e in shots if e["detail"]["distance_m"]>=35)
    stranded4 = deep = 0
    over_w = 0; win = False; over_box = 0
    for s in samples:
        team = s["poss"]; brx = relx(team, s["bx"])
        dteam = "AWAY" if team=="HOME" else "HOME"
        if brx >= 72:
            deep += 1
            if sum(1 for p in s["players"] if p[0]==dteam and p[2]!="GK" and relx(dteam,p[3])>=45) >= 4: stranded4 += 1
        if brx >= 62:
            natt = sum(1 for p in s["players"] if p[0]==team and p[2]!="GK" and relx(team,p[3])>=62)
            ndef = sum(1 for p in s["players"] if p[0]==dteam and p[2]!="GK" and relx(team,p[3])>=62)
            if natt-ndef >= 1:
                if not win: over_w += 1; win = True
            else: win = False
        else: win = False
    box = sum(1 for e in events if e["event_type"]=="BOX_ENTRY")
    return {"corner_eps": [(c["t0"], c["t1"]-c["t0"]) for c in eps],
            "corner_total_s": sum(c["t1"]-c["t0"] for c in eps),
            "wing_vec": vec, "shots": len(shots), "sh25": sh25, "sh35": sh35,
            "stranded4_share": round(stranded4/max(1,deep),3),
            "over_windows": over_w, "box": box,
            "xg": round(sum(e["detail"]["xg"] for e in shots),2)}

if __name__ == "__main__":
    out = {}
    for label, flags in (("OFF", {}), ("F4", {"F4":1}), ("F5", {"F5":1}), ("F4F5", {"F4":1,"F5":1}),
                         ("F6", {"F6":1}), ("F2", {"F2":1}), ("F1", {"F1":1}),
                         ("ALL", {"F1":1,"F2":1,"F4":1,"F5":1,"F6":1})):
        eng, s2, ev = run({k: bool(v) for k,v in flags.items()})
        m = metrics(s2, ev)
        m["score"] = [eng.score["HOME"], eng.score["AWAY"]]
        out[label] = m
        print(label, json.dumps(m), flush=True)
    json.dump(out, open(H.OUT/"family_probe.json","w"), indent=1)
