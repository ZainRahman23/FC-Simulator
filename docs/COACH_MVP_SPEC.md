# Touchline Coach MVP — build spec (source of truth for all agents)

## 0. Product in one paragraph
You are the coach. The fun is **reading the game, making a call, and seeing it
matter**. Every feature serves that loop: legible matches (named feed, real
stats, momentum), an assistant that flags the *moments* worth a decision (auto-
pause, 4–8 per match), decisions applied at the exact minute you see, a post-
match "why" review, and a **Decision Lab** that proves whether your decisions
helped by replaying alternate futures with and without them. Around it: fast
matchweeks, believable opponents, season stakes (board, form, condition,
injuries, development) and fair seeded **challenge scenarios** (daily +
leaderboard). Design principles: legibility over depth, few loaded decisions
over constant fiddling, honest simulation (never touch engine probabilities),
difficulty lives in context (board, budget, opponents), not in the dice.

## 1. Engine facts every agent must know
- Default engine is now the **native** v0.7 event engine (`TOUCHLINE_ENGINE=native`,
  default). ~2.7 s per 90' instant; full event ledger with `actor_name`,
  team stats, ratings, scorers. `continuous` mode still exists; the new features
  target native only (endpoints may return 400/501 in continuous mode).
- Randomness is `KeyedRNG` (pure function of seed + semantic key). Same inputs
  + seed + commands at the same clocks ⇒ identical match. Setting
  `engine.rng.seed` at minute t gives a fresh alternate future with the past
  untouched. `pickle`/`deepcopy` of a live engine ≈ 2–7 ms (≈315 KB).
- Engine coordinates 0–100 × 0–100. HOME attacks x=100. Both teams' "left" is
  low y (LB anchor y=15). Pitch 105×68 m.
- Formations the engine supports: `433`, `4231`, `4141` (frontend ids).
- A tactics change REPLACES all 13 dials (`bridge.map_tactics` defaults any
  missing key) — **always send the full tactics dict** in frontend vocabulary
  (`buildUpTempo: 'Quick'` …, see `TACTIC_KEY_MAP`/`TACTIC_VALUE_MAP` in bridge.py).
- Instructions payload (frontend vocab): `{attackRole:'Overlap', attackEffort:70,
  defenseRole:'Track Runner', defenseEffort:60}`.
- Never change football resolution code (`simulator/fc_simulator/*`). Inputs
  (attributes, lineups, starting energy via `cond`) are fair game.

## 2. File ownership (hard rule — never edit a file you don't own)
| Owner | Files |
|---|---|
| **backend** agent | `server.py`, `store.py`, `coach.py`, `labsim.py`, `management.py`, `bridge.py` (additive only), new `tests_coach.py`, `tools/find_scenarios.py` (optional), existing `tests_*.py` fixes if a spec'd change breaks them |
| **match-ui** agent | `web/coach-match.js`, `web/coach-match.css`, `tests_ui/test_match_ui.py` |
| **career-ui** agent | `web/coach-career.js`, `web/coach-career.css`, `tests_ui/test_career_ui.py` |
| orchestrator | `web/touchline.html` (already contains the `<script>`/`<link>` tags for the four files above, loaded AFTER the main inline script in this order: coach-match.css, coach-career.css, coach-match.js, coach-career.js), `docs/*`, git |

