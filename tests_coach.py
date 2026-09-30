"""Touchline Coach MVP backend tests (spec §5): exact-minute management and
deterministic rewind, seek, live insights (+ actions accepted), league batch,
review, Decision Lab, branch, scenarios & challenges, scouting.

Run:  TOUCHLINE_WORKERS=2 /tmp/fcv/bin/python -m pytest tests_coach.py -q
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("TOUCHLINE_WORKERS", "2")

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "simulator"))

import pytest
from fastapi.testclient import TestClient

import server
import store
from tests_integration import everton_side, liverpool_side, start_req


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    store.init(tmp_path_factory.mktemp("coach_db"))
    server.ACTIVE_MATCHES.clear()
    server.RECENT_FT.clear()
    server._TIMELINES.clear()
    return TestClient(server.app)


def digest(events):
    return hashlib.blake2b(json.dumps(events, sort_keys=True).encode()).hexdigest()[:24]


def start(client, seed, minutes=90, fixture="fx-coach", **kw):
    req = start_req(seed=seed, mode="live", minutes=minutes, **kw)
    req["fixture_id"] = fixture
    r = client.post("/api/matches/start", json=req)
    assert r.status_code == 200, r.text
    return r.json()["match_id"]


def seek(client, mid, to, last=0):
    r = client.post(f"/api/matches/{mid}/seek", json={"to_clock": to, "last_event_index": last})
    assert r.status_code == 200, r.text
    return r.json()


TAC = {"team": "HOME", "tactics": {"pressingIntensity": "Aggressive", "buildUpTempo": "Quick"}}
SUB = {"team": "HOME", "player_off": "mohamedsalah", "player_on": "liv_gen_st_01"}


# ── 5.1 exact-minute management ─────────────────────────────────────────────
def test_rewind_at_clock_equals_fresh_replay(client):
    # rewound path: server runs ahead to 20:00, manager decides "at" 16:40 (inside the reveal grace)
    a = start(client, 501, minutes=30, fixture="fx-rw-a")
    for _ in range(4):
        client.post(f"/api/matches/{a}/advance", json={"seconds": 300, "frames": False})
    r = client.post(f"/api/matches/{a}/tactics", json=dict(TAC, at_clock=1000))
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["rewound_to"] == 1000 and j["clock_seconds"] == 1000
    assert j["snapshot"]["clock_seconds"] == 1000 and j["snapshot"]["new_events"] == []
    assert j["event_count"] == j["snapshot"]["event_count"]
    assert all(e.timestamp <= 1000 for e in server.ACTIVE_MATCHES[a]["engine"].events)
    # with frames (per-second path, facing reset) up to a second decision
    client.post(f"/api/matches/{a}/advance", json={"seconds": 120, "frames": True})
    r = client.post(f"/api/matches/{a}/substitution", json=dict(SUB, at_clock=1050))
    assert r.status_code == 200 and r.json()["rewound_to"] == 1050
    # constraint: can't go back before the last command
    r = client.post(f"/api/matches/{a}/tactics", json=dict(TAC, at_clock=1030))
    assert r.status_code == 400
    ft_a = seek(client, a, 1800)
    assert "full_time" in ft_a
    # fresh path: same decisions applied live at the same clocks
    b = start(client, 501, minutes=30, fixture="fx-rw-b")
    seek(client, b, 1000)
    assert client.post(f"/api/matches/{b}/tactics", json=TAC).json()["rewound_to"] is None
    seek(client, b, 1050)
    client.post(f"/api/matches/{b}/substitution", json=SUB)
    ft_b = seek(client, b, 1800)
    assert ft_a["full_time"]["score"] == ft_b["full_time"]["score"]
    assert digest(store.ledger(a)) == digest(store.ledger(b))
    assert [(c["sim_clock"], c["kind"]) for c in store.commands(a)] == [(1000, "tactics"), (1050, "substitution")]


def test_reveal_floor_blocks_peek_and_takeover_lock(client):
    m = start(client, 503, minutes=40, fixture="fx-peek")
    seek(client, m, 1500)                         # the client has now "seen" 25:00
    r = client.post(f"/api/matches/{m}/tactics", json=dict(TAC, at_clock=1100))
    assert r.status_code == 400 and "already been played" in r.json()["detail"]
    assert client.post(f"/api/matches/{m}/tactics", json=dict(TAC, at_clock=1300)).status_code == 200


def test_rewind_constraints_and_failed_command_changes_nothing(client):
    m = start(client, 502, minutes=40, fixture="fx-rw-c")
    seek(client, m, 1500)
    # more than 15 minutes back
    assert client.post(f"/api/matches/{m}/tactics", json=dict(TAC, at_clock=500)).status_code == 400
    # invalid command at a rewound clock → 400 and the session is untouched
    bad = {"team": "HOME", "player_off": "mohamedsalah", "player_on": "nobody"}
    r = client.post(f"/api/matches/{m}/substitution", json=dict(bad, at_clock=1200))
    assert r.status_code == 400
    assert server.ACTIVE_MATCHES[m]["engine"].clock == 1500


def test_rewind_after_server_full_time_reopens_and_continues(client):
    ref = start(client, 503, minutes=30, fixture="fx-ft-ref")
    seek(client, ref, 1650)
    client.post(f"/api/matches/{ref}/substitution", json=SUB)
    ref_ft = seek(client, ref, 1800)

    m = start(client, 503, minutes=30, fixture="fx-ft")
    ft = seek(client, m, 1800)                        # server reached FT first
    assert "full_time" in ft and store.get_match(m)["status"] == "ft"
    assert m not in server.ACTIVE_MATCHES
    # plain management after FT is still refused
    assert client.post(f"/api/matches/{m}/tactics", json=TAC).status_code == 409
    r = client.post(f"/api/matches/{m}/substitution", json=dict(SUB, at_clock=1650))
    assert r.status_code == 200, r.text
    assert r.json()["rewound_to"] == 1650
    row = store.get_match(m)
    assert row["status"] == "live" and row["result_json"] is None and row["ledger_gz"] is None
    ft2 = seek(client, m, 1800)
    assert "full_time" in ft2 and store.get_match(m)["status"] == "ft"
    assert ft2["full_time"]["score"] == ref_ft["full_time"]["score"]
    assert digest(store.ledger(m)) == digest(store.ledger(ref))


def test_rewind_after_ft_survives_restart(client):
    """Finished-but-rewindable sessions are rebuilt from the command log."""
    m = start(client, 504, minutes=20, fixture="fx-ft-restart")
    seek(client, m, 1200)
    server.RECENT_FT.clear()                         # "server restart"
    server.ACTIVE_MATCHES.clear()
    r = client.post(f"/api/matches/{m}/tactics", json=dict(TAC, at_clock=1000))
    assert r.status_code == 200 and r.json()["rewound_to"] == 1000


# ── 5.2 seek ────────────────────────────────────────────────────────────────
def test_seek_forward_and_back(client):
    m = start(client, 505, minutes=30, fixture="fx-seek")
    f = seek(client, m, 600)
    assert f["clock_seconds"] == 600 and f["rewound_to"] is None and len(f["new_events"]) == f["event_count"]
    ev600 = [e for e in f["new_events"]]
    seek(client, m, 850)                                        # peek 250 s ahead (within the reveal grace)
    b = seek(client, m, 600, last=0)
    assert b["rewound_to"] == 600 and b["clock_seconds"] == 600
    assert digest(b["new_events"]) == digest(ev600)          # same past, exactly
    f2 = seek(client, m, 1100, last=b["event_count"])
    assert f2["clock_seconds"] == 1100 and all(e["timestamp"] > 600 for e in f2["new_events"])
    assert client.post(f"/api/matches/{m}/seek", json={"to_clock": 0}).status_code == 400   # already played
    ft = seek(client, m, 99999)
    assert ft["status"] == "ft" and "full_time" in ft


# ── 5.3 insights ────────────────────────────────────────────────────────────
def test_insights_shape_and_actions_accepted(client):
    """Everton (AWAY, the weaker side) managed by the user: collect insights
    as a live client would and POST every offered action to its endpoint."""
    m = start(client, 506, fixture="fx-ins", coach_ai={"home": True, "away": False})
    ep = {"sub": "substitution", "tactics": "tactics", "instructions": "instructions"}
    seen, posted = set(), 0
    kinds = set()
    for clock in range(600, 5400, 300):
        seek(client, m, clock)
        r = client.get(f"/api/matches/{m}/insights", params={"team": "AWAY", "at": clock - 60})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["clock"] == clock - 60
        assert set(j["window"]) >= {"xg_for", "xg_against", "shots_for", "shots_against",
                                        "box_for", "box_against", "possession"}
        assert j["window"]["goals_for"] >= 0 and j["window"]["goals_against"] >= 0
        assert j["momentum"] and {"minute", "HOME", "AWAY", "goals"} <= set(j["momentum"][0])
        for ins in j["insights"]:
            assert {"id", "kind", "severity", "minute", "title", "text", "why", "actions"} <= set(ins)
            assert ins["severity"] in (1, 2, 3)
            assert ins["kind"] in ("fatigue", "card_risk", "overload", "pressure", "drought", "chase",
                                   "protect", "struggler", "opp_change", "star")
            kinds.add(ins["kind"])
            if ins["id"] in seen:
                continue
            seen.add(ins["id"])
            for a in ins["actions"][:1]:
                body = {"team": "AWAY", "at_clock": clock - 60}
                body.update({k: v for k, v in a.items() if k in (
                    "player_off", "player_on", "target_slot", "tactics", "player_id", "instructions")})
                rr = client.post(f"/api/matches/{m}/{ep[a['type']]}", json=body)
                assert rr.status_code == 200, (a, rr.text)
                assert rr.json()["rewound_to"] == clock - 60
                posted += 1
                break
        # impacts appear once decisions exist
        for imp in j["impacts"]:
            assert imp["verdict"] in ("better", "worse", "neutral", "pending")
    assert seen, "the assistant never said anything"
    assert posted >= 1


def test_insights_bench_excludes_used(client):
    m = start(client, 507, minutes=30, fixture="fx-bench")
    seek(client, m, 600)
    client.post(f"/api/matches/{m}/substitution", json=SUB)
    eng = server.ACTIVE_MATCHES[m]["engine"]
    bench = server._unused_bench(eng, "HOME")
    assert "liv_gen_st_01" not in {b["id"] for b in bench}
    assert all({"id", "name", "pos", "ovr"} <= set(b) for b in bench)


# ── 5.4 batch ───────────────────────────────────────────────────────────────
def test_batch_matches_sequential_full_mode(client):
    reqs = []
    for i, seed in enumerate((71, 72, 73)):
        r = start_req(seed=seed, mode="full", minutes=45)
        r["fixture_id"] = f"B{i}"
        reqs.append(r)
    out = client.post("/api/matches/batch", json={"requests": reqs, "summary_only": True})
    assert out.status_code == 200, out.text
    res = out.json()["results"]
    assert [x["fixture_id"] for x in res] == ["B0", "B1", "B2"]
    for req, x in zip(reqs, res):
        single = client.post("/api/matches/start", json=req).json()
        ft = x["full_time"]
        assert x["status"] == "ft"
        assert ft["score"] == single["full_time"]["score"]
        assert set(ft) >= {"score", "team_stats", "possession", "scorers", "players"}
        assert len(ft["scorers"]) == ft["score"]["home"] + ft["score"]["away"]
        p0 = next(iter(ft["players"].values()))
        assert set(p0) >= {"name", "team_id", "goals", "assists", "rating", "minutes"}
        assert digest(store.ledger(x["match_id"])) == digest(single["full_time"]["events"])
        assert store.get_match(x["match_id"])["status"] == "ft"


# ── 5.5 review + 5.6 decision lab + 5.7 branch (one played match) ───────────
@pytest.fixture(scope="module")
def played(client):
    m = start(client, 508, fixture="fx-played")
    seek(client, m, 4500)
    client.post(f"/api/matches/{m}/tactics", json=TAC)
    seek(client, m, 4800)
    client.post(f"/api/matches/{m}/substitution", json=SUB)
    seek(client, m, 4860)
    # a no-op decision (identical tactics) to check the arms are truly paired
    client.post(f"/api/matches/{m}/tactics", json=TAC)
    ft = seek(client, m, 5400)
    return m, ft


def test_review_shape(client, played):
    m, ft = played
    r = client.get(f"/api/matches/{m}/review", params={"team": "HOME"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert set(j) >= {"result", "score", "verdict", "process", "xg", "moments", "impacts",
                      "best", "worst", "tired", "lessons", "momentum"}
    s = ft["full_time"]["score"]
    assert j["score"] == [s["home"], s["away"]]
    assert j["result"] in "WDL" and j["lessons"] and j["best"]
    assert len(j["impacts"]) == 2
    assert "Pressing Intensity Aggressive" in j["impacts"][0]["label"]
    # live match → 409
    live = start(client, 509, minutes=20, fixture="fx-live")
    assert client.get(f"/api/matches/{live}/review").status_code == 409


def test_decision_lab_shape_determinism_pairing(client, played):
    m, ft = played
    body = {"team": "HOME", "samples": 4}
    r1 = client.post(f"/api/matches/{m}/decision-lab", json=body)
    assert r1.status_code == 200, r1.text
    j = r1.json()
    assert j["samples"] == 4 and len(j["decisions"]) == 2
    d0, d1 = j["decisions"]
    for d in j["decisions"]:
        assert set(d) >= {"index", "minute", "clock", "label", "actual", "exact_without", "with",
                          "without", "delta_points", "verdict", "text"}
        assert set(d["with"]) == {"exp_points", "win", "draw", "loss", "avg_gd", "xg_for", "xg_against"}
        assert abs(d["with"]["win"] + d["with"]["draw"] + d["with"]["loss"] - 1) < 0.01
        assert d["verdict"] in ("helped", "hurt", "no clear effect")
        assert d["text"].startswith("Across 4 replays")
    s = ft["full_time"]["score"]
    assert d0["actual"]["score"] == [s["home"], s["away"]]
    # group 2 = sub at 4800 + no-op tactics at 4860 (within 120 s)
    assert d1["clock"] == 4800
    # determinism
    r2 = client.post(f"/api/matches/{m}/decision-lab", json=body).json()
    assert r2["decisions"] == j["decisions"]
    # index streams one decision with identical numbers
    one = client.post(f"/api/matches/{m}/decision-lab", json=dict(body, index=1)).json()
    assert one["decisions"] == [d1]
    assert client.post(f"/api/matches/{m}/decision-lab", json=dict(body, index=9)).status_code == 400


def test_decision_lab_arms_are_paired(client):
    """A decision that changes nothing must give identical arms (same K reseeds)."""
    m = start(client, 510, minutes=30, fixture="fx-pair")
    seek(client, m, 1500)
    same = {"team": "HOME", "tactics": liverpool_side()["tactics"]}   # kickoff tactics again
    client.post(f"/api/matches/{m}/tactics", json=same)
    seek(client, m, 1800)
    d = client.post(f"/api/matches/{m}/decision-lab", json={"team": "HOME", "samples": 4}).json()["decisions"][0]
    assert d["with"] == d["without"] and d["delta_points"] == 0
    assert d["exact_without"] == d["actual"]


def test_branch_same_decisions_same_outcome(client, played):
    m, ft = played
    r = client.post(f"/api/matches/{m}/branch", json={"at_clock": 4600})
    assert r.status_code == 200, r.text
    j = r.json()
    b = j["match_id"]
    assert j["branch_of"] == m and j["clock_seconds"] == 4600 and j["status"] == "live"
    assert store.get_match(b)["fixture_id"] == "fx-played#branch"
    assert [c["sim_clock"] for c in store.commands(b)] == [4500]       # commands <= at_clock
    seek(client, b, 4800)
    client.post(f"/api/matches/{b}/substitution", json=SUB)
    seek(client, b, 4860)
    client.post(f"/api/matches/{b}/tactics", json=TAC)
    ftb = seek(client, b, 5400)
    assert ftb["full_time"]["score"] == ft["full_time"]["score"]
    assert digest(store.ledger(b)) == digest(store.ledger(m))


# ── 5.8 scenarios & challenges ──────────────────────────────────────────────
def test_scenario_find_start_and_challenge(client):
    req = start_req(mode="live", coach_ai={"home": True, "away": False})
    body = {"request": req, "team": "AWAY", "kind": "chase", "base_seed": 1000}
    r = client.post("/api/scenarios/find", json=body)
    assert r.status_code == 200, r.text
    sc = r.json()
    assert set(sc) >= {"scenario_id", "kind", "seed", "takeover_clock", "title", "brief",
                       "objective", "state", "fallback"}
    assert sc["kind"] == "chase" and not sc["fallback"] and sc["takeover_clock"] == 3600
    assert sc["state"]["score"][0] - sc["state"]["score"][1] == -1
    assert "Anfield" in sc["title"] and sc["teams"] == {"you": "Everton", "them": "Liverpool"}
    assert sc["brief"].startswith("0–1 down on the hour.")
    assert [s["stars"] for s in sc["objective"]["stars"]] == [3, 2]
    # deterministic + stable id (also across a fresh search: drop the stored row)
    assert client.post("/api/scenarios/find", json=body).json() == sc
    with store._conn() as c:
        c.execute("DELETE FROM scenarios WHERE scenario_id=?", (sc["scenario_id"],))
    assert client.post("/api/scenarios/find", json=body).json()["seed"] == sc["seed"]

    # start from the scenario: positioned at takeover, the condition truly holds
    st = client.post("/api/matches/start", json={"scenario_id": sc["scenario_id"], "mode": "live",
                                                 "save_id": "chal"})
    assert st.status_code == 200, st.text
    s = st.json()
    assert s["clock_seconds"] == 3600 and s["scenario"]["scenario_id"] == sc["scenario_id"]
    assert s["score"]["away"] - s["score"]["home"] == -1
    assert s["score"] == {"home": sc["state"]["score"][1], "away": sc["state"]["score"][0]}
    mid = s["match_id"]

    # not finished yet → 409
    sub = {"match_id": mid, "manager_name": "Klopp"}
    assert client.post(f"/api/challenges/{sc['scenario_id']}/submit", json=sub).status_code == 409
    ft = seek(client, mid, 4500)
    ft = seek(client, mid, 5400)
    gf, ga = ft["full_time"]["score"]["away"], ft["full_time"]["score"]["home"]
    res = client.post(f"/api/challenges/{sc['scenario_id']}/submit", json=sub)
    assert res.status_code == 200, res.text
    rj = res.json()
    expect = 3 if gf > ga else 2 if gf == ga else 0
    assert rj["stars"] == expect and rj["score"] == [gf, ga] and rj["rank"] == 1
    assert rj["total"] == 1 and rj["best"] is True
    # foreign match ids are rejected
    other = start(client, 511, minutes=20, fixture="fx-foreign")
    seek(client, other, 1200)
    bad = client.post(f"/api/challenges/{sc['scenario_id']}/submit",
                      json={"match_id": other, "manager_name": "Cheat"})
    assert bad.status_code == 400
    # someone else can't claim your match
    assert client.post(f"/api/challenges/{sc['scenario_id']}/submit",
                       json={"match_id": mid, "manager_name": "Thief"}).status_code == 409
    lb = client.get(f"/api/challenges/{sc['scenario_id']}/leaderboard").json()
    assert lb["total"] == 1 and lb["entries"][0]["manager_name"] == "Klopp"
    assert set(lb["entries"][0]) >= {"manager_name", "stars", "score", "decisions", "ts"}


def test_scenario_protect_condition_holds(client):
    req = start_req(mode="live", coach_ai={"home": False, "away": True})
    sc = client.post("/api/scenarios/find", json={"request": req, "team": "HOME", "kind": "protect",
                                                  "base_seed": 1000}).json()
    assert sc["kind"] == "protect" and sc["takeover_clock"] == 4200
    assert sc["state"]["score"][0] - sc["state"]["score"][1] == 1
    s = client.post("/api/matches/start", json={"scenario_id": sc["scenario_id"]}).json()
    assert s["clock_seconds"] == 4200 and s["score"]["home"] - s["score"]["away"] == 1
    assert client.post("/api/scenarios/find", json={"request": req, "team": "HOME",
                                                    "kind": "nonsense", "base_seed": 1}).status_code == 400


# ── 5.9 scouting ────────────────────────────────────────────────────────────
def test_scout_shape(client):
    r = client.post("/api/scout", json={"opponent": liverpool_side(), "mine": everton_side()})
    assert r.status_code == 200, r.text
    j = r.json()
    assert set(j) >= {"formation", "style", "strength", "your_strength", "key_players", "matchups",
                      "weaknesses", "plan", "outlook"}
    assert set(j["strength"]) == {"attack", "midfield", "defence", "keeper"}
    assert j["key_players"][0]["label"] == "Main threat" and j["key_players"][0]["slot"] != "GK"
    assert j["plan"] and all("text" in p and "tactics" in p for p in j["plan"])
    j2 = client.post("/api/scout", json={"opponent": everton_side(), "mine": liverpool_side()}).json()
    assert "deep" in j2["style"] and j2["outlook"] != j["outlook"]
