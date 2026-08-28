from __future__ import annotations

import json
from dataclasses import fields, replace
from pathlib import Path
from .models import Player, PlayerInstructions, Team, TeamTactics
from .formations import FORMATION_REMAP_FROM_433, FORMATIONS
from .tactics import default_instructions, validate_role, validate_tactic

REQUIRED_POSITIONS = ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LW", "ST", "RW"]
SLOTS = ["GK", "LB", "LCB", "RCB", "RB", "CDM", "LCM", "RCM", "LW", "ST", "RW"]


def load_player_payload(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_players(path: str | Path) -> tuple[list[Player], dict[str, dict[str, float]]]:
    payload = load_player_payload(path)
    players = [
        Player(
            player_id=p["player_id"],
            name=p["name"],
            primary_position=p["primary_position"],
            preferred_foot=p.get("preferred_foot", "R"),
            weak_foot=int(p.get("weak_foot", 3)),
            natural_side=p.get("natural_side", "C"),
            height_cm=p.get("height_cm"),
            weight_kg=p.get("weight_kg"),
            attributes={k: float(v) for k, v in p.get("attributes", {}).items()},
            ovr=int(p.get("ovr", 0)),
            pot=int(p.get("pot", 0)),
            age=int(p.get("age", 0)),
        )
        for p in payload["players"]
    ]
    return players, payload.get("attribute_stats", {})


def _pick_two_lineups(players: list[Player]) -> tuple[dict[str, Player], dict[str, Player], list[Player], list[Player]]:
    unused = list(players)
    home: dict[str, Player] = {}
    away: dict[str, Player] = {}

    def candidates(pos: str) -> list[Player]:
        if pos == "CM":
            order = ("CM", "CAM", "CDM")
        elif pos == "CDM":
            order = ("CDM", "CM")
        else:
            order = (pos,)
        result = [p for p in unused if p.primary_position in order]
        return sorted(result, key=lambda p: players.index(p))

    for req, slot in zip(REQUIRED_POSITIONS, SLOTS):
        pool = candidates(req)
        if len(pool) < 2:
            raise ValueError(f"Need at least two available players for {req}")
        h, a = pool[0], pool[1]
        home[slot] = h
        away[slot] = a
        unused.remove(h)
        unused.remove(a)

    home_bench: list[Player] = []
    away_bench: list[Player] = []
    for pos in ("GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "ST", "RW"):
        pool = [p for p in unused if p.primary_position == pos]
        if pool:
            home_bench.append(pool[0]); unused.remove(pool[0])
        pool = [p for p in unused if p.primary_position == pos]
        if pool:
            away_bench.append(pool[0]); unused.remove(pool[0])
    return home, away, home_bench, away_bench


def build_demo_teams(players: list[Player]) -> tuple[Team, Team]:
    h, a, hb, ab = _pick_two_lineups(players)
    hinst = {slot: default_instructions(slot) for slot in h}
    ainst = {slot: default_instructions(slot) for slot in a}
    return (
        Team("HOME", "Demo XI A", h, TeamTactics(), hinst, hb),
        Team("AWAY", "Demo XI B", a, TeamTactics(), ainst, ab),
    )


def build_mirrored_demo_teams(players: list[Player]) -> tuple[Team, Team]:
    """Build two attribute-identical XIs for calibration/counterfactual experiments.

    Away players are cloned with unique IDs so runtime state remains unambiguous.
    This removes the ranking-order quality gap intentionally present in build_demo_teams.
    """
    home, _ = build_demo_teams(players)
    away_lineup = {
        slot: replace(player, player_id=f"{player.player_id}_mirror", name=f"{player.name} (Mirror)")
        for slot, player in home.lineup.items()
    }
    away_bench = [replace(player, player_id=f"{player.player_id}_mirror_b", name=f"{player.name} (Mirror)") for player in home.bench]
    away_instructions = {slot: default_instructions(slot) for slot in away_lineup}
    away = Team("AWAY", "Mirror XI", away_lineup, TeamTactics(), away_instructions, away_bench, home.formation_name)
    home.name = "Mirror XI"
    return home, away


def apply_plan(team: Team, plan_path: str | Path) -> Team:
    payload = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    requested_formation = str(payload.get("formation", team.formation_name))
    if requested_formation not in FORMATIONS:
        raise ValueError(f"Unsupported formation {requested_formation}; supported={sorted(FORMATIONS)}")
    if requested_formation != team.formation_name:
        if team.formation_name != "4-3-3":
            raise ValueError("Current remapping supports pre-kickoff conversion from 4-3-3 only")
        mapping = FORMATION_REMAP_FROM_433[requested_formation]
        new_lineup = {}
        new_instructions = {}
        for old_slot, player in team.lineup.items():
            new_slot = mapping[old_slot]
            new_lineup[new_slot] = player
            new_instructions[new_slot] = default_instructions(new_slot)
        team.lineup = new_lineup
        team.instructions = new_instructions
        team.formation_name = requested_formation
    valid_tactics = {f.name for f in fields(TeamTactics)}
    tactical = {k: validate_tactic(k, v) for k, v in payload.get("tactics", {}).items() if k in valid_tactics}
    team.tactics = TeamTactics(**{**team.tactics.__dict__, **tactical})
    for slot, config in payload.get("instructions", {}).items():
        if slot not in team.lineup:
            continue
        base = team.instructions.get(slot, default_instructions(slot))
        team.instructions[slot] = PlayerInstructions(
            attack_role=validate_role(config.get("attack_role", base.attack_role), True),
            attack_effort=max(0, min(100, int(config.get("attack_effort", base.attack_effort)))),
            defense_role=validate_role(config.get("defense_role", base.defense_role), False),
            defense_effort=max(0, min(100, int(config.get("defense_effort", base.defense_effort)))),
        )
    return team
