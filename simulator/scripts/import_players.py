#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from typing import Any

from artifact_tool import Blob, SpreadsheetFile

ALIASES = {
    "player": ["Player", "Name"],
    "position": ["Position", "Pos"],
    "ovr": ["OVR", "Overall"],
    "pot": ["POT", "Potential"],
    "age": ["Age"],
    "foot": ["Foot", "Preferred Foot"],
    "weak_foot": ["WF", "Weak Foot"],
    "natural_side": ["Nat. side", "Natural Side"],
    "height_cm": ["Height", "Height (cm)", "Height cm", "Height_cm", "Ht (cm)", "Ht"],
    "weight_kg": ["Weight", "Weight (kg)", "Weight kg", "Weight_kg", "Wt (kg)", "Wt"],
}

ATTRIBUTE_COLUMNS = {
    "acceleration": "Acceleration",
    "sprint_speed": "Sprint Speed",
    "agility": "Agility",
    "reactions": "Reactions",
    "ball_control": "Ball Control",
    "dribbling": "Dribbling",
    "short_passing": "Short Passing",
    "long_passing": "Long Passing",
    "vision": "Vision",
    "crossing": "Crossing",
    "finishing": "Finishing",
    "attacking_position": "Att. Position",
    "shot_power": "Shot Power",
    "long_shots": "Long Shots",
    "volleys": "Volleys",
    "heading_accuracy": "Heading Acc.",
    "defensive_awareness": "Def. Awareness",
    "standing_tackle": "Standing Tackle",
    "sliding_tackle": "Sliding Tackle",
    "interceptions": "Interceptions",
    "strength": "Strength",
    "stamina": "Stamina",
    "aggression": "Aggression",
    "jumping": "Jumping",
    "gk_diving": "GK Diving",
    "gk_handling": "GK Handling",
    "gk_kicking": "GK Kicking",
    "gk_positioning": "GK Positioning",
    "gk_reflexes": "GK Reflexes",
}


def first_header(headers: list[str], options: list[str]) -> str | None:
    normalized = {str(h).strip().lower(): str(h) for h in headers if h is not None}
    for option in options:
        hit = normalized.get(option.strip().lower())
        if hit is not None:
            return hit
    return None


def num(value: Any, default: float | None = None) -> float | None:
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower().replace("kg", "").replace("cm", "")
    try:
        return float(text)
    except ValueError:
        return default


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--sheet", default="All 100")
    parser.add_argument("--out", type=Path, default=Path("data/players.json"))
    args = parser.parse_args()

    wb = SpreadsheetFile.import_xlsx(Blob.load(str(args.workbook)))
    sheet = wb.worksheets.get_item(args.sheet)
    # Intentionally generous range: new source files can append Height/Weight or other metadata.
    values = sheet.get_range("A1:AZ500").values
    rows = [list(r) for r in values if any(v not in (None, "") for v in r)]
    if not rows:
        raise SystemExit("No rows found")

    raw_headers = ["" if h is None else str(h).strip() for h in rows[0]]
    last_nonempty = max(i for i, h in enumerate(raw_headers) if h)
    headers = raw_headers[: last_nonempty + 1]
    index = {h: i for i, h in enumerate(headers) if h}

    resolved = {key: first_header(headers, aliases) for key, aliases in ALIASES.items()}
    missing_core = [key for key in ("player", "position") if not resolved[key]]
    if missing_core:
        raise SystemExit(f"Missing core columns: {missing_core}; headers={headers}")

    attribute_headers = {}
    for key, label in ATTRIBUTE_COLUMNS.items():
        found = first_header(headers, [label])
        if found:
            attribute_headers[key] = found

    players = []
    for ridx, row in enumerate(rows[1:], start=2):
        def get(header: str | None):
            if not header:
                return None
            j = index[header]
            return row[j] if j < len(row) else None

        name = get(resolved["player"])
        position = get(resolved["position"])
        if not name or not position:
            continue
        attrs = {}
        for key, header in attribute_headers.items():
            value = num(get(header))
            if value is not None:
                attrs[key] = value

        player = {
            "player_id": f"p{len(players)+1:03d}",
            "name": str(name),
            "primary_position": str(position).upper(),
            "secondary_positions": [],
            "preferred_foot": (str(get(resolved["foot"]) or "R").upper()),
            "weak_foot": int(num(get(resolved["weak_foot"]), 3) or 3),
            "natural_side": str(get(resolved["natural_side"]) or "C").upper(),
            "height_cm": num(get(resolved["height_cm"])),
            "weight_kg": num(get(resolved["weight_kg"])),
            # Display metadata only. The engine must never use OVR/POT in resolution logic.
            "ovr": int(num(get(resolved["ovr"]), 0) or 0),
            "pot": int(num(get(resolved["pot"]), 0) or 0),
            "age": int(num(get(resolved["age"]), 0) or 0),
            "attributes": attrs,
            "source_row": ridx,
        }
        players.append(player)

    attr_values: dict[str, list[float]] = {key: [] for key in ATTRIBUTE_COLUMNS}
    for p in players:
        for key, value in p["attributes"].items():
            attr_values.setdefault(key, []).append(float(value))

    stats = {}
    for key, vals in attr_values.items():
        if not vals:
            continue
        mean = sum(vals) / len(vals)
        variance = sum((x - mean) ** 2 for x in vals) / max(1, len(vals) - 1)
        stats[key] = {"mean": mean, "sd": variance ** 0.5, "n": len(vals)}

    payload = {
        "source_workbook": args.workbook.name,
        "source_sheet": args.sheet,
        "columns": headers,
        "height_detected": resolved["height_cm"] is not None,
        "weight_detected": resolved["weight_kg"] is not None,
        "players": players,
        "attribute_stats": stats,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({
        "players": len(players),
        "height_detected": payload["height_detected"],
        "weight_detected": payload["weight_detected"],
        "out": str(args.out),
    }, indent=2))


if __name__ == "__main__":
    main()
