# DRIBBLE-1.4 — Final foundation cleanup before attributes

17–18 Oct 2026, night session (17 Oct chronicle day) · branch `prototype/dribble-1` · instruction `review_artifacts/dribble14/sources/2026-10-17_user_instruction_dribble1_4_foundation_cleanup.md` (verbatim)

The local review page is `http://127.0.0.1:8361/review_artifacts/dribble14/review/DRIBBLE14_REVIEW.html`. It shows real player names in the lab labels, so it is local only and not published.

I cannot play video in real time; every visual judgement here comes from frame strips and stills extracted from the clips.

## What I found

1. **The known early-release failure is a sampling artefact, not "too early".** I reproduced it first: 90° right, seed 16, DRIBBLE-1.3 loses it and DRIBBLE-1.2 takes it cleanly.
   - **How the sweep was run.** I released the cut at every lead from 1 to 24 ticks, with the release search run to completion so that every lead is exact.
   - **Result: the outcome repeats with the lead modulo 3.** The release search sampled contact ticks every 3 ticks counted from the release tick, so the lead decided which stage contact even existed:

     | Stage contact tick | Speed-error draw | Launch | Outcome |
     |---|---|---|---|
     | 640 | +1.1σ | 6.87 m/s | clean |
     | 639 | −1.9σ | 6.33 m/s | lost |
     | 638 | — | — | lost |

   - **Why the draw changes.** The execution error is keyed by tick, so a different contact tick also means a different draw.
   - **How 639 fails.** The slower ball meets the left foot's next swing 0.46 s later: an unplanned toe touch, a loose ball, then a late laces touch.
   - **Why 1.2 succeeded.** DRIBBLE-1.2's 1-tick release happened to land on 640.
   - **Releasing earlier is not the fix.** An instant release does not improve the 384-run aggregate (255 taken / 107 clean).
2. **Clean cuts were lost to the set-up validator.**
   - **Per set-up, clean cuts didn't change.** About 25 % of accepted set-ups end as clean cuts, under any filter.
   - **The count of set-ups did.** DRIBBLE-1.2 got 31 clean cuts through set-ups and DRIBBLE-1.3 only 6, because its 5-of-6 rule rejected 59 % of the set-ups that actually worked.
   - **Without set-ups, 1.3 was better.** It made 108 clean cuts without a set-up, against 1.2's 98.
3. **The 5-of-6 count is a weak predictor.** I audited 168 set-ups, all executed with the check off: 89 to choose a rule, 79 independent ones to check it.
   - **Variant count.** The number of reachable variants hardly predicts the outcome.
   - **Window coverage.** How much of the decisive foot's contact window survives the execution error does.
   - **The catastrophic tail.** Set-ups whose six variants leave almost no window lose the ball within 1 s two times in three.

## What changed (DRIBBLE-1.3's architecture untouched)

- **Release contact window.** The release search evaluates every tick of its contact window, so the release lead no longer decides which contacts exist. Work units rise 4 %.
- **Contact-timed release.** Once a release plan is found, the same release is re-evaluated exactly at the earliest tick its evaluation can complete. The planner's own contact cost then chooses between the two releases; the found plan is never lost.
- **Graded set-up robustness.**
  - **Per variant.** Its coverage is the slots of the decisive window it keeps, out of 4 (a comfortable window), capped at 1.
  - **Score.** R is the mean coverage over the six BALL-PHYS execution variants.
  - **Rule.** A set-up is accepted when R ≥ 0.25. For your example in §9: four comfortable variants and two misses score 0.67; five barely-reachable variants and a miss score 0.21.
  - **Still physical.** The validation still runs against the predicted BALL-PHYS future.
- **Speed-error clearance.** DRIBBLE-1.2 required every launch to clear the other leg for its lift and direction errors, but not for its speed error. That check is now added.
- **Unchanged:**
  - TURN-1.2;
  - the incremental planner and its 2 / 8 ms budget;
  - all caches;
  - the resolved touch and its one authoritative impulse;
  - the free physical ball;
  - interruption and control loss;
  - contact geometry and costs.
- **Matched randomness.** Error draws are keyed by (seed, player, tick, foot). All 392 touches common to D1.3 and D1.4 in the changed runs draw identical errors.

Rejected on evidence:
- a threshold of 0.5 (259 taken / 118 clean);
- a path check for release touches (it refused even the good stage plan);
- ±1-tick refinement instead of every tick (263 / 118);
- compare-all release ordering (269 / 109).

