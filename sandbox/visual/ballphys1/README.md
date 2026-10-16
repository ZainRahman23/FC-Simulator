# BALL-PHYS-1 — owner review candidate

Built on `prototype/physical-character-v2` at `dbc8aa22` in an isolated checkout, branch `prototype/ball-phys-1`. This is an executable ball foundation and comparison lab. It is **not enabled in the production match or squad playtest**. Those systems retain their existing football balance. No TURN-1 or character-controller files are changed.

Run from repository root:

```sh
node sandbox/visual/ballphys1/tools/test.mjs
node sandbox/visual/ballphys1/tools/evidence.mjs
python3 -m http.server 8769 --bind 127.0.0.1
```

Open `http://127.0.0.1:8769/sandbox/visual/ballphys1/`. The page includes 20 scenarios, 1×/0.25×/0.1× playback, scrub/contact jump, trajectory and contact close views, the existing Touchline camera projection, six legacy comparisons, custom initial-state/material/substep/impactor input, and trajectory export. Videos show 1× followed by 0.25× contact study. Collider colours: boot gold, body blue, post white.

## Architecture reconstructed

| Path | Authority and timing | Current limitations |
|---|---|---|
| `simulator/fc_simulator/engine.py:body_decide` | Seeded brain chooses action/receiver and execution error. Passing uses effective short/long passing (GK kicking for long GK passes), distance and pressure; finishing and pressure control shot dispersion. Effective attributes include the established fatigue path. | Does not turn every listed attribute into velocity/spin. Do not invent a weak-foot power multiplier. |
| `continuous.py:Lab.apply_decision` | Maps error-bearing target to SHORT/DRIVEN/LOFT/THROUGH/CROSS/CUTBACK, schedules 0.28 s pass / 0.32 s shot / 0.25 s clear windups. Keeper and aerial routes also exist. | The optional STEERED experiment has continued guidance; it is explicitly incompatible with this foundation. |
| `world.py:Body.kick`, `FAM`, `step_ball` | One metric x/y/z ball dictionary; 60 Hz frame integration, instantaneous family-derived velocity. Preferred-foot/geometry chooses foot and technique. FAM covers SHORT, DRIVEN, THROUGH, CUTBACK, LOFT, CROSS, CLEAR, SHOT, PUNT. | No mass/inertia/angular velocity. Ground deceleration 4.2 m/s²; air horizontal deceleration 0.8; restitution .55, horizontal bounce keep .80. Radius .11 m is already authoritative for whole-ball rules. Receives/carries/GK holds can directly rewrite state. |
| `ballflight.py:BallFlight` | Older event-based match presentation adds deterministic 60 Hz height samples to brain-owned horizontal positions. | It is a separate older path, not the authority of continuous Body or the squad playtest. Cannot simply replace its z integration and claim full physics. |
| `sandbox/visual/match.js:ptKick`, `ptChargeLaunch`, `ptBallStep` | Isolated JS playtest port with its own authoritative `t.b`. Contact at `kickAt`; kick library provides timing/selected foot. Charge families INSIDE/INSIDE_FINISH/LACES/LACES_POWER/OUTSIDE/CHIP already have distinct speed/lift. | Curve is scalar `b.curve.s`, not physical ω. INSIDE_R has a target-solved initial angle lookup and a velocity-dependent free curl law. X3-B is active in this baseline; X3-D is the production-strength alternative. Neither steers toward target after contact. |
| `match.js:ptGoalFrameStep`, GK and net routines | Swept sphere/capsule post/crossbar collisions, whole-ball crossing, swept keeper contacts and net membrane handling already exist in the playtest. | Separate collision paths and material approximations. Full coupled angular dynamics absent. |
| `pt_squad.js`, `pt_defend.js` | Shared squad ball; receiving boot-plan tests; slide contact has physical-style normal/tangential response. | Slide spin values are diagnostics only. Controlled-ball and reception logic is a separate authority concern; this mission does not adopt its dribble architecture. |
| `physchar2/spec/v2_colliders.js` | Existing V2 character collision geometry: ten-piece boot hull, tapered shin/thigh, chest boxes/capsules, head spheres. | V2 contact policy explicitly leaves the ball for later. |

The primary checkout's uncommitted weather changes were also inspected: dry constants remain unchanged; rain/snow select different rolling/bounce/keep values, including `ball-surface.js`. These were not copied or overwritten. The reference comparison is the committed dry physical-character baseline, not a claim to cover every weather variant or other agent's changing branch.

**Feasibility:** continuous fixed-tick Body can host a continuously physical ball, but replacing its integrator alone is insufficient. Carry/reception/GK hold writes, predicted stop calculations, aerial contest decisions, goalie prediction, goal/net events and snapshot transport must adopt the same ball authority. The older one-second event path also requires an explicit migration. This lab deliberately exposes that boundary without changing match outcomes.

## Implementation and authority

