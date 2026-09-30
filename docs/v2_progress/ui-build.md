# ui-build — progress log (Core Loop v2)

Owner: ui-build agent. Files: `web/coach-career.js`/`.css`, `web/coach-build.js`/`.css` (new),
career-only hooks in `web/touchline.html`, `tests_ui/test_career_ui.py`, `tests_ui/test_build_ui.py` (new).
Test server: `TOUCHLINE_DATA_DIR=/tmp/v2_uib PORT=8974 /tmp/tlvenv/bin/python server.py`.
If resumed: read this file first.

## Log
- 2026-09-30 start. Read specs. Ported 6c17ed8 career-integrity fixes into coach-career.js/.css
  (git apply of the f168485..6c17ed8 diff), then made the server-dependent bits optional:
  `CC.hasRoute(path)` reads `/openapi.json` once so optional endpoints (`/matchweek/round`,
  `/daily`, `/challenges/{id}/attempt`) are called only when the server has them (no 404 noise).

## Server items NOT mine (for build-core / server.py owner)
- `POST /api/matchweek/round` (idempotent resumable CPU round, 6c17ed8 server.py). Client uses it
  when present, else `/matches/batch`.
- `GET /api/daily`, `POST /api/challenges/{id}/attempt`, `player_id` on submit/leaderboard
  (6c17ed8 server.py + store.py). Superseded by Ghost League; client degrades to local UTC day.

## Contracts I expose (for ui-match / build-core / balance)
(filled in as built — see sections below)

## Resume completion (2026-09-30)
- System Board, Training Week, calendar/camp, market fit and fog, Club staff/economy, youth/contracts and season review are wired to the real v2 build API. Removed illustrative in-browser build maths; unavailable APIs now surface errors rather than invented fit, training or card effects.
- Reconciled actual catalog constant names, per-system starter decks, partnership eligibility rules and set-piece `drilled` unlock. Camp is 10 TP/week (40 total); calendar labels match it.
- Kickoff/Ghost snapshots preserve the whole build (including load, staff, deck and upgrades). Analyst result budget persists in the career save and uses save + calendar-week identity.
- Focused `tests_ui/test_build_ui.py` passed against real server: Python fit matches board, dry-run gain equals committed attribute gain, TP/load change, reload retains training, and match prep renders hand. Full existing UI suite running with `TOUCHLINE_WORKERS=2`.
- Screenshots: `docs/screenshots/v2/`. Visually checked board, training, Club, Ghost, prep, live and review. Initial review revealed a CPU-round scalar-familiarity error; build-core fixed the batch preparation boundary. Review screenshot will be refreshed after verification.
- Final visual QA reconciled Club summary cards with the same projection as the season ledger and removed the legacy duplicate finance panels. Salary weeks (52/year) and career calendar payments (34/year) are labelled explicitly. Board/home/transfer ratios share the calendar revenue forecast. Prep uses the system name when tactics/roles match, and manual changes retain the Custom label.
- Existing full UI run: 23 passed, 2 failed. Fixed test-only invalid pressing value (`Balanced` → `Selective`) and updated old 8s CPU-round bound to 30s for full v2 builds with the required two-worker limit. Targeted rerun: both passed. New card test also passed after checking ledger publication on the subsequent advance. Total validated: all 26 UI tests (25 full-run cases plus new card case).
- Final integration fixes: positional system id now matches Python catalog (`positional`); CPU formation follows its chosen system so possession clubs no longer fall back to Target Man solely because of legacy 4-1-4-1 shape. Custom deck minimum uses evaluate.deck_min (or available unlocked count), allowing the nine-card Custom deck.
- Analyst UI smoke passed against real workers with deliberately shortened fixtures: saved-hand comparison submits distinct hands, and a three-matchweek stress run against Fulham returns 48 matches, three weekly summaries and spends the whole camp-week budget. Stress appears in friendly/camp prep; league prep ends camp as before.
- Final total: 27 UI cases validated (full existing suite + new build/card/Analyst smoke, focused reruns after fixes). Requested seven screenshots are regenerated; clean review includes all nine CPU results. Live career snapshots repeatedly produce huge Liverpool/Everton scorelines; reported to root/balance as an unresolved football calibration issue, rather than edited out of screenshots.
- Final default-system readiness fix: the 4-3-3 frontend pivot is named `CM` but maps to engine CDM. Extended CM's role picker vocabulary with pivot roles so the catalog's Anchor/Screen choices survive instrFor sanitation, and added a readiness assertion. Targeted build smoke passed (2.6s); default prep now retains Gegenpress instead of showing Custom. This is a UI role-vocabulary fix only.
- Post-core-freeze screenshots/readouts verified: actual Everton 0–3 Liverpool and all nine CPU round results; both career banner and Review now show the same penalty-inclusive xG 5.46–0.00. Targeted card and career-round UI cases passed (2 cases, 24.9s); all owned capture/test servers stopped. UI remains frozen.
