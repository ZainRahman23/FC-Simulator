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
    d = math.hypot(p['x']-ball['x'], p['y']-ball['y'])
    lead = clamp(d/8.0, 0.15, 0.8)
    return ball['x'] + ball['vx']*lead, ball['y'] + ball['vy']*lead

def predict_stop(ball):
    """Where a rolling ball will stop under linear friction (SWOS BallVariables
    principle: chase the predicted point, not the moving ball)."""
    sp = math.hypot(ball['vx'], ball['vy'])
    if sp < 0.2: return ball['x'], ball['y']
    d = sp*sp/(2*MU_ROLL)
    return ball['x'] + ball['vx']/sp*d, ball['y'] + ball['vy']/sp*d
def dist(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)

FAM = {  # launch families (real speeds; lofted solved with real gravity)
    # ground families solved for ARRIVAL speed r at the aimed point: v0 = sqrt(2*mu*D + r^2)
    'SHORT':   lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 3.0**2), 8, 19), 0.0),   # arrives ~3 m/s (clean control)
    'DRIVEN':  lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 7.0**2), 14, 26), 0.0),  # firm: arrives ~7 m/s
    'THROUGH': lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 4.0**2), 10, 24), 0.0),  # weighted into space, dies ~2 m past
    'CUTBACK': lambda D: (clamp(math.sqrt(2*MU_ROLL*D + 4.5**2), 9, 18), 0.0),
    'LOFT':    lambda D: (D/clamp(D/13, 0.9, 2.6), G*clamp(D/13, 0.9, 2.6)/2),
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
                'touchT': 0.0, 'burst': 0.0, 'stun': 0.0, 'loco': 'IDLE'}
        self.ball = {'x': 52.5, 'y': 34.0, 'z': 0.0, 'vx': 0.0, 'vy': 0.0, 'vz': 0.0,
                     'ctrl': None, 'last': None, 'exclPid': None, 'exclT': 0.0, 'held': None,
                     'state': 'ROLLING'}
        self.intents = {}
        self.events = []           # physical events (wake sources)
        self.contacts = []
        self.placements = []
        self.violations = 0
        self.maxjump = 0.0
        self.restart = None        # None = open play; else dict(kind, spot, team, t, phase)
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
        for p in self.players.values():
            if b['exclPid'] == p['pid'] and self.t < b['exclT']: continue
            # wrong-footed/stumbling: no active reach, only a body-block counts
            if p['stun'] > self.t and dist(p['x'], p['y'], b['x'], b['y']) > 0.35: continue
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
                    a = p['facing']
                    b['vx'] = p['vx']*0.7 + math.cos(a)*1.1
                    b['vy'] = p['vy']*0.7 + math.sin(a)*1.1
                    if 0 < b['z'] < 1.6: b['vz'] = min(b['vz'], 0.4)
                    b['ctrl'] = p['pid']; b['state'] = 'ROLLING'
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
            a = p['facing']
            b['vx'] = p['vx']*0.7 + math.cos(a)*1.1
            b['vy'] = p['vy']*0.7 + math.sin(a)*1.1
            if 0 < b['z'] < 1.6: b['vz'] = min(b['vz'], 0.4)
            b['ctrl'] = p['pid']; b['state'] = 'ROLLING'
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

    def carry_touch(self, p, corridor, knock_scale=1.0):
        b = self.ball
        if b['ctrl'] != p['pid']: return
        d = dist(p['x'], p['y'], b['x'], b['y'])
        p['touchT'] -= DT
        if d > 4.2:
            b['ctrl'] = None; self.ev('LOOSE_BALL', p['pid'], 'ran away'); return
        if d < 0.85 and p['touchT'] <= 0:
            pv = math.hypot(p['vx'], p['vy'])
            a = corridor if corridor is not None else p['facing']
            knock = (pv + 2.6 if pv > 6 else pv + 1.5 if pv > 3 else max(2.0, pv + 1.0)) * knock_scale
            b['vx'], b['vy'], b['vz'] = math.cos(a)*knock, math.sin(a)*knock, 0.0
            b['state'] = 'ROLLING'
            p['touchT'] = 0.5 if pv > 6 else 0.38
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

    def tick(self, khash):
        """One 60 Hz step. Intent execution is driven by the adapter (lab.py)."""
        self.tick_n += 1; self.t += DT
        self.separate()
        self.step_ball()
        self.interact(khash)
        self.out_check()
