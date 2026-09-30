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

# ── Core Loop v2 E3 (ENGINE CHANGE): back-three / back-five / strike-pair
# shapes. New slot names: CB (centre of a back three), LWB/RWB (wing-backs —
# the engine's line logic treats them as full-backs), LST/RST (strike pair —
# treated as strikers). Legacy shapes and their remaps are untouched.
FORMATION_442 = {
    "GK": Vec2(5, 50),
    "LB": Vec2(23, 15),
    "LCB": Vec2(20, 38),
    "RCB": Vec2(20, 62),
    "RB": Vec2(23, 85),
    "LM": Vec2(48, 17),
    "LCM": Vec2(46, 39),
    "RCM": Vec2(46, 61),
    "RM": Vec2(48, 83),
    "LST": Vec2(70, 42),
    "RST": Vec2(70, 58),
}

FORMATION_343 = {
    "GK": Vec2(5, 50),
    "LCB": Vec2(20, 30),
    "CB": Vec2(18, 50),
    "RCB": Vec2(20, 70),
    "LWB": Vec2(40, 12),
    "LCM": Vec2(46, 39),
    "RCM": Vec2(46, 61),
    "RWB": Vec2(40, 88),
    "LW": Vec2(68, 18),
    "ST": Vec2(72, 50),
    "RW": Vec2(68, 82),
}

FORMATION_532 = {
    "GK": Vec2(5, 50),
    "LWB": Vec2(27, 10),
    "LCB": Vec2(19, 32),
    "CB": Vec2(17, 50),
    "RCB": Vec2(19, 68),
    "RWB": Vec2(27, 90),
    "CDM": Vec2(37, 50),
    "LCM": Vec2(47, 34),
    "RCM": Vec2(47, 66),
    "LST": Vec2(70, 42),
    "RST": Vec2(70, 58),
}

FORMATIONS = {
    "4-3-3": FORMATION_433,
    "4-2-3-1": FORMATION_4231,
    "4-1-4-1": FORMATION_4141,
    "4-4-2": FORMATION_442,
    "3-4-3": FORMATION_343,
    "5-3-2": FORMATION_532,
}
LEGACY_FORMATIONS = frozenset({"4-3-3", "4-2-3-1", "4-1-4-1"})
BACK_THREE_FORMATIONS = frozenset({"3-4-3", "5-3-2"})

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


# E3 shapes reach every other shape through 4-3-3: each one has a
# hand-written, football-sensible bijection onto 4-3-3 (who does which job
# when the shape changes); X -> Y = (4-3-3 -> Y) . (X -> 4-3-3). Composition of
# bijections is a bijection, so every remap is a full, duplicate-free slot map.
E3_TO_433 = {
    # a midfielder pushes up beside the striker (RCM -> RST) and the other
    # holds (CDM -> RCM); wingers become wide midfielders
    "4-4-2": {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
              "LM": "LW", "LCM": "LCM", "RCM": "CDM", "RM": "RW", "LST": "ST", "RST": "RCM"},
    # the holding midfielder drops between the centre-backs; full-backs push on
    "3-4-3": {"GK": "GK", "LCB": "LCB", "CB": "CDM", "RCB": "RCB", "LWB": "LB",
              "LCM": "LCM", "RCM": "RCM", "RWB": "RB", "LW": "LW", "ST": "ST", "RW": "RW"},
    # DM drops in as the middle CB, a CM holds, the left winger tucks into
    # midfield, the right winger joins the striker
    "5-3-2": {"GK": "GK", "LWB": "LB", "LCB": "LCB", "CB": "CDM", "RCB": "RCB", "RWB": "RB",
              "CDM": "LCM", "LCM": "LW", "RCM": "RCM", "LST": "ST", "RST": "RW"},
}


# Direct tables where composing through 4-3-3 would shuffle players
# needlessly (inverse pairs are derived).
_DIRECT = {
    ("4-4-2", "5-3-2"): {"GK": "GK", "LB": "LWB", "LCB": "LCB", "RCB": "RCB", "RB": "RWB",
                         "LM": "LCM", "LCM": "CDM", "RCM": "CB", "RM": "RCM", "LST": "LST", "RST": "RST"},
    ("4-2-3-1", "4-4-2"): {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
                           "LDM": "LCM", "RDM": "RCM", "LAM": "LM", "CAM": "RST", "RAM": "RM", "ST": "LST"},
}
E3_DIRECT_REMAPS = dict(_DIRECT)
E3_DIRECT_REMAPS.update({(b, a): {v: k for k, v in m.items()} for (a, b), m in _DIRECT.items()})


def _to_433(current: str) -> dict[str, str]:
    if current == "4-3-3":
        return {slot: slot for slot in FORMATION_433}
    if current in FORMATION_REMAP_FROM_433:
        return {new: old for old, new in FORMATION_REMAP_FROM_433[current].items()}
    return dict(E3_TO_433[current])


def _from_433(target: str) -> dict[str, str]:
    if target in FORMATION_REMAP_FROM_433:
        return dict(FORMATION_REMAP_FROM_433[target])
    return {old: new for new, old in E3_TO_433[target].items()}


def slot_map_between(current: str, target: str, extended: bool = False) -> dict[str, str]:
    """Return deterministic slot remap for supported in-match formation changes.

    Legacy transitions (4-3-3 <-> 4-2-3-1 / 4-1-4-1) keep their original
    tables and 4-2-3-1 <-> 4-1-4-1 still raises for the built-in coach AI
    (flags-off identity). Any transition involving an E3 shape, and — with
    ``extended`` (manager path) — 4-2-3-1 <-> 4-1-4-1, composes through 4-3-3.
    """
    if current not in FORMATIONS or target not in FORMATIONS:
        raise ValueError(f"Unsupported formation transition {current} -> {target}")
    if current == target:
        return {slot: slot for slot in FORMATIONS[current]}
    if current == "4-3-3" and target == "4-2-3-1":
        return dict(FORMATION_REMAP_FROM_433[target])
    if current in {"4-2-3-1", "4-1-4-1"} and target == "4-3-3":
        forward = FORMATION_REMAP_FROM_433[current]
        return {new: old for old, new in forward.items()}
    if current == "4-3-3" and target == "4-1-4-1":
        return dict(FORMATION_REMAP_FROM_433[target])
    if current in LEGACY_FORMATIONS and target in LEGACY_FORMATIONS and not extended:
        raise ValueError(f"Unsupported formation transition {current} -> {target}")
    if (current, target) in E3_DIRECT_REMAPS:
        return dict(E3_DIRECT_REMAPS[(current, target)])
    a, b = _to_433(current), _from_433(target)
    return {slot: b[a[slot]] for slot in FORMATIONS[current]}
