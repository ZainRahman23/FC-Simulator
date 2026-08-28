"""Brain x Body Integration Laboratory.

cal11 (isolated lab copy engine_lab.py, byte-derived from the frozen production
engine) is the BRAIN: tactics, roles, action choice, attributes, energies,
seeded probability mathematics. The continuous BODY (body.py, the accepted CFR
substrate) executes physically. The adapter below is the ONLY glue:

  brain -> body : issueIntent() vocabulary (movement targets + carrier actions
                  with attribute-derived execution dispersion)
  body -> brain : mirrored positions/ball/controller + wake events

The world NEVER freezes while the brain thinks: the body integrates every tick;
brain targets refresh at cal11's native 1 Hz; carrier decisions occur at
reception + cadence + wake events. Deterministic: keyed hashes and cal11's own
KeyedRNG only.
"""
import json, math, sys, importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT/'simulator'))
import bridge
spec = importlib.util.spec_from_file_location('engine_lab', ROOT/'integration/engine_lab.py')
EL = importlib.util.module_from_spec(spec); spec.loader.exec_module(EL)
from body import Body, DT, W, H, dist, clamp, predict_stop, chase_point, MU_ROLL

def khash(a, b, c):
    h = (1337 ^ 0x9e3779b9)
    def _i(v):
        if isinstance(v, str):
            acc = 0
            for ch in v: acc = (acc*131 + ord(ch)) & 0xffffffff
            return acc
        return int(v)
    for v in (_i(a), _i(b), _i(c)):
        h ^= v & 0xffffffff
        h = (h * 2654435761) & 0xffffffff
        h ^= h >> 13
        h = (h * 2246822519) & 0xffffffff
        h ^= h >> 16
    return h / 4294967296.0

EX = lambda x: x/1.05          # meters -> engine rel x
EY = lambda y: y/0.68
MX = lambda x: x*1.05          # engine -> meters
MY = lambda y: y*0.68

ACT_SPEED = {'standing': 0.0, 'walk': 1.6, 'jog': 4.0, 'high_speed_run': 6.4, 'sprint': 8.2,
             'on_ball': 2.0, 'on_ball_evade': 3.4, 'carry': 5.4, 'dribble_burst': 7.6,
             'dribble_partial': 5.2, 'sent_off': 0.0}

