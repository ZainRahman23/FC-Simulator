# PI-1 Revision 2 (REV2): handoff contract, outcome-neutral promotion selector, articulated stand-in tackler, demotion gate. PREREGISTRATION (frozen before any REV2 code or run)

**Source:** `../../sources/2026-10-09_user_decision_pi1_revision2.md`.

**Status:** frozen at the commit that adds this file. Later changes are recorded amendments (§11).

**Unchanged:**
- V2, F0 (F1 unadopted) and the Jolt configuration;
- V1.3 (5042230) and its records;
- the authoritative outcomes;
- the 30 mm / 10 mm limits, except the semantically equivalent window statement in §5.4;
- the neutrality requirement;
- the presentation animation: no smoothing or repair.

## 1. The new lead-in contract (replaces CG-7's post-promotion matching)

**Before promotion.** Simulation-authoritative locomotion drives the presentation normally.

**At the promotion frame k_p.** The F0 body is initialized from the currently visible presentation pose, plus the authoritative linear motion, within the strict handoff gate (§2).

**After promotion.**
- The physical body evolves causally from the promoted state. Rendering shows the physical body.
- No future presentation pose, flag or rate is a physical target.
- The ordinary presentation trajectory is kept read-only as a reference trace for diagnostics only.

**Controls while promoted** (all are functions of the current physical state, the frozen promotion pose and the current authoritative simulation state):
- **posture tone (§6.1):** toward the joint configuration of the promoted pose;
- **finite recovery authority B (§6.2):** toward the authoritative root trajectory;
- **the stand-in tackler (§5):** follows the authoritative slide.

**Rendering while promoted.**
- Mapped rig bones take their rotations from the V2 bodies (PI-1 §5 physics → render).
- Unmapped rig bones (toe, hands, neck, clavicles) keep their **handoff** local rotations, frozen, with no future authored motion.
- The rendered toe is raised minimally if it would penetrate the turf. This is presentation-only.

## 2. Handoff gate HG (at k_p; every row must hold; all thresholds frozen)

**Mapping.**
- The frozen **R-K** knee: PM-2 was not adopted under REV1 §5.
- **RF-1** foot reconciliation (REV1 §4): a contact foot's minimal pitch to y = 0 within the ankle hard ROM.
- Because rendering shows physics from the handoff, there is **no blend**. P-5 is restored as a hard row: the physical foot vs the visible foot ≤ 5°.

