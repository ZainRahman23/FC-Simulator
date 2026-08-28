#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fc_simulator.data import apply_plan, build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig


def run(home_plan: Path, away_plan: Path, seeds: list[int], minutes: int = 60):
    players, stats = load_players(ROOT / "data" / "players.json")
    rows = []
    for seed in seeds:
        home, away = build_demo_teams(players)
        apply_plan(home, home_plan)
        apply_plan(away, away_plan)
        result = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=minutes * 60, coach_ai_enabled=False)).run()
        counts = Counter(e.event_type for e in result.events)
        states = list(result.player_states.values())
        pa = sum(s.passes_attempted for s in states)
        pc = sum(s.passes_completed for s in states)
        starters = [s for s in states if s.minute_on == 0]
        shots = [e for e in result.events if e.event_type == "SHOT"]
        transition_shots = [e for e in shots if e.detail.get("transition")]
        org = [float(e.detail["defensive_organization"]) for e in shots if e.detail.get("defensive_organization") is not None]
        possession_changes = [e for e in result.events if e.event_type == "POSSESSION_CHANGE"]
        possession_durations = [float(e.detail.get("previous_duration_s", 0)) for e in possession_changes]
        rows.append({
            "goals": result.home_score + result.away_score,
            "shots": len(shots),
            "xg": sum(float(e.detail.get("xg", 0.0)) for e in shots),
            "mean_shot_xg": mean([float(e.detail.get("xg", 0.0)) for e in shots]) if shots else 0.0,
            "big_chances": sum(1 for e in shots if float(e.detail.get("xg", 0.0)) >= 0.25),
            "transition_shots": len(transition_shots),
            "transition_xg": sum(float(e.detail.get("xg", 0.0)) for e in transition_shots),
            "mean_def_org_on_shots": mean(org) if org else 0.0,
            "box_entries": counts["BOX_ENTRY"],
            "possession_changes": len(possession_changes),
            "mean_possession_s": mean(possession_durations) if possession_durations else 0.0,
            "passes": pa,
            "pass_completion": pc / max(1, pa),
            "through_balls": sum(1 for e in result.events if e.event_type == "PASS" and e.detail.get("pass_type") == "THROUGH"),
            "crosses": counts["CROSS"],
            "dribbles": counts["DRIBBLE"],
            "pressures": sum(s.pressures for s in states),
            "aerial_duels": counts["AERIAL_DUEL"],
            "ground_duels": counts["GROUND_DUEL"],
            "fouls": counts["FOUL"],
            "offsides": counts["OFFSIDE"],
            "substitutions": counts["SUBSTITUTION"],
            "starter_energy": mean(s.energy for s in starters),
            "distance_per_slot_km": sum(s.distance_m for s in states) / 22 / 1000,
            "active_play_minutes": result.active_play_seconds / 60.0,
            "dead_ball_minutes": result.dead_ball_seconds / 60.0,
            "role_success_rate": sum(s.role_successes for s in states) / max(1, sum(s.role_opportunities for s in states)),
        })
    return {k: round(mean(x[k] for x in rows), 4) for k in rows[0]}


def main():
    ap = argparse.ArgumentParser(description="Matched-seed tactical plan comparison")
    ap.add_argument("--matches", type=int, default=12)
    ap.add_argument("--minutes", type=int, default=90)
    ap.add_argument("--seed", type=int, default=9000)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    seeds = list(range(args.seed, args.seed + args.matches))
    controlled = ROOT / "plans" / "controlled_cagey_4141.json"
    ultra = ROOT / "plans" / "ultra_low_block_4141.json"
    e2e = ROOT / "plans" / "end_to_end.json"
    controlled_game = run(controlled, controlled, seeds, args.minutes)
    ultra_game = run(ultra, ultra, seeds, args.minutes)
    open_game = run(e2e, e2e, seeds, args.minutes)
    mixed = run(controlled, e2e, seeds, args.minutes)
    payload = {
        "seeds": seeds,
        "minutes": args.minutes,
        "controlled_cagey_vs_controlled_cagey": controlled_game,
        "ultra_low_block_vs_ultra_low_block": ultra_game,
        "end_to_end_vs_end_to_end": open_game,
        "controlled_cagey_vs_end_to_end": mixed,
        "delta_open_minus_controlled": {k: round(open_game[k] - controlled_game[k], 4) for k in controlled_game},
        "delta_controlled_minus_ultra": {k: round(controlled_game[k] - ultra_game[k], 4) for k in controlled_game},
    }
    text = json.dumps(payload, indent=2)
    print(text)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
