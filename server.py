"""Touchline live-test server — frontend + FC Simulator v0.7 API.

Run:  python server.py            (env: HOST, PORT, TOUCHLINE_DATA_DIR,
                                        APP_ENV, LOG_LEVEL, TOUCHLINE_MAX_SESSIONS)

The browser manages the team; the Python engine plays ALL football. Every
match is persisted as its exact reproduction input (kickoff request + seed +
accepted management commands at their simulation timestamps) plus the final
authoritative result and event ledger. Live matches recover across server
restarts by deterministic replay of that command log — no pickling, ever.
Persistence is purely observational: no store call sits inside football
resolution, so ledgers/RNG are byte-identical with or without it.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import pickle
import sys
import threading
import time
import traceback
import uuid
import zlib
from collections import OrderedDict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "simulator"))

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import goal_center
from fc_simulator.continuous import HybridLab, EX, EY
from fc_simulator.worldflags import CAD_PROFILE

import bridge
import store
from bridge import BridgeError

# ── application identity / environment ──────────────────────────────────────
_ACT_NAMES = ["standing", "walk", "jog", "high_speed_run", "sprint", "on_ball", "on_ball_evade",
              "carry", "dribble_burst", "dribble_partial", "sent_off"]
_ACT_CODE = {n: k for k, n in enumerate(_ACT_NAMES)}


def _facing_update(prev_deg, px, py, vx_m, vy_m, is_carrier, team_id):
    """Deterministic presentation facing (degrees, renderer convention).

    Priority: movement direction (with a dead zone and 20-degree hysteresis
    so near-zero velocities never flicker) -> ball-carrier faces the goal his
    team attacks -> idle default: face the attacked goal, DERIVED from the
    authoritative geometry (goal_center), never from a hardcoded side.
    RNG-free; pure function of authoritative state + previous facing.
    """
    import math as _m
    sp = _m.hypot(vx_m, vy_m)
    if sp >= 1.2:
        tgt = _m.degrees(_m.atan2(vy_m, vx_m))
    elif sp >= 0.6 and prev_deg is not None:
        return prev_deg                       # dead zone: keep facing
    else:
        gc = goal_center(team_id)
        tgt = _m.degrees(_m.atan2((gc.y - py) * 0.68, (gc.x - px) * 1.05))
    if prev_deg is not None:
        d = abs((tgt - prev_deg + 540.0) % 360.0 - 180.0)
        if d < 20.0:
            return prev_deg                   # hysteresis: ignore tiny swings
    return round(tgt, 1)

# ENGINE MODE — "native" (default): the calibrated v0.7 event engine — full
# event ledger (shots, goals, passes, cards, names), full stats and ratings,
# ~3 s per 90'. "continuous": the Hybrid-C physical ball transport (lab) —
# richer physics but its event/stat mapping into the app is still incomplete.
ENGINE_MODE = os.environ.get("TOUCHLINE_ENGINE", "native").strip().lower()
if ENGINE_MODE not in ("native", "continuous"):
    raise SystemExit(f"TOUCHLINE_ENGINE must be 'native' or 'continuous', got {ENGINE_MODE!r}")
CONTINUOUS = ENGINE_MODE == "continuous"
APP_VERSION = "0.2.0-world" if CONTINUOUS else "0.3.0-coach"
APP_ENV = os.environ.get("APP_ENV", "development")
DATA_DIR = Path(os.environ.get("TOUCHLINE_DATA_DIR", str(ROOT / "data_rc")))
MAX_SESSIONS = int(os.environ.get("TOUCHLINE_MAX_SESSIONS", "25"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

logging.basicConfig(level=LOG_LEVEL,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("touchline")

store.init(DATA_DIR)
try:
    from fc_simulator.data import load_players as _lp
    _PLAYERS_OK = bool(_lp(ROOT / "simulator" / "data" / "players.json")[0])
except Exception:
    _PLAYERS_OK = False

VERSIONS = {"app": APP_VERSION, "engine": bridge.ENGINE_VERSION,
            "calibration": bridge.CALIBRATION_VERSION,
            "player_data": bridge.PLAYER_DATA_VERSION}

app = FastAPI(title="Touchline", version=APP_VERSION)

# in-memory live sessions: match_id -> {"engine", "lock", "meta", "request",
# "commands", "cps"}. ``cps`` are native-engine checkpoints (clock, number of
# commands already applied, zlib(pickle(engine))) taken every CP_EVERY seconds
# of engine clock and after each command — the fast path for exact-minute
# rewinds; the command log + full replay stays the authoritative fallback.
ACTIVE_MATCHES: dict[str, dict[str, Any]] = {}
# sessions that reached full time on the server but may still be rewound
# (the client presents a few sim-minutes behind the server): match_id -> session
RECENT_FT: dict[str, dict[str, Any]] = {}
_SESSIONS_LOCK = threading.Lock()
REWIND_TTL_S = 20 * 60          # finished sessions stay rewindable this long
MAX_REWIND_S = 15 * 60          # at_clock >= engine.clock - MAX_REWIND_S
# Anti-peek floor: the client pre-fetches ahead of what it shows (up to ~5
# match-minutes at 8x), so a decision may land that far behind the furthest
# clock the server has revealed (via /advance or a forward /seek) — never
# further. Stops "watch the goal, rewind, change it".
REVEAL_GRACE_S = 300
CP_EVERY = 60


def _mlog(match_id: str, event: str, **kw: Any) -> None:
    meta = ACTIVE_MATCHES.get(match_id, {}).get("meta", {})
    log.info("%s match=%s save=%s fixture=%s seed=%s %s", event, match_id,
             meta.get("save_id", "?"), meta.get("fixture_id", "?"),
             meta.get("seed", "?"), " ".join(f"{k}={v}" for k, v in kw.items()))


@app.middleware("http")
async def error_boundary(request: Request, call_next):
    try:
        return await call_next(request)
    except HTTPException:
        raise
    except Exception:
        detail = traceback.format_exc()
        error_id = store.record_error(str(request.url.path), detail)
        log.error("ENGINE_ERROR error_id=%s path=%s\n%s", error_id, request.url.path, detail)
        return JSONResponse(status_code=500, content={
            "error": "Internal server error. Please report this ID.",
            "error_id": error_id})


# ── request models ───────────────────────────────────────────────────────────
class StartRequest(BaseModel):
    fixture_id: str | None = None
    seed: int | None = None
    save_id: str = "local"
    mode: str = "live"                       # "live" | "full"
    config: dict[str, Any] | None = None
    coach_ai: dict[str, bool] | None = None
    home_team: dict[str, Any] | None = None
    away_team: dict[str, Any] | None = None
    scenario_id: str | None = None           # start a stored scenario (teams/seed ignored)
    start_clock: int | None = None           # live: position the new match at this clock
    # Core Loop v2 (build-core): manager build block, CPU build, or both sides
    build: dict[str, Any] | None = None
    build_team: str | None = None
    cpu_build: dict[str, Any] | None = None
    builds: dict[str, Any] | None = None
    modifiers: list[dict[str, Any]] | dict[str, Any] | None = None


class AdvanceRequest(BaseModel):
    seconds: int = 30
    last_event_index: int = 0
    frames: bool = False   # renderer: per-second positional keyframes (read-only sampling)


class TacticsRequest(BaseModel):
    team: str
    tactics: dict[str, Any]
    request_id: str | None = None
    at_clock: int | None = None


class InstructionsRequest(BaseModel):
    team: str
    player_id: str
    instructions: dict[str, Any]
    request_id: str | None = None
    at_clock: int | None = None


class FormationRequest(BaseModel):
    team: str
    formation: str
    request_id: str | None = None
    at_clock: int | None = None


class SubstitutionRequest(BaseModel):
    team: str
    player_off: str
    player_on: str
    target_slot: str | None = None
    request_id: str | None = None
    at_clock: int | None = None


class SeekRequest(BaseModel):
    to_clock: int
    last_event_index: int = 0


class BatchRequest(BaseModel):
    requests: list[dict[str, Any]]
    summary_only: bool = True


class DecisionLabRequest(BaseModel):
    team: str = "HOME"
    samples: int = 12
    index: int | None = None
    # deliberate "keep it as is" calls: [{clock, label, alt: {kind, payload}, alt_label}]
    # — tested against the alternative the manager turned down
    holds: list[dict[str, Any]] | None = None


class BranchRequest(BaseModel):
    at_clock: int
    save_id: str | None = None


class ScenarioFindRequest(BaseModel):
    request: dict[str, Any]
    team: str = "HOME"
    kind: str = "chase"
    base_seed: int = 1


class ChallengeSubmitRequest(BaseModel):
    match_id: str
    manager_name: str
    player_id: str | None = None       # persistent anonymous id (localStorage)


class ChallengeAttemptRequest(BaseModel):
    player_id: str
    save_id: str = "local"


class RoundRequest(BaseModel):
    requests: list[dict[str, Any]]
    summary_only: bool = True


class ScoutRequest(BaseModel):
    opponent: dict[str, Any]
    mine: dict[str, Any]


class SaveStateRequest(BaseModel):
    state: dict[str, Any]


# ── management appliers: ONE code path for live requests, replay recovery,
#    what-if branches and Decision Lab counterfactuals (see management.py) ──
from management import (_apply_tactics, _apply_instructions, _apply_formation,  # noqa: E402
                        _apply_substitution, _team_id, APPLIERS as _APPLIERS,
                        build_engine as _mgmt_build_engine)
import build as bld  # noqa: E402  (registers the 'card' applier)

_build_engine = bld.build_engine        # management.build_engine + the card runtime when builds are present
_V2_KEYS = ("build", "build_team", "cpu_build", "builds")


def _strip_v2(body: dict[str, Any]) -> dict[str, Any]:
    for k in _V2_KEYS:
        if k in body and body[k] is None:
            body.pop(k)
    return body


def _prepare(body: dict[str, Any], where: str = "") -> dict[str, Any]:
    try:
        return bld.prepare_request(_strip_v2(body))
    except (BridgeError, ValueError, KeyError, TypeError) as e:
        raise HTTPException(400, f"{where}{e}")


def _make_lab(engine: MatchEngine) -> HybridLab:
    """CONTINUOUS PHYSICAL BALL TRANSPORT (accepted Hybrid-C brain x body).

    The calibrated brain keeps resolving football intent; the 60 Hz body
    integrates a real (x, y, z) ball with launch families, gravity, bounce
    and radius possession — passes travel through space over as many
    authoritative seconds as physics needs, receivers must meet the ball,
    and every player keeps moving underneath a flight. Chunked advance is
    digest-identical to one-shot (verified), so incremental serving changes
    nothing. RNG: the lab's keyed draws only; ball integration consumes
    zero randomness.
    """
    lab = HybridLab(engine, cad=dict(CAD_PROFILE))
    lab.body.restart = {"kind": "KICKOFF", "team": 0, "spot": (52.5, 34.0), "t": 0.0}
    lab.feed_cursor = 0            # server-side cursor into lab.match_events
    return lab


def _ball_state_code(body) -> int:
    b = body.ball
    if b["ctrl"] is not None or b["held"] is not None:
        return 0                   # CONTROLLED
    if b["state"] == "AIRBORNE":
        return 1                   # IN_FLIGHT
    if b["state"] == "DEAD":
        return 3
    return 2                       # LOOSE


def _lab_feed(lab) -> list[dict[str, Any]]:
    out = []
    evs = getattr(lab, "match_events", [])
    while lab.feed_cursor < len(evs):
        e = evs[lab.feed_cursor]; lab.feed_cursor += 1
        out.append({"event_type": str(e.get("kind", "")),
                    "minute": int(float(e.get("t", 0)) // 60),
                    "timestamp": int(float(e.get("t", 0))),
                    "player_id": e.get("pid")})
    return out


def _full_event_stream(engine, lab) -> list[dict[str, Any]]:
    """Canonical authoritative event stream for a completed continuous match,
    shared by instant/full mode and the API-vs-direct parity test so both build
    it identically: engine events (KICKOFF …) first, then the lab's authoritative
    match-events (BEAT/FOUL/OFFSIDE) in time order, then FULL_TIME last. This is
    exactly the order the live/advance path accumulates. FULL_TIME must already be
    recorded on the engine (call engine.result() first)."""
    lab_events = _lab_feed(lab)
    eng_ev = [e.to_dict() for e in engine.events]
    return ([e for e in eng_ev if e.get("event_type") != "FULL_TIME"]
            + lab_events
            + [e for e in eng_ev if e.get("event_type") == "FULL_TIME"])


def _simulate_full(engine: MatchEngine) -> dict[str, Any]:
    """Play a whole match instantly on the active transport and return the
    full-time payload (with the complete authoritative event stream)."""
    if not CONTINUOUS:
        result = engine.run()
        payload = bridge.full_time_payload(engine, result)
        payload["events"] = [e.to_dict() for e in engine.events]
        return payload
    # SYMMETRIC EVENT REPORTING (continuous): the lab's match-event log is the
    # authoritative stream; order matches the live accumulation — KICKOFF (and
    # any engine events), then lab match-events in time order, FULL_TIME last.
    from fc_simulator.continuous import run_continuous
    _result, lab = run_continuous(engine)
    result = engine.result()                 # records FULL_TIME into engine.events
    payload = bridge.full_time_payload(engine, result)
    payload["events"] = _full_event_stream(engine, lab)
    return payload


def _run_for(engine: MatchEngine, lab, seconds: int) -> None:
    """Advance the authoritative simulation by whole seconds on the active
    transport (native per-second engine, or the continuous lab)."""
    if seconds <= 0:
        return
    if lab is not None:
        lab.run(float(seconds))
        engine.score["HOME"] = lab.body.score[0]
        engine.score["AWAY"] = lab.body.score[1]
    else:
        engine.advance(int(seconds))


def _replay(start_request: dict[str, Any], commands: list[dict[str, Any]],
            to_clock: int) -> tuple[MatchEngine, Any]:
    """Deterministic replay: kickoff input + seed + management commands at
    their simulation timestamps, up to ``to_clock``. The single code path for
    restart recovery, what-if branches and counterfactual runs — keyed RNG
    means an unchanged prefix reproduces exactly, so a branch diverges only
    through the decisions that differ."""
    engine = _build_engine(start_request)
    lab = _make_lab(engine) if CONTINUOUS else None
    for cmd in commands:
        target = int(cmd["sim_clock"])
        if target > to_clock:
            break
        _run_for(engine, lab, target - engine.clock)
        _APPLIERS[cmd["kind"]](engine, cmd["payload"])
    _run_for(engine, lab, to_clock - engine.clock)
    return engine, lab


# ── native checkpoints: fast deterministic rewind ───────────────────────────
# A checkpoint is (clock, ncmd, zlib(pickle(engine))) where ``ncmd`` is how
# many entries of the session's ordered command log are already applied in
# that engine. Restoring = unpickle the latest usable checkpoint, apply the
# remaining commands at their clocks, advance to the target — exactly what a
# full replay does, minus the prefix. The engine's RNG is keyed (no cursor),
# so pickled state + same inputs ⇒ byte-identical future.
def _pack(engine: MatchEngine) -> bytes:
    return zlib.compress(pickle.dumps(engine, protocol=pickle.HIGHEST_PROTOCOL), 1)


def _unpack(blob: bytes) -> MatchEngine:
    return pickle.loads(zlib.decompress(blob))


def _cp_take(s: dict[str, Any]) -> None:
    if CONTINUOUS:
        return
    eng = s["engine"]
    cps = s.setdefault("cps", [])
    ncmd = len(s.setdefault("commands", []))
    if cps and cps[-1][0] == eng.clock and cps[-1][1] == ncmd:
        return
    cps.append((eng.clock, ncmd, _pack(eng)))


def _cmd_rows(match_id: str) -> list[dict[str, Any]]:
    return [{"sim_clock": int(c["sim_clock"]), "kind": c["kind"],
             "payload": json.loads(c["payload_json"])} for c in store.commands(match_id)]


def _restore(request: dict[str, Any], commands: list[dict[str, Any]],
             cps: list[tuple], to_clock: int, strict: bool = False) -> MatchEngine:
    """A fresh engine at ``to_clock`` with every command at sim_clock <= to_clock
    applied (``strict``: only commands strictly before it). Never mutates the
    inputs; the result is independent of any live session engine."""
    allowed = sum(1 for c in commands
                  if (int(c["sim_clock"]) < to_clock if strict else int(c["sim_clock"]) <= to_clock))
    best = None
    for cp in cps:
        if cp[0] <= to_clock and cp[1] <= allowed and (best is None or (cp[0], cp[1]) >= (best[0], best[1])):
            best = cp
    if best is not None:
        engine, k = _unpack(best[2]), best[1]
    else:
        engine, k = _build_engine(request), 0
    for cmd in commands[k:allowed]:
        engine.advance(int(cmd["sim_clock"]) - engine.clock)
        _APPLIERS[cmd["kind"]](engine, cmd["payload"])
    engine.advance(to_clock - engine.clock)
    return engine


def _replay_native(request: dict[str, Any], commands: list[dict[str, Any]], to_clock: int,
                   every: int = CP_EVERY) -> tuple[MatchEngine, list[tuple]]:
    """Full replay that leaves a checkpoint trail (recovery / timelines)."""
    eng = _build_engine(request)
    cps: list[tuple] = [(0, 0, _pack(eng))]
    todo = [c for c in commands if int(c["sim_clock"]) <= to_clock]
    i = 0
    while True:
        while i < len(todo) and int(todo[i]["sim_clock"]) <= eng.clock:
            _APPLIERS[todo[i]["kind"]](eng, todo[i]["payload"])
            i += 1
            cps.append((eng.clock, i, _pack(eng)))
        if eng.clock >= to_clock or eng.is_finished:
            break
        nxt = min(to_clock, (eng.clock // every + 1) * every,
                  int(todo[i]["sim_clock"]) if i < len(todo) else 10 ** 9)
        eng.advance(nxt - eng.clock)
        if eng.clock % every == 0 and not (cps and cps[-1][0] == eng.clock):
            cps.append((eng.clock, i, _pack(eng)))
    return eng, cps


def _advance_plain(s: dict[str, Any], secs: int) -> None:
    """Advance a native session by ``secs`` leaving checkpoints on the way."""
    eng = s["engine"]
    target = eng.clock + max(0, int(secs))
    while eng.clock < target and not eng.is_finished:
        step = min(target, (eng.clock // CP_EVERY + 1) * CP_EVERY) - eng.clock
        eng.advance(step)
        if eng.clock % CP_EVERY == 0:
            _cp_take(s)


def _versions_match(row: dict[str, Any]) -> bool:
    return (row["engine_version"] == VERSIONS["engine"]
            and row["calibration_version"] == VERSIONS["calibration"]
            and row["player_data_version"] == VERSIONS["player_data"]
            and row["app_version"] == APP_VERSION)


def _new_session(engine: MatchEngine, request: dict[str, Any], meta: dict[str, Any],
                 commands: list[dict[str, Any]] | None = None,
                 cps: list[tuple] | None = None, lab: Any = None) -> dict[str, Any]:
    s = {"engine": engine, "lock": threading.Lock(), "lab": lab, "meta": meta,
         "request": request, "commands": list(commands or []), "cps": list(cps or []),
         "finished": False, "revealed": engine.clock}
    if not cps:
        _cp_take(s)
    return s


def _meta(row_or_req: dict[str, Any]) -> dict[str, Any]:
    return {"fixture_id": row_or_req["fixture_id"], "seed": int(row_or_req["seed"]),
            "save_id": row_or_req.get("save_id")}


def _recover_match(match_id: str) -> dict[str, Any] | None:
    """Deterministic replay recovery: kickoff input + command log + last clock.

    Because the engine is seed-deterministic and run/advance parity holds, the
    recovered session's future is identical to a never-restarted server given
    the same subsequent manager actions.
    """
    row = store.get_match(match_id)
    if not row or row["status"] != "live":
        return None
    if not _versions_match(row):             # transport change: pre-world
                                             # matches replay differently
        log.warning("MATCH_RECOVERY_REFUSED match=%s stored=%s/%s/%s running=%s/%s/%s",
                    match_id, row["engine_version"], row["calibration_version"],
                    row["player_data_version"], VERSIONS["engine"],
                    VERSIONS["calibration"], VERSIONS["player_data"])
        return None
    start_request = json.loads(row["start_request_json"])
    commands = _cmd_rows(match_id)
    if CONTINUOUS:
        engine, lab = _replay(start_request, commands, int(row["last_clock"]))
        session = _new_session(engine, start_request, _meta(row), commands, lab=lab)
    else:
        engine, cps = _replay_native(start_request, commands, int(row["last_clock"]))
        session = _new_session(engine, start_request, _meta(row), commands, cps)
    with _SESSIONS_LOCK:
        ACTIVE_MATCHES[match_id] = session
    _mlog(match_id, "MATCH_RECOVERED", clock=engine.clock)
    return session


def _session(match_id: str) -> dict[str, Any]:
    s = ACTIVE_MATCHES.get(match_id)
    if not s:
        s = _recover_match(match_id)
    if not s:
        row = store.get_match(match_id)
        if row and row["status"] == "ft":
            raise HTTPException(409, "This match has already finished.")
        raise HTTPException(404, "Match session not found or expired. Restart the fixture.")
    return s


def _prune_recent() -> None:
    now = time.time()
    with _SESSIONS_LOCK:
        for mid in [m for m, s in RECENT_FT.items()
                    if now - s.get("finished_at", now) > REWIND_TTL_S]:
            RECENT_FT.pop(mid, None)
        while len(RECENT_FT) > 2 * MAX_SESSIONS:          # memory bound
            RECENT_FT.pop(min(RECENT_FT, key=lambda m: RECENT_FT[m].get("finished_at", 0)))


def _session_rewindable(match_id: str) -> dict[str, Any]:
    """Live session, or a finished one still inside the rewind window
    (rebuilt from the command log if it is no longer in memory)."""
    s = ACTIVE_MATCHES.get(match_id)
    if s:
        return s
    _prune_recent()
    s = RECENT_FT.get(match_id)
    if s:
        return s
    row = store.get_match(match_id)
    if (row and row["status"] == "ft" and not CONTINUOUS and row["completed_ts"]
            and time.time() - float(row["completed_ts"]) <= REWIND_TTL_S and _versions_match(row)):
        req = json.loads(row["start_request_json"])
        if req.get("mode", "live") == "live":
            commands = _cmd_rows(match_id)
            engine, cps = _replay_native(req, commands, engine_duration(req))
            s = _new_session(engine, req, _meta(row), commands, cps)
            s.update(finished=True, finished_at=float(row["completed_ts"]))
            with _SESSIONS_LOCK:
                RECENT_FT.setdefault(match_id, s)
                return RECENT_FT[match_id]
    return _session(match_id)


def engine_duration(req: dict[str, Any]) -> int:
    return int((req.get("config") or {}).get("duration_seconds", 90 * 60))


def _reveal(s: dict[str, Any]) -> None:
    s["revealed"] = max(int(s.get("revealed", 0)), int(s["engine"].clock))


def _check_rewind(s: dict[str, Any], to_clock: int) -> None:
    eng = s["engine"]
    last = max((int(c["sim_clock"]) for c in s["commands"]), default=0)
    dur = eng.config.duration_seconds
    takeover = int((s.get("request") or {}).get("takeover_clock") or 0)
    if to_clock < 0 or to_clock >= dur:
        raise HTTPException(400, f"at_clock must be between 0 and {dur - 1}.")
    if to_clock < takeover:
        raise HTTPException(400, "You took charge at "
                                 f"{takeover // 60}' — nothing before that can be changed.")
    floor = int(s.get("revealed", eng.clock)) - REVEAL_GRACE_S
    if to_clock < floor:
        raise HTTPException(400, "That moment has already been played — decisions apply "
                                 "at the minute you're watching.")
    if to_clock < last:
        raise HTTPException(400, f"Can't go back before the last change ({last // 60}:{last % 60:02d}).")
    if to_clock < eng.clock - MAX_REWIND_S:
        raise HTTPException(400, f"Can only go back {MAX_REWIND_S // 60} minutes "
                                 f"(server clock {eng.clock}s, requested {to_clock}s).")


def _commit_rewind(match_id: str, s: dict[str, Any], engine: MatchEngine, to_clock: int) -> None:
    """Install a rewound engine; drop the now-stale future (checkpoints,
    presentation facing state); re-open a finished match. The caller takes
    the next checkpoint (after applying its command, so the (clock, ncmd)
    bookkeeping stays exact)."""
    s["engine"] = engine
    s["cps"] = [cp for cp in s["cps"] if cp[0] <= to_clock]
    s["facing"] = {}
    s["prev_pos"] = {}
    if s.get("finished"):
        s["finished"] = False
        with _SESSIONS_LOCK:
            RECENT_FT.pop(match_id, None)
            ACTIVE_MATCHES[match_id] = s
        store.reopen_match(match_id, to_clock)
        _mlog(match_id, "MATCH_REOPENED", clock=to_clock)
    else:
        store.update_clock(match_id, to_clock)


def _require_native(what: str) -> None:
    if CONTINUOUS:
        raise HTTPException(501, f"{what} is only available with the native engine "
                                 "(TOUCHLINE_ENGINE=native).")


def _finish_and_persist(match_id: str, s: dict[str, Any], result) -> dict[str, Any]:
    engine = s["engine"]
    payload = bridge.full_time_payload(engine, result)
    final_snapshot = bridge.match_snapshot(engine, len(engine.events))
    record = {"full_time": payload, "final_snapshot": final_snapshot}
    ledger_json = json.dumps([e.to_dict() for e in engine.events], separators=(",", ":"))
    store.complete_match(match_id, engine.score["HOME"], engine.score["AWAY"],
                         json.dumps(record, separators=(",", ":")), ledger_json)
    _mlog(match_id, "MATCH_COMPLETED", score=f"{engine.score['HOME']}-{engine.score['AWAY']}")
    with _SESSIONS_LOCK:
        ACTIVE_MATCHES.pop(match_id, None)   # persistence outlives the in-memory object
        if not CONTINUOUS:                   # …but stays rewindable for a while
            s["finished"] = True
            s["finished_at"] = time.time()
            RECENT_FT[match_id] = s
    _TIMELINES.pop(match_id, None)
    return payload


def _live_snapshot(match_id: str, s: dict[str, Any], since: int | None = None) -> dict[str, Any]:
    eng = s["engine"]
    snap = bridge.match_snapshot(eng, len(eng.events) if since is None else max(0, int(since)))
    snap.update({"match_id": match_id, "fixture_id": s["meta"]["fixture_id"],
                 "save_id": s["meta"].get("save_id")})
    _add_cards(snap, eng)
    return snap


def _add_cards(snap: dict[str, Any], engine: MatchEngine) -> None:
    cs = bld.card_state(engine)
    if cs is not None:
        snap["cards"] = cs


def _management(match_id: str, kind: str, payload: dict[str, Any],
                request_id: str | None, at_clock: int | None = None) -> dict[str, Any]:
    if at_clock is not None and not CONTINUOUS:
        s = _session_rewindable(match_id)
    else:
        s = _session(match_id)
    rewound = None
    with s["lock"]:
        engine = s["engine"]
        if request_id:
            dup = store.find_command(match_id, request_id)
            if dup:  # idempotent retry: acknowledged once, applied once
                return {"ok": True, "duplicate": True, "clock_seconds": engine.clock,
                        "management": bridge.management_state(engine),
                        "rewound_to": None, "event_count": len(engine.events),
                        "snapshot": _live_snapshot(match_id, s)}
        target = engine
        if at_clock is not None and int(at_clock) < engine.clock:
            _require_native("Exact-minute management")
            t = int(at_clock)
            _check_rewind(s, t)
            target = _restore(s["request"], s["commands"], s["cps"], t)
            rewound = t
        if rewound is None and (target.is_finished or s.get("finished")):
            raise HTTPException(409, "The match has finished; no further management is possible.")
        try:
            extra = _APPLIERS[kind](target, payload)
        except (BridgeError, ValueError, KeyError) as e:
            raise HTTPException(400, str(e))
        if rewound is not None:
            _commit_rewind(match_id, s, target, rewound)
        if kind == "card":
            payload["upgraded"] = bool(extra["card"].get("upgraded"))
        store.append_command(match_id, target.clock, kind,
                             json.dumps(payload, separators=(",", ":")), request_id)
        s["commands"].append({"sim_clock": target.clock, "kind": kind, "payload": payload})
        _cp_take(s)
        _mlog(match_id, "MANAGEMENT_CHANGE", kind=kind, clock=target.clock,
              rewound_to=rewound)
        out = {"ok": True, "clock_seconds": target.clock,
               "management": bridge.management_state(target),
               "rewound_to": rewound, "event_count": len(target.events),
               "snapshot": _live_snapshot(match_id, s)}
    if kind == "formation":
        out["formation"] = extra
    if kind == "card":
        out["card_result"] = extra
    if kind == "substitution":
        out["substitutions_used"] = target.substitutions_used[_team_id(payload["team"])]
    return out


# ── read-only timelines (insights / decision lab / branch on any match) ─────
_TIMELINES: "OrderedDict[str, dict[str, Any]]" = OrderedDict()
_TIMELINES_LOCK = threading.Lock()


def _timeline(match_id: str) -> dict[str, Any]:
    """{request, commands, cps, clock, row, live_engine?} for any persisted
    native match: from the in-memory session when there is one (copied under
    its lock), otherwise from a replay cache built from the command log."""
    _require_native("This analysis")
    s = ACTIVE_MATCHES.get(match_id) or RECENT_FT.get(match_id)
    if s is None and match_id not in _TIMELINES:
        row = store.get_match(match_id)
        if row and row["status"] == "live":
            s = _recover_match(match_id)
    if s is not None:
        with s["lock"]:
            return {"request": s["request"], "commands": list(s["commands"]),
                    "cps": list(s["cps"]), "clock": s["engine"].clock, "session": s,
                    "meta": s["meta"]}
    with _TIMELINES_LOCK:
        tl = _TIMELINES.get(match_id)
        if tl is not None:
            _TIMELINES.move_to_end(match_id)
            return tl
    row = store.get_match(match_id)
    if not row:
        raise HTTPException(404, "No persisted record for that match ID")
    if row["status"] not in ("ft", "live"):
        raise HTTPException(409, f"This match is {row['status']}.")
    if not _versions_match(row):
        raise HTTPException(409, "This match was recorded with a different engine version "
                                 "and can't be replayed exactly.")
    req = json.loads(row["start_request_json"])
    commands = _cmd_rows(match_id)
    to = engine_duration(req) if row["status"] == "ft" else int(row["last_clock"] or 0)
    _eng, cps = _replay_native(req, commands, to, every=300)
    tl = {"request": req, "commands": commands, "cps": cps, "clock": to, "session": None,
          "meta": _meta(row)}
    with _TIMELINES_LOCK:
        _TIMELINES[match_id] = tl
        while len(_TIMELINES) > 8:
            _TIMELINES.popitem(last=False)
    return tl


def _engine_at(tl: dict[str, Any], at: int, strict: bool = False) -> MatchEngine:
    return _restore(tl["request"], tl["commands"], tl["cps"], int(at), strict=strict)


# ── endpoints ────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "app_version": APP_VERSION, "app_env": APP_ENV,
            "engine": bridge.ENGINE_NAME, "engine_version": bridge.ENGINE_VERSION,
            "calibration_version": bridge.CALIBRATION_VERSION,
            "player_data_version": bridge.PLAYER_DATA_VERSION,
            "supported_formations": ["4-3-3", "4-2-3-1", "4-1-4-1"],
            "active_matches": len(ACTIVE_MATCHES),
            "database": "ok" if store.db_ok() else "error"}


@app.get("/api/ready")
def ready() -> dict[str, Any]:
    problems = []
    if not _PLAYERS_OK: problems.append("player database failed to load")
    if not store.db_ok(): problems.append("persistence database unavailable")
    if store.schema_version() != store.SCHEMA_VERSION: problems.append("schema version mismatch")
    if problems:
        raise HTTPException(503, "; ".join(problems))
    return {"ready": True, "schema_version": store.schema_version()}


@app.get("/api/config")
def config() -> dict[str, Any]:
    return {"app_env": APP_ENV, "app_version": APP_VERSION,
            "allow_mock": APP_ENV != "production"}


@app.get("/api/balltest/sequence")
def balltest_sequence() -> dict[str, Any]:
    """BALL TRANSPORT TEST — deterministic scripted kicks on a bare physical
    body (engine transport, real camera playback in the viewer). No match,
    no RNG, no persistence; players parked far away; pure step_ball physics.
    """
    from fc_simulator.world import Body, FAM, DT as WDT
    import math as _m
    body = Body([{"pid": "TA", "team": 0}, {"pid": "TB", "team": 1}])
    for q in body.players.values():
        q["x"], q["y"] = 2.0, 2.0
    actions = [
        ("5 m ground pass",      "SHORT",  (46.0, 34.0), (51.0, 34.0)),
        ("15 m ground pass",     "DRIVEN", (42.0, 30.0), (57.0, 30.0)),
        ("15 m lifted pass",     "LOFT",   (42.0, 38.0), (57.0, 38.0)),
        ("25 m lofted pass",     "LOFT",   (40.0, 26.0), (65.0, 26.0)),
        ("40 m long diagonal",   "LOFT",   (30.0, 14.0), (66.0, 46.0)),
        ("high clearance",       "CLEAR",  (30.0, 34.0), (75.0, 34.0)),
        ("driven cross",         "CROSS",  (80.0, 10.0), (96.0, 30.0)),
        ("lofted cross",         "CROSS",  (78.0, 58.0), (98.0, 34.0)),
        ("low shot",             "SHOT",   (97.0, 34.0), (105.0, 33.0)),
        ("rising power shot",    "SHOT",   (81.0, 36.0), (105.0, 35.0)),
    ]
    out = []
    for label, fam, (sx, sy), (tx, ty) in actions:
        b = body.ball
        b["x"], b["y"], b["z"] = sx, sy, 0.0
        b["vx"] = b["vy"] = b["vz"] = 0.0
        b["state"] = "ROLLING"; b["ctrl"] = None; b["held"] = None
        body.kick("TA", tx, ty, fam)
        v0h = _m.hypot(b["vx"], b["vy"]); vz0 = b["vz"]
        track = [[0.0, round(b["x"], 2), round(b["y"], 2), round(b["z"], 3)]]
        maxh = 0.0; land_t = None; land_xy = None; bounce_h = None
        bounced = False; peak_after_bounce = 0.0
        prev_air = b["z"] > 0 or b["vz"] > 0
        t = 0.0
        for i in range(int(6.0 / WDT)):
            zb = b["z"]; vzb = b["vz"]
            body.step_ball()
            t += WDT
            if vz0 > 0 and land_t is None and zb > 0 and b["z"] <= 0.0001 and b["vz"] >= 0:
                land_t = t; land_xy = (round(b["x"], 2), round(b["y"], 2))
                bounced = b["vz"] > 0
            if land_t is not None and bounced:
                peak_after_bounce = max(peak_after_bounce, b["z"])
            maxh = max(maxh, b["z"])
            if i % 6 == 5:
                track.append([round(t, 3), round(b["x"], 2), round(b["y"], 2), round(b["z"], 3)])
            sp = _m.hypot(b["vx"], b["vy"], b["vz"])
            if sp < 0.05 and b["z"] <= 0.001:
                track.append([round(t, 3), round(b["x"], 2), round(b["y"], 2), 0.0])
                break
        out.append({
            "label": label, "family": fam,
            "launch_speed": round(_m.hypot(v0h, vz0), 2),
            "horizontal_speed": round(v0h, 2), "vz": round(vz0, 2),
            "max_height": round(maxh, 2),
            "flight_s": round(land_t, 2) if land_t else 0.0,
            "landing": land_xy or (round(b["x"], 2), round(b["y"], 2)),
            "first_bounce_h": round(peak_after_bounce, 2) if bounced else 0.0,
            "track": track,
        })
    return {"label": "BALL TRANSPORT TEST — ENGINE BODY SEQUENCE", "actions": out}


@app.post("/api/matches/start")
def start_match(req: StartRequest) -> dict[str, Any]:
    scenario = None
    if req.scenario_id:
        _require_native("Scenarios")
        row = store.get_scenario(str(req.scenario_id))
        if not row:
            raise HTTPException(404, "Unknown scenario_id")
        scenario = json.loads(row["result_json"])
        body = json.loads(row["request_json"])            # stored request + scenario seed
        body.update({"save_id": req.save_id, "mode": "live", "scenario_id": row["scenario_id"],
                     "fixture_id": req.fixture_id or f"scenario:{row['scenario_id']}"})
        body.pop("start_clock", None)
        start_clock = int(row["takeover_clock"])
        body["takeover_clock"] = start_clock
    else:
        if req.fixture_id is None or req.seed is None or not req.home_team or not req.away_team:
            raise HTTPException(400, "fixture_id, seed, home_team and away_team are required "
                                     "(or give a scenario_id)")
        body = req.model_dump()
        for k in ("scenario_id", "start_clock"):
            if body.get(k) is None:
                body.pop(k, None)
        start_clock = int(req.start_clock or 0) if req.mode != "full" else 0
        if start_clock:
            body["takeover_clock"] = start_clock
        body = _prepare(body)
    if len(str(body["fixture_id"])) > 128 or abs(int(body["seed"])) > 2**62:
        raise HTTPException(400, "Invalid fixture_id or seed")
    try:
        engine = _build_engine(body)
    except (BridgeError, ValueError, KeyError, TypeError) as e:
        raise HTTPException(400, str(e))
    if start_clock and not (0 <= start_clock < engine.config.duration_seconds):
        raise HTTPException(400, "start_clock must be inside the match")
    if start_clock and CONTINUOUS:
        _require_native("start_clock")

    match_id = uuid.uuid4().hex[:12]
    start_json = json.dumps(body, separators=(",", ":"))
    fixture_id, seed, save_id = body["fixture_id"], int(body["seed"]), body.get("save_id", "local")

    if body.get("mode") == "full":
        store.create_match(match_id, save_id, fixture_id, seed, start_json, VERSIONS, status="live")
        payload = _simulate_full(engine)
        record = {"full_time": payload,
                  "final_snapshot": bridge.match_snapshot(engine, len(engine.events))}
        ledger_json = json.dumps(payload["events"], separators=(",", ":"))
        store.complete_match(match_id, engine.score["HOME"], engine.score["AWAY"],
                             json.dumps(record, separators=(",", ":")), ledger_json)
        store.update_clock(match_id, engine.clock)
        log.info("MATCH_COMPLETED match=%s save=%s fixture=%s seed=%s mode=full",
                 match_id, save_id, fixture_id, seed)
        out = {"match_id": match_id, "fixture_id": fixture_id, "status": "ft",
               "full_time": payload}
        _add_build_info(out, body, engine)
        return out
    meta = {"fixture_id": fixture_id, "seed": seed, "save_id": save_id}
    with _SESSIONS_LOCK:
        if len(ACTIVE_MATCHES) >= MAX_SESSIONS:
            # Explicit capacity policy: reject new matches; never evict someone
            # else's live game.
            raise HTTPException(429, "Server is at live-match capacity. Try again shortly.")
        store.create_match(match_id, save_id, fixture_id, seed, start_json, VERSIONS)
        s = _new_session(engine, body, meta, lab=_make_lab(engine) if CONTINUOUS else None)
        ACTIVE_MATCHES[match_id] = s
    if start_clock:
        with s["lock"]:
            _advance_plain(s, start_clock)
            store.update_clock(match_id, engine.clock)
    _mlog(match_id, "MATCH_STARTED", start_clock=start_clock)
    snap = bridge.match_snapshot(engine, 0)
    snap.update({"match_id": match_id, "fixture_id": fixture_id, "save_id": save_id})
    if scenario is not None:
        snap["scenario"] = scenario
    _add_build_info(snap, body, engine)
    return snap


def _add_build_info(out: dict[str, Any], body: dict[str, Any], engine: MatchEngine | None) -> None:
    """v2 kick-off block: trait bar, compiled hand, card state, modifiers."""
    builds = body.get("builds") or {}
    if not builds:
        return
    me = next((t for t, b in builds.items() if b.get("control") == "manager"), None) or next(iter(builds))
    try:
        at = bld.active_traits(body, me)
    except (BridgeError, ValueError, KeyError, TypeError):
        at = {"traits": [], "system_fit": None}
    out["build_team"] = me
    out["active_traits"] = at["traits"]
    out["system_fit"] = at.get("system_fit")
    out["kickoff_modifiers"] = (builds.get(me) or {}).get("kickoff_modifiers") or {}
    out["builds"] = {t: {k: b.get(k) for k in ("control", "system_id", "difficulty", "familiarity")}
                     for t, b in builds.items()}
    if engine is not None:
        out["hand"] = bld.compiled_hand(engine, me)
        cs = bld.card_state(engine)
        if cs is not None:
            out["cards"] = cs
            out["influence"] = (cs.get(me) or {}).get("influence")


@app.get("/api/matches/lookup")
def lookup_match(save_id: str, fixture_id: str, soft: bool = False) -> dict[str, Any]:
    """Authoritative persisted identity of a completed match (debug UX; and
    the client's boot-time result recovery, which asks with soft=1 so an
    unplayed fixture is a normal answer rather than a 404)."""
    row = store.find_match(save_id, fixture_id)
    if not row:
        if soft:
            return {"match_id": None, "status": None, "fixture_id": fixture_id}
        raise HTTPException(404, "No persisted match for that save/fixture")
    out = {k: row[k] for k in ("match_id", "save_id", "fixture_id", "seed", "status",
                               "app_version", "engine_version", "calibration_version",
                               "player_data_version", "score_home", "score_away")}
    led = store.ledger(row["match_id"])
    if led is not None:
        import hashlib
        out["ledger_digest"] = hashlib.blake2b(
            json.dumps(led, sort_keys=True).encode()).hexdigest()[:24]
        out["ledger_events"] = len(led)
    return out



@app.get("/api/matches/{match_id}")
def get_match(match_id: str, since: int = 0) -> dict[str, Any]:
    # Finished matches are served from persistence (the in-memory session is
    # cleaned up at FT; the record outlives it).
    if match_id not in ACTIVE_MATCHES:
        row = store.get_match(match_id)
        if row and row["status"] == "ft":
            record = json.loads(row["result_json"]) if row["result_json"] else {}
            snap = record.get("final_snapshot") or {}
            snap.update({"match_id": match_id, "fixture_id": row["fixture_id"],
                         "save_id": row["save_id"], "status": "ft",
                         "full_time": record.get("full_time")})
            return snap
    s = _session(match_id)
    snap = bridge.match_snapshot(s["engine"], max(0, int(since)))
    snap.update({"match_id": match_id, "fixture_id": s["meta"]["fixture_id"],
                 "save_id": s["meta"].get("save_id")})
    return snap


def _native_advance(s: dict[str, Any], engine: MatchEngine, secs: int,
                    want_frames: bool) -> tuple[list | None, list | None]:
    """Native per-second engine advance. With ``want_frames`` (<=120 s) the
    renderer receives one keyframe per authoritative second — read-only
    sampling between seconds (advance(N) is internally the same per-second
    loop, so outcomes are identical with or without frames)."""
    if not (want_frames and secs <= 120):
        _advance_plain(s, secs)
        return None, None
    roster = sorted(
        [st.player.player_id for tid in ("HOME", "AWAY")
         for st in engine._team_states(tid, active_only=False)]
        + [p.player_id for team in (engine.home, engine.away) for p in team.bench])
    ridx = {pid: k for k, pid in enumerate(roster)}
    facing = s.setdefault("facing", {})
    prev_pos = s.setdefault("prev_pos", {})
    frames: list = []
    for _ in range(secs):
        if engine.is_finished:
            break
        engine.advance(1)
        if engine.clock % CP_EVERY == 0:
            _cp_take(s)
        row = [engine.clock, round(engine.ball.pos.x, 2), round(engine.ball.pos.y, 2),
               1 if engine.possession_team == "HOME" else 0]
        pl = [None] * len(roster)
        carrier = engine.ball.controlling_player_id
        for tid in ("HOME", "AWAY"):
            for st in engine._team_states(tid, active_only=False):
                pid = st.player.player_id
                px, py = st.pos.x, st.pos.y
                ox, oy = prev_pos.get(pid, (px, py))
                vx_m, vy_m = (px - ox) * 1.05, (py - oy) * 0.68
                prev_pos[pid] = (px, py)
                facing[pid] = _facing_update(facing.get(pid), px, py, vx_m, vy_m,
                                             pid == carrier, tid)
                pl[ridx[pid]] = [round(px, 2), round(py, 2),
                                 _ACT_CODE.get(st.current_activity, 0),
                                 1 if st.active else 0, facing[pid]]
        row.append(pl)
        frames.append(row)
    return frames, roster


@app.post("/api/matches/{match_id}/advance")
def advance_match(match_id: str, req: AdvanceRequest) -> dict[str, Any]:
    s = _session(match_id)
    engine = s["engine"]
    frames = None
    with s["lock"]:
        secs = max(1, min(600, int(req.seconds)))
        lab_events: list[dict[str, Any]] = []
        if not CONTINUOUS:
            frames, roster = _native_advance(s, engine, secs, bool(req.frames))
            _reveal(s)
        else:
            lab = s.setdefault("lab", _make_lab(engine))
            body = lab.body
            if req.frames and secs <= 120:
                # Renderer keyframes from the CONTINUOUS world: one row per
                # authoritative second; the ball additionally carries 6
                # sub-second (x, y, z) samples so kicks, flights and bounces
                # appear exactly where the physical ball was. Sampling is
                # read-only; chunked advance is digest-identical to one-shot.
                frames = []
                roster = sorted(
                    [st.player.player_id for tid in ("HOME", "AWAY")
                     for st in engine._team_states(tid, active_only=False)]
                    + [p.player_id for team in (engine.home, engine.away) for p in team.bench])
                ridx = {pid: k for k, pid in enumerate(roster)}
                for _ in range(secs):
                    if engine.is_finished:
                        break
                    xs, ys, zs = [], [], []
                    for _k in range(6):
                        lab.run(1.0 / 6.0)
                        xs.append(round(EX(body.ball["x"]), 2))
                        ys.append(round(EY(body.ball["y"]), 2))
                        zs.append(round(body.ball["z"], 3))
                    engine.score["HOME"] = body.score[0]
                    engine.score["AWAY"] = body.score[1]
                    row = [engine.clock, xs[-1], ys[-1],
                           1 if engine.possession_team == "HOME" else 0]
                    pl = [None] * len(roster)
                    import math as _m
                    for tid in ("HOME", "AWAY"):
                        for st in engine._team_states(tid, active_only=False):
                            pid = st.player.player_id
                            bp = body.players.get(pid)
                            if bp is not None:
                                px, py = round(EX(bp["x"]), 2), round(EY(bp["y"]), 2)
                                face = round(_m.degrees(bp["facing"]), 1)
                            else:
                                px, py = round(st.pos.x, 2), round(st.pos.y, 2)
                                face = 0.0
                            pl[ridx[pid]] = [px, py,
                                             _ACT_CODE.get(st.current_activity, 0),
                                             1 if st.active else 0, face]
                    row.append(pl)
                    row.append([round(body.ball["z"], 3), round(body.ball["vz"], 2),
                                1 if body.ball["z"] <= 0.001 and body.ball["vz"] == 0.0 else 0,
                                zs, xs, ys, _ball_state_code(body)])
                    # PLAYER PHYSICAL OCCUPANCY debug (row[6], additive): the
                    # solver's last-tick contact pairs and per-player desired vs
                    # resolved velocity + state, for the viewer's collision
                    # overlay. Read-only sampling of authoritative solver data.
                    occ_pl = [None] * len(roster)
                    for pid, bp in body.players.items():
                        k = ridx.get(pid)
                        if k is not None:
                            occ_pl[k] = [round(bp.get("_dvx", 0.0), 2), round(bp.get("_dvy", 0.0), 2),
                                         round(bp["vx"], 2), round(bp["vy"], 2), bp.get("occ", 0)]
                    row.append({"c": [[ridx.get(a, -1), ridx.get(b, -1), round(pen * 1000, 1)]
                                      for a, b, pen in body.last_contacts],
                                "p": occ_pl})
                    frames.append(row)
            else:
                lab.run(float(secs))
                engine.score["HOME"] = body.score[0]
                engine.score["AWAY"] = body.score[1]
            # Drain the lab's authoritative match-events FIRST (time order), then
            # record FULL_TIME so it lands last in the stream — matching the order
            # instant/full mode reports (KICKOFF, lab events, FULL_TIME). Reporting
            # events is a pure read of already-simulated state; it does not advance
            # or mutate physics.
            lab_events = _lab_feed(lab)
        result = engine.result() if engine.is_finished else None   # records FULL_TIME after lab events
        snap = bridge.match_snapshot(engine, max(0, int(req.last_event_index)))
        snap["new_events"] = lab_events + (snap.get("new_events") or [])
        _add_cards(snap, engine)
        store.update_clock(match_id, engine.clock)
    if frames is not None:
        snap["frames"] = frames
        snap["roster"] = roster
        snap["act_names"] = _ACT_NAMES
    snap.update({"match_id": match_id, "fixture_id": s["meta"]["fixture_id"]})
    if result is not None:
        snap["full_time"] = _finish_and_persist(match_id, s, result)
    return snap


@app.post("/api/matches/{match_id}/tactics")
def change_tactics(match_id: str, req: TacticsRequest) -> dict[str, Any]:
    return _management(match_id, "tactics", req.model_dump(exclude={"request_id", "at_clock"}),
                       req.request_id, req.at_clock)


@app.post("/api/matches/{match_id}/instructions")
def change_instructions(match_id: str, req: InstructionsRequest) -> dict[str, Any]:
    return _management(match_id, "instructions", req.model_dump(exclude={"request_id", "at_clock"}),
                       req.request_id, req.at_clock)


@app.post("/api/matches/{match_id}/formation")
def change_formation(match_id: str, req: FormationRequest) -> dict[str, Any]:
    return _management(match_id, "formation", req.model_dump(exclude={"request_id", "at_clock"}),
                       req.request_id, req.at_clock)


@app.post("/api/matches/{match_id}/substitution")
def substitution(match_id: str, req: SubstitutionRequest) -> dict[str, Any]:
    return _management(match_id, "substitution", req.model_dump(exclude={"request_id", "at_clock"}),
                       req.request_id, req.at_clock)


@app.delete("/api/matches/{match_id}")
def abandon_match(match_id: str) -> dict[str, Any]:
    with _SESSIONS_LOCK:
        ACTIVE_MATCHES.pop(match_id, None)
        RECENT_FT.pop(match_id, None)
    store.abandon_match(match_id)
    log.info("MATCH_ABANDONED match=%s", match_id)
    return {"ok": True}


# ── coach MVP: seek, insights, batch, review, decision lab, branch ──────────
import coach  # noqa: E402
import labsim  # noqa: E402


# ── v2 persistence (build-core): challenge attempts, Ghost League, Analyst
#    budget. Own tables in the same SQLite file, created lazily per DB path
#    (store.init may be re-pointed, e.g. by tests). store.py stays untouched.
class _V2DB:
    _ready_for: Any = None

    def conn(self):
        c = store._conn()
        if self._ready_for != store._db_path:
            with store._lock:
                c.executescript("""
                CREATE TABLE IF NOT EXISTS challenge_attempts(
                    match_id TEXT PRIMARY KEY, scenario_id TEXT, player_id TEXT, ranked INTEGER,
                    day TEXT, ts REAL);
                CREATE INDEX IF NOT EXISTS idx_att_player ON challenge_attempts(scenario_id, player_id);
                CREATE TABLE IF NOT EXISTS ghost_entries(
                    day TEXT, player_id TEXT, manager_name TEXT, snapshot_json TEXT, ts REAL,
                    PRIMARY KEY(day, player_id));
                CREATE TABLE IF NOT EXISTS ghost_runs(
                    run_id TEXT PRIMARY KEY, day TEXT, player_id TEXT, manager_name TEXT, ranked INTEGER,
                    points INTEGER, stars INTEGER, gd INTEGER, results_json TEXT, ts REAL);
                CREATE INDEX IF NOT EXISTS idx_ghost_runs_day ON ghost_runs(day, ranked);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_ghost_ranked_once ON ghost_runs(day, player_id) WHERE ranked=1;
                CREATE TABLE IF NOT EXISTS analyst_runs(
                    player_id TEXT, save_id TEXT, week TEXT, used INTEGER,
                    PRIMARY KEY(player_id, save_id, week));
                """)
                cols = {r[1] for r in c.execute("PRAGMA table_info(challenge_entries)").fetchall()}
                if "player_id" not in cols:
                    c.execute("ALTER TABLE challenge_entries ADD COLUMN player_id TEXT")
                c.commit()
            self._ready_for = store._db_path
        return c

    def _one(self, sql: str, args: tuple) -> dict[str, Any] | None:
        with self.conn() as c:
            r = c.execute(sql, args).fetchone()
            return dict(r) if r else None

    def _all(self, sql: str, args: tuple) -> list[dict[str, Any]]:
        with self.conn() as c:
            return [dict(r) for r in c.execute(sql, args).fetchall()]

    def _exec(self, sql: str, args: tuple) -> None:
        conn = self.conn()
        with store._lock, conn as c:
            c.execute(sql, args)

    # challenge attempts (ported from wip/playtest-fixes store.py)
    def challenge_entry_for_player(self, scenario_id, player_id):
        return self._one("SELECT * FROM challenge_entries WHERE scenario_id=? AND player_id=?", (scenario_id, player_id))

    def put_player_entry(self, scenario_id, player_id, manager_name, match_id, stars, gf, ga, decisions):
        if self.challenge_entry_for_player(scenario_id, player_id):
            self._exec("""UPDATE challenge_entries SET manager_name=?, match_id=?, stars=?, goals_for=?,
                          goals_against=?, decisions=?, ts=? WHERE scenario_id=? AND player_id=?""",
                       (manager_name, match_id, stars, gf, ga, decisions, time.time(), scenario_id, player_id))
        else:
            self._exec("""INSERT OR REPLACE INTO challenge_entries(scenario_id, manager_name, match_id, stars,
                          goals_for, goals_against, decisions, ts, player_id) VALUES(?,?,?,?,?,?,?,?,?)""",
                       (scenario_id, manager_name, match_id, stars, gf, ga, decisions, time.time(), player_id))

    def rename_player_entry(self, scenario_id, player_id, manager_name):
        self._exec("UPDATE challenge_entries SET manager_name=? WHERE scenario_id=? AND player_id=?",
                   (manager_name, scenario_id, player_id))

    def put_attempt(self, match_id, scenario_id, player_id, ranked, day):
        self._exec("""INSERT OR IGNORE INTO challenge_attempts(match_id, scenario_id, player_id, ranked, day, ts)
                      VALUES(?,?,?,?,?,?)""", (match_id, scenario_id, player_id, 1 if ranked else 0, day, time.time()))

    def ranked_attempt(self, scenario_id, player_id):
        return self._one("""SELECT * FROM challenge_attempts WHERE scenario_id=? AND player_id=? AND ranked=1
                            ORDER BY ts LIMIT 1""", (scenario_id, player_id))

    def attempt_for_match(self, match_id):
        return self._one("SELECT * FROM challenge_attempts WHERE match_id=?", (match_id,))

    # analyst budget
    def analyst_used(self, player_id, save_id, week) -> int:
        r = self._one("SELECT used FROM analyst_runs WHERE player_id=? AND save_id=? AND week=?",
                      (player_id, save_id, week))
        return int(r["used"]) if r else 0

    def analyst_take(self, player_id, save_id, week, budget, amount=1) -> int | None:
        """Atomically consume one run; None when the budget is spent."""
        conn = self.conn()
        with store._lock:
            try:
                conn.execute("BEGIN IMMEDIATE")
                r = conn.execute("SELECT used FROM analyst_runs WHERE player_id=? AND save_id=? AND week=?",
                                 (player_id, save_id, week)).fetchone()
                used = int(r["used"]) if r else 0
                if used + amount > budget:
                    conn.commit()
                    return None
                conn.execute("INSERT OR REPLACE INTO analyst_runs(player_id, save_id, week, used) VALUES(?,?,?,?)",
                             (player_id, save_id, week, used + amount))
                conn.commit()
                return used + amount
            except Exception:
                conn.rollback()
                raise

    def analyst_refund(self, player_id, save_id, week, amount=1) -> None:
        self._exec("UPDATE analyst_runs SET used=MAX(0, used-?) WHERE player_id=? AND save_id=? AND week=?",
                   (amount, player_id, save_id, week))

    # ghost league
    def ghost_put_entry(self, day, player_id, name, snapshot):
        self._exec("INSERT OR REPLACE INTO ghost_entries(day, player_id, manager_name, snapshot_json, ts) VALUES(?,?,?,?,?)",
                   (day, player_id, name, json.dumps(snapshot, separators=(",", ":")), time.time()))

    def ghost_pool(self, days, exclude):
        rows = self._all(f"SELECT * FROM ghost_entries WHERE day IN ({','.join('?' * len(days))}) AND player_id != ? "
                         "ORDER BY ts DESC", tuple(days) + (exclude,))
        seen, out = set(), []
        for r in rows:
            if r["player_id"] not in seen:
                seen.add(r["player_id"]); out.append(r)
        return out

    def ghost_ranked(self, day, player_id):
        return self._one("SELECT * FROM ghost_runs WHERE day=? AND player_id=? AND ranked=1", (day, player_id))

    def ghost_reserve(self, run_id, day, player_id, name):
        conn = self.conn()
        with store._lock:
            try:
                conn.execute("BEGIN IMMEDIATE")
                old = conn.execute("SELECT 1 FROM ghost_runs WHERE day=? AND player_id=? AND ranked=1", (day, player_id)).fetchone()
                ranked = old is None
                conn.execute("INSERT INTO ghost_runs(run_id,day,player_id,manager_name,ranked,points,stars,gd,results_json,ts) VALUES(?,?,?,?,?,0,0,0,'[]',?)", (run_id,day,player_id,name,int(ranked),time.time()))
                conn.commit()
                return ranked
            except Exception:
                conn.rollback()
                raise

    def ghost_finish(self, run_id, points, stars, gd, results):
        self._exec("UPDATE ghost_runs SET points=?,stars=?,gd=?,results_json=? WHERE run_id=?",
                   (points,stars,gd,json.dumps(results,separators=(",",":")),run_id))

    def ghost_put_run(self, run_id, day, player_id, name, ranked, points, stars, gd, results):
        self._exec("""INSERT INTO ghost_runs(run_id, day, player_id, manager_name, ranked, points, stars, gd,
                      results_json, ts) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                   (run_id, day, player_id, name, 1 if ranked else 0, points, stars, gd,
                    json.dumps(results, separators=(",", ":")), time.time()))

    def ghost_board(self, day):
        return self._all("""SELECT * FROM ghost_runs WHERE day=? AND ranked=1
                            ORDER BY stars DESC, points DESC, gd DESC, ts ASC""", (day,))

    def ghost_count(self, day):
        r = self._one("SELECT COUNT(*) AS n FROM ghost_entries WHERE day=?", (day,))
        return int(r["n"]) if r else 0


