"""Defect A+B before/after viewer data. Seed 789335328, 1800s.
Ten mandated bookmark types; freeze/twitch onsets at matched wall-clock."""
import json, math, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist

ARM = sys.argv[1]
L = HybridLab('/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json',
              789335328, cad=dict(CAL12))
body, b = L.body, L.body.ball
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
team_of = {p['pid']: p['team'] for p in body.players.values()}

kicks = []
orig_kick = type(body).kick
def kick_spy(self, pid, tx, ty, fam):
    kicks.append((self.t, pid, fam, dist(self.ball['x'], self.ball['y'], tx, ty)))
    return orig_kick(self, pid, tx, ty, fam)
body.kick = kick_spy.__get__(body)
L.run(1800.0)

cons = body.contacts
seqs = [{'kind': 'FREEZE_ONSET_MATCHED', 't': 744.7},      # −5s pre-roll of baseline freeze @749.7
        {'kind': 'TWITCH_ONSET_MATCHED', 't': 94.5}]
got = set()
def once(kind, t, pre=4.0):
    if kind not in got:
        got.add(kind); seqs.append({'kind': kind, 't': round(max(0.0, t - pre), 1)})

# long-ball reception classes
for kt, kp, fam, D in kicks:
    if D < 28 or fam == 'SHOT': continue
    first = next((c for c in cons if c['t'] > kt + 0.3 and c['t'] - kt < 6.0
                  and c['pid'] not in (None, kp) and not c['kind'].startswith('KICK')
                  and c['kind'] != 'BOUNCE'), None)
    if first is None or team_of[first['pid']] != team_of[kp]: 
        if first is not None: once('LONGBALL_FAILED', kt)
        continue
    p0 = body.players[first['pid']]
    if first['kind'] == 'CONTROL':
        once('LONGBALL_CONTROLLED', kt)
    elif first['kind'] == 'HEAVY_TOUCH':
        rec = next((c for c in cons if c['t'] > first['t'] and c['t'] - first['t'] < 4.0
                    and c['kind'] == 'CONTROL' and c['pid'] == first['pid']), None)
        once('LONGBALL_HEAVY' if rec else 'LONGBALL_FAILED', kt)
    else:
        once('LONGBALL_FAILED', kt)
# pressured long control: CONTROL with an opponent inside 3m at that time
ti = 0
for kt, kp, fam, D in kicks:
    if D < 28 or fam == 'SHOT': continue
    c = next((c for c in cons if c['t'] > kt + 0.3 and c['t'] - kt < 6.0 and c['kind'] == 'CONTROL'
              and c['pid'] is not None and team_of[c['pid']] == team_of[kp] and c['pid'] != kp), None)
    if c is None: continue
    fr = min(L.trace, key=lambda f: abs(f['t'] - c['t']))
    me = next((pr for pr in fr['p'] if pr[0] == c['pid']), None)
    if me and any(dist(me[1], me[2], pr[1], pr[2]) < 3.0 for pr in fr['p']
                  if team_of[pr[0]] != team_of[c['pid']]):
        once('LONGBALL_PRESSURED', kt)
# short classes
for i, c in enumerate(cons):
    if c['kind'] != 'CONTROL': continue
    k = next(((t, p, f, D) for t, p, f, D in reversed(kicks) if t < c['t'] and c['t'] - t < 2.0), None)
    if not k or k[3] > 16 or k[1] == c['pid'] or team_of.get(k[1]) != team_of[c['pid']]: continue
    once('SHORT_RECEPTION_CARRY', c['t'])
    nxt = [x for x in cons[i+1:i+30] if x['t'] - c['t'] < 4.0]
    if any(x['kind'].startswith('KICK') and x['pid'] == c['pid'] for x in nxt) and \
       any(x['kind'] == 'CONTROL' and x['pid'] not in (None, c['pid'])
           and team_of[x['pid']] == team_of[c['pid']] for x in nxt):
        once('SHORT_COMBINATION', c['t'])
# attacking support / defensive shape moments
for f in L.trace:
    ctrlp = f['b'][4]
    if ctrlp is None: continue
    tm = team_of.get(ctrlp)
    bx = f['b'][0]
    ahead = sum(1 for pr in f['p'] if team_of[pr[0]] == tm and
                ((pr[1] > bx + 3) if tm == 0 else (pr[1] < bx - 3)))
    if tm == 0 and bx > 60 and ahead >= 3: once('ATTACKING_SUPPORT', f['t'])
    if tm == 1 and bx < 45:
        home_behind = sum(1 for pr in f['p'] if team_of[pr[0]] == 0 and pr[1] < bx + 2)
        if home_behind >= 8: once('DEFENSIVE_SHAPE', f['t'])

json.dump(L.trace, open(f'{HERE}/trace_ab_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_ab_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_ab_{ARM}.json', 'w'), indent=0)
print(ARM, sorted(got | {'FREEZE_ONSET_MATCHED', 'TWITCH_ONSET_MATCHED'}))
