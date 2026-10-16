# DRIBBLE-1 — final report (stopped for owner visual review)

## The review package

- **Branch:** `prototype/dribble-1`
- **Review page (local only — it shows real player names):** `review_artifacts/dribble1/review/DRIBBLE1_REVIEW.html`
- **Serving:** run `python3 -m http.server 8361` from the dribble-1 worktree root, then open http://127.0.0.1:8361/review_artifacts/dribble1/review/DRIBBLE1_REVIEW.html
- **Live lab:** http://127.0.0.1:8361/sandbox/visual/dribble1.html
- **Handoff:** `DRIBBLE1_HANDOFF.md`
- **Evidence:** `evidence/`
- **Videos:** `videos/` (42 clips)

I cannot play video in real time. I judged the clips from frame strips and stills.

## How the numbers were measured

- **Default setup:** HIGH profile (players.json), resolved touches (B), seeds 1–8, unless noted.
- **"Controlled":** the share of time classified CONTROLLED after the first touch.
- **"Taken with the ball"** (direction changes): the turn was released by a touch, the final heading is within 20° of the request, and the ball is under control at the end.
  - This measure was added late. The CONTROLLED share alone was misleading: it stays high when the player never takes a held cut and simply keeps running straight with the ball.

## Status

```
TURN-1.2 FROZEN BASELINE PRESERVED: YES
BALL-PHYS FOUNDATION RECONSTRUCTED: YES
BALL-FEEL VERSION USED: BALL-FEEL-1.3 — Codex lab prototype/ball-feel-1-3 @ 75866e99 (ballfeel13 BallWorld), byte-identical (23 files)
TOUCH ARCHITECTURE SELECTED: RESOLVED
NO BALL TETHER: PASS
JOG STRAIGHT DRIBBLE: PASS
RUN STRAIGHT DRIBBLE: PASS
SPRINT STRAIGHT DRIBBLE: PARTIAL
GENTLE CURVE DRIBBLE: PASS
45–60° CUT DRIBBLE: PARTIAL
90° CUT DRIBBLE: PARTIAL
135° DRIBBLE: FAIL
180° DRIBBLE: FAIL
BALL PHYSICALLY FREE BETWEEN TOUCHES: YES
TOUCH CONTACT ALIGNMENT: PASS
FOOT SELECTION: PARTIAL
CONTROL LOSS POSSIBLE: YES
PHYSICAL INTERCEPTION: PASS
ATTRIBUTE DIFFERENTIATION: PASS
CONTINUOUS INPUT: PARTIAL
NO DOUBLE IMPULSE: PASS
DETERMINISM: PASS
CPU VIABLE FOR MATCH-SCALE DEVELOPMENT: PARTIAL
READY FOR OWNER VISUAL REVIEW: YES
READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES: NO
```

## What backs each line

### Baselines and ball

- **TURN-1.2:**
  - The branch descends from tag `locomotion-turn12-baseline-1` (2129ca04) and only adds files.
  - The six frozen sources match `TURN12_FREEZE_MANIFEST.tsv` (sha256).
  - `git diff` from the tag over `turn1/`, `run1/` and `anim3d/` is empty.
- **Ball:** 23 files are byte-identical to 75866e99; each was checked against the manifest's sha256 and against `git show`. Nothing in the ball was tuned.

### No tether and a free ball

- **Free-ball audit.** After every launch and every body contact, the live ball is re-simulated in a fresh BallWorld with no colliders.
  - Over 128,650 free-ball ticks (20 scenarios × 4 seeds) there are **0 unexplained deviations**.
  - **2 ticks** deviate by about 0.4 mm. Each is the tick right after an unplanned body contact: the ball is still resting on that boot or thigh, and the kernel resolves it without an impulse event. That is physics, not a correction.
- **Static guarantee.** The dribble code never writes the ball's state. It only:
  - sets collider frames;
  - schedules one launch per touch through the kernel's validated `schedule()`.

### Straight and curve

| Scenario | Controlled | Held to the end |
|---|---|---|
| Straight JOG | 100 % | 8/8 |
| Straight RUN | 97 % | 6/8 |
| Straight FAST | 100 % | 8/8 |
| Straight SPRINT | 88 % | 6/8 (2 losses in 8 s with no opponent → PARTIAL) |
| Curve RUN | 96 % | 7/8 |
| Curve JOG | 95 % | 7/8 |

### Cuts and reversals (turn taken with the ball)

| Turn | Taken with the ball | First cut touch after the request |
|---|---|---|
| 45° | 5/8 | 1.2 s |
| 60° | 5/8 | 1.3 s |
| 60° left | 3/8 | |
| 90° | 1/8 | |
| 90° left | 2/8 | |
| 90° at JOG | 2/8 | |
| 135° | 0/8 | |
| 180° from SPRINT | 0/8 | |