| row | quantity | tolerance |
|---|---|---|
| P-1 / P-2 | pelvis position / orientation | ≤ 10 mm / ≤ 2° |
| P-3 | trunk / head orientation | ≤ 3° |
| P-4 | hip, knee, ankle centres | ≤ 10 mm |
| **P-5** | foot orientation, physical (reconciled) vs visible | ≤ 5° (any reconciliation pitch beyond 5° fails) |
| P-6 / P-7 | limb direction / twist | ≤ 2° / ≤ 10° |
| P-8 | elbows / wrists | ≤ 15 mm |
| P-9 | each foot the presentation holds in contact: physical F0 lowest point | in [−5, +2] mm. **An unsupported stance (toe pivot beyond the rigid boot's reach) fails.** |
| P-10 | any other body | ≥ −5 mm |
| P-11 | rendered rig boot + toe penetration | ≤ 10 mm |
| P-12 | joint configuration: no hard-ROM clamp | ≤ 1e-6° |
| P-13 | self-collision (allowed pairs) | ≤ 10 mm |
| P-14 / P-15 | every body, feet included: linear / angular velocity vs the presentation (A2 definitions, 60 Hz) | ≤ 0.25 m/s / ≤ 2.0 rad/s |
| P-16 / P-17 | whole-body COM velocity / angular momentum vs the presentation | ≤ 0.05 m/s / ≤ 10 % (floor 1 kg·m²/s) |
| **HG-A** | mapped whole-body horizontal COM velocity vs the authoritative root velocity at k_p | ≤ 0.05 m/s |
| **HG-T** | the stand-in is instantiable at k_p: the slide leg's extension is complete (launch time τ ≥ extT) | — |
| HG-D | deterministic reconstruction: identical state from two independent constructions | — |

**HG-A, the declared exception.** If HG-A holds, the residual is removed by one uniform horizontal velocity shift of all bodies, which is part of the single declared state write. It is never more than 0.05 m/s.

**Initial velocities.** PI-1 §6.2: the 2nd-order backward difference of the same mapping at k_p, k_p − 1 and k_p − 2, propagated from the pelvis through the tree.

## 3. Promotion selector PS-2 (one deterministic, outcome-neutral rule)

**Inputs** (only):
- the current authoritative state;
- the authoritative planned trajectories: the runner's planned path and the slide's committed kinematic law;
- the predicted geometric contact computed from those plans with the simulation's own runner segments and tackler primitives;
- the compatibility of the presentation along the planned path (the presentation is a deterministic function of the planned authoritative trajectory).

**Never read:** any reaction, event class or impulse.

**The window** W = [k_t, k_end]:
- k_t = the PI-1 §6.1 trigger: the first row with d_pred ≤ 0.25 m, unchanged.
- **Predicted contact** (the first sub-step at which the planned runner segments and tackler primitives overlap, contact tick T): **k_end = T − 2**, the last state before the contact tick.
- **No predicted contact:** k_end = (the row of the planned closest approach, minimum surface distance) − 1.

**Offline evaluation.** In the AIR records, the pre-contact LOCO rows and sub-step geometry **are** these planned trajectories and their presentation, because nothing has interacted yet. The selector evaluates them and nothing after k_end.

**The rule.** k_p = the **latest** k ∈ W at which HG holds. If none holds, the candidate has **no valid promotion** and is rejected.

**Recorded:** the lead time from k_p to the predicted contact (or the closest approach), and HG at every k ∈ W.

## 4. Scan (item 6): every V1.3 candidate (20 rx + 6 defending), unchanged records

**Per candidate:**
1. Run the selector (§3).
2. Construct the promoted state (§2) and the stand-in (§5).
3. Run the PI-1 REV2 simulation in state PRE (§6) from k_p, until the first physical runner ↔ stand-in contact. Continue to the predicted contact + 0.10 s; for no-contact cases, to k_end + 12 ticks.

**Reported:**
- the valid promotion frame (yes / no);
- the lead time;
- the HG metrics;
- foot support;
- initial momentum error (P-16 / P-17 / HG-A);
- tackler correspondence (§5.4);
- predicted (gameplay) vs realized (physical) contact segment / location / time;
- the rejection reason.

**Correspondence criteria on the realized physical contact** (thresholds unchanged):

| | criterion |
|---|---|
| CG-1 | the first physical contact of the stand-in with the runner is on the mapped body: foot_X / toe_X → F0 foot_X; shin_X → shank_X; thigh_X → thigh_X; pelvis → pelvis; torso → abdomen / thorax. The adjacent body is accepted if the contact point is ≤ 30 mm from the shared joint. |
| CG-2 | support state at the decisive sub-step, both legs: simulation planted = presentation contact flag at the bracketing rows = the **physical** F0 boot state (≤ 5 mm planted, ≥ 15 mm airborne) |
| CG-3 | \|t_physical first contact − t_sim\| ≤ 1 tick |
| CG-4 | horizontal distance between the simulation contact point and the physical contact point ≤ 0.10 m, and the same region along the segment (±0.25; A2 axes) |
| CG-5 | overlap of the same physical order. The physical runner pose at the first physical contact (or at t_sim if there is none), held, against the simulation's primitives over [t_sim, t_sim + 0.10 s]: max penetration of the mapped region ÷ the simulation's max unperturbed overlap ∈ [1/3, 3]. This is the original CG-5 semantics with the physical pose. |
| CG-6 | physical contact normal vs the simulation normal (horizontal) ≤ 45°; relative velocity at the contact point (stand-in − runner) vs the simulation's ≤ 45° |
| CG-8 | physical self-penetration ≤ 10 mm over [k_p, t_sim + 0.10 s] |
| NM | no-contact cases: no physical runner ↔ stand-in contact; the simulation records none; the predictor fired; HG passed at k_p |

**Classes, counted separately:**
- NEAR MISS (no contact);
- RECOVERABLE / STUMBLE (final CORRECTION or STUMBLE);
- PLANTED-LEG FALL (decisive FALL contact on a planted segment).

**Selection** (unchanged rule): the original triple if each passes, otherwise the first passing fixture in file order (rx, then defending).

## 5. Articulated stand-in tackler AST-1

1. **Segments.**
   - **TORSO:** every slide primitive except the leg (V1.2 far rule: BODY, TRUNK, TUCK, TUCKSHIN; other rules: BODY).
   - **LEG:** the slide leg (far rule: THIGH + LEG; other rules: LEG).
   - Each segment is one dynamic Jolt body made of the simulation's own capsules (radii and axes from `ptRxTacklerPrims` at k_p, in that segment's frame). It sits on the world's no-ground object layer: it collides with the runner and not the turf. Gravity factor 0. Contacts are recorded as obstacles.
