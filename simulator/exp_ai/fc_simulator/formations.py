from __future__ import annotations

from .models import Vec2

FORMATION_433 = {
    "GK": Vec2(5, 50),
    "LB": Vec2(23, 15),
    "LCB": Vec2(20, 38),
    "RCB": Vec2(20, 62),
    "RB": Vec2(23, 85),
    "CDM": Vec2(38, 50),
    "LCM": Vec2(48, 35),
    "RCM": Vec2(48, 65),
    "LW": Vec2(68, 15),
    "ST": Vec2(72, 50),
    "RW": Vec2(68, 85),
}

FORMATION_4231 = {
    "GK": Vec2(5, 50),
    "LB": Vec2(23, 15),
    "LCB": Vec2(20, 38),
    "RCB": Vec2(20, 62),
    "RB": Vec2(23, 85),
    "LDM": Vec2(39, 42),
    "RDM": Vec2(39, 58),
    "LAM": Vec2(61, 20),
    "CAM": Vec2(61, 50),
    "RAM": Vec2(61, 80),
    "ST": Vec2(74, 50),
}


FORMATION_4141 = {
    "GK": Vec2(5, 50),
    "LB": Vec2(23, 15),
    "LCB": Vec2(20, 38),
    "RCB": Vec2(20, 62),
    "RB": Vec2(23, 85),
    "CDM": Vec2(36, 50),
    "LM": Vec2(50, 17),
    "LCM": Vec2(50, 39),
    "RCM": Vec2(50, 61),
    "RM": Vec2(50, 83),
    "ST": Vec2(70, 50),
}

FORMATIONS = {
    "4-3-3": FORMATION_433,
    "4-2-3-1": FORMATION_4231,
    "4-1-4-1": FORMATION_4141,
}

FORMATION_REMAP_FROM_433 = {
    "4-3-3": {slot: slot for slot in FORMATION_433},
    "4-2-3-1": {
        "GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
        "CDM": "LDM", "LCM": "RDM", "LW": "LAM", "RCM": "CAM", "RW": "RAM", "ST": "ST",
    },
    "4-1-4-1": {
        "GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
        "CDM": "CDM", "LCM": "LCM", "RCM": "RCM", "LW": "LM", "RW": "RM", "ST": "ST",
    },
}


def anchors_for(team_id: str, formation_name: str = "4-3-3") -> dict[str, Vec2]:
    if formation_name not in FORMATIONS:
        raise ValueError(f"Unknown formation {formation_name}; supported={sorted(FORMATIONS)}")
    base = FORMATIONS[formation_name]
    if team_id == "HOME":
        return dict(base)
    return {slot: Vec2(100 - p.x, p.y) for slot, p in base.items()}


def slot_map_between(current: str, target: str) -> dict[str, str]:
    """Return deterministic slot remap for supported in-match formation changes."""
    if current == target:
        return {slot: slot for slot in FORMATIONS[current]}
    if current == "4-3-3" and target == "4-2-3-1":
        return dict(FORMATION_REMAP_FROM_433[target])
    if current in {"4-2-3-1", "4-1-4-1"} and target == "4-3-3":
        forward = FORMATION_REMAP_FROM_433[current]
        return {new: old for old, new in forward.items()}
    if current == "4-3-3" and target == "4-1-4-1":
        return dict(FORMATION_REMAP_FROM_433[target])
    raise ValueError(f"Unsupported formation transition {current} -> {target}")
