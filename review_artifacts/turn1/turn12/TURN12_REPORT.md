# TURN-1.2 — TURN-1 restored as the default, plus speed-dependent BRAKE → REORGANISE → TURN → ACCELERATE

16 Oct 2026, branch `prototype/turn-1`.
- **Instruction:** `../sources/2026-10-16_user_instruction_turn1_2_speed_dependent_brake_turn_reversals.md`.
- **Review page:** `review/TURN12_REVIEW.html`.
- **Viewer:** `sandbox/visual/turn1.html?scn=SPRINT_180R`. The default is TURN-1.2; `&body=t1` shows TURN-1, `&body=t11` TURN-1.1, `&diag=1` the debug view and readout.

I cannot play video in real time. Every visual judgement here comes from frame strips and stills; every number is measured.

## What TURN-1.2 is

| | |
|---|---|
| **TURN-1 (7b58d1a)** | **The default, unchanged.** Without the opt-in flag `init.turn12`, the engine is bit-identical to 7b58d1a: all 77 TURN-1 regression hashes match. With the flag, every case the new resolver does not reassign (28 of 28 here) is also bit-identical to TURN-1, pose included. That covers curves, ordinary steering, every JOG turn, RUN and SPRINT up to 90°, zig-zags and continuous input. |
| **TURN-1.1** | **Preserved separately, untouched.** Its 84 evidence hashes still match (`turn11/`). It is not used for ordinary movement. |
| **New in TURN-1.2** | **One new family, two variants:** BRAKE_TURN and BRAKE_SHUFFLE_TURN. They apply only to large turns under real momentum. |
| **One refinement of TURN-1** | **A compact pivot.** A TURN-1 pivot no longer waits through a slow braking stride once its speed is already down; this affects JOG 150° and 180°. |
| **Body** | **Phase-appropriate, for the new family only:** braking, reorganising, turning, accelerating. Everything else keeps TURN-1's body. |

The simulation / presentation boundary is unchanged, and there is no ball.

## The resolver: exact logic

Every heading request (incoming speed `s`, requested change `a`, the stride state) resolves to one of five families:

