from __future__ import annotations

import math
from .mathcore import clamp
from .models import PlayerState

VALID_COMPONENTS = {"attack", "possession", "defense", "goalkeeping", "discipline", "role", "general"}

# v0.7-cal2: expected accrual per unit of rating confidence for a NEUTRAL
# performance, by position group. Routine successful actions (completed passes,
# recoveries, won duels) accrue small positives; without an expectation offset
# an average player on an average team drifted to ~8.2-8.5 instead of the
# documented "centered near 6". The neutral rate is position-structured because
# each job's ordinary event mix accrues at a different rate (measured over
# mirrored identical teams: ATT 0.058, MID 0.105, DEF 0.134, GK 0.122 value per
# confidence unit). Centering per group means "average output for your job = 6"
# for every position; above/below-average performance moves the rating either
# way. Presentation-layer only — ratings never feed back into ability.
NEUTRAL_DRIFT_RATE = {"ATT": 0.058, "MID": 0.105, "DEF": 0.134, "GK": 0.122}
_SLOT_GROUP = {
    "GK": "GK",
    "LB": "DEF", "RB": "DEF", "LCB": "DEF", "RCB": "DEF",
    "CDM": "MID", "LDM": "MID", "RDM": "MID", "LCM": "MID", "RCM": "MID",
    "LM": "MID", "RM": "MID",
    "CAM": "ATT", "LAM": "ATT", "RAM": "ATT", "LW": "ATT", "RW": "ATT", "ST": "ATT",
    # Core Loop v2 E3 slots (back three / wing-backs / strike pair)
    "CB": "DEF", "LWB": "DEF", "RWB": "DEF", "LST": "ATT", "RST": "ATT",
}


def _refresh_rating(state: PlayerState) -> None:
    # Event performance remains the main signal; role performance is deliberately capped
    # so simply standing in the assigned zone can never manufacture an elite rating.
    role_term = clamp(state.role_value, -1.25, 1.25) * 0.35
    neutral = NEUTRAL_DRIFT_RATE[_SLOT_GROUP.get(state.slot, "MID")]
    combined = (state.performance_value - neutral * state.rating_confidence) + role_term
    confidence = state.rating_confidence + 0.45 * state.role_confidence
    amplitude = 4.0 * (confidence / (confidence + 7.5))
    state.match_rating = clamp(6.0 + amplitude * math.tanh(combined / 5.2), 1.0, 10.0)

def add_performance(state: PlayerState, value: float, confidence: float = 1.0, component: str = "general") -> None:
    value = float(value)
    state.performance_value += value
    state.rating_confidence += max(0.0, float(confidence))
    if component != "general":
        if component not in VALID_COMPONENTS:
            raise ValueError(f"Unknown rating component {component}")
        state.rating_components[component] = state.rating_components.get(component, 0.0) + value
    _refresh_rating(state)

def add_role_performance(state: PlayerState, value: float, confidence: float = 0.25, success: bool | None = None) -> None:
    # Role evidence is intentionally low-amplitude and opportunity-based. The raw
    # spatial evidence values are scaled before accumulation so high-opportunity
    # roles (screen/controller/hold-zone) remain differentiated over 90 minutes
    # instead of all saturating the cap. Event execution remains dominant.
    value = clamp(float(value), -0.08, 0.08) * 0.15
    state.role_value = clamp(state.role_value + value, -1.5, 1.5)
    state.role_confidence += max(0.0, float(confidence))
    state.rating_components["role"] = state.role_value
    if success is not None:
        state.role_opportunities += 1
        if success:
            state.role_successes += 1
    _refresh_rating(state)