v2db = _V2DB()


@app.on_event("startup")
def _warm_workers() -> None:
    if not CONTINUOUS:
        threading.Thread(target=labsim.warm, daemon=True, name="labsim-warm").start()


@app.post("/api/matches/{match_id}/seek")
def seek_match(match_id: str, req: SeekRequest) -> dict[str, Any]:
    """Jump the authoritative clock: forward = advance without frames;
    backward = deterministic rewind (same constraints as at_clock)."""
    _require_native("Seek")
    s = _session_rewindable(match_id)
    result = None
    rewound = None
    with s["lock"]:
        eng = s["engine"]
        dur = eng.config.duration_seconds
        to = max(0, min(dur, int(req.to_clock)))
        if to < eng.clock:
            _check_rewind(s, to)
            _commit_rewind(match_id, s, _restore(s["request"], s["commands"], s["cps"], to), to)
            _cp_take(s)
            rewound = to
        elif to > eng.clock and not s.get("finished"):
            _advance_plain(s, to - eng.clock)
            _reveal(s)
            store.update_clock(match_id, eng.clock)
            if eng.is_finished:
                result = eng.result()
        eng = s["engine"]
        if s.get("finished") and rewound is None:        # already over: the FT record
            row = store.get_match(match_id)
            record = json.loads(row["result_json"]) if row and row["result_json"] else {}
            snap = bridge.match_snapshot(eng, max(0, int(req.last_event_index)))
            snap.update({"match_id": match_id, "fixture_id": s["meta"]["fixture_id"],
                         "full_time": record.get("full_time"), "rewound_to": None})
            return snap
        snap = bridge.match_snapshot(eng, max(0, int(req.last_event_index)))
        _add_cards(snap, eng)
    snap.update({"match_id": match_id, "fixture_id": s["meta"]["fixture_id"],
                 "rewound_to": rewound})
    if result is not None:
        snap["full_time"] = _finish_and_persist(match_id, s, result)
    return snap


