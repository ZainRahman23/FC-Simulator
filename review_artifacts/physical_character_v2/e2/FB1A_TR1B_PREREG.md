# 1A floating-base angular compensation and 1B command-level near-contact transition: PREREGISTRATION

**Authority:** user decision 2026-10-06, `../sources/2026-10-06_user_decision_1A1B_touchdown_timing.md` (verbatim), Decision 1 and the order of work ("1. Preregister 1A/1B. 2. Implement and validate them. … If either correction fails substantively, stop.").

**Preserved, unchanged:**
- the AB and AB2 evidence and verdicts (A + B qualified under AB2);
- T-1;
- the execution-feasibility work;
- every threshold, actuator capacity and gain;
- the 30 mm apex;
- recovery issue C.

Default and off paths must stay bit-identical. Everything is local; nothing is pushed.

**Freeze, in two steps:**
1. This document (design and criteria) is committed **before** the 1A / 1B code is written.
2. Before any battery run, a second commit adds the implementation (default-off) together with:
   - the harness `tools/fb_val.mjs`;
   - the correctness check `tools/fb1a_check.mjs`;
   - the evaluator `tools/fb_eval.mjs`;
   - the runner `scripts/run_fb_val.sh`;
   - the run list `FB_RUN_LIST.json`.

   Any detail the implementation forces that differs from this text is added there as a disclosed, dated amendment (§7), before any battery run.

## 0. Known before freezing (design-sizing counterfactuals; no behaviour change)

**Method.** A scratch copy of the AB harness wrapped the controller's D1 call and evaluated, at the same state, both:
- the existing D1;
- the floating-base completion of §1.

It also recorded:
- pelvis ω;
- the backward-difference pelvis angular acceleration α̂;
- the per-joint velocity feed-forward parts (rP, rT, ω*) and the actual joint rates.

**Runs:**
- configuration PSTAR5CHAB;
- V2-198-92 R-L (both legs; 180 / 240 / 480 Hz);
- V2-REF R-F, R-L, H-T45 (240 Hz), H-D (480 Hz), C-F13 (180 Hz);
- V2-165-62 C-L5 (240 Hz).

**Checks:**
- the wrapped run reproduces the AB identity hash (V2-REF L 240 R-F b63184da);
- the scratch D1 with zero pelvis motion equals the controller's D1 exactly (max difference 0).

**Evidence:** `evidence_fb_design/` (scripts, text outputs, `sizing_runs.tgz`; `coordinator_smoke_ankle_saturation.txt` for finding 4, where `rl.json.gz` is the smoke3 run).

**Findings:**

1. **Size of the missing floating-base terms in free swing:**
   - pelvis |ω| ≤ 0.74 rad/s and |α̂| ≤ 12 rad/s² before φ 0.8;
   - the completion changes the D1 wrench by ≤ 1.6 N·m at the hip and ≤ 0.16 N·m at the knee, about 5 – 15 % of D1 (6 – 21 N·m);
   - at the ankle the change is ≈ 0, because the foot's inertia is small;
   - tick-to-tick change of the added term ≤ 0.54 N·m.
2. **The swing foot's own contact corrupts α̂.** After the first contact, α̂ reaches 18 – 47 rad/s². That would add 21 – 55 N·m to the hip D1, with per-tick jumps of 16 – 49 N·m, an E1a-7 violation by itself.
   - The first contact report precedes the force build-up: in V2-198-92 L 240 R-L, Fz is 0 at the first touching tick and 269 N three ticks later, and α̂ at the touching tick is still the free-swing value.
