"""Continuous-transport chunk-invariance regression tests.

Guards the fix for the defect where Lab.run(seconds) executed a caller-dependent
number of 60 Hz ticks (an extra tick per call from the `while body.t < end_t`
float overshoot), so a match advanced in chunks diverged from the same match run
in one shot. The invariant asserted here:

    for identical initial state + seed, run(T) produces the same authoritative
    simulation as run(a); run(b); ...  with a + b + ... = T, independent of how
    the caller chunks time.

Run:  .venv/bin/python -m pytest tests_chunk_invariance.py -q
"""
from __future__ import annotations

import hashlib
import json
import random
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "simulator"))
sys.path.insert(0, str(ROOT))

import bridge  # noqa: E402
import server  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)

# reuse the integration fixtures for realistic teams
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location("tests_integration", ROOT / "tests_integration.py")
_ti = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_ti)
start_req, liverpool_side, everton_side = _ti.start_req, _ti.liverpool_side, _ti.everton_side


def _fresh_lab(seed=31337, minutes=90):
    engine = server._build_engine(start_req(seed=seed, minutes=minutes))
    return server._make_lab(engine), engine


def _canon(lab, engine) -> str:
    """A canonical, chunk-agnostic digest of authoritative simulation state:
    tick, clock, score, ball, every player position/velocity/facing, energy,
    the football event log, and wake counters."""
    b = lab.body
    players = [(pid, round(b.players[pid]["x"], 7), round(b.players[pid]["y"], 7),
               round(b.players[pid]["vx"], 7), round(b.players[pid]["vy"], 7),
               round(b.players[pid].get("facing", 0.0), 7)) for pid in sorted(b.players)]
    ball = b.ball
    ballc = (round(ball["x"], 7), round(ball["y"], 7), round(ball["z"], 7),
             round(ball["vx"], 7), round(ball["vy"], 7), round(ball["vz"], 7),
             ball["state"], ball["ctrl"], ball["held"])
    energy = tuple(sorted((pid, round(st.energy, 6), round(st.acute_exertion, 6))
                          for pid, st in engine.states.items()))
    events = tuple((round(e.get("t", 0), 3), e.get("kind"), e.get("pid"))
                   for e in getattr(lab, "match_events", []))
    wakes = tuple(sorted(lab.wakes.items()))
    blob = json.dumps({"tick": b.tick_n, "clock": engine.clock, "score": list(b.score),
                       "ball": ballc, "players": players, "energy": energy,
                       "events": events, "wakes": wakes}, default=str, sort_keys=True)
    return hashlib.blake2b(blob.encode()).hexdigest()


def _drive_window(pattern, T):
    lab, engine = _fresh_lab()
    if pattern == "oneshot":
        lab.run(float(T))
    elif pattern == "one_second":
        for _ in range(T):
            lab.run(1.0)
    elif pattern == "halves":
        lab.run(T / 2.0); lab.run(T / 2.0)
    elif pattern == "tenths":
        for _ in range(T * 10):
            lab.run(0.1)
    elif pattern == "sixths":                       # the watched/frames cadence
        for _ in range(T * 6):
            lab.run(1.0 / 6.0)
    elif pattern == "irregular":
        r = random.Random(7); acc = 0.0
        while acc < T - 1e-9:
            d = min(round(r.uniform(0.02, 2.0), 2), T - acc)
            lab.run(float(d)); acc = round(acc + d, 6)
    return _canon(lab, engine)


def test_lab_run_window_chunk_invariance():
    """run(120) == 120xrun(1) == run(60)+run(60) == 1200xrun(0.1)
    == 720xrun(1/6) == irregular chunks, over an identical 120 s window."""
    T = 120
    ref = _drive_window("oneshot", T)
    for pattern in ("one_second", "halves", "tenths", "sixths", "irregular"):
        assert _drive_window(pattern, T) == ref, f"chunk pattern {pattern} diverged from one-shot"


def _drive_match(pattern, seed=6060, minutes=10):
    lab, engine = _fresh_lab(seed=seed, minutes=minutes)
    dur = minutes * 60
    if pattern == "oneshot":
        lab.run(float(dur) + 60)                    # Lab.run stops at is_finished
    elif pattern == "chunk300":
        while not engine.is_finished:
            lab.run(300.0)
    elif pattern == "frames6":                       # watched cadence: 1/6 s x6 per second
        while not engine.is_finished:
            for _ in range(6):
                lab.run(1.0 / 6.0)
    return _canon(lab, engine)


def test_full_match_chunk_invariance():
    """A whole match run one-shot, in 300 s skips, and in 1/6 s watched frames
    produces byte-identical authoritative state (incl. score + event log)."""
    ref = _drive_match("oneshot")
    assert _drive_match("chunk300") == ref, "300 s chunked match diverged from one-shot"
    assert _drive_match("frames6") == ref, "frames (1/6 s) match diverged from one-shot"


def _live_events(seed, minutes, chunk, frames=False):
    r = client.post("/api/matches/start", json=start_req(seed=seed, minutes=minutes, mode="live")).json()
    mid = r["match_id"]; events = list(r["new_events"]); last = r["event_count"]; snap = r
    while snap["status"] != "ft":
        body = {"seconds": chunk, "last_event_index": last}
        if frames:
            body["frames"] = True
        snap = client.post(f"/api/matches/{mid}/advance", json=body).json()
        events += snap["new_events"]; last = snap["event_count"]
    score = snap["full_time"]["score"]
    client.delete(f"/api/matches/{mid}")
    return events, score


def test_api_full_equals_live():
    """Through the API, an instant/full match and a watched/live match of the
    same seed expose the identical event stream and score — for both the 300 s
    skip path and the frames path."""
    for seed, minutes in ((31337, 8), (6060, 10)):
        full = client.post("/api/matches/start", json=start_req(seed=seed, minutes=minutes)).json()["full_time"]
        for chunk, frames in ((300, False), (60, True)):
            ev, sc = _live_events(seed, minutes, chunk, frames)
            assert ev == full["events"], f"seed {seed} live(chunk={chunk},frames={frames}) events != full"
            assert sc == full["score"], f"seed {seed} live(chunk={chunk},frames={frames}) score != full"
