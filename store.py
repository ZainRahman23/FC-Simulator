"""Touchline RC persistence — SQLite, stdlib only, WAL mode.

Everything here is observational infrastructure: it records football inputs and
outputs but never participates in football resolution. Schema is versioned from
day one. No pickle anywhere — matches are persisted as their exact reproduction
inputs (start request + seed + accepted management commands) plus final results,
which the deterministic engine can replay bit-exactly.
"""
from __future__ import annotations

import gzip
import json
import os
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1

_lock = threading.Lock()
_db_path: Path | None = None


def init(data_dir: str | Path) -> Path:
    global _db_path
    d = Path(data_dir)
    d.mkdir(parents=True, exist_ok=True)
    _db_path = d / "touchline.db"
    with _conn() as c:
        c.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS saves(
            save_id TEXT PRIMARY KEY, created_ts REAL, updated_ts REAL,
            save_schema_version INTEGER, app_version TEXT, engine_version TEXT,
            calibration_version TEXT, player_data_version TEXT, state_json TEXT);
        CREATE TABLE IF NOT EXISTS matches(
            match_id TEXT PRIMARY KEY, save_id TEXT, fixture_id TEXT, seed INTEGER,
            status TEXT, created_ts REAL, completed_ts REAL,
            app_version TEXT, engine_version TEXT, calibration_version TEXT,
            player_data_version TEXT, start_request_json TEXT,
            last_clock INTEGER DEFAULT 0, score_home INTEGER, score_away INTEGER,
            result_json TEXT, ledger_gz BLOB);
        CREATE TABLE IF NOT EXISTS match_commands(
            match_id TEXT, seq INTEGER, sim_clock INTEGER, kind TEXT,
            payload_json TEXT, request_id TEXT, ts REAL,
            PRIMARY KEY(match_id, seq));
        CREATE INDEX IF NOT EXISTS idx_cmd_req ON match_commands(match_id, request_id);
        CREATE TABLE IF NOT EXISTS errors(
            error_id TEXT PRIMARY KEY, ts REAL, path TEXT, detail TEXT);
        -- coach MVP (additive; schema_version unchanged: old DBs gain these
        -- tables on first boot and nothing else changes)
        CREATE TABLE IF NOT EXISTS scenarios(
            scenario_id TEXT PRIMARY KEY, kind TEXT, team TEXT, seed INTEGER,
            takeover_clock INTEGER, request_json TEXT, result_json TEXT, created_ts REAL);
        CREATE TABLE IF NOT EXISTS challenge_entries(
            scenario_id TEXT, manager_name TEXT, match_id TEXT, stars INTEGER,
            goals_for INTEGER, goals_against INTEGER, decisions INTEGER, ts REAL,
            PRIMARY KEY(scenario_id, manager_name));
        CREATE INDEX IF NOT EXISTS idx_chal_match ON challenge_entries(match_id);
        """)
        c.execute("INSERT OR IGNORE INTO meta(key, value) VALUES('schema_version', ?)",
                  (str(SCHEMA_VERSION),))
    return _db_path


def _conn() -> sqlite3.Connection:
    assert _db_path is not None, "store.init() not called"
    c = sqlite3.connect(_db_path, timeout=10.0)
    c.row_factory = sqlite3.Row
    return c


def db_ok() -> bool:
    try:
        with _conn() as c:
            c.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
        return True
    except Exception:
        return False


def schema_version() -> int:
    with _conn() as c:
        r = c.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
        return int(r["value"]) if r else 0


# ── saves ─────────────────────────────────────────────────────────────────────
def upsert_save(save_id: str, state_json: str, versions: dict[str, str]) -> None:
    now = time.time()
    with _lock, _conn() as c:
        c.execute("""INSERT INTO saves(save_id, created_ts, updated_ts, save_schema_version,
                     app_version, engine_version, calibration_version, player_data_version, state_json)
                     VALUES(?,?,?,?,?,?,?,?,?)
                     ON CONFLICT(save_id) DO UPDATE SET updated_ts=?, state_json=?,
                       app_version=?, engine_version=?, calibration_version=?, player_data_version=?""",
                  (save_id, now, now, SCHEMA_VERSION, versions["app"], versions["engine"],
                   versions["calibration"], versions["player_data"], state_json,
                   now, state_json, versions["app"], versions["engine"],
                   versions["calibration"], versions["player_data"]))


def get_save(save_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        r = c.execute("SELECT * FROM saves WHERE save_id=?", (save_id,)).fetchone()
        return dict(r) if r else None


# ── matches ──────────────────────────────────────────────────────────────────
def create_match(match_id: str, save_id: str, fixture_id: str, seed: int,
                 start_request_json: str, versions: dict[str, str], status: str = "live") -> None:
    with _lock, _conn() as c:
        c.execute("""INSERT INTO matches(match_id, save_id, fixture_id, seed, status, created_ts,
                     app_version, engine_version, calibration_version, player_data_version,
                     start_request_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                  (match_id, save_id, fixture_id, seed, status, time.time(),
                   versions["app"], versions["engine"], versions["calibration"],
                   versions["player_data"], start_request_json))


