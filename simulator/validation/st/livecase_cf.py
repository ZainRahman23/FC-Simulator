"""§37-38/§48: exact live-case counterfactuals under the ABCDE package.

Replays both persisted matches (exact seed + command log) with the package and
reports the forensic headline metrics + cal6 shot-signal health.
"""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import st_harness as H
from st_harness import distance_m
import inspect, textwrap

GROUPS = {"GK":"GK","LCB":"CB","RCB":"CB","LB":"FB","RB":"FB","CDM":"DM","LDM":"DM","RDM":"DM",
          "LCM":"CM","RCM":"CM","LM":"W","RM":"W","LW":"W","RW":"W","LAM":"AM","CAM":"AM","RAM":"AM","ST":"ST"}
M = lambda ax,ay,bx,by: (((ax-bx)*1.05)**2+((ay-by)*0.68)**2)**0.5
def relx(team,x): return x if team=="HOME" else 100.0-x

def run_case(match_id, flags):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(match_id=match_id)
    from fc_simulator import engine as EM
    from fc_simulator.geometry import attack_relative_x
    dec = []
    src = textwrap.dedent(inspect.getsource(type(eng)._choose_action))
    src = src.replace("    return actions[idx]", "    self._st_hook(carrier, pressure, xg, actions, idx)\n    return actions[idx]")
    ns = {}
    exec(compile(src, EM.__file__, "exec"), EM.__dict__, ns)
    eng._choose_action = ns["_choose_action"].__get__(eng, type(eng))
    def _st_hook(self, carrier, pressure, xg, actions, idx_):
        r = attack_relative_x(carrier.team_id, carrier.pos)
        rec = {"relx": round(r,1), "pressure": round(pressure,3), "chosen": actions[idx_][0],
               "has_shot": any(a[0]=="SHOOT" for a in actions)}
        if r >= 66:
            pb = self._shot_block_candidate(carrier)[1]
            rec["xg_eff"] = round(xg*(1-pb), 4)
        dec.append(rec)
    eng._st_hook = _st_hook.__get__(eng, type(eng))
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    # headline metrics
    poss = {}
    for e in events:
        pi = (e.get("detail") or {}).get("possession_id")
        if pi is None: continue
        p = poss.setdefault(pi, [e["timestamp"], e["timestamp"]]); p[1] = e["timestamp"]
    durs = [max(1,b-a+1) for a,b in poss.values()]
    shots = [e for e in events if e["event_type"]=="SHOT"]
    # cal6 signal: selection by xg_eff band
    bands = {}
    for r in dec:
        if "xg_eff" not in r or not r["has_shot"]: continue
        x = r["xg_eff"]
        b = "<0.02" if x < 0.02 else "0.02-0.05" if x < 0.05 else "0.05-0.10" if x < 0.10 else "0.10+"
        e = bands.setdefault(b, [0,0]); e[0] += 1
        if r["chosen"] == "SHOOT": e[1] += 1
    press = [r["pressure"] for r in dec]
    return {
        "score": [eng.score["HOME"], eng.score["AWAY"]],
        "possessions": len(durs), "dur_mean": round(statistics.mean(durs),1),
        "shots": len(shots), "sh25": sum(1 for e in shots if e["detail"]["distance_m"]>=25),
        "xg": {t: round(sum(e["detail"]["xg"] for e in shots if e["team_id"]==t),2) for t in ("HOME","AWAY")},
        "beats": sum(1 for e in events if e["event_type"]=="DRIBBLE" and e["detail"]["outcome"]=="BEAT"),
        "takeons": sum(1 for e in events if e["event_type"]=="DRIBBLE"),
        "press_gt05": round(sum(1 for p in press if p>0.5)/len(press),3),
        "cal6_signal_bands": {k: {"cand": v[0], "taken": v[1], "rate": round(v[1]/max(1,v[0]),3)} for k,v in sorted(bands.items())},
    }

if __name__ == "__main__":
    out = {}
    for mid in ("2c912eb05bb6", "ea63cd2c4c6d"):
        out[mid] = {"cal6": run_case(mid, {}),
                    "package": run_case(mid, {"A":True,"B":True,"C":True,"D":True,"E":True})}
        print(mid, "done", flush=True)
    json.dump(out, open(Path(__file__).parent / "out" / "livecase_cf.json", "w"), indent=1)
    print(json.dumps(out, indent=1))
