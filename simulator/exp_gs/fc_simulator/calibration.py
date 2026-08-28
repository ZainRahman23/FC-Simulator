from __future__ import annotations

from dataclasses import dataclass

CALIBRATION_VERSION = "v0.7-cal9"  # cal9: attacking intelligence (contextual transition recovery, persistent off-ball run intentions, 2D carry destinations, stagnation escalation, geometric shot candidacy). cal8 was: penetration & displacement (rest-attack staffing via staggered occupation + split FB/CB line targets; defensive block displacement with inertia + strike-window urgency). cal7 was: spatial-temporal architecture (contextual on-ball tempo + carrier evasion, phase-shape translation, buildup support/relief, engagement ownership + containment/cover, take-on value + beaten-defender recovery). cal6 was: truthful shot-choice signal (xg·(1−p_block), saturating response) + carry opportunity cost at open windows. cal5 was: players-v3 four attributes: free_kick_accuracy (direct-FK placement + taker selection + range gate + dead-ball block law), penalties (execution + taker selection), balance (contact stability: ground duel/shield/dribble/contested touch), composure (pressure-degradation resistance in pass/shot/touch execution)  # ratings recentering + GK stat population.
                                   # Structural pass 2026-08: three candidate families
                                   # (settled-probe utility, pressure-engagement gating,
                                   # pass-choice risk rebalance) were each matched-seed
                                   # tested and REVERTED — see engine comments and
                                   # validation/POSSESSION_STRUCTURAL_REPORT.md.


@dataclass(frozen=True)
class CalibrationConfig:
    # Passing / control
    pass_base: float = 2.72
    pass_distance: float = 0.054
    pass_pressure: float = 1.22
    interception_cap: float = 0.84
    # On-ball contests
    dribble_temperature: float = 0.82
    tackle_temperature: float = 0.78
    shield_temperature: float = 0.82
    # Aerial / physical
    height_scale_cm: float = 8.5
    weight_scale_kg: float = 12.0
    aerial_temperature: float = 0.78
    ground_duel_temperature: float = 0.82
    # Discipline
    foul_base: float = -2.35
    yellow_base: float = -2.65
    red_base: float = -6.0
    # Match openness / chance ecology
    transition_window_seconds: int = 10
    transition_max_seconds: int = 20
    transition_recovery_org_threshold: float = 0.54
    xg_defensive_organization: float = 0.72
    xg_lane_density: float = 0.34
    xg_transition_space: float = 0.48
    support_pressure_weight: float = 0.30
    # Settled-possession chance creation. These parameters affect spatial support and
    # decision utility only; they never multiply xG or scoring probability directly.
    settled_probe_start_seconds: int = 10
    # v0.7-cal2 evaluation note: raising probe responsiveness (full 28->22,
    # pass_utility 0.36->0.42) was tested against 96 matched seeds per matchup
    # and REVERTED: controlled/balanced settled xG moved only +0.02/+0.03
    # (inside CI) while the aggressive-vs-ultra siege tail worsened by +0.29.
    # Diagnosis: mean possession duration in controlled/balanced football is
    # ~11-12s, so most possessions never mature past the probe start; probe
    # utility increases instead feed long-possession sieges. The binding
    # constraint is possession survival — a structural workstream, not a
    # probe coefficient.
    settled_probe_full_seconds: int = 28
    settled_probe_forward_depth: float = 9.0
    settled_probe_pass_utility: float = 0.36
    settled_probe_shot_utility: float = 1.00
    # Shooting
    shot_decision_base: float = -4.55
    # Rating
    rating_scale: float = 3.4
