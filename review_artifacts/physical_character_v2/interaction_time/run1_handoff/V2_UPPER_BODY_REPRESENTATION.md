# V2 upper-body representation for the LV2 → V2 handoff: investigation (10 Oct 2026, read-only, for review; nothing adopted)

**Source:** `../../sources/2026-10-10_user_instruction_v2_upper_body_mapping_anatomy.md` (a7a5bfb3).
**Builds on:** `RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT_R2.md` (6a0cf340), verdict B, whose blocker was V-a.

**Scope:**
- The frozen Locomotion V2 baseline, LV2-STATE-1, the simulation, gameplay geometry and gait clocks are untouched.
- The frozen V2 body specification is **not modified**. Every body-spec alternative here is an in-memory hinge relocation, evaluated kinematically.
- No physics step, no bridge, no collision.

**Tools:**
- `lv2/upper/v2_upper_alt_probe.mjs` (14 alternatives);
- `v2_upper_alt_summarise.mjs`;
- `lv2_local_rates.cjs`.
- Outputs are in `lv2/upper/out/`. The probe was run twice and is deterministic: identical output once wall-clock timings are removed.
- The LV2 source is a `git archive` of tag `locomotion-v2-straight-baseline-1` (4a226b1f), as in R2.

## 0. Answer

**Classification: D, a combination: a mapping fix plus a small body-spec change. Extra articulation (C) is not justified.**

**1. Physics is primarily a mapping problem (A).**
- The single largest error in R2 came from the **velocity reference**, not the anatomy.
- Fix: project the rig's own bone velocities (exported by LV2) onto V2 in the kinetic-energy metric, instead of differentiating a pose that copies bone rotations onto V2's differently placed hinges.
- With V2 unchanged, that alone cuts the ALL-OUT per-body velocity error from 0.52 to 0.14 m/s, momentum error from 4.9 to 1.8 N·s, and angular-momentum error from 30 % to 4 % (max values).

**2. Visible continuity and the frozen geometric rows need a small body-spec change (B).**
- At FAST RUN and ALL-OUT, no mapping on the existing anatomy keeps the visible velocity pop within PR-2's 0.18 m/s while also passing the frozen pose rows. The fits fail P-8 (arm) at every instant; copy mappings fail P-12 (shoulder range).
- The cause: V2's **lumbar and thoracic hinges** (50 and 58 mm from the rig's spine and chest joints) and its **elbow** (11.6 mm proximal). They make the physical and visible articulations differ.
- Placing those three joint centres where the runner's record has them clears every requirement at all four speeds. This is the rule `PI1_RUNNER` already applies to the hips, knees, ankles, shoulders and arm length, which is exactly why the lower body transfers exactly.
- Mass, COM, inertia, colliders and ranges stay unchanged.

**3. A clavicle (C) buys only the last margin.**
- At the ALL-OUT shoulder, the visible pop falls from 0.17 to 0.00 m/s.
- There is no momentum or inertia gain (ΔP 0.54 vs 0.47 N·s; residual KE 0.13 vs 0.15 J).
- The cost: two bodies, two joints, a new mass partition, new range and actuator definitions, about +14–16 % physics per step, and new gates.

**4. The ALL-OUT shoulder exceedance (≤ 1.34°) is a copy-mapping artefact.** Folding the clavicle angle into V2's shoulder causes it. Every fitted mapping stays 1.0–6.1° inside V2's hard range, so no range change is needed.

**Recommendation (one):** the **"record-hinged" runner, alternative D12n**.

| element | what changes |
|---|---|
| topology | V2's 14 bodies, unchanged |
| joint anchors | **lumbar → the rig's spine joint (−40 mm in height, +30 mm anterior); thoracic → the rig's chest joint (−43 mm, +39 mm); elbow → the rig's elbow (+11.6 mm distal)**. The neck stays: moving it gains nothing (§2.2) |
| mass properties | masses, COMs, inertias, colliders and ranges stay where they are (hinge-only) |
| mapping | the kinetic-energy-metric pose fit inside V2's hard range, pelvis and legs as now |
| velocities | V-d: the kinetic-energy projection of the rig material's velocities, with pelvis and leg rates fixed |
| render | rotation retarget; the τ₀ local rotations of the clavicles, neck, hands and toes are held and blended out |

