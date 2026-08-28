"""Direct tabulation of the locked nonlinear fatigue design (no matches).

effective_attribute penalty = sensitivity * deficit^2 + 0.18*sensitivity * acute^2
Expected: little change at high Energy, sharply increasing deterioration when
Energy gets low; awareness-type attributes nearly fatigue-insensitive.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fc_simulator.fatigue import effective_attribute, stamina_efficiency
from fc_simulator.models import Player, PlayerState, Vec2

ATTRS = ["acceleration", "sprint_speed", "agility", "reactions", "finishing",
         "short_passing", "standing_tackle", "vision", "defensive_awareness", "gk_reflexes"]
ENERGIES = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]

player = Player("t1", "Test", "CM", "R", 3, "C", 183.0, 76.0, {a: 80.0 for a in ATTRS})
state = PlayerState(player, "HOME", "LCM", Vec2(50, 50), Vec2(50, 50), Vec2(50, 50))

table = {}
for attr in ATTRS:
    row = {}
    for e in ENERGIES:
        state.energy = e
        state.acute_exertion = 0.0
        row[e] = round(effective_attribute(player, state, attr), 2)
    table[attr] = row

# curvature check: drop from 100->70 vs 70->40 vs 40->10 (base 80)
def drops(attr):
    r = table[attr]
    return round(r[100] - r[70], 2), round(r[70] - r[40], 2), round(r[40] - r[10], 2)

print(f"{'attribute':20s} {'E100':>6} {'E70':>6} {'E40':>6} {'E10':>6}   drop 100-70 / 70-40 / 40-10")
convex_ok, awareness_ok = True, True
for attr in ATTRS:
    r = table[attr]
    d1, d2, d3 = drops(attr)
    if not (d1 <= d2 <= d3):
        convex_ok = False
    print(f"{attr:20s} {r[100]:6.2f} {r[70]:6.2f} {r[40]:6.2f} {r[10]:6.2f}   {d1:5.2f} / {d2:5.2f} / {d3:5.2f}")
for attr in ("vision", "defensive_awareness"):
    if table[attr][100] - table[attr][10] > 2.0:
        awareness_ok = False
print("\nConvex (accelerating) deterioration for all attributes:", "PASS" if convex_ok else "FAIL")
print("Awareness-type attributes nearly fatigue-insensitive:", "PASS" if awareness_ok else "FAIL")
print("\nStamina efficiency (energy cost multiplier):",
      {s: round(stamina_efficiency(s), 3) for s in (40, 55, 70, 85, 99)})
print("Acute exertion adds a second (smaller) convex penalty term: coefficient 0.18*sensitivity")

Path(__file__).with_name("out").mkdir(exist_ok=True)
(Path(__file__).with_name("out") / "fatigue_curve.json").write_text(json.dumps(table, indent=1))
