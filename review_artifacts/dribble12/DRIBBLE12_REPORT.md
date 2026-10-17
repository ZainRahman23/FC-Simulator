# DRIBBLE-1.2 — Cut contact geometry / set-up touch

17 Oct 2026 · branch `prototype/dribble-1` · instruction `review_artifacts/dribble12/sources/2026-10-17_user_instruction_dribble1_2_cut_contact_geometry_setup_touch.md` (verbatim)

The local review page is `http://127.0.0.1:8361/review_artifacts/dribble12/review/DRIBBLE12_REVIEW.html`. It shows real player names in the lab labels, so it is local only and not published.

I cannot play video in real time; every visual judgement here comes from frame strips and stills extracted from the clips.

## What changed

DRIBBLE-1.1's diagnosis was right: the ball arrived at the cut in the wrong geometry. DRIBBLE-1.2 fixes the geometry, not the follow-through.

1. **Side surfaces that can actually strike.**
   - INSIDE / OUTSIDE now strike with whichever forefoot hull reaches the ball first along the contact normal: the boot or the toe box. The other hull must stay clear, which is the kernel's contested-contact rule.
   - DRIBBLE-1 / 1.1 tied the side surfaces to the boot hull alone. A ball beside the forefoot was therefore always rejected, because the toe box touched it first. That is why not one of 1,574 DRIBBLE-1.1 touches used the outside.
2. **Impulse-normal contact.**
   - The boot faces the direction of the impulse that turns the incoming ball into the launch, n = horizontal(s·u − v_in), not the launch direction itself.
   - Only this way is a 60–90° redirect of a rolling ball geometrically consistent.
3. **Future contact corridor.** It is built for each predicted swing pose of the upcoming TURN-1.2 foot, using exact poses of the time-warped foot at the true body state.
   - For each surface, impulse normal and elevation, the feasible ball centres form a convex set: box ∩ unwind disk ∩ reach disk.
   - Its max-margin centre is the target.
   - It is validated against the per-ball contact check.
4. **Set-up touch.** A real launch through the same authoritative interface; nothing places or guides the ball.
   - The set-up sends the free ball into the corridor of a turning swing's inside / outside.
   - The turn is released at that foot's touchdown.
   - The set-up is accepted only if its decisive contact exists in the switched motion (two-touch validation).
   - After the set-up, that decisive contact is tried first.
5. **Cut versions.** Each candidate contact is evaluated in three versions:
   - cut / stage at contact;
   - set-up with the switch at touchdown;
   - release-now: the body turns now and this touch takes the ball through.

   Rules and value:
   - Cuts ≥ 75° may stage the release-now: the body turns half way, and the rest stays held for the next touch.
   - A full release-now must take ≥ 30° of the turn.
   - Plan value = remaining turn² + time.
6. **Toe re-contacts fixed at the root.**
   - The cause: a held-back foot's pose was read from before its prediction began. The clearance check then saw a false collision, and its avoidance drove the foot into the ball.
   - All follow-through, clearance and approach checks now use exact time-warped poses.
   - Side-foot touches sweep across the ball.
7. **Unchanged.**
   - TURN-1.2: plants, cuts, root trajectory and footfalls.
   - BALL-PHYS / BALL-FEEL-1.3.
   - One authoritative impulse per touch.
   - The free ball between touches.

## Status

| Item | Status |
|---|---|
| DRIBBLE-1 FOUNDATION PRESERVED | **YES** |
| TURN-1.2 UNCHANGED | **YES** |
| RESOLVED TOUCH ARCHITECTURE UNCHANGED | **YES** |
| SETUP TOUCH SYSTEM | **PARTIAL** |
| FUTURE CONTACT CORRIDOR | **PASS** |
| GENUINE OUTSIDE-FOOT CUT CONTACT | **PASS** |
| INSIDE-FOOT CUT CONTACT | **PASS** |
| CUT FRONT-OF-BOOT RATE | **8 %** |
| 60° RIGHT TAKEN-WITH-BALL | **7/8** |
| 60° LEFT TAKEN-WITH-BALL | **6/8** |
| 90° RIGHT TAKEN-WITH-BALL | **5/8** |
| 90° LEFT TAKEN-WITH-BALL | **5/8** |
| STRAIGHT RUN CONTROL | **100 %** |
| SAME-FOOT IMMEDIATE RE-CONTACT | **0.06 %** |
| PREFERRED FOOT BIAS | **FAIL** |
| PHYSICAL INTERRUPTION | **PASS** |
| CONTROL LOSS POSSIBLE | **YES** |
| AVERAGE RESOLVER CPU | **253 ms per simulated second** |
| WORST PLANNING SPIKE | **604 ms** |
| CHROME/NODE DETERMINISM | **PASS** |
| READY FOR OWNER VISUAL REVIEW | **YES** |
| READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES | **NO** |

