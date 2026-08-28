"""Spatial-Temporal workstream harness.

Loads the EXPERIMENTAL engine (simulator/exp_st) ahead of production on
sys.path, replays the exact live case (or fresh seeds), with per-family flags.
Gate: all flags OFF must reproduce the persisted cal6 digest bit-exactly.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "simulator" / "exp_st"))   # experimental first
sys.path.insert(1, str(ROOT))
sys.path.insert(2, str(ROOT / "simulator"))

import bridge
import server
from fc_simulator import engine as engine_mod
from fc_simulator.engine import MatchEngine
from fc_simulator.geometry import attack_relative_x, distance_m

assert "exp_st" in engine_mod.__file__, engine_mod.__file__

DB = Path.home() / "TouchlineRC1" / "data" / "touchline.db"
OUT = Path(__file__).parent / "out"


def load_case(match_id="2c912eb05bb6"):
    c = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row
    row = dict(c.execute("SELECT * FROM matches WHERE match_id=?", (match_id,)).fetchone())
    cmds = [dict(r) for r in c.execute(
        "SELECT * FROM match_commands WHERE match_id=? ORDER BY seq", (match_id,)).fetchall()]
    ledger = json.loads(gzip.decompress(row["ledger_gz"]))
    return row, cmds, ledger


def set_flags(**flags):
    for k in engine_mod.ST:
        engine_mod.ST[k] = bool(flags.get(k, False))


def build_case_engine(seed=None, match_id="2c912eb05bb6"):
    row, cmds, ledger = load_case(match_id)
    sr = json.loads(row["start_request_json"])
    home = bridge.build_team(sr["home_team"], "HOME")
    away = bridge.build_team(sr["away_team"], "AWAY")
    config = bridge.build_config(sr.get("config"), sr.get("coach_ai"))
    eng = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, seed if seed is not None else row["seed"], config)
    return eng, cmds, ledger


def replay(eng, cmds, sample_cb=None):
    cmd_i = 0
    while not eng.is_finished:
        while cmd_i < len(cmds) and int(cmds[cmd_i]["sim_clock"]) <= eng.clock:
            server._APPLIERS[cmds[cmd_i]["kind"]](eng, json.loads(cmds[cmd_i]["payload_json"]))
            cmd_i += 1
        eng.advance(1)
        if sample_cb:
            sample_cb(eng)
    eng.result()
    events = [e.to_dict() for e in eng.events]
    digest = hashlib.blake2b(json.dumps(events, sort_keys=True).encode()).hexdigest()[:24]
    return digest, events


def snapshot(eng, samples):
    ball = eng.ball.pos
    players = []
    for tid in ("HOME", "AWAY"):
        for s in eng._team_states(tid):
            players.append([tid, s.player.player_id, s.slot, round(s.pos.x, 2), round(s.pos.y, 2),
                            s.instructions.attack_role, s.instructions.defense_role,
                            s.instructions.attack_effort, s.instructions.defense_effort, round(s.energy, 1)])
    samples.append({"t": eng.clock, "bx": round(ball.x, 2), "by": round(ball.y, 2),
                    "poss": eng.possession_team, "press": {},
                    "players": players})


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    set_flags()  # all OFF
    eng, cmds, ledger = build_case_engine()
    digest, events = replay(eng, cmds)
    saved = hashlib.blake2b(json.dumps(ledger, sort_keys=True).encode()).hexdigest()[:24]
    print("flags-OFF digest:", digest, "saved:", saved, "IDENTITY" if digest == saved else "DIVERGED")
    assert digest == saved, "experimental engine with all flags OFF must be cal6-identical"
    print("BASELINE-IDENTITY-OK")
