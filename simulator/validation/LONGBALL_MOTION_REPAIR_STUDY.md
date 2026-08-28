# DEFECT A (LONG-BALL RECEPTION) & DEFECT B (MOVEMENT COLLAPSE/TWITCH) — FORENSIC & REPAIR

**Date:** 2026-08-26 · **Status:** COMPLETE — stopped at the visual gate. Production untouched (all four fc_simulator hashes + DB re-verified this session; RC8 live). Candidate-only: body `2cbd8403c71d5982`, lab `d87f72c39975016b`, hybrid `fe5e00733ecc9f31`. Entry state (accepted possession-authority baseline) snapshotted BEFORE any edit: `body/lab/hybrid_authority_baseline.py` (= `dc7d494e…`/`79350375…`/`404a50ea…`). Short-pass authority repairs preserved and re-verified. No finishing/GK work, no aggregate tuning.

---

## DEFECT A — long-ball reception

**Forensic (30 min instrumented, every touch tagged with kick family/flight/arrival geometry):** short passes 98% CLEAN, but LONG (30 m+) only 49% CLEAN with **37% DEFLECT**; LOFT family 53% DEFLECT. Root cause measured, not assumed: the `rv ≥ 15` "screamer cap" resolves the contact as a generic body ricochet (out-speed rv·0.5 ≈ 8 m/s) **before any football control model runs** — 97% DEFLECT above the cap with ZERO skill involvement. Controlled grid: a SET, CALLED, unpressured receiver on a 40 m LOFT deflected **12/12 at bc45, bc65, bc85 and bc95 alike** — no attribute causality, no preparation model. A set receiver measured WORSE than one arriving late (37% vs 66% clean) because he stands under the exact chest-height missile. Mandated hypothesis verdicts: aerial/fast receptions entering generic collision — **CONFIRMED (the cap)**; control ignoring speed/height — CONFIRMED above the cap; reaching intercept but unprepared — CONFIRMED (preparation not modeled); CLEAN inheriting ball momentum — refuted (cushion kills incoming ball momentum); rebound physicality — CONFIRMED artificial (rv·0.5 ricochet).

**Repair (one mechanism + one physicality shape, hybrid.touch_model only):**
- **Preparedness cushion**: `rv_eff = rv·(1 − 0.40·prep01·(0.5+0.5·bc01))`, where prep01 = (called receiver 1.0 / mere teammate-arrival 0.4 / opponent-or-unaware 0.0) × set-ness (1−speed/5). The cap and the difficulty term now act on `rv_eff`. Hostile stabs, interceptions and all pursuit logic get prep01 = 0 — **bit-equal inputs, untouched**.
- **Absorbed failure**: a prepared receiver's failed control (including above-cap) becomes a HEAVY forward touch (`2.2 + rv_eff·0.18`) — his body gave with the ball — never the rv·0.5 ricochet. Unprepared bodies still ricochet.
- Height remains in the difficulty term (z·0.10 to 1.5 m, headers/aerial seam above 1.4 m) — chest-height arrivals stay harder than foot-height; documented as the geometry approximation.

**After:** grid CLEAN by bc45/65/85/95 = **4/9/10/12** (monotone, no universal trap; heavy-touch tail real: 8/12 at bc45); pressure and late arrival still bite; DRIVEN unchanged. Match-level long-ball first contacts: **CLEAN 49→77%, DEFLECT 37→1%, HEAVY 8→17%**; the 55 m flat missile (arrives ~23 m/s — the accepted flatter-LOFT family, flight physics untouched) is absorbed and recovered ≤3 s instead of ricocheting 8 m.

## DEFECT B — movement collapse / twitch

**Effective-motion forensic** (per tick × 22: command authority/target/speed, actual velocity, commanded-direction reversals, target displacement; freeze = ≥14/20 outfielders quasi-static immediately after an active phase; twitch = ≥4 reversals/s with <0.8 m net displacement): the prior "commands every tick" finding was correct but insufficient, exactly as you said. Measured on the rejected-visual baseline: 8.5–9.7 s of synchronized freeze per 30 min (sustained periods to 1.45 s), striker twitch to 10.9 s, 17 k command-target jumps.

