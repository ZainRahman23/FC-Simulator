# PI-1: promotion into physical interaction, PREREGISTRATION (FROZEN before any PI-1 code or run)

**Status:** frozen at the commit that adds this file. No PI-1 code, AIR export, V2 runner body or PI-1 run existed at freezing. Later changes are recorded amendments (§16), never silent edits.

**Sources (verbatim):**
- the design `PI1_DESIGN.md` (e01bb67);
- the approval with decisions D-1 … D-5 and clarifications `../sources/2026-10-09_user_approval_pi1_with_decisions.md`;
- the pivot `../PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md`.

Where the design and the approval differ, **the approval governs.** Most importantly, D-2 is modified: no B tether in the fall.

**Preserved:**
- the V2 body (V2-REF and its gates);
- SLP-1 / 1b / 2 / 2C code paths and evidence;
- the football simulation (no simulation code change anywhere).

## 1. Question

> Can one normally locomoting player be promoted into meaningful physical interaction and respond plausibly to a football collision without requiring continuously physical locomotion?

## 2. Authoritative baseline and cases

**Baseline:** football simulation `prototype/3d-animation-pipeline` at **f5f6076** (Tackled-Player V1). This is the baseline the design was approved on.
- It is used through a detached git worktree in the session scratchpad, served by a local static HTTP server.
- The main checkout (which has unrelated uncommitted work) is never touched.
- The later accepted slide-contact V1.2 state (d539e7a / e2c98ec) exists. It is not used in PI-1, so the slice runs on exactly the record the design cited.

**Scenario builder:** `tools/anim3d/of_react_scenarios.js` `rxCase` (f5f6076). Characters: runner Vinícius (recorded 73 kg), tackler Gabriel (78 kg). The tackler is the user's "attacker"; the runner is the "victim". There is no ball (5 m away). Both players are scripted. The slide is requested at tick 30.

**The three cases, run in this order:**

| # | case | definition | authoritative outcome required |
|---|---|---|---|
| 1 | **near miss** `rx_miss` | `rxCase(v 3, ang 90, ph 0.0, off)`. `off` is the smallest \|off\| on a 0.01 m grid (positive first at equal \|off\|) for which the simulation records **no** PLAYER_CONTACT and the minimum surface distance between its own tackler primitives and runner segments (`ptRxTacklerPrims` / `ptRxSegments`, 4 sub-steps per tick) is in **[0.10, 0.20] m**. It is selected by the AIR tool before any V2 run and recorded. | no contact |
| 2 | **recover** `rx_free_leg` | `rxCase(3, 90, 0.0, 0)` | PLAYER_CONTACT on foot_L (swinging) → **CORRECTION** |
| 3 | **fall** `rx_planted_leg` | `rxCase(3, 90, 0.25, 0)` | PLAYER_CONTACT on foot_L (weight-bearing) → **FALL SIDE** |

If the regenerated record does not reproduce the outcome classes and the struck segment of the Tackled-Player V1 review record, PI-1 stops: the baseline does not reproduce.

## 3. Authoritative interaction record (AIR)

**Tool:** `pi1/scripts/air_export.cjs` (puppeteer-core, headless Chrome), following the existing probe pattern (`of_rp_probe.js`):
- page paused; characters preloaded; `ofSquadStart`;
- per tick: commands → `ptStep()` → `updateRig` / `draw`.

**Per tick, written to the record:**
- **Authoritative state:** ball; for every player: x, y, vx, vy, facing, gaitPhase; the runner's reaction state; the tackler's tackle state. Squad events.
- **Predictor value** (§6.1), computed from the current state with the simulation's own pure geometry functions.
- **Tackler primitives** at dt = 0.
- **The runner's presentation pose:**
  - the world matrices of all 23 rig bones from the actor's final `sol.fk.world`;
  - the actor's foot-contact flags (`sol.diag.feet`).

**Presentation modes, per case:**
- **OFF:** `OFPLAY.animOff = true`, no presentation.
- **FULL** (stream A): the ordinary cheap presentation, locomotion plus the Tackled-Player V1 reaction overlay. This is what a never-promoted player shows.
- **LOCO** (stream B): FULL with the reaction link disabled (`ofRxLink` not called), i.e. the unperturbed locomotion of the authoritative state.

