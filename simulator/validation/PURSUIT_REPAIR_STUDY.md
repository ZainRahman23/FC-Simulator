# LONG/LOOSE-BALL PURSUIT FORENSIC & CANDIDATE REPAIR

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the decision gate. **Production untouched** (all four integrated fc_simulator files hash-identical to the integration gate: engine `429ec3eb…`, world `c4c7a761…`, continuous `6d889b50…`, worldflags `26e515c9…`; save DB unchanged; RC8 live). All repairs live **only in the isolated candidate** (`integration/`: body `05671a1d…`, lab `0005be4c…`, hybrid `404a50ea…`). No scoring/xG/finishing, fatigue-curve, global-speed, tactic-label or long-pass-frequency changes anywhere.

---

## Phase 0 — reproduction & instrumentation (provably passive)

Deterministic replay of production battery seed 789335328 with pure spies; **passivity proven**: final trace hash identical to the recorded production hash (`db6dd6d1346417b8`). 72,252 aerial/fast chase samples, 549 long kicks, 53 clear-first-arrival loose intervals captured; ground truth = forward integration of the authoritative ball physics (gravity, restitution 0.55, bounce horizontal retention 0.80, air/roll friction). Six worst failure episodes plotted (ball vs pursuit-target vs player paths): `pursuit_cases.html` on :8303 — target errors 89–100 m, red target tracks leaving the pitch rectangle exactly as you observed.

## Hypothesis verdicts

| | verdict | measurement |
|---|---|---|
| H1 ballistic prediction wrong | **CONFIRMED (dominant)** | pursuit-target error vs true rest: p50 **11.8 m**, p75 36.2, p90 47.1, max 100. `predict_stop` ignored air drag and the 20%-per-bounce horizontal loss and pushed full speed through up to 6 s of hang |
| H2 stale prediction | REFUTED | recomputed every tick — freshly wrong, not stale |
| H3 rest-point objective | **CONFIRMED** | players pursued eventual rest, not earliest reachable interception |
| H4 ownership blocks claimant | **CONFIRMED (secondary)** | 53/53 clear-first-arrival loose balls: best-positioned player not chasing (HOLD 18 / TRACK 14 / unassigned 19); claimant chosen by straight-line distance, not arrival time |
| H5 boundary blindness | **CONFIRMED** | **37% of chase targets outside the pitch** (27,070/72,252); 10,330 chases of balls that exit before resting; 693 player-outside samples pressed on the ±2 m clamp |
| H6 long passes aimed out | REFUTED | 18/549 (3.3%) aimed outside ± margin — legitimate execution error; 30% reach touch, consistent with a ~40%-LONG direct game |
| H7 viewer artifact | REFUTED | all measurements in authoritative world coordinates |

**Root causes:** A = biased closed-form extrapolation + rest objective · B = distance/role claimant · C = no boundary participation · **D (long-pass selection) = healthy, untouched** (450 long kicks/match unchanged; DIRECT tactic ≈2× SHORT tactic home long kicks — 92–106 vs 50 per 30 min — legitimate tactical decomposition).

## Candidate repairs (isolated; smallest causal set; one mechanism at a time, gates after each)

1. **Authoritative trajectory prediction** — `predict_traj`: cached forward integration of the *exact* step_ball physics (drag, restitution, bounce retention), replacing the closed form.
2. **Earliest-feasible interception** — `intercept_point`: first future sample the player can reach in time at controllable height, **inside the field**; trajectory truncated at the pitch-exit sample (nobody chases imaginary continuations); rest point boundary-clamped as fallback.
3. **ETA claimant + HOLD waiver** — loose-ball claimant by earliest arrival on the authoritative trajectory; HOLD-shape defenders always claim trivially collectable balls (slow, near); **GK sweeps hostile balls dying in his zone when he is the earliest feasible claimant**.
4. **Anticipation asymmetry** — found necessary after matched-seed regression: repairs 1–3 alone gave every chaser perfect flight knowledge, over-strengthening defense (spell 3.37 s, fouls 31, goals 1.35). The called receiver reads at 0.15 s; an unanticipated chaser reads at `0.45 − 0.25·reactions01` — the same reaction principle already accepted for knock-freezes and the flight gate, Reactions-causal.
5. **Directional charge trigger** — measurement showed 10/12 fouls came from the charge channel firing on incidental proximity during honest interception races; a charge now requires momentum *into the man in possession* with the ball at his feet. Fouls 31→19/90 (band restored) via a truer physical definition, not a rate dial.

