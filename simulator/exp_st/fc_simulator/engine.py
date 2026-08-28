from __future__ import annotations

import math
from dataclasses import replace
from typing import Any

from .calibration import CalibrationConfig
from .fatigue import add_explosive_load, effective_attribute, halftime_recovery, update_fatigue
from .formations import anchors_for, slot_map_between
from .geometry import (
    attack_relative_x,
    distance_m,
    from_attack_frame,
    goal_center,
    move_toward,
    point_segment_distance_m,
    shot_angle_radians,
)
from .mathcore import AttributeNormalizer, bounded_sigmoid, clamp, logit, sigmoid, softmax
from .models import (
    BallControlState,
    BallHeightState,
    BallState,
    Event,
    MatchConfig,
    MatchResult,
    PlayerState,
    Team,
    Vec2,
)
from .ratings import add_performance, add_role_performance
from .rng import KeyedRNG
from .tactics import default_instructions, effort01


# Spatial-Temporal experimental feature flags (cal7 workstream).
# Each family is independently toggleable so isolated and staged testing share
# one source. All default OFF: with every flag False this file must remain
# behaviorally identical to production cal6 (digest-verified).
ST = {"A": False, "A2": False, "B": False, "C": False, "D": False, "E": False}
ST_E = {"base": -1.78, "space": 0.80, "cover": 1.30}  # take-on selection dose (accepted ladder point: conservative base + value shaping)