- **CURVE:** `a ≤ arcLimit(s)` (TURN-1's: 50° at 3 m/s → 25° at 9.5 m/s); arc steering, TURN-1.
- **TURN1_CUT / TURN1_PIVOT:** TURN-1's own planner, unchanged.
  - **Pivot vs cut:** a pivot when `a ≥ 135°`, or `≥ 110°` on the inside foot when that is sooner.
  - **When:** unless both brake-family conditions below hold.
  - **Compact:** a TURN-1 pivot plants on the next touchdown as soon as a braking stance leaves the speed ≤ its entry speed + 0.6 m/s.
- **Brake family:** taken when **both** hold:
  1. **The angle is large for the speed:** `a ≥ aLarge(s) − 10°`, where `aLarge` is 118° at 5 m/s, 110° at 6.5, 105° at 8 and 102° at 9.5 (the threshold falls as momentum grows).
  2. **Real momentum remains:** the speed TURN-1 would still have to remove before its plant is at least 3.6 m/s, i.e. `s − sEntry(a) ≥ 3.6`. `sEntry` is TURN-1's angle–velocity table: 4.3 m/s at 90°, 3.0 at 135°, 2.4 at 180°.
  - **The transition band** (`aLarge ± 10°`) is decided by **stride state**. TURN-1's own plan for this request is evaluated first (its braking-stance count `nB` depends on which foot is next). It switches to the brake family only if `nB + 3x ≥ 4`, where `x` goes from 0 to 1 across the band. Example: at 8.5 m/s and 100°, a right-foot stride phase takes BRAKE_TURN and a left-foot one keeps the TURN-1 cut.
  - **Which variant:** BRAKE_SHUFFLE_TURN when reorganisation steps are needed (below), otherwise BRAKE_TURN.

The resulting map, measured for both stride phases (`evidence/TURN12_check.json` and the sweep in this report's history):

| Speed | 60–100° | 110–120° | 130° | 140° | 150–180° |
|---|---|---|---|---|---|
| ≤ 6 m/s (LOW, JOG) | TURN1_CUT | TURN1_CUT | TURN1_CUT | TURN1_PIVOT | TURN1_PIVOT (compact at JOG) |
| 6.5 m/s | TURN1_CUT | TURN1_CUT | TURN1_CUT | TURN1_PIVOT | BRAKE_SHUFFLE_TURN |
| 7 m/s | TURN1_CUT | TURN1_CUT | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN |
| 7.8 m/s (RUN) | TURN1_CUT | BRAKE_TURN | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN |
| 8.5–9.5 m/s (SPRINT) | TURN1_CUT (100°: stride decides at 8.5; BRAKE_TURN at 9.5) | BRAKE_TURN | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN | BRAKE_SHUFFLE_TURN |

## The new family: how it works

All of it lives in TURN-1's engine, under TURN-1's physics: every velocity change happens during a stance, plants are fixed world points, and flights are ballistic.

1. **Quick braking (BRAKEQ).**
   - **Stance shape:** short, choppy stances. Contact is ≤ 0.70 m of COM travel and ≤ 0.16 s; flights are cut to 42 % of the run's; each stance removes up to 88 % of its capacity.
   - **The stride count follows from the state:** braking continues until the speed reaches the hand-over speed (3.2 m/s at 110° → 2.2 m/s at 180°).
   - **No waiting stride:** when reorganisation steps follow, braking stops up to 0.6 m/s early and they take the rest. TURN-1's final low-ΔV waiting stride is gone.
   - **Result:** from a sprint, 4–5 stances spaced 0.12–0.18 s apart, against TURN-1's 5 long strides spaced 0.17–0.36 s.
2. **Reorganise / shuffle (REORG).** Quick, wide steps (contact 0.13 s, flight 0.03 s, 10 cm wider than running), each placed with its toes turned toward the new direction. The hips open with them.
   - **How many** comes from the state:
     - the base rotation the turn plant cannot do itself (`a − 105°`, at most 50° per step, none below 20°);
     - the speed still to remove;
     - **which foot is next**: once the base is open, the turn plant must be the **outside** foot. If the count would land it on the inside foot, the plan takes one braking stance fewer (the shuffle absorbs the speed, when it can) or one shuffle step more.
   - **Typical counts:** 120° → 0 (BRAKE_TURN); 135–150° → 1; 180° → 2 (the second is mostly a re-orientation step).
3. **Turn.**
   - **The plant:** shorter than TURN-1's reversal plant (0.19–0.23 s against 0.30–0.34 s), because the base is already open, with a ball-of-foot pivot on the remaining rotation.
   - **During it:** the hips go from the reorganised angle to 85 % of the turn, and the velocity reverses into the new direction (1.9–2.7 m/s exit).
4. **Accelerate.** TURN-1's own EXIT step and acceleration steps follow (the first powerful step, then 2–3 acceleration steps back to running), plus the acceleration-out body (below).

**Continuous input:**
- **Before the turn plant, the request may still change:**
  - **retarget** (re-planned from the current state, keeping the steps already taken);
  - **re-plan** (a move of more than 25°, or to the other side: the new request is resolved afresh at the current speed, so it may become a TURN-1 cut);
  - **cancel** (back within the arc limit: TURN-1 running re-accelerates).
- **A touchdown already committed keeps its braking role,** so it never re-accelerates mid-braking.
- **A cut re-planned out of an aborted reversal** plants at the next outside-foot touchdown once the speed is down.
- **Commitment point:** the turn-plant touchdown. After it, ±20° (TURN-1's rule).

## Body language: phase-appropriate, new family only

The TURN-1.1 layer runs in a restricted mode `t12` that only ever sees this family. TURN-1's curves, cuts and pivots keep TURN-1's body bit for bit.

| Phase | What the body does |
|---|---|
| Command | The REACT term: the shoulders start turning, a slight sink and brace, the arms organise. The upper body visibly answers in 0.07 s (TURN-1: 0.20 s at RUN). |
| Brake | The trunk resists the momentum (−10° on top of TURN-1's braking lean), a slight sink. The arms come forward and out with the elbows bent at 85°: counterbalance, not reach. |
| Reorganise | A compact, balanced stance: arms out to the sides, a slightly lower pelvis, the head already toward the new direction (TURN-1's gaze). |
| Turn | The REVERSAL base: the shoulders lead the hips (≤ 15°), the outside arm sweeps across, the inside arm drives back. The free leg comes through to the first step. There is no cut lean. |
| Accelerate | The EXIT modifier: arm drive +50 %, knee drive, the head up. The low acceleration posture rises with speed. |

Foot stability comes with the layer: the re-planned reach drop, the late-stance reach guard and the hips over the pushing foot.

**TURN-1.1 salvage audit (item 11):**
- **Reused:** pivot-foot stability (the reach guards), the quicker visible reaction, a braking posture (made calmer and lower-armed), arm counterbalance, acceleration-out, the free leg's come-through into the first step.
- **Not reused:** the side-step / crossover / pivot cut bases, the exaggerated cut lean, all sub-90° body changes. The side-on pivot hips are replaced by the engine's own reorganisation, which opens the hips by mechanics.

## Results (`evidence/`)

- **TURN-1 preserved:**
  - `TURN1_identity_after_turn12.json`: 77 / 77 without the flag.
  - `TURN12_check.json`: 28 / 28 cases that keep TURN-1's family are bit-identical with the flag, pose included.
  - TURN-1.1: 84 / 84 of its evidence hashes unchanged.
- **Determinism:** every scenario replays identically.
- **Mirroring** (`TURN12_mirror.json`, 28 pairs of a right turn started on the right foot against a left turn started on the left foot): COM 0 mm, events identical (logged numbers within 0.01), layer channels exact. Mirrored joints differ by ≤ 26.8 mm, identical to TURN-1's own control (RUN-1.3's deliberate arm asymmetry).
- **Plant-foot slip:** ≤ 0.12 cm in every reversal of the new family (TURN-1's pivots: 1.5–2.3 cm). The compact JOG pivots: 0.06–0.09 cm (TURN-1: 1.5–2.0 cm).
- **Pose continuity:** the largest 240 Hz pelvis residual is ≤ 5.5 mm in the new family (≤ 10.1 mm in the aborted-reversal re-plan); the worst joint ≤ 36 mm, the size of RUN-1.3's own landing transient.

**Metrics, every case** (TURN-1 → TURN-1.2; times in seconds after the first request):
- **Response:** the upper body ≥ 8 cm off the same player given no command.
- **Facing:** the pelvis within 10° of the new direction.
- **Velocity:** within 5° of the new direction.
- **Accel:** the speed back above its minimum + 0.3 m/s.
- **Slip:** the worst loaded plant.

| Case | Family | In m/s | Response | 1st brake | Brakes | Reorg (feet) | Turn plant | Facing | Velocity | Accel | v min | Slip cm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| JOG 60° | TURN1_CUT (kept) | 5.5 | 0.20 | – | 0 | 0 | 0.25 | 0.49 | 0.58 | 0.55 | 4.52 | 0.02 |
| JOG 90° | TURN1_CUT (kept) | 5.5 | 0.23 | 0.25 | 1 | 0 | 0.50 | 0.81 | 0.89 | 0.83 | 3.02 | 0.03 |
| JOG 120° | TURN1_CUT (kept) | 5.5 | 0.21 | 0.25 | 1 | 0 | 0.51 | 0.89 | 0.96 | 0.90 | 1.97 | 0.02 |
| JOG 150° | TURN1_PIVOT → compact | 5.5 | 0.21 | 0.25 | 2 → 1 | 0 | 0.87 → 0.53 | 1.31 → 0.96 | 1.14 → 0.79 | 1.13 → 0.77 | 0.46 → 0.40 | 1.48 → 0.06 |
| JOG 180° | TURN1_PIVOT → compact | 5.5 | 0.21 | 0.25 | 2 → 1 | 0 | 0.89 → 0.53 | 1.37 → 1.01 | 1.15 → 0.80 | 1.15 → 0.78 | 0.09 → 0.03 | 2.00 → 0.09 |
| RUN 60° | TURN1_CUT (kept) | 7.8 | 0.20 | 0.24 | 1 | 0 | 0.43 | 0.66 | 0.77 | 0.73 | 5.10 | 0.02 |
| RUN 90° | TURN1_CUT (kept) | 7.8 | 0.20 | 0.24 | 2 | 0 | 0.67 | 0.98 | 1.06 | 1.01 | 3.04 | 0.02 |
| RUN 120° | → BRAKE_TURN | 7.8 | 0.20 → 0.07 | 0.24 | 3 → 3 | 0 | 0.98 → 0.75 | 1.37 → 1.05 | 1.22 → 1.11 | 1.32 → 1.03 | 0.95 → 1.54 | 0.12 → 0.06 |
| RUN 135° | → BRAKE_SHUFFLE_TURN | 7.8 | 0.20 → 0.07 | 0.24 | 4 → 3 | 1 (R) | 1.32 → 0.91 | 1.73 → 1.23 | 1.58 → 1.10 | 1.58 → 1.04 | 0.71 → 0.95 | 0.10 → 0.11 |
| RUN 150° | → BRAKE_SHUFFLE_TURN | 7.8 | 0.20 → 0.07 | 0.24 | 4 → 3 | 1 (R) | 1.35 → 0.91 | 1.78 → 1.24 | 1.61 → 1.08 | 1.60 → 1.03 | 0.50 → 0.63 | 0.05 → 0.03 |
| RUN 180° | → BRAKE_SHUFFLE_TURN | 7.8 | 0.20 → 0.07 | 0.24 | 4 → 2 | 2 (L R) | 1.37 → 0.86 | 1.86 → 1.20 | 1.65 → 1.00 | 1.63 → 0.98 | 0.13 → 0.12 | 0.08 → 0.05 |
| SPRINT 60° | TURN1_CUT (kept) | 9.5 | 0.07 | 0.10 | 2 | 0 | 0.46 | 0.68 | 0.91 | 0.78 | 5.35 | 0.02 |
| SPRINT 90° | TURN1_CUT (kept) | 9.5 | 0.07 | 0.10 | 4 | 0 | 0.94 | 1.26 | 1.33 | 1.28 | 3.06 | 0.02 |
| SPRINT 120° | → BRAKE_TURN | 9.5 | 0.07 | 0.10 | 4 → 5 | 0 | 0.96 → 0.90 | 1.34 → 1.21 | 1.41 → 1.26 | 1.35 → 1.18 | 2.01 → 1.60 | 0.02 → 0.12 |
| SPRINT 150° | → BRAKE_SHUFFLE_TURN | 9.5 | 0.07 | 0.10 | 5 → 5 | 1 (R) | 1.33 → 1.06 | 1.77 → 1.39 | 1.60 → 1.23 | 1.59 → 1.19 | 0.51 → 0.68 | 1.46 → 0.07 |
| SPRINT 180° | → BRAKE_SHUFFLE_TURN | 9.5 | 0.07 | 0.10 | 5 → 4 | 2 (L R) | 1.35 → 1.02 | 1.84 → 1.36 | 1.63 → 1.17 | 1.62 → 1.14 | 0.14 → 0.17 | 1.89 → 0.04 |
| LOW 180° | TURN1_PIVOT (kept) | 3.0 | 0.17 | 0.09 | 1 | 0 | 0.45 | 0.93 | 0.72 | 0.71 | 0.07 | 0.46 |
| JOG 30° | CURVE (kept) | 5.5 | 0.32 | – | 0 | 0 | – | 0.69 | 0.71 | – | 5.41 | 0.02 |
| Slalom (JOG) | CURVE (kept) | 5.5 | 0.07 | – | 0 | 0 | – | – | – | – | 5.41 | 0.02 |
| Zig-zag (RUN) | TURN1_CUT (kept) | 7.8 | 0.20 | 0.24 | 2 | 0 | 0.43 | – | – | 0.73 | 5.10 | 0.02 |
| SPRINT 180° → 60° (abort) | re-planned → TURN1_CUT | 9.5 | 0.07 | 0.10 | 3 | 0 | 0.51 | 0.74 | 0.81 | 0.79 | 5.02 | 0.02 |
| SPRINT 180° → 0° (cancel) | → cancelled, TURN-1 running | 9.5 | 0.07 | 0.10 | 2 | 0 | – | 0.40 | 0.35 | 0.43 | 7.12 | 0.02 |
| RUN 180° → 90° (abort) | re-planned → TURN1_CUT (compact) | 7.8 | 0.20 → 0.07 | 0.24 | 2 | 0 | 0.67 → 0.54 | 0.98 → 0.85 | 1.06 → 0.93 | 1.00 → 0.89 | 3.07 → 3.10 | 0.03 |
| SPRINT 180° → 135° (retarget) | BRAKE_SHUFFLE_TURN | 9.5 | 0.07 | 0.10 | 5 | 1 (R) | 1.35 → 1.06 | 1.70 → 1.38 | 1.60 → 1.35 | 1.70 → 1.20 | 0.58 → 1.03 | 0.07 → 0.06 |
| RUN 150° R → L (flip) | BRAKE_SHUFFLE_TURN | 7.8 | 0.20 → 0.07 | 0.24 | 3 | 2 (R L) | 1.35 → 1.07 | 1.79 → 1.40 | 1.61 → 1.24 | 1.60 → 1.20 | 0.47 → 0.62 | 2.14 → 0.06 |

Where the family is "kept", the TURN-1 and TURN-1.2 values are identical. The first braking step is always the first touchdown that can still change: TURN-1's 0.09 s reaction rule.

## Iteration history (what failed and why)

1. **The first quick-braking plan still ended in slow strides.** A final braking stance at about 2.5 m/s removed only 0.3 m/s; RUN 180° then planted at +1.38 s, no better than TURN-1. Fix: braking hands its last scraps to the shuffle steps, and braking contact is capped at 0.16 s.
2. **An unnecessary shuffle step at 120°** (from leftover speed). Fix: a turn that needs no base rotation enters its plant straight from braking (BRAKE_TURN).
3. **The body layer's state did not know the new family:** NaN, and the character disappeared at the second shuffle step.
4. **A 143 mm knee pop in 180° reversals.** Step parity had put the turn plant on the inside foot, which with the hips already open had to reach 0.67 m across the body. Fix: the turn plant must be the outside foot (one braking stance fewer, or one shuffle step more). RUN 180° then improved from +1.07 to +0.86 s.
5. **Re-planned reversals briefly re-accelerated.** The committed touchdown fell back to ordinary running. Fix: it keeps its braking role and counts as the new plan's first braking stance.
6. **TURN-1's JOG 180° waited through a slow 0.36 s braking stride** before its pivot. Fix: the compact pivot.
7. **The braking arms reached forward at chest height.** Fix: lower, wider and bent.

## Final status

```
ORIGINAL TURN-1 PRESERVED AS DEFAULT: YES
SUB-90° TURN-1 FLOW PRESERVED: YES
LOW-SPEED >90° TURN-1 FLOW PRESERVED WHERE APPROPRIATE: YES
SPEED + ANGLE RESOLVER: PASS
RUN >90° BRAKING: PASS
SPRINT >90° BRAKING: PASS
SHUFFLE / FOOT REORGANIZATION: PASS
RUN 135–150°: PASS
SPRINT 150°: PASS
SPRINT 180°: PASS
JOG 180°: PASS
ACCELERATION OUT: PASS
ABORTED REVERSAL: PASS
RETARGET DURING BRAKING: PASS
PLANT FOOT STABILITY: PASS
CONTINUOUS INPUT: PASS
DETERMINISM: PASS
READY FOR OWNER VISUAL REVIEW: YES
READY FOR DRIBBLE-1 AFTER OWNER APPROVAL: YES
```

**THREE VIDEOS TO WATCH FIRST**
1. `W3_SPRINT_180R`: TURN-1 | TURN-1.1 | TURN-1.2 at the gameplay camera, synchronized 1×. TURN-1.2: hard choppy braking, two shuffle steps opening the base, a decisive turn, the drive back. Magnified: `W3Z_SPRINT_180R`.
2. `W3_RUN_135R`: the intermediate case. Three quick brakes, one shuffle step, the turn; it plants 0.41 s sooner than TURN-1.
3. `W3_JOG_180R`: the low-speed control. TURN-1's compact pivot with no dramatic braking, planting 0.36 s sooner than TURN-1.

**BEST ORIGINAL TURN-1 MOVEMENT THAT WAS PRESERVED:** RUN 90° (and RUN 60°): TURN-1's cut, bit-identical (`W3_RUN_90R`, `W3_RUN_60R`).

**BEST BRAKE→SHUFFLE→TURN→ACCELERATE EXAMPLE:** SPRINT 180° (RUN 180° is the quicker version: plant +0.86 s).

**BEST LOW-SPEED >90° TURN:** JOG 180°: brake, plant and pivot, drive (plant +0.53 s).

**BEST HIGH-SPEED 180° REVERSAL:** SPRINT 180°: plant 1.35 → 1.02 s, velocity in the new direction 1.63 → 1.17 s, skating 1.89 → 0.04 cm.

**WORST REMAINING TURN:** SPRINT 90°, kept on TURN-1 by design. It still takes four long braking strides, the last a low-ΔV waiting stride, before the side-step.

**EXACT THRESHOLD/RESOLVER LOGIC CHOSEN:** see "The resolver" above.
- CURVE if `a ≤ arcLimit(s)`.
- Otherwise the brake family if `a ≥ aLarge(s) − 10°` (aLarge: 118° at 5 m/s → 102° at 9.5) **and** `s − sEntry(a) ≥ 3.6 m/s`. Inside ±10° of aLarge, the stride state decides via TURN-1's own braking count: `nB + 3x ≥ 4`.
- Shuffle steps if the base rotation (`a − 105°`) is ≥ 20° or speed remains to remove; the turn plant goes on the outside foot.
- Everything else is TURN-1's cut or pivot, the pivot compact when its speed is already down.

**THREE REMAINING DEFECTS WORTH ACCEPTING FOR V1**
1. **SPRINT 90° and the low edge of the sprint band keep TURN-1's long braking strides,** including a final low-ΔV stride before the cut. This is TURN-1 kept by design (your item 12); quick braking could replace those strides later without changing the resolver.
2. **The shuffle vocabulary is minimal.** It is quick, wide, toe-turned alternating steps on TURN-1's alternating stride clock: no split-step hop and no same-foot double contact. In a 180° reversal the second shuffle step mostly re-orients the base rather than braking.
3. **There is no walk gait below 2.5 m/s** (a RUN-1.3 limit). LOW 3 m/s stands in for "walk" and turns with TURN-1's pivot. The JOG 150° / 180° pivots keep TURN-1's own low exit posture.
