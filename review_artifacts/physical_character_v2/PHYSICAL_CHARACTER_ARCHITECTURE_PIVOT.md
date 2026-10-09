# Physical Character architecture pivot: cheap authoritative locomotion + promotion into V2 physics for meaningful interaction

**Date:** 2026-10-09 (chronicle day 8 Oct).

**Decision (verbatim):** `sources/2026-10-09_user_decision_end_slp_series_pivot_promotion.md`. This document records the conclusion the user adopted. It does not argue for it.

**Status:** adopted conceptually. **Nothing in this document is implemented.** The next vertical slice is designed in `pi1/PI1_DESIGN.md` and has not been built.

**Preserved unchanged as evidence:**
- SLP-1 (627d935), SLP-1b (e4f572f), SLP-2 (e3c99e1) and SLP-2C (e63be8b);
- their preregistrations, code paths (driver versions "1", "1b", "2", "2c") and evidence;
- the V2 body, its tests and all earlier gates.

**Not resumed:** TD2C / E2 (they stay at E2-22), CF / autonomous gait, SLP.

---

## 0. The conclusion adopted

1. **Ordinary locomotion.** Fully physical foot-ground contacts will not be required during ordinary unobstructed locomotion.
2. **A is validated.** SLP-2 validated A, the authoritative whole-body translational mechanism.
3. **What SLP-2C showed.** Forcing ordinary locomotion to keep continuously physical foot-ground contacts requires increasingly sophisticated gait and contact control. It pulls the project back toward the robotics problem it deliberately left.
4. **What failed.** **No V2 body limit was demonstrated.** The failure is the *requirement* that continuously physical leg contacts stay mechanically neutral while an external authoritative trajectory drives the character.

## 1. What SLP-1 / 1b / 2 / 2C each tested

All four used the same body, rate and evidence discipline:
- V2-REF (1.82 m, 78.91 kg; 14 bodies, 13 SixDOF joints, finite Hill-type actuators, passive tissue, rigid boot hulls on turf), unchanged;
- 240 Hz, 150 velocity / 2 position iterations;
- straight-line authoritative trajectories at 1.2 / 3 / 6 m/s with min-jerk ramps;
- frozen preregistrations;
- deterministic paired runs.

| | question | mechanisms |
|---|---|---|
| **SLP-1** (prereg 49785b7 + amendments a38e8fa; result 627d935) | Can V2-REF be driven along an authoritative trajectory by a **finite, recoverability-bounded support** while its legs walk on schedule-based footholds, and stay a genuine contactable body? | **B:** turf↔pelvis SixDOF PositionAndVelocity spring, caps derived from V2's disturbance-recovery capacity (horizontal 275 – 334 N, vertical +1161 / −194 N, 81.8 N·m), α authority law from the recoverability margin. **C:** schedule driver on the existing bounded leg IK and actuators. |
| **SLP-1b** (amendment 1137244; result e4f572f) | Can the **legs** carry what SLP-1's support could not (pelvis orientation, body support, propulsion), caps unchanged? | B1 posture-"ik" stance frame; B2 foothold shift a_ref/ω² for propulsion; B3 half-sine stance forces for flight gaits; B4 support tracks the scheduled oscillation. |
| **SLP-2** (prereg 03455b8; result e3c99e1) | With translation supplied by an authoritative, state-independent field **A**, can B stay within a 25 % recovery budget while the legs (C) carry the weight and explain the motion *without propelling it*? | **A:** F_A,i = α·m_i·a_T(t) on every body (no torque about the COM, reads no state). B as SLP-1. C = SLP-1b without B2. R = T + δ_C; D = S − R report-only. A9 (budget) and A10 (A carries translation). |
| **SLP-2C** (prereg b35b31a; result e63be8b) | Can C be made **contact-compatible**, i.e. mechanically neutral to A's translation while staying physically real, using only trajectory-driven changes? | **C1:** swing horizontal settles τ_d = 0.149 s before touchdown. **C2:** velocity feed-forward on stance legs. **C3:** launch through C2. A / B / R unchanged. Staged walk → jog → run. |

## 2. What each failure demonstrated

**SLP-1.** Stopped at calibration: no f ∈ {1, 2, 4} Hz met A1 – A6.
- What happened:
  - The walk tracked, but the support was saturated on 68 – 93 % of ticks (pelvis pitch / roll torque) and carried 74 – 88 % of body weight.
  - Jog and run saturated the forward cap in the ramp, then lag, then loss of authority, then a fall.