class MatchEngine:
    """Deterministic 11v11 event/space simulator.

    v0.7 extends the contextual event engine with semantic keyed random streams, compact-block reception contests, and asymmetric matchup ecology while preserving the prior wide-play/recovery model
    meaningful chances without borrowing the transition ecology of open games. It
    preserves the core invariant that OVR never enters resolution.
    """

    def __init__(
        self,
        home: Team,
        away: Team,
        attribute_stats: dict[str, dict[str, float]],
        seed: int,
        config: MatchConfig | None = None,
        calibration: CalibrationConfig | None = None,
    ):
        self.home = home
        self.away = away
        self.teams = {home.team_id: home, away.team_id: away}
        self.config = config or MatchConfig()
        self.cal = calibration or CalibrationConfig()
        self.rng = KeyedRNG(seed, audit_enabled=self.config.record_rng_audit)
        self.seed = seed
        self.norm = AttributeNormalizer(attribute_stats)
        self.clock = 0
        self.event_id = 0
        # Random context increments once per football decision, not once per logged event.
        # This keeps random streams stable if event logging is expanded or reordered.
        self.rng_context = 0
        self.events: list[Event] = []
        self.timeline: list[dict[str, Any]] = []
        self.score = {home.team_id: 0, away.team_id: 0}
        self.possession_seconds = {home.team_id: 0, away.team_id: 0}
        self.loose_seconds = 0
        self.active_play_seconds = 0
        self.dead_ball_seconds = 0
        self.dead_until = 0
        self.dead_reason: str | None = None
        self.last_turnover_time = -999
        self.last_turnover_loser: str | None = None
        # Geometry-derived transition opportunity created by the most recent live turnover.
        # 0 = no broken-field counter opportunity; 1 = severely exposed defense.
        self.last_transition_strength = 0.0
        self.last_completed_pass: tuple[str, str, str, int] | None = None
        self.pass_chain: list[tuple[str, str, str, int]] = []
        self.possession_id = 1
        self.possession_started_at = 0
        self.possession_regain_rel = 50.0
        self.possession_regain_reason = "kickoff"
        # Second-phase shape retention (settled attacking structure): when a team
        # wins the ball straight back from a defensive relief action while still
        # camped high, its attacking shape has not dissolved back to a cold start.
        self.possession_shape_credit = 0
        self._last_loss: dict[str, tuple[int, int, float]] = {}
        # Receiving-pocket scan cache: players re-scan for space every few seconds
        # rather than every tick (a realistic scanning cadence, and cheap).
        self._pocket_cache: dict[str, tuple[int, float, float]] = {}
        # Time of each team's last defensive relief action (clearance/block/parry).
        # Drives short-lived post-relief reorganization; never a defensive bonus.
        self._last_relief: dict[str, int] = {}
        # Observational pressing-episode tracking (validation instrumentation).
        # State is engine-internal bookkeeping only: it is written by the pressing
        # branch, read by nothing in football resolution, and summarized into
        # press_log when config.press_debug is set. No RNG, no events.
        self._press_active: dict[str, dict] = {}
        self.press_log: list[dict] = []
        self.possession_changes = 0
        self.substitutions_used = {home.team_id: 0, away.team_id: 0}
        self.coach_mode = {home.team_id: "BASE", away.team_id: "BASE"}
        self.base_tactics = {home.team_id: home.tactics, away.team_id: away.tactics}
        self.base_formations = {home.team_id: home.formation_name, away.team_id: away.formation_name}
        self.next_coach_check = 55 * 60
        self.states = self._initialize_states()
        self.possession_team = "HOME" if self.rng.uniform("kickoff") < 0.5 else "AWAY"
        self.first_kickoff_team = self.possession_team
        self.halftime_done = False
        kickoff = self._kickoff_player(self.possession_team)
        self.ball = BallState(Vec2(50, 50), BallControlState.CONTROLLED, self.possession_team, kickoff.player.player_id)
        kickoff.pos = Vec2(50, 50)
        self.next_decision_at = 1
        self._last_decision_clock = 0
        self._prev_carrier_gap = None
        self._reception_ready_at = None
        self._st_support_cache = {}
        self._st_primary_cache = {}
        self._st_relief_cache = {}
        self._full_time_recorded = False
        self._record_event("KICKOFF", self.possession_team, kickoff, {"seed": seed})

    # ------------------------------------------------------------------
    # Core state helpers
    # ------------------------------------------------------------------
    def _initialize_states(self) -> dict[str, PlayerState]:
        result: dict[str, PlayerState] = {}
        for team in (self.home, self.away):
            anchors = anchors_for(team.team_id, team.formation_name)
            for slot, player in team.lineup.items():
                anchor = anchors[slot]
                instructions = team.instructions.get(slot, default_instructions(slot))
                result[player.player_id] = PlayerState(player, team.team_id, slot, anchor, anchor, anchor, instructions)
        return result

    def _team_states(self, team_id: str, active_only: bool = True) -> list[PlayerState]:
        return [s for s in self.states.values() if s.team_id == team_id and (s.active or not active_only)]

    def _opp_id(self, team_id: str) -> str:
        return "AWAY" if team_id == "HOME" else "HOME"

    def _kickoff_player(self, team_id: str) -> PlayerState:
        active = self._team_states(team_id)
        st = next((s for s in active if s.slot == "ST"), None)
        return st or active[0]

    def _carrier(self) -> PlayerState:
        pid = self.ball.controlling_player_id
        if pid is None or pid not in self.states or not self.states[pid].active:
            # Defensive fallback for impossible state: nearest active player to ball gains control.
            candidates = self._team_states(self.possession_team)
            winner = min(candidates, key=lambda s: distance_m(s.pos, self.ball.pos))
            self.ball.controlling_player_id = winner.player.player_id
            self.ball.controlling_team_id = winner.team_id
            self.ball.control_state = BallControlState.CONTROLLED
            return winner
        return self.states[pid]

    def _record_event(self, event_type: str, team_id: str | None, actor: PlayerState | None, detail: dict[str, Any]) -> None:
        self.event_id += 1
        detail = dict(detail)
        detail.setdefault("possession_id", self.possession_id)
        self.events.append(Event(
            event_id=self.event_id,
            timestamp=self.clock,
            event_type=event_type,
            team_id=team_id,
            actor_id=actor.player.player_id if actor else None,
            actor_name=actor.player.name if actor else None,
            detail=detail,
        ))

    def _start_dead_ball(self, seconds: int, reason: str) -> None:
        seconds = max(0, int(seconds))
        if seconds <= 0:
            return
        self.dead_until = max(self.dead_until, self.clock + seconds)
        self.dead_reason = reason

    def _active_play(self) -> bool:
        return self.clock >= self.dead_until

    def _effective_pressure(self, s: PlayerState, pressure: float) -> float:
        """Composure = resistance to pressure-induced execution degradation.

        Returns the pressure that actually degrades THIS player's execution. At
        zero pressure the result is zero regardless of Composure (§ no boost on
        clean actions); high Composure preserves more of the player's own
        technical level under real pressure, it never manufactures skill. Applied
        only inside execution formulas — never in decisions, recognition, chance
        quality (xG), or pressure context records — so nothing is double-counted.
        """
        return pressure * clamp(1.0 - 0.15 * self._g_eff(s, "composure"), 0.72, 1.28)

    def _g_eff(self, state: PlayerState, attr: str) -> float:
        return self.norm.g(attr, effective_attribute(state.player, state, attr))

    @staticmethod
    def _mass_term(s: PlayerState) -> float:
        kg = s.player.weight_kg if s.player.weight_kg is not None else 78.0
        return math.tanh((kg - 78.0) / 18.0)

    @staticmethod
    def _height_term(s: PlayerState) -> float:
        cm = s.player.height_cm if s.player.height_cm is not None else 183.0
        return math.tanh((cm - 183.0) / 12.0)

    def _transition_strength_at_turnover(self, winning_team: str, losing_team: str, reason: str) -> float:
        """Describe how much broken-field opportunity the turnover actually created.

        A turnover is not automatically a counterattack.  A clearance recovered against a
        ten-man low block is very different from stealing the ball while six opponents are
        ahead of it.  This state is reconstructed from geometry and the turnover mechanism;
        it never multiplies scoring directly.
        """
        defenders = [s for s in self._team_states(losing_team) if s.slot != "GK"]
        if not defenders:
            return 1.0
        org = self._defensive_organization(winning_team)
        rels = [attack_relative_x(losing_team, s.pos) for s in defenders]
        # Players meaningfully committed into the losing team's attacking half are less
        # available as rest defense after the turnover.
        advanced = sum(1.0 for r in rels if r >= 58.0) + 0.45 * sum(1.0 for r in rels if 50.0 <= r < 58.0)
        commitment = clamp((advanced - 1.5) / 5.0, 0.0, 1.0)
        broken_shape = 1.0 - org
        strength = 0.58 * broken_shape + 0.42 * commitment
        r = str(reason).lower()
        # Second balls after emergency clearances can still be dangerous, but they are not
        # treated like open-field counters unless the defending geometry really collapsed.
        if "clear" in r or "goal_kick" in r or "throw_in" in r or "free_kick" in r:
            strength *= 0.42 + 0.58 * broken_shape
        # A clean high regain/tackle/interception can generate a transition even if the
        # loser had not committed huge numbers, provided the actual shape is exposed.
        if any(k in r for k in ("tackle", "intercept", "dribble", "heavy_touch", "through", "shield")):
            strength += 0.10 * broken_shape
        return clamp(strength, 0.0, 1.0)

    # Defensive relief actions: the ball is cleared away from danger but the
    # defending side does not establish control. If the attacking side recovers
    # it quickly and high, the attack continues as a second phase.
    SECOND_PHASE_REASONS = frozenset({
        "clearance", "aerial_clearance", "cross_clearance", "corner_clearance",
        "shot_block", "gk_parry", "gk_punch",
    })

    def _change_possession(self, team_id: str, player: PlayerState, reason: str) -> None:
        # Regain tempo is a tactical identity, not a universal turbo: only a
        # COUNTER plan attacks the moment of the turnover at speed; other plans
        # stabilize first. (Universal urgent regains doubled match xG in the
        # staged multiseed - rejected.)
        _regain_urgent = self.teams[team_id].tactics.after_winning_possession == "COUNTER"
        self._schedule_reception_ready(0.55, urgent=_regain_urgent)
        if self.possession_team != team_id:
            old = self.possession_team
            duration = max(0, self.clock - self.possession_started_at)
            transition_strength = self._transition_strength_at_turnover(team_id, old, reason)
            self.last_turnover_time = self.clock
            self.last_turnover_loser = old
            self.last_transition_strength = transition_strength
            self.possession_changes += 1
            # Second-phase shape retention: a side that just lost the ball high and
            # immediately wins it back from a clearance/block/parry resumes with part
            # of its settled-attack maturity intact. This seeds only the spatial
            # probe state; ledger durations, transition logic and all scoring math
            # are untouched, and the credit is bounded and decays into a normal
            # possession age.
            self._last_loss[old] = (self.clock, duration, attack_relative_x(old, player.pos))
            credit = 0
            lost = self._last_loss.get(team_id)
            if lost is not None and reason in self.SECOND_PHASE_REASONS:
                lost_t, lost_age, lost_rel = lost
                regain_rel_now = attack_relative_x(team_id, player.pos)
                if self.clock - lost_t <= 12 and lost_rel >= 55.0 and regain_rel_now >= 52.0:
                    credit = min(9, int(0.65 * (lost_age + (self.clock - lost_t))))
            self.possession_shape_credit = credit
            self._record_event("POSSESSION_CHANGE", team_id, player, {
                "from": old, "to": team_id, "reason": reason,
                "previous_possession_id": self.possession_id,
                "previous_duration_s": duration,
                "transition_strength": round(transition_strength, 4),
                "shape_credit_s": credit,
            })
            self.possession_id += 1
            self.possession_started_at = self.clock
            self.possession_regain_rel = attack_relative_x(team_id, player.pos)
            self.possession_regain_reason = str(reason)
            self.pass_chain = []
            self.last_completed_pass = None
        self.possession_team = team_id
        self.ball = BallState(player.pos, BallControlState.CONTROLLED, team_id, player.player.player_id, BallHeightState.GROUND, player.player.player_id)

    def _restart_controlled_possession(self, team_id: str, player: PlayerState, reason: str) -> None:
        """Start a new possession after a dead-ball restart without labeling it a turnover.

        Goals/halftime kickoffs must reset possession age and transition history; otherwise
        a new kickoff can inherit a mature settled-attack state from before the stoppage.
        """
        self._schedule_reception_ready(0.55, urgent=False)
        self.possession_id += 1
        self.possession_started_at = self.clock
        self.possession_regain_rel = attack_relative_x(team_id, player.pos)
        self.possession_regain_reason = str(reason)
        self.pass_chain = []
        self.last_completed_pass = None
        self.possession_shape_credit = 0
        self._last_loss = {}
        self.last_turnover_time = -999
        self.last_turnover_loser = None
        self.last_transition_strength = 0.0
        self.possession_team = team_id
        self.ball = BallState(player.pos, BallControlState.CONTROLLED, team_id, player.player.player_id, BallHeightState.GROUND, player.player.player_id)
        self._record_event("RESTART_POSSESSION", team_id, player, {"reason": reason})

    def _note_completed_pass(self, team_id: str, passer_id: str, receiver_id: str) -> None:
        item = (team_id, passer_id, receiver_id, self.clock)
        self.last_completed_pass = item
        self.pass_chain.append(item)
        # Only recent passes in the current possession matter for assist-chain attribution.
        self.pass_chain = [p for p in self.pass_chain[-4:] if self.clock - p[3] <= 20]

    def _transition_age(self, attacking_team: str) -> int:
        if self.possession_team != attacking_team or self.last_turnover_loser != self._opp_id(attacking_team):
            return 999
        return max(0, self.clock - self.last_turnover_time)

    def _is_transition_attack(self, attacking_team: str) -> bool:
        age = self._transition_age(attacking_team)
        # A possession only enters the transition branch if the turnover actually created
        # enough broken-field exposure.  Merely changing possession is not sufficient.
        if self.last_transition_strength < 0.30:
            return False
        if age <= self.cal.transition_window_seconds:
            return True
        if age > self.cal.transition_max_seconds:
            return False
        # A transition persists only while both the original opportunity was meaningful
        # and the defending geometry remains visibly broken.
        return self._defensive_organization(attacking_team) < self.cal.transition_recovery_org_threshold

    def _possession_age(self) -> int:
        return max(0, self.clock - self.possession_started_at)

    def _settled_probe(self, team_id: str) -> float:
        """0..1 measure of a controlled attack maturing through sustained possession.

        This is deliberately not a scoring or xG modifier. It is used only to move
        intelligent attackers into better support positions and to make high-confidence
        progressive actions more attractive after a team has patiently established
        possession. Transitions return zero because their chance ecology is handled by
        turnover space/organization instead.
        """
        if self.possession_team != team_id or self._is_transition_attack(team_id):
            return 0.0
        ball_rel = attack_relative_x(team_id, self.ball.pos)
        if ball_rel < 52.0:
            return 0.0
        age = self._possession_age() + self.possession_shape_credit
        start = self.cal.settled_probe_start_seconds
        full = max(start + 1, self.cal.settled_probe_full_seconds)
        time_factor = clamp((age - start) / (full - start), 0.0, 1.0)
        territory = clamp((ball_rel - 52.0) / 28.0, 0.0, 1.0)
        tempo = self.teams[team_id].tactics.build_up_tempo
        tempo_factor = {"PATIENT": 1.0, "BALANCED": 0.78, "QUICK": 0.42}.get(tempo, 0.78)
        after_win = self.teams[team_id].tactics.after_winning_possession
        security = {"SECURE": 0.25, "BALANCED": 1.0, "COUNTER": 0.58}.get(after_win, 1.0)
        return clamp(time_factor * (0.55 + 0.45 * territory) * tempo_factor * security, 0.0, 1.0)

    def _defensive_organization(self, attacking_team: str) -> float:
        """Geometry-derived 0..1 defensive organization against the current attack.

        This is deliberately not a tactic bonus. It is reconstructed from where the
        defenders actually are: goal-side coverage, central protection, back-line
        coherence, and current transition recovery.
        """
        defending_team = self._opp_id(attacking_team)
        defenders = [s for s in self._team_states(defending_team) if s.slot != "GK"]
        if not defenders:
            return 0.0
        ball_rel = attack_relative_x(attacking_team, self.ball.pos)
        goal_side = [s for s in defenders if attack_relative_x(attacking_team, s.pos) >= ball_rel - 1.5]
        goal_side_ratio = len(goal_side) / len(defenders)
        central_cover = sum(1 for s in goal_side if abs(s.pos.y - 50.0) <= 27.0)
        central_ratio = min(1.0, central_cover / 4.0)
        backline = [s for s in defenders if s.slot in {"LB", "LCB", "RCB", "RB"}]
        if len(backline) >= 2:
            xs = [attack_relative_x(attacking_team, s.pos) for s in backline]
            mean_x = sum(xs) / len(xs)
            sd = math.sqrt(sum((x - mean_x) ** 2 for x in xs) / len(xs))
            line_coherence = 1.0 - clamp(sd / 10.0, 0.0, 1.0)
        else:
            line_coherence = 0.55
        org = 0.48 * goal_side_ratio + 0.30 * central_ratio + 0.22 * line_coherence
        return clamp(org, 0.0, 1.0)

    def _set_block_resistance(self, attacking_team: str) -> float:
        """0..1 geometry-derived resistance of an organized/deep defense to central entry.

        This is not a scoring modifier.  It only informs action utility and support movement:
        direct balls into a compact deep line become less attractive, while recycling/wide
        routes become relatively more attractive.
        """
        org = self._defensive_organization(attacking_team)
        line = self._offside_line(attacking_team)
        # "Set-block" resistance is meant for genuinely deep compact shells, not every
        # organized mid block. Starting it too early made controlled-v-controlled football
        # sterile because ordinary central progression was treated like a ten-man low block.
        deepness = clamp((line - 78.0) / 16.0, 0.0, 1.0)
        defenders = [d for d in self._team_states(self._opp_id(attacking_team)) if d.slot != "GK"]
        central = 0.0
        for d in defenders:
            rel = attack_relative_x(attacking_team, d.pos)
            if rel >= 68.0 and abs(d.pos.y - 50.0) <= 28.0:
                central += 1.0
        central_density = clamp((central - 2.0) / 5.0, 0.0, 1.0)
        return clamp(org * (0.08 + 0.67 * deepness + 0.25 * central_density * deepness), 0.0, 1.0)

    def _shot_lane_density(self, attacking_team: str, origin: Vec2) -> float:
        goal = goal_center(attacking_team)
        influence = 0.0
        for d in self._team_states(self._opp_id(attacking_team)):
            if d.slot == "GK":
                continue
            perp, along = point_segment_distance_m(d.pos, origin, goal)
            near = distance_m(d.pos, origin)
            # A defender tight to the shooter can obstruct the strike before the ball
            # has travelled far enough to register as a conventional lane block.  The
            # old geometry ignored along≈0 and therefore treated shoulder-to-shoulder
            # shots as having an empty lane.
            if near <= 2.6 and along >= -0.04:
                influence += 0.90 * sigmoid((2.15 - near) / 0.52)
                continue
            if 0.02 < along < 0.98 and perp <= 5.0:
                influence += sigmoid((3.0 - perp) / 0.9)
        return clamp(influence / 2.2, 0.0, 1.0)

    # ------------------------------------------------------------------
    # Positioning / movement / workload
    # ------------------------------------------------------------------
    def _offside_line(self, attacking_team: str) -> float:
        defenders = self._team_states(self._opp_id(attacking_team))
        rel = sorted((attack_relative_x(attacking_team, d.pos) for d in defenders), reverse=True)
        if len(rel) < 2:
            return 100.0
        return rel[1]

    def _offside_margin(self, carrier: PlayerState, target: PlayerState) -> float:
        target_rel = attack_relative_x(carrier.team_id, target.pos)
        if target_rel <= 50.0:
            return -99.0
        ball_rel = attack_relative_x(carrier.team_id, carrier.pos)
        line = max(50.0, ball_rel, self._offside_line(carrier.team_id))
        return target_rel - line

    _ST_LINE = {"LB": "back", "LCB": "back", "RCB": "back", "RB": "back",
                "CDM": "dm", "LDM": "dm", "RDM": "dm",
                "LCM": "mid", "RCM": "mid", "LM": "mid", "RM": "mid",
                "LW": "att", "RW": "att", "LAM": "att", "CAM": "att", "RAM": "att", "ST": "att"}

    def _phase_shift(self, s: PlayerState, team, ball_rel_x: float) -> float:
        """Family B: possession-phase translation of the formation skeleton.

        Formation anchors remain the identity; each LINE receives one common
        shift so intra-line spacing (and therefore 4-3-3 vs 4-2-3-1 identity)
        is preserved. Past halfway the back/DM/mid lines advance behind the
        ball toward real rest-offense depths instead of the flat 0.24 coupling;
        the effect ramps in continuously from ball_rel_x 50 to 62 and is scaled
        by progression risk. Transition windows keep the stretched production
        behavior so counters do not march as a block. Purely positional -
        no probability, execution or attribute change.
        """
        prod = (ball_rel_x - 50.0) * 0.24
        grp = self._ST_LINE.get(s.slot)
        if not ST["B"] or grp is None or grp == "att":
            return prod
        if ball_rel_x <= 50.0:
            return prod
        if self._transition_age(s.team_id) <= self.cal.transition_window_seconds:
            return prod
        risk = team.tactics.progression_risk
        adj = {"SECURE": -4.0, "BALANCED": 0.0, "AMBITIOUS": 4.0}.get(risk, 0.0)
        cap = {"back": {"SECURE": 40.0, "BALANCED": 46.0, "AMBITIOUS": 52.0},
               "dm": {"SECURE": 58.0, "BALANCED": 64.0, "AMBITIOUS": 70.0},
               "mid": {"SECURE": 70.0, "BALANCED": 76.0, "AMBITIOUS": 80.0}}[grp].get(risk, 46.0)
        line_target = {"back": 0.52 * ball_rel_x - 3.0,
                       "dm": 0.60 * ball_rel_x + 4.0,
                       "mid": 0.62 * ball_rel_x + 10.0}[grp] + adj
        line_target = min(line_target, cap)
        mates = [m for m in self._team_states(s.team_id)
                 if m.active and self._ST_LINE.get(m.slot) == grp]
        if mates:
            line_anchor = sum(attack_relative_x(s.team_id, m.home_anchor) for m in mates) / len(mates)
        else:
            line_anchor = attack_relative_x(s.team_id, s.home_anchor)
        new_shift = line_target - line_anchor
        w = clamp((ball_rel_x - 50.0) / 12.0, 0.0, 1.0)
        return (1.0 - w) * prod + w * new_shift

    def _desired_target(self, s: PlayerState) -> Vec2:
        if not s.active:
            return s.pos
        team_id = s.team_id
        team = self.teams[team_id]
        ball = self.ball.pos
        anchor_rel_x = attack_relative_x(team_id, s.home_anchor)
        ball_rel_x = attack_relative_x(team_id, ball)
        in_possession = self.possession_team == team_id
        atk_eff = effort01(s.instructions.attack_effort)
        def_eff = effort01(s.instructions.defense_effort)

        if s.slot == "GK":
            gk_role = s.instructions.defense_role.upper()
            base_depth = {"LINE_KEEPER": 4.5, "SWEEPER": 6.5, "AGGRESSIVE_SWEEPER": 8.5, "AREA_COMMANDER": 5.5}.get(gk_role, 5.0)
            advance = 0.05 * max(0.0, ball_rel_x - 35.0)
            if gk_role == "SWEEPER":
                advance *= 1.45
            elif gk_role == "AGGRESSIVE_SWEEPER":
                advance *= 2.0
            target_rel_x = clamp(base_depth + advance, 3.5, 18.0)
            return from_attack_frame(team_id, target_rel_x, clamp(50 + 0.08 * (ball.y - 50), 35, 65))

        if in_possession:
            shift = self._phase_shift(s, team, ball_rel_x)
            target_rel_x = anchor_rel_x + shift
            role = s.instructions.attack_role.upper()
            role_forward = {
                "OVERLAP": 13, "UNDERLAP": 10, "ADVANCE_SUPPORT": 8, "RUNNER": 9, "WIDE_RUNNER": 7,
                "CREATOR": 4, "SECOND_STRIKER": 9, "INSIDE_FORWARD": 7,
                "FREE_FORWARD": 6, "RUN_BEHIND": 8, "POACHER": 5,
                "LINK": -5, "DROP_BETWEEN_CBS": -8, "ANCHOR": -2,
            }.get(role, 0)
            # Link forwards drop during build-up, but they still re-enter/occupy the box
            # once a settled attack reaches the final third. Without this phase dependency
            # a "Link" striker becomes permanently detached from scoring positions.
            if role == "LINK" and ball_rel_x >= 64.0:
                role_forward += 2.5 * clamp((ball_rel_x - 64.0) / 18.0, 0.0, 1.0)
            target_rel_x += role_forward * atk_eff

            # Family B: deep-buildup compression from the top. Forwards do not
            # hold a 45-unit gap above their own team's first-phase possession;
            # they cap their height relative to the ball so the block stays
            # connected. Direct teams keep more stretch (early outlets), short
            # teams compress more; runner roles hold the higher edge of the cap.
            if ST["B"] and ball_rel_x <= 42.0 and s.slot in {"LW","RW","LM","RM","LAM","CAM","RAM","ST"} \
                    and self._transition_age(team_id) > self.cal.transition_window_seconds:
                cap_gap = 34.0
                cap_gap += {"SHORT": -4.0, "MIXED": 0.0, "DIRECT": 6.0}.get(team.tactics.passing_directness, 0.0)
                if s.slot == "ST":
                    cap_gap += 4.0
                if role in {"RUN_BEHIND", "POACHER"}:
                    cap_gap += 4.0
                target_rel_x = min(target_rel_x, ball_rel_x + cap_gap)

            # Transition instructions alter how many players actually run beyond the ball.
            # This creates/reduces space after turnovers rather than changing execution skill.
            transition_age = self._transition_age(team_id)
            if transition_age <= self.cal.transition_window_seconds:
                if team.tactics.after_winning_possession == "COUNTER":
                    transition_run = 8.0 if s.slot in {"LW","RW","LM","RM","ST","LAM","CAM","RAM"} else 4.5
                    target_rel_x += transition_run * atk_eff
                elif team.tactics.after_winning_possession == "SECURE":
                    secure_hold = 5.0 if s.slot in {"LW","RW","LM","RM","ST","LAM","CAM","RAM"} else 2.5
                    target_rel_x -= secure_hold * atk_eff

            # Post-regain stabilization.  Winning the ball deep does not instantly mean the
            # back line expands to its in-possession formation.  Secure teams keep the
            # defensive shell connected until the first phase is stabilized; countering
            # teams deliberately release that restraint.  This is particularly important
            # after saves/clearances where losing the second ball should not fabricate an
            # open-field transition that the defending team never committed to.
            regain_age = self._possession_age()
            if self.possession_regain_rel <= 32.0 and regain_age <= 9:
                release = clamp(regain_age / 9.0, 0.0, 1.0)
                behavior = team.tactics.after_winning_possession
                hold_strength = {"SECURE": 1.0, "BALANCED": 0.50, "COUNTER": 0.0}.get(behavior, 0.50) * (1.0 - release)
                if hold_strength > 0.0:
                    current_rel = attack_relative_x(team_id, s.pos)
                    allowance = {
                        "LB": 2.0, "LCB": 1.5, "RCB": 1.5, "RB": 2.0,
                        "CDM": 2.5, "LDM": 2.5, "RDM": 2.5,
                        "LCM": 4.0, "RCM": 4.0, "LM": 4.5, "RM": 4.5,
                    }.get(s.slot)
                    if allowance is not None:
                        expansion_cap = current_rel + allowance + release * 6.0
                        target_rel_x = (1.0 - hold_strength) * target_rel_x + hold_strength * min(target_rel_x, expansion_cap)

            # Risk/directness affect supporting depth, never player attributes.
            if s.slot not in {"GK", "LCB", "RCB"}:
                target_rel_x += {"SECURE": -1.2, "BALANCED": 0.0, "AMBITIOUS": 2.2}.get(team.tactics.progression_risk, 0.0) * atk_eff
                target_rel_x += {"SHORT": -1.0, "MIXED": 0.0, "DIRECT": 1.6}.get(team.tactics.passing_directness, 0.0) * atk_eff

            # Box commitment controls how many supporting players occupy the final line.
            # The ST still attacks the box in cautious systems, but fullbacks/midfielders stay safer.
            if ball_rel_x >= 62 and s.slot not in {"LCB", "RCB", "GK"}:
                if team.tactics.box_commitment == "CAUTIOUS":
                    by_slot = {"ST": 1.0, "LW": 0.5, "RW": 0.5, "LM": 0.0, "RM": 0.0, "LAM": 0.5, "CAM": 1.0, "RAM": 0.5,
                               "LCM": -2.0, "RCM": -2.0, "LDM": -4.0, "RDM": -4.0, "CDM": -5.0, "LB": -5.0, "RB": -5.0}
                elif team.tactics.box_commitment == "COMMIT":
                    if team.tactics.chance_creation_focus == "WIDE":
                        # Wide attacks still commit bodies, but most midfield/fullback support
                        # occupies the edge/cutback lanes instead of stacking six players on
                        # the six-yard line. Far-side forwards remain the primary extra targets.
                        by_slot = {"ST": 3.0, "LW": 5.0, "RW": 5.0, "LM": 4.0, "RM": 4.0, "LAM": 5.0, "CAM": 5.0, "RAM": 5.0,
                                   "LCM": 3.0, "RCM": 3.0, "LDM": 1.5, "RDM": 1.5, "CDM": 0.5, "LB": 2.0, "RB": 2.0}
                    else:
                        # Commit means more forward occupation, not every supporting player
                        # charging the six-yard box. Midfield/fullback depth is deliberately
                        # bounded so open games create more chances through broken geometry
                        # without turning every settled attack into a five-yard shot.
                        by_slot = {"ST": 3.0, "LW": 5.0, "RW": 5.0, "LM": 4.0, "RM": 4.0, "LAM": 5.0, "CAM": 5.5, "RAM": 5.0,
                                   "LCM": 4.0, "RCM": 4.0, "LDM": 2.0, "RDM": 2.0, "CDM": 1.0, "LB": 3.5, "RB": 3.5}
                else:
                    by_slot = {}
                target_rel_x += by_slot.get(s.slot, 0.0) * atk_eff

            # Final-third occupation is phase dependent. Even controlled teams send their
            # primary scorer and selected support players into useful scoring zones once the
            # ball is established high up the pitch; cautious systems simply send fewer of
            # them. Attacking Position controls how effectively each player finds that depth.
            if ball_rel_x >= 64.0 and s.slot in {"LM","RM","LW","RW","LCM","RCM","LAM","CAM","RAM","ST","LB","RB"}:
                final_phase = clamp((ball_rel_x - 64.0) / 20.0, 0.0, 1.0)
                pos_skill = sigmoid(1.2 * self._g_eff(s, "attacking_position"))
                commit = {"CAUTIOUS": 0.45, "BALANCED": 0.95, "COMMIT": 1.15}.get(team.tactics.box_commitment, 0.95)
                slot_depth = {
                    "ST": 5.5, "LW": 3.0, "RW": 3.0, "LM": 2.8, "RM": 2.8,
                    "LAM": 3.4, "CAM": 3.6, "RAM": 3.4, "LCM": 1.8, "RCM": 1.8,
                    "LB": 1.0, "RB": 1.0,
                }.get(s.slot, 0.0)
                target_rel_x += slot_depth * final_phase * commit * atk_eff * (0.65 + 0.55 * pos_skill)

            # Chance-creation focus changes occupation of lanes/space.
            if team.tactics.chance_creation_focus == "VERTICAL" and s.slot in {"LW","RW","LM","RM","ST","LAM","CAM","RAM","LCM","RCM"}:
                target_rel_x += 2.8 * atk_eff

            # Against a genuinely set deep shell, intelligent attacking occupation becomes
            # staggered rather than placing six players on the same last line.  The striker
            # can still pin the centre-backs, while midfield/fullback support occupies edge,
            # recycle and cutback zones.  This is derived from current defensive geometry,
            # so it disappears automatically against an open/high line and never changes
            # technical execution or scoring probability directly.
            if ball_rel_x >= 58.0:
                shell = self._set_block_resistance(team_id)
                if shell >= 0.38:
                    stagger = {
                        "LB": 9.0, "RB": 9.0, "CDM": 8.5, "LDM": 8.0, "RDM": 8.0,
                        "LCM": 7.5, "RCM": 7.5, "LM": 4.8, "RM": 4.8,
                        "LW": 4.5, "RW": 4.5, "LAM": 5.5, "CAM": 6.0, "RAM": 5.5,
                    }.get(s.slot, 0.0)
                    if team.tactics.chance_creation_focus == "WIDE" and s.slot in {"LM", "RM", "LW", "RW"}:
                        stagger *= 0.55
                    target_rel_x -= stagger * shell * (0.70 + 0.30 * atk_eff)
        else:
            shift = (ball_rel_x - 50.0) * 0.14
            target_rel_x = anchor_rel_x + shift
            block = team.tactics.defensive_block_height
            target_rel_x += {"DEEP": -7.0, "MID": 0.0, "HIGH": 7.0}.get(block, 0.0)
            target_rel_x += {"DROP": -3.0, "HOLD": 0.0, "STEP_UP": 3.0}.get(team.tactics.defensive_line_behavior, 0.0)
            # In the defending third the block compresses vertically. A low/mid block
            # should form connected lines rather than preserve kickoff-template gaps.
            # This is positional geometry, not a defensive attribute boost.
            # Post-relief reorganization: a block that has just cleared/blocked its
            # box holds its compressed lines while the ball is loose or being
            # recycled, instead of instantly stepping up after the cleared ball.
            # Deep blocks reform longest; a high press keeps its step-up-and-squeeze
            # identity. Spatial recovery only — no defensive attribute changes.
            reform_window = {"DEEP": 7, "MID": 4, "HIGH": 0}.get(block, 4)
            reforming = self.clock - self._last_relief.get(team_id, -999) <= reform_window
            if ball_rel_x <= 42.0 or (reforming and ball_rel_x <= 60.0):
                back_depth = {"DEEP": 11.5, "MID": 16.0, "HIGH": 23.0}.get(block, 16.0)
                back_depth += {"DROP": -1.5, "HOLD": 0.0, "STEP_UP": 2.0}.get(team.tactics.defensive_line_behavior, 0.0)
                band_gap = {
                    "LB": 2.0, "LCB": 0.0, "RCB": 0.0, "RB": 2.0,
                    "CDM": 10.0, "LDM": 10.0, "RDM": 10.0,
                    "LCM": 19.0, "RCM": 19.0, "LM": 19.0, "RM": 19.0,
                    "LW": 25.0, "RW": 25.0, "LAM": 23.0, "CAM": 23.0, "RAM": 23.0,
                    "ST": 31.0,
                }.get(s.slot, 20.0)
                target_rel_x = min(target_rel_x, back_depth + band_gap)
            # Regroup immediately pulls players toward the protected side of the ball;
            # counterpress instead leaves the spatial risk to the pressing branch below.
            if self.last_turnover_loser == team_id and self.clock - self.last_turnover_time <= self.cal.transition_window_seconds:
                if team.tactics.after_losing_possession == "REGROUP":
                    target_rel_x -= 5.0 * def_eff
            if s.instructions.defense_role.upper() == "STAY_HIGH":
                target_rel_x += 6.0

        # Width behavior.
        if in_possession:
            width_pull = {"WIDE": 0.04, "BALANCED": 0.13, "NARROW": 0.24}.get(team.tactics.attacking_width, 0.13)
        else:
            width_pull = {"WIDE": 0.06, "BALANCED": 0.15, "NARROW": 0.28}.get(team.tactics.defensive_width, 0.15)
        target_y = s.home_anchor.y + width_pull * (ball.y - s.home_anchor.y)

        role = (s.instructions.attack_role if in_possession else s.instructions.defense_role).upper()
        if in_possession and role in {"INSIDE_FORWARD", "INVERT", "UNDERLAP"}:
            target_y += (50.0 - target_y) * (0.35 + 0.35 * atk_eff)
        elif in_possession and role in {"TOUCHLINE_WINGER", "OVERLAP"}:
            edge = 8.0 if s.home_anchor.y < 50 else 92.0
            target_y += (edge - target_y) * (0.25 + 0.35 * atk_eff)
        elif in_possession and role in {"FREE_FORWARD", "ROAMER"}:
            target_y += (ball.y - target_y) * 0.25
        elif not in_possession and role in {"TUCK_IN", "TUCK_INTO_BLOCK", "SCREEN", "BACKLINE_COVER"}:
            target_y += (50.0 - target_y) * (0.25 + 0.35 * def_eff)

        if in_possession and team.tactics.chance_creation_focus == "CENTRAL" and s.slot not in {"GK","LCB","RCB"}:
            target_y += (50.0 - target_y) * 0.16
        elif in_possession and team.tactics.chance_creation_focus == "WIDE" and s.slot in {"LB","RB","LW","RW","LAM","RAM"}:
            edge = 8.0 if s.home_anchor.y < 50 else 92.0
            target_y += (edge - target_y) * 0.16

        # A patient settled attack should not mean "stop attacking". Once possession has
        # matured in advanced territory, technically/intelligently strong attackers probe
        # a little beyond their conservative anchors. The effect is spatial and depends on
        # Attack Effort + Attacking Position, so weak/passive attackers still create little.
        if in_possession:
            probe = self._settled_probe(team_id)
            if probe > 0 and s.slot in {"LM","RM","LW","RW","LCM","RCM","LAM","CAM","RAM","ST"}:
                pos_skill = sigmoid(1.15 * self._g_eff(s, "attacking_position"))
                role_factor = {
                    "LINK": 0.70, "CONTROLLER": 0.62, "CREATOR": 0.88, "WIDE_SUPPORT": 0.72,
                    "WIDE_CREATOR": 0.82, "RUNNER": 1.0, "SECOND_STRIKER": 1.08,
                    "INSIDE_FORWARD": 1.02, "RUN_BEHIND": 1.05, "POACHER": 1.0,
                }.get(s.instructions.attack_role.upper(), 0.70)
                commitment = {"CAUTIOUS": 0.76, "BALANCED": 1.00, "COMMIT": 1.08}.get(team.tactics.box_commitment, 0.92)
                target_rel_x += self.cal.settled_probe_forward_depth * probe * atk_eff * (0.55 + 0.65 * pos_skill) * role_factor * commitment
                # Advanced central attackers find pockets between lines; wide support keeps
                # enough width to avoid turning patient attacks into a central pile-up.
                if s.slot in {"LCM","RCM","LAM","CAM","RAM","ST"}:
                    target_y += (50.0 - target_y) * (0.06 + 0.12 * probe * pos_skill)
            # Receiving pockets and coordinated box occupation. Advanced supporters do
            # not run to a formation-relative spot regardless of who is standing there:
            # they scan nearby space and adjust toward a real receiving pocket (away
            # from defenders, separated from teammates, inside passing range) and, on
            # the box approach, toward a role-appropriate arrival lane. This changes
            # only movement targets; reaching the pocket costs real fatigue-limited
            # movement and no pass/shot/duel probability reads it directly.
            support_slots = {"ST", "LW", "RW", "LM", "RM", "LAM", "CAM", "RAM", "LCM", "RCM"}
            if ball_rel_x >= 55.0 and (s.slot in support_slots or (s.slot in {"LB", "RB"} and ball_rel_x >= 66.0)):
                target_rel_x, target_y = self._support_pocket(s, team_id, target_rel_x, target_y, atk_eff)
            # Family C: deep-phase support/checking movement. Designated nearby
            # players genuinely offer for the ball, creating the passing
            # triangles the selector can already evaluate. Blend strength
            # scales with Attack Effort; count/radius with directness.
            if ST["C"] and self.ball.control_state == BallControlState.CONTROLLED:
                if ball_rel_x <= 48.0:
                    sup = self._st_buildup_supporters(team_id)
                    if s.player.player_id in sup:
                        pt = self._st_support_point(s, team_id, atk_eff)
                        if pt is not None:
                            k = 0.72 + 0.18 * atk_eff
                            target_rel_x = (1.0 - k) * target_rel_x + k * pt[0]
                            target_y = (1.0 - k) * target_y + k * pt[1]
                elif s.slot in {"CDM", "LDM", "RDM", "LCM", "RCM"}:
                    # Family C (advanced relief): the pivot/nearest central mid
                    # shows behind the ball as a pressure valve, giving the
                    # advanced carrier a real recycle option instead of an
                    # all-bad menu. One relief man; pure movement.
                    relief = self._st_relief_supporter(team_id)
                    if relief == s.player.player_id:
                        carrier_now = self._carrier()
                        car_rel_now = attack_relative_x(team_id, carrier_now.pos)
                        pt_rel = clamp(car_rel_now - 8.5, 20.0, 80.0)
                        pt_y = carrier_now.pos.y + (50.0 - carrier_now.pos.y) * 0.35
                        k = 0.66 + 0.20 * atk_eff
                        target_rel_x = (1.0 - k) * target_rel_x + k * pt_rel
                        target_y = (1.0 - k) * target_y + k * pt_y

        # Emergency recovery behind the defensive line. Block height is an intended
        # starting line, not permission to hold that line after it has actually been
        # broken. Recovery is therefore triggered in two causal ways: (1) the ball is
        # already in an absolutely deep danger zone, or (2) it has moved goal-side of
        # this player's real current position while still within a threatening central
        # depth. The second condition matters especially for high lines: CBs begin their
        # recovery as soon as the ball gets behind them instead of waiting for the ball
        # to reach the six-yard/penalty-area threshold. Movement remains physical and
        # fatigue-limited; this is a target change, never a defensive ability boost.
        s_rel_x = attack_relative_x(team_id, s.pos)
        deep_penetration = ball_rel_x <= 20.0
        aggressive_line = team.tactics.defensive_block_height == "HIGH" or team.tactics.defensive_line_behavior == "STEP_UP"
        line_broken = aggressive_line and ball_rel_x <= 34.0 and ball_rel_x < s_rel_x - 2.0
        if not in_possession and (deep_penetration or line_broken):
            if s.slot in {"LCB", "RCB"}:
                target_rel_x = min(target_rel_x, max(4.5, ball_rel_x - 1.8))
                target_y += (ball.y - target_y) * 0.20
            elif s.slot in {"LB", "RB"}:
                target_rel_x = min(target_rel_x, max(5.5, ball_rel_x + 0.5))
            elif s.slot in {"CDM", "LDM", "RDM"}:
                target_rel_x = min(target_rel_x, max(8.0, ball_rel_x + 5.0))
            elif s.slot in {"LCM", "RCM", "LM", "RM"}:
                target_rel_x = min(target_rel_x, max(12.0, ball_rel_x + 10.0))

        # Byline defense: when the opponent reaches a wide advanced zone, the nearest
        # fullback closes the delivery while central defenders/midfield screeners protect
        # the near-post and cutback corridors. This changes real geometry only.
        if not in_possession and ball_rel_x <= 22.0 and abs(ball.y - 50.0) >= 24.0:
            side_left = ball.y < 50.0
            if (side_left and s.slot == "LB") or ((not side_left) and s.slot == "RB"):
                target_y += (ball.y - target_y) * (0.38 + 0.24 * def_eff)
                target_rel_x = min(target_rel_x, 16.0)
            if s.slot in {"LCB","RCB","CDM","LDM","RDM","LCM","RCM"}:
                central_strength = 0.18 if s.slot in {"LCM","RCM"} else 0.30
                target_y += (50.0 - target_y) * (central_strength + 0.18 * def_eff)
                if s.slot in {"LCB","RCB"}:
                    target_rel_x = min(target_rel_x, 13.5)
                elif s.slot in {"CDM","LDM","RDM"}:
                    target_rel_x = min(target_rel_x, 20.0)

        # Zonal danger cover: in the defensive third the nearest appropriate CB/DM
        # closes a dangerous central receiver while teammates preserve cover. This is
        # real movement toward the threat, not a hidden marking or xG bonus.
        if not in_possession and ball_rel_x <= 48.0:
            opponents = [o for o in self._team_states(self._opp_id(team_id)) if o.slot != "GK"]
            central_threats = [o for o in opponents if attack_relative_x(self._opp_id(team_id), o.pos) >= 72.0 and abs(o.pos.y - 50.0) <= 25.0]
            if central_threats and s.slot in {"LCB", "RCB"}:
                threat = min(central_threats, key=lambda o: abs(o.pos.y - s.home_anchor.y))
                cb_states = [d for d in self._team_states(team_id) if d.slot in {"LCB", "RCB"}]
                primary = min(cb_states, key=lambda d: abs(threat.pos.y - d.home_anchor.y)) if cb_states else s
                if primary is s:
                    threat_rel = attack_relative_x(team_id, threat.pos)
                    cover_rel = max(8.5, threat_rel - 2.0)
                    # Once the attack has penetrated close to goal, even an aggressive
                    # high-press side stops defending as if it were still in the press.
                    # The nearest CB protects goal-side space more strongly; the earlier
                    # high line still created the transition risk that allowed penetration.
                    if ball_rel_x <= 28.0:
                        blend = 0.70
                    else:
                        blend = 0.58 if team.tactics.pressing_intensity in {"PASSIVE", "SELECTIVE"} else 0.44
                    target_rel_x = (1.0 - blend) * target_rel_x + blend * cover_rel
                    target_y = (1.0 - blend) * target_y + blend * threat.pos.y
                else:
                    target_y += (50.0 - target_y) * 0.18
            elif central_threats and s.slot in {"CDM", "LDM", "RDM"} and role in {"SCREEN", "HOLD_ZONE", "BACKLINE_COVER", "TRACK_RUNNERS", "TRACK"}:
                threat = min(central_threats, key=lambda o: distance_m(s.pos, o.pos))
                threat_rel = attack_relative_x(team_id, threat.pos)
                screen_rel = clamp(threat_rel + 8.0, 16.0, 32.0)
                target_rel_x = 0.68 * target_rel_x + 0.32 * screen_rel
                target_y = 0.72 * target_y + 0.28 * threat.pos.y

        # Marking orientation changes where defenders stand, never their defensive attributes.
        if not in_possession and team.tactics.marking_orientation != "ZONAL":
            opponents = [o for o in self._team_states(self._opp_id(team_id)) if o.slot != "GK"]
            if opponents:
                mark = min(opponents, key=lambda o: distance_m(s.home_anchor, o.pos))
                blend = 0.18 if team.tactics.marking_orientation == "HYBRID" else 0.34
                if role in {"TIGHT_MARK", "TRACK_RUNNER", "TRACK_RUNNERS", "TRACK", "TRACK_FULLBACK", "TRACK_MIDFIELD"}:
                    blend += 0.12 * def_eff
                mark_rel_x = attack_relative_x(team_id, mark.pos)
                target_rel_x = (1.0 - blend) * target_rel_x + blend * mark_rel_x
                target_y = (1.0 - blend) * target_y + blend * mark.pos.y

        # Pressing is spatial, not an attribute boost.
        if not in_possession:
            carrier = self._carrier()
            if ST["E"] and getattr(s, "st_beaten_until", -999) >= self.clock:
                ep_beaten = self._press_active.get(s.player.player_id)
                if ep_beaten is not None:
                    self._press_close(s.player.player_id, ep_beaten)
                return self._st_contain_point(s, carrier, 6.0)
            d = distance_m(s.pos, carrier.pos)
            intensity = team.tactics.pressing_intensity
            base_press = {"PASSIVE": 4.0, "SELECTIVE": 10.0, "AGGRESSIVE": 16.0, "RELENTLESS": 22.0}.get(intensity, 10.0)
            role_mult = 1.3 if role in {"PRESS", "BALL_HUNT", "PRESS_CBS", "PRESS_FULLBACK", "PRESS_WIDE"} else 0.85
            if role in {"STAY_HIGH", "HOLD_LINE"}:
                role_mult *= 0.65
            if team.tactics.after_losing_possession == "COUNTERPRESS" and self.clock - self.last_turnover_time <= 6 and self.last_turnover_loser == team_id:
                role_mult *= 1.35
            max_press = base_press * (0.45 + 0.85 * def_eff) * role_mult
            # Engagement-count semantics: a passive side sends one man while the
            # rest hold shape; only genuinely aggressive plans commit multiple
            # pressers to the same carrier. Pure decision architecture — nobody
            # moves faster, more players simply choose (not) to go.
            n_pressers = {"PASSIVE": 1, "SELECTIVE": 2, "AGGRESSIVE": 3, "RELENTLESS": 3}.get(intensity, 2)
            nearest = sorted(self._team_states(team_id), key=lambda p: distance_m(p.pos, carrier.pos))[:n_pressers]
            protect_cutback = ball_rel_x <= 22.0 and abs(ball.y - 50.0) >= 24.0 and s.slot in {"LCB","RCB","CDM","LDM","RDM"}
            # Passive/low-block defending means conceding territory, not refusing to close
            # down a ball carrier who has already entered the box.  In deep central danger
            # the nearest CB becomes the primary engager while the other centre-back holds
            # cover.  This is a target/engagement change only; tackling attributes are not
            # boosted.
            deep_central_danger = ball_rel_x <= 22.0 and abs(ball.y - 50.0) <= 27.0
            primary_cb = None
            if deep_central_danger:
                cb_states = [dstate for dstate in self._team_states(team_id) if dstate.slot in {"LCB", "RCB"}]
                if cb_states:
                    primary_cb = min(cb_states, key=lambda dstate: distance_m(dstate.pos, carrier.pos))
                if s.slot in {"LCB", "RCB"} and s is primary_cb:
                    max_press = max(max_press, 6.2 * (0.72 + 0.35 * def_eff))
                elif s.slot in {"CDM", "LDM", "RDM"}:
                    max_press = max(max_press, 5.0 * (0.72 + 0.35 * def_eff))
            # High pressing should not mean both centre-backs abandon the line for any
            # nearby carrier. HOLD_LINE/COVER CBs engage only when the ball is genuinely
            # threatening their box and close enough to challenge; midfield/forward pressers
            # do the bulk of settled pressing.
            cb_line_discipline = s.slot in {"LCB","RCB"} and role not in {"STEP_OUT","TIGHT_MARK"} and (ball_rel_x > 26.0 or d > 5.2)
            if deep_central_danger and s is primary_cb:
                cb_line_discipline = False
            # Pursuit persistence with a structural leash. Once a player has chosen
            # to engage he stays on the chase (no per-tick flicker with the nearest
            # re-sort) until the carrier changes, the chase becomes hopeless, or he
            # has been dragged further from his structural position than his team's
            # pressing intent tolerates. A passive side abandons the chase early to
            # reform; a relentless side keeps hunting and physically leaves its
            # shape. Own-box emergencies are exempt: nobody leashes out of defending
            # the six-yard area. Decision layer only — arrival remains physical.
            pid_press = s.player.player_id
            active_ep = self._press_active.get(pid_press)
            engaged_here = (active_ep is not None and active_ep["carrier"] == carrier.player.player_id
                            and self.clock - active_ep.get("last", -99) <= 1)
            emergency_defense = ball_rel_x <= 26.0 or deep_central_danger
            leash = {"PASSIVE": 6.0, "SELECTIVE": 12.0, "AGGRESSIVE": 20.0, "RELENTLESS": 30.0}.get(intensity, 12.0)
            leash *= (0.60 + 0.50 * def_eff)
            # Zone defense is universal: whatever the pressing plan, a defender whose
            # own zone the carrier has entered closes him down. Passive means not
            # proactively leaving structure — it never means watching an opponent
            # dribble through your own patch of grass (§ pressing architecture).
            struct_pt_now = from_attack_frame(team_id, target_rel_x, target_y)
            in_my_zone = d <= 4.5 and distance_m(carrier.pos, struct_pt_now) <= 9.0
            wants_new = (s in nearest and d <= max_press) or in_my_zone
            keeps_chase = False
            if engaged_here and not wants_new:
                struct_pt = Vec2(active_ep["struct_x"], active_ep["struct_y"])
                within_leash = distance_m(s.pos, struct_pt) <= leash
                hopeless = d > max_press * 1.35 + 4.0
                keeps_chase = within_leash and not hopeless
            eligible = (not protect_cutback) and (not cb_line_discipline) and (wants_new or keeps_chase or (engaged_here and emergency_defense))
            if eligible and not ST["D"]:
                self._press_track(s, carrier, d, target_rel_x, target_y, intensity)
                return carrier.pos
            if eligible and ST["D"]:
                # Family D: engagement ownership. The primary engager decides
                # between ENGAGE and CONTAIN from role/effort/tactic/context;
                # non-primary pressers ENGAGE only when the tactic genuinely
                # commits them (aggressive plans, counterpress, emergencies,
                # own zone), otherwise they COVER goal-side space.
                if ST["E"] and getattr(s, "st_beaten_until", -999) >= self.clock:
                    if active_ep is not None:
                        self._press_close(pid_press, active_ep)
                    rec = self._st_contain_point(s, carrier, 6.5)
                    return rec
                primary = self._st_primary_engager(team_id, carrier)
                counterpress_now = (team.tactics.after_losing_possession == "COUNTERPRESS"
                                    and self.clock - self.last_turnover_time <= 6
                                    and self.last_turnover_loser == team_id)
                carrier_wide = abs(carrier.pos.y - 50.0) >= 24.0
                if s.player.player_id == primary:
                    e_score = {"PASSIVE": -0.35, "SELECTIVE": -0.10, "AGGRESSIVE": 0.20, "RELENTLESS": 0.45}.get(intensity, -0.10)
                    e_score += 0.30 if role in self._ST_PRESS_ROLES else 0.0
                    e_score -= 0.15 if role in self._ST_HOLD_ROLES else 0.0
                    e_score += 0.40 * (def_eff - 0.5)
                    e_score += 0.60 if clamp(carrier.ball_exposure, 0.0, 1.0) > 0.55 else 0.0
                    e_score += 1.00 if emergency_defense else 0.0
                    e_score += 0.50 if counterpress_now else 0.0
                    e_score += 0.40 if in_my_zone else 0.0
                    e_score -= 0.25 if carrier_wide else 0.0
                    if e_score > 0.0:
                        self._press_track(s, carrier, d, target_rel_x, target_y, intensity)
                        return carrier.pos
                    if active_ep is not None:
                        self._press_close(pid_press, active_ep)
                    stand = 2.0 + 0.8 * (1.0 - def_eff)
                    return self._st_contain_point(s, carrier, stand)
                # non-primary eligible presser
                if emergency_defense or counterpress_now or in_my_zone or intensity in {"AGGRESSIVE", "RELENTLESS"}:
                    self._press_track(s, carrier, d, target_rel_x, target_y, intensity)
                    return carrier.pos
                if active_ep is not None:
                    self._press_close(pid_press, active_ep)
                return self._st_contain_point(s, carrier, 6.5)
            if active_ep is not None and not emergency_defense:
                # Chase abandoned: close the episode so persistence cannot resurrect it.
                self._press_close(pid_press, active_ep)

        # Continuous checking/support/marking adjustments around the structural target.
        # These are spatial movements (not hidden stamina charges) and remain small enough
        # that the formation anchor still dominates the player's location.
        phase = int("".join(ch for ch in s.player.player_id if ch.isdigit()) or "0") * 0.37
        movement_effort = atk_eff if in_possession else def_eff
        # Even low-block teams continually shuffle, check shoulders and adjust lanes.
        # Effort changes the range/urgency, but low effort must not mean "stand still".
        # The compressed scale also prevents open games from producing absurd total distance.
        # Low-effort roles still participate in collective block shuffling; high-effort
        # roles already accumulate extra distance from presses/runs, so this base-shape
        # movement is deliberately less effort-sensitive.
        micro_scale = clamp(1.55 - 0.45 * movement_effort, 1.05, 1.50)
        target_rel_x += 4.2 * micro_scale * math.sin(self.clock / 4.8 + phase)
        target_y += 5.2 * micro_scale * math.sin(self.clock / 6.0 + phase * 1.3)

        # Forward runners work off the actual second-last-defender line. High Attacking
        # Position means tighter timing; lower values create a wider timing oscillation
        # and therefore occasional marginal offsides rather than a hidden success bonus.
        if in_possession and s.slot in {"LW", "RW", "LM", "RM", "ST", "LCM", "RCM", "LAM", "CAM", "RAM"} and target_rel_x > 50:
            line = max(50.0, attack_relative_x(team_id, ball), self._offside_line(team_id))
            pos_skill = sigmoid(1.1 * self._g_eff(s, "attacking_position"))
            base_buffer = 1.7 - 1.0 * pos_skill
            timing_error = (1.0 - pos_skill) * 2.2 * math.sin(self.clock / 2.8 + phase * 1.7)
            if s.instructions.attack_role.upper() in {"RUN_BEHIND", "POACHER", "SECOND_STRIKER", "INSIDE_FORWARD"}:
                target_rel_x = min(target_rel_x, line - base_buffer + timing_error)
        # Final byline-cover priority is applied after micro-adjustments/run timing so
        # central protectors cannot be accidentally pulled out of the cutback lane.
        if not in_possession and ball_rel_x <= 22.0 and abs(ball.y - 50.0) >= 24.0 and s.slot in {"LCB","RCB","CDM","LDM","RDM"}:
            target_y += (50.0 - target_y) * 0.58
            if s.slot in {"LCB","RCB"}:
                target_rel_x = min(target_rel_x, 13.5)
            else:
                target_rel_x = min(target_rel_x, 20.0)

        # Final goal-side recovery / back-line coherence guard.  This runs *after*
        # marking, pressing, micro-movement and byline logic so none of those lower-
        # priority intentions can pull a defender back out after the ball has already
        # broken the line.  It changes only the movement target; the player must still
        # physically recover with his current pace/energy.
        if not in_possession:
            current_rel = attack_relative_x(team_id, s.pos)
            ball_behind_player = ball_rel_x < current_rel - 1.5
            penetrated = ball_rel_x <= 26.0 or (ball_rel_x <= 36.0 and ball_behind_player)
            if penetrated:
                if s.slot in {"LCB", "RCB"}:
                    target_rel_x = min(target_rel_x, max(4.5, ball_rel_x - 1.2))
                    # When one centre-back has recovered and the other is stranded,
                    # reconnect the pair.  The reference is actual current geometry,
                    # not a tactical or attribute bonus.
                    cb_rel = [attack_relative_x(team_id, d.pos) for d in self._team_states(team_id) if d.active and d.slot in {"LCB", "RCB"}]
                    if len(cb_rel) >= 2 and ball_rel_x <= 32.0:
                        coherent_cap = min(cb_rel) + 5.5
                        target_rel_x = min(target_rel_x, coherent_cap)
                    target_y += (ball.y - target_y) * 0.12
                elif s.slot in {"LB", "RB"}:
                    target_rel_x = min(target_rel_x, max(5.5, ball_rel_x + 1.0))
                elif s.slot in {"CDM", "LDM", "RDM"}:
                    target_rel_x = min(target_rel_x, max(8.0, ball_rel_x + 5.5))
                elif s.slot in {"LCM", "RCM", "LM", "RM"} and ball_rel_x <= 22.0:
                    target_rel_x = min(target_rel_x, max(12.0, ball_rel_x + 10.0))

        # Broad positional envelopes prevent tactical settings from collapsing players
        # onto their own goal line. These are structural floors, not attribute bonuses.
        min_rel_x = {
            "LB": 10.0, "LCB": 9.0, "RCB": 9.0, "RB": 10.0,
            "CDM": 15.0, "LDM": 15.0, "RDM": 15.0,
            "LCM": 20.0, "RCM": 20.0,
            "LW": 27.0, "RW": 27.0, "LM": 24.0, "RM": 24.0, "LAM": 27.0, "CAM": 27.0, "RAM": 27.0, "ST": 29.0,
        }.get(s.slot, 4.0)
        if not in_possession and ball_rel_x <= 20.0:
            emergency_floor = {"LB": 5.0, "LCB": 4.0, "RCB": 4.0, "RB": 5.0,
                               "CDM": 8.0, "LDM": 8.0, "RDM": 8.0,
                               "LCM": 12.0, "RCM": 12.0, "LM": 14.0, "RM": 14.0}.get(s.slot)
            if emergency_floor is not None:
                min_rel_x = min(min_rel_x, emergency_floor)
        return from_attack_frame(team_id, clamp(target_rel_x, min_rel_x, 96.0), clamp(target_y, 4.0, 96.0))

    def _attack_structure_snapshot(self, shooter: PlayerState) -> dict:
        """Diagnostic-only structure readout at the moment of a shot."""
        team_id = shooter.team_id
        mates = [m for m in self._team_states(team_id) if m.slot != "GK" and m.active]
        opps = [o for o in self._team_states(self._opp_id(team_id)) if o.slot != "GK" and o.active]
        def _in_box(pos):
            return attack_relative_x(team_id, pos) >= 84.3 and 20.4 <= pos.y <= 79.6
        box_att = sum(1 for m in mates if _in_box(m.pos))
        box_def = sum(1 for o in opps if _in_box(o.pos))
        support = sum(1 for m in mates if m is not shooter and distance_m(m.pos, shooter.pos) <= 10.0)
        adv = [m for m in mates if attack_relative_x(team_id, m.pos) >= 66.0]
        spacing = 0.0
        if len(adv) >= 2:
            seps = [min(distance_m(m.pos, n.pos) for n in adv if n is not m) for m in adv]
            spacing = sum(seps) / len(seps)
        return {"box_attackers": box_att, "box_defenders": box_def,
                "support_10m": support, "att_spacing_m": round(spacing, 2)}

    def _support_pocket(self, s: PlayerState, team_id: str, target_rel_x: float, target_y: float, atk_eff: float) -> tuple[float, float]:
        """Refine an advanced support target toward an actual receiving pocket.

        A small deterministic set of candidate spots around the structural target is
        scored by (a) space from the nearest defender, (b) separation from teammates
        already occupying the zone (anti-clumping), (c) staying inside a passable
        range of the ball, and (d) on the box approach, the role's arrival lane
        (near post / central / far post / cutback-edge). Pocket quality scales with
        Attacking Position (scanning intelligence) and Attack Effort (willingness to
        keep re-working position). Purely spatial: no RNG, no accuracy or xG term.
        Players re-scan on a ~3s cadence, so the chosen offset rides on top of the
        continuously updated structural target between scans.
        """
        bucket = self.clock // 3
        cached = self._pocket_cache.get(s.player.player_id)
        pos_skill = sigmoid(1.1 * self._g_eff(s, "attacking_position"))
        offset_scale = (0.40 + 0.60 * pos_skill) * (0.70 + 0.30 * atk_eff)
        if cached is not None and cached[0] == bucket:
            return target_rel_x + cached[1] * offset_scale, clamp(target_y + cached[2] * offset_scale, 4.0, 96.0)
        ball = self.ball.pos
        ball_rel = attack_relative_x(team_id, ball)
        opponents = [o.pos for o in self._team_states(self._opp_id(team_id)) if o.slot != "GK" and o.active]
        mates = [m.pos for m in self._team_states(team_id) if m.slot != "GK" and m.active and m is not s]
        if not opponents or not mates:
            return target_rel_x, target_y
        # Box arrival lanes, oriented by the ball's side. Distinct lanes per role keep
        # box occupation coordinated instead of piling everyone onto the same spot.
        lane_y, lane_w = None, 0.0
        if ball_rel >= 74.0:
            side_left = ball.y < 50.0
            near_y = 44.0 if side_left else 56.0
            far_y = 61.0 if side_left else 39.0
            role = s.instructions.attack_role.upper()
            if s.slot == "ST" or role == "POACHER":
                lane_y, lane_w = near_y, 0.55
            elif role in {"SECOND_STRIKER", "RUN_BEHIND"} or s.slot == "CAM":
                lane_y, lane_w = 50.0, 0.45
            elif s.slot in {"LW", "LM", "LAM"} and not side_left:
                lane_y, lane_w = far_y, 0.60
            elif s.slot in {"RW", "RM", "RAM"} and side_left:
                lane_y, lane_w = far_y, 0.60
            elif s.slot in {"LCM", "RCM"} or role in {"CREATOR", "CONTROLLER"}:
                lane_y, lane_w = 50.0, 0.35
        best_dx, best_dy, best_score = 0.0, 0.0, None
        for dx in (0.0, 3.2):
            for dy in (-8.0, -4.0, 0.0, 4.0, 8.0):
                cy = clamp(target_y + dy, 4.0, 96.0)
                cand = from_attack_frame(team_id, clamp(target_rel_x + dx, 4.0, 96.0), cy)
                space = min(distance_m(cand, o) for o in opponents)
                sep = min(distance_m(cand, m) for m in mates)
                score = 0.115 * min(space, 10.0) + 0.085 * min(sep, 8.0)
                score -= 0.026 * (abs(dx) + abs(dy))
                d_ball = distance_m(cand, ball)
                if 6.0 <= d_ball <= 30.0:
                    score += 0.15
                if lane_y is not None:
                    score += lane_w * math.exp(-((cy - lane_y) ** 2) / 72.0)
                if best_score is None or score > best_score:
                    best_dx, best_dy, best_score = dx, dy, score
        self._pocket_cache[s.player.player_id] = (bucket, best_dx, best_dy)
        return target_rel_x + best_dx * offset_scale, clamp(target_y + best_dy * offset_scale, 4.0, 96.0)

    def _st_buildup_supporters(self, team_id: str) -> dict:
        """Family C: deterministic deep-phase support-mover selection.

        During deep/first-phase possession a small number of nearby players
        (count set by passing directness: SHORT 3 / MIXED 2 / DIRECT 1) are
        designated to genuinely offer for the ball. Selection is nearest-first
        among fullbacks/midfielders/wingers with a small Attack Effort bias, so
        willing runners offer more often. Cached per (clock//2, team) - purely
        deterministic, no RNG.
        """
        bucket = (self.clock // 5, team_id)  # sticky designation: a support run needs time to arrive
        cached = self._st_support_cache.get(team_id)
        if cached is not None and cached[0] == bucket:
            return cached[1]
        carrier = self._carrier()
        n = {"SHORT": 3, "MIXED": 2, "DIRECT": 1}.get(self.teams[team_id].tactics.passing_directness, 2)
        elig = [m for m in self._team_states(team_id)
                if m.active and m is not carrier
                and m.slot in {"LCB", "RCB", "LB", "RB", "CDM", "LDM", "RDM", "LCM", "RCM", "LM", "RM", "LW", "RW"}]
        ranked = sorted(elig, key=lambda m: (round(distance_m(m.pos, carrier.pos) - 4.0 * effort01(m.instructions.attack_effort), 4), m.player.player_id))
        chosen = {m.player.player_id: i for i, m in enumerate(ranked[:n])}
        self._st_support_cache[team_id] = (bucket, chosen)
        return chosen

    def _st_relief_supporter(self, team_id: str) -> str | None:
        """Family C: single designated relief man behind an advanced carrier."""
        bucket = (self.clock // 4, team_id, "relief")
        cached = self._st_relief_cache.get(team_id)
        if cached is not None and cached[0] == bucket:
            return cached[1]
        carrier = self._carrier()
        elig = [m for m in self._team_states(team_id)
                if m.active and m is not carrier and m.slot in {"CDM", "LDM", "RDM", "LCM", "RCM"}]
        best = None
        if elig:
            best = min(elig, key=lambda m: (round(distance_m(m.pos, carrier.pos), 4), m.player.player_id)).player.player_id
        self._st_relief_cache[team_id] = (bucket, best)
        return best

    def _st_support_point(self, s: PlayerState, team_id: str, atk_eff: float):
        """Family C: an actual receiving point near the deep-phase carrier.

        Candidate spots around the carrier (radius stretched by directness)
        are scored by defender distance, teammate separation and passable
        range - the same geometry currency as the cal3 receiving pockets.
        Returns (rel_x, y). Spatial only: no pass-completion bonus."""
        carrier = self._carrier()
        ball = self.ball.pos
        directness = self.teams[team_id].tactics.passing_directness
        radius = {"SHORT": 10.0, "MIXED": 12.0, "DIRECT": 15.0}.get(directness, 12.0)
        car_rel = attack_relative_x(team_id, carrier.pos)
        opponents = [o.pos for o in self._team_states(self._opp_id(team_id)) if o.slot != "GK" and o.active]
        mates = [m.pos for m in self._team_states(team_id) if m.slot != "GK" and m.active and m is not s]
        r = radius / 1.05
        if s.slot in {"LCB", "RCB"}:
            side = -1.0 if s.slot == "LCB" else 1.0
            cands = [(car_rel - r * 0.45, carrier.pos.y + side * 14.0),
                     (car_rel - r * 0.30, carrier.pos.y + side * 20.0),
                     (car_rel - r * 0.60, 50.0)]
        elif s.slot in {"LB", "RB"}:
            edge = 12.0 if s.slot == "LB" else 88.0
            cands = [(car_rel + 2.0, edge), (car_rel + 7.0, edge), (car_rel - 2.0, edge)]
        elif s.slot in {"CDM", "LDM", "RDM"}:
            cands = [(car_rel + r * 0.8, carrier.pos.y), (car_rel + r * 0.5, carrier.pos.y - 10.0),
                     (car_rel + r * 0.5, carrier.pos.y + 10.0), (car_rel - r * 0.35, 50.0)]
        elif s.slot in {"LW", "LM"}:
            cands = [(car_rel + r * 0.9, 20.0), (car_rel + r * 0.6, 32.0)]
        elif s.slot in {"RW", "RM"}:
            cands = [(car_rel + r * 0.9, 80.0), (car_rel + r * 0.6, 68.0)]
        else:
            cands = [(car_rel + r * 0.9, carrier.pos.y - 8.0), (car_rel + r * 0.9, carrier.pos.y + 8.0),
                     (car_rel + r * 0.55, carrier.pos.y), (car_rel + r * 1.2, 50.0)]
        best, best_score = None, None
        for crel, cy in cands:
            cand = from_attack_frame(team_id, clamp(crel, 4.0, 96.0), clamp(cy, 4.0, 96.0))
            space = min((distance_m(cand, o) for o in opponents), default=10.0)
            sep = min((distance_m(cand, m) for m in mates), default=8.0)
            d_ball = distance_m(cand, ball)
            score = 0.115 * min(space, 10.0) + 0.085 * min(sep, 8.0)
            if 6.0 <= d_ball <= radius + 8.0:
                score += 0.18
            if best_score is None or score > best_score:
                best, best_score = (clamp(crel, 4.0, 96.0), clamp(cy, 4.0, 96.0)), score
        return best

    def _movement_speed(self, s: PlayerState) -> float:
        if not s.active:
            return 0.0
        d = distance_m(s.pos, s.target)
        if not self._active_play():
            # Dead balls allow walking/repositioning and acute recovery, not live sprints.
            if d < 0.8:
                return 0.25
            return min(1.55, 0.55 + 0.15 * d)
        if d < 0.8:
            return 0.45
        accel = effective_attribute(s.player, s, "acceleration")
        sprint = effective_attribute(s.player, s, "sprint_speed")
        max_speed = 5.8 + (sprint / 99.0) * 3.2
        # An engaged press chase is an explosive closing action, not a positional
        # shuffle: it uses the full running formula at any distance and therefore
        # pays full fatigue/acute-exertion for the burst. Everything else keeps the
        # maneuvering bands, now scaled by effective Acceleration (fatigue included)
        # around the same population-average speeds as before.
        ep = self._press_active.get(s.player.player_id)
        if ep is not None and ep.get("last") == self.clock:
            return min(max_speed, 4.1 + (accel / 99.0) * 2.5)
        if d < 4:
            return 1.75 + (accel / 99.0) * 0.50
        if d < 10:
            return 2.80 + (accel / 99.0) * 1.00
        if d > 18:
            return max_speed
        return min(max_speed, 4.1 + (accel / 99.0) * 2.5)

    def _apply_action_movement(self, s: PlayerState, new_pos: Vec2, assumed_speed_mps: float, activity: str) -> float:
        """Move a player as part of an explicit football action and account for workload.

        Ball carriers do not silently follow off-ball tactical targets between decisions;
        therefore carry/dribble/through-run distance must be recorded here.
        """
        new_pos = new_pos.clamp()
        moved = distance_m(s.pos, new_pos)
        s.pos = new_pos
        s.target = new_pos
        s.distance_m += moved
        s.speed_mps = assumed_speed_mps
        s.current_activity = activity
        if assumed_speed_mps >= 6.4:
            s.sprint_distance_m += moved
        elif assumed_speed_mps >= 4.6:
            s.high_intensity_distance_m += moved
        elif assumed_speed_mps >= 2.5:
            s.jog_distance_m += moved
        elif assumed_speed_mps >= 1.0:
            s.walk_distance_m += moved
        dt = max(0.35, moved / max(1.0, assumed_speed_mps))
        update_fatigue(s, moved, assumed_speed_mps, dt)
        return moved

    _ST_PRESS_ROLES = {"PRESS", "BALL_HUNT", "STEP_OUT", "PRESS_WIDE", "PRESS_FULLBACK", "PRESS_CBS"}
    _ST_HOLD_ROLES = {"HOLD_LINE", "COVER", "SCREEN", "HOLD_ZONE", "HOLD_WIDE", "STAY_HIGH", "BACKLINE_COVER"}

    def _st_primary_engager(self, team_id: str, carrier: PlayerState) -> str | None:
        """Family D: the defender with primary responsibility for the carrier.

        Chosen deterministically each second: nearest by distance with a small
        bias for pressing roles/effort and against back-line players outside
        their zone. Everyone else defends space unless the tactic genuinely
        commits additional pressers. Cached per (clock, team)."""
        cached = self._st_primary_cache.get(team_id)
        if cached is not None and cached[0] == self.clock:
            return cached[1]
        best, best_score = None, None
        for d0 in self._team_states(team_id):
            if d0.slot == "GK" or not d0.active:
                continue
            if ST["E"] and getattr(d0, "st_beaten_until", -999) >= self.clock:
                continue
            dist = distance_m(d0.pos, carrier.pos)
            role = d0.instructions.defense_role.upper()
            score = dist
            score -= 2.5 if role in self._ST_PRESS_ROLES else 0.0
            score += 1.5 if role in self._ST_HOLD_ROLES else 0.0
            score -= 2.0 * effort01(d0.instructions.defense_effort)
            if d0.slot in {"LCB", "RCB"} and attack_relative_x(carrier.team_id, carrier.pos) < 70.0:
                score += 3.0  # CBs do not leave the line to own midfield carriers
            key = (round(score, 4), d0.player.player_id)
            if best_score is None or key < best_score:
                best, best_score = d0.player.player_id, key
        self._st_primary_cache[team_id] = (self.clock, best)
        return best

    def _st_contain_point(self, s: PlayerState, carrier: PlayerState, stand_m: float) -> Vec2:
        """Family D: containment stand-off point - goal-side of the carrier on
        the carrier-to-own-goal line, with a slight inside (central) shading to
        protect the dangerous lane. Positional defending: the containing player
        moves at normal maneuvering speed and keeps tackling machinery
        unchanged - he simply does not dive onto the carrier's boots."""
        goal = goal_center(carrier.team_id)  # the goal the carrier attacks = defender's own goal
        dx = (goal.x - carrier.pos.x) * 1.05
        dy = (goal.y - carrier.pos.y) * 0.68
        mag = math.hypot(dx, dy) or 1.0
        px = carrier.pos.x + dx / mag * stand_m / 1.05
        py = carrier.pos.y + dy / mag * stand_m / 0.68
        py += clamp((50.0 - py) * 0.12, -1.6, 1.6)  # inside shading (bounded so wide contains keep their stand-off)
        return Vec2(px, py).clamp()

    def _press_track(self, s: PlayerState, carrier: PlayerState, d: float, struct_rel_x: float, struct_y: float, intensity: str) -> None:
        """Observational press-episode bookkeeping. Never touches football state."""
        pid = s.player.player_id
        ep = self._press_active.get(pid)
        if ep is not None and ep["carrier"] != carrier.player.player_id:
            self._press_close(pid, ep)
            ep = None
        if ep is None:
            ep = {
                "t0": self.clock, "team": s.team_id, "presser": pid, "slot": s.slot,
                "role": s.instructions.defense_role.upper(), "effort": s.instructions.defense_effort,
                "intensity": intensity, "carrier": carrier.player.player_id,
                "carrier_team": carrier.team_id, "d0": round(d, 2), "d_min": round(d, 2),
                "x0": round(s.pos.x, 2), "y0": round(s.pos.y, 2),
                "carrier_x0": round(carrier.pos.x, 2), "carrier_y0": round(carrier.pos.y, 2),
                "carrier_rel0": round(attack_relative_x(carrier.team_id, carrier.pos), 2),
                "struct_x": round(from_attack_frame(s.team_id, struct_rel_x, struct_y).x, 2),
                "struct_y": round(from_attack_frame(s.team_id, struct_rel_x, struct_y).y, 2),
                "energy0": round(s.energy, 2), "abandon_max": 0.0,
            }
            self._press_active[pid] = ep
        ep["last"] = self.clock
        ep["d_min"] = min(ep["d_min"], round(d, 2))
        abandon = distance_m(s.pos, Vec2(ep["struct_x"], ep["struct_y"]))
        ep["abandon_max"] = max(ep["abandon_max"], round(abandon, 2))
        ep["energy1"] = round(s.energy, 2)

    def _press_close(self, pid: str, ep: dict) -> None:
        self._press_active.pop(pid, None)
        if self.config.press_debug:
            ep = dict(ep)
            ep["t1"] = ep.pop("last", ep["t0"])
            self.press_log.append(ep)

    def _press_sweep(self) -> None:
        stale = [(pid, ep) for pid, ep in self._press_active.items() if ep.get("last", -1) < self.clock]
        for pid, ep in stale:
            self._press_close(pid, ep)

    def _update_movement_and_fatigue(self) -> None:
        carrier_id = self.ball.controlling_player_id if self.ball.control_state == BallControlState.CONTROLLED else None
        _deferred_carrier = None
        for s in self.states.values():
            if not s.active:
                s.current_activity = "sent_off"
                s.speed_mps = 0.0
                continue
            # Critical invariant: the player on the ball moves only through explicit
            # CARRY/DRIBBLE/transition actions. Tactical anchors are off-ball intentions.
            # Allowing the carrier to chase them every second silently created unlogged
            # 15-20m advances between decisions and inflated close-range chances.
            if self._active_play() and s.player.player_id == carrier_id:
                # Carrier movement is resolved AFTER every off-ball player has
                # moved (two-phase update): defenders on both sides always
                # target the start-of-tick carrier position and the carrier
                # always evades post-move defenders. Without this, Family A's
                # evasion would give whichever side updates later a systematic
                # advantage (measured: massive AWAY bias in mirrors).
                _deferred_carrier = s
                continue
            s.target = self._desired_target(s)
            speed = self._movement_speed(s)
            nxt, moved = move_toward(s.pos, s.target, speed)
            s.pos = nxt
            s.speed_mps = moved
            s.distance_m += moved
            if speed >= 6.4:
                s.sprint_distance_m += moved
                s.current_activity = "sprint"
            elif speed >= 4.6:
                s.high_intensity_distance_m += moved
                s.current_activity = "high_speed_run"
            elif speed >= 2.5:
                s.jog_distance_m += moved
                s.current_activity = "jog"
            elif speed >= 1.0:
                s.walk_distance_m += moved
                s.current_activity = "walk"
            else:
                s.current_activity = "standing"
            update_fatigue(s, moved, speed, 1.0)

        if _deferred_carrier is not None:
            s = _deferred_carrier
            evaded = False
            if ST["A"]:
                opp_near = sorted(
                    (o for o in self._team_states(self._opp_id(s.team_id)) if o.active and o.slot != "GK"),
                    key=lambda o: distance_m(o.pos, s.pos))[:2]
                if opp_near and distance_m(opp_near[0].pos, s.pos) <= 4.5:
                    presser = opp_near[0]
                    base_dx = (s.pos.x - presser.pos.x) * 1.05
                    base_dy = (s.pos.y - presser.pos.y) * 0.68
                    mag = math.hypot(base_dx, base_dy) or 1.0
                    base_dx, base_dy = base_dx / mag, base_dy / mag
                    best, best_score = None, None
                    cur_rel = attack_relative_x(s.team_id, s.pos)
                    for ang in (-0.9, -0.45, 0.0, 0.45, 0.9):
                        ca, sa = math.cos(ang), math.sin(ang)
                        ux, uy = base_dx * ca - base_dy * sa, base_dx * sa + base_dy * ca
                        cand = Vec2(s.pos.x + ux * 1.9 / 1.05, s.pos.y + uy * 1.9 / 0.68).clamp()
                        cand_rel = attack_relative_x(s.team_id, cand)
                        if cand_rel > cur_rel + 0.15:
                            continue
                        sep = min(distance_m(cand, o.pos) for o in opp_near)
                        score = sep + 0.35 * max(-2.0, cand_rel - cur_rel)
                        if best_score is None or score > best_score:
                            best, best_score = cand, score
                    if best is not None:
                        speed = 2.1 if clamp(s.ball_exposure, 0.0, 1.0) < 0.5 else 1.5
                        nxt, moved = move_toward(s.pos, best, speed)
                        s.pos = nxt
                        self.ball.pos = s.pos
                        s.target = s.pos
                        s.speed_mps = moved
                        s.distance_m += moved
                        if moved >= 1.0:
                            s.walk_distance_m += moved
                        s.current_activity = "on_ball_evade"
                        update_fatigue(s, moved, speed, 1.0)
                        evaded = True
            if not evaded:
                s.target = s.pos
                s.speed_mps = 0.0
                s.current_activity = "on_ball"
                update_fatigue(s, 0.0, 0.0, 1.0)
        if self.ball.control_state == BallControlState.CONTROLLED:
            self.ball.pos = self._carrier().pos
        if self._active_play():
            self.active_play_seconds += 1
            if self.ball.control_state == BallControlState.CONTROLLED:
                self.possession_seconds[self.possession_team] += 1
            elif self.ball.control_state == BallControlState.LOOSE:
                self.loose_seconds += 1
        else:
            self.dead_ball_seconds += 1

    def _apply_halftime(self) -> None:
        if self.halftime_done:
            return
        self.halftime_done = True
        for s in self.states.values():
            if s.active:
                halftime_recovery(s)
                # Halftime is off the match clock, so resetting to the current formation
                # anchor is a legitimate structural reset rather than in-play teleporting.
                s.pos = s.home_anchor
                s.target = s.home_anchor
                s.speed_mps = 0.0
        second_kickoff = self._opp_id(self.first_kickoff_team)
        k = self._kickoff_player(second_kickoff)
        k.pos = Vec2(50, 50)
        self._restart_controlled_possession(second_kickoff, k, "second_half_kickoff")
        self._record_event("HALFTIME", None, None, {"second_half_kickoff": second_kickoff})
        self._start_dead_ball(2, "second_half_restart")

    def _lane_open_between(self, a: PlayerState, b: PlayerState, corridor_m: float = 2.7) -> float:
        """0..1 geometric passing-lane openness; no execution attributes are changed."""
        defenders = [d for d in self._team_states(self._opp_id(a.team_id)) if d.slot != "GK"]
        threat = 0.0
        for d in defenders:
            perp, along = point_segment_distance_m(d.pos, a.pos, b.pos)
            if 0.06 < along < 0.96 and perp <= corridor_m + 2.0:
                threat += sigmoid((corridor_m - perp) / 0.75)
        return 1.0 - clamp(threat / 1.6, 0.0, 1.0)

    def _evaluate_role_performance(self) -> None:
        """Evaluate off-ball role execution every few seconds.

        This is opportunity-based rather than a per-second 'correct position' bonus.
        Role evidence is deliberately low-amplitude; technical/event execution remains
        the dominant source of the live match rating.
        """
        if self.ball.control_state != BallControlState.CONTROLLED:
            return
        carrier = self._carrier()
        for s in self.states.values():
            if not s.active or s.slot == "GK" or s.player.player_id == carrier.player.player_id:
                continue
            in_possession = s.team_id == self.possession_team
            role = (s.instructions.attack_role if in_possession else s.instructions.defense_role).upper()
            rel = attack_relative_x(s.team_id, s.pos)
            ball_rel = attack_relative_x(s.team_id, self.ball.pos)
            success: bool | None = None
            value = 0.0

            if in_possession:
                lane_open = self._lane_open_between(carrier, s)
                d_ball = distance_m(carrier.pos, s.pos)
                # Width providers: only evaluate when the ball is in a zone where a wide
                # outlet/overlap is actually useful.
                if role in {"OVERLAP", "TOUCHLINE_WINGER", "WINGER", "WIDE_SUPPORT", "WIDE_CREATOR", "WIDE_RUNNER"} and ball_rel >= 38:
                    same_side = (s.pos.y < 50) == (carrier.pos.y < 50)
                    opportunity = same_side or abs(carrier.pos.y - 50) < 20
                    if opportunity:
                        wide = abs(s.pos.y - 50.0) >= 28.0
                        advanced = rel >= ball_rel - (4.0 if role == "OVERLAP" else 10.0)
                        support_range = 5.0 <= d_ball <= 28.0
                        success = wide and advanced and support_range and lane_open >= 0.28
                        value = 0.020 if success else -0.012
                        if success:
                            s.width_actions += 1
                            s.support_options_created += 1

                elif role in {"UNDERLAP", "INVERT", "INSIDE_FORWARD"} and ball_rel >= 42:
                    opportunity = abs(carrier.pos.y - 50.0) >= 16 or role == "INSIDE_FORWARD"
                    if opportunity:
                        halfspace = 10.0 <= abs(s.pos.y - 50.0) <= 25.0
                        advanced = rel >= ball_rel - 4.0
                        success = halfspace and advanced and lane_open >= 0.22
                        value = 0.020 if success else -0.012
                        if success:
                            s.support_options_created += 1
                            if rel >= 76:
                                s.box_support_actions += 1

                elif role in {"RUN_BEHIND", "POACHER", "SECOND_STRIKER", "FREE_FORWARD"} and ball_rel >= 42:
                    line = max(50.0, attack_relative_x(s.team_id, carrier.pos), self._offside_line(s.team_id))
                    room = line - ball_rel
                    if room >= 4.0:
                        margin = line - rel
                        success = (-0.15 <= margin <= 5.5) and rel >= ball_rel + 4.0
                        value = 0.026 if success else -0.014
                        if success:
                            s.line_stretch_runs += 1

                elif role in {"LINK", "TARGET", "CONNECTOR"} and 32 <= ball_rel <= 82:
                    central = abs(s.pos.y - 50.0) <= 24.0
                    useful_gap = 5.0 <= d_ball <= 20.0
                    success = central and useful_gap and lane_open >= 0.24
                    value = 0.019 if success else -0.010
                    if success:
                        s.support_options_created += 1

                elif role in {"CREATOR", "FREE_ROAM", "CONTROLLER", "DEEP_PLAYMAKER"} and 28 <= ball_rel <= 78:
                    central = abs(s.pos.y - 50.0) <= 30.0
                    useful_gap = 6.0 <= d_ball <= 25.0
                    # Controllers/deep playmakers are allowed to sit behind the ball;
                    # creators are rewarded more for occupying the next line.
                    depth_ok = rel >= ball_rel - 18.0 if role in {"CONTROLLER", "DEEP_PLAYMAKER"} else rel >= ball_rel - 7.0
                    success = central and useful_gap and depth_ok and lane_open >= 0.30
                    value = 0.018 if success else -0.009
                    if success:
                        s.support_options_created += 1

                elif role in {"RUNNER", "ADVANCE_SUPPORT"} and ball_rel >= 48:
                    opportunity = rel < 88
                    if opportunity:
                        success = rel >= ball_rel + 3.0 and abs(s.pos.y - 50.0) <= 31.0
                        value = 0.021 if success else -0.011
                        if success and rel >= 76:
                            s.box_support_actions += 1

                elif role in {"ANCHOR", "DROP_BETWEEN_CBS", "HOLD_RECYCLE", "DISTRIBUTOR"}:
                    opportunity = ball_rel >= 28
                    if opportunity:
                        behind_ball = rel <= ball_rel + 1.0
                        central = abs(s.pos.y - 50.0) <= 26.0
                        success = behind_ball and central and 6.0 <= d_ball <= 30.0
                        value = 0.016 if success else -0.008
                        if success:
                            s.support_options_created += 1

            else:
                opp_carrier = carrier
                own_goal = goal_center(self._opp_id(s.team_id))  # goal this opponent attacks
                d_carrier = distance_m(s.pos, opp_carrier.pos)
                if role in {"SCREEN", "SCREEN_PIVOT", "BACKLINE_COVER", "TUCK_IN", "TUCK_INTO_BLOCK"}:
                    opp_rel = attack_relative_x(self._opp_id(s.team_id), opp_carrier.pos)
                    if opp_rel >= 36:
                        perp, along = point_segment_distance_m(s.pos, opp_carrier.pos, own_goal)
                        success = 0.05 < along < 0.95 and perp <= (7.5 if role in {"SCREEN", "SCREEN_PIVOT"} else 10.0)
                        value = 0.022 if success else -0.012
                        if success:
                            s.screening_actions += 1

                elif role in {"TRACK_RUNNER", "TRACK_RUNNERS", "TRACK", "TRACK_FULLBACK", "TRACK_MIDFIELD", "TIGHT_MARK"}:
                    threats = [o for o in self._team_states(self._opp_id(s.team_id)) if o.slot != "GK" and o.player.player_id != opp_carrier.player.player_id]
                    if threats:
                        threat = min(threats, key=lambda o: distance_m(s.home_anchor, o.pos))
                        threat_rel = attack_relative_x(self._opp_id(s.team_id), threat.pos)
                        if threat_rel >= 42:
                            d = distance_m(s.pos, threat.pos)
                            defender_rel = attack_relative_x(self._opp_id(s.team_id), s.pos)
                            goal_side = defender_rel >= threat_rel - 1.5
                            success = d <= 5.5 and goal_side
                            value = 0.022 if success else -0.014
                            if success:
                                s.tracking_actions += 1

                elif role in {"PRESS", "BALL_HUNT", "PRESS_CBS", "PRESS_FULLBACK", "PRESS_WIDE"}:
                    # Only evaluate when the role has a plausible engagement opportunity.
                    if d_carrier <= 12.0:
                        p, primary = self._pressure(opp_carrier)
                        success = primary is s and p >= 0.25
                        value = 0.022 if success else -0.010

                elif role in {"HOLD_LINE", "COVER", "HOLD_ZONE", "HOLD_WIDE", "DROP_INTO_BLOCK"}:
                    opp_rel = attack_relative_x(self._opp_id(s.team_id), opp_carrier.pos)
                    if opp_rel >= 45:
                        target = self._desired_target(s)
                        d_target = distance_m(s.pos, target)
                        success = d_target <= 5.5
                        value = 0.004 if success else -0.006

            if success is not None:
                add_role_performance(s, value, confidence=0.18, success=success)

    # ------------------------------------------------------------------
    # Restarts / out of play
    # ------------------------------------------------------------------
    def _goal_kick(self, team_id: str, reason: str = "out") -> None:
        gk = next((s for s in self._team_states(team_id) if s.slot == "GK"), self._team_states(team_id)[0])
        self._change_possession(team_id, gk, "goal_kick")
        self._record_event("GOAL_KICK", team_id, gk, {"reason": reason})
        self._start_dead_ball(6, "goal_kick")
        self.next_decision_at = max(self.next_decision_at, self.clock + 6)

    def _throw_in(self, team_id: str, location: Vec2) -> None:
        candidates = [s for s in self._team_states(team_id) if s.slot != "GK"] or self._team_states(team_id)
        taker = min(candidates, key=lambda s: distance_m(s.pos, location))
        taker.pos = location.clamp()
        self._change_possession(team_id, taker, "throw_in")
        self._record_event("THROW_IN", team_id, taker, {"location": [round(taker.pos.x,2), round(taker.pos.y,2)]})
        self._start_dead_ball(4, "throw_in")
        self.next_decision_at = max(self.next_decision_at, self.clock + 4)

    def _handle_out_of_play(self, last_touch_team: str, raw: Vec2, reason: str) -> bool:
        if 0.0 <= raw.x <= 100.0 and 0.0 <= raw.y <= 100.0:
            return False
        opponent = self._opp_id(last_touch_team)
        if raw.y < 0.0 or raw.y > 100.0:
            self._throw_in(opponent, Vec2(clamp(raw.x, 1.0, 99.0), 0.5 if raw.y < 0 else 99.5))
            return True
        crossed_opponent_goal_line = (last_touch_team == "HOME" and raw.x > 100.0) or (last_touch_team == "AWAY" and raw.x < 0.0)
        if crossed_opponent_goal_line:
            self._goal_kick(opponent, reason)
        else:
            self._execute_corner(opponent)
        return True

    # ------------------------------------------------------------------
    # Pressure / passing
    # ------------------------------------------------------------------
    def _pressure(self, carrier: PlayerState) -> tuple[float, PlayerState | None]:
        opp = self._team_states(self._opp_id(carrier.team_id))
        if not opp:
            return 0.0, None
        ordered = sorted(opp, key=lambda s: distance_m(s.pos, carrier.pos))
        nearest = ordered[0]
        d = distance_m(nearest.pos, carrier.pos)
        awareness = self._g_eff(nearest, "defensive_awareness")
        accel = self._g_eff(nearest, "acceleration")
        effort = effort01(nearest.instructions.defense_effort)
        closing_quality = 0.50 + 0.50 * sigmoid(accel + 0.7 * awareness)
        # v0.7-cal3 evaluation note: scaling proximity->pressure by pressing
        # intent (PASSIVE 0.55 .. RELENTLESS 1.08 with an own-box ramp) was tested
        # on 600 matched-seed matches and REVERTED: measured pressure dropped 20%
        # but median possession moved only +1s, TACKLE_LOST stayed ~21-23% and the
        # chance funnel was flat — the termination hazard is redundantly sourced
        # (duels 40%, passes 29%, clearances 14%), so damping one channel shifts
        # deaths to the others. Kept as diagnosis for a future coordinated pass.
        raw = sigmoid((4.1 - d) / 1.35) * closing_quality * (0.72 + 0.35 * effort)

        # Compact defenses can pressure with cover even when only one player is the
        # primary presser. Secondary defenders therefore add contextual pressure,
        # especially in crowded low-block zones, without receiving a tackle boost.
        support = 0.0
        for helper in ordered[1:4]:
            hd = distance_m(helper.pos, carrier.pos)
            if hd > 7.0:
                continue
            haw = 0.5 + 0.5 * sigmoid(self._g_eff(helper, "defensive_awareness"))
            support += sigmoid((5.2 - hd) / 1.25) * haw
        raw = raw + (1.0 - raw) * self.cal.support_pressure_weight * clamp(support / 1.8, 0.0, 1.0)
        return clamp(raw, 0.0, 1.0), nearest

    def _receiver_marking_pressure(self, receiver: PlayerState) -> float:
        defenders = [d for d in self._team_states(self._opp_id(receiver.team_id)) if d.slot != "GK"]
        if not defenders:
            return 0.0
        ordered = sorted(defenders, key=lambda d: distance_m(d.pos, receiver.pos))
        pressure = 0.0
        receiver_rel = attack_relative_x(receiver.team_id, receiver.pos)
        for i, d in enumerate(ordered[:2]):
            dist = distance_m(d.pos, receiver.pos)
            d_rel = attack_relative_x(receiver.team_id, d.pos)
            goal_side = 1.0 if d_rel >= receiver_rel - 0.5 else 0.0
            awareness = 0.55 + 0.45 * sigmoid(self._g_eff(d, "defensive_awareness"))
            local = sigmoid((3.2 - dist) / 0.95) * awareness * (1.0 + 0.18 * goal_side)
            pressure += local * (1.0 if i == 0 else 0.38)
        return clamp(pressure, 0.0, 1.0)

    def _pass_type(self, a: PlayerState, b: PlayerState) -> str:
        d = distance_m(a.pos, b.pos)
        a_rel = attack_relative_x(a.team_id, a.pos)
        b_rel = attack_relative_x(a.team_id, b.pos)
        progress = b_rel - a_rel
        # Byline/half-space balls played backward into the central box are cutbacks:
        # technically short passes under pressure, not aerial crosses.
        if a_rel >= 85 and abs(a.pos.y - 50.0) >= 23 and 76 <= b_rel <= a_rel - 2.0 and abs(b.pos.y - 50.0) <= 20:
            return "CUTBACK"
        # Wide final-third deliveries use Crossing rather than being mislabeled long passes.
        if a_rel >= 68 and abs(a.pos.y - 50.0) >= 24 and b_rel >= 78 and abs(b.pos.y - 50.0) <= 22:
            return "CROSS"
        # A through ball is a pass into the space behind a high/medium line. The receiver
        # must be onside at pass time; the ball itself can be led beyond the line later.
        line = self._offside_line(a.team_id)
        space_behind = 100.0 - line
        runner_role = b.instructions.attack_role.upper() in {"RUN_BEHIND", "POACHER", "SECOND_STRIKER", "INSIDE_FORWARD", "FREE_FORWARD", "WIDE_RUNNER"}
        if runner_role and a_rel >= 35.0 and progress >= 10.0 and d <= 33.0 and space_behind >= 18.0 and b_rel >= max(56.0, line - 2.5) and b_rel <= line + 0.12:
            return "THROUGH"
        if d >= 27:
            return "LONG"
        if progress >= 10:
            return "PROGRESSIVE"
        return "SHORT"

    def pass_execution_probability(self, carrier: PlayerState, target: PlayerState, pressure: float) -> float:
        ptype = self._pass_type(carrier, target)
        d = distance_m(carrier.pos, target.pos)
        attr = "crossing" if ptype == "CROSS" else ("long_passing" if ptype == "LONG" or (ptype == "THROUGH" and d >= 27) else "short_passing")
        if carrier.slot == "GK" and attr == "long_passing":
            attr = "gk_kicking"
        skill = 1.25 * self._g_eff(carrier, attr)
        if ptype == "PROGRESSIVE":
            skill += 0.22 * self._g_eff(carrier, "vision")
        elif ptype == "CUTBACK":
            skill += 0.26 * self._g_eff(carrier, "vision") + 0.08 * self._g_eff(carrier, "reactions")
        elif ptype == "THROUGH":
            skill += 0.34 * self._g_eff(carrier, "vision") + 0.10 * self._g_eff(carrier, "reactions")
        skill += 0.12 * self._g_eff(carrier, "ball_control")
        context = self.cal.pass_base - self.cal.pass_distance * d - self.cal.pass_pressure * self._effective_pressure(carrier, pressure)
        if ptype == "LONG":
            context -= 0.22
        elif ptype == "THROUGH":
            context -= 0.48
        elif ptype == "CUTBACK":
            context += 0.10
        elif ptype == "CROSS":
            context -= 0.12
        return bounded_sigmoid(context + skill, 0.04, 0.995)

    def _recognized(self, carrier: PlayerState, target: PlayerState, option_idx: int) -> bool:
        d = distance_m(carrier.pos, target.pos)
        progress = attack_relative_x(carrier.team_id, target.pos) - attack_relative_x(carrier.team_id, carrier.pos)
        difficulty = max(0.0, (d - 8.0) / 25.0) + max(0.0, progress - 10.0) / 35.0
        # Scanning degrades under real pressure: a hounded carrier sees fewer of his
        # options, and Vision/Reactions buy that awareness back. This is what makes
        # escaping a committed press a genuine perception contest rather than a
        # free geometry read (pressing architecture; recognition-only — execution
        # probabilities are untouched).
        pressure_now, _ = self._pressure(carrier)
        difficulty += 0.90 * pressure_now
        if self._pass_type(carrier, target) == "THROUGH":
            difficulty += 0.55
        l = 2.4 + 1.1 * self._g_eff(carrier, "vision") + 0.35 * self._g_eff(carrier, "reactions") - difficulty
        p = bounded_sigmoid(l, 0.25, 0.995)
        return self.rng.uniform("recognize", self.rng_context, carrier.player.player_id, target.player.player_id, option_idx) < p

    def _pass_option_utility(self, carrier: PlayerState, target: PlayerState, pressure: float) -> float:
        d = distance_m(carrier.pos, target.pos)
        progress = attack_relative_x(carrier.team_id, target.pos) - attack_relative_x(carrier.team_id, carrier.pos)
        centrality = 1.0 - abs(target.pos.y - 50.0) / 50.0
        p_exec = self.pass_execution_probability(carrier, target, pressure)
        ptype = self._pass_type(carrier, target)
        marking = self._receiver_marking_pressure(target)
        tactic = self.teams[carrier.team_id].tactics
        block_resistance = self._set_block_resistance(carrier.team_id)
        risk = {"SECURE": -0.24, "BALANCED": 0.0, "AMBITIOUS": 0.28}.get(tactic.progression_risk, 0.0)
        # Structural evaluation note (2026-08): rebalancing this progress-vs-risk
        # trade (0.95*progress + 1.05*ln(p_exec) + a global turnover-cost floor)
        # was tested and REVERTED — suppressing launches made controlled football
        # MORE sterile (guardrail xG 0.14+ fell to 0.07), because settled chance
        # creation cannot yet convert patient possession into chances; current
        # cagey/balanced xG is largely financed by launch-and-chaos sequences.
        # Fixing this requires the settled-penetration workstream (support
        # movement into receiving pockets, box occupation, second-phase play),
        # not a choice coefficient. Baseline evidence retained in
        # validation/POSSESSION_STRUCTURAL_REPORT.md.
        utility = 1.20 * progress / 20.0 + 0.22 * centrality + 0.78 * math.log(max(1e-4, p_exec)) + risk * max(0.0, progress / 15.0)
        # Passing Directness is a distance-banded choice preference, not an accuracy
        # modifier. A SHORT plan actively prefers feet-to-feet circulation and treats
        # a 27m+ ground launch as a last resort rather than a coin-flip peer of a
        # 10m pass; a DIRECT plan owns the long/vertical channel. Both preferences
        # fade against a set deep block, where the geometry (few pockets, high
        # recycle value) already dominates the choice and a patient side still
        # needs its relief outlet.
        if tactic.passing_directness == "SHORT":
            utility += 0.16 if d <= 15.0 else 0.0
            utility -= 0.50 * max(0.0, d - 18.0) / 18.0 * (1.0 - 0.70 * block_resistance)
        elif tactic.passing_directness == "DIRECT":
            utility += 0.30 * (d / 25.0) * (1.0 - 0.65 * block_resistance)
            if progress >= 10.0:
                utility += 0.12 * (1.0 - 0.65 * block_resistance)
        # Tightly marked receivers are less attractive, especially near goal. Through
        # balls are handled later because they target space rather than feet.
        target_rel = attack_relative_x(carrier.team_id, target.pos)
        utility -= marking * (0.48 + 0.34 * max(0.0, (target_rel - 70.0) / 25.0))
        # A deep, organized block removes central/vertical space.  Direct penetration is
        # therefore less attractive unless execution/receiver geometry is genuinely good;
        # wide and recycling options gain relative value.  No execution attribute changes.
        if block_resistance > 0.0:
            forward_push = clamp(progress / 16.0, 0.0, 1.6)
            target_central = clamp(1.0 - abs(target.pos.y - 50.0) / 32.0, 0.0, 1.0)
            # A set low block does not make a vertical pass technically harder by fiat; it
            # makes that *choice* less attractive because there are fewer clean receiving
            # pockets and a turnover has a high opportunity cost. Direct/vertical plans can
            # still attempt these balls, but repeated central forcing should lose out to
            # recycling, switches and wide combinations when the geometry says the block is set.
            penetration_intent = 1.0
            if tactic.passing_directness == "DIRECT":
                penetration_intent += 0.18
            if tactic.chance_creation_focus == "VERTICAL":
                penetration_intent += 0.20
            if progress > 4.0:
                utility -= block_resistance * forward_push * penetration_intent * (0.38 + 0.48 * target_central + 0.30 * marking)
            if target_rel >= 76.0 and target_central >= 0.45 and progress > 3.0:
                utility -= block_resistance * (0.22 + 0.26 * target_central + 0.20 * marking)
                # Long/direct entries into the heart of a packed low block need an
                # unusually good football reason to beat a recycle/wide option.  This is
                # an action-choice consequence of crowded geometry, not an execution nerf:
                # elite passers can still complete the ball if they choose it.
                if block_resistance >= 0.45 and ptype in {"LONG", "PROGRESSIVE", "THROUGH"}:
                    utility -= block_resistance * (0.30 + 0.28 * target_central + 0.18 * marking)
                    # A vertical/direct game plan is devastating when there is grass
                    # behind a high line, but the same intention should not blindly force
                    # passes into a settled ten-man shell.  The plan remains aggressive;
                    # the *matchup geometry* makes central direct entry less attractive and
                    # pushes the attack toward second phases, width and individual actions.
                    if tactic.chance_creation_focus == "VERTICAL":
                        utility -= block_resistance * (0.62 + 0.42 * target_central)
                    if tactic.passing_directness == "DIRECT":
                        utility -= 0.28 * block_resistance * target_central
            if abs(target.pos.y - 50.0) >= 24.0 and progress >= -3.0:
                utility += 0.30 * block_resistance
                if block_resistance >= 0.45 and tactic.chance_creation_focus == "VERTICAL":
                    utility += 0.18 * block_resistance
            if progress <= 2.0:
                utility += 0.16 * block_resistance
                if block_resistance >= 0.45 and tactic.chance_creation_focus == "VERTICAL":
                    utility += 0.10 * block_resistance
        margin = self._offside_margin(carrier, target)
        if margin > 0:
            utility -= 1.15 + 0.75 * min(3.0, margin)
        # Vacated-space exploitation (pressing architecture): a pass that carries
        # the ball beyond defenders who are currently committed to pressing this
        # carrier attacks the structure they physically left. The value scales with
        # how far each beaten presser has actually abandoned his structural
        # position (the real size of the hole), read from live engagement state —
        # pure choice geometry: recognition still gates the option, execution
        # probabilities are untouched, and nothing is scripted per intensity.
        if progress > 2.0:
            beat_value = 0.0
            for opp_pid, ep in self._press_active.items():
                if ep.get("carrier") != carrier.player.player_id or self.clock - ep.get("last", -99) > 1:
                    continue
                presser_state = self.states.get(opp_pid)
                if presser_state is None or not presser_state.active:
                    continue
                p_rel = attack_relative_x(carrier.team_id, presser_state.pos)
                if target_rel > p_rel + 1.5:
                    abandon = distance_m(presser_state.pos, Vec2(ep["struct_x"], ep["struct_y"]))
                    beat_value += clamp(abandon / 12.0, 0.2, 1.0)
            utility += min(0.50, 0.22 * beat_value)
        focus = tactic.chance_creation_focus
        if focus == "CENTRAL": utility += 0.18 * centrality
        elif focus == "WIDE": utility += 0.16 * (1.0 - centrality)
        elif focus == "VERTICAL": utility += 0.18 * max(-0.5, min(1.5, progress / 15.0))
        probe = self._settled_probe(carrier.team_id)
        if probe > 0 and progress > 2.0 and ptype in {"SHORT", "PROGRESSIVE", "CUTBACK", "CROSS"}:
            # Controlled teams patiently wait for *high-confidence* progression rather than
            # becoming permanently sterile. Elite passing/vision raises p_exec and therefore
            # receives more of this utility; risky low-percentage balls do not.
            confidence = clamp((p_exec - 0.62) / 0.30, 0.0, 1.0)
            advanced = clamp((target_rel - 58.0) / 30.0, 0.0, 1.0)
            utility += self.cal.settled_probe_pass_utility * probe * confidence * (0.45 + 0.55 * advanced)
        turnover_risk = (1.0 - p_exec) * (0.75 + 0.55 * max(0.0, progress / 20.0))
        carrier_rel = attack_relative_x(carrier.team_id, carrier.pos)
        own_goal_danger = clamp((38.0 - carrier_rel) / 32.0, 0.0, 1.0)
        # Losing the ball five metres from your own box is more costly than losing the
        # identical pass around halfway.  This changes action choice only; pass execution
        # probability is untouched.  Receiver marking makes that local turnover cost worse.
        turnover_consequence = own_goal_danger * (0.55 + 0.85 * pressure + 0.45 * marking)
        utility -= turnover_risk * turnover_consequence
        if tactic.progression_risk == "SECURE":
            utility -= 0.72 * turnover_risk + 0.32 * turnover_risk * own_goal_danger
        elif tactic.progression_risk == "AMBITIOUS":
            utility += 0.22 * max(0.0, progress / 15.0) - 0.10 * turnover_risk
        transition = self._is_transition_attack(carrier.team_id)
        if transition:
            if tactic.after_winning_possession == "COUNTER":
                utility += 0.28 * max(-0.5, min(1.8, progress / 12.0))
            elif tactic.after_winning_possession == "SECURE":
                utility -= 0.30 * max(0.0, progress / 12.0)
                utility += 0.16 if progress <= 2.0 else 0.0
        if ptype == "THROUGH":
            utility += 0.42 * marking
            # THROUGH is only generated when an onside runner and real space behind the
            # line exist, so its baseline choice cost can be lower than a generic hopeful
            # direct ball. This makes two aggressive/high-line teams actually exploit the
            # open grass their tactics create, without affecting deep blocks where the
            # option is not generated in the first place.
            utility -= 1.92
            if tactic.passing_directness == "DIRECT": utility += 0.24
            if tactic.progression_risk == "AMBITIOUS": utility += 0.28
            if tactic.progression_risk == "SECURE": utility -= 0.52
            if tactic.chance_creation_focus == "VERTICAL": utility += 0.30
            if transition and tactic.after_winning_possession == "COUNTER": utility += 0.36
        if ptype == "CUTBACK":
            utility -= 0.62
            utility += 0.32 * self._settled_probe(carrier.team_id)
            if tactic.chance_creation_focus in {"WIDE", "BALANCED"}: utility += 0.16
            if tactic.box_commitment == "COMMIT": utility += 0.16
            elif tactic.box_commitment == "CAUTIOUS": utility -= 0.12
        if ptype == "CROSS":
            # Crosses are costly by default, but a settled wide attack facing a packed
            # shell should prefer a genuine delivery/second phase over repeated sterile
            # central forcing or 30m pot-shots.  Again, this changes choice utility only;
            # Crossing still owns technical delivery quality.
            utility -= 1.05
            if tactic.chance_creation_focus == "WIDE": utility += 0.45
            if tactic.box_commitment == "COMMIT": utility += 0.22
            if tactic.chance_creation_focus == "CENTRAL": utility -= 0.20
            wide_carrier = clamp((abs(carrier.pos.y - 50.0) - 18.0) / 24.0, 0.0, 1.0)
            advanced_carrier = clamp((attack_relative_x(carrier.team_id, carrier.pos) - 66.0) / 22.0, 0.0, 1.0)
            if tactic.chance_creation_focus == "WIDE":
                utility += 0.34 * block_resistance * wide_carrier * advanced_carrier
                utility += 0.12 * self._settled_probe(carrier.team_id)
        if carrier.slot == "GK":
            gk_role = carrier.instructions.attack_role.upper()
            if gk_role == "SHORT_BUILD_UP":
                utility += 0.42 if d <= 22 else -0.28
            elif gk_role == "DIRECT_DISTRIBUTOR":
                utility += 0.38 if d >= 28 else -0.12
            elif gk_role == "SUPPORT_KEEPER":
                utility += 0.16 if d <= 26 else 0.0
        return utility

    def _choose_pass_target(self, carrier: PlayerState, pressure: float) -> tuple[PlayerState | None, float]:
        options: list[PlayerState] = []
        utilities: list[float] = []
        for i, s in enumerate(self._team_states(carrier.team_id)):
            if s.player.player_id == carrier.player.player_id or (s.slot == "GK" and attack_relative_x(carrier.team_id, carrier.pos) > 45):
                continue
            d = distance_m(carrier.pos, s.pos)
            if d > 49 or d < 2.0:
                continue
            if self._offside_margin(carrier, s) > 3.0:
                continue
            if not self._recognized(carrier, s, i):
                continue
            options.append(s)
            utilities.append(self._pass_option_utility(carrier, s, pressure))
        if not options:
            return None, -99.0
        probs = softmax(utilities, temperature=0.75)
        idx = self.rng.choice_index(probs, "pass_choice", self.rng_context, carrier.player.player_id)
        return options[idx], utilities[idx]

    def _interception_candidate(self, carrier: PlayerState, actual_target: Vec2) -> tuple[PlayerState | None, float]:
        best = None
        best_p = 0.0
        pass_dist = max(1.0, distance_m(carrier.pos, actual_target))
        for d in self._team_states(self._opp_id(carrier.team_id)):
            if d.slot == "GK":
                continue
            perp, along = point_segment_distance_m(d.pos, carrier.pos, actual_target)
            if not (0.08 < along < 0.95) or perp > 5.5:
                continue
            travel_time = pass_dist * along / 15.0
            reach_need = max(0.0, perp - 0.7)
            accel = effective_attribute(d.player, d, "acceleration")
            reach_speed = 2.6 + 3.0 * accel / 99.0
            reach_time = reach_need / max(0.5, reach_speed)
            geom = sigmoid((travel_time - reach_time) * 2.0) * sigmoid((4.3 - perp) / 0.9)
            l = -2.35 + 1.05 * self._g_eff(d, "interceptions") + 0.55 * self._g_eff(d, "defensive_awareness") + 0.25 * self._g_eff(d, "reactions") + 1.8 * geom
            p = bounded_sigmoid(l, 0.0, self.cal.interception_cap) * geom
            if p > best_p:
                best, best_p = d, p
        return best, clamp(best_p, 0.0, 0.90)

    def _receiver_contest_candidate(self, receiver: PlayerState, actual: Vec2, receiver_error_m: float, pass_distance_m: float = 0.0) -> tuple[PlayerState | None, float]:
        """Defender contest at the receiving point after the ball has bypassed the lane.

        This is distinct from an interception.  A compact defender can be unable to cut out
        the pass itself but still arrive tight enough to poke the receiver's first touch.
        Geometry gates the contest; attributes only resolve it once the defender is close.
        """
        defenders = [d for d in self._team_states(self._opp_id(receiver.team_id)) if d.slot != "GK"]
        if not defenders:
            return None, 0.0
        rec_rel = attack_relative_x(receiver.team_id, receiver.pos)
        best, best_p = None, 0.0
        candidates: list[tuple[PlayerState, float]] = []
        for d in defenders:
            dist = distance_m(d.pos, actual)
            # Longer passes give nearby defenders time to converge on the receiving
            # point even when they cannot intersect the lane itself. Reactions and
            # acceleration influence how much of that theoretical convergence window
            # the defender can exploit.
            react_move = 0.55 * sigmoid(self._g_eff(d, "reactions")) + 0.45 * sigmoid(self._g_eff(d, "acceleration"))
            contest_radius = clamp(3.45 + 0.038 * pass_distance_m + 0.55 * react_move, 3.6, 5.25)
            if dist > contest_radius:
                continue
            d_rel = attack_relative_x(receiver.team_id, d.pos)
            goal_side = clamp((d_rel - rec_rel + 2.0) / 4.0, 0.0, 1.0)
            geom = sigmoid((3.35 - dist) / 0.78) * (0.70 + 0.30 * goal_side)
            defend = 0.52 * self._g_eff(d, "interceptions") + 0.42 * self._g_eff(d, "defensive_awareness") + 0.24 * self._g_eff(d, "reactions")
            receive = 0.54 * self._g_eff(receiver, "ball_control") + 0.30 * self._g_eff(receiver, "reactions") + 0.16 * self._g_eff(receiver, "agility")
            l = -1.55 + 0.92 * defend - 0.72 * receive + 1.15 * geom + 0.20 * min(3.0, receiver_error_m)
            p = clamp(sigmoid(l) * geom, 0.0, 0.72)
            if p > 0.0:
                candidates.append((d, p))
            if p > best_p:
                best, best_p = d, p
        if not candidates or best is None:
            return None, 0.0

        # Several compact defenders can jointly smother a receiving window even when no
        # single player can intercept the pass lane.  Combine only the strongest nearby
        # influences with diminishing returns; the best defender still receives event
        # attribution if the denial happens.  This is the same geometry-first principle as
        # the common probability layer: extra bodies matter because they are actually there,
        # not because the defending team selected a "low block" label.
        candidates.sort(key=lambda item: item[1], reverse=True)
        survival = 1.0
        for rank, (_, p) in enumerate(candidates[:3]):
            support_weight = 1.0 if rank == 0 else (0.58 if rank == 1 else 0.34)
            survival *= 1.0 - clamp(p * support_weight, 0.0, 0.80)
        combined = clamp(1.0 - survival, best_p, 0.82)
        return best, combined

    def _execute_pass(self, carrier: PlayerState, target: PlayerState, pressure: float, presser: PlayerState | None) -> None:
        carrier.passes_attempted += 1
        carrier.touches += 1
        margin = self._offside_margin(carrier, target)
        if margin > 0.12:
            carrier.turnovers += 1
            self._record_event("OFFSIDE", carrier.team_id, target, {"passer": carrier.player.name, "margin_pitch_units": round(margin, 3)})
            opponents = self._team_states(self._opp_id(carrier.team_id))
            restart = min(opponents, key=lambda s: distance_m(s.pos, target.pos))
            self._change_possession(restart.team_id, restart, "offside")
            add_performance(target, -0.035, 0.25, component="attack")
            return
        ptype = self._pass_type(carrier, target)
        d = distance_m(carrier.pos, target.pos)
        progress = attack_relative_x(carrier.team_id, target.pos) - attack_relative_x(carrier.team_id, carrier.pos)

        if ptype == "CROSS":
            self._execute_cross(carrier, target, pressure)
            return
        if ptype == "THROUGH":
            self._execute_through_pass(carrier, target, pressure, presser)
            return

        # Direct/long balls become aerial contests often enough for Height/Weight to matter.
        directness = self.teams[carrier.team_id].tactics.passing_directness
        aerial_chance = clamp((d - 34.0) / 34.0 + (0.16 if directness == "DIRECT" else 0.0), 0.0, 0.38)
        if ptype == "LONG" and self.rng.uniform("pass_aerial", self.rng_context, carrier.player.player_id, target.player.player_id) < aerial_chance:
            self._execute_aerial_pass(carrier, target, pressure, presser)
            return

        p_exec = self.pass_execution_probability(carrier, target, pressure)
        skill_attr = "gk_kicking" if carrier.slot == "GK" and ptype == "LONG" else ("long_passing" if ptype == "LONG" else "short_passing")
        skill = effective_attribute(carrier.player, carrier, skill_attr)
        sigma_m = max(0.20, 2.15 - 0.017 * skill + 0.024 * d + 1.10 * pressure)
        lateral_m = self.rng.normal("pass_err_lat", self.rng_context) * sigma_m
        depth_m = self.rng.normal("pass_err_depth", self.rng_context) * sigma_m * 0.75
        dx, dy = target.pos.x - carrier.pos.x, target.pos.y - carrier.pos.y
        mag = math.hypot(dx, dy) or 1.0
        ux, uy = dx / mag, dy / mag
        px, py = -uy, ux
        raw_actual = Vec2(
            target.pos.x + (ux * depth_m + px * lateral_m) * 100.0 / 105.0,
            target.pos.y + (uy * depth_m + py * lateral_m) * 100.0 / 68.0,
        )
        if self._handle_out_of_play(carrier.team_id, raw_actual, "misplaced_pass"):
            self._record_event("PASS", carrier.team_id, carrier, {"target_name": target.player.name, "pass_type": ptype, "distance_m": round(d,2), "outcome": "OUT_OF_PLAY"})
            carrier.turnovers += 1
            return
        actual = raw_actual.clamp()
        defender, p_int = self._interception_candidate(carrier, actual)
        intercepted = defender is not None and self.rng.uniform("intercept", self.rng_context, defender.player.player_id) < p_int
        detail = {
            "target_id": target.player.player_id,
            "target_name": target.player.name,
            "pass_type": ptype,
            "distance_m": round(d, 2),
            "progress_m_equiv": round(progress * 1.05, 2),
            "pressure": round(pressure, 3),
            "p_execution": round(p_exec, 4),
            "p_interception": round(p_int, 4),
            "intended": [round(target.pos.x, 2), round(target.pos.y, 2)],
            "actual_target": [round(actual.x, 2), round(actual.y, 2)],
        }
        if intercepted and defender:
            defender.interceptions += 1
            carrier.turnovers += 1
            self._change_possession(defender.team_id, defender, "interception")
            detail.update({"outcome": "INTERCEPTED", "interceptor": defender.player.name})
            self._record_event("PASS", carrier.team_id, carrier, detail)
            add_performance(defender, 0.16 + 0.06 * max(0.0, progress / 15.0), 1.0, component="defense")
            add_performance(carrier, -0.10 - 0.05 * max(0.0, progress / 20.0), 1.0, component="possession")
            return

        receiver_error_m = distance_m(actual, target.pos)
        receiver_pressure, _ = self._pressure(target)
        marking_pressure = self._receiver_marking_pressure(target)
        receive_pressure = max(receiver_pressure, marking_pressure)
        contest_defender, p_denial = self._receiver_contest_candidate(target, actual, receiver_error_m, d)
        detail["p_receiver_denial"] = round(p_denial, 4)
        if contest_defender is not None and self.rng.uniform("receiver_denial", self.rng_context, target.player.player_id, contest_defender.player.player_id) < p_denial:
            carrier.turnovers += 1
            contest_defender.interceptions += 1
            detail.update({"outcome": "RECEIVER_DENIED", "denier": contest_defender.player.name})
            self._record_event("PASS", carrier.team_id, carrier, detail)
            self._change_possession(contest_defender.team_id, contest_defender, "receiver_denial")
            add_performance(contest_defender, 0.10 + 0.04 * max(0.0, progress / 15.0), 0.65, component="defense")
            add_performance(carrier, -0.07, 0.5, component="possession")
            return
        # Balance stabilizes a physically disturbed reception (zero effect on a
        # clean unmarked touch); Composure resists the rush of receiving under
        # pressure. Both are contextual: their terms vanish without contest.
        disturbance = clamp(marking_pressure + 0.4 * receive_pressure, 0.0, 1.0)
        touch_l = (1.82 + 1.12 * self._g_eff(target, "ball_control") + 0.48 * self._g_eff(target, "reactions")
                   - 0.20 * receiver_error_m - 1.30 * self._effective_pressure(target, receive_pressure)
                   - 0.38 * marking_pressure + 0.42 * self._g_eff(target, "balance") * disturbance)
        p_control = bounded_sigmoid(touch_l, 0.08, 0.995)
        detail["p_control"] = round(p_control, 4)
        detail["receiver_marking_pressure"] = round(marking_pressure, 4)
        if self.rng.uniform("touch", self.rng_context, target.player.player_id) < p_control:
            carrier.passes_completed += 1
            if progress >= 10:
                carrier.progressive_passes += 1
            target.touches += 1
            target.ball_exposure = clamp(0.24 + 0.55 * (1.0 - p_control) + 0.22 * receive_pressure, 0.12, 0.90)
            target.pos = Vec2(target.pos.x + 0.35 * (actual.x - target.pos.x), target.pos.y + 0.35 * (actual.y - target.pos.y)).clamp()
            self.ball = BallState(target.pos, BallControlState.CONTROLLED, carrier.team_id, target.player.player_id, BallHeightState.GROUND, carrier.player.player_id)
            self.possession_team = carrier.team_id
            detail["outcome"] = "COMPLETED"
            if attack_relative_x(carrier.team_id, carrier.pos) < 84.3 <= attack_relative_x(carrier.team_id, target.pos):
                self._record_event("BOX_ENTRY", carrier.team_id, target, {"via": "PASS", "passer": carrier.player.name})
            self._record_event("PASS", carrier.team_id, carrier, detail)
            self._note_completed_pass(carrier.team_id, carrier.player.player_id, target.player.player_id)
            self._schedule_reception_ready(1.15 * (1.0 - p_control) + 0.55 * receive_pressure + 0.10 * min(d, 40.0) / 40.0,
                                           urgent=receive_pressure >= 0.45)
            add_performance(carrier, 0.025 + 0.04 * max(0.0, progress / 15.0) + 0.05 * (1.0 - p_exec), 0.55, component="possession")
            if presser and pressure > 0.45 and progress < -3:
                presser.effective_pressures += 1
                add_performance(presser, 0.035, 0.25, component="defense")
            if ptype == "CUTBACK":
                self._resolve_cutback_continuation(carrier, target, receive_pressure)
        else:
            carrier.turnovers += 1
            detail["outcome"] = "LOOSE"
            self._record_event("PASS", carrier.team_id, carrier, detail)
            add_performance(carrier, -0.07 - 0.03 * max(0.0, progress / 15.0), 0.7, component="possession")
            self._resolve_loose_ball(actual, carrier.team_id, "pass_failure")

    def _execute_through_pass(self, carrier: PlayerState, target: PlayerState, pressure: float, presser: PlayerState | None) -> None:
        """Ground pass led into space behind the defensive line, followed by a race."""
        start_rel = attack_relative_x(carrier.team_id, carrier.pos)
        target_rel = attack_relative_x(carrier.team_id, target.pos)
        line = self._offside_line(carrier.team_id)
        space_behind = max(0.0, 100.0 - line)
        accel = effective_attribute(target.player, target, "acceleration")
        sprint = effective_attribute(target.player, target, "sprint_speed")
        lead = clamp(8.0 + 0.050 * accel + 0.040 * sprint, 9.0, min(18.0, max(9.0, space_behind - 4.0)))
        intended_rel = clamp(max(target_rel + lead, line + 5.0), 5.0, 96.0)
        intended = from_attack_frame(carrier.team_id, intended_rel, target.pos.y)
        d = distance_m(carrier.pos, intended)
        p_exec = self.pass_execution_probability(carrier, target, pressure)
        pass_attr = "gk_kicking" if carrier.slot == "GK" and d >= 27 else ("long_passing" if d >= 27 else "short_passing")
        skill = effective_attribute(carrier.player, carrier, pass_attr)
        vision = effective_attribute(carrier.player, carrier, "vision")
        sigma_m = max(0.65, 3.15 - 0.015 * skill - 0.006 * vision + 0.028 * d + 1.15 * self._effective_pressure(carrier, pressure))
        lateral_m = self.rng.normal("through_err_lat", self.rng_context, carrier.player.player_id) * sigma_m
        depth_m = self.rng.normal("through_err_depth", self.rng_context, carrier.player.player_id) * sigma_m * 0.85
        dx, dy = intended.x - carrier.pos.x, intended.y - carrier.pos.y
        mag = math.hypot(dx, dy) or 1.0
        ux, uy = dx / mag, dy / mag
        px, py = -uy, ux
        raw = Vec2(
            intended.x + (ux * depth_m + px * lateral_m) * 100.0 / 105.0,
            intended.y + (uy * depth_m + py * lateral_m) * 100.0 / 68.0,
        )
        detail = {
            "target_id": target.player.player_id, "target_name": target.player.name, "pass_type": "THROUGH",
            "distance_m": round(d, 2), "pressure": round(pressure, 3), "p_execution": round(p_exec, 4),
            "defensive_line": round(line, 2), "space_behind_line": round(space_behind, 2),
            "lead_pitch_units": round(lead, 2), "transition": self._is_transition_attack(carrier.team_id),
            "intended": [round(intended.x, 2), round(intended.y, 2)],
        }
        if self._handle_out_of_play(carrier.team_id, raw, "overhit_through_ball"):
            carrier.turnovers += 1
            detail["outcome"] = "OUT_OF_PLAY"
            self._record_event("PASS", carrier.team_id, carrier, detail)
            return
        actual = raw.clamp()
        detail["actual_target"] = [round(actual.x, 2), round(actual.y, 2)]
        defender, p_int = self._interception_candidate(carrier, actual)
        detail["p_interception"] = round(p_int, 4)
        if defender is not None and self.rng.uniform("through_intercept", self.rng_context, defender.player.player_id) < p_int:
            defender.interceptions += 1
            carrier.turnovers += 1
            detail.update({"outcome": "INTERCEPTED", "interceptor": defender.player.name})
            self._record_event("PASS", carrier.team_id, carrier, detail)
            self._change_possession(defender.team_id, defender, "through_interception")
            add_performance(defender, 0.20, 0.95, component="defense")
            return

        t_att = self._arrival_time(target, actual)
        gk = self._goalkeeper(carrier.team_id)
        p_sweep, t_gk = self._gk_sweep_probability(gk, carrier.team_id, actual, t_att)
        detail.update({"p_gk_sweep": round(p_sweep,4), "gk_arrival_s": round(t_gk,3)})
        if p_sweep > 0 and self.rng.uniform("gk_sweep", self.rng_context, gk.player.player_id, target.player.player_id) < p_sweep:
            gk.gk_sweeps += 1
            gk.recoveries += 1
            gk.pos = actual
            carrier.turnovers += 1
            detail.update({"outcome": "GK_SWEEP", "sweeper": gk.player.name})
            self._record_event("PASS", carrier.team_id, carrier, detail)
            self._record_event("GK_SWEEP", gk.team_id, gk, {"target": target.player.name, "landing": [round(actual.x,2), round(actual.y,2)], "p_sweep": round(p_sweep,4)})
            self._change_possession(gk.team_id, gk, "gk_sweep")
            add_performance(gk, 0.11 + 0.05 * max(0.0, 1.0 - p_sweep), 0.7, component="goalkeeping")
            return
        opponents = [s for s in self._team_states(self._opp_id(carrier.team_id)) if s.slot != "GK"]
        race_defender = min(opponents, key=lambda s: self._arrival_time(s, actual))
        t_def = self._arrival_time(race_defender, actual)
        detail.update({"receiver_arrival_s": round(t_att, 3), "defender_arrival_s": round(t_def, 3), "race_defender": race_defender.player.name})
        target_wins = True
        if abs(t_att - t_def) <= 0.55:
            p_race = self.ground_duel_probability(target, race_defender, t_def - t_att)
            target_wins = self.rng.uniform("through_race", self.rng_context, target.player.player_id, race_defender.player.player_id) < p_race
            detail["p_receiver_race"] = round(p_race, 4)
        elif t_att > t_def:
            target_wins = False

        if not target_wins:
            carrier.turnovers += 1
            race_defender.recoveries += 1
            race_defender.pos = actual
            detail["outcome"] = "DEFENDER_WINS_RACE"
            self._record_event("PASS", carrier.team_id, carrier, detail)
            self._change_possession(race_defender.team_id, race_defender, "through_ball_race")
            add_performance(race_defender, 0.12, 0.70, component="defense")
            return

        receiver_pressure = clamp(sigmoid((2.8 - max(0.0, t_def - t_att) * 5.0) / 1.2), 0.0, 1.0)
        touch_l = 2.05 + 1.05 * self._g_eff(target, "ball_control") + 0.55 * self._g_eff(target, "reactions") - 0.72 * receiver_pressure - 0.08 * sigma_m
        p_control = bounded_sigmoid(touch_l, 0.12, 0.985)
        detail["p_control"] = round(p_control, 4)
        target.pos = actual
        if self.rng.uniform("through_touch", self.rng_context, target.player.player_id) < p_control:
            carrier.passes_completed += 1
            carrier.progressive_passes += 1
            target.touches += 1
            target.ball_exposure = clamp(0.28 + 0.35 * receiver_pressure, 0.18, 0.72)
            # A successful through ball is received into stride rather than freezing the
            # runner at the landing point. The continuation only occurs if the actual
            # forward corridor is open, so deep blocks still force a contest.
            stride_space = self._space_ahead(target)
            if stride_space > 0.42:
                rel_before_stride = attack_relative_x(target.team_id, target.pos)
                stride = clamp(1.5 + 4.5 * stride_space + 0.7 * max(0.0, self._g_eff(target, "acceleration")), 1.5, 6.5)
                new_pos = from_attack_frame(target.team_id, clamp(rel_before_stride + stride, 4.0, 96.0), target.pos.y)
                self._apply_action_movement(target, new_pos, 6.4, "transition_run")
                target.carries += 1
                if stride >= 4.5:
                    target.progressive_carries += 1
                self._record_event("TRANSITION_RUN", target.team_id, target, {"distance_m": round(stride * 1.05, 2), "via": "THROUGH_BALL"})
            self.ball = BallState(target.pos, BallControlState.CONTROLLED, carrier.team_id, target.player.player_id, BallHeightState.GROUND, carrier.player.player_id)
            self.possession_team = carrier.team_id
            detail["outcome"] = "COMPLETED_INTO_SPACE"
            if start_rel < 84.3 <= attack_relative_x(carrier.team_id, target.pos):
                self._record_event("BOX_ENTRY", carrier.team_id, target, {"via": "THROUGH_PASS", "passer": carrier.player.name})
            add_performance(carrier, 0.14 + 0.08 * (1.0 - p_exec), 0.9, component="possession")
            self._note_completed_pass(carrier.team_id, carrier.player.player_id, target.player.player_id)
            self._schedule_reception_ready(0.25, urgent=True)  # running onto space: play continues at speed
        else:
            carrier.turnovers += 1
            detail["outcome"] = "HEAVY_TOUCH_LOOSE"
            self._resolve_loose_ball(actual, carrier.team_id, "through_touch_failure")
        self._record_event("PASS", carrier.team_id, carrier, detail)

    # ------------------------------------------------------------------
    # Loose balls / ground duels / aerials
    # ------------------------------------------------------------------
    def _arrival_time(self, s: PlayerState, origin: Vec2) -> float:
        d = distance_m(s.pos, origin)
        react = effective_attribute(s.player, s, "reactions")
        accel = effective_attribute(s.player, s, "acceleration")
        sprint = effective_attribute(s.player, s, "sprint_speed")
        reaction_delay = 0.55 - 0.0038 * react
        speed = 2.5 + 0.024 * accel + 0.018 * sprint
        return max(0.05, reaction_delay) + d / max(2.3, speed)

    def ground_duel_probability(self, a: PlayerState, b: PlayerState, arrival_advantage_s: float = 0.0) -> float:
        strength = self._g_eff(a, "strength") - self._g_eff(b, "strength")
        control = self._g_eff(a, "ball_control") - self._g_eff(b, "ball_control")
        reactions = self._g_eff(a, "reactions") - self._g_eff(b, "reactions")
        mass = self._mass_term(a) - self._mass_term(b)
        # Balance is stability in the scramble — distinct from Strength (force):
        # a light, balanced player keeps his feet; force contests stay with
        # Strength/mass exactly as before.
        balance = self._g_eff(a, "balance") - self._g_eff(b, "balance")
        l = 1.2 * arrival_advantage_s + 0.55 * strength + 0.35 * control + 0.25 * reactions + 0.24 * mass + 0.20 * balance
        return bounded_sigmoid(l, 0.08, 0.92)

    def _resolve_loose_ball(self, origin: Vec2, source_team: str, reason: str) -> PlayerState:
        # A relief action (clearance/block/parry/punch) marks the moment the relieving
        # defense starts reorganizing its shape. gk_parry is raised with the shooter's
        # team as source, so the relieving side is the opponent in that one case.
        if reason in self.SECOND_PHASE_REASONS:
            relieving = self._opp_id(source_team) if reason == "gk_parry" else source_team
            self._last_relief[relieving] = self.clock
        self.ball = BallState(origin, BallControlState.LOOSE, None, None, BallHeightState.GROUND, self.ball.last_touch_player_id)
        candidates = sorted(self._team_states("HOME") + self._team_states("AWAY"), key=lambda s: self._arrival_time(s, origin))[:6]
        first = candidates[0]
        if len(candidates) > 1:
            second = candidates[1]
            t1, t2 = self._arrival_time(first, origin), self._arrival_time(second, origin)
            if first.team_id != second.team_id and abs(t2 - t1) < 0.42:
                first.ground_duels += 1
                second.ground_duels += 1
                p_first = self.ground_duel_probability(first, second, t2 - t1)
                winner, loser = (first, second) if self.rng.uniform("ground_duel", self.rng_context, reason, first.player.player_id, second.player.player_id) < p_first else (second, first)
                winner.ground_duels_won += 1
                add_explosive_load(first, duel=0.55)
                add_explosive_load(second, duel=0.55)
                add_performance(winner, 0.08 + 0.05 * (1.0 - (p_first if winner is first else 1.0 - p_first)), 0.55, component="defense" if winner.team_id != self.possession_team else "possession")
                duel_detail = {
                    "opponent": loser.player.name,
                    "reason": reason,
                    "p_first_win": round(p_first, 4),
                    "winner": winner.player.name,
                }
                self._record_event("GROUND_DUEL", winner.team_id, winner, duel_detail)
                # Scrappy simultaneous arrivals can create a foul; Aggression raises
                # involvement while technique/awareness make the contact cleaner.
                foul_l = -3.15 + 0.42 * self._g_eff(loser, "aggression") - 0.25 * self._g_eff(loser, "standing_tackle") - 0.18 * self._g_eff(loser, "defensive_awareness")
                p_foul = clamp(sigmoid(foul_l), 0.008, 0.075)
                if self.rng.uniform("ground_duel_foul", self.rng_context, reason, loser.player.player_id) < p_foul:
                    self._register_foul(loser, winner, severity=0.22 + 0.10 * max(0.0, self._g_eff(loser, "aggression")), tactical=False)
                    return winner
                first = winner
        first.recoveries += 1
        self._change_possession(first.team_id, first, reason)
        self._record_event("RECOVERY", first.team_id, first, {"reason": reason, "origin": [round(origin.x, 2), round(origin.y, 2)]})
        return first

    def _gk_sweep_probability(self, gk: PlayerState, attacking_team: str, landing: Vec2, attacker_arrival_s: float) -> tuple[float, float]:
        role = gk.instructions.defense_role.upper()
        role_adv = {"LINE_KEEPER": 0.0, "AREA_COMMANDER": 0.08, "SWEEPER": 0.24, "AGGRESSIVE_SWEEPER": 0.42}.get(role, 0.0)
        t_gk = max(0.05, self._arrival_time(gk, landing) - role_adv)
        rel = attack_relative_x(attacking_team, landing)
        if rel < 80.0:
            return 0.0, t_gk
        timing_adv = attacker_arrival_s - t_gk
        l = -0.55 + 0.70 * self._g_eff(gk, "gk_positioning") + 0.28 * self._g_eff(gk, "reactions") + 0.80 * timing_adv
        if role == "SWEEPER": l += 0.25
        elif role == "AGGRESSIVE_SWEEPER": l += 0.52
        elif role == "LINE_KEEPER": l -= 0.34
        return bounded_sigmoid(l, 0.01, 0.94), t_gk

    def _try_gk_high_ball(self, attacking_team: str, landing: Vec2, context: str) -> bool:
        """Attempt a claim/punch only when geometry actually puts the keeper in range."""
        gk = self._goalkeeper(attacking_team)
        role = gk.instructions.defense_role.upper()
        rel = attack_relative_x(attacking_team, landing)
        if rel < 87.0:
            return False
        dist = distance_m(gk.pos, landing)
        radius = 4.8 + (1.7 if role == "AREA_COMMANDER" else 0.8 if role in {"SWEEPER", "AGGRESSIVE_SWEEPER"} else 0.0)
        if dist > radius:
            return False
        bodies = [p for p in self._team_states("HOME") + self._team_states("AWAY") if p.player.player_id != gk.player.player_id and distance_m(p.pos, landing) <= 3.2]
        traffic = clamp(len(bodies) / 5.0, 0.0, 1.0)
        height = self._height_term(gk)
        l_claim = -0.15 + 0.72 * self._g_eff(gk, "gk_handling") + 0.55 * self._g_eff(gk, "gk_positioning") + 0.18 * self._g_eff(gk, "reactions") + 0.24 * height - 0.70 * traffic - 0.08 * dist
        if role == "AREA_COMMANDER": l_claim += 0.32
        p_claim = bounded_sigmoid(l_claim, 0.06, 0.90)
        draw = self.rng.uniform("gk_high_ball", self.rng_context, context, gk.player.player_id)
        if draw < p_claim:
            gk.gk_claims += 1
            gk.recoveries += 1
            gk.pos = landing
            self._record_event("GK_CLAIM", gk.team_id, gk, {"context": context, "landing": [round(landing.x,2), round(landing.y,2)], "p_claim": round(p_claim,4), "traffic": round(traffic,3)})
            self._change_possession(gk.team_id, gk, "gk_claim")
            add_performance(gk, 0.08 + 0.08 * traffic, 0.6, component="goalkeeping")
            return True
        p_punch = clamp(0.46 + 0.18 * max(0.0, self._g_eff(gk, "gk_reflexes")) + (0.10 if role == "AREA_COMMANDER" else 0.0), 0.30, 0.72)
        if draw < p_claim + (1.0 - p_claim) * p_punch:
            gk.gk_punches += 1
            self._record_event("GK_PUNCH", gk.team_id, gk, {"context": context, "landing": [round(landing.x,2), round(landing.y,2)], "p_claim": round(p_claim,4), "traffic": round(traffic,3)})
            punch_rel = attack_relative_x(gk.team_id, landing) + 10.0
            punch = from_attack_frame(gk.team_id, clamp(punch_rel, 18.0, 60.0), clamp(landing.y + self.rng.normal("punch_y", self.rng_context) * 7.0, 5.0, 95.0))
            self._resolve_loose_ball(punch, gk.team_id, "gk_punch")
            add_performance(gk, 0.045, 0.4, component="goalkeeping")
            return True
        self._record_event("GK_HIGH_BALL_MISS", gk.team_id, gk, {"context": context, "landing": [round(landing.x,2), round(landing.y,2)], "p_claim": round(p_claim,4), "traffic": round(traffic,3)})
        add_performance(gk, -0.055, 0.45, component="goalkeeping")
        return False

    def aerial_win_probability(self, attacker: PlayerState, defender: PlayerState, landing: Vec2) -> float:
        h_a = attacker.player.height_cm if attacker.player.height_cm is not None else 183.0
        h_d = defender.player.height_cm if defender.player.height_cm is not None else 183.0
        height_diff = math.tanh((h_a - h_d) / self.cal.height_scale_cm)
        jump_diff = self._g_eff(attacker, "jumping") - self._g_eff(defender, "jumping")
        strength_diff = self._g_eff(attacker, "strength") - self._g_eff(defender, "strength")
        mass_diff = math.tanh(((attacker.player.weight_kg or 78.0) - (defender.player.weight_kg or 78.0)) / self.cal.weight_scale_kg)
        position = clamp((distance_m(defender.pos, landing) - distance_m(attacker.pos, landing)) / 5.0, -1.0, 1.0)
        reading = 0.30 * self._g_eff(attacker, "attacking_position") - 0.30 * self._g_eff(defender, "defensive_awareness")
        l = 0.80 * height_diff + 0.72 * jump_diff + 0.35 * strength_diff + 0.22 * mass_diff + 0.58 * position + reading
        return bounded_sigmoid(l, 0.06, 0.94)

    def _execute_aerial_pass(self, carrier: PlayerState, target: PlayerState, pressure: float, presser: PlayerState | None) -> None:
        d = distance_m(carrier.pos, target.pos)
        skill = effective_attribute(carrier.player, carrier, "gk_kicking" if carrier.slot == "GK" else "long_passing")
        sigma = max(1.0, 4.2 - 0.026 * skill + 0.035 * d + 0.9 * pressure)
        raw_landing = Vec2(
            target.pos.x + self.rng.normal("aerial_x", self.rng_context) * sigma * 100 / 105,
            target.pos.y + self.rng.normal("aerial_y", self.rng_context) * sigma * 100 / 68,
        )
        if self._handle_out_of_play(carrier.team_id, raw_landing, "overhit_aerial_pass"):
            carrier.turnovers += 1
            self._record_event("PASS", carrier.team_id, carrier, {"target_name":target.player.name,"pass_type":"AERIAL_LONG","distance_m":round(d,2),"outcome":"OUT_OF_PLAY"})
            return
        landing = raw_landing.clamp()
        opp = [s for s in self._team_states(self._opp_id(carrier.team_id)) if s.slot != "GK"]
        defender = min(opp, key=lambda s: distance_m(s.pos, landing))
        target.aerial_duels += 1
        defender.aerial_duels += 1
        add_explosive_load(target, jump=0.7, duel=0.35)
        add_explosive_load(defender, jump=0.7, duel=0.35)
        p_win = self.aerial_win_probability(target, defender, landing)
        attacker_wins = self.rng.uniform("aerial_duel", self.rng_context, carrier.player.player_id, target.player.player_id, defender.player.player_id) < p_win
        winner, loser = (target, defender) if attacker_wins else (defender, target)
        winner.aerial_duels_won += 1
        self._record_event("AERIAL_DUEL", winner.team_id, winner, {
            "opponent": loser.player.name,
            "landing": [round(landing.x, 2), round(landing.y, 2)],
            "attacker_height_cm": target.player.height_cm,
            "defender_height_cm": defender.player.height_cm,
            "attacker_weight_kg": target.player.weight_kg,
            "defender_weight_kg": defender.player.weight_kg,
            "p_attacker_win": round(p_win, 4),
            "winner": winner.player.name,
        })
        detail = {
            "target_id": target.player.player_id,
            "target_name": target.player.name,
            "pass_type": "AERIAL_LONG",
            "distance_m": round(d, 2),
            "pressure": round(pressure, 3),
            "landing": [round(landing.x, 2), round(landing.y, 2)],
            "p_aerial_win": round(p_win, 4),
        }
        if attacker_wins:
            heading = self._g_eff(target, "heading_accuracy")
            control_p = bounded_sigmoid(0.95 + 0.78 * heading + 0.35 * self._g_eff(target, "reactions") - 0.22 * self._g_eff(defender, "strength"), 0.20, 0.91)
            if self.rng.uniform("aerial_control", self.rng_context, target.player.player_id) < control_p:
                carrier.passes_completed += 1
                target.touches += 1
                target.pos = landing
                target.ball_exposure = 0.42
                self._change_possession(target.team_id, target, "aerial_pass_control")
                detail["outcome"] = "AERIAL_COMPLETED"
                self._note_completed_pass(carrier.team_id, carrier.player.player_id, target.player.player_id)
                self._schedule_reception_ready(0.85, urgent=True)  # contested aerial control: act as soon as stabilized
                add_performance(target, 0.08 + 0.06 * (1.0 - p_win), 0.65, component="attack")
                add_performance(carrier, 0.04, 0.45, component="possession")
            else:
                detail["outcome"] = "ATTACKER_KNOCKDOWN"
                self._resolve_loose_ball(landing, carrier.team_id, "aerial_knockdown")
            self._record_event("PASS", carrier.team_id, carrier, detail)
        else:
            defender.clearances += 1
            carrier.turnovers += 1
            detail["outcome"] = "AERIAL_LOST"
            self._record_event("PASS", carrier.team_id, carrier, detail)
            add_performance(defender, 0.08 + 0.07 * p_win, 0.65, component="defense")
            # Defensive header tends to move danger away rather than grant instant clean possession.
            clear_rel = attack_relative_x(defender.team_id, defender.pos) + 10.0
            clear_point = from_attack_frame(defender.team_id, clamp(clear_rel, 8, 85), clamp(landing.y + self.rng.normal("clear_y", self.rng_context) * 7, 5, 95))
            self._resolve_loose_ball(clear_point, defender.team_id, "aerial_clearance")

    def _cross_error_sigma(self, carrier: PlayerState, distance_meters: float, pressure: float) -> float:
        """Crossing controls delivery spread; tactics never modify technical accuracy."""
        crossing = effective_attribute(carrier.player, carrier, "crossing")
        return max(0.65, 3.55 - 0.027 * crossing + 0.021 * distance_meters + 0.78 * pressure)

    def _cross_delivery_zones(self, carrier: PlayerState) -> list[tuple[str, Vec2]]:
        """Create real near/central/far-post delivery zones in the attack frame."""
        left_side = carrier.pos.y < 50.0
        near_y = 42.0 if left_side else 58.0
        far_y = 59.0 if left_side else 41.0
        return [
            ("NEAR_POST", from_attack_frame(carrier.team_id, 92.0, near_y)),
            ("CENTRAL", from_attack_frame(carrier.team_id, 89.0, 50.0)),
            ("FAR_POST", from_attack_frame(carrier.team_id, 91.0, far_y)),
            ("PENALTY_SPOT", from_attack_frame(carrier.team_id, 86.5, 50.0)),
        ]

    def _cross_candidate_score(self, s: PlayerState, landing: Vec2, attacking: bool) -> float:
        t = self._arrival_time(s, landing)
        if attacking:
            read = 0.38 * self._g_eff(s, "attacking_position") + 0.18 * self._g_eff(s, "reactions")
            aerial = 0.16 * self._g_eff(s, "jumping") + 0.10 * self._height_term(s)
            role = 0.16 if s.slot == "ST" or s.instructions.attack_role.upper() in {"POACHER","RUN_BEHIND","TARGET","SECOND_STRIKER","INSIDE_FORWARD"} else 0.0
            return -0.72 * t + read + aerial + role
        read = 0.40 * self._g_eff(s, "defensive_awareness") + 0.18 * self._g_eff(s, "reactions")
        aerial = 0.16 * self._g_eff(s, "jumping") + 0.10 * self._height_term(s)
        return -0.72 * t + read + aerial

    def _choose_cross_zone(self, carrier: PlayerState) -> tuple[str, Vec2]:
        attackers = [s for s in self._team_states(carrier.team_id) if s.slot != "GK" and s.player.player_id != carrier.player.player_id]
        defenders = [s for s in self._team_states(self._opp_id(carrier.team_id)) if s.slot != "GK"]
        tactic = self.teams[carrier.team_id].tactics
        utilities = []
        zones = self._cross_delivery_zones(carrier)
        for name, landing in zones:
            a_scores = sorted((self._cross_candidate_score(a, landing, True) for a in attackers), reverse=True)
            d_scores = sorted((self._cross_candidate_score(d, landing, False) for d in defenders), reverse=True)
            best_a = a_scores[0] if a_scores else -4.0
            best_d = d_scores[0] if d_scores else -4.0
            support = sum(1 for a in attackers if self._arrival_time(a, landing) <= 2.6)
            cover = sum(1 for d in defenders if self._arrival_time(d, landing) <= 2.6)
            u = 0.68 * (best_a - best_d) + 0.12 * min(3, support) - 0.10 * min(4, cover)
            if tactic.box_commitment == "COMMIT":
                u += 0.10 * min(3, support)
            elif tactic.box_commitment == "CAUTIOUS":
                u -= 0.10 * max(0, support - 1)
            if name == "PENALTY_SPOT" and tactic.chance_creation_focus == "WIDE":
                u += 0.10
            utilities.append(u)
        probs = softmax(utilities, temperature=0.66)
        idx = self.rng.choice_index(probs, "cross_zone", self.rng_context, carrier.player.player_id)
        return zones[idx]

    def _resolve_cutback_continuation(self, passer: PlayerState, receiver: PlayerState, receive_pressure: float) -> None:
        """A completed byline cutback may be struck first-time; otherwise possession continues normally."""
        rel = attack_relative_x(receiver.team_id, receiver.pos)
        if rel < 76.0 or abs(receiver.pos.y - 50.0) > 22.0:
            return
        xg = self._xg(receiver, receive_pressure)
        # Choice only: the cutback label does not alter xG or scoring probability.
        l = -1.34 + 3.20 * xg + 0.30 * self._g_eff(receiver, "reactions") + 0.18 * self._g_eff(receiver, "finishing") - 0.72 * receive_pressure
        p_first_time = clamp(sigmoid(l), 0.04, 0.74)
        self._record_event("CUTBACK_WINDOW", receiver.team_id, receiver, {
            "passer": passer.player.name, "xg": round(xg,4), "pressure": round(receive_pressure,3),
            "p_first_time_shot": round(p_first_time,4),
        })
        if self.rng.uniform("cutback_first_time", self.rng_context, passer.player.player_id, receiver.player.player_id) < p_first_time:
            self._execute_shot(receiver, receive_pressure, xg=xg, shot_type="CUTBACK_FIRST_TIME")

    def _execute_cross(self, carrier: PlayerState, target: PlayerState, pressure: float) -> None:
        # The pass chooser identifies that a cross is attractive, but the delivery itself
        # targets a zone rather than teleporting toward one nominated receiver.
        zone_name, intended = self._choose_cross_zone(carrier)
        d = distance_m(carrier.pos, intended)
        sigma = self._cross_error_sigma(carrier, d, pressure)
        raw_landing = Vec2(
            intended.x + self.rng.normal("cross_x", self.rng_context, carrier.player.player_id) * sigma * 100 / 105,
            intended.y + self.rng.normal("cross_y", self.rng_context, carrier.player.player_id) * sigma * 100 / 68,
        )
        base_detail = {
            "decision_target": target.player.name, "delivery_zone": zone_name, "distance_m": round(d,2),
            "intended": [round(intended.x,2), round(intended.y,2)], "pressure": round(pressure,3),
            "delivery_sigma_m": round(sigma,3),
        }
        if self._handle_out_of_play(carrier.team_id, raw_landing, "overhit_cross"):
            carrier.turnovers += 1
            self._record_event("CROSS", carrier.team_id, carrier, {**base_detail, "outcome":"OUT_OF_PLAY"})
            return
        landing = raw_landing.clamp()
        base_detail["landing"] = [round(landing.x,2),round(landing.y,2)]
        if self._try_gk_high_ball(carrier.team_id, landing, "OPEN_PLAY_CROSS"):
            self._record_event("CROSS", carrier.team_id, carrier, {**base_detail, "outcome": "GK_INTERVENTION"})
            return

        attackers = [s for s in self._team_states(carrier.team_id) if s.slot != "GK" and s.player.player_id != carrier.player.player_id]
        defenders = [s for s in self._team_states(self._opp_id(carrier.team_id)) if s.slot != "GK"]
        attackers = sorted(attackers, key=lambda s: self._cross_candidate_score(s, landing, True), reverse=True)
        defenders = sorted(defenders, key=lambda s: self._cross_candidate_score(s, landing, False), reverse=True)
        attacker = attackers[0] if attackers else target
        defender = defenders[0] if defenders else min(self._team_states(self._opp_id(carrier.team_id)), key=lambda s: distance_m(s.pos, landing))
        t_att = self._arrival_time(attacker, landing)
        t_def = self._arrival_time(defender, landing)
        # A zone nobody on the attacking team can reasonably reach becomes a defensive
        # clearance/second ball, not a magically contested header by the nominated target.
        if t_att > 3.35 and t_def + 0.25 < t_att:
            defender.clearances += 1
            self._record_event("CROSS", carrier.team_id, carrier, {**base_detail, "primary_attacker": attacker.player.name, "primary_defender": defender.player.name, "outcome":"NO_ATTACKER_REACH"})
            clear_point = from_attack_frame(
                defender.team_id,
                34,
                clamp(
                    landing.y
                    + self.rng.normal(
                        "cross_clear_y",
                        self.rng_context,
                        carrier.player.player_id,
                        defender.player.player_id,
                        zone_name,
                        "no_attacker_reach",
                    )
                    * 8,
                    5,
                    95,
                ),
            )
            self._resolve_loose_ball(clear_point, defender.team_id, "cross_clearance")
            return

        attacker.aerial_duels += 1
        defender.aerial_duels += 1
        add_explosive_load(attacker, jump=0.75, duel=0.35)
        add_explosive_load(defender, jump=0.75, duel=0.35)
        p_win = self.aerial_win_probability(attacker, defender, landing)
        attacker_wins = self.rng.uniform("cross_aerial", self.rng_context, carrier.player.player_id, attacker.player.player_id, defender.player.player_id) < p_win
        detail = {**base_detail, "primary_attacker": attacker.player.name, "primary_defender": defender.player.name,
                  "attacker_arrival_s": round(t_att,3), "defender_arrival_s": round(t_def,3), "p_aerial_win": round(p_win,4)}
        if attacker_wins:
            attacker.aerial_duels_won += 1
            carrier.passes_completed += 1
            self._note_completed_pass(carrier.team_id, carrier.player.player_id, attacker.player.player_id)
            self._record_event("CROSS", carrier.team_id, carrier, {**detail, "outcome":"ATTACKER_CONTACT"})
            self._record_event("AERIAL_DUEL", attacker.team_id, attacker, {"opponent":defender.player.name,"context":"OPEN_PLAY_CROSS","p_attacker_win":round(p_win,4),"winner":attacker.player.name,"delivery_zone":zone_name})
            add_performance(carrier, 0.08, 0.55, component="possession")
            add_performance(attacker, 0.07 + 0.05*(1-p_win), 0.55, component="attack")
            relx = attack_relative_x(attacker.team_id, landing)
            box_commit = self.teams[attacker.team_id].tactics.box_commitment
            contact_pressure = clamp(0.34 + 0.30 * (1.0-p_win) + 0.08 * max(0.0, t_att-t_def), 0.22, 0.82)
            p_header_shot = clamp(0.13 + 0.31 * p_win + 0.08 * max(0.0, self._g_eff(attacker, "heading_accuracy")) + (0.08 if box_commit == "COMMIT" else -0.05 if box_commit == "CAUTIOUS" else 0.0), 0.08, 0.62)
            if relx >= 80 and self.rng.uniform("cross_header_choice", self.rng_context, attacker.player.player_id) < p_header_shot:
                # Header xG is still derived from location/pressure/defensive geometry.
                xg = self._xg(attacker, pressure=contact_pressure, distance_override=max(5.5, (100-relx)*1.05))
                self._execute_shot(attacker, pressure=contact_pressure, xg=xg, shot_type="HEADER", distance_override=max(5.5, (100-relx)*1.05))
            else:
                self._resolve_loose_ball(landing, carrier.team_id, "cross_knockdown")
        else:
            defender.aerial_duels_won += 1
            defender.clearances += 1
            self._record_event("CROSS", carrier.team_id, carrier, {**detail, "outcome":"DEFENDED"})
            self._record_event("AERIAL_DUEL", defender.team_id, defender, {"opponent":attacker.player.name,"context":"OPEN_PLAY_CROSS","p_attacker_win":round(p_win,4),"winner":defender.player.name,"delivery_zone":zone_name})
            add_performance(defender, 0.10 + 0.06*p_win, 0.65, component="defense")
            clear_point = from_attack_frame(
                defender.team_id,
                34,
                clamp(
                    landing.y
                    + self.rng.normal(
                        "cross_clear_y",
                        self.rng_context,
                        carrier.player.player_id,
                        defender.player.player_id,
                        zone_name,
                        "defended",
                    )
                    * 8,
                    5,
                    95,
                ),
            )
            self._resolve_loose_ball(clear_point, defender.team_id, "cross_clearance")

    # ------------------------------------------------------------------
    # On-ball contests: carry / dribble / shield / tackle / fouls
    # ------------------------------------------------------------------
    def _space_ahead(self, carrier: PlayerState) -> float:
        """Usable forward corridor, not merely distance from the destination point."""
        relx = attack_relative_x(carrier.team_id, carrier.pos)
        ahead = from_attack_frame(carrier.team_id, clamp(relx + 7.0, 0, 100), carrier.pos.y)
        opp = self._team_states(self._opp_id(carrier.team_id))
        if not opp:
            return 1.0
        clearance = 1.0
        for o in opp:
            perp, along = point_segment_distance_m(o.pos, carrier.pos, ahead)
            if -0.05 <= along <= 1.10:
                # A defender inside ~2m of the corridor effectively closes the carry;
                # 5m+ is usually genuine open grass.
                clearance = min(clearance, clamp((perp - 1.2) / 4.2, 0.0, 1.0))
        return clearance

    def _st_space_beyond(self, carrier: PlayerState, duel_defender: PlayerState) -> float:
        """Family E: usable corridor BEHIND the duel defender.

        _space_ahead treats the man being attacked identically to a covering
        second defender, so a genuine isolated 1v1 always scores space=0 -
        exactly where a take-on is most valuable. Here the duel defender is
        excluded: what remains is the grass a winning attacker would burst
        into, closed only by actual cover."""
        relx = attack_relative_x(carrier.team_id, carrier.pos)
        ahead = from_attack_frame(carrier.team_id, clamp(relx + 9.0, 0, 100), carrier.pos.y)
        clearance = 1.0
        for o in self._team_states(self._opp_id(carrier.team_id)):
            if o is duel_defender or not o.active or o.slot == "GK":
                continue
            perp, along = point_segment_distance_m(o.pos, carrier.pos, ahead)
            if -0.05 <= along <= 1.10:
                clearance = min(clearance, clamp((perp - 1.2) / 4.2, 0.0, 1.0))
        return clearance

    def _execute_carry(self, carrier: PlayerState, pressure: float) -> None:
        carrier.carries += 1
        carrier.touches += 1
        space = self._space_ahead(carrier)
        skill = 0.55 * self._g_eff(carrier, "dribbling") + 0.45 * self._g_eff(carrier, "ball_control")
        p_clean = bounded_sigmoid(1.20 + 0.75 * skill + 0.70 * space - 1.35 * pressure, 0.12, 0.985)
        distance_gain = 1.4 + 4.2 * space + 1.1 * max(0.0, self._g_eff(carrier, "acceleration"))
        if pressure > 0.55:
            distance_gain *= 0.68
        if space < 0.22:
            distance_gain = min(distance_gain, 2.0)
        if self.rng.uniform("carry_touch", self.rng_context, carrier.player.player_id) < p_clean:
            old_rel = attack_relative_x(carrier.team_id, carrier.pos)
            new_pos = from_attack_frame(carrier.team_id, clamp(old_rel + distance_gain, 3, 96), carrier.pos.y)
            assumed_speed = clamp(3.0 + 2.8 * space + 0.7 * max(0.0, self._g_eff(carrier, "acceleration")), 2.6, 6.8)
            self._apply_action_movement(carrier, new_pos, assumed_speed, "carry")
            self.ball.pos = carrier.pos
            if old_rel < 84.3 <= attack_relative_x(carrier.team_id, carrier.pos):
                self._record_event("BOX_ENTRY", carrier.team_id, carrier, {"via": "CARRY"})
            carrier.ball_exposure = clamp(0.22 + 0.30 * (1.0 - p_clean), 0.12, 0.58)
            if distance_gain >= 5:
                carrier.progressive_carries += 1
            self._record_event("CARRY", carrier.team_id, carrier, {"pressure": round(pressure, 3), "distance_m": round(distance_gain * 1.05, 2), "p_clean": round(p_clean, 4), "outcome": "PROGRESSED"})
            add_performance(carrier, 0.025 + 0.02 * distance_gain / 5.0, 0.35, component="possession")
        else:
            carrier.ball_exposure = 0.86
            self._record_event("CARRY", carrier.team_id, carrier, {"pressure": round(pressure, 3), "p_clean": round(p_clean, 4), "outcome": "HEAVY_TOUCH"})
            self._resolve_loose_ball(carrier.pos, carrier.team_id, "heavy_touch")

    def _defensive_support_near(self, carrier: PlayerState, radius_m: float = 7.0) -> float:
        defenders = [d for d in self._team_states(self._opp_id(carrier.team_id)) if d.slot != "GK"]
        support = 0.0
        for d in defenders:
            dm = distance_m(d.pos, carrier.pos)
            if dm <= radius_m:
                support += 1.0 - 0.55 * (dm / radius_m)
        # Primary defender is expected; values above 1 represent meaningful cover.
        return clamp(max(0.0, support - 1.0) / 2.0, 0.0, 1.0)

    def _execute_dribble(self, carrier: PlayerState, defender: PlayerState, pressure: float) -> None:
        carrier.dribbles_attempted += 1
        carrier.touches += 1
        defender.tackles_attempted += 1
        add_explosive_load(carrier, sprint_burst=0.35, duel=0.20)
        add_explosive_load(defender, sprint_burst=0.30, duel=0.25)
        atk = 0.72 * self._g_eff(carrier, "dribbling") + 0.48 * self._g_eff(carrier, "agility") + 0.35 * self._g_eff(carrier, "ball_control") + 0.22 * self._g_eff(carrier, "acceleration") + 0.18 * self._g_eff(carrier, "balance")
        deff = 0.52 * self._g_eff(defender, "defensive_awareness") + 0.40 * self._g_eff(defender, "agility") + 0.60 * self._g_eff(defender, "standing_tackle") + 0.18 * self._g_eff(defender, "acceleration")
        exposure = clamp(carrier.ball_exposure, 0.0, 1.0)
        aggression = self._g_eff(defender, "aggression")
        space = self._space_ahead(carrier)
        cover = self._defensive_support_near(carrier)
        logits = [
            0.20 + 0.95 * atk - 0.72 * deff + 0.28 * space - 0.58 * cover,          # beat
            0.45 + 0.48 * atk - 0.32 * deff + 0.10 * space - 0.20 * cover,          # partial
            0.35 + 0.30 * self._g_eff(carrier, "ball_control") - 0.22 * pressure,   # retain
            0.18 + 0.78 * deff - 0.63 * atk + 0.65 * exposure + 0.34 * cover,       # tackled
            -0.05 + 0.20 * deff + 0.14 * atk + 0.35 * pressure + 0.28 * cover,      # loose
            -1.45 + 0.38 * aggression - 0.32 * self._g_eff(defender, "standing_tackle") - 0.22 * self._g_eff(defender, "defensive_awareness") + 0.42 * pressure + 0.12 * cover - (2.80 if self._in_penalty_area(carrier.team_id, carrier.pos) else 0.0), # foul
        ]
        probs = softmax(logits, temperature=self.cal.dribble_temperature)
        labels = ["BEAT", "PARTIAL", "RETAIN", "TACKLED", "LOOSE", "FOUL"]
        outcome = labels[self.rng.choice_index(probs, "dribble", self.rng_context, carrier.player.player_id, defender.player.player_id)]
        detail = {"defender": defender.player.name, "pressure": round(pressure, 3), "defensive_cover": round(cover, 3), "outcome": outcome, "probabilities": {k: round(v, 4) for k, v in zip(labels, probs)}}
        if outcome == "BEAT":
            carrier.dribbles_completed += 1
            carrier.defenders_beaten += 1
            carrier.progressive_carries += 1
            defender.effective_pressures += 0
            if ST["E"]:
                # Family E: being beaten has persistent spatial meaning. The
                # defender enters RECOVER (no press-chase, goal-side path) for
                # a pace/agility-differential recovery window; the attacker
                # continues at speed instead of freezing on the ball.
                t_rec = clamp(2.2 + 0.8 * (self._g_eff(carrier, "acceleration") - self._g_eff(defender, "acceleration"))
                              + 0.4 * (self._g_eff(carrier, "agility") - self._g_eff(defender, "agility"))
                              + (0.5 if defender.energy < 60.0 else 0.0), 1.5, 4.5)
                defender.st_beaten_until = self.clock + int(round(t_rec))
                self._reception_ready_at = self.clock + 1
            rel = attack_relative_x(carrier.team_id, carrier.pos)
            advance = 7.0 * (1.0 - 0.35 * cover)
            new_pos = from_attack_frame(carrier.team_id, clamp(rel + advance, 3, 97), clamp(carrier.pos.y + self.rng.normal("dribble_y", self.rng_context) * 2.2, 4, 96))
            self._apply_action_movement(carrier, new_pos, 6.0, "dribble_burst")
            if rel < 84.3 <= attack_relative_x(carrier.team_id, carrier.pos):
                self._record_event("BOX_ENTRY", carrier.team_id, carrier, {"via": "DRIBBLE"})
            carrier.ball_exposure = 0.26
            self.ball.pos = carrier.pos
            add_performance(carrier, 0.20, 1.0, component="attack")
            add_performance(defender, -0.09, 0.7, component="defense")
        elif outcome == "PARTIAL":
            carrier.dribbles_completed += 1
            if ST["E"]:
                defender.st_beaten_until = self.clock + 1
                self._reception_ready_at = self.clock + 1
            rel = attack_relative_x(carrier.team_id, carrier.pos)
            new_pos = from_attack_frame(carrier.team_id, clamp(rel + 3.5, 3, 97), carrier.pos.y)
            self._apply_action_movement(carrier, new_pos, 4.6, "dribble_partial")
            if rel < 84.3 <= attack_relative_x(carrier.team_id, carrier.pos):
                self._record_event("BOX_ENTRY", carrier.team_id, carrier, {"via": "DRIBBLE"})
            carrier.ball_exposure = 0.42
            self.ball.pos = carrier.pos
            add_performance(carrier, 0.09, 0.7, component="attack")
        elif outcome == "RETAIN":
            carrier.ball_exposure = 0.30
            defender.effective_pressures += 1
            add_performance(defender, 0.025, 0.25, component="defense")
        elif outcome == "TACKLED":
            defender.tackles_won += 1
            carrier.turnovers += 1
            self._change_possession(defender.team_id, defender, "tackle")
            add_performance(defender, 0.17, 0.9, component="defense")
            add_performance(carrier, -0.12, 0.8, component="possession")
        elif outcome == "LOOSE":
            self._resolve_loose_ball(carrier.pos, carrier.team_id, "tackle_poke")
        else:
            severity = clamp(0.34 + 0.18 * pressure + 0.10 * max(0.0, aggression), 0.1, 0.85)
            self._register_foul(defender, carrier, severity, tactical=attack_relative_x(carrier.team_id, carrier.pos) > 68)
        self._record_event("DRIBBLE", carrier.team_id, carrier, detail)

    def _defender_challenge_probability(self, carrier: PlayerState, defender: PlayerState, pressure: float) -> float:
        """Probability the primary defender elects to tackle rather than only contain.

        This is a *decision* probability.  It uses danger, exposure, role/effort, cards and
        team pressing intent.  Tackle execution is resolved separately so Aggression or a
        high press never grants technical tackle skill.
        """
        d = distance_m(defender.pos, carrier.pos)
        if d > 3.4 or pressure < 0.22:
            return 0.0
        rel = attack_relative_x(carrier.team_id, carrier.pos)
        danger = clamp((rel - 58.0) / 35.0, 0.0, 1.0)
        in_box = self._in_penalty_area(carrier.team_id, carrier.pos)
        tactic = self.teams[defender.team_id].tactics
        intensity = {"PASSIVE": -0.38, "SELECTIVE": -0.10, "AGGRESSIVE": 0.14, "RELENTLESS": 0.30}.get(tactic.pressing_intensity, -0.10)
        role = defender.instructions.defense_role.upper()
        role_term = 0.28 if role in {"PRESS", "BALL_HUNT", "STEP_OUT", "PRESS_WIDE", "PRESS_FULLBACK", "PRESS_CBS"} else 0.0
        if role in {"HOLD_LINE", "COVER", "SCREEN", "HOLD_ZONE"}:
            role_term -= 0.10
        effort = effort01(defender.instructions.defense_effort)
        exposure = clamp(carrier.ball_exposure, 0.0, 1.0)
        card_caution = 0.75 if defender.yellow_cards else 0.0
        # Inside the box defenders choose fewer speculative tackles, but immediate six-yard
        # danger can still force a challenge.  This changes willingness, not referee rules.
        box_caution = 0.52 if in_box else 0.0
        emergency = 0.42 * clamp((rel - 89.0) / 7.0, 0.0, 1.0)
        l = (
            -3.15 + 1.00 * pressure + 0.60 * exposure + 0.46 * danger
            + 0.16 * self._g_eff(defender, "aggression")
            + 0.12 * self._g_eff(defender, "defensive_awareness")
            + 0.30 * effort + intensity + 0.72 * role_term + 1.15 * emergency - card_caution - 0.80 * box_caution
        )
        return bounded_sigmoid(l, 0.01, 0.78)

    def _execute_pressure_challenge(self, carrier: PlayerState, defender: PlayerState, pressure: float) -> bool:
        """Resolve a defender-initiated standing challenge.

        Returns True when the challenge ends the attacker's current decision (possession
        changed, ball became loose, or a foul stopped play).  A contained/evaded challenge
        returns False and the attacker may still choose an action in the same decision.
        """
        defender.tackles_attempted += 1
        carrier.ground_duels += 1
        defender.ground_duels += 1
        add_explosive_load(carrier, duel=0.22)
        add_explosive_load(defender, duel=0.38)
        defend = (
            0.58 * self._g_eff(defender, "standing_tackle")
            + 0.34 * self._g_eff(defender, "defensive_awareness")
            + 0.20 * self._g_eff(defender, "reactions")
            + 0.12 * self._g_eff(defender, "agility")
        )
        protect = (
            0.42 * self._g_eff(carrier, "ball_control")
            + 0.34 * self._g_eff(carrier, "dribbling")
            + 0.22 * self._g_eff(carrier, "agility")
            + 0.10 * self._g_eff(carrier, "reactions")
        )
        exposure = clamp(carrier.ball_exposure, 0.0, 1.0)
        cover = self._defensive_support_near(carrier)
        aggression = self._g_eff(defender, "aggression")
        in_box = self._in_penalty_area(carrier.team_id, carrier.pos)
        logits = [
            0.05 + 0.92 * defend - 0.66 * protect + 0.62 * exposure + 0.20 * cover,  # clean win
            0.18 + 0.48 * defend - 0.28 * protect + 0.35 * exposure + 0.14 * cover,  # poke loose
            0.32 + 0.58 * protect - 0.44 * defend - 0.18 * exposure - 0.08 * cover,  # attacker retains
            -1.75 + 0.30 * aggression + 0.30 * pressure + 0.18 * protect
            - 0.42 * self._g_eff(defender, "standing_tackle")
            - 0.24 * self._g_eff(defender, "defensive_awareness")
            - (0.28 if in_box else 0.0),  # foul after a chosen, more cautious box challenge
        ]
        labels = ["CLEAN_WIN", "POKE_LOOSE", "ATTACKER_RETAINS", "FOUL"]
        probs = softmax(logits, temperature=self.cal.tackle_temperature)
        idx = self.rng.choice_index(probs, "pressure_tackle", self.rng_context, carrier.player.player_id, defender.player.player_id)
        outcome = labels[idx]
        detail = {
            "carrier": carrier.player.name, "pressure": round(pressure, 3),
            "ball_exposure": round(exposure, 3), "defensive_cover": round(cover, 3),
            "outcome": outcome, "probabilities": {k: round(v, 4) for k, v in zip(labels, probs)},
        }
        self._record_event("TACKLE", defender.team_id, defender, detail)
        if outcome == "CLEAN_WIN":
            defender.tackles_won += 1
            defender.ground_duels_won += 1
            carrier.turnovers += 1
            self._change_possession(defender.team_id, defender, "pressure_tackle")
            add_performance(defender, 0.14, 0.75, component="defense")
            add_performance(carrier, -0.09, 0.55, component="possession")
            return True
        if outcome == "POKE_LOOSE":
            defender.effective_pressures += 1
            self._resolve_loose_ball(carrier.pos, carrier.team_id, "pressure_tackle_poke")
            return True
        if outcome == "FOUL":
            severity = clamp(0.25 + 0.18 * pressure + 0.08 * max(0.0, aggression), 0.12, 0.68)
            self._register_foul(defender, carrier, severity, tactical=False)
            return True
        # Failed/contained challenge: attacker keeps the ball but the duel has made the next
        # touch more exposed.  The attacker still chooses the football action.
        carrier.ground_duels_won += 1
        carrier.ball_exposure = clamp(carrier.ball_exposure + 0.10, 0.18, 0.78)
        defender.effective_pressures += 1
        add_performance(carrier, 0.035, 0.3, component="possession")
        return False

    def _execute_shield(self, carrier: PlayerState, defender: PlayerState, pressure: float) -> None:
        carrier.touches += 1
        add_explosive_load(carrier, duel=0.55)
        add_explosive_load(defender, duel=0.55)
        carrier.ground_duels += 1
        defender.ground_duels += 1
        a = 0.72 * self._g_eff(carrier, "strength") + 0.45 * self._mass_term(carrier) + 0.38 * self._g_eff(carrier, "ball_control") + 0.26 * self._g_eff(carrier, "balance")
        d = 0.70 * self._g_eff(defender, "strength") + 0.45 * self._mass_term(defender) + 0.22 * self._g_eff(defender, "aggression")
        logits = [0.55 + a - 0.72 * d, 0.35 + 0.42 * a - 0.35 * d, 0.0 + 0.45 * d - 0.30 * a, -0.2 + 0.72 * d - 0.62 * a, -1.55 + 0.35 * self._g_eff(defender, "aggression") + 0.25 * pressure - (2.65 if self._in_penalty_area(carrier.team_id, carrier.pos) else 0.0)]
        labels = ["HOLD", "FORCED_BACK", "LOOSE", "DEFENDER_WIN", "FOUL"]
        probs = softmax(logits, temperature=self.cal.shield_temperature)
        outcome = labels[self.rng.choice_index(probs, "shield", self.rng_context, carrier.player.player_id, defender.player.player_id)]
        if outcome in {"HOLD", "FORCED_BACK"}:
            carrier.ground_duels_won += 1
            carrier.ball_exposure = 0.22 if outcome == "HOLD" else 0.34
            if outcome == "FORCED_BACK":
                rel = attack_relative_x(carrier.team_id, carrier.pos)
                new_pos = from_attack_frame(carrier.team_id, max(3, rel - 2.0), carrier.pos.y)
                self._apply_action_movement(carrier, new_pos, 2.4, "shield_forced_back")
                self.ball.pos = carrier.pos
                defender.effective_pressures += 1
            add_performance(carrier, 0.06, 0.45, component="possession")
        elif outcome == "LOOSE":
            self._resolve_loose_ball(carrier.pos, carrier.team_id, "shield_loose")
        elif outcome == "DEFENDER_WIN":
            defender.ground_duels_won += 1
            carrier.turnovers += 1
            self._change_possession(defender.team_id, defender, "shield_turnover")
            add_performance(defender, 0.11, 0.6, component="defense")
        else:
            self._register_foul(defender, carrier, 0.28 + 0.15 * pressure, tactical=False)
        self._record_event("SHIELD", carrier.team_id, carrier, {"defender": defender.player.name, "outcome": outcome, "probabilities": {k: round(v, 4) for k, v in zip(labels, probs)}})

    def _in_penalty_area(self, attacking_team: str, pos: Vec2) -> bool:
        return attack_relative_x(attacking_team, pos) >= 84.3 and 20.0 <= pos.y <= 80.0

    def _register_foul(self, offender: PlayerState, victim: PlayerState, severity: float, tactical: bool) -> None:
        offender.fouls_committed += 1
        victim.fouls_won += 1
        persistence = max(0, offender.fouls_committed - 1)
        yellow_l = self.cal.yellow_base + 2.4 * severity + (0.95 if tactical else 0.0) + 0.18 * persistence + self.config.referee_strictness
        red_l = self.cal.red_base + 4.0 * max(0.0, severity - 0.55) + (1.0 if tactical and severity > 0.75 else 0.0)
        p_yellow = sigmoid(yellow_l)
        p_red = sigmoid(red_l)
        card = "NONE"
        if self.rng.uniform("red_card", self.rng_context, offender.player.player_id) < p_red:
            offender.red_cards += 1
            offender.active = False
            card = "RED"
            add_performance(offender, -0.85, 1.5, component="discipline")
        elif self.rng.uniform("yellow_card", self.rng_context, offender.player.player_id) < p_yellow:
            offender.yellow_cards += 1
            if offender.yellow_cards >= 2:
                offender.red_cards += 1
                offender.active = False
                card = "SECOND_YELLOW_RED"
                add_performance(offender, -0.65, 1.3, component="discipline")
            else:
                card = "YELLOW"
                add_performance(offender, -0.16, 0.65, component="discipline")
        add_performance(offender, -0.10 - 0.12 * severity, 0.65, component="discipline")
        add_performance(victim, 0.035, 0.25, component="attack")
        is_penalty = self._in_penalty_area(victim.team_id, victim.pos)
        self._record_event("FOUL", victim.team_id, offender, {
            "victim": victim.player.name,
            "severity": round(severity, 3),
            "tactical": tactical,
            "penalty": is_penalty,
            "p_yellow": round(p_yellow, 4),
            "p_red": round(p_red, 4),
            "card": card,
        })
        if card != "NONE":
            self._record_event("CARD", offender.team_id, offender, {"card": card})
        if is_penalty:
            self._execute_penalty(victim.team_id, victim)
        else:
            # Small advantage chance if victim stayed in a high-value attacking situation.
            relx = attack_relative_x(victim.team_id, victim.pos)
            p_adv = clamp(0.10 + 0.35 * max(0.0, (relx - 55.0) / 40.0), 0.05, 0.45)
            if victim.active and self.rng.uniform("advantage", self.rng_context, victim.player.player_id) < p_adv:
                self._change_possession(victim.team_id, victim, "advantage")
                self._record_event("ADVANTAGE", victim.team_id, victim, {"p_advantage": round(p_adv, 4)})
            else:
                relx = attack_relative_x(victim.team_id, victim.pos)
                central = 1.0 - abs(victim.pos.y - 50.0) / 50.0
                direct_value = max(0.0, (relx - 68.0) / 25.0) * max(0.15, central)
                # The team's designated dead-ball specialist takes direct free kicks
                # (mirrors corner-taker selection); the dedicated Free Kick Accuracy
                # attribute replaces the old long-shots/power/finishing proxy at the
                # placement stage, with Shot Power still carrying velocity inside
                # the staged shot pipeline.
                takers = [s for s in self._team_states(victim.team_id) if s.active and s.slot != "GK"]
                taker = max(takers, key=lambda s: s.player.attr("free_kick_accuracy", 50.0)) if takers else victim
                p_direct = clamp(0.05 + 0.42 * direct_value + 0.10 * max(0.0, self._g_eff(taker, "free_kick_accuracy")), 0.02, 0.48)
                self._record_event("FREE_KICK", victim.team_id, victim, {"location": [round(victim.pos.x, 2), round(victim.pos.y, 2)], "p_direct": round(p_direct,4), "taker": taker.player.name})
                d_fk = distance_m(victim.pos, goal_center(victim.team_id))
                if d_fk > 32.0:
                    p_direct = 0.0  # nobody shoots a 40m+ free kick on purpose here
                if p_direct > 0.0 and self.rng.uniform("direct_fk_choice", self.rng_context, taker.player.player_id) < p_direct:
                    taker.pos = Vec2(victim.pos.x, victim.pos.y)
                    d = d_fk
                    fk_skill = 0.60 * self._g_eff(taker, "free_kick_accuracy") + 0.25 * self._g_eff(taker, "shot_power") + 0.15 * self._g_eff(taker, "long_shots")
                    xg_fk = clamp(sigmoid(-3.3 - 0.025 * max(0.0, d - 18) + 0.65 * fk_skill + 0.55 * central), 0.015, 0.18)
                    self._execute_shot(taker, pressure=0.12, xg=xg_fk, shot_type="DIRECT_FREE_KICK", distance_override=d)
                else:
                    self._change_possession(victim.team_id, victim, "free_kick")
                    self._start_dead_ball(9, "free_kick")
                    self.next_decision_at = max(self.next_decision_at, self.clock + 9)

    def _execute_penalty(self, attacking_team: str, victim: PlayerState) -> None:
        gk = self._goalkeeper(attacking_team)
        # The designated penalty taker steps up (award frequency is untouched —
        # it still comes only from qualifying fouls in the box). The dedicated
        # Penalties attribute replaces the finishing/reactions proxy at the
        # execution stage; the keeper contest is unchanged.
        candidates = [s for s in self._team_states(attacking_team) if s.active and s.slot != "GK"]
        taker = max(candidates, key=lambda s: s.player.attr("penalties", 50.0)) if candidates else victim
        shoot = 0.85 * self._g_eff(taker, "penalties") + 0.15 * self._g_eff(taker, "finishing")
        keep = 0.55 * self._g_eff(gk, "gk_reflexes") + 0.45 * self._g_eff(gk, "gk_positioning")
        p_goal = clamp(sigmoid(1.20 + 0.55 * shoot - 0.32 * keep), 0.50, 0.92)
        scored = self.rng.uniform("penalty", self.rng_context, taker.player.player_id, gk.player.player_id) < p_goal
        self._record_event("PENALTY", attacking_team, taker, {"goalkeeper": gk.player.name, "p_goal": round(p_goal, 4), "outcome": "GOAL" if scored else "SAVED_OR_MISSED"})
        if scored:
            taker.goals += 1
            taker.shots += 1
            taker.shots_on_target += 1
            self.score[attacking_team] += 1
            gk.goals_conceded += 1
            add_performance(taker, 0.55, 1.0, component="attack")
            add_performance(gk, -0.15, 0.5, component="goalkeeping")
            self._record_event("GOAL", attacking_team, taker, {"score": dict(self.score), "penalty": True})
            other = self._opp_id(attacking_team)
            k = self._kickoff_player(other)
            k.pos = Vec2(50, 50)
            self._restart_controlled_possession(other, k, "penalty_goal_kickoff")
            self._start_dead_ball(24, "penalty_goal_restart")
        else:
            gk.saves += 1
            add_performance(gk, 0.25, 0.8, component="goalkeeping")
            self._change_possession(gk.team_id, gk, "penalty_save")
            self._start_dead_ball(8, "penalty_restart")

    # ------------------------------------------------------------------
    # Shooting / blocks / GK
    # ------------------------------------------------------------------
    def _xg(self, shooter: PlayerState, pressure: float, distance_override: float | None = None, angle_override: float | None = None) -> float:
        d = distance_override if distance_override is not None else distance_m(shooter.pos, goal_center(shooter.team_id))
        angle = angle_override if angle_override is not None else shot_angle_radians(shooter.team_id, shooter.pos)
        angle_norm = clamp(angle / 0.75, 0.0, 1.0)
        organization = self._defensive_organization(shooter.team_id)
        lane_density = self._shot_lane_density(shooter.team_id, shooter.pos)
        transition = self._is_transition_attack(shooter.team_id)
        # Organization/lane density are centered on a typical settled context so this
        # changes chance *quality by geometry* rather than globally suppressing scoring.
        l = (
            -0.50 - 0.138 * d + 1.30 * angle_norm - 0.75 * pressure
            - self.cal.xg_defensive_organization * (organization - 0.58)
            - self.cal.xg_lane_density * (lane_density - 0.30)
        )
        if transition:
            l += self.cal.xg_transition_space * (1.0 - organization)
        return bounded_sigmoid(l, 0.005, 0.90)

    def _shot_block_candidate(self, shooter: PlayerState, min_defender_distance: float = 0.0) -> tuple[PlayerState | None, float]:
        goal = goal_center(shooter.team_id)
        best, best_p = None, 0.0
        for d in self._team_states(self._opp_id(shooter.team_id)):
            if d.slot == "GK":
                continue
            perp, along = point_segment_distance_m(d.pos, shooter.pos, goal)
            near = distance_m(d.pos, shooter.pos)
            if near < min_defender_distance:
                continue  # dead-ball law: retreated defenders cannot smother the strike
            if near <= 2.5 and along >= -0.05:
                # Smothering/near-contact block: defender is already at the strike point.
                # Awareness/Reactions determine whether he actually gets a body in the way.
                geom = sigmoid((2.10 - near) / 0.50)
                l = -0.90 + 0.68 * self._g_eff(d, "defensive_awareness") + 0.52 * self._g_eff(d, "reactions") + 1.55 * geom
                p = clamp(sigmoid(l) * geom, 0.0, 0.78)
            else:
                if not (0.05 < along < 0.96) or perp > 2.1:
                    continue
                geom = sigmoid((1.55 - perp) / 0.45)
                l = -1.25 + 0.70 * self._g_eff(d, "defensive_awareness") + 0.50 * self._g_eff(d, "reactions") + 1.4 * geom
                p = clamp(sigmoid(l) * geom, 0.0, 0.72)
            if p > best_p:
                best, best_p = d, p
        return best, best_p

    def _goalkeeper(self, attacking_team_id: str) -> PlayerState:
        opp_states = self._team_states(self._opp_id(attacking_team_id))
        gk = next((s for s in opp_states if s.slot == "GK"), None)
        return gk or min(opp_states, key=lambda s: distance_m(s.pos, goal_center(attacking_team_id)))

    def _execute_shot(self, shooter: PlayerState, pressure: float, xg: float | None = None, shot_type: str = "OPEN_PLAY", distance_override: float | None = None) -> None:
        shooter.shots += 1
        shooter.touches += 1
        d = distance_override if distance_override is not None else distance_m(shooter.pos, goal_center(shooter.team_id))
        xg = self._xg(shooter, pressure, distance_override) if xg is None else xg
        shooter.xg += xg
        # Shot creation belongs to the pass that actually delivered the shooter, even if
        # the shot is later blocked, missed or saved. Official assists are resolved only
        # if the shot becomes a goal.
        if self.last_completed_pass and self.last_completed_pass[0] == shooter.team_id and self.last_completed_pass[2] == shooter.player.player_id and self.clock - self.last_completed_pass[3] <= 10:
            creator = self.states.get(self.last_completed_pass[1])
            if creator is not None and creator.active:
                creator.key_passes += 1
                creator.chances_created += 1
                add_performance(creator, 0.06 + 0.16 * xg, 0.45, component="attack")
        if shot_type == "DIRECT_FREE_KICK":
            shot_attr = "free_kick_accuracy"  # dead-ball placement is its own craft
        else:
            shot_attr = "heading_accuracy" if shot_type == "HEADER" else ("long_shots" if d >= 20 else "finishing")
        skill = self._g_eff(shooter, shot_attr)
        power = self._g_eff(shooter, "shot_power") if shot_type != "HEADER" else 0.0
        block, p_block = self._shot_block_candidate(shooter, min_defender_distance=9.15 if shot_type == "DIRECT_FREE_KICK" else 0.0) if shot_type != "HEADER" else (None, 0.0)
        if block and self.rng.uniform("shot_block", self.rng_context, shooter.player.player_id, block.player.player_id) < p_block:
            block.blocks += 1
            self._record_event("SHOT", shooter.team_id, shooter, {
                "shot_type": shot_type, "distance_m": round(d, 2), "pressure": round(pressure, 3),
                "xg": round(xg, 4), "outcome": "BLOCKED", "blocker": block.player.name, "p_block": round(p_block, 4),
                "transition": self._is_transition_attack(shooter.team_id),
                "transition_strength": round(self.last_transition_strength if self._is_transition_attack(shooter.team_id) else 0.0, 4),
                "possession_age_s": self._possession_age(),
                "settled_probe": round(self._settled_probe(shooter.team_id), 4),
                "defensive_organization": round(self._defensive_organization(shooter.team_id), 4),
                "shot_lane_density": round(self._shot_lane_density(shooter.team_id, shooter.pos), 4),
                **self._attack_structure_snapshot(shooter),
            })
            add_performance(block, 0.10 + 0.18 * xg, 0.8, component="defense")
            # Some blocks go out for a corner; otherwise they become loose.
            if self.rng.uniform("block_corner", self.rng_context, block.player.player_id) < clamp(0.18 + 0.30 * xg, 0.15, 0.48):
                self._execute_corner(shooter.team_id)
            else:
                self._resolve_loose_ball(block.pos, block.team_id, "shot_block")
            return
        on_target_l = 0.20 + 1.15 * skill + 0.18 * power - 0.036 * max(0.0, d - 10) - 0.66 * self._effective_pressure(shooter, pressure)
        p_on = bounded_sigmoid(on_target_l, 0.08, 0.90)
        on_target = self.rng.uniform("shot_on", self.rng_context, shooter.player.player_id, shot_type) < p_on
        detail = {
            "shot_type": shot_type, "distance_m": round(d, 2), "pressure": round(pressure, 3),
            "xg": round(xg, 4), "p_on_target": round(p_on, 4), "p_block": round(p_block, 4),
            "transition": self._is_transition_attack(shooter.team_id),
            "transition_strength": round(self.last_transition_strength if self._is_transition_attack(shooter.team_id) else 0.0, 4),
            "possession_age_s": self._possession_age(),
            "settled_probe": round(self._settled_probe(shooter.team_id), 4),
            "defensive_organization": round(self._defensive_organization(shooter.team_id), 4),
            "shot_lane_density": round(self._shot_lane_density(shooter.team_id, shooter.pos), 4),
            **self._attack_structure_snapshot(shooter),
        }
        if not on_target:
            detail.update({"outcome": "MISS", "psxg": 0.0})
            self._record_event("SHOT", shooter.team_id, shooter, detail)
            add_performance(shooter, -0.18 * xg, 0.65, component="attack")
            gk = self._goalkeeper(shooter.team_id)
            self._goal_kick(gk.team_id, "shot_miss")
            return
        shooter.shots_on_target += 1
        execution_noise = self.rng.normal("shot_quality", self.rng_context, shooter.player.player_id, shot_type)
        placement_shift = 0.55 * skill + 0.16 * power + 0.28 * execution_noise
        base_psxg = clamp(xg / max(0.15, p_on), 0.02, 0.84)
        psxg = clamp(sigmoid(logit(base_psxg) + placement_shift), 0.015, 0.95)
        shooter.psxg += psxg
        gk = self._goalkeeper(shooter.team_id)
        gk_skill = 0.34 * self._g_eff(gk, "gk_positioning") + 0.52 * self._g_eff(gk, "gk_reflexes") + 0.34 * self._g_eff(gk, "gk_diving")
        if gk.player.height_cm:
            gk_skill += clamp((gk.player.height_cm - 188.0) / 22.0, -0.13, 0.13)
        p_goal = clamp(sigmoid(logit(psxg) - 0.34 * gk_skill), 0.01, 0.975)
        scored = self.rng.uniform("goal", self.rng_context, shooter.player.player_id, gk.player.player_id, shot_type) < p_goal
        detail.update({"psxg": round(psxg, 4), "p_goal": round(p_goal, 4), "goalkeeper": gk.player.name})
        if scored:
            shooter.goals += 1
            self.score[shooter.team_id] += 1
            gk.goals_conceded += 1
            assist = None
            pre_assist = None
            eligible = [p for p in self.pass_chain if p[0] == shooter.team_id and self.clock - p[3] <= 12]
            if eligible and eligible[-1][2] == shooter.player.player_id:
                final_pass = eligible[-1]
                passer = self.states[final_pass[1]]
                passer.assists += 1
                assist = passer.player.name
                add_performance(passer, 0.28 + 0.20 * xg, 0.9, component="attack")
                if len(eligible) >= 2:
                    prior = eligible[-2]
                    if prior[2] == passer.player.player_id and prior[1] != shooter.player.player_id:
                        pre = self.states[prior[1]]
                        pre.pre_assists += 1
                        pre_assist = pre.player.name
                        add_performance(pre, 0.10 + 0.10 * xg, 0.55, component="attack")
            detail.update({"outcome": "GOAL", "assist": assist, "pre_assist": pre_assist})
            self._record_event("SHOT", shooter.team_id, shooter, detail)
            self._record_event("GOAL", shooter.team_id, shooter, {"score": dict(self.score), "xg": round(xg, 4), "psxg": round(psxg, 4), "assist": assist, "pre_assist": pre_assist, "shot_type": shot_type})
            add_performance(shooter, 0.55 + 0.75 * (1.0 - xg), 1.5, component="attack")
            add_performance(gk, -0.18 * (1.0 - psxg), 0.75, component="goalkeeping")
            other = self._opp_id(shooter.team_id)
            k = self._kickoff_player(other)
            k.pos = Vec2(50, 50)
            self._restart_controlled_possession(other, k, "goal_kickoff")
            self._start_dead_ball(24, "goal_restart")
            return
        gk.saves += 1
        add_performance(gk, 0.12 + 0.34 * psxg, 0.8, component="goalkeeping")
        add_performance(shooter, 0.06 * max(0.0, psxg - xg) - 0.10 * xg, 0.65, component="attack")
        handling = self._g_eff(gk, "gk_handling")
        p_catch = clamp(sigmoid(0.35 + 1.0 * handling - 1.45 * psxg), 0.10, 0.90)
        if self.rng.uniform("save_handle", self.rng_context, gk.player.player_id) < p_catch:
            detail["outcome"] = "SAVED_CAUGHT"
            self._record_event("SHOT", shooter.team_id, shooter, detail)
            self._change_possession(gk.team_id, gk, "save_caught")
        else:
            detail["outcome"] = "SAVED_PARRIED"
            self._record_event("SHOT", shooter.team_id, shooter, detail)
            rebound = Vec2(clamp(gk.pos.x + (4.0 if shooter.team_id == "HOME" else -4.0), 0.0, 100.0), clamp(50 + self.rng.normal("rebound_y", self.rng_context) * 8.0, 4.0, 96.0))
            self._resolve_loose_ball(rebound, shooter.team_id, "gk_parry")

    def _execute_corner(self, attacking_team: str) -> None:
        attackers = [s for s in self._team_states(attacking_team) if s.slot != "GK"]
        defenders = [s for s in self._team_states(self._opp_id(attacking_team)) if s.slot != "GK"]
        taker = max(attackers, key=lambda s: 0.75 * s.player.attr("crossing") + 0.25 * s.player.attr("vision"))
        target_pool = [s for s in attackers if s is not taker]
        target = max(target_pool, key=lambda s: (s.player.height_cm or 183) + 0.35 * s.player.attr("jumping") + 0.20 * s.player.attr("heading_accuracy"))
        defender = max(defenders, key=lambda s: (s.player.height_cm or 183) + 0.35 * s.player.attr("jumping") + 0.18 * s.player.attr("defensive_awareness"))
        landing = from_attack_frame(attacking_team, 92.0, clamp(50 + self.rng.normal("corner_zone", self.rng_context) * 8, 30, 70))
        self._record_event("CORNER", attacking_team, taker, {"target": target.player.name, "landing": [round(landing.x, 2), round(landing.y, 2)]})
        self._start_dead_ball(8, "corner_setup")
        if self._try_gk_high_ball(attacking_team, landing, "CORNER"):
            return
        target.aerial_duels += 1
        defender.aerial_duels += 1
        add_explosive_load(target, jump=0.8, duel=0.4)
        add_explosive_load(defender, jump=0.8, duel=0.4)
        p = self.aerial_win_probability(target, defender, landing)
        if self.rng.uniform("corner_aerial", self.rng_context, target.player.player_id, defender.player.player_id) < p:
            target.aerial_duels_won += 1
            self._record_event("AERIAL_DUEL", attacking_team, target, {"opponent": defender.player.name, "context": "CORNER", "p_attacker_win": round(p, 4), "winner": target.player.name})
            self._execute_shot(target, pressure=0.45, xg=clamp(0.10 + 0.16 * p, 0.08, 0.30), shot_type="HEADER", distance_override=8.5)
        else:
            defender.aerial_duels_won += 1
            defender.clearances += 1
            self._record_event("AERIAL_DUEL", defender.team_id, defender, {"opponent": target.player.name, "context": "CORNER", "p_attacker_win": round(p, 4), "winner": defender.player.name})
            clear_point = from_attack_frame(defender.team_id, 35, clamp(landing.y + self.rng.normal("corner_clear", self.rng_context) * 9, 5, 95))
            self._resolve_loose_ball(clear_point, defender.team_id, "corner_clearance")

    def _execute_clearance(self, carrier: PlayerState, pressure: float) -> None:
        """Emergency/controlled clearance when safe buildup is no longer viable."""
        carrier.touches += 1
        carrier.clearances += 1
        rel = attack_relative_x(carrier.team_id, carrier.pos)
        long_skill = effective_attribute(carrier.player, carrier, "long_passing")
        reactions = effective_attribute(carrier.player, carrier, "reactions")
        controlled = sigmoid(-0.25 + 0.018 * (long_skill - 65.0) + 0.010 * (reactions - 65.0) - 0.85 * pressure)
        distance_pitch = clamp(28.0 + 22.0 * controlled + self.rng.normal("clear_distance", self.rng_context) * 5.0, 18.0, 58.0)
        target_rel = clamp(rel + distance_pitch, 20.0, 94.0)
        # Safer clearances tend toward the touchline; panicked ones can land centrally.
        side = 18.0 if carrier.pos.y < 50 else 82.0
        target_y = side * controlled + carrier.pos.y * (1.0 - controlled)
        target_y += self.rng.normal("clear_y", self.rng_context) * (5.0 + 8.0 * (1.0 - controlled))
        raw = from_attack_frame(carrier.team_id, target_rel, target_y)
        detail = {
            "pressure": round(pressure, 3), "controlled_probability": round(controlled, 4),
            "distance_m": round(distance_pitch * 1.05, 2),
        }
        if self._handle_out_of_play(carrier.team_id, raw, "clearance_out"):
            detail["outcome"] = "OUT_OF_PLAY"
            self._record_event("CLEARANCE", carrier.team_id, carrier, detail)
            add_performance(carrier, 0.025 + 0.035 * pressure, 0.3, component="defense")
            return
        landing = raw.clamp()
        detail.update({"outcome": "SECOND_BALL", "landing": [round(landing.x,2), round(landing.y,2)]})
        self._record_event("CLEARANCE", carrier.team_id, carrier, detail)
        add_performance(carrier, 0.03 + 0.05 * pressure, 0.35, component="defense")
        self._resolve_loose_ball(landing, carrier.team_id, "clearance")

    # ------------------------------------------------------------------
    # Action decision
    # ------------------------------------------------------------------
    def _choose_action(self, carrier: PlayerState, pressure: float, defender: PlayerState | None) -> tuple[str, PlayerState | None, float]:
        target, pass_u = self._choose_pass_target(carrier, pressure)
        relx = attack_relative_x(carrier.team_id, carrier.pos)
        xg = self._xg(carrier, pressure)
        role = carrier.instructions.attack_role.upper()
        tactic = self.teams[carrier.team_id].tactics
        block_resistance = self._set_block_resistance(carrier.team_id)
        actions: list[tuple[str, PlayerState | None, float]] = []
        if target is not None:
            actions.append(("PASS", target, pass_u))
        # In the defensive third, pressure can make simply removing danger the best
        # option. Secure/cagey systems reach that threshold earlier than ambitious ones.
        clear_threshold = 0.27 if tactic.progression_risk == "SECURE" else (0.34 if tactic.progression_risk == "BALANCED" else 0.42)
        if relx <= 40 and pressure >= clear_threshold:
            clear_u = -0.78 + 1.72 * pressure
            clear_u += {"SECURE": 0.62, "BALANCED": 0.12, "AMBITIOUS": -0.28}.get(tactic.progression_risk, 0.0)
            clear_u += {"DIRECT": 0.18, "MIXED": 0.05, "SHORT": -0.12}.get(tactic.passing_directness, 0.0)
            own_danger = clamp((36.0 - relx) / 30.0, 0.0, 1.0)
            clear_u += own_danger * (0.28 + 0.82 * pressure)
            if carrier.slot in {"GK", "LCB", "RCB", "LB", "RB"}:
                clear_u += 0.18 + 0.16 * own_danger
            if tactic.after_winning_possession == "SECURE" and tactic.defensive_block_height == "DEEP":
                # An ultra-conservative side that regains the ball inside its own shell
                # prioritizes relieving a closed press over insisting on patient short
                # circulation. This is an action-choice consequence of danger/pressure,
                # not a better clearance execution probability.
                clear_u += own_danger * (0.52 + 0.48 * pressure)
            actions.append(("CLEAR", None, clear_u))
        space = self._space_ahead(carrier)
        carry_u = -0.10 + 0.42 * space - 0.65 * pressure + 0.20 * self._g_eff(carrier, "ball_control")
        # cal6: carrying while holding a genuinely open shooting window forfeits
        # that window — a real opportunity cost, priced on the same truthful
        # signal as the shot choice. Probing in front of a wall stays free, so
        # patient sieges keep circulating instead of forcing blocked shots.
        if relx >= 66:
            _pb = self._shot_block_candidate(carrier)[1]
            carry_u -= 2.5 * max(0.0, xg * (1.0 - _pb) - 0.03)
        if relx >= 62.0 and block_resistance > 0.35:
            central_lane = clamp(1.0 - abs(carrier.pos.y - 50.0) / 30.0, 0.0, 1.0)
            carry_u -= block_resistance * (0.34 + 0.50 * (1.0 - space) + 0.34 * central_lane)
        if self._is_transition_attack(carrier.team_id):
            if tactic.after_winning_possession == "COUNTER":
                carry_u += 0.30 * space
            elif tactic.after_winning_possession == "SECURE":
                carry_u -= 0.18 * max(0.0, relx - 45.0) / 45.0
        actions.append(("CARRY", None, carry_u))
        if defender is not None and distance_m(defender.pos, carrier.pos) <= 4.8:
            if ST["E"]:
                # Family E: a take-on is valued by what beating THIS defender
                # earns - the corridor behind him - and killed by real cover.
                # Attribute terms unchanged; execution untouched.
                space_beyond = self._st_space_beyond(carrier, defender)
                cover_e = self._defensive_support_near(carrier)
                dribble_u = (ST_E["base"] + 0.40 * self._g_eff(carrier, "dribbling") + 0.28 * self._g_eff(carrier, "agility")
                             + ST_E["space"] * space_beyond - ST_E["cover"] * cover_e - 0.22 * self._g_eff(defender, "defensive_awareness"))
            else:
                dribble_u = -1.78 + 0.40 * self._g_eff(carrier, "dribbling") + 0.28 * self._g_eff(carrier, "agility") + 0.28 * space - 0.22 * self._g_eff(defender, "defensive_awareness")
            if role in {"TOUCHLINE_WINGER", "INSIDE_FORWARD", "FREE_FORWARD"}:
                dribble_u += 0.18
            if relx >= 68.0 and block_resistance > 0.35:
                central_lane = clamp(1.0 - abs(carrier.pos.y - 50.0) / 30.0, 0.0, 1.0)
                # Dribbling remains a valid individual route through a block, especially
                # for elite players, but repeatedly taking on a crowded central shell is
                # less attractive than isolating a defender wide. Execution odds are not
                # altered here.
                dribble_u -= block_resistance * (0.20 + 0.32 * central_lane + 0.18 * (1.0 - space))
            actions.append(("DRIBBLE", defender, dribble_u))
            if pressure > 0.48:
                shield_u = -1.52 + 0.32 * self._g_eff(carrier, "strength") + 0.18 * self._mass_term(carrier) + 0.20 * self._g_eff(carrier, "ball_control") + 0.22 * pressure
                if role in {"TARGET", "LINK"}:
                    shield_u += 0.20
                actions.append(("SHIELD", defender, shield_u))
        if relx >= 66:
            # cal6: the choice layer evaluates the chance a shooter actually has,
            # not the unobstructed geometry. Bodies between ball and goal make a
            # shot worth less to CHOOSE (execution already priced blocks; the
            # decision previously ignored them, which both suppressed genuinely
            # open chances and inflated crowded ones). The response to open
            # quality saturates: beyond ~0.13 effective xG a chance is already
            # clearly worth taking, and even better geometry changes little.
            p_blk_choice = self._shot_block_candidate(carrier)[1]
            xg_eff = xg * (1.0 - p_blk_choice)
            shoot_u = -2.72 + 1.6 * xg + 9.5 * min(xg_eff, 0.13) + (0.26 if carrier.slot == "ST" else 0.0) + 0.15 * self._g_eff(carrier, "finishing")
            if tactic.chance_creation_focus == "VERTICAL":
                shoot_u += 0.08
            probe = self._settled_probe(carrier.team_id)
            if probe > 0 and xg >= 0.025:
                # Mature settled possession increases willingness to cash in a genuinely
                # created shooting window. It does NOT change xG or goal probability.
                shoot_u += self.cal.settled_probe_shot_utility * probe * clamp((xg - 0.018) / 0.12, 0.0, 1.0)
            if tactic.box_commitment == "CAUTIOUS" and xg < 0.20:
                shoot_u -= 0.24 * (1.0 - 0.45 * probe)
            elif tactic.box_commitment == "COMMIT":
                shoot_u += 0.08
            # A highly ambitious/vertical attack facing a *set* deep shell should often
            # cash out a merely decent window rather than patiently combining forever
            # until a six-yard chance appears.  Against an open defense this disappears,
            # so true end-to-end games still create the highest-quality chances.  This is
            # action selection only: xG and goal probability are untouched.
            if block_resistance >= 0.45 and 0.025 <= xg < 0.13 and tactic.progression_risk == "AMBITIOUS":
                window = clamp((xg - 0.025) / 0.105, 0.0, 1.0)
                shoot_u += block_resistance * (0.34 + 0.22 * window)
                if tactic.chance_creation_focus == "VERTICAL":
                    shoot_u += 0.12 * block_resistance
            # Against a genuinely packed shell, very-low-value shots should lose out to
            # another circulation/cross/cutback cycle.  This never modifies xG or goal
            # probability; it only stops a wide/controlled siege from cashing out every
            # possession with a 30-40m shot because all other actions happen to score lower.
            if block_resistance > 0.35 and xg < 0.075 and tactic.chance_creation_focus == "WIDE":
                low_value = clamp((0.075 - xg) / 0.075, 0.0, 1.0)
                shoot_u -= block_resistance * (0.24 + 0.62 * low_value)
                shoot_u -= 0.10 * low_value
            if self._is_transition_attack(carrier.team_id) and tactic.after_winning_possession == "COUNTER":
                shoot_u += 0.10 * (1.0 - self._defensive_organization(carrier.team_id))
            actions.append(("SHOOT", None, shoot_u))
        utilities = [u for _, _, u in actions]
        # Family A temporal consistency: exploration noise is a per-time
        # phenomenon, not a per-decision constant. A one-second continuation
        # touch is decisive (near-best option); only a settled multi-second
        # assessment carries the full cal6 exploration temperature. Symmetric
        # across all actions - no candidate's value formula changes.
        _T = 0.72
        if ST["A"]:
            _gap = getattr(self, "_st_decision_gap", 3)
            _T = 0.72 * clamp(0.60 + 0.1334 * _gap, 0.73, 1.0)
        probs = softmax(utilities, temperature=_T)
        idx = self.rng.choice_index(probs, "action_choice", self.rng_context, carrier.player.player_id)
        return actions[idx]

    def _schedule_reception_ready(self, difficulty: float, urgent: bool = False) -> None:
        """Family A: contextual action-ready time after gaining control.

        The wait until the new carrier may act is derived from the reception
        itself (touch quality was already resolved upstream) instead of the
        global possession cadence. Deterministic - no RNG draws. A clean simple
        reception allows one-touch play at +1s; difficult, pressured or aerial
        controls need 2-4s of stabilization. Defenders move on the same
        timeline, so time-to-act becomes a football quantity, not an artifact
        of the decision scheduler.
        """
        if not ST["A"]:
            return
        if difficulty < 0.35:
            t = 1
        elif difficulty < 0.70:
            t = 2
        elif difficulty < 1.05:
            t = 3
        else:
            t = 4
        # Quick play is an ESCAPE/EXPLOIT tool, not a universal metronome: a
        # pressured receiver releases as soon as his touch allows, while a free
        # receiver keeps a calm survey tempo. Without this asymmetry every
        # clean reception becomes 1-second ping-pong and the action-hazard
        # density doubles for no football reason.
        if not urgent:
            t = max(t, 3)
        # advance_one_second() calls _schedule_next_decision() after the pass
        # decision completes, which would overwrite a bare next_decision_at
        # write; the pending marker survives and takes precedence there.
        self._reception_ready_at = self.clock + t
        self.next_decision_at = self.clock + t

    def _decision(self) -> None:
        self.rng_context += 1
        self._st_decision_gap = max(1, self.clock - self._last_decision_clock)
        self._last_decision_clock = self.clock
        carrier = self._carrier()
        pressure, presser = self._pressure(carrier)
        if presser is not None and pressure > 0.18:
            presser.pressures += 1
            # Family A temporal consistency: a challenge is a physical commit a
            # defender makes about once every few seconds, not once per carrier
            # decision. With contextual decision cadence the roll must be
            # rate-limited per presser or faster play would silently double
            # per-second challenge hazard.
            challenge_ok = True
            if ST["A"]:
                last = getattr(presser, "st_last_challenge_roll", -999)
                if self.clock - last < 3:
                    challenge_ok = False
                else:
                    presser.st_last_challenge_roll = self.clock
            p_challenge = self._defender_challenge_probability(carrier, presser, pressure) if challenge_ok else 0.0
            if p_challenge > 0.0 and self.rng.uniform("defender_challenge", self.rng_context, carrier.player.player_id, presser.player.player_id) < p_challenge:
                if self._execute_pressure_challenge(carrier, presser, pressure):
                    return
                # Recompute pressure after a failed challenge because both players may have
                # changed exposure/engagement state.
                pressure, presser = self._pressure(carrier)
        action, target, _ = self._choose_action(carrier, pressure, presser)
        if action == "SHOOT":
            self._execute_shot(carrier, pressure)
        elif action == "CLEAR":
            self._execute_clearance(carrier, pressure)
        elif action == "DRIBBLE" and target is not None:
            self._execute_dribble(carrier, target, pressure)
        elif action == "SHIELD" and target is not None:
            self._execute_shield(carrier, target, pressure)
        elif action == "PASS" and target is not None:
            self._execute_pass(carrier, target, pressure, presser)
        else:
            self._execute_carry(carrier, pressure)

    def _schedule_next_decision(self) -> None:
        lo = self.config.decision_interval_min
        hi = self.config.decision_interval_max
        tactics = self.teams[self.possession_team].tactics
        tempo = tactics.build_up_tempo
        if tempo == "QUICK":
            hi = max(lo, hi - 1)
        elif tempo == "PATIENT":
            # Patient buildup slows early circulation, but once a team has established
            # possession in the attacking third it should combine at normal football
            # speed rather than waiting 5-7 seconds between every action.  This is a
            # decision-time effect only and is one of the main ways controlled/cagey
            # football can still create meaningful attacks without becoming end-to-end.
            ball_rel = attack_relative_x(self.possession_team, self.ball.pos)
            if ball_rel >= 72.0:
                pass
            elif ball_rel >= 60.0:
                lo += 1
                hi += 1
            else:
                lo += 1
                hi += 2
        if self._is_transition_attack(self.possession_team):
            if tactics.after_winning_possession == "COUNTER":
                lo = max(2, lo - 1)
                hi = max(lo, hi - 1)
            elif tactics.after_winning_possession == "SECURE":
                lo += 1
                hi += 1

        # Tactical tempo governs how long a player *wants* to deliberate.  Immediate
        # pressure and own-goal danger govern how long the football situation actually
        # allows.  A patient low block therefore still clears/releases the ball quickly
        # when trapped near its own goal.
        if self.ball.control_state == BallControlState.CONTROLLED:
            carrier = self._carrier()
            pressure, _ = self._pressure(carrier)
            rel = attack_relative_x(carrier.team_id, carrier.pos)
            own_third_danger = clamp((36.0 - rel) / 30.0, 0.0, 1.0)
            urgency = pressure * 1.8 + own_third_danger * max(0.0, pressure - 0.15) * 1.6
            reduction = int(clamp(math.floor(urgency + 0.35), 0.0, 3.0))
            if reduction:
                lo = max(1, lo - reduction)
                hi = max(lo, hi - reduction)
        span = max(1, hi - lo + 1)
        offset = lo + int(self.rng.uniform("decision_interval", self.rng_context, self.clock) * span)
        self.next_decision_at = self.clock + offset
        if (ST["A"] or ST["E"]) and self._reception_ready_at is not None:
            if self._reception_ready_at > self.clock:
                self.next_decision_at = self._reception_ready_at
            self._reception_ready_at = None

    # ------------------------------------------------------------------
    # Basic coach AI: tactical mode + substitutions
    # ------------------------------------------------------------------
    def _bench_candidates_for_slot(self, team: Team, slot: str):
        if slot in {"LCB", "RCB"}:
            allowed = {"CB"}
        elif slot in {"LCM", "RCM", "LDM", "RDM"}:
            allowed = {"CM", "CAM", "CDM"}
        elif slot in {"LAM", "RAM", "CAM"}:
            allowed = {"CAM", "LW", "RW", "CM"}
        elif slot in {"LM", "RM"}:
            allowed = {"LW", "RW", "CM"}
        else:
            allowed = {slot}
        return [p for p in team.bench if p.primary_position in allowed]

    def _replacement_score(self, p, slot: str) -> float:
        # Coach selection utility only; never enters match-event execution.
        if slot == "ST":
            keys = ("finishing", "attacking_position", "acceleration", "ball_control")
        elif slot in {"LW", "RW", "LM", "RM"}:
            keys = ("dribbling", "acceleration", "sprint_speed", "ball_control")
        elif slot in {"LCB", "RCB"}:
            keys = ("defensive_awareness", "standing_tackle", "interceptions", "strength")
        elif slot in {"LB", "RB"}:
            keys = ("acceleration", "stamina", "standing_tackle", "crossing")
        elif slot in {"LAM", "RAM", "CAM"}:
            keys = ("vision", "dribbling", "ball_control", "attacking_position")
        else:
            keys = ("short_passing", "ball_control", "reactions", "stamina")
        return sum(p.attr(k) for k in keys) / len(keys)

    def _change_formation(self, team_id: str, new_formation: str, reason: str = "COACH_TACTICAL_CHANGE") -> None:
        team = self.teams[team_id]
        old_formation = team.formation_name
        if new_formation == old_formation:
            return
        mapping = slot_map_between(old_formation, new_formation)
        new_anchors = anchors_for(team_id, new_formation)
        new_lineup = {}
        new_instructions = {}
        active = list(self._team_states(team_id))
        for state in active:
            if state.slot not in mapping:
                # A red-card/substitution state can leave a nonstandard sparse shape;
                # keep its slot if the target formation also contains it, otherwise skip.
                if state.slot not in new_anchors:
                    continue
                new_slot = state.slot
            else:
                new_slot = mapping[state.slot]
            state.slot = new_slot
            state.home_anchor = new_anchors[new_slot]
            state.target = state.home_anchor
            state.instructions = team.instructions.get(new_slot, default_instructions(new_slot))
            new_lineup[new_slot] = state.player
            new_instructions[new_slot] = state.instructions
        team.lineup = new_lineup
        team.instructions = new_instructions
        team.formation_name = new_formation
        self._record_event("FORMATION_CHANGE", team_id, None, {
            "from": old_formation, "to": new_formation, "reason": reason, "active_players": len(active),
        })

    def _make_substitution(self, team_id: str, outgoing: PlayerState, incoming, target_slot: str | None = None, reason: str = "FATIGUE_PERFORMANCE_DISCIPLINE") -> None:
        team = self.teams[team_id]
        if incoming not in team.bench or not outgoing.active:
            return
        outgoing.active = False
        outgoing.subbed_off = True
        outgoing.minute_off = self.clock // 60
        slot = target_slot or outgoing.slot
        anchor = anchors_for(team_id, team.formation_name)[slot]
        instructions = team.instructions.get(slot, default_instructions(slot))
        incoming_state = PlayerState(incoming, team_id, slot, anchor, anchor, anchor, instructions, minute_on=self.clock // 60)
        self.states[incoming.player_id] = incoming_state
        if slot != outgoing.slot and team.lineup.get(outgoing.slot) is outgoing.player:
            # Red-card restructuring can sacrifice an attacker to refill a vacated
            # structural slot. Remove the sacrificed slot from the active lineup map
            # so the team really has ten occupied slots rather than a stale inactive entry.
            del team.lineup[outgoing.slot]
        team.lineup[slot] = incoming
        team.bench.remove(incoming)
        self.substitutions_used[team_id] += 1
        self._record_event("SUBSTITUTION", team_id, incoming_state, {
            "player_off": outgoing.player.name, "player_on": incoming.name, "slot": slot,
            "vacated_slot": outgoing.slot, "reason": reason,
        })
        self._start_dead_ball(8, "substitution")

    def _coach_check(self) -> None:
        minute = self.clock / 60.0
        for team_id, team in self.teams.items():
            if team_id not in getattr(self.config, "coach_ai_teams", ("HOME", "AWAY")):
                continue  # human-managed team: never overwritten by coach AI
            opp = self._opp_id(team_id)
            gd = self.score[team_id] - self.score[opp]
            desired = "BASE"
            if minute >= 68 and gd < 0:
                desired = "CHASE"
            elif minute >= 75 and gd > 0:
                desired = "PROTECT"
            if desired != self.coach_mode[team_id]:
                if desired == "CHASE":
                    team.tactics = replace(team.tactics, build_up_tempo="QUICK", progression_risk="AMBITIOUS", box_commitment="COMMIT", after_winning_possession="COUNTER", after_losing_possession="COUNTERPRESS", defensive_block_height="HIGH", pressing_intensity="AGGRESSIVE", defensive_line_behavior="STEP_UP")
                elif desired == "PROTECT":
                    team.tactics = replace(team.tactics, build_up_tempo="PATIENT", progression_risk="SECURE", box_commitment="CAUTIOUS", after_winning_possession="SECURE", after_losing_possession="REGROUP", defensive_block_height="MID", pressing_intensity="SELECTIVE", defensive_line_behavior="DROP")
                else:
                    team.tactics = self.base_tactics[team_id]
                self.coach_mode[team_id] = desired
                self._record_event("TACTIC_CHANGE", team_id, None, {"mode": desired, "minute": round(minute, 1)})
                target_formation = self.base_formations[team_id]
                if desired == "CHASE":
                    target_formation = "4-2-3-1"
                elif desired == "PROTECT":
                    target_formation = "4-3-3"
                try:
                    self._change_formation(team_id, target_formation, reason=desired)
                except ValueError:
                    # Unsupported future formation transitions should not break the match.
                    pass

            # Booked aggressive players are instructed to be more selective.
            for state in self._team_states(team_id):
                if state.yellow_cards and state.instructions.defense_effort > 55:
                    state.instructions = replace(state.instructions, defense_effort=max(45, state.instructions.defense_effort - 15))

            if self.substitutions_used[team_id] >= 5 or minute < 58:
                continue

            # If a red card removed a structural defender/midfielder, the coach can
            # sacrifice an attacker and fill that missing slot while staying at 10 men.
            sent_off = [s for s in self._team_states(team_id, active_only=False) if s.red_cards and not s.subbed_off]
            if sent_off:
                missing = sent_off[-1].slot
                bench_for_gap = self._bench_candidates_for_slot(team, missing)
                active_attackers = [s for s in self._team_states(team_id) if s.slot in {"LW","RW","ST","LCM","RCM","LAM","CAM","RAM"} and s.player.player_id != self.ball.controlling_player_id]
                if bench_for_gap and active_attackers:
                    outgoing_red_fix = min(active_attackers, key=lambda s: (s.match_rating, s.energy))
                    incoming_red_fix = max(bench_for_gap, key=lambda p: self._replacement_score(p, missing))
                    self._make_substitution(team_id, outgoing_red_fix, incoming_red_fix, target_slot=missing, reason="RED_CARD_RESTRUCTURE")
                    sent_off[-1].subbed_off = True  # marks the missing slot as handled, not a substitution of the dismissed player
                    continue

            candidates = [s for s in self._team_states(team_id) if s.slot != "GK" and s.player.player_id != self.ball.controlling_player_id]
            if not candidates:
                continue
            def urgency(s):
                future_load = 0.18 * s.instructions.attack_effort + 0.20 * s.instructions.defense_effort
                card_risk = 18.0 if s.yellow_cards else 0.0
                poor_form = max(0.0, 6.1 - s.match_rating) * 7.0
                return (100.0 - s.energy) + 0.22 * future_load + card_risk + poor_form
            outgoing = max(candidates, key=urgency)
            threshold = 42.0 if minute < 70 else (34.0 if minute < 80 else 24.0)
            if urgency(outgoing) < threshold:
                continue
            bench = self._bench_candidates_for_slot(team, outgoing.slot)
            if bench:
                incoming = max(bench, key=lambda p: self._replacement_score(p, outgoing.slot))
                self._make_substitution(team_id, outgoing, incoming)

    def _record_timeline(self) -> None:
        if not self.config.record_timeline:
            return
        for s in self.states.values():
            self.timeline.append({
                "second": self.clock,
                "player_id": s.player.player_id,
                "x": round(s.pos.x, 3),
                "y": round(s.pos.y, 3),
                "energy": round(s.energy, 4),
                "acute_exertion": round(s.acute_exertion, 4),
                "activity": s.current_activity,
                "rating": round(s.match_rating, 3),
                "active": s.active,
            })

    @property
    def is_finished(self) -> bool:
        return self.clock >= self.config.duration_seconds

    def advance_one_second(self) -> None:
        """The EXACT per-second body previously inside run().

        Interface refactor only: no reordering, no probability, RNG-key,
        timing or coefficient changes. run() and repeated advance calls are
        parity-tested to produce identical event ledgers.
        """
        self.clock += 1
        self._update_movement_and_fatigue()
        self._press_sweep()
        if self.clock == 45 * 60 and self.config.duration_seconds > 45 * 60:
            self._apply_halftime()
        if self.clock % 10 == 0 and self._active_play():
            self._evaluate_role_performance()
        if self.config.coach_ai_enabled and self.clock >= self.next_coach_check:
            self._coach_check()
            self.next_coach_check += 5 * 60
        if ST["A2"] and self._active_play() and self.ball.control_state == BallControlState.CONTROLLED:
            # Family A: the carrier reacts to an arriving presser instead of
            # holding the ball on a fixed timer while being closed down. When
            # the nearest opponent crosses inside reaction range, the next
            # decision is pulled forward to the next second. Deterministic.
            _c = self._carrier()
            _gap = min((distance_m(o.pos, _c.pos) for o in self._team_states(self._opp_id(_c.team_id))), default=None)
            if (_gap is not None and self._prev_carrier_gap is not None
                    and _gap < 4.5 <= self._prev_carrier_gap
                    and self.clock - self._last_decision_clock >= 2):
                self.next_decision_at = min(self.next_decision_at, self.clock + 1)
            self._prev_carrier_gap = _gap
        elif ST["A2"]:
            self._prev_carrier_gap = None
        if self.clock >= self.next_decision_at and self._active_play() and self.ball.control_state == BallControlState.CONTROLLED:
            self._decision()
            self._schedule_next_decision()
        self._record_timeline()

    def advance(self, seconds: int) -> None:
        for _ in range(int(seconds)):
            if self.is_finished:
                break
            self.advance_one_second()

    def result(self) -> MatchResult:
        if self.is_finished and not self._full_time_recorded:
            self._record_event("FULL_TIME", None, None, {"score": dict(self.score)})
            self._full_time_recorded = True
        return self._build_result()

    def run(self) -> MatchResult:
        while not self.is_finished:
            self.advance_one_second()
        return self.result()

    def _build_result(self) -> MatchResult:
        return MatchResult(
            seed=self.seed,
            home=self.home.name,
            away=self.away.name,
            home_score=self.score["HOME"],
            away_score=self.score["AWAY"],
            events=self.events,
            player_states=self.states,
            timeline=self.timeline,
            possession_seconds=dict(self.possession_seconds),
            active_play_seconds=self.active_play_seconds,
            dead_ball_seconds=self.dead_ball_seconds,
            rng_audit=list(self.rng.audit_log),
        )
