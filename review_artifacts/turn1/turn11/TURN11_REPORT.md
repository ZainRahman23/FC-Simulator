# TURN-1.1 — authored football cut body language (over TURN-1)

16 Oct 2026, branch `prototype/turn-1`, on top of TURN-1 (`7b58d1a8`, preserved).
- **Instruction:** `../sources/2026-10-16_user_instruction_turn1_1_authored_cut_body_language.md`.
- **Review page:** `review/TURN11_REVIEW.html`.
- **Viewer:** `sandbox/visual/turn1.html?scn=RUN_90R`. The default is the authored body; `&body=t1` shows TURN-1's procedural body; `&diag=1` adds the debug view and readout; `&sil=1` shows the silhouette.
- **Library:** `TURN11_LIBRARY.md`. **Research:** `TURN11_RESEARCH.md`.

I cannot play video in real time. Every visual judgement here comes from frame strips, contact sheets and stills; every number is measured.

## What was built

| File (`sandbox/visual/turn1/`) | Role |
|---|---|
| `turn11_body.js` | The authored body layer (`TURN11`): three plant bases, the BRAKE and EXIT step modifiers and the REACT term, mirrored from one right-turn authoring. It runs once per 240 Hz step after TURN-1 and only reshapes the pose. |
| `turn1_loco.js` | Gained only no-op hooks (`A.L11`). With the layer off, TURN-1 is **bit-identical** to `7b58d1a8`: all 77 t1_check hashes match. |
| `turn1_scenarios.js` | Adds RUN 135° R/L; the hero cut toward and away from the camera; and the exact-mirror pairs of RUN 90° and SPRINT 180°. 84 scenarios in all. |
| `turn1_viewer.js`, `../turn1.html` | Body toggle (TURN-1 / TURN-1.1), short labels for side-by-side panels, an on-canvas diagnostics readout, silhouette mode, close diagnostic views. |
| `tools/` | `t11_check.cjs` (movement identity, determinism, slip, continuity, body measurements, reaction), `t11_mirror.cjs`, `t11_curves.cjs`, `t11_compare.sh` (before / after strips), `t11_ba.sh` (before / after videos), `t11_render_all.sh`, `t11_posters.cjs`. |

## TURN-1's movement is untouched

The layer reads TURN-1's state and never writes it:
- **Inputs:** maneuver plan, clock, legs, plants, swing forecasts.
- **Own state:** `A.l11s`.
- **What it changes:** the pose only — pelvis, trunk, head, arms and the free leg's swing path, with every swing offset zero at both swing ends.

Evidence (`evidence/`):
- **`TURN11_check.json`:** in all 84 scenarios, a hash of everything TURN-1 decides is **identical** with and without the layer. That covers the 240 Hz COM state, pelvis facing ψ, gaze, each stance plan (role, ΔV, contact and flight times), both feet's plants and swing aims, and the event list.
- **`TURN1_procedural_identity.json`:** TURN-1's own regression (77 scenarios, COM log plus joints) matches the committed TURN-1 evidence hash for hash.
- **`TURN11_curves.json`:** in all 22 arcs and straight runs, the layer never engages and the pose is **bit-identical** to TURN-1. These are the gentle 15–30° curves (and LOW 45°), the slaloms and every straight.
- **Plant timing:** it does not move by a single step, so nothing here can change a match outcome.

## What the athlete now does: RUN 90° (the hero)

`BA_RUN_90R`, `BAZ_RUN_90R`, `BAC_RUN_90R` (+ `_025x`), `BAR_RUN_90R`, `SIL_RUN_90R`, `REAL_RUN_90R`, plus the same cut seen across the screen in `BA_RUN_90L_TOWARD`.