## Status

| Item | Result |
|---|---|
| DRIBBLE-1.3 PERFORMANCE ARCHITECTURE PRESERVED | **YES** |
| TURN-1.2 UNCHANGED | **YES** — leg pose 118,236 / 118,236 bit-identical; plants 0.0000 mm |
| EARLY-RELEASE ROOT CAUSE ADDRESSED | **YES** — stage contact 640 for all 24 leads; seed 16 lost → taken |
| CONTACT-TIMED RELEASE | **PARTIAL** — exact re-timing to the earliest evaluable tick, chosen by contact cost (seed 16: 552 → 541). Bounded by causality, and a choice among exactly evaluated ticks rather than a backward solve |
| SETUP VALIDATOR PRECISION/RECALL IMPROVED | **YES** for recall and the catastrophic tail; precision on "decisive executed + cut taken" fell (details below) |
| SETUP VALIDATED AGAINST BALL-PHYS FUTURE | **YES** |
| CUTS TAKEN | D1.2 **258** / D1.3 **256** / D1.4 **273** |
| CLEAN CUTS | D1.2 **129** / D1.3 **114** / D1.4 **121** |
| 60R / 60L / 90R / 90L OVER 96 SEEDS | **6.50 / 6.25 / 5.67 / 4.33** per 8 |
| DECISIVE TOE RATE | **5.9 %** |
| ≥9 M/S DECISIVE CUT TOUCHES | **0** of 400 |
| STRAIGHT CONTROL | **100 %** |
| IMMEDIATE SAME-FOOT RECONTACT | **0.10 %** |
| PHYSICAL INTERRUPTION | **PASS** |
| CONTROL LOSS POSSIBLE | **YES** |
| AVERAGE CPU | **143 ms/s** |
| WORST SPIKE | **23 ms** |
| CHROME/NODE DETERMINISM | **PASS** — decisions 20 / 20 identical |
| READY TO FREEZE DRIBBLE-V1 FOUNDATION | **NO** — one more foundation fix required, for clean 90° cuts |

Validator details:
- Recall rose from 41 % to 94 % of the set-ups that worked.
- Accepted set-ups that lose the ball within 1 s: 18 % → 17 %.
- Of the set-ups it rejects, 67 % lose the ball within 1 s, against a 23 % base rate.
- Precision on "decisive executed + cut taken" fell from 77 % to 68 %.

## THREE VIDEOS TO WATCH FIRST

1. **`A3_known_diag.mp4`** — the known case (90° right, seed 16), top camera at ½ speed, diagnostics on.
   - D1.3 plans the staged inside-left contact at tick 639, launches at 6.3 m/s, then needs a left-toe recovery.
   - D1.4 plans it at tick 640, launches at 6.9 m/s, and plans the outside-right cut.
2. **`B1_60L_1x.mp4`** — the best recovered 60° cut (60° left, seed 24), 1× gameplay camera.
3. **`D1_rejected_1x.mp4`** — a correctly rejected set-up (60° left, seed 4).
   - Left: the set-up check switched off; the set-up is played and the ball is lost.
   - Right: D1.4 rejects the set-up; it does not take the cut either.

## D1.2 / D1.3 / D1.4 TABLE

| Metric | D1.2 | D1.3 | D1.4 |
|---|---|---|---|
| Average CPU (ms / sim s, each core in its own process) | 205 | 146 | **143** |
| Worst spike (ms) | 540 | 28 | **23** |
| Cuts taken / 384 | 258 | 256 | **273** |
| Clean cuts / 384 | 129 | 114 | **121** |
| 60R per 8 over 96 | 6.67 | 6.25 | 6.50 |
| 60L per 8 over 96 | 5.42 | 5.42 | **6.25** |
| 90R per 8 over 96 | 5.33 | 5.08 | **5.67** |
| 90L per 8 over 96 | 4.08 | 4.58 | 4.33 |
| Decisive toe % | 8.5 % | 5.1 % | 5.9 % |
| ≥ 9 m/s decisive cut touches | 0 / 337 | 0 / 422 | 0 / 400 |
| Set-up attempts | 117 | 24 | 79 |
| Set-up success | 56 % | 75 % | 56 % |
| Straight control | 100 % | 100 % | 100 % |
| Immediate same-foot recontact | 0.10 % | 0.10 % | 0.10 % |

Clean cuts by direction (of 96):

