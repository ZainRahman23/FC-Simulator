"""Long/loose-ball pursuit forensic — measurement only, provably passive.

Wraps chase_point + kick with pure spies over a deterministic replay of
battery seed 789335328 (production modules). Ground truth = forward
integration of the authoritative ball physics (exact copy of step_ball's
ball-only math). Passivity proven by final trace-hash identity.
"""
import prod_parity_env as P
import json, math, hashlib, collections
from fc_simulator import continuous as C
from fc_simulator import world as Wd
from fc_simulator.worldflags import CAD_PROFILE
W, H, G, DT = Wd.W, Wd.H, Wd.G, Wd.DT
MU_ROLL, MU_AIR = Wd.MU_ROLL, Wd.MU_AIR
REST, KEEP, SETTLE = 0.55, 0.80, 1.0

def simulate_ball(b0, horizon=8.0):
    """Authoritative future trajectory (ball-only physics, no players)."""
    x, y, z = b0['x'], b0['y'], b0['z']
    vx, vy, vz = b0['vx'], b0['vy'], b0['vz']
    path = []
    t = 0.0
    exit_t = None
    while t < horizon:
        x += vx*DT; y += vy*DT; z += vz*DT
        if z > 0: vz -= G*DT
        if z <= 0:
            if vz < 0:
                r = -vz*REST
                if r < SETTLE: vz = 0.0
                else: vz = r; vx *= KEEP; vy *= KEEP
            z = max(0.0, z)
        sp = math.hypot(vx, vy)
        if sp > 0:
            mu = MU_AIR if z > 0.05 else MU_ROLL
            ns = max(0.0, sp - mu*DT)
            vx, vy = vx/sp*ns, vy/sp*ns
        t += DT
        if int(t/DT) % 6 == 0: path.append((round(t,2), round(x,2), round(y,2), round(z,2)))
        if exit_t is None and not (0 <= x <= W and 0 <= y <= H):
            exit_t = t
        if sp < 0.15 and z < 0.05: break
    return {'rest': (round(x,2), round(y,2)), 'rest_t': round(t,2), 'exit_t': exit_t, 'path': path}

LOG = {'chase': [], 'kicks': [], 'outside': [], 'claims': []}
eng = P._engine('../simulator/validation/rforensic/mw08_start.json', 789335328)
L = C.HybridLab(eng, cad=dict(CAD_PROFILE))
L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
body, b = L.body, L.body.ball
team_of = {p['pid']: p['team'] for p in body.players.values()}

orig_cp = C.chase_point
def cp_spy(p, ball):
    tx, ty = orig_cp(p, ball)
    if body.tick_n % 6 == 0 and ball is b and (ball['z'] > 0.05 or math.hypot(ball['vx'], ball['vy']) > 3.0):
        sim = simulate_ball(ball, 8.0)
        LOG['chase'].append({'t': round(body.t, 2), 'pid': p['pid'],
            'px': round(p['x'],1), 'py': round(p['y'],1),
            'bx': round(ball['x'],1), 'by': round(ball['y'],1), 'bz': round(ball['z'],2),
            'bsp': round(math.hypot(ball['vx'], ball['vy']),1),
            'tgt': (round(tx,1), round(ty,1)),
            'tgt_in': bool(0 <= tx <= W and 0 <= ty <= H),
            'true_rest': sim['rest'], 'true_rest_t': sim['rest_t'], 'exit_t': sim['exit_t'],
            'tgt_err': round(math.hypot(tx - sim['rest'][0], ty - sim['rest'][1]), 1)})
    return tx, ty
C.chase_point = cp_spy

orig_kick = body.kick
def kick_spy(pid, tx, ty, fam):
    orig_kick(pid, tx, ty, fam)
    if fam in ('LOFT', 'PUNT', 'CROSS', 'CLEAR'):
        sim = simulate_ball(b, 9.0)
        LOG['kicks'].append({'t': round(body.t,2), 'pid': pid, 'fam': fam,
            'aim': (round(tx,1), round(ty,1)),
            'aim_in': bool(-0.5 <= tx <= W+0.5 and -0.5 <= ty <= H+0.5),
            'rest': sim['rest'], 'exits': sim['exit_t'] is not None})
body.kick = kick_spy

loose_since = None
while body.t < 5400.0:
    L.run(1/60)
    if body.tick_n % 30: continue
    # players materially outside the pitch
    for p in body.players.values():
        if p['x'] < -0.7 or p['x'] > W+0.7 or p['y'] < -0.7 or p['y'] > H+0.7:
            LOG['outside'].append({'t': round(body.t,1), 'pid': p['pid'],
                                   'x': round(p['x'],1), 'y': round(p['y'],1)})
    # loose-ball claimant audit
    if b['ctrl'] is None and b['held'] is None and body.restart is None and \
       b['z'] < 0.4 and math.hypot(b['vx'], b['vy']) < 4.0:
        if loose_since is None: loose_since = body.t
        elif body.t - loose_since > 0.6:
            roles = getattr(L, '_roles', {})
            etas = []
            for p in body.players.values():
                if p['gk']: continue
                etas.append((Wd.dist(p['x'],p['y'],b['x'],b['y'])/max(3.0,p['vmax']) , p))
            etas.sort(key=lambda e: e[0])
            best = etas[0][1]
            opp_eta = next((e for e, p in etas if p['team'] != best['team']), 9)
            tgt = L.last_targets.get(best['pid'])
            heading_to_ball = tgt is None  # chasers are direct-driven; targeted => not chasing
            if etas[0][0] + 0.4 < opp_eta:
                LOG['claims'].append({'t': round(body.t,1), 'pid': best['pid'],
                    'role': roles.get(best['pid']), 'eta': round(etas[0][0],1),
                    'opp_eta': round(opp_eta,1),
                    'd': round(Wd.dist(best['x'],best['y'],b['x'],b['y']),1),
                    'chasing': heading_to_ball})
            loose_since = None
    else:
        loose_since = None

h = hashlib.sha256(json.dumps(L.trace).encode()).hexdigest()[:16]
print('PASSIVITY: trace hash', h, '== db6dd6d1346417b8:', h == 'db6dd6d1346417b8')
json.dump(LOG, open('pursuit_forensic.json', 'w'))
ch = LOG['chase']
print('chase samples (aerial/fast):', len(ch))
errs = sorted(c['tgt_err'] for c in ch)
print('pursuit-target error vs TRUE rest: p50/p75/p90/max:',
      [errs[int(len(errs)*q)] for q in (0.5, 0.75, 0.9)] + [errs[-1]] if errs else '-')
print('targets outside pitch:', sum(1 for c in ch if not c['tgt_in']), '/', len(ch))
print('chases where ball will EXIT before rest:', sum(1 for c in ch if c['exit_t'] is not None))
print('long kicks:', len(LOG['kicks']), '| aimed outside pitch:',
      sum(1 for k in LOG['kicks'] if not k['aim_in']),
      '| ball exits play:', sum(1 for k in LOG['kicks'] if k['exits']))
print('player-outside-pitch samples:', len(LOG['outside']),
      'worst:', max(LOG['outside'], key=lambda o: max(abs(o['x']-52.5)-52.5, abs(o['y']-34)-34)) if LOG['outside'] else '-')
print('unclaimed-though-fastest loose balls (defender not chasing):',
      sum(1 for c in LOG['claims'] if not c['chasing']), '/', len(LOG['claims']))
roles_of_unclaimed = collections.Counter(c['role'] for c in LOG['claims'] if not c['chasing'])
print('roles of non-chasing best claimants:', dict(roles_of_unclaimed))