def _names(engine: MatchEngine) -> dict[str, str]:
    out = {pid: st.player.name for pid, st in engine.states.items()}
    for team in (engine.home, engine.away):
        for p in team.bench:
            out.setdefault(p.player_id, p.name)
    return out


def _unused_bench(engine: MatchEngine, team: str) -> list[dict[str, Any]]:
    return [{"id": p.player_id, "name": p.name, "pos": p.primary_position, "ovr": p.ovr}
            for p in engine.teams[team].bench if p.player_id not in engine.states]


def _side(request: dict[str, Any], team: str) -> dict[str, Any]:
    return request.get("home_team" if team == "HOME" else "away_team") or {}


def _parse_holds(raw: str | None) -> list[dict[str, Any]]:
    """Client-reported 'kept it as is' decisions (JSON list of {clock, label,
    alt?}). Presentation-only input: they never reach the engine."""
    if not raw:
        return []
    try:
        val = json.loads(raw)
    except (TypeError, ValueError):
        raise HTTPException(400, "holds must be a JSON list")
    if not isinstance(val, list):
        raise HTTPException(400, "holds must be a JSON list")
    return coach.clean_holds(val)


def _decision_list(commands: list[dict[str, Any]], team: str, names: dict[str, str],
                   base_tactics: dict[str, Any] | None) -> list[dict[str, Any]]:
    groups = coach.group_commands(commands, team)
    labels = coach.group_labels(commands, team, names, base_tactics)
    return [{"index": i, "clock": int(g[0]["sim_clock"]), "minute": coach._minute(int(g[0]["sim_clock"])),
             "label": labels[i][0], "detail": labels[i][1]} for i, g in enumerate(groups)]