| Phase | TURN-1 (procedural) | TURN-1.1 (authored), same path and plants |
|---|---|---|
| Command | head turns; the lean follows the new plan | **+ shoulders start to turn, trunk braces, arms start to organise**: the upper body visibly changes 0.07 s after the request (TURN-1: 0.20 s) |
| Brake (2 steps) | upright trunk (−7°), arms in the run cycle, the body sinking into a near-symmetric squat | **trunk back −17°, arms forward and out, chin up**; the pelvis 3–5 cm higher; never sits |
| Plant and load | 28° lean, 29 cm low, the free knee trailing 16 cm above the turf | **37° lean into the cut, bent at the waist over the wide plant; the outside arm out as the balancing arm, the inside arm back; the free knee up and coming through (0.25 m)** |
| Redirect and push | hips turn | the trunk rocks from braced (−10°) to driving (+18°); the shoulders lead the hips (up to 63° including RUN-1's counter-rotation); the outside arm sweeps across |
| First step and acceleration | snaps back to RUN-1 at the new speed | the knee drives, the arm range is +50 %, the head comes up, and the body rises from a low acceleration posture as speed returns |

## Results

**Body measurements** (`TURN11_check.json` → `body`), TURN-1 → TURN-1.1, same paths:

| Scenario (technique) | Visible reaction (s) | Lean into the turn | Braking back-lean | Deep ≥ 15 cm (s) | Sitting (s) | Arm span (m) | Free knee at plant (m) |
|---|---|---|---|---|---|---|---|
| RUN 90° (side-step) | 0.20 → **0.07** | 28° → **37°** | 7° → **17°** | 0.42 → **0.27** | 0.21 → **0.00** | 0.85 → **1.06** | 0.15 → **0.25** |
| SPRINT 90° (side-step) | 0.07 → 0.07 | 28° → **38°** | 6° → **16°** | 0.42 → **0.26** | 0.29 → **0.11** | 0.85 → **1.10** | 0.18 → **0.25** |
| RUN 60° (crossover) | 0.20 → **0.07** | 28° → **35°** | 6° → **11°** | 0.47 → **0.27** | 0.17 → **0.05** | 0.88 → 0.86 | 0.45 → **0.58** |
| RUN 120° (inside pivot) | 0.20 → **0.07** | 26° → 29° | 7° → **16°** | 0.54 → **0.41** | 0.25 → **0.12** | 0.82 → 0.82 | 0.27 → 0.28 |
| RUN 135° (pivot) | 0.20 → **0.07** | 28° → 32° | 7° → **16°** | 0.65 → **0.47** | 0.31 → **0.13** | 0.82 → 0.78 | 0.24 → 0.23 |
| RUN 180° (pivot) | 0.20 → **0.07** | 29° → 34° | 7° → **17°** | 0.72 → **0.53** | 0.37 → **0.24** | 0.83 → 0.79 | 0.25 → 0.26 |
| SPRINT 180° (pivot) | 0.07 → 0.07 | 25° → 31° | 8° → **17°** | 0.63 → 0.58 | 0.51 → **0.26** | 0.87 → 0.81 | 0.27 → 0.24 |
| All 62 maneuver runs (mean) | median 0.20 → **0.07** | | | 0.48 → **0.33** | 0.22 → **0.09** | | |

How the columns are measured:
- **Visible reaction:** the first instant after the request at which the head, hands or elbows differ by ≥ 8 cm (relative to the pelvis) from the same player given no command.
- **Sitting:** the pelvis ≥ 12 cm low **with the torso within 15° of upright** — the squat look, as opposed to an athletic low posture.

**Plant-foot slip** (the contact point over 10–90 % of each loaded stance, worst stance per scenario):
- median 0.02 → 0.02 cm;
- p90 0.46 → **0.11** cm;
- max 2.35 → **0.66** cm (the retarget stress case).

Pivot skating is gone: SPRINT 180° 1.89 → **0.06** cm, JOG 180° 2.0 → 0.12 cm, RUN 150° L 1.48 → 0.05 cm. Two layer guards removed it:
- the late-stance reach guard;
- the hips carried over the pushing foot.

**Pose continuity** (the 240 Hz residual of pelvis, ankles, toe tips, hands and head):
- pelvis ≤ 5.3 mm in every scenario where the layer acts (TURN-1 ≤ 11.6 mm);
- 90 % of scenarios have every joint ≤ 35.9 mm (TURN-1: 38.2 mm), the size of RUN-1.3's own foot-contact transient;
- the worst is still the retarget stress case's toe flick, 106 mm (TURN-1: 117 mm). See the retarget slap below.

**Mirroring** (`TURN11_mirror.json`, 28 pairs of a right turn started on the right foot against a left turn started on the left foot):
- **Movement:** COM 0.000 mm and events identical.
- **Layer channels:** exact, ≤ 7·10⁻¹⁴ (the side-dependent ones negate).
- **Free-leg offsets:** swap exactly.
- **Joints:** the mirrored positions differ by ≤ 27.7 mm, against ≤ 26.8 mm for TURN-1's body. That is RUN-1.3's deliberate subtle arm asymmetry (`asymArm` / `asymElbow`); the layer adds < 1 mm.

**Determinism:** all 84 scenarios replay identically (joint, channel and movement hashes). `t1Predict` with the layer attached matches the later replay to 0.000 mm.

**CPU:** the step is 0.059 ms and the pose 0.060 ms per player (median), 0.079 ms at most.

## The bases, judged from frames

- **Side-step (RUN / SPRINT / JOG 90°):** reads as brace, wide plant with a lean over the support and the outside arm out, rock forward, drive off. It is the strongest family at gameplay scale.
- **Crossover (RUN 60°, the zig-zag):** distinct mechanics:
  - hips open early;
  - a taller, forward trunk with little lean;
  - the free leg crosses in front;
  - an across / back arm action with no balancing arm.

  But TURN-1 plants the inside foot 0.45 m across, under the body, which forces about 20 cm of reach-driven depth. So it cannot be as tall as intended, and at gameplay scale it differs from the side-step mainly in the arms and the leg crossing. **PARTIAL.**
- **Pivot (RUN 135° / 180°):** the frames read in order:
  1. braking with the arms out front;
  2. turning side-on into the plant;
  3. the shoulders and outside arm leading the rotation;
  4. a low drive-out.

  The trailing knee at touchdown is still fairly low (0.24–0.26 m).

## Your specific items

- **15. Responsiveness.** The plant timing is TURN-1's and was not faked. But the body now answers within 0.07 s at every speed: at JOG / RUN that is 0.13–0.15 s sooner than TURN-1, and at SPRINT the braking already started at once.
  - The REACT term (shoulders, a slight sink and brace, arms) bridges the time until the first braking contact.
  - The BRAKE modifier then makes the braking steps read as deliberate preparation.
- **16. Continuous input.** Movement is identical in all continuous scenarios (retarget, abandon, flip, post-plant ±20°, curve → cut).
  - The authored clip follows the updated intent: a re-plan blends families over 60 ms, a flip mirrors through the followers, and an abandon fades the clip over 0.2 s.
  - The pelvis residual stays ≤ 5.3 mm (CONT_PRE_FLIP 2.0 mm, CONT_PRE_ABANDON 2.3 mm).
- **17. The 12 cm retarget foot slap: inspected; accepted for V1.**
  - **What it is:** in CONT_PRE_RETARGET the first acceleration step lands 0.64 m from the hip, beyond the leg's reach even at the capped drop (reach 1.08). TURN-1's foot-roll correction tilts the toes for about two frames.
  - **Close up:** visible as a one-frame toe tilt.
  - **At the gameplay camera:** the foot is about 5 px and the tilt 2–3 px for one frame, so it is invisible.
  - **Decision:** fixing it would mean moving TURN-1's plant or capping its retarget, so I left it.
  - **Size against TURN-1:** smaller (106 vs 117 mm), and that case's slip fell from 2.35 to 0.66 cm.
- **18. Pivot slip.** It is now below 0.15 cm in every pivot (it was 1.5–2.3 cm), so there is nothing left to accept.
- **9. Sprint 180°: improved, not perfected.**
  - **What improved:**
    - sitting time halved (0.51 → 0.26 s);
    - skating removed (1.89 → 0.06 cm);
    - a braced, arms-forward deceleration;
    - a side-on, shoulder-led pivot;
    - a low drive-out.
  - **What is TURN-1's mechanics and unchanged:** five braking steps, the plant 1.35 s after the request, and a geometric depth of about 30 cm during the plant (the plant lands 0.57 m ahead; Falch measured 33–35 cm of COM lowering at 180°).

## Iteration history (what failed and why; full history in `git log prototype/turn-1`)

1. **Arms authored in the chest frame.** The trunk turns up to 40° and leans up to 37°, so "out to the side" became forward and up: an arm raised behind the head at the plant. Fix: arm directions in the pelvis-heading frame, gravity-up.
2. **Arm blending.**
   - A rotation slerp toward the authored arm flipped when the two were about 180° apart, causing a 31 cm hand jump.
   - A flexion / abduction blend was singular for an arm along the chest's forward axis.
   - Fix: turn the cycle arm toward the target by the minimal rotation.
3. **Replacing TURN-1's crouch exposed the reach budget.** It caused a crossover toe flick, RUN 45° L slip (1.4 cm) and a pivot push skating 6 cm. Fixes:
   - re-plan the reach drop for this pelvis;
   - let it use TURN-1's crouch depth;
   - add a late-stance reach guard and hips over the pushing foot;
   - add pelvis roll toward the crossed plant.
4. **The kneeling look of the free leg at deep plants.** Fixes: an ease-out swing progression, a mid-swing knee lift and a higher knee floor.
5. **The pivot read as a forward lunge.** Fix: turn the hips side-on into the plant (the 505 technique).
6. **Pelvis kinks of 12–13 mm at the first touchdowns after a maneuver.** TURN-1's decaying crouch had hidden them. Fix: a 0.7 % more conservative reach plan.

## Simulation / presentation boundary

Unchanged, as instructed:
- TURN-1.1 is presentation only and was not promoted to the authoritative locomotion.
- The match, `match.js`'s locomotion law, Outfield Locomotion V1, LC-1, RUN-1.3, ball physics and the physical-character work were not touched.

## Exact recommended DRIBBLE-1 handoff

1. **Stop locomotion work here.** The feet DRIBBLE-1 needs are TURN-1's plants and swings, shaped by TURN-1.1's free-leg layer. `t1State` / `t1Predict` already return those authored feet (verified exact to the replay).
2. **Owner decision first: the locomotion authority contract** (instruction item 22). Either:
   - TURN-1's stance law becomes the simulation's movement law, so touches and cuts share one clock; or
   - it stays presentation over the current limiter, in which case touch timing must be resolved against presentation feet and reconciled.
3. **Converge with BALL-PHYS / BALL-FEEL** (the other agent's local branches in its ball lab clone). I did not touch them; this needs your go-ahead.
   - **Branch:** cut DRIBBLE-1 from `prototype/turn-1`.
   - **Bring in:** the ball module as a dependency.
4. **Add touch intent as one more free-leg swing offset** in `turn11_body.js`. It is the same kind as the knee lift: zero at toe-off and at touchdown, so plants never move. It aims a chosen boot surface through a contact point at a chosen swing progress, solved with `t1Predict`.
5. **Test in this order:**
   1. touches on straight running and gentle curves (the layer is idle there, so touches are the only change);
   2. a 45–60° cut with a touch out of the exit step;
   3. the RUN 90° side-step with a touch before the plant and one out of the first step.

## Final status

```
TURN-1 MOVEMENT FOUNDATION PRESERVED: YES
RUN 90° AUTHORED CUT: PASS
SIDE-STEP PLANT: PASS
CROSSOVER PLANT: PARTIAL
PIVOT PLANT: PASS
BRAKING BODY LANGUAGE: PASS
EXIT/ACCELERATION BODY LANGUAGE: PASS
SPRINT 90°: PASS
SPRINT 180°: PARTIAL
GENTLE CURVES PRESERVED: YES
PLANT FOOT SLIP: PASS
CONTINUOUS INPUT: PASS
LEFT/RIGHT MIRRORING: PASS
MINIMUM LIBRARY REMAINS 3 BASES + MODIFIERS: YES
DETERMINISM: PASS
READY FOR OWNER VISUAL REVIEW: YES
READY TO CONVERGE WITH BALL-PHYS FOR DRIBBLE-1: YES
```

**THREE VIDEOS TO WATCH FIRST**
1. `BAZ_RUN_90L_TOWARD`: the hero 90° side-step at the gameplay camera (6×), running toward the camera and cutting across the screen. Before and after side by side; the lean, the balancing arm and the drive-out all lie across the screen. The 3× and real-1080p versions are `BA_` and `REAL_RUN_90L_TOWARD`.
2. `BAC_RUN_90R`: the same cut close up, before and after. The whole-athlete plant: brace, lean over the wide plant, free knee through, push.
3. `BA_SPRINT_180R`: the worst case, improved — braced deceleration, side-on pivot, shoulder-led rotation, low drive-out.

**BEST SIDE-STEP CUT:** RUN 90° R (also SPRINT 90° and JOG 90°).

**BEST CROSSOVER:** RUN 60° R (and its repeat in `ZIGZAG_RUN`).

**BEST PIVOT:** RUN 180° R.

**WORST REMAINING TURN:** SPRINT 180°.
- Its timing and depth are TURN-1's mechanics: five braking steps, the plant at +1.35 s, about 30 cm deep for the 0.34 s plant.
- It is still the heaviest move, although its sitting time is halved and its skating is gone.

**BEFORE/AFTER OF RUN 90°** (identical path, plants and timing; the plant lands 0.67 s after the request):

| | TURN-1 | TURN-1.1 |
|---|---|---|
| Visible reaction | 0.20 s | 0.07 s |
| Braking back-lean | 7° | 17° |
| Lean into the cut | 28° | 37° |
| Time deep | 0.42 s | 0.27 s |
| Time sitting | 0.21 s | 0 |
| Arm span | 0.85 m | 1.06 m |
| Free knee at the plant | 0.15 m | 0.25 m |
| Slip | 0.02 cm | 0.02 cm |

Videos: `BA_RUN_90R` (gameplay camera), `BAZ_RUN_90R` (magnified), `BAC_RUN_90R` and `BAC_RUN_90R_025x` (close and 0.25×), `BAR_RUN_90R` (from behind), `SIL_RUN_90R` (silhouette), `REAL_RUN_90R` (real 1080p scale).

**THREE BIGGEST REMAINING V1 DEFECTS**
1. **The crossover is only moderately distinct at gameplay scale.** TURN-1's crossed inside plant forces a low pelvis, so the tall, efficient redirect it should be shows mainly in the hips, the arms and the legs crossing. The next authored improvement would be a crossover-specific lower-body pose; that needs the plant geometry revisited, which is a TURN-1 change.
2. **Reversals stay slow and heavy.** TURN-1 needs 4–5 braking steps and +1.35 s from a sprint, with about 30 cm of depth during the plant. The trailing knee at the pivot touchdown is still fairly low (0.24 m).
3. **The layer's limits, and only frame review.**
   - There are no authored hands or fingers, and the head only levels and pitches (its direction is TURN-1's gaze).
   - The shoulders lead the hips by up to about 63° including RUN-1's counter-rotation, which may read as twisted up close.
   - The retarget case keeps a one-frame toe flick.
   - I judged motion only from frames. The blend timing (22–40 ms followers, keys reached 50 ms early) needs your 1× eye.

**EXACT RECOMMENDED DRIBBLE-1 HANDOFF:** see the section above:
1. stop locomotion here;
2. you decide the locomotion authority contract;
3. converge with the other agent's BALL-PHYS / BALL-FEEL on a DRIBBLE-1 branch from `prototype/turn-1` (with your go-ahead);
4. add touch intent as one more zero-at-the-ends free-leg swing offset, solved with `t1Predict`;
5. test straight / curve touches, then a 45–60° cut touch, then the RUN 90° side-step with a touch before and after the plant.
