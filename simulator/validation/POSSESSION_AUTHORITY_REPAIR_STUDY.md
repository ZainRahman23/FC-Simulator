# POSSESSION-AUTHORITY / BALL-CONTROL / CADENCE FORENSIC & REPAIR

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the visual gate. Production untouched and re-verified (engine `429ec3eb…`, world `c4c7a761…`, continuous `6d889b50…`, worldflags `26e515c9…`, DB `b2092e44…`; RC8 live on :8100). Candidate-only work in `integration/`: body `dc7d494e38df1e73`, lab `79350375ceb26268`, hybrid unchanged `404a50ea196e263a`. Rejected-candidate state snapshotted by exact edit inversion, **hash-verified** (`body_rejected_baseline.py` = `87d774e2…`, `lab_rejected_baseline.py` = `fb7c65a9…`). No integration, no finishing/GK work, no aggregate tuning.

---

## Phase 0 — full-tick instrumentation (900 s, seed 789335328)

Every movement command attributed to its issuing authority via call-site spy; ball/controller/claimant/intent/pending-decision state per tick; online detectors with 7 s ring dumps. Rejected-build measurements:

- **662 controller transitions / 15 min, 314 of them <0.5 s apart; 59 chatter episodes** (≥5 changes in 3 s)
- **54 fake micro-passes** — a KICK re-controlled by the kicker after 0.1–0.7 m of ball travel; **10 machine-gun refire loops** (same player kicking 2–4× within ~2.5 s, e.g. three kicks in 0.6 s at t=603.5)
- **Magnetic oscillation confirmed in raw ticks** (t=327–330): carrier holds ctrl throughout while `carry_touch` bats the ball ±3 m/s alternately and the player reverses radially 5× in 2 s
- **H6 refuted at the command level**: all 22 players receive a locomote command every tick; off-ball zero-speed-command share 5.2% inside episodes vs 6.1% baseline; target sync max gap 1.02 s. The "frozen" impression is the local pinball dominating the eye while formation players legitimately stand at their arrived targets.

## First divergent state transitions (healthy vs failing, per case)

1. **Micropass/chatter**: the healthy and failing receptions are identical through control, wake, decide, and windup. The first divergent transition is the **KICK contact released at full family speed (14–18 m/s) with a body inside the launch corridor or stab reach** — 17.8% of ALL kicks (47/264) released into an occupied lane within 1.3 m; the ball deflects within 1–2 ticks (rv≥15 physics cap or point-blank stab), rebounds inside the kicker's REACH, is re-controlled 2 ticks later, fires a fresh RECEPTION wake + POSSESSION "change", and the immediate one-touch decide refires the same blocked lane.
2. **Magnetic**: the first divergent transition is the first `carry_touch` taken while the carrier is inside his braking distance of the CARRY intent target — the corridor `atan2` flips 180° each crossing, and the touch's **2.0 m/s minimum knock** bats a ball he wanted to HOLD.

## Hypothesis verdicts

| | verdict | evidence |
|---|---|---|
| H1 ownership oscillation | **CONFIRMED — but kick-rebound-fueled, not radius chatter** | 59 chatter eps, all adjacent to blocked kicks; acquire/release radii (0.9 m / 4.2 m) have real hysteresis and were never the boundary |
| H2 conflicting movement authorities | REFUTED for the observed defects | magnetic episodes run under a SINGLE authority (CARRY executor); authority histogram stable; struct-target vs follow conflicts not observed at divergence |
| H3 controlled touches create free balls | REFUTED | ctrl is retained through every magnetic episode; only kicks, knocks, contested pokes and 4.2 m escape clear it (all causally legitimate) |
| H4 short-pass misclassification | **CONFIRMED (as fake micro-passes)** | 54 kicks re-controlled by the kicker <4 m; all 54 pass through a body contact — the release itself was the misclassified event (a physically impossible pass executed anyway) |
| H5 hysteresis failure | **CONFIRMED — inside the CARRY executor**, not at the control radius | corridor/hold boundaries measured; my own first repair attempt added a 1.2 m identical-threshold pair and was caught by the same instrumentation (magnetic cases clustered at d2b 1.17–1.20) and replaced |
| H6 cadence freeze | **REFUTED** | 22-player command continuity proven every tick (counts above) |
| H7 defensive authority | PARTIALLY CONFIRMED | defenders DID wait/miss during rebound pinball (ball technically re-controlled each beat); after repair, rebounds carry a real contest window; residual "two players at one ball" is cal11-authored pressing/support (4-man gegenpress swarm at t=226 with frozen-brain targets) — real football |

