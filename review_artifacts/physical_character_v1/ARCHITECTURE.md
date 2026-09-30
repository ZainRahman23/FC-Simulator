# Physically Articulated Character / Contact System V1: research and architecture for approval

**Status:** design only. Nothing is implemented and nothing is committed.
**Worktree:** `worktrees/physical-character-v1`, branch `prototype/physical-character-v1`, off `touchline-current` 4baf37b.
**Preserved:**
- Reference Tackle V1: `worktrees/_preserved_2026-09-29_reference_tackle_v1/`. The tgz has 114 files, including the 97 reference frames.
- Follow-through V1/V2: `worktrees/_preserved_2026-09-29_followthrough_v2/`.

---

## 0. Summary and the invariant everything is judged by

> **Invariant.** When shin meets leg, the physical bodies cannot continue through one another. The contact must change their motion on that contact step.
>
> In testable form:
> - **A. The contact acts on the step it happens.** On the first substep where two players' shapes meet (detected on the predicted positions), the solver applies a non-zero normal impulse to both bodies in that same substep.
> - **B. Nothing is left overlapping.** In every committed substep state, every non-filtered pair has separation ≥ −3 mm (body–body) or ≥ −5 mm (ground). In practice any overlap is corrected inside the substep before it is committed.
> - **C. No lingering overlap.** Never ≥ 2 consecutive 60 Hz frames over tolerance.
> - **D. Always monitored.** A monitor checks A–C in every gate and every run. Any violation stops the run and saves the frame for reproduction.

**Decisions proposed**
1. **Solver:** a small custom articulated solver in JS, doubles throughout, based on XPBD rigid bodies (Müller et al. 2020). It uses substeps with one iteration each (Macklin et al. 2019): 60 Hz × 20 substeps (h ≈ 0.83 ms). The whole physical state is ours, lives in the same heap as the renderer, and is deterministic by construction.
   - **Fallback:** JoltPhysics.js behind the same interfaces, if Gate A/B stability fails (§18).
2. **Body:** 14 rigid bodies per player, 13 joints:
   - pelvis, abdomen, chest, head/neck;
   - thigh, shank and foot per side;
   - upper arm and forearm+hand per side.
3. **Mass:** each player's recorded weight is the total mass (Gabriel 78 kg, Vinícius 73 kg). It is split by de Leva (1996) fractions, with inertia from de Leva radii of gyration × our own segment lengths.
4. **Joints:**
   - swing–twist joints with asymmetric elliptical swing limits (AAOS ranges) for hips, shoulders, spine, neck and ankles;
   - hinge joints (plus limited twist) for knees and elbows.
5. **Motors:** implicit, stable PD drives, i.e. compliant orientation constraints. Each has a natural frequency ω and a damping ratio ζ, scaled by the inertia of the chain it drives. Each has a torque cap τmax and a time-varying strength s(t).
   - Separate world-space drives: a strength-limited pelvis root drive, an upper-body balance drive on the chest, and a head gaze drive.
6. **Contacts:**
   - detected on predicted positions every substep, so the correction happens before anything is committed;
   - broadphase once per frame on swept bounds;
   - a deterministic guard raises the substep count if anything moves too far in one substep.
7. **Friction:** dissipative Coulomb friction (static at position level, dynamic at velocity level), set per material pair. A planted boot is a stud anchor with a break-out force and a torsional limit, not just "a high μ".
8. **Separation of concerns:** the contact provider (pure geometry) is separate from Touchline's contact policy (materials, filters, event reports), which is separate from the solver. Physics never decides football outcomes.
9. **Rendering:** the rendered 23-bone skeleton is fitted from the 14 bodies with fixed bone lengths. What you see is the physical state.
10. **Targets:** Reference Tackle V1 is the target signal. Its curves are sampled at substep times into joint targets, pelvis/chest world targets and target velocities.

### Data flow

```
AUTHORITATIVE SIMULATION (world.py / pt_* — 60 Hz, deterministic)        decides: possession, tackle success, ball, broad trajectories
  │  event facts: contact intent + window, ball path, root trajectories, outcome        (physics NEVER writes these back)
  ▼
TARGET GENERATOR (kinematic)            Reference Tackle V1 curves · run-in locomotion · later: the clip library
  │  per substep: 13 joint target rotations + angular velocities; pelvis / chest / head world targets; profile keys
  ▼
CONTROLLER                              profiles: per joint (ω, ζ, τmax, strength s(t)); world drives (root, upper body, gaze)
  │
  ▼
PHYSICAL CHARACTER — ONE STATE (Float64)  14 bodies × 2 players, 13 joints each (limits), motors, shapes
  │        ├─ CONTACT PROVIDER   broadphase per frame (swept AABBs) → narrowphase per substep → contact facts
  │        └─ CONTACT POLICY     (Touchline) materials / friction model / filters / contact classes / event REPORTS
  ▼
XPBD SOLVER, 20 substeps × 1 iteration:
  integrate → joints → limits → motors & drives → contacts + static friction → velocities → dynamic friction & damping
  │  committed state + contact log (λn, λt per contact) + support / balance state
  ▼
RENDER FIT   14 bodies → 23-bone skeleton (rig lengths, no stretch) → existing skinning → WebGL
  └─▶ DEBUG + RECORDER taps at every stage (read-only; never feed back)
```

The ball stays authoritative. In V1 it is a kinematic **sensor**: boot–ball proximity is reported, and a boot cannot push the ball or be blocked by it.

---

## 1. Why the current architecture gives contact → penetration → a late reaction

These points come from reading the accepted code (`pt_react.js`, `of_react.js`, `of_defend.js`, `pt_defend.js`) and the Reference Tackle V1 harness.

1. **There is no physical body anywhere.** Every visible pose is a function of clip, time and gait phase: the authored key poses, the locomotion, the slide poses in `of_defend.js`, the fall bases in `of_react.js`. The pose evaluator never sees the other player's limbs. Interpenetration is not something the motion can prevent; it can only be measured afterwards. Reference Tackle V1 made this explicit: purely kinematic trajectories, with overlap *measured*.
2. **The collision geometry and the drawn geometry are different objects.**
   - The attacker's contact legs are rebuilt from the stride clock (`ptRxBody`: hip height, lift and ankle position are formulas).
   - The slider's contact parts are parametric primitives with hard-coded heights (`ptRxTacklerPrims`: `LEG` at 0.12 m, `BODY` at 0.22 m, …).
   - The renderer draws a different, solved pose.
   - So the proxies can say "touching" while the rendered limbs are 5 cm inside each other, or the reverse.
