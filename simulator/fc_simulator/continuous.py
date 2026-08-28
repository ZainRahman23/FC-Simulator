"""Hybrid-C + cal12 continuous football adapter (production port).\n\nByte-derived from the ACCEPTED candidate (integration/lab.py ce6a0ac104795fcb +\nintegration/hybrid.py 68048902576ad619). Only wiring changed: package imports,\nengine passed in by the caller, explosive-load helpers from .fatigue.\nNo behavioral constants or logic altered. Flags-OFF never imports this module.\n"""
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
import json, math
from .world import Body, DT, W, H, dist, clamp, predict_stop, chase_point, MU_ROLL
from .fatigue import effective_attribute as _eff_attr, add_explosive_load as _add_load

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
    def __init__(self, engine):
        self.eng = engine
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
        self._clock_anchor = 0.0   # engine clock follows world seconds
        self._bx_last = {}         # BX.P authorization rate-limit per team
        self.offside_pending = None
        self.CAD = {'MODE': 'A'}   # cal12 cadence flags (HybridLab may override)
        self._pending_dec = None   # (pid, due_t) scheduled settle-and-scan decision
        self._last_dec = {}        # pid -> (t, pressure) of his last decision
        self._od_at_dec = {}
        self.restart_timer = 0.0
        self.expected_receiver = None   # (pid, team, valid_until): the called pass

    # ── brain sync: mirrored state + cal11's own movement targets ──
    def sync_targets(self):
        pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in self.body.players.values()}
        self.eng.body_sync(pos, (EX(self.body.ball['x']), EY(self.body.ball['y'])), self.body.ball['ctrl'])
        # engine clock follows WORLD seconds (wake-driven refreshes don't age it);
        # measured body workload is applied through the accepted fatigue model
        adv = self.body.t - self._clock_anchor >= 1.0
        if adv:
            self._clock_anchor += 1.0
            self.eng.body_fatigue(self.body.take_telemetry())
            # fatigue -> PHYSICAL speed (native invariant restored): body pace
            # follows the accepted effective-attribute curves as energy drains
            for pid2, st2 in self.eng.states.items():
                p2 = self.body.players.get(pid2)
                if p2 is None or not st2.active:
                    continue
                sp_eff = _eff_attr(st2.player, st2, 'sprint_speed')
                ac_eff = _eff_attr(st2.player, st2, 'acceleration')
                p2['vmax'] = 6.3 + sp_eff / 100.0 * 2.6
                p2['acc'] = 3.6 + ac_eff / 100.0 * 1.9
        self.last_targets = self.eng.body_targets(advance_clock=adv)

    def decide(self, pid, why):
        pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in self.body.players.values()}
        self.eng.body_sync(pos, (EX(self.body.ball['x']), EY(self.body.ball['y'])), pid)
        d = self.eng.body_decide(pid)
        pl = self.body.players[pid]
        self._last_dec[pid] = (self.body.t, d.get('pressure', 0.0))
        self._od_at_dec[pid] = min((dist(q['x'], q['y'], pl['x'], pl['y'])
                                    for q in self.body.players.values()
                                    if q['team'] != pl['team']), default=99.0)
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
            # nobody carries the ball INTO his own goal mouth: near your own goal,
            # a goalward carry corridor is clamped field-side (protective touch)
            if p['team'] == 0:
                ogd = dist(p['x'], p['y'], 0.0, 34.0)
                if ogd < 14.0: tx = max(tx, p['x'] + 2.0, 9.0)
            else:
                ogd = dist(p['x'], p['y'], W, 34.0)
                if ogd < 14.0: tx = min(tx, p['x'] - 2.0, W - 9.0)
            body.set_intent(pid, {'kind': 'CARRY', 'tx': tx, 'ty': ty})
        elif act == 'CLEAR':
            # real clearances go long and WIDE — conceding a throw-in is the
            # safe outcome; the ball may legitimately cross the touchline
            tx = p['x'] + (30 if p['team'] == 0 else -30)
            wide = 69.5 if p['y'] >= 34 else -1.5
            ty = clamp(p['y'] + (khash(int(body.t*10), pid, 22) - 0.5)*30 + (wide - p['y'])*0.25, -1.5, 69.5)
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
            excl = getattr(self, '_chase_exclude', ())
            for team in (0, 1):
                if exp is not None and exp[1] == team:
                    chasers.add(exp[0])
                    continue
                cands = [p for p in body.players.values() if p['team'] == team and not p['gk']
                         and p['pid'] != body.last_kicker
                         and not (body.intents.get(p['pid']) or {}).get('knocked')]
                # HOLD-role defenders keep shape: they only collect balls at their feet
                free = [p for p in cands if p['pid'] not in excl
                        or dist(p['x'], p['y'], b['x'], b['y']) < 6.0] or cands
                cand = min(free, key=lambda p: dist(p['x'], p['y'], b['x'], b['y']))
                if not fresh_kick:
                    chasers.add(cand['pid'])
            chasers |= getattr(self, '_extra_chasers', set())
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
                        self._judge_offside(pid)
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

    def _judge_offside(self, kicker):
        """Offside judged from PHYSICAL positions at the moment of the kick;
        the flag is armed and the whistle comes at the receiver's first touch."""
        exp = self.expected_receiver
        body = self.body
        if exp is None or exp[1] != body.players[kicker]['team']:
            self.offside_pending = None
            return
        rpid = exp[0]
        r = body.players[rpid]
        team = r['team']
        opps_x = sorted((q['x'] for q in body.players.values() if q['team'] != team),
                        reverse=(team == 0))
        second_last = opps_x[1] if len(opps_x) > 1 else opps_x[0]
        bx = body.ball['x']
        if team == 0:
            off = r['x'] > max(second_last, bx) + 0.2 and r['x'] > 52.5
        else:
            off = r['x'] < min(second_last, bx) - 0.2 and r['x'] < 52.5
        self.offside_pending = (rpid, (r['x'], r['y'])) if off else None

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
        if kind == 'PENALTY':
            sx, sy = r['spot']
            taker = min((p for p in body.players.values() if p['team'] == r['team'] and not p['gk']),
                        key=lambda p: dist(p['x'], p['y'], sx, sy))
            gk = body.players[self.gk_of[1 - r['team']]]
            glx = W - 0.6 if r['team'] == 0 else 0.6
            body.locomote(gk, glx, 34.0, 6.0)
            for pid, p in body.players.items():
                if p is taker or p is gk: continue
                tx = min(p['x'], sx - 10.0) if r['team'] == 0 else max(p['x'], sx + 10.0)
                body.locomote(p, tx, p['y'], 4.0)
            body.locomote(taker, sx - (1.2 if r['team'] == 0 else -1.2), sy, 6.5)
            if r['t'] > 2.2 and dist(taker['x'], taker['y'], sx, sy) < 2.5:
                if body.ball['state'] != 'DEAD' or dist(body.ball['x'], body.ball['y'], sx, sy) > 0.5:
                    body.place_ball(sx, sy, 'PENALTY')
                body.ball['state'] = 'ROLLING'
                gx2 = W + 0.5 if r['team'] == 0 else -0.5
                side = 1 if khash(int(body.t*10), taker['pid'], 29) < 0.5 else -1
                body.kick(taker['pid'], gx2, 34.0 + side * 2.6, 'SHOT')
                body.restart = None
            return True
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
                if k in ('RECEPTION', 'BALL_CONTACT:CONTROL', 'HEAVY_TOUCH') and \
                   self.offside_pending is not None and e.get('pid') == self.offside_pending[0]:
                    rpid, spot = self.offside_pending
                    self.offside_pending = None
                    dteam = 1 - body.players[rpid]['team']
                    body.restart = {'kind': 'FREE_KICK', 'team': dteam, 'spot': spot, 't': 0.0}
                    b0 = body.ball
                    b0['ctrl'] = None; b0['held'] = None
                    b0['vx'] = b0['vy'] = b0['vz'] = 0.0; b0['state'] = 'DEAD'
                    body.ev('OFFSIDE', rpid)
                    if hasattr(self, 'match_events'):
                        self.match_events.append({'t': round(body.t, 2), 'kind': 'OFFSIDE', 'pid': rpid})
                    continue
                if k == 'RECEPTION' and body.ball['ctrl'] is not None:
                    self.expected_receiver = None
                    self.wakes['RECEPTION'] += 1
                    mode = self.CAD['MODE']
                    rpid0 = body.ball['ctrl']
                    if mode in ('C', 'D'):
                        # SETTLE-AND-SCAN: a real receiver takes his touch and
                        # looks up before choosing — unless pressure demands
                        # one-touch football (opponent already on him)
                        rp0 = body.players[rpid0]
                        od0 = min((dist(q['x'], q['y'], rp0['x'], rp0['y'])
                                   for q in body.players.values() if q['team'] != rp0['team']),
                                  default=99.0)
                        if od0 < self.CAD.get('ONE_TOUCH_OD', 2.6):
                            self.decide(rpid0, 'RECEPTION')
                            self.next_cadence = body.t + self.CAD['FALLBACK_BASE']
                        else:
                            comp01 = 0.6
                            try:
                                comp01 = min(1.0, self.eng.states[rpid0].player.attributes.get('composure', 60.0) / 100.0)
                            except Exception:
                                pass
                            scan = max(0.15, self.CAD['SCAN_MAX'] - 0.5 * comp01)
                            due = max(body.t, body.ball.get('estT', body.t)) + scan
                            self._pending_dec = (rpid0, due)
                            self.next_cadence = due + self.CAD['FALLBACK_BASE']
                            # while scanning, the receiver SETTLES: ball kept at
                            # his feet with small protective touches (no drift)
                            body.set_intent(rpid0, {'kind': 'CARRY', 'tx': rp0['x'],
                                                    'ty': rp0['y']})
                    else:
                        self.decide(rpid0, 'RECEPTION')
                        self.next_cadence = body.t + (0.5 if mode == 'B' else 2.5)
                    # a physical penetration reception authorizes cal11's BX.P
                    # box-attack runs (execution-side machinery reconnected at
                    # the corresponding physical event; ai_intents drive targets)
                    if body.ball['ctrl'] is not None:
                        rp = body.players[body.ball['ctrl']]
                        relx = EX(rp['x']) if rp['team'] == 0 else 100.0 - EX(rp['x'])
                        if relx > 74.0 and body.t >= self._bx_last.get(rp['team'], -9.0) + 3.0:
                            self._bx_last[rp['team']] = body.t
                            pos = {p['pid']: (EX(p['x']), EY(p['y'])) for p in body.players.values()}
                            self.eng.body_sync(pos, (EX(body.ball['x']), EY(body.ball['y'])), body.ball['ctrl'])
                            tid = 'HOME' if rp['team'] == 0 else 'AWAY'
                            try:
                                self.eng._bx_box_runs(tid, self.eng.states[body.ball['ctrl']])
                            except Exception:
                                pass
                            self.next_target_sync = body.t
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
            mode = self.CAD['MODE']
            ctrl_now = body.ball['ctrl']
            if self._pending_dec is not None:
                ppid, due = self._pending_dec
                if body.ball['ctrl'] != ppid:
                    self._pending_dec = None          # invalidated: ball moved on
                elif body.t >= due:
                    self._pending_dec = None
                    self.wakes['SETTLED'] = self.wakes.get('SETTLED', 0) + 1
                    self.decide(ppid, 'SETTLED')
                    self.next_cadence = body.t + self.CAD['FALLBACK_BASE']
            ctrl_now = body.ball['ctrl']
            if ctrl_now is not None and body.t >= self.next_cadence:
                if mode in ('C', 'D'):
                    cpl0 = body.players[ctrl_now]
                    relx0 = (cpl0['x'] / 1.05) if cpl0['team'] == 0 else 100.0 - cpl0['x'] / 1.05
                    od0 = min((dist(q['x'], q['y'], cpl0['x'], cpl0['y'])
                               for q in body.players.values() if q['team'] != cpl0['team']), default=99.0)
                    nxt = self.CAD['FALLBACK_FT'] if (relx0 >= 66 and od0 > 3.0) else \
                          (self.CAD['FALLBACK_SETTLED'] if (relx0 < 40 and od0 > 4.0) else self.CAD['FALLBACK_BASE'])
                else:
                    nxt = 0.5 if mode == 'B' else 2.5
                self.wakes['cadence'] += 1
                self.decide(ctrl_now, 'cadence')
                self.next_cadence = body.t + nxt
            elif ctrl_now is not None and body.t >= self.next_pressure_ok:
                # PRESSURE wake: a closing opponent forces an early decision —
                # real carriers release BEFORE the tackle, on cal11's own logic
                cpl = body.players[ctrl_now]
                od = min((dist(q['x'], q['y'], cpl['x'], cpl['y'])
                          for q in body.players.values() if q['team'] != cpl['team']), default=99.0)
                fire = od < 2.2
                if fire and mode in ('C', 'D'):
                    last = self._last_dec.get(ctrl_now)
                    if last is not None:
                        lt, lp = last
                        if body.t - lt < self.CAD['REFRACTORY']:
                            fire = False                       # refractory persistence
                        elif mode == 'D':
                            pos0 = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
                            self.eng.body_sync(pos0, (EX(body.ball['x']), EY(body.ball['y'])), ctrl_now)
                            pnow, _ = self.eng._pressure(self.eng.states[ctrl_now])
                            if pnow - lp < self.CAD['RISE_DELTA']:
                                fire = False                   # hysteresis: no material rise
                if fire:
                    self.wakes['PRESSURE'] += 1
                    self.decide(ctrl_now, 'PRESSURE')
                    self.next_cadence = body.t + self.CAD['FALLBACK_BASE'] if mode in ('C', 'D') else body.t + 2.5
                    self.next_pressure_ok = body.t + 0.8
                elif mode in ('C', 'D'):
                    # IMPROVING-STATE wake (de-biasing): held a while and the
                    # nearest opponent has retreated materially — look up again
                    last = self._last_dec.get(ctrl_now)
                    if last is not None and body.t - last[0] >= self.CAD['IMPROVE_HOLD']:
                        base_od = self._od_at_dec.get(ctrl_now)
                        if base_od is not None and od - base_od >= self.CAD['IMPROVE_DIST']:
                            self.wakes['IMPROVED'] = self.wakes.get('IMPROVED', 0) + 1
                            self.decide(ctrl_now, 'IMPROVED')
                            self.next_cadence = body.t + self.CAD['FALLBACK_BASE']
                            self.next_pressure_ok = body.t + 0.8
            if body.ball['held'] is not None:
                if self.held_since is None: self.held_since = body.t
                elif body.t - self.held_since > 2.0:
                    gk = body.ball['held']
                    body.ball['held'] = None
                    body.ball['ctrl'] = gk
                    gkp = body.players[gk]
                    fs = 0.6 if gkp['team'] == 0 else -0.6   # release on the FIELD side
                    body.ball['x'], body.ball['y'], body.ball['z'] = gkp['x'] + fs, gkp['y'], 0.0
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


