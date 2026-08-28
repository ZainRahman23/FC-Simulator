# LIVE CASE #7 — AVL 0-0 LIV: STERILE EQUILIBRIUM & TAKE-ON CONSEQUENCE FORENSIC

Date: 2026-08-24 · Production frozen at v0.7-cal10 (RC7 app / cal10 football) throughout. NO football changes made.

## PART A — MATCH IDENTITY & REPRODUCTION

| Field | Value |
|---|---|
| Match ID | `68cf867e483c` |
| Save / Fixture | `save-e6sdbd31mt5gn04o` / `MW07-AVL-LIV` |
| Seed | `1473406334` |
| Versions | engine 0.7 / **v0.7-cal10** / players-v3-4attrs (app stamp 0.1.0-rc7) |
| Ledger digest | `b8117f970e058eced0389156` (2461 events) |
| Authoritative stats | AVL: **0.014 xG**, 1 shot, 0 SoT, 5 box entries, 66.1% completion, 81 prog passes, 0 transition xG. LIV: **0.389 xG**, 9 shots, 3 SoT, **22 box entries**, 71.2%, 102 prog passes, 0 transition xG. Possession 57.1/42.9. |
| Manager commands | none (pure base tactics both sides; AVL coach-AI, LIV human) |
| Reproduction | plain 1 s-step replay digest = persisted digest ✓; decision-hook instrumented replay digest identical ✓ (case7/harness.py — instrumentation proven neutral) |

Tactical identity: AVL (AI) played near-mirror of your Liverpool profile — Patient/Short/Wide, Mid block, Selective press, Zonal, Hold. Differences only: boxCommitment Balanced (vs Commit), afterWinning Secure (vs Counter).

## PARTS B/C — POSSESSION FUNNEL: WHERE ATTACKS DIED

111 AVL / 112 LIV possessions reconstructed (funnel.py, 1 Hz authoritative samples + full decision log).

```
AVL: 111 poss → 69 final third (62%) → 1 dangerous FT → 4 box → 1 shot-poss → 0 good shots (xG 0.014)
LIV: 112 poss → 86 final third (76%) → 20 dangerous FT → 27 box → 8 shot-poss → 1 shot ≥0.10 (xG 0.389)
```

- Median **1 completed pass per possession** (both teams); median 3 players involved; pressure at turnover med 0.64-0.68. The felt loop — possession → few passes → pressure → turnover — is exactly what happened, 223 times.
- Both teams reach the final third easily. **Progression is not the failure point.** Attacks die at relx 74-78 (AVL) / 78-82 (LIV) under pressure: tackle/interception/heavy-touch dominate.
- LIV shot anatomy: 8 of 9 open-play shots from 23-33 m into lane density 0.75-1.00 (xG 0.009-0.021, correctly tiny). Only real chance: Ekitike header 8.4 m, 0.171.
- **Box entries were wide and unsupported: at all 22 LIV entries, teammates-in-box was 0 (12×) or 1 (10×, always Ekitike alone). Never ≥2.** Support at entry+6 s still averaged 1.0. Result: 1 cutback window all match, 2/6 cross contacts, 12/22 entries "recycled" with no shot and no turnover. Villa's 5 entries: same shape, worse quality.
- Decision log: runner-ahead existed in 673/627 decision-seconds and was passed to 26% of the time; dribble candidates existed 410/452 times, taken 27/39. Selection rates are not anomalous — the *product* of penetration is what's missing.

## PART D — LOW-EVENT DISTRIBUTION (60 matched seeds, exact fixture)

The live match is NOT a tail of this fixture — it IS this fixture (mseed7.py):

