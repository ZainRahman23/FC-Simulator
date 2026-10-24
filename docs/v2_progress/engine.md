# ENGINE agent — progress + interface notes (Core Loop v2, E1–E4)

Owner: engine agent. Files: `simulator/**`, `management.py`, `tests_engine_v2.py`
(+ additive formation ids in `bridge.py`). Everything below is labelled
**ENGINE CHANGE** for the PR. All hooks are inert unless their input is given.

Status: E1–E4 IMPLEMENTED + tested (tests_engine_v2.py, 30 tests). Flags-off identity
proven vs HEAD on 9 reference cases. Full calibration sweep pending (see below).

## Interfaces for other agents

### Start request (additive, all optional)
```
home_team / away_team: {
  ...existing...,
  "formation": "442" | "343" | "532"   (also engine names "4-4-2", "3-4-3", "5-3-2"),
  "set_pieces": {"corner": pid?, "free_kick": pid?, "penalty": pid?,
                 "corner_routine": {"zone": "auto"|"near"|"far"|"short", "target_pid": pid?}?}
}
top level: "modifiers": [ {"team": "HOME"|"AWAY", "deltas": {pid: {attr: +x}}, "until_clock": int?}, ... ]
```
- Kick-off modifiers (build.kickoff_modifiers output) go in top-level
  `modifiers`. Applied at build_engine (clock 0). Removed automatically when the
  player leaves the pitch (sub / red card) or when `until_clock` is reached.
- attr keys are ENGINE attribute names (e.g. `crossing`, `heading_accuracy`,
  `attacking_position`, `defensive_awareness`, `interceptions`, `composure`,
  `short_passing`, `reactions`, `stamina`, `vision`, `aggression` ...). Frontend
  short keys (bridge.ATTR_MAP keys like `cro`) are also accepted and mapped.
  Effective value = base + delta, clamped by the engine's normal 1..99 clamp.

### In-match appliers (management.APPLIERS; same command-log path as today)
- `modifiers`: `{team, deltas:{pid:{attr:+x}}, until_clock?: int}` — pids must be
  on the pitch for `team`. Deltas stack additively with other layers.
  Optional `dependency_pids:[pid...]` makes a layer end when any required
  partner is substituted or sent off. Other layers on the remaining players
  retain their own lifetime. This is how the build layer applies partnerships.
- `set_pieces`: `{team, corner?, free_kick?, penalty?, corner_routine?}` — merges
  into the team's config; a key present with `null` clears it (back to auto).
- `schedule`: `{at_clock: int, command: {kind, payload}}` — the SCHEDULED
  COMMAND mechanism (see below).

### Scheduled commands (E2) — for build-core / server.py
The scheduled command is itself an ordinary command logged at the clock it was
issued (e.g. the card-play clock). The engine stores the pending inner command
in its own state (pickled with checkpoints) and applies it through the same
APPLIERS right after simulating second `at_clock` — exactly where the server
would apply a command logged at `sim_clock == at_clock`. Hence rewind / replay /
branch / Decision Lab reproduce it with no server changes beyond logging it.
Helpers in management.py:
- `management.scheduled(at_clock, kind, payload) -> {"kind":"schedule","payload":{...}}`
  builds the command dict to append/apply.
- `management.apply_command(engine, cmd)` = `APPLIERS[cmd["kind"]](engine, cmd["payload"])`.
- If `at_clock <= engine.clock` the inner command is applied immediately.
- If the inner command is invalid when it fires (player already subbed off,
  etc.) it is skipped and a `SCHEDULED_SKIPPED` event is recorded.
- Timed `modifiers` do NOT need a scheduled revert: use `until_clock`.

