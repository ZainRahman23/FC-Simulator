#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from statistics import mean, median
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from fc_simulator.data import apply_plan, build_demo_teams, load_players
from fc_simulator.engine import MatchEngine
from fc_simulator.models import MatchConfig


def q(values, p):
    xs=sorted(values)
    if not xs: return 0.0
    i=(len(xs)-1)*p
    lo=int(i); hi=min(lo+1,len(xs)-1); f=i-lo
    return xs[lo]*(1-f)+xs[hi]*f


def run_style(plan_path, seeds, minutes):
    players, stats=load_players(ROOT/'data'/'players.json')
    rows=[]
    for seed in seeds:
        home,away=build_demo_teams(players)
        apply_plan(home,plan_path); apply_plan(away,plan_path)
        r=MatchEngine(home,away,stats,seed,MatchConfig(duration_seconds=minutes*60,coach_ai_enabled=False)).run()
        shots=[e for e in r.events if e.event_type=='SHOT']
        xg=sum(float(e.detail.get('xg',0)) for e in shots)
        rows.append({
            'goals':r.home_score+r.away_score,
            'xg':xg,
            'shots':len(shots),
            'transition_shots':sum(bool(e.detail.get('transition')) for e in shots),
            'big_chances':sum(float(e.detail.get('xg',0))>=0.25 for e in shots),
            'crosses':sum(e.event_type=='CROSS' for e in r.events),
            'cutback_windows':sum(e.event_type=='CUTBACK_WINDOW' for e in r.events),
            'possession_changes':sum(e.event_type=='POSSESSION_CHANGE' for e in r.events),
        })
    scale=90.0/minutes
    out={'matches':len(rows),'minutes_each':minutes}
    for key in rows[0]:
        vals=[row[key]*scale for row in rows]
        out[key+'_per90_mean']=round(mean(vals),4)
        out[key+'_per90_median']=round(median(vals),4)
        out[key+'_per90_p25']=round(q(vals,.25),4)
        out[key+'_per90_p75']=round(q(vals,.75),4)
    raw_xg=[r['xg']*scale for r in rows]
    raw_goals=[r['goals']*scale for r in rows]
    out['share_below_0_4_xg_per90']=round(sum(x<0.4 for x in raw_xg)/len(raw_xg),4)
    out['share_between_0_4_and_1_2_xg_per90']=round(sum(0.4<=x<=1.2 for x in raw_xg)/len(raw_xg),4)
    out['share_zero_goal_sample']=round(sum(g==0 for g in raw_goals)/len(raw_goals),4)
    return out


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--matches',type=int,default=12)
    ap.add_argument('--minutes',type=int,default=30)
    ap.add_argument('--seed',type=int,default=12000)
    ap.add_argument('--out',type=Path)
    a=ap.parse_args(); seeds=list(range(a.seed,a.seed+a.matches))
    plans={
      'ultra_low_block':ROOT/'plans'/'ultra_low_block_4141.json',
      'controlled_cagey':ROOT/'plans'/'controlled_cagey_4141.json',
      'wide_attack':ROOT/'plans'/'wide_attack_433.json',
      'end_to_end':ROOT/'plans'/'end_to_end.json',
    }
    payload={'seeds':seeds,'styles':{k:run_style(v,seeds,a.minutes) for k,v in plans.items()}}
    text=json.dumps(payload,indent=2); print(text)
    if a.out: a.out.write_text(text,encoding='utf-8')
if __name__=='__main__': main()
