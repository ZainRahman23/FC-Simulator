# RECEIVE-CONTROL-1.1 — authored receive actions beside DRIBBLE-V1

18 October 2026, branch `prototype/dribble-1`. **Implemented and tested; presented for review, not frozen.**

This milestone follows the owner's instruction of 18 Oct, saved verbatim in `sources/`. Its subject is receiving built as an authoritative authored-action system:
- a rigid-body ball;
- one authoritative launch at the action's CONTACT marker;
- first-touch execution governed by Ball Control;
- an explicit handoff to the frozen DRIBBLE-V1.

I cannot play video in real time. Every visual judgement below comes from frame strips and stills of the rendered clips; the review page shows the clips themselves.

## Results at a glance

Same 238 situations × 3 seeds as RECEIVE-CONTROL-1, same player (Ball Control 89):

| | RECEIVE-CONTROL-1 | RECEIVE-CONTROL-1.1 |
|---|---|---|
| Runs | 714 | 714 |
| **Receive contact made** | 463 (65 %) | **675 (95 %)** |
| CLEAN (contact, new line ≤ 2.5 s, controlled at the end) | 279 (39 %) | **583 (82 %)** |
| TAKEN (new line, not controlled at the end) | 27 | 83 |
| RECEIVED (contact, never on the new line) | 157 | 9 |
| RECOVERED (pass went by, picked up later) | 38 | 0 |
| **No contact** | 213 (30 %) | **39 (5 %)** |
| 180° receives clean | 25 / 120 | 94 / 120 |
| CPU in the receive phase (one process) | 816 ms per simulated second, ~1.3 s per receive | **8.8 ms/s (median 6.3), ~16 ms per receive** |
| DRIBBLE-V1 unchanged | 60/60, 48/48 | 60/60 identical runs, 48/48 evidence |

Of the 39 runs with no contact:
- **19** are balls into space that a jogging or running receiver reaches only after the 4 s run ends ("MISSED-LATE"; the action exists, the contact falls after the end).
- **20** have no feasible action:
  - firm passes across a runner who wants to go back (180°);
  - firm side passes at 7.8 m/s that hit his toe during the approach;
  - two ordinary passes from the right at 271° (R_271_RUN_MED, seeds 1 and 3).

Only those 2 of the 246 ordinary receives miss outside rear passes into space.

---

## 1. The new receive architecture

```
incoming rigid-body ball (BALL-PHYS, untouched)
  → receiver intent (exit direction / speed; go, kill and hold, kill and go)
  → RECEIVE ACTION SELECTION: family × contact foot × side × contact position × contact tick, closed form, scored
  → the authored action owns the body: root path, facing, footwork, turn cost
  → CONTACT marker: one authoritative launch through the kernel's own schedule()
  → ideal post-contact ball state → Ball Control execution error → actual rigid-body ball state
  → free ball physics (the action's exit adapts to the actual ball)
  → handoff: a TURN-1.2 actor built from the action's exit state → frozen DRIBBLE-V1
```

The code lives beside the frozen DRIBBLE-V1 in `sandbox/visual/receive11/`:

| File | Role |
|---|---|
| `rx_core.js` | `ReceiveSim11 extends DribbleSim`. The frozen class is imported and never edited. |
| `rx_actions.js` | The family library, surfaces, footwork timing and Hermite root paths |
| `rx_exec.js` | The Ball Control execution model |
| `rx_body.js` | The placeholder body (presentation only) |
| `rx_cases.js` | The cases |
| `rx_viewer.js` + `receive11.html` | Lab and debugger |

The phases:
- **Before the action** a running receiver runs on TURN-1.2 exactly as any DRIBBLE-V1 actor, with an approach input toward the meeting point. A standing receiver is in an authored ready stance.
- **During the action**:
  - the receiver's colliders are taken out of the ball's world;
  - DRIBBLE-V1's resolver does not run;
  - the action's contact is the only interaction with the ball.
- **After the handoff** the frozen DRIBBLE-V1 runs unchanged.

## 2. Receive families implemented