**First causal ticks (three distinct mechanisms, each traced):**
1. **Carrier crawl** (the freeze trigger): my continuous shepherd law made commanded speed depend ONLY on ball separation → with the ball at his feet the carrier inched at 0.1–1.0 m/s sawtooth (1 m in 5 s); the whole team arrived at targets keyed to a static ball and stood — the synchronized lull, first divergent tick = the first CARRY tick after a reception. **Repair: two-regime carry** — DRIVE (ball at feet): speed from the INTENT, arrival-tapered (`td·1.8` capped at 0.875·vmax), pushing through ball+2 with full touches; GATHER (ball loose): separation law landing ON the ball. Speeds match at the seam; both → 0 when holding. Plus a **touch roll-cap** (`max_roll`): a carrier braking to his stop point sizes his knock to arrive WITH the ball.
2. **Waiting-chaser thrash** (the twitch): the assigned chaser under a dropping ball was commanded at vmax toward an intercept sample flickering sub-metre per tick — full-speed micro-thrash at the landing spot. **Repair:** target-hold hysteresis (<0.6 m flicker is not movement) + approach speed tapered by distance — but ONLY when the ball is far in TIME (ETA > 0.9 s or quasi-static): an imminently arriving ball is met at pace (through-balls still collected in stride).
3. **Instant velocity snaps**: the turn limiter engaged only above 3 m/s — at a walk, desired velocity reversed within 3–4 ticks (physically impossible; visually jitter). **Repair: plant-and-turn** — a >2 rad flip at any speed >0.5 limits acceleration to 0.45·acc. Systemic flap metric (actual-velocity reversals ≥3/s): 1691→1262 player-seconds/30 min; this background jitter predates every workstream (baseline-equal) and is now the lowest measured.
- Hypotheses REFUTED by measurement: per-tick A-B-A target alternation (≈45 events/10 min — negligible); off-ball updates blocked by possession state (sync cadence max gap 1.02 s in all arms); tactical-threshold target flapping (churn is legitimate 1 Hz re-targeting).

**After:** sustained freezes 5→2 per 30 min (max 0.87 s — brief collective pauses after active phases, football-plausible); visible thrash (reversals at >1.2 m/s) ≤1.3 s worst player (baseline 1.6 s; the violent vmax-command thrash class eliminated); carrier advances at real pace.

## Regression & integrity

Micro-gates A–J pass after every change; **13/13 pursuit scenarios + pace sweep monotone**; cadence suite passes; passcal monotone; counterfactuals monotone (bc/pass-speed/pressure/fatigue ✓; the defender-latency diorama is down to 2/15 contestable episodes with parked-team claimant distortion — harness-limited, match evidence authoritative: **8/8 heavy touches resolved <4 s, 0 unresolved**). Reception micro-scenarios 7/8 (S6's parked-defender geometry can no longer produce a contest because the reception itself is secure — match-level bad-touch resolution above is the authority; recorded honestly). Match authority metrics: micropasses 6 (all legit blocked passes), refire loops 0, magnetic 1 marginal detector hit, limbo>0.5 s 8.8%, wall passes 15. Determinism: same-seed, chunk-split, seed-divergence, in-battery re-run all ✓.

## 20-seed × 90-min battery (measured, never tuned)

| metric | authority arm | **now** | real ref |
|---|---|---|---|
| shots/team | 8.1 / 8.8 | **10.1 / 10.1** | 12–14 |
| pass completion | 0.72 | **0.78** | ~0.80 |
| box entries | 24.5 | **41.5** | — |
| median spell | 5.85 s | 6.63 s | 4–6 s |
| flips/min | 7.10 | 6.42 | — |
| fouls | 19.95 | 16.75 | 21–25 |
| goals | 2.30 | **4.35 (54–33, W12 D5 L3)** | ~2.8 |
| violations | 0 | 0 | — |

**Honest reading:** retainable long balls unlocked the chance funnel — shots, completion and box entries all moved INTO real bands. Goals rose to 4.35 because the **known R1 finishing over-performance** (on-target 54% vs ~35% real; GK saves 62% vs ~70%) now multiplies a real-sized supply instead of a suppressed one. R1 is the named, authorization-gated calibration item from the read-only evidence package; per your mandate it was **not touched** — it is now clearly the single lever between this build and real scorelines.

## Visual gate (:8303)

`viewer_ab_before.html` (authority baseline — your last rejected visual state) vs `viewer_ab_after.html`, matched seed 789335328, all ten mandated bookmarks: SHORT_RECEPTION_CARRY, SHORT_COMBINATION (regression proofs), LONGBALL_CONTROLLED, LONGBALL_HEAVY, LONGBALL_FAILED, LONGBALL_PRESSURED, FREEZE_ONSET_MATCHED (12:24, −5 s pre-roll of the baseline's longest freeze), TWITCH_ONSET_MATCHED (1:34), ATTACKING_SUPPORT, DEFENSIVE_SHAPE.

**STOP.** Nothing integrated or deployed; finishing/GK untouched; rollback chain: `*_authority_baseline.py` → `*_rejected_baseline.py` → `*_pursuitfix_baseline.py` → `*_cal12_baseline.py` → production tarball.
