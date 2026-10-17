# DRIBBLE-1.3 — Make DRIBBLE-1.2 fast without losing the football

17 Oct 2026 · branch `prototype/dribble-1` · core commit `54ff810d` · instruction `review_artifacts/dribble13/sources/2026-10-17_user_instruction_dribble1_3_fast_planner.md` (verbatim)

The local review page is `http://127.0.0.1:8361/review_artifacts/dribble13/review/DRIBBLE13_REVIEW.html`. It shows real player names in the lab labels, so it is local only and not published.

I cannot play video in real time; every visual judgement here comes from frame strips and stills extracted from the clips.

## What changed

DRIBBLE-1.2's football is kept as it is: its contact geometry, set-up touch, cut versions and follow-through code are unchanged. What changed is how much work it does and when it does it.

1. **Exact infrastructure** — bit-identical to DRIBBLE-1.2. With the planner in synchronous mode, the twin suite gives 200 / 200 runs identical to the recorded DRIBBLE-1.2 reference.
   - Each predicted tick keeps a state snapshot. Its pose is evaluated only when it is read.
   - **Leg-only pose (new).** TURN-1.2's pelvis and leg code is transcribed onto its exports. RUN-1's pelvis comes from `r1Pelvis`, exactly as `r1Pose` computes it. RUN-1's full body (whose legs TURN-1.2 then replaces) and the trunk, head and arms are no longer built for planning. Leg-chain-only FK follows.
     - 217,961 / 217,961 planner poses are bit-identical to `t1Pose` (`d13_legcheck.mjs pose`).
   - A time-warped swing leg runs TURN-1.2's swing branch alone: 18,112 / 18,112 bit-identical.
   - A checked pursuit correction's prediction becomes the main prediction at its switch tick, instead of being re-predicted.
   - RUN-1 / TURN-1 speed tables are solved at load. They caused 50–100 ms first-use spikes.
2. **Incremental planner.** DRIBBLE-1.2's planning pass becomes a resumable search.
   - **Budget.** Each tick, the search works until the tick's deterministic work units reach the budget: 2 ms a tick, or 8 ms while no plan is in force or a meaningful cut is held. A work unit is a counted primitive, with weights fitted to ≈ µs over 44k ticks. Counted primitives:
     - TURN-1.2 step / clone;
     - pose;
     - ball step;
     - contact geometry;
     - corridor;
     - hull gap;
     - follow-through row;
     - candidate generation.
   - **Invalidation.** The search is abandoned only when what it reads changed: the input, the ball (a launch or contact), or the last touch. The plan in force stays in force meanwhile.
   - **Release lead.** Release-now / staged options are evaluated for a release 24 ticks (100 ms) ahead, branched from the main prediction. A search that spans ticks therefore still releases exactly as evaluated.
   - **Installation.** A found plan is installed when its own deadline requires it (anytime), otherwise when the search ends. At installation, its warp is re-derived from the swing's current state and its approach re-checked.
   - **Prefetch.** Idle budget extends the prediction the next search will read.
3. **Broad / narrow.**
   - Broad phase:
     - release reach (the free ball is beyond the body's reach for the whole window → the turning motion is not predicted);
     - distance and yaw gates;
     - cheap rejections before the exact approach check.
   - Narrow phase, for survivors only:
     - exact contact geometry;
     - launch solving;
     - path checks.
4. **Set-up validated against the physical ball future.**
   - **The test.** For a set-up, BALL-PHYS simulates the planned launch and its execution envelope to the decisive tick:
     - speed ±1.5σ × direction ±1.5σ (4 corners);
     - lift ±1.5σ.
   - The decisive foot's exact nested search (DRIBBLE-1.2's: 8 tries, full horizon) must find a contact for ≥ 5 of the 6 envelope balls.
   - **Calibration** on DRIBBLE-1.2's own set-ups:
     - ≥ 5 / 6: 12 taken, 1 lost;
     - ≤ 4 / 6: 7 taken, 12 lost.
   - **Planning vs execution.** They stay separate: `exec13.sigma` / `exec13.envelope` is the interface where player attributes will set the envelope. Attributes are not implemented.

