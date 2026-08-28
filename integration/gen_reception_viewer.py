"""Reception before/after visual evidence: one 1800s run of battery seed
789335328 per build; first-occurrence bookmarks for the 10 mandated
reception sequence types. Writes trace/decisions/sequences_<arm>.json."""
import json, math, sys, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hybrid import HybridLab, CAL12
from body import dist

ARM = sys.argv[1] if len(sys.argv) > 1 else 'after'
SRA = '/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json'

L = HybridLab(SRA, 789335328, cad=dict(CAL12))
L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
L.run(1800.0)
body = L.body
team_of = {p['pid']: p['team'] for p in body.players.values()}
cons = body.contacts
seqs = []
add = lambda k, t: seqs.append({'kind': k, 't': round(max(0.0, t - 4.0), 1)})

# reception episodes from contacts
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
    eps.append({'t': c['t'], 'pid': c['pid'], 'kicker': kicker, 'nxt': nxt})

got = set()
def once(kind, t):
    if kind not in got:
        got.add(kind); add(kind, t)

for e in eps:
    t, pid = e['t'], e['pid']
    my_k = [c for c in e['nxt'] if c['pid'] == pid and c['kind'].startswith('KICK')]
    my_d = [c for c in e['nxt'] if c['pid'] == pid and c['kind'] == 'DRIBBLE_TOUCH']
    opp = [c for c in e['nxt'] if c['pid'] not in (None, pid) and team_of[c['pid']] != team_of[pid]]
    once('ORDINARY_RECEPTION', t)
    if len(my_d) >= 3 and (not my_k or my_k[0]['t'] - t > 2.0):
        once('TOUCH_THEN_DRIBBLE', t)
    if my_k and 0.5 < my_k[0]['t'] - t <= 2.0:
        once('RECEIVE_QUICK_PASS', t)
    if my_k and my_k[0]['t'] - t <= 0.5:
        once('ONE_TOUCH_LAYOFF', t)
    if my_k and any(c['kind'] == 'CONTROL' and c['pid'] == e['kicker']['pid']
                    and c['t'] > my_k[0]['t'] for c in e['nxt']):
        once('WALL_PASS', t)
    if 'THROUGH' in e['kicker']['kind']:
        once('THROUGH_BALL_COLLECTION', t)
    press = min((dist(q['x'], q['y'], body.players[pid]['x'], body.players[pid]['y'])
                 for q in body.players.values() if q['team'] != team_of[pid]), default=99)
    if opp and opp[0]['t'] - t < 1.5:
        once('PRESSURED_RECEPTION', t)

# bad touch contests + defender attacking unresolved touch
for i, c in enumerate(cons):
    if c['kind'] == 'HEAVY_TOUCH':
        nxt = [c2 for c2 in cons[i+1:i+30] if c2['t'] - c['t'] <= 4.0]
        opp = [c2 for c2 in nxt if c2['pid'] not in (None, c['pid'])
               and team_of[c2['pid']] != team_of[c['pid']]]
        once('BAD_TOUCH_CONTEST', c['t'])
        if opp: once('DEFENDER_ATTACKS_LOOSE_TOUCH', c['t'])

# multi-pass combination: 3+ completed same-team passes inside 8 s
run_t, run_n, run_team = None, 0, None
for e in eps:
    tm = team_of[e['pid']]
    if run_team == tm and run_t is not None and e['t'] - run_t < 8.0:
        run_n += 1
        if run_n >= 3: once('MULTI_PASS_COMBINATION', run_t)
    else:
        run_team, run_t, run_n = tm, e['t'], 1

json.dump(L.trace, open(f'{HERE}/trace_reception_{ARM}.json', 'w'))
json.dump(L.decisions, open(f'{HERE}/decisions_reception_{ARM}.json', 'w'))
json.dump(sorted(seqs, key=lambda s: s['t']), open(f'{HERE}/sequences_reception_{ARM}.json', 'w'), indent=0)
print(ARM, 'bookmarks:', sorted(got))
