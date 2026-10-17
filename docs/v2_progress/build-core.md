# build-core — contract + progress log (Core Loop v2: §4, §5, §6.4, §6.6, §7.2, §12.1–12.3)

Owner: build-core. Files: `build.py`, `data/cards.json`, `data/systems.json`, `server.py`
(build/analyst/card/ghost endpoints + start/batch/command extensions), `labsim.py` additions,
`coach.py` (review §6.3), `tests_build.py`. Test server: `TOUCHLINE_DATA_DIR=/tmp/v2_core PORT=8972`.
If resumed: read this file first (Log at the bottom).

**Status legend:** [live] implemented and tested · [wip] being built · [planned].

## 0. Conventions (all endpoints)
- Attribute keys are the frontend short keys (`acc spr agi rea bco bln dri fka pen cmp cur sps lps vis
  cro fin apo shp lsh vol hea daw sta sli int str stam agg jum gkd gkh gkk gkp gkr`). Height is the
  player's `ht` (cm). Spec "positioning" = `apo` (attacking position) for outfielders, `gkp` for keepers.
- Formation ids are the frontend ids `433 4231 4141` (+ E3 shapes when the engine exposes them).
  Slot ids are the frontend slot ids of that formation (433 uses `CM` for the pivot, 4231 uses `LW/CAM/RW`).
- Tactics use the frontend vocabulary (`{buildUpTempo:'Quick', ...}`), always all 13 keys.
- Instructions use the frontend vocabulary (`{attackRole:'Overlap', attackEffort:70, defenseRole:'Press Fullback', defenseEffort:60}`).
- `squad` = list of `serializePlayer(pl)` dicts (+ optional `cond`). `xi` = `{slot: pid}`. `bench` = `[pid]`.
- Errors: HTTP 4xx `{"detail": "..."}` with a readable sentence.

## 1. `GET /api/build/catalog` [live]
```
{version: "v2.1", engine_hooks: {E1:bool,E2:bool,E3:bool,E4:bool},
 attrs: {short: "Long Name"},
 constants: {...tunable numbers from build.py, e.g. tp_camp:40, tp_week:6, tp_midweek:3, tp_carry_cap:10,
             fam_levels:[30,60,90], max_partnerships:4, deck_min:10, deck_max:18, hand_size:5,
             influence_start:3, influence_max:5, ...},
 systems: [{id, name, formation, identity, custom:false,
            tactics: {13 keys, frontend vocab},
            slots: {slot: {role_key, label, attackRole, attackEffort, defenseRole, defenseEffort,
                           demand: {attr: weight}  // weights sum to 1
                          }},
            key_demands: [str], signature_cards: [card_id x4],
            pillars: [{id, label, metric, benchmark, higher_is_better}]}],
 cards: [Card],            // every card, incl. gated ones (available:false + requires[])
 patterns: [{id, name, size, members:[{role, slots:[slot...], rule}], boosts:{"1":{role:{attr:+x}},"2":...,"3":...},
             card_id, text}],
 traits:   [{id, name, kind:'player'|'unit', rule, text}],
 staff:    [{id, name, levels:3, effects:{"1":str,"2":str,"3":str}, cost:[...]}],
 starter_deck: [card_id...]}
```
`Card` (the catalogue form; `compiled` forms add targets/preview):
```
{id, name, cost, type: 'SHAPE'|'INSTRUCTION'|'PLAYER ORDER'|'SET PIECE'|'SUB'|'REACTION'|'STANCE',
 duration: null|minutes, keywords:["Fatigue 6","Exhaust","Combo(overlap)","Trigger(conceded)","Upgrade","Target(player)"],
 headline, text: str (joined), lines: [str]   // GENERATED from effects — never hand-written
 effects: [Effect], drawback: str, source: {kind:'system'|'combo'|'universal'|'set_piece'|'staff', ref},
 trigger: null|'conceded'|'opp_red'|'level_70'|'behind_60'|'ahead_75',
 exhaust: bool, combo: null|pattern_id, target: null|'player'|'opp_player'|'bench',
 upgrade: {kind:'cost'|'duration'|'effect', text, ...}, requires: ['E2'|'E3'|...], available: bool,
 tags: ['chase'|'protect'|'press'|'sub'|'energy'|'neutral']}
```