## What I measured

- **Football.** 384 cut runs per core: 60R / 60L / 90R / 90L × seeds 1–96, HIGH profile.
  - DRIBBLE-1.2 there means the synchronous planner, which is bit-identical to DRIBBLE-1.2.
  - Plus every lab scenario × 16 seeds.
- **CPU.** Each core in its own process, 20 scenarios × seeds 1–4.
  - The DRIBBLE-1.2 report's 253 ms / s came from running several cores in one process. That penalises every core (shared TURN-1.2 call sites, cross-core garbage).
  - I re-measured DRIBBLE-1 / 1.1 / 1.2 the same way.

Configurations I tried and rejected on football:
- a 2 ms flat budget: 83 / 192 taken vs 125;
- a 6 ms decision budget: 236 / 384 vs 258;
- release leads of 12 and 36 ticks;
- prefetch off: same rate, fewer clean cuts, slower redirect;
- reserving the clearance check's cost inside the tick budget: 238 / 384.

The football depends on how much work a decision tick gets.

## Status

- DRIBBLE-1.2 FOOTBALL FOUNDATION PRESERVED: **YES, statistically.**
  - Cuts taken: 256 / 384 vs DRIBBLE-1.2's 258 / 384.
  - Contact geometry code untouched (synchronous twin 200 / 200).
  - Per-cut rates within noise.
  - Cleanly-taken cuts lower: 114 vs 129.
- TURN-1.2 UNCHANGED: **YES.**
  - No TURN-1.2 file touched.
  - Stance foot / toe vs TURN-1.2's own pose: 0.0000 mm over 60,486 adjusted ticks.
  - Planner leg pose bit-identical (217,961 / 217,961).
- INCREMENTAL PLANNER: **YES**
- DETERMINISTIC WORK BUDGET: **YES.**
  - 2 ms a tick, 8 ms in decision ticks.
  - Planner work per tick: p99.9 10.2k units, max 14.5k (the clearance check after a full planner tick).
- FOOT PREDICTION CACHE: **YES.**
  - 75.5k tick reads / s served by 1.49k predicted ticks / s (98 %).
  - Main prediction kept or adopted 65.5 % (DRIBBLE-1.2 pass: 54.7 %).
- FOOT POSE CACHE: **YES.**
  - 48.2k pose reads / s served by 883 evaluated poses / s (98.2 %).
  - Every pose is now leg-only and exact. Pose cost 91.6 → 24.7 ms / s.
- BALL PREDICTION REUSE: **YES.**
  - Launch trajectories memoised: 52 % of requests reused.
  - One free-ball prediction per ball state.
- SETUP VALIDATED AGAINST PHYSICAL BALL FUTURE: **YES.**
  - Execution envelope of 6 BALL-PHYS balls; ≥ 5 must be reachable.
  - Set-ups used: 117 → 24 of 384 runs.
  - Cut taken after a set-up: 56 % → 75 %.
- 60° RIGHT / 60° LEFT / 90° RIGHT / 90° LEFT: **6/8 · 5/8 · 5/8 · 4/8** on seeds 1–8.
  - DRIBBLE-1.2: 7/8 · 6/8 · 5/8 · 5/8.
  - Over seeds 1–96: 6.3 · 5.4 · 5.1 · 4.6 per 8 (DRIBBLE-1.2: 6.7 · 5.4 · 5.3 · 4.1).
  - Targets: 90° right MET; 60° right, 60° left and 90° left NOT MET.
- STRAIGHT RUN CONTROL: **PASS** — 100 % controlled, held 16 / 16 (= DRIBBLE-1.2).
- DECISIVE CUT TOE RATE: **5.1 %** over the 384 runs (DRIBBLE-1.2 8.5 %).
  - 11 % over every cut scenario × 16 seeds (DRIBBLE-1.2 8 %).
  - Target ≤ 15 % MET.
