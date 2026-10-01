from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


@dataclass(frozen=True)
class Vec2:
    x: float
    y: float

    def clamp(self) -> "Vec2":
        return Vec2(max(0.0, min(100.0, self.x)), max(0.0, min(100.0, self.y)))


@dataclass(frozen=True)
class Player:
    player_id: str
    name: str
    primary_position: str
    preferred_foot: str
    weak_foot: int
    natural_side: str
    height_cm: float | None
    weight_kg: float | None
    attributes: dict[str, float]
    ovr: int = 0  # display metadata only: never used in match resolution
    pot: int = 0
    age: int = 0

    def attr(self, key: str, default: float = 50.0) -> float:
        return float(self.attributes.get(key, default))


@dataclass(frozen=True)
class PlayerInstructions:
    attack_role: str = "SUPPORT"
    attack_effort: int = 50
    defense_role: str = "HOLD_ZONE"
    defense_effort: int = 50


@dataclass
class PlayerState:
    player: Player
    team_id: str
    slot: str
    home_anchor: Vec2
    pos: Vec2
    target: Vec2
    instructions: PlayerInstructions = field(default_factory=PlayerInstructions)
    energy: float = 100.0
    acute_exertion: float = 0.0
    speed_mps: float = 0.0
    current_activity: str = "standing"
    distance_m: float = 0.0
    sprint_distance_m: float = 0.0
    high_intensity_distance_m: float = 0.0
    jog_distance_m: float = 0.0
    walk_distance_m: float = 0.0
    duel_load: float = 0.0
    jump_load: float = 0.0
    ball_exposure: float = 0.35
    active: bool = True
    subbed_off: bool = False
    minute_on: int = 0
    minute_off: int | None = None
    touches: int = 0
    passes_attempted: int = 0
    passes_completed: int = 0
    progressive_passes: int = 0
    key_passes: int = 0
    chances_created: int = 0
    dribbles_attempted: int = 0
    dribbles_completed: int = 0
    defenders_beaten: int = 0
    carries: int = 0
    progressive_carries: int = 0
    pressures: int = 0
    effective_pressures: int = 0
    tackles_attempted: int = 0
    tackles_won: int = 0
    interceptions: int = 0
    recoveries: int = 0
    ground_duels: int = 0
    ground_duels_won: int = 0
    aerial_duels: int = 0
    aerial_duels_won: int = 0
    clearances: int = 0
    blocks: int = 0
    shots: int = 0
    shots_on_target: int = 0
    goals: int = 0
    assists: int = 0
    pre_assists: int = 0
    xg: float = 0.0
    psxg: float = 0.0
    saves: int = 0
    gk_sweeps: int = 0
    gk_claims: int = 0
    gk_punches: int = 0
    goals_conceded: int = 0
    fouls_committed: int = 0
    fouls_won: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    turnovers: int = 0
    performance_value: float = 0.0
    rating_confidence: float = 0.0
    match_rating: float = 6.0
    # v0.4: explainable rating components and role-performance evidence.
    rating_components: dict[str, float] = field(default_factory=lambda: {
        "attack": 0.0, "possession": 0.0, "defense": 0.0, "goalkeeping": 0.0, "discipline": 0.0, "role": 0.0
    })
    role_value: float = 0.0
    role_confidence: float = 0.0
    role_opportunities: int = 0
    role_successes: int = 0
    support_options_created: int = 0
    line_stretch_runs: int = 0
    screening_actions: int = 0
    tracking_actions: int = 0
    width_actions: int = 0
    box_support_actions: int = 0


# Core Loop v2 E2 (ENGINE CHANGE): match-scoped attribute deltas
# {attr: +x}, maintained by MatchEngine's modifier layers. A plain class
# attribute (not a dataclass field): None by default, so legacy pickles,
# asdict() output and every flags-off path are untouched.
PlayerState.mods = None


