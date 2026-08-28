# THROW-IN OWNERSHIP HARD FIX — EXACTLY ONE PLAYER LEAVES THE PITCH

**Date:** 2026-08-27 · Candidate-only; body/hybrid untouched (`0ae45888…`/`27ebfa4a…`); rejected candidate snapshotted (`lab_restart1_baseline.py` = `be521c8a…`). Kickoff fix and all accepted reception/possession/pursuit work preserved and re-gated.

## A/B/C. The players who left, why, and their first causal ticks (real match, seed 789335328)

Full-match crossing census (every tick, every state — the measurement the old metric lacked): four significant non-thrower crossings. The visually rejected moment is **t≈1332–1335: two players outside around one throw-in** — mohamedsalah crossed during the live chase and **remained 2.00 m outside for 2.85 s INTO the restart** (first causal tick: the whistle tick — his restart target was inside but no urgent re-entry behavior existed, so he strolled back at setup pace), while bre_gen_rw's live chase carried him 1.88 m over at the same throw. Classification: **D (momentum after correct target switch) with slow re-entry** — plus one **B/C-class live-play bug**: bre_gen_rcb held an off-pitch movement target for 39 consecutive ticks in open play (structural/press target beyond the line against a touchline carrier). No stale pursuit of the dead ball existed (the whistle-tick authority barrier from the prior workstream held: commands flip to restart authority one tick after BALL_OUT).

## D. Why the previous tests reported 0.00 m

The gate-2 match metric counted only ticks with `restart.kind == THROW_IN` — crossings that BEGAN during live play and persisted into the restart were attributed... to nothing (the player was already outside at whistle; the metric's per-tick out-distance check DID cover it — but the metric run predated two of the four episodes' trigger conditions and its fixtures' pursuers never physically reached the line). The forensic replaced it with a full-run, all-state census that reproduces the human observation.

## E. Thrower selection (existing, verified)

Selection was already once-and-locked at the whistle: awarded team from last-touch rules, closest eligible outfielder (GK excluded), locked in `r['taker']`, never reselected (hard cases confirm: selection at +0.017 s = one tick; single THROWER role throughout; H7 proves an opponent nearer the spot is never chosen).

## F. Atomic authority barrier (existing, verified + hardened)

At the whistle tick: all intents terminated; pending decisions cancelled; expected receiver/_exp cleared; claims and chase-holds cleared; `act()` fully suspended (no open-play authority can run). New hard assertions confirm: **zero non-thrower outside-target ticks and zero dead-ball pursuit commands from BALL_OUT through release in every scenario.**

## G. Non-thrower boundary behavior (the new repairs, lab.py only)

1. **Urgent re-entry**: any non-taker physically outside during a restart is commanded straight to the perpendicular nearest inside point at 6.2 m/s before taking up his restart position — the abort reads immediately (no more 2.85 s strolls outside).
2. **Line-brake for dying balls**: when the ball will cross a boundary within ~1.2 s, chaser approach speed is capped so braking distance fits inside the pitch (the line becomes a virtual arrival) — physical deceleration, no walls, no teleports, no zeroed velocity. Live saves of balls that stay in are unaffected (winnable chases at speed persist; pursuit suite 13/13 unchanged).
3. **Open-play target legality**: structural/press targets are clamped inside the field of play (you press a touchline carrier from in-bounds) — removes the 39-tick outside-target class.

## H. Hard-case results (7 engineered multi-chase exits; metrics from BALL_OUT to release)

Two teammates / two opponents / one-each / three-player chase / heavy-touch top-line / winger+fullback / closest-pursuer-wrong-team: **thrower selected +0.017 s, exactly 1 THROWER role, non-thrower max outside 0.00 m and 0.00 s, outside-target ticks 0, dead-ball pursuit 0, and the final pre-release outside set = {designated thrower} (or ∅) in all seven.** Full-match census after repair: **zero non-taker crossings with any restart presence** (all remaining crossings are live-ball saves of balls that stayed in play).

## I/J. Kickoff + full regression

Kickoff untouched and re-verified: gate-2 8/8 (exactly 2 in circle, all four cases). restart-state 13/13 · micro-gates 9/9 · reception 8/8 · restart/claim 8/8 · pursuit 13/13 + sweep · cadence green · determinism same-seed/chunk/divergence ✓ · battery structurally unchanged (shots 12.9/11.9, completion 0.76, spells 6.5 s, violations 0; goals remain a non-target per the match-duration note).

## K. Viewer (:8303)

`viewer_onethrower_before.html` vs `viewer_onethrower_after.html`, matched seed: BALL_OUT_EXACT, THROWER_SELECTED, ALL_NONTHROWERS_ABORT, MULTI_PLAYER_CHASE_BEFORE_OUT, SAME_SEQUENCE_AFTER_OUT, THROWER_ONLY_OUTSIDE, THROW_IN_READY, THROW_RELEASE, THROW_TO_OPEN_PLAY, KICKOFF_TWO_IN_CIRCLE — and **FULL_MULTI_CHASE_THROWIN_SEQUENCE with 6 s pre-roll** (the highest-chaser-count natural throw-in of the run: live chase at speed → crossing → one thrower → everyone else aborts inside → setup → throw → open play).

## L. Hashes & production

Candidate: body `0ae458885ae6056e` · lab `89df6b50be5134a5` · hybrid `27ebfa4a0da4f0ca`. Production engine `429ec3eb301495a9` + DB `b2092e4415533069` verified identical; RC8 live.

PRODUCTION UNTOUCHED — AWAITING VISUAL APPROVAL
