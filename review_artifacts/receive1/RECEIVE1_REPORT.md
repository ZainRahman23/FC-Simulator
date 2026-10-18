# RECEIVE-CONTROL-1 — Full-throttle receiving and turning first touches

**Session:** 18 Oct 2026, 04:36 – 07:30 EEST (work before 06:00 belongs to the 17 Oct chronicle day)
**Branch:** `prototype/dribble-1`
**Instruction (verbatim):** `review_artifacts/receive1/sources/2026-10-18_user_instruction_receive_control_1.md`

**Review page:** `http://127.0.0.1:8361/review_artifacts/receive1/review/RECEIVE1_REVIEW.html`. It is local only, because the lab shows real player names.
**Lab:** `http://127.0.0.1:8361/sandbox/visual/receive1.html?case=R_180R_JOG_SOFT&diag=1` (any case id; see `receive1/rc1_cases.js`).

I cannot play video in real time. Every visual judgement here comes from frame strips and stills taken from the rendered clips.

**Status: implemented, tested, presented for review — not frozen.** My recommendation is that it is **not ready to freeze**: the architecture works and every behaviour you asked to see exists, but only about four in ten representative receives end clean, and the main limits sit in the frozen dribble contact model rather than in the receive layer (§12, §15).

## Results at a glance

Representative matrix: 238 situations × 3 seeds = **714 runs**. Seeds change the keyed execution draws and also move the passer by a few tenths of a metre, so the ball meets a different phase of the stride.

| Outcome | Runs | Share |
|---|---|---|
| **Clean** — a real receive, the new line within 2.5 s, the ball controlled at the end | 279 | 39 % |
| Taken — the new line reached, but late or not controlled at the end | 27 | 4 % |
| Received — a real first touch, but the new line was not reached | 157 | 22 % |
| Recovered — the pass went by; the loose ball was played later | 38 | 5 % |
| Missed — no touch in the run | 213 | 30 % |

A **real receive** means a first touch made before the pass has gone by (the receiver did not have to chase it). There were 463 of them (65 %).

