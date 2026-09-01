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

# ── PLAYER PHYSICAL OCCUPANCY V1 ─────────────────────────────────────────────
# Every player is a solid 2D disc on the pitch plane (torso/legs footprint,
# NOT the visual sprite: rendering and physical occupancy are separate).
# Measured baseline: the sprite torso reads ~0.43 m wide at the accepted
# visual scale; radius 0.32 m gives a 0.64 m shoulder-to-shoulder centre
# distance (harness-tested against 0.28/0.36). Uniform for GK and outfield
# in V1 — attributes deliberately do NOT enter basic non-penetration.
BODY_R = 0.32              # physical body radius, metres
OCC_SKIN = 0.02            # contact detection band beyond touching
OCC_ITERS = 8              # positional Jacobi iterations (multi-body mop-up)
OCC_TOL = 0.005            # accepted numerical penetration tolerance, metres

def clamp(v, lo, hi): return lo if v < lo else hi if v > hi else v

def chase_point(p, ball):
    """Intercept-lead pursuit: attack the moving ball with a distance-scaled
    lead. Chasing from behind naturally yields low relative velocity at contact
    (running onto the ball); the arrival-braking profile handles the rest."""
    if ball['z'] > 0.05 or ball['vz'] > 0.5:
        return predict_stop(ball)      # aerial ball: run to where it comes down and dies
    d = math.hypot(p['x']-ball['x'], p['y']-ball['y'])
    lead = clamp(d/8.0, 0.15, 0.8)
    return ball['x'] + ball['vx']*lead, ball['y'] + ball['vy']*lead