- **Demonstrated:** support caps sized for disturbance recovery cannot also carry ordinary locomotion (orientation, weight, propulsion) when the legs supply none of it.

**SLP-1b.** Stopped at calibration.
- What happened:
  - Walk falls at 2.42 / 6.91 s, or (4 Hz) is dragged with the support saturated 100 % of the time and the legs carrying 9 %.
  - Jog falls at 2.08 – 2.17 s; run at 2.61 – 2.73 s.
  - Before the first cap saturation, the legs carried 78 – 123 % of body weight and held the pelvis (pitch ≤ 1.5°).
- **Demonstrated:**
  - Leg forces directed through the COM need a COM lead that a path-holding support suppresses.
  - The lag then turns touchdowns into braking, the capped support pushes against foot braking, and the body pitches past the 81.8 N·m cap.
  - With balance removed, the support is the only momentum corrector, and recovery-sized caps are too small for that role.

**SLP-2.** Stopped at calibration; A9 and A10 failed at all speeds and frequencies.
- What happened:
  - A delivered exactly the authoritative momentum.
  - The legs braked a net −202 to −369 N·s: impulsive braking at touchdown, stance braking that grew with the lag, and no flight launch (B carried 300 – 650 N during flights).
  - B absorbed the braking (+216 … +395 N·s) until its forward cap, then the body pitched and collapsed.
- **Demonstrated:**
  - Translation can be separated from support (A works).
  - Once it is, the legs' **contact forces** become the problem. Physical feet planted on the turf resist a body that is being carried, and the resistance lands on B.

**SLP-2C.** Stopped at stage 1 (walk 1.2 m/s; FALLEN 2.358 s, d05c186a ×2).
- **C2:** removed most of the stance braking (−16.7 vs −44.4 N·s), but overshot into stance propulsion (+27.4 N·s). B cancelled it, with pitch torque at 62 % of cap before any touchdown.
- **C1:** cut the touchdown speed (0.045 vs 0.138 m/s). But compressing a 1.33 m swing into 0.247 s made it unfollowable: the trailing foot lagged its target by up to 0.88 m and dragged loaded on the turf (−62.6 N·s) before the collapse.
- **Demonstrated:**
  - Each contact incompatibility removed exposes the next: touchdown, then stance, then swing tracking, and jog / run flights were never reached.
  - Each fix needs more gait / contact control: swing inverse dynamics, clearance planning, stance-force shaping.
  - That is the controller problem the project chose to leave, now re-entered through a different door.

**Across all four:**
- The failing quantity was always the **mechanical neutrality of continuous physical leg contact under an external trajectory**.
- It was never the body's ability to bear load, hold a plant, or stay integral.

## 3. What was actually validated

**A, the authoritative whole-body translation field (SLP-2).**
- Delivered exactly the requested momentum in every run: J_A = 94.69 / 236.7 / 473.46 N·s = M·v at 1.2 / 3 / 6 m/s.
- Reads no physical state, applies no torque about the COM, writes no state.
- About 3 – 7 µs per 240 Hz step.
- By construction it cannot cancel a collision response, because it has no state dependence.
- **Retained as a validated experimental mechanism**, and a possible tool for promotion / interaction states. It is not automatically the production implementation.

**B, the finite support and recoverability (SLP-1 / 1b / 2).**
- Never wrote state. Never exceeded its caps (≤ 1e-3 N).
- Its readback impulses were exact.
- SLP-1 showed loss of authority driven by α with **no state reset**.
- The caps and the α law are derived from V2's own recovery capacity.
- **Retained as research:** a candidate presentation mechanism for stumble / fall severity. Not responsible for ordinary locomotion.

**The V2 body under realistic-speed loading.**
- Before each controller-driven collapse:
  - the legs carried 78 – 123 % of body weight (SLP-1b) and 102 % (SLP-2C walk);
  - planted feet held: flat-phase slip 0.0 – 0.1 mm;
  - contacts were stable; integrity held (finite, no writes, energy ledger closed within the stated tolerances).
