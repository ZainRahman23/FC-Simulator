# Touchline × FC Simulator v0.7

## Run
    cd "FC Simulator"
    .venv/bin/python server.py        # or: pip install -r requirements.txt && python server.py
    open http://127.0.0.1:8000

Optional URL flags: `?debug=1` (match-engine debug panel), `?engine=mock` (dev-only JS mock, clearly labelled).

## Layout
    server.py              FastAPI app — serves web/ and the match API
    bridge.py              Touchline ⇄ v0.7 mapping layer (attributes, tactics, roles, slots)
    tests_integration.py   18 integration tests (pytest)
    web/touchline.html     the frontend (+ web/cards/ artwork)
    simulator/             FC Simulator v0.7 (engine untouched except advance()/coach_ai_teams)

## API
    GET  /api/health
    POST /api/matches/start                       (mode: live | full)
    GET  /api/matches/{id}?since=N
    POST /api/matches/{id}/advance                {seconds, last_event_index}
    POST /api/matches/{id}/tactics                {team, tactics}
    POST /api/matches/{id}/instructions           {team, player_id, instructions}
    POST /api/matches/{id}/formation              {team, formation}
    POST /api/matches/{id}/substitution           {team, player_off, player_on, target_slot}
    DELETE /api/matches/{id}

## Tests
    .venv/bin/python -m pytest tests_integration.py -q     # integration (18)
    cd simulator && ../.venv/bin/python -m pytest -q       # v0.7 core (53)

## Coach MVP (branch `claude/coach-mvp`)

    pip install -r requirements.txt && python server.py      # http://127.0.0.1:8000

Engine: the server now defaults to the **native** v0.7 engine
(`TOUCHLINE_ENGINE=native`) — full event ledger, stats, ratings, ~2.7 s per
instant match. The continuous Hybrid-C lab is still available with
`TOUCHLINE_ENGINE=continuous` (the new coaching endpoints return 501 there).

What's new (spec: `docs/COACH_MVP_SPEC.md`):
- **Live coaching loop** (`web/coach-match.js`): spoiler-free feed/score/stats
  gated to what you see; key-moment auto-pause (goals, reds, urgent assistant
  reads, 60'/75' window) with one-click actions; decisions apply at the exact
  second on screen (deterministic rewind); momentum; 1×–8×, ⏭ next moment,
  sim to FT; full-time Review, **Decision Lab** (paired alternate futures with
  and without your calls, ± uncertainty) and **Replay from…** rehearsals.
- **Career & modes** (`web/coach-career.js`): distinct fictional squads for
  every club (real players untouched), varied AI shapes/styles, one-call league
  matchweeks, pre-match scouting with apply-able plans, board confidence,
  condition carry-over, injuries/suspensions, form, development, season
  rollover, onboarding, **Challenges** (seeded daily + scenario library with a
  server-verified leaderboard).
- **Backend**: `management.py` (one decision path), `labsim.py` (parallel
  workers), `coach.py` (insights, impacts, review, scouting), new endpoints in
  `server.py` (§5 of the spec).

Tests:

    python -m pytest tests_integration.py tests_rc.py tests_coach.py -q   # 49, ~4 min
    python -m pytest tests_ui -q                                         # 12 browser tests (Playwright + Chrome)