"""HYBRID EMERGENT EXECUTION layer.

Causal chain: cal11 chooses WHAT (action/receiver/family, frozen logic) →
execution model derives HOW WELL (bounded parameter distributions from cal11's
own attributes/context, seeded keyed draws BEFORE physical consequence) →
the continuous world resolves WHAT HAPPENS (contact/geometry/races).
No final outcome is sampled ahead of physics anywhere in HYBRID mode.

STEERED mode (extreme A, comparison only): cal11 probability rolls decide the
outcome first, then ball flights are velocity-guided to realize the script.

RNG contract: LabRNG.draw(tag, k) = khash(tag_string, per-tag ordinal, seed+k)
— deterministic across processes (khash's own char-accumulator hashes the tag;
never Python's salted hash()), auditable, order-stable per tag. Draws only
parameterize execution (angles, timing, reach windows), never outcomes.
"""
def _norm01(x): return clamp(x / 100.0, 0.0, 1.0)

class LabRNG:
    def __init__(self, seed):
        self.seed = int(seed)
        self.counters = {}
        self.audit = []
    def draw(self, tag, k=0):
        n = self.counters.get(tag, 0)
        self.counters[tag] = n + 1
        u = khash(tag, n, self.seed + k * 7919)
        self.audit.append((tag, n, round(u, 4)))
        return u
    def normal(self, tag, k=0):
        u1 = max(1e-9, self.draw(tag + '.a', k))
        u2 = self.draw(tag + '.b', k)
        return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)