- ≥9 M/S CUT TOUCHES: **0 of 422** cut / stage / decisive touches (DRIBBLE-1.2: 0 / 337).
  - Recovery touches ≥ 9 m/s after the request: 14 in 384 runs.
  - DRIBBLE-1.2: 6 in its 192 runs with roles recorded.
- SAME-FOOT IMMEDIATE RECONTACT: **0.10 %** — 2 / 1,978 launches (DRIBBLE-1.2: 2 / 1,951).
- D1.2 CPU / D1.3 CPU / CPU IMPROVEMENT: **208 / 148 ms per simulated second / −29 %.**
  - Target ≤ 170 MET.
  - Stretch ≤ 100 NOT MET.
- D1.2 WORST SPIKE / D1.3 WORST SPIKE: **538 ms / 41 ms.**
  - p99.9 step: 151 → 14 ms.
  - Steps over 20 ms: 1.0 % → 0.018 %.
- 1 ACTIVE DRIBBLER CPU / REALISTIC ACTIVE-SET CPU / ALL-22 PATHOLOGICAL CPU: **842 / 1,096 / 5,129 ms per simulated second.**
  - Measured with 22 players on one core.
  - DRIBBLE-1.2: 1,053 / 1,402 / 9,390.
- CHROME/NODE DETERMINISM: **PASS** — decisions 20 / 20 identical with the planner on.
- PHYSICAL INTERRUPTION: **YES** — INTERCEPT_RUN ball taken by the leg in 4 / 16 (= DRIBBLE-1.2).
- CONTROL LOSS POSSIBLE: **YES** — TACKLE_RUN held 3 / 16 (= DRIBBLE-1.2).
- READY FOR OWNER VISUAL REVIEW: **YES**
- READY FOR DRIBBLE-V1 INTEGRATION: **NOT YET.**
  - CPU and spikes are ready.
  - The football equals DRIBBLE-1.2 but misses three of the four X/8 targets.
  - Owner decision on the bar.

## Three videos to watch first

1. **`C1_cut90R_zoom.mp4`** — 90° right, seed 10 (zoomed camera). Both cores take it cleanly.
   - The BALL-PHYS check refused DRIBBLE-1.2's set-up.
   - DRIBBLE-1.3 instead touches once more with the outside of the right foot and cuts with the inside of the left foot.
2. **`e_setup_slow.mp4`** — a validated set-up: 60° right, seed 13, top camera, ¼ speed.
   - On screen:
     - the set-up target region;
     - the BALL-PHYS ball at the decisive tick (violet);
     - all six execution-envelope balls reachable (green).
   - Then the decisive outside of the right foot, 58° at 3.55 s.
3. **`C2_cut90R_worst_zoom.mp4`** — the worst remaining cut: 90° right, seed 16.
   - The same staged inside-of-left release lands one tick earlier.
   - From there DRIBBLE-1.3 makes a toe touch; the ball goes loose at 3.38 s and is recovered, but the decisive laces touch is off the line.
   - DRIBBLE-1.2 takes this cut cleanly.

## D1.2 vs D1.3 performance table

| | DRIBBLE-1 | DRIBBLE-1.1 | DRIBBLE-1.2 | DRIBBLE-1.3 |
|---|---|---|---|---|
| Average resolver CPU (ms / sim s) | 472.1 | 165.5 | 208.0 | **147.6** |
| Worst spike (ms) | 2,112 | 380 | 538 | **40.7** |
| p99.9 step (ms) | 294 | 116 | 151 | **14.2** |
| Plans / s | — | 7.6 | 7.7 | 8.0 (jobs) |
| Exact contact evaluations / s | 82,784 | 5,828 | 5,405 | 4,975 |
| Straight control (STRAIGHT_RUN) | 99 %, 14/16 | 90 %, 13/16 | 100 %, 16/16 | 100 %, 16/16 |
| 60° right, seeds 1–8 · rate / 8 over 1–96 | 5/8 | 4/8 | 7/8 · 6.7 | 6/8 · 6.3 |
| 60° left | 3/8 | 5/8 | 6/8 · 5.4 | 5/8 · 5.4 |
| 90° right | 1/8 | 2/8 | 5/8 · 5.3 | 5/8 · 5.1 |
| 90° left | 2/8 | 4/8 | 5/8 · 4.1 | 4/8 · 4.6 |
| Decisive toe (cut scenarios × 16 seeds · 384 four-cut runs) | 55 % | 88 % | 8 % · 8.5 % | 11 % · 5.1 % |

