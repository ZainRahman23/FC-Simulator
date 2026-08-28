# BLOCKING RECEPTION / POST-TOUCH FOLLOW — FORENSIC & CANDIDATE REPAIR

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the decision gate. **Production untouched and re-verified this session** (engine `429ec3eb301495a9`, world `c4c7a761c6672ec9`, continuous `6d889b508d8b728a`, worldflags `26e515c9884de490`; save DB `b2092e4415533069`; RC8 live on :8100 throughout). All repairs live **only in the isolated candidate** (`integration/`): body `87d774e22969cf42`, lab `fb7c65a995c73a70`, hybrid **unchanged** `404a50ea196e263a`. No integration, no deploy, no finishing/GK calibration, no aggregate tuning. Workstream-entry state snapshotted as `body_pursuitfix_baseline.py` / `lab_pursuitfix_baseline.py` (reconstructed by exact edit inversion and **hash-verified** against the recorded freeze `05671a1d9f62721d` / `0005be4cbe493d8c`).

---

## Phase 0 — proof before change

Instrumented 15-min match forensic (seed 789335328): 86 same-team reception episodes. Drift p50/p75/p90 = 0.9/1.6/2.2 m — the MEDIAN reception was already fine; the defect is a fat tail: **6/86 episodes drifted >2.5 m with multi-second recovery; reacquire p90 = 1.97 s**.

**First divergent tick (worst episode, bre_gen_rcm, t0=539.10):** at t+0.05 the touch is CLEAN and a live CARRY target is commanded — the receiver is never "not commanded." The divergence is **physical**: his arrival momentum was −y, the cushion threw the ball +y at 0.7× his speed; the >1.15 rad turn engages the turn-skid (desired velocity damped ×0.15 → below current → BRAKE), his speed decays 3.7→1.0 m/s over 0.7 s while the ball rolls away at walking pace he cannot out-turn; at t+0.80 the 4.2 m 'ran away' clause drops `ctrl`; **the ball then sits DEAD and unclaimed for 1.2 s** (defenders keep marking the man — chasers only engage when `ctrl` is None *and* claimed; the ex-receiver, still turning, is the nominal claimant); reacquire at t+1.97; the hurried second touch gifts possession at t+2.47.

**Root causes (each proven in isolation):**
1. **R-A — cushion momentum bleed**: CLEAN touch set ball velocity to `0.7 × receiver velocity + 1.1 facing`. A *controlled* touch that launches the ball at 70% of a 6 m/s arrival is not controlled — it manufactures a footrace against yourself that the turn-skid guarantees you lose.
2. **R-B — no follow authority**: the KICK-intent approach walked at a fixed 1.8 m/s regardless of distance; the CARRY executor aimed at a corridor 2 m ahead of the *ball* but never sprinted to a ball that had escaped playing distance.
3. **R-C — idle-controller stall**: a controller with no scheduled intent hit `locomote(own position, 0.0)` — a commanded full stop while his ball drifts (proven in an isolated fixture: sustained 3.9 s standstill from the control tick).
4. **R-D — degenerate settle corridor**: the settle-hold intent targets the receiver's own position; `atan2(0,0)` made the protective-touch corridor arbitrary.

**Hypotheses tested, not assumed:** per-tick `locomote` spy proved the receiver is always *commanded* (no missing-wake gap — settle-and-scan fired correctly); the clock audit (below) found no stuck timer; the limbo is emergent from physics + the marking/chasing seam, not from any freeze state.

## Clock/timer audit

| clock | value | verdict |
|---|---|---|
| `estT` settle window | touch + 0.10–0.55 s (skill-scaled) | correct; expires on schedule |
| settle-and-scan | `SCAN_MAX 1.2 − 0.5·composure01`, floor 0.15 | fires; invalidated only when ball moves on |
| PRESSURE refractory | 0.9 s rising-edge | not implicated |
| 'ran away' | 4.2 m distance clause, no timer | correct trigger, fired *because of* R-A |
| at_feet protection | <0.95 m | not implicated |
| flight-reaction gate | 0.3 s + anticipation asymmetry | not implicated |