`BallWorld` owns one sphere's position, linear velocity, angular velocity, orientation quaternion, material parameters, contact state, and rest state. No render transform is read by simulation. `render.js` reads snapshots; its panel markings use integrated quaternion orientation.

`adapter.js:resolvedAction` takes the already-resolved football output. It preserves its velocity, chosen/preferred foot and arbitrary seed/context/quality metadata. It does not consume RNG or apply attributes a second time. Ground actions get an explicit provisional rolling-consistent ω; aerial ω defaults to zero unless supplied. `spinForLegacyCurve` is an initial lateral-acceleration matching proposal, **not** a unit conversion from the legacy scalar. Curve setup tables must be re-solved against the new physics before adoption.

At an integer contact tick the world validates the ball's contact region and striking surface, replaces **velocity and spin once**, then runs free physics. Expected contact position is a gate, never a teleport instruction. Removed or contested balls cancel the launch. Explicit reset/placement belongs outside deliberate actions. There is no target, desired endpoint, animation parent, carrier, possession tether or dribble scheduler in the ball kernel.

Contact policy:

1. Fixed tick/substep clock; colliders and simultaneous actions use stable lexical IDs. Previously resolved contacts already changed the ball.
2. Any non-striker physical contact since action preparation invalidates it. Turf does not cancel it. An external body touching the ball at the contact tick wins the tie.
3. Only one simultaneous deliberate action can be accepted; stable action ID breaks ties after eligibility checks.
4. Only the chosen striking collider's current contact episode is suppressed following handoff. Every defender and the other foot remain collidable.
5. The guard ends on >2 mm separation, with a hard two-substep limit. Persistent overlap throws a named integration error; it cannot silently add a second kick or move the ball to fix animation. This is intentionally strict and requires live animation integration to pass the geometry gate.
6. Subsequent incidental contact overwrites motion through impulses. There is no retained launch trajectory to resume.

The current review actions can launch without a kicking leg, as requested. Full skinned kick-animation alignment at the new contact boundary is **not integrated**. Existing timing/foot/technique metadata is preserved for that integration; animation must fit the ball.

## Physics and parameters

Right-handed numeric kernel coordinates: X pitch length, Y up, Z pitch width. Ball position is its **centre**; initial drop height is clearance below it. Legacy z=0 maps to centre y=.11. Spin is rad/s. The shell approximation gives `I = (2/3)mr² = 0.00346867 kg m²`.

| Parameter | V1 value | Evidence class |
|---|---:|---|
| Radius / mass | .11 m / .43 kg | Reference-derived choice within IFAB circumference .68–.70 m and mass .410–.450 kg. Not a measured particular ball. |
| Inertia factor | 2/3 | Ideal thin-shell model; not a measured inertia tensor. |
| Gravity | 9.81 m/s² | Standard engineering approximation. |
| Air density / Cd | 1.2 kg/m³ / .25 | Reference-informed baseline. Constant Cd is an intentional simplification. |
| Magnus lift | `Cl=min(.30, 1.0 R |ω_perp|/|v|)` | Game calibration informed by spin-dependent lift literature; not a fitted ball-specific curve. |
| Air spin decay | .08 s⁻¹ | Game calibrated. |
| Turf restitution | .55 | Existing Touchline calibration retained; not a measured turf value. |
| Sliding / bounce friction | .30 / .30 | Game calibrated Coulomb coefficients. |
| Rolling deceleration | .65 m/s² | Grass-like test candidate, not measured and **not balance-approved**. |
| Ground axial spin decay | 1.2 rad/s² | Game calibrated contact-patch loss. |
| Post e / μ | .72 / .12 | Restitution retains existing frame intent; friction is a game candidate. |
| Boot e / μ; body e / μ | .48 / .45; .35 / .38 | Game calibrated; fixtures are prescribed-motion impactors. |
| Sleep / bounce cutoff | .015 m/s, .12 rad/s for .15 s; impact .20 m/s | Numerical calibration. 4 cm/s moving-boot contacts still register. |
| Tick / substeps | 60 Hz / 4 (240 Hz) | Engineering configuration; 480 Hz convergence tested. |

