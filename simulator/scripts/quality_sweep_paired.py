from __future__ import annotations

import argparse
import json
from dataclasses import replace
from pathlib import Path
from statistics import mean

from fc_simulator.data import apply_plan, build_mirrored_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig

ROOT = Path(__file__).resolve().parents[1]


def shift_attributes(team, delta: float) -> None:
    for slot, player in list(team.lineup.items()):
        attrs = {k: max(1.0, min(99.0, float(v) + delta)) for k, v in player.attributes.items()}
        team.lineup[slot] = replace(player, attributes=attrs)


def shot_xg(result, team_id: str) -> float:
    return sum(float(e.detail.get("xg", 0.0)) for e in result.events if e.event_type == "SHOT" and e.team_id == team_id)


def run_leg(players, stats, seed: int, minutes: int, plan: Path, delta: float, favorite_home: bool) -> dict:
    home, away = build_mirrored_demo_teams(players)
    apply_plan(home, plan)
    apply_plan(away, plan)
    shift_attributes(home, delta if favorite_home else -delta)
    shift_attributes(away, -delta if favorite_home else delta)
    result = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=minutes * 60, coach_ai_enabled=False)).run()
    hxg, axg = shot_xg(result, "HOME"), shot_xg(result, "AWAY")
    if favorite_home:
        fav_score, dog_score, fav_xg, dog_xg = result.home_score, result.away_score, hxg, axg
    else:
        fav_score, dog_score, fav_xg, dog_xg = result.away_score, result.home_score, axg, hxg
    return {
        "favorite_score": fav_score,
        "underdog_score": dog_score,
        "favorite_xg": fav_xg,
        "underdog_xg": dog_xg,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed-pairs", type=int, default=4)
    ap.add_argument("--minutes", type=int, default=30)
    ap.add_argument("--seed0", type=int, default=34100)
    ap.add_argument("--deltas", type=float, nargs="+", default=[0.0, 1.0, 2.0, 3.0])
    ap.add_argument("--plan", type=Path, default=ROOT / "plans" / "end_to_end.json")
    ap.add_argument("--out", type=Path, default=ROOT / "quality_sweep_paired_v0_7.json")
    args = ap.parse_args()

    players, stats = load_players(ROOT / "data" / "players.json")
    rows = []
    for delta in args.deltas:
        legs = []
        for i in range(args.seed_pairs):
            seed = args.seed0 + i
            # Two legs per seed: the quality advantage changes sides while the semantic
            # random environment remains matched. This reduces home/direction noise.
            legs.append(run_leg(players, stats, seed, args.minutes, args.plan, delta, True))
            legs.append(run_leg(players, stats, seed, args.minutes, args.plan, delta, False))

        fav_wins = sum(1 for r in legs if r["favorite_score"] > r["underdog_score"])
        draws = sum(1 for r in legs if r["favorite_score"] == r["underdog_score"])
        dog_wins = len(legs) - fav_wins - draws
        fav_xg = mean(r["favorite_xg"] for r in legs)
        dog_xg = mean(r["underdog_xg"] for r in legs)
        rows.append({
            "delta_each_side": delta,
            "total_attribute_gap": 2.0 * delta,
            "matches": len(legs),
            "favorite_wins": fav_wins,
            "draws": draws,
            "underdog_wins": dog_wins,
            "favorite_win_rate": round(fav_wins / len(legs), 4),
            "underdog_win_rate": round(dog_wins / len(legs), 4),
            "favorite_mean_xg": round(fav_xg, 4),
            "underdog_mean_xg": round(dog_xg, 4),
            "favorite_xg_share": round(fav_xg / max(1e-9, fav_xg + dog_xg), 4),
        })

    payload = {
        "experiment": "paired_actual_attribute_gap_sweep",
        "seed_pairs_per_delta": args.seed_pairs,
        "matches_per_delta": args.seed_pairs * 2,
        "minutes": args.minutes,
        "seed0": args.seed0,
        "plan": str(args.plan.relative_to(ROOT) if args.plan.is_relative_to(ROOT) else args.plan),
        "paired_home_away": True,
        "same_seed_set_for_every_delta": True,
        "rows": rows,
        "integrity": [
            "Only actual player attributes are shifted; OVR remains untouched and unused.",
            "Every seed is played twice with the quality advantage swapped across HOME/AWAY.",
            "No favorite, parity, upset, comeback, momentum, or result switch exists.",
            "Underdog wins come from the same semantic keyed event randomness as every other result.",
        ],
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
