"""Reception outcome distributions (mandated measurement set).
Runs in whatever build dir it sits in. 3 seeds x 900 s."""
import json, math, sys, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hybrid import HybridLab, CAL12
from body import dist

SRA = '/Users/zainrahman/Downloads/FC Simulator/simulator/validation/rforensic/mw08_start.json'
MARKS = (0.25, 0.5, 1.0, 2.0, 5.0)

def run_seed(seed, secs=900.0):
    L = HybridLab(SRA, seed, cad=dict(CAL12))
    body, b = L.body, L.body.ball
    body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    team_of = {p['pid']: p['team'] for p in body.players.values()}
    eps = []; pend = None; n0 = 0
    prev_d2b = {}
    while body.t < secs:
        L.run(1/60)
        while n0 < len(body.contacts):
            c = body.contacts[n0]; n0 += 1
            if pend is None and c['kind'] in ('CONTROL',) and body.t - body.last_kick_t < 2.5 \
               and body.last_kicker is not None and c['pid'] != body.last_kicker \
               and team_of.get(c['pid']) == team_of.get(body.last_kicker):
                p0 = body.players[c['pid']]
                pend = {'t0': c['t'], 'pid': c['pid'], 'kicker': body.last_kicker,
                        'auth': dict.fromkeys(MARKS, False), 'move': dict.fromkeys(MARKS, False),
                        'action': None, 'action_kind': None, 'limbo': 0.0, '_cl': 0.0,
                        'chal': None, 'x0': p0['x'], 'adv': 0.0, 'wall': False}
            elif pend is not None:
                dt = c['t'] - pend['t0']
                if c['pid'] == pend['pid'] and c['kind'].startswith('KICK') and pend['action'] is None:
                    pend['action'] = round(dt, 2); pend['action_kind'] = c['kind']
                if pend['chal'] is None and c['pid'] not in (None, pend['pid']) \
                        and team_of[c['pid']] != team_of[pend['pid']] \
                        and c['kind'] in ('CONTROL', 'TACKLE_WON', 'TOUCH_LOOSE', 'DEFLECT'):
                    pend['chal'] = round(dt, 2)
                if c['kind'] == 'CONTROL' and c['pid'] == pend['kicker'] \
                        and pend['action'] is not None and dt < 3.0:
                    pend['wall'] = True   # A -> B -> back to A inside 3 s
        if pend is not None:
            dt = body.t - pend['t0']
            p = body.players[pend['pid']]
            sp = math.hypot(p['vx'], p['vy'])
            closing = False
            for pid, q in body.players.items():
                d = dist(q['x'], q['y'], b['x'], b['y'])
                if d < prev_d2b.get(pid, 1e9) - 0.01 and d < 12: closing = True
                prev_d2b[pid] = d
            if b['ctrl'] is None and b['held'] is None and body.restart is None \
                    and not closing and b['z'] < 1.0:
                pend['_cl'] += 1/60; pend['limbo'] = max(pend['limbo'], pend['_cl'])
            else:
                pend['_cl'] = 0.0
            attdir = 1.0 if team_of[pend['pid']] == 0 else -1.0
            pend['adv'] = max(pend['adv'], (p['x'] - pend['x0']) * attdir)
            for m in MARKS:
                # snapshot AT the mark: has ball authority right now, or has
                # already released it with his own action (both = not stuck)
                if dt >= m and m not in pend.setdefault('_snap', set()):
                    pend['_snap'].add(m)
                    pend['auth'][m] = (b['ctrl'] == pend['pid'] and
                                       dist(p['x'], p['y'], b['x'], b['y']) < 1.6)                                       or (pend['action'] is not None and pend['action'] <= m)
                if dt <= m and sp > 1.0: pend['move'][m] = True
            if dt > 5.0:
                eps.append(pend); pend = None
    return eps

def main():
    all_eps = []
    for s in (789335328, 424242, 31337):
        all_eps += run_seed(s)
    n = len(all_eps)
    out = {'n': n}
    for m in MARKS:
        out[f'auth@{m}'] = round(100.0 * sum(e['auth'][m] for e in all_eps) / n)
        out[f'move@{m}'] = round(100.0 * sum(e['move'][m] for e in all_eps) / n)
    acts = sorted(e['action'] for e in all_eps if e['action'] is not None)
    out['action%<=1s'] = round(100.0 * sum(1 for a in acts if a <= 1.0) / n)
    out['action%<=2s'] = round(100.0 * sum(1 for a in acts if a <= 2.0) / n)
    out['action_p50'] = acts[len(acts)//2] if acts else None
    out['one_touch%'] = round(100.0 * sum(1 for a in acts if a <= 0.5) / n)
    out['recv_dribble%'] = round(100.0 * sum(1 for e in all_eps if e['adv'] >= 5.0 and
                                             (e['action'] is None or e['action'] > 1.0)) / n)
    out['wall_pass_n'] = sum(1 for e in all_eps if e['wall'])
    limb = sorted(e['limbo'] for e in all_eps)
    out['limbo_p90'] = limb[int(n*0.9)]
    out['limbo>0.5s%'] = round(100.0 * sum(1 for l in limb if l > 0.5) / n, 1)
    chal = sorted(e['chal'] for e in all_eps if e['chal'] is not None)
    out['challenged%'] = round(100.0 * len(chal) / n)
    out['chal_p50'] = chal[len(chal)//2] if chal else None
    print(json.dumps(out, indent=1))
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     'reception_dist.json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
