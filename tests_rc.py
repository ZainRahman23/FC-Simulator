"""Release-candidate hardening tests: persistence, replay recovery determinism,
idempotency, capacity policy, concurrency, reproduction, observability
neutrality. Football semantics are asserted unchanged throughout."""
from __future__ import annotations

import concurrent.futures
import copy
import hashlib
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "simulator"))

import pytest
from fastapi.testclient import TestClient

import bridge
import server
import store
from tests_integration import start_req  # reuse the canonical kickoff payload builder


@pytest.fixture()
def client(tmp_path, monkeypatch):
    store.init(tmp_path)  # isolated database per test
    server.ACTIVE_MATCHES.clear()
    return TestClient(server.app)


def digest(events):
    return hashlib.blake2b(json.dumps(events, sort_keys=True).encode()).hexdigest()[:24]


def start(client, seed=4242, save_id="rc-test", fixture="fx-rc-1"):
    req = start_req(seed=seed, mode="live")
    req.update({"save_id": save_id, "fixture_id": fixture})
    r = client.post("/api/matches/start", json=req)
    assert r.status_code == 200, r.text
    return r.json()


def run_to_ft(client, match_id, last=0):
    while True:
        r = client.post(f"/api/matches/{match_id}/advance",
                        json={"seconds": 600, "last_event_index": last}).json()
        if "full_time" in r:
            return r


def test_match_persisted_with_full_reproduction_input(client):
    snap = start(client)
    mid = snap["match_id"]
    row = store.get_match(mid)
    assert row["status"] == "live" and row["seed"] == 4242
    sr = json.loads(row["start_request_json"])
    assert sr["home_team"] and sr["away_team"] and sr["seed"] == 4242
    assert row["engine_version"] == bridge.ENGINE_VERSION
    assert row["calibration_version"] == bridge.CALIBRATION_VERSION
    assert row["player_data_version"] == bridge.PLAYER_DATA_VERSION
    ft = run_to_ft(client, mid)
    row = store.get_match(mid)
    assert row["status"] == "ft"
    assert row["score_home"] is not None
    led = store.ledger(mid)
    assert led and led[-1]["event_type"] in ("FULL_TIME",) or any(
        e["event_type"] == "FULL_TIME" for e in led)
    assert mid not in server.ACTIVE_MATCHES  # memory cleaned, persistence remains


def test_restart_recovery_is_replay_exact(client):
    """§15: control run vs interrupted+recovered run must be identical."""
    tac = {"team": "HOME", "tactics": {"pressingIntensity": "Aggressive"}}
    # control: never restarted
    snap = start(client, seed=777, fixture="fx-control")
    mid_c = snap["match_id"]
    client.post(f"/api/matches/{mid_c}/advance", json={"seconds": 600})       # ~10'
    client.post(f"/api/matches/{mid_c}/advance", json={"seconds": 600})
    client.post(f"/api/matches/{mid_c}/advance", json={"seconds": 450})       # 27:30
    client.post(f"/api/matches/{mid_c}/tactics", json=tac)
    client.post(f"/api/matches/{mid_c}/advance", json={"seconds": 600})
    client.post(f"/api/matches/{mid_c}/advance", json={"seconds": 210})       # 41:00
    ft_c = run_to_ft(client, mid_c)
    ledger_c = store.ledger(mid_c)

    # interrupted: same seed/fixture inputs, restart simulated at 41:00
    snap = start(client, seed=777, fixture="fx-interrupt")
    mid_i = snap["match_id"]
    client.post(f"/api/matches/{mid_i}/advance", json={"seconds": 600})
    client.post(f"/api/matches/{mid_i}/advance", json={"seconds": 600})
    client.post(f"/api/matches/{mid_i}/advance", json={"seconds": 450})
    client.post(f"/api/matches/{mid_i}/tactics", json=tac)
    client.post(f"/api/matches/{mid_i}/advance", json={"seconds": 600})
    client.post(f"/api/matches/{mid_i}/advance", json={"seconds": 210})
    server.ACTIVE_MATCHES.clear()                       # "server restart"
    r = client.get(f"/api/matches/{mid_i}")             # triggers replay recovery
    assert r.status_code == 200
    assert r.json()["clock_seconds"] == 41 * 60
    ft_i = run_to_ft(client, mid_i)
    ledger_i = store.ledger(mid_i)

    assert ft_c["full_time"]["score"] == ft_i["full_time"]["score"]
    assert digest(ledger_c) == digest(ledger_i)


def test_management_idempotency_double_click(client):
    snap = start(client, seed=311, fixture="fx-idem")
    mid = snap["match_id"]
    client.post(f"/api/matches/{mid}/advance", json={"seconds": 300})
    from tests_integration import liverpool_side
    mgmt = client.get(f"/api/matches/{mid}").json()["management"]["HOME"]
    active = [pid for pid, p in mgmt["players"].items() if p["active"] and p["slot"] != "GK"]
    bench_ids = [p["id"] for p in liverpool_side()["bench"]]
    sub = {"team": "HOME", "player_off": active[5], "player_on": bench_ids[0],
           "request_id": "req-abc"}
    r1 = client.post(f"/api/matches/{mid}/substitution", json=sub)
    assert r1.status_code == 200, r1.text
    used1 = r1.json()["substitutions_used"]
    r2 = client.post(f"/api/matches/{mid}/substitution", json=sub)   # network retry
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True
    mgmt2 = client.get(f"/api/matches/{mid}").json()["management"]
    assert mgmt2["HOME"]["substitutions_used"] == used1 == 1


