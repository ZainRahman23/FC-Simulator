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

import json
import logging
import os
import sys
import threading
import traceback
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "simulator"))

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from fc_simulator.engine import MatchEngine
from fc_simulator.ballflight import BallFlight
from fc_simulator.geometry import goal_center

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

APP_VERSION = "0.1.0-rc2"  # cal6 action-choice package
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

# in-memory live sessions: match_id -> {"engine", "lock", "meta"}
ACTIVE_MATCHES: dict[str, dict[str, Any]] = {}
_SESSIONS_LOCK = threading.Lock()


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
    fixture_id: str
    seed: int
    save_id: str = "local"
    mode: str = "live"                       # "live" | "full"
    config: dict[str, Any] | None = None
    coach_ai: dict[str, bool] | None = None
    home_team: dict[str, Any]
    away_team: dict[str, Any]


class AdvanceRequest(BaseModel):
    seconds: int = 30
    last_event_index: int = 0
    frames: bool = False   # renderer: per-second positional keyframes (read-only sampling)


class TacticsRequest(BaseModel):
    team: str
    tactics: dict[str, Any]
    request_id: str | None = None


class InstructionsRequest(BaseModel):
    team: str
    player_id: str
    instructions: dict[str, Any]
    request_id: str | None = None


class FormationRequest(BaseModel):
    team: str
    formation: str
    request_id: str | None = None


class SubstitutionRequest(BaseModel):
    team: str
    player_off: str
    player_on: str
    target_slot: str | None = None
    request_id: str | None = None


class SaveStateRequest(BaseModel):
    state: dict[str, Any]


def _team_id(v: str) -> str:
    t = str(v).upper()
    if t not in ("HOME", "AWAY"):
        raise HTTPException(400, f"team must be HOME or AWAY, got '{v}'")
    return t


# ── management appliers: ONE code path for live requests AND replay recovery ─
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


_APPLIERS = {"tactics": _apply_tactics, "instructions": _apply_instructions,
             "formation": _apply_formation, "substitution": _apply_substitution}


def _build_engine(start_request: dict[str, Any]) -> MatchEngine:
    home = bridge.build_team(start_request["home_team"], "HOME")
    away = bridge.build_team(start_request["away_team"], "AWAY")
    config = bridge.build_config(start_request.get("config"), start_request.get("coach_ai"))
    return MatchEngine(home, away, bridge.ATTRIBUTE_STATS, int(start_request["seed"]), config)


def _recover_match(match_id: str) -> dict[str, Any] | None:
    """Deterministic replay recovery: kickoff input + command log + last clock.

    Because the engine is seed-deterministic and run/advance parity holds, the
    recovered session's future is identical to a never-restarted server given
    the same subsequent manager actions.
    """
    row = store.get_match(match_id)
    if not row or row["status"] != "live":
        return None
    if (row["engine_version"] != VERSIONS["engine"]
            or row["calibration_version"] != VERSIONS["calibration"]
            or row["player_data_version"] != VERSIONS["player_data"]):
        log.warning("MATCH_RECOVERY_REFUSED match=%s stored=%s/%s/%s running=%s/%s/%s",
                    match_id, row["engine_version"], row["calibration_version"],
                    row["player_data_version"], VERSIONS["engine"],
                    VERSIONS["calibration"], VERSIONS["player_data"])
        return None
    start_request = json.loads(row["start_request_json"])
    engine = _build_engine(start_request)
    for cmd in store.commands(match_id):
        target = int(cmd["sim_clock"])
        if target > engine.clock:
            engine.advance(target - engine.clock)
        _APPLIERS[cmd["kind"]](engine, json.loads(cmd["payload_json"]))
    if row["last_clock"] > engine.clock:
        engine.advance(row["last_clock"] - engine.clock)
    session = {"engine": engine, "lock": threading.Lock(),
               "meta": {"fixture_id": row["fixture_id"], "seed": row["seed"],
                        "save_id": row["save_id"]}}
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
    return payload


