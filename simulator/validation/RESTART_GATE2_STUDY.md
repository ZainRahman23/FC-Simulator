# RESTART VISUAL-GATE FOLLOW-UP — BALL-OUT PURSUIT ABORT + EXACT CENTRE-CIRCLE OCCUPANCY

**Date:** 2026-08-27 · Candidate-only. Rejected visual candidate snapshotted bit-exact first (`lab_restart1_baseline.py` = `be521c8a…`); body/hybrid untouched all workstream. Baseline suites verified green before edits.

## A. BALL-OUT ROOT CAUSE

The previous 0.00 m metric measured settled-setup excursion and its fixtures never created a hot pursuit at the crossing (one scripted ball even died of friction before the line — caught and rebuilt). The tick-level forensic from 1.0 s before the crossing shows the **authority handoff itself was already correct**: one tick after the authoritative BALL_OUT, the pursuer's command flips to an in-bounds restart target (zero outside targets, zero dead-ball pursuit commands). The visual defect is the **pre-whistle hopeless chase**: the pursuer sprints flat-out at a ball he can no longer win, is at maximum speed at the line exactly at BALL_OUT, and physics braking carries him over — which reads as "follows the dead ball out, eventually returns". Classification: **momentum, caused by an uneased hopeless chase — the earliest causal owner is the pre-out chase speed law**, not restart authority and not locomotion braking.

## B. FIRST DIVERGENT TICK

The final ~0.9 s of ball flight before the crossing: chaser commanded vmax at the exit-truncated intercept sample although the ball's arrival there beats his earliest possible arrival (an unwinnable race).

## C. KICKOFF ROOT CAUSE

`kickoff_slots()` applied centre-circle exclusion **only to the defending team**. Any kicking-team player whose own-half anchor compression lands centrally (the striker compresses to (49.5, 34) — 3.0 m from the spot) received an in-circle SLOT. Additionally the READY gate circle-checked only defenders, so even after slot repair a player **in transit through the circle** could be present at READY (traced: the striker's straight return route passes through the centre), and the gate's 9.0 m margin mismatched the 9.15 m law.

## D→E. MINIMAL REPAIR (lab.py only; functions: chaser branch, kickoff_slots, KICKOFF READY gate, throw release)

1. **Hopeless-chase ease**: when the ball reaches the chase point before the chaser possibly can (ball_eta + 0.08 < d/vmax — exit-truncated targets included), speed eases to `d·1.2` — he recognizes the dying ball, decelerates, and contains at the point instead of flying past. Winnable in-bounds saves still sprint (13/13 pursuit scenarios + pace sweep unchanged).
2. **Circle legality built into every slot**: the 9.75 m projection now applies to all 20 non-designated players at slot construction (kicker + SUPPORT assigned explicitly afterward — the only two inside by design).
3. **READY gate**: circle clearance (9.2 m) required of everyone except kicker/support — READY waits for transiting players to clear; halves gate unchanged.
4. **Throw release strictness**: the thrower must be genuinely beyond the line (±0.15 m past it, en route to his −0.55 m slot), never releasing from the chalk.

## F. THROW-IN RESULTS (BALL_OUT → release interval, per the new metric)

Four hot ball-out classes (sprinting opponent, two pursuers, deflection arc, heavy touch over the top line): **outside-target commands 0, dead-ball pursuit commands 0, worst non-thrower excursion 0.00 m, time outside 0.00 s** in all four — the ease means pursuers now stop before the line entirely. Legality suite 13/13 (all four line/team combinations; thrower out 0.20–0.76 m; measurement race at the release tick found and fixed in the suite itself). Full 23-minute match run: worst non-thrower excursion **0.00 m** (rejected build, same seed: 0.95 m).

## G. KICKOFF RESULTS

Opening home, opening away, home-after-conceding, away-after-conceding (both directions; the two rosters' formations): **kicking-team players inside circle = exactly 2 (kicker + support) in every case; defending team inside = 0; half violations = 0.** Formation-derived shape preserved (slots remain anchor-derived; only the circle projection moved the central striker to its edge).

## H. PATH-LENGTH RESULTS

Post-goal return path/straight: **p50 1.03/1.04, p90 1.24** (baseline 1.01/1.10) — the p90 increase is the READY gate honestly waiting for circle-transiting players; max single-tick step 0.09 m (no teleports); READY twitch flips 0; hold-at-slot preserved.

## I. REGRESSION RESULTS

restart-state 13/13 · gate-2 assertions 8/8 · micro-gates 9/9 · reception 8/8 · restart/claim 8/8 · pursuit 13/13 + sweep · cadence green · determinism same-seed/chunk/divergence ✓ · battery: shots 12.7/14.5, completion 0.76, spells 6.4 s, violations 0 (structurally unchanged; goals/match remains explicitly NOT a target per the match-duration note; fouls-low and away>home-shots observations carried). Suite-gate adjustments disclosed: release-tick measurement order, resume window 3→5 s with ball-travel counted.

## Deferred (recorded, untouched)

Progressive carry/dribbling (cal11 CARRY p50 ≈ 1 m) and residual reception classification (~10–20 % suspicious control to be typed routine/moderate/difficult × clean/cushioned/heavy/failed/bounce-chase) — both remain the next authorized workstreams.

## J. VIEWER (:8303)

`viewer_restart2_before.html` vs `viewer_restart2_after.html`, matched seed 789335328: BALL_OUT_EXACT_TICK, OPPONENT_PURSUIT_ABORT, THROW_IN_SETUP/READY/RELEASE/TO_OPEN_PLAY, KICKOFF_RETURN_START/MID, **KICKOFF_TWO_IN_CIRCLE**, KICKOFF_READY/EXECUTION/TO_OPEN_PLAY, FULL_THROWIN_SEQUENCE and FULL_GOAL_TO_KICKOFF_SEQUENCE. WORST_NON_THROWER_EXCURSION exists **only in the before arm** (0.95 m) — the after arm's excursion class is empty across the full run.

## K. HASHES

Candidate: body `0ae458885ae6056e` (unchanged) · lab `b2a5c8c265a384f6` · hybrid `27ebfa4a0da4f0ca` (unchanged). Snapshots: `lab_restart1_baseline.py` (`be521c8a…`), `*_possmove_baseline.py`. Production: engine `429ec3eb301495a9`, DB `b2092e4415533069` — verified identical; RC8 live.

## L. PRODUCTION STATUS

PRODUCTION UNTOUCHED — AWAITING VISUAL APPROVAL