**Expected handoff errors with the recommendation** (p50 / max over one stride, 240 instants; the 6–22 late-toe-pad instants per speed where the frozen RF-1 foot rule is discontinuous are excluded, as in R2):

| | LOW 3.0 | JOG 5.5 | FAST RUN 7.8 | ALL-OUT 9.5 |
|---|---|---|---|---|
| hip / knee / ankle | 0.0001 mm · 0.0000 m/s | 0.0002 · 0.0000 | 0.0002 · 0.0000 | 0.0002 · 0.0001 |
| shoulder (mm) | 7.5 / 10.4 | 6.6 / 8.6 | 5.9 / 7.1 | 5.5 / 6.5 |
| elbow (mm) | 3.5 / 5.6 | 3.9 / 6.2 | 3.6 / 5.7 | 3.6 / 5.4 |
| wrist (mm) | 1.1 / 1.8 | 1.2 / 2.1 | 1.3 / 2.3 | 1.3 / 2.6 |
| hand tip (mm; the static 10° wrist flexion, held as a render offset) | 29.1 / 30.1 | 29.1 / 30.1 | 29.3 / 30.4 | 29.4 / 30.6 |
| trunk / head points, max (mm) | 1.0 / 3.5 | 0.9 / 4.7 | 0.6 / 4.7 | 0.7 / 4.6 |
| per-body COM velocity error (m/s; P-14 0.25) | 0.040 / 0.049 | 0.051 / 0.066 | 0.061 / 0.083 | 0.069 / 0.093 |
| per-body angular velocity error (rad/s; P-15 2.0) | 0.24 / 0.37 | 0.29 / 0.43 | 0.38 / 0.57 | 0.49 / 0.67 |
| \|ΔP\| (N·s; ÷ 73.9 kg = COM velocity) | 0.12 / 0.43 | 0.21 / 0.48 | 0.24 / 0.43 | 0.25 / 0.47 (≤ 0.0065 m/s) |
| \|ΔL\| about the COM, relative (P-17 0.10) | 0.004 / 0.057 | 0.001 / 0.038 | 0.002 / 0.038 | 0.002 / 0.049 |
| unrepresented kinetic energy (J) | 0.009 / 0.074 | 0.016 / 0.123 | 0.027 / 0.141 | 0.034 / 0.148 |
| **visible velocity pop**, shoulder / elbow / wrist / hand / head, max (m/s; PR-2 0.18) | 0.10 / 0.03 / 0.02 / 0.05 / 0.06 | 0.12 / 0.04 / 0.04 / 0.07 / 0.08 | 0.15 / 0.05 / 0.06 / 0.11 / 0.09 | **0.17** / 0.05 / 0.07 / 0.13 / 0.09 |
| instants with any arm / head point > 0.18 m/s | 0 / 234 | 0 / 228 | 0 / 224 | 0 / 218 |
| frozen geometric rows P-1 … P-13 | pass | pass, except P-9 (stance foot: R2 open question 3) | same | same |
| hard-range margin, min (°) | 5.03 | 3.15 | 1.73 | 1.03 |
| self-separation, true min (mm; P-13 −10) | 76.5 | 40.3 | 32.4 | 22.2 |
| one-shot mapping cost per handoff (ms, unoptimised JS) | 2.1 + 3.5 | 2.1 + 3.6 | 2.1 + 3.7 | 2.4 + 4.1 |

**What is not adopted.** This needs a **new runner spec id** carrying the three anchors as record overrides, plus a re-run of the frozen V2 gates. The quiet-stance gravity moment about the moved joints changes by 10.6 N·m (lumbar) and 9.2 N·m (thoracic), so V2's validated posture behaviour must be re-checked. Per the instruction, I stopped before modifying the V2 body specification.

## 1. Method

**The reference: the rig's material, carried with V2's own masses.**
- Each V2 body's bind COM and orientation are attached to the rig bone that carries it: abdomen ↔ spine, thorax ↔ chest, head ↔ head, upper arm ↔ upperArm, forearm ↔ foreArm, legs ↔ thigh / shin / foot.
- Rig and V2 binds coincide at the hip midpoint: gap 0.0 mm, rig bind rotations identity.
- The reference twists come straight from LV2's exported bone linear and angular velocities, with no differencing.
- Every alternative is measured against this one reference, with V2's frozen mass model.