| Core | 60R | 60L | 90R | 90L |
|---|---|---|---|---|
| D1.2 | 45 | 36 | 32 | 16 |
| D1.3 | 47 | 37 | 19 | 11 |
| D1.4 | 48 | 46 | 16 | 11 |

On seeds 1–8 alone, D1.4 gives 8 / 5 / 6 / 5 (60R / 60L / 90R / 90L).

## KNOWN EARLY-RELEASE CASE BEFORE/AFTER

90° right, seed 16:

| | D1.3 | D1.4 |
|---|---|---|
| Staged release | tick 552 | tick 541 (re-timed) |
| Stage touch | 639, L INSIDE, 6.33 m/s | 640, L INSIDE, 6.87 m/s |
| What follows | 750 left-toe recovery → loose → 1045 laces | final release at 789 (as D1.2) → 815 R OUTSIDE cut |
| Outcome | **lost** | **taken** |

D1.4 does not take it cleanly: its cut touch comes 5 ticks before DRIBBLE-1.2's and turns the ball less, so the ball is inside 20° only at 1.99 s.

Across the 384 runs, 163 outcomes changed between D1.3 and D1.4; 92 improved and 71 got worse. Classified by first changed decision:

| First changed decision | Better | Worse |
|---|---|---|
| Different contact opportunity (release window) | 40 | 37 |
| Planner-budget ordering | 30 | 17 |
| Set-up accepted | 19 | 15 |
| Set-up rejected | 1 | 0 |
| Better release timing | 1 | 0 |
| Different contact surface | 1 | 2 |

## BEST RECOVERED SETUP/CUT

60° left, seed 24:
- **The set-up proposed at 2.73 s** keeps a decisive contact in only 2 of its 6 execution variants. DRIBBLE-1.3's rule (≥ 5) refused it; it played a line touch and lost the cut.
- **Those two variants keep the full contact window,** so robustness is 0.33 and DRIBBLE-1.4 accepts it.
- **What follows:**
  1. the set-up at 5.7 m/s;
  2. the outside of the left foot at 3.25 s;
  3. clean, with the ball inside 20° at 1.06 s.

90° right, seed 66 has the same shape: robustness 0.33, then a set-up and the outside of the right foot, clean (1.38 s).

## WORST REMAINING FOUNDATION FAILURE

Clean 90° cuts. D1.4 takes 90° right more often than D1.2 (68 vs 64 of 96), but turns the ball slowly:
- median time to get the ball within 20° of the request: 2.14 s, against D1.2's 1.71 s;
- clean: 16 vs 32 of 96.

The gap first appeared in DRIBBLE-1.3 (19) and is present in every 1.3 / 1.4 configuration I ran tonight. It is not:
- planner latency (unbudgeted planning: 18 clean);
- the release lead (instant release: 13);
- release-first ordering (compare-all: 16).

It therefore comes from DRIBBLE-1.3's search semantics; the most likely suspects are its caps (below).

## THREE REMAINING LIMITATIONS THAT SHOULD BE LEFT FOR ATTRIBUTES/DEFENDERS RATHER THAN FIXED IN THE GENERIC PLAYER

1. **How sharp a 90° turn can be** once the foundation defect above is fixed. Agility, ball control and pressure should decide whether a player turns at 1.5 s or 2.0 s. The generic player should not be tuned toward 8 / 8.
2. **Preferred foot / weak foot.** The geometry picks the foot. Preferred-foot bias belongs to the attribute / utility layer, as instructed.
3. **Execution-error severity.** A −2σ touch still costs the ball, as in the known case at tick 639. Ball Control should scale σ through the `exec13` interface rather than the planner hiding it.

## RECOMMENDED NEXT STEP

**ONE MORE FOUNDATION FIX REQUIRED** — DRIBBLE-1.5, narrow in scope.

1. Restore, one at a time and under the budget, each of DRIBBLE-1.3's search caps to DRIBBLE-1.2's semantics:
   - the 3 set-up validations per search (`maxSetups`);
   - the release search stopping at its first valid plan (`rStop1`);
   - the cut-at-contact version (`c12CutAtContact`).
2. Run each on the 384-run matrix.
3. Adopt the one that brings clean 90° cuts back toward D1.2 (≈ 48 of 192), with these guardrails:
   - keep the 60° and cuts-taken gains;
   - CPU ≤ 170;
   - decisive toe ≤ 15 %.
4. Then freeze DRIBBLE-V1 and move to Dribbling / Ball Control / Agility attributes.

Everything else meets the stop conditions.
