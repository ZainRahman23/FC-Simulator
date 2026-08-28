"""Structural possession diagnostics runner.

Simulates scenarios from the existing registry (coach AI frozen, same seeds
scheme) and aggregates possession-lifecycle records per scenario. All
analysis is post-hoc over each match's event ledger — engine untouched.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from validation.scenarios import PLANS, registry, scenario_seed
from validation.possession import analyze_match, aggregate

_CACHE = None


def _players():
    global _CACHE
    if _CACHE is None:
        from fc_simulator.data import load_players
        _CACHE = load_players(Path(__file__).resolve().parents[1] / "data" / "players.json")
    return _CACHE


def run_one(args):
    sid, index = args
    from fc_simulator.data import apply_plan, build_mirrored_demo_teams
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig
    sc = registry()[sid]
    players, stats = _players()
    home, away = build_mirrored_demo_teams(players)
    home.name, away.name = "HOME_XI", "AWAY_XI"
    if PLANS[sc.home_plan]: apply_plan(home, PLANS[sc.home_plan])
    if PLANS[sc.away_plan]: apply_plan(away, PLANS[sc.away_plan])
    if sc.home_transform: sc.home_transform(home)
    if sc.away_transform: sc.away_transform(away)
    seed = scenario_seed(sid, index)
    result = MatchEngine(home, away, stats, seed,
                         MatchConfig(duration_seconds=sc.minutes * 60, coach_ai_enabled=False)).run()
    poss = analyze_match([e.to_dict() for e in result.events], sc.minutes * 60)
    # strip heavy sub-lists before returning; keep only what aggregation needs
    return sid, index, poss


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenarios", nargs="+", required=True)
    ap.add_argument("--matches", type=int, default=120)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--split", choices=["team", "combined", "home", "away"], default="combined",
                    help="aggregate possessions of both teams, or one side only")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    tasks = [(sid, i) for sid in args.scenarios for i in range(args.matches)]
    t0 = time.time()
    by_scenario: dict[str, list] = {sid: [] for sid in args.scenarios}
    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        for sid, index, poss in ex.map(run_one, tasks, chunksize=2):
            by_scenario[sid].append((index, poss))
    for sid in by_scenario:
        by_scenario[sid].sort(key=lambda x: x[0])
    elapsed = time.time() - t0

    out = {}
    for sid, matches in by_scenario.items():
        allp = [p for _, poss in matches for p in poss]
        entry = {"matches": len(matches), "combined": aggregate(allp)}
        entry["home"] = aggregate([p for p in allp if p["team"] == "HOME"])
        entry["away"] = aggregate([p for p in allp if p["team"] == "AWAY"])
        out[sid] = entry
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({
        "matches_per_scenario": args.matches,
        "coach_ai": False,
        "wall_seconds": round(elapsed, 1),
        "scenarios": out}, indent=1, sort_keys=True))
    print(f"{len(tasks)} matches in {elapsed:.1f}s ({len(tasks)/max(.1,elapsed):.2f}/s)")


if __name__ == "__main__":
    main()