def _insights_payload(engine: MatchEngine, team: str, commands: list[dict[str, Any]],
                      request: dict[str, Any], holds: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    now = engine.clock
    events = [e.to_dict() for e in engine.events]
    snap = bridge.match_snapshot(engine, len(engine.events))
    ctx = {"events": events, "now": now, "team": team, "players": snap["players"],
           "management": snap["management"], "bench": _unused_bench(engine, team),
           "score": dict(engine.score), "subs_used": engine.substitutions_used[team],
           "commands": [c for c in commands if int(c["sim_clock"]) <= now],
           "team_names": {"HOME": (request.get("home_team") or {}).get("name") or "Home",
                          "AWAY": (request.get("away_team") or {}).get("name") or "Away"},
           "duration": engine.config.duration_seconds}
    w = coach.window_metrics(events, team, max(0, now - coach.WINDOW), now)
    names = _names(engine)
    base = _side(request, team).get("tactics")
    insights = coach.live_insights(ctx)
    system_report = None
    bb = (request.get("builds") or {}).get(team) or {}
    if bb.get("system_id"):
        system = bld.get_system(bb["system_id"], bb)
        pstats = {pid:dict(p, team_id=p["team"]) for pid,p in snap["players"].items()}
        stats = dict(snap["team_stats"]["home" if team == "HOME" else "away"])
        stats["possession"] = snap["possession"]["home" if team == "HOME" else "away"]
        metrics = bld.pillar_metrics(events, team, pstats, stats)
        ratios = {"field_tilt", "possession", "xg_per_shot", "aerials_won_share", "pass_completion", "contributors"}
        pillars = []
        for p in system.get("pillars", []):
            value = metrics.get(p["metric"], 0)
            # Count pillars are compared on a disclosed 90-minute rate.
            projected = value if p["metric"] in ratios else value * 5400 / max(1, now)
            pillars.append(dict(p, value=value, projected=round(projected,2), grade=bld.grade_pillar(p,projected)))
        system_report = {"name":system["name"], "pillars":pillars}
        weak = [p for p in pillars if p["grade"] == "weak"]
        if now >= 1800 and weak:
            p = weak[0]
            insights.append({"id":f"system:{system['id']}:{p['id']}", "kind":"system", "severity":1,
                             "minute":coach._minute(now), "title":f"{system['name']}: {p['label']}",
                             "text":f"{p['label']}: {p['value']:.2f} so far; the system benchmark is {p['benchmark']}. "
                                     + ("The current rate over 90 minutes is " + str(p['projected']) + "." if p['metric'] not in ratios else ""),
                             "why":"Measured from this match's events.", "actions":[]})
    return {"clock": now, "team": team, "system_report":system_report,
            "insights": insights,
            "impacts": coach.change_impacts(events, ctx["commands"], team, now, names, base,
                                            holds=[h for h in (holds or []) if h["clock"] <= now]),
            "decisions": _decision_list(ctx["commands"], team, names, base),
            "momentum": coach.momentum(events, max(1, now)),
            "window": {k: w.get(k, 0) for k in ("xg_for", "xg_against", "shots_for",
                                                 "shots_against", "box_for", "box_against",
                                                 "possession", "goals_for", "goals_against")}}


@app.get("/api/matches/{match_id}/insights")
def match_insights(match_id: str, team: str = "HOME", at: int | None = None,
                   holds: str | None = None) -> dict[str, Any]:
    """Assistant-coach read of the match as the manager sees it: events <= at,
    engine state exactly at ``at`` (checkpoint + replay, never the server's
    prefetched future). ``holds``: the manager's deliberate 'keep it as is'
    calls (JSON), tracked like changes."""
    team = _team_id_http(team)
    hl = _parse_holds(holds)
    tl = _timeline(match_id)
    at_ = tl["clock"] if at is None else max(0, min(int(at), tl["clock"]))
    s = tl.get("session")
    if s is not None and at_ == tl["clock"]:
        with s["lock"]:
            if s["engine"].clock == at_:
                return _insights_payload(s["engine"], team, s["commands"], s["request"], hl)
    eng = _engine_at(tl, at_)
    return _insights_payload(eng, team, tl["commands"], tl["request"], hl)


def _team_id_http(team: str) -> str:
    try:
        return _team_id(team)
    except BridgeError as e:
        raise HTTPException(400, str(e))


@app.post("/api/matches/batch")
def batch_matches(req: BatchRequest) -> dict[str, Any]:
    """A whole matchweek at once on the worker pool; each match is persisted
    exactly like mode=full. Results keep request order."""
    _require_native("Batch simulation")
    if not req.requests:
        return {"results": []}
    if len(req.requests) > 20:
        raise HTTPException(400, "At most 20 fixtures per batch")
    bodies = []
    for i, raw in enumerate(req.requests):
        try:
            sr = StartRequest(**raw)
        except Exception as e:  # pydantic validation
            raise HTTPException(400, f"requests[{i}]: {e}")
        if sr.fixture_id is None or sr.seed is None or not sr.home_team or not sr.away_team:
            raise HTTPException(400, f"requests[{i}]: fixture_id, seed and both teams are required")
        body = sr.model_dump()
        if raw.get("_build_prepared"):
            body["_build_prepared"] = raw["_build_prepared"]
        body["mode"] = "full"
        for k in ("scenario_id", "start_clock"):
            body.pop(k, None)
        try:
            bridge.build_team(body["home_team"], "HOME"); bridge.build_team(body["away_team"], "AWAY")
        except (BridgeError, ValueError, KeyError, TypeError) as e:
            raise HTTPException(400, f"requests[{i}] ({body['fixture_id']}): {e}")
        if not body.get("_build_prepared"):
            if body.get("build"):
                body["build"] = dict(body["build"], control="cpu")
            for team, bb in (body.get("builds") or {}).items():
                body["builds"][team] = dict(bb, control="cpu")
        body = _prepare(body)
        bodies.append(body)
    t0 = time.time()
    outs = labsim.run_all(labsim.sim_record, [(b,) for b in bodies])
    results = []
    for body, out in zip(bodies, outs):
        match_id = uuid.uuid4().hex[:12]
        store.create_match(match_id, body.get("save_id", "local"), body["fixture_id"],
                           int(body["seed"]), json.dumps(body, separators=(",", ":")),
                           VERSIONS, status="live")
        store.complete_match(match_id, out["score"]["HOME"], out["score"]["AWAY"],
                             out["record_json"], out["ledger_json"])
        store.update_clock(match_id, engine_duration(body))
        ft = out["summary"] if req.summary_only else json.loads(out["record_json"])["full_time"]
        results.append({"match_id": match_id, "fixture_id": body["fixture_id"],
                        "status": "ft", "full_time": ft})
    log.info("BATCH_COMPLETED n=%d secs=%.2f", len(results), time.time() - t0)
    return {"results": results}


# ── matchweek round: idempotent + resumable ────────────────────────────────
# The client finalises a week in steps it can resume after a reload. The other
# nine fixtures are asked for here: fixtures this save already finished with
# the identical request are returned from storage (no re-simulation, no
# duplicate rows), a round that is still running for another tab/reload is
# joined rather than started twice, and the work completes even if the tab
# that asked for it has gone.
_ROUND_INFLIGHT: dict[str, Any] = {}
_ROUND_LOCK = threading.Lock()


def _round_key(body: dict[str, Any]) -> str:
    canon = {k: v for k, v in body.items() if k not in ("mode",)}
    return hashlib.blake2b(json.dumps(canon, sort_keys=True, separators=(",", ":")).encode(),
                           digest_size=12).hexdigest()


def _stored_round_result(body: dict[str, Any], key: str, summary_only: bool) -> dict[str, Any] | None:
    row = store.find_match(body.get("save_id", "local"), body["fixture_id"])
    if not row or row["status"] != "ft" or not row["result_json"]:
        return None
    try:
        sreq = json.loads(row["start_request_json"])
    except Exception:
        return None
    if _round_key(sreq) != key:
        return None
    rec = json.loads(row["result_json"])
    ft = rec.get("full_time") or {}
    if summary_only:
        ft = labsim.summarize_full_time(ft)
    return {"match_id": row["match_id"], "fixture_id": body["fixture_id"], "status": "ft",
            "full_time": ft, "reused": True}


@app.post("/api/matchweek/round")
def matchweek_round(req: RoundRequest) -> dict[str, Any]:
    _require_native("Round simulation")
    if not req.requests:
        return {"results": [], "reused": 0, "simulated": 0}
    if len(req.requests) > 20:
        raise HTTPException(400, "At most 20 fixtures per round")
    t0 = time.time()
    bodies, keys = [], []
    for i, raw in enumerate(req.requests):
        try:
            sr = StartRequest(**raw)
        except Exception as e:
            raise HTTPException(400, f"requests[{i}]: {e}")
        if sr.fixture_id is None or sr.seed is None or not sr.home_team or not sr.away_team:
            raise HTTPException(400, f"requests[{i}]: fixture_id, seed and both teams are required")
        body = sr.model_dump()
        if raw.get("_build_prepared"):
            body["_build_prepared"] = raw["_build_prepared"]
        body["mode"] = "full"
        for k in ("scenario_id", "start_clock"):
            body.pop(k, None)
        if not body.get("_build_prepared"):
            if body.get("build"):
                body["build"] = dict(body["build"], control="cpu")
            for team, bb in (body.get("builds") or {}).items():
                body["builds"][team] = dict(bb, control="cpu")
        body = _prepare(body)
        bodies.append(body)
        keys.append(_round_key(body))
    results: list[Any] = [None] * len(bodies)
    todo, waits = [], []
    with _ROUND_LOCK:
        for i, (body, key) in enumerate(zip(bodies, keys)):
            got = _stored_round_result(body, key, req.summary_only)
            if got is not None:
                results[i] = got
            elif key in _ROUND_INFLIGHT:
                waits.append((i, _ROUND_INFLIGHT[key]))
            else:
                ev = threading.Event()
                _ROUND_INFLIGHT[key] = ev
                todo.append(i)
    reused = sum(1 for r in results if r is not None)
    try:
        if todo:
            out = batch_matches(BatchRequest(requests=[bodies[i] for i in todo],
                                             summary_only=req.summary_only))["results"]
            for i, r in zip(todo, out):
                results[i] = r
    finally:
        with _ROUND_LOCK:
            for i in todo:
                ev = _ROUND_INFLIGHT.pop(keys[i], None)
                if ev is not None:
                    ev.set()
    for i, ev in waits:
        ev.wait(timeout=300)
        got = _stored_round_result(bodies[i], keys[i], req.summary_only)
        if got is None:
            got = batch_matches(BatchRequest(requests=[bodies[i]], summary_only=req.summary_only))["results"][0]
        results[i] = got
    log.info("ROUND n=%d reused=%d joined=%d simulated=%d secs=%.2f", len(bodies), reused,
             len(waits), len(todo), time.time() - t0)
    return {"results": results, "reused": reused, "simulated": len(todo)}


def _finished_record(match_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    row = store.get_match(match_id)
    if not row:
        raise HTTPException(404, "No persisted record for that match ID")
    if row["status"] != "ft" or not row["result_json"]:
        raise HTTPException(409, "The match hasn't finished yet.")
    return row, json.loads(row["result_json"])


def _team_names(req: dict[str, Any]) -> dict[str, str]:
    return {"HOME": (req.get("home_team") or {}).get("name") or (req.get("home_team") or {}).get("club_id") or "Home",
            "AWAY": (req.get("away_team") or {}).get("name") or (req.get("away_team") or {}).get("club_id") or "Away"}


@app.get("/api/matches/{match_id}/review")
def match_review(match_id: str, team: str = "HOME", holds: str | None = None) -> dict[str, Any]:
    team = _team_id_http(team)
    hl = _parse_holds(holds)
    row, record = _finished_record(match_id)
    ft = record["full_time"]
    if not ft.get("events"):
        ft = dict(ft, events=store.ledger(match_id) or [])
    req = json.loads(row["start_request_json"])
    out = coach.review(ft, team, _cmd_rows(match_id), _team_names(req), _side(req, team).get("tactics"),
                       holds=hl)
    out.update(bld.review_report(ft, req, team))
    return out


def _points(gf: int, ga: int) -> int:
    return 3 if gf > ga else 1 if gf == ga else 0


def _arm_stats(outs: list[dict[str, Any]], team: str) -> dict[str, Any]:
    other = coach.opp(team)
    n = max(1, len(outs))
    pts = [_points(o["score"][team], o["score"][other]) for o in outs]
    gd = [o["score"][team] - o["score"][other] for o in outs]
    return {"exp_points": round(sum(pts) / n, 2),
            "win": round(sum(1 for p in pts if p == 3) / n, 3),
            "draw": round(sum(1 for p in pts if p == 1) / n, 3),
            "loss": round(sum(1 for p in pts if p == 0) / n, 3),
            "avg_gd": round(sum(gd) / n, 2),
            "xg_for": round(sum(o["xg_after"][team] for o in outs) / n, 2),
            "xg_against": round(sum(o["xg_after"][other] for o in outs) / n, 2)}


def _lab_seed(seed: int, k: int) -> int:
    h = hashlib.blake2b(f"decision-lab|{seed}|{k}".encode(), digest_size=6).digest()
    return int.from_bytes(h, "big")


# Decision Lab results are a pure function of (finished match, team, K,
# commands, holds): cache them so reopening the Lab never re-runs it.
_LAB_CACHE: "OrderedDict[tuple, dict[str, Any]]" = OrderedDict()
_LAB_LOCK = threading.Lock()
_LAB_KINDS = ("tactics", "substitution", "instructions", "formation")


def _pts_word(n: int) -> str:
    return f"{abs(n)} point{'s' if abs(n) != 1 else ''}"


def _lab_text(K: int, mins: int, what: str, alt: str, w: dict, wo: dict, se: float,
              verdict: str, same: int, actual: list[int], ex: list[int]) -> tuple[str, str]:
    """(text, this-match summary). The average over K paired futures and this
    very match's counterfactual, told together so they never read as a contradiction."""
    exd = _points(*actual) - _points(*ex)
    if same == K and w == wo:
        avg = (f"Across {K} replays of the last {mins} minutes it made no difference in any of the "
               f"{K} futures — every one ended exactly the same {what} or not.")
    else:
        tail = {"helped": " — on average it helped.",
                "hurt": " — on average it cost you.",
                "no clear effect": " — too close to call on average."}[verdict]
        avg = (f"Across {K} replays of the last {mins} minutes: {w['exp_points']:.1f} points on average "
               f"with {what} vs {wo['exp_points']:.1f} {alt} (±{se:.1f}){tail}")
    res = f"{ex[0]}–{ex[1]}"
    if exd == 0:
        here = f" In this match itself, {alt} would also have ended {res}: no difference here."
        short = "This match: same result"
    else:
        opposed = (verdict == "hurt" and exd > 0) or (verdict == "helped" and exd < 0)
        lead = " But" if opposed else " And"
        here = (f"{lead} in this match as it actually played out, {alt} would have ended {res} — "
                + (f"here it earned you {_pts_word(exd)}." if exd > 0 else f"here it cost you {_pts_word(exd)}."))
        short = f"This match: {'+' if exd > 0 else '−'}{_pts_word(exd)}"
    return avg + here, short


@app.post("/api/matches/{match_id}/decision-lab")
def decision_lab(match_id: str, req: DecisionLabRequest) -> dict[str, Any]:
    """Did your decisions help? For each decision moment (your commands
    within 120 s of each other): K paired alternate futures from that minute
    WITH all your commands from then on vs WITHOUT (stand pat; earlier
    decisions kept). Same K reseeds in both arms (common random numbers), so
    the difference isolates the decision, not the dice. Deliberate holds
    ("keep it as is", reported by the client) are indexed after the changes
    and tested against the alternative the manager turned down."""
    _require_native("The Decision Lab")
    team = _team_id_http(req.team)
    other = coach.opp(team)
    row, record = _finished_record(match_id)
    tl = _timeline(match_id)
    K = max(2, min(40, int(req.samples)))
    commands = tl["commands"]
    groups = coach.group_commands(commands, team)
    holds = coach.clean_holds(req.holds)
    total = len(groups) + len(holds)
    ft_score = record["full_time"]["score"]
    actual = [ft_score["home" if team == "HOME" else "away"], ft_score["away" if team == "HOME" else "home"]]
    idxs = list(range(total))
    if req.index is not None and total:
        if not 0 <= int(req.index) < total:
            raise HTTPException(400, f"index must be 0..{total - 1}")
        idxs = [int(req.index)]
    ckey = (match_id, team, K, hashlib.blake2b(json.dumps([commands, holds], sort_keys=True,
                                                          separators=(",", ":"), default=str).encode(),
                                               digest_size=12).hexdigest())
    with _LAB_LOCK:
        hit = {i: _LAB_CACHE[ckey + (i,)] for i in idxs if ckey + (i,) in _LAB_CACHE}
        for i in hit:
            _LAB_CACHE.move_to_end(ckey + (i,))
    todo = [i for i in idxs if i not in hit]
    names = {}
    for p in ("home_team", "away_team"):
        side = tl["request"].get(p) or {}
        for pd in list((side.get("lineup") or {}).values()) + list(side.get("bench") or []):
            if pd:
                names[str(pd["id"])] = pd["name"]
    seeds = [_lab_seed(int(tl["meta"]["seed"]), k) for k in range(K)]
    glabels = coach.group_labels(commands, team, names, _side(tl["request"], team).get("tactics"))
    dur = engine_duration(tl["request"])
    jobs, plan, fresh = [], [], {}
    for gi in todo:
        if gi < len(groups):
            c0 = int(groups[gi][0]["sim_clock"])
            base = _engine_at(tl, c0, strict=True)
            rest = [c for c in commands if int(c["sim_clock"]) >= c0]
            alt_arm = [c for c in rest if str(c["payload"].get("team", "")).upper() != team]
            meta = {"kind": "change", "label": glabels[gi][0], "detail": glabels[gi][1],
                    "what": "your change" if len(groups[gi]) == 1 else "your changes",
                    "alt": "standing pat", "arms": {"with": "With your call", "without": "Standing pat"}}
        else:
            h = holds[gi - len(groups)]
            c0 = h["clock"]
            alt = h["alt"] or {}
            kind = alt.get("kind") or alt.get("type")
            payload = alt.get("payload") if isinstance(alt.get("payload"), dict) else None
            alt_label = h["alt_label"] or "the alternative"
            meta = {"kind": "hold", "label": h["label"], "detail": f"Kept the plan instead of: {alt_label}",
                    "what": "keeping it as is", "alt": f"choosing '{alt_label}'",
                    "arms": {"with": "Kept it as is", "without": f"'{alt_label}' instead"}}
            if kind not in _LAB_KINDS or payload is None or c0 >= dur:
                fresh[gi] = dict(meta, index=gi, minute=coach._minute(c0), clock=c0, testable=False,
                                 text="There was no alternative on the table to test this against.")
                continue
            base = _engine_at(tl, c0, strict=True)
            rest = [c for c in commands if int(c["sim_clock"]) >= c0]
            alt_cmd = {"sim_clock": c0, "kind": kind, "payload": dict(payload, team=team)}
            alt_arm = [alt_cmd] + rest
        blob = pickle.dumps(base, protocol=pickle.HIGHEST_PROTOCOL)
        start = len(jobs)
        jobs += [(blob, rest, sd) for sd in seeds]
        jobs += [(blob, alt_arm, sd) for sd in seeds]
        jobs.append((blob, alt_arm, None))
        plan.append((gi, c0, start, meta))
    outs = labsim.run_all(labsim.finish, jobs) if jobs else []
    for gi, c0, st, meta in plan:
        w_out, wo_out, exact = outs[st:st + K], outs[st + K:st + 2 * K], outs[st + 2 * K]
        w, wo = _arm_stats(w_out, team), _arm_stats(wo_out, team)
        delta = round(w["exp_points"] - wo["exp_points"], 2)
        # paired samples (same reseeds in both arms): the standard error of
        # the mean per-seed difference says how sure the verdict can be
        diffs = [_points(a["score"][team], a["score"][other]) - _points(b["score"][team], b["score"][other])
                 for a, b in zip(w_out, wo_out)]
        same = sum(1 for a, b in zip(w_out, wo_out) if a["score"] == b["score"])
        md = sum(diffs) / max(1, len(diffs))
        se = (sum((x - md) ** 2 for x in diffs) / max(1, len(diffs) - 1)) ** 0.5 / max(1, len(diffs)) ** 0.5
        se = round(se, 2)
        clear = abs(delta) >= max(0.25, 1.5 * se)
        verdict = ("helped" if delta > 0 else "hurt") if clear else "no clear effect"
        ex = [exact["score"][team], exact["score"][other]]
        mins = max(1, round((dur - c0) / 60))
        text, here = _lab_text(K, mins, meta["what"], meta["alt"], w, wo, se, verdict, same, actual, ex)
        fresh[gi] = {"index": gi, "minute": coach._minute(c0), "clock": c0,
                     "kind": meta["kind"], "label": meta["label"], "detail": meta["detail"],
                     "arms": meta["arms"], "testable": True,
                     "actual": {"score": actual, "points": _points(*actual)},
                     "exact_without": {"score": ex, "points": _points(*ex)},
                     "exact_delta_points": _points(*actual) - _points(*ex),
                     "with": w, "without": wo, "delta_points": delta, "delta_se": se,
                     "same_results": same, "identical": same == K and w == wo,
                     "verdict": verdict, "text": text, "this_match": here}
    with _LAB_LOCK:
        for gi, d in fresh.items():
            _LAB_CACHE[ckey + (gi,)] = d
        while len(_LAB_CACHE) > 400:
            _LAB_CACHE.popitem(last=False)
    decisions = [hit.get(i) or fresh[i] for i in idxs]
    return {"samples": K, "team": team, "decision_count": total, "decisions": decisions,
            "cached": not jobs}


@app.post("/api/matches/{match_id}/branch")
def branch_match(match_id: str, req: BranchRequest) -> dict[str, Any]:
    """"Replay from here": a new live exhibition match with the source's
    kickoff input and every command up to ``at_clock``, positioned there.
    Make the same decisions and you get the same match."""
    _require_native("Replay from here")
    row = store.get_match(match_id)
    if not row:
        raise HTTPException(404, "No persisted record for that match ID")
    tl = _timeline(match_id)
    dur = engine_duration(tl["request"])
    at = int(req.at_clock)
    if not 0 <= at < dur:
        raise HTTPException(400, f"at_clock must be between 0 and {dur - 1}")
    if at > tl["clock"]:
        raise HTTPException(400, "Can't branch from a moment the match hasn't reached yet.")
    takeover = int(tl["request"].get("takeover_clock") or 0)
    if at < takeover:
        raise HTTPException(400, f"You took charge at {takeover // 60}' — rehearse from then on.")
    body = dict(tl["request"])
    body["mode"] = "live"
    body["fixture_id"] = f"{row['fixture_id']}#branch"
    body["branch_of"] = match_id
    if req.save_id:
        body["save_id"] = req.save_id
    body.pop("start_clock", None)
    commands = [c for c in tl["commands"] if int(c["sim_clock"]) <= at]
    engine = _engine_at(tl, at)
    new_id = uuid.uuid4().hex[:12]
    meta = {"fixture_id": body["fixture_id"], "seed": int(body["seed"]),
            "save_id": body.get("save_id", "local")}
    with _SESSIONS_LOCK:
        if len(ACTIVE_MATCHES) >= MAX_SESSIONS:
            raise HTTPException(429, "Server is at live-match capacity. Try again shortly.")
        store.create_match(new_id, meta["save_id"], meta["fixture_id"], meta["seed"],
                           json.dumps(body, separators=(",", ":")), VERSIONS)
        for c in commands:
            store.append_command(new_id, int(c["sim_clock"]), c["kind"],
                                 json.dumps(c["payload"], separators=(",", ":")), None)
        cps = [cp for cp in tl["cps"] if cp[0] <= at and cp[1] <= len(commands)]
        s = _new_session(engine, body, meta, commands, cps)
        _cp_take(s)
        ACTIVE_MATCHES[new_id] = s
    store.update_clock(new_id, engine.clock)
    _mlog(new_id, "MATCH_BRANCHED", branch_of=match_id, clock=at)
    snap = bridge.match_snapshot(engine, 0)
    snap.update({"match_id": new_id, "fixture_id": meta["fixture_id"],
                 "save_id": meta["save_id"], "branch_of": match_id})
    return snap


# ── scenarios & challenges ──────────────────────────────────────────────────
SCENARIO_KINDS = {
    # kind: (takeover clock, condition(summary, team) -> bool)
    "chase": 3600, "comeback": 3300, "protect": 4200, "tenmen": 3600, "deadlock": 3900,
}
SCENARIO_MAX_CANDIDATES = 96


def _scenario_holds(kind: str, st: dict[str, Any], team: str) -> bool:
    other = coach.opp(team)
    diff = st["score"][team] - st["score"][other]
    if kind == "chase":
        return diff == -1
    if kind == "comeback":
        return diff == -2
    if kind == "protect":
        return diff == 1
    if kind == "tenmen":
        return st["reds"][team] >= 1 and st["reds"][team] > st["reds"][other] and diff in (0, -1)
    if kind == "deadlock":
        return st["score"][team] == 0 and st["score"][other] == 0 and st["xg"][team] < st["xg"][other]
    return False


def _stand_pat_stars(kind: str, final: dict[str, Any], team: str) -> int:
    """Stars a manager would earn by changing nothing (the unmanaged match
    with the scenario seed IS the stand-pat future). Challenges are only
    chosen where doing nothing isn't already a good answer."""
    other = coach.opp(team)
    return _scenario_stars(kind, final["score"][team], final["score"][other])


def _scenario_hash(request: dict[str, Any], team: str, kind: str, base_seed: int) -> str:
    canon = {k: v for k, v in request.items() if k not in ("seed", "save_id", "mode", "scenario_id",
                                                           "start_clock")}
    blob = json.dumps({"v": 2, "request": canon, "team": team, "kind": kind, "base_seed": int(base_seed)},
                      sort_keys=True, separators=(",", ":"))
    return hashlib.blake2b(blob.encode(), digest_size=8).hexdigest()


@app.post("/api/scenarios/find")
def find_scenario(req: ScenarioFindRequest) -> dict[str, Any]:
    """Deterministic seeded scenario: the lowest seed >= base_seed (at most 96
    candidates) whose natural, unmanaged match reaches the scenario state at
    the takeover minute. Candidates are evaluated in parallel in fixed-size
    ordered chunks, so the chosen seed never depends on worker timing."""
    _require_native("Scenarios")
    team = _team_id_http(req.team)
    kind = str(req.kind).lower()
    if kind not in SCENARIO_KINDS:
        raise HTTPException(400, f"kind must be one of {sorted(SCENARIO_KINDS)}")
    try:
        sr = StartRequest(**{**req.request, "seed": req.request.get("seed", req.base_seed),
                             "fixture_id": req.request.get("fixture_id") or "scenario"})
    except Exception as e:
        raise HTTPException(400, f"request: {e}")
    if not sr.home_team or not sr.away_team:
        raise HTTPException(400, "request needs home_team and away_team")
    body = sr.model_dump()
    for k in ("scenario_id", "start_clock"):
        body.pop(k, None)
    body["mode"] = "live"
    try:
        _build_engine(body)
    except (BridgeError, ValueError, KeyError, TypeError) as e:
        raise HTTPException(400, str(e))
    dday = _daily_date(body)
    if dday is not None and dday > _utc_day():
        raise HTTPException(400, f"The {dday} Daily isn't out yet — today is {_utc_day()} (UTC).")
    sid = _scenario_hash(body, team, kind, int(req.base_seed))
    got = store.get_scenario(sid)
    if got:
        return json.loads(got["result_json"])
    t0 = time.time()
    dur = engine_duration(body)
    clocks = sorted({SCENARIO_KINDS[kind], SCENARIO_KINDS["chase"], dur})
    kc = clocks.index(SCENARIO_KINDS[kind])
    # every candidate is queued at once (full pool utilisation, no chunk
    # barriers); results are consumed strictly in seed order and the queue is
    # cancelled as soon as the lowest qualifying seed is known — so the answer
    # is independent of worker timing.
    ex = labsim.bg_pool()          # never starve league batches / Decision Lab
    futs = [ex.submit(labsim.sim_states, dict(body, seed=int(req.base_seed) + i), clocks)
            for i in range(SCENARIO_MAX_CANDIDATES)]
    states: list[list[dict[str, Any]]] = []
    chosen = None
    try:
        for i, f in enumerate(futs):
            out = f.result()
            states.append(out)
            if _scenario_holds(kind, out[kc], team) and _stand_pat_stars(kind, out[-1], team) <= 1:
                chosen = (i, kind, out[kc])
                break
    finally:
        for f in futs:
            f.cancel()
    fallback = chosen is None
    if fallback:
        ci = clocks.index(SCENARIO_KINDS["chase"])
        other = coach.opp(team)
        for strict in (True, False):
            for i, out in enumerate(states):
                if _scenario_holds("chase", out[ci], team) and (
                        not strict or _stand_pat_stars("chase", out[-1], team) <= 1):
                    chosen = (i, "chase", out[ci])
                    break
            if chosen is not None:
                break
        if chosen is None:        # never trails: take the tightest game at the hour
            i = min(range(len(states)), key=lambda j: (states[j][ci]["score"][team]
                                                       - states[j][ci]["score"][other], j))
            chosen = (i, "chase", states[i][ci])
    i, eff_kind, st = chosen
    seed = int(req.base_seed) + i
    stored_req = dict(body, seed=seed)
    result = coach.scenario_card(sid, kind if not fallback else "chase", seed, SCENARIO_KINDS[eff_kind],
                                 st, team, stored_req, fallback)
    result["team"] = team
    result["requested_kind"] = kind
    store.put_scenario(sid, result["kind"], team, seed, result["takeover_clock"],
                       json.dumps(stored_req, separators=(",", ":")),
                       json.dumps(result, separators=(",", ":")))
    log.info("SCENARIO_FOUND id=%s kind=%s seed=%s fallback=%s candidates=%d secs=%.2f",
             sid, result["kind"], seed, fallback, len(states), time.time() - t0)
    return json.loads(store.get_scenario(sid)["result_json"])


def _scenario_stars(kind: str, gf: int, ga: int) -> int:
    d = gf - ga
    if kind == "protect":
        return 3 if d >= 2 else 2 if d == 1 else 1 if d == 0 else 0
    if kind == "deadlock":
        return 3 if d > 0 else 1 if d == 0 else 0
    if kind == "comeback":
        return 3 if d > 0 else 2 if d == 0 else 1 if d == -1 else 0
    return 3 if d > 0 else 2 if d == 0 else 0         # chase, tenmen


def _leaderboard(scenario_id: str) -> list[dict[str, Any]]:
    return [{"manager_name": e["manager_name"], "stars": e["stars"],
             "score": [e["goals_for"], e["goals_against"]], "decisions": e["decisions"],
             "ts": e["ts"], "match_id": e["match_id"]}
            for e in store.challenge_entries(scenario_id)]


def _utc_day(ts: float | None = None) -> str:
    """The Daily's date is the server's UTC day — never the browser clock."""
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() if ts is None else ts))