## 2. `POST /api/build/evaluate` [live]
In: `{squad, xi, bench?, system_id, build?}` (build supplies partnerships/familiarity/custom_system).
Out:
```
{system_id, slot_fit: {slot: 0-100}, system_fit: 0-100, base_fit, bonus_points,
 traits: [{id, name, count, need, active, members:[pid]}],   // unit bonuses (Engine Room 3/3 ...)
 bonuses: [{id, name, points}],
 player_traits: {pid: [trait_id]},
 best_systems: {pid: [{system_id, slot, fit}] (top 3)},
 fit_matrix: {pid: {slot: fit}}      // every squad player x every slot of THIS system (auto-pick)
 versatility: {pid: n},
 partnerships: [{id, pattern, members, fam, level, active (all members in xi), boosts:{pid:{attr:+x}}}],
 familiarity: {value, boost:{rea,apo,cmp}},
 kickoff_modifiers: {pid: {attr: +x}}}   // exactly what matches/start would add
```

## 3. `POST /api/build/train` [live]
In: `{squad, build, plan:[...], dry_run?:bool}`. Plan items:
- `{kind:'attr', pid, attr, tp}` (1 TP = one drill; `tp` drills)
- `{kind:'pair', partnership_id, tp}` or `{kind:'pair', pattern, members:[pid...], tp}` (creates it; max slots enforced)
- `{kind:'system', system_id, tp}` · `{kind:'card', card_id, tp:2}` (upgrade once) ·
  `{kind:'set_piece', pid, attr:'cro'|'fka'|'pen', tp}` (same maths as attr) · `{kind:'rest', pid}`
Out: `{build (new), squad_deltas:{pid:{attr:+x.xx}}, load:{pid:n}, log:[str], tp_spent, tp_left, errors:[str],
      level_ups:[{kind:'partnership'|'attr', ...}]}`. Deterministic; `dry_run` returns the same without the
      client needing to persist. Deltas are floats (the client adds them to `a[attr]`; the bridge accepts floats).

## 4. `POST /api/build/week_tick` [live]
In: `{squad, build, lineups_played:[{xi:[pid...], system_id}], midweek?:bool}`
Out: `{build (new), log:[str]}` — system familiarity +8/wk (chosen) +3/match; partnership +2 per match all
members started, −3/wk if never together; load reset; weekly TP (6, or 3 midweek, + coach staff) with carry cap 10;
`analyst_runs_left` reset to 2 + (analyst level − 1).

## 5. `POST /api/build/preview` [live]
In: `{match_id?, at_clock?, state?:{minute, score_diff, strength_gap?}, card_id, side:'HOME'|'AWAY', targets?, player_id?}`
Out: `{card_id, dxg_for, dxg_against, dpts, se, n, context:{minute, score_diff}, source:'table'|'live'|'none'}`.
Table = `data/card_effects.json` (balance agent). Live fallback (only with `match_id`) = small paired estimate n=6.

## 6. `POST /api/analyst/test` [live]
In: `{start_request, build, hand[], player_id, week, variants?:[{label, build?, hand?}]}` → 16 futures.
Out: `{runs_left, runs_used, n, summary:{exp_points, win, draw, loss, xg_for, xg_against, goals_for, goals_against,
pillars:{id:value}, card_plays:{card_id:count}}, variants:[{label, summary}]}`. Budget: 2 + (analyst staff − 1) per
(player_id, save_id, week); 429 `{detail}` when spent. Your hand is played in each future by the assistant using
the same deterministic card policy the CPU uses (hard difficulty).

