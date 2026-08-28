"""§36/§55: staged family integration, multi-seed on the case kickoff.

Configs: cal6-equivalent OFF, singles, staged combos. Metrics via the case-2
structural metric set + temporal/take-on additions. Resumable JSONL.
"""
import json, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator" / "exp_st"))
sys.path.insert(1, str(ROOT))
sys.path.insert(2, str(ROOT / "simulator"))

OUT = Path(__file__).parent / "out" / "st_multiseed.jsonl"

CONFIGS = {
    "OFF": {}, "A": {"A": 1}, "B": {"B": 1}, "C": {"C": 1}, "D": {"D": 1}, "E": {"E": 1},
    "AB": {"A": 1, "B": 1}, "ABC": {"A": 1, "B": 1, "C": 1},
    "ABCD": {"A": 1, "B": 1, "C": 1, "D": 1},
    "ABCDE": {"A": 1, "B": 1, "C": 1, "D": 1, "E": 1},
}
N = {"OFF": 30, "A": 15, "B": 15, "C": 15, "D": 15, "E": 15,
     "AB": 15, "ABC": 15, "ABCD": 30, "ABCDE": 30}
SEED_BASE = 8200000


def run_task(task):
    cfg, idx = task
    import st_sys  # noqa
    return _run(cfg, idx)


def _run(cfg, idx):
    sys.path.insert(0, str(Path(__file__).parent))
    import st_harness as H
    from validation.forensics.case2.metrics import compute
    from fc_simulator import engine as EM
    from fc_simulator.geometry import distance_m
    H.set_flags(**{k: bool(v) for k, v in CONFIGS[cfg].items()})
    eng, cmds, _ = H.build_case_engine(seed=SEED_BASE + idx)
    import inspect, textwrap
    decisions = []
    src = textwrap.dedent(inspect.getsource(type(eng)._choose_action))
    src = src.replace("    return actions[idx]", "    self._st_hook(carrier, pressure, space, actions, idx)\n    return actions[idx]")
    ns = {}
    exec(compile(src, EM.__file__, "exec"), EM.__dict__, ns)
    eng._choose_action = ns["_choose_action"].__get__(eng, type(eng))
    from fc_simulator.geometry import attack_relative_x
    def _st_hook(self, carrier, pressure, space, actions, idx_):
        mates = [m for m in self._team_states(carrier.team_id) if m.slot != "GK" and m.active and m is not carrier]
        decisions.append({
            "t": self.clock, "team": carrier.team_id, "slot": carrier.slot,
            "relx": round(attack_relative_x(carrier.team_id, carrier.pos), 2),
            "pressure": round(pressure, 3), "space": round(space, 3),
            "support": {8: sum(1 for m in mates if distance_m(m.pos, carrier.pos) <= 8)},
            "actions": [[a, None, round(u, 4)] for a, _t, u in actions],
            "chosen": actions[idx_][0]})
    eng._st_hook = _st_hook.__get__(eng, type(eng))
    samples = []
    _, events = H.replay(eng, cmds, sample_cb=lambda e: H.snapshot(e, samples))
    m = compute(samples, decisions, events)
    # temporal additions
    press_vals = [r["pressure"] for r in decisions]
    m["press_gt05_share"] = round(sum(1 for p in press_vals if p > 0.5) / max(1, len(press_vals)), 3)
    ACT = ("PASS", "CARRY", "DRIBBLE", "SHIELD", "CLEARANCE", "SHOT", "CROSS")
    acts = sum(1 for e in events if e["event_type"] in ACT)
    pcs = sum(1 for e in events if e["event_type"] == "POSSESSION_CHANGE")
    m["actions"] = acts
    m["hazard_per_action"] = round(pcs / max(1, acts), 4)
    m["xg"] = {t: round(sum((e["detail"] or {}).get("xg", 0) for e in events
                            if e["event_type"] == "SHOT" and e["team_id"] == t), 3) for t in ("HOME", "AWAY")}
    m["goals"] = [eng.score["HOME"], eng.score["AWAY"]]
    m.update({"cfg": cfg, "idx": idx})
    return m


def main():
    done = set()
    if OUT.exists():
        for l in open(OUT):
            r = json.loads(l); done.add((r["cfg"], r["idx"]))
    tasks = [(c, i) for c, n in N.items() for i in range(n) if (c, i) not in done]
    print(len(tasks), "tasks")
    with ProcessPoolExecutor(max_workers=8) as ex, open(OUT, "a") as f:
        for i, m in enumerate(ex.map(_run_star, tasks)):
            f.write(json.dumps(m) + "\n"); f.flush()
            if i % 15 == 0: print(i + 1, "done", flush=True)
    print("ST-MULTISEED-DONE")


def _run_star(t):
    return _run(*t)


if __name__ == "__main__":
    main()
