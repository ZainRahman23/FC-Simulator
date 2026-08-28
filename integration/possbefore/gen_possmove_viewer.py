"""Possession-movement before/after viewer (1800s, seed 789335328).
Fifteen mandated bookmark classes, first occurrences, measured."""
import json, math, sys, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
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

eps = []; cur = None; last = None
speed_hist = collections.deque(maxlen=300)
frz = []  # (t, dur)
frz_cur = 0.0
while body.t < 1800.0:
    L.run(1/60)
    ctrl = b['ctrl']
    if ctrl != last:
        if ctrl is not None:
            p = body.players[ctrl]
            cur = {'t0': body.t, 'pid': ctrl, 'lx': p['x'], 'ly': p['y'], 'd': 0.0,
                   'src_k': kicks[-1] if kicks and body.t - kicks[-1][0] < 2.5 else None}
        elif cur:
            cur['dur'] = body.t - cur['t0']; eps.append(cur); cur = None
        last = ctrl
    elif cur is not None:
        p = body.players[ctrl]
        cur['d'] += dist(p['x'], p['y'], cur['lx'], cur['ly'])
        cur['lx'], cur['ly'] = p['x'], p['y']
    if int(body.t*60) % 6 == 0 and body.restart is None:
        nslow = sum(1 for pid, p in body.players.items()
                    if not p['gk'] and math.hypot(p['vx'], p['vy']) < 0.3)
        speed_hist.append((body.t, nslow))
        if len(speed_hist) > 240:
            old = [x for x in speed_hist if body.t-4.0 < x[0] < body.t-2.5]
            if old and nslow >= 14 and sum(o[1] for o in old)/len(old) < 9:
                frz_cur += 0.1
            else:
                if frz_cur > 0.2: frz.append((body.t - frz_cur, round(frz_cur,2)))
                frz_cur = 0.0

seqs = []; got = collections.Counter()
def add(kind, t, pre=3.0):
    if got[kind] < 2:
        got[kind] += 1; seqs.append({'kind': kind, 't': round(max(0.0, t-pre), 1)})

for e in eps:
    if 'dur' not in e: continue
    k = e['src_k']
    src = None
    if k:
        same = team_of.get(k[1]) == team_of[e['pid']] and k[1] != e['pid']
        if same and k[3] < 20: src = 'SHORT'
        elif not same and 'CLEAR' in k[2]: src = 'CLEARANCE'
        elif not same: src = 'INTERCEPTION'
    if src == 'SHORT' and e['d'] > 4 and e['dur'] > 1.2: add('SHORT_RECEPTION_CARRY', e['t0'])
    if src == 'SHORT' and e['dur'] < 0.8: add('SHORT_RECEPTION_QUICK_PASS', e['t0'])
    if src == 'INTERCEPTION' and e['d'] > 3: add('INTERCEPTION_CARRY', e['t0'])
    if src == 'INTERCEPTION' and e['dur'] < 1.5: add('INTERCEPTION_PASS', e['t0'])
    if src is None and e['d'] > 3 and e['dur'] > 1.2: add('LOOSE_BALL_CARRY', e['t0'])
    if src == 'CLEARANCE' and e['dur'] > 0.8: add('CLEARANCE_COLLECTION_CARRY', e['t0'])
    if e['d'] > 8 and e['dur'] > 2.0: add('CARRIER_OPEN_SPACE_DRIVE', e['t0'])
    if e['dur'] > 3.0 and e['d'] < 3.0: add('CARRIER_HOLDS_TEAM_REPOSITIONS', e['t0'])
# deflection recovery
for i, c in enumerate(body.contacts):
    if c['kind'] == 'DEFLECT':
        nxt = next((c2 for c2 in body.contacts[i+1:i+15]
                    if c2['kind'] == 'CONTROL' and c2['t']-c['t'] < 3.0), None)
        if nxt: add('DEFLECTION_RECOVERY_CARRY', c['t'])
for t, d in sorted(frz, key=lambda x: -x[1])[:1]:
    add('LONGEST_MOVEMENT_COLLAPSE', t, pre=4.0)
# sustained possession with support/defense
run_team, run_t0, run_n = None, None, 0
for e in eps:
    if 'dur' not in e: continue
    tm = team_of[e['pid']]
    if tm == run_team and e['t0'] - run_t0 < 12: run_n += 1
    else: run_team, run_t0, run_n = tm, e['t0'], 1
    if run_n >= 4:
        add('SUSTAINED_POSSESSION_SUPPORT', run_t0)
        add('SUSTAINED_POSSESSION_DEFENSE', run_t0)
json.dump(L.trace, open(f'{HERE}/trace_pm_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_pm_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_pm_{ARM}.json', 'w'), indent=0)
print(ARM, dict(got), '| freezes:', frz[:5])