def test_capacity_rejects_instead_of_evicting(client, monkeypatch):
    monkeypatch.setattr(server, "MAX_SESSIONS", 2)
    a = start(client, seed=1, fixture="fx-a")
    b = start(client, seed=2, fixture="fx-b")
    req = start_req(seed=3, mode="live"); req.update({"fixture_id": "fx-c", "save_id": "rc-test"})
    r = client.post("/api/matches/start", json=req)
    assert r.status_code == 429
    # the earlier matches are untouched
    assert client.get(f"/api/matches/{a['match_id']}").status_code == 200
    assert client.get(f"/api/matches/{b['match_id']}").status_code == 200


def test_same_match_advance_serialization(client):
    snap = start(client, seed=99, fixture="fx-conc")
    mid = snap["match_id"]
    def adv(_):
        return client.post(f"/api/matches/{mid}/advance", json={"seconds": 60}).json()["clock_seconds"]
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        clocks = sorted(ex.map(adv, range(8)))
    assert clocks == [60 * i for i in range(1, 9)]      # unambiguous ordering, no overlap


def test_multi_match_isolation(client):
    a = start(client, seed=5, fixture="fx-iso-a", save_id="save-A")
    b = start(client, seed=5, fixture="fx-iso-b", save_id="save-B")
    client.post(f"/api/matches/{a['match_id']}/advance", json={"seconds": 300})
    sb = client.get(f"/api/matches/{b['match_id']}").json()
    assert sb["clock_seconds"] == 0                     # B untouched by A's advancement
    client.post(f"/api/matches/{a['match_id']}/tactics",
                json={"team": "HOME", "tactics": {"pressingIntensity": "Relentless"}})
    assert store.get_match(b["match_id"])["save_id"] == "save-B"
    assert not store.commands(b["match_id"])            # A's commands never leak into B


def test_management_after_full_time_rejected(client):
    snap = start(client, seed=61, fixture="fx-ft")
    mid = snap["match_id"]
    run_to_ft(client, mid)
    r = client.post(f"/api/matches/{mid}/tactics",
                    json={"team": "HOME", "tactics": {"pressingIntensity": "Passive"}})
    assert r.status_code == 409


def test_save_roundtrip_and_validation(client):
    state = {"season": {"mw": 7}, "table": [1, 2, 3]}
    r = client.put("/api/saves/rc-save-1", json={"state": state})
    assert r.status_code == 200
    got = client.get("/api/saves/rc-save-1").json()
    assert got["state"] == state
    assert got["save_schema_version"] == store.SCHEMA_VERSION
    assert got["versions"]["calibration"] == bridge.CALIBRATION_VERSION
    assert client.put("/api/saves/../evil", json={"state": {}}).status_code in (400, 404, 405)


def test_debug_bundle_and_reproduction_exact(client):
    snap = start(client, seed=20260822, fixture="fx-repro")
    mid = snap["match_id"]
    client.post(f"/api/matches/{mid}/advance", json={"seconds": 900})
    client.post(f"/api/matches/{mid}/tactics",
                json={"team": "HOME", "tactics": {"buildUpTempo": "Quick"}})
    run_to_ft(client, mid)
    bundle = client.get(f"/api/matches/{mid}/bundle").json()
    assert bundle["seed"] == 20260822 and bundle["commands"]
    # §47: rebuild from stored inputs through the same appliers → exact ledger
    row = store.get_match(mid)
    sr = json.loads(row["start_request_json"])
    home = bridge.build_team(sr["home_team"], "HOME")
    away = bridge.build_team(sr["away_team"], "AWAY")
    config = bridge.build_config(sr.get("config"), sr.get("coach_ai"))
    from fc_simulator.engine import MatchEngine
    eng = MatchEngine(home, away, bridge.ATTRIBUTE_STATS, row["seed"], config)
    for cmd in store.commands(mid):
        if cmd["sim_clock"] > eng.clock:
            eng.advance(cmd["sim_clock"] - eng.clock)
        server._APPLIERS[cmd["kind"]](eng, json.loads(cmd["payload_json"]))
    while not eng.is_finished:
        eng.advance(600)
    eng.result()
    assert digest([e.to_dict() for e in eng.events]) == bundle["ledger_digest"]
    assert (eng.score["HOME"], eng.score["AWAY"]) == (row["score_home"], row["score_away"])


def test_error_id_on_unexpected_failure(client, monkeypatch):
    snap = start(client, seed=13, fixture="fx-err")
    mid = snap["match_id"]
    def boom(*a, **k): raise RuntimeError("synthetic failure")
    monkeypatch.setattr(bridge, "match_snapshot", boom)
    r = client.get(f"/api/matches/{mid}", )
    assert r.status_code == 500
    body = r.json()
    assert "error_id" in body and len(body["error_id"]) == 6
    assert "synthetic failure" not in json.dumps(body)   # no stack traces to users


def test_lookup_endpoint_returns_persisted_identity(client):
    """rc1.1: /api/matches/lookup resolves save+fixture to the authoritative
    persisted identity (works for records created before matchId was stored
    client-side, and must not be shadowed by the /{match_id} route)."""
    snap = start(client, seed=515151, save_id="lookup-save", fixture="fx-lookup")
    run_to_ft(client, snap["match_id"])
    r = client.get("/api/matches/lookup", params={"save_id": "lookup-save", "fixture_id": "fx-lookup"})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["match_id"] == snap["match_id"]
    assert b["seed"] == 515151
    assert b["calibration_version"] == bridge.CALIBRATION_VERSION
    assert b["ledger_digest"] and b["ledger_events"] > 0
    assert client.get("/api/matches/lookup", params={"save_id": "nope", "fixture_id": "nope"}).status_code == 404