With σ ≈ 3–5 runs per 8-seed block, seeds 1–8 alone cannot separate DRIBBLE-1.2 from DRIBBLE-1.3. Over 96 seeds per cut, they differ by −5 / 0 / −3 / +6 runs, within noise (σ ≈ 4–5).

## CPU profile before/after

Every scenario × 2 seeds, self time in ms per simulated second. These figures include the profiler's own overhead (≈ 20–25 %).

| Subsystem | DRIBBLE-1.2 | DRIBBLE-1.3 |
|---|---|---|
| TURN-1.2 prediction | 89.7 | 97.1 |
| Poses | 91.6 | 24.7 |
| Contact geometry | 23.2 | 9.4 |
| Ball prediction | 21.0 | 19.5 |
| Path checks | 18.8 | 12.2 |
| Launch solve | 3.7 | 2.4 |
| Clearance | 2.2 | 3.0 |
| Everything else | 7.9 | 11.9 |
| **Total profiled** | **258.4** | **180.1** |

Primitives per second:

| Primitive | DRIBBLE-1.2 | DRIBBLE-1.3 |
|---|---|---|
| TURN-1.2 predicted ticks | 1,428 | 1,492 |
| Full poses | 1,251 (+ 1,278 full-skeleton FKs) | 0 (811 leg-only) |
| Contact geometry | 5,405 | 4,975 |
| Ball steps | 10,896 | 9,991 |

The largest cost is now TURN-1.2 prediction itself (frozen). It mostly re-predicts the main motion after each pursuit re-aim, a DRIBBLE-1.2 behaviour.

## Cache hit-rate table

The DRIBBLE-1.2 pass column is DRIBBLE-1.2's synchronous pass run on the 1.3 infrastructure; the frozen DRIBBLE-1.2 core has no counters.

| Cache | DRIBBLE-1.2 pass | DRIBBLE-1.3 |
|---|---|---|
| Foot prediction: tick reads / s · predicted ticks / s · hit rate | 33.9k · 1,237 · 96.4 % | 75.5k · 1,492 · 98.0 % |
| Main prediction: kept · adopted · new (reuse) | 142 · 119 · 216 (54.7 %) | 132 · 215 · 183 (65.5 %) |
| Foot poses: reads / s · computed / s · hit rate | 79.1k · 921 · 98.8 % | 48.2k · 883 · 98.2 % |
| Warped swing poses: requests · memo hits · computed | 757 · 413 · 260 | 265 · 173 · 72 |
| Launch trajectories: requests / s · reuse | 170 · 56.5 % | 134 · 52.3 % |
| Plan versions: reused · evaluated · reuse | — | 4.0 · 4.6 · 46.2 % |
| Candidate generations reused | 61.3 % | 64.5 % |
| Broad-phase rejections / s · exact contact geometry / s | 975 · 5,371 | 1,005 · 4,975 |

## Best 60° cut

CUT60_RUN, seed 16. Both cores take it cleanly with the inside of the left foot, at 6.2 m/s. The ball is within 20° 0.43 s after the request.

DRIBBLE-1.3's release-now contact is one tick earlier: its release is planned 100 ms ahead. Videos: `A1_cut60R_1x` and `A1_cut60R_zoom`.

## Best 90° cut

CUT90_RUN, seed 10. DRIBBLE-1.3 takes it cleanly with the inside of the left foot, at 6.4 m/s, with the first ≥ 20° redirect at 0.80 s.

- DRIBBLE-1.2 planned a set-up here with the outside of the right foot.
- DRIBBLE-1.3's BALL-PHYS check refused that set-up; the twin suite logs it as "set-up rejected".
- DRIBBLE-1.3 touched with the outside of the right foot 13 ticks later as an ordinary dribble, then cut with the inside of the left foot.