When a cut works, it looks right: the ball is redirected 30–62° by one touch and the next touch completes the turn. Too few cuts work.

### Contact, foot selection and control

- **Touch contact alignment:**
  - Every authoritative launch fires at the contact tick, with the striking hull 3.0 mm from the ball.
  - The close-ups show the boot meeting the ball at the launch.
  - The plant is never moved: 0 mm over 26,076 adjusted ticks.
- **Foot selection:**
  - Both feet's real swing opportunities compete. The cost includes preferred / weak foot, region, reach and continuity with the window the last launch aimed at.
  - Preference is weak in practice. The right-footed HIGH player makes only 31–59 % of RUN / FAST touches with the right foot, because window continuity outweighs it.
  - Regions are almost all FRONT on straight lines; inside / laces appear only in cuts.
- **Control loss:**
  - It happens in curves, cuts and sprint, and to POOR players on straight lines.
  - Firm recovery touches (9–10 m/s) send the ball away.

### Interception

- **Defender leg** (prescribed sweep) and **sliding tackle** (prescribed slide): both are ordinary BallWorld colliders.
- Whenever they meet the ball, it is knocked loose and is never restored:
  - interception: 2 of 8 seeds contact the ball;
  - tackle: 6 of 8 seeds contact the ball.

### Attributes (straight RUN / 60° cut, controlled %, speed error)

| Profile | Straight RUN | 60° cut | Touch error |
|---|---|---|---|
| HIGH | 97 | 86 | 1.75 % |
| AVERAGE | 79 | 63 | 1.87 % |
| POOR | 43 | 40 | 4.13 % |
| WEAKFOOT | 72 | 65 | 4.0 % |

At SPRINT the profiles do not separate yet: AVERAGE 90, HIGH 88.

### Continuous input

- **Cancel** (90° requested, cancelled 0.1 s later): 94 % controlled, held to the end in 7/8.
- **Retarget** (60° right changed to 60° left): taken with the ball 1/8.

### Double impulse, determinism and kernel faults

- **No double impulse:**
  - In 160 runs, the touching boot or toe re-contacted the ball within 0.15 s of a launch **0** times.
  - The commit checks the executed launch (with its keyed error) against the follow-through, with a 3 % margin, and firms it up if needed.
  - Clearance never lapses after a launch.
- **Determinism:**
  - Node replay: 20/20 bit-identical (ball and COM every tick, touch ticks, feet, regions, launches).
  - Node 22 against Chrome 155 (the lab page): 18/20. The two differences start in the last bits of the ball state or the heading.
- **Kernel faults:** 0 in the final 160 runs.

### CPU (Apple M4, one thread, one dribbler)

- **Total:** 497 ms per simulated second, about 2× real time on average.
- **Breakdown:** locomotion 28, ball 3, resolver 466 (predictions 270, launch solve 118).
- **Worst cases:**
  - REV135 at 0.53× real time;
  - the 60° far-start cut at 0.78×.

## THREE VIDEOS TO WATCH FIRST

1. `videos/s02_straight_run_1x.mp4` — straight RUN at the 1× gameplay camera: a free ball, real touches, a believable rhythm.
2. `videos/k02_cut60_run_1x.mp4` — a 60° cut taken with the ball; the first cut touch comes 0.9 s after the request.
3. `videos/d04_cut90_run_diag.mp4` — the 90° cut with diagnostics: the plan ring (foot, region, contact tick) before the touch, then the free ball.

Also worth watching: `videos/k07_cut90_run_LOSS_1x.mp4`, the typical failed cut.

## BEST STRAIGHT DRIBBLE

- `videos/s02_straight_run_1x.mp4` — RUN 5.5 m/s, seed 1, 100 % controlled.
- `videos/s03_straight_fast_1x.mp4` — FAST 7.8 m/s; 8/8 seeds held.

## BEST 45–60° CUT

`videos/k02_cut60_run_1x.mp4` — 60° right, seed 5. The touches go at 25°, then 50°, then 53°. The first cut touch comes 0.88 s after the request.

## BEST 90° CUT

`videos/k04_cut90_run_1x.mp4` — 90° right, seed 6:

- left LACES pushes the ball 62°;
- the next touch goes at 85°;
- 0.25× close-up: `videos/z03_cut90_touch_slow.mp4`.

## BEST PHYSICAL INTERRUPTION

`videos/i02_tackle_run_1x.mp4` — a sliding tackle leg meets the ball at 3.72 s, and the ball is knocked loose.

- 0.25× close-up: `videos/z05_tackle_slow.mp4`.
- Defender sweep: `videos/i01_intercept_run_1x.mp4`.