def find_match(save_id: str, fixture_id: str) -> dict[str, Any] | None:
    """Latest persisted match for a save+fixture (debug identity lookup)."""
    with _conn() as c:
        r = c.execute("""SELECT * FROM matches WHERE save_id=? AND fixture_id=?
                         ORDER BY created_ts DESC LIMIT 1""", (save_id, fixture_id)).fetchone()
        return dict(r) if r else None


def get_match(match_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        r = c.execute("SELECT * FROM matches WHERE match_id=?", (match_id,)).fetchone()
        return dict(r) if r else None


def update_clock(match_id: str, clock: int) -> None:
    with _lock, _conn() as c:
        c.execute("UPDATE matches SET last_clock=? WHERE match_id=?", (clock, match_id))


def complete_match(match_id: str, score_home: int, score_away: int,
                   result_json: str, ledger_json: str) -> None:
    blob = gzip.compress(ledger_json.encode("utf-8"), compresslevel=6)
    with _lock, _conn() as c:
        c.execute("""UPDATE matches SET status='ft', completed_ts=?, score_home=?, score_away=?,
                     result_json=?, ledger_gz=? WHERE match_id=?""",
                  (time.time(), score_home, score_away, result_json, blob, match_id))


def reopen_match(match_id: str, clock: int) -> None:
    """A finished match was rewound (exact-minute decision after the server
    had already reached full time): it is live again from ``clock``. The
    stale result/ledger are cleared so recovery replays from the command log
    and the next full time re-persists the authoritative outcome."""
    with _lock, _conn() as c:
        c.execute("""UPDATE matches SET status='live', completed_ts=NULL, score_home=NULL,
                     score_away=NULL, result_json=NULL, ledger_gz=NULL, last_clock=?
                     WHERE match_id=?""", (clock, match_id))


def abandon_match(match_id: str) -> None:
    with _lock, _conn() as c:
        c.execute("UPDATE matches SET status='abandoned', completed_ts=? WHERE match_id=? AND status='live'",
                  (time.time(), match_id))


def ledger(match_id: str) -> list | None:
    with _conn() as c:
        r = c.execute("SELECT ledger_gz FROM matches WHERE match_id=?", (match_id,)).fetchone()
        if not r or r["ledger_gz"] is None:
            return None
        return json.loads(gzip.decompress(r["ledger_gz"]).decode("utf-8"))


# ── management command log (replay-exact recovery + idempotency) ─────────────
def find_command(match_id: str, request_id: str) -> dict[str, Any] | None:
    if not request_id:
        return None
    with _conn() as c:
        r = c.execute("SELECT * FROM match_commands WHERE match_id=? AND request_id=?",
                      (match_id, request_id)).fetchone()
        return dict(r) if r else None


def append_command(match_id: str, sim_clock: int, kind: str, payload_json: str,
                   request_id: str | None) -> int:
    with _lock, _conn() as c:
        r = c.execute("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM match_commands WHERE match_id=?",
                      (match_id,)).fetchone()
        seq = int(r["n"])
        c.execute("""INSERT INTO match_commands(match_id, seq, sim_clock, kind, payload_json,
                     request_id, ts) VALUES(?,?,?,?,?,?,?)""",
                  (match_id, seq, sim_clock, kind, payload_json, request_id, time.time()))
        return seq


def commands(match_id: str) -> list[dict[str, Any]]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM match_commands WHERE match_id=? ORDER BY seq",
                         (match_id,)).fetchall()
        return [dict(r) for r in rows]