def _daily_date(request_or_json: Any) -> str | None:
    """`DAILY-YYYY-MM-DD` fixture ids mark a Touchline Daily."""
    req = json.loads(request_or_json) if isinstance(request_or_json, str) else request_or_json
    fid = str((req or {}).get("fixture_id") or "")
    return fid[6:16] if fid.startswith("DAILY-") and len(fid) >= 16 else None


def _clean_player_id(pid: str | None) -> str | None:
    if pid is None:
        return None
    pid = str(pid).strip()
    if not (8 <= len(pid) <= 64) or not all(ch.isalnum() or ch in "-_" for ch in pid):
        raise HTTPException(400, "Invalid player_id")
    return pid


STARS_TABLE_RANGE = range(-6, 7)


@app.get("/api/daily")
def daily_info() -> dict[str, Any]:
    """Authoritative Daily date (server UTC day) + the star rules, so the UI
    shows exactly the stars the leaderboard will record."""
    return {"date": _utc_day(), "server_time": time.time(),
            "stars": {k: {str(d): _scenario_stars(k, max(d, 0), max(-d, 0)) for d in STARS_TABLE_RANGE}
                      for k in SCENARIO_KINDS}}


@app.post("/api/challenges/{scenario_id}/attempt")
def challenge_attempt(scenario_id: str, req: ChallengeAttemptRequest) -> dict[str, Any]:
    """Start a challenge match for a player. For the Daily, the first attempt a
    player starts on the day is ranked; every later one is practice. An
    unfinished ranked attempt is handed back for resuming rather than
    replaced."""
    sc = store.get_scenario(scenario_id)
    if not sc:
        raise HTTPException(404, "Unknown scenario_id")
    pid = _clean_player_id(req.player_id)
    day = _daily_date(sc["request_json"])
    today = _utc_day()
    ranked, reason = True, None
    if day is not None:
        if day > today:
            raise HTTPException(400, f"The {day} Daily isn't out yet — today is {today} (UTC).")
        prior = v2db.ranked_attempt(scenario_id, pid)
        if day < today:
            ranked, reason = False, f"The {day} Daily has closed — this is a practice run."
        elif prior:
            row = store.get_match(prior["match_id"])
            if row and row["status"] == "live":
                try:
                    snap = get_match(prior["match_id"])
                except HTTPException:
                    snap = None
                if snap is not None and snap.get("status") != "ft":
                    return {"ranked": True, "resume": True, "match_id": prior["match_id"],
                            "snapshot": snap, "day": day, "reason": "Resuming your ranked attempt."}
            ranked, reason = False, "You've used today's ranked attempt — this one is practice."
    snap = start_match(StartRequest(scenario_id=scenario_id, mode="live", save_id=req.save_id))
    v2db.put_attempt(snap["match_id"], scenario_id, pid, ranked, today)
    return {"ranked": ranked, "resume": False, "match_id": snap["match_id"], "snapshot": snap,
            "day": day, "reason": reason}