## 7. `POST /api/matches/start` (extended) [live]
Adds optional `build:{system_id, partnerships, familiarity, set_pieces, hand[], upgrades{}, custom_system?}` for the
manager's side (`build_team`, default `"HOME"`) and optional `cpu_build:{system_id, difficulty:'easy'|'normal'|'hard', deck?}`
for the other side. Server records `build.kickoff_modifiers()` as explicit modifier layers with immutable base
lineup attributes and frozen build blocks. Partnership layers include dependency_pids; replay
uses these exact recorded deltas and dependencies rather than recalculating later build maths.
Response adds: `active_traits[{id,name,count,need,active}]`, `hand:[CompiledCard]`, `kickoff_modifiers{pid:{attr:+x}}`,
`system_fit`, `cards` (see §9).
`CompiledCard` = Card + `{upgraded, lines (with real player names), playable, reason}`.

## 8. `POST /api/matches/{id}/card` [live]
In: `{card_id, at_clock?, targets?:{player_id?, player_off?, player_on?, opp_player?}, team?:'HOME', request_id?}`
Same rewind contract as /tactics (COACH_MVP §5.1). Validation (400 with detail): card not in hand, not enough ⚡,
trigger not met, Exhausted, combo partnership not on the pitch, bad target, subs exhausted.
Out: `{applied:true, card:CompiledCard, commands:[primitive {kind,payload}], scheduled:[{clock, what}],
influence:{now, max}, cards (see §9), rewound_to, event_count, snapshot, clock_seconds}`.
The command log records ONE entry `kind:'card'` with payload `{team, card_id, version, upgraded, targets}`;
the card applier compiles it deterministically at apply time from (card version, engine state) and schedules
timed reverts in the engine's runtime (pickled with checkpoints) — so rewinds, seek, branch and the Decision Lab
replay card plays exactly. Ledger: every play records a `CARD_PLAYED` event
`{team_id, detail:{card_id, name, cost, by:'USER'|'AI', lines:[...], duration}}`; reverts record `CARD_EXPIRED`.

## 9. Per-side card state in snapshots [live]
`snapshot.cards = {HOME:{influence, max, hand:[card_id], played:[{card_id, clock}], exhausted:[card_id],
triggers_met:[trigger], playable:{card_id: {ok, reason}}}, AWAY:{...}}` on start, advance, seek, card and management
responses (only for matches started with a build). `GET /api/matches/{id}/cards?team=HOME&at=clock` gives the same
block at a presented clock.

## 10. Batch (extended) [live]
Each request may carry `builds:{HOME?:{system_id, difficulty, deck?, familiarity?, partnerships?}, AWAY?:{...}}`
(both CPU-controlled in a batch). Kick-off modifiers apply; the CPU policy plays cards (§6.6.5).

## 11. Ghost League [live]
- `GET /api/ghost/today?player_id=` → `{day (server UTC), server_time, ranked_used, ranked_match_ids, pool_size, rules}`
- `POST /api/ghost/submit {player_id, manager_name, snapshot:{team: side dict, build}}` → stores today's ghost.
- `POST /api/ghost/run {player_id, manager_name, snapshot, fallback_opponents?:[snapshot]}` → plays 3 opponents
  (deterministic from day+player_id), instantly. First run of the UTC day is ranked, later ones `practice:true`.
  Out: `{day, ranked, practice, reason, results:[{opponent, match_id, score:[f,a], points}], points, stars, rank, total}`.
  Stars (server-side): 7+ pts = 3, 5–6 = 2, 3–4 = 1, else 0.
- `GET /api/ghost/leaderboard?day=&player_id=` → `{day, entries:[{manager_name, stars, points, gd, ts, me}], total}`.

## 12. Also ported from 6c17ed8
Decision Lab `holds` (incl. `alt:{kind:'card', card_id}`), Lab result cache, reconciled lab text, and
`POST /api/matchweek/round` (idempotent resumable round). `/api/daily` + challenge attempts are superseded by Ghost.

## Log
- 2026-09-30: started; read spec, server, management, labsim, coach, engine attr usage. Contract drafted (above).

