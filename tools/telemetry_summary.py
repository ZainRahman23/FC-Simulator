#!/usr/bin/env python3
"""Aggregate football-debug telemetry from persisted matches (anonymous: save/match IDs only)."""
import json, os, sys, statistics as st
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import store
store.init(os.environ.get("TOUCHLINE_DATA_DIR", ROOT / "data_rc"))
import sqlite3
with sqlite3.connect(Path(os.environ.get("TOUCHLINE_DATA_DIR", ROOT / "data_rc")) / "touchline.db") as c:
    c.row_factory = sqlite3.Row
    rows = [dict(r) for r in c.execute("SELECT * FROM matches WHERE status='ft'").fetchall()]
    cmds = [dict(r) for r in c.execute("SELECT kind, sim_clock FROM match_commands").fetchall()]
print(f"completed matches: {len(rows)}")
if rows:
    goals = [(r["score_home"] or 0) + (r["score_away"] or 0) for r in rows]
    print(f"goals/match: mean {st.mean(goals):.2f}  max {max(goals)}")
    xgs = []
    for r in rows:
        try:
            res = json.loads(r["result_json"])
            ts = (res.get("full_time") or {}).get("team_stats") or {}
            xgs.append(sum(v.get("xg", 0) for v in ts.values()) if ts else None)
        except Exception: pass
    xgs = [x for x in xgs if x]
    if xgs: print(f"xG/match: mean {st.mean(xgs):.2f}")
from collections import Counter
print("management commands:", dict(Counter(c["kind"] for c in cmds)))
subs = [c["sim_clock"] / 60 for c in cmds if c["kind"] == "substitution"]
if subs: print(f"substitution timing: mean {st.mean(subs):.0f}' median {st.median(subs):.0f}'")
