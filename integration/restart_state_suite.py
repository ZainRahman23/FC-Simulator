"""Mandated restart/match-state deterministic suite (throw-ins + kickoffs)."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
from body import dist, W, H
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def fresh():
    L = HybridLab(SR, 789335328, cad=dict(CAL12))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    while L.body.t < 20.0: L.run(1/60)   # settle into open play
    return L

def force_throw(L, sx, sy, team):
    body, b = L.body, L.body.ball
    body.restart = {'kind': 'THROW_IN', 'team': team, 'spot': (sx, sy), 't': 0.0}
    b['ctrl'] = None; b['held'] = None
    b['x'], b['y'], b['z'] = sx, sy, 0.0
    b['vx'] = b['vy'] = b['vz'] = 0.0; b['state'] = 'DEAD'

def run_throw(L, sx, sy, team, tag):
    body, b = L.body, L.body.ball
    force_throw(L, sx, sy, team)
    worst_non, taker_out_pk = 0.0, 0.0
    taker = None; executed_at = None
    t0 = body.t
    while body.restart is not None and body.t < t0 + 16.0:
        L.run(1/60)
        r = body.restart
        tk = r.get('taker') if r else taker
        if tk: taker = tk
        # measure BEFORE the loop condition can break: the taker's deepest
        # excursion is at the release tick itself
        for pid, p in body.players.items():
            d_out = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
            if pid == taker: taker_out_pk = max(taker_out_pk, d_out)
            elif body.t > t0 + 2.5: worst_non = max(worst_non, d_out)
        if r is None: break
    executed_at = body.t - t0
    # 5s of open play: ordinary football resumes (decision, contact, or travel)
    k0 = len(body.contacts); d0 = len(L.decisions)
    bx0, by0 = b['x'], b['y']
    tr = body.t
    while body.t < tr + 5.0: L.run(1/60)
    resumed = (len(L.decisions) > d0 or len(body.contacts) > k0
               or dist(bx0, by0, b['x'], b['y']) > 3.0)
    tk_p = body.players.get(taker) if taker else None
    ok = (taker is not None and taker_out_pk > 0.15         # thrower legally outside
          and worst_non < 0.6                                # others inside (post-settle)
          and executed_at < 15.5 and resumed)
    rep(tag, f'thrower out {taker_out_pk:.2f}m, worst non {worst_non:.2f}m, exec {executed_at:.1f}s, resumed {resumed}', ok)

# ── throw-in scenarios: four touchline cases + zones ──
for tag, sx, sy, team in (('T1 home throw y=0 line', 30, 0.0, 0),
                          ('T2 home throw y=68 line', 70, 68.0, 0),
                          ('T3 away throw y=0 line', 62, 0.0, 1),
                          ('T4 away throw y=68 line', 40, 68.0, 1),
                          ('T5 throw near own goal', 8, 0.0, 0),
                          ('T6 throw near halfway', 52, 68.0, 1),
                          ('T7 attacking-third throw', 92, 0.0, 0)):
    run_throw(fresh(), sx, sy, team, tag)

# T8: ball exits WHILE multiple players pursue at sprint
L = fresh()
body, b = L.body, L.body.ball
b['x'], b['y'], b['z'] = 60, 3.0, 0.0
b['vx'], b['vy'], b['vz'] = 3.0, -8.0, 0.0
b['ctrl'] = None; b['last'] = 'curtisjones'; b['state'] = 'ROLLING'
t0 = body.t; beyond = 0.0
while body.restart is None and body.t < t0 + 3.0: L.run(1/60)
whistle_t = body.t
t1 = body.t
at5 = None
while body.restart is not None and body.t < t1 + 16.0:
    L.run(1/60)
    r = body.restart
    tk = r.get('taker') if r else None
    if at5 is None and body.t > t1 + 5.0:
        at5 = max(max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                  for pid, p in body.players.items() if pid != tk)
rep('T8 exit during pursuit', f'whistle {whistle_t-t0:.2f}s, worst non-taker out at +5s {at5 if at5 is not None else 0:.2f}m, cleared {body.restart is None}',
    body.restart is None and (at5 is None or at5 < 0.3))

# ── kickoff scenarios ──
def kickoff_legality(L, r):
    body = L.body
    bad_half = bad_circle = 0
    for pid, p in body.players.items():
        if p['team'] == 0 and p['x'] > 53.6: bad_half += 1
        if p['team'] == 1 and p['x'] < 51.4: bad_half += 1
        if p['team'] != r['team'] and dist(p['x'], p['y'], 52.5, 34.0) < 9.0: bad_circle += 1
    return bad_half, bad_circle

# K1 opening kickoff uses same machinery
L = HybridLab(SR, 789335328, cad=dict(CAL12))
body = L.body
body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
seen_ready = False; bh = bc = 99
while body.restart is not None and body.t < 20.0:
    L.run(1/60)
    r = body.restart
    if r and r.get('phase') == 'READY' and not seen_ready:
        seen_ready = True; bh, bc = kickoff_legality(L, r)
rep('K1 opening kickoff (same machinery)', f'READY reached {seen_ready}, half-violations {bh}, circle-violations {bc}, executed {body.restart is None}',
    seen_ready and bh == 0 and bc == 0 and body.restart is None)

# K2/K3: goal scored with players scattered -> physical return, near-straight paths
def goal_return(team_scored_against, tag):
    L = fresh()
    body, b = L.body, L.body.ball
    body.restart = {'kind': 'GOAL', 'team': team_scored_against, 'spot': (52.5, 34.0), 't': 0.0}
    b['state'] = 'DEAD'; b['ctrl'] = None
    start = {pid: (p['x'], p['y']) for pid, p in body.players.items()}
    path = collections.defaultdict(float)
    prev = dict(start)
    slots = None; seen_ready = False; bh = bc = 99
    t0 = body.t; tele = 0.0
    while body.restart is not None and body.t < t0 + 25.0:
        L.run(1/60)
        for pid, p in body.players.items():
            step = dist(p['x'], p['y'], *prev[pid])
            tele = max(tele, step)
            path[pid] += step
            prev[pid] = (p['x'], p['y'])
        r = body.restart
        if r and r.get('kind') == 'KICKOFF' and slots is None and 'slots' in r:
            slots = dict(r['slots'])
        if r and r.get('phase') == 'READY' and not seen_ready:
            seen_ready = True; bh, bc = kickoff_legality(L, r)
    ratios = []
    for pid in body.players:
        sl = slots.get(pid) if slots else None
        if sl is None: continue
        straight = dist(start[pid][0], start[pid][1], sl[0], sl[1])
        if straight > 3.0:
            ratios.append(path[pid] / straight)
    ratios.sort()
    p90 = ratios[int(len(ratios)*0.9)] if ratios else 9
    ok = seen_ready and bh == 0 and bc == 0 and body.restart is None and tele < 0.35 and p90 < 1.35
    rep(tag, f'ready {seen_ready}, half/circle {bh}/{bc}, path/straight p50 {ratios[len(ratios)//2]:.2f} p90 {p90:.2f}, max-step {tele:.2f}m, kicked {body.restart is None}', ok)

goal_return(1, 'K2 home concedes -> away kickoff return')
goal_return(0, 'K3 away concedes -> home kickoff return')

# K4: early arrivals hold without twitching + first 5s open play after kick
L = fresh()
body, b = L.body, L.body.ball
body.restart = {'kind': 'GOAL', 'team': 1, 'spot': (52.5, 34.0), 't': 0.0}
b['state'] = 'DEAD'; b['ctrl'] = None
flips = collections.Counter(); vprev = {}
kick_t = None
t0 = body.t
while body.t < t0 + 30.0:
    L.run(1/60)
    r = body.restart
    if r is not None and r.get('phase') == 'READY':
        for pid, p in body.players.items():
            v = (p['vx'], p['vy']); pv = vprev.get(pid)
            sp = math.hypot(*v)
            if pv and sp > 0.5 and math.hypot(*pv) > 0.5 and v[0]*pv[0]+v[1]*pv[1] < 0:
                flips[pid] += 1
            vprev[pid] = v
    if r is None and kick_t is None: kick_t = body.t
    if kick_t and body.t > kick_t + 5.0: break
n_dec = len([d for d in L.decisions if kick_t and d['t'] >= kick_t])
mv = [math.hypot(p['vx'], p['vy']) for p in body.players.values()]
rep('K4 hold-at-slot + resume 5s', f'READY twitch flips {sum(flips.values())}, decisions in 5s {n_dec}, moving now {sum(1 for v in mv if v>0.5)}',
    sum(flips.values()) <= 4 and n_dec >= 1)

# K5: repeated goals -> no stale state accumulation
L = fresh()
body, b = L.body, L.body.ball
okk = True
for i in range(3):
    body.restart = {'kind': 'GOAL', 'team': i % 2, 'spot': (52.5, 34.0), 't': 0.0}
    b['state'] = 'DEAD'; b['ctrl'] = None
    t0 = body.t
    while body.restart is not None and body.t < t0 + 25.0: L.run(1/60)
    if body.restart is not None: okk = False
    t1 = body.t
    while body.t < t1 + 4.0: L.run(1/60)
rep('K5 repeated kickoffs no stale state', f'3 cycles clean {okk}', okk)

print(json.dumps({k: v['ok'] for k, v in R.items()}))
json.dump(R, open('restart_state_results.json', 'w'), indent=1)
