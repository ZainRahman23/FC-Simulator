# DRIBBLE-1.1 — report

17 October 2026, 04:55 EEST. Branch `prototype/dribble-1`. The instruction is saved verbatim at `sources/2026-10-17_user_instruction_dribble1_1_soft_touch_followthrough.md`.

- DRIBBLE-1 is frozen at 7fe57fd3: `dribble1/` and `dribble1.html` are untouched.
- DRIBBLE-1.1 is `sandbox/visual/dribble11/` plus `dribble11.html`.
- Review page (local only, it shows real player names): `review/DRIBBLE11_REVIEW.html`, served from the worktree on :8361.

**Seeds.** All figures use the HIGH profile (Vinícius Júnior, right-footed, weak foot 3) and resolved touches (B).
- **Seeds 1–8** are the "X/8" the owner's targets use.
- **Seeds 1–16** run on the same scenarios for both cores. DRIBBLE-1's 16-seed numbers were measured tonight with its frozen core.

**Video.** I cannot play video in real time. Every visual statement comes from frame strips and stills of the rendered clips.

## Status

```
DRIBBLE-1 FOUNDATION PRESERVED: YES
TURN-1.2 UNCHANGED: YES
RESOLVED TOUCH ARCHITECTURE PRESERVED: YES
CONTACT-AWARE FOLLOW-THROUGH: PARTIAL
SOFT REDIRECT TOUCH: PARTIAL
SAME-FOOT SECOND CONTACT REDUCED: NO
45–60° TAKEN-WITH-BALL: 45° 7/8 · 60° 4/8 · 60° left 5/8   (DRIBBLE-1: 5/8 · 5/8 · 3/8)
90° TAKEN-WITH-BALL: 2/8 · 90° left 4/8                       (DRIBBLE-1: 1/8 · 2/8)
STRAIGHT JOG REGRESSION: PASS
STRAIGHT RUN REGRESSION: FAIL
STRAIGHT FAST REGRESSION: PASS
INSIDE TOUCH: PARTIAL
OUTSIDE TOUCH: FAIL
LACES/FRONT TOUCH: PASS
PREFERRED-FOOT BIAS: FAIL
BALL PHYSICALLY FREE: YES
PHYSICAL INTERRUPTION: PASS
CONTROL LOSS STILL POSSIBLE: YES
CONTINUOUS INPUT: PARTIAL
OLD RESOLVER CPU: 465 ms per simulated second per dribbler (DRIBBLE-1; M4, one thread, Node 22)
NEW RESOLVER CPU: 144 ms per simulated second (0.60 ms per 240 Hz step; worst scenario 235 ms/s; longest single planning pass 363 ms)
RESOLVER SPEEDUP: 3.2×
22-PLAYER CPU PROJECTION: 0.77 s of one core per simulated second with one dribbler (22 × 28 ms locomotion + 144 ms resolver + 4 ms ball); 3.8 s if all 22 dribbled (DRIBBLE-1: 1.09 s / 10.8 s)
CHROME/NODE DECISION DETERMINISM: PASS
PINNED-BALL STABILITY: PASS
READY FOR OWNER VISUAL REVIEW: YES
READY FOR DRIBBLE-V1 INTEGRATION IF OWNER APPROVES: NO
```

## The stop condition — which items are met