### Formations (E3) — new shapes and slot names
| frontend id | engine name | slots |
|---|---|---|
| `442` | `4-4-2` | GK LB LCB RCB RB LM LCM RCM RM LST RST |
| `343` | `3-4-3` | GK LCB CB RCB LWB LCM RCM RWB LW ST RW |
| `532` | `5-3-2` | GK LWB LCB CB RCB RWB CDM LCM RCM LST RST |
New slot names: `CB` (centre of a back three), `LWB`/`RWB` (wing-backs, treated
as full-backs by the engine's line logic), `LST`/`RST` (strike pair).
Frontend slot ids for new formations == engine slot ids (identity map).
Remaps exist between every pair of the 6 shapes, EXCEPT the legacy pair
4-2-3-1 <-> 4-1-4-1, which stays rejected (400) for managers and coach AI
because tests_integration pins that behaviour (engine supports it with
`_change_formation(..., extended=True)` if the orchestrator wants to enable it).
Default roles/instructions: CB HOLD_RECYCLE/COVER, LWB/RWB OVERLAP/TRACK_RUNNER,
LST RUN_BEHIND/STAY_HIGH, RST LINK/STAY_HIGH.
Coach AI: CHASE -> 4-2-3-1 from any shape; PROTECT -> 4-3-3 (back-four bases,
legacy) or 5-3-2 (3-4-3 / 5-3-2 bases).

## Log
- [done] Baseline digests from `git archive HEAD` (7861512) for 9 reference cases
  (fixture_liv_eve + AI/4231/4141/red-card/managed variants) -> `tests_engine_v2.BASELINE_DIGESTS`.
- [done] E3 code: formations.py (3 shapes, remaps via 4-3-3 hub + 2 direct tables;
  legacy AI transitions unchanged; 4-2-3-1<->4-1-4-1 now allowed on the manager
  path only), engine slot-literal sets extended for new slots, ratings groups,
  default instructions, bench-candidate rules, AI PROTECT -> 5-3-2 for back-three bases.
- [done] E1/E2/E4 engine hooks + management appliers `modifiers`, `set_pieces`, `schedule`;
  helpers `management.dispatch/apply_command/scheduled`.
- [done] Flags-off identity: new engine == HEAD digests on all 9 cases (untouched).
- [done] Resumption verification: all 32 `tests_engine_v2.py` tests pass (131 s), including engaged-but-unset identity on all nine frozen reference cases and partner departure on substitutions/red cards. All 100 `simulator/tests` tests also pass (25 s).
- [done] 16-seed paired formation smoke report exists in `simulator/validation/e3_formation_drift.{txt,json}`. This exercises the shapes; it is not a full calibration acceptance result.
- [pending] Full 200-seed formation sweep. Run on a Slurm CPU allocation on danilogin, not the login node or the laptop. Outcome drift must be reported, not tuned to a desired score distribution.

## Calibration commands (to run at the end; CPU-heavy)
Full sweep (>=200 paired seeds per formation, 3 setups x 4 shapes = 2400 matches):
```
cd /Users/dani/Repos/FC-Simulator
/tmp/tlvenv/bin/python simulator/validation/e3_formation_drift.py 200 6
```
Writes `simulator/validation/e3_formation_drift.txt` (table) and `.json` (rows).
Args: N seeds, worker processes. Smoke: `... e3_formation_drift.py 16 2`.
Identity baseline recompute (optional): `git archive 7861512 simulator/fc_simulator simulator/data management.py bridge.py | tar -x -C /tmp/base && TLV2_ROOT=/tmp/base /tmp/tlvenv/bin/python tests_engine_v2.py`.

## Requests for other owners (not engine files)
- coach.py (insights/scout) slot sets don't know the E3 slots yet: add `LWB`,`RWB`
  to DEF_SLOTS (and LWB/RWB to LEFT/RIGHT_SLOTS), `LST`,`RST` to ATT_SLOTS (+LEFT/RIGHT),
  `CB` is already in DEF_SLOTS; `_pos_bucket` should return ATT for LST/RST;
  coach.py:592 formation label map lacks '442','343','532' (falls back to the raw id).
- Frontend: formation pickers need the three ids and their slot layouts (anchors in
  `simulator/fc_simulator/formations.py`, HOME frame: x 0..100 toward opponent goal, y 0..100 left->right).

- [done] Final V2 substitution contract: five players in three ledger-derived in-play windows; same-clock batches share a window and halftime is exempt. CPU and manual paths share the guard; legacy no-build requests are unchanged. New test + all nine frozen reference identity cases passed (10 cases, 48s). Engine coverage now 33 validated cases (32 broad suite plus added substitution case).