@app.post("/api/challenges/{scenario_id}/submit")
def submit_challenge(scenario_id: str, req: ChallengeSubmitRequest) -> dict[str, Any]:
    sc = store.get_scenario(scenario_id)
    if not sc:
        raise HTTPException(404, "Unknown scenario_id")
    name = " ".join(str(req.manager_name).split())[:40]
    if not name:
        raise HTTPException(400, "manager_name is required")
    pid = _clean_player_id(req.player_id)
    row = store.get_match(req.match_id)
    if not row:
        raise HTTPException(404, "No persisted record for that match ID")
    sreq = json.loads(row["start_request_json"])
    if sreq.get("branch_of"):
        raise HTTPException(400, "Rehearsals don't count — submit the match you played for real.")
    if sreq.get("scenario_id") != scenario_id or int(row["seed"]) != int(sc["seed"]):
        raise HTTPException(400, "That match wasn't played from this scenario.")
    if row["status"] != "ft":
        raise HTTPException(409, "Finish the match before submitting it.")
    team = sc["team"]
    gf = row["score_home"] if team == "HOME" else row["score_away"]
    ga = row["score_away"] if team == "HOME" else row["score_home"]
    stars = _scenario_stars(sc["kind"], gf, ga)
    decisions = len(coach.group_commands(_cmd_rows(req.match_id), team))
    out = {"stars": stars, "score": [gf, ga], "decisions": decisions}
    day = _daily_date(sc["request_json"])
    if day is not None:
        # the Daily: only a player's ranked attempt, started on the day, counts
        att = v2db.attempt_for_match(req.match_id)
        why = None
        if pid is None:
            why = "Daily entries need a player id."
        elif not att or att["player_id"] != pid:
            why = "Only matches started as your Daily attempt can be ranked."
        elif not att["ranked"]:
            why = "Practice run — your ranked Daily attempt was your first one."
        elif att["day"] != day:
            why = f"The {day} Daily has closed."
        if why:
            board = _leaderboard(scenario_id)
            mine = v2db.challenge_entry_for_player(scenario_id, pid) if pid else None
            return {**out, "ranked": False, "practice": True, "reason": why,
                    "rank": _rank_of(board, mine), "total": len(board), "best": False}
    if pid is not None:
        taken = store.challenge_entry(scenario_id, name)
        if taken and taken.get("player_id") != pid:
            raise HTTPException(409, "That name is already on this leaderboard — pick another.")
        prior = store.challenge_entry_for_match(req.match_id)
        if prior and prior.get("player_id") != pid:
            raise HTTPException(409, "That match has already been submitted by another manager.")
        cur = v2db.challenge_entry_for_player(scenario_id, pid)
        better = cur is None or ((stars, gf - ga, -decisions)
                                 > (cur["stars"], cur["goals_for"] - cur["goals_against"], -cur["decisions"]))
        if better:
            v2db.put_player_entry(scenario_id, pid, name, req.match_id, stars, gf, ga, decisions)
        elif cur["manager_name"] != name:
            v2db.rename_player_entry(scenario_id, pid, name)
        board = _leaderboard(scenario_id)
        mine = v2db.challenge_entry_for_player(scenario_id, pid)
        return {**out, "ranked": True, "practice": False, "rank": _rank_of(board, mine),
                "total": len(board), "best": better}
    # legacy (no player id): best per manager name
    prior = store.challenge_entry_for_match(req.match_id)
    if prior and prior["manager_name"] != name:
        raise HTTPException(409, "That match has already been submitted by another manager.")
    cur = store.challenge_entry(scenario_id, name)
    if cur is not None and cur.get("player_id"):
        raise HTTPException(409, "That name is already on this leaderboard — pick another.")
    better = cur is None or ((stars, gf - ga, -decisions)
                             > (cur["stars"], cur["goals_for"] - cur["goals_against"], -cur["decisions"]))
    if better:
        store.put_challenge_entry(scenario_id, name, req.match_id, stars, gf, ga, decisions)
    board = _leaderboard(scenario_id)
    rank = next((k + 1 for k, e in enumerate(board) if e["manager_name"] == name), None)
    return {**out, "ranked": True, "practice": False, "rank": rank, "total": len(board), "best": better}


