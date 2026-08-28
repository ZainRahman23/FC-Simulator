# FINAL HYBRID-C PREREQUISITE WORKSTREAM — attacking quality + foul volume

**Date:** 2026-08-25 · **Status:** COMPLETE — stopped at the decision gate. Nothing integrated, no cal12, no deploys, no xG/finishing/scoring tuning, no OVR, no bonuses.
Production frozen and re-verified at close (engine `4d8ac52d864fcc6a…`, calibration `6fb2036c6cff41ed…`, players `14bbe398203d9ba6…`, save `b2092e4415533069…`, RC8 live). Shipped lab build: `hybrid.py 643e76fc237a61c2`, `lab.py 1722558476ed2bed`, `body.py c4c7a761c6672ec9`. The four accepted transition-repair fixes preserved and continuously re-gated.

---

## A. Attacking-quality forensic — root cause established, then repaired causally

**Funnel + window instrumentation** (`funnel.py`): a window = an interval where cal11's own frozen shot math on the mirrored instant (F6 geometry gate, `xg_eff = xg·(1−p_block)` ≥ 0.05) says a real chance exists.

1. **Aliasing acquitted.** Windows were rare (5/30 min) but cal11 evaluated 4 of 5 and shot half — the wake system sees the windows that exist. No new wake was causally warranted; none was added.
2. **Defense was physically over-perfect — by adapter construction.** Hybrid final-third carrier instants: median xg 0.010, pressure p25 0.42 (never free). Native reference (instrumented `_pressure` over a full match): **bimodal** — the presser is either on the carrier (p50 distance 0.0, pressure ~0.7) or disengaged (p75 7.1 m, pressure 0.07); ~25% of native final-third instants are effectively FREE, and that free tail is where native's shots (median xg 0.056) live. My ENGAGE glue (hard-coded 1.7 m cushion, tireless) had erased the free tail.
   **Repair 1 (REQUIRED): defensive positioning authority returned to the brain.** ENGAGE/SUPPORT bodies travel to cal11's own step-out/contain targets (`_press_sweep` via `body_targets`); the adapter keeps only challenge election, recovery and HOLD chase-exclusion. Free-instant share restored to **0.267 vs native ~0.25**; ecology *improved*.
   **Repair 2 (REQUIRED): fatigue → physical speed.** Native's `_movement_speed` uses energy-degraded effective attributes; the body's vmax/acc were constant — an invariant the seam had dropped. Body pace now follows the accepted effective-attribute curves at 1 Hz. No new model, no bonuses.
3. **The residual volume gap is the deferred cadence property, not a defect.** Decisive number: **shots per final-third-control second — native 0.0144, hybrid 0.0156** (parity). Hybrid simply dwells 2.5× less in the final third (~384 s/90 vs native 969) because cal11's 2× decision density renders as tempo in continuous time — the property explicitly deferred as cal12-class in three successive mandates. Classified: intervention **REJECTED** here (would be tempo tuning out of scope); the dependency is stated at the gate.

## B. Attribute monotonicity (shipped build)

Finishing 0.12→0.23 · GK reflexes 0.39→0.06 · GK handling holds 0→0.63 · passing sweep monotone · reception ball-control monotone · tackling 0.46→0.70 · reactions 0.0→0.66 · stamina match-monotone (83.4/86.5/88.5) · pace via through-ball races and knock-race channels. **In-match BEATs 18–24/match — native's ~24 band.** The isolated 1v1 duel diorama collapsed (BEAT ~0) after positioning authority moved to the brain: a parked world gives cal11 no block context, so its presser output is pure chase — recorded honestly as a **harness-representativeness artifact** (two eco-scenario FAILs kept in the record), with match-level distributions as the authoritative take-on gate.

## C. Defensive strength — answered

The pre-repair defense was **not legitimately better; it was over-perfect by adapter overreach** (the glue) plus tirelessness (missing fatigue→speed). Post-repair: native-like disengagement tail, honest closing that degrades late, defensive mistakes exist and are bookmarkable (heavy touches in own third), counters still convert (2 counter-goals-vs-home per 10 matches) and a true 0-defender counter still scores. Nothing was weakened arbitrarily; both changes restored brain/native authority.

## D. Foul forensic — coverage, not multiplication

