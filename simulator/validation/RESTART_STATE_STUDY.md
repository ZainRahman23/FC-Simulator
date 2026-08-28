# RESTART / MATCH-STATE FORENSIC & IMPLEMENTATION (throw-ins · kickoffs)

**Date:** 2026-08-27 · Candidate-only; possession-movement baseline preserved and snapshotted first (`*_possmove_baseline.py` = body `0ae45888…` / lab `0d80641c…` / hybrid `27ebfa4a…`; all prior suites verified green before edits). **J. Candidate hashes now:** body `0ae458885ae6056e` (unchanged), lab `be521c8a891bbcd5`, hybrid `27ebfa4a0da4f0ca` (unchanged) — the entire workstream is lab-side restart machinery. Finishing/GK/carry/passing/reception untouched.

## A. Current restart architecture (mapped before changes)

States were implicit but real: `body.tick` detects out-of-play and writes `restart{kind, team, spot, t}` (rules detection authority); `L.run` suspends `act()` entirely while a restart exists (Tier-0 ownership was already correct); `handle_restart` owned all 22 bodies; release was atomic (`restart=None` at the kick). Equivalent-state mapping: OPEN_PLAY = restart None; SETUP/READY/EXECUTION existed blended in one generic block; GOAL = 2.5 s standstill → KICKOFF. Per the mandate, no duplicate state machine was added — the existing `kind`+`t` machinery gained explicit, logged `phase` transitions (SETUP/ASSIGNED → READY → EXECUTED; KICKOFF: RETURN → READY → EXECUTED) in a `restart_log` audit stream.

## B. Root causes

1. **Thrower**: his approach target was the throw spot ON the line — outside only by overshoot; release tolerance (1.2 m) could fire with him still inside (proven: away throws released at y≈0.4 with zero out-of-line time).
2. **Kickoff**: no formation-derived slots — players walked to mid-match cal11 shape clamped to own half; **centre-circle legality was never enforced**; READY could fire with a player 14 m into the wrong half via the timeout fallback.
3. **Head-on deadlock (found by the new suite)**: central players' anchors all map to y=34.0; opposite-walking players met shoulder-to-shoulder on the centreline and `separate()` cancelled `locomote` exactly — a player commanded at 5.2 m/s stood frozen 11 s (the K1 fallback trigger).
4. **Arrival micro-creep**: early arrivals kept receiving the braking-floor ≥0.4 m/s — a player 3.5 m from his slot logged 9.5 m of orbiting (the forbidden movement-floor defect).
5. **Stale authority remnants at the whistle**: `expected_receiver`/`_exp`, claim hysteresis and chase-target holds survived; restart kicks also never CALLED their receiver, so throw receptions were reaction-gated and unaware (3.1 s to first touch).

## C→D. Minimal repair (all in lab.py)

- `kickoff_slots()`: deterministic per-player slots from cal11 formation anchors (`home_anchor`), own-half compression (49.5/55.5), **defending team pushed outside a 9.75 m circle**, kicker at the spot + one SUPPORT adjacent; team-relative, direction-mirrored; **same machinery for opening, post-goal, and every kickoff** (no second implementation).
- KICKOFF: GOAL_SCORED (2.5 s confirm) → RETURN (everyone travels physically to slots — no teleports, max single-tick step measured 0.10 m) → READY (all within 2.0 m AND positions legal: halves + circle) → EXECUTION (real SHORT kick to the called SUPPORT) → OPEN_PLAY.
- THROW_IN: designated taker locked once, his slot **0.55 m outside the touchline**; release requires him genuinely beyond the line; one teammate assigned a short infield option and CALLED as expected receiver at release; all non-taker targets clamped legal by construction.
- **Anti-jam sidestep** (`_route_step`): a restart walker blocked head-on detours 1.6 m to his right-of-travel, deterministically, resuming the straight route when clear.
- **Arrival hold hysteresis**: stand inside 0.35 m of the slot, resume only past 0.8 m — a player at his restart target stands completely still.
- **Whistle audit (E. state table + §9 intent disposition)**: CARRY/KICK/TAKE_ON/settle/gather → TERMINATED; pending scan decisions → CANCELLED; expected receiver/_exp → CLEARED; claim + chase-target holds → CLEARED; chaser/claimant/press/mark → not stored (recomputed live, act() suspended); GK direct-drive → suspended with act(). Every phase transition appended to `restart_log` (auditable).

## F. Throw-in legality results (deterministic suite, 8 scenarios)

All four touchline/team combinations + own-goal/halfway/attacking-third + exit-during-sprint-pursuit: **thrower outside 0.20–0.76 m in every case; worst non-taker excursion 0.00 m** (post-transit); pursuit suspended at the whistle; open play resumes with decisions/contacts within seconds of release; T8 pursuers all inside by +5 s.

## G. Kickoff legality/path results (5 scenarios)

Opening kickoff via the same machinery: READY with **0 half-violations, 0 circle-violations**. Post-goal returns (both directions): **actual_path/straight p50 = 1.01, p90 = 1.10** (was 1.22/1.86 before the deadlock+creep fixes), max single-tick displacement 0.09 m (no teleports), READY twitch flips **0**, first-5-seconds resumption with live decisions, 3 consecutive goal cycles with zero stale state. Halftime: not present in the lab harness (documented; the production engine's halftime port remains the known R5 item).

## H. Full regression

Restart-state 13/13 · micro-gates 9/9 (incl. J goal→kickoff through the new machinery) · reception 8/8 · restart/claim 8/8 · pursuit 13/13 · cadence green · determinism same-seed/chunk/seed-divergence ✓ · 20-seed battery: shots 12.7/13.1, completion 0.76, spells 6.28 s, box entries 43, violations 0 — same structural regime as the accepted baseline (per §15, goals/match [4.80 here] is explicitly NOT a calibration target until match-time semantics are defined; fouls 10.8 remains the carried low-band observation).

## §16 deferred (recorded, untouched)

Progressive carrying remains brain-limited: cal11 decided CARRY targets p50 ≈ 1 m (positional adjustments). The space-dependent carry-horizon investigation (micro-adjust/controlled/progressive/attack-space tiers, causally from space/pressure/role/effort/attributes) is the next workstream and was not implemented or tuned here.

## I. Visual viewer (:8303)

`viewer_restart_after.html` vs `viewer_restart_before.html`, matched seed 789335328: all 11 mandated bookmarks (THROW_IN_BALL_OUT/SETUP/READY/RELEASE/TO_OPEN_PLAY; GOAL_SCORED, KICKOFF_RETURN_START/MID, KICKOFF_ALL_POSITIONED, KICKOFF_EXECUTION, KICKOFF_TO_OPEN_PLAY) plus **FULL_GOAL_TO_KICKOFF_SEQUENCE** (goal → all 22 return → settle → kickoff → open play) and **FULL_THROWIN_SEQUENCE** (out → setup → throw → open play). 108 restarts logged in the after-arm run.

## K. Production status

All production hashes + DB re-verified identical; RC8 live and untouched.

**PRODUCTION UNTOUCHED — AWAITING VISUAL APPROVAL**
