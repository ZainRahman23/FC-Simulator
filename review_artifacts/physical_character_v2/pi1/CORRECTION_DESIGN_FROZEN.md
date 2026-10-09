# Compatibility correction: frozen derivations (Option 1 + Option 2) and promotion tolerances

**Source:** `../sources/2026-10-09_user_decision_option1_option2_correction.md`.

**Status:** **FROZEN at the commit that adds this file.** At that point:
- no character-derived gameplay collider code existed;
- no V2 toe body code existed;
- no corrected fixture had been run;
- no corrected outcome had been seen.

Every dimension below comes from the character records or the V2 specification, never from a tackle outcome. Later changes are recorded amendments (§7).

## 1. Gameplay runner collision geometry: CHARCOLLIDE-1 (Option 1; a new simulation baseline)

**Scope:**
- **Changed:** the runner's leg and foot segments in the simulation's tackle-contact body model (`pt_react.js` `ptRxBody` / `ptRxSegments` and every caller), for any player whose character has a frozen collision profile.
- **Unchanged:** pelvis / torso capsules, the slider's V1.2 primitives, the stride clock and the reaction / balance law.
- **No profile:** the legacy model, unchanged.

**Profile.** Per character, a frozen data file generated deterministically by a tool from:
- `assets/characters/outfield/<id>/rig.json`: bones (name, parent, offsetLocal, bindDirLocal, lengthM), legLenM, hipHeightM, ankleHeightM, footwear bounds, configSha256;
- the character's V2-F1 physical body (§2): thigh / shank collider radii and boot-section heights / widths.

**Landmarks** (where the segments are at a time offset dt):
- **Phase:** the simulation's own stride clock, unchanged: phase = gaitPhase + dt·cad/2, cad = v / (G.step·leg_sim). The presentation uses the same clock.
- **Pose:** `ofLocoCycle(skel_char, ofLocoParams(v), phase, { lean: 0, turnRoll: 0, twist: 0, lastBob: b })`. This is the shared pure locomotion law on the character's own skeleton.
  - The skeleton is built from the frozen bones by the presentation's own pure builder logic (`ofCharSkeleton`), as a simulation-owned object.
  - b = `_bob` of the same cycle evaluated at the end of the most recent stance (pure).
  - Below the idle-blend speed, the presentation's idle blend is applied with the same formula (wGait).
  - **No presentation state is read.**
- **Root:** `gkRootMatrix(x + vx·dt, y + vy·dt, dir)`, with dir = the velocity direction above 0.3 m/s, otherwise facing (as before).
- **FK:** `skelFK` gives the hip (thigh origin), knee (shin origin), ankle (foot origin), MTP (toe origin) and toe tip (toe bone tip). The heel point is the foot frame · (0, −ankleH, −heelBack), with heelBack from the footwear minimum z.

**Primitives** (sim coordinates; all radii from the V2-F1 colliders of the same character):

| segment | axis | radius | source |
|---|---|---|---|
| thigh_X | hip → knee | tapered: proximal 0.048·H, distal 0.034·H | V2 thigh collider (`v2_colliders.js`) |
| shin_X | knee → ankle | tapered: frustum radii (proximal / distal) | V2 shank collider (volume-matched frustum) |
| foot_X (rear foot) | heel-end centre → MTP-end centre, each at height r above the sole plane (foot frame); the heel-end centre sits r ahead of the heel point | heel end r_h = min(½ heel width, ½ boot height at the heel); MTP end r_m = min(½ ball width, ½ boot height at the MTP) | V2-F1 boot sections (§2): inscribed |
| toe_X | MTP-end centre → tip-end centre (r_t behind the tip, r_t above the toe sole) | r_t = min(½ toe-box width, ½ toe-box height) | V2-F1 toe-box section: inscribed |