**Gameplay hash:** FNV-1a over the canonical text of the per-tick authoritative rows plus the event list.

**Coordinates:** render world = (sim x, height, −sim y), metres.

## 4. The V2 runner body (D-1)

**Human specification:** H = 1.76 m, M = 73.0 kg body mass (V2 convention; worn equipment +0.91 kg, total ≈ 73.9 kg). Kind: **morphology-variant**, because the record's hip-joint spacing is not a population value.

**PROFILE overrides,** computed from `assets/characters/outfield/vinicius/rig.json` (f5f6076). In V2, a height y measured from the stud-tip ground = fraction·H + 0.020 m sole stack.

| override | value | from the record |
|---|---|---|
| ankleH | 0.0386364 | ankle joint 0.0880 m |
| kneeH | 0.2651623 | knee joint 0.48669 m → shank 0.39869 m |
| hipH | 0.5122814 | hip joint 0.92162 m → thigh 0.43493 m |
| hipHalf | 0.0866456 | hip joints ± 0.15250 m |
| shoulderHalf | 0.1403375 | shoulder joints ± 0.24699 m |
| sjcH | 0.8175175 | shoulder joint height 1.45883 m |
| armScale | 1.0578941 | shoulder → wrist chain 0.58883 m |

Everything else is the V2 default: foot length from H, trunk / head from H, masses / inertias by the V2 generator, ankle neutral K 0.13, v2k knee, the accepted contact and solver configuration.

**Known, recorded residuals:**
- **Arms:** upper arm 0.3013 vs 0.3128 m, forearm 0.2876 vs 0.2760 m (± 11.5 mm). One armScale matches the chain.
- **Boots and trunk:** the rig's boot mesh (0.356 m long) and trunk joint heights differ from V2's anatomical boot (≈ 0.28 m) and trunk.
- **The simulation's contact model.** It uses PT.LEG_REF 0.865 (character leg lengths are not written to the simulation without `?charSim=1`). So the simulation's thigh / shank are 0.441 / 0.424 m against the record's 0.435 / 0.399, and its hip height is 0.934 vs 0.922 m. **This simulation-side difference is not corrected and is reported.**

**Not tuned for the tackle:** the body is fixed before any AIR or PI-1 run, from the record alone.

**Quick body / integrity check** (before PI-1; stop if it fails):
- G0 `g0Body` checks for the runner (population bands do not apply to a morphology-variant);
- G1 **ESSENTIAL** scenarios (upright, leanF, leanL, singleLeg, drop1m, sideFirst, awkward, flatSupine, isoMomentum, isoSelfCol) with `scenarioChecks`, at the accepted world configuration (240 Hz, 150 / 2 iterations, plane turf, v2k knee, ankle K 0.13).

## 5. Mapping presentation ↔ physics

**Correspondence.**

| rig bone | V2 body |
|---|---|
| pelvis | pelvis |
| spine | abdomen |
| chest | thorax |
| head | head |
| upperArm_X | upperArm_X |
| foreArm_X | forearm_X |
| thigh_X | thigh_X |
| shin_X | shank_X |
| foot_X | foot_X |

The unmapped rig bones (root, neck, clavicles, hands, toes, hair) are presentation-only. They keep their stream-A local rotation relative to their rendered parent.

**Bind correspondence.** The rig bind pose corresponds to the V2 anatomical zero (`posedBodies(spec, {})`: arms hanging, legs straight, feet forward).
- presentation → physics: R_V2 = R_rig · R_rig,bind⁻¹ · R_V2,zero
- physics → render: R_rig = R_V2 · R_V2,zero⁻¹ · R_rig,bind

**Pose → V2 (promotion).**
- **Pelvis:** the pelvis rotation from the rig pelvis. Its position puts the V2 hip-centre midpoint at the rig thigh-origin midpoint.
- **Child bodies,** parent-first:
  - the anatomical angles of the rig-derived relative rotation (`anatomicalAngles`);
  - each axis clamped to the joint's anatomical hard ROM, with locked axes dropped;
  - the world rotation from `childRotation` with the already-projected parent;
  - the position from the V2 chain (body origin = proximal joint).
- **Recorded:** the projection residual per joint (angle) and the clamp amounts.

