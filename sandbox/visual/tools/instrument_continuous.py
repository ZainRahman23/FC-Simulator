#!/usr/bin/env python3
"""Instrument the first 120 s of a continuous-transport match (diagnostic
only — no quotas, no tuning): action counts by family, ball-height
statistics, bounce counts, and airtime percentages. Also reports outcome
drift of full matches vs the brain-only path (Part 13 transparency).
"""
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))
import bridge
from fc_simulator.engine import MatchEngine
from fc_simulator.continuous import HybridLab
from fc_simulator.worldflags import CAD_PROFILE


def build(seed_offset=0):
    fx = json.loads((ROOT / "sandbox/visual/fixture_liv_eve.json").read_text())
    return MatchEngine(bridge.build_team(fx["home_team"], "HOME"),
                       bridge.build_team(fx["away_team"], "AWAY"),
                       bridge.ATTRIBUTE_STATS, int(fx["seed"]) + seed_offset,
                       bridge.build_config(fx.get("config"), fx.get("coach_ai")))


def instrument_120s() -> None:
    eng = build()
    lab = HybridLab(eng, cad=dict(CAD_PROFILE))
    lab.body.restart = {"kind": "KICKOFF", "team": 0, "spot": (52.5, 34.0), "t": 0.0}
    body = lab.body
    fams = Counter()
    heights = defaultdict(list)
    cur_fam = None
    cur_max = 0.0
    bounces = 0
    zprev, vzprev = 0.0, 0.0
    airtime = Counter()
    ticks = 0
    evc = 0
    while body.t < 120.0:
        lab.run(1 / 60.0)
        while evc < len(body.events):
            e = body.events[evc]; evc += 1
            k = e["kind"]
            if k.startswith("BALL_CONTACT:KICK:"):
                if cur_fam:
                    heights[cur_fam].append(cur_max)
                cur_fam = k.split(":")[-1]
                cur_max = 0.0
                fams[cur_fam] += 1
        z = body.ball["z"]; vz = body.ball["vz"]
        cur_max = max(cur_max, z)
        if zprev > 0.02 and z <= 0.001 and vz > 0:
            bounces += 1
        zprev, vzprev = z, vz
        ticks += 1
        for th in (0.25, 1.0, 2.0):
            if z > th:
                airtime[th] += 1
    if cur_fam:
        heights[cur_fam].append(cur_max)

    print("── first 120 s of continuous match (diagnostic) ──")
    print("kicks by family:", dict(sorted(fams.items())))
    ground = sum(v for k, v in fams.items() if k in ("SHORT", "DRIVEN", "CUTBACK", "THROUGH"))
    aerial = sum(v for k, v in fams.items() if k in ("LOFT", "CROSS", "CLEAR", "PUNT"))
    print(f"ground-family kicks: {ground}   aerial-family kicks: {aerial}   "
          f"shots: {fams.get('SHOT', 0)}")
    for fam, hs in sorted(heights.items()):
        hs2 = sorted(hs)
        med = hs2[len(hs2) // 2]
        print(f"  {fam:8s} n={len(hs):3d}  median max-height {med:5.2f} m   "
              f"max {max(hs):5.2f} m")
    print(f"bounces: {bounces}")
    print(f"max ball height: {max(max(hs) for hs in heights.values()):.2f} m")
    for th in (0.25, 1.0, 2.0):
        print(f"time ball > {th:0.2f} m: {100 * airtime[th] / ticks:5.1f}%")


def drift_report(n=3) -> None:
    print("\n── outcome drift: brain-only vs continuous transport (full matches) ──")
    for k in range(n):
        e1 = build(k)
        e1.advance(6000)
        r1 = e1.result()
        e2 = build(k)
        lab = HybridLab(e2, cad=dict(CAD_PROFILE))
        lab.body.restart = {"kind": "KICKOFF", "team": 0, "spot": (52.5, 34.0), "t": 0.0}
        lab.run(5400.0)
        e2.score["HOME"] = lab.body.score[0]
        e2.score["AWAY"] = lab.body.score[1]
        kicks = sum(1 for e in lab.body.events if e["kind"].startswith("BALL_CONTACT:KICK"))
        sh1 = sum(1 for ev in e1.events if ev.event_type == "SHOT")
        print(f"seed+{k}: brain {r1.home_score}-{r1.away_score} ({sh1} shots)   "
              f"continuous {lab.body.score[0]}-{lab.body.score[1]} ({kicks} kicks)")


if __name__ == "__main__":
    instrument_120s()
    drift_report()