- 2026-09-30 (Codex continuation): completed all build/evaluate/train/week_tick/preview,
  card/cards-at, Analyst, and Ghost League API wiring. Batch/round requests preserve the
  preparation marker through Pydantic and explicitly use CPU card policy. Fixed first-use
  v2 database lock recursion. Ghost reserves the day's first attempt atomically before
  simulation; unique database index prevents concurrent double-ranked runs; failed attempts
  remain consumed. Opponent player IDs and nested set-piece targets are namespaced.
- Kickoff modifiers are now recorded as separate modifier layers plus immutable base lineup
  attributes (supersedes §7's earlier baked-attribute implementation note). Partnership layers
  carry dependency_pids, so a substitute/red card removes remaining partners' boosts while
  independent familiarity remains. Chosen takers reach E1. Request preparation is idempotent.
- Card commands record version/upgraded/targets once, preflight all effects on a clone, and
  runtime scheduled reverts survive checkpoints and deterministic recovery. Review now
  exposes system pillars, partnership/card evidence, player slot fit, and build next steps.
- Preview ignores uncalibrated effect tables. State-only/unidentified live requests return
  source:none and null estimates honestly; explicit live fallback uses six paired futures and
  consumes the identified player's weekly Analyst budget. Future-clock queries are rejected.
- Validation: TOUCHLINE_WORKERS=2 /tmp/tlvenv/bin/python -m pytest tests_build.py -q:
  63 passed in 2.11s. Includes all 52 cards compile/apply, pure training, real 16-future Analyst,
  three real shortened Ghost fixtures and persistence, budgets, failed ranked-attempt integrity,
  card recovery and timed-expiry replay, partnership dependency expiry and familiarity survival.
  Legacy suite and balance statistics are verified by root/balance owners.

- Additional regression: real full-mode build review and CPU round persistence passed (1 test); total 64 core tests validated.

- Live assistant now reads system pillars at the presented clock, discloses 90-minute rates for count pillars, and flags weak pillars after 30 minutes. Presented-clock regression passed; core total 65 tests validated. Analyst budget reservations use BEGIN IMMEDIATE for cross-process atomicity.

- Completed stress-test mode for /api/analyst/test: 16 paired futures × 3 matchweeks,
  cumulative condition/recovery/familiarity/partnership progression on private copies,
  per-week/aggregate reports, and an atomic full camp-week budget charge. Real paired
  variants test passed; same variant yields identical results and the input save is unchanged.
- Custom builds use minimum_deck_size=min(10, number of unlocked cards), initially 9;
  evaluate/catalog expose the rule. Per-card effect-table calibration overrides the global
  flag, allowing measured tactical cards while excluding uncalibrated informational cards.
- Corrected misleading manual labels (tempo+press is not "more men forward"). Manual
  decisions now display exact changed dials; card decisions display their catalogue name
  and generated effects. Two targeted regressions passed. Current core total: 68 tests
  validated across the initial full run and targeted additions; legacy followups run by root.

- Final live-career audit found a concrete CPU wiring gap: named CPU low_block was using
  eight different preset dials and no player roles. CPU builds now apply the full named
  bundle by default, deterministically remapping the XI if needed; apply_system:false
  remains an explicit override. Frozen old requests still replay without alteration.
- Captured 13–0 request/card replays to a byte-identical ledger; no duplicate boosts. Same
  seed with correctly applied CPU bundle: 0–2 without the card, 0–7 with tactical_foul at
  second14. This remaining extreme matchup/card tail requires statistical balance evidence;
  no engine parameters were tuned to this example.
- Review9.79 vs career7.24 was exactly three penalties (2.5572xG), omitted by native team
  summaries. Bridge live/full reporting now includes penalty probabilities and preserves
  non_penalty_xg; Review avoids doublecount. Analyst/pillar xG uses the same semantics.
- CPU policy now records calibrated model-only predictions in prepared builds, ensuring
  later calibration-file changes cannot alter replay. Effect table files reload by stat
  version for newly prepared matches. All 70 core tests passed in 6.54 seconds with two workers.
