"""Continuous football BODY — Python port of the accepted sandbox CFR substrate.

Physics identical in principle to sandbox/cfr.js (OpenSWOS-informed, MIT-attributed
there): fixed 60 Hz tick, metric world 105x68, continuous x/y/z ball with linear
friction + restitution, radius possession with kicker exclusion, touch-ahead
carrying, accel/brake/turn-limited locomotion, dead-ball restart placement only.
Intent-driven: the ONLY command surface is set_intent(). No Math.random — the
brain supplies any execution randomness (cal11 keyed draws)."""
import math

DT = 1/60.0
W, H = 105.0, 68.0
G = 9.81
MU_ROLL, MU_AIR = 4.2, 0.8
REST, KEEP, SETTLE = 0.55, 0.80, 1.0
REACH, GK_REACH, EXCL = 0.9, 1.6, 0.45
ACC, BRAKE = 4.8, 6.5

def clamp(v, lo, hi): return lo if v < lo else hi if v > hi else v

def chase_point(p, ball):
    """Intercept-lead pursuit: attack the moving ball with a distance-scaled
    lead. Chasing from behind naturally yields low relative velocity at contact
    (running onto the ball); the arrival-braking profile handles the rest."""
    if ball['z'] > 0.05 or ball['vz'] > 0.5 or math.hypot(ball['vx'], ball['vy']) > 9.0:
        return intercept_point(p, ball)   # aerial/fast ball: EARLIEST feasible interception
    d = math.hypot(p['x']-ball['x'], p['y']-ball['y'])
    lead = clamp(d/8.0, 0.15, 0.8)
    return ball['x'] + ball['vx']*lead, ball['y'] + ball['vy']*lead

def predict_traj(ball):
    """AUTHORITATIVE future ball trajectory: forward integration of the very
    physics step_ball applies (gravity, restitution 0.55, bounce horizontal
    retention 0.80, air/roll linear friction). Cached per physics tick.
    Returns (samples[(t,x,y,z)...], rest_xy, exit_index_or_None)."""
    key = ball.get('_tick', -1)
    cached = ball.get('_pt')
    if cached is not None and cached[0] == key:
        return cached[1], cached[2], cached[3]
    x, y, z = ball['x'], ball['y'], ball['z']
    vx, vy, vz = ball['vx'], ball['vy'], ball['vz']
    step = DT * 2.0
    t = 0.0
    samples = []
    exit_i = None
    while t < 6.0:
        x += vx*step; y += vy*step; z += vz*step
        if z > 0: vz -= G*step
        if z <= 0:
            if vz < 0:
                r = -vz*0.55
                if r < 1.0: vz = 0.0
                else: vz = r; vx *= 0.80; vy *= 0.80
            z = max(0.0, z)
        sp = math.hypot(vx, vy)
        if sp > 0:
            mu = MU_AIR if z > 0.05 else MU_ROLL
            ns = max(0.0, sp - mu*step)
            vx, vy = vx/sp*ns, vy/sp*ns
        t += step
        if len(samples) == 0 or t - samples[-1][0] >= 0.12:
            samples.append((t, x, y, z))
            if exit_i is None and not (0.0 <= x <= W and 0.0 <= y <= H):
                exit_i = len(samples) - 1
        if sp < 0.15 and z < 0.05:
            break
    rest = (x, y)
    ball['_pt'] = (key, samples, rest, exit_i)
    return samples, rest, exit_i

def predict_stop(ball):
    """Rest point of the authoritative trajectory (boundary-clamped for
    pursuit use: nobody chases an imaginary continuation outside the field)."""
    sp = math.hypot(ball['vx'], ball['vy'])
    if sp < 0.2 and ball['z'] < 0.2: return ball['x'], ball['y']
    samples, rest, exit_i = predict_traj(ball)
    if exit_i is not None and exit_i > 0:
        # pursue only up to where the ball leaves play (the last in-bounds point)
        t0, x0, y0, z0 = samples[exit_i - 1]
        return x0, y0
    elif exit_i == 0:
        return clamp(rest[0], 0.5, W - 0.5), clamp(rest[1], 0.5, H - 0.5)
    return rest

