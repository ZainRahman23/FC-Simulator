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

CAL12 = {'MODE': 'D', 'ONE_TOUCH_OD': 1.8, 'SCAN_MAX': 1.2, 'REFRACTORY': 0.9,
         'FALLBACK_BASE': 3.0, 'FALLBACK_FT': 1.5, 'IMPROVE_HOLD': 1.2}

class HybridLab(Lab):
    def __init__(self, start_request_path, seed, steered=False, cad=None):
        super().__init__(start_request_path, seed)
        self.CAD = dict(CAD_DEFAULTS)
        if cad: self.CAD.update(cad)
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
        from lab import EL as _EL
        _EL.add_explosive_load(car, sprint_burst=0.35, duel=0.20)
        _EL.add_explosive_load(dfe, sprint_burst=0.30, duel=0.25)
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