| Item | Result |
|---|---|
| Turning receives (90°–270°) | 149 clean of 468 (32 %); ordinary 130 of 246 (53 %) |
| 180° | 25 clean + 6 taken of 120; 24 of the 25 clean ones turn with the first touch; new line 0.50 s after it (median) |
| Turn started before contact | 168 of 297 real turning receives; median 0.31 s before contact (p10–p90 0.13–0.61 s) |
| Left vs right turns | Clean 54 left, 95 right — both work, left less often |
| Double touches at the handoff | 0 |
| Same-foot re-contacts | 6 runs of 714 |
| Determinism | Node replay 20/20 identical; Chrome / Node decisions 20/20 identical |
| Matched seeds | 429/429 identical draws for the same contact in two builds; 162/162 differ across seeds |
| CPU, receive phase | 816 ms per simulated second (353 – 1,412); ≈ 1.3 s of CPU per receive |
| CPU, after the handoff | 128 ms per simulated second (DRIBBLE-V1's own cost) |
| Worst step | median 17 ms; up to 65 ms from garbage-collection pauses |
| DRIBBLE-V1 | Byte-identical; 60/60 runs identical before and after receives in one process; 48/48 match its evidence of record |

## 1. Receiving architecture

RECEIVE-CONTROL-1 is an **adapter on the frozen DRIBBLE-V1** (`sandbox/visual/receive1/rc1_core.js`). `ReceiveSim` extends the frozen `DribbleSim` and imports it from `dribble15/d15_core.js`. Nothing in the frozen core was changed.

Everything physical is the foundation's own:
- the TURN-1.2 body;
- the free physical ball (BALL-FEEL-1.3 world);
- the contact geometry, launch solver, clearance checks, follow-through and the one authoritative impulse at a verified boot contact;
- the incremental planner and its keyed execution error.

The adapter adds what happens before the first touch:

| Part | What it does |
|---|---|
| The incoming pass | The ball starts as a struck pass (rolling, spin consistent with rolling), aimed with BALL-PHYS's own free roll so it really passes where the receiver's run takes him |
| Meeting point | From the predicted free ball: of the points the receiver can reach in time, the one needing the least change of his running velocity. It only steers the approach; every contact is searched exactly |
| Approach | The receiver runs to where the ball will be about 0.45 m ahead of him at the meeting, at the pace that arrives on time (2.5 m/s floor — TURN-1.2 has no walk) |
| Classification | `receiveTurnAngle` (§2–3) |
| Receive options | Motions handed to the frozen planner, which picks the contact (§4, §7) |
| Execution | The frozen keyed draw, with a receive difficulty factor (§5) |
| Chase | If the pass goes by, the receiver chases the loose ball with the current motion only |
| Handoff | After the first touch launches, the frozen DRIBBLE-V1 resolver carries on (§9) |

**Receive options** (each is an exact TURN-1.2 prediction branched from the current motion):
1. The current approach.
2. **Approach lines:** the ball arriving 0.15 or 0.30 m either side of the body, or the same line 0.8 m/s slower, 0.8 or 1.6 m/s faster. At a closing speed of 8–12 m/s, a 0.1 s stride-phase error is a metre, so the speed variants re-time the meeting against the stride.
3. **Turn releases:** the exit released 0.2 – 0.62 s before the predicted arrival.
4. **Turn lines** (turns ≥ 110°): first an approach line on the turn side (the ball passing beside the standing leg), then the exit released 0.35 – 0.95 s before the arrival.

The planner's own candidate, version, check and installation pipeline then chooses the foot, surface, tick and launch.

**Receive-scoped planner settings.** These frozen parameters are overridden only inside the receive planner's own work slices, and restored at every pause:

| Setting | Dribble | Receive | Why |
|---|---|---|---|
| Contact-tick sampling | every 3 ticks | every tick | an incoming pass closes 4–6 cm per tick |
| Contact search horizon | 1.0 / 0.7 s | 1.2 s | a pass met 1.2 s away is a decision now |
| Sideways reach of the receiving foot | 0.15 m | 0.35 m | a pass is met beside the standing foot, not under the body |

Checks the receive layer added on top of the frozen ones:
- **Receive blockers.** The frozen blocker check ignores stance boots, shins and thighs: harmless in dribbling, where the ball is ahead, but an incoming pass runs through the stance area. Receive plans are rejected if the predicted free ball would hit any of them first.
- **Full-throttle touch sizing.** The receive touch is sized for the exit pace (up to 2 m/s above the current speed), so the frozen launch limits allow a touch into space that the receiver accelerates onto.

## 2. Exact definition of `receiveTurnAngle`

```
receiveTurnAngle = wrap(exitDirection − facing)   expressed in [0°, 360°)
```
- `facing` is the receiver's body heading (TURN-1.2 `psi`) when the pass is played.
- `exitDirection` is the direction he wants to leave in.
- Positive is to the **right**, the lab's convention: 0° straight on, 90° right, 180° behind, 270° left (≡ −90°).
- The signed form (−180°, 180°] is kept alongside.

The exit is requested through the lab's turn convention, whose frozen input clamps ±179.5°. A 180° exit is therefore 179.5° (right) or −179.5° (left).

## 3. Ordinary vs turning receive

- **Turning receive** if 90° ≤ `receiveTurnAngle` ≤ 270°, that is |signed| ≥ 90°.
- **Ordinary receive** otherwise.

Boundaries (`evidence/receive_turn_angle_boundary.json`), checked on the pure function at four facings and on the receiver's actual classification in a simulation:

| Angle | Class |
|---|---|
| 89° | ordinary |
| 90° | turning |
| 270° | turning |
| 271° | ordinary |

What the class changes: a turning receive always gets turn options (releases and turn lines). An ordinary receive whose exit differs from the approach by more than 8° holds the exit as a requested cut, so the frozen cut machinery (cut-at-contact, set-up with the switch) applies to the first touch.

## 4. Contact families

No named move is scripted. The planner picks a contact, and the family is a **label read afterwards from geometry**: foot, surface, where the ball was relative to the standing foot, and what the touch did.

| Family | Real receives | Note |
|---|---|---|
| Toe / front (block) | 171 | mostly head-on balls; often heavy |
| Outside of the foot | 134 | |
| Laces | 49 | |
| Across the body (far foot's inside) | 37 | |
| Through the stance (behind or beside the standing leg) | 35 | |
| Inside wrap (near foot's inside, turning with the body) | 22 | |
| Let-run (first touch after the ball passed the body line) | 15 | |

**Feet.** Both feet are chosen by geometry in both turn directions:
- right turns: right foot 83, left foot 109;
- left turns: right foot 55, left foot 50.

Preferred foot: the frozen cost carries a small preferred-foot term (the test profile is right-footed). There is no weak-foot model yet.

## 5. Incoming ball momentum

- **Through the contact law.** The frozen impulse-normal law makes the contact normal follow the velocity change (launch − incoming). For a hard pass the receiving surface must therefore face the incoming ball, and the foot's separation, closing speed and follow-through are checked along that normal. This is what decides which surfaces and motions can take a given pass (§12).
- **The cushion.** The frozen time-warp slows the receiving foot to its floor (30 % of its path speed) for an incoming ball. That is the cushion — and also the main source of failures (§12).
- **Pace taken off.** Median incoming speed 6.9 m/s, first-touch launch 5.6 m/s, redirection 107°.
- **Execution difficulty.** σ × (1 + 0.06 × max(0, v_in − 6) + 0.35 × redirect / 180°), on the frozen keyed draw. Median factor 1.31, maximum 1.73.
- **Clean rate by incoming speed** (real receives):

  | Incoming speed | Clean |
  |---|---|
  | < 5 m/s | 92 of 160 |
  | 5–7 m/s | 50 of 78 |
  | 7–9 m/s | 82 of 134 |
  | ≥ 9 m/s | 55 of 91 |

- **Pass strength over all runs:**

  | Pass | Clean | Missed |
  |---|---|---|
  | Soft | 87 of 144 | 11 |
  | Medium | 158 of 426 | 139 |
  | Firm | 34 of 144 | 63 |

## 6. Player momentum

- Speed magnitude and direction are separate: the approach input is a direction and a pace.
- TURN-1.2 makes all motion: braking, turning, accelerating and stance impulses. The receive layer never moves the body.
- Turning receives brake as TURN-1.2 brakes; there is no extra lateral acceleration.

Median speeds of real receives (m/s):

| Receiver | Class | At the first touch | 1 s later | Fastest after |
|---|---|---|---|---|
| Standing (2.5 floor) | ordinary | 2.5 | 4.7 | 5.5 |
| Jogging 3.0 | ordinary | 3.1 | 4.8 | 5.5 |
| Running 5.5 | ordinary | 4.9 | 5.5 | 5.5 |
| Fast 7.8 | ordinary | 5.8 | 7.6 | 7.8 |
| Running 5.5 | turning | 4.8 | 4.4 | 5.5 |
| Fast 7.8 | turning | 4.9 | 4.8 | 7.8 |

**A known cost:** the approach times the meeting by pace. Fast runners slow by about 2 m/s (median) before an ordinary receive and recover within about a second. That is unnecessary deceleration in some cases (§15).

## 7. Body preparation and rotation

- For a turning receive, the planner evaluates the exit **released before the ball arrives** (turn releases and turn lines). TURN-1.2 then turns the body through its own braking / reorganise / turn families while the contact is searched on the turning body's swings.
- In 168 of 297 real turning receives the turn started before contact: median 0.31 s, p10–p90 0.13–0.61 s.
- The body had turned a median 16° at the contact. Most rotation happens through and after the touch, continuously, never snapped.
- When the best plan is a touch in the approach motion, the exit stays held and the frozen DRIBBLE-V1 cut machinery takes the turn on the next touch: a set-up with the switch (the turn begins at that foot's touchdown), or a cut.
- First-touch roles of turning receives:

  | Role | Count |
  |---|---|
  | Cut (the touch takes the turn) | 167 |
  | Recovery (frozen fallback block) | 92 |
  | Set-up | 15 |
  | Line | 14 |
  | Dribble | 9 |

## 8. Contact timing

- Contacts are searched on the **exact predicted ball trajectory**: BALL-PHYS's free ball, every tick, every foot, every surface and elevation.
- The window is each option's arrival window (meeting estimate − now … + 0.45 s for lines, + 0.9 s for turns).
- There is no distance-radius test. A contact exists only where a swing foot's adjusted, time-warped path meets the ball with a surface facing the required impulse normal.
- Release ticks lie on a 12-tick grid, line switches on a 48-tick grid. This lets successive searches re-use the same predictions; the contact itself is not gridded.
- Missed passes: once the ball is moving away and 0.6 m past its closest approach, the receive is over (chase). The exception is a ball ahead of him travelling within 50° of his run — a ball into space he runs onto.

## 9. Handoff into DRIBBLE-V1

On the tick the first touch's authoritative launch is confirmed (the kernel's launch event), the adapter stops and the frozen resolver takes over from the authoritative state:
- body (position, velocity, facing, the committed touching swing);
- ball (position, velocity, spin);
- the last touch (its planned next window and its follow-through);
- the held or released exit.

The requested direction is the same exit for both layers (one input schedule), so the planners cannot disagree about the line. A turn still held after the first touch becomes DRIBBLE-V1's held cut, with its hold clock started at the handoff.

| Check | Result |
|---|---|
| Duplicate immediate touches | 0 in 714 runs |
| Same-foot re-contacts within 0.25 s | 6 runs |
| Ball snapping | none: the ball is only ever moved by the kernel |
| Speed discontinuity | Body acceleration within ±50 ms of the handoff ≤ 18 m/s² in the visual cases, inside TURN-1.2's own stance-impulse range over all ticks (p95 14.7, p99 21.8, max 27.5 m/s²) |

## 10. Deterministic test matrix

Coverage (`rc1_cases.js`). Pass direction means where the pass **comes from**:

| Block | Coverage |
|---|---|
| A | every turn angle (0, 45, 89, 90, 120, 135, 180, 225, 240, 270, 271, 315) × every pass direction (front, front-left, front-right, left, right, rear-left, rear-right), running receiver, medium pass |
| B | exits 0 / 90 / 180 / 270 × passes from front / left / right × receiver standing / jogging / running / fast × soft / medium / firm passes |
| C | the 89 / 90 and 270 / 271 boundaries from every direction, jogging |

Rear passes are balls into space 3 m ahead of the runner. A pass that reaches a runner from behind overtakes him faster than he runs, and no boot surface can face it.

**By receive turn angle** (clean / taken / received / recovered / missed):

| Angle | n | Clean | Taken | Received | Recovered | Missed |
|---|---|---|---|---|---|---|
| 0 | 120 | 77 | 4 | 10 | 6 | 23 |
| 45 | 21 | 15 | 0 | 2 | 2 | 2 |
| 89 | 42 | 16 | 2 | 6 | 2 | 16 |
| 90 | 132 | 56 | 7 | 24 | 7 | 38 |
| 120 | 21 | 7 | 0 | 7 | 1 | 6 |
| 135 | 21 | 7 | 0 | 9 | 1 | 4 |
| 180 | 120 | 25 | 6 | 44 | 8 | 37 |
| 225 | 21 | 2 | 0 | 9 | 1 | 9 |
| 240 | 21 | 4 | 1 | 5 | 1 | 10 |
| 270 | 132 | 48 | 5 | 31 | 8 | 40 |
| 271 | 42 | 12 | 0 | 8 | 1 | 21 |
| 315 | 21 | 10 | 2 | 2 | 0 | 7 |

**By pass direction:**

| From | n | Clean | Missed |
|---|---|---|---|
| Front | 174 | 93 | 17 |
| Front-left | 48 | 17 | 21 |
| Front-right | 48 | 14 | 27 |
| Left | 174 | 62 | 61 |
| Right | 174 | 73 | 57 |
| Rear-left | 48 | 8 | 10 |
| Rear-right | 48 | 12 | 20 |

**By receiver:**

| Receiver | n | Clean | Missed |
|---|---|---|---|
| Standing (2.5 m/s floor) | 108 | 47 | 33 |
| Jogging | 174 | 58 | 77 |
| Running | 324 | 124 | 89 |
| Fast | 108 | 50 | 14 |

**Clean turning receives:**
- the first touch alone put the ball on the exit (within 25°) in 90 of 149;
- median first-touch exit error 16°;
- new line 0.51 s after the first touch (median).

## 11. Performance

Measured in one process on an idle machine, 20 cases (`evidence/cpu.json`):

| Phase | CPU |
|---|---|
| Receive phase (pass struck → first touch) | **816 ms per simulated second** on average (353 – 1,412); ≈ 1.3 s of CPU per receive |
| After the handoff (frozen DRIBBLE-V1) | 128 ms per simulated second |
| Whole 4 s case | 416 ms per simulated second |
| Worst step | median 17 ms; p99 of steps ≈ 14 ms; up to 65 ms |

- **Planning stays inside the frozen per-tick budget** (≈ 12,000 work units, about 14 ms). The larger worst steps are garbage-collection pauses: a receive search discards about 240 MB of prediction samples.
- **What made it bounded:**
  - TURN-1.2 prediction of the options dominates. Option sets are fixed per main motion and switch tick, so later searches re-use the branches and their candidates.
  - Contact generation and blocker scans are limited to each option's arrival window.
  - There is no search while the ball is still far away, nor immediately after a search that found nothing.
  - Extending predictions to the switch ticks is now budgeted; it was an unbudgeted 40 – 80 ms tick before.
- **Not good enough yet:** about 5–6× DRIBBLE-V1's per-second cost during the ~1–1.5 s of a receive, plus the GC pauses.

## 12. Failure cases

Bad receives are physical and they happen:

| Failure | Runs |
|---|---|
| Heavy first touch (ball leaves > 4 m/s faster than the receiver) | 44 |
| Ball deflected off the body before any planned touch | 162 |
| Control lost after the first touch | 182 |
| First touch is the frozen recovery block (no valid plan; the ball coming into a foot) | 107 |
| Kernel faults | 0 |

Case F shows one: a head-on pass met by a left-toe block straight back toward the passer.

**Why receives fail** (planner diagnosis of a 24-case sample of misses):
- Candidates are plentiful (≈ 35,000), but valid plans are rare.
- In 254 of 346 launch solves, every launch toward a next-touch window was rejected. 14,651 of ≈ 18,500 window checks fail on geometry: the impulse normal that launch needs is one the receiving foot's pose cannot face.
- 65 more fail because the frozen follow-through floor is infeasible. The warp-slowed receiving foot must race to its unchanged TURN-1.2 plant after the contact, and would hit the ball again at any allowed launch speed.

These are properties of the frozen dribble contact / launch model meeting an incoming ball, not bugs in it.

**Tried and not adopted** (`evidence/experiments/`):

| Change | Result |
|---|---|
| Receive warp floor 0.6 / 0.9 instead of 0.3 | fewer clean receives |
| Surface preference (penalise the toe, favour the inside) | no change: the toe is chosen because it is the only feasible surface |
| 72 tries per search phase instead of 24 | no change |

The experiment summaries were scored with the metric definitions of their time, so they are relative comparisons only.

**Weak spots:**
- jogging receivers (77 missed of 174);
- firm passes;
- passes from front-right and rear-right;
- left turns 225°–271°.

## 13. Representative visual cases

In `review_artifacts/receive1/videos/` (letters a–h). Each case has a zoomed gameplay clip (1×), a top view with diagnostics (0.5×) and a close side view (0.25×). Judged from frame strips (in `stills/`); numbers from the evidence matrix, seed 1.

| Case | Situation | What the frames show |
|---|---|---|
| **A** ordinary forward | `R_0_RUN_MED`: pass from the right, running | Left inside across the body (6.9 → 6.8 m/s), 2° off the exit. But the approach has slowed him to 3.1 m/s to time the meeting; he is back at 5.5 m/s a second later (the slowdown limitation, §6) |
| **A′** ordinary at pace | `F_315_RUN_MED`: pass from the front, exit 45° left | Outside of the left foot redirects the oncoming pass (9.2 → 6.4 m/s) 8° off the exit, in stride at 5.5 m/s |
| **B** 120° turn | `FR_120_RUN_MED` | Right outside reaches for the pass, kills the pace (8.5 → 2.9 m/s) and sends it out at 93° (27° short) with the body 9° into its turn, released 0.34 s earlier; on the 120° line 0.97 s later |
| **C** 180° turn | `R_180R_JOG_SOFT` | The turn starts 0.33 s before contact; at contact the body is 92° round, its speed at the bottom of TURN-1.2's pivot (0.6 m/s); the left laces send the ball (3.7 → 3.3 m/s) out at 172°, 8° off the exit, and he runs on with it at 5.3 m/s a second later — one continuous turn, not receive-stop-turn-go |
| **D** opposite side | `FL_240_RUN_MED`: 120° left | Right inside across the body (8.5 → 3.7 m/s), sent to −85° for a −120° exit (35° short); new line 0.93 s later — B mirrored |
| **E** through-stance | `FL_270_RUN_MED`: 90° left | The right foot's inside meets the ball behind the standing left leg (8.6 → 5.5 m/s, sent to −66° for a −90° exit) and he turns away with it — chop-like in function, not scripted |
| **F** failed | `F_180R_RUN_MED` | Head-on pass, 180° wanted; no valid turning plan; the frozen recovery block with the left toe (9.2 → 9.7 m/s) sends it straight back toward the passer; control lost 0.13 s later |
| **+** full throttle | `L_270_FAST_MED` | 90° left from 7.8 m/s; TURN-1.2 brakes to 4.9 m/s for the turn; right inside wrap with the body 89° round, 2° off the exit; on the new line at once and back at 7.8 m/s a second later |

Your six "show me" points:
1. **Ordinary receives flow into movement:** A′ (in stride at pace), A (clean, but slowed by the approach), and 130 clean ordinary receives.
2. **90–270° turned with the first touch itself:** B, C, D, E and the extra case.
3. **180° as a continuous turn:** C. But only 25 + 6 of 120 180° runs succeed.
4. **Left and right:** B / D.
5. **Through / across the body:** E (through the stance), D (across).
6. **Bad first touches:** F, plus the failure counts in §12.

## 14. DRIBBLE-V1 unchanged

- **No file changes.** All frozen files are byte-identical to tag `dribble-v1-foundation-1` (`4f20d28`): `d15_core.js`, `d15_viewer.js`, `dribble15.html`, TURN-1.2 `turn1_loco.js` / `turn11_body.js`, BALL-FEEL-1.3 `config.js` / `world.js`, BALL-PHYS-1 `adapter.js` / `ball.js` / `geometry.js` / `math.js`. Records: sha256 at the start and the end (`evidence/frozen_sha256_*`); no diff since the tag.
- **Frozen tests re-run** (`evidence/dribble_v1_regression.json`):
  - DRIBBLE-1.5 cut and straight scenarios, seeds 1–12 (60 runs), run before any receive and again after receives in the same process: **60/60 tick-for-tick identical**;
  - **48/48** match DRIBBLE-1.5's evidence of record;
  - the frozen parameter object is deep-equal before and after.
- The adapter's overrides of frozen parameters exist only inside its own planning slices, restored at every pause.
- **Determinism** (`evidence/chrome_node_seed1.json`, `evidence/matched_seed.json`):
  - Node replay 20/20 identical;
  - Chrome / Node decisions 20/20 identical; state bit-identical in 7/20, and in the rest differs only in the last bits (≤ 9 × 10⁻¹² m), as in DRIBBLE-V1;
  - matched-seed capability: first-touch execution draws are keyed by seed, player, tick and foot (429/429 identical across builds, 162/162 differ across seeds).

## 15. Remaining limitations — and which belong to the attribute layer

**For the attribute layer:**
- **Ball Control on first-touch execution.** The generic factor (incoming speed, redirection) multiplies the frozen σ, which already reads Dribbling, Ball Control and Agility. Ball Control should weigh much more on receives.
- **Preferred / weak foot.** Today geometry picks the foot, with only the frozen small preference.
- **Agility / balance** in how far the receiving foot may reach (0.35 m today, for everyone) and how sharply the body can turn into the touch.
- **Reactions:** when the receiver starts adjusting to the pass. Today he reads it at the strike.
- **Pressure and fatigue:** not modelled in the receive.

**Not attributes — structural, for a next step (owner decision):**
1. **A receiving contact model.** The frozen dribble contact / launch model (designed for a ball moving with the player) rejects most launches for a hard incoming ball:
   - geometry: the surface must face the incoming ball;
   - the follow-through floor after a slowed foot.

   A receive-specific cushion / follow-through and a first-touch launch solve aimed at the exit motion would be the biggest gain. It would be a new receive module beside DRIBBLE-V1, or a change to the frozen core — your call.
2. **Body shape before the pass.** TURN-1.2 only runs (2.5 m/s floor, no walk or stand, no side-on open stance). Many head-on receives end in toe blocks because the body cannot open up.
3. **Approach pace.** Fast runners slow about 2 m/s before ordinary receives (§6).
4. **CPU** in the receive phase (§11).
5. **Left / right asymmetry** in turning receives (54 vs 95 clean).

## Decision

**RECEIVE-CONTROL-1 is presented for review and is not frozen.** My recommendation: **not ready to freeze.** The architecture and all the requested behaviours exist and are deterministic, with DRIBBLE-V1 untouched. But reliability (39 % clean, 30 % missed) and receive-phase CPU are not yet at a foundation level, and the main limits need a decision on a receiving contact model (§15).