| # | Item | Met? | Evidence |
|---|---|---|---|
| 1 | Resolved touch architecture remains selected | yes | One authoritative `schedule()` per touch. |
| 2 | TURN-1.2 unchanged | yes | Stance feet 0 mm off TURN-1.2's own pose over 31,321 adjusted ticks; unadjusted swings 0 mm. Touchdown tick unchanged; ≤ 4.1 mm residual on the last airborne tick (DRIBBLE-1: 4.9 mm). |
| 3 | Straight JOG / RUN / FAST intact | partly | JOG 100 %; FAST 99.6 % (DRIBBLE-1 100 %); **RUN 80.5 % (DRIBBLE-1 97.2 %)**. 16 seeds: RUN 90.3 % vs 98.6 %, FAST 93.7 % vs 90.8 %. |
| 4 | Contact-aware follow-through exists | yes | Solved per touch from the executed launch; the model matches the actual foot within 0.5 mm. |
| 5 | Soft redirects no longer usually need a 9–10 m/s blast | partly | Firm recovery touches over all 320 runs: 78 → 31. Cut-touch speed is not lower (below). |
| 6 | Same-foot accidental second contacts materially reduced | **no** | DRIBBLE-1 already had 0 within 250 ms; DRIBBLE-1.1 has 17 / 1,574 (1.1 %). |
| 7 | 45–60° ≥ 7/8 | 45° only | 45° 7/8; 60° 4/8; 60° left 5/8. |
| 8 | 90° ≥ 5/8 | **no** | 2/8 right, 4/8 left. |
| 9 | Inside / outside / laces appear naturally | partly | Inside 12, laces 43, **outside 0**. |
| 10 | Ball physically free | yes | 257,252 free ticks, 0 unexplained deviations. |
| 11 | Interception / control loss remain | yes | Tackle and sweep contacts knock the ball loose, no snap-back. |
| 12 | Resolver CPU materially reduced | yes, 3.2× | Not the 10× aimed for. |
| 13 | Chrome / Node decisions match | yes | 20 / 20. |
| 14 | No new pinned-ball instability | yes | 0 faults; 0 unrecovered steps in the stress test. |

Items 3, 6, 7 (60°), 8 and 9 are not met. I have stopped here because the remaining gaps are no longer about the follow-through; they need the design decision in **Exact next shipping step**. The full DRIBBLE-1 vs DRIBBLE-1.1 table is on the review page (Evidence → Reliability).

## Three videos to watch first

1. `videos/A2_cut60_d1_vs_d11_zoom.mp4` — the 60° cut, seed 16, side by side on a zoomed gameplay camera (DRIBBLE-1 left, DRIBBLE-1.1 right). `A1_…_1x` is the real 1× camera.
2. `videos/c_followthrough_cut60_slow.mp4` — that cut touch's follow-through at 0.25×, close camera, diagnostics on. With it: `stills/strip_cut60_s16_followthrough.jpg`.
3. `videos/B2_cut90_d1_vs_d11_zoom.mp4` — the 90° cut, seed 3, side by side.

## Best 60° cut before / after

CUT60_RUN, seed 16 (`A1` / `A2`). Both runs request 60° at 2.2 s.

**DRIBBLE-1** never takes the ball through the cut. By 4.2 s the ball is 8 m away and LOOSE after a laces push.

**DRIBBLE-1.1** takes it in two touches and keeps it to the end:
- **3.617 s:** right toe, 7.2 m/s, 29°. The follow-through yields at 0.5 and arcs at 1.0. The boot passes 24 mm from the ball, and the foot lands on TURN-1.2's unchanged plant at 3.742 s.
- The body leads into the turn.
- **4.85 s:** a touch at 84° finishes the cut.

## Best 90° cut before / after

CUT90_RUN, seed 3 (`B1` / `B2`).

**DRIBBLE-1** does not take the turn with the ball.

**DRIBBLE-1.1** takes it in three touches and finishes within 10° of the request:
- **2.68 s:** left toe, 8.2 m/s, 17°.
- **4.20 s:** right toe, 7.0 m/s, 51°, with the follow-through at yield 0.5 / arc 1.0 (close-up `c_followthrough_cut90_slow`).
- **5.13 s:** a third touch into the new lane.

## Best soft inside touch

CUT45_RUN, seed 4, 2.767 s (`e_inside_cut45_slow`, `e_inside_cut45_1x`): left inside, 7.2 m/s, 39°. The whole 45° cut goes with this one touch.

