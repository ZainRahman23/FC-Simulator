"""Thin adapter over ``build.py`` (owned by build-core) so the harness works
before, during and after it lands. API as agreed with build-core (see
docs/v2_progress/build-core.md):

- build.build_engine(request)            drop-in for management.build_engine,
                                          installs the card runtime (+ CPU policy
                                          for sides whose builds[side].control=='cpu')
- build.card_command(card_id, team, targets=None, upgraded=False, force=False)
                                          -> {"kind":"card","payload":{...}}
- build.card_context(engine, team)       -> {minute, score_diff, strength_gap, own_system, opp_system}
- build.prepare_request(request)         applies kick-off modifiers from request["builds"]
- build.load_catalog(), build.CARDS, build.SYSTEMS, build.CONST
- build.evaluate(squad, xi, system_id, build)

When build.py is missing every function degrades to the engine-only path
(no cards, no modifiers) and ``available()`` is False; reports say so.
"""
from __future__ import annotations

import importlib
from typing import Any

from tools.balance import common as C  # noqa: F401  (sets sys.path)

_BUILD = None
_TRIED = False


def build_mod():
    global _BUILD, _TRIED
    if not _TRIED:
        _TRIED = True
        try:
            _BUILD = importlib.import_module("build")
        except ModuleNotFoundError as e:
            if e.name != "build":
                raise
            _BUILD = None
            import sys
            print(f"[adapter] build.py unavailable: {type(e).__name__}: {e}", file=sys.stderr)
    return _BUILD


def available() -> bool:
    b = build_mod()
    return b is not None and hasattr(b, "build_engine") and hasattr(b, "card_command")


def build_engine(req: dict):
    b = build_mod()
    if b is not None and hasattr(b, "build_engine"):
        if hasattr(b, "prepare_request"):
            req = b.prepare_request(req)
        return b.build_engine(req)
    import management
    return management.build_engine(req)


def catalog() -> dict:
    b = build_mod()
    if b is None:
        return {"cards": {}, "systems": {}, "version": None}
    cat = b.load_catalog() if hasattr(b, "load_catalog") else {}
    cards = cat.get("cards") or getattr(b, "CARDS", {})
    if isinstance(cards, list):
        cards = {c["id"]: c for c in cards}
    systems = cat.get("systems") or getattr(b, "SYSTEMS", {})
    if isinstance(systems, list):
        systems = {s["id"]: s for s in systems}
    return {"cards": cards, "systems": systems, "version": cat.get("version"), "raw": cat}


def card_command(card_id: str, team: str, at_clock: int, targets=None, upgraded=False) -> dict:
    b = build_mod()
    cmd = b.card_command(card_id, team, targets=targets, upgraded=upgraded, force=True)
    return {"sim_clock": int(at_clock), "kind": cmd["kind"], "payload": cmd["payload"]}


def card_context(engine, team: str) -> dict:
    b = build_mod()
    if b is not None and hasattr(b, "card_context"):
        try:
            return dict(b.card_context(engine, team))
        except Exception:
            pass
    other = "AWAY" if team == "HOME" else "HOME"
    return {"minute": engine.clock // 60, "score_diff": engine.score[team] - engine.score[other],
            "strength_gap": None, "own_system": None, "opp_system": None}


def const() -> dict:
    b = build_mod()
    return dict(getattr(b, "CONST", {}) or {}) if b else {}


def ensure_appliers() -> None:
    """Importing build registers the 'card' applier in management.APPLIERS."""
    build_mod()