**Alternatives.** The lower body is always the frozen PI-1 mapping, so its exactness is a check, not an assumption.

| | mapping | hinges |
|---|---|---|
| A0 | frozen copy mapping | frozen |
| A1 | joint-point fit | frozen |
| A2 | kinetic-energy-metric fit: mass-weighted COM + inertia-weighted orientation, within V2's hard range | frozen |
| B1 / B2 / B12 | copy mapping | trunk / elbow / both relocated to the rig's joints |
| C | copy mapping | B12 + a kinematic clavicle (thorax → rig sternoclavicular joint → rig shoulder) |
| D | A2 fit | elbow relocated |
| D12 | A2 fit | trunk + neck + elbow relocated |
| **D12n** | A2 fit | lumbar + thoracic + elbow relocated |
| D12t / D12l | A2 fit | elbow + thoracic only / lumbar only |
| D1z / D1y | A2 fit | elbow + trunk front-back offset only / heights only |

**Velocity fields:**
- **k:** the V-d kinetic-energy-metric projection of the reference twists onto the alternative's pose, with pelvis and leg joint rates fixed. This is the main field.
- **m:** the derivative of the alternative's own mapping (R2's construction).
- **kPL:** k with total P and L forced exactly.

**Visible velocity pop.** Positions are made continuous by the render. The pop is the velocity jump under a declared render rule:
- **Rotation retarget:** the rig's forward kinematics with its own bone lengths. Mapped bones take their V2 body's angular velocity. Unmapped bones (clavicle, neck, hand, toe) hold their τ₀ local rotation.
- Holding is the rule consistent with field k: continuing the clavicle's own motion as well double-counts it, because k already folds the clavicle-driven shoulder motion into the thorax and arm rates (measured, `out/summary_velocity_k.txt`).
- A position-carried rule is also reported. The criterion in both cases is PR-2, 3 mm per frame = 0.18 m/s.

**Frozen tolerances only:**
- PCG P-1 … P-13 (geometry);
- P-14 0.25 m/s, P-15 2 rad/s, P-16 0.05 m/s, P-17 10 % (kinematics, against the material reference);
- PR-2 0.18 m/s;
- V2's hard ranges.
- For the frozen PCG kinematic definition, see §6.

## 2. The reported causes, one by one

### 2.1 The velocity reference: a new finding, and the largest single effect

R2 differentiated the copied pose. Copying bone rotations onto hinges that sit elsewhere gives the bodies the right angular velocity but the wrong linear velocity.

| ALL-OUT, frozen V2 (A0) | per-body COM velocity, max | \|ΔP\| max | \|ΔL\| max (rel) | unrepresented KE max |
|---|---|---|---|---|
| R2 construction (m) | 0.518 m/s | 4.92 N·s | 0.302 | 0.75 J |
| kinetic-energy projection of the material velocities (k) | 0.141 m/s | 1.76 N·s | 0.038 | 0.23 J |

This is a pure mapping-contract change. The pose still matters: A0-k's arms stay 23–31 mm off and its visible pop reaches 0.40 m/s.

### 2.2 Lower-back / upper-back / neck joint positions (50–60 mm)

**Bind gaps:** lumbar ↔ spine 49.8 mm; thoracic ↔ chest 57.7 mm; neck ↔ head 60.2 mm.

**Two components with different effects:**
- **Front-back** (V2's hinges sit 30–39 mm behind the rig's): trunk twist turns about different vertical lines. That costs momentum and linear velocity.
  - At ALL-OUT, moving only that component (D1z) gives ΔP max 0.56 vs D's 1.80 N·s, and body velocity 0.095 vs 0.142 m/s.
- **Height** (40–43 mm) costs mainly visible angular continuity. D1y: shoulder pop 0.20 vs 0.26 m/s.
- **Both are needed.** D1z still has 55 / 218 ALL-OUT instants over 0.18 m/s, and D1y has 91.

**Both hinges are needed:**
- Thoracic only (D12t): 36 / 218 ALL-OUT instants over 0.18 m/s, ΔP 1.17 N·s.
- Lumbar only (D12l): 48 / 218, ΔP 0.99.
- Both (D12n): 0 / 218, ΔP 0.47.

**The neck is not needed.** D12n and D12 are equivalent: head ≤ 4.7 vs ≤ 4.6 mm, head pop ≤ 0.09 vs ≤ 0.10 m/s, 0 instants over 0.18 for both.

