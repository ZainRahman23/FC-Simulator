"""Family A acceptance metrics (§8): reception decay, cadence, one-touch, turnovers."""
import json, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "simulator" / "validation" / "st"))
import st_harness as H
from st_harness import engine_mod, MatchEngine, distance_m

def run(flag_a: bool, seed=None):
    H.set_flags(A=flag_a)
    eng, cmds, _ = H.build_case_engine(seed=seed)
    decisions = []
    orig = eng._decision
    def wrapped():
        c = eng._carrier()
        pressure, presser = eng._pressure(c)
        decisions.append({"t": eng.clock, "pid": c.player.player_id,
                          "pressure": round(pressure, 3),
                          "def_d": round(distance_m(presser.pos, c.pos), 2) if presser else None})
        orig()
    eng._decision = wrapped
    samples = []
    digest, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    return eng, decisions, events, samples

def reception_metrics(decisions, events, samples):
    smap = {s["t"]: s for s in samples}
    M = lambda ax, ay, bx, by: (((ax-bx)*1.05)**2 + ((ay-by)*0.68)**2) ** 0.5
    def nearest_def(s, pid, team):
        me = next((p for p in s["players"] if p[1] == pid), None)
        if me is None: return None
        dteam = "AWAY" if team == "HOME" else "HOME"
        dd = [M(p[3], p[4], me[3], me[4]) for p in s["players"] if p[0] == dteam and p[2] != "GK"]
        return min(dd) if dd else None
    rows = []
    for e in events:
        if e["event_type"] != "PASS" or e["detail"].get("outcome") not in ("COMPLETED", "COMPLETED_INTO_SPACE"): continue
        t, rec, team = e["timestamp"], e["detail"]["target_id"], e["team_id"]
        p_control = e["detail"].get("p_control", 1.0)
        nd = next((r for r in decisions if r["t"] > t and r["pid"] == rec), None)
        if nd is None or nd["t"] - t > 12: continue
        s0, s1 = smap.get(t + 1), smap.get(nd["t"])
        if not s0 or not s1: continue
        d0, d1 = nearest_def(s0, rec, team), nd["def_d"] or nearest_def(s1, rec, team)
        if d0 is None or d1 is None: continue
        # turnover within 4s of the first decision?
        lost = any(x["event_type"] == "POSSESSION_CHANGE" and x["team_id"] != team
                   and nd["t"] <= x["timestamp"] <= nd["t"] + 4 for x in events)
        rows.append({"wait": nd["t"] - t, "d0": d0, "d1": d1, "p_control": p_control,
                     "pressure": nd["pressure"], "lost": lost})
    def agg(sub, label):
        if not sub: return {label: "n=0"}
        return {"class": label, "n": len(sub),
                "wait_mean": round(statistics.mean(r["wait"] for r in sub), 2),
                "one_touch(<=1s)": round(sum(1 for r in sub if r["wait"] <= 1)/len(sub), 3),
                "sep_at_reception": round(statistics.mean(r["d0"] for r in sub), 2),
                "sep_at_first_decision": round(statistics.mean(r["d1"] for r in sub), 2),
                "still_3m_at_decision": round(sum(1 for r in sub if r["d1"] >= 3)/len(sub), 3),
                "pressure_at_decision": round(statistics.mean(r["pressure"] for r in sub), 2),
                "turnover_within_4s": round(sum(1 for r in sub if r["lost"])/len(sub), 3)}
    clean = [r for r in rows if r["p_control"] >= 0.93]
    mid = [r for r in rows if 0.75 <= r["p_control"] < 0.93]
    hard = [r for r in rows if r["p_control"] < 0.75]
    return [agg(rows, "ALL"), agg(clean, "clean(p_ctrl>=0.93)"), agg(mid, "pressured(0.75-0.93)"), agg(hard, "difficult(<0.75)")]

if __name__ == "__main__":
    out = {}
    for flag in (False, True):
        eng, dec, ev, smp = run(flag)
        m = reception_metrics(dec, ev, smp)
        press_all = [d["pressure"] for d in dec]
        out["A_on" if flag else "A_off"] = {
            "decisions": len(dec),
            "share_pressure_gt_0.5": round(sum(1 for p in press_all if p > 0.5)/len(press_all), 3),
            "score": [eng.score["HOME"], eng.score["AWAY"]],
            "receptions": m}
    json.dump(out, open(H.OUT / "famA_case.json", "w"), indent=1)
    print(json.dumps(out, indent=1))
