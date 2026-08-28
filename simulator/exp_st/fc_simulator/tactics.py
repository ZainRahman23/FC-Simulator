from __future__ import annotations

from .models import PlayerInstructions

TACTIC_OPTIONS = {
    "build_up_tempo": {"PATIENT", "BALANCED", "QUICK"},
    "passing_directness": {"SHORT", "MIXED", "DIRECT"},
    "progression_risk": {"SECURE", "BALANCED", "AMBITIOUS"},
    "attacking_width": {"NARROW", "BALANCED", "WIDE"},
    "chance_creation_focus": {"CENTRAL", "BALANCED", "WIDE", "VERTICAL"},
    "box_commitment": {"CAUTIOUS", "BALANCED", "COMMIT"},
    "after_winning_possession": {"SECURE", "BALANCED", "COUNTER"},
    "after_losing_possession": {"REGROUP", "BALANCED", "COUNTERPRESS"},
    "defensive_block_height": {"DEEP", "MID", "HIGH"},
    "pressing_intensity": {"PASSIVE", "SELECTIVE", "AGGRESSIVE", "RELENTLESS"},
    "defensive_width": {"NARROW", "BALANCED", "WIDE"},
    "marking_orientation": {"ZONAL", "HYBRID", "MAN_ORIENTED"},
    "defensive_line_behavior": {"DROP", "HOLD", "STEP_UP"},
}

ATTACK_ROLES = {
    "MIXED_DISTRIBUTOR", "SHORT_BUILD_UP", "DIRECT_DISTRIBUTOR", "SUPPORT_KEEPER",
    "HOLD_RECYCLE", "DISTRIBUTOR", "CARRY_FORWARD", "WIDE_ADVANCE",
    "SUPPORT", "OVERLAP", "UNDERLAP", "INVERT",
    "ANCHOR", "DEEP_PLAYMAKER", "DROP_BETWEEN_CBS", "ADVANCE_SUPPORT",
    "CONTROLLER", "CREATOR", "RUNNER", "ROAMER", "CONNECTOR", "SECOND_STRIKER", "FREE_ROAM",
    "WIDE_SUPPORT", "WINGER", "WIDE_RUNNER", "TOUCHLINE_WINGER", "INSIDE_FORWARD", "WIDE_CREATOR", "FREE_FORWARD",
    "POACHER", "RUN_BEHIND", "TARGET", "LINK",
}

DEFENSE_ROLES = {
    "LINE_KEEPER", "SWEEPER", "AGGRESSIVE_SWEEPER", "AREA_COMMANDER",
    "HOLD_LINE", "STEP_OUT", "COVER", "TIGHT_MARK",
    "HOLD_WIDE", "PRESS_WIDE", "TUCK_IN", "TRACK_RUNNER",
    "SCREEN", "BALL_HUNT", "TRACK_RUNNERS", "BACKLINE_COVER",
    "HOLD_ZONE", "PRESS", "TRACK", "STAY_HIGH", "SCREEN_PIVOT", "TRACK_MIDFIELD",
    "TRACK_FULLBACK", "PRESS_FULLBACK", "TUCK_INTO_BLOCK", "PRESS_CBS", "DROP_INTO_BLOCK",
}


def default_instructions(slot: str) -> PlayerInstructions:
    defaults = {
        "GK": PlayerInstructions("MIXED_DISTRIBUTOR", 30, "LINE_KEEPER", 35),
        "LB": PlayerInstructions("SUPPORT", 55, "HOLD_WIDE", 60),
        "RB": PlayerInstructions("SUPPORT", 55, "HOLD_WIDE", 60),
        "LCB": PlayerInstructions("HOLD_RECYCLE", 30, "HOLD_LINE", 60),
        "RCB": PlayerInstructions("HOLD_RECYCLE", 30, "HOLD_LINE", 60),
        "CDM": PlayerInstructions("ANCHOR", 40, "SCREEN", 70),
        "LDM": PlayerInstructions("ANCHOR", 40, "SCREEN", 70),
        "RDM": PlayerInstructions("DEEP_PLAYMAKER", 45, "HOLD_ZONE", 65),
        "LCM": PlayerInstructions("CONTROLLER", 55, "HOLD_ZONE", 55),
        "RCM": PlayerInstructions("CONTROLLER", 55, "HOLD_ZONE", 55),
        "LM": PlayerInstructions("WIDE_SUPPORT", 55, "TRACK_FULLBACK", 60),
        "RM": PlayerInstructions("WIDE_SUPPORT", 55, "TRACK_FULLBACK", 60),
        "LAM": PlayerInstructions("WIDE_CREATOR", 65, "TRACK_FULLBACK", 45),
        "CAM": PlayerInstructions("CREATOR", 65, "STAY_HIGH", 30),
        "RAM": PlayerInstructions("WIDE_CREATOR", 65, "TRACK_FULLBACK", 45),
        "LW": PlayerInstructions("TOUCHLINE_WINGER", 65, "STAY_HIGH", 35),
        "RW": PlayerInstructions("TOUCHLINE_WINGER", 65, "STAY_HIGH", 35),
        "ST": PlayerInstructions("RUN_BEHIND", 65, "STAY_HIGH", 30),
    }
    return defaults.get(slot, PlayerInstructions())


def effort01(value: int) -> float:
    return max(0.0, min(1.0, value / 100.0))


def validate_tactic(name: str, value: str) -> str:
    v = str(value).upper()
    if name not in TACTIC_OPTIONS:
        raise ValueError(f"Unknown tactic: {name}")
    if v not in TACTIC_OPTIONS[name]:
        raise ValueError(f"Invalid {name}={v}; allowed={sorted(TACTIC_OPTIONS[name])}")
    return v


def validate_role(role: str, attack: bool) -> str:
    value = str(role).upper()
    allowed = ATTACK_ROLES if attack else DEFENSE_ROLES
    if value not in allowed:
        raise ValueError(f"Unknown {'attack' if attack else 'defense'} role: {value}")
    return value