2. **Masses.** The recorded tackler mass m_T; LEG = the simulation's own leg mass fractions (PT_REACT.mFrac foot + shin + thigh = 0.2365) × m_T; TORSO = the rest. Inertia comes from the segment's capsules at uniform density. Finite and movable.
3. **Kinematics** (the authoritative slide only; nothing invented or tuned).
   - At each physics step, each segment's authoritative pose = the rigid (Kabsch) fit of that segment's capsule endpoints at k_p to the simulation's recorded primitive endpoints at the current sub-step (squad time k + n/4). Positions are interpolated linearly between sub-steps for the 240 Hz steps.
   - Velocity = the first difference; acceleration = the second difference of the fitted poses.
   - **Drive** (PI-1 §7 law per segment):
     - (i) a state-independent feed-forward force m·a_auth and yaw torque I_zz·α_auth;
     - (ii) a capped tether: a SixDOF PositionAndVelocity constraint to the ground, at 2 Hz, ζ = 1 for that segment's mass, toward the authoritative pose and velocity; roll / pitch locked. Its caps are the PI-1 §7 caps (334 N per axis, 82 N·m yaw) scaled by the segment's mass fraction.
   - No joint couples the segments: the simulation's own leg law (the hip fixed in the slide frame while the body turns) is not a rigid-link chain.
   - The stand-in reads no outcome and writes no gameplay state.
4. **Tackler correspondence.**
   - **The 10 mm discontinuity criterion is retained,** with its implemented metric: the maximum change of per-sub-step displacement of any primitive endpoint. Its window starts **at promotion**: [k_p, contact + 2 ticks]. In the frozen design that window started at the PI-1 promotion (the trigger); under REV2, promotion is k_p. This is the same criterion over the stand-in's existence.
   - **Added (stricter):**
     - **AST-C1:** before the first physical contact, every stand-in capsule endpoint is within **10 mm** of the simulation's primitive endpoint (tracking error, fit residual included).
     - **AST-C2:** the realized physical contact passes CG-1 / CG-3 / CG-4 / CG-6 (§4).

## 6. Physics while promoted (the PI-1 plant: G2 world, passive layer, actuators; 240 Hz; 150 / 2; plane turf; v2k knee; ankle K 0.13)

1. **Posture tone.** The SLP driver form (PI-1 §8):
   - **Targets:** the joint rotations of the promoted pose, held constant; in FALL, frozen at the physical pose of the fall transition.
   - **Gains:** stance / swing by the **physical** foot contact (any boot ↔ turf manifold in the last step), with the 0.03 s blend.
   - **Gravity statics:** subtree weight minus the equal share of the physically contacting feet, at their sole centroid.
   - **Velocity feed-forward:** none (constant targets).
2. **B, finite recovery authority.** The SupportLayer, a turf ↔ pelvis SixDOF spring at 2 Hz, ζ = 1, with the caps of PI-1 §8: horizontal 274.95 N, vertical +1161.2 / −193.5 N, torque 81.80 N·m.
   - **Target:** the authoritative root position and velocity, interpolated, at the promoted pelvis height and orientation; yaw follows the authoritative facing / velocity direction.
   - **Never:** a presentation pose.
   - **Release:** completely at the authoritative FALL transition (α = 0).
3. **States:**

| state | entry / exit |
|---|---|
| PRE | entered at promotion; exits to IMPACT at the first physical contact, or (near miss) to RECONCILE once the envelope has passed |
| IMPACT | from first contact to 0.10 s after the last contact |
| RECONCILE | until the demotion gate (§7), or T_rec = 0.5 s → failure |
| FALL | the authoritative fall transition: B released, posture frozen, momentum preserved. Handoff per PI-1 §9.2. |

## 7. Demotion gate DG (near miss / recoverable)

**Demotion requires all of these:**
- (a) no runner ↔ stand-in contact for ≥ 2 ticks;
- (b) rendered pelvis within 10 mm and 2° of stream A's pelvis;
- (c) whole-body COM velocity within 0.05 m/s of stream A's material COM velocity, and pelvis velocity within 0.25 m/s;
- (d) every foot stream A holds in contact is physically loaded (≥ 20 N).

**Pose.**
- If every rig joint is within 10 mm (PI-1 §9.1 (a)) and within 0.20 m/s, the switch needs **no blend**.
- Otherwise the rendered pose blends from the physical pose to stream A over **T_d = 0.20 s** (smoothstep), presentation-only. The authoritative trajectory is never moved.
- **Reported:** the spatial, velocity, orientation and pose discrepancies at demotion; the time from interaction end to demotion; whether a blend was needed; the maximum rendered joint speed during the blend vs stream A's.

**Failure:** if DG is not reached within T_rec.

## 8. PI-1 (only if every class has ≥ 1 candidate passing §4)

**Setup.**
- One representative per class, frozen.
- **PI-1 amendment 1 (REV2)** is committed before any PI-1 physics run. It cites V1.3, the profile, the F0 body, HG, PS-2, AST-1, §6 and §7.
- **Order:** near miss → recoverable → fall. Stop at the first architectural failure (PI-1 §14).