- Margin loss and actuator saturation appeared only with the gait-control failure, never as its cause.
- Earlier gates stand unchanged: G0 8 / 8, G1, G2 (620 / 620), G3 (20 / 20, v3.3), G4, E1a, E1b (closed, PSTAR4), and CF-6's 59 consecutive continuous steps at 0.10 m/s.

**Evidence discipline.**
- Every SLP run was deterministic: all calibration pairs identical.
- Later code reproduced the earlier versions' hashes: SLP-2C's P9 reproduced 9 / 9 across versions "1", "1b" and "2".
- Regression 106 / 106 and components 58 / 58 were unaffected.

**Cost.**
- Supported V2 locomotion is not cheaper than autonomous V2: 813 – 957 µs per step, against 892.
- The cost is physics plus the leg driver, not A or B.

## 4. Why this is an architectural pivot and not a V2 failure

- **No V2 body limit was demonstrated.** In none of SLP-1 / 1b / 2 / 2C did a body property (geometry, mass distribution, joint range, actuator capacity, contact model, passive tissue) bound the result.
  - Every failure traces to a control requirement: who supplies orientation, weight, propulsion, or contact neutrality.
  - The joint margins and saturations seen at the ends of runs follow from the collapse.
- **The requirement was the problem, not the body.**
  - Real feet on real turf generate real horizontal forces.
  - Making those forces sum to zero, step by step, while an external trajectory carries the body is gait control.
  - The better the contact model, the more the forces matter.
  - A body that passed these tests would need a controller of the kind TD2C / E2 / CF were building. Leaving that controller was the point of the 8 Oct pivot.
- **The football requirement does not need it.**
  - Ordinary running needs to *look* grounded (feet placed, no sliding) and to follow the simulation exactly.
  - Authored / procedural locomotion with foot IK already does both: zero-slide plants and ON/OFF neutrality, measured in Outfield Locomotion V1 / Dribbling V1.
  - Physical truth matters when bodies **interact**: a collision, a tackle, a trip, an aerial challenge, a fall.
- **What changes is when V2 is used, not what V2 is.** V2 stays the physical articulated representation. It is used where physical interaction matters, instead of every tick for every player.

## 5. The new separation (conceptual; not implemented)

### 5.1 Ordinary unobstructed locomotion (every player, every tick)

- **The football simulation owns the gameplay state:** position, velocity, acceleration, facing, and intended action.
- **Presentation consumes that state read-only.**
  - Walking, running and turning use authored / procedural skeletal locomotion (Outfield Locomotion V1 class: a sim-owned stride clock, speed-driven gaits, zero-slide plants).
  - Terrain and foot IK.
  - Feet may use ground queries or placement constraints for visual contact.
- **No rigid-body foot-ground contact forces** generate or resist translation. No autonomous physical balance.
- **No V2 articulated physics or controller runs** for a player in this state.

### 5.2 Meaningful physical interaction (event-driven, per player)

- **Promotion.** A player is promoted from ordinary locomotion into an interaction / contact state when a meaningful collision, tackle, trip, aerial challenge, fall or similar event requires it.
- **Consistent start.** The physical state begins from the current authoritative pose, position, velocity and momentum, with no visible or physical discontinuity.
- **What is physical.** During the interaction, real colliders, masses, joints, contacts and the relevant V2 physical properties participate.
- **The simulation stays authoritative over the gameplay outcome.** Physical presentation **explains** that outcome. It never silently changes it, and nothing flows back from presentation physics into the simulation.
- **Reconciliation.** After disruption or recovery, the physical state is reconciled deterministically back into ordinary locomotion, with no visible teleport.
- **No impulse threshold.** The 8 Oct rule still holds: there is **no "impulse > X = ragdoll" rule**.
  - Promotion is triggered by the interaction event, not by the size of an impulse.
  - The promoted body is a powered articulated body, not a limp ragdoll.

### 5.2a Rule: gameplay collision primitives must map to the character's geometry (added 2026-10-09 after D-1A, user decision)

- **Explicit mapping required.** Any gameplay collision primitive meant to drive physical presentation must have an explicit, recorded mapping to the rendered / physical character geometry it stands for.
- **Simplification is allowed; false claims are not.** A gameplay collision may be simplified (capsules for boots, for example). It must not claim an interaction that the corresponding physical character cannot plausibly reproduce. Example: a deep sweep of a planted foot that the promoted body would only graze.
- **Enforced by a gate.** Every promoted interaction case passes the simulation ↔ physical-contact compatibility gate (`pi1/PI1_PREREGISTRATION.md` amendment 1) before it is used.
- **Differences are recorded.** Both geometries are recorded and their differences reported, never hidden.