# ── scenarios & challenges ───────────────────────────────────────────────────
def get_scenario(scenario_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        r = c.execute("SELECT * FROM scenarios WHERE scenario_id=?", (scenario_id,)).fetchone()
        return dict(r) if r else None


def put_scenario(scenario_id: str, kind: str, team: str, seed: int, takeover_clock: int,
                 request_json: str, result_json: str) -> None:
    with _lock, _conn() as c:
        c.execute("""INSERT OR IGNORE INTO scenarios(scenario_id, kind, team, seed, takeover_clock,
                     request_json, result_json, created_ts) VALUES(?,?,?,?,?,?,?,?)""",
                  (scenario_id, kind, team, seed, takeover_clock, request_json, result_json,
                   time.time()))


def challenge_entry(scenario_id: str, manager_name: str) -> dict[str, Any] | None:
    with _conn() as c:
        r = c.execute("SELECT * FROM challenge_entries WHERE scenario_id=? AND manager_name=?",
                      (scenario_id, manager_name)).fetchone()
        return dict(r) if r else None


def challenge_entry_for_match(match_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        r = c.execute("SELECT * FROM challenge_entries WHERE match_id=?", (match_id,)).fetchone()
        return dict(r) if r else None


def put_challenge_entry(scenario_id: str, manager_name: str, match_id: str, stars: int,
                        goals_for: int, goals_against: int, decisions: int) -> None:
    with _lock, _conn() as c:
        c.execute("""INSERT INTO challenge_entries(scenario_id, manager_name, match_id, stars,
                     goals_for, goals_against, decisions, ts) VALUES(?,?,?,?,?,?,?,?)
                     ON CONFLICT(scenario_id, manager_name) DO UPDATE SET match_id=excluded.match_id,
                       stars=excluded.stars, goals_for=excluded.goals_for,
                       goals_against=excluded.goals_against, decisions=excluded.decisions,
                       ts=excluded.ts""",
                  (scenario_id, manager_name, match_id, stars, goals_for, goals_against,
                   decisions, time.time()))


def challenge_entries(scenario_id: str) -> list[dict[str, Any]]:
    """Leaderboard order: stars desc, goal difference desc, fewer decisions, earlier."""
    with _conn() as c:
        rows = c.execute("""SELECT * FROM challenge_entries WHERE scenario_id=?
                            ORDER BY stars DESC, (goals_for - goals_against) DESC,
                                     decisions ASC, ts ASC""", (scenario_id,)).fetchall()
        return [dict(r) for r in rows]


# ── errors ───────────────────────────────────────────────────────────────────
def record_error(path: str, detail: str) -> str:
    error_id = uuid.uuid4().hex[:6]
    try:
        with _lock, _conn() as c:
            c.execute("INSERT INTO errors(error_id, ts, path, detail) VALUES(?,?,?,?)",
                      (error_id, time.time(), path, detail[:8000]))
    except Exception:
        pass
    return error_id


def stats() -> dict[str, Any]:
    with _conn() as c:
        m = c.execute("SELECT status, COUNT(*) n FROM matches GROUP BY status").fetchall()
        s = c.execute("SELECT COUNT(*) n FROM saves").fetchone()
        return {"matches": {r["status"]: r["n"] for r in m}, "saves": s["n"]}