**Physics → render (while promoted).**
- Mapped rig bones take their world rotations from the V2 bodies (formula above).
- The rig pelvis origin = the V2 hip-centre midpoint. The record has the rig pelvis origin at the hip midpoint.
- Positions come from rig forward kinematics with the rig's own bone lengths.
- **Recorded every tick:** the rendered↔physical residual at the knee, ankle, elbow and wrist.

**Physics frame:** render world minus a constant horizontal offset (integer metres, set at promotion), for numerical scale only. Gravity −y; turf plane y = 0.

## 6. Promotion (D-3)

### 6.1 Predictor (current authoritative state only)

At tick k, the in-page AIR tool evaluates the simulation's own pure functions on the current state:
- `ptRxBody(runner, dt)` with `ptRxSegments`: the runner advanced at constant velocity with the stride clock advanced;
- `ptRxTacklerPrims(tackler, dt)`: the tackler advanced at constant velocity;
- for dt ∈ {0, 1/240, …, 0.10 s}.

It records the minimum surface distance d_pred(k) = min (segment distance − r₁ − r₂).

**Promotion:** at the first tick with **d_pred(k) ≤ δ = 0.25 m**, i.e. predicted contact with the interaction envelope δ within the next **0.10 s**. δ covers the near-miss band (≤ 0.20 m) plus margin.

**Constraints:**
- The predictor is read-only; NT-4 verifies this.
- It never feeds the simulation.
- It uses no future tick.

### 6.2 Initialization (the one declared state write)

All of this happens at promotion tick k_p, before any physics step.

1. **Pose:** the V2 bodies come from the stream-A pose at k_p (§5).
2. **Velocities:** the second-order backward difference of the same mapping at k_p, k_p − 1 and k_p − 2: v = 1.5·d₁ − 0.5·d₀.
   - Angular velocity per body comes from the rotation differences.
   - Linear velocities are propagated through the tree from the pelvis. Each child COM velocity = parent joint-point velocity + ω_child × (COM − joint). The joint velocity constraints therefore hold exactly at k_p.
   - Nothing is shifted toward the authoritative root velocity. The whole-body COM velocity, linear and angular momentum vs the authoritative root velocity are recorded.
3. **Ground:** only if stream A marks a foot in contact at k_p, a vertical whole-body shift puts the V2 lowest boot point of the contacting foot(s) at y = 0. Otherwise no shift. The shift is recorded.
4. **The write:** the PI-1 simulator is constructed with the V2 runner body (the "pool" body; construction cost is measured separately). Then the 14 bodies' pose and velocity are set once: `setPose` + `setVel`, 28 counted authority writes, logged with every value.
   - After that, `authorityWrites` must not change until demotion.
5. **Actuators:** activation is initialized from the first command (no lag ramp). The tackler proxy is created at the simulation's tackler state at k_p (§7).

### 6.3 Timing (no lookahead)

**At sim tick k (record k known):** physics advances from k − 1 to k in 4 steps of 1/240 s. Its inputs are interpolated between records k − 1 and k:
- joint targets (positions linear, rotations slerp);
- target rates (constant over the tick);
- B targets;
- proxy targets.

**The rendered output at tick k** is the physics state at k. Consumer reads go through a cursor that cannot return records beyond k.

## 7. Collision representation

**Runner (promoted V2):** the V2 colliders and contact model unchanged (boot–turf μ 1.2; body–turf 0.5; boot / body–body 0.4; restitution 0; manifold reduction and contact cache off; self-collision by the GroupFilterTable).

**Tackler (dynamic slide proxy).**
- **Shape:** one rigid body made of the simulation's own two slide primitives, taken from the record at k_p:
  - LEG: capsule, r 0.07, axis endpoints from `ptRxTacklerPrims`;
  - BODY: capsule, r 0.16.
  - At k_p the leg extension is complete: launched at tick 30, extension 0.12 s.
- **Mass and DOFs:** mass 78 kg (recorded), inertia from the shape. Allowed DOFs: translation + yaw. Gravity factor 0.
- **Layers:** the world's existing diagnostic third object layer (`diagNoGround`), so the proxy collides with the runner but not the turf. Its ground interaction is the simulation's slide law.
- **Drive:**
  - (i) a state-independent feed-forward force m·(v_k − v_{k−1}) / Δt_tick over the interval k − 1 → k (A form);
  - (ii) a capped tether, a SixDOF PositionAndVelocity motor toward the simulation's root position and velocity (interpolated), at 2 Hz, ζ = 1 for 78 kg, caps 334 N per horizontal axis and 334 N vertical, plus yaw toward the slide direction (cap 82 N·m).