Detail for each item:

- **DRIBBLE-1 FOUNDATION PRESERVED: YES**
  - DRIBBLE-1 (7fe57fd3) and DRIBBLE-1.1 (7d8c8524) files are untouched.
  - DRIBBLE-1.2 with its feature flags off is bit-identical to DRIBBLE-1 in 40/40 runs: every scenario × 2 seeds, every touch, kernel event, cut timeline, control change and 240 Hz record.
- **TURN-1.2 UNCHANGED: YES**
  - No locomotion file changed.
  - At 30,692 adjusted ticks the stance foot / toe equals TURN-1.2's own pose (max 0.0000 mm); unadjusted swing feet 0.0000 mm.
- **RESOLVED TOUCH ARCHITECTURE UNCHANGED: YES**
  - One authoritative impulse per touch through BALL-FEEL-1.3's launch interface; the kernel is untouched.
  - The ball is free between touches.
- **SETUP TOUCH SYSTEM: PARTIAL**
  - Physical set-ups with no placing, used in 25–38 % of cuts: about 6 m/s, 14–21° off the line, 0.53 s after the request (median).
  - 14 of 24 set-ups end with the cut taken (9 cleanly); 10 lose the ball.
  - Set-ups are validated on the nominal ball. In the traced failures, the executed set-up left the decisive contact unsolvable.
- **FUTURE CONTACT CORRIDOR: PASS**
- **GENUINE OUTSIDE-FOOT CUT CONTACT: PASS** — 41 % of cut / stage touches and 45 % of decisive cut touches are OUTSIDE (DRIBBLE-1.1: 0 %).
- **INSIDE-FOOT CUT CONTACT: PASS** — 39 % of cut / stage touches and 36 % of decisive cut touches (DRIBBLE-1.1: 3 % / 4 %).
- **CUT FRONT-OF-BOOT RATE: 8 %** of decisive cut touches (DRIBBLE-1.1 88 %, DRIBBLE-1 55 %).
  - Cut / stage touches: 8 % (1.1: 94 %).
  - All touches in cut scenarios: 51 % (1.1: 96 %).
- **Taken-with-ball** (seeds 1–8; 16-seed results in brackets):

  | Cut | Taken (16 seeds) | Cleanly (1–8 · 1–16) | DRIBBLE-1.1, seeds 1–8 |
  |---|---|---|---|
  | 60° right | 7/8 (14/16) | 6/8 · 9/16 | 4/8 |
  | 60° left | 6/8 (14/16) | 3/8 · 8/16 | 5/8 |
  | 90° right | 5/8 (12/16) | 4/8 · 9/16 | 2/8 |
  | 90° left | 5/8 (9/16) | 2/8 · 4/16 | 4/8 |

  60° left misses the 7/8 target.
- **STRAIGHT RUN CONTROL: 100 %**
  - 16/16 held to the end (DRIBBLE-1.1: 90 %, 13/16).
  - JOG 100 % (16/16); FAST 98.7 % (15/16).
- **SAME-FOOT IMMEDIATE RE-CONTACT: 0.06 %** — 1 of 1,647 touches (DRIBBLE-1.1: 1.1 %, 17 of 1,574).
- **PREFERRED FOOT BIAS: FAIL**
  - The right-footed elite uses the right foot for 53 % of straight, 42 % of curve, 48 % of 60° and 36 % of 90° touches.
  - A stronger preference cost cuts (41 → 30 of 64) and was reverted.
