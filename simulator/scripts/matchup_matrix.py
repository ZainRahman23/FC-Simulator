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
PLANS = {
    "ultra": ROOT / "plans" / "ultra_low_block_4141.json",
    "controlled": ROOT / "plans" / "controlled_cagey_4141.json",
    "wide": ROOT / "plans" / "wide_attack_433.json",
    "open": ROOT / "plans" / "end_to_end.json",
}
ATTACK_KEYS = {"vision", "attacking_position", "ball_control", "dribbling", "short_passing", "long_passing", "crossing", "finishing", "shot_power", "long_shots", "volleys", "heading_accuracy", "acceleration", "agility", "reactions"}


def boost_attack(team, delta: float) -> None:
    for slot, p in list(team.lineup.items()):
        if slot == "GK":
            continue
        attrs = {k: (max(1.0, min(99.0, float(v) + delta)) if k in ATTACK_KEYS else v) for k, v in p.attributes.items()}
        team.lineup[slot] = replace(p, attributes=attrs)


def run_pair(players, stats, home_style: str, away_style: str, samples: int, minutes: int, seed0: int, home_attack_boost: float = 0.0) -> dict:
    rows = []
    for i in range(samples):
        home, away = build_mirrored_demo_teams(players)
        apply_plan(home, PLANS[home_style]); apply_plan(away, PLANS[away_style])
        if home_attack_boost:
            boost_attack(home, home_attack_boost)
        r = MatchEngine(home, away, stats, seed0 + i, MatchConfig(duration_seconds=minutes * 60, coach_ai_enabled=False)).run()
        hs = [e for e in r.events if e.event_type == "SHOT" and e.team_id == "HOME"]
        aws = [e for e in r.events if e.event_type == "SHOT" and e.team_id == "AWAY"]
        rows.append({
            "home_xg": sum(float(e.detail.get("xg", 0.0)) for e in hs),
            "away_xg": sum(float(e.detail.get("xg", 0.0)) for e in aws),
            "home_shots": len(hs), "away_shots": len(aws),
            "home_transition_shots": sum(1 for e in hs if e.detail.get("transition")),
            "away_transition_shots": sum(1 for e in aws if e.detail.get("transition")),
            "possession_changes": sum(1 for e in r.events if e.event_type == "POSSESSION_CHANGE"),
            "home_goals": r.home_score, "away_goals": r.away_score,
        })
    scale = 90.0 / minutes
    keys = rows[0].keys()
    return {k: round(mean(row[k] for row in rows) * scale, 3) for k in keys}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=6)
    ap.add_argument("--minutes", type=int, default=30)
    ap.add_argument("--seed0", type=int, default=20300)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    players, stats = load_players(ROOT / "data" / "players.json")
    cases = [
        ("ultra_vs_ultra", "ultra", "ultra", 0.0),
        ("controlled_vs_controlled", "controlled", "controlled", 0.0),
        ("wide_attack_vs_ultra", "wide", "ultra", 0.0),
        ("strong_wide_attack_vs_ultra", "wide", "ultra", 8.0),
        ("extreme_open_vs_open", "open", "open", 0.0),
        ("extreme_open_vs_ultra_stress", "open", "ultra", 0.0),
    ]
    payload = {
        "samples": args.samples, "minutes": args.minutes, "seed0": args.seed0,
        "per_90_minutes": {name: run_pair(players, stats, h, a, args.samples, args.minutes, args.seed0, boost) for name, h, a, boost in cases},
        "known_calibration_note": "The extreme_open_vs_ultra stress case remains too productive in v0.7; this file intentionally exposes that residual rather than hiding it with a scoring cap.",
    }
    text = json.dumps(payload, indent=2)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(json.dumps(payload["per_90_minutes"], indent=2))
    else:
        print(text)


if __name__ == "__main__":
    main()
