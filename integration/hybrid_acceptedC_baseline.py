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
import math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lab import Lab, khash, EX, EY
from body import dist, clamp, W, H, DT

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

class HybridLab(Lab):
    def __init__(self, start_request_path, seed, steered=False):
        super().__init__(start_request_path, seed)
        self.rng = LabRNG(seed)
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
        self.gk_log = []
        self._challenge_next = {}
        self._gk_state = {}
        self.cur_presser = None          # cal11 engagement ownership (from decisions)
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
                gx = W if p['team'] == 0 else 0.0
                base = math.atan2(34.0 - p['y'], gx - p['x'])
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
            return ('CLEAN', 0.0, 0.0)
        if q_ > -0.12:
            ang = 0.6 * inc + 0.4 * p['facing'] + self.rng.normal('touch.dir') * 0.5
            return ('HEAVY', ang, 2.2 + rv * 0.18)
        ang = inc + self.rng.normal('touch.dir') * 0.9
        return ('LOOSE', ang, rv * 0.35 + 1.0)

    # ═════════ §11 GK: reaction delay + handling — save resolved physically ═════════
    def gk_model(self, gk, b, rv):
        pid = gk['pid']
        prof = self.exec_prof[pid]
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
        tq = (0.55 * _norm01(prof_d['standing_tackle']) + 0.25 * _norm01(prof_d['reactions'])) \
             + expose * 0.35 \
             - (0.30 * _norm01(prof_c['strength']) + 0.20 * _norm01(prof_c['balance'])) * (1.0 - expose * 0.5) \
             + self.rng.normal('tackle.q') * 0.12
        self.tackle_log.append({'t': round(now, 2), 'd': dfd_pid, 'c': carrier_pid,
                                'p_ch': round(p_ch, 2), 'expose': round(expose, 2), 'tq': round(tq, 2)})
        if tq > 0.30:                      # clean win: poke toward own attacking half
            gx = W if dp['team'] == 0 else 0.0
            a = math.atan2(34.0 - b['y'], gx - b['x']) + self.rng.normal('tackle.dir') * 0.3
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 6.5, math.sin(a) * 6.5, 0.0
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = now + 0.5
            body._contact('TACKLE_WON', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, 'tackle won')
        elif tq > -0.05:                   # 50-50: ball squirts, both may chase
            a = math.atan2(b['y'] - cp['y'], b['x'] - cp['x']) + self.rng.normal('tackle.dir') * 0.7
            b['vx'], b['vy'], b['vz'] = math.cos(a) * 7.5, math.sin(a) * 7.5, 0.2
            b['ctrl'] = None; b['exclPid'] = carrier_pid; b['exclT'] = now + 0.35
            body._contact('TACKLE_POKE', dfd_pid); body.ev('LOOSE_BALL', dfd_pid, '50-50')
        else:                              # missed: overcommitted past the ball
            dp['stun'] = now + 0.55
            body._contact('TACKLE_MISS', dfd_pid)

    # ═════════ §15 defensive routing: PRESS/COVER/RECOVER as distinct bodies ═════════
    # PRESS honors cal11's engagement ownership: the presser named by the most
    # recent carrier decision keeps the job; nearest-defender is only fallback.
    def route_defense(self):
        body, b = self.body, self.body.ball
        roles = {}
        ctrl = b['ctrl']
        if ctrl is None or b['held'] is not None or body.restart is not None:
            return roles
        att_team = body.players[ctrl]['team']
        defs = [p for p in body.players.values() if p['team'] != att_team and not p['gk']]
        if not defs: return roles
        defs.sort(key=lambda p: dist(p['x'], p['y'], b['x'], b['y']))
        presser = None
        if self.cur_presser is not None:
            cand = body.players.get(self.cur_presser)
            if cand is not None and cand['team'] != att_team and not cand['gk'] \
               and dist(cand['x'], cand['y'], b['x'], b['y']) < 14.0:
                presser = cand
        if presser is None:
            presser = defs[0]
        roles[presser['pid']] = 'PRESS'
        for p in defs:
            if p is presser: continue
            roles[p['pid']] = 'COVER'
            break
        for p in defs:
            if p['stun'] > body.t:
                roles[p['pid']] = 'RECOVER'
        return roles

    def act(self):
        body, b = self.body, self.body.ball
        if self.steered:
            self.steer_tick()
        roles = self.route_defense()
        ctrl = b['ctrl']
        self._direct = set()
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
                if bsp > 11.0 and b['ctrl'] is None and abs(glx - b['x']) < 30.0 and \
                   abs(b['vx']) > 1.0:
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
                                # ballistic extension: integrate the committed dive
                                g['x'] = clamp(g['x'] + g['vx'] * DT, -2, W + 2)
                                g['y'] = clamp(g['y'] + g['vy'] * DT, -2, H + 2)
                                g['vx'] *= 0.985; g['vy'] *= 0.985
                            elif body.t >= st['mvSeen'] + st['mvReact']:
                                if t_cross < 0.50 and not st.get('dove'):
                                    # THE DIVE: one explosive, committed extension —
                                    # explosiveness from reflexes; no second dive
                                    st['dove'] = True
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
        for pid, role in roles.items():
            p = body.players[pid]
            if role == 'PRESS' and ctrl is not None:
                # CONTAIN: hold a cushion goal-side, mirror the carrier's speed
                # when set — never dive the cushion; challenges are cal11's call
                cp = body.players[ctrl]
                gx = 0.0 if p['team'] == 0 else W
                a = math.atan2(34.0 - cp['y'], gx - cp['x'])
                hx, hy = cp['x'] + math.cos(a) * 1.7, cp['y'] + math.sin(a) * 1.7
                d2h = dist(p['x'], p['y'], hx, hy)
                csp = math.hypot(cp['vx'], cp['vy'])
                sp = p['vmax'] if d2h > 3.0 else min(p['vmax'], csp + 1.5)
                if p['stun'] > body.t: sp = min(sp, 1.2)
                body.locomote(p, hx, hy, sp)
                self._direct.add(pid)
                if not self.steered:
                    self.maybe_challenge(pid, ctrl)
            elif role == 'COVER' and ctrl is not None:
                cp = body.players[ctrl]
                gx = 0.0 if p['team'] == 0 else W
                self.last_targets[pid] = (EX(cp['x'] + (gx - cp['x']) * 0.30),
                                          EY(cp['y'] + (34.0 - cp['y']) * 0.30), 'high_speed_run')
            elif role == 'RECOVER':
                gx = 0.0 if p['team'] == 0 else W
                self.last_targets[pid] = (EX(p['x'] + (gx - p['x']) * 0.2),
                                          EY(p['y'] + (34.0 - p['y']) * 0.2), 'jog')
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
                    for q in body.players.values():
                        if q['team'] != carr['team'] and not q['gk'] \
                           and dist(q['x'], q['y'], carr['x'], carr['y']) < 3.5:
                            lat = 0.10 + 0.24 * (1.0 - _norm01(self.exec_prof[q['pid']]['reactions']))
                            q['stun'] = max(q['stun'], body.t + lat)
            self._cc = cc

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
