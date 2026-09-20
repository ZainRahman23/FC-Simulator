# Goalkeeper skeletal MOTION LIBRARY — findings (v8 + v9 FOOT_SAVE spread block + v10/v11 CATCH group, 2026-09-20)

Branch `prototype/3d-animation-pipeline` (not pushed). Review page: `review_artifacts/gk_motion_library/GK_MOTION_LIBRARY_REVIEW.html`.
Astra reference package: `review_artifacts/astra_gk_motion_reference/` (`INDEX.json`, `README.md`, one folder per canonical motion / facing).
Verification records: `review_artifacts/gk_motion_library/verification/`.

Rule of the whole system, unchanged: **the simulation decides what happens; the animation visually explains what happened.**
Nothing in this work writes to the simulation. The keeper's commit record, contact record (tick, point, volume, outcome, held),
hand target, leg tip and root are read; the presentation root is a derived, capped offset of the simulation root; the ball is never
moved, snapped, parented or attached. Animation ON and OFF, and sprite vs 3D, produce identical simulation traces (section 7).

## 1. State found (audit before this task)

Resolver (`gkAnimClassify`) families over the 43 pre-existing fixtures: AIRBORNE_DIVE 22 (of which LOW-MID 11), LOW_GATHER 5,
FOOT_SAVE 5, LOW_COLLAPSE 4, HIGH_CATCH 4, NEAR_BODY_SAVE 2, SUPPORTED_CATCH 1 (CHEST_CATCH appears in free play). The 3D graph
(`gk_graph.js`) had ONE authored motion: the v6 far dive, applied to every AIRBORNE_DIVE. Everything else ran as a procedural pose
(`authored: false`), foot saves ran as inverted dives, a caught ball dropped the body out of the dive lifecycle mid-flight, standing
saves rose before the ball arrived, and the recovery could re-derive facing / side from the live ball (the recurring sprite-resolver
bug class). No footwork existed on the 3D path.

## 2. Motion taxonomy (minimum biomechanically distinct set)

`sandbox/visual/anim3d/gk_motion_library.js`, selection `gkSelectMotion(desc)` — deterministic, from the frozen per-commit
classification only (family, height class, feet-planted, lateral offset), never from the outcome or the live ball:

| motion | family (resolver) | what is biomechanically different | fixtures |
|---|---|---|---|
| FAR_DIVE | AIRBORNE_DIVE MID / HIGH / TOP | v6, frozen: plant, push, ballistic arc, side or feet landing, get-up chain, reposition steps | 42, 49 (mirror) |
| LOW_DIVE | AIRBORNE_DIVE LOW-MID | low sideways launch, body horizontal at ≤ 82° roll (never inverted), pelvis solved to the lying height, hard stop on the pitch, same get-up chain | 43, 44, 10, 1, 50, 51 |
| LOW_COLLAPSE | LOW_COLLAPSE | no flight: near leg folds, drop onto the hip, hands down together, leg to the simulation's leg tip | 32, 52, 53, 11 |
| FOOT_SAVE (v9 spread block) | FOOT_SAVE | emergency block: COM drops (0.70 → ~0.46 m), both hips abduct (saving thigh ~72°, far thigh ~60°, knees ~18° / ~30°), far foot steps out to a wide plant, arms wide and forward, chest open; saving foot on the simulation's leg tip; body commits onto the saving hip (side-sit) and recovers from the half-kneel — not a forward kick | 19, 16, 17, 55–60 |
| NEAR_BODY (catch group, v10) | NEAR_BODY_SAVE | one step out, torso lean, near-hand reach; a caught ball is cradled to the chest and the lean straightens | 41 |
| CHEST_CATCH (catch group, v10) | CHEST_CATCH / SUPPORTED_CATCH | the sprite chest catch: upright ready, small brace, arms open wide (elbows OUT), hands forward at chest height at contact, forearms wrap, absorb, straighten, upright hold | 45, 33, 47, 54, 61–63 |
| HIGH_CATCH (catch group, v10) | HIGH_CATCH | both hands up a ball's width apart, toe rise / jump; the secured ball is brought down to the chest; straighten; upright hold | 31, 46 |
| GATHER (catch group, v10) | LOW_GATHER | the sprite low gather: deep crouch (not a kneel), gloves to the ground, scoop, clutch, rise to the upright hold | 26, 27, 9 |
| READY / FOOTWORK | (anticipation, positioning) | symmetric ready crouch; odometer stepping driven by the simulation root velocity | 54, 11 |

Why these and not more: the resolver already separates airborne from grounded and hand from leg contact; within the airborne dives
only the LOW-MID class lands differently (the body arrives at the lying height, there is no descent stage). Every other visible
variation (side, height, facing, held ball, two hands, reach distance) is a parameter of one of these motions, not a new motion.

