# ui-match — progress log (Core Loop v2, §6.1–6.5, §6.3 Review UI, §6.4 Analyst UI, Ghost League UI)

Owner: ui-match agent. Files: `web/coach-match.js`/`.css`, `sandbox/visual/embed.js` (+ guarded `match.js`),
AnimR2 presentation bits in `web/touchline.html`, `tests_ui/test_match_ui.py`, `tests_ui/test_broadcast_ui.py`,
`tests_ui/test_cards_ui.py`. Test server: `TOUCHLINE_DATA_DIR=/tmp/v2_uim PORT=8975`.
If resumed: read this file first.

## What I consume from build-core (coding against §12.2; tolerant of missing fields)
- `POST /api/matches/start` with `build:{system_id, partnerships, familiarity, set_pieces, hand[]}` → response
  `active_traits[{id,label?,count,need,active}]`, `hand[CompiledCard]`, `influence` (optional; default 3).
- `CompiledCard` fields used by the UI: `id, name, cost, type, text?, effects_text[] (or lines[]), duration?,
  keywords[] (e.g. "Exhaust", "Fatigue 6", "Combo(Overlap)", "Trigger(conceded)"), trigger?, exhaust?,
  targets?, upgraded?, preview?{dxg_for,dxg_against,dpts,se,n}`.
- `POST /api/matches/{id}/card {card_id, at_clock, targets?, team}` → `{applied, commands, influence,
  rewound_to, event_count, snapshot, card?{...}, reason?}`; 4xx `{detail}` for cost / trigger / exhausted.
  Rewind contract identical to §5.1 of COACH_MVP_SPEC (the UI resets AnimR2 to `rewound_to`).
- Card plays must appear in the ledger as an event (proposed `CARD_PLAYED` with `team_id`, `detail:{card_id,
  name, by:"AI"|"USER"}`) so AI plays can be presented at the presented second, and rewinds replay them.
  Until then, the UI also reads `snapshot.cards?{HOME:{influence, played[], exhausted[]}, AWAY:{...}}` if present.
- `POST /api/build/preview {match_id, card_id, side, state?}` → `{dxg_for, dxg_against, dpts, se, n, context}`.
- `POST /api/analyst/test {start_request, build, hand[], player_id}` → 16-future summary
  `{exp_points, win, draw, loss, xg_for, xg_against, pillars?{...}, runs_left}`; 429/403 when budget spent.
- Review: `GET /api/matches/{id}/review` may add `system_report[], partnership_report[], card_report[],
  next_steps[]` (rendered when present; old review still renders).
- Ghost: `GET /api/ghost/today?player_id=` → `{day, ranked_used, entries?}`; `POST /api/ghost/run {player_id,
  build, ranked}`; `GET /api/ghost/leaderboard?day=`.

## Ideas from wip/playtest-fixes (6c17ed8) for build-core (server.py/coach.py are theirs)
- Decision Lab "holds": Stay-the-course calls tested against the alternative turned down (`holds` param).
- Decision Lab cache keyed by (match, team, K, commands, holds) so reopening never re-runs.
- `/api/matchweek/round` idempotent/resumable round (ui-build concern).
- Lab text that reconciles "on average" with "in this match" so they never read as contradictory.

## Log
- 2026-09-30: started. Read specs + coach-match.js + embed.js + AnimR2. Porting pose feed (6c17ed8 embed/match.js).

## Resume completion (2026-09-30)
- Five-card prep, generated exact effect drawers, live influence/hand bar, presented-clock plays and rewinds, AI-card ledger popups, combo/shape effects, Analyst, Ghost League and build report are wired to the server.
- Real match smoke: tactical foul applied at the presented second, influence decremented, ledger records USER play, broadcast kept rendering, full-time review loaded without JavaScript errors.
- Added `tests_ui/test_cards_ui.py` to assert exact generated descriptions, request `at_clock`, influence cost and rewound presented state. Existing scenario library retained; retired Daily entry test now follows scenario library under Ghost League.
- Analyst budget is keyed by save + calendar week (camp/double weeks included), persisted via TL.build.setAnalystRuns. Removed raw engine metric IDs from review labels and fixed surplus review markup closure.
- Captured seven requested README walkthrough screenshots under `docs/screenshots/v2/`; full existing UI suite running.
- Full existing UI run completed: 23 passed, 2 failed, then both failures passed on focused rerun. One used an invalid pressing enum; one retained a pre-v2 8s performance bound despite full CPU card/build simulations and two workers. New card test passed (2.4s), confirming generated text, presented-second request, rewind, influence and subsequent ledger event.
- Match-scoped partnership presentation is frozen from kickoff instead of reading a later edited career build. Training/system switches are blocked while the match is live. README screenshots regenerated after Club, labels and review-metric fixes.
- Fixed an actual influence presentation race: stale in-flight card-state reads are rejected with a per-match revision, and successful plays immediately install authoritative influence/playable state from the action response. The card smoke now passes deterministically.
- Analyst saved-hand comparison and preseason three-matchweek stress UI completed. Real endpoint smoke verified variant request hands, 48 stress matches, three week rows and zero remaining camp budget. Stress uses Fulham and private copies; it does not mutate the career squad.
- UI frozen after final screenshot refresh. Live career blowouts (11–0/13–0 versus Everton) and career-vs-review xG discrepancy were sent to root/core/balance for their engine/calibration investigation.

## Post-backend-freeze capture and verification
- Refreshed only `live-match.png` and `review.png` after CPU named-system application and penalty-inclusive bridge xG corrections. One real browser match: Everton 0–3 Liverpool, TACTICAL FOUL at the presented 9s, all nine CPU fixtures completed in 16.2s. Both career banner and Review show xG 5.46–0.00 (two penalties included); no JavaScript errors. Visually inspected clean Review.
- Capture match `4ec611383de4`; database `/var/folders/4b/gkxtzx8n2m9bpfg356lr26sc0000gn/T/tlv2_final_match_pkz4ihzw/touchline.db`. Capture server on port 63334 shut down cleanly after the round.
- Targeted post-freeze verification only: `test_cards_ui.py` + `test_career_ui.py::test_matchweek_batch_condition_injury` both passed (24.9s). No whole-suite rerun. At most one browser active; two simulation workers. Owned old Claude servers 48622/48755 were terminated and confirmed absent.
- Corrected CPU setup addresses the audited match bug; remaining extreme-score/card balance tails remain subject to the statistical gates, not declared fixed by a single capture.
