"""Recompute gk_* attribute_stats over the goalkeeper population only.

The original attribute_stats were computed over all 100 players, 90 of whom
are outfielders with gk attributes ~5-15. That poisons the normalizer for
specialist attributes: every real keeper saturates the tanh transform, so a
60-vs-88 reflexes gap collapsed to ~0.7% shot-conversion difference (measured,
48 matched seeds). Specialist attributes must be normalized against the
population that actually uses them. Outfield attribute stats are unchanged
(all players genuinely use those).

Bumps data_version. Rerun-safe / idempotent.
"""
from __future__ import annotations

import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "players.json"
GK_KEYS = ["gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes"]
DATA_VERSION = "players-v2-gkstats"

payload = json.loads(DATA.read_text())
if payload.get("data_version") == DATA_VERSION:
    print("already applied:", DATA_VERSION)
    raise SystemExit(0)

gks = [p for p in payload["players"] if p["primary_position"] == "GK"]
print(f"goalkeeper population: {len(gks)}")
for key in GK_KEYS:
    vals = [float(p["attributes"][key]) for p in gks]
    old = payload["attribute_stats"][key]
    payload["attribute_stats"][key] = {
        "mean": round(statistics.mean(vals), 2),
        "sd": statistics.stdev(vals),
        "n": len(vals),
        "population": "GK",
    }
    print(f"  {key}: mean {old['mean']:.1f} sd {old['sd']:.1f} (all players)  ->  "
          f"mean {payload['attribute_stats'][key]['mean']:.1f} sd {payload['attribute_stats'][key]['sd']:.1f} (GK only)")
payload["data_version"] = DATA_VERSION
DATA.write_text(json.dumps(payload, indent=2))
print("written:", DATA_VERSION)