| metric | AVL P10/med/P90 | LIV P10/med/P90 | live |
|---|---|---|---|
| xG | 0.02 / **0.06** / 0.30 | 0.20 / **0.50** / 0.97 | 0.014 (3rd pct) / 0.389 (35th pct) |
| shots | 1 / 3 / 6 | 4 / 8 / 10 | 1 / 9 |
| box entries | 1 / 3 / 9 | 12 / 16.5 / 26 | 5 / 22 |
| box shots | 0 / 0 / 1 | 1 / 2 / 5 | 0 / 2 |
| chances ≥0.10 | 0 / 0 / 1 | 0 / 2 / 4 | 0 / 1 |
| chances ≥0.20 | 0 / 0 / 0 | 0 / 0 / 1 | 0 / 0 |
| entry staffing ≥2 | med **0** | med **0** | 0 / 0 |

Frequencies: **0-0 in 37/60 (62%)**. Total xG < 1.00 in 50/60; < 0.50 in 21/60. AVL xG < 0.10 in 34/60. AVL zero box shots in 38/60. The empty-box-at-entry structure appears in every seed (staff_ge2 median 0 both teams). A real AVL-LIV 0-0 rate is ~10%; 62% is not football-plausible, and its anatomy (structural, not variance) confirms it.

Control — MW06 LIV-WHU replay (digest-verified): same LIV, same lone-striker box (entry staffing 0.73, ≥2: 1/56) but **56 entries, 11 box shots, 2.112 xG** against WHU's Deep/Passive/Drop block. Volume against a passive shell compensates for the missing box cast; against an engaged block it cannot.

## PART E — TACTICAL MATCHUP MATRIX (12 seeds/combo, same squads)

| combo | AVL xG | LIV xG | 0-0 | note |
|---|---|---|---|---|
| live base (mid/selective vs Patient/Short) | 0.07 | 0.47 | 8/12 | the sterile equilibrium |
| lowrisk vs lowrisk | 0.27 | 0.34 | 8/12 | cagey; 27 entries each, nothing converts |
| balanced vs balanced | 0.20 | 0.35 | 5/12 | **two balanced teams → 0.55 total xG** |
| aggressive vs aggressive | 0.75 | 4.84 | 0/12 | transition football works (txg 4.3) |
| AVL aggressive vs LIV parked | 2.49 | 0.00 | 1/12 | |
| AVL deep-passive (WHU-style) vs LIV base | 0.23 | **2.02** | 0/12 | reproduces MW06's 2.11 ✓ |
| AVL base vs LIV Mixed/Ambitious | 0.27 | **1.10** | 1/12 | directness alone doubles output vs same block |

The mutually sterilizing equilibrium is real and reproducible: **an engaged Mid/Selective/Hold block suppresses the same elite attack to ~0.4-0.5 xG that a Deep/Passive block concedes 2.0+ to — with zero compensating transition exposure (txg ≈ 0.03 in all non-aggressive combos).** The concession structure is inverted relative to football: engagement is free, passivity is punished. No hidden multipliers were added anywhere; these are process outcomes.

## PART F — TAKE-ON CONSEQUENCE: AUTHORITATIVE, NOT PRESENTATIONAL

Live match: 95 DRIBBLEs → 17 BEAT / 29 PARTIAL / 26 TACKLED / 15 LOOSE / 8 RETAIN. For all 17 BEATs (takeon.py, authoritative positions):

