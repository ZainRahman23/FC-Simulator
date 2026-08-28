"""Visual-gate follow-up assertions: ball-out pursuit abort + exact circle occupancy."""
import json, math, sys, collections
sys.path.insert(0, '.')
from hybrid import HybridLab, CAL12
import body as Wd
from body import dist, W, H
from passcal import SR, park_all, put

R = {}
def rep(name, detail, ok):
    R[name] = {'detail': detail, 'ok': ok}
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")

def fresh():
    L = HybridLab(SR, 789335328, cad=dict(CAL12))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    while L.body.t < 20.0: L.run(1/60)
    return L

def ballout_case(tag, setup):
    """setup(L) places ball + pursuers; ball must exit. Measures from the
    authoritative BALL_OUT tick to release: non-thrower excursions, outside
    targets, dead-ball pursuit commands; classifies intentional vs momentum."""
    L = fresh(); body, b = L.body, L.body.ball
    park_all(L); setup(L)
    body.restart = None
    if hasattr(L, '_claim'): L._claim.clear()
    CMD = {}
    orig = Wd.Body.locomote
    def spy(self, p, tx, ty, speed):
        CMD[p['pid']] = (tx, ty, speed)
        return orig(self, p, tx, ty, speed)
    Wd.Body.locomote = spy
    t0 = body.t; out_t = None; taker = None
    speed_at_out = {}
    exc = collections.defaultdict(float); t_out = collections.Counter()
    tgt_out = 0; pursue_dead = 0
    while body.t < t0 + 18.0:
        CMD.clear(); L.run(1/60)
        r = body.restart
        if r is not None and out_t is None:
            out_t = body.t
            CMD.clear()   # commands captured this run predate the whistle
            speed_at_out = {pid: math.hypot(p['vx'], p['vy']) for pid, p in body.players.items()}
        if r is not None:
            taker = r.get('taker', taker)
            for pid, p in body.players.items():
                if pid == taker: continue
                d_out = max(0-p['x'], p['x']-W, 0-p['y'], p['y']-H, 0.0)
                if d_out > 0.05:
                    exc[pid] = max(exc[pid], d_out); t_out[pid] += 1
                c = CMD.get(pid)
                if c and (c[0] < -0.3 or c[0] > W+0.3 or c[1] < -0.3 or c[1] > H+0.3):
                    tgt_out += 1
                if c and c[2] > 3.0 and dist(c[0], c[1], b['x'], b['y']) < 1.0 and b['state'] == 'DEAD':
                    pursue_dead += 1
        if r is None and out_t is not None: break
    Wd.Body.locomote = orig
    # classify: intentional needs an outside target; else momentum
    worst = max(exc.values(), default=0.0)
    worst_pid = max(exc, key=exc.get) if exc else None
    brake = (speed_at_out.get(worst_pid, 0)**2) / (2*6.0) if worst_pid else 0
    cls = 'INTENTIONAL' if tgt_out else ('MOMENTUM' if worst > 0 else 'NONE')
    ok = tgt_out == 0 and pursue_dead == 0 and worst < max(1.0, brake + 0.3)
    rep(tag, f'outside-targets {tgt_out}, dead-ball pursuit cmds {pursue_dead}, worst non-thrower exc {worst:.2f}m '
             f'({cls}; v@out {speed_at_out.get(worst_pid,0):.1f}, brake-dist {brake:.1f}m), time-out {max(t_out.values(), default=0)/60:.2f}s', ok)

def sprint_out(L):
    put(L, 'bre_gen_cm', 57, 14, vx=0.5, vy=-7.5)
    b = L.body.ball
    b['x'], b['y'], b['z'] = 57.5, 10.0, 0.0
    b['vx'], b['vy'], b['vz'] = 0.5, -13.0, 0.0
    b['ctrl'] = None; b['last'] = 'bre_gen_st'; b['state'] = 'ROLLING'