- **PHYSICAL INTERRUPTION: PASS** — the tackle leg reaches the ball physically in 13/16 TACKLE_RUN runs and wins it every time; interceptions in 4/16 INTERCEPT_RUN runs.
- **CONTROL LOSS POSSIBLE: YES**
  - Failed cuts lose the ball.
  - 257,196 free-ball ticks match a collider-free re-simulation. The single exception is 0.26 mm of contact persistence after a 14-tick toe contact, not a tether.
- **AVERAGE RESOLVER CPU: 253 ms per simulated second**, all 20 scenarios.
  - Same process: DRIBBLE-1.1 168, DRIBBLE-1 539.
  - Straight 112 (1.1: 114); cuts 303 (1.1: 207).
- **WORST PLANNING SPIKE: 604 ms** — one pass at the 90° left request (DRIBBLE-1.1: 424 ms). The p99 step is 24 ms.
- **CHROME/NODE DETERMINISM: PASS** — decisions identical in 20/20 scenarios; state differs only in the last bits (≤ 2.8e-12).
- **READY FOR OWNER VISUAL REVIEW: YES**
- **READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES: NO** — resolver CPU (253 ms/s, spikes to 0.6 s) must be bounded first.

**Stop condition.**

Met: items 1–7, 9–11, 14 and 15.

Not met:
- **8:** 60° left is 6/8.
- **12:** the CPU improvement is not preserved: 168 → 253 ms/s.
- **13:** spikes are not reduced: 424 → 604 ms.

I stopped for review rather than tuning further. The cut outcomes respond chaotically to planner parameters. For example, a 12-tick hold re-plan fixes CUT60_RUN_FAR (12/16) but drops 60° right to 5/8 on seeds 1–8. The CPU problem needs a planner restructure, not a knob (see the next step).

## Three videos to watch first

1. `videos/C1_cut90R_1x.mp4` — 90° right, seed 2, DRIBBLE-1 | 1.1 | 1.2 at 1×.
   - DRIBBLE-1 and 1.1 lose the ball.
   - DRIBBLE-1.2 sets it up with the outside of the right foot (20°, 6.0 m/s), then takes it through 94° with the inside of the left foot.
2. `videos/e_outside_hero_slow.mp4` — the outside-foot hero at 0.25× with the geometry overlay.
   - Set-up: inside of the left foot, 17°.
   - TURN-1.2 plant.
   - Decisive: outside of the right foot, 60°, 8.7 m/s.
3. `videos/A1_cut60R_1x.mp4` — 60° right, seed 16, DRIBBLE-1 | 1.1 | 1.2 at 1×.
   - DRIBBLE-1 loses it.
   - DRIBBLE-1.1 takes it with toe pushes.
   - DRIBBLE-1.2 takes it at +0.43 s with the inside of the left foot (61°).

## Best outside-foot cut

**CUT60_RUN seed 3** (`e_outside_hero_*`, `stills/strip_e_outside_cut60_s3.jpg`). The request is at 2.20 s.

| Time after request | Event |
|---|---|
| +0.49 s | Set-up: inside of the left foot, 17°, 5.9 m/s |
| +0.92 s | TURN-1.2 plant |
| +1.23 s | Outside of the right foot, 60°, 8.7 m/s |

- Boot clearance after the launch is at least 45 mm.
- The ball is within 20° of the request at +1.23 s; taken cleanly.
- In the strip the foot lands on TURN-1.2's landing ring just behind the departing ball.

## Best inside-foot cut

**CUT60L_RUN seed 11** (`f_inside_hero_*`, `stills/strip_f_inside_cut60L_s11.jpg`).

| Time after request | Event |
|---|---|
| +0.13 s | Release-now: inside of the right foot, −31°, 6.1 m/s |
| +0.30 s | Plant |
| +0.69 s | Inside again, −61°, 7.8 m/s |

The ball is within 20° at +0.70 s; taken cleanly.

## Best 90° cut

**CUT90_RUN seed 2** (`C1` / `C2`).

| Time after request | Event |
|---|---|
| +0.15 s | Set-up: outside of the right foot, 20°, 6.0 m/s |
| +0.62 s | Plant |
| +1.05 s | Inside of the left foot, 94°, 6.1 m/s |