**Criteria:** PI-1 §11, with these REV2 readings:

| criterion | REV2 reading |
|---|---|
| PR-1 / PR-3 / PR-4 / PR-5 | as frozen, at k_p |
| **PR-2** | the first rendered frame's joint displacement within 3 mm of the displacement over the **last presented frame** (k_p − 1 → k_p): velocity continuity without reading a future presentation frame |
| NM-3 / RC-5 | **replaced** by DG (§7) |
| RC-4 | pelvis height ≥ 0.85 × stream A's and tilt within 20°, as an outcome-consistency check against the authoritative CORRECTION / STUMBLE (comparison only, never a target) |
| everything else | unchanged |

**Also recorded:** CPU, per PI-1 §13.

## 9. Robustness (only if all three PI-1 cases pass)

Preregistered separately before it runs: small timing / location / body-geometry perturbations. Then stop before broader integration.

## 10. Hard stops

**Stop and identify the smallest remaining blocker,** with no automatic Revision 3, if:
- any class has zero passing candidates in §4;
- or PI-1 meets an architectural failure.

## 11. Amendments

### A1 (before any scan output): which contacts the correspondence criteria compare

**The question.** Several candidates have more than one gameplay contact. rx_free_leg, for example: a CORRECTION on foot_L at 50.25, then the class-deciding STUMBLE on toe_R at 59.75.

**The decision.** As in PI1_COMPAT_GATE §1, the criteria apply to the **decisive** gameplay contact: the first contact whose reaction equals the case's final class.

**Mechanics.**
- **The physical counterpart:** the first physical runner ↔ stand-in contact at or after t_dec − 1 tick. If there is none, CG-1 / 3 / 4 / 6 fail.
- **The selector window (§3) is unchanged.** It ends before the **first** predicted contact, so promotion always precedes the first interaction.
- **Also reported, not gating:** the earliest gameplay contact vs the earliest physical contact.

### A2 (before the full scan; found in a 2-case smoke test): the definition of a physical contact

**The defect, a tooling one.** My first scan counted a stand-in ↔ runner contact only when a manifold's depth exceeded −0.5 mm, the G1 "touching" convention.
- Jolt resolves fast closing contacts through **speculative contacts**. The impulse is applied while the bodies are still millimetres apart: about 19 mm of closing per step at 4.5 m/s.
- So that test missed real collisions. In rx_behind_standing it missed a 7.47 N·s impulse on the slide leg from the runner's shank_R, at the gameplay contact time.
- It also wrongly attributed the post-impact deflection to AST-C1 tracking error.

**The definition (measurement only; no physics change).** A physical contact occurs in a step when a stand-in segment receives a contact impulse ≥ 1e-3 N·s (linear) or ≥ 1e-3 N·m·s (yaw).
- **The impulse:** the segment's momentum balance, m·Δv − F_ff·dt − (the tether motor impulse read back from the constraint), and the yaw equivalent. The no-contact floor measured 0 to printed precision.
- **Attribution:** to the deepest stand-in ↔ runner manifold of that segment in that step, speculative included. Its runner body, points and normal are the contact's.

**Consequences.**
- AST-C1 is evaluated before the first such contact.
- NM requires no such contact.
- The smoke-test outputs (rx_behind_standing, rx_miss) were made with the defective detector and are superseded.

### E1 (POST-SCAN erratum; it changes no class count and re-gates nothing): CG-6 relative velocity is the approach velocity

**The defect, a measurement one.** The scan evaluated CG-6's physical relative velocity (stand-in point − runner point) from the state **after** the first contact step. By then Jolt had already applied that step's contact impulse, so the relative velocity was largely arrested.
- rx_side_standing: 0.32 m/s, mostly tangential, after a 17 N·s impulse.
- Its direction does not describe the approach.

**The correct reading.** PI1_COMPAT_GATE CG-6 is an "approach direction" criterion, and the simulation's own relative velocity is the approach velocity. So the physical value is read from the state **before** the first contact step: the previous step's state, or the promoted state if contact occurs in the first step.

**Values.**

| case | as run (post-impulse) | approach |
|---|---|---|
| rx_behind_standing | 18.1° | 0.8° |
| rx_facing_front | 3.9° | 0.0° |
| rx_side_standing | **74.3° (fail)** | 0.0° |

Source: `diagnostics/cg6_prestep_and_discontinuity_location.json`.

**Effect.** No class count or representative changes. rx_side_standing still fails the retained 10 mm criterion (10.8 mm), and the other two keep their verdicts.

**Records.** The as-run values stay in `scan_rev2_rx.json`. This erratum was written after the scan results were seen and is labelled as such. Reported in `PI1_REV2_RESULTS.md` §5.2.