## 3. Implementation

- Motion frozen per commit (`state.motionSel`), like facing and side; a leg contact never re-selects mid-action.
- Dives: launch plan (plant → toe-off → ballistic arc through the solved full-extension pelvis at execEnd), landing plan with
  progressive ground deceleration; LOW_DIVE adds the low-mode pelvis solve, the roll clamp, and the arrived-low landing (impact / absorb
  continue from the arrival pose; `lowStop`: the hip stops over the height that is left, uniform deceleration, no dip / bounce).
- Ground motions (collapse, gather) reuse the SETTLE → BRACE → PUSH_UP → HALF_KNEEL → CROUCH → RISE → REPOSITION → SET chain.
- Standing motions WAIT at u = 1 until the ball arrives (contact or held), then RISE or HOLD.
- Held ball: both hands stay on the authoritative ball (hold IK, faded in 0.12 s / out 0.15 s), no hand brace, stronger ground
  deceleration; the two-hand reach hands over to the hold.
- Leg-tip IK (FOOT_SAVE, LOW_COLLAPSE): the lead leg meets the simulation's leg tip when it is reachable (same reach cap as a planted
  foot); the last tip is cached through the landing. LOW_DIVE does NOT chase the leg tip (section 10).
- FOOT_SAVE v9 (kind `spread`): keys setLow → DROP_LOAD (u 0.30) → HIP_OPEN (0.60) → SPREAD (1.0); the saving leg is free for the
  leg-tip IK (pole forward-up), the far foot is planted ONCE in world space 0.55·hs beside the pelvis at u ≥ 0.25 (`fixed`: the
  simulation root keeps sliding toward the ball, so the planted foot must not chase it — it ends ~0.8 m out as the body travels);
  no wait at u = 1 (momentum carries the body down whether or not the ball arrives). Post: `gkGroundPlan` with `opt` — ABSORB
  (0.25 s, hermite from the arrival pelvis velocity to the side-sit height 0.23 m, 0.12 m lateral travel bled to zero), SETTLE
  (0.35 s, side-sit pose `mo.ground`, saving hand braced, saving foot stays where it is, far foot tucks), then the shared chain from
  HALF_KNEEL (the extended leg folds under, the far foot steps in front), CROUCH, RISE, REPOSITION, SET. BRACE / PUSH_UP have zero
  duration for the spread plan.
- Footwork: proportional plant points, re-plant when a step target moves, knee bend plane blended in for new locks / steps; tucked
  feet follow a body that is still sliding at the settle (re-plant once the hips have slid > 15 cm past the planted feet; drag, no lift).
