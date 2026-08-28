"""Authority-repair before/after viewer data. Seed 789335328, 900 s.
Bookmarks: the 10 mandated sequence types incl. the ORIGINAL magnetic
episode moment (t≈327) and an off-ball-continuity moment."""
import json, math, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
from body import dist

ARM = sys.argv[1]
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
L.run(900.0)
body = L.body
team_of = {p['pid']: p['team'] for p in body.players.values()}
cons = body.contacts
seqs = [{'kind': 'ORIGINAL_MAGNETIC_EPISODE', 't': 323.0},
        {'kind': 'PINBALL_MELEE_EPISODE', 't': 29.0},
        {'kind': 'OFF_BALL_CONTINUITY', 't': 100.0}]
got = set()
def once(kind, t):
    if kind not in got:
        got.add(kind); seqs.append({'kind': kind, 't': round(max(0.0, t - 4.0), 1)})

eps = []
for i, c in enumerate(cons):
    if c['kind'] != 'CONTROL': continue
    kicker = None
    for j in range(i - 1, max(-1, i - 40), -1):
        if cons[j]['kind'].startswith('KICK'):
            if c['t'] - cons[j]['t'] < 2.5: kicker = cons[j]
            break
    if kicker is None or kicker['pid'] == c['pid']: continue
    if team_of[kicker['pid']] != team_of[c['pid']]: continue
    nxt = [c2 for c2 in cons[i+1:i+40] if c2['t'] - c['t'] <= 5.0]
    my_k = [c2 for c2 in nxt if c2['pid'] == c['pid'] and c2['kind'].startswith('KICK')]
    my_d = [c2 for c2 in nxt if c2['pid'] == c['pid'] and c2['kind'] == 'DRIBBLE_TOUCH']
    opp = [c2 for c2 in nxt if c2['pid'] not in (None, c['pid']) and team_of[c2['pid']] != team_of[c['pid']]]
    once('ORDINARY_RECEPTION_CARRY', c['t'])
    if my_k and 0.5 < my_k[0]['t'] - c['t'] <= 2.0: once('RECEIVE_IMMEDIATE_PASS', c['t'])
    if my_k and my_k[0]['t'] - c['t'] <= 0.5: once('ONE_TOUCH_LAYOFF', c['t'])
    if my_k and any(x['kind'] == 'CONTROL' and x['pid'] == kicker['pid'] and x['t'] > my_k[0]['t'] for x in nxt):
        once('WALL_PASS', c['t'])
    if len(my_d) >= 3 and (not my_k or my_k[0]['t'] - c['t'] > 2.0): once('RECEIVE_DRIBBLE', c['t'])
    if opp and opp[0]['t'] - c['t'] < 1.5: once('PRESSURED_RECEPTION', c['t'])
for i, c in enumerate(cons):
    if c['kind'] == 'HEAVY_TOUCH':
        once('BAD_HEAVY_TOUCH', c['t'])
        nxt = [c2 for c2 in cons[i+1:i+30] if c2['t'] - c['t'] <= 4.0]
        if any(c2['pid'] not in (None, c['pid']) and team_of[c2['pid']] != team_of[c['pid']] for c2 in nxt):
            once('DEFENDER_ATTACKS_LOOSE_TOUCH', c['t'])
json.dump(L.trace, open(f'{HERE}/trace_auth_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_auth_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_auth_{ARM}.json', 'w'), indent=0)
print(ARM, 'bookmarks:', sorted(got | {'ORIGINAL_MAGNETIC_EPISODE', 'PINBALL_MELEE_EPISODE', 'OFF_BALL_CONTINUITY'}))
