# TURN-1 — turning and cutting locomotion foundation (no ball)

16 Oct 2026, branch `prototype/turn-1` (cut from `prototype/locomotion-v2-run1`, the frozen RUN-1.3 straight baseline).
- **Instruction:** `sources/2026-10-16_user_instruction_turn1_turning_cutting_locomotion.md`.
- **Review page:** `review/TURN1_REVIEW.html`.
- **Viewer:** `sandbox/visual/turn1.html?scn=<id>` (`&diag=1` for the path / foot debug).
- **Starting point:** `TURN1_STARTING_POINT.md`. **Research:** `TURN1_RESEARCH.md`.

I cannot play video in real time. Motion was judged from frame strips and contact sheets; every number below is measured.

## What was built

| File (`sandbox/visual/turn1/`) | Role |
|---|---|
| `turn1_loco.js` | The engine (`TURN1`): stance-impulse COM dynamics, footstep placement, stance / swing legs on RUN-1.3, body organisation, resolver, DRIBBLE-1 interface. |
| `turn1_scenarios.js` | 77 deterministic scenarios: LOW / JOG / RUN / SPRINT × 15–180° × left / right, straight controls, zig-zags, slaloms, continuous-input cases. |
| `turn1_viewer.js`, `../turn1.html` | Viewer: the real Touchline gameplay camera (CAMERA_V1) plus close views and the debug overlay. |
| `tools/` | Loader, metrics (slip / reach / joints), regression (determinism, latency, CPU), pop detector, mirror test, angle sweep, capture / matrix / strip / contact-sheet renderers, review builder. |

RUN-1.3 (`run1_gait_v13.js`) is consumed unmodified. Nothing in the match, Outfield Locomotion V1, LC-1 or the authoritative locomotion law was touched.

## How it works

1. **The turn comes from the ground.** The COM's horizontal velocity changes only while a foot is on the turf.
   - Every stance carries a planned ΔV with a half-sine force profile, zero at touchdown and at toe-off.
   - Each ΔV is bounded by what that stance can deliver: contact time, COM travel (≤ two leg reaches) and ≤ 17.5 m/s² mean.
   - Flights are ballistic. There is no root rotation: arcs, cuts and reversals are sequences of plant impulses.
2. **Footsteps.** Each plant is a fixed world point chosen at touchdown.
   - The base is RUN-1's own placement relative to the body; on top of it goes the inverted-pendulum offset of that stance's mean acceleration (outside the curve, ahead of a brake, wide of a cut, ahead of a reversal).
   - The plant is clamped into the leg's reachable window.