### 5.3 Boundary rules

| | owner | rule |
|---|---|---|
| gameplay root (position, velocity, facing), possession, outcome class and timings | football simulation | never written by presentation |
| ordinary pose | procedural locomotion | function of authoritative state only (ON/OFF-neutral) |
| body configuration and contacts during an interaction | V2 physics | starts consistent with the procedural pose; coupled to the authoritative root only through declared, bounded, logged channels |
| return to ordinary pose | deterministic reconciliation | inertialized blend; no teleport; no foot slide beyond tolerance |

## 6. Which V2 components remain useful

| component | role after the pivot |
|---|---|
| Body: geometry, masses, inertias (V2-REF and the parametric variants), 14 bodies / 13 joints / 35 DOF | the articulated representation during interaction |
| Joints, limits, engine stops, passive tissue (G1) | plausible limb response, falls, landings, no trapped-limb energy |
| Actuators: capacity, activation and Hill model (§14) | a powered body during interaction: protective posture, bracing, struck-limb recovery, all at finite capacity |
| Colliders (§15): boot hulls (manifold reduction / contact cache off), shank capsules with shin guards, thighs, trunk boxes, deltoid spheres, head | real contact with tacklers, the turf and other players (§15.5 football interactions) |
| Physics ↔ render mapping (§9) and the semantic skeleton (§6) | promotion (render pose → physics bodies) and visible response (physics → render) |
| Bounded leg IK (hard box), posture tracking law, statics feed-forward | projecting the procedural pose into V2's limits at promotion; joint-space tracking of pose targets |
| **A** (uniform field) | candidate for carrying authoritative acceleration in interaction states |
| **B** (finite support, α law, caps) | candidate bounded coupling to the authoritative root, and a stumble / fall-severity mechanism |
| Contact probes, impulse readback, energy / work ledgers, D (discrepancy) series | measuring interactions: transferred impulse, struck segment, support loss, reconciliation error |
| Disturbance harness, genuine rigid impactor (SLP-1 / 2) | the template for a physical tackler proxy |
| Determinism tooling (per-tick hashes, cross-version reproduction, regression batteries) | unchanged requirement |
| G0 – G4, E1a / E1b, CF, TD2C / E2 results | preserved research. Standing / stepping control is not needed for ordinary locomotion. It may inform recovery later; not resumed. |

## 7. Open questions

**Promotion**
- **Q1, trigger and lead time.** The trigger must be causal, computed from current authoritative state only (challenge live plus predicted contact within T_lead). The alternative is to run presentation a few ticks behind the simulation. Which is used, and what lead is enough for the physical body to settle (actuator activation, contact manifolds) without being "continuous locomotion"?
- **Q2, missed prediction.** What happens if the simulation records a contact while the player is not yet promoted (zero lead)? Promoting into an interpenetrating state injects energy. A defined fallback is needed.
- **Q3, initial-state consistency.**
  - Mapping a procedural pose into V2: joint-limit projection, planted-sole placement on the turf.
  - Velocities from causal finite differences, with whole-body COM velocity equal to the authoritative velocity.
  - Angular momentum consistent with the procedural motion.
  - Actuator activation warm start.
- **Q4, geometry agreement.** The simulation's contact model (pt_react rebuilds the body from the stride clock with capsules) and V2's colliders must agree on where segments are, or the physical contact misses, or happens on the wrong segment, when the simulation says it hit. The Defending V1 lesson applies: sim contact geometry must derive from the rendered body.

**Collision handling**
- **Q5, carrying the authoritative trajectory.** The candidates after contact:
  - a B-type bounded tether toward the authoritative root;
  - A carrying the authoritative non-contact acceleration;
  - no physical coupling, plus a render-space offset reconciled at demotion.
  
  The simulation's own contact ΔV must not be applied twice, once physically and once by the coupling.