CAD_DEFAULTS = {
    'MODE': 'A',            # A=accepted baseline | B=global 0.5s (diagnostic) |
                            # C=event-driven+bounded fallback | D=C+persistence/hysteresis
    'SCAN_MAX': 0.9,        # C/D: settle-and-scan ceiling after reception (s)
    'ONE_TOUCH_P': 0.55,    # C/D: reception pressure that justifies immediate decision
    'RISE_DELTA': 0.15,     # C/D: PRESSURE wake requires material rise vs last decision
    'IMPROVE_HOLD': 1.0,    # C/D: min hold before an improving-state wake (s)
    'IMPROVE_DIST': 1.5,    # C/D: nearest-opponent retreat that counts as improvement (m)
    'FALLBACK_FT': 1.2,     # C/D: fallback cadence, final third + low pressure
    'FALLBACK_BASE': 2.5,
    'FALLBACK_SETTLED': 3.5, # C/D: settled own-third circulation
    'REFRACTORY': 0.6,      # C/D: min gap between non-emergency decisions
}

CAL12 = {'MODE': 'D', 'AERIAL': True, 'ONE_TOUCH_OD': 1.8, 'SCAN_MAX': 1.2, 'REFRACTORY': 0.9,
         'FALLBACK_BASE': 3.0, 'FALLBACK_FT': 1.5, 'IMPROVE_HOLD': 1.2}

