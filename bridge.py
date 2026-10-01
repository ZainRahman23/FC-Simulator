"""Touchline ⇄ FC Simulator v0.7 bridge.

One explicit mapping layer between the frontend's compact vocabulary and the
engine's. Validation errors are raised as BridgeError with readable messages;
nothing is silently corrected or remapped.

The bridge sends the engine only: lineup, formation, 13 tactics, roles/effort,
substitutions, seed. It never sends OVR into resolution (metadata only on the
Player object), never sends UI pitch coordinates, and never sends finances.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fc_simulator.models import MatchConfig, Player, PlayerInstructions, Team, TeamTactics
from fc_simulator.tactics import default_instructions, validate_role, validate_tactic
from fc_simulator.formations import FORMATIONS as ENGINE_FORMATIONS

ENGINE_NAME = "FC Simulator"
ENGINE_VERSION = "0.7"
try:
    from fc_simulator.calibration import CALIBRATION_VERSION
except ImportError:
    CALIBRATION_VERSION = "v0.7-default"

# Player-data version travels with every persisted match so a reproduction
# bundle can refuse to pretend exactness under a different database.
try:
    import json as _json
    from pathlib import Path as _Path
    PLAYER_DATA_VERSION = _json.load(open(_Path(__file__).resolve().parent / "simulator" / "data" / "players.json"))["data_version"]
except Exception:
    PLAYER_DATA_VERSION = "unknown"

_SIM_DIR = Path(__file__).resolve().parent / "simulator"
ATTRIBUTE_STATS: dict[str, dict[str, float]] = json.loads(
    (_SIM_DIR / "data" / "players.json").read_text(encoding="utf-8")
)["attribute_stats"]


class BridgeError(ValueError):
    pass


# ── attributes: frontend compact key → engine key ────────────────────────────
# NOTE: frontend 'sta' is STANDING TACKLE and 'stam' is STAMINA.
#       players-v3 migration: the ambiguous 'bal' key is RETIRED. 'bco' is
#       Ball Control and 'bln' is Balance — any stale 'bal' now fails loudly.
ATTR_MAP = {
    "acc": "acceleration", "spr": "sprint_speed", "agi": "agility", "rea": "reactions",
    "bco": "ball_control", "bln": "balance", "dri": "dribbling",
    "fka": "free_kick_accuracy", "pen": "penalties", "cmp": "composure", "cur": "curve",
    "sps": "short_passing", "lps": "long_passing", "vis": "vision", "cro": "crossing",
    "fin": "finishing", "apo": "attacking_position", "shp": "shot_power",
    "lsh": "long_shots", "vol": "volleys", "hea": "heading_accuracy",
    "daw": "defensive_awareness", "sta": "standing_tackle", "sli": "sliding_tackle",
    "int": "interceptions",
    "str": "strength", "stam": "stamina", "agg": "aggression", "jum": "jumping",
    "gkd": "gk_diving", "gkh": "gk_handling", "gkk": "gk_kicking",
    "gkp": "gk_positioning", "gkr": "gk_reflexes",
}

# ── team tactics: frontend camelCase key → engine snake_case field ───────────
TACTIC_KEY_MAP = {
    "buildUpTempo": "build_up_tempo",
    "passingDirectness": "passing_directness",
    "progressionRisk": "progression_risk",
    "attackingWidth": "attacking_width",
    "chanceCreationFocus": "chance_creation_focus",
    "boxCommitment": "box_commitment",
    "afterWinningPossession": "after_winning_possession",
    "afterLosingPossession": "after_losing_possession",
    "defensiveBlockHeight": "defensive_block_height",
    "pressingIntensity": "pressing_intensity",
    "defensiveWidth": "defensive_width",
    "markingOrientation": "marking_orientation",
    "defensiveLineBehavior": "defensive_line_behavior",
}

# ── tactic values: frontend readable → engine enum ───────────────────────────
TACTIC_VALUE_MAP = {
    "Patient": "PATIENT", "Balanced": "BALANCED", "Quick": "QUICK",
    "Short": "SHORT", "Mixed": "MIXED", "Direct": "DIRECT",
    "Secure": "SECURE", "Ambitious": "AMBITIOUS",
    "Narrow": "NARROW", "Wide": "WIDE",
    "Central": "CENTRAL", "Vertical": "VERTICAL",
    "Cautious": "CAUTIOUS", "Commit": "COMMIT",
    "Counter": "COUNTER",
    "Regroup": "REGROUP", "Counterpress": "COUNTERPRESS",
    "Deep": "DEEP", "Mid": "MID", "High": "HIGH",
    "Passive": "PASSIVE", "Selective": "SELECTIVE",
    "Aggressive": "AGGRESSIVE", "Relentless": "RELENTLESS",
    "Zonal": "ZONAL", "Hybrid": "HYBRID", "Man-Oriented": "MAN_ORIENTED",
    "Drop": "DROP", "Hold": "HOLD", "Step Up": "STEP_UP",
}

# ── player roles: frontend readable → engine enum (explicit, no blind upper) ─
ATTACK_ROLE_MAP = {
    "Short Build-Up": "SHORT_BUILD_UP", "Mixed Distributor": "MIXED_DISTRIBUTOR",
    "Direct Distributor": "DIRECT_DISTRIBUTOR", "Support Keeper": "SUPPORT_KEEPER",
    "Hold & Recycle": "HOLD_RECYCLE", "Distributor": "DISTRIBUTOR",
    "Carry Forward": "CARRY_FORWARD", "Wide Advance": "WIDE_ADVANCE",
    "Support": "SUPPORT", "Overlap": "OVERLAP", "Underlap": "UNDERLAP", "Invert": "INVERT",
    "Anchor": "ANCHOR", "Deep Playmaker": "DEEP_PLAYMAKER",
    "Drop Between CBs": "DROP_BETWEEN_CBS", "Advance Support": "ADVANCE_SUPPORT",
    "Controller": "CONTROLLER", "Creator": "CREATOR", "Runner": "RUNNER", "Roamer": "ROAMER",
    "Connector": "CONNECTOR", "Second Striker": "SECOND_STRIKER", "Free Roam": "FREE_ROAM",
    "Wide Support": "WIDE_SUPPORT", "Winger": "WINGER", "Wide Runner": "WIDE_RUNNER",
    "Touchline Winger": "TOUCHLINE_WINGER", "Inside Forward": "INSIDE_FORWARD",
    "Wide Creator": "WIDE_CREATOR", "Free Forward": "FREE_FORWARD",
    "Poacher": "POACHER", "Run Behind": "RUN_BEHIND", "Target": "TARGET", "Link": "LINK",
}
DEFENSE_ROLE_MAP = {
    "Line Keeper": "LINE_KEEPER", "Sweeper": "SWEEPER",
    "Aggressive Sweeper": "AGGRESSIVE_SWEEPER", "Area Commander": "AREA_COMMANDER",
    "Hold Line": "HOLD_LINE", "Step Out": "STEP_OUT", "Cover": "COVER", "Tight Mark": "TIGHT_MARK",
    "Hold Wide": "HOLD_WIDE", "Press Wide": "PRESS_WIDE", "Tuck In": "TUCK_IN",
    "Track Runner": "TRACK_RUNNER",
    "Screen": "SCREEN", "Ball Hunt": "BALL_HUNT", "Track Runners": "TRACK_RUNNERS",
    "Backline Cover": "BACKLINE_COVER",
    "Hold Zone": "HOLD_ZONE", "Press": "PRESS", "Track": "TRACK",
    "Stay High": "STAY_HIGH", "Screen Pivot": "SCREEN_PIVOT", "Track Midfield": "TRACK_MIDFIELD",
    "Track Fullback": "TRACK_FULLBACK", "Press Fullback": "PRESS_FULLBACK",
    "Tuck Into Block": "TUCK_INTO_BLOCK", "Press CBs": "PRESS_CBS",
    "Drop Into Block": "DROP_INTO_BLOCK",
}

# ── formations: frontend id → engine name, frontend slot → engine slot ───────
FORMATION_NAME_MAP = {"433": "4-3-3", "4231": "4-2-3-1", "4141": "4-1-4-1",
                      # Core Loop v2 E3 (ENGINE CHANGE): frontend slot ids == engine slot ids
                      "442": "4-4-2", "343": "3-4-3", "532": "5-3-2"}
SLOT_MAP = {
    "433":  {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
             "LCM": "LCM", "CM": "CDM", "RCM": "RCM", "LW": "LW", "ST": "ST", "RW": "RW"},
    "4231": {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
             "LDM": "LDM", "RDM": "RDM", "LW": "LAM", "CAM": "CAM", "RW": "RAM", "ST": "ST"},
    "4141": {"GK": "GK", "LB": "LB", "LCB": "LCB", "RCB": "RCB", "RB": "RB",
             "CDM": "CDM", "LM": "LM", "LCM": "LCM", "RCM": "RCM", "RM": "RM", "ST": "ST"},
}
SUPPORTED_FORMATIONS = sorted(FORMATION_NAME_MAP)


def map_formation(frontend_id: str) -> str:
    fid = str(frontend_id)
    if fid in FORMATION_NAME_MAP:
        return FORMATION_NAME_MAP[fid]
    if fid in ENGINE_FORMATIONS:
        return fid
    raise BridgeError(
        f"Formation '{frontend_id}' is not yet supported by FC Simulator v{ENGINE_VERSION}. "
        f"Supported: 4-3-3, 4-2-3-1, 4-1-4-1, 4-4-2, 3-4-3, 5-3-2.")


def map_tactics(frontend: dict[str, Any]) -> TeamTactics:
    values: dict[str, str] = {}
    for fkey, value in (frontend or {}).items():
        if fkey not in TACTIC_KEY_MAP:
            raise BridgeError(f"Unknown tactic '{fkey}'")
        ekey = TACTIC_KEY_MAP[fkey]
        if value not in TACTIC_VALUE_MAP:
            raise BridgeError(f"Unknown value '{value}' for tactic '{fkey}'")
        values[ekey] = validate_tactic(ekey, TACTIC_VALUE_MAP[value])
    return TeamTactics(**values)


def map_instructions(frontend: dict[str, Any]) -> PlayerInstructions:
    atk = frontend.get("attackRole")
    dfn = frontend.get("defenseRole")
    if atk not in ATTACK_ROLE_MAP:
        raise BridgeError(f"Unknown attack role '{atk}'")
    if dfn not in DEFENSE_ROLE_MAP:
        raise BridgeError(f"Unknown defense role '{dfn}'")
    return PlayerInstructions(
        attack_role=validate_role(ATTACK_ROLE_MAP[atk], True),
        attack_effort=max(0, min(100, int(frontend.get("attackEffort", 50)))),
        defense_role=validate_role(DEFENSE_ROLE_MAP[dfn], False),
        defense_effort=max(0, min(100, int(frontend.get("defenseEffort", 50)))),
    )


def map_player(d: dict[str, Any]) -> Player:
    if not d.get("id") or not d.get("name"):
        raise BridgeError(f"Player missing id/name: {d.get('id')}/{d.get('name')}")
    attrs_in = d.get("a") or {}
    missing = [k for k in ATTR_MAP if k not in attrs_in]
    if missing:
        raise BridgeError(f"Player '{d['name']}' missing attributes: {missing}")
    return Player(
        player_id=str(d["id"]),
        name=str(d["name"]),
        primary_position=str(d.get("pos", "CM")),
        preferred_foot=str(d.get("foot", "R")),
        weak_foot=int(d.get("wf", 3)),
        natural_side=str(d.get("side", "C")),
        height_cm=float(d["ht"]) if d.get("ht") is not None else None,
        weight_kg=float(d["wt"]) if d.get("wt") is not None else None,
        attributes={ATTR_MAP[k]: float(v) for k, v in attrs_in.items() if k in ATTR_MAP},
        ovr=int(d.get("ovr", 0)),   # display metadata only — never in resolution
        pot=int(d.get("pot", 0)),
        age=int(d.get("age", 0)),
    )


def build_team(side: dict[str, Any], team_id: str) -> Team:
    fid = str(side.get("formation", "433"))
    engine_formation = map_formation(fid)
    slot_map = SLOT_MAP.get(fid) or {s: s for s in ENGINE_FORMATIONS[engine_formation]}
    lineup_in = side.get("lineup") or {}

    lineup: dict[str, Player] = {}
    seen: set[str] = set()
    for fslot, pdata in lineup_in.items():
        if fslot not in slot_map:
            raise BridgeError(f"Unknown slot '{fslot}' for formation {engine_formation}")
        if pdata is None:
            raise BridgeError(f"Slot '{fslot}' is empty — 11 starters are required")
        player = map_player(pdata)
        if player.player_id in seen:
            raise BridgeError(f"Duplicate player in lineup: {player.name}")
        seen.add(player.player_id)
        lineup[slot_map[fslot]] = player
    required = set(ENGINE_FORMATIONS[engine_formation].keys())
    if set(lineup) != required:
        raise BridgeError(
            f"Lineup slots {sorted(set(lineup))} do not match {engine_formation} slots {sorted(required)}")
    if lineup["GK"].primary_position != "GK":
        raise BridgeError(f"'{lineup['GK'].name}' is not a goalkeeper")

    bench: list[Player] = []
    for pdata in side.get("bench") or []:
        p = map_player(pdata)
        if p.player_id in seen:
            raise BridgeError(f"Bench player also in lineup: {p.name}")
        seen.add(p.player_id)
        bench.append(p)

    instr_by_pid = side.get("player_instructions") or {}
    instructions: dict[str, PlayerInstructions] = {}
    for eslot, player in lineup.items():
        raw = instr_by_pid.get(player.player_id)
        instructions[eslot] = map_instructions(raw) if raw else default_instructions(eslot)

    return Team(
        team_id=team_id,
        name=str(side.get("name") or side.get("club_id") or team_id),
        lineup=lineup,
        tactics=map_tactics(side.get("tactics") or {}),
        instructions=instructions,
        bench=bench,
        formation_name=engine_formation,
    )


def build_config(cfg: dict[str, Any] | None, coach_ai: dict[str, bool] | None) -> MatchConfig:
    cfg = cfg or {}
    ai = coach_ai or {}
    teams = tuple(t for t, on in (("HOME", ai.get("home", True)), ("AWAY", ai.get("away", True))) if on)
    return MatchConfig(
        duration_seconds=int(cfg.get("duration_seconds", 90 * 60)),
        record_timeline=bool(cfg.get("record_timeline", False)),
        record_rng_audit=bool(cfg.get("record_rng_audit", False)),
        coach_ai_enabled=bool(teams),
        coach_ai_teams=teams,
    )


# ── outbound serialization ───────────────────────────────────────────────────
def ledger_penalty_xg(events, team_id: str) -> float:
    """Penalty chances bypass native SHOT/player xG; reporting includes them."""
    total = 0.0
    for event in events:
        e = event if isinstance(event, dict) else event.to_dict()
        if e.get('event_type') == 'PENALTY' and e.get('team_id') == team_id:
            try:
                total += float((e.get('detail') or {}).get('p_goal') or .76)
            except (TypeError,ValueError):
                total += .76
    return total


def reported_team_stats(stats: dict[str, Any], events, team_id: str) -> dict[str, Any]:
    out = dict(stats)
    if not out.get('xg_includes_penalties'):
        out['non_penalty_xg'] = float(out.get('xg',0))
        out['xg'] = round(out['non_penalty_xg'] + ledger_penalty_xg(events,team_id),3)
        out['xg_includes_penalties'] = True
    return out


def live_team_stats(engine, team_id: str) -> dict[str, Any]:
    ps = [s for s in engine.states.values() if s.team_id == team_id]
    pa = sum(s.passes_attempted for s in ps)
    pc = sum(s.passes_completed for s in ps)
    return reported_team_stats({
        "shots": sum(s.shots for s in ps),
        "shots_on_target": sum(s.shots_on_target for s in ps),
        "xg": round(sum(s.xg for s in ps), 3),
        "goals": sum(s.goals for s in ps),
        "passes_attempted": pa, "passes_completed": pc,
        "pass_completion": round(100.0 * pc / max(1, pa), 1),
        "corners": sum(1 for e in engine.events if e.event_type == "CORNER" and e.team_id == team_id),
        "fouls": sum(s.fouls_committed for s in ps),
        "yellow_cards": sum(s.yellow_cards for s in ps),
        "red_cards": sum(s.red_cards for s in ps),
        "tackles_won": sum(s.tackles_won for s in ps),
        "interceptions": sum(s.interceptions for s in ps),
    }, engine.events, team_id)


def management_state(engine) -> dict[str, Any]:
    """Authoritative live football-management state, straight from engine objects.

    Formation, per-player slot/active/instructions and the 13 team tactics for
    both teams. This is what the frontend renders during a live match — it is
    the single source of truth for management state (read-only serialization;
    it never mutates the engine).
    """
    from dataclasses import fields as dc_fields
    from fc_simulator.models import TeamTactics
    tactic_fields = [f.name for f in dc_fields(TeamTactics)]
    out: dict[str, Any] = {}
    for tid, team in engine.teams.items():
        players = {}
        for pid, st in engine.states.items():
            if st.team_id != tid:
                continue
            players[pid] = {
                "slot": st.slot,
                "active": st.active,
                "subbed_off": st.subbed_off,
                "instructions": {
                    "attack_role": st.instructions.attack_role,
                    "attack_effort": st.instructions.attack_effort,
                    "defense_role": st.instructions.defense_role,
                    "defense_effort": st.instructions.defense_effort,
                },
            }
        out[tid] = {
            "formation": team.formation_name,
            "tactics": {f: getattr(team.tactics, f) for f in tactic_fields},
            "substitutions_used": engine.substitutions_used[tid],
            "players": players,
        }
    return out


def match_snapshot(engine, since_event: int = 0) -> dict[str, Any]:
    poss = engine.possession_seconds
    controlled = max(1, sum(poss.values()))
    return {
        "engine": {"name": ENGINE_NAME, "engine_version": ENGINE_VERSION,
                   "calibration_version": CALIBRATION_VERSION, "seed": engine.seed},
        "clock_seconds": engine.clock,
        "minute": engine.clock // 60,
        "half": 1 if engine.clock < 45 * 60 else 2,
        "status": "ft" if engine.is_finished else "live",
        "score": {"home": engine.score["HOME"], "away": engine.score["AWAY"]},
        "possession": {"home": round(100.0 * poss.get("HOME", 0) / controlled, 1),
                       "away": round(100.0 * poss.get("AWAY", 0) / controlled, 1)},
        "players": {
            pid: {
                "team": s.team_id, "slot": s.slot, "name": s.player.name,
                "energy": round(s.energy, 1), "acute_exertion": round(s.acute_exertion, 1),
                "rating": round(s.match_rating, 2), "active": s.active,
                "x": round(s.pos.x, 1), "y": round(s.pos.y, 1),
                "activity": s.current_activity,
                "goals": s.goals, "assists": s.assists, "shots": s.shots,
                "cards": [s.yellow_cards, s.red_cards],
            } for pid, s in engine.states.items()
        },
        "ball": {   # read-only serialization of the engine's authoritative BallState
            "x": round(engine.ball.pos.x, 2), "y": round(engine.ball.pos.y, 2),
            "control": engine.ball.control_state.value,
            "team": engine.ball.controlling_team_id,
            "player": engine.ball.controlling_player_id,
            "height": engine.ball.height_state.value,
        },
        "possession_team": engine.possession_team,
        "team_stats": {"home": live_team_stats(engine, "HOME"),
                       "away": live_team_stats(engine, "AWAY")},
        "new_events": [e.to_dict() for e in engine.events[since_event:]],
        "event_count": len(engine.events),
        "substitutions_used": dict(engine.substitutions_used),
        "management": management_state(engine),
    }


def full_time_payload(engine, result) -> dict[str, Any]:
    summary = result.summary()
    total_min = engine.config.duration_seconds // 60
    for pid, entry in summary["players"].items():
        st = result.player_states.get(pid)
        if st is None:
            continue
        end = st.minute_off if st.minute_off is not None else total_min
        entry["minutes"] = max(0, end - st.minute_on)
        entry["goals_conceded"] = st.goals_conceded
        entry["active_at_ft"] = st.active
    return {
        "engine": {"name": ENGINE_NAME, "engine_version": ENGINE_VERSION,
                   "calibration_version": CALIBRATION_VERSION, "seed": engine.seed},
        "score": {"home": result.home_score, "away": result.away_score},
        "possession": {"home": summary["possession"].get(result.home, 0.0),
                       "away": summary["possession"].get(result.away, 0.0)},
        "team_stats": {"home": reported_team_stats(summary["team_stats"].get(result.home, {}), result.events, "HOME"),
                       "away": reported_team_stats(summary["team_stats"].get(result.away, {}), result.events, "AWAY")},
        "player_stats": summary["players"],
        "match_dynamics": summary["match_dynamics"],
        "events": [e.to_dict() for e in result.events],
        "active_play_seconds": result.active_play_seconds,
        "dead_ball_seconds": result.dead_ball_seconds,
        "summary_raw": summary,
    }
