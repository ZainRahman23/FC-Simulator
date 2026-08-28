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

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig


def main() -> None:
    ap = argparse.ArgumentParser(description="Run deterministic full-match calibration batch")
    ap.add_argument("--players", default=str(ROOT / "data" / "players.json"))
    ap.add_argument("--matches", type=int, default=25)
    ap.add_argument("--seed", type=int, default=1000)
    ap.add_argument("--minutes", type=int, default=90)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    players, stats = load_players(args.players)
    totals = []
    event_counts = Counter()
    shot_xg = []
    for i in range(args.matches):
        home, away = build_demo_teams(players)
        result = MatchEngine(home, away, stats, args.seed + i, MatchConfig(duration_seconds=args.minutes * 60)).run()
        events = result.events
        counts = Counter(e.event_type for e in events)
        event_counts.update(counts)
        states = list(result.player_states.values())
        pa = sum(s.passes_attempted for s in states)
        pc = sum(s.passes_completed for s in states)
        shots = [e for e in events if e.event_type == "SHOT"]
        xg = sum(float(e.detail.get("xg", 0.0)) for e in shots)
        shot_xg.extend(float(e.detail.get("xg", 0.0)) for e in shots)
        transition_shots = [e for e in shots if e.detail.get("transition")]
        org_values = [float(e.detail["defensive_organization"]) for e in shots if e.detail.get("defensive_organization") is not None]
        possession_changes = [e for e in events if e.event_type == "POSSESSION_CHANGE"]
        possession_durations = [float(e.detail.get("previous_duration_s", 0.0)) for e in possession_changes]
        totals.append({
            "goals": result.home_score + result.away_score,
            "shots": len(shots),
            "passes": pa,
            "pass_completion": pc / max(1, pa),
            "crosses": counts["CROSS"],
            "dribbles": counts["DRIBBLE"],
            "aerial_duels": counts["AERIAL_DUEL"],
            "ground_duels": counts["GROUND_DUEL"],
            "fouls": counts["FOUL"],
            "cards": counts["CARD"],
            "penalties": counts["PENALTY"],
            "xg": xg,
            "transition_shots": len(transition_shots),
            "transition_xg": sum(float(e.detail.get("xg", 0.0)) for e in transition_shots),
            "big_chances": sum(1 for e in shots if float(e.detail.get("xg", 0.0)) >= 0.25),
            "box_entries": counts["BOX_ENTRY"],
            "through_balls": sum(1 for e in events if e.event_type == "PASS" and e.detail.get("pass_type") == "THROUGH"),
            "clearances": counts["CLEARANCE"],
            "possession_changes": len(possession_changes),
            "mean_possession_s": mean(possession_durations) if possession_durations else 0.0,
            "mean_def_org_on_shots": mean(org_values) if org_values else 0.0,
            "starter_mean_energy": mean(s.energy for s in states if s.minute_on == 0),
            "distance_per_starting_slot_km": sum(s.distance_m for s in states) / 22.0 / 1000.0,
            "substitutions": counts["SUBSTITUTION"],
            "active_play_minutes": result.active_play_seconds / 60.0,
            "dead_ball_minutes": result.dead_ball_seconds / 60.0,
            "role_success_rate": sum(s.role_successes for s in states) / max(1, sum(s.role_opportunities for s in states)),
            "mean_player_rating": mean(s.match_rating for s in states if s.active or s.subbed_off),
        })

    keys = totals[0].keys()
    summary = {k: round(mean(float(r[k]) for r in totals), 4) for k in keys}
    summary["matches"] = args.matches
    summary["mean_shot_xg"] = round(mean(shot_xg), 4) if shot_xg else 0.0
    payload = {"summary": summary, "event_counts": dict(event_counts), "matches": totals}
    print(json.dumps(summary, indent=2))
    if args.out:
        args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
