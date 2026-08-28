# POSSESSION-MOVEMENT FORENSIC & REPAIR (acquisition paths · carrier crawl · team freeze)

**Date:** 2026-08-27 · **Status:** COMPLETE — stopped at the visual gate. **PRODUCTION UNTOUCHED** (hashes re-verified; RC8 live). Candidate-only: body unchanged `0ae458885ae6056e`, lab `0d80641c6efb3c29`, hybrid unchanged `27ebfa4a0da4f0ca` — the ENTIRE repair is lab-side (executor + cadence seam). Entry state snapshotted first (`*_autharch_baseline.py`). Reception improvements, clearance semantics, restart legality, claim hysteresis, tier-2 carve-out, pursuit — all preserved and re-gated. Finishing/GK untouched. Authority architecture NOT reopened (its conclusion stands; everything below is ownership-leak-level).

---

## REQUIRED ROOT-CAUSE VERDICT (established before any repair)

**HEALTHY PASS RECEPTION PATH:** contact → CLEAN → RECEPTION wake → immediate one-touch decide under pressure, else settle-and-scan (0.15–1.2 s, standing by accepted design) → decided intent → executor. First decision p50 0.18 s.

**UNHEALTHY LOOSE/INTERCEPTION PATH:** identical through the decide (first decision p50 1.1–1.15 s — the scan applied to uncontested winners; football-plausible in itself). The pathology began at the DECIDED CARRY: executor speed was a linear function of remaining target distance (`td·1.8`), the GATHER law braked the carrier to zero at the ball after **every** knock (resetting acceleration each touch cycle — carry speed could never bootstrap), and **intent completion had no wake** — the carrier arrived at his carry target and stood 1.6+ s waiting for the 3.0 s cadence fallback.

**FIRST DIVERGENT STATE:** the first executor tick after the CARRY decide — commanded speed 1.7 m/s p50 where football expects carry pace — with the terminal divergence at target arrival: a 2.8 s possession tick-trace shows the carrier arriving at t+1.4 s and **zero decisions for the remainder** (the smoking gun).

**CARRIER CRAWL ROOT CAUSE:** classification **C + D**. NOT A/B — the decision mix is healthy football (193 PASS / 160 CARRY / 20 DRIBBLE / 27 CLEAR / 14 SHIELD: carry IS considered and wins). NOT E — single authority throughout. C: locomotion suppressed the selected intent (td-linear speed; gather-brake reset). D: completed intents waited multi-second fallbacks because "target reached" was not an enumerated wake.

**TEAM FREEZE ROOT CAUSE:** downstream cascade of the carrier crawl. Directly tested: off-ball target generation is **NOT conditional on ball/carrier motion** — during ball-quiet windows (<1 m/1.5 s) the brain still refreshes 27 targets/1.5 s and off-ball mean speed is 3.28 m/s (vs 40 and 4.31 m/s with the ball moving). The team breathes whenever the ball circulates; it appeared to freeze because carriers were pinned by their own executor.

**SAME MECHANISM OR INDEPENDENT:** one causal chain — executor suppression + missing completion wake. The acquisition-path dependence was the same chain seen through decision latency; no second mechanism found.

## Repairs (smallest set; lab.py only)

1. **Carry pace** (DRIVE): commanded speed = 0.875·vmax beyond the 2.5 m arrival zone; taper only inside. Football urgency, not remaining-distance.
2. **Corridor to knock range**: the ball is HIS out to 2.0 m — the knock-chase-knock cycle stays at pace; GATHER (separation law) only beyond knock range. Removes the brake-at-the-ball reset.
3. **Intent completion is a wake**: reaching a DECIDED carry target re-arms the cadence immediately (settle intents excluded — their completion is the scheduled scan, preserving the accepted cal12 cadence: decision rate re-measured at **35/min, unchanged**).
4. **Take-on cadence guard**: the re-armed cadence never interrupts a committed TAKE_ON (defers 0.4 s) — restores the cal12 invariant a leak briefly broke (caught by the cadence suite).