These are the smallest set that covered the matrix. Each is authored once for the right contact foot in player-local space and mirrored for the left. Full definitions are in `rx_actions.js FAMILIES` and `RECEIVE11_ANIMATION_CONTRACT.md`.

| Family | Serves | Foot / surface | What the player attempts | Used in the matrix |
|---|---|---|---|---|
| **CUSHION** (kill) | intent kill, any angle | either foot / inside, sole | deaden the ball to rest about 0.42 m in front of the feet; square up to the pass (up to 150°); hold, or set off | kill blocks |
| **STRIDE** (touch into stride, angled receive) | ordinary (< 90°) | either foot / inside, outside, laces | the first touch is the next touch of the run: the ball onto the new line at the dribble's separation; the body turns up to 35° toward an angled exit before contact | 240 |
| **OPEN_TURN** (half-turn, near foot) | turning, 90–150° (to 180° via sole/inside) | turn-side foot / outside, laces, inside | open the body toward the new direction before the ball arrives (up to 60°); the near foot takes it into the new line | 174 |
| **THROUGH_TURN** (through/across-stance, Gravenberch-like) | turning, 90–181° | foot away from the turn / inside (sole for a straight drag-back) | the far foot's inside sends the ball across or behind the standing leg in an intermediate direction; the body rotates on the standing foot round the ball's path and emerges on the new line | 280 |

A 180° receive considers both turn sides.

## 3. Action-selection logic (exact)

`ReceiveSim11.planAction(k)`:
- runs at each TURN-1.2 touchdown once the ball's meeting point (RECEIVE-CONTROL-1's minimum-Δv interception) is within 1.05 s;
- for a standing receiver, runs from the start.

The family eligibility comes from RECEIVE-CONTROL-1's `receiveTurnAngle` at the pass (unchanged). For each eligible family × foot (by the family's foot rule) × side × contact position × contact tick (the meeting ± 6 × 6 ticks), `evalCand` builds the whole action in closed form:

1. **The ball at the contact**: from BALL-PHYS's free-ball prediction, which is exact because nothing touches the ball. A ball higher than 0.33 m is rejected.
2. **Preparation**:
   - the facing at the contact (family `face`);
   - the body speed at the contact: the speed that meets the ball on time along the run, capped by TURN-1's angle–velocity trade-off for the turn (`S_ENTRY × vContact`);
   - the body position that puts the ball at the family's contact point;
   - a Hermite root path from the current state, rejected if its peak acceleration exceeds 9.5 m/s² (5.5 from standing) or the rotation exceeds 620°/s.
3. **Exit**: the handoff speed (family table; ≥ 2.5 m/s) and duration (≥ txMin, the velocity change at ≤ 9 m/s², the rotation at ≤ 620°/s).
4. **Footwork** (`planSteps`): touchdowns fitted so that:
   - the standing foot plants 0.05–0.24 s before the contact;
   - the contact foot is in the air;
   - the handoff falls on a touchdown.

   No fit means a rejection.
5. **The ideal touch**: see 4–5.
6. **Surface**: the family surface whose outward normal can face the impulse Δv = v_out − v_in, within a glancing tolerance (50° for a soft touch down to 14° for a hard redirect). The foot yaw must stay in that surface's authored range.
7. **Standing-foot clearance**: the ball's path must clear the standing foot by ≥ 3.5 cm. The plant is moved back, forward or wider until it does, or the candidate is rejected.
8. **Difficulty** (see 6) and a **score** (lower is better):

   ```
   0.5·(peak acceleration / limit) + 0.8·(contact→handoff s) + 1.2·(D − 1) + surface preference
     + 0.35·(5 − weak foot)/2 if weak foot + 0.6·(exit pace lost) + 0.9·|contact tick − meeting| s
     + family preference + 0.15·|exit rotation|/π + 1.0·(braking of a touch into stride) + 0.3·(|ball vs exit|/30°)
   ```

The lowest score wins. The order and comparison are fixed, so the result is deterministic.

On average a receive evaluated 47.5 candidates in 1–4 planning events. Most rejections are preparation acceleration (the contact tick is not reachable from the current state).

## 4. Contact scheduling (exact)