Measured pipeline (30 min): 27 challenge executions → 25 clean wins / 2 pokes / **0 misses**; **14 from-behind and 7 after-release challenges existed but resolved as "clean wins" and never reached the adjudicator**; shoulder-boundary contact (bodies pinned at the 0.88 m separation ring) was invisible to the pipeline.
**Repair 3 (REQUIRED):** winning ball-and-man — through-the-carrier wins from behind or arriving within 0.25 s after release with body contact — is adjudicated (existing cal11-shaped logit; the win stands unless the whistle overrides it).
**Repair 4 (JUSTIFIED):** hard-charge boundary contact (closing > 3.5 m/s at the separation ring near the ball, 3 s rate-limit) adjudicated at reduced weight. Aerial/holding classes **REJECTED for now** (no header/jump model — documented gap).
Result: **fouls 12–21/match (mean 16.7) + regular yellows + 3 reds/10 matches** (second-yellow reds live; cal11's yellow-card caution loop engaged) vs native 8–21 + 0–5. Bonus: fouls give play breath — ecology improved further.

Also repaired during validation (mandate E class): the GK sweep-intercept stood at the wrong y (goal-line crossing y while waiting up-pitch) letting one long back-pass through — intercept point corrected to the actual meeting x; and the held-ball carry-over pathology re-entered via non-dive movers — closed at the single authoritative point (`step_ball`: a keeper holding the ball plants field-side of his line).

## E. Repair preservation (continuously re-gated)

No back-pass self-goals, no catch/spill-over-line, no goalward-cushion goals in shipped-build forensics (seed-1 goals: clean shots + one legitimate scramble). Counter conversion stays ~4-8%. Beaten windows world-time correct. Ecology at its best readings of the entire program: **flips 9.1/min, median spell 4.95 s, re-flip 0.415, ping-pong 59/30 min, loose 6.8/min, melee 10.9/min**. Micro-gates A–J passed after every single change. Fatigue body-authoritative. Determinism: same-seed identical (`d72f534a3caae3d1`), chunk-independent, seed-divergent; keyed auditable draws only.

## F. Final distributions (10 matched seeds × 90 min, shipped build)

| metric | hybrid (10 seeds) | native (10 seeds) | real-football frame |
|---|---|---|---|
| elite HOME record | **W6 D1 L3**, 15–9 | W8 D1 L0, 15–1 | strong favorite ≈ W6–7 |
| away goals/match | 0.9 | 0.1 | underdog ≈ 0.8–1.2 |
| fouls / cards | 16.7 · 22Y 3R | 8–21 · 0–5 | ~21 · ~3.5Y |
| offsides / corners / box entries | in earlier-band | 3–11 / — / 46 | ✓ |
| shots (home / away) | 6.1 / 9.1 | ~22 total | (dwell-limited; see A.3) |
| median possession spell | 5.0–5.9 s | — | ✓ breathes |
| counters → goals vs home | 2 in 10 matches | — | risk real, not fatal |
| BEATs/match | 18–24 | ~24 | ✓ |
| continuity violations | 0 | — | — |

Quality 2×2 correctly ordered (eliteVweak most box entries/beats; eliteVelite 2-0 home 30-min cell). Pressing gradient: opponent completion down in 3/3 seeds under RELENTLESS, challenges and fouls up. Shot-volume asymmetry (away out-shoots on volume, home out-scores on quality) is internally consistent — home's chances are better, away's are direct/long — and sits inside the dwell property.

## G. Visual evidence

`viewer_sequences.html` on **:8303**, shipped-build seed-1 replay with all nine mandated demonstration types bookmarked: ELITE_CHANCE ×6, DEF_EXTINGUISH ×4, BEAT_EXPLOIT ×6, BOX_OCCUPATION ×6, TRANSITION ×6, LEGAL_CHALLENGE ×6, FOUL_CHALLENGE ×6 (+FOUL+CARD), DEF_MISTAKE ×6, WEAK_TEAM_CHANCE ×6, plus GOAL/PENALTY/OFFSIDE/restart coverage.

## FINAL DECISION GATE

| prerequisite | verdict |
|---|---|
| Fatigue authority (now incl. fatigue→speed) | **PASS** |
| Full-squad defensive ownership (brain-authored positioning) | **PASS** |
| Box defense / transition conversion | **PASS** |
| Possession ecology | **PASS** (best readings of the program) |
| Foul/offside/restart + card ledger | **PASS** |
| Tactical differentiation | **PASS** |
| Attribute gradients | **PASS** (1v1 diorama noted as harness artifact) |
| Match-level quality gradient | **PASS** (W6 D1 L3, 15–9, ordered 2×2) |
| Random integrity | **PASS** |
| Match tempo / shot volume statistics | **DEFERRED-BY-MANDATE** — causally attributed to cal11's decision density in continuous time (per-dwell-second attacking parity proven); cal12-class |

**Answer: Hybrid-C is READY at the mechanism level to become the physical body beneath cal11** — every critical mechanism is causally correct, none of the aggregate resemblance is tuned. The one open item is not a Hybrid-C mechanism: season-statistics parity (shot volume, tempo-derived counts) awaits the cal12-class cadence/dwell calibration that has been deliberately fenced off since the architecture study, and that work should be done **against this body** as its target substrate.

### Proposed production-integration plan (NOT executed; for review only)

1. **Gate zero:** user watches the bookmarked sequences (:8303) — the personal visual gate that has always been reserved.
2. **cal12-class tempo pass first** (brain-side, this lab): decision-density/dwell calibration against the hybrid body — the deferred property; acceptance = shot volume/tempo statistics in football bands with all this workstream's gates re-passing.
3. **Engine merge:** port the inserted lab-methods block (byte-verified additive) + hybrid execution layer + body into production behind a `WORLD["CONTINUOUS"]` flag, default OFF; flags-off digest-identical to cal11 (same discipline as BX/ST families).
4. **Parity battery:** seed batteries (≥50 matches) flags-on vs this lab (hash-level), plus season-level statistical validation; fatigue telemetry authoritative; halftime recovery ported.
5. **Bookkeeping parity:** events/ratings/cards into the production ledger; renderer integration is a separate later milestone (Architecture-B pipeline).
6. **Rollback:** flag OFF restores cal11 exactly; checkpoints at every step.

**STOP.** Awaiting review — no merge, no cal12, no deploy has been performed.