def intercept_point(p, ball, reaction=None):
    """EARLIEST FEASIBLE interception of the authoritative trajectory:
    first future sample the player can reach in time at a controllable
    height, inside the field. ANTICIPATION ASYMMETRY: the called receiver
    expects the ball (short reaction); an unanticipated chaser reads the
    flight later — governed by his Reactions (same physical principle as
    the knock-freeze). Falls back to the boundary-truncated rest point."""
    if reaction is None:
        if ball.get('_exp') == p['pid']:
            reaction = 0.15
        else:
            reaction = 0.45 - 0.25 * p.get('_re01', 0.6)
    samples, rest, exit_i = predict_traj(ball)
    vmax = max(3.0, p.get('vmax', 7.0))
    t_min = ball.get('_age_t', 0.0)
    for i, (t, x, y, z) in enumerate(samples):
        if exit_i is not None and i >= exit_i:
            break
        if z > 1.4:
            continue
        eff_t = max(t, reaction)     # can't act on the flight before you've read it
        if dist(p['x'], p['y'], x, y) / vmax + reaction <= t:
            return x, y
    return predict_stop(ball)
def dist(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)

FAM = {  # launch families (real speeds; lofted solved with real gravity)
    # ground families solved for ARRIVAL speed r at the aimed point: v0 = sqrt(2*mu*D + r^2)
    'SHORT':   lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 6.5**2), 8, 19), 0.0),  # crisp: arrives ~6.5 m/s, technique cushions it
    'DRIVEN':  lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 7.0**2), 14, 26), 0.0),  # firm: arrives ~7 m/s
    'THROUGH': lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 4.0**2), 10, 24), 0.0),  # weighted into space, dies ~2 m past
    'CUTBACK': lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 6.0**2), 9, 18), 0.0),
    'LOFT':    lambda D: (D/clamp(D/16, 0.8, 2.2), G*clamp(D/16, 0.8, 2.2)/2),  # flatter, driven long ball
    'CROSS':   lambda D: (D/clamp(D/15, 0.8, 2.0), G*clamp(D/15, 0.8, 2.0)/2),
    'CLEAR':   lambda D: (D/clamp(D/11, 1.2, 2.6), G*clamp(D/11, 1.2, 2.6)/2*1.15),
    'SHOT':    lambda D: (clamp(24 + D*0.3, 24, 31), clamp(0.5 + D*0.06, 0.5, 2.2)),
    'PUNT':    lambda D: (D/clamp(D/12, 1.6, 2.8), G*clamp(D/12, 1.6, 2.8)/2),
}

