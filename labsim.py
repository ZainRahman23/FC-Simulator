"""Parallel simulation workers (native engine only).

Pure functions of their inputs — each worker builds or unpickles its own
engine, so results are identical whether run in-process or in the pool.
Used for: league matchweeks (nine CPU fixtures at once), scenario searches,
and Decision Lab counterfactuals (many alternate futures of one match).

Alternate futures: the engine's randomness is a pure function of
``seed + semantic key`` (KeyedRNG, no cursor). Changing ``engine.rng.seed``
at minute t therefore leaves everything before t untouched and draws a fresh,
equally-likely future after t. Running the SAME list of reseeds with and
without a decision gives paired samples (common random numbers), so the
difference isolates the decision rather than the dice.
"""
from __future__ import annotations

import os
import pickle
from concurrent.futures import Executor, ProcessPoolExecutor
from typing import Any, Iterable

import management
import bridge

_POOL: Executor | None = None


def worker_count() -> int:
    env = os.environ.get("TOUCHLINE_WORKERS")
    if env is not None:
        return max(0, int(env))
    return max(1, min(11, (os.cpu_count() or 2) - 1))


class _Inline(Executor):
    """Serial fallback executor (TOUCHLINE_WORKERS=0)."""
    def submit(self, fn, *args, **kwargs):  # type: ignore[override]
        from concurrent.futures import Future
        f: Future = Future()
        try:
            f.set_result(fn(*args, **kwargs))
        except BaseException as e:  # pragma: no cover - surfaced to caller
            f.set_exception(e)
        return f


_POOL_LOCK = __import__("threading").Lock()


_BG_POOL: Executor | None = None


