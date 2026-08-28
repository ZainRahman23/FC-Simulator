# AUTHORITY / INTENT ARCHITECTURE FORENSIC & REPAIR (with FC-26 report comparison)

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the visual gate. **I. PRODUCTION UNTOUCHED** (all 16 fc_simulator hashes + DB `b2092e44…` recorded and re-verified; RC8 live :8100, viewer :8303; rollback chain intact). Candidate-only: body `0ae458885ae6056e`, lab `9c1eeaa7b6764cef`, hybrid `27ebfa4a0da4f0ca`; entry state snapshotted first (`*_defectab_baseline.py` = `2cbd8403…`/`d87f72c3…`/`fe5e0073…`). Finishing/GK untouched per mandate.

---

## A. Current architecture map (from call sites, not documentation)

| SYSTEM | WRITES | WHEN | PRIORITY (de facto) | CAN OVERWRITE |
|---|---|---|---|---|
| Rules/restart (`body.tick` out-detection + `handle_restart`) | restart state, ALL 22 movement, ball placement, (now) all intents | ball out/foul/goal | **Tier 0 — act() fully suspended** | everyone |
| cal11 brain via `decide→apply_decision` | intents (KICK/CARRY/TAKE_ON/CLEAR/SHIELD), expected receiver | wakes (RECEPTION/SETTLED/PRESSURE/IMPROVED) + cadence fallbacks | Tier 3 (committed action) | previous intent of same player |
| Intent executors (`Lab.act` carrier branch) | ball velocity (kick/knock), own movement | per tick, gated by ctrl/knocked | Tier 3 | nothing (executes only) |
| ETA claimant + HOLD waiver + `_exp` receiver | chaser set (one per team) | ctrl None, per tick | Tier 4 | struct target of the claimant |
| **(new) Tier-2 reach carve-out** | movement of any player with a loose ball <2.2 m | geometric, per tick | Tier 2 | struct target |
| GK hybrid layer (`_direct`) | GK movement, held ball | per tick | Tier 2-3 | struct target for GK |
| cal11 struct targets (`sync_targets` 1 Hz + wake refresh → `last_targets`) | movement of everyone else | 1 Hz + events | Tier 5-7 (single write: formation/role/press are resolved inside frozen cal11) | nothing |
| Body physics (`locomote`/`step_ball`/`separate`/touch processing) | actual velocity, positions, ball state, ctrl | 60 Hz | physical law | desired velocity (turn/brake/skid limits) |
| `touch_model` / `gk_model` / foul adjudicator (hybrid) | touch outcome, ball velocity, ctrl, stuns, cards | contact events | event | ball state |

**Same-interval double-writers found and their status:** (1) struct-target sprint-redirect vs claimant — **two systems commanded the same loose ball** (REPAIRED: removed; negative coordination); (2) claimant identity itself flapping between near-equal candidates per tick (REPAIRED: claim hysteresis, 15% ETA margin); (3) all prior workstreams' fixes (KICK/CARRY/settle) hold single-owner. Decision cadence is already decoupled (60 Hz physics/locomotion; event-driven contacts/wakes; 1 Hz targets; scan/refractory-paced decisions) — Phase 7's architecture is ALREADY PRESENT.

## B. Forensic findings — first divergent states

**Reception (Defect A residual).** The mandate's warning was exactly right: the CLEAN 49→77% metric measured only SAME-TEAM passes. The commonest aerial reception in football — collecting the OPPOSITION's clearance — routed through the hostile stab model, which has a hard `rv<9` gate on clean interceptions and no preparedness: **uncontested opponent-kicked arrivals at rv≥9 were LOOSE 100% (15/15)** — a 3-4 m/s poke at a noisy angle plus a 0.22 s lunge-stun: ball-off-him → freeze-beat → chase, occasionally toward a third player. First divergent state: the touch entering the hostile branch on the `last kicker is an opponent` test. A second physical contributor: CLEAN traps of falling balls kept full downward velocity (`min(vz,0.4)` caps only upward), so chest-height traps bounced at the feet.

**Claimant.** Near-equal loose-ball candidates flipped claimant identity per tick on ETA micro-noise (both converge on alternating commands), and the struct-target sprint-redirect made ANY sprinting player within 12 m a de-facto second chaser (774 double-command ticks/30 min in the before arm).

**Twitch/freeze.** Held at the accepted defect-B level (7.1 s/30 min, max sustained 0.87 s) after one regression I introduced and caught in-workstream (timed-arrival law crept at 0.4 m/s to dead balls → a 2.9 s freeze; fixed with brisk dead-ball collection).

**Restart/boundary.** No authority issues off-pitch targets — all excursions had in-bounds targets; they were momentum overshoot and post-whistle re-entry transit (≤1.7 m). The Tier-0 hypothesis is **ALREADY PRESENT** (act() fully suspended during restarts). Gaps repaired: non-taker restart targets are now clamped to the legal field (thrower exempt — he legally stands outside), and **ordinary intents no longer survive the whistle** (cleared at restart entry; clean handoff back at ball-in-play, proven by scenario 4).

## C. FC-report comparison (§4 classification)