## Repairs (candidate only; smallest causal set; each proven then re-measured)

| # | mechanism | OLD | NEW | WHY |
|---|---|---|---|---|
| A1 | pass-release lane physicality (lab KICK executor) | release at full FAM speed regardless of bodies on the boot laces | a body physically in the 1.0 m launch corridor (±0.35 m) ⇒ the release is **angled around him** (smallest of ±0.25/±0.45 rad, blocker-away side first, deterministic); if every rotation is walled ⇒ protective shield (CARRY hold) and the live wake machinery re-decides. **Shots exempt** — blocked shots are a real measured channel | no real player smashes an 18 m/s pass through legs 0.4 m away |
| A2 | stab-reaction gate (body touch processing) | any player within 0.9 m REACH gets a same-tick touch roll on a just-kicked ball | until a player's reaction window (0.10 + 0.24·(1−reactions01) s — the SAME Reactions-causal asymmetry as chasers/knock-freezes, and the same "only a body-block counts" structure as the existing stun rule) has passed since the kick, a fast ball (>7 m/s) can only be body-blocked (<0.35 m); the called receiver is exempt | a deliberate stab needs reaction time; a 14 m/s ball crosses the stab arc in ~0.13 s |
| A3 | CARRY continuous shepherd law (lab CARRY executor) | position-threshold branches (corridor at 0.875·vmax through ball+2 m / follow / gather) — every threshold pair spawned a limit cycle | **one continuous law**: commanded speed = ball radial velocity + 4·(separation − 0.55 m), capped by a cruise that tapers with arrival at the intent target; touch strength tapers the same way (settle-strength 0.45 near target). Commanded speed → 0 as the ball settles at his feet — **no boundaries, no orbit** | magnetic oscillation is a limit cycle; the fix is a continuous controller, not another threshold |
| A4 | rebound receptions go through settle-and-scan (lab RECEPTION wake) | re-controlling your own blocked kick ⇒ immediate one-touch re-decide ⇒ machine-gun refire | a reception of your OWN kick within 1.2 s routes through the EXISTING settle-and-scan channel (existing composure-scaled scan times; causal condition, **not a cooldown**) | a deliberate pass and an unanticipated rebound are causally distinct — the mandated invariant |
| A5 | in-stride settle (lab RECEPTION wake) | settle-hold pinned a running receiver to the wake-tick spot (emergency stop) | hold spot extends 0.55 s along his velocity — a runner settles in stride; stationary receivers unchanged | the invariant: the controller follows his touch naturally |

Two intermediate repair attempts were **installed, measured, caught by the same forensic, and replaced** (a 1.2 m arrival threshold that created new boundary chatter; a 1.0 m radial release blocker that ate 27% of real completed passes). Both are recorded here deliberately: the instrumentation, not intuition, chose the final set.

## Required invariant — verified