- Capsules are **inscribed** in the physical colliders, so gameplay can never claim a contact the physical body does not have.
- **Reaction model segment kinds:** foot_X and toe_X → "foot" (the foot's mass / transmission fractions); shin_X → "shin"; thigh_X → "thigh". The `planted` rule is unchanged: the stride law, up < G.stance.

**Old → new geometry:** a table with the source of every number is generated with the profile (`CHARCOLLIDE_PROFILE.md`).

**Neutrality.** The model is a pure function of authoritative state and frozen data. Animation ON / OFF must give identical gameplay. That is gated after implementation.

**Baseline.** A new branch `prototype/slide-contact-v1.3-charcollide` from e2c98ec, as a new versioned baseline. Committed locally only.

## 2. V2-F1 toe body for the D-1 runner: D-1F1 (Option 2)

This implements the spec's own F1 design (§12.3 "foot + forefoot, MTP hinge") as a default-off leaf extension. **The V2-REF and every existing hash are unchanged** when it is off.

**From the record** (rig.json @ f5f6076 / e2c98ec, identical):

| quantity | value |
|---|---|
| boot heel | 0.0808 m behind the ankle joint (footwear min z) |
| boot tip | 0.2752 m ahead (footwear max z) |
| MTP hinge | 0.1805 m ahead of the ankle joint, 0.031 m above the stud plane (toe bone bind origin) |
| hinge axis | transverse (foot-local X), as the rig's toe bone flexes |

**Unchanged:** boot width / height profile (V2 anatomical), sole stack, toe spring, materials. Only the length and break are mechanically required.

**Boot.**
- The V2 boot hull outline uses the record's heel and tip, with the MTP break made transverse at the hinge.
- It is split at the hinge plane into a rear part (foot body) and a front part (toe body).
- Rear: the D1a grid, AP planes at 20 / 40 / 60 / 80 % × ML 2 = 10 pieces. Front: AP [0.5] × ML 2 = 4 pieces.
- Material: boot.

**Mass.**
- Foot + boot mass, COM and inertia are unchanged in total. V2 colliders never contribute mass, so the anatomical foot segment stands.
- The toe body takes **16.5 %** of foot + boot mass (V2 spec §12.3: forefoot 15 – 18 %, midpoint).
- Its COM is the front hull's vertex centroid. Its inertia is a solid box of the front hull's bounding extents.
- The foot body is the remainder: combined COM unchanged; inertia by parallel-axis subtraction, which must stay positive definite or the extension stops.

**Joint mtp_X** (foot → toe, at the hinge):
- One DOF (flexion about foot-local X). The other two rotations are locked.
- **Range:**
  - dorsiflexion (toe up) active 0 … 60°, hard 70°;
  - plantarflexion active 30°, hard 35°;
  - ROM centre at 15°.
  - Source: V2 spec §12.3, "DF 0 – 60° (gait 42°, heel rise 58°, ≈ 65° needed), PF 0 – 30°".
- **Passive:**
  - a neutral spring of **0.75 N·m/deg** about 0° (spec range 0.5 – 1.0, midpoint);
  - critically damped against the toe's own inertia about the hinge, c = 2·√(K·I);
  - V2's standard end-range law at the limits.
- **No actuator** (passive-only axis). The spec's optional toe-flexor actuator is not added.
- **Disabled pair:** foot–toe (parent–child).

**Regression before adoption** (body-level only):
- G0 checks on the F1 runner (construction, mass closure, determinism).
- The G1 ESSENTIAL scenarios, F1 runner vs the frozen F0 runner, at the accepted configuration. No new failure is allowed, except where explained by a toe contact that is the intended change.
- Determinism ×2.
- MTP within its hard limits in every scenario.
- Energy passivity unchanged.

**Stop conditions:**
- material regression;
- a non-positive-definite split;
- or needing to change anything outside the foot / toe leaf (that would be "substantial redesign").

## 3. Promotion pose mapping: PM-1 (presentation → D-1F1)

- **Pelvis:** rig pelvis rotation. Position puts the V2 hip-centre midpoint at the rig thigh-origin midpoint.
- **Thigh / shank (preserved knee solution R-K):**
  - The thigh direction is the rig hip → knee.
  - The flexion axis is the normal of the rig's hip – knee – ankle plane, with its sign from the rig thigh's flexion axis.
  - The shank direction is the rig knee → ankle.
  - Below 10° of knee bend, it blends to the rig thigh's twist.
- **Foot:** the rig foot bone rotation. The 3-DOF ankle absorbs the twist difference.
- **Toe:** the rig toe bone rotation, giving the MTP flexion.
- **Projection:** parent-first onto each joint's hard range (locked axes dropped), as before. Projection residuals are recorded.
- **Not used:** no R-B pitch fix, no frame selection, no vertical shift. If a contacting foot or toe cannot be placed within tolerance, that is a failure.

**Velocities at promotion:** the second-order backward difference of the same mapping, propagated through the tree (PI-1 §6.2).

## 4. Promotion tolerances (frozen; evaluated over every frame of the three candidate trajectories' promotion windows and their reconciliation windows)

| quantity | tolerance |
|---|---|
| pelvis / root position | ≤ 10 mm |
| pelvis orientation | ≤ 2° |
| trunk / head orientation | ≤ 3° |
| hip, knee, ankle, MTP joint centres (V2 vs rig) | ≤ 10 mm |
| toe tip (V2 vs rig) | ≤ 15 mm |
| foot orientation | ≤ 5° |
| toe orientation | ≤ 5° |
| thigh / shank long-axis direction | ≤ 2° |
| twist about a limb's long axis | ≤ 10° |
| elbows / wrists (rendered) | ≤ 15 mm |
| foot or toe the presentation holds in contact | V2 lowest point within [−5, +2] mm of the pitch |
| any non-contacting body | ≥ −5 mm (no penetration beyond slop) |
| joint-limit margin | ≥ 0 at every joint (no hard limit exceeded) |
| self-collision | ≤ 10 mm penetration |
| linear velocity, per body vs the presentation's material point | ≤ 0.25 m/s |
| angular velocity, per body vs the presentation's bone | ≤ 2.0 rad/s |
| whole-body COM velocity | ≤ 0.05 m/s |
| whole-body angular momentum | ≤ 10 % |

**A frame fails** if any item fails. Promotion compatibility requires **every** evaluated frame to pass. There is **no frame selection** (your instruction).

## 5. Rebaseline, fixture search and gate

**Runs, on the new baseline:**
- every existing rx fixture, plus the frozen near-miss rule;
- also the existing defending slide fixtures (`of_def_scenarios.js` slides), if the rx space lacks a category.

**Categories:**
- (1) no contact;
- (2) a recoverable contact: CORRECTION or STUMBLE from a contact;
- (3) a planted / weight-bearing-leg contact producing FALL.

**Selection rule** (PI1_COMPAT_GATE.md §5): the original pair if it qualifies, otherwise the first qualifying fixture in file order. Every fixture tried is reported.

**Gate:** PI1_COMPAT_GATE.md (ab9a626), thresholds **unchanged**, including the 30 mm shared-joint adjacency. The D-1F1 body is posed by PM-1. Segment mapping: foot → foot (rear boot) / toe (front boot) as recorded, shin → shank, thigh → thigh.

## 6. Stop points (yours)

Stop before PI-1 if:
- the character-derived colliders still cannot map to the promoted body;
- F1 needs substantial V2 redesign;
- promotion cannot reproduce running poses without pop / impulse;
- the corrected simulation cannot supply suitable cases;
- relevant V2 integrity regresses.

Otherwise: freeze the baseline, amend and refreeze PI-1, and stop for review before implementing the three promotion cases.

## 7. Amendments

None at freezing.

**Status, 2026-10-09 (added, design text unchanged):**
- No amendment.
- The §2 regression **failed** on energy passivity (G1 1.2a / 1.2b in drop1m and leanF). No principled fix was found inside the foot / toe leaf. Both global solver alternatives fail other integrity rows.
- The toe work is **stopped** under the overnight instruction (`../sources/2026-10-09_user_instruction_overnight_autonomy.md` §0 / §6).
- Nothing here was implemented beyond the default-off F1 code.
- See `f1/F1_TOE_FAILURE_REPORT.md`.