References: [IFAB Law 2](https://www.theifab.com/laws/latest/the-ball/) supplies size/mass bounds. [NASA, Drag on a Soccer Ball](https://www.grc.nasa.gov/www/k-12/airplane/socdrag.html) uses Cd .25 as an approximate simulation baseline. [Asai et al., 2007, Fundamental aerodynamics of the soccer ball](https://people.stfx.ca/smackenz/Courses/HK474/Labs/Jump%20Float%20Lab/Asai%202007%20Fundamental%20aerodynamics%20of%20the%20soccer%20ball.pdf) reports speed-/spin-dependent aerodynamics and a drag crisis; it supports including drag and Magnus, not claiming constant coefficients are exact. No original physical measurements were performed.

Air uses quadratic drag, gravity and transverse Magnus; the Magnus velocity rotation does not add kinetic energy. Ground support applies Coulomb slip impulses to both v and ω. Once slip vanishes, rolling resistance removes translational and rotational energy together. Normal impacts use restitution with tangential Coulomb impulses. Ground contact uses swept plane time-of-impact; obstacles use conservative advancement against exact box/sphere/capsule/tapered geometry and compiled convex boot faces. Rotation contributes to the swept speed bound. A query/contact budget exhaustion fails explicitly, never silently advances through a collider. Forces are integrated at substeps, so CCD follows piecewise linear ball paths; it is not exact continuously accelerated CCD.

Body fixtures use actual V2 shape parameters; convex boot edges are sharp in this solver rather than Jolt's rounded support representation. Rendering of tapered fixtures is simplified. Kinematic motion is prescribed; the body supplies energy when moving, while stationary-collider tests are dissipative. Equal/opposite impulse is exported but is not yet fed back into a live Jolt character.

## Evidence and balance gate

`tools/reference.mjs` extracts and executes the real `ptBallStep`, charge, family and curve functions from the checkout. Keeper, net and frame are excluded only in the *free-flight comparison*. The physical demonstration separately tests posts and defenders. Reference outputs, launch packets and new snapshots are saved in `evidence/review.json`.

Raw launch comparisons (20 s, total displacement, not first landing): ground 20.14→70.24 m; driven 30.97→89.70; loft 44.81→56.29; power 96.22→93.24; chip 26.47→36.07; curve 42.13→61.06. These are unacceptable for silent promotion. Changing rolling deceleration while preserving speed cannot simultaneously preserve stopping distance and arrival speed. The action layer must explicitly choose preservation targets (arrival speed/time/carry) and fit launch speed/spin/setup to the physical solver; the original seeded target error and foot selection must remain upstream.

The battery checks drop heights .25/.5/1/2 m, dissipating energy, bounded bounce count, rest, rolling .04–20 m/s, slip→roll, spin sign and bounce effects, no Magnus energy gain, launch uniqueness, every body region, 51 ms blocked shot, tackle contact, removed/contested balls, same-tick ordering, selected-foot double-impulse suppression, fast ball→post through 100 m/s, boot→ball through 60 m/s, rotating obstacle sweep, substep convergence and full unrounded replay. `tests.json` is the authoritative check count/result. Browser replay has its own UI button that hashes the same snapshots/events for comparison with Node.

CPU measurements cover free aero, ground contact, contact-heavy fixtures and 308 collider broadphase checks (22 × 14 body segments). They measure ball cost only, excluding live character solving, rendering, shape compilation and animation. Typical observed ball cost is below .01 ms for free flight and around .3–.4 ms for 22-player broadphase or boot contact; see saved measurements for the exact run. This supports V1 experimentation, not a full 22-character performance guarantee.

## TURN-1 / DRIBBLE-1 contract

See `contract.d.ts` and the executable adapters in `adapter.js`. A player supplies stable body ID, timestamp, physical transform, linear/angular velocity, actual shape geometry, material, support/swing state, locomotion state and deliberate window metadata. Update existing collider frames at the fixed simulation boundary with `setColliderFrame`; do not rebuild geometry or sample display interpolation. Motion is linear/angular within each substep; if acceleration changes materially, publish at the substep rate.

V2/Jolt GL has z=-pitch-y. `fromTurn1Frame` reflects position, local shapes and quaternions, and correctly transforms **axial** angular velocity. A plain coordinate permutation of ω is wrong. `impulseToTurn1` returns the equal/opposite world-space impulse/contact point. A live coupling must apply it inside the same solver interval, not one presentation frame later. If actual live character motion differs from the published sweep, refresh the remaining interval.

Ball outputs position, v, ω, q, contact time/point/normal/impulse, rolling/sliding/rest state and slip ratio. Deliberate action additionally supplies a resolved velocity/spin packet, action ID, selected foot, family and optional execution quality/seed metadata. Quality is audit data at this boundary, not an animation motor gain.

First DRIBBLE-1 experiment: replay the **same actual TURN-1 foot trajectories** through (A) pure physical contact, (B) resolved small-touch state at verified contact, and (C) bounded desired-touch assistance at verified contact. Compare ball separation, touch reach, interruption by a defender just before/after contact, control variability across skill, and repeated seed hashes. Begin with 1–3 m/s straight touches and one planted cut. Do not add a tether to make any option pass.

## Remaining defects / release boundary

1. Raw legacy launch balance is not preserved, especially ground/driven range and curve calibration.
2. Player fixtures are kinematic: live Jolt feedback, actual TURN-1 paths and skinned kick contact alignment still need integration. The strict two-substep guard can reject overlapping strike animation.
3. V1 material/aero simplifications omit pressure/deformation, measured turf data, weather fitting, drag crisis, knuckle effects, moving/deforming turf and full goal-net integration.

Ready for visual review of the isolated physical foundation. Not ready to replace the match ball authority. The lab leaves all three DRIBBLE-1 architectures open.
