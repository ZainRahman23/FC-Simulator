"""Family E acceptance (§34): take-on funnel, BEAT persistence, utility ranks."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator" / "validation" / "st"))
import st_harness as H
from st_harness import distance_m

M = lambda ax, ay, bx, by: (((ax-bx)*1.05)**2 + ((ay-by)*0.68)**2) ** 0.5

def run(flags, seed=None):
    H.set_flags(**flags)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    from fc_simulator import engine as engine_mod
    from fc_simulator.geometry import attack_relative_x
    import inspect, textwrap
    decisions = []
    src = textwrap.dedent(inspect.getsource(type(eng)._choose_action))
    hook = "    self._st_hook(actions, idx)\n"
    src = src.replace("    return actions[idx]", hook + "    return actions[idx]")
    ns = {}
    exec(compile(src, engine_mod.__file__, "exec"), engine_mod.__dict__, ns)
    eng._choose_action = ns["_choose_action"].__get__(eng, type(eng))
    def _st_hook(self, actions, idx):
        if any(a[0] == "DRIBBLE" for a in actions):
            us = sorted((u for _, _, u in actions), reverse=True)
            du = next(u for a, _, u in actions if a == "DRIBBLE")
            decisions.append({"rank": us.index(du) + 1, "gap": round(us[0] - du, 3),
                              "chosen": actions[idx][0]})
    eng._st_hook = _st_hook.__get__(eng, type(eng))
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    return eng, decisions, events, samples

def analyze(decisions, events, samples):
    smap = {s["t"]: s for s in samples}
    dr = [e for e in events if e["event_type"] == "DRIBBLE"]
    oc = {}
    for e in dr: oc[e["detail"]["outcome"]] = oc.get(e["detail"]["outcome"], 0) + 1
    beats = [e for e in dr if e["detail"]["outcome"] == "BEAT"]
    # name -> pid map
    n2p = {e.get("actor_name"): e.get("actor_id") for e in events}
    sep_traj = {1: [], 2: [], 3: []}
    goalside = []
    prog5 = 0
    for e in beats:
        t, att = e["timestamp"], e["actor_id"]
        dfd = n2p.get(e["detail"]["defender"])
        for dt in (1, 2, 3):
            s = smap.get(t + dt)
            if not s: continue
            a = next((p for p in s["players"] if p[1] == att), None)
            d0 = next((p for p in s["players"] if p[1] == dfd), None)
            if a and d0: sep_traj[dt].append(M(a[3], a[4], d0[3], d0[4]))
        if any(x["timestamp"] <= t + 5 and x["event_type"] in ("SHOT", "CROSS", "BOX_ENTRY") and x.get("actor_id") == att for x in events if x["timestamp"] > t):
            prog5 += 1
    ranks = {}
    for r in decisions: ranks[r["rank"]] = ranks.get(r["rank"], 0) + 1
    chosen = sum(1 for r in decisions if r["chosen"] == "DRIBBLE")
    return {"dribble_candidates": len(decisions),
            "chosen": chosen, "sel_rate": round(chosen / max(1, len(decisions)), 3),
            "rank_dist": dict(sorted(ranks.items())),
            "top2_share": round(sum(v for k, v in ranks.items() if k <= 2) / max(1, len(decisions)), 3),
            "outcomes": oc,
            "sep_after_beat": {k: round(statistics.mean(v), 2) if v else None for k, v in sep_traj.items()},
            "beat_progress_5s(shot/cross/box)": prog5, "beats": len(beats)}

if __name__ == "__main__":
    out = {}
    for label, flags in (("base", {}), ("E_only", {"E": True}), ("DE", {"D": True, "E": True}),
                         ("ABCDE", {"A": True, "B": True, "C": True, "D": True, "E": True})):
        eng, dec, ev, smp = run(dict(flags))
        m = analyze(dec, ev, smp)
        m["score"] = [eng.score["HOME"], eng.score["AWAY"]]
        m["shots"] = sum(1 for e in ev if e["event_type"] == "SHOT")
        m["pc"] = sum(1 for e in ev if e["event_type"] == "POSSESSION_CHANGE")
        out[label] = m
        print(label, json.dumps(m), flush=True)
    json.dump(out, open(H.OUT / "famE_case.json", "w"), indent=1)
