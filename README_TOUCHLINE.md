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