DRIBBLE-1 and 1.1 lose the ball on this seed. The 90° left runner-up is CUT90L seed 14: staged outside −35°, then inside of the right foot −88°, ball within 20° at +1.23 s.

## Set-up touch before / after

DRIBBLE-1 and 1.1 had no set-up: the decisive foot had to take the ball wherever it was.

**DRIBBLE-1.2 (16 seeds):**

| Scenario | Set-up used | Set-up speed (mean) | Ball off its target at the decisive contact (median) | Taken after set-up |
|---|---|---|---|---|
| CUT45 | 4/16 | 6.2 m/s | 0.15 m | 2 |
| CUT60 | 5/16 | 6.6 m/s | 0.25 m | 3 |
| CUT60L | 4/16 | 6.0 m/s | 0.46 m | 2 |
| CUT90 | 5/16 | 5.7 m/s | 0.12 m | 3 |
| CUT90L | 6/16 | 5.8 m/s | 0.18 m | 4 |

The first touch after the request was already the decisive one in 63 % of CUT45 runs (DRIBBLE-1.1: 13 %).

Timing, median request → event in the five cut scenarios:

| Event | DRIBBLE-1 | DRIBBLE-1.1 | DRIBBLE-1.2 |
|---|---|---|---|
| Set-up | — | — | 0.53 s |
| First redirect ≥ 20° | 1.45 s | 1.98 s | 0.83 s |
| TURN-1.2 plant | 1.56 s | 2.16 s | 0.92 s |
| Ball within 20° | 1.92 s | 2.30 s | 1.23 s |

Stills: `strip_e_setup_cut60_s3.jpg` is the set-up; `strip_e_outside_cut60_s3.jpg` is the decisive touch it set up.

## Contact distribution straight vs cuts

HIGH profile, 16 seeds:

| Core | Straight, all touches | Cut scenarios, all touches | Decisive cut touch |
|---|---|---|---|
| DRIBBLE-1 | FRONT 100 % | FRONT 87 · INSIDE 5 · LACES 8 % | FRONT 55 · INSIDE 19 · LACES 26 % |
| DRIBBLE-1.1 | FRONT 97 · LACES 3 % | FRONT 96 · INSIDE 2 · LACES 2 % | FRONT 88 · INSIDE 4 · LACES 8 % |
| DRIBBLE-1.2 | FRONT 72 · OUTSIDE 25 · LACES 3 % | FRONT 51 · OUTSIDE 34 · INSIDE 12 · LACES 3 % | **FRONT 8 · OUTSIDE 45 · INSIDE 36 · LACES 11 %** |

Cut / stage touches in DRIBBLE-1.2: FRONT 8, OUTSIDE 41, INSIDE 39, LACES 13 % (n 106).

Preferred (right) foot share, straight · curve · 60° · 90°:
- DRIBBLE-1: 54 · 48 · 53 · 46 %
- DRIBBLE-1.1: 51 · 42 · 48 · 37 %
- DRIBBLE-1.2: 53 · 42 · 48 · 36 %

## Cut touch speed 1 → 1.1 → 1.2

Cut / stage touches, all cut scenarios, 16 seeds:

| Core | Mean | Median | Touches ≥ 9 m/s |
|---|---|---|---|
| DRIBBLE-1 | 6.33 m/s | 6.09 m/s | 8 of 104 |
| DRIBBLE-1.1 | 6.63 m/s | 6.77 m/s | 8 of 213 |
| DRIBBLE-1.2 | 5.93 m/s | 6.36 m/s | 0 of 106 |

DRIBBLE-1.2's decisive cut touches average 6.6–7.5 m/s depending on the scenario.

## Request-to-redirection time 1 → 1.1 → 1.2

Median time from the request to the first meaningful redirect (≥ 20°): **1.45 s → 1.98 s → 0.83 s**.

To the ball within 20° of the request: **1.92 s → 2.30 s → 1.23 s**.

## CPU 1 → 1.1 → 1.2

One dribbler + ball; all 20 scenarios × 2 seeds; the three cores in one process (Node v22.19.0).