- **Recorded:** the transferred impulse = the proxy's momentum change minus the drive impulses.

## 8. During promotion: per-state mechanisms

**B, the runner's support** (§2.1 SupportLayer behaviour, extended only to a moving orientation target):
- a turf↔pelvis SixDOF PositionAndVelocity spring at **2 Hz, ζ = 1**;
- K_lin = M(2πf)², D_lin = 2Mω; K_rot,axis = I_axis(2πf)², D_rot = 2·I_axis·ω, with I the runner's whole-body inertia about the pelvis COM (standing pose) in the world axes of its facing;
- caps = the SLP 3 m/s class, unchanged: horizontal 274.95 N, vertical +1161.2 / −193.5 N, torque 81.80 N·m;
- target = the stream-A pelvis pose and velocity (interpolated);
- no vertical feed-forward;
- B reads no contact and writes no state.

**Actuators:** per-axis {K, D, τ0} from the existing posture law (SLP driver form):
- gravity statics: subtree weight, minus the weight share of the feet that stream A marks in contact, applied at the physical sole centroid;
- stance or swing gains by that flag, with the 0.03 s blend;
- velocity feed-forward (D + dt·K)·ω_target from the **target** rate (state-independent).

| state | entry | actuator targets | B | exit |
|---|---|---|---|---|
| **PRE** | promotion | stream A | on | first physical runner–proxy contact → IMPACT. Near miss only: d_pred > δ and the runner–tackler distance increasing (the interaction envelope has passed) → RECONCILE. |
| **IMPACT** (recover) | first contact | **stream B**: unperturbed locomotion, so the deflection is purely physical | on (toward stream A) | 0.10 s after the last contact tick → RECONCILE |
| **RECONCILE** (near miss, recover) | as above | stream A (the ordinary presentation the player returns to) | on | compatibility (§9.1) → DEMOTE; not reached within **T_rec = 0.5 s** → failure |
| **FALL** (fall case) | the authoritative fall transition: the tick whose record carries the FALL reaction, applied to the interval ending at that tick | **frozen** at the mapped stream-A pose of the transition tick (posture tone; no animation) | **released completely**: α = 0 on every axis, no force from then on; A not used | handoff state (§9.2) → physics removed |

**What the fall involves:**
- the body evolves from its actual contact pose and its linear / angular velocity, plus the physical collision impulse;
- nothing pulls it toward the running trajectory or toward the simulation's fall root;
- nothing is fed back to the simulation;
- the discrepancy from the simulation representation is recorded every tick.

## 9. Demotion and handoff

### 9.1 Reconciliation → demotion (near miss, recover)

**No teleport and no cross-fade.** Physics is removed at the first tick k_d in RECONCILE at which the physics-rendered pose is **compatible** with stream A at k_d:
- (a) every rig joint position within **10 mm**;
- (b) rendered pelvis within 10 mm;
- (c) every rig joint velocity within **0.20 m/s** (60 Hz differences);
- (d) every foot that stream A marks in contact is physically loaded (≥ 20 N) and within 10 mm of its stream-A position;
- (e) no runner–proxy contact for ≥ 2 ticks.

**From k_d on, the output is stream A,** the never-promoted presentation, which physics never modified. The switch residual at k_d is recorded.

### 9.2 Fall handoff (for a later authored get-up; get-up not solved in PI-1)

**Handoff state:** the first tick at which all of these hold:
- (i) no runner–proxy contact for ≥ 0.20 s;
- (ii) whole-body kinetic energy ≤ 5 J and COM speed ≤ 0.10 m/s, both sustained for 0.25 s;
- (iii) pelvis COM height ≤ 0.35 m;
- (iv) at least 3 non-boot bodies in turf contact.

**At handoff:** the family is classified by the thorax up-axis (FRONT / SIDE / BACK), and physics is removed.

**Recorded:**
- handoff time vs the simulation's recovery start (= its "up" time − recoverT[family]);
- family vs the simulation's family;
- root discrepancy;
- the pose residual to the authored get-up's first frame (stream A at the simulation's recovery start). That residual is what a future get-up must reconcile; PI-1 does not reconcile it.