Also CUT60L_RUN, seed 3, 4.192 s (`e_inside_cut60L_slow`): the right inside takes a left cut across at 7.6 m/s.

Inside touches are rare: 12 of 1,574.

## Best soft outside touch

**None exists.** Not one outside-of-the-foot touch occurred in 1,574 DRIBBLE-1.1 touches over 320 runs, and none in the attribute runs.

The planner does generate outside contacts for cuts, but they fail its geometry checks:
- the boot below the turf after the rotation needed to face the ball;
- the leg's reach;
- the toe hull touching the ball first;
- lateral reach.

This is the cut toward the preferred-foot side. For the right-footed player it is the right cut, where only toe pushes remain.

## Best post-contact foot-clearance close-up

`c_followthrough_cut60_slow.mp4`, plus `stills/strip_cut60_s16_followthrough.jpg`. The strip shows: 50 ms before; the contact; +50 ms; +100 ms; TURN-1.2's touchdown at 3.742 s on its marked landing; +200 ms.

The boot keeps moving through its stride. It slows on its own path and passes beside the ball, 24 mm at the closest, instead of chasing through it. It lands on the unchanged plant.

Also `c_followthrough_cut60_low` (low camera) and `c_followthrough_cut90_slow`.

## Average cut touch speed before vs after

**Cut and stage touches** in every cut scenario, all seeds:

| | Count | Mean | Median | ≥ 9 m/s |
|---|---|---|---|---|
| DRIBBLE-1 | 104 | 6.33 m/s | 6.09 m/s | 8 |
| DRIBBLE-1.1 | 213 | 6.63 m/s | 6.77 m/s | 8 |

Individual cut touches are **not** softer.

**What did fall is the firm recovery touch**, the 9–10 m/s push made when no planned touch is feasible. Over all 320 runs:
- DRIBBLE-1: 78 recovery touches, mean 9.35 m/s;
- DRIBBLE-1.1: 31 recovery touches, mean 9.98 m/s.

**Why cut touches are not softer.** The follow-through no longer sets the minimum speed. The boot's speed along the launch at contact does: launch ≥ boot speed + 0.8 m/s separation. Cut contacts come from fast mid-swing phases.

## Accidental second-contact rate before vs after

**Same foot within 250 ms of the launch** (boot or toe):

| | Second contacts | Rate |
|---|---|---|
| DRIBBLE-1 | 0 of 1,447 touches | 0 % |
| DRIBBLE-1.1 | 17 of 1,574 touches | 1.1 % |

DRIBBLE-1 avoided second contacts by launching firmly enough to escape its own catch-up.

The 17 DRIBBLE-1.1 second contacts:
- all are the striking toe, 8–46 ms after the launch (median 33 ms), with a median impulse of 2.0 N·s;
- 15 of the 17 had the follow-through arc or yield in use;
- 7 of those runs then lost the ball.

The follow-through model matches the real pose within 0.5 mm where I checked it. What still makes the toe meet the ball in these cases is not yet found.

**Other foot within 250 ms:** 1 contact in each core.

**Clearance after the contact** (median of boot / toe gap to the ball, measured in the kernel):

| | +25 ms | +50 | +100 | +150 | +200 | Minimum over 250 ms |
|---|---|---|---|---|---|---|
| DRIBBLE-1 | 79 mm | 151 | 180 | 490 | 799 | 17.7 mm |
| DRIBBLE-1.1 | 45 mm | 93 | 157 | 424 | 738 | 14.6 mm |

The softer follow-through stays closer to the ball, as intended. This is where the extra contacts come from.

## Three biggest remaining V1 visual defects

1. **Still the toe push.**
   - 97 % of touches are FRONT (1,519 / 1,574). The rest are inside 12 (DRIBBLE-1: 53), laces 43 (FAST / SPRINT forward pushes) and outside none.
   - The follow-through did not make the other regions feasible. They fail on where the ball is relative to the foot: reach, the turf, the toe reaching the ball first.