def _management(match_id: str, kind: str, payload: dict[str, Any],
                request_id: str | None) -> dict[str, Any]:
    s = _session(match_id)
    engine = s["engine"]
    if engine.is_finished:
        raise HTTPException(409, "The match has finished; no further management is possible.")
    if request_id:
        dup = store.find_command(match_id, request_id)
        if dup:  # idempotent retry: acknowledged once, applied once
            return {"ok": True, "duplicate": True, "clock_seconds": engine.clock,
                    "management": bridge.management_state(engine)}
    try:
        with s["lock"]:
            extra = _APPLIERS[kind](engine, payload)
            store.append_command(match_id, engine.clock, kind,
                                 json.dumps(payload, separators=(",", ":")), request_id)
    except (BridgeError, ValueError) as e:
        raise HTTPException(400, str(e))
    _mlog(match_id, "MANAGEMENT_CHANGE", kind=kind, clock=engine.clock)
    out = {"ok": True, "clock_seconds": engine.clock,
           "management": bridge.management_state(engine)}
    if kind == "formation":
        out["formation"] = extra
    if kind == "substitution":
        out["substitutions_used"] = engine.substitutions_used[_team_id(payload["team"])]
    return out


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


@app.post("/api/matches/start")
def start_match(req: StartRequest) -> dict[str, Any]:
    if len(str(req.fixture_id)) > 128 or abs(int(req.seed)) > 2**62:
        raise HTTPException(400, "Invalid fixture_id or seed")
    try:
        engine = _build_engine(req.model_dump())
    except (BridgeError, ValueError) as e:
        raise HTTPException(400, str(e))

    match_id = uuid.uuid4().hex[:12]
    start_json = json.dumps(req.model_dump(), separators=(",", ":"))

    if req.mode == "full":
        store.create_match(match_id, req.save_id, req.fixture_id, int(req.seed),
                           start_json, VERSIONS, status="live")
        result = engine.run()
        s = {"engine": engine, "meta": {"fixture_id": req.fixture_id,
                                        "seed": int(req.seed), "save_id": req.save_id}}
        payload = bridge.full_time_payload(engine, result)
        record = {"full_time": payload,
                  "final_snapshot": bridge.match_snapshot(engine, len(engine.events))}
        ledger_json = json.dumps([e.to_dict() for e in engine.events], separators=(",", ":"))
        store.complete_match(match_id, engine.score["HOME"], engine.score["AWAY"],
                             json.dumps(record, separators=(",", ":")), ledger_json)
        log.info("MATCH_COMPLETED match=%s save=%s fixture=%s seed=%s mode=full",
                 match_id, req.save_id, req.fixture_id, req.seed)
        return {"match_id": match_id, "fixture_id": req.fixture_id, "status": "ft",
                "full_time": payload}

    with _SESSIONS_LOCK:
        if len(ACTIVE_MATCHES) >= MAX_SESSIONS:
            # Explicit capacity policy: reject new matches; never evict someone
            # else's live game.
            raise HTTPException(429, "Server is at live-match capacity. Try again shortly.")
        store.create_match(match_id, req.save_id, req.fixture_id, int(req.seed),
                           start_json, VERSIONS)
        ACTIVE_MATCHES[match_id] = {"engine": engine, "lock": threading.Lock(),
                                    "flight": BallFlight(), "facing": {},
                                    "meta": {"fixture_id": req.fixture_id,
                                             "seed": int(req.seed), "save_id": req.save_id}}
    _mlog(match_id, "MATCH_STARTED")
    snap = bridge.match_snapshot(engine, 0)
    snap.update({"match_id": match_id, "fixture_id": req.fixture_id, "save_id": req.save_id})
    return snap


@app.get("/api/matches/lookup")
def lookup_match(save_id: str, fixture_id: str) -> dict[str, Any]:
    """Authoritative persisted identity of a completed match (debug UX)."""
    row = store.find_match(save_id, fixture_id)
    if not row:
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