def bg_pool() -> Executor:
    """A small separate pool for long background searches (scenario finding),
    so a Daily Challenge prefetch can never make a matchweek wait."""
    global _BG_POOL
    with _POOL_LOCK:
        if _BG_POOL is None:
            n = worker_count()
            if n == 0:
                _BG_POOL = _Inline()
            else:
                import multiprocessing as mp
                try:
                    ctx = mp.get_context("forkserver")
                    ctx.set_forkserver_preload(["__main__", "labsim"])
                except ValueError:
                    ctx = mp.get_context("spawn")
                _BG_POOL = ProcessPoolExecutor(max_workers=max(1, min(4, n // 3)), mp_context=ctx,
                                               initializer=_worker_init, initargs=(os.getpid(),))
        return _BG_POOL


def pool() -> Executor:
    """Lazily created worker pool. ``forkserver`` with this module preloaded:
    workers fork from a clean single-threaded server that already imported
    the engine (fast spin-up, no re-execution of the web app's __main__,
    no fork-with-threads hazards)."""
    global _POOL
    with _POOL_LOCK:
        if _POOL is None:
            n = worker_count()
            if n == 0:
                _POOL = _Inline()
            else:
                import multiprocessing as mp
                try:
                    ctx = mp.get_context("forkserver")
                    ctx.set_forkserver_preload(["__main__", "labsim"])
                except ValueError:          # platform without forkserver
                    ctx = mp.get_context("spawn")
                _POOL = ProcessPoolExecutor(max_workers=n, mp_context=ctx,
                                            initializer=_worker_init, initargs=(os.getpid(),))
        return _POOL


def _worker_init(owner_pid: int) -> None:
    """Workers exit on their own if the owning server dies without a clean
    shutdown (otherwise they, and the forkserver, would linger as orphans)."""
    import threading
    import time

    def watch() -> None:
        while True:
            time.sleep(2.0)
            try:
                os.kill(owner_pid, 0)
            except ProcessLookupError:
                os._exit(0)
            except PermissionError:
                pass
    threading.Thread(target=watch, daemon=True, name="owner-watch").start()


def _noop(i: int) -> int:
    return i


def warm() -> None:
    """Spin the workers up ahead of the first heavy request."""
    n = worker_count()
    if n > 0:
        run_all(_noop, [(i,) for i in range(n * 2)])


def run_all(fn, args_list: Iterable[tuple]) -> list[Any]:
    """Map ``fn`` over argument tuples on the pool, preserving order."""
    ex = pool()
    futs = [ex.submit(fn, *args) for args in args_list]
    return [f.result() for f in futs]


# ── worker functions (top-level: picklable) ─────────────────────────────────
def sim_full(start_request: dict[str, Any]) -> dict[str, Any]:
    """A whole match, instantly. Returns the full-time payload (with the full
    event stream) and the final snapshot — exactly what /matches/start
    (mode=full) produces for the same request."""
    engine = management.build_engine(start_request)
    result = engine.run()
    payload = bridge.full_time_payload(engine, result)
    payload["events"] = [e.to_dict() for e in engine.events]
    return {"full_time": payload,
            "final_snapshot": bridge.match_snapshot(engine, len(engine.events)),
            "score": dict(engine.score)}


def summarize_full_time(payload: dict[str, Any]) -> dict[str, Any]:
    """Compact full-time summary (league batch ``summary_only``)."""
    scorers = [{"name": e.get("actor_name"), "team": e.get("team_id"),
                "minute": max(1, (int(e["timestamp"]) + 59) // 60)}
               for e in payload.get("events", []) if e.get("event_type") == "GOAL"]
    players = {pid: {"name": p.get("name"), "team_id": p.get("team_id"),
                     "goals": p.get("goals", 0), "assists": p.get("assists", 0),
                     "rating": p.get("rating"), "minutes": p.get("minutes", 0)}
               for pid, p in (payload.get("player_stats") or {}).items()}
    return {"score": payload["score"], "team_stats": payload["team_stats"],
            "possession": payload["possession"], "scorers": scorers, "players": players}


def sim_record(start_request: dict[str, Any]) -> dict[str, Any]:
    """``sim_full`` pre-serialised for persistence: the persisted record and
    ledger as JSON strings (cheap to ship back from a worker) plus the
    compact summary."""
    import json
    out = sim_full(start_request)
    ft = out["full_time"]
    record = {"full_time": ft, "final_snapshot": out["final_snapshot"]}
    return {"score": out["score"],
            "record_json": json.dumps(record, separators=(",", ":")),
            "ledger_json": json.dumps(ft["events"], separators=(",", ":")),
            "summary": summarize_full_time(ft)}


def _team_xg(engine, team_id: str) -> float:
    return round(sum(s.xg for s in engine.states.values() if s.team_id == team_id), 3)


def state_summary(engine) -> dict[str, Any]:
    reds = {"HOME": 0, "AWAY": 0}
    for s in engine.states.values():
        reds[s.team_id] += s.red_cards
    goals = [{"team": e.team_id, "minute": max(1, (e.timestamp + 59) // 60),
              "name": e.actor_name} for e in engine.events if e.event_type == "GOAL"]
    sent_off = [{"team": e.team_id, "minute": max(1, (e.timestamp + 59) // 60),
                 "name": e.actor_name} for e in engine.events
                if e.event_type == "CARD" and "RED" in str((e.detail or {}).get("card", ""))]
    return {"clock": engine.clock, "score": dict(engine.score),
            "goals": goals, "sent_off": sent_off,
            "xg": {"HOME": _team_xg(engine, "HOME"), "AWAY": _team_xg(engine, "AWAY")},
            "shots": {t: sum(s.shots for s in engine.states.values() if s.team_id == t)
                      for t in ("HOME", "AWAY")},
            "reds": reds}


def sim_to(start_request: dict[str, Any], to_clock: int) -> dict[str, Any]:
    """Play a request (no management) up to ``to_clock`` and summarise."""
    engine = management.build_engine(start_request)
    engine.advance(int(to_clock))
    return state_summary(engine)


def sim_states(start_request: dict[str, Any], clocks: list[int]) -> list[dict[str, Any]]:
    """Play a request (no management) and summarise at each of ``clocks``."""
    engine = management.build_engine(start_request)
    out = []
    for c in sorted(int(c) for c in clocks):
        engine.advance(c - engine.clock)
        out.append(state_summary(engine))
    return out


def apply_command(engine, cmd: dict[str, Any]) -> None:
    management.APPLIERS[cmd["kind"]](engine, cmd["payload"])


def finish(engine_bytes: bytes, commands: list[dict[str, Any]],
           reseed: int | None) -> dict[str, Any]:
    """Continue a pickled engine to full time. ``commands`` (sim_clock >= the
    engine clock) are applied at their timestamps; ``reseed`` (if given)
    replaces the match seed from this moment on — a fresh alternate future
    with an untouched past."""
    engine = pickle.loads(engine_bytes)
    start_clock = engine.clock
    xg0 = {t: _team_xg(engine, t) for t in ("HOME", "AWAY")}
    g0 = dict(engine.score)
    if reseed is not None:
        engine.rng.seed = int(reseed)
    for cmd in sorted(commands, key=lambda c: int(c["sim_clock"])):
        target = int(cmd["sim_clock"])
        if target > engine.clock:
            engine.advance(target - engine.clock)
        if engine.is_finished:
            break
        try:
            apply_command(engine, cmd)
        except Exception:
            # an order that is no longer valid in this future (e.g. the
            # player was sent off) is skipped, as a real bench would
            pass
    engine.advance(engine.config.duration_seconds - engine.clock)
    return {"from_clock": start_clock,
            "score": dict(engine.score),
            "goals_after": {t: engine.score[t] - g0[t] for t in ("HOME", "AWAY")},
            "xg_after": {t: round(_team_xg(engine, t) - xg0[t], 3) for t in ("HOME", "AWAY")},
            "xg": {t: _team_xg(engine, t) for t in ("HOME", "AWAY")}}