class Body:
    def __init__(self, roster):
        # roster: list of dicts {pid, team(0/1), gk(bool), vmax, acc}
        self.t = 0.0; self.tick_n = 0
        self.players = {}
        for r in roster:
            self.players[r['pid']] = {
                'pid': r['pid'], 'team': r['team'], 'gk': r.get('gk', False),
                'x': r.get('x', 52.5), 'y': r.get('y', 34.0), 'vx': 0.0, 'vy': 0.0,
                'facing': 0.0, 'vmax': r.get('vmax', 8.2), 'acc': r.get('acc', ACC),
                'touchT': 0.0, 'burst': 0.0, 'stun': 0.0, 'loco': 'IDLE',
                '_re01': r.get('_re01', 0.6)}
        self.ball = {'x': 52.5, 'y': 34.0, 'z': 0.0, 'vx': 0.0, 'vy': 0.0, 'vz': 0.0,
                     'ctrl': None, 'last': None, 'exclPid': None, 'exclT': 0.0, 'held': None,
                     'state': 'ROLLING', 'estT': 0.0}
        self.intents = {}
        self.events = []           # physical events (wake sources)
        self.contacts = []
        self.placements = []
        self.violations = 0
        self.maxjump = 0.0
        self.restart = None        # None = open play; else dict(kind, spot, team, t, phase)
        self.last_kick_t = -9.0
        self.last_kicker = None
        self.touch_cb = None       # (p, rv, z) -> ('CLEAN'|'HEAVY'|'LOOSE'|'DEFLECT', err_angle, err_len) or None
        self.gk_cb = None          # (gk, ball, rv) -> ('CATCH'|'PARRY'|'BEATEN', deflect_angle) or None
        self.score = [0, 0]
        self.trace = []

    # ── the only command surface ──
    def set_intent(self, pid, intent): self.intents[pid] = intent

    def ev(self, kind, pid=None, note=''):
        self.events.append({'t': round(self.t, 2), 'kind': kind, 'pid': pid, 'note': note})
    def _contact(self, kind, pid, note=''):
        if pid is not None: self.ball['last'] = pid
        self.contacts.append({'t': round(self.t, 2), 'kind': kind, 'pid': pid, 'note': note})
        self.ev('BALL_CONTACT:' + kind, pid, note)

    def place_ball(self, x, y, reason):
        b = self.ball
        self.placements.append({'t': round(self.t, 2), 'reason': reason})
        b['x'], b['y'], b['z'] = x, y, 0.0
        b['vx'] = b['vy'] = b['vz'] = 0.0
        b['ctrl'] = None; b['held'] = None; b['state'] = 'DEAD'

    def kick(self, pid, tx, ty, fam):
        p, b = self.players[pid], self.ball
        D = max(0.5, dist(b['x'], b['y'], tx, ty))
        v0, vz = FAM.get(fam, FAM['SHORT'])(D)
        ux, uy = (tx - b['x'])/D, (ty - b['y'])/D
        b['vx'], b['vy'], b['vz'] = ux*v0, uy*v0, vz
        b['state'] = 'AIRBORNE' if vz > 0.4 else 'ROLLING'
        b['ctrl'] = None; b['held'] = None
        b['exclPid'] = pid; b['exclT'] = self.t + EXCL
        self.last_kick_t = self.t
        self.last_kicker = pid
        self._contact('KICK:' + fam, pid, f'{v0:.1f} m/s')

    def locomote(self, p, tx, ty, speed):
        dvx = dvy = 0.0
        if speed > 0.05:
            d = dist(p['x'], p['y'], tx, ty)
            # physical arrival profile: never approach faster than you can brake
            # (fast players decelerate EARLY, like real footballers timing a run)
            sp = min(speed, 0.4 + 0.92*math.sqrt(2*BRAKE*max(0.0, d)))
            if d > 0.12: dvx, dvy = (tx - p['x'])/d*sp, (ty - p['y'])/d*sp
        cur = math.hypot(p['vx'], p['vy']); des = math.hypot(dvx, dvy)
        lim = p['acc']
        if des < cur - 0.2: lim = BRAKE
        elif cur > 3 and des > 0.1:
            turn = abs((math.atan2(dvy, dvx) - math.atan2(p['vy'], p['vx']) + math.pi*3) % (2*math.pi) - math.pi)
            if turn > 1.15: lim = BRAKE; dvx *= 0.15; dvy *= 0.15
            elif turn > 0.55: lim = p['acc']*0.7
        elif cur > 0.5 and des > 0.1:
            # nobody reverses instantly even at a walk: a near-180 flip is a
            # plant-and-turn, not a same-tick velocity snap (kills the jitter)
            turn = abs((math.atan2(dvy, dvx) - math.atan2(p['vy'], p['vx']) + math.pi*3) % (2*math.pi) - math.pi)
            if turn > 2.0: lim = p['acc']*0.45
        ax, ay = dvx - p['vx'], dvy - p['vy']; am = math.hypot(ax, ay)
        step = lim*DT
        if am > step: p['vx'] += ax/am*step; p['vy'] += ay/am*step
        else: p['vx'], p['vy'] = dvx, dvy
        p['x'] = clamp(p['x'] + p['vx']*DT, -2, W+2)
        p['y'] = clamp(p['y'] + p['vy']*DT, -2, H+2)
        v = math.hypot(p['vx'], p['vy'])
        want = math.atan2(p['vy'], p['vx']) if v > 0.7 else math.atan2(self.ball['y']-p['y'], self.ball['x']-p['x'])
        df = (want - p['facing'] + math.pi*3) % (2*math.pi) - math.pi
        rate = clamp(5.5 - v*0.45, 1.5, 5.5)*DT
        p['facing'] += df if abs(df) <= rate else math.copysign(rate, df)
        p['loco'] = 'IDLE' if v < 0.3 else 'WALK' if v < 2 else 'JOG' if v < 4.5 else 'RUN' if v < 6.8 else 'SPRINT'

    def step_ball(self):
        b = self.ball
        if b['state'] == 'DEAD': return
        if b['held'] is not None:
            gk = self.players[b['held']]
            # a keeper holding the ball never carries it across his own line —
            # whatever moved him (dive, sweep, target), his body plants field-side
            if gk['team'] == 0:
                gk['x'] = max(gk['x'], 0.35)
            else:
                gk['x'] = min(gk['x'], W - 0.35)
            b['x'], b['y'], b['z'] = gk['x'], gk['y'], 0.9
            b['vx'], b['vy'] = gk['vx'], gk['vy']
            return
        pre = math.hypot(b['vx'], b['vy'])
        px, py = b['x'], b['y']
        b['x'] += b['vx']*DT; b['y'] += b['vy']*DT; b['z'] += b['vz']*DT
        if b['z'] > 0: b['vz'] -= G*DT
        if b['z'] <= 0:
            if b['vz'] < 0:
                r = -b['vz']*REST
                if r < SETTLE: b['vz'] = 0.0; b['state'] = 'ROLLING'
                else:
                    b['vz'] = r; b['vx'] *= KEEP; b['vy'] *= KEEP
                    self._contact('BOUNCE', None)
            b['z'] = max(0.0, b['z'])
        else: b['state'] = 'AIRBORNE'
        sp = math.hypot(b['vx'], b['vy'])
        if sp > 0:
            mu = MU_AIR if b['z'] > 0.05 else MU_ROLL
            ns = max(0.0, sp - mu*DT)
            b['vx'] *= ns/sp; b['vy'] *= ns/sp
        d = dist(b['x'], b['y'], px, py)
        allowed = max(pre, sp)*DT + 0.03
        if d > allowed + 0.05: self.violations += 1
        self.maxjump = max(self.maxjump, d)

    def interact(self, khash):
        b = self.ball
        if b['state'] == 'DEAD' or b['held'] is not None: return
        best, bd = None, 1e9
        ctrl_p = self.players.get(b['ctrl']) if b['ctrl'] is not None else None
        at_feet = ctrl_p is not None and dist(ctrl_p['x'], ctrl_p['y'], b['x'], b['y']) < 0.95
        for p in self.players.values():
            if b['exclPid'] == p['pid'] and self.t < b['exclT']: continue
            # wrong-footed/stumbling: no active reach, only a body-block counts
            if p['stun'] > self.t and dist(p['x'], p['y'], b['x'], b['y']) > 0.35: continue
            # a just-released fast ball beats the deliberate stab: until this
            # player's reaction window has passed (Reactions-causal, same
            # asymmetry as chasers/knock-freezes), only a body-block counts.
            # The called receiver is anticipating and exempt.
            if (self.t - self.last_kick_t < 0.10 + 0.24 * (1.0 - p.get('_re01', 0.6))
                    and b.get('_exp') != p['pid']
                    and b['vx']*b['vx'] + b['vy']*b['vy'] > 49.0
                    and dist(p['x'], p['y'], b['x'], b['y']) > 0.35):
                continue
            # a controlled ball at the owner's feet is not passively stealable:
            # dislodging it takes a football action (challenge/poke), not overlap
            if at_feet and p['pid'] != b['ctrl']: continue
            in_box = p['gk'] and ((p['team'] == 0 and b['x'] < 16.5) or (p['team'] == 1 and b['x'] > W-16.5)) and abs(b['y']-34) < 20.15
            reach = GK_REACH if in_box else REACH
            zmax = 2.3 if in_box else 1.4
            d = dist(p['x'], p['y'], b['x'], b['y'])
            if d < reach and b['z'] < zmax and d < bd: best, bd = p, d
        if best is None: return
        p = best
        rvx, rvy = b['vx'] - p['vx'], b['vy'] - p['vy']
        rv = math.hypot(rvx, rvy)
        in_box = p['gk'] and ((p['team'] == 0 and b['x'] < 16.5) or (p['team'] == 1 and b['x'] > W-16.5))
        if in_box:
            if self.gk_cb is not None:
                res = self.gk_cb(p, b, rv)
                if res is not None:
                    kind, ang = res
                    if kind == 'CATCH':
                        b['held'] = p['pid']; b['state'] = 'ROLLING'
                        p['vx'] *= 0.2; p['vy'] *= 0.2      # secured: the keeper plants
                        self._contact('GK_CATCH', p['pid']); self.ev('POSSESSION_CHANGE', p['pid'])
                    elif kind == 'PARRY':
                        spd = rv*0.45
                        b['vx'], b['vy'] = math.cos(ang)*spd, math.sin(ang)*spd
                        b['vz'] = max(b['vz']*0.3, 1.5)
                        b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.4
                        self._contact('GK_PARRY', p['pid']); self.ev('DEFLECTION', p['pid'])
                    # 'BEATEN': ball continues untouched
                    return
            if rv >= 16 and bd > 0.8: return
            if rv < 9:
                b['held'] = p['pid']; b['state'] = 'ROLLING'
                p['vx'] *= 0.2; p['vy'] *= 0.2              # secured: the keeper plants
                self._contact('GK_CATCH', p['pid']); self.ev('POSSESSION_CHANGE', p['pid'])
            else:
                a = math.atan2(p['y']-b['y'], p['x']-b['x']) + math.pi + (khash(int(self.t*100), p['pid'], 7) - 0.5)
                spd = rv*0.45
                b['vx'], b['vy'] = math.cos(a)*spd, math.sin(a)*spd
                b['vz'] = max(b['vz']*0.3, 1.5)
                b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.4
                self._contact('GK_PARRY', p['pid']); self.ev('DEFLECTION', p['pid'])
            return
        if b['ctrl'] == p['pid']: return
        prev_team = self.players[b['ctrl']]['team'] if b['ctrl'] is not None else (self.players[b['last']]['team'] if b['last'] is not None else None)
        if self.touch_cb is not None:
            res = self.touch_cb(p, rv, b['z'])
            if res is not None:
                kind, ang, ln = res
                if kind == 'CLEAN':
                    a = self._cushion_dir(p)
                    b['vx'] = p['vx']*0.25 + math.cos(a)*1.1
                    b['vy'] = p['vy']*0.25 + math.sin(a)*1.1
                    if 0 < b['z'] < 1.6:
                        # a controlled trap absorbs the drop: the ball falls
                        # dead at his feet instead of bouncing off the trap
                        b['vz'] = min(b['vz'] * 0.3 if b['vz'] < 0 else b['vz'], 0.4)
                    b['ctrl'] = p['pid']; b['state'] = 'ROLLING'
                    b['estT'] = self.t + (ln if ln > 0.0 else 0.30)
                    self._contact('CONTROL', p['pid'], f'rv {rv:.1f}')
                    self.ev('RECEPTION', p['pid'])
                    if prev_team is not None and prev_team != p['team']: self.ev('POSSESSION_CHANGE', p['pid'])
                elif kind == 'HEAVY':
                    # heavy first touch: ball squirts ahead but the toucher keeps the advantage
                    b['vx'] = math.cos(ang)*ln + p['vx']*0.5
                    b['vy'] = math.sin(ang)*ln + p['vy']*0.5
                    b['vz'] = min(b['vz'], 0.5); b['ctrl'] = None
                    b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.10
                    self._contact('HEAVY_TOUCH', p['pid'], f'rv {rv:.1f}')
                    self.ev('HEAVY_TOUCH', p['pid'])
                elif kind == 'LOOSE':
                    b['vx'] = math.cos(ang)*ln + p['vx']*0.4
                    b['vy'] = math.sin(ang)*ln + p['vy']*0.4
                    b['vz'] = min(b['vz'], 0.8); b['ctrl'] = None
                    b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.12
                    self._contact('TOUCH_LOOSE', p['pid'], f'rv {rv:.1f}')
                    self.ev('LOOSE_BALL', p['pid'])
                else:  # DEFLECT
                    b['vx'], b['vy'] = math.cos(ang)*ln, math.sin(ang)*ln
                    b['vz'] = max(0.5, b['vz']*0.4)
                    b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.35
                    self._contact('DEFLECT', p['pid'], f'rv {rv:.1f}')
                    self.ev('DEFLECTION', p['pid'])
                return
        if rv < 5.5:
            a = self._cushion_dir(p)
            b['vx'] = p['vx']*0.25 + math.cos(a)*1.1
            b['vy'] = p['vy']*0.25 + math.sin(a)*1.1
            if 0 < b['z'] < 1.6:
                b['vz'] = min(b['vz'] * 0.3 if b['vz'] < 0 else b['vz'], 0.4)
            b['ctrl'] = p['pid']; b['state'] = 'ROLLING'
            b['estT'] = self.t + 0.30
            self._contact('CONTROL', p['pid'], f'rv {rv:.1f}')
            self.ev('RECEPTION', p['pid'])
            if prev_team is not None and prev_team != p['team']: self.ev('POSSESSION_CHANGE', p['pid'])
        elif rv < 12:
            bias = math.atan2(rvy, rvx)
            a = bias + (khash(int(self.t*100), p['pid'], 3) - 0.5)*1.2
            spd = rv*0.35
            b['vx'] = math.cos(a)*spd + p['vx']*0.4
            b['vy'] = math.sin(a)*spd + p['vy']*0.4
            b['vz'] = min(b['vz'], 0.8); b['ctrl'] = None
            b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.12   # brief: first-toucher keeps his advantage
            self._contact('TOUCH_LOOSE', p['pid']); self.ev('LOOSE_BALL', p['pid'])
        else:
            a = math.atan2(b['y']-p['y'], b['x']-p['x'])
            spd = rv*0.5
            b['vx'], b['vy'] = math.cos(a)*spd, math.sin(a)*spd
            b['vz'] = max(0.5, b['vz']*0.4)
            b['exclPid'] = p['pid']; b['exclT'] = self.t + 0.35
            self._contact('DEFLECT', p['pid']); self.ev('DEFLECTION', p['pid'])

    def _cushion_dir(self, p):
        a = p['facing']
        ogx = 0.0 if p['team'] == 0 else W
        d_goal = dist(p['x'], p['y'], ogx, 34.0)
        if d_goal < 14.0:
            gdir = math.atan2(34.0 - p['y'], ogx - p['x'])
            diff = (a - gdir + math.pi*3) % (2*math.pi) - math.pi
            if abs(diff) < 1.1:            # facing (near) own goal: open up wide
                return math.atan2((-1.5 if p['y'] < 34.0 else 1.5) * 4.0,
                                  (2.5 if p['team'] == 0 else -2.5))
        return a

    def carry_touch(self, p, corridor, knock_scale=1.0, max_roll=None):
        b = self.ball
        if b['ctrl'] != p['pid']: return
        d = dist(p['x'], p['y'], b['x'], b['y'])
        p['touchT'] -= DT
        if d > 4.2:
            b['ctrl'] = None; self.ev('LOOSE_BALL', p['pid'], 'ran away'); return
        if d < 0.85 and p['touchT'] <= 0:
            pv = math.hypot(p['vx'], p['vy'])
            a = corridor if corridor is not None else p['facing']
            # CLOSE CONTROL: with an opponent near, real carriers shorten their
            # touches — the ball stays in the protected radius, not in the duel zone
            oppd = min((dist(q['x'], q['y'], p['x'], p['y'])
                        for q in self.players.values() if q['team'] != p['team']), default=99.0)
            knock = (pv + 2.6 if pv > 6 else pv + 1.5 if pv > 3 else max(2.0, pv + 1.0)) * knock_scale
            if max_roll is not None:
                # a carrier braking toward his stop point sizes the touch to
                # arrive WITH the ball — never knocks it past where he'll stand
                knock = min(knock, math.sqrt(2*MU_ROLL*max(max_roll, 0.3)) + 0.2)
            if oppd < 2.8:
                knock = min(knock, pv * 0.85 + 0.8)
                p['touchT'] = 0.28
            else:
                p['touchT'] = 0.5 if pv > 6 else 0.38
            b['vx'], b['vy'], b['vz'] = math.cos(a)*knock, math.sin(a)*knock, 0.0
            b['state'] = 'ROLLING'
            self._contact('DRIBBLE_TOUCH', p['pid'])

    def separate(self):
        ps = sorted(self.players.values(), key=lambda p: p['pid'])
        for i in range(len(ps)):
            for j in range(i+1, len(ps)):
                a, c = ps[i], ps[j]
                dx, dy = c['x']-a['x'], c['y']-a['y']
                d2 = dx*dx + dy*dy
                mind = 0.42*2*1.05
                if 1e-6 < d2 < mind*mind:
                    d = math.sqrt(d2); push = (mind-d)/2
                    ux, uy = dx/d, dy/d
                    a['x'] -= ux*push; a['y'] -= uy*push; c['x'] += ux*push; c['y'] += uy*push

    def out_check(self):
        b = self.ball
        if b['state'] == 'DEAD' or self.restart is not None: return
        last_team = self.players[b['last']]['team'] if b['last'] is not None else 0
        if b['y'] < -0.1 or b['y'] > H + 0.1:
            self.restart = {'kind': 'THROW_IN', 'team': 1-last_team,
                            'spot': (clamp(b['x'], 1, W-1), 0.0 if b['y'] < 0 else H), 't': 0.0}
            b['state'] = 'DEAD'; self.ev('BALL_OUT', None, 'throw-in')
        elif b['x'] < -0.1 or b['x'] > W + 0.1:
            right = b['x'] > W
            in_mouth = abs(b['y']-34) < 3.66 and b['z'] < 2.44
            if in_mouth:
                team = 0 if right else 1
                self.score[team] += 1
                self.restart = {'kind': 'GOAL', 'team': 1-team, 'spot': (52.5, 34.0), 't': 0.0}
                b['state'] = 'DEAD'
                self._contact('GOAL', b['last'], f'{self.score[0]}-{self.score[1]}')
                self.ev('GOAL', b['last'])
            else:
                dteam = 1 if right else 0
                if last_team == dteam:
                    self.restart = {'kind': 'CORNER', 'team': 1-dteam,
                                    'spot': (W-0.3 if right else 0.3, 0.3 if b['y'] < 34 else H-0.3), 't': 0.0}
                else:
                    self.restart = {'kind': 'GOAL_KICK', 'team': dteam,
                                    'spot': (W-5.5 if right else 5.5, 34.0), 't': 0.0}
                b['state'] = 'DEAD'; self.ev('BALL_OUT', None, self.restart['kind'])

    BANDS = ((1.0, 0), (2.5, 1), (4.6, 2), (6.4, 3))   # cal11 activity thresholds

    def measure_workload(self):
        """Accumulate TRUE per-tick displacement into cal11's speed bands.
        The body is authoritative for physical workload telemetry."""
        for p in self.players.values():
            px, py = p.get('_wx'), p.get('_wy')
            tele = p.get('tele')
            if tele is None:
                tele = p['tele'] = [[0.0, 0.0] for _ in range(5)]   # [dist, secs] per band
                p['bursts'] = 0; p['_band'] = 0
            if px is not None:
                step = dist(p['x'], p['y'], px, py)
                v = step / DT
                band = 4
                for thr, bi in Body.BANDS:
                    if v < thr: band = bi; break
                tele[band][0] += step; tele[band][1] += DT
                if band == 4 and p['_band'] < 4:
                    p['bursts'] += 1                      # entered a sprint effort
                p['_band'] = band
            p['_wx'], p['_wy'] = p['x'], p['y']

    def take_telemetry(self):
        out = {}
        for pid, p in self.players.items():
            if p.get('tele') is None: continue
            out[pid] = {'bands': [list(b) for b in p['tele']], 'bursts': p['bursts']}
            p['tele'] = [[0.0, 0.0] for _ in range(5)]
            p['bursts'] = 0
        return out

    def tick(self, khash):
        """One 60 Hz step. Intent execution is driven by the adapter (lab.py)."""
        self.tick_n += 1; self.t += DT
        self.ball['_tick'] = self.tick_n
        self.separate()
        self.step_ball()
        self.interact(khash)
        self.out_check()
        self.measure_workload()
