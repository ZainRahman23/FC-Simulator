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
        if not _sub_window_available(self.engine, team_id):
            return
        # Crash guard (engine unchanged): the coach AI's red-card restructure
        # can name the dismissed player's slot after a formation change has
        # removed it (e.g. CDM after a switch to 4-2-3-1) -> KeyError. Such a
        # sub goes into the outgoing player's own slot instead.
        if target_slot is not None:
            from fc_simulator.formations import FORMATIONS as _F
            if target_slot not in _F.get(self.engine.teams[team_id].formation_name, {}):
                target_slot = None
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
    engine._make_substitution = _BenchCondition(engine, bench_cond)   # always: also the slot guard
    engine._sub_window_teams = set((start_request.get("builds") or {}).keys())
    # ── Core Loop v2 (ENGINE CHANGE) — every hook inert unless its input is given
    engine._sched_dispatch = dispatch            # scheduled commands use the same appliers
    for side_key, tid in (("home_team", "HOME"), ("away_team", "AWAY")):
        sp = start_request[side_key].get("set_pieces")
        if sp:
            _apply_set_pieces(engine, dict(sp, team=tid), record=False)
    for mod in _as_list(start_request.get("modifiers")):
        _apply_modifiers(engine, dict(mod, source=mod.get("source") or "kickoff"))
    return engine


def _as_list(v) -> list:
    if not v:
        return []
    return list(v) if isinstance(v, (list, tuple)) else [v]


def dispatch(engine: MatchEngine, kind: str, payload: dict[str, Any]) -> Any:
    """Apply one management command (module-level so pickled engines keep it)."""
    if kind not in APPLIERS:
        raise BridgeError(f"Unknown command kind '{kind}'")
    return APPLIERS[kind](engine, payload)


def apply_command(engine: MatchEngine, cmd: dict[str, Any]) -> Any:
    """``cmd`` = {kind, payload[, sim_clock]} as stored in the command log."""
    return dispatch(engine, cmd["kind"], cmd["payload"])


def scheduled(at_clock: int, kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Build a ``schedule`` command: log it (at the current clock, like any
    command) and the engine applies ``{kind, payload}`` right after second
    ``at_clock`` — deterministic under rewind / replay / branch."""
    return {"kind": "schedule", "payload": {"at_clock": int(at_clock),
                                            "command": {"kind": kind, "payload": payload}}}


_LONG_ATTRS = frozenset(bridge.ATTR_MAP.values())


def _attr_key(k: str) -> str:
    if k in _LONG_ATTRS:
        return k
    if k in bridge.ATTR_MAP:
        return bridge.ATTR_MAP[k]
    raise BridgeError(f"Unknown attribute '{k}'")


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
    # 4-2-3-1 <-> 4-1-4-1 stays rejected (tests_integration pins it); every
    # transition involving an E3 shape is supported. Pass extended=True to
    # _change_formation to also allow that legacy pair.
    engine._change_formation(tid, target, reason="MANAGER")
    engine.base_formations[tid] = target
    return target


def _sub_window_available(engine: MatchEngine, tid: str) -> bool:
    """V2: five players in three in-play windows; same-clock subs batch.

    Derived from the ledger, so checkpoints, rewind and card preflight agree.
    The engine's halftime boundary is 2700s and does not consume a window.
    Legacy requests retain their original substitution behavior.
    """
    if tid not in getattr(engine, "_sub_window_teams", set()):
        return True
    halftime = 2700 if engine.config.duration_seconds > 2700 else None
    if engine.clock == halftime:
        return True
    windows = {e.timestamp for e in engine.events
               if e.event_type == "SUBSTITUTION" and e.team_id == tid
               and e.timestamp != halftime}
    return engine.clock in windows or len(windows) < 3


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
    if not _sub_window_available(engine, tid):
        raise BridgeError("All three substitution windows have been used")
    slot = payload.get("target_slot") or out_state.slot
    from fc_simulator.formations import FORMATIONS as EF
    if slot not in EF[team.formation_name]:
        raise BridgeError(f"Slot '{slot}' does not exist in {team.formation_name}")
    engine._make_substitution(tid, out_state, incoming, target_slot=slot, reason="MANAGER")


def _apply_modifiers(engine: MatchEngine, payload: dict[str, Any]) -> None:
    """E2 ``{team, deltas:{pid:{attr:+x}}, until_clock?}``: match-scoped deltas,
    removed when the player or any ``dependency_pids`` partner leaves the
    pitch, or after second ``until_clock``."""
    tid = _team_id(payload["team"])
    deltas = {}
    for pid, dd in (payload.get("deltas") or {}).items():
        if not isinstance(dd, dict):
            raise BridgeError(f"deltas for '{pid}' must be an object {{attr: +x}}")
        clean = {}
        for k, v in dd.items():
            key = _attr_key(str(k))
            clean[key] = clean.get(key, 0.0) + float(v)
        deltas[str(pid)] = clean
    until = payload.get("until_clock")
    try:
        engine.add_modifiers(tid, deltas, None if until is None else int(until), payload.get("source"),
                             payload.get("dependency_pids"))
    except ValueError as e:
        raise BridgeError(str(e))


def _apply_set_pieces(engine: MatchEngine, payload: dict[str, Any], record: bool = True) -> dict[str, Any]:
    """E1/E4 ``{team, corner?, free_kick?, penalty?, corner_routine?}``; a key
    given as null clears it (automatic choice). Takers must belong to the team
    (a taker who is not on the pitch when the kick is awarded falls back to
    the automatic choice)."""
    tid = _team_id(payload["team"])
    own = {pid for pid, st in engine.states.items() if st.team_id == tid}
    own |= {p.player_id for p in engine.teams[tid].bench}
    cfg = {}
    for k in ("corner", "free_kick", "penalty"):
        if k in payload:
            v = payload[k]
            if v and str(v) not in own:
                raise BridgeError(f"{k} taker '{v}' is not in the {tid} squad")
            cfg[k] = v
    if "corner_routine" in payload:
        r = payload["corner_routine"]
        if r:
            t = r.get("target_pid")
            if t and str(t) not in own:
                raise BridgeError(f"corner target '{t}' is not in the {tid} squad")
        cfg["corner_routine"] = r
    try:
        cur = engine.configure_set_pieces(tid, cfg)
    except ValueError as e:
        raise BridgeError(str(e))
    if record:
        engine._record_event("SET_PIECES_CHANGE", tid, None,
                             {"minute": round(engine.clock / 60.0, 1), "set_pieces": cur})
    return cur


def _apply_schedule(engine: MatchEngine, payload: dict[str, Any]) -> None:
    """E2 scheduled command ``{at_clock, command:{kind, payload}}``."""
    inner = payload.get("command") or {}
    kind = inner.get("kind")
    if kind not in APPLIERS or kind == "schedule":
        raise BridgeError(f"Cannot schedule command kind '{kind}'")
    engine.schedule_command(int(payload["at_clock"]), kind, inner.get("payload") or {})


APPLIERS = {"tactics": _apply_tactics, "instructions": _apply_instructions,
             "formation": _apply_formation, "substitution": _apply_substitution,
             # Core Loop v2 (ENGINE CHANGE)
             "modifiers": _apply_modifiers, "set_pieces": _apply_set_pieces,
             "schedule": _apply_schedule}