**Why the change is principled.**
- V2's spinal joint centres are lumped approximations at de Leva segment boundaries, with an **[ENG]** front-back offset (`v2_human.js` `spineAP`).
- The rig's are the visual articulation.
- Neither is a measured joint. Putting the physical hinges where the visible mesh bends is what makes physical motion displayable without a pop.
- Masses stay on de Leva's partition.
- The cost: the trunk now pivots 30–39 mm further forward. That shifts the quiet-stance gravity moment by 10.6 N·m at the lumbar joint and 9.2 N·m at the thoracic joint, so the V2 gates must be re-run.

### 2.3 The clavicle

**Measured** (`out/lv2_local_rates.txt`):
- the clavicle's local rotation is 1.6–5.0°, up to 17 mm at the shoulder;
- its **local angular velocity is 0.75 / 0.88 / 1.11 / 1.25 rad/s** at the four speeds, which is 0.14 / 0.17 / 0.21 / 0.24 m/s at the shoulder;
- the hand has **no** local motion (a constant 10.0° wrist flexion);
- the neck's local angular velocity reaches 0.64–1.52 rad/s.

**Without a clavicle body:**
- The pose fit absorbs the shoulder **position**: the shoulder residual is ≤ 6.5 mm at ALL-OUT, against an upper-arm collider whose shoulder sphere has radius 52.8 mm.
- The projection absorbs most of the **velocity** into the thorax and upper-arm rates. The visible shoulder pop is ≤ 0.17 m/s with D12n.

**C, the exact ceiling:**
- zero pose and pop error at the arm;
- no gain in momentum (ΔP 0.54 N·s at ALL-OUT, vs D12n 0.47) or energy (0.13 vs 0.15 J);
- the clavicle-driven arm momentum is at most ≈ 0.85 N·s per arm (3.61 kg × 0.237 m/s), 0.12 % of the runner's 702 N·s (73.9 kg × 9.5 m/s);
- its physical case would be shoulder-charge compliance, which V2 deliberately lumps ("glenohumeral + girdle, centre fixed in the thorax"). Nothing here measures it.
- **Not justified now.**

### 2.4 The 11.6 mm shorter upper arm

- The shoulder-to-wrist chains are equal (0.589 m; `armScale` from the record), so the **wrist** is reproducible either way.
- The **elbow** is not. Without the elbow move (A2): elbow 16.7 / 20.1 mm and elbow pop up to 0.23 m/s at ALL-OUT.
- With it (D12n): 3.6 / 5.4 mm and ≤ 0.05 m/s.
- Physical effect: the forearm's transverse inertia about the elbow falls from 0.0862 to 0.0791 kg·m² (−8 %), and the horizontal gravity moment by 0.19 N·m.

### 2.5 The ALL-OUT shoulder joint-range exceedance (≤ 1.34°)

- It exists only under copy mappings, which fold the clavicle angle into V2's shoulder: A0's raw shoulder is beyond V2's hard range by up to 0.07° at FAST RUN and 1.34° at ALL-OUT, then clamped (P-12).
- Every fit stays inside: minimum margin 2.85° (A2) and 1.03° (D12n) at ALL-OUT. The binding axis is adduction (hard 0°).
- Clavicle-relative angles (C) stay 3.4–5.0° inside.
- Separately, all alternatives, including C, exceed V2's **active** shoulder range by up to 3.5–5.2° from JOG upward. That is the runner's own arm swing (baseline limitation 9). The hard range holds.
- **No range change is needed.**

## 3. All alternatives at FAST RUN and ALL-OUT (`out/comparison_7.8_9.5.md`; full four-speed tables in `out/summary_velocity_{k,m,kPL}.txt`)

