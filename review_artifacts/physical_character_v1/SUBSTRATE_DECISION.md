# Physical Character V1: physics-substrate decision (for approval)

**Status:** comparison and recommendation only. Gate A is not implemented, and nothing is committed or pushed.

**Evidence:**
- Primary sources: npm type definitions, engine source, issue trackers and specs, checked 2026-09-29.
- A disposable empirical spike: `spikes/substrate/` in the `physical-character-v1` worktree. Raw output is in `substrate_spike_results.txt` next to this file.

**The spike is not Gate A.** It has no humanoid, no Reference Tackle playback and no renderer, and it ran in Node, one process at a time. Total CPU was a few seconds.

---

## 0. The answer in one paragraph

**Use Jolt Physics (JoltPhysics.js, single-threaded WASM build) as the rigid-body substrate, with Touchline owning the whole physical-character layer on top of it.**

In the spike it was the only engine that kept first touch to 0.2 mm in every configuration that mattered. That covers both a 15 m/s rotating shin sweep and a 13 m/s linear hit, with the struck leg responding on the same frame and no tunnelling in any of the 5 contact phases. It needed two settings: its speculative-contact distance, plus a Touchline-owned adaptive-substep rule for close fast pairs.

Its constraint model matches our controller design:
- per-axis *asymmetric* anatomical limits (SixDOF with a pyramid swing);
- quaternion target-orientation motors with implicit spring drives and torque caps;
- a per-contact friction override for Touchline's material-pair policy;
- snapshots and ragdoll self-collision filtering.

For context, Rabona itself moved its custom engine from Bullet to Jolt in 2026 [RB2].

**Second choice: Rapier** (the `-deterministic` build).

**Rejected:**
- Bullet via ammo.js: solver blow-ups at 60 Hz, rotation-blind CCD, the worst tunnelling results, and friction data not exposed.
- Custom XPBD as the substrate: we would be building a general engine. It stays the last resort, and a source of targeted fixes.

---

## 1. Rapier (0.21.0 / core 0.36, deterministic-compat build)

**Supports what we need:**
- dynamic bodies;
- capsule, box and sphere shapes, and compounds;
- explicit mass plus principal inertia and inertia frame (`setAdditionalMassProperties`) [R-rb];
- our own torques (`addTorque`, `applyTorqueImpulse`);
- revolute, spherical and generic joints;
- **asymmetric per-axis angular limits**, through the raw `jointSetLimits(handle, AngX|Y|Z, min, max)` [R-raw]. Each limit is a per-axis projection of the relative rotation (2·atan2(q_i, q_w)), neither Euler angles nor a cone [R-limit];
- per-axis joint motors (position/velocity, stiffness/damping, max force);
- **full contact data in JS**: points, normal, distance, normal impulse, and both tangent impulses per point [R-np];
- collision and solver groups;
- snapshots;
- a `-deterministic` package documented as cross-platform deterministic [R-det].

**What limits it for us** (behaviours, not missing conveniences):
1. **Built-in CCD does not protect limb-vs-limb when both limbs are fast.**
   - Docs and source: "A bullet never sweeps another bullet". Targets are frozen at their end-of-step pose. "Two CCD-enabled objects might still tunnel" [R-ccd].
   - **Spike, reproduced:** CCD on both bodies was bit-identical to no CCD. It gave 100 mm of penetration and **2 of 5 tunnels** at 15 m/s.
   - CCD on the fast body only works (≤ 6.2 mm, and its sweep includes rotation). But in a tackle both players' legs can be the fast one.
2. **Soft-CCD (predictive contacts) uses linear velocity only** [R-pred]. The spike's linear hit: 0.3 mm. The rotating sweep: still 30 mm.
3. **No per-pair friction.** Friction is per collider plus a global combine rule. JS hooks can filter pairs but not modify contacts [R-hooks].
4. **No orientation motor.** Motors are per axis (2·asin(q_i)), and the coupled-axis motor path is an open TODO [R-1011]. Quaternion targets would go through our own torques.
5. **Smaller items:**
   - `numSolverIterations` is its internal substep count (default 4) [R-sub];
   - angular speed is capped at ~47 rad/s at 60 Hz, and the override isn't bound in JS [R-maxang];
   - snapshot restore leaks WASM memory until #994 lands;
   - its determinism statements disagree between the README and the docs, so use the `-deterministic` build.