- Separation at resolution med **7.4 m**; +1 s 6.1; +2 s 5.0; **+3 s 5.7** (cal9's accepted consequence intact); +5 s 3.2 with frequent collapse to contact.
- **Same beaten defender re-engages to <2.2 m in 14/17 cases, median 4.0 s.** Possession survives 5 s in 15/17.
- Attacker advancement +3 s: median 3.5 m — walking. Post-BEAT ground speed: attacker **2.05 m/s** vs beaten defender **4.60 m/s**.

Matched-seed probes (beatprobe.py, 73 BEATs, 6 seeds): attacker 1.7-2.1 m/s in every zone (open field 1.94, final third 1.94, box zone 1.68) and at every pace quadrant — **a +10-pace elite attacker still averages 1.68 m/s while the man he beat runs back at 4.40 m/s.** Defender recovery speed itself is ordinary (4.2-4.6 m/s jog/run — RECOVER gating is not "too fast").

Causal mechanism (event timelines): BEAT → exactly one carry at +1 s (2-6.5 m, often diag_in — cal9 F-families work) → **then a 3-4 s action gap** → beaten defender (4.4 m/s × ~3.5 s) re-arrives → next action is a duel/denied pass again. The cal7-A urgency model keys decision cadence off *current pressure*; winning separation drops pressure, which hands the winner the slow "free player" cadence at precisely the moment football demands maximum urgency. The advantage is authoritatively squandered by decision timing — **the renderer showed the truth. DO NOT fix this in presentation.**

## PART G — DECISION GATE: **C. SPECIFIC DEFECTS FOUND** (two, coupled) — NOT IMPLEMENTED

Part B classification: C + I (+E), with F/H as the matchup amplifier. Not A: 62% 0-0 with structurally identical anatomy across seeds is not tail variance.

**Defect C1 — no box-attack staffing at the penetration moment (primary xG-supply defect).**
cal8 P1 occupation stations are ball-relative and strictly *behind* the ball (W −5, CAM −8, CM −11, FB −14 units, engine.py ~765-776) and cap targets at station+6. When a wide player penetrates the box, everyone except the pinning ST is *designed* to hold stations outside it: entry staffing ≥2 never occurred in 60 seeds. Wide penetration therefore has no cutback target, no cross target, no second wave — F6 then correctly refuses the bad-geometry shot and the possession recycles or dies. This also voids the take-on's downstream product.
*Smallest correction candidate (cal11-P, NOT implemented):* a phase-triggered **box-attack run release** — when own possession enters the box/byline channel (settled attack, ball relx ≥ ~82), release a tactic-gated cast (Cautious 1 / Balanced 2 / Commit 3: far winger, highest CM/CAM, ST adjusts) from station caps onto defined box targets (near post, penalty spot, far post, cutback zone), expiring with the entry. Extension of P1 stations + F2 run intentions; movement targets only — no probability, xG, or execution changes.

**Defect C2 — post-advantage cadence collapse (the take-on finding; also feeds C1).**
After a BEAT the carrier acts once, then reverts to free-player decision cadence (~3-4 s) because pressure momentarily reads low. The earned 7 m becomes a duel again in median 4 s. *Smallest correction candidate (cal11-Q, NOT implemented):* an **exploitation window** — for ~4-5 s after creating separation (BEAT; optionally reception beyond the last engaged defender), the carrier uses pressured-tempo decision cadence and retains carry-continuation bias. Timing of the next decision only — zero probability/outcome changes; the same mechanism class as cal7-A's accepted urgency asymmetry.

**Watch item W1 — engagement costlessness (inverted concession structure).** Engaged blocks suppress at zero transition cost (txg ≈ 0 everywhere non-aggressive). C1+C2 should organically raise the cost of engagement (recoveries into released runners; exploited separations); re-run the Part E matrix after them and only then decide whether any engagement-exposure mechanism is justified. No change proposed now.

**Proposed experiment (awaiting authorization — nothing has been implemented):** exp copy with flags `BX={P:bool, Q:bool}`, flags-OFF digest-identical to cal10; validate P and Q separately then together on (i) 60-seed AVL-LIV (targets: entry staffing ≥2 becomes common under Commit; cutback windows/box shots/cross contacts up; LIV med xG toward 0.9-1.4; 0-0 rate toward 20-35%; AVL med xG rises but stays modest — identity preserved), (ii) BEAT separation persistence (+3 s ≥ 5.5 m held AND attacker post-BEAT speed > defender recovery speed in open field; same-defender re-engagement median > 6-7 s), (iii) full canonical/quality/press guardrails, MW01-07 historical identity, parity, and the Part E matrix re-run (aggr-aggr must not inflate; deep-passive concession must not explode). ACCEPT → cal11; else KEEP cal10.

**cal10 remains frozen. No cal11 exists. Stopping football work here per instructions.**