| ALL-OUT 9.5 | shoulder / elbow / wrist max (mm) | body v max (m/s) | ΔP max (N·s) | visible pop sh / elb / wr max (m/s) | instants > 0.18 | geometric rows failing (excl. P-9) | range margin (°) |
|---|---|---|---|---|---|---|---|
| A0 frozen | 23.0 / 31.0 / 31.0 | 0.141 | 1.76 | 0.30 / 0.29 / 0.40 | 212 / 218 | P-12 58, P-8 19 | 0 (clamped) |
| A2 fit, frozen hinges | 8.0 / 20.1 / 11.3 | 0.170 | 1.72 | 0.26 / 0.23 / 0.30 | 172 | P-8 218, P-3 5 | 2.85 |
| A1 point fit | 8.2 / 13.5 / 5.4 | 0.158 | 1.68 | 0.26 / 0.22 / 0.24 | 143 | P-8 218, P-3 132 | 4.82 |
| B12 copy, record hinges | 16.6 / 17.7 / 17.2 | 0.071 | 0.47 | 0.18 / 0.09 / 0.08 | 0 | P-12 58, P-8 19 | 0 (clamped) |
| D fit + elbow | 8.4 / 8.2 / 3.7 | 0.142 | 1.80 | 0.26 / 0.22 / 0.22 | 143 | P-8 63 | 1.86 |
| D12t / D12l | 6.4 / 5.6 / 2.6 · 7.9 / 7.8 / 3.6 | 0.103 · 0.128 | 1.17 · 0.99 | 0.21 · 0.22 (shoulder) | 36 · 48 | none · P-8 23 | 1.15 · 1.82 |
| **D12n (recommended)** | **6.5 / 5.4 / 2.6** | **0.093** | **0.47** | **0.17 / 0.05 / 0.07** | **0** | **none** | **1.03** |
| C clavicle ceiling | 0 / 0 / 0 | 0.057 | 0.54 | 0 / 0 / 0 | 0 | (P-12 inherited from the frozen pose object; its own clavicle-relative margin is 3.37°) | 3.37 |

- At FAST RUN, D12n has 0 / 224 instants over 0.18, the maximum pop is 0.15 m/s at the shoulder, and no geometric row fails (excluding P-9).
- Forcing P and L exactly (kPL) **worsens** per-body velocity and visible pops: D12n ALL-OUT 0.182 m/s and 71 instants over 0.18; A2 0.374 m/s and 194.
- So the projection's own small P and L residual (≤ 0.5 N·s; ≤ 5 %) is the better trade. Any authority correction to P belongs to HG-A v2 (R2 Q2).

## 4. Lower-body exactness (the user's priority)

- **Kept in every alternative:** hip, knee and ankle points ≤ 0.0002 mm and ≤ 0.0001 m/s at all four speeds.
- The upper-body changes are downstream of the pelvis.
- In V-d, the pelvis twist and the leg joint rates are held at the frozen mapping's values as direct constraints on the generalized velocities.

## 5. Collision, mass, cost

**Self-collision.**
- True minimum separations are 76 / 40 / 32 / 22 mm for D12n (A0: 80 / 36 / 27 / 19 mm). There is no interpenetration.
- The frozen separation routine flags 1–3 isolated instants per speed as "touching (depth 0)" across alternatives, the copy mappings included. Their neighbours 2–3 ms away are 64–92 mm apart, so the flags are false positives (§6).

**Mass, COM, inertia.**
- Recommended hinge-only form: body masses, world COMs and inertias about the COM are **unchanged**; whole-body totals are unchanged.
- The joint-relative quantities do change: the COM offsets from the moved hinges, the forearm inertia about the elbow (−8 %), and the gravity moments (+10.6 / +9.2 N·m quiet stance).
- If the generator re-segmented de Leva on the record's landmarks instead, segment COMs and inertias would change too. Not recommended.

**Physics / CPU cost.**
- D12n has the same body, joint and collider counts, so the per-step physics cost is unchanged (ITS-1: 643–683 µs per 240 Hz step).
- The one-shot handoff cost is ≈ 6 ms in unoptimised JS (numerical-Jacobian fit plus a dense V-d solve); optimisable.
- C would add 2 bodies and 2 joints: an estimated +90–110 µs per step (+14–16 %), scaled from ITS-1's split of Jolt ≈ 290 µs and passive + actuator ≈ 300–330 µs.

## 6. Frozen-tool findings (reported, nothing changed)

1. **PCG P-14 … P-17's reference misplaces V2's mass.** `pcg_f0` `kinRows` attaches V2's `comLocal` to the **rig's** joint.
   - At bind that reference sits 49.8 / 57.7 / 60.2 / 11.6 mm from V2's actual abdomen / thorax / head / forearm COM.
   - It therefore scores fidelity to "V2's mass moved onto the rig's joints with copied rotations", not to the material.
   - Evidence: even the exact-arm ceiling C passes it at only 45 % of ALL-OUT instants. D12n passes it at 94 / 96 / 95 / 56 % (ALL-OUT P-14 max 0.31 m/s).
   - The material-reference rows use the same thresholds; D12n passes them at every instant (max 0.093 m/s).
   - **Whether to correct the PCG reference is your decision.** I have not used the discrepancy to relax anything.
