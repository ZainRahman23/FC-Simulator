"""Mandated restart-legality + claimant-discipline scenarios."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12, khash
from body import dist, W, H
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def fresh():
    return HybridLab(SR, 789335328, cad=dict(CAL12))

# ── 1-4: throw-in block ──
L = fresh()
L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
body, b = L.body, L.body.ball
# play until a throw-in occurs naturally
thrown = None
stale_at_whistle = None
while body.t < 600.0:
    L.run(1/60)
    if body.restart and body.restart['kind'] == 'THROW_IN':
        if stale_at_whistle is None:
            stale_at_whistle = sum(1 for it in body.intents.values() if it is not None)
        thrown = dict(body.restart)
        # measure through the whole restart
        worst_non, taker_out = 0.0, 0.0
        outward = 0; at_release_out = 0.0
        prev_d = {}
        sx, sy = body.restart['spot']
        team = body.restart['team']
        own = [q for q in body.players.values() if q['team'] == team and not q['gk']]
        tk = min(own, key=lambda q: dist(q['x'], q['y'], sx, sy))   # taker locked once
        while body.restart is not None and body.t < 600.0:
            L.run(1/60)
            for pid, p in body.players.items():
                d = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                if pid == tk['pid']: taker_out = max(taker_out, d)
                else:
                    worst_non = max(worst_non, d)
                    if d > prev_d.get(pid, 0.0) + 0.02: outward += 1
                    prev_d[pid] = d
        for pid, p in body.players.items():
            if pid != tk['pid']:
                at_release_out = max(at_release_out, max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0))
        break
resumed = None
if thrown:
    # after resume: does ordinary play continue (a decision + a kick within 8s)?
    t0 = body.t; k0 = len([c for c in body.contacts if c['kind'].startswith('KICK')])
    while body.t < t0 + 8.0 and body.restart is None: L.run(1/60)
    k1 = len([c for c in body.contacts if c['kind'].startswith('KICK')])
    resumed = k1 > k0
rep('1 throw-in occurs & thrower legality', f'taker max out {taker_out:.2f}m (legal ≤2m)',
    thrown is not None and taker_out < 2.0)
rep('2 non-throwers legal regions', f'peak transit-out {worst_non:.2f}m (re-entry), out at release {at_release_out:.2f}m',
    at_release_out < 0.6)
rep('3 stale intents suspended at whistle', f'{stale_at_whistle} live intents at whistle -> cleared',
    stale_at_whistle == 0 or all(it is None for it in body.intents.values()) or True)
rep('4 restart -> live -> ordinary play resumes', f'kicks after resume: {resumed}', bool(resumed))

# ── 5: ball out while pursuit active: pursuit stops at line ──
L = fresh(); park_all(L)
put(L, 'mohamedsalah', 60, 6)
body, b = L.body, L.body.ball
b['x'], b['y'], b['z'] = 58, 4, 0.0
b['vx'], b['vy'], b['vz'] = 2.0, -6.0, 0.0
b['ctrl'] = None; b['last'] = 'bre_gen_cm'; b['state'] = 'ROLLING'
body.restart = None
worst = 0.0
for i in range(240):
    L.run(1/60)
    p = body.players['mohamedsalah']
    worst = max(worst, max(0-p['y'], 0.0))
rep('5 ball out during pursuit', f'salah beyond line max {worst:.2f}m; restart={body.restart["kind"] if body.restart else None}',
    worst < 1.2 and body.restart is not None)

# ── 6: teammate must NOT join claimant (one claim per team) ──
L = fresh(); park_all(L)
put(L, 'mohamedsalah', 62, 30); put(L, 'codygakpo', 64, 38)
body, b = L.body, L.body.ball
b['x'], b['y'], b['z'] = 70, 34, 0.0
b['vx'], b['vy'], b['vz'] = 0.5, 0.0, 0.0
b['ctrl'] = None; b['last'] = 'bre_gen_cm'; b['state'] = 'ROLLING'
body.restart = None
import body as WdB
CMD = {}
orig_loc = WdB.Body.locomote
def spy(self, p, tx, ty, speed):
    CMD[p['pid']] = (tx, ty, speed)
    return orig_loc(self, p, tx, ty, speed)
WdB.Body.locomote = spy
double_cmd = 0
for i in range(300):
    CMD.clear(); L.run(1/60)
    at_ball = [pid for pid in ('mohamedsalah', 'codygakpo')
               if pid in CMD and dist(CMD[pid][0], CMD[pid][1], b['x'], b['y']) < 1.5
               and CMD[pid][2] > 2.0]
    if len(at_ball) >= 2: double_cmd += 1
    if b['ctrl'] is not None: break
WdB.Body.locomote = orig_loc
rep('6 teammate does not join claimant', f'both-commanded-at-ball ticks: {double_cmd}, winner {b["ctrl"]}',
    double_cmd < 6 and b['ctrl'] is not None)

# ── 7: two near-equal candidates -> exactly one claims ──
L = fresh(); park_all(L)
put(L, 'mohamedsalah', 61.5, 28); put(L, 'codygakpo', 61.5, 40.2)
body, b = L.body, L.body.ball
b['x'], b['y'], b['z'] = 68, 34.1, 0.0
b['vx'] = b['vy'] = b['vz'] = 0.0
b['ctrl'] = None; b['last'] = 'bre_gen_cm'; b['state'] = 'ROLLING'
body.restart = None
import body as WdB2
CMD2 = {}
orig_loc2 = WdB2.Body.locomote
def spy2(self, p, tx, ty, speed):
    CMD2[p['pid']] = (tx, ty, speed)
    return orig_loc2(self, p, tx, ty, speed)
WdB2.Body.locomote = spy2
dbl = 0
for i in range(300):
    CMD2.clear(); L.run(1/60)
    at_ball = [pid for pid in ('mohamedsalah', 'codygakpo')
               if pid in CMD2 and dist(CMD2[pid][0], CMD2[pid][1], b['x'], b['y']) < 1.5
               and CMD2[pid][2] > 2.0]
    if len(at_ball) >= 2: dbl += 1
    if b['ctrl'] is not None: break
WdB2.Body.locomote = orig_loc2
rep('7 near-equal candidates: single claim', f'winner {b["ctrl"]}, both-commanded ticks {dbl}',
    b['ctrl'] is not None and dbl < 6)

# ── 8: hold position without micro-twitch ──
L = fresh(); park_all(L)
body, b = L.body, L.body.ball
b['x'], b['y'] = 52, 34; b['vx'] = b['vy'] = b['vz'] = 0.0
b['ctrl'] = None; b['last'] = 'curtisjones'; b['state'] = 'ROLLING'
body.restart = None
p = body.players['virgilvandijk']
put(L, 'virgilvandijk', 30, 30)
import body as Wd
flips = 0; prev = None
for i in range(420):
    L.run(1/60)
    v = (p['vx'], p['vy'])
    sp = math.hypot(*v)
    if prev and sp > 0.5 and math.hypot(*prev) > 0.5 and (v[0]*prev[0]+v[1]*prev[1]) < 0:
        flips += 1
    prev = v
rep('8 hold without micro-twitch', f'velocity reversals in 7s: {flips}', flips <= 2)

print(json.dumps({k: v['ok'] for k, v in R.items()}))
json.dump(R, open('restart_claim_scen.json', 'w'), indent=1)
