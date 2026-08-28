#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import replace
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fc_simulator.data import build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig, Vec2

DATA = Path(__file__).resolve().parents[1] / "data" / "players.json"
players, stats = load_players(DATA)
home, away = build_demo_teams(players)
engine = MatchEngine(home, away, stats, 999, MatchConfig(duration_seconds=30))

carrier = engine._carrier()
target0 = next(s for s in engine._team_states(carrier.team_id) if s.slot not in {"GK"} and s is not carrier)
target = replace(target0, pos=Vec2(carrier.pos.x + (5 if carrier.team_id == "HOME" else -5), carrier.pos.y + 2))
print("Short Passing sweep")
for value in (50, 60, 70, 80, 90, 99):
    state = replace(carrier, player=replace(carrier.player, attributes={**carrier.player.attributes, "short_passing": value}))
    print(value, round(engine.pass_execution_probability(state, target, 0.35), 4))

att = next(s for s in engine._team_states("HOME") if s.slot == "ST")
defn = next(s for s in engine._team_states("AWAY") if s.slot in {"LCB", "RCB"})
landing = Vec2((att.pos.x + defn.pos.x) / 2, (att.pos.y + defn.pos.y) / 2)
print("\nHeight sweep, identical other attributes")
for cm in (170, 175, 180, 185, 190, 195, 200):
    state = replace(att, player=replace(att.player, height_cm=float(cm)))
    print(cm, round(engine.aerial_win_probability(state, defn, landing), 4))

print("\nWeight sweep: pass probability must stay invariant")
for kg in (60, 70, 80, 90, 100):
    state = replace(carrier, player=replace(carrier.player, weight_kg=float(kg)))
    print(kg, round(engine.pass_execution_probability(state, target, 0.35), 4))
