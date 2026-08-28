# Touchline Live-Test RC1 — Release Manifest

## Identity
| | |
|---|---|
| Touchline app version | **0.1.0-rc1** |
| Engine | FC Simulator **v0.7** |
| Calibration | **v0.7-cal5** (unchanged this phase — verified by hash) |
| Player data | **players-v3-4attrs** (160 players, hash e7f2cda3404df1d81360) |
| DB schema version | 1 |
| Python | 3.12 |
| Supported formations | 4-3-3, 4-2-3-1, 4-1-4-1 |

Source hashes (blake2b/20): engine.py f4bd3754b733035878d8 · calibration.py
50cc4900f19e57b00dff · players.json e7f2cda3404df1d81360. Football sources are
byte-identical to checkpoint `v0.7-cal5-pre-rc-20260822` (rollback bundle:
`simulator/checkpoints/v0.7-cal5-pre-rc-20260822.tar.gz`).

## Dependencies
`requirements.txt`: fastapi==0.141.1, uvicorn==0.52.3, pydantic==2.13.4
(dev extras in `requirements-dev.txt`). Fresh-venv install verified.

## Startup (the one recommended path)
```bash
pip install -r requirements.txt
APP_ENV=production python server.py
```
The server binds `HOST` (default 0.0.0.0 in production) and `PORT` (hosting
platforms' dynamic port respected; local default 8000). Optional `Dockerfile`
included (python:3.12-slim, volume at /data).

## Environment variables
| var | default | purpose |
|---|---|---|
| APP_ENV | development | `production` disables the dev mock and binds 0.0.0.0 |
| HOST / PORT | 127.0.0.1 / 8000 | bind address (PORT also read for hosting platforms) |
| TOUCHLINE_DATA_DIR | ./data_rc | SQLite database + backups live here (persist this dir) |
| TOUCHLINE_MAX_SESSIONS | 25 | live-match capacity; excess starts get a clean 429 |
| LOG_LEVEL | INFO | server logging |

## Persistence (SQLite, WAL, `$TOUCHLINE_DATA_DIR/touchline.db`)
- **matches**: save_id, fixture_id, seed (persisted BEFORE kickoff), all four
  versions, the complete kickoff StartRequest (teams, formations, tactics,
  instructions, coach-AI config), last simulated second, final score, final
  snapshot + full-time report, gzip event ledger.
- **match_commands**: every accepted management action with its simulation
  timestamp and optional idempotency request_id.
- **saves**: versioned career/season state blobs (schema_version 1).
- **errors**: error_id → stack trace (server side only).

## Recovery model
Live matches recover across server restarts by **deterministic replay**:
kickoff input + seed + command log replayed to the last persisted second
(no pickling). Proven replay-exact (identical ledger digest/score vs an
uninterrupted control) at API level and through a real browser with a real
server restart. Browser refresh reconnects to the same backend match via a
localStorage handle; connection loss pauses the UI (never simulates locally,
never mock-falls-back) and auto-resyncs.

## Bug reports
Testers report a **Match ID**. Then:
- `GET /api/matches/{id}/bundle` — full debug bundle (inputs, commands,
  result, ledger digest).
- `python tools/reproduce_match.py <match_id>` — rebuilds and replays the
  match, compares ledger digest + score, prints MATCH/MISMATCH; refuses to
  claim exactness if engine/calibration/player-data versions differ.

Issue template: Match ID · Fixture · What I observed · What I expected ·
Approximate minute · Was the match paused? · Recent tactical change? ·
Recent substitution?

## Operations
- Backup: `python tools/backup_data.py` (safe online SQLite backup).
- Telemetry: `python tools/telemetry_summary.py` (aggregate, anonymous).
- Health: `/api/health` · readiness: `/api/ready` (fails if players/DB/schema
  are unhealthy). Unexpected errors return a short `error_id` (no stack traces
  to users).

## Test results (this RC)
- Football: 74 core PASS · run-vs-advance parity PASS · OVR isolation,
  same-seed, worker reproducibility in-suite PASS · football sources
  hash-verified unchanged.
- Application: 22 integration PASS · 10 RC persistence/recovery/concurrency
  PASS · 4 E2E PASS · 3 RC E2E (refresh/disconnect/restart) PASS.
- Observability neutrality: API-with-persistence ledger byte-identical to a
  direct engine run (digest c4a229a0309dd28bff9e2690, seed 987654).
- Season smoke: 20 fixtures, all persisted, durable across restart, seeds
  stable, sampled CPU fixture proven v0.7-cal5 via its persisted ledger.
- Soak: 30 matches @10 concurrent (78s, 0 errors) and 25 @25 concurrent
  (67s, 0 errors); 0 leaked sessions; RSS ≤181MB. Advance p50 ~0.1s at normal
  30s batches (soak used maximal 600s batches under full CPU saturation).
- Fresh environment: clean venv from requirements.txt → production start →
  health/ready → full + live matches → reproduction MATCH.

## Known limitations (football — carried, not touched here)
NON-BLOCKING: aggressive-mirror home/away asymmetry (next diagnostic);
GK-Handling match-level sensitivity statistically null (stage math intact);
extreme-profile penalty/red rates; three engine formations; Composure's
compressed elite-sample range; Curve unused; cagey-profile absolute scoring
scale. DEFERRED: none blocking live test.
Application: single-process server (per-match locks, thread pool) — suitable
for a controlled playtest, not thousands of users; live-match snapshots are
recovery-by-replay (a restart during a very long match replays in seconds).
