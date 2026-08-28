#!/usr/bin/env python3
"""Reproduce a persisted match exactly from its stored inputs.

Usage:
  python tools/reproduce_match.py <match_id> [--data-dir DIR]
  python tools/reproduce_match.py --bundle bundle.json

Loads the stored kickoff request + seed + management command log, rebuilds the
exact MatchEngine, replays deterministically, and compares the event ledger
digest and score against the persisted authoritative result.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "simulator"))

import bridge
import store
from fc_simulator.engine import MatchEngine


def digest(events: list[dict]) -> str:
    return hashlib.blake2b(json.dumps(events, sort_keys=True).encode()).hexdigest()[:24]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("match_id", nargs="?")
    ap.add_argument("--bundle", type=Path)
    ap.add_argument("--data-dir", default=str(ROOT / "data_rc"))
    args = ap.parse_args()

    if args.bundle:
        b = json.loads(args.bundle.read_text())
        start_request, seed = b["start_request"], b["seed"]
        commands = [{"sim_clock": c["sim_clock"], "kind": c["kind"],
                     "payload_json": c["payload_json"]} for c in b["commands"]]
        saved_versions = {k: b[k] for k in ("engine_version", "calibration_version", "player_data_version")}
        saved_score = (b.get("score_home"), b.get("score_away"))
        saved_digest = b.get("ledger_digest")
    else:
        store.init(args.data_dir)
        row = store.get_match(args.match_id)
        if not row:
            print(f"No persisted match '{args.match_id}'"); return 2
        start_request = json.loads(row["start_request_json"])
        seed = row["seed"]
        commands = store.commands(args.match_id)
        saved_versions = {k: row[k] for k in ("engine_version", "calibration_version", "player_data_version")}
        saved_score = (row["score_home"], row["score_away"])
        led = store.ledger(args.match_id)
        saved_digest = digest(led) if led else None

    running = {"engine_version": bridge.ENGINE_VERSION,
               "calibration_version": bridge.CALIBRATION_VERSION,
               "player_data_version": bridge.PLAYER_DATA_VERSION}
    print(f"seed: {seed}")
    exact_possible = True
    for k in running:
        tag = "" if saved_versions.get(k) == running[k] else "  << DIFFERS"
        if tag: exact_possible = False
        print(f"{k}: saved {saved_versions.get(k)} | running {running[k]}{tag}")
    if not exact_possible:
        print("VERSIONS DIFFER — exact reproduction is NOT claimed under a different football version.")
        return 3

    home = bridge.build_team(start_request["home_team"], "HOME")
    away = bridge.build_team(start_request["away_team"], "AWAY")
    config = bridge.build_config(start_request.get("config"), start_request.get("coach_ai"))
    engine = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, int(seed), config)

    import server  # appliers are the single management code path
    for cmd in commands:
        t = int(cmd["sim_clock"])
        if t > engine.clock:
            engine.advance(t - engine.clock)
        server._APPLIERS[cmd["kind"]](engine, json.loads(cmd["payload_json"]))
    while not engine.is_finished:
        engine.advance(600)
    engine.result()

    repro_events = [e.to_dict() for e in engine.events]
    repro_digest = digest(repro_events)
    repro_score = (engine.score["HOME"], engine.score["AWAY"])
    print(f"ledger digest saved:      {saved_digest}")
    print(f"ledger digest reproduced: {repro_digest}")
    print(f"score saved:      {saved_score[0]}-{saved_score[1]}")
    print(f"score reproduced: {repro_score[0]}-{repro_score[1]}")
    ok = (saved_digest == repro_digest and tuple(saved_score) == repro_score)
    print("MATCH" if ok else "MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