class HybridLab(Lab):
    def __init__(self, engine, steered=False, cad=None):
        super().__init__(engine)
        self.CAD = dict(CAD_DEFAULTS)
        if cad: self.CAD.update(cad)
        self.rng = LabRNG(engine.seed)
        self.steered = steered
        self.exec_prof = {}
        for tid in ('HOME', 'AWAY'):
            for st in self.eng._team_states(tid):
                a = st.player.attributes
                self.exec_prof[st.player.player_id] = {
                    'ball_control': a.get('ball_control', 55), 'technique': a.get('agility', 55),
                    'composure': a.get('composure', 55), 'finishing': a.get('finishing', 55),
                    'standing_tackle': a.get('standing_tackle', 55), 'reactions': a.get('reactions', 55),
                    'strength': a.get('strength', 60), 'balance': a.get('balance', 60),
                    'gk_reflexes': a.get('gk_reflexes', 60), 'gk_handling': a.get('gk_handling', 60),
                }
        if not steered:
            self.body.touch_cb = self.touch_model
            self.body.gk_cb = self.gk_model
        else:
            self.body.gk_cb = self.gk_steered
        self.reception_log = []
        self.tackle_log = []
        self.match_events = []           # fouls/offsides ledger (seam-injected)
        self.gk_log = []
        self._challenge_next = {}
        self._contact_next = {}
        self._gk_state = {}
        self.cur_presser = None          # cal11 engagement ownership (from decisions)
        self._beaten_world = {}          # pid -> world time when the beaten window ends
        self._steer = None               # steered-mode flight guidance state
        self._shot_script = None         # steered-mode pre-sampled shot outcome

    # ═════════ §7 RECEPTION: attribute-driven first touch ═════════
    # Execution randomness enters HERE (touch quality), before consequence:
    # a HEAVY/LOOSE ball then physically races — no possession is pre-assigned.
    def touch_model(self, p, rv, z):
        pid = p['pid']
        prof = self.exec_prof.get(pid)
        if prof is None: return None
        b = self.body.ball
        if rv >= 15.0:                    # physics cap: nobody kills a screamer
            ang = math.atan2(b['y'] - p['y'], b['x'] - p['x']) + (self.rng.draw('touch.deflect') - 0.5)
            return ('DEFLECT', ang, rv * 0.5)
        press = 0.0
        for q in self.body.players.values():
            if q['team'] != p['team']:
                d = dist(q['x'], q['y'], p['x'], p['y'])
                if d < 4.0: press = max(press, 1.0 - d / 4.0)
        est = self.eng.states.get(pid)
        efac = 0.85 + 0.15 * clamp((est.energy if est is not None else 100.0) / 100.0, 0.0, 1.0)
        lst = b['last']
        hostile = (lst is not None and lst != pid
                   and self.body.players[lst]['team'] != p['team'])
        difficulty = 0.06 + rv * 0.032 + min(z, 1.5) * 0.10 + press * 0.22
        inc = math.atan2(b['vy'], b['vx']) if rv > 1.0 else p['facing']
        if hostile:
            # winning an opponent's ball is defensive technique, and it is NOT a
            # binary handover: clean interceptions need quality AND a controllable
            # ball; otherwise the stab is a directional poke that starts a race.
            skill = (0.40 * _norm01(prof['ball_control']) + 0.30 * _norm01(prof['standing_tackle'])
                     + 0.30 * _norm01(prof['reactions'])) * efac
            q_ = skill - difficulty + self.rng.normal('touch.q') * 0.14
            self.reception_log.append({'t': round(self.body.t, 2), 'pid': pid, 'rv': round(rv, 1),
                                       'press': round(press, 2), 'skill': round(skill, 2),
                                       'q': round(q_, 2), 'hostile': True})
            if q_ > 0.30 and rv < 9.0:
                return ('CLEAN', 0.0, 0.0)               # true interception
            # a lunging stab costs balance: no player stabs twice in a beat
            p['stun'] = max(p['stun'], self.body.t + 0.22)
            if q_ > -0.05:                               # controlled poke toward safety
                gx = W if p['team'] == 0 else 0.0        # deep in your own end, safety is WIDE
                own_deep = (p['x'] < 42.0) if p['team'] == 0 else (p['x'] > W - 42.0)
                ty_ = (0.0 if p['y'] < 34.0 else 68.0) if own_deep else 34.0
                base = math.atan2(ty_ - p['y'], gx - p['x'])
                ang = base + self.rng.normal('touch.dir') * (0.9 - clamp(q_, 0.0, 0.8))
                return ('LOOSE', ang, min(2.0 + rv * 0.22, max(rv, 2.0)))
            ang = inc + self.rng.normal('touch.dir') * 0.9   # failed stab: ball runs on
            return ('DEFLECT', ang, max(1.5, rv * 0.40))
        skill = (0.55 * _norm01(prof['ball_control']) + 0.25 * _norm01(prof['technique'])
                 + 0.20 * _norm01(prof['composure'])) * efac
        q_ = skill - difficulty + self.rng.normal('touch.q') * 0.10
        self.reception_log.append({'t': round(self.body.t, 2), 'pid': pid, 'rv': round(rv, 1),
                                   'press': round(press, 2), 'skill': round(skill, 2), 'q': round(q_, 2),
                                   'hostile': False})
        if q_ > 0.12:
            settle = clamp(0.55 - 0.40 * skill + rv * 0.02, 0.10, 0.55)
            return ('CLEAN', 0.0, settle)
        if q_ > -0.12:
            ang = 0.6 * inc + 0.4 * p['facing'] + self.rng.normal('touch.dir') * 0.5
            return ('HEAVY', ang, 2.2 + rv * 0.18)
        ang = inc + self.rng.normal('touch.dir') * 0.9
        return ('LOOSE', ang, rv * 0.35 + 1.0)

    # ═════════ §11 GK: reaction delay + handling — save resolved physically ═════════
    def gk_model(self, gk, b, rv):
        pid = gk['pid']
        prof = self.exec_prof[pid]
        lst = b['last']
        if lst is not None and lst != pid and self.body.players[lst]['team'] == gk['team']:
            # a TEAMMATE's ball (back-pass/deflection) is not a shot: gather it —
            # or, if too hot for hands, beat it WIDE, never through your own goal
            if rv < 14.0:
                return ('CATCH', 0.0)
            away = math.pi if gk['team'] == 1 else 0.0
            wide = 0.9 if gk['y'] < 34.0 else -0.9
            return ('PARRY', away + wide + self.rng.normal('gk.bp') * 0.25)
        if rv <= 12.0:
            return None                   # routine collect: default physics gates
        st = self._gk_state.setdefault(pid, {'seenT': None, 'lastT': -9.0})
        if self.body.t - st['lastT'] > 0.4:
            st['seenT'] = None            # stale: this is a new shot
        st['lastT'] = self.body.t
        if st['seenT'] is None:
            # the keeper reads the shot at the STRIKE (mvSeen), not at his gloves
            st['seenT'] = st.get('mvSeen') if st.get('mvSeen') is not None else self.body.t
            st['react'] = 0.30 - 0.18 * _norm01(prof['gk_reflexes']) + abs(self.rng.normal('gk.react')) * 0.05
        if self.body.t < st['seenT'] + st['react']:
            return ('BEATEN', 0.0)        # still reacting: ball passes unless it hits him
        hard = rv > (17.0 + 9.0 * _norm01(prof['gk_handling']))
        self.gk_log.append({'t': round(self.body.t, 2), 'pid': pid, 'rv': round(rv, 1),
                            'react': round(st['react'], 3), 'held': not hard})
        st['seenT'] = None
        if not hard:
            return ('CATCH', 0.0)
        # a parry beats the ball AWAY from goal (field side), never through himself
        away = math.pi if gk['team'] == 1 else 0.0
        ang = away + self.rng.normal('gk.parry') * 0.70
        return ('PARRY', ang)

    def gk_steered(self, gk, b, rv):
        # extreme A: the shot's result was rolled at decision time
        if rv <= 12.0 or self._shot_script is None:
            return None
        goal = self._shot_script['goal']
        self._shot_script = None
        return ('BEATEN', 0.0) if goal else ('CATCH', 0.0)

    # ═════════ §9 TACKLE: cal11 decides WHETHER; physics decides the RESULT ═════════
    def maybe_challenge(self, dfd_pid, carrier_pid):
        now = self.body.t
        if now < self._challenge_next.get(dfd_pid, 0.0): return
        body, b = self.body, self.body.ball
        dp, cp = body.players[dfd_pid], body.players[carrier_pid]
        if dist(dp['x'], dp['y'], b['x'], b['y']) > 1.35: return
        self._challenge_next[dfd_pid] = now + 0.9
        pos = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
        self.eng.body_sync(pos, (EX(b['x']), EY(b['y'])), carrier_pid)
        car, dfe = self.eng.states[carrier_pid], self.eng.states[dfd_pid]
        pressure, _ = self.eng._pressure(car)
        try:
            p_ch = self.eng._defender_challenge_probability(car, dfe, pressure)
        except Exception:
            p_ch = 0.5
        # DECISION randomness (whether to lunge) is the brain's to spend
        if self.rng.draw('tackle.attempt') > max(0.25, p_ch * 1.4):
            return
        # PHYSICAL EXECUTION: timing/reach vs shield — randomness before consequence
        prof_d, prof_c = self.exec_prof[dfd_pid], self.exec_prof[carrier_pid]
        expose = clamp(dist(cp['x'], cp['y'], b['x'], b['y']) - 0.35, 0.0, 1.2)
        if now < b.get('estT', 0.0): expose = min(1.2, expose + 0.35)   # ball not yet settled
        tq = (0.55 * _norm01(prof_d['standing_tackle']) + 0.25 * _norm01(prof_d['reactions'])) \
             + expose * 0.35 \
             - (0.30 * _norm01(prof_c['strength']) + 0.20 * _norm01(prof_c['balance'])) * (1.0 - expose * 0.5) \
             + self.rng.normal('tackle.q') * 0.12
        self.tackle_log.append({'t': round(now, 2), 'd': dfd_pid, 'c': carrier_pid,
                                'p_ch': round(p_ch, 2), 'expose': round(expose, 2), 'tq': round(tq, 2)})
        _add_load(car, sprint_burst=0.35, duel=0.20)
        _add_load(dfe, sprint_burst=0.30, duel=0.25)
        if tq > 0.30:                      # clean win: poke downfield — and WIDE
            gx = W if dp['team'] == 0 else 0.0  # (near your own goal, safe = the touchline)
            own_deep = (dp['x'] < 42.0) if dp['team'] == 0 else (dp['x'] > W - 42.0)
            ty_ = (0.0 if b['y'] < 34.0 else 68.0) if own_deep else 34.0
            a = math.atan2(ty_ - b['y'], gx - b['x']) + self.rng.normal('tackle.dir') * 0.3
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 6.5, math.sin(a) * 6.5, 0.0
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = now + 0.5
            body._contact('TACKLE_WON', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, 'tackle won')
            # winning ball AND man is still adjudicable: through-the-carrier wins
            # from behind, or arriving after the ball has gone, reach the referee
            behind = (dp['x'] < cp['x']) if cp['team'] == 0 else (dp['x'] > cp['x'])
            late = now - body.last_kick_t < 0.25
            if (behind or late) and dist(dp['x'], dp['y'], cp['x'], cp['y']) < 0.95:
                self._adjudicate_foul(dfd_pid, carrier_pid, min(tq, 0.0) - 0.10, pressure,
                                      from_behind=behind, contact_kind='CONTACT')
        elif tq > -0.05:                   # 50-50: ball squirts, both may chase
            a = math.atan2(b['y'] - cp['y'], b['x'] - cp['x']) + self.rng.normal('tackle.dir') * 0.7
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 7.5, math.sin(a) * 7.5, 0.2
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = now + 0.35
            body._contact('TACKLE_POKE', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, '50-50')
            # a through-the-carrier 50-50 is also a foul candidate (reduced weight)
            if dist(dp['x'], dp['y'], cp['x'], cp['y']) < 1.1:
                behind = (dp['x'] < cp['x']) if cp['team'] == 0 else (dp['x'] > cp['x'])
                self._adjudicate_foul(dfd_pid, carrier_pid, tq, pressure,
                                      from_behind=behind, contact_kind='CONTACT')
        else:                              # missed: overcommitted past the ball
            dp['stun'] = now + 0.55
            body._contact('TACKLE_MISS', dfd_pid)
            # a mistimed lunge that arrives through the CARRIER, not the ball,
            # is a foul candidate — adjudicated on cal11's own foul weighting
            d2c = dist(dp['x'], dp['y'], cp['x'], cp['y'])
            if d2c < 1.6:                      # the lunge carries him through the carrier
                behind = (dp['x'] < cp['x']) if cp['team'] == 0 else (dp['x'] > cp['x'])
                self._adjudicate_foul(dfd_pid, carrier_pid, tq, pressure, from_behind=behind)


    def desperation_challenge(self, dfd_pid, carrier_pid):
        """A beaten defender's last-ditch lunge from behind: election biased up
        (emergency), execution biased down (bad body position) — high foul share
        arises from the physics of the situation, not a multiplier."""
        body, b = self.body, self.body.ball
        dp, cp = body.players[dfd_pid], body.players[carrier_pid]
        pos = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
        self.eng.body_sync(pos, (EX(b['x']), EY(b['y'])), carrier_pid)
        car, dfe = self.eng.states[carrier_pid], self.eng.states[dfd_pid]
        pressure, _ = self.eng._pressure(car)
        try:
            p_ch = self.eng._defender_challenge_probability(car, dfe, pressure)
        except Exception:
            p_ch = 0.3
        if self.rng.draw('tackle.attempt') > clamp(p_ch * 1.4 + 0.30, 0.2, 0.9):
            return
        prof_d, prof_c = self.exec_prof[dfd_pid], self.exec_prof[carrier_pid]
        expose = clamp(dist(cp['x'], cp['y'], b['x'], b['y']) - 0.35, 0.0, 1.2)
        tq = (0.55 * _norm01(prof_d['standing_tackle']) + 0.25 * _norm01(prof_d['reactions'])) \
             + expose * 0.35 - 0.35 \
             - (0.30 * _norm01(prof_c['strength']) + 0.20 * _norm01(prof_c['balance'])) * (1.0 - expose * 0.5) \
             + self.rng.normal('tackle.q') * 0.12
        self.tackle_log.append({'t': round(body.t, 2), 'd': dfd_pid, 'c': carrier_pid,
                                'p_ch': round(p_ch, 2), 'expose': round(expose, 2),
                                'tq': round(tq, 2), 'desperation': True})
        if tq > 0.30:
            gx = W if dp['team'] == 0 else 0.0
            own_deep = (dp['x'] < 42.0) if dp['team'] == 0 else (dp['x'] > W - 42.0)
            ty_ = (0.0 if b['y'] < 34.0 else 68.0) if own_deep else 34.0
            a = math.atan2(ty_ - b['y'], gx - b['x']) + self.rng.normal('tackle.dir') * 0.3
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 6.5, math.sin(a) * 6.5, 0.0
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = body.t + 0.5
            body._contact('TACKLE_WON', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, 'desperation won')
        elif tq > -0.05:
            a = math.atan2(b['y'] - cp['y'], b['x'] - cp['x']) + self.rng.normal('tackle.dir') * 0.7
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 7.5, math.sin(a) * 7.5, 0.2
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = body.t + 0.35
            body._contact('TACKLE_POKE', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, 'desperation 50-50')
            if dist(dp['x'], dp['y'], cp['x'], cp['y']) < 1.1:
                self._adjudicate_foul(dfd_pid, carrier_pid, tq, pressure,
                                      from_behind=True, desperation=True, contact_kind='CONTACT')
        else:
            dp['stun'] = body.t + 0.55
            body._contact('TACKLE_MISS', dfd_pid)
            if dist(dp['x'], dp['y'], cp['x'], cp['y']) < 1.6:
                self._adjudicate_foul(dfd_pid, carrier_pid, tq, pressure,
                                      from_behind=True, desperation=True)

    def _adjudicate_foul(self, dfd_pid, car_pid, tq, pressure, from_behind=False,
                         desperation=False, contact_kind='TACKLE'):
        """One seam for physical-contact fouls. cal11-shaped logit; severity-based
        cards feed cal11's own yellow_cards caution term. Keyed draws only."""
        body, b = self.body, self.body.ball
        dp, cp = body.players[dfd_pid], body.players[car_pid]
        dfe, car = self.eng.states[dfd_pid], self.eng.states[car_pid]
        g = self.eng._g_eff
        lf = (-1.45 + 0.38 * g(dfe, 'aggression') - 0.32 * g(dfe, 'standing_tackle')
              - 0.22 * g(dfe, 'defensive_awareness') + 0.42 * pressure
              + 0.55 * clamp(-tq, 0.0, 1.0)
              + (0.90 if from_behind else 0.0) + (0.45 if desperation else 0.0)
              + (-0.90 if contact_kind == 'CONTACT' else 0.0))
        if self.rng.draw('foul.adj') >= 1.0 / (1.0 + math.exp(-lf)):
            return False
        in_box = (cp['x'] > W - 16.5 if cp['team'] == 0 else cp['x'] < 16.5) \
                 and abs(cp['y'] - 34.0) < 20.15
        kind = 'PENALTY' if in_box else 'FREE_KICK'
        spot = ((W - 11.0, 34.0) if cp['team'] == 0 else (11.0, 34.0)) if in_box \
               else (cp['x'], cp['y'])
        # severity → cards: from-behind, closing speed, badness, stopping an open run
        gs = sum(1 for q in body.players.values()
                 if q['team'] == dp['team'] and not q['gk']
                 and ((q['x'] > cp['x']) if cp['team'] == 0 else (q['x'] < cp['x'])))
        closing = math.hypot(dp['vx'] - cp['vx'], dp['vy'] - cp['vy'])
        sev = (1.0 if from_behind else 0.0) + 0.6 * (closing > 4.0) \
              + 0.5 * clamp(-tq, 0.0, 1.0) + (0.8 if gs <= 1 else 0.0)
        card = None
        if gs == 0 and from_behind and sev >= 1.8:
            card = 'RED'
        elif self.rng.draw('foul.card') < clamp(0.12 + 0.30 * (sev - 0.6), 0.02, 0.75):
            card = 'YELLOW'
        if card == 'YELLOW':
            dfe.yellow_cards += 1                      # cal11 caution loop engages
            if dfe.yellow_cards >= 2: card = 'RED'
        if card == 'RED':
            dfe.active = False                          # sent off in the brain
            dp['vmax'] = 0.0; dp['vx'] = dp['vy'] = 0.0
            dp['x'], dp['y'] = -1.5, -1.5               # leaves the field
        body.restart = {'kind': kind, 'team': cp['team'], 'spot': spot, 't': 0.0}
        b['ctrl'] = None; b['held'] = None
        b['vx'] = b['vy'] = b['vz'] = 0.0; b['state'] = 'DEAD'
        body.ev('FOUL', dfd_pid, kind)
        self.match_events.append({'t': round(body.t, 2), 'kind': 'FOUL', 'by': dfd_pid,
                                  'on': car_pid, 'restart': kind, 'card': card,
                                  'from_behind': from_behind, 'desperation': desperation,
                                  'sev': round(sev, 2)})
        return True

    # ═════════ §15 defensive routing: cal11's OWN hierarchy drives the bodies ═════════
    # The brain decides defensive purpose (body_defense: ENGAGE/SUPPORT/RECOVER/
    # HOLD/TRACK); the body executes it. Refreshed at 0.5 s; roles persist
    # briefly through loose balls so shape doesn't dissolve at every touch.
    def route_defense(self):
        body, b = self.body, self.body.ball
        ctrl = b['ctrl']
        now = body.t
        if ctrl is not None and b['held'] is None and body.restart is None:
            team = body.players[ctrl]['team']
            # POSSESSION HYSTERESIS: a role hierarchy re-keys to the other team
            # only after control PERSISTS (0.3 s) — a one-tick flicker during a
            # contest must not dissolve ENGAGE continuity (backpedal momentum
            # is the physics that makes take-ons winnable)
            if team != getattr(self, '_poss_team', None):
                if getattr(self, '_poss_cand', None) != team:
                    self._poss_cand = team
                    self._poss_cand_t = now
                if now - self._poss_cand_t >= 0.30 or getattr(self, '_poss_team', None) is None:
                    self._poss_team = team
                else:
                    if now < getattr(self, '_roles_t', -1.0) + 2.0:
                        return dict(getattr(self, '_roles', {}))
                    return {}
            else:
                self._poss_cand = team
            same_team_carrier = getattr(self, '_roles_ctrl', None) is not None and \
                body.players.get(self._roles_ctrl, {}).get('team') == team
            if now >= getattr(self, '_roles_t', -1.0) + 0.5 or \
               (self._roles_ctrl != ctrl and not same_team_carrier):
                pos = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
                self.eng.body_sync(pos, (EX(b['x']), EY(b['y'])), ctrl)
                # beaten windows are governed by WORLD time: expire stale
                # engine-clock fields BEFORE classification so the true presser
                # regains ENGAGE (a stale field silently demoted him forever)
                for pid_, bw in list(self._beaten_world.items()):
                    if bw <= now:
                        st_ = self.eng.states.get(pid_)
                        if st_ is not None and getattr(st_, 'st_beaten_until', -999) > self.eng.clock:
                            st_.st_beaten_until = self.eng.clock - 1
                        del self._beaten_world[pid_]
                raw_roles = self.eng.body_defense(ctrl)
                for pid_, bw in self._beaten_world.items():
                    if bw > now and pid_ in raw_roles:
                        raw_roles[pid_] = 'RECOVER'
                self._roles = raw_roles
                self._roles_t = now
                self._roles_ctrl = ctrl
            return dict(self._roles)
        if now < getattr(self, '_roles_t', -1.0) + 2.0:
            return dict(getattr(self, '_roles', {}))       # brief persistence when loose
        return {}

    def act(self):
        body, b = self.body, self.body.ball
        if self.steered:
            self.steer_tick()
        roles = self.route_defense()
        ctrl = b['ctrl']
        self._direct = set()
        # ═════ AERIAL CONTEST: a descending ball in the jumping band with
        # opponents converged is a physical duel — jumping/strength/height/
        # positioning decide it causally; contact reaches the adjudicator ═════
        if not self.steered and self.CAD.get('AERIAL', False) and \
           ctrl is None and b['held'] is None and \
           1.5 < b['z'] < 2.6 and b['vz'] < -0.5:
            akey = round(body.last_kick_t, 2)
            if akey != getattr(self, '_aerial_done', None):
                cands = [q for q in body.players.values() if not q['gk'] and q['stun'] <= body.t
                         and dist(q['x'], q['y'], b['x'], b['y']) < 1.15]
                if len(cands) >= 2 and len({q['team'] for q in cands}) == 2:
                    self._aerial_done = akey
                    scored = []
                    for q in cands:
                        st_ = self.eng.states[q['pid']]
                        at = st_.player.attributes
                        h01 = clamp((st_.player.height_cm - 165.0) / 35.0, 0.0, 1.0)
                        s = (0.40 * _norm01(at.get('jumping', 55)) + 0.20 * _norm01(at.get('strength', 60))
                             + 0.15 * h01 + 0.15 * (1.0 - dist(q['x'], q['y'], b['x'], b['y']) / 1.15)
                             + 0.10 * _norm01(at.get('reactions', 60))
                             + self.rng.normal('aerial.q') * 0.10)
                        scored.append((s, q))
                    scored.sort(key=lambda x: -x[0])
                    win, lose = scored[0][1], scored[-1][1]
                    gap = scored[0][0] - scored[-1][0]
                    watt = self.eng.states[win['pid']].player.attributes
                    head01 = _norm01(watt.get('heading_accuracy', 55))
                    gx2 = W if win['team'] == 0 else 0.0
                    own_deep = (win['x'] < 42.0) if win['team'] == 0 else (win['x'] > W - 42.0)
                    ty2 = (0.0 if b['y'] < 34.0 else 68.0) if own_deep else 34.0
                    ang = math.atan2(ty2 - b['y'], gx2 - b['x']) + \
                          self.rng.normal('aerial.dir') * (1.05 - 0.65 * head01)
                    spd = 6.0 + 2.5 * _norm01(watt.get('strength', 60))
                    b['vx'], b['vy'] = math.cos(ang) * spd, math.sin(ang) * spd
                    b['vz'] = 1.2
                    b['z'] = min(b['z'], 2.2)
                    b['exclPid'] = win['pid']; b['exclT'] = body.t + 0.3
                    body._contact('HEADER', win['pid'])
                    body.ev('AERIAL_CONTEST', win['pid'])
                    lose['stun'] = max(lose['stun'], body.t + 0.35)
                    _add_load(self.eng.states[win['pid']], jump=0.5)
                    _add_load(self.eng.states[lose['pid']], jump=0.5)
                    # contact adjudication: the worse-positioned climber risks the foul
                    closing = math.hypot(win['vx'] - lose['vx'], win['vy'] - lose['vy'])
                    fouler, victim = (win, lose) if \
                        dist(win['x'], win['y'], b['x'], b['y']) > dist(lose['x'], lose['y'], b['x'], b['y']) \
                        else (lose, win)
                    if gap < 0.22 or closing > 4.0:
                        behind = (fouler['x'] < victim['x']) if victim['team'] == 0 else \
                                 (fouler['x'] > victim['x'])
                        self._adjudicate_foul(fouler['pid'], victim['pid'], -0.10, 0.5,
                                              from_behind=behind, contact_kind='CONTACT')
        # ═════ GK shot response: move to the predicted crossing point after a
        # reflexes-derived reaction delay — positioning and commit are physical ═════
        if not self.steered:
            bsp = math.hypot(b['vx'], b['vy'])
            for tnum, gkpid in self.gk_of.items():
                if gkpid is None: continue
                g = body.players[gkpid]
                glx = 0.5 if tnum == 0 else W - 0.5
                st = self._gk_state.setdefault(gkpid, {'seenT': None, 'lastT': -9.0})
                incoming = False
                mate_ball = b['last'] is not None and \
                            body.players.get(b['last'], {}).get('team') == tnum
                if mate_ball and b['ctrl'] is None and b['held'] is None and \
                   abs(glx - b['x']) < 26.0 and \
                   ((b['vx'] < -0.5) if tnum == 0 else (b['vx'] > 0.5)):
                    # a teammate's ball running toward our goal: SWEEP/collect it —
                    # read early, move to the line of the ball, no dive, no parry
                    x_meet = max(glx, min(b['x'], glx + 8.0)) if tnum == 0 \
                             else min(glx, max(b['x'], glx - 8.0))
                    t_c = (x_meet - b['x']) / b['vx'] if abs(b['vx']) > 0.3 else 2.0
                    cy2 = b['y'] + b['vy'] * clamp(t_c, 0.0, 3.5)
                    body.locomote(g, x_meet, clamp(cy2, 28.0, 40.0), 6.5)
                    self._direct.add(gkpid)
                    st['mvSeen'] = None
                    continue
                if bsp > 11.0 and b['ctrl'] is None and not mate_ball and \
                   abs(glx - b['x']) < 30.0 and abs(b['vx']) > 1.0:
                    t_cross = (glx - b['x']) / b['vx']
                    if 0.0 < t_cross < 2.5:
                        cy = b['y'] + b['vy'] * t_cross
                        if abs(cy - 34.0) < 6.0:
                            incoming = True
                            if st.get('mvSeen') is None:
                                st['mvSeen'] = body.t
                                st['mvReact'] = 0.28 - 0.17 * _norm01(self.exec_prof[gkpid]['gk_reflexes']) \
                                                + abs(self.rng.normal('gk.mvreact')) * 0.04
                            if st.get('dove'):
                                # ballistic extension: integrate the committed dive,
                                # then LAND: ground friction after 0.45 s and a hard
                                # floor at the goal plane (keepers don't slide home)
                                g['x'] = g['x'] + g['vx'] * DT
                                g['y'] = clamp(g['y'] + g['vy'] * DT, -2, H + 2)
                                g['x'] = clamp(g['x'], 0.15, W - 0.15) if True else g['x']
                                if body.t > st.get('doveT', body.t) + 0.45:
                                    g['vx'] *= 0.85; g['vy'] *= 0.85
                                else:
                                    g['vx'] *= 0.985; g['vy'] *= 0.985
                            elif body.t >= st['mvSeen'] + st['mvReact']:
                                if t_cross < 0.50 and not st.get('dove'):
                                    # THE DIVE: one explosive, committed extension —
                                    # explosiveness from reflexes; no second dive
                                    st['dove'] = True
                                    st['doveT'] = body.t
                                    ty_ = clamp(cy, 30.4, 37.6)
                                    dd = max(0.3, dist(g['x'], g['y'], glx, ty_))
                                    dsp = 4.2 + 2.6 * _norm01(self.exec_prof[gkpid]['gk_reflexes'])
                                    g['vx'] = (glx - g['x']) / dd * dsp
                                    g['vy'] = (ty_ - g['y']) / dd * dsp
                                else:
                                    body.locomote(g, glx, clamp(cy, 30.8, 37.2), 8.0)
                            else:
                                body.locomote(g, g['x'], g['y'], 0.0)
                            self._direct.add(gkpid)
                if not incoming:
                    st['mvSeen'] = None
                    st['dove'] = False
        # GUARDS: defensive roles never apply to the controller himself, to a
        # player executing a carrier action, or to the team in possession —
        # a flickering ctrl during a contest must not whiplash the hierarchy
        if ctrl is not None:
            att_t = body.players[ctrl]['team']
            roles = {pid: r for pid, r in roles.items()
                     if pid != ctrl and body.players[pid]['team'] != att_t}
        roles = {pid: r for pid, r in roles.items()
                 if not (body.intents.get(pid) or {}).get('kind') in ('KICK', 'TAKE_ON', 'CARRY')}
        self._chase_exclude = {pid for pid, r in roles.items() if r == 'HOLD'}
        self._extra_chasers = set()
        if ctrl is None:
            for pid, r in roles.items():
                if r == 'ENGAGE' and dist(body.players[pid]['x'], body.players[pid]['y'],
                                          b['x'], b['y']) < 10.0:
                    self._extra_chasers.add(pid)
                    break
        for pid, role in roles.items():
            p = body.players[pid]
            if role == 'ENGAGE' and ctrl is not None:
                # DEFENSIVE POSITIONING AUTHORITY BELONGS TO THE BRAIN: the
                # presser travels to cal11's own step-out/contain target (from
                # _press_sweep via body_targets). The adapter's old hard-coded
                # 1.7 m glue double-pressed beyond the brain's intent and made
                # final-third pressure physically over-perfect (median carrier
                # xg 0.010 vs native shot median 0.056). The adapter keeps only
                # the challenge election at physical range.
                if not self.steered:
                    self.maybe_challenge(pid, ctrl)
            elif role == 'SUPPORT' and ctrl is not None:
                pass                        # cal11 press-sweep targets drive support too
            elif role == 'RECOVER':
                gx = 0.0 if p['team'] == 0 else W
                if ctrl is not None:
                    cp2 = body.players[ctrl]
                    d2 = dist(p['x'], p['y'], cp2['x'], cp2['y'])
                    behind = (p['x'] < cp2['x']) if cp2['team'] == 0 else (p['x'] > cp2['x'])
                    if d2 < 1.3 and behind and body.t >= self._challenge_next.get(pid, 0.0):
                        self._challenge_next[pid] = body.t + 1.2
                        self.desperation_challenge(pid, ctrl)
                self.last_targets[pid] = (EX(p['x'] + (gx - p['x']) * 0.25),
                                          EY(p['y'] + (34.0 - p['y']) * 0.25), 'sprint')
            # HOLD / TRACK: cal11 structural targets untouched
        # shoulder/charge contact: opponent pinned at the separation boundary
        # against the carrier at speed is a (rare) foul candidate — bodies, not dice
        if not self.steered and ctrl is not None and body.restart is None:
            cpb = body.players[ctrl]
            for pid2, r2 in roles.items():
                if r2 not in ('ENGAGE', 'SUPPORT'): continue
                q2 = body.players[pid2]
                if body.t < self._contact_next.get(pid2, 0.0): continue
                d2 = dist(q2['x'], q2['y'], cpb['x'], cpb['y'])
                closing = math.hypot(q2['vx'] - cpb['vx'], q2['vy'] - cpb['vy'])
                if d2 < 0.95 and closing > 3.5:    # a hard charge, not a jockey
                    self._contact_next[pid2] = body.t + 3.0
                    pos2 = {q['pid']: (EX(q['x']), EY(q['y'])) for q in body.players.values()}
                    self.eng.body_sync(pos2, (EX(b['x']), EY(b['y'])), ctrl)
                    pr2, _ = self.eng._pressure(self.eng.states[ctrl])
                    self._adjudicate_foul(pid2, ctrl, -0.15, pr2, contact_kind='CONTACT')
        super().act()
        # reactions = physical response time to the sudden move: when a take-on
        # knock happens (during super().act() this tick), the engaged defender
        # freezes for a reactions-derived beat BEFORE this tick's ball contacts
        if not self.steered:
            cc = getattr(self, '_cc', 0)
            while cc < len(body.contacts):
                c = body.contacts[cc]; cc += 1
                if c['kind'] == 'TAKEON_KNOCK':
                    carr = body.players.get(c['pid'])
                    if carr is None: continue
                    nearest_d = None
                    for q in body.players.values():
                        if q['team'] != carr['team'] and not q['gk'] \
                           and dist(q['x'], q['y'], carr['x'], carr['y']) < 3.5:
                            lat = 0.10 + 0.24 * (1.0 - _norm01(self.exec_prof[q['pid']]['reactions']))
                            q['stun'] = max(q['stun'], body.t + lat)
                            if nearest_d is None: nearest_d = q['pid']
                    if nearest_d is not None:
                        self._beat_pending = {'car': c['pid'], 'def': nearest_d, 't': body.t}
            self._cc = cc
            # physical BEAT confirmed → cal11's own beaten/exploit state (Family E + BX.Q)
            bp = getattr(self, '_beat_pending', None)
            if bp is not None:
                if body.t > bp['t'] + 3.0:
                    self._beat_pending = None
                elif b['ctrl'] == bp['car']:
                    carp, dfp = body.players[bp['car']], body.players[bp['def']]
                    ahead = carp['x'] > dfp['x'] + 0.5 if carp['team'] == 0 else carp['x'] < dfp['x'] - 0.5
                    if ahead:
                        car_s, dfe_s = self.eng.states[bp['car']], self.eng.states[bp['def']]
                        g = self.eng._g_eff
                        t_rec = clamp(2.2 + 0.8 * (g(car_s, 'acceleration') - g(dfe_s, 'acceleration'))
                                      + 0.4 * (g(car_s, 'agility') - g(dfe_s, 'agility'))
                                      + (0.5 if dfe_s.energy < 60.0 else 0.0), 1.5, 4.5)
                        dfe_s.st_beaten_until = self.eng.clock + int(round(t_rec))
                        car_s.bx_exploit_until = self.eng.clock + int(round(t_rec)) + 1
                        self._beaten_world[bp['def']] = body.t + t_rec   # world-time truth
                        self.match_events.append({'t': round(body.t, 2), 'kind': 'BEAT',
                                                  'car': bp['car'], 'def': bp['def'],
                                                  't_rec': round(t_rec, 1)})
                    self._beat_pending = None

    # ═════════ decision hook: capture engagement ownership + steered scripting ═════════
    def decide(self, pid, why):
        d = super().decide(pid, why)
        self.cur_presser = d.get('presser')
        return d

    def apply_decision(self, pid, d):
        if not self.steered:
            return super().apply_decision(pid, d)
        # ═══ STEERED (extreme A): pre-sample the outcome, then guide the flight ═══
        body, b = self.body, self.body.ball
        p = body.players[pid]
        act = d['action']
        if act == 'PASS' and 'to' in d:
            to = body.players[d['to']]
            car, tgt = self.eng.states[pid], self.eng.states[d['to']]
            pressure = d.get('pressure', 0.0)
            p_ok = self.eng.pass_execution_probability(car, tgt, pressure)
            if self.rng.draw('steer.pass') < p_ok:
                tx, ty = to['x'], to['y']            # scripted completion
            else:
                mid = ((p['x'] + to['x']) / 2, (p['y'] + to['y']) / 2)
                opp = min((q for q in body.players.values() if q['team'] != p['team']),
                          key=lambda q: dist(q['x'], q['y'], mid[0], mid[1]))
                tx, ty = opp['x'], opp['y']          # scripted interception
            fam = 'DRIVEN' if dist(p['x'], p['y'], tx, ty) > 18 else 'SHORT'
            body.set_intent(pid, {'kind': 'KICK', 'tx': tx, 'ty': ty, 'fam': fam,
                                  'windup': body.t + 0.28, 'then': {'kind': 'BRAIN'}})
            self._steer = {'to': (tx, ty), 'pid': pid}
        elif act == 'SHOOT':
            car = self.eng.states[pid]
            xg = self.eng._xg(car, d.get('pressure', 0.0))
            goal = self.rng.draw('steer.shot') < xg
            gx = W + 0.5 if p['team'] == 0 else -0.5
            gy = 34.0 + (3.0 if goal else 0.0)       # corner if scripted goal, at GK otherwise
            body.set_intent(pid, {'kind': 'KICK', 'tx': gx, 'ty': gy, 'fam': 'SHOT',
                                  'windup': body.t + 0.32, 'then': {'kind': 'BRAIN'}})
            self._steer = {'to': (gx, gy), 'pid': pid}
            self._shot_script = {'goal': goal}
        else:
            return super().apply_decision(pid, d)

    def steer_tick(self):
        s = self._steer
        if s is None: return
        b = self.body.ball
        if b['state'] == 'DEAD' or b['held'] is not None:
            self._steer = None; return
        if b['ctrl'] is not None:
            if b['ctrl'] != s['pid']:
                self._steer = None                   # arrived (or stolen): script done
            return                                    # kicker still winding up
        tx, ty = s['to']
        d = dist(b['x'], b['y'], tx, ty)
        sp = math.hypot(b['vx'], b['vy'])
        if sp < 0.8:
            self._steer = None; return
        des = clamp(d * 1.4, 2.5, max(sp, 2.5))      # decelerate into the target
        ux, uy = (tx - b['x']) / max(d, 0.1), (ty - b['y']) / max(d, 0.1)
        b['vx'] += (ux * des - b['vx']) * 0.18
        b['vy'] += (uy * des - b['vy']) * 0.18


# ══════════════════ production entry (flag-gated from MatchEngine.run) ══════════════════
def run_continuous(engine, seconds=5400.0, cad=None, trace_every=6):
    """Run the accepted Hybrid-C + cal12 architecture over a constructed
    MatchEngine. Returns (MatchResult-compatible result, adapter) — the
    adapter carries trace/decisions/events for parity and replay tooling."""
    from .worldflags import CAD_PROFILE
    L = HybridLab(engine, cad=(cad or dict(CAD_PROFILE)))
    L.body.restart = {'kind': 'KICKOFF', 'team': 0, 'spot': (52.5, 34.0), 't': 0.0}
    L.run(seconds, trace_every=trace_every)
    engine.score['HOME'] = L.body.score[0]
    engine.score['AWAY'] = L.body.score[1]
    result = engine._build_result()
    result.continuous = {
        'match_events': L.match_events,
        'wakes': dict(L.wakes),
        'decisions': len(L.decisions),
        'violations': L.body.violations,
    }
    return result, L