| Measure | DRIBBLE-1 | DRIBBLE-1.1 | DRIBBLE-1.2 |
|---|---|---|---|
| Resolver, ms / simulated s | 539 | 168 | **253** |
| … straight | 233 | 114 | 112 |
| … cuts | 557 | 207 | 303 |
| µs / 240 Hz step | 2,246 | 699 | 1,053 |
| Worst single step | 2,419 ms | 424 ms | **604 ms** |
| p99 · p99.9 step | 28.6 · 368 ms | 10.3 · 120 ms | 24.4 · 177 ms |
| Steps over 20 ms | 1.07 % | 0.86 % | 1.06 % |
| 22 players, one dribbler (ms / sim s) | 1,266 | 894 | 987 |

Where the extra cut cost goes:
- exact time-warped foot poses for every approach / follow-through / clearance check (the re-contact fix);
- the release-now and staged motions, each a fresh TURN-1.2 prediction per pass;
- the set-ups' two-touch validation.

Time-sliced planning (a fixed per-tick work budget) is implemented but **off**: deferring decisions cut cuts taken from 49 to 21 of 64.

Only the active set plans. In a 22-player match with one dribbler, the resolver is 26 % of the 987 ms of one core per simulated second.

## Three biggest remaining V1 defects

1. **Planning cost.** The average is 253 ms/s, and single passes reach 0.6 s at cut requests. That is unshippable inside a match frame budget, and time-slicing as built costs cuts. This is the integration blocker.
2. **Set-up fragility and the remaining cut failures.**
   - Set-ups are validated on the nominal ball, and 10 of 24 end with the ball lost.
   - 60° left is 6/8 and 90° left 9/16.
   - CUT60_RUN_FAR regressed to 9/16 (1.1: 13/16). The cut is requested while still chasing the ball, and the first touch becomes an 8.6–9.8 m/s recovery push.
   - REV180_SPRINT holds 0/16 (1.1: 5/16; out of scope, regression noted).
3. **Front of the boot on straight running, and no foot preference.**
   - 72 % of straight touches are still toe pushes (25 % outside).
   - The right-footed elite uses the right foot for only about 50 % of touches, and 36 % in 90° cuts.

## Exact next shipping step

**DRIBBLE-1.3 — bounded planner.** Keep DRIBBLE-1.2's contact geometry and set-up logic, and make planning anytime and bounded:

1. A per-tick budget (≤ 2 ms) that always holds the best plan so far: the current plan is never dropped while a better one is searched.
2. One shared switched TURN-1.2 prediction per swing (switch at touchdown), reused by the release-now, staged and set-up versions instead of fresh tracks per pass.
3. Exact time-warped poses cached per (track, tick, foot, phase bucket 0.01), so approach, follow-through and clearance share them.
4. Set-ups validated at ±1σ of their own execution error, and only for the decisive contact's existence.

Targets: ≤ 170 ms/s average, no step > 20 ms, and cuts no worse than DRIBBLE-1.2's 49 of 64 (16 seeds).

## Notes

- **Erratum** (`review_artifacts/dribble11/DRIBBLE11_ERRATUM_1.md`): DRIBBLE-1.1 said the left-footed elite took the right 60° cut "on the inside of its preferred foot". The evidence shows toe (FRONT) touches: 39 of 40.
- **Free-ball audit.** The one deviation (0.26 mm, position only) is in CUT90L_RUN seed 5, two ticks after a 14-tick right-toe contact, while the pressed ball rises back to its radius.
- **Plant check.** An adjusted swing's last airborne tick is at most 12.5 mm from TURN-1.2's landing pose (1.1: 4.1 mm): the offset unwinds at its maximum rate up to touchdown. The stance foot is exactly TURN-1.2's.
- **CUT60_RUN_FAR bisect** over the WIP commits: f141d948 12/16 → e9de0676 (safe pursuit) 10/16 → 4c354362 (hold re-plan 24 ticks, cut windows 1.3 s) 9/16.
- **Commits since 7d8c8524:** a883739b, 16c9de28, a5b9808a, f141d948, e9de0676, 4c354362, 6c872a6d, cc87c925, 39b733ba, d572960d, 47e48520, plus the review package.