2. **Cuts are staged, and the body visibly leads the ball.**
   - The first cut touch takes the ball only 5–20°. The body turns 20–45° beyond it, and the next touch re-collects the ball 0.6–1.2 s later.
   - When that touch is missed, the player has run away from his ball.
   - The first response comes about 0.8–0.9 s after the request (DRIBBLE-1: 1.2–1.4 s).
3. **Straight RUN is less tidy than DRIBBLE-1 in some seeds.**
   - A swing predicted to run into the ball blocks every plan. It has no feasible touch of its own in the coarser search, and then kicks the ball (straight RUN seed 6).
   - In 1 % of touches the toe re-contacts the ball 8–46 ms after the launch.
   - DRIBBLE-1's slow lateral drift, where the pursuit follows a touch's direction error, remains.

## Exact next shipping step

**DRIBBLE-1.2: cut geometry, not follow-through.**

The follow-through now lets soft touches clear the leg. Cuts are still limited by where the ball is when the foot can reach it: on the approach only the toe can meet a ball rolling ahead, so the first redirect is 5–20° and the rest of the turn is staged.

The evidence points at the fix. The preferred foot's inside works:
- a left-footed elite profile takes the **right** 60° cut 8/8;
- the right-footed one takes the left 60° cut 5/8 (16 seeds: 10/16).

The right-footer's outside never becomes feasible. So:

1. **Make the outside-of-the-foot cut contact feasible.** Contact low on the boot's outer edge with the foot turned out; today it fails on the turf, the leg's reach, and the toe touching first. Plan the set-up touch to place the ball on the cutting foot's line.
2. **Remove the two regressions.**
   - the blocking swing that kicks the ball in straight RUN (restore DRIBBLE-1's ~97 %);
   - the 1 % toe re-contacts with the arc.
3. **CPU.**
   - Spread a heavy planning pass over several ticks, so there are no 363 ms spikes.
   - Keep the opportunity results across passes while the track and ball are unchanged.
   - The remaining cost is the TURN-1.2 prediction: about one new track per input change, ~400–600 ticks at 35 µs.

**Targets:** 60° ≥ 7/8, 90° ≥ 5/8, straight RUN ≥ 95 %, second contacts 0, inside and outside both in use.

## Other measurements

### Optimisation twin

With `opts.twin` (shared tracks and the result-preserving optimisations only), DRIBBLE-1.1 is bit-identical to frozen DRIBBLE-1 in 40 / 40 runs (20 scenarios × 2 seeds). Compared bit for bit:
- touches;
- kernel events;
- the cut timeline;
- control changes;
- the full 240 Hz record.

That identity was established first, at 511923ec, before any football change; it is re-verified at 45c0d724.

### CPU (`evidence/cpu.json`)

Both cores ran back to back in one process, every scenario × 2 seeds, on a quiet machine.

| | DRIBBLE-1.1 resolver, ms per simulated second | Speed-up vs DRIBBLE-1 |
|---|---|---|
| Straight | 85–104 | 1.6–2.7× |
| Cuts | 159–205 | 2.4–3.0× |
| 135° | 235 (DRIBBLE-1: 1,852) | 7.9× |

Planning load in DRIBBLE-1.1, per simulated second:
- 6.8 planning passes;
- 2.4 new locomotion tracks;
- 995 predicted TURN-1.2 ticks.

Cache hit rates:

| Cache | Hit rate |
|---|---|
| Track reuse | 23 % |
| Window envelopes | 54 % |
| Follow-through paths | 52 % |
| Free-ball launches | 72 % |

In Chrome 155 the lab simulates DRIBBLE-1.1 scenarios in 0.8–0.9 s per 6–8 s of play; DRIBBLE-1 takes 1.9–3.5 s.

### Chrome vs Node (`evidence/chrome_d11.json`, `evidence/chrome_d1.json`)

Chrome 155.0.8059.80 against Node 22.19.0, all 20 scenarios:

| Core | Identical decisions | Bit-identical state |
|---|---|---|
| DRIBBLE-1.1 | 20 / 20 | 1 / 20 |
| DRIBBLE-1 | 20 / 20 | 3 / 20 |

"Decisions" means every touch tick, foot, region, launch or cancel; the cut timeline; and control changes.

**Where the state differences come from:**
- They start in the last bit of the ball's vertical velocity (≈ 3e-18) or of TURN-1.2's heading (4.4e-16), because the two engines' maths libraries differ.
- They grow to at most 3e-12 m. They are floating-point differences, not branching or replay divergence.
- DRIBBLE-1's earlier "2 / 20 differ" was this effect showing in a 9-decimal hash.

DRIBBLE-1.1's decisions read speed to 0.01 m/s and costs to 1e-9.

### Pinched ball (`evidence/pinch_stress.json`)

3,000 random leg wedges: boot and toe hulls plus the shin capsule against a ball on the turf.

| Kernel | Throws | Recovery |
|---|---|---|
| Bare BALL-FEEL-1.3 | fails closed in 46 (38 CCD budget, 8 contact budget) | none |
| DRIBBLE-1.1 kernel step | — | 0 unrecovered; 74 leg holds, 1 leg clear, 0 non-finite states |

Across the 320 reliability runs of both cores: 0 kernel faults and 0 recoveries needed.

### Continuous input

| | DRIBBLE-1.1 | DRIBBLE-1 |
|---|---|---|
| RETARGET (60° right → 60° left 0.12 s later) taken | 5/8 | 1/8 |
| CANCEL, controlled | 85 % (6/8 held) | 94 % (7/8) |

Before the contact, a plan is remade on any input change, so its direction, foot or existence can change. After the contact the touching swing is committed until that foot lands (≤ one step); the next touch responds.

### Attributes (DRIBBLE-1.1, seeds 1–8)

| Profile | STRAIGHT_RUN controlled | CUT60 taken | CUT90 taken |
|---|---|---|---|
| HIGH | 80.5 % | 4/8 | 2/8 |
| AVERAGE | 79.7 % | 2/8 | 0/8 |
| POOR | 54.6 % | 0/8 | 0/8 |
| WEAKFOOT | 57.9 % | 1/8 | 0/8 |
| LEFT_HIGH | 99.6 % | 8/8 | 3/8 |

Execution error (keyed, per touch) still differentiates the players.

### Preferred foot

The right-footed player uses the right foot for 43 % of touches; DRIBBLE-1: 51 %.

## Files

| Path | Contents |
|---|---|
| `DRIBBLE11_STATUS.json` | Status data used by the page builder. |
| `review/DRIBBLE11_REVIEW.html` | The review page (local only). |
| `videos/` | 29 clips. |
| `posters/` | Clip posters. |
| `stills/` | The follow-through strip. |
| `evidence/rel_{d1,d11}_g1–6.json` | Reliability, 20 scenarios × 16 seeds, per run and per touch. |
| `evidence/attr_d11_*.json` | Attribute profiles. |
| `evidence/free_ball_audit.json` | Free-ball audit. |
| `evidence/twin_identity.json`, `twin_O1_identical.json` | Optimisation twin. |
| `evidence/plant_check_{d1,d11}.json` | Plant checks for both cores. |
| `evidence/pinch_stress.json` | Pinched-ball stress test. |
| `evidence/chrome_{d1,d11}.json` | Chrome vs Node. |
| `evidence/cpu.json` | CPU comparison. |
| `evidence/old_bb3efc73/` | The first DRIBBLE-1.1 batch, kept for provenance and superseded: an undefined cut-window cost parameter gave NaN costs in cuts. |
| `DRIBBLE11_HANDOFF.md` | Code map and how to run everything. |
