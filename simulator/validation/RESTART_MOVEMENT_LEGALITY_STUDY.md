# THROW-IN FINAL MOVEMENT-LEGALITY REPAIR — NON-THROWER BOUNDARY ENFORCEMENT

**Date:** 2026-08-27 · Candidate-only. Solved layers untouched by design and re-verified: BALL_OUT barrier, thrower selection/locking, dead-ball spot placement, kickoff two-in-circle, free-kick machinery. Final hashes (K): body `5f7a4c244a250921`, lab `535a01d00e42fdbf`, hybrid `27ebfa4a0da4f0ca` (unchanged). Production engine `429ec3eb…` + DB `b2092e44…` verified identical; RC8 live.

## A/B/C/D. The crossers in the rejected viewer, their vectors, subsystems, and why authority didn't stop them

Two RESTART-labelled outside episodes exist in the rejected served trace: **bre_gen_lb** (t≈197 throw-in: already −0.2 at whistle from a legitimate live save attempt, **deepening to −1.0 while braking**) and **dominikszoboszlai** (t≈1359 free kick, same class). Effective vector: **stale outward velocity at the whistle + braking-envelope limitation** — the outward-brake existed but its trigger zone was a fixed 1.6 m at v>0.5, while braking distance from 5.2 m/s is 2.1 m (subsystem: the restart mover's brake trigger, not authority — authority flipped correctly in one tick). A third, slower mechanism was found by the per-tick legality audit once installed: `separate()` physically shoving a line-standing RESTART player 0.25 m across (subsystem: Tier-1 anti-overlap physics — no movement command involved, which is exactly why command-level checks could never see it).

## E. Repairs (smallest, downstream only)

1. **Velocity-aware brake envelope** (lab, restart mover): a non-thrower brakes the moment his braking distance (v²/2B) no longer fits inside the pitch — fast approaches engage early, walkers late; engage threshold 0.2 m/s. Newly-crossing from inside is now physically prevented wherever prevention is possible.
2. **Boundary-tangential dead-ball separation** (body, `separate()`): during any restart, an anti-overlap shove never pushes an INSIDE player over a line — bodies still separate, along it; a legally-outside player (the thrower) is untouched. Scoped strictly to dead-ball states — open-play separation physics unchanged.
3. **Per-tick legality audit** (mandated): during THROW_IN, any non-thrower transitioning inside→outside is logged with time and classified against the physical-committment bound (v²/2B vs room left); `illegal_restart_step_count` and `prevented_boundary_crossing_count` recorded. **Final run: illegal = 0.**
4. Already-outside players: unchanged urgent perpendicular re-entry (nearest-line crossing point, no parallel running, no teleports).

## F. Exact before/after trace (the human's sequence)

Full exact-viewer-trajectory census (same seed, same forced events): **newly-crossed non-throwers: NONE · extra-outward for already-outside players: NONE (monotonic re-entry) · illegal steps: 0 · prevented-crossing interventions: 60.** The lb deepening (−0.2→−1.0) and the FK deepening are both eliminated; players at the line at the whistle now brake-and-turn inside.

## G. Boundary stress results (8 engineered worst cases)

Two perpendicular sprinters · three-man chase · teammate+opponent at max speed · avoidance directly at the line · already 0.1 m out · already 1 m out · deflection out · heavy touch out: **preventable crossings 0 in all eight; extra-outward 0.00 m in all eight** (already-out players never deepen). The one physics-honest class is quantified, not hidden: players whose braking distance already exceeded their room at the whistle (S4: two sprinters 0.1–0.7 m from the line at ~6 m/s) cross by the committed amount — the mandate's "physically unavoidable" category, measured per case.

## H/I. Regression

Kickoff/free-kick intact (gate-2 8/8, exactly two in circle; restart-state 13/13 incl. K-suite) · one-thrower hard cases 7/7 · boundary stress 8/8 · reception 8/8 · restart/claim 8/8 · pursuit 13/13 · cadence green · micro-gates 9/9 · determinism same-seed/chunk/divergence ✓.

## J. Viewer (:8303)

`viewer_restartlegal_before.html` (the exact rejected trajectory) vs `viewer_restartlegal_after.html`, matched seed and forced events. Bookmarks: RESTART_PLAYER_CROSSES_BEFORE/AFTER (the lb episode at 3:14), FK_RESTART_OUTSIDE_BEFORE/AFTER (22:36), BALL_OUT_EXACT, THROWER_SELECTED, THROW_IN_READY, THROW_RELEASE, THROW_TO_OPEN_PLAY, FULL_MULTI_CHASE_THROWIN_SEQUENCE, KICKOFF_TWO_IN_CIRCLE, ORIGINAL_VISUAL_FAILURE_AFTER. Debug: authority badges (gold THROWER / blue RESTART / grey OPEN) plus, under the **info** toggle, per-player **velocity arrow (cyan), command-target line (orange), and proposed next-step marker (red)** during restarts — a blue player's responsible vector is visible on sight.

PRODUCTION UNTOUCHED — AWAITING VISUAL APPROVAL