- **Q6, outcome tension.** What should happen when the physics "wants" a different outcome from the simulation's? For example, B saturates holding a player up whom the simulation says corrects, or a falling body travels much less than the simulation's fall. The proposal is to report this as a measured inconsistency, never to resolve it by changing the outcome.
- **Q7, the other player.** Is the tackler a promoted V2 too, or a physical proxy? Two promoted V2 bodies need their own momentum exchange; pile-ups need several. Also open: how a promoted player interacts with unpromoted players (capsule occupancy, as in Tackled-Player V1).
- **Q8, the ball during promotion.** It stays simulation-owned (possession release by the simulation). The physical boot / ball interaction is excluded for now.
- **Q9, partial promotion.** Is it enough to promote only the struck chain (leg + pelvis) for minor clips? A kinematic pelvis has effectively infinite mass, so it is wrong for weight-bearing sweeps.

**Deterministic recovery**
- **Q10, demotion criteria.** Pose and velocity agreement with the procedural target, end of contact, rest detection, a maximum promoted duration. Then the inertialized blend: its length, root offset, and planted-foot handling during the blend.
- **Q11, getting up.** Authored get-up families (Tackled-Player V1: FRONT / SIDE / BACK), started from the physical rest pose, or physically assisted? How the rest pose is matched to the family's start pose.
- **Q12, determinism under promotion.**
  - Body pool creation order and fixed slots; Jolt body / constraint IDs.
  - Resetting warm-start impulses and actuator state.
  - History independence: the same promotion gives the same result regardless of earlier promotions.
  - Frame-rate independence.
  - Browser / Node parity.
- **Q13, concurrency budget.** A cap on simultaneous promotions, and a deterministic priority that is state-based, never camera-based.
- **Q14, replays and networking.** Record only authoritative state plus presentation version; presentation physics must regenerate identically.
- **Q15, runtime.** WASM single-thread vs multi-thread vs native for the interaction physics. The solver iterations (currently 150 / 2) are to be revisited only after the slice, not optimised now.

## 8. Expected computational advantage

**Measured inputs** (no optimisation applied to either):

| | per player | 22 players |
|---|---|---|
| Continuous V2 articulated locomotion physics + controller (SLP-2 sequential CPU, Apple M4, Node 22, single thread: 813 – 957 µs per 240 Hz step; autonomous V2: 892) | 0.195 – 0.230 s CPU per simulated second | **4.3 – 5.1 s CPU per simulated second**, 4.3 – 5× slower than real time on one core |
| Procedural locomotion + foot IK (Outfield Locomotion V1, browser: ≈ 0.10 ms per rig per frame; 2.7 ms per frame at 22 rigs) | ≈ 0.006 s per simulated second | **≈ 0.13 – 0.16 s per simulated second** |
| One promoted V2 player during an interaction (the same per-step cost as continuous; the physics world idles when nobody is promoted) | ≈ 0.2 – 0.23 s per promoted second | — |

**Estimate for a match.**
- The interaction rate and durations below are assumptions. They have not been measured; the simulation's own challenge statistics must replace them.
- Assume about 100 – 300 promotions per 90 minutes (tackles, challenges, aerials, falls), each lasting about 0.3 – 3 s for 1 – 2 players.
- That gives a mean concurrency of roughly 0.01 – 0.3 promoted players (30 – 1800 promoted player-seconds per 5400 s). Average added physics ≈ 0.001 – 0.08 s per simulated second.
- Typical total ≈ 0.13 – 0.24 s per simulated second, against 4.3 – 5.1 for continuous V2. That is **roughly 18 – 38× less CPU on average**, and within real time on one core.
- Peaks are bounded by the concurrency cap (Q13). Four simultaneous promotions add about 0.8 – 0.9 s per simulated second while they last.

**Caveats.**
- The two costs were measured in different environments: Node for V2, the browser for the procedural rig.
- V2 runs at 150 velocity iterations, unoptimised.
- Spec §20's native multi-threaded estimates would lower the physics cost in both architectures. The advantage comes from **not running articulated physics for players who are only running**, and that holds at any per-step cost.
- PI-1 (`pi1/PI1_DESIGN.md` §14) proposes measuring the per-promotion numbers in one environment.

## 9. Next

- **Designed, not implemented:** `pi1/PI1_DESIGN.md`. PI-1 is the promotion slice: one normally locomoting player promoted into a slide-tackle contact.
- **Before PI-1 can be built:** user review of the design and its decision points, then a frozen preregistration.
- **Not started:** the slide tackle, any gait experiment, TD2C / E2.
