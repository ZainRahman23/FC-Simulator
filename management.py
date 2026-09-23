"""Management appliers + deterministic engine construction.

The ONE code path through which a manager decision reaches the engine — used
by live requests, restart recovery, what-if branches, scenario takeovers and
Decision Lab counterfactual workers alike. Importable without the web app
(no FastAPI / persistence imports), so worker processes can use it.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT / "simulator") not in sys.path:
    sys.path.insert(0, str(ROOT / "simulator"))

from fc_simulator.engine import MatchEngine  # noqa: E402

import bridge  # noqa: E402
from bridge import BridgeError  # noqa: E402


def _team_id(v: str) -> str:
    t = str(v).upper()
    if t not in ("HOME", "AWAY"):
        raise BridgeError(f"team must be HOME or AWAY, got '{v}'")
    return t


class _BenchCondition:
    """Starting Energy for substitutes: wraps the engine's own
    ``_make_substitution`` (called unchanged) and then sets the incoming
    player's Energy from his ``cond``. Covers manager AND coach-AI subs.
    A plain picklable object (engine checkpoints / worker transfer)."""

    def __init__(self, engine: MatchEngine, cond: dict[str, float]):
        self.engine = engine
        self.cond = cond

    def __call__(self, team_id, outgoing, incoming, target_slot=None,
                 reason="FATIGUE_PERFORMANCE_DISCIPLINE"):
        MatchEngine._make_substitution(self.engine, team_id, outgoing, incoming,
                                       target_slot=target_slot, reason=reason)
        st = self.engine.states.get(incoming.player_id)
        if st is not None and incoming.player_id in self.cond and st.minute_on == self.engine.clock // 60:
            st.energy = self.cond[incoming.player_id]


def build_engine(start_request: dict[str, Any]) -> MatchEngine:
    """Engine from a kickoff request. Optional per-player ``cond`` (0-100) on
    lineup AND bench entries is the player's match condition carried over
    from recent workload: it becomes the starting Energy (for a substitute,
    his Energy when he comes on; the engine's own fatigue model then does
    the rest). Part of the persisted request, so replay-exact."""
    home = bridge.build_team(start_request["home_team"], "HOME")
    away = bridge.build_team(start_request["away_team"], "AWAY")
    config = bridge.build_config(start_request.get("config"), start_request.get("coach_ai"))
    engine = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, int(start_request["seed"]), config)
    for side_key in ("home_team", "away_team"):
        for pdata in (start_request[side_key].get("lineup") or {}).values():
            if not pdata or pdata.get("cond") is None:
                continue
            st = engine.states.get(str(pdata["id"]))
            if st is not None:
                st.energy = max(40.0, min(100.0, float(pdata["cond"])))
    bench_cond = {str(p["id"]): max(40.0, min(100.0, float(p["cond"])))
                  for side_key in ("home_team", "away_team")
                  for p in (start_request[side_key].get("bench") or [])
                  if p and p.get("cond") is not None and float(p["cond"]) < 100.0}
    if bench_cond:
        engine._make_substitution = _BenchCondition(engine, bench_cond)
    return engine


def _apply_tactics(engine: MatchEngine, payload: dict[str, Any]) -> None:
    tid = _team_id(payload["team"])
    new_tactics = bridge.map_tactics(payload["tactics"])
    team = engine.teams[tid]
    team.tactics = new_tactics
    engine.base_tactics[tid] = new_tactics
    engine._record_event("TACTIC_CHANGE", tid, None,
                         {"mode": "MANAGER", "minute": round(engine.clock / 60.0, 1)})


def _apply_instructions(engine: MatchEngine, payload: dict[str, Any]) -> None:
    tid = _team_id(payload["team"])
    state = engine.states.get(payload["player_id"])
    if not state or state.team_id != tid:
        raise BridgeError(f"Player '{payload['player_id']}' is not in this match for {tid}")
    if not state.active:
        raise BridgeError(f"{state.player.name} is no longer on the pitch")
    ins = bridge.map_instructions(payload["instructions"])
    state.instructions = ins
    engine.teams[tid].instructions[state.slot] = ins
    engine._record_event("INSTRUCTION_CHANGE", tid, state,
                         {"slot": state.slot, "minute": round(engine.clock / 60.0, 1),
                          "attack_role": ins.attack_role, "attack_effort": ins.attack_effort,
                          "defense_role": ins.defense_role, "defense_effort": ins.defense_effort})


def _apply_formation(engine: MatchEngine, payload: dict[str, Any]) -> str:
    tid = _team_id(payload["team"])
    target = bridge.map_formation(payload["formation"])
    engine._change_formation(tid, target, reason="MANAGER")
    engine.base_formations[tid] = target
    return target


def _apply_substitution(engine: MatchEngine, payload: dict[str, Any]) -> None:
    tid = _team_id(payload["team"])
    team = engine.teams[tid]
    out_state = engine.states.get(payload["player_off"])
    if not out_state or out_state.team_id != tid:
        raise BridgeError("Outgoing player is not in this match for that team")
    if not out_state.active:
        raise BridgeError(f"{out_state.player.name} is not on the pitch")
    incoming = next((p for p in team.bench if p.player_id == payload["player_on"]), None)
    if incoming is None:
        raise BridgeError("Incoming player is not on the bench")
    if payload["player_on"] in engine.states and engine.states[payload["player_on"]].active:
        raise BridgeError("Incoming player is already on the pitch")
    if engine.substitutions_used[tid] >= 5:
        raise BridgeError("All five substitutions have been used")
    slot = payload.get("target_slot") or out_state.slot
    from fc_simulator.formations import FORMATIONS as EF
    if slot not in EF[team.formation_name]:
        raise BridgeError(f"Slot '{slot}' does not exist in {team.formation_name}")
    engine._make_substitution(tid, out_state, incoming, target_slot=slot, reason="MANAGER")


APPLIERS = {"tactics": _apply_tactics, "instructions": _apply_instructions,
             "formation": _apply_formation, "substitution": _apply_substitution}