## 10. Recording (every promoted case)

**Per tick while promoted:**
- every runner–proxy contact manifold: bodies, sub-shapes, points, normal, depth; relative velocity at the contact point;
- the transferred impulse (proxy momentum balance) and the struck body's Δv;
- runner whole-body linear momentum P and angular momentum L about the COM; COM;
- B force / torque, its fraction of cap, saturation;
- joint hard-limit margin per axis (all joints) and actuator saturation (axis count, peak fraction of capacity);
- energy ledger (actuators, B, proxy contact work, passive damping) and residual;
- pelvis pitch / roll / yaw vs stream A;
- the per-rig-joint discrepancy (physics-rendered vs stream A, vs stream B in IMPACT);
- the COM vs authoritative root discrepancy;
- foot loads; stance / swing flags (stream A and simulation stride state);
- `authorityWrites`; state; per-tick hash.

**Around contact:** P, L (runner and proxy) on the tick before the first contact and the tick after the last.

## 11. Pass / fail criteria

The same configuration is used for every case. No per-case parameters.

### Promotion (every case)

| | criterion |
|---|---|
| PR-1 | rendered pose at k_p vs stream A at k_p: pelvis / legs / feet ≤ 5 mm, trunk / head / arms ≤ 10 mm (max per rig joint) |
| PR-2 | no velocity discontinuity: over the first rendered frame (k_p → k_p + 1), every rig joint's displacement within 3 mm of stream A's displacement |
| PR-3 | no artificial energy: energy-residual Σ+ over the first 0.05 s ≤ 0.5 J; no body position correction > 1 mm in the first 0.05 s; penetration at k_p ≤ slop + 1 mm |
| PR-4 | promotion makes no collision impulse: no runner–proxy manifold in the first 0.05 s; turf normal impulse per step in the first 0.05 s ≤ 2·M·g·dt |
| PR-5 | exactly 28 authority writes at promotion, none afterwards |

### Case 1: near miss

| | criterion |
|---|---|
| NM-1 | the predictor fires; no runner–proxy manifold at any time |
| NM-2 | while promoted: B mean \|axis\| / cap ≤ 0.25 on every axis and saturated on ≤ 5 % of steps; planted-foot slip ≤ 10 mm |
| NM-3 | compatibility (§9.1) reached within T_rec; switch residual at k_d within the §9.1 limits |
| NM-4 | after k_d the output is bit-identical to stream A (the never-promoted presentation), and stream A / the AIR are unchanged by the run (hash) |

### Case 2: recover

| | criterion |
|---|---|
| RC-1 | physical runner–proxy contact within ± 1 tick of the simulation's contact tick, on foot_L or shank_L |
| RC-2 | visible physical response: in the first contact step the struck body's Δv ≥ 0.2 m/s, within 45° of the contact normal; within 0.15 s the struck foot deviates ≥ 30 mm from stream B |
| RC-3 | B does not overpower the contact: over [first contact, + 0.10 s], B's impulse opposing the transferred impulse ≤ 0.5 × the transferred impulse, and RC-2 holds |
| RC-4 | outcome-consistent: pelvis height ≥ 0.85 × stream A's and pelvis tilt within 20° of stream A throughout; B saturated on ≤ 10 % of promoted steps |
| RC-5 | compatibility (§9.1) reached within T_rec; switch residual within limits; after k_d bit-identical to stream A |
| RC-6 *(report only)* | transferred impulse vs the simulation's J (4.26 N·s), and the proxy ΔV vs the simulation's tackler slowing |

### Case 3: fall