def _rank_of(board: list[dict[str, Any]], mine: dict[str, Any] | None) -> int | None:
    if not mine:
        return None
    return next((k + 1 for k, e in enumerate(board) if e["match_id"] == mine["match_id"]
                 and e["manager_name"] == mine["manager_name"]), None)


@app.get("/api/challenges/{scenario_id}/leaderboard")
def challenge_leaderboard(scenario_id: str, limit: int = 50, player_id: str | None = None) -> dict[str, Any]:
    if not store.get_scenario(scenario_id):
        raise HTTPException(404, "Unknown scenario_id")
    pid = _clean_player_id(player_id) if player_id else None
    rows = store.challenge_entries(scenario_id)
    board = []
    for e, r in zip(_leaderboard(scenario_id), rows):
        e = dict(e)
        e["me"] = bool(pid and r.get("player_id") == pid)
        board.append(e)
    out = {"entries": board[:max(1, min(200, int(limit)))], "total": len(board)}
    if pid:
        mine = next((k + 1 for k, e in enumerate(board) if e["me"]), None)
        att = v2db.ranked_attempt(scenario_id, pid)
        out["me"] = {"rank": mine, "ranked_attempt_used": bool(att)}
    return out


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str) -> dict[str, Any]:
    sc = store.get_scenario(scenario_id)
    if not sc:
        raise HTTPException(404, "Unknown scenario_id")
    return json.loads(sc["result_json"])


@app.post("/api/scout")
def scout_report(req: ScoutRequest) -> dict[str, Any]:
    try:
        return coach.scout(req.opponent, req.mine)
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(400, f"Can't scout that side: {e}")


# ── saves ─────────────────────────────────────────────────────────────────────
@app.put("/api/saves/{save_id}")
def put_save(save_id: str, req: SaveStateRequest) -> dict[str, Any]:
    if len(save_id) > 64 or not save_id.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(400, "Invalid save_id")
    blob = json.dumps(req.state, separators=(",", ":"))
    if len(blob) > 4_000_000:
        raise HTTPException(413, "Save state too large")
    store.upsert_save(save_id, blob, VERSIONS)
    return {"ok": True, "save_id": save_id}


@app.get("/api/saves/{save_id}")
def get_save(save_id: str) -> dict[str, Any]:
    if len(save_id) > 64:
        raise HTTPException(400, "Invalid save_id")
    row = store.get_save(save_id)
    if not row:
        # a fresh browser simply has no server-side save yet: not an error
        return {"save_id": save_id, "exists": False, "state": None}
    return {"save_id": save_id, "exists": True, "updated_ts": row["updated_ts"],
            "save_schema_version": row["save_schema_version"],
            "versions": {"app": row["app_version"], "engine": row["engine_version"],
                         "calibration": row["calibration_version"],
                         "player_data": row["player_data_version"]},
            "state": json.loads(row["state_json"])}


# ── debug bundle for bug reports ─────────────────────────────────────────────
@app.get("/api/matches/{match_id}/bundle")
def debug_bundle(match_id: str) -> dict[str, Any]:
    row = store.get_match(match_id)
    if not row:
        raise HTTPException(404, "No persisted record for that match ID")
    out = {k: row[k] for k in ("match_id", "save_id", "fixture_id", "seed", "status",
                               "app_version", "engine_version", "calibration_version",
                               "player_data_version", "last_clock", "score_home", "score_away")}
    out["start_request"] = json.loads(row["start_request_json"])
    out["commands"] = [{k: c[k] for k in ("seq", "sim_clock", "kind", "payload_json")}
                       for c in store.commands(match_id)]
    if row["result_json"]:
        out["result"] = json.loads(row["result_json"])
    led = store.ledger(match_id)
    if led is not None:
        import hashlib
        out["ledger_digest"] = hashlib.blake2b(
            json.dumps(led, sort_keys=True).encode()).hexdigest()[:24]
        out["ledger_events"] = len(led)
    return out


# ── static frontend ──────────────────────────────────────────────────────────
# Core Loop v2: all calculations delegate to the deterministic build module.
def _build_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except (BridgeError, ValueError, KeyError, TypeError) as e:
        raise HTTPException(400, str(e))


