#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, sys
from dataclasses import replace
from pathlib import Path
from statistics import mean
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fc_simulator.data import apply_plan, build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig

ATTACK_KEYS = {"short_passing", "long_passing", "vision", "ball_control", "dribbling", "attacking_position", "finishing", "reactions"}
ATTACK_SLOTS = {"LM", "RM", "LW", "RW", "LCM", "RCM", "LAM", "CAM", "RAM", "ST"}

def weaken(team, ceiling: float):
    for slot, player in list(team.lineup.items()):
        if slot in ATTACK_SLOTS:
            attrs = dict(player.attributes)
            for key in ATTACK_KEYS:
                attrs[key] = min(attrs.get(key, ceiling), ceiling)
            team.lineup[slot] = replace(player, attributes=attrs)

def run(weak: bool, matches: int, minutes: int, seed: int, ceiling: float):
    players, stats = load_players(ROOT / "data" / "players.json")
    plan = ROOT / "plans" / "controlled_cagey_4141.json"
    rows=[]
    for i in range(matches):
        home, away = build_demo_teams(players); apply_plan(home, plan); apply_plan(away, plan)
        if weak: weaken(home, ceiling); weaken(away, ceiling)
        result = MatchEngine(home, away, stats, seed+i, MatchConfig(duration_seconds=minutes*60, coach_ai_enabled=False)).run()
        shots=[e for e in result.events if e.event_type=="SHOT"]
        rows.append({"xg":sum(float(e.detail.get("xg",0)) for e in shots),"shots":len(shots),"goals":result.home_score+result.away_score})
    return {k:round(mean(r[k] for r in rows),4) for k in rows[0]}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--matches',type=int,default=6); ap.add_argument('--minutes',type=int,default=30); ap.add_argument('--seed',type=int,default=9200); ap.add_argument('--ceiling',type=float,default=60); ap.add_argument('--out',type=Path); args=ap.parse_args()
    strong=run(False,args.matches,args.minutes,args.seed,args.ceiling); weak=run(True,args.matches,args.minutes,args.seed,args.ceiling)
    payload={"minutes":args.minutes,"matches":args.matches,"strong_attackers":strong,"weakened_attackers":weak,"xg_ratio_weak_to_strong":round(weak['xg']/max(1e-9,strong['xg']),4)}
    text=json.dumps(payload,indent=2); print(text)
    if args.out: args.out.write_text(text)
if __name__=='__main__': main()
