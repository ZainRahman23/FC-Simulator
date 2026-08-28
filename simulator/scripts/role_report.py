#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser(description="Summarize live role-performance evidence from a match JSON")
    ap.add_argument("match", type=Path)
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()
    payload = json.loads(args.match.read_text(encoding="utf-8"))
    players = payload["summary"]["players"]
    rows = []
    for pid, p in players.items():
        role = p.get("role", {})
        opps = int(role.get("opportunities", 0))
        if opps <= 0:
            continue
        rows.append({
            "player_id": pid,
            "name": p["name"],
            "team": p["team_id"],
            "slot": p["slot"],
            "rating": p["rating"],
            "attack_role": role.get("attack_role"),
            "defense_role": role.get("defense_role"),
            "role_value": role.get("value", 0.0),
            "opportunities": opps,
            "successes": int(role.get("successes", 0)),
            "success_rate": role.get("success_rate", 0.0),
            "support_options": role.get("support_options", 0),
            "line_stretch_runs": role.get("line_stretch_runs", 0),
            "screening_actions": role.get("screening_actions", 0),
            "tracking_actions": role.get("tracking_actions", 0),
            "width_actions": role.get("width_actions", 0),
            "box_support_actions": role.get("box_support_actions", 0),
        })
    rows.sort(key=lambda r: (r["role_value"], r["successes"]), reverse=True)
    print(json.dumps(rows[:args.top], indent=2))


if __name__ == "__main__":
    main()