@app.get('/api/build/catalog')
def build_catalog():
    return bld.catalog()


@app.post('/api/build/evaluate')
def build_evaluate(body: dict[str, Any]):
    out = _build_call(bld.evaluate, body.get('squad', []), body.get('xi', {}), body.get('system_id'), body.get('build'))
    out['deck_min'] = bld.minimum_deck_size(body.get('build') or {'system_id':body.get('system_id')})
    return out


@app.post('/api/build/train')
def build_train(body: dict[str, Any]):
    return _build_call(bld.train, body.get('squad', []), body.get('build'), body.get('plan', []))


@app.post('/api/build/week_tick')
def build_week_tick(body: dict[str, Any]):
    return _build_call(bld.week_tick, body.get('squad', []), body.get('build'), body.get('lineups_played', []),
                       'midweek' if body.get('midweek') else body.get('week_kind', 'single'))


@app.post('/api/matches/{match_id}/card')
def play_card(match_id: str, body: dict[str, Any]):
    team = _team_id_http(body.get('team', 'HOME'))
    cmd = bld.card_command(body.get('card_id'), team, body.get('targets'))
    out = _management(match_id, 'card', cmd['payload'], body.get('request_id'), body.get('at_clock'))
    result = out.pop('card_result', {})
    cards = out['snapshot'].get('cards', {})
    state = cards.get(team, {})
    out.update(result, applied=True, cards=cards, influence={'now': state.get('influence'), 'max': state.get('max')})
    return out


@app.get('/api/matches/{match_id}/cards')
def cards_at(match_id: str, team: str = 'HOME', at: int | None = None):
    team = _team_id_http(team)
    if at is None:
        s = _session_rewindable(match_id)
        with s['lock']:
            engine = s['engine']
            return (bld.card_state(engine) or {}).get(team, {})
    tl = _timeline(match_id)
    if not 0 <= at <= tl['clock']:
        raise HTTPException(400, 'at must not be ahead of the recorded match')
    engine = _engine_at(tl, at)
    return (bld.card_state(engine) or {}).get(team, {})


@app.post('/api/build/preview')
def build_preview(body: dict[str, Any]):
    cid = body.get('card_id')
    if cid not in bld.CARDS:
        raise HTTPException(400, 'Unknown card_id')
    team = _team_id_http(body.get('side', 'HOME'))
    engine = None
    ctx = dict(body.get('state') or {})
    if body.get('match_id'):
        tl = _timeline(body['match_id'])
        at = int(body.get('at_clock') if body.get('at_clock') is not None else tl['clock'])
        if not 0 <= at <= tl['clock']:
            raise HTTPException(400, 'at_clock must not be ahead of the recorded match')
        engine = _engine_at(tl, at)
        ctx = bld.card_context(engine, team)
    table = bld.table_preview(cid, ctx)
    if table:
        return dict(table, card_id=cid, context=ctx)
    pid = _clean_player_id(body.get('player_id'))
    if engine is None or not pid:
        return {'card_id': cid, 'dxg_for': None, 'dxg_against': None, 'dpts': None, 'se': None, 'n': 0, 'context': ctx, 'source': 'none'}
    targets = dict(body.get('targets') or {})
    _build_call(bld.compile_card, engine, team, cid, targets)
    cmd = bld.card_command(cid, team, targets, force=True)
    cmd['sim_clock'] = engine.clock
    blob = pickle.dumps(engine)
    seeds = [_lab_seed(int(engine.rng.seed), i) for i in range(6)]
    jobs = [(blob, commands, seed, 900) for seed in seeds for commands in ([], [cmd])]
    save = str(tl['request'].get('save_id', 'local')); week = str(body.get('week', 0))
    bb = (tl['request'].get('builds') or {}).get(team) or {}
    if v2db.analyst_take(pid, save, week, bld.analyst_budget(bb)) is None:
        raise HTTPException(429, 'Your Analyst has used every run for this week')
    try:
        outs = labsim.run_all(labsim.finish_window, jobs)
    except Exception:
        v2db.analyst_refund(pid, save, week)
        raise
    other = coach.opp(team)
    diffs = [(_points(outs[i+1]['score'][team], outs[i+1]['score'][other]) - _points(outs[i]['score'][team], outs[i]['score'][other])) for i in range(0, 12, 2)]
    mean = sum(diffs) / 6
    return {'card_id': cid, 'dxg_for': sum(outs[i+1]['xg_window'][team] - outs[i]['xg_window'][team] for i in range(0,12,2))/6,
            'dxg_against': sum(outs[i+1]['xg_window'][other] - outs[i]['xg_window'][other] for i in range(0,12,2))/6,
            'dpts': mean, 'se': (sum((d-mean)**2 for d in diffs)/30)**.5, 'n': 6, 'context': ctx, 'source': 'live'}


def _analyst_summary(outs, team):
    other = coach.opp(team)
    n = len(outs)
    gf = [o['score'][team] for o in outs]; ga = [o['score'][other] for o in outs]
    return {'exp_points': sum(_points(f,a) for f,a in zip(gf,ga))/n,
            'win': sum(f>a for f,a in zip(gf,ga))/n, 'draw': sum(f==a for f,a in zip(gf,ga))/n,
            'loss': sum(f<a for f,a in zip(gf,ga))/n, 'goals_for': sum(gf)/n, 'goals_against': sum(ga)/n,
            'xg_for': sum(o['xg'][team] for o in outs)/n, 'xg_against': sum(o['xg'][other] for o in outs)/n,
            'pillars': {k: sum(o['pillars'].get(k,0) for o in outs)/n for k in outs[0]['pillars']},
            'card_plays': {cid: sum(p['card_id']==cid and p['team']==team for o in outs for p in o['card_plays'])
                           for cid in {p['card_id'] for o in outs for p in o['card_plays'] if p['team']==team}}}


@app.post('/api/analyst/test')
def analyst_test(body: dict[str, Any]):
    pid = _clean_player_id(body.get('player_id'))
    if not pid:
        raise HTTPException(400, 'player_id is required')
    raw = dict(body.get('start_request') or {})
    team = _team_id_http(raw.get('build_team', 'HOME'))
    build = body.get('build') or {}
    variants = body.get('variants') or []
    if len(variants) > 3:
        raise HTTPException(400, 'At most 3 variants per Analyst test')
    prepared = []
    for variant in [{}] + variants:
        req = dict(raw)
        req['build'] = dict(variant.get('build', build), hand=variant.get('hand', body.get('hand', [])), control='cpu', difficulty='hard')
        req.pop('_build_prepared', None)
        req = _prepare(req)
        _build_call(_build_engine, req)
        prepared.append(req)
    save = str(body.get('save_id', raw.get('save_id', 'local'))); week = str(body.get('week', 0))
    budget = bld.analyst_budget(build)
    stress = body.get('mode') == 'stress'
    cost = budget if stress else 1
    stress_requests = body.get('start_requests') or [raw, raw, raw]
    if stress and (not isinstance(stress_requests,list) or len(stress_requests)!=3):
        raise HTTPException(400, 'Stress test requires three start_requests')
    if stress:
        for template in stress_requests:
            _build_call(_build_engine, _prepare(dict(template, build=dict(build,hand=body.get('hand',[]),control='cpu'),build_team=team)))
    used = v2db.analyst_take(pid, save, week, budget, cost)
    if used is None:
        raise HTTPException(429, 'Your Analyst has used every run for this week')
    try:
        if stress:
            setups = [{}] + variants
            jobs = [(stress_requests, v.get('build',build), v.get('hand',body.get('hand',[])), team,
                     _lab_seed(int(raw.get('seed',0)),k)) for v in setups for k in range(16)]
            runs = labsim.run_all(labsim.analyst_stress,jobs)
            stress_summaries = []
            for i in range(0,len(runs),16):
                block = runs[i:i+16]
                weeks = [{'week':w+1,'summary':_analyst_summary([run[w] for run in block],team)} for w in range(3)]
                summary = _analyst_summary([out for run in block for out in run],team)
                summary['total_exp_points'] = sum(w['summary']['exp_points'] for w in weeks)
                stress_summaries.append({'summary':summary,'weeks':weeks})
            return dict(stress_summaries[0], mode='stress', n=16, matches=48, runs_left=budget-used, runs_used=used,
                        variants=[dict(label=v.get('label','Variant'),**s) for v,s in zip(variants,stress_summaries[1:])])
        jobs = [(dict(req, seed=_lab_seed(int(raw.get('seed', 0)), k)), team) for req in prepared for k in range(16)]
        outs = labsim.run_all(labsim.analyst_future, jobs)
        summaries = [_analyst_summary(outs[i:i+16], team) for i in range(0,len(outs),16)]
    except Exception:
        v2db.analyst_refund(pid, save, week, cost)
        raise
    return {'runs_left': budget-used, 'runs_used': used, 'n': 16, 'summary': summaries[0],
            'variants': [dict(label=v.get('label','Variant'), summary=s) for v,s in zip(variants,summaries[1:])]}


_GHOST_RUN_LOCK = threading.Lock()

def _ghost_identity(body):
    pid = _clean_player_id(body.get('player_id'))
    if not pid:
        raise HTTPException(400, 'player_id is required')
    return pid, str(body.get('manager_name') or 'Manager').strip()[:60] or 'Manager'


def _ghost_snapshot(snapshot):
    if not isinstance(snapshot, dict) or not snapshot.get('team'):
        raise HTTPException(400, 'snapshot must contain team and build')
    _build_call(bridge.build_team, snapshot['team'], 'HOME')
    _build_call(bld.prepare_request, {'seed': 0, 'home_team': snapshot['team'], 'build': snapshot.get('build') or {}})
    return snapshot


@app.get('/api/ghost/today')
def ghost_today(player_id: str):
    pid, _ = _ghost_identity({'player_id': player_id})
    day = _utc_day(); run = v2db.ghost_ranked(day,pid)
    return {'day': day, 'server_time': time.time(), 'ranked_used': bool(run),
            'ranked_match_ids': [r['match_id'] for r in json.loads(run['results_json'])] if run else [],
            'pool_size': v2db.ghost_count(day), 'rules': {'ranked_runs_per_day': 1, 'opponents': 3}}


@app.post('/api/ghost/submit')
def ghost_submit(body: dict[str, Any]):
    pid,name = _ghost_identity(body); snap = _ghost_snapshot(body.get('snapshot')); day = _utc_day()
    v2db.ghost_put_entry(day,pid,name,snap)
    return {'day': day, 'submitted': True}


@app.get('/api/ghost/leaderboard')
def ghost_leaderboard(day: str | None = None, player_id: str | None = None):
    day = day or _utc_day(); rows = v2db.ghost_board(day)
    return {'day': day, 'total': len(rows), 'entries': [{k:r[k] for k in ('manager_name','stars','points','gd','ts')} | {'me':r['player_id']==player_id} for r in rows]}


@app.post('/api/ghost/run')
def ghost_run(body: dict[str, Any]):
    pid,name = _ghost_identity(body); snap = _ghost_snapshot(body.get('snapshot')); day = _utc_day()
    from datetime import date, timedelta
    days = [day, (date.fromisoformat(day)-timedelta(days=1)).isoformat()]
    pool = v2db.ghost_pool(days,pid)
    pool.sort(key=lambda r: hashlib.sha256(f"{day}:{pid}:{r['player_id']}".encode()).hexdigest())
    opponents = [(r['manager_name'],json.loads(r['snapshot_json'])) for r in pool[:3]]
    for fallback in body.get('fallback_opponents') or []:
        if len(opponents)>=3: break
        fs = _ghost_snapshot(fallback)
        opponents.append((fallback.get('manager_name','Club ghost'),fs))
    while len(opponents)<3:
        opponents.append(('Practice club',snap))
    requests = []
    import copy
    for i,(opp,other) in enumerate(opponents):
        other = copy.deepcopy(other)
        ids = {}
        for p in list((other['team'].get('lineup') or {}).values()) + list(other['team'].get('bench') or []):
            if p:
                old = str(p['id']); ids[old] = f'ghost_away_{old}'; p['id'] = ids[old]
        for pt in (other.get('build') or {}).get('partnerships') or []:
            pt['members'] = [ids.get(str(m),str(m)) for m in pt['members']]
        for roles in (other['team'].get('set_pieces'), (other.get('build') or {}).get('set_pieces')):
            if roles:
                for k,v in list(roles.items()):
                    if isinstance(v,str): roles[k] = ids.get(v,v)
                    elif isinstance(v,dict) and v.get('target_pid'):
                        v['target_pid'] = ids.get(str(v['target_pid']),str(v['target_pid']))
        other['team']['player_instructions'] = {ids.get(str(k),str(k)):v for k,v in (other['team'].get('player_instructions') or {}).items()}
        seed = int(hashlib.sha256(f'{day}:{pid}:{i}'.encode()).hexdigest()[:12],16)
        requests.append({'fixture_id': f'ghost:{day}:{pid}:{i}', 'save_id': f'ghost:{pid}', 'seed':seed,
                         'home_team':snap['team'], 'away_team':other['team'],
                         'builds':{'HOME':dict(snap.get('build') or {},control='cpu'), 'AWAY':dict(other.get('build') or {},control='cpu')}})
    run_id = uuid.uuid4().hex
    ranked = v2db.ghost_reserve(run_id,day,pid,name)
    outs = batch_matches(BatchRequest(requests=requests,summary_only=True))['results']
    results=[]
    for (opp,_),out in zip(opponents,outs):
        sc = out['full_time']['score']; f,a = sc['home'],sc['away']
        results.append({'opponent':opp,'match_id':out['match_id'],'score':[f,a],'points':_points(f,a)})
    points=sum(r['points'] for r in results); gd=sum(r['score'][0]-r['score'][1] for r in results)
    stars=3 if points>=7 else 2 if points>=5 else 1 if points>=3 else 0
    v2db.ghost_put_entry(day,pid,name,snap)
    v2db.ghost_finish(run_id,points,stars,gd,results)
    board=v2db.ghost_board(day)
    rank=next((i+1 for i,r in enumerate(board) if r['player_id']==pid),None)
    return {'day':day,'ranked':ranked,'practice':not ranked,'reason':None if ranked else 'Ranked run already used today',
            'results':results,'points':points,'stars':stars,'rank':rank,'total':len(board)}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "web" / "touchline.html")

# The broadcast match view (sandbox/visual/match.html?embed=1) and its frozen
# art are served same-origin so the app can drive it frame by frame.
app.mount("/sandbox", StaticFiles(directory=ROOT / "sandbox"), name="sandbox")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
app.mount("/", StaticFiles(directory=ROOT / "web"), name="web")


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1" if APP_ENV == "development" else "0.0.0.0")
    port = int(os.environ.get("PORT", os.environ.get("TOUCHLINE_PORT", "8000")))
    print(f"Touchline {APP_VERSION} × FC Simulator {bridge.ENGINE_VERSION} "
          f"({bridge.CALIBRATION_VERSION}, {bridge.PLAYER_DATA_VERSION}) — http://{host}:{port} [{APP_ENV}]")
    uvicorn.run(app, host=host, port=port, log_level=LOG_LEVEL.lower())