class Lab:
    def __init__(self, start_request_path, seed):
        sr = json.load(open(start_request_path))
        self.eng = EL.MatchEngine(bridge.build_team(sr['home_team'], 'HOME'),
                                  bridge.build_team(sr['away_team'], 'AWAY'),
                                  bridge.ATTRIBUTE_STATS, seed,
                                  bridge.build_config(sr.get('config'), sr.get('coach_ai')))
        roster = []
        self.team_of = {}
        for tid, tnum in (('HOME', 0), ('AWAY', 1)):
            for st in self.eng._team_states(tid):
                a = st.player.attributes
                roster.append({'pid': st.player.player_id, 'team': tnum, 'gk': st.slot == 'GK',
                               'x': MX(st.pos.x), 'y': MY(st.pos.y),
                               'vmax': 6.3 + a.get('sprint_speed', 60)/100*2.6,
                               'acc': 3.6 + a.get('acceleration', 60)/100*1.9})
                self.team_of[st.player.player_id] = tnum
        self.body = Body(roster)
        self.body.ball['x'], self.body.ball['y'] = 52.5, 34.0
        self.body.ball['state'] = 'DEAD'                    # dead until the first restart is taken
        self.gk_of = {0: None, 1: None}
        for pid, p in self.body.players.items():
            if p['gk']: self.gk_of[p['team']] = pid
        self.held_since = None
        self.trace = []
        self.decisions = []
        self.wakes = {'RECEPTION': 0, 'LOOSE_BALL': 0, 'POSSESSION_CHANGE': 0, 'cadence': 0,
                      'DEFLECTION': 0, 'GOAL': 0, 'BALL_OUT': 0, 'HEAVY_TOUCH': 0,
                      'GK_DISTRIBUTION': 0, 'PRESSURE': 0}
        self.next_pressure_ok = 0.0
        self.last_targets = {}
        self.next_target_sync = 0.0
        self.next_cadence = 0.0
        self.ev_cursor = 0
        self.carry_state = {}      # pid -> current carrier plan
        self.restart_timer = 0.0
        self.expected_receiver = None   # (pid, team, valid_until): the called pass

    # ── brain sync: mirrored state + cal11's own movement targets ──
    def sync_targets(self):
        pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in self.body.players.values()}
        self.eng.body_sync(pos, (EX(self.body.ball['x']), EY(self.body.ball['y'])), self.body.ball['ctrl'])
        self.last_targets = self.eng.body_targets()

    def decide(self, pid, why):
        pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in self.body.players.values()}
        self.eng.body_sync(pos, (EX(self.body.ball['x']), EY(self.body.ball['y'])), pid)
        d = self.eng.body_decide(pid)
        d['t'] = round(self.body.t, 2); d['pid'] = pid; d['why'] = why
        self.decisions.append(d)
        self.apply_decision(pid, d)
        return d

    def apply_decision(self, pid, d):
        b, body = self.body.ball, self.body
        p = body.players[pid]
        act = d['action']
        if act == 'PASS' and 'to' in d:
            to = body.players[d['to']]
            lead = clamp(dist(p['x'], p['y'], to['x'], to['y'])/16, 0.2, 1.1)
            tx = to['x'] + to['vx']*lead + d['err'][0]
            ty = to['y'] + to['vy']*lead + d['err'][1]
            fam = {'SHORT': 'SHORT', 'PROGRESSIVE': 'DRIVEN', 'LONG': 'LOFT', 'THROUGH': 'THROUGH',
                   'CROSS': 'CROSS', 'CUTBACK': 'CUTBACK'}.get(d['family'], 'SHORT')
            if fam == 'LOFT' and dist(p['x'], p['y'], tx, ty) < 20: fam = 'DRIVEN'
            self.carry_state[pid] = None
            self.expected_receiver = (d['to'], p['team'], body.t + 4.0)
            body.set_intent(pid, {'kind': 'KICK', 'tx': tx, 'ty': ty, 'fam': fam,
                                  'windup': body.t + 0.28, 'then': {'kind': 'BRAIN'}})
        elif act == 'SHOOT':
            gx = W if p['team'] == 0 else 0.0
            # shooters aim for a corner; execution error disperses around it —
            # a shank can miss the frame, a tight strike beats the keeper's reach
            side = 1 if khash(int(body.t*10), pid, 23) < 0.5 else -1
            gy = 34.0 + side * 2.9 + clamp(d.get('aim_off', 0.0), -8.0, 8.0)
            body.set_intent(pid, {'kind': 'KICK', 'tx': gx + (0.5 if p['team'] == 0 else -0.5), 'ty': gy,
                                  'fam': 'SHOT', 'windup': body.t + 0.32, 'then': {'kind': 'BRAIN'}})
        elif act == 'DRIBBLE':
            side = 1 if khash(int(body.t*10), pid, 21) < 0.5 else -1
            burst = 1.2 + clamp((d.get('acceleration', 55) - d.get('def_agility', 55))/40.0, -0.5, 0.8)
            knock = 0.9 + d.get('dribbling', 55)/150.0
            body.set_intent(pid, {'kind': 'TAKE_ON', 'side': side, 'burstT': body.t + burst,
                                  'knock': knock, 'knocked': False, 'def': d.get('def_pid')})
        elif act == 'CARRY':
            ct = d.get('carry_target')
            tx, ty = (MX(ct[0]), MY(ct[1])) if ct else (p['x'] + (10 if p['team'] == 0 else -10), p['y'])
            body.set_intent(pid, {'kind': 'CARRY', 'tx': tx, 'ty': ty})
        elif act == 'CLEAR':
            tx = p['x'] + (30 if p['team'] == 0 else -30)
            ty = clamp(p['y'] + (khash(int(body.t*10), pid, 22) - 0.5)*30, 4, 64)
            body.set_intent(pid, {'kind': 'KICK', 'tx': tx, 'ty': ty, 'fam': 'CLEAR',
                                  'windup': body.t + 0.25, 'then': {'kind': 'BRAIN'}})
        else:  # SHIELD or unknown: hold position with the ball
            body.set_intent(pid, {'kind': 'CARRY', 'tx': p['x'], 'ty': p['y']})

    # ── per-tick intent execution (movement + carrier actions) ──
    def act(self):
        body, b = self.body, self.body.ball
        ctrl = b['ctrl']
        # loose-ball pursuit is BODY-side football: cal11 resolves recoveries as
        # events, so the adapter assigns the nearest player per team to chase;
        # cal11 then decides at the physical RECOVERY (reception wake).
        chasers = set()
        if ctrl is None and b['held'] is None and body.restart is None and b['state'] != 'DEAD':
            # a freshly KICKED ball is a pass in flight, not a loose ball: nobody
            # converts to interceptor instantly — human reaction to the release.
            # EXCEPT the called receiver: he expects the ball and attacks it.
            fresh_kick = body.t < body.last_kick_t + 0.30
            exp = self.expected_receiver
            if exp is not None and body.t > exp[2]:
                self.expected_receiver = exp = None
            for team in (0, 1):
                if exp is not None and exp[1] == team:
                    chasers.add(exp[0])
                    continue
                cand = min((p for p in body.players.values() if p['team'] == team and not p['gk']
                            and p['pid'] != body.last_kicker
                            and not (body.intents.get(p['pid']) or {}).get('knocked')),
                           key=lambda p: dist(p['x'], p['y'], b['x'], b['y']))
                if not fresh_kick:
                    chasers.add(cand['pid'])
        direct = getattr(self, '_direct', ())
        for pid, p in body.players.items():
            if pid in direct: continue      # hybrid layer drives this body itself
            it = body.intents.get(pid)
            # carrier executing an explicit action (a knocked take-on stays the
            # knocker's action while the ball runs free — he is racing his touch)
            if it and it.get('kind') in ('KICK', 'TAKE_ON', 'CARRY') and \
               (ctrl == pid or (it.get('kind') == 'TAKE_ON' and it.get('knocked'))):
                if it['kind'] == 'KICK':
                    body.locomote(p, b['x'], b['y'], 1.8)
                    if body.t >= it['windup'] and dist(p['x'], p['y'], b['x'], b['y']) < 1.0:
                        body.kick(pid, it['tx'], it['ty'], it['fam'])
                        body.intents[pid] = None
                elif it['kind'] == 'TAKE_ON':
                    base = 0.0 if p['team'] == 0 else math.pi
                    corr = base + it['side']*0.55
                    if not it['knocked']:
                        dfp = body.players.get(it.get('def'))
                        gap = dist(p['x'], p['y'], dfp['x'], dfp['y']) if dfp is not None else 0.0
                        drawn = body.t - it.setdefault('t0', body.t)
                        pv0 = math.hypot(p['vx'], p['vy'])
                        # cut when at speed (his backpedal momentum is the beat),
                        # when he dives the cushion, or when the draw has run long
                        ready = pv0 > 4.0 or drawn > 1.2 or gap < 1.35
                        if dfp is not None and not ready and drawn < 3.0:
                            # DRAW: attack the defender with the ball at speed —
                            # the beat comes from HIS momentum, not raw distance
                            corr_d = math.atan2(dfp['y'] - p['y'], dfp['x'] - p['x'])
                            body.locomote(p, dfp['x'], dfp['y'], p['vmax'] * 0.85)
                            body.carry_touch(p, corr_d)
                            if b['ctrl'] not in (None, pid):
                                body.intents[pid] = None
                            continue
                        if dfp is not None:
                            # CUT: knock past the flank into SPACE (arrival-speed-
                            # solved) — deep enough that the duel becomes a footrace
                            # beyond his stab zone, not a melee at his feet
                            ahead = 3.5 if p['team'] == 0 else -3.5
                            px_, py_ = dfp['x'] + ahead, dfp['y'] + it['side'] * 2.6
                            D = max(1.0, dist(b['x'], b['y'], px_, py_))
                            kn = math.sqrt(2*MU_ROLL*D + 3.0**2) * clamp(it['knock'], 0.85, 1.25)
                            corr = math.atan2(py_ - b['y'], px_ - b['x'])
                        else:
                            pv = math.hypot(p['vx'], p['vy'])
                            kn = (pv + 4.2) * it['knock']
                        b['vx'], b['vy'], b['vz'] = math.cos(corr)*kn, math.sin(corr)*kn, 0.0
                        # the knock IS a touch: the ball runs free and both bodies race it
                        b['ctrl'] = None
                        b['exclPid'] = pid; b['exclT'] = body.t + 0.15
                        body._contact('TAKEON_KNOCK', pid)
                        it['knocked'] = True
                        p['burst'] = it['burstT'] + drawn
                    sp = p['vmax'] + (1.8 if p['burst'] > body.t else 0.0)
                    tx, ty = chase_point(p, b)
                    body.locomote(p, tx, ty, sp)
                    if b['ctrl'] == pid or b['ctrl'] not in (None, pid) or \
                       dist(p['x'], p['y'], b['x'], b['y']) > 7.0:
                        body.intents[pid] = None
                elif it['kind'] == 'CARRY':
                    corr = math.atan2(it['ty'] - p['y'], it['tx'] - p['x'])
                    body.locomote(p, b['x'] + math.cos(corr)*2, b['y'] + math.sin(corr)*2, p['vmax']*0.875)
                    body.carry_touch(p, corr)
                continue
            # everyone else: cal11 structural target at believable pace
            tgt = self.last_targets.get(pid)
            if pid in chasers:
                tx, ty = chase_point(p, b)
                body.locomote(p, tx, ty, p['vmax'] if p['stun'] <= body.t else 1.2)
                continue
            if tgt is not None:
                tx, ty = MX(tgt[0]), MY(tgt[1])
                sp = ACT_SPEED.get(tgt[2], 4.0)
                if ctrl is None and tgt[2] in ('sprint', 'high_speed_run') and dist(p['x'], p['y'], b['x'], b['y']) < 12:
                    tx, ty = chase_point(p, b)
                if p['stun'] > body.t: sp = min(sp, 1.2)
                body.locomote(p, tx, ty, max(sp, 0.0))
            else:
                body.locomote(p, p['x'], p['y'], 0.0)

    def handle_restart(self):
        body = self.body
        r = body.restart
        if r is None: return False
        r['t'] += DT
        kind = r['kind']
        if kind == 'GOAL':
            if r['t'] < 2.5:
                for p in body.players.values(): body.locomote(p, p['x'], p['y'], 0.0)
                return True
            body.restart = {'kind': 'KICKOFF', 'team': r['team'], 'spot': (52.5, 34.0), 't': 0.0}
            return True
        # generic: brain provides restart shape via targets; taker approaches spot
        self.sync_targets()
        sx, sy = r['spot']
        if kind == 'GOAL_KICK':
            taker = body.players[self.gk_of[r['team']]]     # goal kicks are the keeper's
        else:
            taker = min((p for p in body.players.values() if p['team'] == r['team'] and not p['gk']),
                        key=lambda p: dist(p['x'], p['y'], sx, sy))
        ready = 0
        for pid, p in body.players.items():
            if p is taker:
                body.locomote(p, sx, sy, 5.0)
                continue
            tgt = self.last_targets.get(pid)
            tx, ty = (MX(tgt[0]), MY(tgt[1])) if tgt else (p['x'], p['y'])
            if kind == 'KICKOFF':
                # legal kickoff: own half
                if p['team'] == 0: tx = min(tx, 51.0)
                else: tx = max(tx, 54.0)
            body.locomote(p, tx, ty, 5.2)
            if dist(p['x'], p['y'], tx, ty) < 2.2: ready += 1
        if (ready >= 18 and r['t'] > 1.2) or r['t'] > 12:
            if body.ball['state'] != 'DEAD' or dist(body.ball['x'], body.ball['y'], sx, sy) > 0.5:
                body.place_ball(sx, sy, kind)
            if dist(taker['x'], taker['y'], sx, sy) < 1.2 and r['t'] > 1.6:
                body.ball['state'] = 'ROLLING'
                fam = {'KICKOFF': 'SHORT', 'THROW_IN': 'SHORT', 'CORNER': 'CROSS',
                       'GOAL_KICK': 'PUNT', 'FREE_KICK': 'DRIVEN'}[kind]
                mates = [p for p in body.players.values() if p['team'] == r['team'] and p is not taker and not p['gk']]
                mate = min(mates, key=lambda m: dist(m['x'], m['y'], taker['x'], taker['y']) + (0 if kind != 'CORNER' else abs(m['x'] - (W-8 if r['team'] == 0 else 8))*2))
                if kind == 'CORNER': tx, ty = (W-8 if r['team'] == 0 else 8), 32.0
                elif kind == 'GOAL_KICK': tx, ty = taker['x'] + (42 if r['team'] == 0 else -42), clamp(taker['y'] + (khash(int(body.t), 1, 2)-0.5)*26, 6, 62)
                else: tx, ty = mate['x'], mate['y']
                body.kick(taker['pid'], tx, ty, fam)
                body.restart = None
        return True

    def run(self, seconds, trace_every=6):
        body = self.body
        end_t = body.t + seconds
        while body.t < end_t:
            # wake-event scan (body -> brain)
            while self.ev_cursor < len(body.events):
                e = body.events[self.ev_cursor]; self.ev_cursor += 1
                k = e['kind']
                if k == 'RECEPTION' and body.ball['ctrl'] is not None:
                    self.expected_receiver = None
                    self.wakes['RECEPTION'] += 1
                    self.decide(body.ball['ctrl'], 'RECEPTION')
                    self.next_cadence = body.t + 2.5
                elif k in ('LOOSE_BALL', 'POSSESSION_CHANGE', 'DEFLECTION', 'GOAL', 'BALL_OUT',
                           'HEAVY_TOUCH'):
                    kk = k if k in self.wakes else 'LOOSE_BALL'
                    self.wakes[kk] += 1
                    self.next_target_sync = body.t          # structural refresh now
            if body.restart is not None:
                self.handle_restart()
                body.tick(khash)
                self._trace(trace_every)
                continue
            if body.t >= self.next_target_sync:
                self.sync_targets()
                self.next_target_sync = body.t + 1.0        # cal11 native 1 Hz cadence
            if body.ball['ctrl'] is not None and body.t >= self.next_cadence:
                self.wakes['cadence'] += 1
                self.decide(body.ball['ctrl'], 'cadence')
                self.next_cadence = body.t + 2.5
            elif body.ball['ctrl'] is not None and body.t >= self.next_pressure_ok:
                # PRESSURE wake: a closing opponent forces an early decision —
                # real carriers release BEFORE the tackle, on cal11's own logic
                cpl = body.players[body.ball['ctrl']]
                od = min((dist(q['x'], q['y'], cpl['x'], cpl['y'])
                          for q in body.players.values() if q['team'] != cpl['team']), default=99.0)
                if od < 2.2:
                    self.wakes['PRESSURE'] += 1
                    self.decide(body.ball['ctrl'], 'PRESSURE')
                    self.next_cadence = body.t + 2.5
                    self.next_pressure_ok = body.t + 0.8
            if body.ball['held'] is not None:
                if self.held_since is None: self.held_since = body.t
                elif body.t - self.held_since > 2.0:
                    gk = body.ball['held']
                    body.ball['held'] = None
                    body.ball['ctrl'] = gk
                    gkp = body.players[gk]
                    body.ball['x'], body.ball['y'], body.ball['z'] = gkp['x'] + 0.6, gkp['y'], 0.0
                    self.held_since = None
                    self.wakes['GK_DISTRIBUTION'] += 1
                    self.decide(gk, 'GK_DISTRIBUTION')      # cal11 chooses the distribution
            else:
                self.held_since = None
            self.act()
            body.tick(khash)
            self._trace(trace_every)

    def _trace(self, every):
        if self.body.tick_n % every: return
        b = self.body.ball
        self.trace.append({'t': round(self.body.t, 2),
                           'b': [round(b['x'], 2), round(b['y'], 2), round(b['z'], 2), b['state'], b['ctrl']],
                           'p': [[p['pid'], round(p['x'], 1), round(p['y'], 1), p['loco']]
                                 for p in self.body.players.values()],
                           'score': list(self.body.score),
                           'restart': self.body.restart['kind'] if self.body.restart else None})
