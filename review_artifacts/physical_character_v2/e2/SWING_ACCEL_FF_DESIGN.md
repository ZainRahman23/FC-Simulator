# Swing-foot servo: acceleration feed-forward (D1) — derivation, written before implementation

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_D1.md`).

**Scope:** one additive feed-forward term in the existing torque assembly of a non-supporting leg. No new gain, no bandwidth change, no change to the trajectory, the apex, T, the measured-liftoff semantics or any threshold.

## 1. The existing finite-torque swing servo (`ctrl/v2_stand.js`, `sim/v2_actuation.js`)

**Per actuated axis i of a leg joint k:** the controller requests an implicit PD,

  τ = clamp( τ0 − (D + dt·K)·ω_rel,i ,  activation × capacity ),   τ0 = τ_ff,i + K·e_i + (1 − s)(D + dt·K)·ω*_i,

with:
- **K, D:** for an airborne leg, the swing servo gains K = I_k·ωn², D = 2ζ·I_k·ωn, where I_k is the distal subtree's inertia about the joint, ωn = 2π·4 Hz, ζ = 0.8;
- **e_i:** the error to the IK target of the swing pose;
- **ω*_i:** the target's joint velocity (the velocity feed-forward `lcVff`);
- **τ_ff,i = T_k · axis_i:** the projection of the **inverse-statics** wrench T_k = Σ_{b ∈ sub(k)} (c_b − p_k) × m_b (A − g) (plus contact wrenches). This holds the distal subtree as if every body accelerated with the whole-body COM acceleration A.

**What is missing:** nothing accounts for the swing leg's own acceleration relative to that common acceleration. For one joint, the closed-loop error obeys I_k ë + D ė + K e ≈ −I_k q̈*. A smooth reference therefore leaves a lag e ≈ −q̈*/ωn².
- It is proportional to the reference acceleration.
- It is the ~6 mm lag measured in the B1 smoke: up to 6 mm below the reference while rising, above it while descending.

## 2. Established practice

**Computed-torque (inverse-dynamics) feed-forward** (Luh, Walker & Paul 1980; Craig, *Introduction to Robotics*, ch. 10; Siciliano et al., *Robotics*, §8.5):

  τ = M(q) q̈_d + C(q, q̇_d) q̇_d + g(q) + K e + D ė.

**Resolved-acceleration / operational-space form** for a Cartesian reference ẍ_d of an end effector with Jacobian J: q̈_d = J⁻¹(ẍ_d − J̇ q̇_d). Floating-base swing controllers (IHMC, BLF / walking-controllers) apply the same task-space acceleration feed-forward inside their whole-body QPs.

**Touchline's analogue:** the leg already has a square 6 × 6 foot-pose Jacobian (the posture IK's own: hip 3, knee flexion, ankle 2; the twist DOFs held as in the IK). Its gravity part is already the statics term. The feed-forward we need is the **inertial part of the Newton–Euler inverse dynamics of the swing subtree**, written in the same wrench-about-the-joint form as the statics so that it projects onto the actuated axes exactly as τ_ff does.

## 3. Derivation

**1. Rigid-body model.** The controller's own spec: segment masses m_b, COM offsets in body frames, inertias I_b about the COM. Body origins coincide with the proximal joints (verified: 0.4 µm).

**2. Kinematics.** The leg chain from the pelvis frame (the same staged forward kinematics as the IK, `legChain`) gives, as functions of the 6 solved coordinates x:
- each swing body's COM c_b(x) and rotation R_b(x) (thigh, shank, foot);
- the foot pose (origin p_f, rotation R_f).

**3. Desired joint motion.** From the commanded Cartesian swing reference (position, velocity v_ref, acceleration a_ref, angular velocity ω_ref, angular acceleration α_ref — the analytic trajectory, never a differentiated target or measurement), at the IK solution x* of the current target:
- J_f(x*) ẋ_d = [ v_ref − v_pelvis ; ω_ref ];
- J_f(x*) ẍ_d = [ a_ref − A ; α_ref ] − J̇_f ẋ_d.

The pelvis is taken as translating with the common acceleration A already in the statics, and its rotation is neglected. Its angular rate and acceleration are small; feedback and the existing pelvis-motion velocity feed-forward handle them.

**4. Segment accelerations relative to that frame:**
- a_b = J_c,b ẍ_d + J̇_c,b ẋ_d;
- α_b = J_ω,b ẍ_d + J̇_ω,b ẋ_d;
- ω_b = J_ω,b ẋ_d.

The products J̇ ẋ_d are second directional derivatives of the kinematics along ẋ_d. They are computed by central differences of the same forward kinematics, as the IK computes its Jacobian.

**5. Inverse dynamics about each leg joint k** (Newton–Euler, summed over the distal bodies, in the statics' convention: the wrench the parent applies to the child):

  ΔT_k = Σ_{b ∈ sub(k)} [ (c_b − p_k) × m_b a_b + R_b I_b R_bᵀ α_b + ω_b × (R_b I_b R_bᵀ ω_b) ].

Adding ΔT_k to T_k turns every swing body's effective acceleration from A into A + a_b. That is exactly the computed-torque M q̈_d + C q̇_d for the leg, in the statics' own wrench form. It is projected onto each actuated axis (including the locked-axis knee rule `lockedAxisFF`) like the statics.

**6. Blending and authority:**
- The term is weighted by (1 − s), the same continuity weight as the velocity feed-forward: zero on a supporting leg, full on a non-supporting one.
- It is applied only while a swing target **and** its analytic reference are supplied for that leg in that tick.
- It enters τ0, so the actuation layer's activation × capacity clamp, the implicit damping and Jolt's contact and joint limits remain authoritative. It writes no state and cannot move the foot directly.

**7. Free parameters: none.** No gain is introduced or chosen. The modelling choices are listed in step 3 and limitation 2 below.

## 4. What it should and should not do (checked in validation)

- **Removes the acceleration-proportional lag.** The regression of the tracking error on q̈*/ωn² should drop from about −1 to about 0.
- **Remaining error comes only from model mismatch:**
  - passive tissue torques;
  - the held twist DOFs;
  - pelvis acceleration ≠ A and pelvis rotation;
  - the implicit-damping discretisation;
  - capacity clamps.
- **Must not:** create energy (the ledger closure rule), oscillate, introduce contact impulses, or change behaviour with the physics rate.
- **Torque demand stays far below capacity:** the earlier estimate of the inertial hip torque for the E2 swing is 4–7 N·m against 148–228 N·m.

## 5. Implementation boundary (not a different architecture)

- A controller option `swingAccFF` (default off): one additive wrench per leg joint in the existing loop, plus a kinematics helper returned by the existing `legChain` (no change to its existing outputs).
- The commanding code supplies the analytic reference: the E2 sequencer, or the servo-validation harness.
- Configuration **PSTAR5C** = PSTAR5B + `swingAccFF`.
- The default path and every earlier configuration stay bit-identical.

## 6. Known limitations, stated in advance

1. **Pelvis rotation and acceleration ≠ A** are not in the feed-forward.
2. **The passive ankle foot ab/adduction and the knee axial twist are held** (as in the IK). Their inertial coupling is in the segment terms but not driven.
3. **Feed-forward requested at saturation is clamped.** Validation reports saturation.
4. **In contact (TOUCHING / TOUCHDOWN before acceptance), the term follows (1 − s) like the velocity feed-forward.** A commanded acceleration against the turf is resisted by contact, which stays physical.