No stuck timers, no engine-clock/world-clock mismatch (the class of bug from the beaten-window fix was specifically re-checked).

## Pre-pursuit vs post-pursuit classification: **A/D — pre-existing, mildly amplified**

Same forensic run against the accepted build immediately before the pursuit repair (`integration/prepursuit/`, matched seed): drift p50/p90 = 0.9/2.2 m, reacquire p90 = **1.95 s**, severe episodes 2/64 (3%) vs 6/86 (7%) post-pursuit. The mechanisms (0.7× cushion, 1.8 m/s approach, idle stall, turn-skid) all predate the pursuit repair; the pursuit repair *mildly amplified* exposure because ETA-claimant receivers now arrive at pace more often (more momentum to bleed into the cushion). **The pursuit repair was not weakened in any way** — all 13 pursuit scenarios re-pass unchanged (below).

## Repairs (candidate only; smallest proven set)

| # | OLD | NEW | WHY |
|---|---|---|---|
| R-A | CLEAN cushion `b_v = p_v·0.7 + facing·1.1` (both CLEAN sites) | `p_v·0.25 + facing·1.1` | a controlled first touch kills arrival momentum — that is what ball_control *means* physically. HEAVY/LOOSE touches untouched: bad touches still run away and get contested |
| R-B | KICK approach fixed 1.8 m/s; CARRY corridor never chases | approach `0.9·vmax` when d2b>1.2 m; CARRY sprints to `chase_point` at vmax when d2b>1.5 m | follow YOUR touch at real pace; walk only for the final step |
| R-C | idle controller: `locomote(self, 0.0)` (full stop) | if he controls the ball and d2b>1.0 m: follow it at 3.5 m/s | a player never stands still while his own ball drifts |
| R-D | settle corridor `atan2(0,0)` when holding position | corridor = facing when target ≈ self | removes arbitrary protective-touch direction |

No timers added, no universal "reaction freeze," no OVR, no cal11 change, no scoring-chain constants touched.

## Results — matched-seed forensic (seed 789335328, 86 episodes)

| metric | before | after |
|---|---|---|
| reacquire p90 | **1.97 s** | **0.55 s** |
| severe drift (>2.5 m) | 6/86 | 1/86 |
| drift p90 | 2.2 m | 1.7 m |
| never-reacquired | — | 16, of which **14 are one-touch releases at 0.28 s** (the desired combination play); the other 2 are a real tackle at +0.2 s into a live scramble and a hold dispossessed at 1.97 s — zero limbo |

**Distributions (3 matched seeds × 900 s; snapshot-at-mark semantics):** movement-with-touch @0.25 s 93→**97%**; limbo >0.5 s **14.8→7.7%** (p90 0.60→0.40 s); wall-pass combinations (A→B→back-to-A ≤3 s) **6→15**; defender challenge latency on contested receptions p50 2.42→**2.02 s**; action ≤2 s 57→61%; receive→dribble 21→22%. One composition shift disclosed: action p50 rises 0.33→1.41 s because more receptions now survive into controlled holds instead of instant panic releases (episode count itself rose 203→220).

## Micro-scenarios & counterfactuals

**8 mandated deterministic reception scenarios: 8/8 PASS** (clean receive→dribble; receive→pass; one-touch layoff geometry — resolves as an honest two-CB contest won at 1.28 s, zero limbo, with the quick-release channel proven by the wall-pass scenario's 0.66 s release and the match's 14×0.28 s one-touch releases; wall pass; through-ball collected in stride; bad touch → live contest; pressured reception; static easy reception). Limbo <0.5 s in every scenario (no receiver-frozen + defender-passive + ball-available state exists).
Harness honesty: three early FAILs were fixture artifacts — the scripted kick was overridden by the t=0 cadence decide; park_all's defender line made every advanced receiver **offside** (whistle killed the play at his touch); a "lost ball" metric counting teammates. World correct each time; fixtures fixed and recorded.