@dataclass(frozen=True)
class TeamTactics:
    build_up_tempo: str = "BALANCED"
    passing_directness: str = "MIXED"
    progression_risk: str = "BALANCED"
    attacking_width: str = "BALANCED"
    chance_creation_focus: str = "BALANCED"
    box_commitment: str = "BALANCED"
    after_winning_possession: str = "BALANCED"
    after_losing_possession: str = "BALANCED"
    defensive_block_height: str = "MID"
    pressing_intensity: str = "SELECTIVE"
    defensive_width: str = "BALANCED"
    marking_orientation: str = "ZONAL"
    defensive_line_behavior: str = "HOLD"


@dataclass
class Team:
    team_id: str
    name: str
    lineup: dict[str, Player]
    tactics: TeamTactics = field(default_factory=TeamTactics)
    instructions: dict[str, PlayerInstructions] = field(default_factory=dict)
    bench: list[Player] = field(default_factory=list)
    formation_name: str = "4-3-3"


class BallControlState(str, Enum):
    CONTROLLED = "CONTROLLED"
    TRAVELING = "TRAVELING"
    LOOSE = "LOOSE"
    DEAD = "DEAD"


class BallHeightState(str, Enum):
    GROUND = "GROUND"
    LOW = "LOW"
    AERIAL = "AERIAL"
    HIGH_AERIAL = "HIGH_AERIAL"


@dataclass
class BallState:
    pos: Vec2
    control_state: BallControlState
    controlling_team_id: str | None = None
    controlling_player_id: str | None = None
    height_state: BallHeightState = BallHeightState.GROUND
    last_touch_player_id: str | None = None


@dataclass
class Event:
    event_id: int
    timestamp: int
    event_type: str
    team_id: str | None
    actor_id: str | None
    actor_name: str | None
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class MatchConfig:
    duration_seconds: int = 90 * 60
    record_timeline: bool = False
    home_advantage_logit: float = 0.0
    decision_interval_min: int = 3
    decision_interval_max: int = 6
    referee_strictness: float = 0.0
    coach_ai_enabled: bool = True
    # Integration addition (v0.7 touchline): which teams the built-in coach AI
    # manages. Default covers both teams, preserving prior behaviour exactly.
    # A human-managed team is simply excluded from this tuple.
    coach_ai_teams: tuple[str, ...] = ("HOME", "AWAY")
    record_rng_audit: bool = False
    # Observational pressing-lifecycle log (validation only; never affects play).
    press_debug: bool = False