@app.post("/api/matches/{match_id}/advance")
def advance_match(match_id: str, req: AdvanceRequest) -> dict[str, Any]:
    s = _session(match_id)
    engine = s["engine"]
    frames = None
    with s["lock"]:
        secs = max(1, min(600, int(req.seconds)))
        if req.frames and secs <= 120:
            # Renderer keyframes: identical simulation path (advance(N) is
            # internally a per-second loop), with read-only sampling of
            # authoritative positions between seconds. No engine state, RNG
            # or outcome is touched - neutrality is digest-verified in the
            # renderer test suite.
            frames = []
            # Stable full-squad roster: states + current bench is the constant
            # full squad, so index order never shifts across batches and a
            # substitute entering mid-batch is already indexed.
            roster = sorted(
                [st.player.player_id for tid in ("HOME", "AWAY")
                 for st in engine._team_states(tid, active_only=False)]
                + [p.player_id for team in (engine.home, engine.away) for p in team.bench])
            ridx = {pid: k for k, pid in enumerate(roster)}
            flight = s.setdefault("flight", BallFlight())
            facing = s.setdefault("facing", {})
            prev_pos = {}
            for tid in ("HOME", "AWAY"):
                for st in engine._team_states(tid, active_only=False):
                    prev_pos[st.player.player_id] = (st.pos.x, st.pos.y)
            for _ in range(secs):
                if engine.is_finished:
                    break
                ev0 = len(engine.events)
                engine.advance(1)
                # authoritative z: deterministic 60 Hz flight from this
                # second's events (read-only over the engine; zero RNG)
                zsamp = flight.on_second(engine.events[ev0:])
                row = [engine.clock, round(engine.ball.pos.x, 2), round(engine.ball.pos.y, 2),
                       1 if engine.possession_team == "HOME" else 0]
                pl = [None] * len(roster)
                carrier = engine.ball.controlling_player_id
                for tid in ("HOME", "AWAY"):
                    for st in engine._team_states(tid, active_only=False):
                        pid = st.player.player_id
                        px0, py0 = prev_pos.get(pid, (st.pos.x, st.pos.y))
                        f = _facing_update(facing.get(pid),
                                           st.pos.x, st.pos.y,
                                           (st.pos.x - px0) * 1.05, (st.pos.y - py0) * 0.68,
                                           carrier == pid, tid)
                        facing[pid] = f
                        prev_pos[pid] = (st.pos.x, st.pos.y)
                        pl[ridx[pid]] = [round(st.pos.x, 2), round(st.pos.y, 2),
                                         _ACT_CODE.get(st.current_activity, 0), 1 if st.active else 0,
                                         f]
                row.append(pl)
                row.append([round(flight.z, 3), round(flight.vz, 2),
                            1 if flight.grounded else 0, zsamp])
                frames.append(row)
        else:
            engine.advance(secs)
        result = engine.result() if engine.is_finished else None
        snap = bridge.match_snapshot(engine, max(0, int(req.last_event_index)))
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
    return _management(match_id, "tactics", req.model_dump(exclude={"request_id"}), req.request_id)


@app.post("/api/matches/{match_id}/instructions")
def change_instructions(match_id: str, req: InstructionsRequest) -> dict[str, Any]:
    return _management(match_id, "instructions", req.model_dump(exclude={"request_id"}), req.request_id)


@app.post("/api/matches/{match_id}/formation")
def change_formation(match_id: str, req: FormationRequest) -> dict[str, Any]:
    return _management(match_id, "formation", req.model_dump(exclude={"request_id"}), req.request_id)


@app.post("/api/matches/{match_id}/substitution")
def substitution(match_id: str, req: SubstitutionRequest) -> dict[str, Any]:
    return _management(match_id, "substitution", req.model_dump(exclude={"request_id"}), req.request_id)


@app.delete("/api/matches/{match_id}")
def abandon_match(match_id: str) -> dict[str, Any]:
    with _SESSIONS_LOCK:
        ACTIVE_MATCHES.pop(match_id, None)
    store.abandon_match(match_id)
    log.info("MATCH_ABANDONED match=%s", match_id)
    return {"ok": True}


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
    row = store.get_save(save_id)
    if not row:
        raise HTTPException(404, "Save not found")
    return {"save_id": save_id, "updated_ts": row["updated_ts"],
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
@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "web" / "touchline.html")

app.mount("/", StaticFiles(directory=ROOT / "web"), name="web")


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1" if APP_ENV == "development" else "0.0.0.0")
    port = int(os.environ.get("PORT", os.environ.get("TOUCHLINE_PORT", "8000")))
    print(f"Touchline {APP_VERSION} × FC Simulator {bridge.ENGINE_VERSION} "
          f"({bridge.CALIBRATION_VERSION}, {bridge.PLAYER_DATA_VERSION}) — http://{host}:{port} [{APP_ENV}]")
    uvicorn.run(app, host=host, port=port, log_level=LOG_LEVEL.lower())
