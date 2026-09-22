# GOALKEEPER DISTRIBUTION — findings (v12, 2026-09-20)

Branch `prototype/3d-animation-pipeline`. Review page: `GK_DISTRIBUTION_REVIEW.html` (sections #putdown #roll #throw #clearance).
Rule of the whole work: **the simulation decides what happens; the animation visually explains what happened.** The release of a
held ball is a simulation event; the animation never decides release success, trajectory, velocity, destination, possession,
timing or whether a release may happen. No presentation RNG. The simulation ball is never modified to make an animation work.

## 1 · Simulation audit (what was authoritative before; what did not exist)

| mechanic | before (match.js) | status |
|---|---|---|
| held ball | `b.held = "GK"` set by the contact resolver (one site, ~line 4113) with `exclT = ∞`; `gkHeldBallStep` pins the ball to `gk.handNow` every tick | authoritative, unchanged |
| releasing a held ball | **did not exist** — nothing cleared `held` except a scenario reset; possession was terminal | added (section 2) |
| throw / roll / put-down | **did not exist**; no keeper handedness anywhere (`t.pfoot` is the shooter's foot) | added as fixed launch laws |
| kicked clearance | the player kick launch family `ptFam("CLEAR", D)` exists (T = clamp(D/11, 1.2, 2.6), v = [D/T, g·T/2·1.15]); `PUNT` only as an alias of the LACES_POWER charge family; no keeper kick, no drop kick | the CLEAR launch law is reused; the drop and the foot-contact moments are added |
| ball physics after a release | gravity, air drag, roll friction μ 4.2, bounce REST 0.55 — the integrator every ball uses | unchanged; a released ball is an ordinary free ball |
| keeper facing | `gk.facing = atan2(ball − gk)` every tick; no target-facing state | during a plan the facing is the target direction (authoritative) |
| normal ball control / dribbling | the pickup rule (`t.now ≥ b.exclT`, reach, z < 1.4, v < 5.5 → `b.ctrl = true`) belongs to the FIELD PLAYER entity; the keeper entity has no dribble controller | not invented (see issues) |
| keeper locomotion with the ball | none: a held ball pins the keeper (positioning is skipped while held) | entry is always stationary |
| shot recognition | rising edge of `t.kick.kicked` | untouched; a plan never writes `t.kick`; a new shot cancels any plan |

## 2 · Simulation contract added (match.js)

`GK_DIST` constants, `gkDistributionStart(t, gk, req)`, `gkDistributionStep(t)`, a hook at the top of `ptGkUpdate`, `t.gkDist`
per fixture (`sc.dist`) / per free-play shot. Deterministic, no RNG, nothing read from the animation.

- Request `{ kind, target?, side?, foot? }`. Start condition: `b.held === "GK"` for the secure time — 1.0 s after a standing /
  gather catch, 3.5 s after a diving / collapsing catch (`gk.contact.standing`, `committed.gather`).
- At the start: `gk.facing` = direction to the target (immediate, authoritative), the keeper stands (`vx = vy = 0`, positioning
  skipped), the commit record is KEPT (the possession lifecycle continues), `gk.state = "DISTRIBUTE:<kind>"`.
- Hand convention: the hand on the target's side of the keeper's frame at the plan start (`lat < −0.05 → L`, else R). Foot from the
  request (default R). The simulation has no keeper handedness — this convention is the contract, documented for Astra.
- Release points are fixed offsets in the keeper's frame [ahead, lateral toward the release side, height]; the ball is placed ON the
  point at the release tick with the kind's launch velocity, `held = null`, `ctrl = false`, pickup exclusion 0.4 s (0.15 s put-down).

| kind | prep | release point (m) | launch | follow |
|---|---|---|---|---|
| THROW | 0.90 s | [0.85, 0.28, 1.78] | 17 m/s horizontal toward the target, vz so the arc lands at the target (T = D/17) | 0.70 s |
| ROLL | 1.00 s | [0.60, 0.22, 0.00] | 9 m/s along the ground toward the target | 0.70 s |
| PUNT | 0.75 s to the DROP at [0.55, 0.12, 1.05]; KICK when the falling ball reaches z 0.45 m (prediction tKick = tDrop + √(2·0.60/g) ≈ +0.35 s, drift 0.3 m/s) | CLEAR family for min(D, 45 m), applied where the ball IS (never moved to the prediction) | 0.80 s after the kick |
| PUTDOWN | 0.85 s | [0.50, 0.00, 0.00] | 0.4 m/s forward (stops within 2 cm) | 0.60 s |

Events (`gk.distEvents`, `gk.dist.events`): RELEASE / DROP / KICK with tick, ball, velocity, root, facing, held flag, foot / side,
and for the KICK the prediction error (measured 0.055 m / 1 tick: the sim's air drag slows the fall slightly — exposed, not hidden).
After `tEnd`: `gk.distDone` set, `gk.dist = null`, `gk.committed = null`, `gk.state = "SET"`, normal positioning resumes.
A new shot (rising edge) clears `gk.dist` / `gk.distDone`.

Simulation z convention: `b.z = 0` is a ball resting on the pitch (every rolling ball); ground releases use z 0.

## 3 · Presentation (SKELETAL_3D) — how a plan is explained

- `gkActionDescription` exposes `desc.dist` (read-only snapshot of the plan + events).
- `gk_graph.js` DISTRIBUTION branch (`mode "dist"`): starts from the pose the body is in (captured "from" key), turns the body to
  the authoritative facing over the first 30–35 % of the preparation (feet re-plant as turn steps, one at a time, when a plant is
  > 0.18 m from its stance point), samples the motion's keys over u (prep) / w (punt free fall) / v (follow-through), ends in SET
  over the simulation root so the plan's end (commit released, state reset) is invisible.
- Rendered ball: an authored in-hand path (`_ball` per key, keeper frame) whose whole path is shifted linearly so it ends EXACTLY
  on the authoritative release / drop point (lifted to its radius when on the pitch) at the release tick; from that tick the rendered
  ball is the simulation ball. Never held longer, never released earlier, never re-parented.
- Hands: two hands on the ball's sides (the cradle anatomy: `skelCradleElbow` with the torso exclusion + `skelAimChain`), one hand
  at the end of the arm line with the palm behind the ball; the hand-over blends the wrist target between the two rules by the
  other hand's weight (no target jump); an explicit `handRelease` window lets the supporting hand leave before the ball swings away.
  After the release the hands fade off a STATIC anchor at the release point over `handsOff` (0.10–0.15 s) — never the flying ball.
- Plan start continuity: arms blend from their last solved elbows / wrists over 120 ms (the hold path uses a different solver), any
  torso / clavicle assist decays over the same window, and a mid-step start keeps the pelvis momentum (decays over 80 ms).
- Punt foot: the ankle is solved (two passes, foot orientation from the solved foot) so the ball rests on the LACES: ball centre −
  (foot radius + ball radius) along the laces normal − 65 % of the foot back along its direction; weight ramps over the fall and
  targets the LIVE simulation ball, then holds the actual kick point for 120 ms. Contact metric = foot surface to ball surface.
- Motion library (`gk_motion_library.js`, kind `dist`): DIST_PUTDOWN (symmetric), DIST_ROLL, DIST_THROW, DIST_PUNT (authored
  RIGHT; LEFT = mirror of poses, ball path, hand roles, step points); `gkSelectDistribution(desc.dist)`.
- Presentation-only change with wider effect: the rendered sphere is clamped to rest ON the pitch (`y = max(z, r)`); joints of
  every pre-existing fixture are unchanged (manifests), only the drawn height of a rolling ball changes (it was half-buried).
- Validation records (`GK3D.distRecords`) at every authoritative event: sim ball + velocity, rendered ball on the last held tick and
  its residual, hand / foot to the ball surface, sim vs presentation root and facing, held flag after, prediction error, start phase,
  `startDown`. Per-tick anatomy flags (`GK3D.distFlags`). Debug overlay `--dbg dist` (separate captures; clean frames carry none).

## 4 · Fixtures 64–75 (match.js GK_SCENARIOS)

64 PUTDOWN central · 65 / 66 ROLL right / left · 67 / 68 THROW right / left · 69 THROW far straight · 70 / 71 PUNT right / left foot ·
72 SW-facing catch → PUTDOWN (turn) · 73 NW-facing catch → THROW far side · 74 SSW-facing catch → ROLL across (left) · 75 SW-facing
catch → PUNT left foot. All from the chest-catch base fixtures; the plan starts 1.0 s after the catch.

## 5 · Results (fixtures; probe + manifests)

| fixture | event | rendered→authoritative residual (last held tick) | hand→surface | foot→surface | facing err | anatomy flags | assertions |
|---|---|---|---|---|---|---|---|
| 64 PUTDOWN | RELEASE t165 | 0.009 m | 0.046 m (both) | — | 0° | 0 | none |
| 65 / 66 ROLL R / L | RELEASE t174 | 0.030 m | 0.033 m | — | 0° | 0 | none |
| 67 / 68 THROW R / L | RELEASE t168 | 0.041 m | 0.033 m | — | 0° | 0 | none |
| 69 THROW far | RELEASE t168 | 0.041 m | 0.033 m | — | 0° | 0 | none |
| 70 / 71 PUNT R / L | DROP t159 · KICK t181 (pred t180) | 0.005 m | 0.044 / 0.041 m | 0.009 m | 0° | 0 | none |
| 72 angled PUTDOWN | RELEASE t134 | 0.009 m | 0.046 m | — | 0° | 0 | none |
| 73 angled THROW | RELEASE t137 | 0.041 m | 0.033 m | — | 0° | 0 | none |
| 74 angled ROLL (L) | RELEASE t147 | 0.030 m | 0.033 m | — | 0° | 0 | none |
| 75 angled PUNT (L foot) | DROP t128 · KICK t150 | 0.005 m | 0.041 m | 0.009 m | 0° | 0 | none |

The 3–4 cm "residual" at a throw / roll release is the ball's own motion in one tick (the rendered ball is moving along the
authored path at ~2 m/s; the authoritative point is where the path ENDS at the release tick — the record compares the previous
tick's rendered ball with it). The hand-to-surface 0.033 m is the palm offset (`handOff` 0.03).

## 6 · Free play (production path) — `verification/FREEPLAY_distribution_summary.json`, review page section 9

Tool: `gk3d_freeplay.js --dist [--frames]` (resumable shot loop; the authoritative event frames are captured on the fly).
- Seed 7, 120 shots: 44 contacts, 16 held catches → 16 plans started (PUTDOWN 3, ROLL 6, THROW 5, PUNT 2), 16 released, 16
  completed; none started while the body was down; the held flag never survived a release; anatomy flag ticks in 3 shots (2, 2, 1
  ticks: a hand grazing the torso box during the hand-over after collapse / near-body catches); rendered→authoritative residual max
  0.041 m (mean 0.023), hand→surface max 0.055 m, foot→surface max 0.009 m; no continuity assertion on any plan boundary
  (the 4 assertions in the run are the pre-existing LOW_DIVE IMPACT→ABSORB and NEAR_BODY RECEIVE→CRADLE classes, untouched here).
- Seed 11, 160 shots with event frames: 60 contacts, 18 held → 18 plans (PUTDOWN 4, ROLL 8, THROW 4, PUNT 2), all released and
  completed; start phases: HOLD 1, SET 5 (after diving / collapsing catches, the get-up complete at 3.5 s), STRAIGHTEN 12 (long
  gather / high-catch holds: the plan starts during the straighten and the captured pose carries in); 1 anatomy flag tick; residual
  max 0.041 m, hand→surface max 0.056 m, foot→surface max 0.010 m; no plan-boundary assertion (5 pre-existing-class assertions:
  4 LOW_DIVE landings, 1 HIGH_CATCH brace→contact).
- Plans that started after a diving / collapsing catch (7 in seed 7, 5 in seed 11): the presentation was standing (SET) in all but
  one, which started in its last REPOSITION step (momentum carried; no assertion).

## 7 · Regression (nothing pre-existing moved)

- `gk3d_gate.js` SPRITE vs SKELETAL_3D, all 76 fixtures, 160 and 260 ticks: identical hashes; the 64 pre-existing fixtures' 260-tick
  hashes are byte-identical to the stored v11 record (`gk_motion_library/verification/GATE_sprite_vs_3d_64_fixtures.md`).
- Distribution fixtures 64–75 at 300 ticks (through every release): SPRITE vs 3D identical — the release is the simulation's.
- `gk_anim_gate.js --anim off` vs 3D on, 76 fixtures: identical final-tick root / hand / ball / held / contact.
- Manifests: fixture 42 (v6 far dive, frozen) bit-identical (28 joints × 320 ticks); FOOT_SAVE 55–60 bit-identical to the v10
  manifest; CHEST_CATCH 45 bit-identical to a manifest rendered from the previous commit (git worktree of f0c3979).
- Free play seed 7 without distributions: all 114 stored shots identical in every recorded field to
  `FREEPLAY_3d_120_shots_seed7.json` (commit / contact ticks, family, motion, side, outcome, residuals, phases, assertions).
- Dribbling / kick system: untouched (no code path changed; the CLEAR launch family is only called, not modified).

## 8 · Remaining issues / honest gaps

1. The keeper cannot dribble: the field-player pickup / dribble controller is a different entity. PUTDOWN ends with a free ball at
   the keeper's feet (exclusion 0.15 s) — "transition to normal dribbling" needs the keeper to become a controllable player in
   production; not built here (no second engine).
2. No walking / jogging entry exists mechanically: the held ball pins the keeper. The turn steps are the only locomotion in a plan.
3. The plan's secure time is a fixed simulation parameter (1.0 / 3.5 s); a plan can legally start while the presentation is still
   getting up (flagged `startDown`, observed 0 times in 280 free-play shots) or mid-reposition (observed once; carried).
4. The supporting hand's release window (`handRelease`) is authored per motion (throw 0.25–0.37, roll 0.28–0.40 of the preparation); an earlier window was flagged for one tick by the torso-box check — the metric is the same one the catch cradle uses.
5. The SPRITE backend has no distribution art: it shows the hold, then SET (the resolver re-derives its snapshot as before).
6. The rendered ball hands over to the 2D ball 3 m from the keeper (existing seam) — visible in the throw / punt flights.
7. The punt prediction error (0.055 m / 1 tick, air drag) is exposed in the records rather than hidden; the foot aims at the live
   ball so the contact residual is 0.9 cm regardless.
8. Throw arc: 17 m/s horizontal with vz for the target lands the ball near the target only without air drag; the simulation's drag
   makes it fall short — the sim's decision, documented; the animation does not care.


# v13 — distribution animation refinement pass (2026-09-22)

Simulation contract UNCHANGED (release ticks / points, launch laws, secure times, possession logic, ball physics, target
selection): the gates below prove the 76 pre-existing fixtures' simulation traces are byte-identical to the v12 record.
Presentation only: authored skeletal motions + a ball / hand quality gate. No root / IK hacks: the arms are solved by the same
cradle-elbow machinery, now with the ball excluded from the elbow choice; the rendered ball path still ends on the authoritative
point at the authoritative tick; the punt foot still targets the live falling simulation ball.

## v13.1 · What changed per action (`gk_motion_library.js`)

- **PUT DOWN** — rebuilt as a quick ONE-HAND action (`DIST_PUTDOWN`, side from the hand convention; mirrored for the left). The
  first 45 % of the simulation's 0.85 s preparation stays an upright one-hand carry (ball on the palm at the hip, elbow bent);
  the visible action — hip hinge with knee flexion, the holding arm reaching the ball down just ahead, the hand opening from
  underneath at the authoritative tick — is compressed into the second half, and the follow-through is a quick straighten OVER
  the ball into an athletic stance (no steps, no backing away inside the plan). Visible action ≈ 0.85 s (v12 ≈ 1.45 s). The v12
  two-handed placement is kept UNUSED as `SET_PIECE_PLACE_BALL`. Honest caveat: because the ball must be in the hand until the
  authoritative point ON the pitch, the hand has to reach the ground — a deep knee bend with the trunk horizontal for ~0.2 s is
  physically unavoidable for a one-hand release at that point; the simulation's preparation time was not changed (a shorter
  PUTDOWN prep would be a simulation parameter change — documented, not done).
- **ROLL** — palm-carried underarm roll: ball ON the palm at the hip (carry), the opposite foot steps toward the target, a
  MODEST backswing with the ball resting on the palm (palm facing forward-up), a deep lunge with the trunk folded, the arm coming
  down and forward close to the pitch, the ball rolling off the front of the palm at the authoritative point, low follow-through,
  the trailing foot comes through, settle. The ball is never at the fingertips (the old "end of the arm line" rule is gone).
- **THROW** — long, forceful: carry to the throwing palm at the shoulder, front-foot step, LARGE wind-up (arm back beyond the
  shoulder line, elbow ~40° bent, hips + shoulders turned ~58° away, slight lean back, weight on the rear leg, free arm sighting
  the target, eyes on it), hips unwind first (pelvis −16° past square at release), trunk follows, arm over the top, release
  forward-up; then the arm continues hard down and across to the opposite hip, the trunk keeps rotating (−40°) and pitches forward
  (~52°), the rear foot steps through, small rebalancing steps back over the root.
- **PUNT** — lateral hip torque: ball carried in the KICKING-side palm; LOAD — weight and lean onto the support (left) leg, pelvis
  turned 20–30° away, right hip opened with the knee folded behind, shoulders counter-rotated toward the target; the hand lets the
  ball go into the strike path (authoritative DROP); the pelvis unwinds (hips lead), tall on the support leg, the leg swings through
  the forward / lateral corridor to the laces contact on the falling simulation ball (authoritative KICK), then continues UP AND
  ACROSS the body with the trunk rotating through and pitching forward; the kicking foot lands ahead-left; settle. Mirrored
  correctly for a left-footed clearance (fixture 71, 75).

## v13.2 · Ball / hand quality gate (`gk_graph.js` step 8; overlay `--dbg dist`; records `GK3D.distRecords[].handMetrics`)

The ball is a 0.11 m sphere; the hand is 0.114 m long with a 0.03 m glove offset. ONE-HAND grip = the ball rests ON THE PALM: the
palm point (mid-hand) sits at radius + glove from the centre along the palm normal and the hand is tangent to the ball, so the
wrist is at √((r+g)² + (½·hand)²) = 0.151 m from the centre. The authored `_palm` direction is only a preference: it is projected
perpendicular to the forearm (two passes, authored arm then solved arm) because the palm is parallel to the forearm, and the elbow
choice excludes the ball (the elbow, upper-arm midpoint and forearm midpoint must stay outside it). TWO-HAND grip = the v11 cradle
(hands on the sides) with the hand angle set each tick so the FINGERTIPS land exactly on the surface (+ glove). The hand-over
blends the wrist target on the ball's surface (direction + distance from the centre), never through it, and carries the previous
cradle anchors along with the ball for the first 120 ms. Per tick, for every hand that is firmly on the ball (weight > ¾):
palm-to-surface (|palm − centre| − r − g), fingertip penetration, ball beyond the fingertips (near surface past the tips),
wrist penetration, forearm intersection (proximal 60 %), and hand-centre cuts (a sudden jump > 0.16 m). The release records add
the rendered-vs-authoritative residual and the held flag (v12).

## v13.3 · Results

- 16 fixtures (64–79; 76–79 are new front / ¾ view fixtures with targets toward the camera): 0 flagged ticks, 0 continuity
  assertions; release records: rendered→authoritative 0.006–0.038 m, hand centre (0.6 along the hand) to surface 0.055–0.059 m, palm-to-surface
  0.021–0.025 m (the palm point is the hand axis; the glove offset is 0.03), finger / wrist / forearm penetration 0, foot-to-surface at the
  punt contact 0.023 m, facing error 0°.
- Free play (production path) with distributions, seeds 7 and 11: see the review page section 9 and
  `verification/FREEPLAY_distribution_summary_v13.json`.
- Regression: SPRITE vs SKELETAL_3D identical on all 80 fixtures (260 ticks) and on the 16 distribution fixtures (300 ticks);
  the 76 pre-existing fixtures byte-identical to the v12 gate record; animation OFF vs ON identical (80 fixtures); v6 fixture 42,
  FOOT_SAVE 55–60 and CHEST_CATCH 45 manifests unchanged (0 differing joint samples); free play seed 7 without distributions
  identical to the stored record.

## v13.4 · Remaining issues

See the review page section 11 (v13): put-down depth is dictated by the ground release point; post-plan repositioning is the
simulation's; glove thickness is a mesh property; punt contact 2.3 cm; throw arm speed is real; the v12 items (no keeper dribbling /
locomotion with the ball, no sprite distribution art, the 3 m ball hand-over, drag on the throw range) stand.


# v13.1 — two focused corrections (2026-09-22): PUT DOWN aftermath, THROW flight

## v13.1.1 · PUT DOWN — why the keeper still backed away, and what changed

Diagnosis (measured on fixture 64): the plan ends 0.60 s after the release; at that tick `gk.state` returned to SET and the
simulation's goal-positioning controller (`gkPosition` / `gkMove`) resumed. With the ball 0.5 m in front of him it walked the
keeper ~0.7 m back toward his set depth (root 101.74 → 102.42 over the next 0.5 s). That is the AUTHORITATIVE post-release state,
not an authored retreat; the v13 presentation ends over the ball and the sim then moved the root. Change (simulation, explicit):
- `GK_DIST.PUTDOWN.vFwd` 0.4 → 1.6 m/s: a gentle forward roll (the ball travels ~0.3 m under roll friction and stops ~0.8 m
  ahead of the root) instead of a dead ball under the keeper.
- BALL AT FEET (`ptGkUpdate`, positioning branch): after a PUT DOWN, while the ball is free, uncontrolled, ≤ 1.5 m/s and within
  1.6 m, the keeper holds his position facing it (`gk.state = "BALL_AT_FEET"`, root static); the plan's end hands straight into
  this state. No dribble controller exists for the keeper — the ball stays playable in front of him until another actor takes it or a
  shot resets everything.
- Presentation: the put-down follow-through ends in the upright READY_UP stance and the graph draws READY_UP (not the keeper's
  set crouch) while the simulation reports BALL_AT_FEET.
Measured: release tick 165, ball at rest 0.82 m ahead by tick ~190, keeper root unchanged through tick 400, facing the ball.

## v13.1.2 · THROW — driven launch law (simulation, `GK_DIST.THROW`)

Law "driven": speed v = the speed that reaches the requested target (range from the RELEASE point, 1.78 m high) at the minimum
elevation θmin = 12°, capped at vMax = 24 m/s; if the cap binds the elevation rises just enough to reach the target (≤ 45°).
Drag-free ballistic range with a 1.5 % gain for the simulation's linear air drag. Nothing acts on the ball after launch except the
ordinary physics. The v12 law (fixed 17 m/s horizontal, vertical solved to land at the target) is kept as `law: "arc"` for the study.
Measured on the real simulation (`throw_study.js`, authoritative ball paths; review page section 6):

| fixture / target distance | law | release speed | elevation | apex | landing distance | miss | flight |
|---|---|---|---|---|---|---|---|
| 67 / 24.5 m | v12 arc | 18.0 m/s | 19.7° | 3.82 m | 24.85 m | 0.37 m | 1.52 s |
| 67 / 24.5 m | driven 24 / 12° (chosen) | 21.4 m/s | 11.6° | 2.83 m | 24.94 m | 0.49 m | 1.22 s |
| 69 / 38.5 m | v12 arc | 20.0 m/s | 31.8° | 7.71 m | 37.7 m | 0.92 m | 2.35 s |
| 69 / 38.5 m | driven 24 / 12° (chosen) | 24.0 m/s | 17.9° | 4.72 m | 38.65 m | 0.31 m | 1.75 s |

Candidates compared: vMax 22 / 10°, 24 / 12°, 24 / 15°, 26 / 12°, 24 / 20° (plot with release vectors, apex, distance, flight time
in the review page). 24 m/s / 12° chosen: flat driven flight for throws up to ~26 m, a moderate rise only when the cap binds at
long range; 26 m/s flattens the 40 m throw further but exceeds a plausible release speed. Body mechanics (v13) unchanged.

## v13.1.3 · Regression

Only the fixtures whose simulation legitimately changed differ from the v13 gate record: 64, 72, 79 (put-down) and 67, 68, 69, 73,
77 (throw); the other 72 fixtures are byte-identical; sprite vs 3D identical on all 80; animation OFF vs ON identical; v6 / FOOT_SAVE /
CHEST_CATCH manifests unchanged; free play seed 7 without distributions identical to the stored record.