2. **PCG P-17 inertia frame.** P-17 rotates ω by the bind-relative rotation before applying the canonical-frame inertia. For the arms, whose bind is 90° from canonical, the principal axes are swapped. The effect is small (arm inertia ≈ 0.02 kg·m²).
3. **`bodySep` false overlaps.** Single isolated instants return "overlap, depth 0" between bodies that are 64–92 mm apart at the neighbouring instants.

## 7. Does V2 need a one-to-one representation of the 23 presentation bones? **No.**

**What the physical body must represent:**
- where the mass is (body COMs within a few mm; collider placement well inside collider radii);
- momentum and angular momentum;
- the kinetic-energy distribution;
- contact geometry;
- joint limits.

The 23 bones include a root (authority), hair (no mass), toes (R2 Q3, the foot question, outside this upper-body scope), a neck (lumped into the head), clavicles (lumped into the thorax plus shoulder by V2's design) and hands (rigid on the forearm).

**Proposed physical mapping contract for the 14-body V2 (not adopted):**
1. **Lower body.** The frozen mapping, exact at hip, knee and ankle.
2. **Upper-body pose.** The joint-consistent V2 configuration inside the hard range that minimises the kinetic-energy-metric distance (Σ m_i |Δc_i|² + θ_iᵀ I_i θ_i) to the rig material each body represents. The pelvis is fixed.
3. **Upper-body velocity (V-d).** The kinetic-energy projection of the rig material's twists, taken from LV2's exported bone velocities, never from a differenced mapped pose. Pelvis and leg rates are fixed.
   - P and L are preserved by the metric, not forced (§3).
   - The authoritative momentum correction (HG-A v2) is a separate, later step.
4. **Presentation-only motion, absorbed by the render.** Clavicle, neck, wrist and toe local rotation, plus static offsets (the 10° wrist flexion).
   - Rotation retarget with held τ₀ local rotations, blended out over T_b. Static offsets are held permanently.
5. **Legitimacy test for absorbing a motion by skinning.** All three must hold:
   - (a) its momentum and energy are negligible against the representation residual: here ≤ 0.85 N·s per arm and ≤ 0.15 J;
   - (b) its geometric effect after the fit is well inside the collider sizes: ≤ 6.5 mm at the shoulder vs a 52.8 mm shoulder sphere;
   - (c) the visible velocity pop at the mapped joints stays within PR-2 (0.18 m/s) under the declared render rule.
   - Anything with mass or contact consequence (trunk and arm COMs and their velocities, collider placement) must be physical.

The clavicle passes (a) and (b) everywhere. It passes (c) once V2's trunk and elbow hinges coincide with the rig's (D12n), but not on the frozen anatomy (A2: 172 of 218 ALL-OUT instants over 0.18).

## 8. Decisions for you (nothing started)

1. **Adopt the record-hinged runner (D12n)?** This means a new spec id with lumbar, thoracic and elbow anchors from `rig.json`, plus a re-run of the frozen V2 gates. If no, the alternative is the frozen anatomy plus the A2 mapping: physically adequate, with visible pops at JOG and above (§3).
2. **Adopt the mapping contract (§7)?** That covers the kinetic-energy-metric pose fit and the V-d velocity reference from the rig's material velocities.
3. **The PCG kinematic reference** (§6.1): keep it as frozen, or correct it to the material reference.
4. **Clavicle articulation:** not recommended. Revisit only if shoulder-impact behaviour (a collision-response question) is found to need girdle compliance.

## 9. Files (`lv2/upper/`)

**Probes:**
- `v2_upper_alt_probe.mjs`
- `v2_upper_alt_summarise.mjs`
- `lv2_local_rates.cjs`

**Outputs** (`out/`):
- `v2_upper_alt_probe.json.gz` (every instant, every alternative)
- `v2_upper_alt_probe_stdout.txt`
- `summary_velocity_{k,m,kPL}.txt`
- `comparison_7.8_9.5.md`
- `lv2_local_rates.txt`
- `determinism.txt`