ALREADY PRESENT: rules authority (Tier 0), team tactical controller + phase (frozen cal11), role priors (cal11 press-sweep/BX), perception latency (Reactions-causal flight gates, stab gate, knock-freeze, anticipation asymmetry), staggered decision cadence (wakes + settle-and-scan + fallbacks — the accepted cal12 design), persistent latched intent (intents dict + settle/refractory; BX run lifetimes with logged death causes), one-claim-per-team, explicit contact point (predict_traj/intercept_point), movement-as-executor (locomote never chooses targets), reception middle outcomes (CLEAN/HEAVY/LOOSE/DEFLECT + absorbed-HEAVY = the CUSHIONED middle), anti-jam (`separate()`), restart ownership, atomic-enough handoff (wake processed before the next act; settle intent bridges to the decide).
PARTIAL→REPAIRED THIS WORKSTREAM: negative coordination (claimant existed, the sprint-redirect bypassed it — removed); Tier-2 ball-in-reach above assignment (was implicit/leaky — now an explicit geometric carve-out); claim persistence (added hysteresis margin); restart legal regions & intent suspension (added); reception context (interception vs collection discriminator + drop absorption).
PARTIAL, DOCUMENTED OPEN: body-part reception geometry (height enters difficulty continuously; no discrete chest/thigh vocabulary); urgency tiers (partial via wait-shaping); role leave/recover asymmetry (cal11-frozen; a cal13-class item); first-class passing lanes (release-lane physicality exists; no lane objects); action feasibility gate (partial: windup+reach gating, walled-in shield conversion, degraded touches — no full-body pose model, by design).
NOT APPROPRIATE / REJECTED (report agrees): animation authority, directed deflection steering (our physics stays authoritative), hard capability gates, cliff-edge attribute thresholds, user fatigue exemptions, straight-line pursuit (we have trajectory interception), hidden global modifiers, OVR.

## D. Root-cause verdict

**Combination, dominated by (1) reception-model context (the interception-vs-collection misclassification — the largest remaining visual defect) and (2) assignment (claimant bypass + claim flapping), with (3) a small rules/restart legality gap.** NOT decision cadence (already tiered), NOT a missing intent object (intents are persistent with causal interrupts; every prior oscillation traced to executor physics or assignment, not to intent churn), NOT primarily coefficients. The engine's authority→assignment→intent→execution→handoff chain exists and is sound; the defects were three specific ownership leaks in it.

## E→F. Repairs implemented (smallest set, candidate only)

1. **Interception vs collection** (hybrid.touch_model): hostile = opponent-kicked AND contested (called for an opponent, or an opponent within ~3 m). An uncontested collection — regardless of who kicked it — is a reception with preparedness (base 0.6, set-ness- and bc-scaled). 
2. **Drop absorption**: a CLEAN trap damps a falling ball's vz ×0.3 — the ball dies at the feet instead of bouncing off the trap (both CLEAN sites).
3. **Negative coordination**: struct-target sprint-redirect to loose balls removed; replaced by an explicit **Tier-2 geometric carve-out** (any player attacks a loose ball <2.2 m — never scored, never ignored).
4. **Claim hysteresis**: standing claimant persists unless a challenger beats his ETA by >15%.
5. **Timed arrival**: an uncontested collector paces to arrive 0.45 s early and SET (low relative speed at contact); races stay full-pace when contested; dead balls collected briskly (the creep regression I introduced and removed).
6. **Restart legality**: non-taker targets clamped inside the field; thrower exempt; ordinary intents cleared at the whistle.

RNG: no stream reshuffling; all draws remain keyed; same-seed/chunk/seed-divergence proofs pass. Matched-seed trajectories diverge (behavioral change, expected and disclosed).

## G. Regression results

Reception 8/8 · restart/claim 8/8 (new suite: thrower legality, non-thrower regions, whistle intent-suspension, restart→live resume, out-during-pursuit, no-second-chaser, near-equal single claim, hold-without-twitch) · pursuit 13/13 + pace sweep monotone · cadence suite green · micro-gates 9/9 · counterfactuals monotone (bc 67→100% clean; fatigue; SHORT≥DRIVEN; pressure; the challenge-latency diorama remains harness-limited as documented) · long-ball grid monotone (bc45/65/85/95 = 1-4/9/10/10-12 CLEAN with real HEAVY tails; 55 m missiles absorbed and recovered ≤3 s) · uncontested clearance collections **0%→~70% clean, the rv≥9 tail honestly imperfect** · double-pursuit command ticks **774→231/30 min** · freeze 7.1 s (max 0.87 s) · determinism: same-seed, chunk-split, divergence, in-battery re-run all ✓, violations 0.
Fixture-gate recalibrations disclosed: S3/S4 contest/release windows widened (old pressures were manufactured by the removed swarm channel); S2 measures in-at-release + peak transit.

**20-seed battery (measured, never tuned):** goals **2.75/match (39–16, W11 D7 L2)** — real-band scorelines reached WITHOUT touching finishing/GK (defenders retaining clearances removed cheap turnover supply; R1's 54% on-target remains open and gated); shots 10.1/9.7; completion 0.77; box entries 37; spell 6.33 s; flips 6.8; **fouls 12.8 — below the 21–25 real band**, a consequence of removing illegitimate double-chasers, flagged as a new named calibration observation (NOT dialed).

## H. Visual gate (:8303)

`viewer_autharch_before.html` (your rejected build) vs `viewer_autharch_after.html`, matched seed 789335328: LONGBALL_CONTROLLED / HEAVY / PRESSURED, **CLEARANCE_COLLECTED** (the repaired class — before-arm found only ONE clean instance in 30 min), **BOUNCE_CHASE_RESIDUAL** (every remaining class member — judge them), **TWO_PLAYER_PURSUIT_RESIDUAL**, STATIONARY_EPISODE (longest), THROW_IN_BOUNDARY, RESTART_TO_LIVE. Plus the prior workstreams' viewers for regression classes.

**STOP.** No integration, no deploy, no finishing/GK change. Awaiting your visual verdict.