- Controlled reception ⇒ continuous authority: **auth@1.0 s 74% → 94%**, auth@5 s 80→88% (3 matched seeds, 216 episodes); reception drift p90 **1.0 m** (was 2.2), reacquire p90 **0.32 s**, severe episodes **0/88**; carry touches never globally free the ball (H3 above).
- A deliberate pass transfers/releases exactly once: fake micro-passes 54 → **13, all isolated genuine blocked passes**; machine-gun refire loops 10 → **0**; real completed passes to a teammate **146 vs 145 baseline** (volume preserved to within one pass; the 264→230 raw-kick delta is the fake volume).
- Bad/heavy touches remain contestable (scenario 6 + match HEAVY contests; challenge distributions below).
- 22-player continuity: command-every-tick proven in both builds; episode vs baseline zero-command share 5.2% vs 6.1%.

## Verification battery

- 8/8 reception micro-scenarios (S5's old gate encoded the overshoot artifact — re-gated on the invariant: collect ≥2.5 m/s, hold-or-release, act ≤2.2 s, zero limbo; fixture honesty recorded). Micro-gates A–J pass. **13/13 pursuit scenarios + pace sweep 0/4/4 pass unchanged.** Cadence suite passes. Passcal families monotone (flat 1.00 sweep cells = pre-existing harness saturation, re-confirmed).
- Counterfactuals monotone: ball_control 67/87/100/100 clean%, fatigue 100→93%, SHORT ≥ DRIVEN, pressure via difficulty term. The defender-challenge-latency diorama collapsed to 2/15 contestable episodes per cell (receptions now secure) with parked-team claimant distortion — recorded as harness-limited; match distributions authoritative (challenged 41% of receptions, p50 2.7 s; secure balls contained, not dived at — H7-consistent).
- Determinism: same-seed bit-identical; chunk 600 s = 200+150+250 s; 20/20 distinct battery hashes; in-battery re-run identical. Keyed RNG only (the release-angling is deterministic geometry).

## 20-seed × 90-min battery (measured, never tuned)

| metric | rejected build | **now** | pre-pursuit accepted | note |
|---|---|---|---|---|
| goals | 2.30 (31–15), W12 D5 L3 | 2.30 (25–21), W10 D3 L7 | 3.35, W9 D5 L6 | total stable; record within historical n=20 variance |
| shots/team | 7.4 / 7.5 | 8.1 / 8.8 | 6.6 / 6.4 | |
| fouls | 21.5 | 19.95 | 18.4 | real band |
| flips/min | 10.4 | **7.10** | 8.43 | |
| median spell | 3.42 s | **5.85 s** | 4.71 s | the post-pursuit spell residual resolved organically |
| melee alternations/min | 20.8 | **6.58** | 10.27 | |
| box entries | 32.8 | 24.5 | 38 | |
| completion | 0.72 | 0.72 | — | |
| violations | 0 | 0 | 0 | |

**Honest framing:** flips/spell/melee now sit on the calm side of the historical "accepted" bands — but those bands were measured on builds that all contained the pinball defect (classified pre-existing), so they were inflated by fake churn. The current numbers are what the same brain produces once possession authority is physically continuous. Nothing was dialed; the gate is yours.

## Visual gate (:8303)

`viewer_authority_before.html` (rejected build, bit-exact reconstruction) vs `viewer_authority_after.html` — matched seed 789335328, 11 bookmarks each: ordinary reception→carry, receive→immediate pass, one-touch layoff, wall pass, receive→dribble, pressured reception, bad/heavy touch, defender attacks loose touch, **ORIGINAL_MAGNETIC_EPISODE (t≈5:27)**, **PINBALL_MELEE_EPISODE (t≈0:29)**, OFF_BALL_CONTINUITY. Same moments, same seed, both arms.

Gate checklist to verify by eye: no ownership chatter · no magnetic approach/back-off · no fake micro-pass + self-chase · no two-player chase of a securely controlled ball (residual convergence you will see is cal11 pressing/support) · off-ball players keep moving through local resolutions.

**STOP.** Nothing integrated, nothing deployed, no finishing/GK calibration. Rollbacks: `body/lab_rejected_baseline.py` (this workstream), `body/lab_pursuitfix_baseline.py` (pursuit state), `*_cal12_baseline.py`, production tarball unchanged.