If you truly need a change in a file you don't own, finish everything else and
list the exact change (file, location, diff) under **"REQUESTS FOR
ORCHESTRATOR"** in your final report. Do **not** run `git commit`, `git
checkout`, `git stash`, `git reset` or anything that changes git state.

## 3. Frontend integration model (both UI agents)
- `web/touchline.html` is one classic (non-module) script. Its top-level
  `function foo(){}` declarations are **globals you may override** from your
  file (`window.foo = …` or re-declaring `function foo` in your classic script).
  Its top-level `const`/`let` (e.g. `S`, `AnimR2`, `MATCH_SPEEDS`, `PLAYERS`,
  `BY_ID`, `CLUBS`, `PRESETS`) are shared global lexical bindings: readable and
  their **contents mutable**, but not reassignable.
- **Wrap and delegate, never replace wholesale** when a function is shared:
  ```js
  const _orig_renderMatch = renderMatch;
  window.renderMatch = function(){ if(myCase()) return myRender(); return _orig_renderMatch.apply(this, arguments); };
  ```
  Internal callers look the name up on `window` at call time, so wrappers take
  effect. Load order: coach-match.js wraps first, coach-career.js wraps on top.
- Shared namespace: `window.TL = window.TL || {hooks:{}, bus:new EventTarget()}`.
  Create it defensively at the top of your file (both files do this).
  Cross-module hooks (only these):
  - `TL.hooks.prematchHTML(fixture)` → string (career-ui) — rendered by
    career-ui's own `renderMatch` wrapper for the pre-kickoff screen.
  - `TL.hooks.ftBannerHTML(m)` → string|'' (career-ui) — match-ui's full-time
    screen inserts it at the top (scenario stars, board reaction, leaderboard submit).
  - `TL.hooks.afterFullTime(m)` (career-ui, async ok) — match-ui calls it once when
    its FT screen first renders.
  - `TL.startLiveFromSnapshot(snap, fixture)` (match-ui) — career-ui calls this to
    enter the live match UI for a scenario/branch match it started itself.
  - Events on `TL.bus`: `'match:ft'`, `'match:decision'` (detail: {kind, minute}),
    `'match:keymoment'`.
- **Exhibition matches** (scenarios, daily challenge, "replay from" branches)
  set `S.matchFixture.exhibition = true` (scenarios also `S.matchFixture.scenario
  = {...}`; branches `S.matchFixture.branchOf = matchId`). career-ui's
  `finalizeFixture` wrapper MUST skip season recording for exhibition fixtures
  (and must still return the UI to a sensible place).
- Persistence: all state lives in `S` and is saved via `saveState()` (server
  `/api/saves/{id}`). career-ui owns `S.career` (board, form, condition,
  injuries, development, season history, challenges); match-ui owns `S.coachUI`
  (prefs like auto-pause mode). Initialise missing fields defensively after
  `loadState()` (wrap `boot` or run in a `DOMContentLoaded`/post-boot hook) —
  old saves must keep working.
- Default renderer is `AnimR2` (`?renderer=anim2`). Keep anim3/anim4 paths
  from crashing, but only anim2 must be great.
- Style: match the existing dark UI (CSS vars `--good --warn --bad --muted
  --dim --cond` etc. in touchline.html). No external CDNs, no frameworks.

## 4. Critical wiring issues (read carefully)
1. **Presentation clock ≠ server clock.** `tick()` pre-fetches frames; the
   server can be 20–110 sim-seconds ahead of what the user sees
   (`AnimR2.S` = presented sim-second). Anything shown to the user (feed,
   score, stats, key moments) must be gated to `AnimR2.S`. Decisions must be
   applied at the presented second: management requests carry `at_clock`
   (see §5.1); the server rewinds deterministically and replies with
   `rewound_to`; the client must then `activeAnim().reset(rewound_to)`,
   truncate `m.events`/feed to the first `event_count` events, set
   `m.eventIndex = event_count`, and merge the returned snapshot.
2. **FT prefetch.** The server may reach 90' while the user watches 88'. The
   server keeps finished sessions rewindable for 20 minutes; a management
   call or `/seek` with `at_clock` < 5400 re-opens the match. Only when the
   *presentation* reaches FT should the client show the FT screen (existing
   `tick()` shows it on server FT — match-ui must gate this to presentation).
   `finalizeFixture()` must run only after presentation FT, exactly once.
3. The live management UI already exists (drag subs on the Touchline/Squad
   view, `doSub`, `setTactic`, `setInstr`, `liveFormationChange`, all via
   `api()` + `reconcileLiveFromEngine`). match-ui wraps **`api()`** to inject
   `at_clock` into `/matches/{id}/(tactics|instructions|formation|substitution)`
   requests and to handle `rewound_to` centrally — so all existing paths and the
   new one-click actions get exact-minute application for free.
4. `mgmtPending` / `advanceInFlight` serialize requests; respect them (don't
   fire management while an advance is in flight — await it).
5. Halftime: `tick()` stops at 2700 s and sets `m.htActive`; the presentation
   drains to 45:00. Keep this.
6. Response sizes: a full-time payload with events is ~0.7 MB. League batch
   uses `summary_only` (§5.4).
7. Player dicts sent to the engine come from `serializePlayer(pl)` (keys `id,
   name, pos, a:{…34 attrs}, ht, wt, foot, wf, side, ovr, pot, age`). career-ui
   may add `cond` (0–100 starting energy) to lineup entries only.
8. The server runs on one process; heavy work (batch, decision lab, scenario
   search) goes through `labsim` worker processes. First call after boot pays
   ~1–2 s worker spin-up.

## 5. Backend API contract (backend agent implements; UI agents code against it)
All responses JSON. Errors: HTTP 4xx with `{"detail": "..."}` (existing style).
`team` is always `"HOME"|"AWAY"`. Scores in coach outputs are from the given
team's perspective `[for, against]` unless keyed by HOME/AWAY.

### 5.1 Exact-minute management (existing endpoints, extended)
`POST /api/matches/{id}/tactics|instructions|formation|substitution` accept an
optional `at_clock: int`. If `at_clock < engine.clock`: rewind (checkpoint +
replay) to `at_clock`, then apply. Constraints: `at_clock >= last command clock`
for this match, `>= engine.clock - 900`, `< 5400`. Response adds
`rewound_to: int|null`, `event_count`, `snapshot` (full `match_snapshot` at the
new clock, `new_events` empty). Works on a finished-but-rewindable session.

### 5.2 Seek
`POST /api/matches/{id}/seek {to_clock}` → same shape as `/advance` response
(snapshot incl. `event_count`, `new_events` since `last_event_index` if given,
`full_time` if it reaches 5400) plus `rewound_to` when it went backwards.
Forward seek = advance without frames. Backward seek obeys §5.1 constraints.

### 5.3 Live insights
`GET /api/matches/{id}/insights?team=HOME&at=3120` → `{"clock": 3120,
"insights": [Insight], "impacts": [Impact], "momentum": [{minute, HOME, AWAY,
goals:[{team, minute, name}]}], "window": {xg_for, xg_against, shots_for,
shots_against, box_for, box_against, possession}}` computed from events ≤ at
and the engine state at the nearest checkpoint ≤ at (energy/ratings).
`Insight = {id, kind, severity:1|2|3, minute, title, text, why, actions:[Action]}`;
kinds: fatigue, card_risk, overload, pressure, drought, chase, protect,
struggler, opp_change, star. `Action` is one of:
- `{type:"sub", label, player_off, player_on, target_slot, on_name}`
- `{type:"tactics", label, tactics:{full frontend tactics dict}, summary}`
- `{type:"instructions", label, player_id, instructions:{frontend instr dict}}`
The client applies an action by POSTing it to the matching existing endpoint
(`/substitution` body `{team, player_off, player_on, target_slot}` etc.).
`Impact = {minute, clock, label, before:{…per15}, after:{…}|null,
after_minutes, verdict:"better"|"worse"|"neutral"|"pending", text}`.

### 5.4 League batch
`POST /api/matches/batch {requests:[StartRequest…], summary_only:true}` →
`{"results":[{match_id, fixture_id, status:"ft", full_time:{score, team_stats,
possession, scorers:[{name, team, minute}], players:{pid:{name, team_id, goals,
assists, rating, minutes}}}}]}` (order preserved). Each match persisted like
`mode:"full"`. Target: 9 fixtures in ≤ 5 s on this machine.

### 5.5 Review
`GET /api/matches/{id}/review?team=HOME` (finished matches) →
`coach.review()` output: `{result, score:[f,a], verdict, process, xg:[f,a],
moments:[{minute, kind, text}], impacts:[Impact], best:[{id,name,rating,why}],
worst:[…], tired:[{id,name,energy}], lessons:[str], momentum:[…]}`.

### 5.6 Decision Lab
`POST /api/matches/{id}/decision-lab {team, samples:12, index?:int}` →
`{"samples":12, "decisions":[{index, minute, clock, label,
actual:{score:[f,a], points}, exact_without:{score:[f,a], points},
with:{exp_points, win, draw, loss, avg_gd, xg_for, xg_against},
without:{…same}, delta_points, verdict:"helped"|"hurt"|"no clear effect",
text}]}`. Decision = group of your commands within 120 s. Arms: **with** = all
your commands from that moment on; **without** = stand pat from that moment
(earlier decisions kept). Paired reseeds (same K seeds both arms). `exact_without`
= the same match (original seed) standing pat from that moment. Target ≤ 3 s
per decision. `index` limits to one decision (UI can stream them).

### 5.7 Branch ("replay from here" — exhibition)
`POST /api/matches/{id}/branch {at_clock}` → a NEW live match (like
`/matches/start` live response) replaying the source's request + commands ≤
at_clock, positioned at `at_clock`; plus `branch_of`. Persisted with
`fixture_id = source_fixture + "#branch"`. Same decisions ⇒ same outcome.

### 5.8 Scenarios & challenges
`POST /api/scenarios/find {request: StartRequest, team, kind, base_seed}` →
`{scenario_id, kind, seed, takeover_clock, title, brief, objective:{stars:[{stars,
label}]}, state:{score:[f,a], xg:[f,a], shots:[f,a], reds:[f,a]}, fallback:bool}`.
Kinds: `chase` (trail by 1 at 60'), `comeback` (trail by 2 at 55'), `protect`
(lead by 1 at 70'), `tenmen` (you have a red, level or −1, at 60'), `deadlock`
(0–0 at 65' and you trail on xG). Deterministic (lowest seed ≥ base that
qualifies; ≤ 96 candidates; else fall back to `chase`, `fallback:true`).
Persisted; `scenario_id` = stable hash of (request, team, kind, base_seed).
`POST /api/matches/start {scenario_id, mode:"live", save_id}` (teams/seed
optional when scenario_id is given) → live match positioned at takeover
(server uses the stored request + seed; client teams ignored).
Stars (team perspective, final score): chase/comeback/tenmen: win 3, draw 2,
lose by 1 → 1 (comeback: lose by 1 → 1), else 0; protect: win by 2+ → 3,
win 2, draw 1; deadlock: win 3, draw 1.
`POST /api/challenges/{scenario_id}/submit {match_id, manager_name}` →
server verifies the match was started from that scenario and is finished;
computes stars → `{stars, score:[f,a], rank, total, best:bool}` (best per
manager kept). `GET /api/challenges/{scenario_id}/leaderboard` →
`{entries:[{manager_name, stars, score:[f,a], decisions, ts}], total}` sorted
stars desc, goal diff desc, fewer decisions, earlier.

### 5.9 Scouting
`POST /api/scout {opponent: side, mine: side}` (side = the same team dict sent
in a StartRequest) → `coach.scout()` output: `{formation, style, strength:{attack,
midfield, defence, keeper}, your_strength:{…}, key_players:[{label, id, name,
slot, why}], matchups:[{text, edge}], weaknesses:[str], plan:[{text,
tactics:{partial frontend dict}}], outlook}`.

## 6. Ports / data dirs for your own testing
Run the server with a private data dir and port so agents don't collide:
`TOUCHLINE_DATA_DIR=/tmp/tl_<agent> PORT=<port> /tmp/fcv/bin/python server.py`
backend 8103 · match-ui 8101 · career-ui 8102. Python venv: `/tmp/fcv`
(has fastapi, pytest, playwright; Chrome is installed — `channel="chrome"`
or bundled chromium). Kill your server when done.

## 7. Quality bar
A tester persona will play this after you. They will notice anything half-
built: dead buttons, placeholder text, spoilers (feed ahead of the picture),
decisions that don't visibly do anything, layout overflow, console errors.
Verify in a real browser (Playwright screenshots) — not just by reading code.