**Documented, deliberately NOT repaired (out of scope per mandate):** cal11's own decided carry targets are p50 = 1.0 m, p25 = 0.2 m — half of brain-authored carries mean "adjust position", frozen-brain semantics from a world where possession advanced through the pass graph. The executor now honors real targets (p90 13.7 m) at pace; carry *progressiveness* and formation quality remain brain-level questions for the separate evaluation you mandated after movement mechanics were proven.

## Required metrics (diagnostics, not targets)

| metric | before | after |
|---|---|---|
| acquisition→first decision p50 (PASS / LOOSE / INT / DEFL) | 0.18 / 1.1 / 1.15 / 1.02 s | 0.03–0.27 s, **path-uniform** |
| carrier dist per possession-second p50 | 1.30 | 1.84→1.37 honest (over-decide bypass removed); possessions ≥3 m: 51→66%; possessions moving <1 m: 2%→0% |
| team-wide effective-freeze | 6.9–14.8 s/30 min, periods to 2.9 s | **1.3 s/30 min; ZERO collapse episodes in the 30-min viewer run** (before-arm: 5, up to 1.8 s) |
| off-ball speed, settled possession | — | quiet-ball 3.28 m/s, moving-ball 4.31 m/s (holding position remains possible: hold-without-twitch scenario passes with 0 reversals) |
| decision cadence | 35/min accepted | 35/min (settle-scan preserved) |
| stale predecessor-intent survival | — | none found post-acquisition (settle intent replaces atomically at the wake; restart clears at whistle) |

## Regression & battery

Reception 8/8 · restart/claim 8/8 · pursuit 13/13 + sweep · cadence suite green (incl. the take-on-interrupt invariant) · micro-gates 9/9 · long-ball grid monotone unchanged · determinism (same-seed/chunk/divergence/in-battery) ✓ · violations 0. Two fixture-gate recalibrations disclosed (S2 restart gate now tests the true invariants: no out-of-bounds commands + inside at release; transit depth is whistle-position-dependent).

**20-seed battery (measured, never tuned):** shots **13.8/15.4 per team — the real 12–14 band reached**; box entries 47; completion 0.76; spells 6.25 s; flips 7.2; fouls 11.4 (low — carried observation); **goals 5.65/match** — the untouched R1 finishing calibration (54% on-target vs ~35% real, GK 62% vs ~70%) now multiplies a fully real-sized chance supply. Every structural metric is at or near real football; **R1 is the single remaining named lever for scorelines and is still authorization-gated.** Also flagged honestly: away outshoots home (15.4 vs 13.8) with W11 D4 L5 — worth a look in the deferred positioning evaluation.

## Visual gate (:8303)

`viewer_possmove_before.html` (your rejected build) vs `viewer_possmove_after.html`, matched seed 789335328: SHORT_RECEPTION_CARRY / QUICK_PASS (regression proofs), INTERCEPTION_CARRY / PASS, LOOSE_BALL_CARRY, CLEARANCE_COLLECTION_CARRY, DEFLECTION_RECOVERY_CARRY, CARRIER_OPEN_SPACE_DRIVE, SUSTAINED_POSSESSION_SUPPORT / DEFENSE, and **LONGEST_MOVEMENT_COLLAPSE — present in the before arm (1.8 s at 6:26), ABSENT in the after arm (the class is empty in 30 minutes)**. CARRIER_HOLDS_TEAM_REPOSITIONS appears only in the before arm — after the repair no possession stands >3 s with <3 m movement; players still hold position when tactically correct (scenario-proven).

**STOP.** Nothing integrated, nothing deployed, finishing/GK untouched. Acceptance criterion as you defined it: controlled possession now produces purposeful carrier behavior and continuously responsive team football, and players who should hold still can. Awaiting your visual verdict.