Both end controlled; ball within 20° at 1.28 s (DRIBBLE-1.2) and 1.63 s (DRIBBLE-1.3). Videos: `C1_cut90R_1x` and `C1_cut90R_zoom`.

## Best setup-touch example

CUT60_RUN, seed 13 (DRIBBLE-1.3).

1. **The plan.** The set-up is the outside of the right foot at 3.06 s, 9° at 5.9 m/s. The intended target is the decisive corridor at (32.04, −34.67) at 3.52 s.
2. **The validation.**
   - BALL-PHYS ball for the planned launch at the decisive tick: (32.16, −34.69).
   - All 6 envelope balls are reachable; worst corridor margin +0.7 cm.
3. **The execution.**
   - Executed at 5.88 m/s.
   - The executed-launch prediction (32.15, −34.68) is 1 cm from the planned one, and 0 cm from the actual ball.
4. **The result.** The decisive touch comes 2 ticks after the planned one: outside of the right foot, 58°, cut taken.

Videos: `e_setup_slow` and `e_setup_game`; stills: `stills/e_setup_cut60_s13_strip.jpg`.

Over seeds 1–16:

| | Set-ups | Planned decisive executed | Cut taken afterwards |
|---|---|---|---|
| DRIBBLE-1.3 | 4 | 3 | 3 |
| DRIBBLE-1.2 | 20 | 13 | 12 |

The one DRIBBLE-1.3 set-up that failed (60° left, seed 7) had 5 / 6 envelope balls reachable. Its slow-right corner was out, and the next touch never came.

## Worst remaining cut

CUT90_RUN, seed 16. The run as DRIBBLE-1.3 plays it:

1. DRIBBLE-1.2's staged inside-of-left release is planned identically, but contacts one tick earlier (639 vs 640) because of the release lead.
2. About half a second later DRIBBLE-1.3 makes a left toe touch; the ball is LOOSE at 3.38 s.
3. It is recovered.
4. The decisive touch is with the laces, off the line: the cut is not taken.

DRIBBLE-1.2 takes this cut cleanly with the outside of the right foot. Videos: `C2_cut90R_worst_1x` and `C2_cut90R_worst_zoom`.

Across the 200-run twin suite, the first changed decision was:

| First changed decision | Runs |
|---|---|
| Search order / budget | 118 |
| Release lead | 48 |
| No changed decision at all | 23 |
| Same plan, later | 6 |
| Set-up rejected | 5 |

## Three biggest remaining V1 defects

1. **The cut rates are DRIBBLE-1.2's, not the targets.** Over 96 seeds: 90° right 5.1 / 8, 90° left 4.6 / 8, 60° left 5.4 / 8. DRIBBLE-1.3 made DRIBBLE-1.2 fast; it did not make it better.
2. **Fewer clean cuts and a slower ball redirect.**
   - Cleanly taken: 114 vs 129 of 384.
   - Ball within 20°: 1.62 vs 1.40 s (median).
   - The two logged causes are the 100 ms release lead and the stricter set-up check, which refuses set-ups that sometimes made a cut clean.
3. **Worst-case CPU.**
   - CUT90_RUN and REV180_SPRINT still cost 270–280 ms / s.
   - A full 8 ms decision tick plus the clearance check runs 10–25 ms. Rarer 40–100 ms steps did not recur on the same ticks (GC pauses ≤ 3.5 ms; machine scheduling).
   - In a match, the other 21 players' plain TURN-1.2 locomotion (≈ 530 ms / s) now costs more than the dribbler's resolver.

## Exact next shipping step

The owner decides the football bar.

- **If DRIBBLE-1.2's football is the bar:** integrate DRIBBLE-1.3 into DRIBBLE-V1 behind the active-set gate.
  - Only the ball carrier and a contest participant run the resolver.
  - Budget 2 / 8 ms.
- **If the X/8 targets stand:** the next step is football, not CPU — DRIBBLE-1.4 on the 90° / 60°-left failure classes (late laces contacts after staged releases), measured on 96 seeds against this core.