3. **Contact is an event, not a constraint.** `ptRxDetect` finds the *first* contact within a tick (4 sub-steps) and returns it. `ptRxResolve` routes the impulse into *lumped* quantities: the COM velocity, a spin about the vertical, a planted-foot "sweep" distance, and a capture-point **classification** (CORRECTION / STUMBLE / FALL). Nothing moves the two colliding limbs apart at that instant. They keep following their clips through the contact.
4. **Leg-against-leg is deliberately excluded from non-penetration.** `ptRxNonPen` says: "*The sweeping leg against legs, and any contact with a SWINGING limb, is the tackle itself — the impulse / reaction model's … not a wall.*" V1.2's non-penetration covers only rigid body parts. It acts on **root velocities**, only once penetration exceeds a 1 cm slop, with a Baumgarte-style separating bias. That is after-the-fact separation by construction.
5. **The reaction is a timeline, and it isn't local.** A FALL is a directional blend of whole-body key poses (`FWD_MID`/`FWD_LAND`/`SIDE_*`/`BACK_*`) advanced by a topple clock that starts at the reaction's start. The first visible change is a whole-body blend easing in over tens of milliseconds. The struck shank is not displaced first, and nothing propagates from shank → knee → hip → pelvis → trunk → head.
6. **The later fixes were bolted onto the outside.**
   - Follow-through V1 was a set of pose layers.
   - V2's `PT_RB` was a *single* rigid body with no articulation, started after the event and synchronised with a separately animated skeleton.
   - Both kept two states: a dynamic proxy and the kinematic character.

**Root cause:** presentation motion is kinematic and blind to the other body, and contact enters as a *state-machine input* rather than a *constraint in the equations of motion*. No amount of cleanup at the root or pose level can make contact cause the reaction.

---

## 2. Articulated body hierarchy (per player)

```
pelvis (root body, lower trunk) ──L5/S1 "lumbar"──▶ abdomen (middle trunk) ──T12/L1 "thoracic"──▶ chest (upper trunk) ──C7 "neck"──▶ head+neck
   │                                                                                      ├──"shoulder_R"──▶ upperArm_R ──"elbow_R"──▶ forearm+hand_R
   │                                                                                      └──"shoulder_L"──▶ upperArm_L ──"elbow_L"──▶ forearm+hand_L
   ├──"hip_R"──▶ thigh_R ──"knee_R"──▶ shank_R ──"ankle_R"──▶ foot_R      (forefoot/toe: future split at the MTP line, §13)
   └──"hip_L"──▶ thigh_L ──"knee_L"──▶ shank_L ──"ankle_L"──▶ foot_L
```

**14 bodies and 13 joints.** The joints are lumbar, thoracic, neck, 2 hips, 2 knees, 2 ankles, 2 shoulders and 2 elbows.

**Mapped to our 23-bone rig:**

| body | render bones driven |
|---|---|
| pelvis | `root`, `pelvis` |
| abdomen | `spine` |
| chest | `chest`, `clavicle_R/L` (clavicles authored relative to the chest) |
| head | `neck`, `head`, `hair` (neck/head split, §15) |
| thigh / shank / foot | `thigh`, `shin`, `foot` + `toe` |
| upperArm | `upperArm` |
| forearm | `foreArm`, `hand` (wrist authored relative to the forearm) |

**Deliberately not bodies in V1:**
- **Clavicles / shoulder girdle.** A 0.5 kg scapula body between a 12 kg chest and a 2 kg arm hurts stability and adds little to contact. Shoulder elevation stays an authored offset; a girdle body is a documented V2 extension.
- **Separate hands and toes.** The toe split is planned for (§13).

---

## 3. Collider shapes and how they are sized

**Rules:**
- Shapes are attached to bodies and are simple primitives: capsule, sphere, box, plane.
- They are **derived per player from that player's own rig** (`rig.json`: `lengthM`, `radiusM`, the `footwearMin/Max` boot box, `ankleHeightM`), so a different morphology gets different colliders automatically.
- Radii are about **0.9 × the render radius**, so contact looks like skin/kit touching (≈ 5 mm of visual compression) rather than a visible gap.
- They are never taken from the render mesh.
- Each shape can carry a *self-collision inset* (a smaller radius used only against the same player).

