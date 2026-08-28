from __future__ import annotations

import argparse
import json
from pathlib import Path

from .data import apply_plan, build_demo_teams, load_players
from .engine import MatchEngine
from .models import MatchConfig


def main() -> None:
    parser = argparse.ArgumentParser(description="FC simulator v0.7 random-integrity, matchup-ecology, and quality-gap core")
    parser.add_argument("--players", default=str(Path(__file__).resolve().parents[1] / "data" / "players.json"))
    parser.add_argument("--seed", type=int, default=20260818)
    parser.add_argument("--minutes", type=int, default=90)
    parser.add_argument("--timeline", action="store_true")
    parser.add_argument("--rng-audit", action="store_true", help="Include semantic keyed-RNG audit entries in output")
    parser.add_argument("--home-plan", type=Path)
    parser.add_argument("--away-plan", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--no-coach-ai", action="store_true", help="Freeze the starting tactical plans for calibration/reference runs")
    args = parser.parse_args()

    players, stats = load_players(args.players)
    home, away = build_demo_teams(players)
    if args.home_plan:
        apply_plan(home, args.home_plan)
    if args.away_plan:
        apply_plan(away, args.away_plan)
    engine = MatchEngine(home, away, stats, args.seed, MatchConfig(duration_seconds=args.minutes * 60, record_timeline=args.timeline, record_rng_audit=args.rng_audit, coach_ai_enabled=not args.no_coach_ai))
    result = engine.run()
    payload = {"summary": result.summary(), "events": [e.to_dict() for e in result.events]}
    if args.timeline:
        payload["timeline"] = result.timeline
    if args.rng_audit:
        payload["rng_audit"] = result.rng_audit
    text = json.dumps(payload, indent=2)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(json.dumps(result.summary(), indent=2))
        print(f"Wrote {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
