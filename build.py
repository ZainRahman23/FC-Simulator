"""Touchline Core Loop v2 — the build layer (spec docs/CORE_LOOP_V2_SPEC.md §4–§7, §12).

ALL build maths lives here: systems and fit, traits and unit bonuses, training
gains, partnership / system familiarity, kick-off modifiers, the Tactic Card
catalogue, card compilation and application, influence (⚡), triggers and the
CPU card policy. Pure and deterministic: no hidden RNG (any randomness is a
keyed hash of the match seed), so the balance harness and the server run
exactly the same code.

Engine boundary: everything reaches the engine through the existing
management appliers (tactics / instructions / formation / substitution) or
the engine agent's hooks (modifiers E2, set_pieces E1/E4, formations E3) when
present. Card plays are ONE command-log entry ``{kind:'card'}``; importing this
module registers the ``card`` applier in ``management.APPLIERS``. Timed
reverts and CPU card plays run from a picklable per-engine runtime installed
as the instance's ``advance_one_second`` (like management._BenchCondition), so
``run()``, ``advance()``, checkpoints, rewinds, branches and Decision Lab
futures all replay them identically. Matches without a build never get the
runtime: flags-off results are byte-identical to before.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT / "simulator") not in sys.path:
    sys.path.insert(0, str(ROOT / "simulator"))

import bridge  # noqa: E402
import management  # noqa: E402
from bridge import BridgeError  # noqa: E402
from fc_simulator.engine import MatchEngine  # noqa: E402

# ═════════════════════════════════════════════════════════════════════════════
# TUNABLE CONSTANTS (balance agent proposes changes via docs/v2_progress/balance.md)
# ═════════════════════════════════════════════════════════════════════════════
CONST: dict[str, Any] = {
    # fit
    "fit_floor": 40.0, "fit_span": 55.0,          # fit = (weighted attr - floor) * 100 / span
    "fit_fatigue_k": 0.30,                        # fit *= 1 - k * ((100-cond)/100)^2
    "side_bonus_inside": 5.0, "side_malus_inside": 3.0, "side_bonus_wide": 3.0,
    "bonus_points": 2.0, "bonus_points_key": 4.0,  # system-fit points per active unit bonus
    "versatility_fit": 70,
    # unit bonuses
    "engine_room_stam": 80, "engine_room_need": 3,
    "aerial_hea": 78, "aerial_ht": 188, "aerial_targets": 2, "aerial_cro": 80,
    "pace_spr": 88, "pace_need": 2,
    "wall_daw": 80, "wall_level": 2,
    # training (§5)
    "tp_camp": 10, "tp_week": 6, "tp_midweek": 3, "tp_carry_cap": 10,
    "gain_base": 0.6, "age_factor": [[21, 1.5], [27, 1.0], [31, 0.6], [99, 0.3]],
    "headroom_min": 0.2, "headroom_max": 1.5, "dr_per_drill": 0.88,
    "season_cap": 4.0, "drill_load": 3, "load_threshold": 12, "load_energy_pct": 5,
    "rest_recovery": 8, "card_upgrade_tp": 2,
    # partnerships
    "fam_levels": [30, 60, 90], "fam_per_tp": 10, "fam_per_match": 2, "fam_decay": 3,
    "max_partnerships": 4,
    # system familiarity
    "sys_week": 8, "sys_per_tp": 3, "sys_per_match": 3, "sys_switch": 40, "sys_switch_custom": 20,
    "sys_boost_max": 4.0, "sys_boost_from": 40, "sys_default": 40,
    # cards / influence
    "hand_size": 5, "deck_min": 10, "deck_max": 18,
    "influence_start": 3, "influence_ht": 1, "influence_conceded": 1, "influence_max": 5,
    "trigger_conceded_window": 600,
    # CPU policy (§6.6.5)
    "ai_checkpoints": [900, 1800, 2700, 3600, 4500], "ai_late_every": 300,
    "ai_chase_from": 3600, "ai_protect_from": 4500, "ai_low_energy": 68, "ai_idle_prob": 0.30,
    "ai_best_prob": {"easy": 0.50, "normal": 0.75, "hard": 0.95},
    # analyst
    "analyst_runs": 2, "analyst_futures": 16,
}
CATALOG_VERSION = "v2.1"

_DATA = ROOT / "data"
LONG = dict(bridge.ATTR_MAP)                     # short -> engine long name
SHORT = {v: k for k, v in LONG.items()}          # engine long -> short

ATTR_LABEL = {
    "acc": "Acceleration", "spr": "Sprint Speed", "agi": "Agility", "rea": "Reactions",
    "bco": "Ball Control", "bln": "Balance", "dri": "Dribbling", "fka": "Free-Kick Accuracy",
    "pen": "Penalties", "cmp": "Composure", "cur": "Curve", "sps": "Short Passing",
    "lps": "Long Passing", "vis": "Vision", "cro": "Crossing", "fin": "Finishing",
    "apo": "Positioning", "shp": "Shot Power", "lsh": "Long Shots", "vol": "Volleys",
    "hea": "Heading Accuracy", "daw": "Defensive Awareness", "sta": "Standing Tackle",
    "sli": "Sliding Tackle", "int": "Interceptions", "str": "Strength", "stam": "Stamina",
    "agg": "Aggression", "jum": "Jumping", "gkd": "GK Diving", "gkh": "GK Handling",
    "gkk": "GK Kicking", "gkp": "GK Positioning", "gkr": "GK Reflexes", "ht": "Height",
}

# ── tactics / roles vocabulary (frontend <-> engine) ────────────────────────
TKEYS = list(bridge.TACTIC_KEY_MAP)                                  # 13 frontend keys
_T_ENG2FRONT_KEY = {v: k for k, v in bridge.TACTIC_KEY_MAP.items()}
_T_ENG2FRONT_VAL = {v: k for k, v in bridge.TACTIC_VALUE_MAP.items()}
_AR_ENG2FRONT = {v: k for k, v in bridge.ATTACK_ROLE_MAP.items()}
_DR_ENG2FRONT = {v: k for k, v in bridge.DEFENSE_ROLE_MAP.items()}
TACTIC_LABEL = {
    "buildUpTempo": "Build-up tempo", "passingDirectness": "Passing directness",
    "progressionRisk": "Progression risk", "attackingWidth": "Attacking width",
    "chanceCreationFocus": "Chance creation", "boxCommitment": "Box commitment",
    "afterWinningPossession": "After winning possession", "afterLosingPossession": "After losing possession",
    "defensiveBlockHeight": "Block height", "pressingIntensity": "Pressing intensity",
    "defensiveWidth": "Defensive width", "markingOrientation": "Marking",
    "defensiveLineBehavior": "Line behaviour",
}
DEFAULT_TACTICS = {k: v for k, v in {
    "buildUpTempo": "Balanced", "passingDirectness": "Mixed", "progressionRisk": "Balanced",
    "attackingWidth": "Balanced", "chanceCreationFocus": "Balanced", "boxCommitment": "Balanced",
    "afterWinningPossession": "Balanced", "afterLosingPossession": "Balanced",
    "defensiveBlockHeight": "Mid", "pressingIntensity": "Selective", "defensiveWidth": "Balanced",
    "markingOrientation": "Zonal", "defensiveLineBehavior": "Hold"}.items()}

# ── slot groups (engine slot names; frontend ids of 4-3-3/4-2-3-1 are mapped first) ──
GROUPS = {
    "GK": {"GK"}, "FB": {"LB", "RB", "LWB", "RWB"}, "CB": {"LCB", "RCB", "CB"},
    "DM": {"CDM", "LDM", "RDM"}, "CM": {"LCM", "RCM"}, "AM": {"CAM"},
    "W": {"LW", "RW", "LM", "RM", "LAM", "RAM"}, "ST": {"ST", "LST", "RST"},
}
GROUPS["FRONT"] = GROUPS["W"] | GROUPS["ST"] | GROUPS["AM"]
GROUPS["MID"] = GROUPS["DM"] | GROUPS["CM"] | GROUPS["AM"] | {"LM", "RM"}
GROUPS["DEF"] = GROUPS["FB"] | GROUPS["CB"]
GROUP_LABEL = {"GK": "Goalkeeper", "FB": "Full-backs", "CB": "Centre-backs", "DM": "Holding midfielders",
               "CM": "Central midfielders", "AM": "Attacking midfielder", "W": "Wide players",
               "ST": "Striker", "FRONT": "Front line", "MID": "Midfielders", "DEF": "Back line",
               "OUT": "All outfielders", "team": "All outfielders"}
LEFT = {"LB", "LWB", "LCB", "LCM", "LDM", "LM", "LW", "LAM", "LST"}
RIGHT = {"RB", "RWB", "RCB", "RCM", "RDM", "RM", "RW", "RAM", "RST"}
PRESS_ROLE = {"FB": "Press Wide", "CB": "Step Out", "DM": "Ball Hunt", "CM": "Ball Hunt", "AM": "Press",
              "W": "Press Fullback", "ST": "Press CBs", "GK": "Aggressive Sweeper"}


def slot_group(slot: str) -> str:
    for g in ("GK", "FB", "CB", "DM", "CM", "AM", "W", "ST"):
        if slot in GROUPS[g]:
            return g
    return "CM"


def engine_slot(formation: str, fslot: str) -> str:
    return (bridge.SLOT_MAP.get(str(formation)) or {}).get(fslot, fslot)


# ═════════════════════════════════════════════════════════════════════════════
# DEMAND VECTORS — weights over the attributes the engine reads for each role
# (derived from simulator/fc_simulator/engine.py: pass skill = passing attr +
# vision/reactions; receive = ball_control/reactions/agility; carries and
# dribbles = dribbling/acceleration/agility/balance; shots = finishing /
# long_shots / heading (+height, jumping); duels = strength/aggression;
# defending = interceptions / defensive_awareness / reactions / standing
# tackle; off-ball reads = attacking_position / defensive_awareness;
# high effort burns stamina). "ht" = height (cm) as a 0-99 score.
# ═════════════════════════════════════════════════════════════════════════════
ATTACK_DEMAND: dict[str, dict[str, float]] = {
    "HOLD_RECYCLE": {"sps": .35, "bco": .25, "cmp": .2, "rea": .2},
    "DISTRIBUTOR": {"lps": .3, "sps": .25, "vis": .2, "cmp": .15, "bco": .1},
    "CARRY_FORWARD": {"dri": .25, "bco": .25, "acc": .2, "sps": .15, "str": .15},
    "SUPPORT": {"sps": .3, "bco": .2, "stam": .2, "rea": .15, "cro": .15},
    "WIDE_ADVANCE": {"cro": .3, "stam": .25, "spr": .2, "acc": .15, "sps": .1},
    "OVERLAP": {"cro": .3, "stam": .25, "spr": .2, "acc": .15, "dri": .1},
    "UNDERLAP": {"sps": .25, "dri": .2, "stam": .2, "acc": .15, "vis": .1, "bco": .1},
    "INVERT": {"sps": .3, "bco": .25, "vis": .15, "cmp": .15, "rea": .15},
    "ANCHOR": {"sps": .3, "bco": .2, "cmp": .2, "rea": .15, "lps": .15},
    "DEEP_PLAYMAKER": {"lps": .25, "vis": .25, "sps": .2, "cmp": .15, "bco": .15},
    "DROP_BETWEEN_CBS": {"sps": .3, "lps": .2, "cmp": .2, "bco": .15, "rea": .15},
    "ADVANCE_SUPPORT": {"sps": .25, "stam": .2, "apo": .15, "bco": .15, "vis": .15, "lsh": .1},
    "CONTROLLER": {"sps": .3, "bco": .2, "vis": .2, "cmp": .15, "rea": .15},
    "CREATOR": {"vis": .3, "sps": .2, "bco": .15, "dri": .15, "cur": .1, "rea": .1},
    "RUNNER": {"stam": .25, "apo": .2, "acc": .15, "fin": .15, "sps": .15, "spr": .1},
    "ROAMER": {"vis": .2, "dri": .2, "bco": .2, "stam": .15, "apo": .15, "fin": .1},
    "CONNECTOR": {"sps": .3, "bco": .25, "vis": .15, "rea": .15, "agi": .15},
    "SECOND_STRIKER": {"apo": .25, "fin": .25, "bco": .15, "rea": .15, "acc": .1, "lsh": .1},
    "FREE_ROAM": {"vis": .2, "dri": .2, "bco": .2, "apo": .15, "fin": .15, "agi": .1},
    "WIDE_SUPPORT": {"sps": .25, "cro": .2, "stam": .2, "bco": .15, "dri": .1, "rea": .1},
    "WINGER": {"cro": .3, "dri": .25, "acc": .15, "spr": .15, "bco": .15},
    "WIDE_RUNNER": {"spr": .3, "acc": .25, "apo": .2, "fin": .15, "dri": .1},
    "TOUCHLINE_WINGER": {"cro": .3, "dri": .25, "spr": .2, "acc": .15, "bco": .1},
    "INSIDE_FORWARD": {"dri": .25, "fin": .2, "lsh": .15, "acc": .15, "bco": .15, "cmp": .1},
    "WIDE_CREATOR": {"vis": .25, "cro": .2, "dri": .2, "sps": .15, "bco": .1, "cur": .1},
    "FREE_FORWARD": {"fin": .2, "dri": .2, "apo": .2, "bco": .15, "acc": .15, "vis": .1},
    "POACHER": {"fin": .3, "apo": .3, "rea": .2, "cmp": .1, "acc": .1},
    "RUN_BEHIND": {"spr": .25, "apo": .25, "acc": .2, "fin": .2, "rea": .1},
    "TARGET": {"hea": .25, "ht": .2, "str": .2, "jum": .15, "bco": .1, "fin": .1},
    "LINK": {"sps": .25, "bco": .25, "vis": .2, "str": .15, "fin": .15},
    # keeper distribution roles
    "MIXED_DISTRIBUTOR": {"gkk": .5, "sps": .5},
    "SHORT_BUILD_UP": {"sps": .5, "bco": .3, "cmp": .2},
    "DIRECT_DISTRIBUTOR": {"gkk": .6, "lps": .4},
    "SUPPORT_KEEPER": {"sps": .4, "bco": .3, "acc": .3},
}
DEFENSE_DEMAND: dict[str, dict[str, float]] = {
    "HOLD_LINE": {"daw": .35, "hea": .2, "str": .2, "int": .15, "rea": .1},
    "STEP_OUT": {"sta": .3, "daw": .2, "acc": .2, "agg": .15, "int": .15},
    "COVER": {"daw": .3, "spr": .25, "acc": .2, "int": .15, "rea": .1},
    "TIGHT_MARK": {"sta": .3, "str": .25, "daw": .2, "agg": .15, "hea": .1},
    "HOLD_WIDE": {"daw": .3, "sta": .25, "spr": .2, "int": .15, "rea": .1},
    "PRESS_WIDE": {"agg": .25, "stam": .25, "acc": .2, "sta": .2, "rea": .1},
    "TUCK_IN": {"daw": .35, "int": .25, "sta": .2, "hea": .1, "str": .1},
    "TRACK_RUNNER": {"spr": .3, "stam": .25, "daw": .2, "sta": .15, "acc": .1},
    "SCREEN": {"int": .35, "daw": .3, "sta": .2, "rea": .15},
    "BALL_HUNT": {"sta": .25, "int": .25, "agg": .2, "stam": .2, "acc": .1},
    "TRACK_RUNNERS": {"stam": .3, "spr": .2, "daw": .2, "sta": .2, "acc": .1},
    "BACKLINE_COVER": {"daw": .35, "int": .25, "hea": .2, "str": .2},
    "HOLD_ZONE": {"daw": .3, "int": .3, "stam": .2, "rea": .2},
    "PRESS": {"agg": .3, "stam": .3, "acc": .2, "rea": .2},
    "TRACK": {"stam": .35, "spr": .25, "daw": .2, "sta": .2},
    "STAY_HIGH": {"rea": .4, "acc": .3, "spr": .3},
    "SCREEN_PIVOT": {"int": .4, "daw": .35, "str": .15, "rea": .1},
    "TRACK_MIDFIELD": {"stam": .3, "int": .3, "daw": .2, "rea": .2},
    "TRACK_FULLBACK": {"stam": .35, "spr": .25, "sta": .2, "daw": .2},
    "PRESS_FULLBACK": {"agg": .3, "stam": .3, "acc": .2, "spr": .2},
    "TUCK_INTO_BLOCK": {"daw": .3, "int": .3, "stam": .2, "str": .2},
    "PRESS_CBS": {"agg": .3, "stam": .25, "acc": .2, "spr": .15, "rea": .1},
    "DROP_INTO_BLOCK": {"stam": .35, "daw": .25, "int": .2, "str": .2},
    # keepers
    "LINE_KEEPER": {"gkr": .4, "gkp": .35, "rea": .25},
    "SWEEPER": {"acc": .4, "gkp": .3, "rea": .3},
    "AGGRESSIVE_SWEEPER": {"acc": .4, "spr": .3, "rea": .3},
    "AREA_COMMANDER": {"gkh": .5, "jum": .25, "ht": .25},
}
GK_CORE = {"gkr": .25, "gkd": .2, "gkp": .2, "gkh": .2, "gkk": .05, "rea": .1}


def _norm(d: dict[str, float]) -> dict[str, float]:
    s = sum(d.values()) or 1.0
    return {k: round(v / s, 4) for k, v in sorted(d.items(), key=lambda kv: -kv[1])}


def slot_demand(slot: str, instr: dict[str, Any]) -> dict[str, float]:
    """Demand vector for an engine slot played with frontend instructions."""
    ar = bridge.ATTACK_ROLE_MAP.get(instr.get("attackRole"), "SUPPORT")
    dr = bridge.DEFENSE_ROLE_MAP.get(instr.get("defenseRole"), "HOLD_ZONE")
    ae = float(instr.get("attackEffort", 50))
    de = float(instr.get("defenseEffort", 50))
    out: dict[str, float] = {}
    if slot == "GK":
        for k, w in GK_CORE.items():
            out[k] = out.get(k, 0) + .8 * w
        for k, w in ATTACK_DEMAND.get(ar, {}).items():
            out[k] = out.get(k, 0) + .1 * w
        for k, w in DEFENSE_DEMAND.get(dr, {}).items():
            out[k] = out.get(k, 0) + .1 * w
        return _norm(out)
    wa = max(.25, min(.75, ae / max(1.0, ae + de)))
    for k, w in ATTACK_DEMAND.get(ar, {}).items():
        out[k] = out.get(k, 0) + wa * w
    for k, w in DEFENSE_DEMAND.get(dr, {}).items():
        out[k] = out.get(k, 0) + (1 - wa) * w
    extra = .1 * max(0.0, (ae + de) / 2 - 60) / 40          # high effort burns stamina
    if extra > 0:
        out["stam"] = out.get("stam", 0) + extra
    return _norm(out)


# ═════════════════════════════════════════════════════════════════════════════
# CATALOGUE
# ═════════════════════════════════════════════════════════════════════════════
PATTERNS: dict[str, dict[str, Any]] = {
    "cross_head": {"name": "Cross & Head", "roles": ["crosser", "target"],
                   "boosts": {"crosser": {"cro": [2, 4, 6]}, "target": {"hea": [2, 4, 6], "apo": [1, 2, 3]}},
                   "eligible": {"crosser": "outfield", "target": "outfield"}, "card": "cross_head_barrage"},
    "overlap": {"name": "Overlap", "roles": ["fb", "winger"],
                "boosts": {"fb": {"cro": [1, 2, 3], "stam": [1, 2, 3]}, "winger": {"vis": [1, 2, 3]}},
                "eligible": {"fb": "FB", "winger": "W"}, "card": "overlap_drive"},
    "one_two": {"name": "One-Two", "roles": ["mid", "striker"],
                "boosts": {"mid": {"sps": [2, 3, 5], "rea": [1, 2, 3]}, "striker": {"sps": [2, 3, 5], "rea": [1, 2, 3]}},
                "eligible": {"mid": "MIDP", "striker": "outfield"}, "card": "one_two_rush"},
    "through_ball": {"name": "Through Ball", "roles": ["creator", "runner"],
                     "boosts": {"creator": {"vis": [2, 4, 6]}, "runner": {"apo": [2, 3, 5]}},
                     "eligible": {"creator": "outfield", "runner": "outfield"}, "card": "through_ball_threat"},
    "cb_pair": {"name": "CB Partnership", "roles": ["cb1", "cb2"],
                "boosts": {"cb1": {"daw": [2, 3, 5], "int": [1, 2, 3]}, "cb2": {"daw": [2, 3, 5], "int": [1, 2, 3]}},
                "eligible": {"cb1": "CB", "cb2": "CB"}, "card": "wall"},
    "pressing_trio": {"name": "Pressing Trio", "roles": ["p1", "p2", "p3"],
                      "boosts": {r: {"agg": [1, 2, 3], "rea": [1, 2, 3], "stam": [1, 2, 3]} for r in ("p1", "p2", "p3")},
                      "eligible": {"p1": "outfield", "p2": "outfield", "p3": "outfield"}, "card": "press_trigger"},
    "keeper_line": {"name": "Keeper–Back line", "roles": ["gk", "cb1", "cb2"],
                    "boosts": {"gk": {"gkp": [1, 2, 3]}, "cb1": {"cmp": [1, 2, 3]}, "cb2": {"cmp": [1, 2, 3]}},
                    "eligible": {"gk": "GK", "cb1": "CB", "cb2": "CB"}, "card": None},
}
_POS_ELIGIBLE = {"GK": {"GK"}, "CB": {"CB"}, "FB": {"LB", "RB", "LWB", "RWB"},
                 "W": {"LW", "RW", "LM", "RM"}, "MIDP": {"CM", "CAM", "CDM", "LM", "RM"}}

PLAYER_TRAITS = [
    {"id": "presser", "name": "Presser", "rule": {"agg": 75, "stam": 78, "acc": 75}},
    {"id": "aerial", "name": "Aerial", "rule": {"hea": 78, "ht": 188}},
    {"id": "creator", "name": "Creator", "rule": {"vis": 80, "sps": 80}},
    {"id": "engine", "name": "Engine", "rule": {"stam": 85}},
    {"id": "poacher", "name": "Poacher", "rule": {"fin": 82, "apo": 80}},
    {"id": "ball_carrier", "name": "Ball-carrier", "rule": {"dri": 82, "acc": 80}},
    {"id": "set_piece", "name": "Set-piece specialist", "rule_any": {"fka": 80, "cro": 85}},
    {"id": "crosser", "name": "Crosser", "rule": {"cro": 80}},
    {"id": "speedster", "name": "Speedster", "rule": {"spr": 88}},
    {"id": "stopper", "name": "Stopper", "rule": {"daw": 80, "sta": 78}},
]
UNIT_BONUSES = [
    {"id": "engine_room", "name": "Engine Room"},
    {"id": "aerial_threat", "name": "Aerial Threat"},
    {"id": "pace_in_behind", "name": "Pace in Behind"},
    {"id": "wall", "name": "Wall"},
]
STAFF = [
    {"id": "coach", "name": "Coaches", "cost": [0, 4, 9],
     "effects": {"1": "6 TP a week", "2": "+1 TP a week; 5 partnership slots", "3": "+2 TP a week; 6 partnership slots"}},
    {"id": "fitness", "name": "Fitness", "cost": [0, 3, 7],
     "effects": {"1": "Load threshold 12", "2": "Load threshold 15, +3 extra rest recovery; unlocks SECOND WIND",
                 "3": "Load threshold 18, +6 extra rest recovery"}},
    {"id": "analyst", "name": "Analysts", "cost": [0, 3, 6],
     "effects": {"1": "2 Analyst runs a week", "2": "3 runs a week; unlocks READ THE GAME", "3": "4 runs a week"}},
    {"id": "scout", "name": "Scouts", "cost": [0, 2, 5],
     "effects": {"1": "Attributes shown as ±6 ranges", "2": "±3 ranges", "3": "Exact attributes"}},
    {"id": "academy", "name": "Academy", "cost": [0, 3, 8],
     "effects": {"1": "Standard youth intake", "2": "Better youth intake", "3": "Best youth intake"}},
]


def _load_json(name: str) -> dict[str, Any]:
    return json.loads((_DATA / name).read_text(encoding="utf-8"))


SYSTEMS: dict[str, dict[str, Any]] = {s["id"]: s for s in _load_json("systems.json")["systems"]}
CARDS: dict[str, dict[str, Any]] = {c["id"]: c for c in _load_json("cards.json")["cards"]}
CARDS_VERSION = _load_json("cards.json").get("version", CATALOG_VERSION)
UNIVERSAL = [cid for cid, c in CARDS.items() if c["source"]["kind"] == "universal" and c["type"] != "REACTION"]
REACTIONS = [cid for cid, c in CARDS.items() if c["type"] == "REACTION"]


def engine_hooks() -> dict[str, bool]:
    ap = management.APPLIERS
    return {"E1": "set_pieces" in ap, "E2": "modifiers" in ap,
            "E3": "532" in bridge.FORMATION_NAME_MAP, "E4": "set_pieces" in ap}


def card_available(cid: str) -> bool:
    hooks = engine_hooks()
    return all(hooks.get(r, False) for r in CARDS[cid].get("requires", []))


def reload_catalog() -> None:
    global CARDS_VERSION
    SYSTEMS.clear(); SYSTEMS.update({s["id"]: s for s in _load_json("systems.json")["systems"]})
    CARDS.clear(); CARDS.update({c["id"]: c for c in _load_json("cards.json")["cards"]})
    CARDS_VERSION = _load_json("cards.json").get("version", CATALOG_VERSION)
    _EFFECTS_CACHE.clear()


# ═════════════════════════════════════════════════════════════════════════════
# PLAYERS AND FIT
# ═════════════════════════════════════════════════════════════════════════════
def _ht_score(ht: Any) -> float:
    cm = float(ht) if ht is not None else 183.0
    return max(1.0, min(99.0, 50.0 + (cm - 183.0) * 3.0))


def pval(p: dict[str, Any], k: str) -> float:
    if k == "ht":
        return _ht_score(p.get("ht"))
    return float((p.get("a") or {}).get(k, 50.0))


def _side_adjust(p: dict[str, Any], slot: str, instr: dict[str, Any]) -> float:
    ar = bridge.ATTACK_ROLE_MAP.get(instr.get("attackRole"), "")
    foot = str(p.get("foot", "R")).upper()[:1]
    if slot in LEFT:
        flank = "L"
    elif slot in RIGHT:
        flank = "R"
    else:
        return 0.0
    if ar == "INSIDE_FORWARD":
        return CONST["side_bonus_inside"] if foot != flank else -CONST["side_malus_inside"]
    if ar in ("WINGER", "TOUCHLINE_WINGER", "OVERLAP", "WIDE_ADVANCE", "WIDE_CREATOR"):
        return CONST["side_bonus_wide"] if foot == flank else 0.0
    return 0.0


def slot_fit(p: dict[str, Any], slot: str, instr: dict[str, Any], cond: float | None = None,
             demand: dict[str, float] | None = None) -> int:
    """0-100: the player's attributes projected onto the slot's demand vector,
    adjusted for side/foot and fatigue. ``slot`` is an ENGINE slot name."""
    d = demand or slot_demand(slot, instr)
    raw = sum(w * pval(p, k) for k, w in d.items())
    if slot != "GK" and p.get("pos") == "GK":
        raw = min(raw, 35.0)
    fit = (raw - CONST["fit_floor"]) * 100.0 / CONST["fit_span"] + _side_adjust(p, slot, instr)
    c = p.get("cond") if cond is None else cond
    if c is not None:
        deficit = max(0.0, min(1.0, (100.0 - float(c)) / 100.0))
        fit *= 1.0 - CONST["fit_fatigue_k"] * deficit * deficit
    return int(max(0, min(100, round(fit))))


def system_slots(system: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """{frontend_slot: {engine_slot, instr}} for a system bundle."""
    fid = system["formation"]
    out = {}
    for fs, ins in system["slots"].items():
        out[fs] = {"engine_slot": engine_slot(fid, fs), "instr": {k: ins[k] for k in
                   ("attackRole", "attackEffort", "defenseRole", "defenseEffort")}}
    return out


def get_system(system_id: str | None, build: dict[str, Any] | None = None) -> dict[str, Any]:
    b = build or {}
    if system_id == "custom" or (b.get("custom_system") and system_id in (None, "custom", b["custom_system"].get("id"))):
        cs = b.get("custom_system")
        if not cs:
            raise BridgeError("custom system requested but build.custom_system is missing")
        base = SYSTEMS.get(cs.get("base")) or {}
        sysd = {"id": cs.get("id", "custom"), "name": cs.get("name", "Custom"), "custom": True,
                "formation": cs.get("formation", base.get("formation", "433")),
                "tactics": dict(DEFAULT_TACTICS, **(cs.get("tactics") or base.get("tactics") or {})),
                "slots": cs.get("slots") or base.get("slots") or {}, "signature_cards": [],
                "key_bonuses": [], "pillars": base.get("pillars", []), "identity": "Your own system."}
        return sysd
    if system_id not in SYSTEMS:
        raise BridgeError(f"Unknown system '{system_id}'")
    return SYSTEMS[system_id]


def system_demands(system: dict[str, Any]) -> dict[str, dict[str, float]]:
    return {fs: slot_demand(v["engine_slot"], v["instr"]) for fs, v in system_slots(system).items()}


def player_traits(p: dict[str, Any]) -> list[str]:
    out = []
    for t in PLAYER_TRAITS:
        if "rule" in t and all(pval(p, k) >= v for k, v in t["rule"].items()):
            out.append(t["id"])
        elif "rule_any" in t and any(pval(p, k) >= v for k, v in t["rule_any"].items()):
            out.append(t["id"])
    return out


def _level(fam: float) -> int:
    lv = 0
    for i, th in enumerate(CONST["fam_levels"]):
        if fam >= th:
            lv = i + 1
    return lv


def unit_bonuses(xi_players: dict[str, dict[str, Any]], build: dict[str, Any] | None,
                 formation: str) -> list[dict[str, Any]]:
    """TFT-style trait counters over the XI. ``xi_players``: {frontend slot: player}."""
    by_eslot = {engine_slot(formation, fs): p for fs, p in xi_players.items() if p}
    mids = [p for s, p in by_eslot.items() if s in GROUPS["MID"]]
    fwds = [p for s, p in by_eslot.items() if s in GROUPS["FRONT"]]
    cbs = [p for s, p in by_eslot.items() if s in GROUPS["CB"]]
    allp = list(by_eslot.values())
    out = []
    er = [p for p in mids if pval(p, "stam") >= CONST["engine_room_stam"]]
    out.append({"id": "engine_room", "name": "Engine Room", "count": min(len(er), CONST["engine_room_need"]),
                "need": CONST["engine_room_need"], "members": [p["id"] for p in er],
                "rule": f"{CONST['engine_room_need']} midfielders with stamina {CONST['engine_room_stam']}+"})
    tg = [p for p in allp if p.get("pos") != "GK" and pval(p, "hea") >= CONST["aerial_hea"]
          and float(p.get("ht") or 0) >= CONST["aerial_ht"]]
    tg_ids = {p["id"] for p in tg[:CONST["aerial_targets"]]}
    cr = [p for p in allp if pval(p, "cro") >= CONST["aerial_cro"] and p["id"] not in tg_ids]
    n_a = min(len(tg), CONST["aerial_targets"]) + min(len(cr), 1)
    out.append({"id": "aerial_threat", "name": "Aerial Threat", "count": n_a, "need": CONST["aerial_targets"] + 1,
                "members": [p["id"] for p in tg[:CONST["aerial_targets"]]] + [p["id"] for p in cr[:1]],
                "rule": f"{CONST['aerial_targets']} targets with heading {CONST['aerial_hea']}+ and height "
                        f"{CONST['aerial_ht']} cm+, plus a crosser with crossing {CONST['aerial_cro']}+"})
    pc = [p for p in fwds if pval(p, "spr") >= CONST["pace_spr"]]
    out.append({"id": "pace_in_behind", "name": "Pace in Behind", "count": min(len(pc), CONST["pace_need"]),
                "need": CONST["pace_need"], "members": [p["id"] for p in pc],
                "rule": f"{CONST['pace_need']} forwards with sprint speed {CONST['pace_spr']}+"})
    good_cb = [p for p in cbs if pval(p, "daw") >= CONST["wall_daw"]]
    ids = {p["id"] for p in good_cb}
    paired = False
    for pt in (build or {}).get("partnerships") or []:
        if pt.get("pattern") == "cb_pair" and set(pt.get("members") or []) <= ids and len(ids) >= 2 \
                and _level(float(pt.get("fam", 0))) >= CONST["wall_level"]:
            paired = True
    n_w = min(len(good_cb), 2) if paired else min(len(good_cb), 1)
    out.append({"id": "wall", "name": "Wall", "count": n_w, "need": 2, "members": [p["id"] for p in good_cb],
                "rule": f"a CB pair with defensive awareness {CONST['wall_daw']}+ and a CB Partnership at level "
                        f"{CONST['wall_level']}+"})
    for b in out:
        b["active"] = b["count"] >= b["need"]
    return out


def _squad_index(squad: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(p["id"]): p for p in squad or [] if p and p.get("id") is not None}


def partnership_view(pt: dict[str, Any], xi_ids: set[str]) -> dict[str, Any]:
    pat = PATTERNS.get(pt.get("pattern"), {})
    fam = float(pt.get("fam", 0))
    lv = _level(fam)
    members = [str(m) for m in pt.get("members") or []]
    boosts: dict[str, dict[str, float]] = {}
    if lv > 0 and pat:
        for role, pid in zip(pat["roles"], members):
            for attr, per in pat["boosts"].get(role, {}).items():
                boosts.setdefault(pid, {})[attr] = boosts.get(pid, {}).get(attr, 0) + per[lv - 1]
    nxt = next((th for th in CONST["fam_levels"] if fam < th), None)
    return {"id": pt.get("id") or partnership_id(pt.get("pattern"), members), "pattern": pt.get("pattern"),
            "name": pat.get("name", pt.get("pattern")), "members": members, "fam": round(fam, 1), "level": lv,
            "next_level_at": nxt, "active": bool(members) and set(members) <= xi_ids, "boosts": boosts,
            "card": pat.get("card"), "card_unlocked": lv >= 2 and bool(pat.get("card"))}


def partnership_id(pattern: str | None, members: list[str]) -> str:
    return f"{pattern}:" + "+".join(str(m) for m in members)


def familiarity_boost(fam: float) -> float:
    f = (float(fam) - CONST["sys_boost_from"]) / (100.0 - CONST["sys_boost_from"])
    return round(max(0.0, min(1.0, f)) * CONST["sys_boost_max"], 1)


def system_familiarity(build: dict[str, Any] | None, system_id: str | None) -> float:
    fams = (build or {}).get("familiarity") or {}
    if isinstance(fams, (int, float)):
        return float(fams)
    if system_id in fams:
        return float(fams[system_id])
    return float(CONST["sys_default"])


def kickoff_modifiers(side: dict[str, Any], build: dict[str, Any] | None,
                      system_id: str | None = None) -> dict[str, dict[str, float]]:
    """Attribute deltas {pid: {short_attr: +x}} added at kick-off: partnership
    boosts (only if ALL members start) + system familiarity (reactions,
    positioning, composure). Inputs only — the engine never sees the build."""
    build = build or {}
    sid = system_id or build.get("system_id")
    lineup = {fs: p for fs, p in (side.get("lineup") or {}).items() if p}
    xi_ids = {str(p["id"]) for p in lineup.values()}
    mods: dict[str, dict[str, float]] = {}

    def add(pid: str, attr: str, x: float) -> None:
        if x:
            mods.setdefault(pid, {})[attr] = round(mods.get(pid, {}).get(attr, 0.0) + x, 2)
    for pt in build.get("partnerships") or []:
        v = partnership_view(pt, xi_ids)
        if v["active"]:
            for pid, d in v["boosts"].items():
                for a, x in d.items():
                    add(pid, a, x)
    if sid:
        fb = familiarity_boost(system_familiarity(build, sid))
        if fb:
            for p in lineup.values():
                pid = str(p["id"])
                add(pid, "rea", fb)
                add(pid, "gkp" if p.get("pos") == "GK" else "apo", fb)
                add(pid, "cmp", fb)
    return mods


def load_threshold(build: dict[str, Any] | None) -> int:
    lvl = int(((build or {}).get("staff") or {}).get("fitness", 1) or 1)
    return CONST["load_threshold"] + 3 * max(0, lvl - 1)


def evaluate(squad: list[dict[str, Any]], xi: dict[str, str], system_id: str | None,
             build: dict[str, Any] | None = None, bench: list[str] | None = None) -> dict[str, Any]:
    build = build or {}
    system = get_system(system_id or build.get("system_id"), build)
    sq = _squad_index(squad)
    slots = system_slots(system)
    demands = {fs: slot_demand(v["engine_slot"], v["instr"]) for fs, v in slots.items()}
    xi = {fs: str(pid) for fs, pid in (xi or {}).items() if pid is not None}
    unknown = [pid for pid in xi.values() if pid not in sq]
    if unknown:
        raise BridgeError(f"XI players not in squad: {unknown}")
    sfit = {}
    for fs, v in slots.items():
        pid = xi.get(fs)
        sfit[fs] = slot_fit(sq[pid], v["engine_slot"], v["instr"], demand=demands[fs]) if pid else 0
    base = sum(sfit.values()) / max(1, len(sfit))
    xi_players = {fs: sq[pid] for fs, pid in xi.items() if fs in slots}
    bonuses = unit_bonuses(xi_players, build, system["formation"])
    pts = []
    for b in bonuses:
        if b["active"]:
            p = CONST["bonus_points_key"] if b["id"] in system.get("key_bonuses", []) else CONST["bonus_points"]
            pts.append({"id": b["id"], "name": b["name"], "points": p})
    bonus_total = sum(b["points"] for b in pts)
    # every squad player x every slot of this system; best systems; versatility
    matrix: dict[str, dict[str, int]] = {}
    for pid, p in sq.items():
        matrix[pid] = {fs: slot_fit(p, v["engine_slot"], v["instr"], demand=demands[fs]) for fs, v in slots.items()}
    best_systems: dict[str, list[dict[str, Any]]] = {}
    versatility: dict[str, int] = {}
    all_sys = [(sid, s, system_slots(s), system_demands(s)) for sid, s in SYSTEMS.items()]
    for pid, p in sq.items():
        cand = []
        vs = set()
        for sid, s, sl, dm in all_sys:
            best = max(((slot_fit(p, v["engine_slot"], v["instr"], demand=dm[fs]), fs) for fs, v in sl.items()),
                       default=(0, None))
            cand.append({"system_id": sid, "slot": best[1], "fit": best[0]})
            for fs, v in sl.items():
                if slot_fit(p, v["engine_slot"], v["instr"], demand=dm[fs]) >= CONST["versatility_fit"]:
                    vs.add((v["engine_slot"], v["instr"]["attackRole"], v["instr"]["defenseRole"]))
        cand.sort(key=lambda c: (-c["fit"], c["system_id"]))
        best_systems[pid] = cand[:3]
        versatility[pid] = len({s for s, _a, _d in vs})
    xi_ids = set(xi.values())
    parts = [partnership_view(pt, xi_ids) for pt in build.get("partnerships") or []]
    fam = system_familiarity(build, system["id"])
    side = {"lineup": {fs: sq[pid] for fs, pid in xi.items()}}
    return {"system_id": system["id"], "slot_fit": sfit, "base_fit": round(base, 1),
            "bonus_points": bonus_total, "system_fit": int(min(100, round(base + bonus_total))),
            "traits": [{k: b[k] for k in ("id", "name", "count", "need", "active", "members", "rule")} for b in bonuses],
            "bonuses": pts, "player_traits": {pid: player_traits(p) for pid, p in sq.items()},
            "best_systems": best_systems, "fit_matrix": matrix, "versatility": versatility,
            "partnerships": parts,
            "familiarity": {"value": fam, "boost": {"rea": familiarity_boost(fam), "apo": familiarity_boost(fam),
                                                    "cmp": familiarity_boost(fam)}},
            "demands": {fs: dict(list(d.items())[:6]) for fs, d in demands.items()},
            "kickoff_modifiers": kickoff_modifiers(side, build, system["id"])}


# ═════════════════════════════════════════════════════════════════════════════
# TRAINING (§5) — deterministic; returns a NEW build (the input is never mutated)
# ═════════════════════════════════════════════════════════════════════════════
def age_factor(age: Any) -> float:
    a = int(age or 25)
    for upto, f in CONST["age_factor"]:
        if a <= upto:
            return float(f)
    return float(CONST["age_factor"][-1][1])


def headroom(p: dict[str, Any]) -> float:
    pot = float(p.get("pot") or p.get("ovr") or 70)
    cur = float(p.get("ovr") or 70)
    return max(CONST["headroom_min"], min(CONST["headroom_max"], (pot - cur) / 10.0))


def drill_gain(p: dict[str, Any], attr: str, drills_before: int, trained_so_far: float,
               current: float | None = None) -> float:
    g = CONST["gain_base"] * age_factor(p.get("age")) * headroom(p) * (CONST["dr_per_drill"] ** max(0, drills_before))
    room = max(0.0, CONST["season_cap"] - trained_so_far)
    cur = pval(p, attr) if current is None else current
    return round(max(0.0, min(g, room, 99.0 - cur)), 3)


def tp_needed(p: dict[str, Any], attr: str, target: float, build: dict[str, Any] | None = None,
              max_tp: int = 12) -> int | None:
    """TP to raise ``attr`` to ``target`` under the training maths (None if out of reach)."""
    b = build or {}
    pid = str(p["id"])
    done = float(((b.get("trained_this_season") or {}).get(pid) or {}).get(attr, 0.0))
    n = int(((b.get("drills_this_season") or {}).get(pid) or {}).get(attr, 0))
    cur = pval(p, attr)
    for k in range(1, max_tp + 1):
        g = drill_gain(p, attr, n, done, cur)
        if g <= 0:
            return None
        cur += g; done += g; n += 1
        if cur >= target - 1e-9:
            return k
    return None


def new_build(system_id: str = "positional", **kw) -> dict[str, Any]:
    b = {"version": 1, "system_id": system_id, "familiarity": {system_id: CONST["sys_default"]},
         "tp": {"wallet": 0, "carried": 0}, "partnerships": [], "deck": starter_deck(system_id),
         "upgrades": {}, "set_pieces": {}, "load": {}, "trained_this_season": {}, "drills_this_season": {},
         "staff": {"coach": 1, "fitness": 1, "analyst": 1, "scout": 1, "academy": 1},
         "analyst_runs_left": CONST["analyst_runs"], "influence_rules_version": 1}
    b.update(kw)
    return b


def _norm_build(build: dict[str, Any] | None) -> dict[str, Any]:
    b = copy.deepcopy(build or {})
    b.setdefault("version", 1)
    b.setdefault("familiarity", {})
    tp = b.get("tp")
    if not isinstance(tp, dict):
        tp = {"wallet": int(tp or 0), "carried": 0}
    tp.setdefault("wallet", 0); tp.setdefault("carried", 0)
    b["tp"] = tp
    for k in ("partnerships",):
        b.setdefault(k, [])
    for k in ("upgrades", "set_pieces", "load", "trained_this_season", "drills_this_season", "rest"):
        if not isinstance(b.get(k), dict):
            b[k] = {}
    st = b.get("staff") if isinstance(b.get("staff"), dict) else {}
    b["staff"] = {s["id"]: int(st.get(s["id"], 1) or 1) for s in STAFF}
    if not b.get("deck"):
        b["deck"] = starter_deck(b.get("system_id"))
    return b


def max_partnerships(build: dict[str, Any]) -> int:
    lvl = int((build.get("staff") or {}).get("coach", 1) or 1)
    return CONST["max_partnerships"] + max(0, lvl - 1)


def _validate_members(pattern: str, members: list[str], sq: dict[str, dict[str, Any]]) -> str | None:
    pat = PATTERNS.get(pattern)
    if not pat:
        return f"Unknown partnership pattern '{pattern}'"
    if len(members) != len(pat["roles"]):
        return f"{pat['name']} needs {len(pat['roles'])} players ({', '.join(pat['roles'])})"
    if len(set(members)) != len(members):
        return "A partnership needs different players"
    for role, pid in zip(pat["roles"], members):
        p = sq.get(pid)
        if p is None:
            return f"Player '{pid}' is not in the squad"
        rule = pat["eligible"][role]
        pos = p.get("pos")
        if rule == "outfield":
            if pos == "GK":
                return f"{p.get('name')} is a goalkeeper and can't be the {role}"
        elif pos not in _POS_ELIGIBLE[rule]:
            return f"{p.get('name')} ({pos}) can't be the {role} of a {pat['name']}"
    return None


def train(squad: list[dict[str, Any]], build: dict[str, Any] | None, plan: list[dict[str, Any]]) -> dict[str, Any]:
    b = _norm_build(build)
    sq = copy.deepcopy(_squad_index(squad))
    wallet = int(b["tp"]["wallet"])
    spent = 0
    deltas: dict[str, dict[str, float]] = {}
    log: list[str] = []
    errors: list[str] = []
    level_ups: list[dict[str, Any]] = []
    for i, item in enumerate(plan or []):
        kind = item.get("kind")
        tp = int(item.get("tp", 1 if kind not in ("rest", "switch_system") else 0) or 0)
        if kind == "card":
            tp = CONST["card_upgrade_tp"]
        if tp < 0:
            errors.append(f"plan[{i}]: tp must be >= 0"); continue
        if spent + tp > wallet:
            errors.append(f"plan[{i}]: not enough TP ({wallet - spent} left, {tp} needed)"); continue
        if kind in ("attr", "set_piece"):
            pid, attr = str(item.get("pid")), item.get("attr")
            p = sq.get(pid)
            if p is None:
                errors.append(f"plan[{i}]: player '{pid}' not in squad"); continue
            if attr not in LONG or (kind == "set_piece" and attr not in ("cro", "fka", "pen")):
                errors.append(f"plan[{i}]: can't drill '{attr}'"); continue
            tr = b["trained_this_season"].setdefault(pid, {})
            dr = b["drills_this_season"].setdefault(pid, {})
            total = 0.0
            for _ in range(tp):
                g = drill_gain(p, attr, int(dr.get(attr, 0)), float(tr.get(attr, 0.0)))
                dr[attr] = int(dr.get(attr, 0)) + 1
                b["load"][pid] = int(b["load"].get(pid, 0)) + CONST["drill_load"]
                if g > 0:
                    p["a"][attr] = float(p["a"].get(attr, 50)) + g
                    tr[attr] = round(float(tr.get(attr, 0.0)) + g, 3)
                    total += g
            if total:
                deltas.setdefault(pid, {})[attr] = round(deltas.get(pid, {}).get(attr, 0.0) + total, 3)
            spent += tp
            capped = float(tr.get(attr, 0)) >= CONST["season_cap"] - 1e-9
            log.append(f"{p.get('name', pid)}: {ATTR_LABEL[attr]} +{total:.2f} ({tp} TP)"
                       + (" — season cap reached" if capped else ""))
            if kind == "set_piece":
                b["set_pieces"]["drilled"] = True
            if int(pval(p, attr)) > int(pval(p, attr) - total):
                level_ups.append({"kind": "attr", "pid": pid, "attr": attr, "value": round(pval(p, attr), 2)})
            if b["load"][pid] > load_threshold(b):
                log.append(f"{p.get('name', pid)}: load {b['load'][pid]} is over {load_threshold(b)} — "
                           f"-{CONST['load_energy_pct']}% starting energy and a small injury risk")
        elif kind == "pair":
            pts = b["partnerships"]
            pid_ = item.get("partnership_id")
            pt = next((x for x in pts if (x.get("id") or partnership_id(x.get("pattern"), x.get("members") or [])) == pid_), None) if pid_ else None
            if pt is None:
                pattern = item.get("pattern")
                members = [str(m) for m in item.get("members") or []]
                if not pattern:
                    errors.append(f"plan[{i}]: unknown partnership '{pid_}'"); continue
                pt = next((x for x in pts if x.get("pattern") == pattern and [str(m) for m in x.get("members") or []] == members), None)
                if pt is None:
                    err = _validate_members(pattern, members, sq)
                    if err:
                        errors.append(f"plan[{i}]: {err}"); continue
                    if len(pts) >= max_partnerships(b):
                        errors.append(f"plan[{i}]: all {max_partnerships(b)} partnership slots are used"); continue
                    pt = {"id": partnership_id(pattern, members), "pattern": pattern, "members": members, "fam": 0}
                    pts.append(pt)
                    log.append(f"New partnership: {PATTERNS[pattern]['name']} "
                               f"({' + '.join(sq[m].get('name', m) for m in members)})")
            before = _level(float(pt.get("fam", 0)))
            pt["fam"] = min(100, float(pt.get("fam", 0)) + CONST["fam_per_tp"] * tp)
            for m in pt["members"]:
                b["load"][m] = int(b["load"].get(m, 0)) + CONST["drill_load"] * tp
            spent += tp
            after = _level(pt["fam"])
            log.append(f"{PATTERNS[pt['pattern']]['name']}: familiarity {pt['fam']:.0f} (level {after})")
            if after > before:
                level_ups.append({"kind": "partnership", "id": pt.get("id"), "level": after})
        elif kind == "system":
            sid = item.get("system_id") or b.get("system_id")
            if sid not in SYSTEMS and sid != "custom":
                errors.append(f"plan[{i}]: unknown system '{sid}'"); continue
            b["familiarity"][sid] = min(100.0, system_familiarity(b, sid) + CONST["sys_per_tp"] * tp)
            spent += tp
            log.append(f"{SYSTEMS.get(sid, {}).get('name', sid)}: familiarity {b['familiarity'][sid]:.0f}")
        elif kind == "switch_system":
            sid = item.get("system_id")
            if sid not in SYSTEMS and sid != "custom":
                errors.append(f"plan[{i}]: unknown system '{sid}'"); continue
            floor = CONST["sys_switch_custom"] if sid == "custom" else CONST["sys_switch"]
            prev = b["familiarity"].get(sid)
            b["familiarity"][sid] = max(float(prev) if prev is not None else 0.0, float(floor))
            b["system_id"] = sid
            log.append(f"Switched to {SYSTEMS.get(sid, {}).get('name', sid)} (familiarity {b['familiarity'][sid]:.0f})")
        elif kind == "card":
            cid = item.get("card_id")
            if cid not in CARDS:
                errors.append(f"plan[{i}]: unknown card '{cid}'"); continue
            if b["upgrades"].get(cid):
                errors.append(f"plan[{i}]: {CARDS[cid]['name']} is already upgraded"); continue
            b["upgrades"][cid] = 1
            spent += tp
            log.append(f"{CARDS[cid]['name']}+ : {upgrade_text(CARDS[cid])}")
        elif kind == "rest":
            pid = str(item.get("pid"))
            if pid not in sq:
                errors.append(f"plan[{i}]: player '{pid}' not in squad"); continue
            if b["load"].get(pid):
                errors.append(f"plan[{i}]: {sq[pid].get('name')} trained this week and can't rest"); continue
            b["rest"][pid] = True
            log.append(f"{sq[pid].get('name', pid)} rests (+{rest_recovery(b)} condition next week)")
        else:
            errors.append(f"plan[{i}]: unknown kind '{kind}'")
    b["tp"]["wallet"] = wallet - spent
    return {"build": b, "squad_deltas": deltas, "load": dict(b["load"]), "log": log, "errors": errors,
            "tp_spent": spent, "tp_left": wallet - spent, "level_ups": level_ups}


def rest_recovery(build: dict[str, Any]) -> int:
    lvl = int((build.get("staff") or {}).get("fitness", 1) or 1)
    return CONST["rest_recovery"] + 3 * max(0, lvl - 1)


def week_tp(build: dict[str, Any], week_kind: str) -> int:
    base = {"camp": CONST["tp_camp"], "double": CONST["tp_midweek"]}.get(week_kind, CONST["tp_week"])
    return base + max(0, int((build.get("staff") or {}).get("coach", 1) or 1) - 1)


def week_tick(squad: list[dict[str, Any]], build: dict[str, Any] | None,
              lineups_played: list[dict[str, Any]] | None, week_kind: str = "single") -> dict[str, Any]:
    b = _norm_build(build)
    log: list[str] = []
    lineups = lineups_played or []
    sid = b.get("system_id")
    if sid:
        n_in = sum(1 for lp in lineups if (lp.get("system_id") or sid) == sid)
        b["familiarity"][sid] = min(100.0, system_familiarity(b, sid) + CONST["sys_week"] + CONST["sys_per_match"] * n_in)
        log.append(f"{SYSTEMS.get(sid, {}).get('name', sid)} familiarity {b['familiarity'][sid]:.0f}")
    for pt in b["partnerships"]:
        members = set(str(m) for m in pt.get("members") or [])
        together = sum(1 for lp in lineups if members <= set(str(x) for x in (lp.get("xi") or [])))
        before = _level(float(pt.get("fam", 0)))
        if together:
            pt["fam"] = min(100.0, float(pt.get("fam", 0)) + CONST["fam_per_match"] * together)
        else:
            pt["fam"] = max(0.0, float(pt.get("fam", 0)) - CONST["fam_decay"])
        after = _level(pt["fam"])
        name = PATTERNS.get(pt.get("pattern"), {}).get("name", pt.get("pattern"))
        if after != before:
            log.append(f"{name}: level {before} → {after}")
    recovery = {pid: rest_recovery(b) for pid in b.get("rest", {})}
    b["load"] = {}
    b["rest"] = {}
    carried = min(int(b["tp"]["wallet"]), CONST["tp_carry_cap"])
    grant = week_tp(b, week_kind)
    b["tp"] = {"wallet": carried + grant, "carried": carried}
    log.append(f"+{grant} TP ({carried} carried)")
    b["analyst_runs_left"] = analyst_budget(b)
    return {"build": b, "log": log, "recovery": recovery, "tp_granted": grant}


def analyst_budget(build: dict[str, Any] | None) -> int:
    lvl = int(((build or {}).get("staff") or {}).get("analyst", 1) or 1)
    return CONST["analyst_runs"] + max(0, lvl - 1)


def new_season(build: dict[str, Any] | None) -> dict[str, Any]:
    b = _norm_build(build)
    b["trained_this_season"] = {}
    b["drills_this_season"] = {}
    return b


# ── decks ────────────────────────────────────────────────────────────────────
def starter_deck(system_id: str | None) -> list[str]:
    sysd = SYSTEMS.get(system_id or "") or {}
    ids = list(UNIVERSAL) + list(sysd.get("signature_cards", [])) + list(REACTIONS)
    return [c for c in dict.fromkeys(ids) if c in CARDS and card_available(c)]


def unlocked_cards(build: dict[str, Any] | None) -> list[str]:
    """Every card this build may put in its deck right now."""
    b = build or {}
    out = list(UNIVERSAL) + list(REACTIONS)
    sysd = SYSTEMS.get(b.get("system_id") or "")
    if sysd:
        out += sysd.get("signature_cards", [])
    for pt in b.get("partnerships") or []:
        pat = PATTERNS.get(pt.get("pattern"), {})
        if pat.get("card") and _level(float(pt.get("fam", 0))) >= 2:
            out.append(pat["card"])
    st = b.get("staff") or {}
    for cid, c in CARDS.items():
        src = c["source"]
        if src["kind"] == "staff":
            who, lv = src["ref"].split(":")
            if int(st.get(who, 1) or 1) >= int(lv):
                out.append(cid)
        if src["kind"] == "set_piece" and (b.get("set_pieces") or {}).get("drilled"):
            out.append(cid)
    return [c for c in dict.fromkeys(out) if card_available(c)]


# ═════════════════════════════════════════════════════════════════════════════
# CARD TEXT — generated from the effects (single source of truth)
# ═════════════════════════════════════════════════════════════════════════════
def _who_label(who: Any, names: dict[str, str] | None = None) -> str:
    if who == "team" or who is None:
        return "All outfielders"
    if isinstance(who, dict):
        if "group" in who:
            lab = GROUP_LABEL.get(who["group"], who["group"])
            return (lab.rstrip("s") if who.get("first") == 1 and lab.endswith("s") else lab) + (
                " (one)" if who.get("first") == 1 and not lab.endswith("s") else "")
        if "combo_role" in who:
            roles = who["combo_role"] if isinstance(who["combo_role"], list) else [who["combo_role"]]
            if names:
                return ", ".join(names.get(r, r) for r in roles)
            return ", ".join(r.replace("_", " ").title() for r in roles)
        if "most_tired" in who:
            n = int(who["most_tired"])
            return f"Your {n} most tired players" if n > 1 else "Your most tired player"
        if who.get("sub") == "in":
            return names.get("__sub_in", "The substitute") if names else "The substitute"
        if "target" in who:
            return names.get("__target", "Chosen player") if names else "Chosen player"
    return str(who)


def effective_card(card: dict[str, Any], upgraded: bool = False) -> dict[str, Any]:
    c = copy.deepcopy(card)
    if upgraded:
        up = c.get("upgrade") or {}
        if up.get("kind") == "cost":
            c["cost"] = max(0, int(c["cost"]) + int(up.get("delta", -1)))
        elif up.get("kind") == "duration" and c.get("duration"):
            c["duration"] = int(c["duration"]) + int(up.get("add", 5))
        elif up.get("kind") == "effect" and up.get("effect"):
            c["effects"] = c["effects"] + [up["effect"]]
        c["name"] = c["name"] + "+"
    return c


def upgrade_text(card: dict[str, Any]) -> str:
    up = card.get("upgrade") or {}
    if up.get("kind") == "cost":
        return f"costs ⚡{max(0, card['cost'] + int(up.get('delta', -1)))} instead of ⚡{card['cost']}"
    if up.get("kind") == "duration":
        return f"lasts {int(card.get('duration') or 0) + int(up.get('add', 5))}' instead of {card.get('duration')}'"
    if up.get("kind") == "effect":
        return "adds: " + "; ".join(effect_lines(up["effect"]))
    return "no upgrade"


def effect_lines(e: dict[str, Any], names: dict[str, str] | None = None, hooks: dict[str, bool] | None = None,
                 level: int | None = None) -> list[str]:
    hooks = hooks or engine_hooks()
    op = e.get("op")
    req = e.get("requires")
    if req and not hooks.get(req, False):
        return []
    if e.get("min_level") and level is not None and level < int(e["min_level"]):
        return []
    pre = f"Lv{e['min_level']}+: " if e.get("min_level") else ""
    if op == "tactics":
        return [pre + "Team: " + ", ".join(f"{TACTIC_LABEL.get(k, k)} {v}" for k, v in e["set"].items())]
    if op == "role":
        bits = []
        for k, lab in (("attackRole", "attack role"), ("attackEffort", "attack effort"),
                       ("defenseRole", "defence role"), ("defenseEffort", "defence effort")):
            if k in e:
                v = e[k]
                if v == "auto_press":
                    v = "the pressing role for his position"
                bits.append(f"{lab} {v}")
        return [pre + f"{_who_label(e.get('who'), names)}: " + ", ".join(bits)]
    if op == "energy":
        a = int(e["amount"])
        return [pre + f"{_who_label(e.get('who'), names)}: energy {'+' if a > 0 else '−'}{abs(a)}"]
    if op == "modifiers":
        d = ", ".join(f"{ATTR_LABEL.get(k, k)} {'+' if v >= 0 else ''}{v:g}" for k, v in e["deltas"].items())
        return [pre + f"{_who_label(e.get('who'), names)}: {d}"]
    if op == "sub":
        pool = GROUP_LABEL.get(e.get("pool", "OUT"), "outfielder").lower()
        out = names.get("__sub_out") if names else None
        inn = names.get("__sub_in") if names else None
        if out and inn:
            return [pre + f"Substitution: {inn} on for {out}"]
        return [pre + f"Substitution: your most tired player ({pool}) off, the best fit on the bench on"]
    if op == "formation":
        fid = e["formation"]
        return [pre + f"Shape: {bridge.FORMATION_NAME_MAP.get(fid, fid)}"]
    if op == "set_pieces":
        cr = e.get("corner_routine") or {}
        tgt = {"best_header": "your best header", "tallest": "your tallest player"}.get(cr.get("target"), None)
        return [pre + f"Corners: {cr.get('zone', 'auto')} routine" + (f", aimed at {tgt}" if tgt else "")]
    if op == "reveal":
        return [pre + "Shows the card the opposition bench would play now"]
    return []


def card_view(cid: str, upgraded: bool = False, names: dict[str, str] | None = None,
              level: int | None = None) -> dict[str, Any]:
    base = CARDS[cid]
    c = effective_card(base, upgraded)
    hooks = engine_hooks()
    lines: list[str] = []
    for e in c["effects"]:
        lines += effect_lines(e, names, hooks, level)
    if c.get("duration"):
        lines.append(f"For {c['duration']}', then the changed settings revert (unless you changed them since)")
    elif c["type"] == "STANCE":
        lines.append("Stays until you change it")
    kws = []
    fat = [-int(e["amount"]) for e in c["effects"] if e.get("op") == "energy" and int(e["amount"]) < 0]
    if fat:
        kws.append(f"Fatigue {max(fat)}")
    if c.get("exhaust"):
        kws.append("Exhaust")
    if c.get("combo"):
        kws.append(f"Combo({PATTERNS[c['combo']]['name']})")
    if c.get("trigger"):
        kws.append(f"Trigger({TRIGGER_LABEL.get(c['trigger'], c['trigger'])})")
    if c.get("target"):
        kws.append(f"Target({c['target']})")
    if not upgraded:
        kws.append("Upgrade")
    headline = c.get("headline", "")
    if names:
        for k, v in names.items():
            headline = headline.replace("{" + k + "}", v)
    return {"id": cid, "name": c["name"], "cost": c["cost"], "type": c["type"], "duration": c.get("duration"),
            "headline": headline, "lines": lines, "effects_text": lines, "text": " · ".join(lines),
            "keywords": kws, "drawback": c.get("drawback", ""), "source": c["source"], "tags": c.get("tags", []),
            "trigger": c.get("trigger"), "exhaust": bool(c.get("exhaust")), "combo": c.get("combo"),
            "target": c.get("target"), "upgrade": dict(base.get("upgrade") or {}, text=upgrade_text(base)),
            "upgraded": bool(upgraded), "requires": base.get("requires", []), "available": card_available(cid),
            "version": CARDS_VERSION}


TRIGGER_LABEL = {"conceded": "just conceded", "opp_red": "opponent down to ten", "level_70": "level after 70'",
                 "behind_60": "behind after 60'", "ahead_75": "ahead after 75'"}


def catalog() -> dict[str, Any]:
    pats = []
    for pid, p in PATTERNS.items():
        pats.append({"id": pid, "name": p["name"], "size": len(p["roles"]),
                     "members": [{"role": r, "rule": p["eligible"][r]} for r in p["roles"]],
                     "boosts": {str(lv): {r: {a: per[lv - 1] for a, per in d.items()} for r, d in p["boosts"].items()}
                                for lv in (1, 2, 3)},
                     "card_id": p.get("card"),
                     "text": "Boosts apply while every member is on the pitch and end when any member leaves."})
    systems = []
    for s in SYSTEMS.values():
        sl = system_slots(s)
        slots = {fs: dict(v["instr"], engine_slot=v["engine_slot"], role_key=bridge.ATTACK_ROLE_MAP[v["instr"]["attackRole"]],
                          label=f"{fs}: {v['instr']['attackRole']} / {v['instr']['defenseRole']}",
                          demand=slot_demand(v["engine_slot"], v["instr"])) for fs, v in sl.items()}
        systems.append({"id": s["id"], "name": s["name"], "formation": s["formation"],
                        "shape": bridge.FORMATION_NAME_MAP.get(s["formation"], s["formation"]),
                        "identity": s["identity"], "custom": False, "tactics": dict(s["tactics"]), "slots": slots,
                        "key_demands": s.get("key_demands", []), "signature_cards": s["signature_cards"],
                        "key_bonuses": s.get("key_bonuses", []), "pillars": s.get("pillars", [])})
    traits = [{"id": t["id"], "name": t["name"], "kind": "player",
               "rule": " and ".join(f"{ATTR_LABEL[k]} {v}{' cm' if k == 'ht' else ''}+" for k, v in (t.get("rule") or {}).items())
               or " or ".join(f"{ATTR_LABEL[k]} {v}+" for k, v in t["rule_any"].items())} for t in PLAYER_TRAITS]
    dummy = unit_bonuses({}, {}, "433")
    traits += [{"id": b["id"], "name": b["name"], "kind": "unit", "rule": b["rule"], "need": b["need"]} for b in dummy]
    return {"version": CATALOG_VERSION, "cards_version": CARDS_VERSION, "engine_hooks": engine_hooks(),
            "attrs": ATTR_LABEL, "constants": {k: v for k, v in CONST.items()},
            "systems": systems, "cards": [card_view(cid) for cid in CARDS], "patterns": pats,
            "traits": traits, "staff": STAFF, "starter_deck": starter_deck(None),
            "starter_decks": {sid: starter_deck(sid) for sid in SYSTEMS},
            "deck_min_rule": "min(deck_min, available unlocked cards)",
            "custom_deck_min": min(CONST["deck_min"], len(starter_deck(None)))}


# ═════════════════════════════════════════════════════════════════════════════
# MATCH RUNTIME — influence, card plays, timed reverts, CPU policy
# ═════════════════════════════════════════════════════════════════════════════
def _u(*parts: Any) -> float:
    """Keyed uniform in [0, 1) — the only 'randomness' in this module."""
    h = hashlib.blake2b("|".join(str(p) for p in parts).encode(), digest_size=8).digest()
    return int.from_bytes(h, "big") / 2 ** 64


def _other(team: str) -> str:
    return "AWAY" if team == "HOME" else "HOME"


def _front_tactics(engine: MatchEngine, team: str) -> dict[str, str]:
    from dataclasses import fields
    t = engine.teams[team].tactics
    out = dict(DEFAULT_TACTICS)
    for f in fields(t):
        fk = _T_ENG2FRONT_KEY.get(f.name)
        if fk:
            out[fk] = _T_ENG2FRONT_VAL.get(getattr(t, f.name), out.get(fk))
    return out


def _front_instr(st) -> dict[str, Any]:
    i = st.instructions
    return {"attackRole": _AR_ENG2FRONT.get(i.attack_role, "Support"), "attackEffort": int(i.attack_effort),
            "defenseRole": _DR_ENG2FRONT.get(i.defense_role, "Hold Zone"), "defenseEffort": int(i.defense_effort)}


def _eng_player_dict(p) -> dict[str, Any]:
    return {"id": p.player_id, "name": p.name, "pos": p.primary_position, "foot": p.preferred_foot,
            "ht": p.height_cm, "ovr": p.ovr, "pot": p.pot, "age": p.age,
            "a": {SHORT[k]: v for k, v in p.attributes.items() if k in SHORT}}


def _active(engine: MatchEngine, team: str) -> list:
    order = {s: i for i, s in enumerate(["GK", "LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB", "CDM", "LDM", "RDM",
                                          "LCM", "RCM", "LM", "RM", "CAM", "LAM", "RAM", "LW", "RW", "ST", "LST", "RST"])}
    sts = [st for st in engine.states.values() if st.team_id == team and st.active]
    return sorted(sts, key=lambda st: (order.get(st.slot, 99), st.player.player_id))


class _Runtime:
    """Per-engine build runtime, installed as the instance's
    ``advance_one_second``. Picklable (checkpoints, Decision Lab workers)."""

    def __init__(self, engine: MatchEngine, sides: dict[str, dict[str, Any]]):
        self.engine = engine
        self.sides = sides
        self.sched: list[tuple[int, int, dict[str, Any]]] = []
        self.seq = 0
        self.seen = len(engine.events)
        self.reveals: list[dict[str, Any]] = []

    def __call__(self) -> None:
        eng = self.engine
        if self.sched:
            self._fire_due()
        if any(s.get("control") == "cpu" for s in self.sides.values()):
            self._policy()
        MatchEngine.advance_one_second(eng)
        self._scan()

    # influence credits from the ledger (half-time, conceding)
    def _scan(self) -> None:
        evs = self.engine.events
        while self.seen < len(evs):
            e = evs[self.seen]
            self.seen += 1
            if e.event_type == "HALFTIME":
                for s in self.sides.values():
                    s["influence"] = min(CONST["influence_max"], s["influence"] + CONST["influence_ht"])
            elif e.event_type == "GOAL" and e.team_id in ("HOME", "AWAY"):
                s = self.sides.get(_other(e.team_id))
                if s is not None:
                    s["influence"] = min(CONST["influence_max"], s["influence"] + CONST["influence_conceded"])
                    s["conceded"].append(int(e.timestamp))

    def schedule(self, clock: int, item: dict[str, Any]) -> None:
        self.seq += 1
        self.sched.append((int(clock), self.seq, item))
        self.sched.sort(key=lambda x: (x[0], x[1]))

    def _fire_due(self) -> None:
        eng = self.engine
        while self.sched and self.sched[0][0] <= eng.clock:
            _c, _s, item = self.sched.pop(0)
            try:
                _revert(eng, item)
            except (BridgeError, ValueError, KeyError):
                pass

    def _policy(self) -> None:
        eng = self.engine
        c = eng.clock
        if c <= 0 or eng.is_finished:
            return
        late = c >= CONST["ai_chase_from"] and c % CONST["ai_late_every"] == 0
        if c not in CONST["ai_checkpoints"] and not late:
            return
        for team in ("HOME", "AWAY"):
            side = self.sides.get(team)
            if not side or side.get("control") != "cpu":
                continue
            mode = _ai_mode(eng, team, c)
            if mode is None:
                continue
            cid = ai_choose_card(eng, team, mode)
            if cid:
                try:
                    apply_card(eng, {"team": team, "card_id": cid, "by": "AI"})
                except (BridgeError, ValueError, KeyError):
                    pass


def runtime(engine: MatchEngine) -> _Runtime | None:
    rt = engine.__dict__.get("advance_one_second")
    return rt if isinstance(rt, _Runtime) else None


def _side_state(block: dict[str, Any], team: str, seed: int) -> dict[str, Any]:
    control = block.get("control", "manager")
    sid = block.get("system_id")
    hand = [c for c in (block.get("hand") or []) if c in CARDS]
    if not hand and control == "cpu":
        hand = cpu_hand(sid, seed, team, block.get("deck"))
    parts = []
    for pt in block.get("partnerships") or []:
        parts.append({"pattern": pt.get("pattern"), "members": [str(m) for m in pt.get("members") or []],
                      "level": int(pt.get("level", _level(float(pt.get("fam", 0)))))})
    return {"control": control, "system_id": sid, "hand": hand, "upgrades": dict(block.get("upgrades") or {}),
            "partnerships": parts, "difficulty": block.get("difficulty", "normal"),
            "influence": int(CONST["influence_start"]), "played": [], "exhausted": [], "conceded": [],
            "policy_table": copy.deepcopy(block.get("policy_table"))}


def cpu_hand(system_id: str | None, seed: int, team: str, deck: list[str] | None = None) -> list[str]:
    pool = [c for c in (deck or starter_deck(system_id)) if c in CARDS and card_available(c)
            and not CARDS[c].get("combo") and CARDS[c]["source"]["kind"] != "staff"]
    sysd = SYSTEMS.get(system_id or "") or {}
    sig = [c for c in sysd.get("signature_cards", []) if c in pool]
    rest = sorted((c for c in pool if c not in sig), key=lambda c: _u("cpu-hand", seed, team, c))
    hand = sig[: CONST["hand_size"] - 2]
    # every CPU hand can chase, protect and refresh legs (the policy's three modes)
    for need in ({"chase"}, {"protect"}, {"sub", "energy"}):
        if len(hand) < CONST["hand_size"] and not any(set(CARDS[c]["tags"]) & need for c in hand):
            pick = next((c for c in sig + rest if c not in hand and set(CARDS[c]["tags"]) & need
                         and not CARDS[c].get("trigger")), None)
            if pick:
                hand.append(pick)
    for c in sig + rest:
        if len(hand) >= CONST["hand_size"]:
            break
        if c not in hand:
            hand.append(c)
    return hand


def install_runtime(engine: MatchEngine, builds: dict[str, Any]) -> _Runtime:
    rt = runtime(engine)
    if rt is None:
        sides = {t: _side_state(b, t, engine.seed) for t, b in (builds or {}).items() if t in ("HOME", "AWAY") and b}
        rt = _Runtime(engine, sides)
        engine.advance_one_second = rt
    return rt


def build_engine(start_request: dict[str, Any]) -> MatchEngine:
    """management.build_engine + the build runtime when the request carries builds."""
    engine = management.build_engine(start_request)
    if start_request.get("builds"):
        install_runtime(engine, start_request["builds"])
    return engine


# ── triggers / validation ──────────────────────────────────────────────────
def _reds(engine: MatchEngine, team: str) -> int:
    return sum(st.red_cards for st in engine.states.values() if st.team_id == team)


def triggers_met(engine: MatchEngine, team: str) -> list[str]:
    rt = runtime(engine)
    side = rt.sides.get(team) if rt else None
    c = engine.clock
    diff = engine.score[team] - engine.score[_other(team)]
    out = []
    if side and any(c - t <= CONST["trigger_conceded_window"] for t in side["conceded"]):
        out.append("conceded")
    if _reds(engine, _other(team)) > _reds(engine, team):
        out.append("opp_red")
    if c >= 4200 and diff == 0:
        out.append("level_70")
    if c >= 3600 and diff < 0:
        out.append("behind_60")
    if c >= 4500 and diff > 0:
        out.append("ahead_75")
    return out


def _combo_members(engine: MatchEngine, team: str, pattern: str) -> tuple[dict[str, str], int] | None:
    rt = runtime(engine)
    side = rt.sides.get(team) if rt else None
    if not side:
        return None
    active = {st.player.player_id for st in _active(engine, team)}
    best = None
    for pt in side["partnerships"]:
        if pt["pattern"] == pattern and set(pt["members"]) <= active:
            if best is None or pt["level"] > best["level"]:
                best = pt
    if best is None:
        return None
    return dict(zip(PATTERNS[pattern]["roles"], best["members"])), best["level"]


def can_play(engine: MatchEngine, team: str, cid: str, targets: dict[str, Any] | None = None,
             force: bool = False) -> tuple[bool, str | None]:
    if cid not in CARDS:
        return False, f"Unknown card '{cid}'"
    if engine.is_finished:
        return False, "The match has finished."
    if not card_available(cid):
        return False, f"{CARDS[cid]['name']} needs an engine feature that isn't switched on ({', '.join(CARDS[cid]['requires'])})."
    targets = targets or {}
    for key, side_team in (("player_id", team), ("player_off", team), ("opp_player", _other(team))):
        if targets.get(key):
            st = engine.states.get(str(targets[key]))
            if st is None or not st.active or st.team_id != side_team:
                return False, f"{key} must name an active player on the correct team"
    if targets.get("player_on") and str(targets["player_on"]) not in {p.player_id for p in engine.teams[team].bench if p.player_id not in engine.states}:
        return False, "player_on must name an unused bench player"
    rt = runtime(engine)
    side = rt.sides.get(team) if rt else None
    card = CARDS[cid]
    if card.get("combo") and _combo_members(engine, team, card["combo"]) is None:
        return False, f"Needs your {PATTERNS[card['combo']]['name']} partnership on the pitch."
    if card["type"] == "SUB" or any(e.get("op") == "sub" for e in card["effects"]):
        if engine.substitutions_used[team] >= 5:
            return False, "All five substitutions are used."
        if not [p for p in engine.teams[team].bench if p.player_id not in engine.states]:
            return False, "Nobody left on the bench."
    if force:
        return True, None
    if side is None:
        return False, "This match was started without a hand of cards."
    if cid not in side["hand"]:
        return False, f"{card['name']} is not in your hand."
    if cid in side["exhausted"]:
        return False, f"{card['name']} is Exhausted — once per match."
    cost = effective_card(card, bool(side["upgrades"].get(cid)))["cost"]
    if side["influence"] < cost:
        return False, f"Not enough influence: {card['name']} costs ⚡{cost}, you have ⚡{side['influence']}."
    if card.get("trigger") and card["trigger"] not in triggers_met(engine, team):
        return False, f"{card['name']} is a reaction: only playable when {TRIGGER_LABEL[card['trigger']]}."
    return True, None


# ── compile + apply ────────────────────────────────────────────────────────
def _resolve(engine: MatchEngine, team: str, who: Any, ctx: dict[str, Any]) -> list:
    act = _active(engine, team)
    if who == "team" or who is None:
        return [st for st in act if st.slot != "GK"]
    if isinstance(who, dict):
        if "group" in who:
            g = who["group"]
            sel = [st for st in act if (st.slot != "GK" if g == "OUT" else st.slot in GROUPS.get(g, set()))]
            return sel[: int(who["first"])] if who.get("first") else sel
        if "combo_role" in who:
            roles = who["combo_role"] if isinstance(who["combo_role"], list) else [who["combo_role"]]
            m = ctx.get("combo") or {}
            ids = [m.get(r) for r in roles]
            return [st for st in act if st.player.player_id in ids]
        if "most_tired" in who:
            out = sorted((st for st in act if st.slot != "GK"), key=lambda st: (st.energy, st.player.player_id))
            return out[: int(who["most_tired"])]
        if who.get("sub") == "in":
            pid = ctx.get("sub_in")
            return [st for st in act if st.player.player_id == pid]
        if "target" in who:
            pid = (ctx.get("targets") or {}).get("player_id")
            return [st for st in act if st.player.player_id == pid]
    return []


def _pick_sub(engine: MatchEngine, team: str, e: dict[str, Any], targets: dict[str, Any]) -> tuple[Any, Any]:
    act = _active(engine, team)
    off = None
    if targets.get("player_off"):
        off = next((st for st in act if st.player.player_id == targets["player_off"]), None)
        if off is None:
            raise BridgeError("The player to take off is not on the pitch.")
    else:
        pool = GROUPS.get(e.get("pool", "OUT"))
        cands = [st for st in act if st.slot != "GK" and (pool is None or st.slot in pool)]
        if not cands:
            cands = [st for st in act if st.slot != "GK"]
        off = min(cands, key=lambda st: (st.energy, st.player.player_id))
    bench = [p for p in engine.teams[team].bench if p.player_id not in engine.states]
    if targets.get("player_on"):
        inc = next((p for p in bench if p.player_id == targets["player_on"]), None)
        if inc is None:
            raise BridgeError("The player to bring on is not on the bench.")
    else:
        pool = [p for p in bench if (p.primary_position == "GK") == (off.slot == "GK")] or bench
        if not pool:
            raise BridgeError("Nobody left on the bench.")
        ins = _front_instr(off)
        inc = max(pool, key=lambda p: (slot_fit(_eng_player_dict(p), off.slot, ins), p.player_id))
    return off, inc


def _execute(engine: MatchEngine, team: str, card: dict[str, Any], targets: dict[str, Any],
             combo: tuple[dict[str, str], int] | None) -> dict[str, Any]:
    """Apply a card's effects to ``engine`` (in effect order) through the
    management appliers; returns the primitive commands + revert record."""
    ap = management.APPLIERS
    hooks = engine_hooks()
    ctx: dict[str, Any] = {"targets": targets, "combo": combo[0] if combo else {}}
    level = combo[1] if combo else None
    cmds: list[dict[str, Any]] = []
    revert: dict[str, Any] = {"team": team, "card_id": card["id"], "tactics": {}, "instr": {}}
    names: dict[str, str] = {}
    if combo:
        for r, pid in combo[0].items():
            st = engine.states.get(pid)
            names[r] = _short(st.player.name if st else pid)
    dur_s = int(card["duration"]) * 60 if card.get("duration") else None
    for e in card["effects"]:
        op = e.get("op")
        if e.get("requires") and not hooks.get(e["requires"], False):
            continue
        if e.get("min_level") and (level or 0) < int(e["min_level"]):
            continue
        if op == "formation":
            old = engine.teams[team].formation_name
            payload = {"team": team, "formation": e["formation"]}
            ap["formation"](engine, payload)
            cmds.append({"kind": "formation", "payload": payload})
            revert["formation"] = [old, engine.teams[team].formation_name]
        elif op == "sub":
            off, inc = _pick_sub(engine, team, e, targets)
            payload = {"team": team, "player_off": off.player.player_id, "player_on": inc.player_id,
                       "target_slot": off.slot}
            ap["substitution"](engine, payload)
            cmds.append({"kind": "substitution", "payload": payload})
            ctx["sub_in"] = inc.player_id
            names["__sub_in"] = _short(inc.name)
            names["__sub_out"] = _short(off.player.name)
        elif op == "role":
            for st in _resolve(engine, team, e.get("who"), ctx):
                cur = _front_instr(st)
                new = dict(cur)
                for k in ("attackRole", "attackEffort", "defenseRole", "defenseEffort"):
                    if k in e:
                        v = e[k]
                        if v == "auto_press":
                            v = PRESS_ROLE[slot_group(st.slot)]
                        new[k] = v
                if new == cur:
                    continue
                payload = {"team": team, "player_id": st.player.player_id, "instructions": new}
                ap["instructions"](engine, payload)
                cmds.append({"kind": "instructions", "payload": payload})
                if e.get("who", {}) != {"sub": "in"}:
                    rv = revert["instr"].setdefault(st.player.player_id, {})
                    for k in new:
                        if new[k] != cur[k]:
                            rv[k] = [rv.get(k, [cur[k]])[0], new[k]]
        elif op == "tactics":
            cur = _front_tactics(engine, team)
            new = dict(cur, **e["set"])
            if new != cur:
                payload = {"team": team, "tactics": new}
                ap["tactics"](engine, payload)
                cmds.append({"kind": "tactics", "payload": payload})
                for k in e["set"]:
                    if new[k] != cur[k]:
                        revert["tactics"][k] = [revert["tactics"].get(k, [cur[k]])[0], new[k]]
        elif op == "energy":
            for st in _resolve(engine, team, e.get("who"), ctx):
                before = st.energy
                st.energy = max(1.0, min(100.0, st.energy + float(e["amount"])))
                cmds.append({"kind": "energy", "payload": {"team": team, "player_id": st.player.player_id,
                                                           "delta": round(st.energy - before, 2)}})
        elif op == "modifiers":
            sel = _resolve(engine, team, e.get("who"), ctx)
            if sel:
                payload = {"team": team, "deltas": {st.player.player_id: dict(e["deltas"]) for st in sel}}
                if dur_s:
                    payload["until_clock"] = engine.clock + dur_s
                ap["modifiers"](engine, payload)
                cmds.append({"kind": "modifiers", "payload": payload})
        elif op == "set_pieces":
            cr = dict(e.get("corner_routine") or {})
            tgt = cr.pop("target", None)
            if tgt:
                act = [st for st in _active(engine, team) if st.slot != "GK"]
                if tgt == "tallest":
                    best = max(act, key=lambda st: ((st.player.height_cm or 183), st.player.player_id))
                else:
                    best = max(act, key=lambda st: ((st.player.height_cm or 183) + .35 * st.player.attr("jumping")
                                                   + .2 * st.player.attr("heading_accuracy"), st.player.player_id))
                cr["target_pid"] = best.player.player_id
            payload = {"team": team, "corner_routine": cr}
            ap["set_pieces"](engine, payload)
            cmds.append({"kind": "set_pieces", "payload": payload})
            revert["set_pieces"] = True
        elif op == "reveal":
            opp = _other(team)
            ctx["reveal"] = {"team": opp, "card_id": ai_choose_card(engine, opp, "any", peek=True)}
    return {"commands": cmds, "revert": revert, "names": names, "reveal": ctx.get("reveal"), "level": level}


def _short(name: str) -> str:
    parts = str(name).split()
    return parts[-1] if parts else str(name)


def compile_card(engine: MatchEngine, team: str, cid: str, targets: dict[str, Any] | None = None,
                 upgraded: bool | None = None) -> dict[str, Any]:
    """What playing ``cid`` now would do: primitive commands, scheduled
    reverts and the card text with real names. Never mutates ``engine``."""
    eng = copy.deepcopy(engine)
    rt = runtime(eng)
    side = rt.sides.get(team) if rt else None
    up = bool(side["upgrades"].get(cid)) if (upgraded is None and side) else bool(upgraded)
    card = effective_card(CARDS[cid], up)
    combo = _combo_members(eng, team, card["combo"]) if card.get("combo") else None
    res = _execute(eng, team, card, dict(targets or {}), combo)
    return _result(engine.clock, card, res, up)


def _result(clock: int, card: dict[str, Any], res: dict[str, Any], up: bool) -> dict[str, Any]:
    view = card_view(card["id"], up, res["names"], res["level"])
    sched = []
    if card.get("duration") and (res["revert"]["tactics"] or res["revert"]["instr"] or res["revert"].get("formation")
                                 or res["revert"].get("set_pieces")):
        sched.append({"clock": clock + int(card["duration"]) * 60, "what": f"{card['name']} ends: settings revert"})
    return {"card": view, "commands": res["commands"], "scheduled": sched, "reveal": res.get("reveal"),
            "lines": view["lines"]}


def card_command(cid: str, team: str, targets: dict[str, Any] | None = None, upgraded: bool = False,
                 force: bool = False) -> dict[str, Any]:
    payload = {"team": team, "card_id": cid, "version": CARDS_VERSION}
    if targets:
        payload["targets"] = targets
    if upgraded:
        payload["upgraded"] = True
    if force:
        payload["force"] = True
    return {"kind": "card", "payload": payload}


def apply_card(engine: MatchEngine, payload: dict[str, Any]) -> dict[str, Any]:
    """The ``card`` command applier (management.APPLIERS['card'])."""
    if payload.get("version", CARDS_VERSION) != CARDS_VERSION:
        raise BridgeError("This card was recorded with a different catalogue version")
    team = management._team_id(payload["team"])
    cid = payload.get("card_id")
    targets = dict(payload.get("targets") or {})
    force = bool(payload.get("force"))
    ok, why = can_play(engine, team, cid, targets, force=force)
    if not ok:
        raise BridgeError(why)
    rt = runtime(engine) or install_runtime(engine, {})
    side = rt.sides.get(team)
    up = bool(payload.get("upgraded")) or bool(side and side["upgrades"].get(cid))
    card = effective_card(CARDS[cid], up)
    combo = _combo_members(engine, team, card["combo"]) if card.get("combo") else None
    # Validate every effect on a clone before mutating the live engine.
    compile_card(engine, team, cid, targets, up)
    res = _execute(engine, team, card, targets, combo)
    if side is not None and not force:
        side["influence"] -= int(card["cost"])
        if card.get("exhaust"):
            side["exhausted"].append(cid)
    if side is not None:
        side["played"].append({"card_id": cid, "clock": engine.clock,
                               "until": engine.clock + int(card["duration"]) * 60 if card.get("duration") else None})
    out = _result(engine.clock, card, res, up)
    if card.get("duration") and out["scheduled"]:
        rt.schedule(engine.clock + int(card["duration"]) * 60, res["revert"])
    if res.get("reveal"):
        rt.reveals.append(dict(res["reveal"], clock=engine.clock, team_for=team))
    engine._record_event("CARD_PLAYED", team, None, {
        "card_id": cid, "name": card["name"], "cost": int(card["cost"]), "type": card["type"],
        "by": payload.get("by", "USER"), "lines": out["lines"], "duration": card.get("duration"),
        "minute": round(engine.clock / 60.0, 1),
        "influence": side["influence"] if side else None,
        **({"reveal": res["reveal"]} if res.get("reveal") else {})})
    return out


def _revert(engine: MatchEngine, rv: dict[str, Any]) -> None:
    ap = management.APPLIERS
    team = rv["team"]
    undone = []
    if rv.get("formation"):
        old, new = rv["formation"]
        if engine.teams[team].formation_name == new and old != new:
            ap["formation"](engine, {"team": team, "formation": old})
            undone.append("shape")
    if rv.get("tactics"):
        cur = _front_tactics(engine, team)
        new = dict(cur)
        for k, (old, val) in rv["tactics"].items():
            if cur.get(k) == val:
                new[k] = old
        if new != cur:
            ap["tactics"](engine, {"team": team, "tactics": new})
            undone.append("tactics")
    for pid, fields in (rv.get("instr") or {}).items():
        st = engine.states.get(pid)
        if st is None or not st.active or st.team_id != team:
            continue
        cur = _front_instr(st)
        new = dict(cur)
        for k, (old, val) in fields.items():
            if cur.get(k) == val:
                new[k] = old
        if new != cur:
            ap["instructions"](engine, {"team": team, "player_id": pid, "instructions": new})
            undone.append("roles")
    if rv.get("set_pieces") and "set_pieces" in ap:
        ap["set_pieces"](engine, {"team": team, "corner_routine": None})
        undone.append("set pieces")
    engine._record_event("CARD_EXPIRED", team, None, {"card_id": rv["card_id"], "name": CARDS.get(rv["card_id"], {}).get("name"),
                                                      "reverted": undone, "minute": round(engine.clock / 60.0, 1)})


management.APPLIERS.setdefault("card", apply_card)


# ── card state for snapshots ───────────────────────────────────────────────
def card_state(engine: MatchEngine) -> dict[str, Any] | None:
    rt = runtime(engine)
    if rt is None:
        return None
    out = {}
    for team, side in rt.sides.items():
        playable = {}
        for cid in side["hand"]:
            ok, why = can_play(engine, team, cid)
            playable[cid] = {"ok": ok, "reason": why,
                             "cost": effective_card(CARDS[cid], bool(side["upgrades"].get(cid)))["cost"]}
        out[team] = {"influence": side["influence"], "max": CONST["influence_max"], "hand": list(side["hand"]),
                     "played": [dict(p) for p in side["played"]], "exhausted": list(side["exhausted"]),
                     "triggers_met": triggers_met(engine, team), "playable": playable,
                     "control": side["control"], "system_id": side["system_id"]}
    return out


def compiled_hand(engine: MatchEngine, team: str) -> list[dict[str, Any]]:
    rt = runtime(engine)
    side = rt.sides.get(team) if rt else None
    if not side:
        return []
    out = []
    for cid in side["hand"]:
        up = bool(side["upgrades"].get(cid))
        names = None
        level = None
        card = CARDS[cid]
        if card.get("combo"):
            cm = _combo_members(engine, team, card["combo"])
            if cm:
                names = {r: _short(engine.states[pid].player.name) for r, pid in cm[0].items() if pid in engine.states}
                level = cm[1]
        v = card_view(cid, up, names, level)
        ok, why = can_play(engine, team, cid)
        v.update(playable=ok, reason=why)
        out.append(v)
    return out


# ── CPU policy (§6.6.5) ────────────────────────────────────────────────────
_EFFECTS_CACHE: dict[str, Any] = {}


def effect_table() -> dict[str, Any] | None:
    p = _DATA / "card_effects.json"
    try:
        st = p.stat()
        version = (st.st_mtime_ns, st.st_size)
    except OSError:
        version = None
    if "t" not in _EFFECTS_CACHE or _EFFECTS_CACHE.get("file_version") != version:
        try:
            _EFFECTS_CACHE["t"] = json.loads(p.read_text(encoding="utf-8")) if version else None
        except (OSError, ValueError):
            _EFFECTS_CACHE["t"] = None
        _EFFECTS_CACHE["file_version"] = version
    return _EFFECTS_CACHE["t"]


def card_context(engine: MatchEngine, team: str) -> dict[str, Any]:
    def avg_ovr(t: str) -> float:
        a = [st.player.ovr for st in _active(engine, t)]
        return sum(a) / max(1, len(a))
    rt = runtime(engine)
    own = (rt.sides.get(team) or {}).get("system_id") if rt else None
    opp = (rt.sides.get(_other(team)) or {}).get("system_id") if rt else None
    return {"minute": engine.clock // 60, "score_diff": engine.score[team] - engine.score[_other(team)],
            "strength_gap": round(avg_ovr(team) - avg_ovr(_other(team)), 1), "own_system": own, "opp_system": opp}


def table_preview(cid: str, ctx: dict[str, Any], table: dict[str, Any] | None = None) -> dict[str, Any] | None:
    t = table if table is not None else effect_table()
    if not t or cid not in (t.get("cards") or {}):
        return None
    ent = t["cards"][cid]
    if not ent.get("calibrated", t.get("calibrated", False)):
        return None
    model = ent.get("model") or {}
    x = {"const": 1.0, "minute": float(ctx.get("minute", 0)), "score_diff": float(ctx.get("score_diff", 0)),
         "strength_gap": float(ctx.get("strength_gap", 0))}
    x[f"system_pair:{ctx.get('own_system','')}|{ctx.get('opp_system','')}"] = 1.0
    out = {}
    for k in ("dxg_for", "dxg_against", "dpts"):
        coef = (model.get(k) or {}).get("coef") or {}
        out[k] = round(sum(float(coef.get(n, 0.0)) * v for n, v in x.items()), 3)
    strata = ent.get("strata") or []
    se, n = None, t.get("n")
    if strata:
        best = min(strata, key=lambda s: (abs(s.get("minute", 0) - x["minute"]) / 15 + abs(s.get("score_diff", 0) - x["score_diff"])))
        se = (best.get("se") or {}).get("dpts")
        n = best.get("n", n)
    out.update(se=se, n=n, source="table")
    return out


def _ai_mode(engine: MatchEngine, team: str, clock: int) -> str | None:
    diff = engine.score[team] - engine.score[_other(team)]
    if clock >= CONST["ai_chase_from"] and diff < 0:
        return "chase"
    if clock >= CONST["ai_protect_from"] and diff > 0:
        return "protect"
    en = [st.energy for st in _active(engine, team) if st.slot != "GK"]
    if en and sum(en) / len(en) < CONST["ai_low_energy"]:
        return "energy"
    if clock in CONST["ai_checkpoints"] and _u("ai-idle", engine.rng.seed, team, clock) < CONST["ai_idle_prob"]:
        return "any"
    return None


_MODE_TAGS = {"chase": {"chase"}, "protect": {"protect"}, "energy": {"sub", "energy"}}


def ai_choose_card(engine: MatchEngine, team: str, mode: str = "any", peek: bool = False) -> str | None:
    rt = runtime(engine)
    side = rt.sides.get(team) if rt else None
    if side is None:
        return None
    clock = engine.clock
    active_ids = {p["card_id"] for p in side["played"] if p.get("until") and p["until"] > clock}
    cands = []
    ctx = card_context(engine, team)
    sysd = SYSTEMS.get(side.get("system_id") or "") or {}
    for cid in side["hand"]:
        if cid in active_ids:
            continue
        if any(e.get("op") == "reveal" for e in CARDS[cid]["effects"]):
            continue
        ok, _why = can_play(engine, team, cid)
        if not ok:
            continue
        tags = set(CARDS[cid].get("tags", []))
        if mode in _MODE_TAGS and not (tags & _MODE_TAGS[mode]):
            continue
        tp = table_preview(cid, ctx, side.get("policy_table"))
        if tp is not None and tp.get("dpts") is not None:
            score = float(tp["dpts"])
        else:
            score = 0.0
            if mode == "any":
                d = ctx["score_diff"]
                score += .5 if (d > 0 and "protect" in tags) or (d < 0 and "chase" in tags) else .2
            else:
                score += 1.0
            score -= .05 * CARDS[cid]["cost"]
        if cid in sysd.get("signature_cards", []):
            score += .05 if tp is not None else .3
        cands.append((score, cid))
    if not cands:
        return None
    cands.sort(key=lambda sc: (-sc[0], sc[1]))
    if peek:
        return cands[0][1]
    pbest = CONST["ai_best_prob"].get(side.get("difficulty", "normal"), .75)
    if len(cands) == 1 or _u("ai-best", engine.rng.seed, team, clock) < pbest:
        return cands[0][1]
    rest = cands[1:]
    return rest[int(_u("ai-alt", engine.rng.seed, team, clock) * len(rest))][1]


# ═════════════════════════════════════════════════════════════════════════════
# KICK-OFF: normalise build blocks into the start request (input-only)
# ═════════════════════════════════════════════════════════════════════════════
def _apply_system_to_side(side: dict[str, Any], system: dict[str, Any]) -> None:
    side["tactics"] = dict(system["tactics"])
    slots = system_slots(system)
    if str(side.get("formation", "433")) != system["formation"]:
        old = {slot:p for slot,p in (side.get("lineup") or {}).items() if p}
        lineup = {slot:old[slot] for slot in slots if slot in old}
        used = {str(p['id']) for p in lineup.values()}
        remaining = [p for p in old.values() if str(p['id']) not in used]
        for slot in slots:
            if slot in lineup:
                continue
            if not remaining:
                raise BridgeError("A system requires eleven lineup players")
            instr = slots[slot]['instr']
            eslot = slots[slot]['engine_slot']
            best = max(remaining,key=lambda p:(slot_fit(p,eslot,instr),str(p['id'])))
            lineup[slot] = best
            remaining.remove(best)
        side['lineup'] = lineup
        side['formation'] = system['formation']
    ins = dict(side.get("player_instructions") or {})
    for fs, pdata in (side.get("lineup") or {}).items():
        if pdata and fs in system["slots"]:
            role = system["slots"][fs]
            ins[str(pdata["id"])] = {k:role[k] for k in ("attackRole", "attackEffort", "defenseRole", "defenseEffort")}
    side["player_instructions"] = ins


def prepare_request(body: dict[str, Any]) -> dict[str, Any]:
    """Return a NEW start request with build blocks normalised into
    ``builds:{HOME?,AWAY?}``, kick-off modifier layers recorded separately
    from the immutable lineup attributes, and ``_build_prepared`` set (so replays never re-apply)."""
    if body.get("_build_prepared") or not (body.get("build") or body.get("cpu_build") or body.get("builds")):
        return body
    out = copy.deepcopy(body)
    raw = dict(out.pop("builds", None) or {})
    me = str(out.pop("build_team", "HOME") or "HOME").upper()
    if me not in ("HOME", "AWAY"):
        raise BridgeError("build_team must be HOME or AWAY")
    if out.get("build"):
        raw[me] = dict(out.pop("build"), control=(body.get("build") or {}).get("control", "manager"))
    else:
        out.pop("build", None)
    if out.get("cpu_build"):
        raw[_other(me)] = dict(out.pop("cpu_build"), control="cpu")
    else:
        out.pop("cpu_build", None)
    source_table = effect_table() or {}
    # Freeze the calibrated prediction models used by CPU decisions, excluding
    # bulky samples/strata. Replays must not consult future calibration files.
    policy_table = {"cards":{cid:{"calibrated":True,"model":copy.deepcopy(ent.get("model") or {})}
                             for cid,ent in (source_table.get("cards") or {}).items()
                             if ent.get("calibrated", source_table.get("calibrated",False))}}
    canon: dict[str, Any] = {}
    summary: dict[str, Any] = {}
    for team, bb in raw.items():
        team = str(team).upper()
        if team not in ("HOME", "AWAY") or not bb:
            continue
        side_key = "home_team" if team == "HOME" else "away_team"
        side = out.get(side_key) or {}
        sid = bb.get("system_id")
        system = get_system(sid, bb) if sid else None
        control = bb.get("control", "manager")
        hand = [str(c) for c in (bb.get("hand") or [])]
        if len(hand) > CONST["hand_size"]:
            raise BridgeError(f"A hand holds at most {CONST['hand_size']} cards")
        if len(set(hand)) != len(hand):
            raise BridgeError("The same card can't be in a hand twice")
        bad = [c for c in hand if c not in CARDS]
        if bad:
            raise BridgeError(f"Unknown cards: {bad}")
        if control == "manager" and hand:
            allowed = set(unlocked_cards(bb))
            deck = bb.get("deck")
            locked = [c for c in hand if c not in allowed]
            if locked:
                raise BridgeError(f"Not unlocked for this build: {', '.join(CARDS[c]['name'] for c in locked)}")
            if deck:
                missing = [c for c in hand if c not in deck]
                if missing:
                    raise BridgeError(f"Not in your deck: {', '.join(CARDS[c]['name'] for c in missing)}")
        if system is not None and bb.get("apply_system", control == "cpu"):
            _apply_system_to_side(side, system)
        mods = kickoff_modifiers(side, bb, system["id"] if system else None)
        # Store modifier layers as reproduction inputs, never rewrite player
        # base attributes: partnership dependencies expire when any member leaves.
        layers = []
        xi_ids = {str(p['id']) for p in (side.get('lineup') or {}).values() if p}
        partnership_totals = {}
        for pt in bb.get('partnerships') or []:
            view = partnership_view(pt, xi_ids)
            if not view['active'] or not view['boosts']:
                continue
            layers.append({'team':team, 'deltas':view['boosts'], 'dependency_pids':view['members'],
                           'source':f"partnership:{view['id']}"})
            for pid, dd in view['boosts'].items():
                for attr, value in dd.items():
                    partnership_totals.setdefault(pid,{})[attr] = partnership_totals.get(pid,{}).get(attr,0) + value
        remaining = {pid:{attr:round(value-partnership_totals.get(pid,{}).get(attr,0),2)
                          for attr,value in dd.items() if round(value-partnership_totals.get(pid,{}).get(attr,0),2)}
                     for pid,dd in mods.items()}
        remaining = {pid:dd for pid,dd in remaining.items() if dd}
        if remaining:
            layers.append({'team':team, 'deltas':remaining, 'source':'familiarity'})
        existing = out.get('modifiers') or []
        if isinstance(existing,dict): existing = [existing]
        out['modifiers'] = existing + layers
        for pdata in (side.get("lineup") or {}).values():
            if not pdata:
                continue
            pid = str(pdata["id"])
            ld = int(((bb.get("load") or {}).get(pid)) or 0)
            if ld > load_threshold(bb):
                c = float(pdata.get("cond", 100.0) if pdata.get("cond") is not None else 100.0)
                pdata["cond"] = round(c * (1 - CONST["load_energy_pct"] / 100.0), 1)
        if bb.get("set_pieces"):
            side["set_pieces"] = copy.deepcopy(bb["set_pieces"])
        out[side_key] = side
        parts = [partnership_view(pt, {str(p["id"]) for p in (side.get("lineup") or {}).values() if p})
                 for pt in bb.get("partnerships") or []]
        canon[team] = {"control": control, "system_id": system["id"] if system else None, "hand": hand,
                       "upgrades": {c: 1 for c in hand if (bb.get("upgrades") or {}).get(c)},
                       "partnerships": [{"pattern": v["pattern"], "members": v["members"], "fam": v["fam"],
                                         "level": v["level"], "active": v["active"]} for v in parts],
                       "difficulty": bb.get("difficulty", "normal"), "staff": copy.deepcopy(bb.get("staff") or {}),
                       "familiarity": system_familiarity(bb, system["id"]) if system else None,
                       "kickoff_modifiers": mods, "kickoff_layered": True, "policy_table": copy.deepcopy(policy_table)}
        if bb.get("deck"):
            canon[team]["deck"] = list(bb["deck"])
        if system is not None and system.get("custom"):
            canon[team]["custom_system"] = bb.get("custom_system")
    out["builds"] = canon
    out["_build_prepared"] = CATALOG_VERSION
    return out


def active_traits(body: dict[str, Any], team: str) -> dict[str, Any]:
    """Kick-off trait bar for ``team`` of a PREPARED request (uses base attrs)."""
    bb = (body.get("builds") or {}).get(team) or {}
    side = body.get("home_team" if team == "HOME" else "away_team") or {}
    mods = bb.get("kickoff_modifiers") or {}
    lineup = {}
    for fs, p in (side.get("lineup") or {}).items():
        if not p:
            continue
        q = copy.deepcopy(p)
        for k, x in ((mods.get(str(p["id"])) or {}) if not bb.get("kickoff_layered") else {}).items():
            if k in q.get("a", {}):
                q["a"][k] = float(q["a"][k]) - float(x)
        lineup[fs] = q
    sid = bb.get("system_id")
    if not sid:
        return {"traits": [], "system_fit": None}
    system = get_system(sid, bb)
    fam = {sid: bb.get("familiarity") or CONST["sys_default"]}
    squad = list(lineup.values())
    ev = evaluate(squad, {fs: str(p["id"]) for fs, p in lineup.items()} if str(side.get("formation")) == system["formation"]
                  else {}, sid, {"partnerships": bb.get("partnerships"), "familiarity": fam,
                                 "custom_system": bb.get("custom_system")})
    return {"traits": ev["traits"], "system_fit": ev["system_fit"] if str(side.get("formation")) == system["formation"] else None,
            "slot_fit": ev["slot_fit"], "squad_eval": ev}


# ═════════════════════════════════════════════════════════════════════════════
# REVIEW SUPPORT (§6.3): pillar metrics, partnership events, next steps
# ═════════════════════════════════════════════════════════════════════════════
def pillar_metrics(events: list[dict[str, Any]], team: str, player_stats: dict[str, Any] | None = None,
                   team_stats: dict[str, Any] | None = None) -> dict[str, float]:
    other = _other(team)
    ps = player_stats or {}
    slot = {pid: p.get("slot") for pid, p in ps.items()}
    m: dict[str, float] = {}
    # recoveries within 5 s of losing the ball
    lost_at = None
    rec5 = 0
    for e in events:
        if e["event_type"] == "POSSESSION_CHANGE":
            d = e.get("detail") or {}
            if d.get("from") == team:
                lost_at = int(e["timestamp"])
            elif d.get("to") == team and lost_at is not None:
                if int(e["timestamp"]) - lost_at <= 5:
                    rec5 += 1
                lost_at = None
    m["recoveries_5s"] = rec5
    be_f = sum(1 for e in events if e["event_type"] == "BOX_ENTRY" and e.get("team_id") == team)
    be_a = sum(1 for e in events if e["event_type"] == "BOX_ENTRY" and e.get("team_id") == other)
    m["box_entries"], m["box_entries_against"] = be_f, be_a
    m["field_tilt"] = round(be_f / max(1, be_f + be_a), 3)
    shots = [e for e in events if e["event_type"] == "SHOT" and e.get("team_id") == team]
    shots_a = [e for e in events if e["event_type"] == "SHOT" and e.get("team_id") == other]
    m["transition_shots"] = sum(1 for e in shots if (e.get("detail") or {}).get("transition"))
    m["headed_shots"] = sum(1 for e in shots if (e.get("detail") or {}).get("shot_type") == "HEADER")
    m["crosses"] = sum(1 for e in events if e["event_type"] == "CROSS" and e.get("team_id") == team)
    xg_f = sum(float((e.get("detail") or {}).get("xg", 0)) for e in shots)
    xg_a = sum(float((e.get("detail") or {}).get("xg", 0)) for e in shots_a)
    xg_f += bridge.ledger_penalty_xg(events, team)
    xg_a += bridge.ledger_penalty_xg(events, other)
    m["xg_for"], m["xg_against"] = round(xg_f, 2), round(xg_a, 2)
    penalty_chances = sum(1 for e in events if e["event_type"] == "PENALTY" and e.get("team_id") == team)
    m["xg_per_shot"] = round(xg_f / max(1, len(shots) + penalty_chances), 3)
    fb = {pid for pid, s in slot.items() if s in GROUPS["FB"] and ps[pid].get("team_id") == team}
    wide = {pid for pid, s in slot.items() if s in GROUPS["W"] and ps[pid].get("team_id") == team}
    m["fb_final_third"] = sum(1 for e in events if e.get("team_id") == team and e.get("actor_id") in fb
                              and e["event_type"] in ("BOX_ENTRY", "CROSS"))
    m["winger_shots"] = sum(1 for e in shots if e.get("actor_id") in wide)
    m["winger_xg"] = round(sum(float((e.get("detail") or {}).get("xg", 0)) for e in shots if e.get("actor_id") in wide), 2)
    m["long_passes"] = sum(1 for e in events if e["event_type"] == "PASS" and e.get("team_id") == team
                           and (e.get("detail") or {}).get("pass_type") == "LONG")
    names_team = {p.get("name") for pid, p in ps.items() if p.get("team_id") == team}
    aer = [e for e in events if e["event_type"] == "AERIAL_DUEL"]
    won = sum(1 for e in aer if (e.get("detail") or {}).get("winner") in names_team)
    m["aerials_won_share"] = round(won / max(1, len(aer)), 3)
    m["defensive_actions"] = sum(1 for e in events if e.get("team_id") == team and e["event_type"] == "CLEARANCE") + \
        sum(int(p.get("interceptions", 0)) for p in ps.values() if p.get("team_id") == team)
    contrib = {e.get("actor_id") for e in shots}
    contrib |= {pid for pid, p in ps.items() if p.get("team_id") == team and int(p.get("key_passes", 0)) > 0}
    m["contributors"] = len({c for c in contrib if c})
    ts = team_stats or {}
    if ts:
        m["possession"] = float(ts.get("possession", 50))
        m["pass_completion"] = float(ts.get("pass_completion", 0))
    return m


def grade_pillar(p: dict[str, Any], value: float) -> str:
    b = float(p["benchmark"])
    hib = p.get("higher_is_better", True)
    ratio = (value / b) if hib else (b / max(1e-6, value))
    if value == 0 and not hib:
        ratio = 2.0
    return "strong" if ratio >= 1.15 else "ok" if ratio >= 0.85 else "weak"


def partnership_events(events: list[dict[str, Any]], team: str, pt: dict[str, Any],
                       names: dict[str, str]) -> dict[str, Any]:
    """Events where the members combined (read-only from the ledger)."""
    pattern = pt.get("pattern")
    roles = PATTERNS.get(pattern, {}).get("roles", [])
    mem = dict(zip(roles, [str(m) for m in pt.get("members") or []]))
    nm = {r: names.get(pid, pid) for r, pid in mem.items()}
    ids = set(mem.values())
    out: dict[str, Any] = {"combos": 0, "shots": 0, "goals": 0, "moments": []}

    def mom(e, text):
        out["moments"].append({"minute": max(1, (int(e["timestamp"]) + 59) // 60), "text": text})
    for e in events:
        et, d, a = e["event_type"], e.get("detail") or {}, e.get("actor_id")
        if pattern == "cross_head":
            if et == "CROSS" and a == mem.get("crosser") and nm.get("target") in (d.get("decision_target"), d.get("primary_attacker")):
                out["combos"] += 1
            if et == "SHOT" and a == mem.get("target") and d.get("shot_type") == "HEADER":
                out["shots"] += 1
            if et == "GOAL" and a == mem.get("target") and d.get("assist") == nm.get("crosser"):
                out["goals"] += 1; mom(e, f"{_short(nm['crosser'])} → {_short(nm['target'])}: goal")
        elif pattern in ("one_two", "through_ball", "overlap"):
            pair = list(mem.values())
            if et == "PASS" and a in ids and d.get("target_id") in ids and d.get("target_id") != a:
                if pattern != "through_ball" or d.get("pass_type") == "THROUGH":
                    out["combos"] += 1
            if et == "SHOT" and a in ids:
                out["shots"] += 1
            if et == "GOAL" and a in ids and d.get("assist") in {names.get(p) for p in pair if p != a}:
                out["goals"] += 1; mom(e, f"{' → '.join(_short(names.get(p, p)) for p in pair if p != a)} → {_short(e.get('actor_name'))}: goal")
        elif pattern in ("cb_pair", "keeper_line"):
            if et in ("TACKLE", "CLEARANCE", "RECOVERY") and a in ids:
                out["combos"] += 1
            if et == "GOAL" and e.get("team_id") != team:
                out["goals"] -= 1
        elif pattern == "pressing_trio":
            if et == "RECOVERY" and a in ids:
                out["combos"] += 1
            if et == "TACKLE" and a in ids and d.get("outcome") == "CLEAN_WIN":
                out["combos"] += 1
    label = {"cross_head": "crosses from {crosser} aimed at {target}", "one_two": "passes between them",
             "through_ball": "through balls between them", "overlap": "passes between them",
             "cb_pair": "tackles, clearances and recoveries", "keeper_line": "tackles, clearances and recoveries",
             "pressing_trio": "ball wins by the trio"}.get(pattern, "combined actions")
    out["label"] = label.format(**{k: _short(v) for k, v in nm.items()})
    out["for_you"] = out["goals"] > 0 or out["combos"] >= 3 if pattern not in ("cb_pair", "keeper_line") else out["goals"] >= 0
    return out


def next_steps(squad: list[dict[str, Any]], xi: dict[str, str], system_id: str, build: dict[str, Any] | None,
               weak_pillars: list[str] | None = None, limit: int = 4) -> list[dict[str, Any]]:
    b = _norm_build(build)
    ev = evaluate(squad, xi, system_id, b)
    sq = _squad_index(squad)
    system = get_system(system_id, b)
    steps: list[dict[str, Any]] = []
    thresholds = {"engine_room": ("stam", CONST["engine_room_stam"], GROUPS["MID"]),
                  "pace_in_behind": ("spr", CONST["pace_spr"], GROUPS["FRONT"]),
                  "aerial_threat": ("hea", CONST["aerial_hea"], None)}
    eslot = {fs: engine_slot(system["formation"], fs) for fs in xi}
    for t in ev["traits"]:
        if t["active"] or t["id"] not in thresholds:
            continue
        attr, th, grp = thresholds[t["id"]]
        missing = t["need"] - t["count"]
        if missing > 2:
            continue
        cands = []
        for fs, pid in xi.items():
            p = sq[pid]
            if pid in t["members"] or (grp is not None and eslot.get(fs) not in grp):
                continue
            if t["id"] == "aerial_threat" and float(p.get("ht") or 0) < CONST["aerial_ht"]:
                continue
            cur = pval(p, attr)
            if cur < th:
                n = tp_needed(p, attr, th, b)
                if n is not None:
                    cands.append((n, pid, cur))
        cands.sort()
        if cands:
            n, pid, cur = cands[0]
            steps.append({"kind": "trait", "id": t["id"], "tp": n, "pid": pid,
                          "text": f"{t['name']} is {missing} player{'s' if missing > 1 else ''} away: "
                                  f"{sq[pid].get('name')} needs {ATTR_LABEL[attr].lower()} {th} "
                                  f"(currently {cur:.0f}, about {n} TP)."})
    for v in ev["partnerships"]:
        if v["next_level_at"] is not None and v["next_level_at"] - v["fam"] <= 15:
            need = v["next_level_at"] - v["fam"]
            tp = int(math.ceil(need / CONST["fam_per_tp"]))
            unlock = f" — unlocks {CARDS[v['card']]['name']}" if v["level"] + 1 == 2 and v.get("card") else ""
            steps.append({"kind": "partnership", "id": v["id"], "tp": tp,
                          "text": f"{v['name']} ({' + '.join(sq.get(m, {}).get('name', m) for m in v['members'])}) is "
                                  f"{need:.0f} familiarity from level {v['level'] + 1} ({tp} TP){unlock}."})
    worst = sorted(((f, fs) for fs, f in ev["slot_fit"].items() if xi.get(fs)), key=lambda x: x[0])[:1]
    for f, fs in worst:
        if f >= 65:
            continue
        cur_pid = xi[fs]
        alt = max(((ev["fit_matrix"][pid][fs], pid) for pid in sq if pid not in xi.values()), default=(0, None))
        dem = list(ev["demands"][fs].items())[:3]
        text = (f"{fs} is your weakest fit ({f}): the role asks for "
                + ", ".join(ATTR_LABEL[k].lower() for k, _w in dem) + ".")
        if alt[1] and alt[0] > f + 5:
            text += f" {sq[alt[1]].get('name')} would fit {alt[0]}."
        steps.append({"kind": "slot", "slot": fs, "pid": cur_pid, "fit": f, "alt": alt[1], "text": text})
    fam = ev["familiarity"]["value"]
    if fam < 70:
        steps.append({"kind": "familiarity", "tp": 2,
                      "text": f"System familiarity is {fam:.0f}: it rises {CONST['sys_week']} a week on its own; "
                              f"2 TP add {2 * CONST['sys_per_tp']} more (reactions/positioning/composure boost now "
                              f"+{familiarity_boost(fam)}, +{CONST['sys_boost_max']:g} at 100)."})
    return steps[:limit]


def review_report(ft: dict[str, Any], request: dict[str, Any], team: str) -> dict[str, Any]:
    """Build evidence from the recorded kickoff inputs and authoritative ledger."""
    bb = (request.get('builds') or {}).get(team) or {}
    if not bb.get('system_id'):
        return {}
    system = get_system(bb['system_id'], bb)
    side = request['home_team' if team == 'HOME' else 'away_team']
    ev = ft.get('events') or []
    stats = dict((ft.get('team_stats') or {}).get('home' if team == 'HOME' else 'away') or {})
    stats['possession'] = (ft.get('possession') or {}).get('home' if team == 'HOME' else 'away', 50)
    metrics = pillar_metrics(ev, team, ft.get('player_stats'), stats)
    pillars = [dict(p, value=metrics.get(p['metric'], 0), grade=grade_pillar(p, metrics.get(p['metric'], 0)))
               for p in system.get('pillars', [])]
    names = {str(p['id']): p['name'] for key in ('home_team', 'away_team')
             for p in list((request[key].get('lineup') or {}).values()) + list(request[key].get('bench') or []) if p}
    parts = []
    for p in bb.get('partnerships') or []:
        counts = partnership_events(ev, team, p, names)
        parts.append(dict(p, name=PATTERNS[p['pattern']]['name'], member_names=[names.get(m,m) for m in p['members']],
                          events={k:counts[k] for k in ('combos','shots','goals')},
                          grade='good' if counts['for_you'] else 'poor', text=counts['label']))
    at = active_traits(request, team)
    normalized = dict(bb, familiarity={system['id']: bb.get('familiarity', 0)})
    lineup = side.get('lineup') or {}
    xi = {slot: str(p['id']) for slot,p in lineup.items() if p}
    squad = [p for p in lineup.values() if p] + list(side.get('bench') or [])
    steps = next_steps(squad, xi, system['id'], normalized) if str(side.get('formation')) == system['formation'] else []
    cards = [dict(e.get('detail') or {}, clock=e['timestamp'], minute=max(1,(e['timestamp']+59)//60))
             for e in ev if e['event_type']=='CARD_PLAYED' and e.get('team_id')==team]
    fit = at.get('slot_fit') or {}
    grades = [dict(id=p['id'], name=p['name'], slot=slot, fit=fit.get(slot),
                   rating=(ft.get('player_stats') or {}).get(str(p['id']),{}).get('rating'),
                   role=system_slots(system).get(slot,{}).get('instr',{}).get('attackRole')) for slot,p in lineup.items() if p]
    return {'system_id':system['id'], 'system_fit':at.get('system_fit'), 'system_report':{'name':system['name'],'pillars':pillars},
            'partnership_report':parts, 'card_report':cards, 'player_grades':grades, 'next_steps':steps}


def minimum_deck_size(manager_build: dict[str, Any] | None) -> int:
    """Custom builds may start below ten until more useful cards unlock."""
    return min(CONST["deck_min"], len(unlocked_cards(manager_build)))