## After (matched-seed and 20-seed evidence)

| metric | before repair | after |
|---|---|---|
| pursuit-target error p50/p75/p90 | 11.8 / 36.2 / 47.1 m | **1.6 / 9.5 / 21.4 m** (residual reflects legitimate interception-vs-rest difference) |
| chase targets outside pitch | 37% | **0.19%** (49/25,814) |
| players materially beyond lines | 693 samples/90 | **~9 per 30 min** |
| unclaimed clear-arrival loose balls | 53/53 | 12 (−77%, crude heuristic) |
| 13 deterministic scenarios | — | **13/13 PASS** (incl. out-before-reachable: pursuit stops at the line; deflection retarget 20 m; GK sweep; cut-before-touchline) |
| pace sweep race wins (6.6/7.6/8.6) | — | 0 / 4 / 4 monotone |

Scenario-harness note: two early scenario FAILs were again diorama geometry (runner standing on the through-ball lane; a striker genuinely closer than the keeper) — the world was right; geometries corrected and recorded.

**Regression gates:** micro-gates A–J pass after every change; duels/shooting/GK/passing monotone (tackling gradient strengthened 0.24→0.72); cadence micro-suite passes; determinism (same-seed, per-battery) holds; long-pass frequency untouched.

## The open trade-off (reported, deliberately NOT dialed away)

Correct pursuit legitimately strengthens defense. Final 20-seed battery: fouls 19 ✓, flips 10.6 ✓, beats 26.6 ✓, violations 0 ✓ — but **goals 1.35/match (15–12), record W7 D8 L5, median spell 3.44 s, box entries 26** vs the previously-accepted 3.15 goals / W9 D5 L6 / 4.9 s / 38. Interceptions that used to fail by 30 m now succeed; the game is tighter and lower-scoring than both the accepted candidate and real football (~2.8 goals). One further principled dial exists — the unanticipated-chaser perception delay (currently 0.20–0.45 s by Reactions; real unanticipated flight reads are plausibly longer) — but pushing it specifically until goals look right is the tuning your mandate forbids, so it stops here as a **named, authorization-gated follow-up** alongside the pre-existing R1 shooting calibration (the two interact and should be studied together: defense is now stronger while finishing still over-performs xG — the NET goals dropped).

## Visual evidence

- `pursuit_cases.html` — six worst BEFORE failures, ball vs phantom target vs player path.
- `viewer_pursuit_before.html` / `viewer_pursuit_after.html` — matched-seed (789335328) long-ball sequences, 14 bookmarks each, same kick classes: watch the overshoot-and-return and out-of-pitch chases vanish.
- All on **:8303**.

## Gate

- A (trajectory/intercept): **FIXED & verified**. B (claimant/ownership): **FIXED & verified** (incl. GK sweep). C (boundary): **FIXED & verified**. D (long-pass selection): **healthy — no change made or needed**.
- **The candidate is READY FOR YOUR VISUAL INSPECTION**, with one honestly-open item: the post-repair scoring/tempo balance (goals 1.35, spells 3.4 s) sits below the previously-accepted distributions, and resolving it belongs to an authorized calibration study (perception-delay + R1 finishing/GK coverage, jointly), not to this forensic.

**STOP.** Nothing merged to production; rollback unchanged (`pre-integration-hybridc-cal12-20260826.tar.gz` + candidate baselines `*_cal12_baseline.py`).
