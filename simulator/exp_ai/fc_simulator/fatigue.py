from __future__ import annotations

from .mathcore import clamp
from .models import Player, PlayerState

FATIGUE_SENSITIVITY = {
    "acceleration": 0.34,
    "sprint_speed": 0.28,
    "agility": 0.24,
    "reactions": 0.20,
    "jumping": 0.20,
    "strength": 0.13,
    "dribbling": 0.12,
    "long_passing": 0.11,
    "crossing": 0.10,
    "finishing": 0.10,
    "shot_power": 0.10,
    "long_shots": 0.10,
    "volleys": 0.10,
    "standing_tackle": 0.10,
    "sliding_tackle": 0.10,
    "heading_accuracy": 0.08,
    "ball_control": 0.07,
    "short_passing": 0.07,
    "interceptions": 0.06,
    "vision": 0.02,
    "defensive_awareness": 0.02,
    "attacking_position": 0.02,
    "aggression": 0.0,
    "gk_reflexes": 0.08,
    "gk_diving": 0.08,
    "gk_handling": 0.05,
    "gk_positioning": 0.02,
}


def effective_attribute(player: Player, state: PlayerState, name: str) -> float:
    base = player.attr(name)
    sensitivity = FATIGUE_SENSITIVITY.get(name, 0.06)
    deficit = clamp((100.0 - state.energy) / 100.0, 0.0, 1.0)
    acute = clamp(state.acute_exertion / 100.0, 0.0, 1.0)
    penalty = sensitivity * deficit * deficit + (sensitivity * 0.18) * acute * acute
    return clamp(base * (1.0 - penalty), 1.0, 99.0)


def stamina_efficiency(stamina: float) -> float:
    return clamp(1.15 - 0.0055 * stamina, 0.58, 0.95)


def update_fatigue(state: PlayerState, moved_m: float, desired_speed_mps: float, dt: float = 1.0) -> None:
    stamina = state.player.attr("stamina", 70.0)
    intensity = clamp(desired_speed_mps / 8.5, 0.0, 1.25)
    locomotion_load = 0.0010 + 0.0075 * intensity**2 + 0.0060 * max(0.0, intensity - 0.65)**2
    movement_factor = 0.45 + 0.55 * clamp(moved_m / max(0.25, desired_speed_mps * dt), 0.0, 1.0)
    energy_cost = 4.5 * locomotion_load * movement_factor * stamina_efficiency(stamina) * dt
    state.energy = clamp(state.energy - energy_cost, 0.0, 100.0)

    exertion_gain = max(0.0, intensity - 0.42) * 4.3 * dt
    recovery_rate = (0.75 + 0.018 * stamina) * (1.0 - min(0.9, intensity)) * dt
    state.acute_exertion = clamp(state.acute_exertion + exertion_gain - recovery_rate, 0.0, 100.0)


def add_explosive_load(state: PlayerState, duel: float = 0.0, jump: float = 0.0, sprint_burst: float = 0.0) -> None:
    """Add event-based workload without making weight a universal stamina penalty."""
    stamina = state.player.attr("stamina", 70.0)
    raw = 0.11 * max(0.0, duel) + 0.14 * max(0.0, jump) + 0.12 * max(0.0, sprint_burst)
    state.energy = clamp(state.energy - raw * stamina_efficiency(stamina), 0.0, 100.0)
    state.acute_exertion = clamp(state.acute_exertion + 2.1 * duel + 2.8 * jump + 2.5 * sprint_burst, 0.0, 100.0)
    state.duel_load += max(0.0, duel)
    state.jump_load += max(0.0, jump)


def halftime_recovery(state: PlayerState) -> None:
    """Large acute recovery plus modest long-term Energy restoration at halftime."""
    stamina = state.player.attr("stamina", 70.0)
    state.energy = clamp(state.energy + 2.5 + 0.025 * stamina, 0.0, 100.0)
    state.acute_exertion = clamp(state.acute_exertion * 0.15, 0.0, 100.0)
