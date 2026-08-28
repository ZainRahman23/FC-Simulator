"""FC Simulator v0.7 statistical validation runner.

Usage:
  python -m validation.run_validation --stage smoke --out validation/out/smoke
  python -m validation.run_validation --stage baseline --workers 8 --out validation/out/baseline
  python -m validation.run_validation --scenarios matrix/balanced_vs_balanced --matches 200 ...

Determinism contract: every match is a pure function of (scenario_id, index).
A single-worker run and an N-worker run produce byte-identical matches.json.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from validation.scenarios import PLANS, Scenario, registry, scenario_seed
from validation.metrics import aggregate_scenario, extract_match_row

STAGE_MATCHES = {"smoke": 8, "baseline": 96, "focus": 400}
ENGINE_VERSION = "0.7"


def _calibration_version() -> str:
    try:
        from fc_simulator.calibration import CALIBRATION_VERSION
        return CALIBRATION_VERSION
    except ImportError:
        return "v0.7-default"


_PLAYER_CACHE = None

def _players():
    """Process-local immutable cache; teams are rebuilt fresh per match."""
    global _PLAYER_CACHE
    if _PLAYER_CACHE is None:
        from fc_simulator.data import load_players
        _PLAYER_CACHE = load_players(Path(__file__).resolve().parents[1] / "data" / "players.json")
    return _PLAYER_CACHE


def build_and_run(scenario: Scenario, index: int, swapped: bool) -> dict:
    from dataclasses import replace as dc_replace
    from fc_simulator.data import apply_plan, build_mirrored_demo_teams
    from fc_simulator.engine import MatchEngine
    from fc_simulator.models import MatchConfig

    players, stats = _players()
    home, away = build_mirrored_demo_teams(players)
    home.name, away.name = "HOME_XI", "AWAY_XI"   # distinct summary keys; names never enter RNG
    hp, ap = (scenario.away_plan, scenario.home_plan) if swapped else (scenario.home_plan, scenario.away_plan)
    ht, at = (scenario.away_transform, scenario.home_transform) if swapped else (scenario.home_transform, scenario.away_transform)
    if PLANS[hp]: apply_plan(home, PLANS[hp])
    if PLANS[ap]: apply_plan(away, PLANS[ap])
    if ht: ht(home)
    if at: at(away)
    if scenario.ovr_delta:
        for slot, p in list(home.lineup.items()):
            home.lineup[slot] = dc_replace(p, ovr=max(1, p.ovr + scenario.ovr_delta))
    # counterfactual/integrity pairs share the control's seed list (matched seeds)
    seed_id = scenario.scenario_id
    if scenario.family == "integrity":
        seed_id = seed_id.replace("_shifted", "_control")
    if scenario.family == "attr_treated":
        seed_id = seed_id.replace("_treated", "_control")
    seed = scenario_seed(seed_id, index)
    engine = MatchEngine(home, away, stats, seed,
                         MatchConfig(duration_seconds=scenario.minutes * 60, coach_ai_enabled=False))
    result = engine.run()
    row = extract_match_row(result, seed, scenario.scenario_id, scenario.minutes, swapped)
    if scenario.family == "integrity":
        row["event_ledger_digest"] = _ledger_digest(result)
    return row


def _ledger_digest(result) -> str:
    import hashlib
    h = hashlib.blake2b(digest_size=12)
    for e in result.events:
        h.update(json.dumps(e.to_dict(), sort_keys=True).encode())
    for pid in sorted(result.player_states):
        s = result.player_states[pid]
        h.update(f"{pid}|{s.energy:.6f}|{s.match_rating:.6f}|{s.goals}|{s.distance_m:.3f}".encode())
    return h.hexdigest()


def _task(args):
    sid, index, swapped = args
    scenario = registry()[sid]
    return (sid, index, swapped, build_and_run(scenario, index, swapped))


def run(scenario_ids: list[str], matches: int, workers: int, out_dir: Path,
        matches_override: dict[str, int] | None = None) -> dict:
    reg = registry()
    tasks = []
    for sid in scenario_ids:
        sc = reg[sid]
        n = (matches_override or {}).get(sid, matches)
        for i in range(n):
            tasks.append((sid, i, False))
            if sc.paired_swap:
                tasks.append((sid, i, True))
    t0 = time.time()
    results = []
    if workers <= 1:
        for t in tasks:
            results.append(_task(t))
    else:
        with ProcessPoolExecutor(max_workers=workers) as ex:
            for r in ex.map(_task, tasks, chunksize=4):
                results.append(r)
    results.sort(key=lambda r: (r[0], r[1], r[2]))   # aggregation order fixed regardless of workers
    elapsed = time.time() - t0

    by_scenario: dict[str, list[dict]] = {}
    for sid, index, swapped, row in results:
        by_scenario.setdefault(sid, []).append(row)

    out_dir.mkdir(parents=True, exist_ok=True)
    dataset = {
        "engine_version": ENGINE_VERSION,
        "calibration_version": _calibration_version(),
        "seed_scheme": "blake2b(fcsim-v0.7-validation-1|scenario|index)",
        "coach_ai": False,
        "scenarios": {sid: {"notes": reg[sid].notes, "home_plan": reg[sid].home_plan,
                            "away_plan": reg[sid].away_plan, "minutes": reg[sid].minutes,
                            "rows": rows} for sid, rows in by_scenario.items()},
        "wall_seconds": round(elapsed, 1),
        "total_matches": len(tasks),
    }
    (out_dir / "matches.json").write_text(json.dumps(dataset, indent=1, sort_keys=True))
    aggregates = {sid: aggregate_scenario(rows) for sid, rows in by_scenario.items()}
    (out_dir / "aggregates.json").write_text(json.dumps({
        "engine_version": ENGINE_VERSION, "calibration_version": _calibration_version(),
        "aggregates": aggregates}, indent=1, sort_keys=True))
    print(f"{len(tasks)} matches in {elapsed:.1f}s ({len(tasks)/max(0.1, elapsed):.2f} matches/s, workers={workers})")
    return dataset


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=list(STAGE_MATCHES), default="smoke")
    ap.add_argument("--matches", type=int, default=None, help="override per-scenario match count")
    ap.add_argument("--scenarios", nargs="*", default=None, help="scenario ids (default: all)")
    ap.add_argument("--families", nargs="*", default=None, help="scenario families to include")
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    reg = registry()
    ids = args.scenarios or [sid for sid, sc in reg.items()
                             if not args.families or sc.family in args.families]
    n = args.matches or STAGE_MATCHES[args.stage]
    run(ids, n, args.workers, args.out)


if __name__ == "__main__":
    main()