| | criterion |
|---|---|
| FL-1 | physical contact within ± 1 tick of the simulation's contact tick, on foot_L or shank_L |
| FL-2 | B force identically 0 from the fall transition; no authority write after promotion; no force on the runner other than gravity, actuators (frozen targets), passive tissue and contacts |
| FL-3 | falls physically: pelvis COM ≤ 0.35 m within 1.5 s of contact; handoff (§9.2) reached before the simulation's recovery start |
| FL-4 | **not canned, deterministic** (§12): identical inputs give identical hashes; each preregistered physical perturbation changes the fall beyond threshold, larger perturbations more |
| FL-5 *(report only, never hidden)* | discrepancy vs the simulation every tick (COM vs root, landing time vs 1.185 s, travel, family vs SIDE, rest position vs the simulation's root) |
| FL-6 | integrity: energy-residual Σ+ ≤ 5 J (ledger including proxy contact work); finite; turf depth ≤ 10 mm |

### Every case

| | criterion |
|---|---|
| NT-1 | in-page authoritative traces and gameplay hashes identical across OFF / FULL / LOCO |
| NT-2 | the V2 consumer reads a deep-frozen AIR; the AIR file SHA-256 is identical before and after all runs |
| NT-3 | the consumer with promotion disabled and enabled reads an identical authoritative hash sequence, and its non-promoted output is identical |
| NT-4 | predictor calls do not alter the simulation: OFF without predictor = FULL with predictor (authoritative trace) |
| DT-1 | every run twice: identical per-tick hashes |
| DT-2 | cross-process identical |
| DT-3 | all three cases in one process = each case fresh |
| DT-4 | AIR export twice: identical |
| REC | every §10 quantity present for every promoted case |
| CPU-1 | no physics step on any tick without a promoted body |

## 12. Fall sensitivity (FL-4)

The AIR is held fixed: the authoritative outcome is unchanged and only the presentation inputs are perturbed. Each perturbation is run at two magnitudes (half, full), each twice for determinism:

| | perturbation | half | full |
|---|---|---|---|
| S-v | runner initial velocity field scaled about the COM velocity (uniform horizontal shift of every body by ε·v_COM) | ε = 2.5 % | 5 % |
| S-g | contact geometry: the proxy's LEG capsule shifted along the slide direction (toward the runner) | 1 cm | 2 cm |
| S-u | proxy speed: its velocity and drive targets scaled | 2.5 % | 5 % |

**Thresholds:**
- **Pass per perturbation:** the full magnitude changes at least one of the following relative to the base, **and** |change(full)| > |change(half)| for that measure:
  - handoff COM position ≥ 10 mm;
  - first trunk–turf contact time ≥ 1 physics step;
  - handoff thorax orientation ≥ 2°.
- **Determinism:** the base run is bit-identical twice.
- **Structural evidence:** there is no time-varying target in FALL.

## 13. CPU (reported; nothing optimised)

**Environment:** Apple M4, Node 22, single thread, sequential, 3 trials, medians. In-page costs are from Chrome (stated as such).
- (a) cheap locomotion before promotion: per player per 60 Hz tick, the runner actor's `ofActorTick` time in-page;
- (b) promotion: pool construction (one-off) and initialization (mapping, velocities, write, proxy);
- (c) promoted V2 per simulated second (PRE / RECONCILE steps);
- (d) collision / fall (IMPACT and FALL steps);
- (e) reconciliation / demotion (compatibility checks, removal);
- (f) the 22-player estimate at k = 0, 2, 4, 8, 22 simultaneous promotions: 22 × (a) + k × (c or d). No interaction frequency is assumed.

## 14. Stop conditions (user; checked in order near miss → recover → fall)

Stop and report rather than redesign if:
1. **Promotion causes a meaningful impulse / state discontinuity** (PR-1 … PR-5 fail in any case).
2. **The near miss cannot return exactly to the never-promoted presentation state** (NM-3 or NM-4 fail).
3. **B must overpower the physical contact to satisfy the recovery case** (RC-3 fails, or reconciliation is reached only with B saturated for > 50 % of IMPACT + RECONCILE).
4. **The fall requires hidden trajectory following or position / velocity writes** (FL-2 fails).
5. **Collision response cannot remain physically visible while gameplay hashes stay unchanged** (RC-1 / RC-2 / FL-1 fail, or NT-1 … NT-4 fail).
6. **PI-1 requires restoring continuous physical locomotion:**
   - a non-fall case is promoted for longer than 1.0 s;
   - compatibility is reachable only by physically simulating stride-level locomotion beyond T_rec.

Criterion failures that are not stop conditions are recorded, and the sequence continues.

**Also stop on:**
- the D-1 body check failing;
- the baseline not reproducing (§2).

## 15. Not in scope

- browser integration;
- running / turning animation development; dribbling;
- generalised tackles, the get-up, the tackler as a V2;
- performance optimisation;
- TD2C / E2; PI-2.

## 16. Amendments

None at freezing.
