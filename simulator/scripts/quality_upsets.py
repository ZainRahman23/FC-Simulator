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
    """Shift actual player attributes, never OVR, for controlled quality-gap experiments."""
    for slot, player in list(team.lineup.items()):
        attrs = {k: max(1.0, min(99.0, float(v) + delta)) for k, v in player.attributes.items()}
        team.lineup[slot] = replace(player, attributes=attrs)


def run(samples: int, minutes: int, delta: float, seed0: int, plan: Path) -> dict:
    players, stats = load_players(ROOT / "data" / "players.json")
    wins = draws = losses = 0
    favorite_xg: list[float] = []
    underdog_xg: list[float] = []
    rows = []
    for i in range(samples):
        seed = seed0 + i
        home, away = build_mirrored_demo_teams(players)
        apply_plan(home, plan)
        apply_plan(away, plan)
        shift_attributes(home, delta)
        shift_attributes(away, -delta)
        result = MatchEngine(home, away, stats, seed, MatchConfig(duration_seconds=minutes * 60, coach_ai_enabled=False)).run()
        if result.home_score > result.away_score:
            wins += 1
        elif result.home_score == result.away_score:
            draws += 1
        else:
            losses += 1
        home_shots = [e for e in result.events if e.event_type == "SHOT" and e.team_id == "HOME"]
        away_shots = [e for e in result.events if e.event_type == "SHOT" and e.team_id == "AWAY"]
        hxg = sum(float(e.detail.get("xg", 0.0)) for e in home_shots)
        axg = sum(float(e.detail.get("xg", 0.0)) for e in away_shots)
        favorite_xg.append(hxg)
        underdog_xg.append(axg)
        rows.append({"seed": seed, "favorite_score": result.home_score, "underdog_score": result.away_score, "favorite_xg": round(hxg, 4), "underdog_xg": round(axg, 4)})
    return {
        "experiment": "attribute_quality_gap_no_upset_switch",
        "samples": samples,
        "minutes": minutes,
        "attribute_delta": delta,
        "plan": str(plan.relative_to(ROOT) if plan.is_relative_to(ROOT) else plan),
        "favorite": {"wins": wins, "draws": draws, "losses": losses, "win_rate": round(wins / samples, 4), "mean_xg": round(mean(favorite_xg), 4)},
        "underdog": {"wins": losses, "draws": draws, "losses": wins, "win_rate": round(losses / samples, 4), "mean_xg": round(mean(underdog_xg), 4)},
        "notes": [
            "Only actual player attributes are shifted; OVR is untouched and unused by the match engine.",
            "There is no upset/comeback switch. Underdog wins arise from the same event-level seeded randomness as every other match.",
        ],
        "matches": rows,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=16)
    ap.add_argument("--minutes", type=int, default=45)
    ap.add_argument("--delta", type=float, default=2.0)
    ap.add_argument("--seed0", type=int, default=31200)
    ap.add_argument("--plan", type=Path, default=ROOT / "plans" / "end_to_end.json")
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    payload = run(args.samples, args.minutes, args.delta, args.seed0, args.plan)
    text = json.dumps(payload, indent=2)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(json.dumps({k: payload[k] for k in ("samples", "minutes", "attribute_delta", "favorite", "underdog")}, indent=2))
    else:
        print(text)


if __name__ == "__main__":
    main()