def two_pursuers(L):
    put(L, 'bre_gen_cm', 57, 14, vx=0.5, vy=-7.5)
    put(L, 'bre_gen_rcm', 53, 13, vx=1.5, vy=-7.0)
    b = L.body.ball
    b['x'], b['y'], b['z'] = 56.5, 9.0, 0.0
    b['vx'], b['vy'], b['vz'] = 0.5, -12.5, 0.0
    b['ctrl'] = None; b['last'] = 'bre_gen_st'; b['state'] = 'ROLLING'

def deflect_out(L):
    put(L, 'bre_gen_cm', 60, 8, vx=-1.0, vy=-6.5)
    b = L.body.ball
    b['x'], b['y'], b['z'] = 59, 6.0, 0.3
    b['vx'], b['vy'], b['vz'] = -2.0, -11.0, 1.0
    b['ctrl'] = None; b['last'] = 'bre_gen_st'; b['state'] = 'ROLLING'

def heavy_out(L):
    put(L, 'mohamedsalah', 50, 62, vx=1.0, vy=6.5)
    put(L, 'bre_gen_lb', 53, 60, vx=1.0, vy=6.8)
    b = L.body.ball
    b['x'], b['y'], b['z'] = 52, 63.5, 0.0
    b['vx'], b['vy'], b['vz'] = 1.0, 11.5, 0.0
    b['ctrl'] = None; b['last'] = 'mohamedsalah'; b['state'] = 'ROLLING'

ballout_case('B1 opponent sprints after out-ball', sprint_out)
ballout_case('B2 two opponents pursuing', two_pursuers)
ballout_case('B3 out after deflection arc', deflect_out)
ballout_case('B4 out after heavy touch (top line)', heavy_out)

# ── exact centre-circle occupancy at READY ──
def circle_case(kick_team, tag, opening=False):
    if opening:
        L = HybridLab(SR, 789335328, cad=dict(CAL12))
        L.body.restart = {'kind': 'KICKOFF', 'team': kick_team, 'spot': (52.5, 34.0), 't': 0.0}
    else:
        L = fresh()
        L.body.restart = {'kind': 'GOAL', 'team': kick_team, 'spot': (52.5, 34.0), 't': 0.0}
        L.body.ball['state'] = 'DEAD'; L.body.ball['ctrl'] = None
    body = L.body
    t0 = body.t; res = None
    while body.restart is not None and body.t < t0 + 30.0:
        L.run(1/60)
        r = body.restart
        if r and r.get('kind') == 'KICKOFF' and r.get('phase') == 'READY' and res is None:
            kin = [pid for pid, p in body.players.items()
                   if p['team'] == kick_team and dist(p['x'], p['y'], 52.5, 34.0) < 9.15]
            din = [pid for pid, p in body.players.items()
                   if p['team'] != kick_team and dist(p['x'], p['y'], 52.5, 34.0) < 9.15]
            halves = sum(1 for p in body.players.values()
                         if (p['team'] == 0 and p['x'] > 53.2) or (p['team'] == 1 and p['x'] < 51.8))
            kk, sup = r['kicker'], next((q for q, ro in r['roles'].items() if ro == 'SUPPORT'), None)
            res = (kin, din, halves, kk, sup)
    kin, din, halves, kk, sup = res if res else ([], ['no-ready'], 9, None, None)
    ok = (len(kin) == 2 and kk in kin and (sup in kin) and len(din) == 0 and halves == 0
          and body.restart is None)
    rep(tag, f'kicking-in-circle {len(kin)} {sorted(kin)}, defending-in {len(din)}, half-violations {halves}', ok)

circle_case(0, 'C1 opening home kickoff: exactly 2 in circle', opening=True)
circle_case(1, 'C2 opening away kickoff: exactly 2 in circle', opening=True)
circle_case(0, 'C3 home kickoff after conceding')
circle_case(1, 'C4 away kickoff after conceding')

print(json.dumps({k: v['ok'] for k, v in R.items()}))
json.dump(R, open('restart_gate2_results.json', 'w'), indent=1)