@dataclass
class MatchResult:
    seed: int
    home: str
    away: str
    home_score: int
    away_score: int
    events: list[Event]
    player_states: dict[str, PlayerState]
    timeline: list[dict[str, Any]]
    possession_seconds: dict[str, int] = field(default_factory=dict)
    active_play_seconds: int = 0
    dead_ball_seconds: int = 0
    rng_audit: list[dict[str, Any]] = field(default_factory=list)

    def summary(self) -> dict[str, Any]:
        controlled = max(1, sum(self.possession_seconds.values()))
        team_names = {"HOME": self.home, "AWAY": self.away}
        team_stats = {}
        for tid, name in team_names.items():
            ps = [s for s in self.player_states.values() if s.team_id == tid]
            pa = sum(s.passes_attempted for s in ps); pc = sum(s.passes_completed for s in ps)
            ta = sum(s.tackles_attempted for s in ps); tw = sum(s.tackles_won for s in ps)
            aa = sum(s.aerial_duels for s in ps); aw = sum(s.aerial_duels_won for s in ps)
            shot_events = [e for e in self.events if e.event_type == "SHOT" and e.team_id == tid]
            transition_shots = [e for e in shot_events if bool(e.detail.get("transition", False))]
            settled_shots = [e for e in shot_events if not bool(e.detail.get("transition", False))]
            org_values = [float(e.detail.get("defensive_organization")) for e in shot_events if e.detail.get("defensive_organization") is not None]
            team_stats[name] = {
                "shots": sum(s.shots for s in ps), "shots_on_target": sum(s.shots_on_target for s in ps),
                "xg": round(sum(s.xg for s in ps), 3), "goals": sum(s.goals for s in ps),
                "transition_shots": len(transition_shots),
                "transition_xg": round(sum(float(e.detail.get("xg", 0.0)) for e in transition_shots), 3),
                "settled_xg": round(sum(float(e.detail.get("xg", 0.0)) for e in settled_shots), 3),
                "big_chances": sum(1 for e in shot_events if float(e.detail.get("xg", 0.0)) >= 0.25),
                "box_entries": sum(1 for e in self.events if e.event_type == "BOX_ENTRY" and e.team_id == tid),
                "box_entry_possessions": len({e.detail.get("possession_id") for e in self.events if e.event_type == "BOX_ENTRY" and e.team_id == tid}),
                "mean_defensive_organization_on_shots": round(sum(org_values) / max(1, len(org_values)), 3) if org_values else None,
                "passes_attempted": pa, "passes_completed": pc, "pass_completion": round(pc / max(1, pa), 3),
                "progressive_passes": sum(s.progressive_passes for s in ps),
                "key_passes": sum(s.key_passes for s in ps),
                "chances_created": sum(s.chances_created for s in ps),
                "cutbacks": sum(1 for e in self.events if e.event_type == "PASS" and e.team_id == tid and e.detail.get("pass_type") == "CUTBACK" and e.detail.get("outcome") == "COMPLETED"),
                "crosses": sum(1 for e in self.events if e.event_type == "CROSS" and e.team_id == tid),
                "cross_attacker_contacts": sum(1 for e in self.events if e.event_type == "CROSS" and e.team_id == tid and e.detail.get("outcome") == "ATTACKER_CONTACT"),
                "cutback_windows": sum(1 for e in self.events if e.event_type == "CUTBACK_WINDOW" and e.team_id == tid),
                "cutback_first_time_shots": sum(1 for e in shot_events if e.detail.get("shot_type") == "CUTBACK_FIRST_TIME"),
                "dribbles": [sum(s.dribbles_completed for s in ps), sum(s.dribbles_attempted for s in ps)],
                "pressures": [sum(s.effective_pressures for s in ps), sum(s.pressures for s in ps)],
                "tackles": [tw, ta], "interceptions": sum(s.interceptions for s in ps),
                "aerials": [aw, aa], "clearances": sum(s.clearances for s in ps), "blocks": sum(s.blocks for s in ps),
                "fouls": sum(s.fouls_committed for s in ps), "yellow_cards": sum(s.yellow_cards for s in ps), "red_cards": sum(s.red_cards for s in ps),
                "distance_km": round(sum(s.distance_m for s in ps)/1000.0, 2),
                "corners": sum(1 for e in self.events if e.event_type == "CORNER" and e.team_id == tid),
                "offsides": sum(1 for e in self.events if e.event_type == "OFFSIDE" and e.team_id == tid),
                "throw_ins": sum(1 for e in self.events if e.event_type == "THROW_IN" and e.team_id == tid),
                "goal_kicks": sum(1 for e in self.events if e.event_type == "GOAL_KICK" and e.team_id == tid),
                "role_opportunities": sum(s.role_opportunities for s in ps),
                "role_successes": sum(s.role_successes for s in ps),
                "role_success_rate": round(sum(s.role_successes for s in ps) / max(1, sum(s.role_opportunities for s in ps)), 3),
                "support_options_created": sum(s.support_options_created for s in ps),
                "line_stretch_runs": sum(s.line_stretch_runs for s in ps),
                "screening_actions": sum(s.screening_actions for s in ps),
                "tracking_actions": sum(s.tracking_actions for s in ps),
            }
        possession_changes = [e for e in self.events if e.event_type == "POSSESSION_CHANGE"]
        possession_durations = [float(e.detail.get("previous_duration_s", 0.0)) for e in possession_changes if e.detail.get("previous_duration_s") is not None]
        all_shots = [e for e in self.events if e.event_type == "SHOT"]
        transition_shots_all = [e for e in all_shots if bool(e.detail.get("transition", False))]
        total_xg = sum(float(e.detail.get("xg", 0.0)) for e in all_shots)
        transition_xg = sum(float(e.detail.get("xg", 0.0)) for e in transition_shots_all)
        return {
            "seed": self.seed,
            "home": self.home,
            "away": self.away,
            "score": {self.home: self.home_score, self.away: self.away_score},
            "match_dynamics": {
                "possession_changes": len(possession_changes),
                "mean_possession_duration_s": round(sum(possession_durations) / max(1, len(possession_durations)), 2) if possession_durations else None,
                "transition_shots": len(transition_shots_all),
                "transition_shot_share": round(len(transition_shots_all) / max(1, len(all_shots)), 3),
                "transition_xg_share": round(transition_xg / max(1e-9, total_xg), 3) if total_xg > 0 else 0.0,
                "mean_shot_xg": round(total_xg / max(1, len(all_shots)), 4),
                "big_chances": sum(1 for e in all_shots if float(e.detail.get("xg", 0.0)) >= 0.25),
                "box_entries": sum(1 for e in self.events if e.event_type == "BOX_ENTRY"),
                "box_entry_possessions": len({e.detail.get("possession_id") for e in self.events if e.event_type == "BOX_ENTRY"}),
                "active_play_seconds": self.active_play_seconds,
                "dead_ball_seconds": self.dead_ball_seconds,
            },
            "event_count": len(self.events),
            "possession": {
                team_names.get(k,k): round(100.0 * v / controlled, 1) for k, v in self.possession_seconds.items()
            },
            "team_stats": team_stats,
            "players": {
                pid: {
                    "name": s.player.name,
                    "team_id": s.team_id,
                    "slot": s.slot,
                    "height_cm": s.player.height_cm,
                    "weight_kg": s.player.weight_kg,
                    "energy": round(s.energy, 2),
                    "acute_exertion": round(s.acute_exertion, 2),
                    "distance_m": round(s.distance_m, 1),
                    "distance_breakdown_m": {
                        "walk": round(s.walk_distance_m, 1),
                        "jog": round(s.jog_distance_m, 1),
                        "high_intensity": round(s.high_intensity_distance_m, 1),
                        "sprint": round(s.sprint_distance_m, 1),
                    },
                    "rating": round(s.match_rating, 2),
                    "passes": [s.passes_completed, s.passes_attempted],
                    "progressive_passes": s.progressive_passes,
                    "key_passes": s.key_passes,
                    "chances_created": s.chances_created,
                    "dribbles": [s.dribbles_completed, s.dribbles_attempted],
                    "tackles": [s.tackles_won, s.tackles_attempted],
                    "aerials": [s.aerial_duels_won, s.aerial_duels],
                    "shots": s.shots,
                    "shots_on_target": s.shots_on_target,
                    "goals": s.goals,
                    "assists": s.assists,
                    "pre_assists": s.pre_assists,
                    "saves": s.saves,
                    "gk_sweeps": s.gk_sweeps,
                    "gk_claims": s.gk_claims,
                    "gk_punches": s.gk_punches,
                    "interceptions": s.interceptions,
                    "recoveries": s.recoveries,
                    "fouls": s.fouls_committed,
                    "cards": [s.yellow_cards, s.red_cards],
                    "turnovers": s.turnovers,
                    "role": {
                        "attack_role": s.instructions.attack_role,
                        "defense_role": s.instructions.defense_role,
                        "value": round(s.role_value, 3),
                        "opportunities": s.role_opportunities,
                        "successes": s.role_successes,
                        "success_rate": round(s.role_successes / max(1, s.role_opportunities), 3),
                        "support_options": s.support_options_created,
                        "line_stretch_runs": s.line_stretch_runs,
                        "screening_actions": s.screening_actions,
                        "tracking_actions": s.tracking_actions,
                        "width_actions": s.width_actions,
                        "box_support_actions": s.box_support_actions,
                    },
                    "rating_components": {k: round(v, 3) for k, v in s.rating_components.items()},
                }
                for pid, s in self.player_states.items()
            },
        }
