#!/usr/bin/env python3
"""Determinism / renderer-neutrality verification for the visual match preview.

Runs the deterministic preview fixture three times against the untouched
engine server:
  A) frames=True   (the visual preview's exact request pattern)
  B) frames=True   (repeat — reproducibility)
  C) frames=False  (no renderer keyframes — sampling neutrality)

and digests the authoritative outputs the project's own invariance tests use
(score, event ledger, player stats, possession) plus the full keyframe stream.
A == B proves seed-determinism through the preview's request pattern;
A == C on match outputs proves the frames sampling changes nothing.

Usage: python3 sandbox/visual/tools/verify_determinism.py
       (engine server on 127.0.0.1:8000; prints digests and PASS/FAIL)
"""
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
API = "http://127.0.0.1:8000/api"
FIXTURE = json.loads((ROOT / "sandbox/visual/fixture_liv_eve.json").read_text())


def call(path, payload=None, method=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data,
                                 method=method or ("POST" if data else "GET"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()[:16]


def run_match(frames: bool):
    start = call("/matches/start", FIXTURE)
    mid = start["match_id"]
    all_frames, events, last_idx = [], [], 0
    full_time = None
    for _ in range(200):
        r = call(f"/matches/{mid}/advance",
                 {"seconds": 120 if frames else 600, "frames": frames,
                  "last_event_index": last_idx})
        if r.get("frames"):
            all_frames.extend(r["frames"])
        for ev in r.get("new_events") or []:
            events.append(ev)
        last_idx = r.get("event_count", last_idx)
        if r.get("full_time"):
            full_time = r["full_time"]
            break
    assert full_time is not None, "match did not finish"
    return {
        "score": digest(full_time.get("score")),
        "events": digest(full_time.get("events")),
        "player_stats": digest(full_time.get("player_stats")),
        "possession": digest(full_time.get("possession")),
        "live_event_stream": digest(events),
        "frames": digest(all_frames) if frames else None,
        "n_frames": len(all_frames),
        "final_clock": full_time.get("clock_seconds") or full_time.get("engine", {}).get("clock"),
        "score_raw": full_time.get("score"),
    }


if __name__ == "__main__":
    print(f"fixture {FIXTURE['fixture_id']} seed {FIXTURE['seed']}")
    A = run_match(frames=True)
    B = run_match(frames=True)
    C = run_match(frames=False)
    print("run A (frames=True): ", json.dumps(A, default=str))
    print("run B (frames=True): ", json.dumps(B, default=str))
    print("run C (frames=False):", json.dumps(C, default=str))
    keys = ["score", "events", "player_stats", "possession", "live_event_stream"]
    repro = all(A[k] == B[k] for k in keys) and A["frames"] == B["frames"]
    neutral = all(A[k] == C[k] for k in keys)
    print(f"reproducibility (A==B incl. {A['n_frames']} frames): {'PASS' if repro else 'FAIL'}")
    print(f"frames-sampling neutrality (A==C match outputs):     {'PASS' if neutral else 'FAIL'}")
    raise SystemExit(0 if (repro and neutral) else 1)