3. **The world foot angular velocity at contact is already small under A + B with the E2 reference:** ≤ 0.037 rad/s in V2-198-92 L 240 R-L, while the pelvis turns at 0.5 – 0.6 rad/s. The joints track ω* to within 0.02 – 0.06 rad/s.
4. **The coordinator-draft foot pitch (finding 3a of `TOUCHDOWN_COORDINATOR_DESIGN_STOP.md`), revisited.**
   - Re-examined runs (preserved in `evidence_td_design/`): smoke3; smoke5 V2-198-92 L R-L at 180 / 240 Hz; smoke5 V2-REF H-D.
   - In each, the foot's angular speed rose above 0.1 rad/s (to 0.30 – 0.47 rad/s) during and after an interval in which the swing ankle's dorsiflexion row sat at its **activation-limited bound** (the actuator's `sat`), while delivering only 2 – 4 N·m. A torque reversal was faster than the excitation dynamics.
   - The 480 Hz smoke run shows a tick-alternating foot angular velocity instead.
   - The stop report's attribution to a missing pelvis angular-acceleration feed-forward is therefore **not supported**. Because the ankle's share of the 1A terms is ≈ 0, 1A is not expected to remove that finding.
5. **Near-contact commanded-torque rate.** The swing hip's velocity feed-forward change was decomposed into (gain change) × ω*, gain × ΔrP and gain × ΔrT. Case: V2-198-92 L 180 R-L, the AB-4a case, 40.6 N·m at 1 tick before the first touching tick.
   - **Before contact (a = 1):** gain × ΔrP 23.0 + gain × ΔrT 14.7. The hip's ω* reverses (−1.47 → +0.15 rad/s in 14 ticks) as the pelvis yaw / roll rate reverses and the reference decelerates. With the implicit actuator the commanded τ0 changes at **(D + dt·K)·q̈\***. **The gain blend contributes nothing here.**
   - **After contact:** the impact jolts the pelvis, and gain × ΔrP reaches −33 / −26 N·m / tick at ticks 2 – 3.
   - The gain-blend term (gain change) × ω* never exceeds 4.5 N·m / tick.
   - The AB report's description of F-AB1 ("D blends swing → hold, multiplying ω*") therefore overstated the blend's share. The blend is real, but small. The dominant terms are the approach law's own reference acceleration (pelvis rotation plus target deceleration) through the swing damping, and the impact-driven measured-frame jolt.

**Consequence for the design (stated before freezing):**
- 1B is implemented as decided: complete-command blending, no isolated pelvis-motion contribution weighted by the gain blend, and certification.
- A transition construction cannot change the commanded rate **before** contact (σ = 0) or the shared measured-frame jolt **at** the impact. Under the existing E2 approach, residual E1a-7 violations of those kinds are expected on V2-198-92 R-L.
- §5 therefore separates:
  - (a) what 1B owns: the construction and the transition term, which are **gated**;
  - (b) the aggregate certification over the possible-contact interval. That interval is defined only by the touchdown timing of Decision 2, which does not exist yet. Under the existing E2 approach this is **reported with attribution**, and becomes **gating in the coordinator battery** with 1A / 1B in place.

  This is the AB2 ownership logic applied to a region whose definition belongs to the next stage. It is flagged for the user's review.

## 1. 1A: floating-base angular compensation in the frame-consistent swing-foot task conversion

Option `d1FloatBase` (default false; requires `swingAccFF`).

**Where.** `swingAccWrench`, the resolved-rate / resolved-acceleration conversion of the world-space swing reference. Velocity level:
- the servo's velocity reference ω* = rP + rT is already frame-consistent;
- rP is the joint rate of the same world target seen from the previous **actual pelvis frame**, position and orientation, so it already contains the pelvis angular velocity, including ω × r;
- it is **not** changed.

**Definitions.**
- The pelvis rigid-body state: COM c_p, COM velocity v_p, angular velocity ω_p (Jolt state, not differentiated) and an angular-acceleration estimate α_p.
- r_f = p_f − c_p.
- Relative (pelvis-frame) quantities are evaluated, as now, along the IK chain at the current frame orientation and expressed in world.
- Jacobian columns: J_v, J_ω (foot task point) and J_c,b, J_ω,b (segment b).
- Bias terms: the existing second-difference terms J̇ẋ at a fixed frame.
- v_rel = J_v ẋ; ω_rel = J_ω ẋ.

**Resolved rate:**

J_f ẋ = [ v_ref − v_p − ω_p × r_f ;  ω_ref − ω_p ]

**Resolved acceleration:**

J_f ẍ = [ a_ref − A − α_p × r_f − ω_p × (ω_p × r_f) − 2 ω_p × v_rel − J̇_v ẋ ;  α_ref − α_p − ω_p × ω_rel − J̇_ω ẋ ]

**Segment kinematics for the Newton–Euler wrench (world):**
- a_b = α_p × r_b + ω_p × (ω_p × r_b) + 2 ω_p × v_rel,b + J_c,b ẍ + J̇_c,b ẋ, with r_b = c_b − c_p;
- α_b = α_p + ω_p × ω_rel,b + J_ω,b ẍ + J̇_ω,b ẋ;
- ω_b = ω_p + ω_rel,b.

The wrench formula is unchanged: ΔT_k = Σ (c_b − p_k) × m_b a_b + I_b α_b + ω_b × I_b ω_b.

**No double counting:**

| term | why it is not counted twice |
|---|---|
| A | The statics already carries the common linear acceleration A for every segment, which is why A is subtracted (unchanged convention: the pelvis linear acceleration is the balance model's commanded A). The angular terms are new. The statics contains no rotation |
| J̇ẋ | Evaluated at a fixed frame, so it contains no transport term |
| velocity feed-forward | (D + dt·K)·ω* is a damping reference (velocity-error law), not an inertial torque |
| B | Compensates passive tissue damping on the reference rate, not inertia |
| passive layer | Joint-relative tissue torques only |

With ω_p = α_p = 0 the expressions reduce exactly to the existing D1.

**The α_p estimate.**
- α̂ = (ω_p(t) − ω_p(t − dt)) / dt, the backward difference of Jolt's exact pelvis angular velocity: the mean angular acceleration of the last solver step, one step late.
- It is used **only** while the swing foot is genuinely free:
  - lifecycle state AIRBORNE;
  - no touching pieces this tick;
  - no contact reported since the swing's measured liftoff (a per-leg latch, set on any touch in AIRBORNE / TOUCHDOWN / LOAD_ACCEPT and cleared at LIFTOFF or SUPPORT).
- Otherwise α_p = 0: the balance model's angular acceleration, as the LIPM assumes. This is the same convention as A.
- Rationale (§0.2): once the foot touches, α̂ contains the foot's own contact impulse. That is not a free-space base motion, and the free-space conversion does not apply to it.
- The switch-off step equals the pre-contact α-term (≤ 2 N·m measured) and is reported (1A-3).
- This is the one place where a differentiated measurement enters D1 (whose design note said "never derived from differentiated targets or measurements"). The decision requires the pelvis angular acceleration, which is not measurable otherwise. The deviation is explicit, and is bounded to the contact-free interval.

## 2. 1B: command-level near-contact transition

Option `lcTransition: "cmd"` (default false; requires the lifecycle and `lcVff` "lin").

**What is removed.** Today, after TOUCHDOWN, the airborne weight a separately blends each of these factors, and the command takes products of the blended factors (cross terms):
- the frame height;
- the target;
- the hip / knee gains;
- A's damping weight w_A = a·c on the pelvis-motion rate rP.

In particular, (D_a + dt·K_a)·rP(w_A = a·c) multiplies an isolated pelvis-motion contribution by the gain blend.

**What replaces it** (for a non-supporting leg whose lifecycle entered TOUCHDOWN): two **complete** command laws, each internally coherent.

| law | weight | frame | target | gains | velocity reference | feed-forward |
|---|---|---|---|---|---|---|
| **approach** | the a = 1 law | actual pelvis | the commanded swing target, as supplied by the commanding script; frozen at its last value if cleared while σ < 1 | swing | ω*_app = rP(w_A = c) + rT | D1 (with 1A if enabled); B on (rT + c·rP) |
| **accommodation** | the a = 0 law | contact frame (height min(posture target, actual)) | the lifecycle's own contact-compatible target at a = 0, the landed hold (`target(n)` with no swing target and a = 0), with the configuration's existing vertical semantics | G3 hold gains for hip / knee | ω*_acc = rP(μ0) | no D1, no B |

Both laws use:
- the ankle's swing gains (unchanged rule);
- identical statics feed-forward (shared, appears once);
- identical support-weight (s) blends.

**Aggregate, per actuated axis:**
- τ0 = τ_shared + (1 − σ)·(τ0_app − τ_shared) + σ·(τ0_acc − τ_shared);
- K = (1 − σ)·K_app + σ·K_acc;
- D = (1 − σ)·D_app + σ·D_acc.

The actuator applies τ = τ0 − (D + dt·K)·ω, affine in (τ0, K, D). So the applied torque equals the σ-blend of the two laws' applied torques: **each law's velocity-error law stays coherent with its own gain.** No gain-dependent term is moved outside its gain.

**σ, the transition weight (one per leg):**
- σ_nom = 1 − a, the lifecycle's own debounced measured-contact weight. It starts at the TOUCHDOWN entry (first relevant Jolt contact, debounced), and is a smoothstep over the lifecycle's `accept` time.
- σ follows σ_nom subject to a **certifying governor**. Per tick, σ is the value closest to σ_nom in the interval between σ_prev and σ_nom such that, for every actuated axis of the leg, |τ0(σ) − τ0_prev| ≤ L_cmd = 30·240/hz N·m. That is the E1a-7 commanded limit; τ0_prev is the previously issued command.
- If no such value exists (the laws' own change already exceeds the limit at σ_prev), σ = σ_prev and the tick is logged as a stall.
- **The transition term therefore never contributes to a commanded violation, by construction.**
- A smooth σ alone is not assumed safe.

**Engagement:**
- 1B engages at the swing foot's TOUCHDOWN entry. At the engaging tick the approach law's previous frame and target are the pre-contact ones. The accommodation law's previous frame is computed (not used) on every tick while the option is on, so its rP is defined on the first engaged tick.
- On a bounce (AIRBORNE again), σ_nom = 1 − a falls back toward 0 under the same governor. 1B disengages when σ = 0 = σ_nom, where the approach law is identical to the existing a = 1 law.
- 1B also disengages at SUPPORT, or once σ = 1, a = 0 and the swing target has been cleared. In those cases the accommodation law is identical to the existing law.
- **Before engagement nothing changes:** every command is bit-identical to the configuration without 1B.
- Liftoff (the a-ramp from contact to airborne) is not part of this decision and is unchanged.

**Ledger** (recording only): per engaged axis:
- σ, σ_nom;
- both laws' (τ0, K, D) and their parts (statics, D1, K·e, velocity feed-forward split into rP and rT, B);
- the stall flag.

## 3. Configurations, harness and matrix

**Configurations:**

| name | definition |
|---|---|
| BASE | PSTAR5CH (reference for the AB2 relative criteria) |
| AB | PSTAR5CHAB |
| AB+F | PSTAR5CHABF = AB + `d1FloatBase` |
| AB+T | PSTAR5CHABT = AB + `lcTransition: "cmd"` |
| AB+FT | PSTAR5CHABFT = both |

**Harness `tools/fb_val.mjs`:** a versioned copy of `tools/ab_val.mjs`: the same timeline, trajectories, reachability pre-check, E2 hand-back and post-contact sequence. Recording-only additions:
- foot world ω;
- pelvis ω and α̂, and the α-gating flag;
- the velocities of all sole hull points (v + ω × r);
- the 1B ledger.

**Matrix:**
- the AB2 run list's bodies (8) × legs (2) × rates (180 / 240 / 480 Hz) × trajectories (R-F, R-L, C-F7, C-F13, C-L5, H-T45, H-A40, H-D, H-F15) × 5 configurations = **2,160 runs**;
- from a clean archived tree of the freeze commit.

## 4. Criteria

**Definitions:**
- t1 = the first tick after liftoff with touching pieces on the swing foot; t_nc = t1 − dt.
- Transition region = [t_nc, first SUPPORT of the landed foot), as in AB2.
- **Potential-contact sole points at t1:** the sole hull points within u_dn + d_c = 2.03 mm of the lowest sole point at t1 (the validated downward uncertainty plus the contact-report margin).
- Sets R / C / H pool bodies, legs and rates unless stated.

### G: both (stop if any fails)

- **G-1 identity:**
  - KV0 IDENTICAL;
  - PSTAR5B 99c29491;
  - PSTAR5CH b62309f5;
  - SV-2 V2-REF L 240 R-F 3dd9f13d;
  - AB R-F 240 b63184da;
  - `tools/v2_component_regressions.mjs` 58 / 58.
- **G-2 determinism:** the FB battery's BASE and AB end hashes equal the AB2 records of the same runs (864 runs).
- **G-3 completeness:** all 2,160 runs present, and runtime reachability exclusions identical to AB's.

### 1A (AB+F vs AB, and against BASE where the AB2 contract is relative)

- **1A-0 correctness** (`tools/fb1a_check.mjs`; 8 bodies × 2 legs × 25 seeded random poses, pelvis motions and references):
  - (a) with ω_p = α_p = 0 the 1A wrench equals D1 exactly;
  - (b) along the moving pelvis frame and the joint motion x + ẋt + ½ẍt², the finite-difference world foot velocity, angular velocity, acceleration and angular acceleration equal the reference within 1·10⁻⁴ relative (to max(|ref|, 10⁻³));
  - (c) each joint wrench equals the finite-difference rate of change of the distal subtree's angular momentum about the joint point (at t = 0), minus the common-acceleration part Σ (c_b − p_k) × m_b A, within 1·10⁻⁴ relative.
- **1A-1 AB2 contract retained.** Each AB2 item evaluated for AB+F with the AB2 definitions, against BASE where relative, must PASS:
  - AB-1 (T-1);
  - AB-2 / 3;
  - AB2-4a;
  - AB2-4b;
  - AB-4c;
  - AB-5;
  - AB-6;
  - AB2-7;
  - AB-8;
  - AB-9;
  - AB-10;
  - I-1, I-4 … I-7;
  - L-1;
  - L-2;
  - G-3.
- **1A-2 non-inferiority vs AB** (paired runs; per set; each must hold):
  - (a) foot world angular speed at t1: median and max ≤ AB + 0.01 rad/s;
  - (b) mean tilt error over φ [0.2, t1): pooled mean ≤ AB + 0.02°;
  - (c) potential-contact sole points at t1, max downward normal speed and max tangential speed: median and max ≤ AB + 2 mm/s;
  - (d) swing actuation, liftoff → t_nc: max applied and max commanded Δτ ≤ 1.10 × AB; peak torque fraction ≤ AB + 0.05; longest saturation share ≤ AB + 0.02;
  - (e) tracking: per-bin worst d_low ≥ AB − 0.10 mm; airborne-window β_y ≤ AB + 0.01 per R / C id;
  - (f) energy: Σ+ max ≤ AB + 0.05 J.
- **1A-3 α gating:**
  - α_p ≠ 0 only on ticks with the swing foot AIRBORNE, untouched and unlatched (recorded flag): 0 exceptions;
  - the α-term's switch-off step is reported.
- **1A-4 rate stability:**
  - AB-10's definition for AB+F (included in 1A-1);
  - the paired effects (a), (b), (c) per set and rate are reported.

### 1B (AB+T vs AB)

- **1B-0 identity before engagement:** for every run, the per-tick rows and series of AB+T equal AB's exactly for all ticks before the swing foot's TOUCHDOWN entry.
- **1B-1 construction**, on every engaged tick:
  - (a) closure: the recorded (τ0, K, D) equal the σ-blend of the two laws within 1·10⁻⁹·max(1, |·|);
  - (b) the shared statics part is identical in both laws;
  - (c) 0 ≤ σ ≤ 1, σ moves only toward σ_nom, and never past it.
- **1B-2 transition certified**, on every engaged tick and every swing-leg axis:
  - |Δσ·(τ0_acc − τ0_app)_prev| ≤ L_cmd;
  - every engaged tick with a commanded E1a-7 violation on a swing-leg axis has Δσ = 0 (0 exceptions).
- **1B-3 no regression in the transition region:** per set and per rate, runs with E1a-7 violations (applied or commanded) in [t_nc, SUPPORT): AB+T ≤ AB.
- **1B-4 no regression outside it:** per set, runs with violations outside [t_nc, SUPPORT): AB+T ≤ AB.
- **1B-5 touchdown and support:** each must hold.
  - every run that reaches SUPPORT under AB reaches it under AB+T, and no AB+T run aborts;
  - per set, max over runs of:
    - first contact → SUPPORT time ≤ AB + 0.10 s;
    - landed-foot horizontal slip from t1 to SUPPORT ≤ AB + 1 mm;
    - max penetration of the lowest sole point below the turf ≤ AB + 0.5 mm;
  - rebounds (TOUCHDOWN → AIRBORNE): runs with any ≤ AB.
- **1B-6 energy:** E1a-8 (closure ≤ 0.05 J / tick, Σ+ ≤ 0.5 J, authority 0) for every AB+T run.
- **1B-7 rate stability:** 1B-3 and 1B-4 also hold per rate (180 / 240 / 480).

### FT

AB+FT must satisfy:
- 1A-1;
- 1A-3;
- 1B-0 … 1B-7, with AB+F as the reference.

The interaction is reported.

### Reported, not gated (inputs to the coordinator design)

- **Aggregate certification under the existing E2 approach,** for AB, AB+F, AB+T, AB+FT: E1a-7 violations in the late approach [φ 0.75, t_nc) and in the transition region (runs, max commanded / applied Δτ). Every violating tick is decomposed:
  - into approach-law internal (1 − σ)·Δτ_app, accommodation internal σ·Δτ_acc and the transition term;
  - per law, into statics, D1, K·e, (D + dt·K)·ΔrP, (D + dt·K)·ΔrT and Δ(D + dt·K)·ω*.
- Governor stalls (count, duration) and the σ completion time versus σ_nom.
- The commanded-rate demand of the approach law in the possible-contact band, (D + dt·K)·q̈\*, split into reference and pelvis parts, per body and trajectory. This is the actuation envelope the touchdown-timing certifier needs.
- 1A's added wrench per joint, and α̂ statistics.

## 5. Ownership of the aggregate certification

The decision requires the final aggregate command to be certified against E1a-7 **throughout the possible-contact interval.** That interval is set by the touchdown timing (Decision 2: certified [earliest, latest] contact window). The existing E2 approach defines no such interval, and §0.5 predicts approach-regime and impact-driven residuals that no transition construction can remove.

So:
- 1B's own construction and transition term are gated here (1B-1, 1B-2);
- the aggregate is gated against regression here (1B-3, 1B-4) and reported with attribution;
- **the zero-violation aggregate certification over the certified possible-contact interval is a gating criterion of the coordinator battery**, run with 1A / 1B in place.

If the user rejects this split, the 1B verdict reverts to "aggregate not certified under the existing approach", and the stop rule applies.

## 6. Stop rules

- **G fails:** stop and diagnose.
- **1A fails substantively** (1A-0, 1A-1, 1A-2 or 1A-3): stop.
- **1B fails substantively** (1B-0 … 1B-7): stop.
- **Both pass:** proceed to step 3 (freeze the coordinator design) with the validated envelope. No E2-5 amendment, no PG-1, no official E2 at this stage.

## 7. Amendments (dated, before any battery run)

All of the following were committed with the implementation (freeze step 2), before any battery run.

**A1 (2026-10-07), 1A-0 (b) / (c) tolerance: a like-for-like control.**
- **What happened.** `tools/fb1a_check.mjs` was run during implementation. With the preregistered tolerance applied to the raw finite-difference error, it fails: max relative error 1.2·10⁻² (b) and 1.7·10⁻² (c).
- **The cause is the existing D1, not 1A.** The original D1, with the pelvis at rest and the same configurations and references, has the **same** error distribution:
  - median 2·10⁻⁶;
  - p95 2.5 – 4·10⁻⁴;
  - max 1.2 – 1.6·10⁻²;
  - velocities exact to 10⁻⁹.

  The source is D1's own 1 mm second-difference step for J̇ẋ and the segment angular-acceleration terms. That step is unchanged and default behaviour, so it may not be changed.
- **Amended criterion.** For each case, the check builds a **control**: the original D1, frame at rest, given the relative reference that the check computes independently (v − v_p − ω_p × r, ω − ω_p, and the transport-corrected accelerations). The control resolves the same joint motion with the same discretisation. 1A's **added** error, (1A error in the moving frame) − (control error in its static frame), per component, must be ≤ 1·10⁻⁴ relative.
- **Disclosure:** the amendment was made after seeing the raw check output (A1 is a numerical-correctness criterion, not a behavioural outcome).
- **Result at freeze:** (a) 400 / 400 exact; (b) 1A's added error ≤ 1.1·10⁻⁷; (c) ≤ 1.1·10⁻⁶.

**A2 (2026-10-07), evaluator and harness details:**
- `tools/fb_eval.mjs` copies the AB2 run metrics verbatim from `tools/ab2_eval.mjs`.
- **AB2-7 within 1A-1:** evaluated for the configuration under test only. A alone is not in this battery, and C-1 … C-3 are not part of 1A-1.
- **Tick adjacency:** row times are recorded to 10⁻⁶ s, so adjacency is tested to 10⁻⁶.
- **G-2:** compares the end hashes of BASE / AB with the AB2 run logs (`evidence_ab2/logs/run_logs.tgz`).
- **1B-0:** compares all series and the listed row fields before the TOUCHDOWN entry.
- **Harness recording additions** (recording only; hashes unchanged):
  - K and D in the ledger record;
  - the velocity feed-forward's pelvis-motion and target-motion parts (wPT), for the reported decomposition.
- **Archived records:** 240 Hz V2-REF (left leg) and V2-198-92 (both legs).

**A3 (2026-10-07), design-verification smoke results known before the battery (disclosed; the 1B design was NOT changed in response):**
- **2 cases × 4 configurations.** Identity: AB reproduces b63184da / AB2. On V2-198-92 L 180 R-L, AB+T shows:
  - one extra transition-region commanded violation (40.4 vs limit 40, at 3 ticks after contact; σ held by the governor, so the approach law's own change);
  - a rebound at 0.19 s after contact. That rebound occurs after 1B disengaged, under the default contact law; the foot rose 0.96 mm, against 0.40 mm under AB.
- **32 paired runs** (8 bodies × left leg × 240 Hz × R-F / R-L / C-L5 / H-D, AB vs AB+T):
  - runs with transition-region E1a-7 violations: **AB 1 → AB+T 9** (max commanded / applied ratio up to 1.66 / 1.46, on H-D);
  - rebounds: equal (8 / 8, all H-D, present under AB as well).
- **The evaluator's mini-battery test** (3 groups × 5 configurations) attributes the AB+T violations to the approach law's internal change after the impact, (1 − σ)·Δτ_app ≈ −38 … −40 N·m with σ ≈ 0.07 – 0.1 held. That law keeps the swing damping and A's singularity-robust pelvis-motion rate (w_A = c) at nearly full weight during the impact.
- Under AB, the per-factor a-blend reduces both within the same ticks.
- **Prediction recorded here:** 1B-3 and 1B-5 are likely to fail in the battery. If they do, the stop rule applies and the diagnosis goes to the user. 1B is not redesigned before that decision.