## PURE PHYSICAL VS RESOLVED VS HYBRID VERDICT

Identical TURN-1.2 locomotion, straight RUN and 60° cut fixtures, 8 seeds:

| Architecture | Straight / 60° cut controlled | Launch error | Other |
|---|---|---|---|
| **A, pure physical** (kernel boot impulse only) | 26 % / 33 % | 8.3 % | 0.67 impulses per touch: the boot misses or glances the ball. Never responds to the cut (0/8). |
| **B, resolved** | 99 % / 70 % | 1.7 % · 1.0° | Exactly 1.0 impulse per touch. Cut responded 5/8. |
| **C, bounded hybrid** (resolved envelope moved by the physical estimate) | 88 % / 60 % | 5.8–7.4 % · up to 3.2° | The physical estimate mostly adds noise. |

**Verdict: RESOLVED (B), with a contact-faithful handoff.**

- The boot's real swing decides when and where the touch can happen.
- The resolver decides the launch.
- Physics owns everything after.

A and C are kept only as lab options for comparison.

## AVERAGE TOUCH SEPARATION BY SPEED

Separation is COM → ball centre, mean / max, 8 seeds:

| Speed | Mean | Max | Touches / s | Interval between touches |
|---|---|---|---|---|
| JOG 3.0 m/s | 0.78 m | 1.32 m | 1.18 | 0.86 s |
| RUN 5.5 m/s | 1.31 m | 3.48 m | 0.68 | 1.51 s |
| FAST 7.8 m/s | 1.61 m | 3.08 m | 0.54 | 1.85 s |
| SPRINT 9.5 m/s | 2.90 m | 28.3 m (a lost ball) | 0.35 | 2.50 s |

## THREE BIGGEST V1 VISUAL DEFECTS

1. **Touch-family monotony.** Almost every touch is a FRONT (toe) push: 75/75 at JOG, 45/45 at RUN. Inside / outside / laces appear only in cuts. The rhythm reads well at gameplay scale, but close up the touches look alike.
2. **Failed cuts end in a firm push.** When no touch can take the ball into the cut, the swing that meets it pushes it 9–10 m/s straight on while the body turns (`k07`).
   - Cuts also start late: about 1.2 s after the request, because the player must first reach a ball pushed 1–1.5 m ahead.
3. **SPRINT knock-ons read as chasing a loose ball.** There are 2.5 s between touches, with the ball 2–3 m ahead. At the 1× camera, player and ball are small, so contacts read only through the ball's change of speed.

## THREE BIGGEST V1 SYSTEM DEFECTS

1. **Cut reliability.** Turns taken with the ball: 45° 5/8, 60° 5/8, 90° 1–2/8, 135° / 180° 0/8.
   - The cause is structural. After an early-swing contact, the time-warped foot must catch up to TURN-1.2's unchanged plant, so its follow-through is fast. Only a firm launch clears it without a second contact, which makes the soft redirecting touch a cut needs often infeasible.
   - Tried, measured, kept or rejected:
     - next-interval consistency;
     - cut gate on user changes only;
     - speed-dependent hold;
     - blockers;
     - partial and staged cuts;
     - set-up touches;
     - pursuit on and off.
   - None lifts 90° materially.
2. **CPU.** The resolver's lookahead (TURN-1.2 clones for the locomotion prediction and the post-cut branches) costs about 470 ms per simulated second. That is 2× real time on average and slower than real time in the worst cases.
3. **Weak foot preference, a kernel that can fail closed, and cross-engine drift:**
   - foot preference is outweighed by window continuity;
   - the ball kernel throws on a leg–ball–turf pinch: 0 in the final runs, seen during development; the run ends as a recorded fault;
   - Node against Chrome replay differs in 2/20 scenarios, at the 1e-16 level.

## EXACT NEXT SHIPPING STEP

**DRIBBLE-1.1: a soft-touch follow-through.**

1. After the contact tick, let the touching swing decelerate and lift around the ball, then re-converge to TURN-1.2's unchanged plant, instead of the time-warp's catch-up.
2. Add this follow-through to the planner's follow-through model.
3. Re-run the cut matrix with the taken-with-the-ball metric. Targets: 45–60° ≥ 7/8, 90° ≥ 5/8.
4. In the same pass, share one locomotion prediction per input change between planning, clearance and the post-cut branches, to cut the resolver's CPU.

## Commits on prototype/dribble-1 (this mission)

- **Instruction:** 7c749a96.
- **Earlier WIP:** f37ed22d … 084b7a8e.
- **5885061d** — planner reliability and zero double impulses.
- **b82e1ec3** — the honest turn metric, the hold timer, staged cuts and set-up touches.
- **This package commit:** evidence, videos, review page, report, handoff.