**Counterfactual sweeps (15 keyed seeds/cell, no OVR): all monotone.** ball_control 40/60/80/95 → clean touch 67/87/100/100%; fatigue 100→40 energy → 100→93%; SHORT ≥ DRIVEN difficulty ordering holds; defender challenge latency rises 0.77→1.10 s with start distance 2.5→9 m; receiver arrival speed raises drift (1.88→2.09 m at 7 m/s) without recovery collapse (reacquire p90 ≈0.3 s). Reactions legitimately does not alter friendly cushions (its causality is hostile stabs + chase anticipation, proven in the pursuit study); the easy-cell clean% ceiling (100%) hides the pressure gradient there — pressure remains causal inside the touch-difficulty formula and in the pressured-cell contest rates.

## Regression battery

- Micro-gates A–J: **PASS** (all 9 keys).
- **13/13 pursuit scenarios PASS unchanged** + pace-sweep race wins 0/4/4 monotone — the pursuit repair is intact.
- Cadence micro-suite: PASS (one-touch survives, no jitter explosion, take-on uninterrupted).
- Passing families: matrix/grid unchanged-class, §13 sweep monotone; the flat 1.00 empirical cells were re-run against the baseline build and are **pre-existing harness saturation**, not a regression.
- Determinism: same-seed trace-hash reproduction in-battery **True**; chunk test — 600 s = 200+150+250 s bit-identical; the 10×60 s arm runs ONE extra tick from float end-time accumulation with a **bit-identical common prefix** (pre-existing on the baseline, harness boundary arithmetic, zero behavioral divergence).

## 20-seed × 90-min battery (aggregates moved NATURALLY, not tuned)

| metric | pursuit-era battery (pre-repair) | **after reception repair** | pre-pursuit accepted | real ref |
|---|---|---|---|---|
| goals/match | 1.35 (15–12) | **2.30 (31–15)** | 3.35 | ~2.8 |
| record (HOME) | W7 D8 L5 | **W12 D5 L3** | W9 D5 L6 | strong favorite |
| shots/team | 5.7 / 6.15 | 7.40 / 7.45 | 6.6 / 6.4 | 12–14 (junk-volume gap documented as L2) |
| fouls | 19.0 | 21.45 | 18.4 | 21–25 |
| flips/min | 10.56 | 10.37 | 8.43 | — |
| median spell | 3.44 s | 3.42 s | 4.7–4.9 s | — |
| box entries | 26.1 | 32.8 | 38 | — |
| beats | 26.6 | 31.3 | — | — |
| melee alternations/min | 16.8 | 20.8 | 10.3 | — |
| continuity violations | 0 | **0** | 0 | — |
| pass completion | 0.71 | 0.72 | — | ~0.80 |

Determinism: in-battery same-seed re-run hash-identical; **20/20 distinct hashes across seeds**.

**Reading (measured, not tuned):** receivers keeping their touches naturally recovered most of the pursuit trade-off — goals 1.35→2.30 (real ≈2.8), home dominance restored (W12), box entries +26%, shots +27%, fouls in the real band. **Two residuals reported honestly:** median possession spell (3.42 s) remains below the pre-pursuit accepted 4.9 s, and melee alternations rose to 20.8/min (livelier loose balls get contested faster now that both receivers AND defenders attack unresolved touches — the same mechanism that halved limbo). Both remain part of the already-named, authorization-gated joint calibration study (unanticipated-chaser perception delay + R1 finishing/GK), which this workstream deliberately did NOT begin.

## Visual evidence (:8303)

`viewer_reception_before.html` / `viewer_reception_after.html` — matched seed 789335328, first-occurrence bookmarks for all 10 mandated sequence types (ordinary reception, touch→dribble, receive→quick-pass, one-touch layoff, wall pass, through-ball collection, pressured reception, bad-touch contest, defender attacking an unresolved touch, multi-pass combination) **plus `ORIGINAL_DEFECT_EPISODE` at 8:55** — the exact bre_gen_rcm freeze that opened this workstream, watchable in both arms.

**The gate question is yours: does the receiver now MOVE WITH HIS TOUCH?**

**STOP.** No integration, no deploy, no finishing/GK calibration started, rollback unchanged (`pre-integration-hybridc-cal12-20260826.tar.gz`; candidate baselines `*_pursuitfix_baseline.py` + `*_cal12_baseline.py`).