def predict_stop(ball):
    """Where the ball will come to rest. Rolling: linear friction (SWOS
    BallVariables principle). Airborne/bouncing: horizontal velocity carries
    through hang time and the geometric bounce chain (restitution 0.55)
    before rolling friction bites — chasers wait at the RIGHT spot."""
    sp = math.hypot(ball['vx'], ball['vy'])
    z, vz = ball['z'], ball['vz']
    if sp < 0.2 and z < 0.2: return ball['x'], ball['y']
    sp = max(sp, 0.2)
    hang = 0.0
    if z > 0.05 or vz > 0.5:
        vzi = math.sqrt(max(0.0, vz*vz + 2*G*max(0.0, z)))
        t_land = (vz + vzi) / G
        hang = min(t_land + (2 * 0.55 * vzi / G) / (1 - 0.55), 6.0)
    d = sp*hang + sp*sp/(2*MU_ROLL)
    return ball['x'] + ball['vx']/sp*d, ball['y'] + ball['vy']/sp*d
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
                'touchT': 0.0, 'burst': 0.0, 'stun': 0.0, 'loco': 'IDLE'}
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
        self.challenge_cb = None   # (defender_pid, carrier_pid) -> None; brain routes a
                                   # controlled-ball contest into its duel machinery
        self.score = [0, 0]
        self.trace = []
        self.last_contacts = []
        self.occ = {'pairs': 0, 'simult': 0, 'maxpen': 0.0, 'maxcorr': 0.0,
                    'unresolved': 0, 'blockT': 0.0, 'slideT': 0.0,
                    'ms': 0.0, 'ticks': 0, 'ties': 0, 'stuck': 0}

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
        ax, ay = dvx - p['vx'], dvy - p['vy']; am = math.hypot(ax, ay)
        step = lim*DT
        if am > step: p['vx'] += ax/am*step; p['vy'] += ay/am*step
        else: p['vx'], p['vy'] = dvx, dvy
        # OCCUPANCY V1: locomote PROPOSES velocity (desired movement after
        # accel/brake/turn limits); position is integrated in tick() under
        # body-contact constraints. Tactical targets are never rewritten.
        p['_dvx'], p['_dvy'] = p['vx'], p['vy']
        p['_step'] = True
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

    def update_control(self):
        """PERSISTENT POSSESSION: deterministic control-retention test, zero RNG.

        CONTROL OWNERSHIP (ball['ctrl']) persists across carry touches. This
        evaluates, every tick, whether the carrier still genuinely controls
        the ball, and publishes the diagnostic ball['ctrlState']:
          SECURE   — ball at feet (d <= 0.95 m)
          EXPOSED  — ball ahead/away (0.95 < d <= 4.2 m, the historic carry
                     envelope) or beyond it but actively being recovered
                     (closing at > 0.3 m/s)
          ESCAPING — still owned, but d > 2.6 m and separating (> 0.3 m/s):
                     the warning band before a genuine loss
        EXPLICIT LOSS: d > 4.2 m and not closing -> LOOSE ('escaped control
        envelope'). All other releases are explicit football events (kick,
        failed/heavy/loose touch, deflection, tackle won/poked, take-on
        knock, GK claim, out of play, dead ball).
        Challengeability is separate: opponents reaching the ball route into
        the brain's duel machinery regardless of this state (interact())."""
        b = self.ball
        if b['ctrl'] is None or b['state'] == 'DEAD' or b['held'] is not None:
            b['ctrlState'] = None
            return
        p = self.players[b['ctrl']]
        d = dist(p['x'], p['y'], b['x'], b['y'])
        if d <= 0.95:
            b['ctrlState'] = 'SECURE'
            return
        sep_rate = ((b['x'] - p['x']) * (b['vx'] - p['vx']) +
                    (b['y'] - p['y']) * (b['vy'] - p['vy'])) / max(d, 1e-9)
        if d <= 4.2 or sep_rate < -0.3:
            b['ctrlState'] = 'ESCAPING' if (d > 2.6 and sep_rate > 0.3) else 'EXPOSED'
            return
        b['ctrl'] = None
        b['ctrlState'] = None
        self.ev('LOOSE_BALL', p['pid'], 'escaped control envelope')

    def _gk_contest(self, p, khash, bd=None):
        """In-box goalkeeper claim/parry — explicit release path (GK_CATCH /
        GK_PARRY events), shared by loose balls and exposed controlled balls."""
        b = self.ball
        if bd is None: bd = dist(p['x'], p['y'], b['x'], b['y'])
        rvx, rvy = b['vx'] - p['vx'], b['vy'] - p['vy']
        rv = math.hypot(rvx, rvy)
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

    def interact(self, khash):
        b = self.ball
        if b['state'] == 'DEAD' or b['held'] is not None: return
        if b['ctrl'] is not None:
            # PERSISTENT POSSESSION + CHALLENGE ROUTING: a controlled ball is
            # NEVER silently re-owned by proximity. The old at_feet>0.95 rule
            # executed CONTROLLED(A) -> CONTROLLED(B) with no duel whenever a
            # carry touch strayed past 0.95 m (measured churn: median spell
            # 0.45 s, 16% of spells ended by passive steals). Now:
            #   - an in-box GK reaching an EXPOSED controlled ball keeps the
            #     explicit claim path (GK_CATCH / GK_PARRY events);
            #   - any other opponent reaching the ball is a CHALLENGE
            #     OPPORTUNITY routed to the brain's duel machinery
            #     (challenge_cb -> maybe_challenge: its own cooldown, cal11
            #     probabilities and seeded rng decide the outcome);
            #   - teammates never passively take over a controlled ball
            #     (a pass is kick -> LOOSE -> reception).
            ctrl_p = self.players.get(b['ctrl'])
            exposed = ctrl_p is None or                 dist(ctrl_p['x'], ctrl_p['y'], b['x'], b['y']) > 0.95
            for p in sorted(self.players.values(), key=lambda q: q['pid']):
                if p['pid'] == b['ctrl']: continue
                if b['exclPid'] == p['pid'] and self.t < b['exclT']: continue
                if p['stun'] > self.t and dist(p['x'], p['y'], b['x'], b['y']) > 0.35: continue
                if ctrl_p is not None and p['team'] == ctrl_p['team']: continue
                d = dist(p['x'], p['y'], b['x'], b['y'])
                in_box = p['gk'] and ((p['team'] == 0 and b['x'] < 16.5) or
                                      (p['team'] == 1 and b['x'] > W-16.5)) and abs(b['y']-34) < 20.15
                if in_box and exposed and d < GK_REACH and b['z'] < 2.3:
                    self._gk_contest(p, khash)
                    return
                if d < REACH and b['z'] < 1.4 and self.challenge_cb is not None:
                    self.challenge_cb(p['pid'], b['ctrl'])
                    if b['ctrl'] is None: return    # duel resolved: ball ran free
            return
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
        in_box = p['gk'] and ((p['team'] == 0 and b['x'] < 16.5) or (p['team'] == 1 and b['x'] > W-16.5))
        if in_box:
            self._gk_contest(p, khash, bd)
            return
        rvx, rvy = b['vx'] - p['vx'], b['vy'] - p['vy']
        rv = math.hypot(rvx, rvy)
        prev_team = self.players[b['last']]['team'] if b['last'] is not None else None
        if self.touch_cb is not None:
            res = self.touch_cb(p, rv, b['z'])
            if res is not None:
                kind, ang, ln = res
                if kind == 'CLEAN':
                    a = self._cushion_dir(p)
                    b['vx'] = p['vx']*0.7 + math.cos(a)*1.1
                    b['vy'] = p['vy']*0.7 + math.sin(a)*1.1
                    if 0 < b['z'] < 1.6: b['vz'] = min(b['vz'], 0.4)
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
            b['vx'] = p['vx']*0.7 + math.cos(a)*1.1
            b['vy'] = p['vy']*0.7 + math.sin(a)*1.1
            if 0 < b['z'] < 1.6: b['vz'] = min(b['vz'], 0.4)
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

    def carry_touch(self, p, corridor, knock_scale=1.0):
        """CONTROLLED DRIBBLING V1 — speed + turn responsive touches.

        One continuous deterministic controller (zero RNG) for keyboard AND
        AI carriers. Touches are SOLVED, not generic kicks: each contact
        computes the impulse that places the ball at the contact separation
        s_c ahead of the carrier when the next touch is due, under real
        rolling friction. Speed curves (smooth, no mode thresholds):
          cadence      T(v)  = clamp(0.18 + 0.036 v, 0.18, 0.48) s
          contact sep  s_c(v)= clamp(0.28 + 0.055 v, 0.28, 0.75) m
          knock        u     = v_along + (s_c - s0 + mu T^2/2) / T   (solved)
        Mid-cycle excursion emerges physically: s_c + mu T^2/8 (~0.36 m walk,
        ~0.49 jog, ~0.85 sprint). TURNS: the corridor is the carrier's
        CURRENT movement intent; turn angle vs the ball line smoothly
        shrinks s_c (x1.0 below 30 deg -> x0.3 at 110+ deg) and permits an
        EARLY corrective touch (min spacing 0.10 s, ball in reach) — the
        touch fully redirects the ball, killing obsolete-corridor velocity.
        NEAR-STATIONARY: a settled ball at the feet is left alone (no
        periodic kicking); a stopped ball out of stance range gets a soft
        settle touch back toward the feet. Ball stays fully physical; every
        displacement is a real contact. Ownership/possession semantics
        untouched (update_control / challenge routing decide those).
        """
        b = self.ball
        if b['ctrl'] != p['pid']: return
        d = dist(p['x'], p['y'], b['x'], b['y'])
        p['touchT'] -= DT
        if d > 0.85: return                 # ball not at the feet: no contact
        pv = math.hypot(p['vx'], p['vy'])
        bsp = math.hypot(b['vx'], b['vy'])
        # ── near-stationary control: stand over the ball ──
        if pv < 0.4:
            if bsp < 0.5 and d < 0.55:
                p['touchT'] = 0.0           # primed: first moving touch is instant
                return
            if bsp < 0.5 and self.t - p.get('_lastTouchT', -9.0) >= 0.10:
                ux, uy = (p['x'] - b['x']) / max(d, 1e-9), (p['y'] - b['y']) / max(d, 1e-9)
                u = min(1.6, math.sqrt(2 * MU_ROLL * max(0.05, d - 0.30)))
                b['vx'], b['vy'], b['vz'] = ux * u, uy * u, 0.0
                p['touchT'] = 0.18
                p['_lastTouchT'] = self.t
                self._contact('DRIBBLE_TOUCH', p['pid'], 'settle')
                return
            if bsp >= 0.5:
                pass                        # moving ball at feet: trap via normal touch below
            else:
                return
        a0 = corridor if corridor is not None else p['facing']
        # turn angle: desired corridor vs the ball's current line
        bdir = math.atan2(b['vy'], b['vx']) if bsp > 0.5 else             math.atan2(b['y'] - p['y'], b['x'] - p['x'])
        turn = abs((a0 - bdir + math.pi * 3) % (2 * math.pi) - math.pi)
        spacing = self.t - p.get('_lastTouchT', -9.0)
        corrective = turn > 0.52 and spacing >= 0.10
        if p['touchT'] > 0 and not corrective:
            return
        # smooth turn factor (smoothstep 30 deg..110 deg -> 1.0..0.3)
        tt = clamp((turn - 0.52) / (1.92 - 0.52), 0.0, 1.0)
        tf = 1.0 - 0.7 * tt * tt * (3 - 2 * tt)
        T = clamp(0.18 + 0.036 * pv, 0.18, 0.48)
        s_c = clamp(0.28 + 0.055 * pv, 0.28, 0.75) * tf
        # CLOSE CONTROL: with an opponent near, shorten touches (as before)
        oppd = min((dist(q['x'], q['y'], p['x'], p['y'])
                    for q in self.players.values() if q['team'] != p['team']), default=99.0)
        if oppd < 2.8:
            s_c *= 0.7; T = min(T, 0.28)
        ux, uy = math.cos(a0), math.sin(a0)
        s0 = (b['x'] - p['x']) * ux + (b['y'] - p['y']) * uy
        pv_along = max(0.0, p['vx'] * ux + p['vy'] * uy)
        u = pv_along + (s_c - s0 + 0.5 * MU_ROLL * T * T) / T
        u = clamp(u, 0.5, pv + 3.5)
        if knock_scale > 1.0: u = min(u * knock_scale, pv + 3.5 * knock_scale)
        b['vx'], b['vy'], b['vz'] = ux * u, uy * u, 0.0
        b['state'] = 'ROLLING'
        p['touchT'] = T
        p['_lastTouchT'] = self.t
        p['_lastTouch'] = (round(d, 3), round(u, 2), 'corrective' if corrective else 'normal',
                           round(turn, 3), round(s_c, 3), round(T, 3))
        self._contact('DRIBBLE_TOUCH', p['pid'], 'corrective' if corrective else '')

    def occupancy_step(self):
        """PLAYER PHYSICAL OCCUPANCY V1 — deterministic, RNG-free.

        Runs once per 60 Hz tick, after all locomote() proposals and before
        anything consumes positions. Three phases:

        1. VELOCITY PROJECTION (contact constraints, not elastic collision):
           for every pair predicted to touch this step, each player loses
           only the part of HIS OWN velocity that closes on the other,
           clamped so he arrives exactly at contact (never inside it).
           Tangential velocity is untouched -> sliding, shoulder-to-shoulder
           running and routing around a blocker all emerge naturally; a
           stationary blocker is never shoved (no momentum transfer).
        2. INTEGRATION: players locomoted this tick step by their resolved
           velocity (same world-bounds clamp locomote used).
        3. POSITIONAL MOP-UP (Jacobi, OCC_ITERS): residual overlap from
           multi-body convergence or external position writes is removed
           half/half along each contact normal, corrections accumulated
           then applied simultaneously (no iteration-order bias), then
           re-clamped to world bounds. Exactly-coincident pairs use a
           documented geometric tie-break: split along the perpendicular
           of the outward direction from the pitch centre (team-neutral;
           the pid-sorted lower player takes the negative side); the
           occurrence count is instrumented and reported.

        Contact does NOT touch possession, tackles, fouls or events.
        """
        import time as _time
        t0 = _time.perf_counter()
        ps = sorted(self.players.values(), key=lambda p: p['pid'])
        n = len(ps)
        o = self.occ
        R2 = BODY_R * 2.0

        # phase 1: predictive per-body velocity projection (two-phase apply)
        for a in ps:
            a.setdefault('_dvx', a['vx']); a.setdefault('_dvy', a['vy'])
        resolved = []
        for i in range(n):
            a = ps[i]
            vx, vy = a['vx'], a['vy']
            for j in range(n):
                if j == i: continue
                c = ps[j]
                dx, dy = c['x'] - a['x'], c['y'] - a['y']
                d2 = dx*dx + dy*dy
                if d2 < 1e-12 or d2 > (R2 + OCC_SKIN + 0.30)**2: continue
                d = math.sqrt(d2)
                nx, ny = dx/d, dy/d
                vn = vx*nx + vy*ny                    # own closing speed
                if vn <= 0.0: continue
                allowed = max(0.0, (d - R2) / DT)     # arrive AT contact, not inside
                if vn > allowed:
                    ex = vn - allowed
                    vx -= ex*nx; vy -= ex*ny
            resolved.append((vx, vy))
        for a, (vx, vy) in zip(ps, resolved):
            a['vx'], a['vy'] = vx, vy

        # phase 2: integrate proposals
        for a in ps:
            if a.pop('_step', False):
                a['x'] = clamp(a['x'] + a['vx']*DT, -2, W+2)
                a['y'] = clamp(a['y'] + a['vy']*DT, -2, H+2)

        # phase 3: positional mop-up (Jacobi)
        maxcorr = 0.0
        iters_used = 0
        for it in range(OCC_ITERS):
            iters_used = it + 1
            corr = [[0.0, 0.0] for _ in range(n)]
            worst = 0.0
            for i in range(n):
                a = ps[i]
                for j in range(i+1, n):
                    c = ps[j]
                    dx, dy = c['x'] - a['x'], c['y'] - a['y']
                    d2 = dx*dx + dy*dy
                    if d2 >= R2*R2: continue
                    if d2 < 1e-12:                     # geometric tie-break
                        o['ties'] += 1
                        bx, by = a['x'] - W/2, a['y'] - H/2
                        bm = math.hypot(bx, by)
                        ux, uy = (by/bm, -bx/bm) if bm > 1e-9 else (0.0, 1.0)
                        d, pen = 0.0, R2
                    else:
                        d = math.sqrt(d2)
                        ux, uy = dx/d, dy/d
                        pen = R2 - d
                    worst = max(worst, pen)
                    h = pen * 0.5
                    corr[i][0] -= ux*h; corr[i][1] -= uy*h
                    corr[j][0] += ux*h; corr[j][1] += uy*h
            if worst <= OCC_TOL: break
            for i in range(n):
                cx, cy = corr[i]
                if cx or cy:
                    maxcorr = max(maxcorr, math.hypot(cx, cy))
                    ps[i]['x'] = clamp(ps[i]['x'] + cx, -2, W+2)
                    ps[i]['y'] = clamp(ps[i]['y'] + cy, -2, H+2)

        # contact bookkeeping + per-player state (free/sliding/blocked)
        contacts = []
        residual = 0.0
        for i in range(n):
            a = ps[i]
            for j in range(i+1, n):
                c = ps[j]
                dx, dy = c['x'] - a['x'], c['y'] - a['y']
                d = math.hypot(dx, dy)
                if d < R2 + OCC_SKIN:
                    pen = max(0.0, R2 - d)
                    residual = max(residual, pen)
                    contacts.append((a['pid'], c['pid'], pen))
        for a in ps:
            dvx, dvy = a.get('_dvx', 0.0), a.get('_dvy', 0.0)
            dm = math.hypot(dvx, dvy); am = math.hypot(a['vx'], a['vy'])
            if dm > 0.5 and am < 0.3*dm: a['occ'] = 2                 # blocked
            elif dm > 0.3 and (abs(a['vx']-dvx) > 0.2 or abs(a['vy']-dvy) > 0.2):
                a['occ'] = 1                                          # sliding
            else: a['occ'] = 0
            v = math.hypot(a['vx'], a['vy'])
            a['loco'] = 'IDLE' if v < 0.3 else 'WALK' if v < 2 else \
                        'JOG' if v < 4.5 else 'RUN' if v < 6.8 else 'SPRINT'
        self.last_contacts = contacts
        o['pairs'] += len(contacts)
        o['simult'] = max(o['simult'], len(contacts))
        o['maxpen'] = max(o['maxpen'], residual)
        o['maxcorr'] = max(o['maxcorr'], maxcorr)
        o['unresolved'] += 1 if residual > OCC_TOL else 0
        o['blockT'] += DT * sum(1 for a in ps if a['occ'] == 2)
        o['slideT'] += DT * sum(1 for a in ps if a['occ'] == 1)
        o['ms'] += (_time.perf_counter() - t0) * 1000.0
        o['ticks'] += 1
        # stuck detection: wants to move, achieves almost nothing, for > 2 s
        for a in ps:
            dm = math.hypot(a.get('_dvx', 0.0), a.get('_dvy', 0.0))
            if dm > 1.5 and math.hypot(a['vx'], a['vy']) < 0.15*dm:
                a['_stuck'] = a.get('_stuck', 0.0) + DT
                if a['_stuck'] > 2.0:
                    o['stuck'] += 1; a['_stuck'] = 0.0
            else:
                a['_stuck'] = 0.0

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
        self.occupancy_step()
        self.step_ball()
        self.update_control()
        self.interact(khash)
        self.out_check()
        self.measure_workload()