3. **Legs.**
   - **Stance:** the foot rolls heel → flat → toe pad (RUN-1's profile; heel-first on braking and plant steps; rotating about the toe pad in a pivot). The leg reaches it by analytic IK. The pelvis lowers ahead of time when a plant will need it (predicted 0.3 s before touchdown).
   - **Swing:** the foot follows RUN-1's own swing path at the current speed, warped from the actual toe-off foot onto the aimed plant (rotation along the step, lateral and vertical shape kept). It lands in the strike pitch of the step it lands into.
4. **Body.**
   - The pelvis heading is its own state (facing ≠ velocity); gaze and chest lead it.
   - Whole-body lean follows each step's planned mean acceleration (≤ 28° lateral), with crouch and arm balance by step role.
   - RUN-1's cyclic upper body runs on a smoothed phase, so contact events never jerk the arms.
5. **Resolver.** Each request (incoming velocity + requested change + stride phase / foot availability) becomes an ARC, a CUT or a PIVOT.
   - **ARC:** steering within a speed-dependent limit (50° at 3 m/s → 25° at 9.5 m/s), lateral acceleration 5.2 → 3.2 m/s². The outside leg turns more.
   - **CUT:**
     - side-step on the outside foot (preferred);
     - crossover on the inside foot (≤ 70°) when it is ≥ 0.2 s sooner.
   - **PIVOT:** ≥ 135°, or ≥ 110° on the inside foot when that is sooner.
   - Braking steps are planned from what a braking stance can actually remove at that speed: up to 4 before a cut, 5 before a reversal.
   - Every footstep is a step role: RUN / ARC / BRAKE / PLANT / EXIT / ACCEL.

## Results (`evidence/`)

**Determinism and continuity:**
- **Determinism** (`TURN1_check.json`): all 77 scenarios replay twice with identical state hashes (240 Hz log + 60 Hz joint positions).
- **Pose continuity** (`TURN1_continuity.json`, the 240 Hz residual of pelvis, ankles, toe tips, hands and head):
  - pelvis ≤ 11.6 mm (p90 5.8 mm);
  - 90 % of scenarios have every joint ≤ 37 mm, the size of RUN-1.3's own foot-contact landing transient (14–36 mm);
  - the worst is one retargeting case (11.7 cm, one step).
- **Plant-foot slip while loaded** (the contact point over 10–90 % of each stance):
  - median 0.02 cm, p90 0.46 cm;
  - pivots on the toe pad 1.5–2.1 cm;
  - straight running 0.02 cm (unchanged from RUN-1).
- **Mirroring** (`TURN1_mirror.json`): a run that starts on the right foot and turns right, against one that starts on the left foot and turns left, is the exact mirror image in all 32 cases (4 speeds × 8 angles): COM error 0.000 mm, heading error 0.0000°, identical event sequences. Real left / right differences come only from which foot is next when the request arrives.

**Coverage and timing** (`TURN1_sweep.json`, right turns 20–180° in 5° steps):

| Speed | Arc | Crossover | Side-step | Pivot | Response to a 90° request |
|---|---|---|---|---|---|
| JOG 5.5 | ≤ 35° | 40–65° | 70–130° | ≥ 140° | plant +0.50 s, new heading +0.89 s, speed dips to 3.0 m/s |
| RUN 7.8 | ≤ 30° | 60–65° | 35–55°, 70–110° | ≥ 115° (inside-foot pivot from 115°) | plant +0.67 s, heading +1.06 s |
| SPRINT 9.5 | ≤ 25° | 30–40° | 50–130° | ≥ 140° | plant +0.94 s, heading +1.33 s, entering the plant at 4.3 m/s |

- Inside each technique, entry speed, contact, crouch and redirect vary smoothly with angle.
- The technique boundaries are the only places where the motion changes kind.
- A 180° reversal reaches its new heading after 1.15 s (JOG) to 1.63 s (SPRINT).

**Continuous input** (scenarios `CONT_*`):
- a curve interrupted by an opposite request becomes a crossover cut;
- before the plant, a cut can be retargeted (90° → 50°), abandoned (→ 10° arc) or flipped (90° right → 90° left);
- after the plant's touchdown it is committed, with the exit direction adjustable by ±20° (90° → 130° is completed by the exit steps);
- a foot in the last 20 % of its swing keeps its plant.

**CPU** (Node, warm): ≈ 0.012 ms per 240 Hz step and ≈ 0.065 ms per pose per character, so 22 players cost ≈ 2.5 ms per 60 Hz frame. The RUN-1 references (foot roll, swing path) are tabulated per speed cell and shared per rig.

## Minimum authored library (recommendation)

One cyclic base, three plant bases, two step modifiers and one procedural layer:

1. **RUN-1.3** (existing): the cyclic run, 2.5–9.5 m/s. No new speed variants are needed; speed enters through the angle–velocity trade-off, the travel caps and RUN-1's own regimes.
2. **ARC:** procedural, no authored data.
3. **SIDE-STEP PLANT** (45–135°): one base, interpolated over angle and speed.
4. **CROSSOVER PLANT** (≤ 70°, inside foot): a variant of the side-step base. Keep it: it saves up to a stride.
5. **PIVOT PLANT** (≥ 135°; inside-foot fallback ≥ 110°): distinct biomechanics.
6. **BRAKE step** and **EXIT / ACCEL step:** modifiers.

How the set is used:
- **Mirror** everything: verified exact.
- **Never author per angle or per speed.**
- **Where authoring would add the most:** upper-body key poses per plant base (arms, shoulders, head), a braking posture, and a below-2.5 m/s stop / walk base for standing turns (RUN-1 has none).

## The DRIBBLE-1 interface

**`TURN1.t1State(A)`.** At the current step, in the world frame:
- **per foot:** the ankle, toe tip, heel and ball positions and the 4×4 transform; the velocities of ankle, toe tip and ball, and the foot's angular velocity; support state, stance / swing progress and step role; the plant (point, yaw, time since touchdown) or, while swinging, the aimed next touchdown (time, point, yaw, role);
- **body:** pelvis and COM position / velocity / acceleration; desired vs actual direction, facing, gaze;
- **gait and turn:** stride phase; the turn state.

**`TURN1.t1Predict(A, horizon, every)`.** A deterministic lookahead: where each foot will be and which foot supports, over the next horizon, if the input does not change.

**`TURN1.t1Clone(A)`.** An exact, independent copy.

## Simulation / presentation boundary

TURN-1 is presentation and changes nothing in the match. Its locomotion law, however, decides where the feet are and when the velocity changes, which physical dribbling will make outcome-relevant: the stance plans, ΔV per stance, footsteps, plant / pivot timing and swing aims.

**Recommendation:** make that law the simulation's authoritative locomotion law. It is cheap and deterministic. Presentation would then add only pose, lean, arms and gaze.

The simulation would then own and expose:
- the input (desired direction / speed);
- COM position and velocity;
- the support state and the current stance plan;
- the plants;
- the swing aims and progress;
- the pelvis facing;
- the turn state;
- the contact-capable foot trajectories.

Today's law (`match.js`: a direction-split velocity limiter, 8.5 / 12 / 10 m/s², facing at 4–7 rad/s) cannot produce plants that cause the turn. Animation ON / OFF neutrality holds as long as the pose only reads that state, as it does here.

## Physical character / collisions

TURN-1 introduces no kinematic bodies and changes no collision. It exposes the same kind of per-joint world transforms and velocities as RUN-1's LV2-STATE-1 contract (`t1State`). The V2 physical character can track it, and the match's character-derived colliders (CHARCOLLIDE-1) can follow it as they follow V1 today. HAC-1 / balance work was not reopened.

## Iteration history (what failed and why; full history in `git log prototype/turn-1`)

**Placement and reach:**
- **Swing-forecast drift** (`6185b97` → `8c25d1f`): the first engine placed every plant from the forecast's take-off point plus the remaining flight time, not the full flight. Feet landed 0.4 m behind the body and slipped 33 cm per stance even in straight running.
- **Long braking / plant contacts at 4–9 m/s** spanned more COM travel than a leg can reach, so feet slid up to 26 cm. Fixed with travel caps, heel-first braking / plant steps, a reach window for plants and a pelvis drop.

**Lean and arcs:**
- **Lean lowering** (cosine of the full lean) sank the pelvis by 33 cm and produced a kneeling look; removed.
- **Arc steering** turned up to 19° in one stance, forcing inside-foot crossovers (61° hip adduction). Gentler lateral acceleration, an inside / outside split and anticipatory lean fixed it.

**Pops (the 240 Hz pop detector):**
- the pelvis drop switching on at touchdown (20 cm);
- Euler gimbal flips of the swing foot (30 cm);
- the toe joint snapping at lift-off;
- a forecast change jumping the swing progress;
- first-order lean / gaze followers changing rate instantly;
- the event clock's per-segment phase rate jerking the arms;
- an early-stance heel roll that lengthened rather than shortened the reach.

Each was fixed at its cause.

**Braking and pivots:**
- **Braking lunges:** the reach drop up to 20 cm in braking steps; now capped per role (brake 12 cm).
- **Sprint pivots** entered the plant at 5.6–6.7 m/s because the planner overestimated one braking stance at a sprint. Braking is now planned from the stance's real capability.
- **Kept as options, not used:** `kneeClear` iteration (replaced by one smooth lift); the 0.20 m global drop cap (now per role).

## Final status

LATEST LOCOMOTION STATE RECONSTRUCTED: YES
GENTLE ARC TURNING: PASS
MODERATE TURNING: PASS
HARD CUT: PASS
90° CHANGE OF DIRECTION: PASS
120–150° CHANGE OF DIRECTION: PARTIAL
180° REVERSAL: PARTIAL
JOG COVERAGE: PASS
RUN COVERAGE: PASS
SPRINT COVERAGE: PARTIAL
LEFT/RIGHT MIRRORING: PASS
PLANT FOOT SLIP: PASS
RUN→CUT TRANSITION: PASS
CUT→RUN TRANSITION: PASS
CONTINUOUS INPUT HANDLING: PASS
V1 TURN RESOLVER: PASS
MINIMUM AUTHORED LIBRARY IDENTIFIED: YES
PHYSICAL CHARACTER/COLLISION COMPATIBILITY PRESERVED: YES
DETERMINISM: PASS
READY FOR OWNER VISUAL REVIEW: YES
READY TO BEGIN PHYSICS-BASED DRIBBLING AFTER OWNER APPROVAL: YES

**Three videos to watch first:** `JOG_90R` (hard cut), `ZIGZAG_RUN` (RUN → CUT → RUN → CUT → RUN), `SLALOM_JOG` (gentle steering).

**Best gentle turn:** `SLALOM_JOG` (also `JOG_30R`). **Best hard cut:** `JOG_90R` (also `RUN_60R`). **Worst current turn:** `SPRINT_180R`.

**Three biggest V1 defects:**
1. **Reversals / pivots (≥ 135°):** from a sprint they take five braking steps (new heading at +1.6 s), the pivot sits in a deep crouch, and an inside-foot pivot slides 1.5–2 cm at the toe pad.
2. **The plant's body language is procedural, not authored:** lean, pelvis rotation, crouch and arm abduction, with no plant key poses for arms, shoulders and head, and no strong dig-in braking posture. At gameplay scale the cut reads mainly through the trajectory, the speed change and the pelvis rotation.
3. **Momentum and timing are compromises:**
   - the plant's force is dramatised (≈ 2.8 g peak);
   - latency depends on the stride phase (a 90° cut at a sprint plants 0.66–0.94 s after the request);
   - below 2.5 m/s RUN-1 has no gait;
   - one retargeting case keeps a single-step foot slap (≈ 12 cm).

**Recommended next step for DRIBBLE-1:**
1. Keep TURN-1's locomotion law as the movement model, and decide the integration above.
2. Add a physical ball (sphere, rolling and sliding friction, restitution) to the TURN-1 viewer.
3. Add a "touch intent" to the swing warp: aim a chosen foot surface (inside / laces / sole) through a contact point at a chosen swing progress, located with `t1Predict`.
4. Measure the touch on straight running and gentle arcs first.
5. Then measure the cut with the ball: a touch before the plant, the plant, and a touch out into the new direction.