**Best spike configuration:** CCD on the fast body + prediction 0.25 m + adaptive substeps + contact natural frequency 120 Hz + 8 iterations.
- First touch: ≤ 1.9 mm.
- Sustained contact: ≤ 6.2 mm.
- No tunnels.
- It takes five interacting settings, and it relies on knowing *which* body is the fast one.

## 2. Bullet in the browser

**Builds available:**
- The only maintained Bullet-in-WASM is **ammo.js**, active again with a build on 2026-09-22. It is still Bullet **2.82** (2013) [B-ver].
- `btMultiBody` is not bound in any build found.
- Per-point friction impulses (`m_appliedImpulseLateral1/2`) and `m_combinedFriction` exist in C++ but are not bound [B-mp].
- A community fork has Bullet 3.2.6 with Spring2 bindings (unmaintained upstream; bullet3's last release was 2022) [B-fork].

**What it offers:**
- Limits: Generic6Dof per-axis asymmetric limits, as Euler XYZ with the middle axis restricted to ±90°. ConeTwist limits are symmetric but it has a quaternion motor [B-6dof].
- CCD: a **translation-only swept sphere** against a frozen target [B-ccd].

**Spike:**
- **Numerical blow-up (NaN, or 10⁸ m/s)** in **all 4** single-step rotating runs (default and CCD, at 9 and 15 m/s), with the same PD torque inputs that Rapier and Jolt handled. Without our PD torques, the same runs didn't blow up.
- Stable only with substeps, and even then 16–49 mm of penetration.
- **Tunnelling at 15 m/s even with adaptive substeps.**
- Its CCD helped only the linear case (12 mm).

**Verdict: rejected.** The contact behaviour, stability and exposed data all miss the invariant.

## 3. Jolt (JoltPhysics.js 1.1.0 / Jolt 5.6.0)

**Supports what we need:**
- dynamic bodies;
- capsule, box, sphere and compound shapes;
- explicit mass and full inertia (`MassAndInertiaProvided`);
- our own torques (`AddTorque`, `AddAngularImpulse`);
- hinge, SwingTwist and **SixDOF** constraints. SixDOF with `ESwingType_Pyramid` allows **asymmetric** Y/Z swing limits ("does not need to be symmetrical around zero") plus a twist range [J-6dof];
- **motors with a quaternion target** (`SetTargetOrientationCS/BS`). They are implicit springs (frequency or stiffness, plus damping) with torque limits, and the `Ragdoll` class and `DriveToPoseUsingMotors` are bound [J-idl];
- per-contact `ContactSettings` override (`mCombinedFriction`, `mCombinedRestitution`, mass scales) → **per-pair friction** [J-cl];
- `GroupFilterTable` for ragdoll self-collision;
- `SaveState`/`RestoreState`;
- sleeping control;
- adjustable maximum angular velocity.

**What limits it for us:**
1. **No post-solve contact impulses in JS.** Listener callbacks fire before the solver [J-cl]. The request (issue #2128) is open; the maintainer's advice is to add the function locally [J-2128]. Joint impulses *are* readable (`GetTotalLambda*`).
   - **Mitigations:**
     - body-level impulse accounting from velocity change, gravity, known drive impulses and joint lambdas (enough for the momentum ledger);
     - or a small local JoltPhysics.js build exposing contact-constraint impulses (a one-time emsdk toolchain setup).
2. **LinearCast CCD ignores rotation.** "Tunneling is still possible if the body is long and thin and has high angular velocity" [J-mq]. The spike agrees: 45–64 mm on rotating sweeps. **We don't rely on it for limbs.** Speculative contacts plus adaptive substeps solved the rotating case (below).
3. **Cross-platform determinism.** Jolt guarantees determinism for the same binary and API call order [J-det]. The npm build doesn't enable the cross-platform flag.
   - **However:** it is single-threaded, has no SIMD (the agent's byte scan found no v128 in the single-thread `.wasm`), and is built with `-ffp-contract=off`. Under the WebAssembly determinism rules (only NaN bits, relaxed SIMD and threads are non-deterministic [W-nd]), the same `.wasm` *should* be bit-identical across browsers and CPUs.
   - **This is an inference.** It is checked at Gate A by comparing hashes across Node, Chrome and Safari: one run each.
4. **Limit shape.** The pyramid limit clamps two swing projections independently, not a true asymmetric cone. That's acceptable for anatomical ranges. SixDOF rotation limits can't be soft.
5. **Tolerance defaults.** Default penetration slop is 2 cm and speculative distance is 2 cm [J-ps]. Both must be changed for us (we used 2 mm and 0.25 m).

## 4. Custom XPBD, stated honestly

"Small custom solver" understated it. What XPBD (Müller 2020) gives us conceptually vs what we'd still have to engineer to production quality:

| area | XPBD gives us | we would still engineer |
|---|---|---|
| translational + quaternion integration | the substep update and velocity derivation | numerical robustness (quaternion drift, NaN guards, far-from-origin precision) |
| inertia | the generalised inverse-mass formulas | tensor construction per shape/compound; stabilisation for mass ratios |
| broad phase | — | sweep-and-prune or BVH, swept bounds, deterministic pair ordering |
| narrow phase | — | capsule/capsule, capsule/box, box/plane, sphere/*; manifolds with feature IDs; degenerate cases (parallel capsules, deep overlap) |
| persistent contacts, resting stability | a positional contact constraint | contact caching and matching across substeps, jitter control (XPBD has little numerical damping), sleeping |
| friction | static (positional) + dynamic (velocity) formulas | anisotropic friction, torsional friction (stud anchor), stable stick/slip switching |
| joints, limits, motors, damping | attachment, swing/twist limit and compliant-drive formulas | anatomical frames, limit singularities, torque caps, profile blending, damping tuning |
| CCD / fast rotating limbs | the substep argument | a guard or time-of-impact for pathological speeds; rotating sweeps |
| determinism | — | ordering discipline plus our own trigonometry for cross-engine bit-identity |
| debugging, performance | — | every visualisation, allocation-free inner loops, a regression suite |

Honest scope: roughly **4–8 k lines plus months of hardening** — a general-purpose physics engine, which is exactly what we don't want to build for two footballers.

**What it would uniquely buy:**
- position-level contacts with zero slop;
- complete introspection;
- pure-JS cross-engine determinism.

The spike shows a mature engine meets the invariant's critical part without it.

**Verdict:** not the substrate. Kept as a last resort, and as a source of *targeted* techniques (e.g. a swept-capsule guard) that sit on top of the library.

## 5. Empirical spike results

**Scene** (identical for every engine; metrics computed by our own exact capsule–capsule distance from body transforms, never by engine reports):
- a two-capsule "attacker leg": thigh 11 kg + shank 3.4 kg with de Leva-style inertia, hung from a fixed hip by a ball joint with **asymmetric** limits;
- a hinge knee with limits;
- held by **our own PD torques**;
- hit by a dynamic "tackler shin" capsule on a motor-driven hinge sweeping at **9 or 15 m/s** (rotating, dynamic vs dynamic), or by a free capsule at **13 m/s** (linear).

**Protocol:**
- 40 frames at 60 Hz;
- **worst case over 5 contact phases**: contact placed at 0, 0.2, 0.4, 0.6 and 0.8 of a frame;
- each phase run twice for repeatability.

| engine · configuration | ROT 9 m/s: max / at touch (mm) | ROT 15 m/s: max / at touch | LIN 13 m/s: max | tunnels (of 15 runs) | frames > 10 mm (worst) | repeatable |
|---|---|---|---|---|---|---|
| Rapier · default | 105 / 105 | 100 / 100 | 94 | **4** | 9 | yes |
| Rapier · CCD on both bodies | 105 / 105 | 100 / 100 | 94 | **4** | 9 | yes |
| Rapier · CCD on the fast body only | 5.9 / 5.0 | 6.2 / 5.7 | 6.1 | 0 | 0 | yes |
| Rapier · soft-CCD (predictive) | 18 / 15 | 34 / 30 | 0.3 | 0 | 9 | yes |
| Rapier · best (CCD-fast + prediction + adaptive + stiff contacts) | 6.0 / **1.1** | 6.2 / **1.9** | **0.3** | 0 | 0 | yes |
| Jolt · default | 110 / 110 | 107 / 94 | 97 | **5** | 12 | yes |
| Jolt · LinearCast | 45 / 14 | 64 / 30 | 16 | 0 | 11 | yes |
| Jolt · speculative 0.25 m | 44 / 3.3 | 20 / 5.9 | 0.6 | 0 | 6 | yes |
| **Jolt · speculative 0.25 m + adaptive substeps (+ slop 2 mm)** | **2.0 / 0.2** | 9.3 / **0.2** | **0.2** | **0** | **0** | yes |
| Bullet · default | 70 (then a 10⁸ m/s blow-up) | **NaN** | 29 | **4** | 6 | yes |
| Bullet · CCD | **NaN** | **NaN** | 12 | 0 | 6 | yes |
| Bullet · best (adaptive) | 17 / 16 | 22 / 12 | 38 | **1** | 4 | yes |

**What the numbers mean:**
- **Tunnelling is real at football speeds on every engine's defaults.** At 60 Hz a 15 m/s limb moves 25 cm per frame, more than twice the 11.5 cm radius sum. A single-step discrete engine lets the limbs pass through or overlap by ~10 cm, which is exactly our old failure.
- **The critical part of the invariant is achievable on a mature engine.** With Jolt's speculative contacts plus a deterministic adaptive-substep rule, first touch is **0.2 mm**. The struck shank moves in **the same frame**, and there are **no tunnels** at any phase. Rapier reaches 1–2 mm, but only with CCD on the known-fast body.
- **Sustained compression:** 6–9 mm remains *while the sweep motor keeps pushing at 400 N·m*, on both Rapier and Jolt. It isn't tunnelling. It's the iterative solver's position-correction compliance under a large, continuous drive; more iterations and lower slop reduce but don't eliminate it.
  - It's comparable to the ~10 % collider inset I proposed (5.5–8.5 mm), so the rendered meshes would be about touching.
  - The invariant should therefore be stated as **first touch ≤ 3 mm** and **sustained compression under load ≤ the collider inset (visible mesh overlap ≤ ~2 mm)**.
  - Gate D should use realistic drive torques (≤ 250 N·m) rather than the spike's deliberately harsh 400 N·m.
- **Cost:** every configuration ran at 0.02–0.14 ms per frame for this scene. The 28-body / 26-joint scale probe, with 26 torque writes and 28 transform reads per frame (i.e. the JS↔WASM traffic), cost **0.09–0.14 ms per frame at 1 step and 0.29–0.43 ms at 4 steps**, in all three engines. Performance doesn't decide this.
- **Determinism:** all engines were bit-identical run-to-run in-process. Cross-runtime (Node vs Chrome vs Safari) wasn't tested; it's a Gate A item.
- **Rest stability:** the scale probe's rest figures were **inconclusive**. An undamped 14-capsule chain five seconds after a drop gave 0–270 mm/s depending on inputs, so it isn't a rest test. Gate A's damped drop test is.

## 6. Concrete blockers (behaviour we need that an option cannot deliver)

| option | blockers |
|---|---|
| Bullet / ammo.js | numerically unstable with our inputs at 60 Hz (NaN); rotation-blind, target-frozen CCD that still tunnelled at 15 m/s with substeps; friction impulses and friction override not exposed; Bullet 2.82 codebase |
| Rapier | CCD cannot protect a pair where *both* limbs are fast (by design) — so the invariant relies on knowing which limb is fast; no per-pair friction (the material-pair and stud-anchor policy can't be expressed); no orientation motor |
| Jolt | **no blocker found.** Gaps with mitigations: post-solve contact impulses (body-level accounting now; local binding if needed); rotation-blind LinearCast (not used for limbs); cross-browser determinism is an inference (checked at Gate A) |
| custom XPBD | no capability blocker; the blocker is scope — it is a general engine |

## 7. Recommended substrate

**Jolt Physics via JoltPhysics.js, single-threaded `wasm` build**, loaded as an ES module. Its WASM is 2.0 MB (0.74 MB gzipped) [J-size].

It sits behind a thin **Touchline substrate adapter**: bodies, shapes, constraints, motors, step, contacts, snapshots. Touchline code never calls Jolt directly, which keeps Rapier a real fallback.

## 8. Second-choice fallback

**Rapier (`@dimforge/rapier3d-deterministic-compat`)**, behind the same adapter:
- the fast-limb CCD role is assigned per interacting pair by Touchline's contact policy;
- orientation control uses our own torques;
- friction is approximated with per-collider values.

We switch if a Jolt abandonment trigger (§15) fires.

## 9. Why Jolt fits Touchline specifically

1. **Our controller design maps 1:1 onto its constraint model.**
   - The architecture's "implicit PD with ω, ζ, τmax per joint" *is* Jolt's `MotorSettings` (frequency/damping spring plus torque limits) driving a quaternion target (`SetTargetOrientationCS`).
   - Asymmetric anatomical ranges are SixDOF pyramid limits.
   - Profiles and strength s(t) are Touchline changing motor settings over time.
   - Where we want custom behaviour (the root drive, the upper-body balance drive), we apply our own torques and forces, which the spike exercised.
2. **The material-pair friction policy stays ours.** The per-contact `ContactSettings` override lets Touchline's contact policy set boot–turf, kit–turf, hand–turf and limb–limb friction per contact without Jolt knowing anything about football.
3. **It met the invariant's hardest part with the simplest configuration:** speculative distance plus an adaptive-substep rule that Touchline owns. It doesn't depend on guessing which limb is fast.
4. **Deterministic, snapshot-able, MIT-licensed, single-threaded and small.** No SIMD or threads in the build we'd use, which is also what makes cross-browser bit-identity plausible.
5. **Relevant prior art:** Rabona's own engine moved to Jolt in 2026 [RB2]. The earlier engine, *enigine*, used bullet3 [RB1]. This is supporting evidence only. We aren't copying Rabona, and the devlog quote about fragile synchronisation could not be found in retrievable sources (UNVERIFIED).

## 10. Ownership boundary

| Jolt owns (generic mechanics) | Touchline owns (football and character intelligence) |
|---|---|
| rigid-body integration; mass/inertia mechanics | authoritative football outcomes (the simulation); action/animation resolution |
| broad and narrow phase; persistent contacts; contact constraints; non-penetration; resting contact | Reference Tackle targets and target-pose generation (substep-sampled) |
| generic joint solving; limit enforcement; motor/spring math | anatomical frames and ranges (data); motor targets, gains, torque caps, strength profiles over time |
| friction *mechanics* (Coulomb solve) | friction *policy*: per-pair coefficients via the contact listener; the stud anchor as a Touchline-managed temporary constraint on the turf |
| speculative contacts; optional LinearCast for free fast bodies | the **fast-pair guard**: adaptive substep count and speculative distance, plus an analytic swept-capsule check for flagged pairs (detection only, never moves a body) |
| snapshots; sleeping | activation/deactivation policy; determinism discipline of inputs; recording and replay |
| — | balance / support representation; stumble / fall / recovery control; contact *interpretation*; root and upper-body drives |
| — | rendered-skeleton fitting; all debug visualisation; the invariant monitor; momentum ledger |

**Where I challenge the proposed split (with a reason):** CCD can't be left entirely to the library. The spike showed that every engine's built-in CCD fails fast *rotating* dynamic-vs-dynamic limbs in some way. The **policy** (when and how finely to substep, which pairs get the analytic guard) must be Touchline's, even though the library still does the actual collision work.

## 11. How we avoid dual animation/physics character states

- **Jolt's bodies are the only character state.** Touchline's controller writes *targets and drive parameters* into it before each step. It never writes body poses or velocities during simulation. The only exceptions are activation, which initialises from the animation pose with matching velocities, and an explicit, logged reset.
- **The animation system produces targets, not a character.** Once a player is physical, no kinematic pose is drawn anywhere except as a debug ghost.
- **One-way flow:** targets in → step → body transforms out → fitted 23-bone skeleton → skinning. The rendered skeleton is a pure function of the physical state plus authored sub-bone detail (toe, wrist, clavicle).
- **This is the opposite of the fragile pattern.** That pattern moves a character with its own motion system and asks physics to collide around it. Here the motion *comes out of* the physics.

## 12. Timestep, substep and CCD strategy

- **Base rate:** 60 Hz, **one Jolt step per frame** by default (10 velocity + 2 position iterations).
- **Why 20 fixed substeps is unnecessary:**
  - Joint and motor stability doesn't need it: Jolt's motors are implicit springs, stable at 60 Hz.
  - That number came from the custom-XPBD design, where single-iteration position solves need small steps to converge. It was never a tunnelling requirement.
  - Solver convergence is measured separately at Gates A and B (joint drift, motor tracking). If needed, raise iterations or use 2 fixed steps.
- **Anti-tunnelling:**
  - Speculative contact distance **0.10–0.25 m** for character bodies (0.25 tested), and penetration slop **2 mm**.
  - **Adaptive substeps, decided by Touchline each frame:** n = clamp(⌈max over close pairs of (|v_rel| + |ω|·extent)·Δt / (0.5·(r_a + r_b))⌉, 1, 8).
  - In the spike this added only 3–5 steps, and only in contact frames. Steps are whole-world, which is cheap at our scale (0.1–0.4 ms per frame at 28 bodies).
- **Targeted swept-capsule guard (Touchline):**
  - For flagged pairs (e.g. tackling limb vs the opponent's legs), an analytic check of the relative sweep over the frame, rotation included.
  - If a crossing is possible, it raises n. It never moves a body.
  - This is the "targeted enhancement without replacing the engine" you asked about. The spike's adaptive rule is its simplest form, and it closed the gap.
- **LinearCast** is only for free, fast, compact bodies (e.g. a physical ball later). Never for limbs.

## 13. Should the 14-body hierarchy change?

**No.** Keep 14 bodies and 13 joints. Mapped onto Jolt:
- **SixDOF (pyramid):** hips, shoulders, ankles (DF/PF and inversion/eversion are asymmetric), lumbar, thoracic, neck.
- **Hinge:** knees and elbows (the elbow's pronation/supination as a SixDOF twist if needed).
- **Feet:** a `StaticCompoundShape` (sole box + shoe capsule).
- **Self-collision:** filtered with `GroupFilterTable`.
- **Maximum angular velocity:** raise it for fast limbs (default ≈ 47 rad/s).

Masses (de Leva, per player weight), colliders and the rendered-skeleton mapping are unchanged from `ARCHITECTURE.md`.

## 14. Changes to Gates A–E

- **Gate A (passive body):**
  - built on Jolt through the substrate adapter;
  - slop/speculative settings as above;
  - add a **cross-runtime determinism check**: identical inputs in Node, Chrome and Safari, one run each, compare hashes;
  - the rest test uses realistic joint damping.
- **Gate B (tracking):** compare Jolt target-orientation motors against our own PD torques joint by joint, and keep the better per joint.
- **Gate C (ground):** friction via the contact-listener override. The **stud anchor** is a Touchline-managed temporary point/SixDOF constraint to the turf with a break-out force, since Jolt's Coulomb friction has no traction-anchor concept.
- **Gate D (two-player contact):**
  - invariant split into **first touch ≤ 3 mm / same-frame response / no tunnels** and **sustained compression ≤ collider inset**;
  - realistic drive caps (≤ 250 N·m);
  - momentum ledger from body-level impulse accounting;
  - if per-point impulses prove necessary, take the decision about a local Jolt binding here.
- **Gate E:** unchanged.

## 15. What would make us abandon Jolt later

1. The cross-runtime determinism check fails and our input discipline can't fix it → Rapier's `-deterministic` build.
2. Per-contact impulses become essential, body-level accounting isn't enough, and a local binding build is impractical → Rapier.
3. Sustained compression can't be brought within the collider inset at realistic drive torques.
4. 14-body articulated stability at 60 Hz plus adaptive substeps fails Gate A/B (drift, jitter, explosions) and iterations don't fix it.
5. JS↔WASM callback cost (the contact listener) becomes significant at larger scale. Not an issue at 2 players; re-checked before any 22-player work.
6. Maintenance risk: JoltPhysics.js has a single maintainer. Mitigated by the MIT source, our adapter, and the Rapier fallback.

## Unity (brief)

Unity would supply PhysX (4.x per a forum report [U1]), ArticulationBody (reduced-coordinate, per-axis limits and drives [U2]), ConfigurableJoint (asymmetric X only; Y and Z symmetric [U3]), speculative CCD that handles rotation [U4], and a profiler and editor.

It solves an *engine and tooling* problem, not ours:
- the active-ragdoll controller, target generation, contact-caused reaction and football neutrality remain our work in any engine;
- Unity makes no cross-platform determinism claim for PhysX [U5];
- a migration would replace the web renderer, the Astra pipeline, the JS presentation layer and the simulation boundary.

The spike shows the physics we need can be supplied cleanly underneath the existing architecture, in the browser. **No migration is recommended.**

## Sources

- **Rapier:**
  - [R-rb] https://unpkg.com/@dimforge/rapier3d@0.21.0/dynamics/rigid_body.d.ts
  - [R-raw] https://unpkg.com/@dimforge/rapier3d@0.21.0/rapier_wasm3d.d.ts
  - [R-limit] https://github.com/dimforge/rapier/blob/master/src/dynamics/solver/joint_constraint/joint_constraint_helper.rs
  - [R-np] https://unpkg.com/@dimforge/rapier3d@0.21.0/geometry/narrow_phase.d.ts
  - [R-det] https://github.com/dimforge/rapier/blob/master/bindings/typescript/builds/prepare_builds/templates/README.md.tera and https://rapier.rs/docs/user_guides/javascript/determinism
  - [R-ccd] https://github.com/dimforge/rapier/blob/master/src/dynamics/ccd/sweeps.rs ; rigid_body.rs ; https://github.com/dimforge/rapier/blob/master/website/docs/user_guides/templates/rigid_body_ccd.mdx ; issue https://github.com/dimforge/rapier/issues/984
  - [R-pred] https://github.com/dimforge/rapier/blob/master/src/geometry/narrow_phase/pair_update.rs
  - [R-hooks] https://unpkg.com/@dimforge/rapier3d@0.21.0/pipeline/physics_hooks.d.ts
  - [R-1011] https://github.com/dimforge/rapier/issues/1011 ; joint_velocity_constraint.rs
  - [R-sub] https://github.com/dimforge/rapier/blob/master/src/dynamics/solver/staged_island_solver/init.rs
  - [R-maxang] …/staged_island_solver/worker.rs
- **Bullet / ammo.js:**
  - [B-ver] https://github.com/kripken/ammo.js/blob/main/bullet/VERSION ; https://github.com/kripken/ammo.js
  - [B-mp] https://github.com/kripken/ammo.js/blob/main/ammo.idl ; btManifoldPoint.h
  - [B-fork] https://forum.babylonjs.com/t/updated-ammo-js-with-bullet-v3-2-6-source/53483
  - [B-6dof] btGeneric6DofConstraint.h ; btConeTwistConstraint.h (ammo.js bullet/src)
  - [B-ccd] btDiscreteDynamicsWorld.cpp (ammo.js bullet/src)
- **Jolt:**
  - [J-6dof] https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/Constraints/SixDOFConstraint.h
  - [J-idl] https://github.com/jrouwe/JoltPhysics.js/blob/main/JoltJS.idl ; https://unpkg.com/jolt-physics@1.1.0/dist/types.d.ts
  - [J-cl] https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/Collision/ContactListener.h
  - [J-2128] https://github.com/jrouwe/JoltPhysics/issues/2128
  - [J-mq] https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/Body/MotionQuality.h ; https://jrouwe.github.io/JoltPhysics/#continuous-collision-detection
  - [J-det] https://jrouwe.github.io/JoltPhysics/#deterministic-simulation ; https://github.com/jrouwe/JoltPhysics.js/blob/main/CMakeLists.txt
  - [J-ps] https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/PhysicsSettings.h
  - [J-size] measured from the jolt-physics@1.1.0 tarball
- **WebAssembly:** [W-nd] https://github.com/WebAssembly/design/blob/main/Nondeterminism.md ; https://webassembly.github.io/spec/core/exec/numerics.html
- **Rabona:**
  - [RB1] https://github.com/furkansarihan/enigine (conanfile: bullet3/3.25) ; https://www.youtube.com/watch?v=ptD3X9wkYK0
  - [RB2] https://www.youtube.com/watch?v=2r5PdbEr8zc (2026-02-09: "rewrote the game engine … physics integration (Jolt Physics) [has] been migrated") ; https://puls.games/rabona
- **Unity:**
  - [U1] https://discussions.unity.com/t/physx-future/1709078
  - [U2] https://docs.unity3d.com/6000.0/Documentation/Manual/class-ArticulationBody.html
  - [U3] https://docs.unity3d.com/6000.0/Documentation/Manual/class-ConfigurableJoint.html
  - [U4] https://docs.unity3d.com/6000.0/Documentation/Manual/speculative-ccd.html
  - [U5] https://docs.unity3d.com/6000.0/Documentation/Manual/class-PhysicsManager.html