The contact tick `kc` is chosen by the selection; the action starts at `k0` (a touchdown) and schedules everything relative to it:
- the ball's predicted arrival at `kc` defines the contact point;
- the root path, facing and footwork are built to meet it;
- safe timing range: contact 0.26–1.05 s after the start (standing receivers up to 2.6 s, with a hold first).

At `kc` the simulation calls the kernel's own `schedule()`:
- `tick: kc`;
- `position`: the planned contact point;
- `maxContactError: 0.06` m (the action's **contact window**);
- `colliderId: null` (an authored contact is not a boot-mesh collision);
- `velocity` / `spin`: the executed touch.

The kernel then asserts that the ball is inside the window and that no other collider contests it, or it cancels the launch. That is not a teleport, and nothing else ever writes the ball.

## 5. How the authoritative rigid-body ball is handled

**Before the contact** the ball is BALL-PHYS's free rigid body. The prediction the action was planned on is exact, because the receiver's colliders are out of the ball's world.

**At the contact**:
- the single resolved launch sets velocity and rolling-consistent spin;
- the ideal touch is solved with BALL-PHYS's own roll table, so that the ball is **on the player's new line, `HANDOFF_AHEAD(speed)` ahead of him (1.2 m at 2.5 m/s … 2.0 m at 7.8 m/s), crossing the line 0.15–0.28 s after the handoff**;
- for a kill, it is the rest point 0.42 m in front of the feet.

Why those targets:
- `tools/rx_d1accept.mjs` measured DRIBBLE-V1's takeover from ball states ahead of a runner;
- on the line and ≥ 1 m ahead it takes over in 78/80 cases; 0.2 m off the line in 145/200; 0.6 m ahead in 38/60;
- in the matrix, takeovers that failed had ball–exit crossing angles of 13–24°, clean ones 7°.

**After the launch** the ball rolls freely. The rest of the action's exit path is re-solved on the **actual** ball (the executed touch, error included, predicted by BALL-PHYS):
- the running line shifts sideways by ≤ 0.5 m, or back by ≤ 0.5 m, so the ball is on it;
- the exit direction, handoff speed and handoff tick do not change;
- a touch that went too far wrong is not chased by the action.

## 6. Ball Control execution model

`rx_exec.js`, model id `receive-execution-v1`. It is an execution-error distribution, never a success probability:

```
actual direction = ideal direction + σ_dir(BC) · D · N1
actual speed     = ideal speed + σ_speed(BC) · D · (0.5·|v_ideal| + 0.35·|v_in|) · N2      (≥ 0)
```

- **N1, N2** are keyed normal draws:
  - key: `seed | RECEIVE | player | receive event (index@contact tick) | receive-execution-v1 | dimension | draw index`;
  - the direction is turned with the kernel's deterministic dsin/dcos.
- **σ_dir(BC)**: 0.8° at 99, 2.0° at 90, 3.5° at 80, 5.5° at 70, 8° at 60, 11° at 50, 14° at 40, 18° at 30.
- **σ_speed(BC)**: 2 %, 5, 8, 12, 17, 22, 27, 32 % of the speed scale, at the same ratings.
- **The speed scale** includes the incoming speed: absorbing a hard pass is the hard part of a soft touch.
- **Difficulty D** = 1 + 0.06·max(0, |v_in| − 6) + 0.25·redirect/180° + 0.05·max(0, s − 5) + 0.3·body rotation within ±0.15 s/180° + surface (outside 0.15, laces 0.10, sole 0.20) + weak foot 0.08·(5 − wf) + 0.008·glance°.

  Matrix median D is 1.36 (p90 1.53).
- **Extension points**: agility, reactions, pressure and fatigue are documented multipliers on D, all neutral now.

The constants are calibration values for review, **not locked**:
- `tools/rx_calib.mjs` prints σ and the resulting spread at the reconnection point for a kill, a stride touch and a turn touch at any rating and difficulty (`evidence/ball_control_calibration.txt`);
- `RXEOVR` overrides them in one process.

## 7. Behaviour at Ball Control 99

Ball Control sweep, 8 representative receives × 3 seeds at each rating (`evidence/blocks_K_KG_BC.json`):
- BC 99: 23/24 CLEAN; median direction error 0.3° (p90 1.6°), speed error 0.08 m/s, reconnection miss 0.08 m.
- **Kill**: case A deadens a 7.2 m/s pass. The touch leaves at 1.19 m/s (ideal 1.18) and the ball is dead 0.41 m in front of the feet 0.61 s later.

  Over the whole kill block, 63/63 pass strengths and directions are killed, at rest 0.43 m ahead (median 0.60 s).
- **Touch into stride** (case B): the ideal 8.47 m/s push is executed at 8.27 m/s, 0.8° off, and the runner keeps 5.5 m/s.

So 99 means the intended touch, whatever it is. It is not "stop the ball".

## 8. Lower-rating behaviour

| Ball Control | Clean / 24 | Median direction error (p90) | Median speed error (p90) | Reconnection miss median (p90) | Heavy / short |
|---|---|---|---|---|---|
| 99 | 23 | 0.3° (1.6°) | 0.08 m/s (0.26) | 0.08 m (0.24) | 0 / 0 |
| 89 | 22 | 0.8° (4.2°) | 0.20 (0.70) | 0.22 (0.63) | 0 / 0 |
| 80 | 21 | 1.2° (6.8°) | 0.30 (1.05) | 0.35 (0.94) | 0 / 0 |
| 70 | 21 | 1.9° (10.7°) | 0.46 (1.58) | 0.54 (1.12) | 3 / 2 |
| 60 | 18 | 2.8° (15.6°) | 0.65 (2.24) | 0.77 (1.52) | 5 / 3 |
| 50 | 14 | 3.8° (21.4°) | 0.84 (2.89) | 1.03 (2.55) | 5 / 6 |
| 40 | 13 | 4.9° (27.2°) | 1.03 (3.55) | 1.12 (2.60) | 6 / 8 |

Heavy and short mean a speed error beyond max(0.8 m/s, 20 %). Loss of control emerges from the rigid-body result. Case I is B's receive at BC 50: 10.7° wide and 2.2 m/s short, the ball 0.65 m ahead at the handoff, and it is lost. Whether this scaling is right is the owner's call; the constants are not locked.

## 9. Large-turn geometry

The body is pre-rotated before the contact (family `face`), and the rest of the rotation happens between the contact and the handoff. The ball first-touch vector is solved toward the reconnection point, so it differs from the exit by an angle that depends on where the contact point is relative to the new line (`analysis.json`, `intermediate`):

| Turn | Median rotation before / after the contact | Median ball vs exit | Families |
|---|---|---|---|
| 90° | 40° / 50° | 8° | open 80, through 43 |
| 120–135° | 48° / 78° | 11° | open 23, through 19 |
| 180° | 60° / 120° | 6° | through 50, open 60 |
| 225–240° | 29° / 102° | 10° | through 39, open 3 |
| 270° | 20° / 70° | 9° | through 120, open 4 |

The left/right split is the right-footed player's preference:
- left turns (225–270°) put the right foot far side, so they mostly use the through-stance family;
- right turns use the right foot near side (open turn).

With a two-footed player the selection is exactly mirrored (§12).

## 10. The through/across-stance turn

Implemented by THROUGH_TURN; review cases E and F, plus D and J.

Sequence:
1. The receiver, already knowing the exit, pre-rotates up to 35° toward the turn.
2. The standing foot (turn side) plants 0.05–0.24 s before the contact, at a plant the selection moves until the ball's post-touch path clears it.
3. The far foot swings across and presents its inside to the ball at the CONTACT marker.
4. The touch sends the ball across or behind the standing leg toward the reconnection point.
5. The standing foot pivots on its forefoot while the body rotates round the ball's path.
6. The contact foot steps round, and the body emerges on the new line at the handoff touchdown.

Case E is 120° left, right-foot inside: the ball goes out at −112.8° for a −120° exit, the body rotates −26° before and −94° after the contact, and he is on the new line with the ball 1.7 m ahead.

## 11. How the ball-touch direction differs from the body exit direction

They are separate quantities with separate debugger arrows:
- the **BALL FIRST-TOUCH VECTOR** (red, from the contact point);
- the **PLAYER FINAL EXIT VECTOR** (green, from the handoff position).

The ball goes to where the player will rejoin it: a point on his new line ahead of where he will be. When the contact happens beside, in front of or behind his future line, that direction is an intermediate one (5–20° in the matrix median ranges). The straight ball path and the body's curved path meet on the new line just after the handoff. Debugger panel, top view: `?case=F_240_JOG_MED_BC99_WF5&diag=1&single=top`.

## 12. Mirroring

- Families are defined once (right contact foot) and mirrored by the sign of the lateral components.
- The turn side picks the foot by the family's foot rule (near / far).
- The 180° turn considers both sides.

`evidence/mirror.json` runs a case and its mirror image (pass direction and exit mirrored, TURN-1.2's mirrored stride phase, a two-footed player, execution error off). It confirmed **10/10 pairs**: the same family, mirrored foot and side, the same surface, contact and handoff ticks, and a mirrored ideal touch and body path, to 1.1e-13 m. One pair (front pass, straight exit) is its own mirror: both runs pick the same of the two equivalent feet.

For the right-footed matrix player, the preferred foot does change some choices: right turns use the open turn with the right foot. That is an attribute effect, not an asymmetry of the system. Cases E/F use a two-footed override (`_WF5`).

## 13. 180° receive behaviour

- **Outcomes**: 94/120 CLEAN, 9 TAKEN, 7 RECEIVED, 10 no contact. RECEIVE-CONTROL-1 had 25 clean and 6 taken.
- **Families**: OPEN_TURN 62, THROUGH_TURN 52.
- **Speed**: the body arrives at the contact at a median 2.4 m/s (TURN-1's 180° entry speed) and leaves at 2.8–3.1 m/s, accelerating out through the exit ramp.
- **Rotation**: about 60° before and 120° after the contact. There is no dead stop and no stationary pivot.
- **Case G** (pass from the front, jogging): pre-rotation 60°, right-foot inside at 1.07 s, the ball sent at −171° (10° off the exit), on the new line at the handoff with the ball 1.8 m ahead.

## 14. Full-throttle behaviour

There is no braking for contact geometry any more: the authored contact does not need a legal foot collision.

- **Ordinary receivers above 4 m/s** keep a median 94 % of their speed at the contact.
- **Passes from the front and front sides** keep 98.5 %.
- **Side passes** (L/R) slow to a median 65 %. RECEIVE-CONTROL-1's cases aim those passes behind a runner at 5.5–7.8 m/s, so he must check his run; that is the pass, not the solver.
- **FAST (7.8 m/s), ordinary**: contact 7.05 m/s median, handoff 7.8.
- **FAST, turning**: contact 2.55, handoff 4.0. The turn cost is TURN-1's angle–velocity trade-off: impossible velocities are not preserved through a turn.
- **Case H**: 7.8 → 7.77 m/s at the contact, an 11.7 m/s push into stride, 7.8 m/s at the handoff and after.
- **Case H′**: a 90° turn from 7.8: 4.3 m/s at the contact, handoff 4.2, then back up to pace.

## 15. Failure behaviour

**Bad touches** come from the execution distribution:
- wide, short, heavy and wrong-side touches all occur;
- the action's exit adapts by at most 0.5 m;
- beyond that, DRIBBLE-V1 gets a loose ball.

Case J is E's action at running pace at BC 45, seed 4: correct family and foot, executed +16.4° and +3.1 m/s heavy. The ball is 3.4 m from where it was meant to be, he is on his exit line without it, and the ball is lost.

**No contact** happens when no action is feasible (no candidate passes the limits) or the contact falls after the run ends. A kernel cancellation (an opponent or deflection) would also give no contact; none occurs in the matrix.

**Physical deflections before the action** stay physical. In 6 runs a firm side pass hits a 7.8 m/s runner's toe during the TURN-1.2 approach.

**After the handoff**, 79 of the 83 TAKEN runs are DRIBBLE-V1 takeovers that never make a touch, with the ball on the line about 1.4 m ahead. This is DRIBBLE-V1's own stride-phase sensitivity:
- it reproduces in pure DRIBBLE-V1 starts while the runner accelerates (2/27 such starts fail);
- the frozen core is not changed to fix it.

## 16. DRIBBLE-V1 handoff

At the handoff tick:
1. The action's exit state (position on the exit line, heading = exit, speed ≥ 2.5 m/s, a foot just landed) becomes a fresh TURN-1.2 actor (`t1Make`), its clock rebased to the simulation's.
2. TURN-1.1's body layer is attached, as DRIBBLE-V1 does.
3. The collider history restarts from that actor's own pose.
4. DRIBBLE-V1's resolver state is fresh: no plan, no held cut, the exit as the requested direction, and the receive touch as its last touch.
5. The exit pace is requested in two steps: the handoff speed + 1.5 m/s, then the full pace 0.8 s later. A single jump to full pace with the ball rolling at the runner's speed is a pocket DRIBBLE-V1 does not take.

Measured over 666 handoffs:
- body acceleration across the handoff tick: median 3.6, max 5.8 m/s²;
- facing step: 0°; request vs exit: 0°;
- ball at the handoff: median 1.62 m ahead, 0.06 m off the line;
- double touches 0; same-foot recontacts 0;
- DRIBBLE-V1 made a touch after 573.

## 17. Deterministic test results

| Check | Result |
|---|---|
| Chrome 155 vs Node 22 (20 cases; `chrome_node_seed1.json`) | Decisions 20/20 identical (touches, action, execution draw, handoff, control changes). Receive phase bit-identical 20/20; every remaining last-bit state difference (≤ 1e-10) starts after the handoff, inside the frozen TURN-1.2 / DRIBBLE-V1 |
| Animation on vs off (11 cases × 4 seeds; `determinism_node.json`) | 44/44 identical fingerprints and decisions |
| Node replay | 44/44 identical |
| Execution draws across seeds | Different in every situation; the same seed and event gives the same draw |
| `receiveTurnAngle` boundaries | 89° ordinary · 90° turning · 270° turning · 271° ordinary; matrix 28/28 (classification + family kind) |
| Mirror | 10/10 |

## 18. Aggregate receive results

The matrix of record is `evidence/matrix_714.json`; the table at the top compares it with RECEIVE-CONTROL-1. By class:

| | Runs | Contact | Clean | No contact |
|---|---|---|---|---|
| Ordinary | 246 | 234 | 210 (85 %) | 12 |
| Turning | 468 | 441 | 373 (80 %) | 27 |
| Standing receiver | 108 | 108 | 92 | 0 |
| Jogging | 174 | 153 | 137 | 21 |
| Running | 324 | 312 | 273 | 12 |
| Full throttle | 108 | 102 | 81 | 6 |
| Soft passes | 144 | 144 | 127 | 0 |
| Medium | 426 | 399 | 343 | 27 |
| Firm | 144 | 132 | 113 | 12 |

The weakest pass direction is rear (RL / RR): 58–62 % clean, most of the no-contacts. These are balls into space that a jogger reaches late.

Kill block (standing receivers, 7 directions × 3 strengths × 3 seeds): 63/63 killed. Kill and go: 45/45 contacted; 18 killed and 27 settled (the ball rolls about 1 m to the set-off point, by design).

## 19. CPU / performance

`evidence/cpu.json`: one process on an idle machine, 20 cases, animation off, as the matrix.

| | RECEIVE-CONTROL-1 | RECEIVE-CONTROL-1.1 |
|---|---|---|
| Receive phase | 816 ms per simulated second, ~1.3 s per receive | **8.8 ms/s (median 6.3), 16.4 ms per receive** |
| Placeholder body animated | — | 21 ms/s |
| After the handoff (frozen DRIBBLE-V1) | 128 ms/s | 161 ms/s |
| Worst step, receive phase | 65 ms | 16.9 ms |
| Worst step, after handoff | — | 38 ms |
| Candidates per receive | thousands of contact evaluations | 47.5 closed-form candidates in 1–4 planning events |

All 20 replays were identical.

## 20. DRIBBLE-V1 regression results

`evidence/dribble_v1_regression.json`:
- **Same-process check**: the frozen DRIBBLE-1.5 cut scenarios (5 × 12 seeds) were run before and after the review receives (animation on) in one process: **60/60 runs identical**.
- **Frozen evidence**: 48/48 match `dribble15/evidence/score96_d15.json`.
- **Parameters**: `D1` deep-equal before and after.

`evidence/frozen_sha256_end_check.txt`: the sha256 of every frozen file (DRIBBLE-V1, its viewer, TURN-1.2 / TURN-1.1, RUN-1.3, BALL-PHYS, the attributes, the RNG and the colliders) is identical to `frozen_sha256_start.txt`.

## 21. Review page / lab links

Local only: the lab shows real player names.

| What | Where |
|---|---|
| Review page | `http://127.0.0.1:8361/review_artifacts/receive11/review/RECEIVE11_REVIEW.html` |
| Lab | `http://127.0.0.1:8361/sandbox/visual/receive11.html?case=F_240_JOG_MED_BC99_WF5&diag=1` |
| Debugger in the top view | add `&single=top` |
| Ball Control override | `&bc=60` |
| Animation off (same outcome) | `&anim=0` |

The review cases (`rx_cases.js VISUAL`):

| Case | Lab case | Shows |
|---|---|---|
| A | `F_0_STAND_MED_KILL_BC99` | kill |
| B | `FL_0_RUN_MED_BC99` | touch into stride |
| C | `F_90_RUN_MED_BC99` | 90° turn |
| D | `FR_135_RUN_MED_BC99` | 135° turn |
| E | `F_240_JOG_MED_BC99_WF5` | through-stance turn left |
| F | `F_120_JOG_MED_BC99_WF5` | mirrored |
| G | `F_180R_JOG_MED_BC99` | 180° turn |
| H | `F_0_FAST_MED_BC99` | 7.8 m/s in stride |
| H′ | `F_90_FAST_MED_BC99` | 90° turn at full throttle |
| I | `FL_0_RUN_MED_BC50` | poor Ball Control |
| J | `F_240_RUN_MED_BC45&seed=4` | failed / heavy |

## 22. Known limitations

- **The body is a placeholder**, procedural from RUN-1.3's pieces. It shows the decided action (footwork, the contact surface on the ball, the pivot, the rotation) but is not production animation:
  - the close view shows simplified knees and feet;
  - the contact foot visually overlaps the ball by up to about 2 cm at the contact.

  `RECEIVE11_ANIMATION_CONTRACT.md` defines what assets must meet.
- **DRIBBLE-V1's takeover** misses in 79 runs (ball on the line about 1.4 m ahead, no touch), its own stride-phase sensitivity. Fixing it means changing frozen DRIBBLE-V1, or a dedicated first dribble touch in the receive system; that is an owner decision.
- **TURN-1.2 still cannot walk or stand.** The ready stance and the kill-and-hold are authored. The handoff speed is ≥ 2.5 m/s, so a kill and go always sets off at 2.5 m/s.
- **RECEIVE-CONTROL-1's side passes at RUN/FAST** are aimed behind the runner, which forces real braking (65 % median). That is a property of those cases.
- **Rear passes into space** for joggers are often reached only after the 4 s runs end.
- **Ball Control constants** are calibration values, not locked. Agility, reactions, weak foot (beyond the existing score and difficulty terms), pressure and fatigue are extension points only.
- **No opponents** in the matrix. A contested contact is cancelled by the kernel, but there is no pressure model.
- **Stance clearance** is checked for the standing foot, not the whole leg. With colliders out of the ball's world during an action, an unusual execution error could pass the ball through the procedural shin visually; the outcome would not change.

**Recommendation:** the architectural pivot does what the instruction asked. Contact on feasible receives is reliable (95 % overall, 99 % of ordinary non-rear receives). There is no braking for geometry, and turns, mirroring and Ball Control scaling all work. The receive phase is about 90× cheaper. It is **not ready to freeze yet**: the owner's visual review of the action geometry, the Ball Control scaling and the transitions is the next step, as instructed. DRIBBLE-V1's takeover gap (79 runs) is the largest remaining loss.