- Solver (`ik.js`, `skelIK2`): per-chain bend-plane memory (degenerate plane → last frame's; the plane rotates ≤ 60° per solve),
  fold-radius handling (a target closer to the root than the folded chain's own minimum releases toward the authored limb and reports
  the residual; near that radius the root→target direction is blended with last frame's), deterministic, no RNG.
- Continuity assertions in `gk3d_backend.js` (position excess > 3 cm, Δv > 1.5 m/s, root > 5°, pelvis / chest > 15°, side / roll flip)
  at every stage boundary; recorded per fixture (manifest `asserts`) and per free-play shot.

## 4. What is unchanged

The v6 far dive. Fixture 42's skeleton — 28 joints × 320 ticks — is bit-identical to the pre-task manifest after every change
(re-verified after each solver edit). The far dive's own solve paths (glove IK, brace, plants, floor clamp) run without the
bend-plane memory (`PMv`) so that the frozen output stays exact; every other motion gets it. This exemption is a documented
discrepancy: the memory is a general stability rule and should apply to the far dive too once v6 is un-frozen (expected effect:
one 3 mm elbow difference at tick 188 of fixture 42 and a 60°-capped knee plane in the reposition step at tick 282).

## 5. Transitions

Entry from READY / footwork through anticipation into every motion; exit through the shared get-up (dives, collapse), RETRACT
(foot save), RISE / HOLD (standing) back to SET; the recovery keeps the landed side measured from the skeleton at the settle.
Stage-boundary assertions: 0 flagged ticks in all 17 packaged fixtures; free play below.

## 6. Contact validation (authoritative)

Contact tick, point, volume and outcome come from `gk.contact`; the manifest records, per key frame, the simulation hand, leg tip,
ball, glove residual (drawn glove centre → simulation hand) and leg residual. Free play seed 7 (120 shots, corrected record — see
the tool note in section 8): 40 contacts, HAND-volume n = 37, glove residual median 6.0 cm, p90 22.8 cm, max 52 cm; seed 11 (160
shots): 53 contacts, HAND n = 40, median 12.0 cm, p90 37 cm, max 64 cm. The large tail is real and exposed: hand targets the modeled
arm cannot reach (short reach at full extension, ball at / inside the shoulder's fold radius, two-hand targets on a lateral ball) —
never hidden by stretching. Residuals are in the manifest and the overlay frames.

## 7. Simulation neutrality

64 deterministic fixtures × 260 ticks, per-tick simulation trace hashed (keeper root, velocity, hand, leg tip, ball position and
velocity, held flag, phase / state, commit, contact): sprite backend vs SKELETAL_3D drawn every tick — 64 / 64 identical
(`verification/GATE_sprite_vs_3d_64_fixtures.md`); animation OFF (nothing drawn) vs 3D ON — 64 / 64 identical final-tick root,
hand, ball, held flag, contact volume / outcome (`verification/GATE_animation_off_vs_on_64_fixtures.md`).

## 8. Free play (production path)

`gk3d_freeplay.js --shots 120 --seed 7`: seeded shots through the real kick pipeline, one continuous keeper, 3D drawn every tick.
114 committed, 40 contacts; families → motions: FAR_DIVE 71, LOW_DIVE 13, HIGH_CATCH 17, NEAR_BODY 6, GATHER 5, LOW_COLLAPSE 2;
all 8 facing octants; 0 fallback selections, 0 unauthored ticks, 0 dive side ≠ landed side. Continuity flags: 1 marginal
(shot 74, LOW_DIVE that missed the ball, IMPACT → ABSORB Δv 1.52 m/s at the 1.5 threshold, excess 2.5 cm: the hip stopping on the
pitch with almost no height left — a hard ground stop, not a relocation). The flags that the earlier runs raised (shots 5, 76, 93,
116) were traced to their causes and resolved at the transition / solver level (review page, section "Landing and IK continuity").
Tool correction (v9): the recorder accepted a contact record left over from the previous shot at the first tick of the next one; the
v8 report's "67 contacts / median 5.6 cm" included those stale records. The recorder now accepts only contacts timestamped inside the
shot; the corrected figures are the ones above (40 contacts) and the motion / continuity statistics are unchanged by the fix.
Second seed for FOOT_SAVE coverage, `--shots 160 --seed 11`: 151 committed, 53 contacts, 0 fallbacks, 0 unauthored ticks, 0 side ≠
landed; 2 marginal LOW_DIVE IMPACT → ABSORB flags (Δv 1.74 / 1.77 m/s, the same hard-ground-stop class); FOOT_SAVE→FOOT_SAVE 9
events (shots 19, 44, 50, 53, 59, 95, 104, 127, 136; facings 74° to −177°): 5 are close-range LEG DEFLECTIONS where the simulation's
standing leg blocked the ball before the commit (ticks 15–30, commit 28) and the spread develops after the ball has gone, 2 end in a
HAND / GATHER as the blocked ball rolls to the hands, 1 is a FOOT DEFLECTION at the spread (leg residual 9.5 cm), 1 no contact.
All 9 run the full spread lifecycle with no flags and land on the save side.
Records: `verification/FREEPLAY_3d_120_shots_seed7.json`, `verification/FREEPLAY_3d_160_shots_seed11.json`.

## 9. Body proportions / reach

`verification/PROPORTIONS_default_tall_short.json` (H 1.90 / 2.01 / 1.79 m, same motion assets, same simulation):

| fixture | motion | glove residual default / tall / short |
|---|---|---|
| 42 far dive (weak parry through) | FAR_DIVE | 6.4 / 1.5 / 14.7 cm |
| 44 low ball right | GATHER | 2.2 / 2.3 / 2.4 cm |
| 24 just beyond the foot | LOW_COLLAPSE | 8.7 / 10.0 / 7.9 cm |
| 26 easy central catch | GATHER | 2.8 / 2.7 / 3.2 cm |
| 31 high central | HIGH_CATCH | 4.0 / 7.3 / 4.1 cm |
| 33 lateral supported catch | CHEST_CATCH | 9.4 / 10.8 / 8.7 cm |
| 41 near-body catch | NEAR_BODY | 6.5 / 9.1 / 4.1 cm |

Reading: ground and standing saves are height-independent. The far dive's reach is the simulation's reach envelope (one keeper
model); the drawn glove of a shorter body falls short of the authoritative hand by up to 15 cm at full extension, a taller body
overshoots by 1–2 cm. This is exposed, not solved by stretching: the correct fix is per-body reach envelopes in the simulation (or
authored per-proportion clip constants), which is a simulation decision, not an animation one.

## 9b. FOOT_SAVE spread block — measurements (fixtures, v9)

| fixture | side / facing | contact at u | leg residual at contact | pelvis at contact | feet apart | pelvis: commit → contact → +12 → +30 ticks |
|---|---|---|---|---|---|---|
| 19 wide R | RIGHT / 180° | 0.87 | 2.9 cm | 0.47 m | 1.22 m | 0.70 → 0.47 → 0.32 → 0.23 |
| 16 close R | RIGHT / 180° | 0.94 | 8.2 cm | 0.44 m | 0.89 m | 0.70 → 0.44 → 0.27 → 0.23 |
| 17 close L (mirror of 16) | LEFT / 180° | 0.94 | 8.2 cm | 0.44 m | 0.89 m | identical mirror |
| 55 wide R | RIGHT / 180° | 0.88 | 2.7 cm | 0.46 m | 1.21 m | 0.70 → 0.46 → 0.30 → 0.23 |
| 56 wide L (mirror) | LEFT / 180° | 0.88 | 2.5 cm | 0.46 m | 1.19 m | identical mirror |
| 57 SW facing R | RIGHT / 131° | 0.28 | 14.2 cm | 0.63 m | 0.59 m | 0.70 → 0.63 → 0.51 → 0.25 |
| 58 NW facing L (mirror) | LEFT / −131° | 0.28 | 14.2 cm | 0.63 m | 0.59 m | identical mirror |
| 59 SSW facing R | RIGHT / 152° | 0.42 | 5.4 cm | 0.60 m | 0.69 m | 0.70 → 0.60 → 0.46 → 0.23 |
| 60 NNW facing L (mirror) | LEFT / −152° | 0.42 | 5.4 cm | 0.60 m | 0.69 m | identical mirror |

All nine: landed side = save side, 0 stage-boundary flags, mirrors bit-symmetric. Fixtures 57 / 58 are close-range reactions: the
simulation's contact lands 7 ticks after the commit (u 0.28), while the keeper is still in DROP_LOAD — the block develops after the
ball has gone (the standing-leg cylinder blocked it). That is the simulation's timing and is shown as is.

## 9c. CATCH group v10 — what was wrong, the sprite reference, what changed

**Old (v8) catch.** The standing catch keys started from the crouched SET_LOW (pelvis 22° + spine 10° + chest 6° = 38° total
pitch) and folded further (HUG: 46°); at contact both hands were solved to the SAME point (the simulation hand, then the ball
centre), so the elbows pinched inward and the forearms crossed through the ball; the HOLD pose kept the fold — the keeper stayed
hunched over a ball drawn by the 2D sprite renderer, composited over the 3D character.

**The production sprite catch** (`assets/visual_v1/goalkeeper/GK_ANIM_V1.json`, clip `chest_catch`, 8 frames, `use` 1–8; east
contact frame 3 / hold frame 7, south contact 4 / hold 7): frame 1 upright ready (hands low in front, knees slightly bent), frame 2
hands rise, frames 3–5 arms open wide with the ELBOWS OUT and the hands forward at chest height (contact), frame 6 the hands meet,
frames 7–8 hug across the chest with the torso upright and the knees slightly bent. Clip `low_gather`: ready, crouch, gloves to the
ground (frames 4–6, deep torso fold), rise (7–8) to an upright stance holding the ball at the chest. No sprite clip exists for
HIGH_CATCH or NEAR_BODY_SAVE (the sprite backend uses save poses / the set pose).

**v10 skeletal catch** (`gk_motion_library.js` catch group, kind `catch`): READY_UP (16° total pitch, pelvis 0.86 m) → BRACE
(u < 0.45: knees flex, pelvis −5 cm, arms open wide, elbows out) → RECEIVE (hands forward on the ball line at chest height) →
CONTACT (authoritative tick) → CRADLE (0.12 s: forearms wrap by shoulder horizontal adduction + elbow flexion) → ABSORB (0.20 s:
elbows flex further, arms yield to the chest) → CONTROL (0.15 s) → STRAIGHTEN (0.50 s: knees / hips / spine extend) → HOLD (upright
possession, stable). The anticipation before the commit is height-aware: a predicted central crossing above ~0.8 m is met from
READY_UP, a ground ball from the crouch (authoritative prediction `gk.predict.crossing.z`).

Spine pitch (pelvis + spine + chest, fixture 45 chest catch): ready 16° → brace / receive 20–21° → contact 21° → absorb 24–26° →
control 26° → hold 13°. Pelvis height 0.86 → 0.78 (receive) → 0.77 (control) → 0.85 (hold). Elbow separation stays 0.73–0.85 m
through the whole lifecycle (v8: the elbows met). Hand separation closes 1.1 m (receive) → 0.30 (cradle) → 0.25 (absorb) → 0.21
(hold: both hands on the surface of a 0.11 m ball).

**Cradle construction.** Two hand targets are derived from the ball: ball centre ± (0.11 + 0.03) m along the keeper's lateral
axis, 2 cm below the centre; each arm is solved to ITS target with an outward-down elbow pole (shoulder + 0.5 m lateral − 0.3 m).
Before possession the two-hand reach uses the same split around the simulation hand target, so the hands arrive either side of the
ball line (the contact metric for two-hand catches is the midpoint of the hands vs the simulation hand: 10–11 cm on the chest
catches, 4–6 cm on the gathers and the high catch).

**Presentation ball.** `gl_renderer.js` renders a UV sphere (physical radius 0.11 m; the 2D sprite draws 0.19 m for readability)
in the keeper's WebGL world / camera / depth buffer whenever `gk3dOwnsBall()` holds: the SKELETAL_3D backend is active and the
authoritative ball is within 3 m of the keeper or keeper-owned; the 2D ball sprite returns early in that case (one line in
`drawBallAt`). Its transform: before possession = the authoritative ball converted to world space; from the authoritative possession
tick (`b.held === "GK"`) it blends over 0.30 s from the catch point into the cradle centre (midpoint of the AUTHORED hand centres),
then follows the authored arms (bring-down, straighten, hold); the hands are then solved onto its surface. The simulation ball
(`t.b`) is read only: never moved, parented, re-timed; the held flag, contact tick and outcome are the simulation's. Animation OFF /
ON and sprite / 3D gates over all fixtures stay identical (section 7).

**Held-ball state.** HOLD is a stable pose: the manifest shows identical spine pitch (13°), pelvis (0.85 m), ball position, hand
and elbow positions from the first HOLD tick to the end of every held fixture (160+ ticks), no re-trigger, no return to an
empty-handed READY while the simulation says held.

**Differences.** CHEST_CATCH / SUPPORTED_CATCH / NEAR_BODY (caught): the lifecycle above (NEAR_BODY adds the step-out and lean,
which straightens in ABSORB). HIGH_CATCH: hands start high (RISING → REACH_UP, jump from the launch demand), CRADLE overhead, the
ABSORB stage is the bring-down (0.30 s) to the upper chest, then straighten / hold (spine −6° at the overhead contact → 22° at
control → 13° hold; pelvis 0.93 → 0.80 → 0.85). GATHER: deep crouch (pelvis 0.45 m, 56° total pitch at contact, matching the
sprite's fold at the ground), scoop-close, clutch to the belly, a longer straighten (0.65 s) to the same upright hold. Parries
(no possession): RISE → SET as before.

**Free play (recorder corrected, v10 code):** seed 7 (120 shots): 114 committed, 40 contacts, 15 held (GATHER 4, NEAR_BODY 4,
HIGH_CATCH 3, LOW_COLLAPSE 2, FAR_DIVE 1, LOW_DIVE 1), 0 fallbacks, 0 unauthored ticks, 1 flag (the known LOW_DIVE hard ground
stop, shot 74). Seed 11 (160 shots): 151 committed, 53 contacts, 24 held (GATHER 9, NEAR_BODY 4, LOW_DIVE 3, HIGH_CATCH 2, FOOT_SAVE
2, LOW_COLLAPSE 2, FAR_DIVE 1, CHEST_CATCH 1), 0 fallbacks, 0 unauthored, 4 flags: two LOW_DIVE hard ground stops (Δv 1.74 / 1.77),
one NEAR_BODY RECEIVE → CONTACT (excess 3.5 cm, Δv 2.1 m/s: the step-out plant landing at the contact tick), one HIGH_CATCH parry
RECEIVE → RISE at exactly the 1.5 m/s threshold. Every held catch in both seeds runs CRADLE → ABSORB → CONTROL → STRAIGHTEN → HOLD
with the hands within 20 cm per frame at every boundary. A pre-existing bug surfaced by the widened assertion and fixed in v10: a
HIGH_CATCH jump's pelvis offset was dropped at the post cut (Δv 6–11 m/s on parried high balls in free play); the jump now carries
into the post and lands over 0.30 s.

**Measured (fixtures 45 / 33 / 47 chest, 46 high, 26 / 27 / 9 gather, 61–63 angled chest catches):** 0 stage-boundary flags including the new hand checks
(both hands ≤ 20 cm per frame across CONTACT → CRADLE → ABSORB → CONTROL → STRAIGHTEN → HOLD); hand-to-ball-centre distance in the
hold 0.12–0.15 m (chest / high; surface at 0.11, target 0.14) and 0.09–0.11 m on the gathers (up to 2 cm inside the surface —
listed below); hold residual vs the ideal side targets 7–9 cm (the hands sit on the surface at a slightly different angle).

## 9d. CATCH group v11 — containment rebuild (v10 rejected on the slow-motion review)

**Root cause of the v10 inverted / inside-chest arms.** For a chest or supported catch the simulation's contact point is at the
chest (fixture 45: hand target 0.19 m in front of the chest joint; the ball surface 8 cm from the torso) and the held ball stays
there. v10 rendered the ball at that point from the first held tick and solved each arm independently to a point on its surface: with
the target that close to the shoulders, the two-bone solves folded the elbows back and down through the ribcage and the forearms
crossed the torso — the hands reached the ball, every "elbow separation" number looked fine, and the arms were inside the chest.
The v10 gather folded the torso 56° over a ball whose catch point lies inside the crouched body's depth.

**Coordinated cradle solve (`ik.js`: `skelCradleElbow`, `skelAimChain`; `gk_graph.js` step 7).** For a two-hand catch the arms are
not solved as two chains chasing two points. Each frame: (1) the wrist targets are computed for BOTH hands from one construction
(receiving plane before possession, ball sides after); (2) each elbow is placed on its reach circle around the shoulder→wrist line by
choosing among 36 deterministic samples the angle that best follows an out / down preference (`right·0.75 − up·0.55`, tucking
`−fwd·0.25` once secured) subject to hard anatomy: the elbow, the upper-arm midpoint and the forearm midpoint must lie OUTSIDE the
torso exclusion volume (pelvis → shoulders along the spine, ribcage half-width 0.20·hs + 0.02 clearance, depth −0.13 / +0.12·hs),
the elbow may not rise above the shoulder (+5 cm), the elbow may not pass the back plane (−0.16·hs) — violations cost more than any
preference gain; the previous frame's angle is kept when within 0.05 of the best (no side flips); (3) the chain is re-aimed to the
chosen elbow and wrist and the hand curls from the forearm line toward the ball centre (palm on the surface; curl 0.35 receiving,
0.7 holding); (4) the two hand centres are checked for crossing (left hand must stay on the left of the right hand along the
keeper's lateral axis). Every violation is recorded per tick (`cradleFlags` in the manifest, `cradleViolations` per free-play shot)
and drawn red in the cradle debug view.

**Hands get around the ball before containment.** From u = 0.30 of the commit the wrists blend (over 0.20 of u) onto a RECEIVING
PLANE: the authoritative hand target moved 0.28 m (0.20 m for a ball below 0.6 m) toward the incoming ball along the horizontal
incoming direction (read from the authoritative ball each tick), split laterally by ball radius + 3 cm clearance + 0.6 hand length
+ 2 cm so the ball passes between them; low balls put the hands 0.6 radius below the line (palms under). The ball therefore enters
an open basket whose back wall is the chest; nothing chases it.

**Ball penetration prevented / ball path.** Before possession the rendered ball IS the authoritative ball. At the authoritative
held tick the hands close from their receive positions onto the ball's sides over the CRADLE stage (0.12 s); the rendered ball stays
at the catch point through CRADLE, then during ABSORB (0.20–0.24 s) it travels along a straight contained path from the catch point
to the CHEST PIN — a point on the chest front (0.12·hs + radius + 1 cm ahead of the spine line) at the catch height clamped to the
abdomen … upper-chest range, computed from the current torso every frame so it rides the straighten — while both wrists follow the
same construction (the cradle moves with the ball). The rendered ball is clamped outside the torso volume at all times after
possession; the clamp distance is exposed (`ballClamp`): 0 on the chest / high catches, 0.22 m on the gather lob (fixture 26) and
0.14 m on the ground gather (fixture 9), where the simulation holds the ball inside the crouched body's depth — the discrepancy is
shown, not hidden. The simulation ball is never written.

**Chest pinning.** SECURE / STRAIGHTEN / HOLD keep the ball at the chest pin with the wrists on its sides, 4–7 cm forward of the
centre (hands around the sides / front), elbows tucked beside the ribs by the preference term, never inside the volume; the chest is
the rear support surface. Hold measurements (fixtures 45 / 33 / 47 / 46, 61–63): hands 0.15 m from the ball centre (surface 0.11 +
0.03), hand separation 0.28 m, elbow separation 0.75–0.85 m, spine 13°, pelvis 0.85 m, constant to the end of the fixture.

**Low gather (v11).** Its own keys: READY_UP → DROP (u 0.40: knees / hips flex, pelvis −0.26 m, torso 40°, head on the ball, hands
lowering in front) → SCOOP (u 1.0: pelvis −0.44 m, torso 40° — NOT folded over the ball: the body stays behind it — shoulders forward,
hands down and forward of the knees, palms open) → BASKET_CLOSE (cradle stage) → SECURE (ball clutched to the abdomen, still
crouched, pelvis −0.38 m) → STRAIGHTEN (0.65 s) → HOLD. Measured (26 / 27 / 9): torso 40–41° through the scoop, pelvis 0.49 m at
contact, knees 0.13–0.23 m high in front, hands 0.30–0.42 m high ahead of the knees at contact, 0 arm-in-torso violations, hold
13° / 0.85 m.

**Regression / free play (v11 code).** 64 / 64 fixtures identical sprite vs 3D and animation OFF vs ON; fixture 42 bit-identical
(28 joints × 320 ticks); FOOT_SAVE fixtures 19 / 16 / 55 / 57 bit-identical to the v9 manifest (the cradle solver touches only the
catch group). 32 packaged fixtures: 0 stage-boundary flags, 0 cradle violations. Free play seed 7 (120 shots): 114 committed, 40
contacts, 15 held, 1 flag (known LOW_DIVE hard stop), 1 shot with cradle violations (shot 86, a one-hand NEAR_BODY catch, 8 ticks of
upper-arm-in-torso during the hand-over from the single reach into the cradle). Seed 11 (160 shots): 151 committed, 53 contacts, 24
held, 4 flags (two LOW_DIVE hard stops, the NEAR_BODY step-out plant at contact with excess 3.5 cm and hands within 10 cm, one
HIGH_CATCH parry at the 1.5 m/s threshold), 3 shots with cradle violations (21 NEAR_BODY 4 ticks, 107 HIGH_CATCH 1 tick, 156 GATHER
25 ticks: a moving keeper gathering with the ball beside the body). A parry now RELEASES the cradle by blending the arms back to the
authored pose over the rise (v10's hand jump of 20–40 cm at CONTACT → RISE on parries is gone); a one-hand reach that becomes a catch
hands over from the last solved wrists (v10 jumped 1.1 m there).

**Visual inspection (close rig, 4× slow, cradle debug).** Chest catch 45 and gather 26 were inspected frame by frame with the
overlay: arms blue (valid) on every tick, elbows outside the orange torso box, the ball entering the receive plane between the
hands, the cradle closing behind it, the ball riding to the chest pin and staying there through the straighten; no forearm through
the torso, no crossing, no elbow above the shoulder.

## 10. Remaining problems (honest list)

1. LOW_DIVE with a leg-volume contact (2 of 13 low dives in free play): the simulation's leg-tip model lies on the opposite side of
   the hip from the authored trailing leg; chasing it swept the leg through the hip. The low dive now shows the authored leg and the
   ball meets it approximately (the mismatch is exposed). Either the simulation's low-dive leg model or the authored trailing leg has
   to move; that is an authoring decision for Astra / the simulation, not a solver fix.
2. Ball inside the arm's fold radius (shot 116: the parry point 9–13 cm from the shoulder): the reach releases toward the authored arm
   with a 40–50 cm residual; the elbow still moves up to 31 cm in one frame at the absorb start. Bounded, no flip, but visible.
3. LOW_DIVE hard ground stop (shot 74 above): a Δv of ~1.5 m/s in one frame when the arc arrives at the lying height.
4. GATHER hold stays kneeling while the ball is held (the simulation keeps the ball at the catch point); the hug-and-rise needs a
   simulation "ball carried" state.
5. Shuffle steps are brisk (0.30 s per step, 0.50 m); tune with Astra's timing.
6. Fixture 54 (moving keeper, synthetic shot) registers no shot on a fresh page (harness order dependence: the capability band pinned
   by fixture 42 persists on a page); it commits to a CHEST_CATCH in the ordered gates. Its package folder shows footwork only.
7. Skinned rig shoulder deformation (v7 finding) — irrelevant to the motion reference, listed for completeness.
8. FOOT_SAVE and the Touchline camera: at a straight facing the keeper's lateral axis runs into the camera, so the lateral spread
   projects as depth (near foot low on screen, far foot high and partly occluded by the body; dark socks against the pitch hide it
   further in the banded render). The 3D spread is real (feet ~1.2 m apart, pelvis 0.46 m) and reads as width at angled facings.
   The spread is defined by the simulation's contact geometry and was NOT rotated toward the camera.
10. CATCH (gather): the simulation holds the gathered ball inside the crouched body's depth (0.07 m ahead of the root at hip height);
   the rendered ball is clamped to the abdomen front (0.14–0.22 m ahead of the simulation ball while held) — a simulation body-model
   limit, exposed as `ballClamp`.
11. CATCH: the 3D presentation ball (0.11 m) is smaller than the 2D sprite ball (0.19 m); the size changes where the ball enters the
   3 m zone around the keeper. A game-wide decision (draw every ball at its physical size, or scale the 3D ball) is outside this task.
12. CATCH: a two-hand catch reports a 10–11 cm contact residual by construction (the hands are split either side of the simulation's
   single hand point).
13. CATCH (free play): the cradle selector still reports brief violations on one-hand NEAR_BODY catches (the hand-over from the single
   reach) and on a moving keeper's gather with the ball beside the body (4 of ~40 catch commits over two seeds); they are recorded
   per tick and drawn red in the cradle debug view.
9. FOOT_SAVE contact representation: the simulation's LEG+ / LEG- volumes are vertical standing-leg cylinders at ±0.20 m; the
   spread shows the ball at the saving leg's shin / knee region (the foot itself sits on the simulation's leg tip, residual 2.5–8 cm on
   the straight fixtures). A ball the simulation records on the standing-leg cylinder can therefore sit up to ~15 cm from the drawn
   spread leg. Exposed, not faked.

## 11. Deferred to Astra (visual, not motion)

Silhouette timing of the fold at the low-dive impact; hand shapes on the hold; hair / kit secondary motion; the 2.5D outline and
band count; kneel foot contact shading. None of these change a joint position.

## 12. Files

- `sandbox/visual/anim3d/gk_motion_library.js` (new), `gk_graph.js`, `gk_backend.js`, `gk3d_backend.js`, `ik.js`
- `sandbox/visual/match.js` (12 M3 fixtures 43–54), `match.html`
- tools: `sandbox/visual/tools/anim3d/gk3d_freeplay.js` (new; `--dump <shot>` per-tick trace), `gk_motion_manifest.js` (new),
  `gk3d_gate.js`, `gk3d_gate_compare.py`, `capture.js`, `sandbox/visual/tools/gk_anim/gk_anim_gate.js --anim off`

## 13. Reproduction

```
.venv/bin/python server.py                       # :8000
python3 sandbox/visual/serve_match.py            # :8124
export PUPPETEER_NODE_MODULES=<dir with puppeteer-core>
node sandbox/visual/tools/anim3d/gk3d_gate.js --backend sprite --scenarios all --ticks 260 --out gate_sprite.json
node sandbox/visual/tools/anim3d/gk3d_gate.js --backend 3d --scenarios all --ticks 260 --out gate_3d.json
python3 sandbox/visual/tools/anim3d/gk3d_gate_compare.py gate_sprite.json gate_3d.json
node sandbox/visual/tools/gk_anim/gk_anim_gate.js --url http://127.0.0.1:8124/sandbox/visual/match.html --anim off --ticks 260 --out animoff.json
node sandbox/visual/tools/anim3d/gk3d_freeplay.js --out fp3d --shots 120 --seed 7 [--dump 116]
node sandbox/visual/tools/anim3d/gk_motion_manifest.js --out manifest.json --scenarios 42,10,32,19,41,33,31,46,26,49,50,51,52,53,54,1,11
node sandbox/visual/tools/anim3d/capture.js --backend 3d --scenario 42 --ticks 0-319 --out DIR --crop 0 --clip 600,150,500,450
   (+ --dbg bones,ik,roots,feet for the overlay view; --crop 2 --zoom 3.5 --camx 98 --pixel 1 --outline 0 --bands 6 for the close 3D view)
```
v6 regression: run the manifest for scenario 42 before and after a change and compare every joint of every tick (must be 0.000 m).

## 14. Commits

- `bdfb222` prototype: goalkeeper skeletal MOTION LIBRARY — 8 canonical motions, deterministic selection, held ball, footwork
- `fe08d2e` landing / IK continuity: one-way post phase, arrived-low hard stop, bend-plane memory + fold radius in the solver,
  hold hand-over, tuck plants follow a sliding body, rise-recovered drift, floored legs kept through a pelvis lift; free-play dump tool
- `fc77de1` docs: review page, findings, Astra reference package, verification records
- `f57040b` FOOT_SAVE spread block: new motion kind `spread`, ground plan absorb / side-sit options, fixed world-space step-out
  plant, fixtures 55–60, dedicated review section
- `7099645` CATCH group rebuilt from the production sprite catch: kind `catch` (READY_UP, brace, receive, cradle, absorb, control,
  straighten, hold), height-aware anticipation, split hand targets with outward elbow poles, 3D presentation ball (WebGL sphere,
  `gk3dOwnsBall`), held-ball presentation transform, catch → hold continuity checks (hands), high-catch jump carried into the post,
  fixtures 61–63
- `6c96f7e` CATCH containment: coordinated cradle solve with torso exclusion, receiving plane on the incoming line, contained
  held-ball path with chest pin and torso clamp, low-gather language, cradle debug view, cradle violation records