Example numbers for **Gabriel** (1.90 m; the rig's radii and lengths):

| body | shape(s) | size (m) |
|---|---|---|
| pelvis | capsule, axis left→right, 0.05 above the hip-joint line | r 0.115, half-segment 0.06 → 0.35 wide × 0.23 deep |
| abdomen | capsule left→right at mid-spine | r 0.110, half-segment 0.05 |
| chest | capsule left→right at 0.45 of chest length | r 0.115, half-segment 0.08 → 0.39 wide |
| head | sphere at head centre + neck capsule | sphere r 0.100; neck r 0.055 |
| thigh | capsule hip→knee (hip end inset 0.05) | r 0.085 (render 0.096) |
| shank | capsule knee→ankle | r 0.055 (render 0.060) |
| foot | **box** for the ground (the boot bbox 0.357 × 0.164 × 0.10, sole on the stud-tip plane) + shoe capsule heel→toe for player contact | box as measured; capsule r 0.045 |
| upper arm | capsule shoulder→elbow | r 0.050 |
| forearm+hand | capsule elbow→(wrist + 0.08) + palm sphere | r 0.037; palm r 0.045 |

**Why the foot has two shapes:** a box gives a stable 4-point sole manifold on the ground (§13). A capsule gives robust, cheap contact against another player's leg. Box–capsule SAT isn't needed in V1.

**Self-collision filtering:**
- Off for jointed pairs and for pairs that overlap at rest: pelvis–thigh, pelvis–abdomen, abdomen–chest, chest–upperArm, chest–head.
- On for pairs that must not pass through each other: thigh–thigh, knee–knee, hand/forearm–thigh, arm–torso (for the tackler's arm crossing his body in Reference Tackle V1), foot–opposite shank.
- The filter table is data, visible in the debug view.

---

## 4. Mass and inertia

**Total mass = the recorded `identity.weightKg`** (`rig.json`; `pt_react` already uses it as `massKg`). There is no universal character mass.

It is split by **de Leva (1996), male** [S1]. Hand and forearm are merged; the trunk is de Leva's three parts.

| body | de Leva segment | fraction | Gabriel (78 kg) | Vinícius (73 kg) |
|---|---|---|---|---|
| pelvis | lower trunk | 11.17 % | 8.71 | 8.15 |
| abdomen | middle trunk | 16.33 % | 12.74 | 11.92 |
| chest | upper trunk | 15.96 % | 12.45 | 11.65 |
| head+neck | head | 6.94 % | 5.41 | 5.07 |
| thigh ×2 | thigh | 14.16 % | 11.04 | 10.34 |
| shank ×2 | shank | 4.33 % | 3.38 | 3.16 |
| foot ×2 | foot | 1.37 % | 1.07 | 1.00 |
| upper arm ×2 | upper arm | 2.71 % | 2.11 | 1.98 |
| forearm+hand ×2 | forearm + hand | 2.23 % | 1.74 | 1.63 |
| **total** | | **100.00 %** | **77.99** | **73.01** |

**COM along each segment** uses de Leva's positions from the proximal end:
- thigh 40.95 %, shank 44.59 %, upper arm 57.72 %;
- foot 44.15 % from the heel;
- forearm+hand is the mass-weighted combination of forearm 45.74 % and hand 79.0 %;
- head 50.02 % of vertex→C7.

Each is applied to **our** segment lengths.

**Inertia tensor (diagonal, in the segment frame):** I = m·(r·L)², using de Leva's sagittal, transverse and longitudinal radii of gyration × our segment length. For example, thigh r = 32.9 / 32.9 / 14.9 %. This is more human than uniform-capsule inertia.

**Cross-check:** Dempster/Winter [S2] gives lighter thighs (10.0 %) and a heavier trunk (49.7 %). We use de Leva because it is based on living subjects and splits the trunk into three parts, which our three trunk bodies need.

**Mass ratios:**
- The largest to smallest ratio is abdomen : foot ≈ 12 : 1.
- Every adjacent ratio is ≤ 5.9 : 1 (chest : upper arm).
- Heavy bodies support light ones everywhere except pelvis (8.7) → two thighs (11.0 each). That is the case Catto warns about [S17].
- XPBD with 20 substeps handles far larger ratios (Müller shows 1 : 1000) [S16].
- **Contingency, only if Gate A jitters:** Jolt-style inertia *stabilisation* — parent inertia ≥ the sum of its children's, capped at 2×. Masses stay exact; the change is shown in the debug panel.

---

## 5. Joint types and limits

**Frames:**
- Every joint has a frame in the parent and in the child, taken from the rig's bind. The Astra bind is translation-only, so all bind rotations are identity: +x = the player's right, +y = up, +z = forward.
- Limits are relative to a **neutral reference pose**, chosen near the centre of each joint's range so that swing–twist decomposition stays far from its singularity (180° swing).
- Swing is limited by an **asymmetric elliptical cone** (four quadrant half-angles, interpolated). Twist is limited separately, decoupled from swing as in Müller 2020 §3.4.2 [S16].
- Limits are hard (zero compliance) with a 2° soft band, so hitting a limit doesn't produce an impulse spike.

Ranges from AAOS norms (Norkin & White), cross-checked against CDC measurements (Soucie 2011) [S3][S4]:

| joint | type | limits (neutral = bind unless noted) |
|---|---|---|
| hip | swing–twist, twist axis = femur | flex 120 / ext 30 / abd 45 / add 30; twist (IR/ER) ±40 |
| knee | hinge (x) + tiny twist | flex 0→140, hyperextension allowance −3°; twist ±5 |
| ankle | swing–twist, twist axis = shank | dorsiflex 20 / plantarflex 50 / inversion 35 / eversion 15; twist ±10 |
| lumbar | swing–twist | flex 45 / ext 20 / lateral ±20; twist ±12 |
| thoracic | swing–twist | flex 35 / ext 10 / lateral ±15; twist ±30 |
| neck | swing–twist | flex 45 / ext 45 / lateral ±45; twist ±60 |
| shoulder (glenohumeral + scapular, no girdle body) | swing–twist; **neutral = arm abducted ≈ 60°, flexed ≈ 30°** (the centre of the range) | flex 180 / ext 60 / abd 180 / add 40 from anatomical zero; twist IR 70 / ER 90 |
| elbow | hinge (x) + pronation/supination twist (the hand is merged into the forearm) | flex 0→145; twist ±75 |

**Notes:**
- The lumbar/thoracic split is my division of the thoracolumbar totals (flex 80, ext 25, lateral 35, rotation 45).
- The 3° knee allowance is a design choice; measured hyperextension averages about 1°.

**Attachment:** position constraints at each joint with zero compliance, i.e. truly rigid in XPBD, so shoulders can't detach and there are no gaps.

---

## 6. Joint motors ("muscles")

**Local drive per joint:**
- A **compliant 3-DOF orientation constraint** pulls the child toward `q_target`, expressed in the parent's joint frame.
- Error: q_err = q_rel⁻¹ · q_target, with the shortest path enforced (w < 0 → negate). The correction is applied about the world axes of the child frame, as equal and opposite angular corrections on child and parent. This is the same construction as Jolt's `SwingTwistConstraint` motor [S6].
- **Compliance** α = 1 / k, with k = I_eff · ω². **Damping** c = 2 ζ · I_eff · ω acts on relative angular velocity minus target relative angular velocity (velocity feed-forward).
- **I_eff** is the inertia of the whole outboard chain about the joint. This is Zordan's inertia-scaled servo [S10], so one (ω, ζ) family works on every joint and every body size.
- **Torque cap:** the per-substep correction is clamped so that the implied torque |λ|/h² ≤ τmax·s(t). The motor's actual torque is exposed for debugging.
- This is an **implicit PD**: the same stability argument as Tan et al.'s Stable PD [S5] and Catto's soft constraints (k = m_eff ω², c = 2 m_eff ζ ω) [S7]. It stays stable for any gain at our substep, as long as ω ≤ 0.125 × substep rate ≈ 150 Hz.

**World-space drives** (Unreal's world-space physical-animation drives [S11]; Geijtenbeek calls the root version "hand of God" [S8]). Each is optional, per body, with its own ω/ζ/force cap:
- **Root drive on the pelvis:** 6-DOF toward the authored pelvis frame. Until a balance controller exists (§14), this is what carries the body along the authoritative trajectory.
  - Strength-limited, so a collision can push the pelvis off target.
  - Force and torque are drawn every frame, so you can see when the root is being carried.
- **Upper-body balance drive on the chest:** orientation, plus optionally position of a neck-base point. This is the "neck / upper-body balance point" idea (§8).
- **Gaze drive on the head:** orientation only.

**Profiles** — the mechanism, not the laws:
- A profile is a named table: joint → (ω, ζ, τmax, s), plus a world-drive table. Profiles are keyed on the master timeline, like any other track, and cross-faded over a stated time.
- Starting profile for Gate B: STRONG_TRACK with ω ≈ 10–15 Hz legs, 8–10 Hz trunk, 6–8 Hz arms, 6 Hz neck, and ζ = 1.
- Per-joint strength s(t) ∈ [0, 1] is the hook for later event-driven compliance, e.g. Zordan's reaction-gain drop and ramp-back [S9][S10]. It is manual in V1, with no automatic rules.

**τmax defaults** are order-of-magnitude human values: hip/knee/trunk ~250 N·m, ankle ~150, shoulder ~80, elbow ~70, neck ~50. **These are unverified and must be checked before Gate D.** Gate B may run with higher caps to prove tracking first.

---

## 7. How Reference Tackle V1 becomes motor targets

- **Target pose.** The RT kinematic pipeline, unchanged, is evaluated at each **substep time** (fractional frame f). The Catmull-Rom tracks are continuous in f, so this is valid. The pipeline is `rtEvalChar`:
  - authored per-bone keys;
  - the run-in locomotion;
  - the plants and IK that were part of the approved motion.

  The result is 23 bone world matrices, converted once to Float64 quaternions.
- **Joint targets:** q_target(j) = parent bone⁻¹ · child bone, re-expressed in the joint frames of the mapped bodies (§2 mapping).
- **World targets:** pelvis body frame (root drive), chest frame (upper-body drive), head frame (gaze) — the same data `RT_export()` already produces.
- **Target velocities:** central differences of the target poses at t ± h (deterministic). Used for motor damping feed-forward and for the initial velocities at activation (§16).
- **Measured/inferred flags** travel with each target. The debug view colours tracking error by them. Profiles may soften inferred spans, but that is optional.
- **Footing.** RT's plant, IK and ground-clamp outputs shape the *targets* only. Physical support comes from real turf contact and friction (§12–13). There is **no world-space foot drive by default**; a pinned-foot "hand of God" would hide exactly the support physics we want to see.
- **The ball** is REF.ball, a kinematic sensor (§0).
- **Two characters, one timeline:** frame N = the reference frame, tackler targets, attacker targets, ball and camera, as in V1. The RT harness comparison stays available: the reference video, the ghost, the authored skeleton, and now the physical skeleton.

---

## 8. Independent pelvis / chest / neck / shoulder dynamics

- Pelvis, abdomen, chest and head are **separate rigid bodies** with their own masses and inertias, joined by lumbar, thoracic and neck joints.
- Each is tracked by (a) its local joint motor relative to its parent and (b) optionally its own world-space drive. Gains and caps are set per region.
- The upper body therefore **does not inherit** the pelvis transform. It is pulled toward its targets through finite-stiffness, torque-limited joints and has its own inertia.

**What this gives us, without authoring it:**
- **The tackler rolls onto the hip:** the ground contact rolls the pelvis first; the chest follows late through the lumbar and thoracic motors and its upper-body drive.
- **The struck shank:** the contact impulse enters the shank. It reaches the thigh through the knee constraint, then the pelvis through the hip, then the abdomen, chest, arms and head. Each link adds inertia and compliance, so the response *propagates in time*.
- The authored targets still carry the phase lags observed in the reference, so observed lag and physical lag add up rather than cancel.

**Shoulders:**
- Each upper arm has its own swing–twist joint and motor on the chest. RT's shoulder world positions follow from the chest pose, since there is no girdle body.
- Arms get lower gains so they respond freely and can act as balance arms later.
- A scapular girdle — elevation and protraction as a small 2-DOF body or an authored offset — is a V2 extension.

**Relation to the third reference:** this reproduces its *structural* property, independent pelvis roll plus an upper-body balance point, with our own equations: joint motors plus world-space drives on real bodies. We are not copying its point-mass model.

---

## 9. Collision detection architecture

Three layers with one-way interfaces:

1. **Contact provider** — pure geometry; knows nothing about football.
   - Shapes on bodies.
   - **Broadphase once per 60 Hz frame:** sweep-and-prune on x over AABBs expanded by 2·|v|·Δt plus a margin (Müller 2020) [S16]. The pair list is sorted by (bodyA, bodyB, shapeA, shapeB) for determinism.
   - **Narrowphase every substep** on the *predicted* positions: capsule–capsule, capsule–sphere, sphere–sphere, capsule–plane, box–plane, sphere–plane.
   - **Output:** contact facts
     `{bodyA, bodyB, segmentA, segmentB, shapeA, shapeB, featureId, pointA, pointB, normal, separation, v_rel_normal, v_rel_tangent, materialPair}`.
2. **Contact policy** — Touchline's.
   - Maps a pair to a **material pair** and friction model: boot-studs/turf, kit/turf, hand/turf, limb/limb, boot/limb.
   - Applies the self-collision filter table and sets per-class compliance (e.g. slight turf softness).
   - Emits **reports** for the presentation and football layers, e.g. "first tackler → attacker lower-leg contact at t, point, relative velocity".
   - It **cannot** change possession, success or the ball. It may only change physical parameters.
3. **Solver** — consumes contacts as constraints and writes back, per contact:
   - λn, the normal impulse;
   - λt, the tangential impulse;
   - the static/dynamic friction mode;
   - the committed separation.

**Contact log:** a ring buffer per substep plus a summary per frame; exportable with the frame state for reproduction. The physics layer never makes football decisions in a collision callback.

---

## 10. Anti-tunnelling (CCD) and substeps

- **Fixed rate:** 60 Hz × **20 substeps** (h = 0.833 ms), one XPBD iteration per substep. Macklin shows that n substeps × 1 iteration beats 1 step × n iterations, because error scales with h² [S15].
- **Detection on predicted positions:** each substep predicts x̃ = x + h·v, runs the narrowphase **on x̃**, and solves contacts before committing. Committed states are therefore penetration-free up to solver residual. This is what makes the contact act *on its own step*: the correction happens in the predicted state of the substep where they meet.
- **Why tunnelling can't happen at football speeds.** Relative displacement per substep:
  - 8 m/s leg: 6.7 mm;
  - 13 m/s closing speed (slide into a swinging shin): 10.8 mm;
  - 20 m/s kicking foot: 16.7 mm.

  Tunnelling needs a displacement comparable to the sum of radii: shank + shank 110 mm, forearm + forearm 74 mm. That is a margin of 4–10×.

  Rotation is included for free, because the narrowphase runs on each substep's *rotated* predicted pose. That is the gap in Jolt's LinearCast, which ignores rotation [J2].
- **Deterministic guard:**
  - Before each frame, compute the maximum relative displacement per substep over the candidate pairs, including the angular term |ω|·extent.
  - If it exceeds 0.5 × the smallest radius sum, raise that frame's substep count: N = 20 · 2^k, with k chosen from the state.
  - It is logged when it happens.
- **Kept in reserve:** conservative-advancement time-of-impact (Mirtich / Catto 2013 [S19]) for pathological cases such as ball–boot, if the ball ever becomes physical.

---

## 11. Contact / constraint solver

**XPBD rigid bodies** as in Müller et al. 2020 [S16]. Each substep:
1. **Integrate:** v += h·(g + F_ext/m); x̃ = x + h·v; q̃ = normalise(q + ½·h·[ω, 0]·q), where F_ext includes the world-drive forces.
2. **Solve** — one pass, fixed order:
   1. joint attachments (compliance 0);
   2. joint limits (swing, twist, hinge);
   3. motors and world drives (compliant, capped);
   4. contacts — non-penetration (compliance 0; ground optionally ~1 mm "turf give") plus **static friction** as a positional constraint.
3. **Velocities:** v = (x̃ − x)/h; ω = 2·(q̃·q⁻¹).xyz / h.
4. **Velocity pass:**
   - **dynamic friction:** Δv_t = −v̂_t · min(h·μd·|f_n|, |v_t|). It can only reduce tangential speed, so it **dissipates**;
   - restitution 0 (human and turf contacts are effectively inelastic);
   - motor damping and small joint damping.

**Energy safety:**
- Contact corrections only remove the overlap predicted *this substep*; there is no accumulated Baumgarte bias.
- Separation velocity from any initial overlap (e.g. at activation) is capped at 1 m/s, as in Box2D v3's push-out cap [S14].
- XPBD's low numerical damping (Müller's stated drawback) is handled with small, explicit physical joint damping. It is reported, not hidden.

**Momentum exchange:** every positional correction is applied as equal and opposite generalised impulses on the two bodies, weighted by their inverse masses and inertias. The contact log's λn/h is the impulse, which lets Gate D check that momentum is conserved.

**Alternative considered:** a Box2D v3 "soft step" (sequential impulses + soft constraints + relax + substeps) would also meet the requirements [S14]. XPBD is chosen because:
- joint limits and articulated joints are simpler and exact at position level;
- the Müller paper gives the swing/twist limit machinery directly.

If Gate A/B shows XPBD jitter we cannot damp cleanly, soft step is the in-house plan B, ahead of switching to Jolt.

---

## 12. Friction

**Coulomb friction, dissipative, per material pair.** There is no global μ.
- Static friction is positional: a contact point sticks while λt ≤ μs·λn. Dynamic friction is velocity-level, as in §11.
- Friction acts along the tangent plane of each contact normal.

| pair | model | starting values | evidence |
|---|---|---|---|
| boot studs ↔ turf | **stud anchor**: static up to a break-out force μ_trac·F_n (≈ 1.9, the lower bound for boots on natural grass), with **torsional** resistance about the normal scaled by load; then dynamic sliding μd | μ_trac 1.9; torsion ~30–60 N·m at 580 N; μd 0.6 (to calibrate) | Thomson et al. 2019: translational 1.9–2.5, rotational 28–59 N·m [S22]. A traction coefficient above 1 means the studs shear the turf, so it is not Coulomb friction; hence the anchor. |
| kit/body (hip, thigh, torso, shoulder) ↔ turf | Coulomb | μ 0.5 | skin–infilled turf ≈ 0.57, FIFA requirement 0.35–0.75 [S23][S25]; clothing–grass **unverified** |
| hand ↔ turf | Coulomb | μ 0.6 | skin–turf [S25]; natural grass **unverified** |
| limb ↔ limb (kit/sock/skin) | Coulomb | μ 0.4 | **unverified**; to calibrate on Gate D |
| boot ↔ limb | Coulomb | μ 0.35 | **unverified** |

- Values without evidence are marked. They are **calibrated per pair against specific observations**: the slide's stopping distance in RT (≈ 2–2.5 m), the trail-foot drag, the attacker's prone slide (≈ 0.3 m). They are never tuned as one global constant.
- Designed for later: anisotropic stud friction (along vs across the boot) and a wet/dry pitch factor.

---

## 13. Ground contact

- **The pitch** is a static half-space (y ≤ 0) with the TURF material. There is optional turf compliance (~1 mm under body weight), restitution 0, and contacts with every body.
- **Feet:** the boot box gives up to **4 sole points on the stud-tip plane** (heel and forefoot corners), which is a stable support manifold. Planted support is real: normal forces from those points hold the body and the stud anchor resists shear and twist. The ankle is **not rigid**: it has a finite-stiffness motor with anatomical limits, so the foot can roll onto an edge or its toes when loaded.
  - **Forefoot/toe later:** the box splits at the metatarsophalangeal line into rearfoot + forefoot with a hinge (dorsiflex 60 / plantarflex 30). The shape and joint tables already key by body, so this is additive.
- **Knees, hips, shoulders, torso, head, elbows, hands:** capsule/sphere–plane contacts give 1–2 points. When the tackler lands on his right hip, the contact is on the **pelvis/thigh capsule**, and its normal force appears in the log and the support set. When the attacker lands on his forearms and chest, those capsules meet the turf and stop him; no animation stops at ground height.
- **The ground-height clamp and the "sole level" step from RT V1 are not used.** The turf is a constraint like any other.

---

## 14. Support and balance representation (V1: measured and displayed; not yet a controller)

Per character, every frame:
- **Support set:** that character's ground contacts with λn > ε over the frame, labelled by body (foot_R, foot_L, knee, hip, hand, …).
- **Support polygon:** the 2D convex hull of the support points. Static balance means the COM's ground projection lies inside it.
- **COM, v_COM, and XCoM = COM + v_COM/ω₀**, with ω₀ = √(g/l), l = COM height (Hof 2005 [S27]; the capture point is the same quantity, Pratt 2006 [S28]). The **margin of stability** b = the signed distance from XCoM to the polygon edge.
- **Angular momentum about the COM:** L = Σ(I_i·ω_i + m_i·r_i × v_i). Also pelvis and chest linear and angular velocity.
- **External impulse accumulator:** player–player and ground impulses over the last 100 ms, by body.
- **Step capability:** can a free foot reach the XCoM (reach limit, swing time)? This is a continuous estimate.
- **Derived continuum label**, for display and later control only: stable → corrective → step needed → stumble → support lost → falling → grounded → recovering, from thresholds on b, the support set and body height. **It never selects a canned animation.**

A later balance controller (stepping, balance arms, removing the root "hand of God") builds on these quantities.

---

## 15. Rendered-skeleton fitting

- Bodies are defined in bone-aligned frames at bind, so a directly mapped bone's world rotation is its body's rotation (bind offset = identity).
- **Positions come from FK with the rig's own bone lengths**, starting at the physical pelvis joint. Bones never stretch. The tiny joint-attachment error (sub-millimetre, since attachments are rigid constraints) is absorbed and shown in debug.
- **Sub-bones inside a body:**
  - neck/head share the chest → head relative rotation (≈ 40 / 60);
  - `toe`, `hand` (wrist) and `clavicle` take their authored relative rotation from the targets;
  - `hair` follows the head.
- **Skinning and drawing are unchanged:** `skelSkinMatrices` → `ofCharDraw`.
- The renderer may interpolate between the last two committed physics states for display timing. This is presentation-only and never feeds back.
- **No "touch-up" IK in V1.** If a boot is 2 cm off the ball, we see it and fix the *target*, never the rendered result.

---

## 16. Animation → physics and physics → animation

- **Animation → physics (activation at t₀):**
  - Initialise every body from the kinematic target pose at t₀.
  - Linear and angular velocities come from central differences of the targets, with consistent quaternion polarity [S17]. There is no velocity pop, and momentum is carried in.
  - Motors start at the profile strength. Any initial overlap is resolved at ≤ 1 m/s.
  - The render switches source at t₀ with an identical pose by construction.
  - In this prototype both characters are physical for the whole clip.
- **Kinematic-but-colliding mode** (designed, not used in V1): bodies moved *by velocity* toward the animation pose, like Jolt's `DriveToPoseUsingKinematics` [S6]. This lets distant players push others without full dynamics.
- **Physics → animation (recovery; design only):**
  - Trigger: "grounded" plus low energy (kinetic energy below a threshold for 0.2 s).
  - Take a pose snapshot.
  - **Pick the recovery by pose matching** on the actual physical end state: joint angles, pelvis/chest orientation relative to gravity, support contacts. It is not picked by contact direction.
  - Blend the *targets* from the snapshot to the chosen get-up clip over 0.3 s while ramping gains up. Spread the root position error over the blend (Zordan 2005 [S10]; Unreal pose snapshot [S11]).
  - Hand back to pure animation once tracking error is below a threshold, then deactivate physics.
  - The reference clip ends prone, so recovery is **not** part of Gates A–E.

---

## 17. Determinism

- **Fixed step:** dt = 1/60 s with a fixed substep count, or the guard's state-derived count (§10).
- **No wall-clock inputs:** no `performance.now`, no frame-time dependence. Rendering at any refresh rate reads the committed states.
- **Fixed order everywhere:**
  - bodies by index; joints by index;
  - contact pairs sorted by (bodyA, bodyB, shapeA, shapeB, featureId);
  - constraint solve order fixed;
  - no iteration over unordered collections.
- **No presentation RNG.**
- **Arithmetic:**
  - All state is Float64 (plain JS numbers). The existing `M4` uses Float32Array and is kept for rendering only; the solver gets its own vec/quat module.
  - The solver uses only +, −, ×, ÷ and √, which are IEEE-exact.
  - Trigonometry (acos/atan2 in limits) goes through **our own polynomial implementations**. That makes results bit-identical across JS engines (Chrome, Safari, Node), not just within one browser.
  - Positions are kept relative to a local origin near the interaction, avoiding the far-from-origin precision loss Catto observed.
- **Recording:**
  - a per-frame state hash (FNV-1a over the Float64 state);
  - full snapshots every 30 frames;
  - the inputs (targets, profile keys, event facts).

  A bad frame is reproduced by loading the nearest snapshot and stepping. A replay test compares hashes; one run per check, never a matrix.
- **Simulation neutrality:** physics reads event facts and never writes simulation state (ball, possession, success, root). Divergence between the physical pelvis and the authoritative root is *reported*. The root drive pulls it back within its caps.

---

## 18. Physics library vs custom solver

The engine survey (npm type definitions checked directly, current as of 2026-09) against our hard requirements:

| requirement | Rapier JS 0.21 | JoltPhysics.js 1.1 | PhysX (physx-js-webidl) | Ammo / cannon-es / Havok | **custom XPBD** |
|---|---|---|---|---|---|
| swing–twist / cone limits (hips, shoulders) | **no** — spherical joints have per-axis limits only [R4]; multibody joints can't have motors in JS [R7] | yes, elliptical cone + twist [J4] | yes (D6 cone/pyramid + twist) [P4] | partial / no | yes (Müller §3.4) |
| PD drive to a target orientation | per-axis; issue open on coupled axes [R8] | quaternion target, `DriveToPoseUsingMotors` [J6] | yes | weak | yes, implicit, capped, per joint |
| fast dynamic-vs-dynamic anti-tunnelling | bullets vs frozen targets; no bullet–bullet [R5] | LinearCast handles both bodies but **ignores rotation**; can miss a fast-rotating long body such as a sweeping shin [J2] | sweep CCD by relative linear speed; articulation-vs-articulation **unverified** [P2] | no / sphere only | per-substep narrowphase on rotated predicted poses; deterministic guard |
| post-solve contact impulses (for debugging and momentum checks) | yes [R7] | **no** in JS (feature request filed 2026-09-15) [J5] | yes [P4] | limited | yes, every contact, every substep |
| per-pair friction / stud anchor | combine rule only; hooks can't modify contacts [R7] | per-contact friction override [J4] | combine modes; no contact modification in JS [P4] | per material (cannon) | full per-pair model incl. anchor + torsion |
| determinism | cross-platform in the `-deterministic` build [R2][R3] | same binary; cross-platform needs a self-built flag [J1] | same platform | unverified | by construction, cross-engine (§17) |
| size / loading | 3.1–4.4 MB WASM, ES module | 2–3.2 MB, ES module; single-threaded build only (JS callbacks) [J1] | 5.4 MB WASM + 4.8 MB JS | — | a few JS files, plain `<script>` |
| one coherent state | state in WASM; read back each frame | same | same | same | the state *is* the character, in our heap |

**Recommendation: build the small custom XPBD solver.**
- **Scale is tiny:** 2 × 14 bodies, 26 joints, a few dozen contacts, so JS cost is well under 1 ms per frame. The core is roughly 1.5–2 k lines, and the Müller 2020 paper specifies it precisely.
- **Every hard requirement that one or more libraries miss is structural for us:**
  - rotation-aware anti-tunnelling for a sweeping shin;
  - post-solve impulses for the invariant and momentum checks;
  - a stud-anchor friction model;
  - cross-engine determinism;
  - full visibility of every constraint's error and λ.
- **No second physics state to synchronise.** The reference developer found that fragile. Jolt's patterns (`SkeletonMapper`, drive-to-pose) are the industry's mitigation, and we'd adopt their *ideas* (§6, §15) either way.

**Risk and exit:**
- The risk is engineering time and subtle stability bugs. The Gate A/B acceptance metrics are the exit criteria.
- If the custom solver can't pass Gate A (passive stability) and Gate B (tracking) in their first focused pass, switch to **JoltPhysics.js** behind the same provider/solver interfaces. We would accept its two gaps: impulses estimated from velocity change, and our own substeps compensating for LinearCast.
- Rapier is excluded mainly for the swing–twist and motor gaps. PhysX is heavy and can't modify contacts in JS. Ammo, cannon-es and Havok lack the basics.

---

## 19. Debugging and visualisation

A new harness page reuses the RT V1 page: timeline, 1× / 0.5× / 0.25×, frame stepping, cameras, reference ghost. It adds **substep stepping** and these toggles:

| layer | what you see |
|---|---|
| bodies / shapes | translucent capsules, spheres and boxes coloured by body; self-collision insets |
| joints | anchors (dot + parent/child anchor mismatch in mm), joint frames (axes) |
| limits | swing ellipse cones and twist arcs, the current swing/twist marker, red when at the limit |
| targets vs actual | target orientation (ghost axes / ghost skeleton) vs actual (solid) |
| motors | error (°) as a colour ramp per joint; torque vs τmax as a bar, highlighted when **saturated**; strength s(t) |
| world drives | root / upper-body / gaze drive force and torque arrows, highlighted when capped |
| contacts | points, normals, penetration (mm), normal and tangential impulse arrows, static/dynamic friction colour, stud-anchor state |
| balance | COM and velocity, XCoM, support polygon on the turf, support contacts highlighted, margin b, angular momentum |
| skeletons | physical skeleton vs rendered skeleton vs authored target skeleton vs the reference video |

**Panels:**
- per-frame numbers for all of the above;
- time graphs: joint error, contact impulses, kinetic/potential energy, total momentum, root-drive force;
- the **invariant monitor**: a strip of maximum penetration per frame, green ≤ tolerance and red otherwise, auto-pausing on the first violation, first player-player contact, a limit violation or a NaN;
- the determinism hash;
- "export this frame" (state + contact log + inputs) for reproduction.

---

## 20. Gate plan (each gate ends with "stop and inspect")

Resource rules for every gate:
- one character, then two;
- one headless browser at a time;
- short clips only; no match, no regression suite, no matrices;
- processes shut down after each run;
- anything more expensive is asked for first.

**Gate A: passive articulated body (Gabriel)**
- **Build:** bodies, shapes, mass and inertia, joints and limits, ground, solver; motors off.
- **Tests:** drops from 1.2 m in four initial orientations (supine, prone, side, seated-upright), plus one "thrown" drop with 3 m/s horizontal velocity. 5 s each.
- **Pass criteria:**
  - joint attachment error < 1 mm steady and < 3 mm peak;
  - limit overshoot < 2°;
  - ground penetration < 5 mm;
  - kinetic energy < 1 % of the initial value within 2 s, with no creep afterwards;
  - no NaN, no explosion (no body > 10 m/s after the first impact);
  - two runs give identical hashes;
  - the rest pose is anatomically plausible (you judge the stills).
- **Deliverable:** the stills, energy curves and the debug view.

**Gate B: motor tracking, no collision perturbation**
- **Setup:** ground off. Root and upper-body drives on. STRONG_TRACK profile.
- **Runs:** tackler f76–f98 (launch → seat); attacker f96–f130 (hurdle); each separately.
- **Compared:** the authored RT pose vs the physical pose, joint by joint and at the end-effectors (feet, hands, head).
- **Pass criteria:** joint RMS < 3° and max < 8°; end-effector RMS < 2 cm and max < 5 cm; the ghost overlay indistinguishable at 1×.
- **Deliverable:** error tables, side-by-side and ghost at 1× and 0.25×, and motor-saturation report.

**Gate C: ground interaction**
- **Setup:** turf on, tackler f76–f114 with the same targets.
- **Verify:**
  - trail-foot touch ≈ f89, seat on the right hip f92–94, bracing/near-arm contacts where RT has them;
  - normal forces plausible (weight-scale, no spikes > 5× body weight without cause);
  - no contact jitter (a resting contact's point velocity < 1 cm/s);
  - the slide decelerates by friction to about RT's stopping distance, with μ calibrated for kit–turf only;
  - tracking error reported *where the ground obstructs* the target.
- **Deliverable:** contact timeline vs the reference events, forces, and side-by-side.

**Gate D: two-player controlled leg-contact experiment (critical)**
- **Setup:**
  - The attacker stands in a stance profile, supported by his own feet on the turf, with a soft root drive.
  - The tackler's body is carried by the root drive along the pitch with his sweeping leg driven by motors.
- **Cases:**
  1. sweep into the **planted** shin at 3, 6 and 9 m/s;
  2. sweep into the **swinging** shin at 6 m/s.
- **Measured:**
  - the contact instant vs the analytic crossing (± one substep);
  - **the invariant monitor clean:** ≤ 3 mm and never 2 frames;
  - **momentum:** Δp_attacker + Δp_tackler matches the ground and root-drive impulses to within 2 %;
  - **propagation order:** peak angular-velocity times shank → thigh → pelvis → chest → head, strictly increasing;
  - motors still acting, with saturation shown;
  - **no explosive separation:** kinetic energy after contact ≤ kinetic energy before plus drive work; no body faster than the pre-contact maximum relative speed.
- **Deliverable:** per-case report, slow-motion side-by-side with contact vectors, and a momentum ledger.

**Gate E: the reference tackle**
- **Setup:** both players physical for f56–f152, targets from RT V1, profiles keyed to the RT phases (manual in V1).
- **Criteria:**
  - the invariant holds throughout;
  - it is recognisably the reference tackle, compared in the RT harness (reference, ghost, the V1 authored version, the physical version);
  - the attacker's reaction begins on the contact substep, measured in the log rather than judged by eye;
  - divergences from RT are listed with their physical cause.
- **Deliverable:** the same review package as RT V1, plus the contact and momentum logs.

---

## 21. Reusable existing code

| what | where | how it's used |
|---|---|---|
| rig data per player (lengths, radii, boot box, ankle height, **height/weight**) | `assets/characters/outfield/*/rig.json`, `of_character.js` | builds bodies, shapes and masses |
| FK, skin matrices, GL skinned renderer | `anim3d/skeleton.js`, `of_char_gl.js` (`ofCharDraw`) | render fitting and drawing (§15) |
| Reference Tackle V1: data, `rtSample` (Catmull-Rom), `rtEvalChar`, `RT_export()`, the harness UI, reference frames, camera fit, capture tool | preserved tgz / `reference-tackle` worktree | target generator (§7) and the review harness |
| run-in locomotion (`ofLocoTick`) | `anim3d/of_loco.js` | target generation only |
| closest points between segments (Ericson) | `ptRxSegSeg3` in `pt_react.js` | the algorithm, re-implemented in the Float64 contact module |
| balance quantities (XCoM / capture point, step reach) | `pt_react.js` §4 | the *concepts* for §14 |
| classic ball renderer | `ball-art.js` | ball drawing |
| fixed 60 Hz tick discipline, deterministic style | `PT_DT = 1/60`, `world.py DT` | timing contract |
| `M4` / `V3` | `anim3d/m4.js` | rendering only; Float32, not for physics state |

## 22. Existing defence/contact code that must NOT be reused

| code | why not |
|---|---|
| `ptRxDetect` / `ptRxResolve` impulse routing into COM / spin / "sweep" plus CORRECTION / STUMBLE / FALL classification (`pt_react.js`) | contact as a state-machine input, not a constraint (§1.3) |
| stride-clock leg proxies `ptRxBody` and parametric slide primitives `ptRxTacklerPrims` | collision geometry that isn't the drawn body (§1.2) |
| `ptRxNonPen` (root-velocity separation after 1 cm slop, bias, overrun) | after-the-fact separation; excludes leg–leg (§1.4) |
| `of_react.js` directional fall bases, topple timeline, stumble overlays | canned directional falls (§1.5) |
| `of_defend.js` slide / sit / kneel / crouch key poses as runtime drivers | kinematic, blind to the other body. They could later be *target* material like RT, not the executor |
| Follow-through V1 pose layers; V2 `PT_RB` whole-body rigid fall and slide body | post-event layers and a single non-articulated body |
| RT V1's ground clamp, "sole level", plant-IK used as a *correction*, and `rtBodyOverlap` as anything but a measurement | corrections that hide or report penetration instead of preventing it |
| root nudges, teleports, separation-after-penetration of any kind | ruled out by the invariant |

---

## Appendix A: what the three videos established vs outside research

**From the three football-development references, as you described them to me.** I have not watched them myself; please correct anything I've overstated.
1. Targeted capsule/body collision, and an animation-driven ragdoll with joint motors, because passive ragdolls behave like "connected wooden sticks".
2. Humanoid skeletal synchronisation; richer spine/head/shoulder/arm rotation; balance arms; articulated feet (moving from point feet to foot colliders).
3. Independently controlled pelvis and upper-body regions (a neck/upper-body balance point, independent pelvis roll); physical foot/environment contact; a separate collision provider; tangential contact friction. Also the finding that synchronising a separate engine's ragdoll with the animated character was fragile. The engine survey could not find a public statement of that last point, so it rests on your account.

**Added from outside research:**
- XPBD rigid-body dynamics with swing/twist limits [S16] and substepping [S15];
- implicit / Stable PD and soft-constraint motor formulation [S5][S7];
- inertia-scaled servos and reaction-gain schedules [S9][S10];
- world-space vs local drives and force caps [S11];
- Jolt's drive-to-pose and mass/inertia stabilisation [S6];
- speculative / predicted-position contacts and TOI [S19][S20];
- manifold construction [S21];
- de Leva segment parameters [S1];
- AAOS / CDC joint ranges [S3][S4];
- stud–turf traction data [S22][S23];
- XCoM / capture point [S27][S28].

## Appendix B: decisions I need from you

1. **Solver:** approve the custom XPBD solver, with JoltPhysics.js as the fallback behind the same interfaces? Or would you rather start on Jolt?
2. **Root "hand of God" during Gates B–E:** a strength-limited, drawn, reported root drive carries the pelvis along the authoritative trajectory until a support-based balance controller exists. Acceptable as a temporary mechanism?
3. **Invariant tolerances:** 3 mm body–body, 5 mm body–ground, never 2 consecutive frames. Tighter or looser?
4. **Body set:** 14 bodies with no scapula girdle or toe body in V1, both designed as additive V2 extensions. OK?

## Sources

- **Engine survey** (checked against published npm type definitions, 2026-09):
  - [R2] https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md
  - [R3] https://rapier.rs/docs/user_guides/javascript/determinism
  - [R4] https://docs.rs/rapier3d/latest/rapier3d/dynamics/struct.SphericalJoint.html
  - [R5] https://github.com/dimforge/rapier/blob/master/src/dynamics/ccd/
  - [R7] https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-deterministic-compat@0.21.0/dist/
  - [R8] https://github.com/dimforge/rapier/issues/1011
  - [J1] https://github.com/jrouwe/JoltPhysics.js
  - [J2] https://jrouwe.github.io/JoltPhysics/ (Deterministic Simulation, Continuous Collision Detection)
  - [J4] https://cdn.jsdelivr.net/npm/jolt-physics@1.1.0/dist/types.d.ts
  - [J5] https://github.com/jrouwe/JoltPhysics/issues/2128
  - [J6] https://jrouwe.github.io/JoltPhysics/class_ragdoll.html
  - [P2] https://nvidia-omniverse.github.io/PhysX/physx/5.6.1/docs/AdvancedCollisionDetection.html
  - [P4] https://cdn.jsdelivr.net/npm/physx-js-webidl@2.8.0/physx-js-webidl.d.ts
- [S1] de Leva 1996 — https://ebm.ufabc.edu.br/wp-content/uploads/2013/12/Leva-1996.pdf
- [S2] Winter, Table 4.1 — https://courses.grainger.illinois.edu/me481/sp2021/Anthro-Winter.pdf
- [S3] AAOS ROM chart — https://goniometer.io/rom-chart.pdf
- [S4] Soucie et al. 2011 — https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1365-2516.2010.02399.x
- [S5] Tan, Liu, Turk 2011, Stable PD — https://www.jie-tan.net/project/spd.pdf
- [S6] Jolt source (SwingTwistConstraint, Ragdoll) — https://github.com/jrouwe/JoltPhysics
- [S7] Catto 2011, Soft Constraints — https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf
- [S8] Geijtenbeek & Pronost 2012 — https://perso.liris.cnrs.fr/nicolas.pronost/UUCourses/GamePhysics/literature/Interactive%20Character%20Animation%20Using%20Simulated%20Physics%20-%20A%20State-of-the-Art%20Review.pdf
- [S9] Zordan & Hodgins 2002 — https://dl.acm.org/doi/10.1145/545261.545276
- [S10] Zordan et al. 2005 — https://www.rose-hulman.edu/Class/csse/csse451/assignments/papers/yeomanms.pdf
- [S11] Unreal Physical Animation — https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/FPhysicalAnimationData
- [S14] Catto, Solver2D (2024) and Box2D v3 — https://box2d.org/posts/2024/02/solver2d/
- [S15] Macklin et al. 2019, Small Steps — https://mmacklin.com/smallsteps.pdf
- [S16] Müller et al. 2020, XPBD rigid bodies — https://matthias-research.github.io/pages/publications/PBDBodies.pdf
- [S17] Catto 2012, Ragdolls — https://box2d.org/files/ErinCatto_Ragdolls_GDC2012.pdf
- [S19] Catto 2013, Continuous Collision — https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf
- [S20] Firth 2011, Speculative contacts — https://wildbunny.co.uk/blog/2011/03/25/speculative-contacts-an-continuous-collision-engine-approach-part-1/
- [S21] Gregorius 2015, Contacts — http://media.steampowered.com/apps/valve/2015/DirkGregorius_Contacts.pdf
- [S22] Thomson et al. 2019, boot–grass traction — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0216364
- [S23] FIFA 2006 handbooks — https://www.uefa.com/newsfiles/38018.pdf
- [S25] J Sports Sci 2017, skin–turf friction — https://www.tandfonline.com/doi/abs/10.1080/02640414.2016.1223330
- [S27] Hof 2005 — https://pubmed.ncbi.nlm.nih.gov/15519333/
- [S28] Pratt et al. 2006, Capture point — http://www.ambarish.com/paper/Pratt_Goswami_Humanoids2006.pdf
