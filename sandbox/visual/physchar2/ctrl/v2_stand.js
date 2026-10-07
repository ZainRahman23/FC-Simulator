// ═══ physchar2/ctrl/v2_stand.js — the V2-G2 STANDING CONTROLLER (no stepping, no foot relocation, no external authority) ══════════════════
// Hierarchy (each layer readable on its own):
//   1. STATE ESTIMATION (exact simulation state; the consumed variables are listed in CONSUMED): whole-body COM c and velocity v, COM height h
//      above the turf, ω0 = √(g/h), extrapolated COM ξ = c_h + v_h/ω0 (Hof 2005), the feet's poses → each foot's usable sole region on the
//      turf (a polygon in the foot frame, MEASURED at G2 step 2) and the support region = their convex hull, the heading from the feet.
//   2. BALANCE OBJECTIVE: ξ → ξ_ref = mid-ankle point + COM_AHEAD along the heading (quiet-stance target, ctrl/v2_stance.js).
//   3. PHYSICALLY ACHIEVABLE RESPONSE: desired centre of pressure p* = ξ + kξ·(ξ − ξ_ref) (⇒ ξ̇ = −ω0·kξ·(ξ − ξ_ref) for an inverted pendulum),
//      clamped into the support region (the residual r = p*_raw − p* is what the support cannot deliver — the hip / arm strategies, if any,
//      act only on r). The desired ground force passes through the COM (LIPM): horizontal M·A with A = ω0²·(c_h − p*), vertical M·g; split
//      between the feet by the lever rule along the inter-foot line (lateral CoP = load distribution), each foot's CoP clamped to its region.
//   4. FINITE ACTUATOR COMMANDS (sim/v2_actuation.js clamps to the §14 capacity): feed-forward joint torques from the static equilibrium of
//      each joint's distal subtree under effective gravity g − A and the desired foot wrenches (inverse statics; for the ankles this IS the
//      balance torque), plus a weak POSTURE PREFERENCE (joint-space PD toward the quiet-stance pose) on every joint except the ankles, whose
//      angle is left to balance. Gains are body-scaled: K = κ·m_sup·g·L (m_sup, L: the load the joint supports and its lever in the reference
//      pose), D = 2ζ·√(K·m_sup·L²) — no per-body tuning.
// The controller writes nothing to bodies; Jolt owns the state; the only outputs are per-axis actuator requests.
import { V, Q, dexp, datan2, dasin, dnorm, dtan, unitStates, unitEv } from "../core/v2_math.js";   // deterministic math only in anything that feeds physics (G3 resolution D1)
import { posedBodies } from "../spec/v2_pose.js";
import { bootSole, hull2, hull2Canonical } from "../sim/v2_geom.js";
import { pyr, decompose } from "../spec/v2_joints.js";
import { SupportLifecycle, LIFECYCLE, blendPose } from "./v2_support.js";
// UNLOAD FIX B1 — the free-swing row feed-forward of a joint with one locked swing axis (index L ∈ {1: y, 2: z}), actuated twist x and actuated free
// swing F = 3 − L. Relative rotation q = q_swing ⊗ q_twist(t) with the locked swing at 0: the free swing DOF moves about rot_x(−t)·ê_F in body-2 axes,
// i.e. (0, cos t, −sin t) for F = y and (0, sin t, cos t) for F = z; the twist DOF about x̂. With row torques τ_x x̂ + τ_F ê_F (no actuator on the
// locked axis, whose constraint does no work on admissible motion) the generalized forces of the statics torque T are reproduced iff
// τ_x = T·x̂ and τ_F = T·ê_F − tan t·(T·ê_L) (F = y) / T·ê_F + tan t·(T·ê_L) (F = z). axW: the joint's body-2 axes (world); returns τ_F.
export function lockedAxisFF(T, axW, tw, L) { const tt = dtan(tw),   // deterministic tan (core/v2_math.js; browser = Node)
  TL = V.dot(T, axW[L]); return L === 2 ? V.dot(T, axW[1]) - tt * TL : V.dot(T, axW[2]) + tt * TL; }
// UNLOAD FIX B3 — the commanded left-foot share t clamped so that a foot whose requested share (left 1 − λ_R, right λ_R) is below the unloaded level
// `lo` is never commanded more than its request; requests ≥ lo leave t untouched
export function shareClampC(t, lam, lo, hi) { const cap = (r) => (r <= lo ? Math.max(0, r) : r >= hi ? 1 : r + (1 - r) * (r - lo) / (hi - lo)); const rL = 1 - lam, rR = lam; if (rL < hi) t = Math.min(t, cap(rL)); if (rR < hi) t = Math.max(t, 1 - cap(rR)); return t; }
const yawToward = (qT, qC, w) => { const fT = Q.rot(qT, [0, 0, 1]), fC = Q.rot(qC, [0, 0, 1]); let d = datan2(fC[0], fC[2]) - datan2(fT[0], fT[2]); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Q.mul(Q.axis([0, 1, 0], w * d), qT); };   // lcTouch.yaw "follow" (DIAGNOSTIC)
const smooth01 = (u) => { const x = Math.min(1, Math.max(0, u ?? 1)); return x * x * (3 - 2 * x); };   // touchRestRamp (C2): smoothstep of the lifecycle's rest weight
export function shareClamp(t, lam, lo) { const rL = 1 - lam, rR = lam; if (rL < lo) t = Math.min(t, Math.max(0, rL)); if (rR < lo) t = Math.max(t, 1 - Math.max(0, rR)); return t; }

export const STAND = {
  kXi: 1 / 3,             // DCM gain (dimensionless). With p* = ξ + kξ(ξ − ξ_ref) the closed-loop ankle stiffness is (1 + kξ)·m·g·h and the velocity
                          // gain (1 + kξ)·m·g·h/ω0: kξ = 1/3 gives 1.33 mgh and ≈ 0.43 mgh·s — human quiet-standing identification (Peterka 2002,
                          // ≈ 1.3 mgh; recalled, as cited in V1 C1) [H]→[CTRL]. Measured alternatives (G2 step 4): kξ = 1 / 0.5 (see DECISIONS G2)
  kappa: { leg: 1.5, trunk: 1.5, neck: 1.5, arm: 1.5 },   // posture stiffness / gravitational stiffness of the supported load [ENG]
  zeta: 0.7,              // posture damping ratio [ENG]
  ankleD: 2.0,            // ankle intrinsic viscous damping (N·m·s/rad), both motorised axes [ENG]
  footInset: 0.005,       // control margin inside each foot's usable region (m) [ENG]. The usable region itself is MEASURED (G2 step 2): the
                          // loaded flat-contact hull of the boot (pieces 0–7; lean ramps put the foot-rotation onset exactly on its edge)
  minShare: 0.10,         // each foot keeps ≥ 10 % of body weight in double support: no deliberate unloading (an unloaded foot on the turf is
                          // dragged / lifted by its leg — measured, lateral 15 N·s: the left foot lifted 13 mm and moved 75 mm; G2 step 5) [ENG]
  hip: false,             // hip / trunk strategy: whole-body angular-momentum rate L̇ = M·g·(ŷ × r) through the stance hips, only on the CoP residual r
  hipUse: 1.0,            // fraction of the strategy torque requested (the actuators clamp it to capacity) [ENG]
  arms: false,            // arm counter-motion (G2 test B): the shoulders rotate the arms with torque armUse·M·g·(ŷ × r) shared by both arms, only on
                          // the CoP residual r, fading as the arm leaves its posture by armMaxDeg (the arms are a bounded flywheel) [ENG]
  armUse: 1.0, armMaxDeg: 60,
  hipMaxDeg: 10,
  // REPORT-ONLY sensing / motor tests (V2 specifies neither numerically; off in every gate scenario):
  // ── G3 deliberate weight transfer (all OFF by default: the G2 controller is bit-identical without them) ──
  transfer: null,         // (t, ctrl) → requested RIGHT-foot vertical load fraction λ_R (0.5 = bilateral). Sets the balance target's lateral position to the
                          // quasi-static COM for that load split (λ-weighted point between the feet's region centroids) and relaxes the G2 10 % foot floor to
                          // the requested share. A REQUEST only: the physics decides the load (G3 brief §1).
  contactSupport: false,  // support region from the feet that actually have contacting boot pieces (sensed, G3 brief §12); a foot that lost contact is
                          // excluded from the polygon and from the load split
  holdUnloaded: false,    // a foot whose sensed load fell below loadOff is HELD where it was when it unloaded (leg IK to that stored pose, ankle held at
                          // its pose there) — not a new target, not a relocation (G3 brief §2); released back to balance control above loadOn
  loadOff: 0.01, loadOn: 0.03,   // unloaded / reloaded thresholds (fraction of body weight) for holdUnloaded [ENG]
  dcmFF: true,            // with a moving target (transfer only): the DCM tracking law p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω0, ξ_ref = x_ref + ẋ_ref/ω0, the rates
                          // ANALYTIC from the request (λ̇, λ̈ × the lateral centroid separation). G3 measured deficiency: the static-target law lagged a 4 s
                          // ramp (load-tracking RMS 0.128); a first version differentiated the measured target and felled the cycle test (G3-A4)
  ikFeasible: false,      // posture IK: the pelvis height target is lowered to the highest height at which BOTH legs keep their reference hip–ankle length
                          // (reference knee flexion) — the pendulum arc of a lateral COM shift. G3 measured deficiency: at fixed height a ≥ 7 cm shift made the
                          // target unreachable, the IK fell back to the current configuration (zero posture error), and pelvis yaw crept 9.5° (G3-A5)
  ikBounds: false,        // OPT-IN, NOT ADOPTED (overnight Phase C — a G4 design decision): the leg IK keeps its six solved coordinates inside the ANATOMICAL
                          // hard limits (active-set projected LM, legIKBounded). Off = the validated unconstrained IK. Measured (tools/ik_g4_study.mjs, 20,736
                          // G4-style targets × 8 bodies): the unconstrained IK reaches 1,336 targets only with an anatomically invalid pose (hip rotation ≤ 14.7°,
                          // ankle DF ≤ 10.4° beyond the limit, 18 hyperextended knees); the bounded IK classifies them unreachable and returns the closest valid pose
  ikTwistBlend: null,     // DIAGNOSTIC ONLY (pre-G4 runway; NOT adopted): posture-IK twist-DOF target = (1 − α)·current + α·reference (α = this value);
                          // null = the validated "current" form; 1 ≡ ikRefTwist. With ikTwistTau the "reference" is the slowly filtered current twist.
  ikTwistTau: 0,          // DIAGNOSTIC ONLY: time constant (s) of a first-order filter of the current twist DOFs used as the twist reference
                          // (a state-dependent reference: a twist held longer than ~τ is accepted); 0 = off
  yawCmd: null,           // DIAGNOSTIC ONLY: (t) → pelvis yaw command offset (rad) added to the heading from the feet (legitimate-turning test)
  pelvisDrop: null,       // EXPERIMENTAL, default OFF (final pre-E1a stage): { t0, dur, dz } — a PLANNED lowering of the posture-IK pelvis-height target by dz (m),
                          // min-jerk over [t0, t0 + dur]; achieved physically by the stance legs' finite actuators (a target, never a pose write). Reach margin
                          // for the unloaded leg (measured: at standing height a straight leg cannot keep a foot flat on the turf 1 cm off its spot)
  lifecycle: null,        // EXPERIMENTAL, default OFF (final pre-E1a stage, G3 → G4 boundary): true / { overrides } = the explicit per-foot support / contact
                          // lifecycle of ctrl/v2_support.js replaces G3's one-tick unl / contactSupport booleans. Continuous support weights s ∈ [0, 1] drive:
                          // heading and balance midpoint (H6, H7), pelvis-height reference and its feasibility cap (H8), support polygon (scaled toward each
                          // foot's centroid, H5), load-share caps, the leg's IK target / pelvis frame, and the leg gains (stance ↔ swing servo, H1, H11);
                          // self-contact guard on the load reading (H4); hold pose captured once on the turf (H2); debounced, hysteretic transitions (H3).
                          // A non-supporting leg servos in the ACTUAL pelvis frame (world-space; measured: the posture-frame hold gave 34–44 N·m commanded-torque
                          // steps at liftoff/touchdown vs 3–7 N·m), with a soft-limit bounded IK; diagnostic lcFrame: "target" restores the G3 posture frame in contact
  lcTouch: null,          // DIAGNOSTIC / EXPERIMENTAL (touch_semantics/; default OFF): semantics of a NON-SUPPORTING (s < 1) foot in CONTACT without a swing command.
                          // { frame: "actual" } leg solved from the actual pelvis height (not min(target, actual)); { gains: "swing" } hip / knee use the swing servo
                          // gains (sized for the leg's own inertia) instead of the stance posture gains while in contact; { vert: "anchor" } the vertical target is the
                          // contact anchor's height (the surface) instead of following the foot. Any subset; continuous in s (and a) as before
  touchRest: false,       // EXPERIMENTAL candidate (touch_semantics/; default OFF): a NON-SUPPORTING foot without a swing command targets its contact anchor — the
                          // SURFACE (vertical target = the anchor height, not the foot's own height) — and while in contact RESTS on it with a seating force of
                          // loadOff / 2 of body weight (the midpoint of the lifecycle's own "unloaded" band [0, loadOff)), scaled (1 − s)(1 − a), through its own
                          // leg's feed-forward (finite actuators; the other foot's commanded force reduced by the same amount). = lcTouch { vert: "anchor", seat: loadOff / 2 }
  abortCapture: false,    // (true = rule revision 1, PSTAR3; 2 = revision 2, PSTAR4: no timing margin after measured contact — e1b_close/) EXPERIMENTAL T-A (gates/v2_g3.js supervised(); default OFF; needs lcPutDown; e1b_ta/): at an abort with an airborne foot, the descent and the
                          // post-contact load-acceptance ramp are the smoothest that the online capture model (ctrl/v2_capture.js) predicts still recover, with the
                          // abort plan's acceptance intent (measured contact still required) and the quiet-standing floor removed for the abort transition
  lcPutDown: false,       // EXPERIMENTAL (gates/v2_g3.js supervised(); default OFF; e1b_fix/ABORT_PUTDOWN_DESIGN.md): the single-support abort puts an airborne foot down along a
                          // QUINTIC from the current reference state to the contact anchor over the swing servo's bandwidth duration (ctrl/v2_swing.js; BLF SwingFootPlanner
                          // min-jerk segment), held at the anchor until the lifecycle's physical contact; supersedes lcAbortRamp when both are set
  footYaw: null,          // EXPERIMENTAL (default OFF = null; read by gates/v2_g2.js → the actuator layer): the active foot-yaw path's capacity, e.g. footYawFromSubtalar()
                          // (spec/v2_actuators.js) — an actuator on the ankle's passive-only foot ab/adduction axis sharing the subtalar budget with inversion; the
                          // controller's existing ankle rows drive it (support: K 0, D ankleD, statics feed-forward; non-support: the swing ankle gains)
  swingAccFF: false,      // EXPERIMENTAL (E2 D1; e2/SWING_ACCEL_FF_DESIGN.md; default OFF = bit-identical): acceleration feed-forward of the swing-foot servo — for a non-supporting leg
                          // whose commanding code supplies the ANALYTIC swing reference (this.swingRef[n] = { vel, acc, w, al }, world) together with its swing target, the inertial part
                          // of the leg subtree's Newton–Euler inverse dynamics (resolved-acceleration: the reference's joint acceleration via the IK chain's 6×6 foot Jacobian; segment
                          // accelerations relative to the statics' common acceleration A) is added to the statics wrench of each leg joint, weighted (1 − s) like the velocity
                          // feed-forward. No gain; enters τ0 under the actuators' capacity clamp; writes no state. Never derived from differentiated targets or measurements
  e2: false,              // EXPERIMENTAL E2 (e2/E2_DESIGN_v2.md; default OFF = bit-identical): the step sequencer (ctrl/v2_step.js, driven from the transfer request / supervisor) may hand the
                          // balance law a DCM reference — request fields xiRef [x, z] and xiRefDot replace ξ_ref and the −ξ̇_ref/ω0 term of p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω0 (the
                          // existing law; no second controller); info.qsRef = the quiet-stance reference with both feet supporting at λ 0.5 (the plan's terminal point);
                          // the tick's states are kept for the planner's online IK certification (e2st / e2ev / e2dt). Nothing else changes
  lcAbortRamp: false,     // DIAGNOSTIC (gates/v2_g3.js supervised(); default OFF): the single-support abort puts an airborne foot down CONTINUOUSLY (target ramp to the anchor over the lifecycle's release) instead of clearing its swing target in one tick
  e2reanchorVel: false,   // HANDOFF CORRECTION (e2/E2_HANDOFF.md; default OFF = bit-identical; needs e2): at the B1 re-anchor tick the target-motion velocity feed-forward uses the new
                          // reference's own pose one tick earlier (sequencer: e2reanchorPrev) instead of being dropped for that tick (I-11) — continuous actuator output at release
  vffPassive: false,      // DIAGNOSTIC COUNTERFACTUAL (e2/E2_OVERNIGHT_REPORT.md §9; default OFF; NOT adopted): the velocity feed-forward also carries the joint's passive viscous damping
                          // (spec joints[k].damping) for the desired rate — measured: the ankle's passive 0.2 N·m·s/rad is 33 % of its swing-servo damping (0.6), a ≈ 21 ms foot-orientation lag
  vffPelvisAir: false,    // A (e2/AB_VALIDATION_PREREG.md; default OFF = bit-identical): the pelvis-motion part rP of a COMMANDED swing's world-space foot velocity task is solved with
                          // the same singularity-robust variable damping as the commanded-target part rT, weighted w_A = a · c (a = the lifecycle's airborne weight, c = the commanded-swing
                          // weight, ramped over the lifecycle's release time): airborne, rP and rT are one consistently damped task; in contact (a = 0) and on every path without a
                          // commanded target (resting foot, external lift, abort hold) rP keeps μ0 exactly as before (the refuted "srAll" destabilised exactly those paths)
  vffPassiveRef: false,   // B (e2/AB_VALIDATION_PREREG.md; default OFF): the ankle's modelled passive tissue damping c_p (spec joints[k].damping) compensated ONCE in the swing actuator command,
                          // on the REFERENCE joint rate (rT + w_A·rP), never on the measured rate — nominal trajectory drag is cancelled, contact- or disturbance-induced motion keeps its
                          // physical damping; zero on every path without a commanded target. Mutually exclusive with the diagnostic vffPassive
  torqueLedger: false,    // recording only (e2/AB_VALIDATION_PREREG.md): per actuator axis of a non-supporting leg the command split into statics feed-forward (gravity / common
                          // acceleration / support), D1, proportional, servo-damping velocity feed-forward and B, plus the weights w_A, c — closure τ0 = Σ parts is checked by the harness
  diagD1PelAcc: false,    // DIAGNOSTIC counterfactual (e2/VERTICAL_RESIDUAL_DIAGNOSIS.md; default OFF): D1 (swingAccFF) uses the MEASURED pelvis linear acceleration (backward difference of the
                          // pelvis velocity) in place of the statics' common acceleration A — tests the floating-base completeness of the acceleration feed-forward; not a candidate as is
  d1FloatBase: false,     // 1A (e2/FB1A_TR1B_PREREG.md §1; default OFF = bit-identical; needs swingAccFF): the swing-foot task conversion of D1 with the pelvis's rigid-body angular motion —
                          // resolved rate J_f ẋ = [v − v_p − ω_p × r; ω − ω_p], resolved acceleration with α_p × r, ω_p × (ω_p × r), 2ω_p × v_rel and α_p + ω_p × ω_rel, segment accelerations /
                          // angular velocities in the world (transport terms; the statics keeps the common linear A). α_p = the backward-difference estimate only while the swing foot is
                          // genuinely free (see compute), else 0. The servo's velocity reference (rP: the previous actual pelvis frame) already carries ω_p and is unchanged
  lcTransition: false,    // 1B (e2/FB1A_TR1B_PREREG.md §2; default OFF = bit-identical; needs lifecycle + lcVff "lin"): "cmd" = from the swing foot's TOUCHDOWN the non-supporting leg's command is
                          // the σ-blend of two COMPLETE laws — approach (a = 1: actual frame, commanded swing target, swing gains, rP with A's weight c, rT, D1, B) and accommodation (a = 0:
                          // contact frame, the lifecycle's contact-compatible target, hold gains, rP at μ0) — instead of the per-factor a-blend (no pelvis-motion term weighted by the gain
                          // blend); σ follows 1 − a under a governor certifying the E1a-7 commanded-torque continuity of the aggregate on every axis of the leg
  diagRecord: false,      // DIAGNOSTIC (e2/VERTICAL_RESIDUAL_DIAGNOSIS.md; default OFF; recording only, no effect on any output): per non-supporting leg the IK solution x, its frame, D1's resolved
                          // rates (xd, xdd) and the velocity feed-forward's pelvis-motion / target-motion parts per joint, in this.diagRec[n]
  lcVff: false,           // DIAGNOSTIC (preswing/; default OFF): desired-velocity feed-forward for a NON-SUPPORTING leg — the target joint velocity ω* = d/dt of its IK
                          // targets (backward difference) enters as τ0 += (1 − s)(D + dt·K)·ω*, i.e. the implicit damping acts on (ω − ω*) instead of ω: a foot whose
                          // target is still while the pelvis moves is not dragged by the leg's damping, and a swing target is tracked without velocity lag
  vffRate: false,         // CORRECTION (e2/VFF_RATE_CORRECTION.md; default OFF = bit-identical): "sr" = the part of lcVff's desired joint velocity caused by the COMMANDED swing
                          // target's own motion (rT) is the one-step rate solved with SINGULARITY-ROBUST VARIABLE DAMPING instead of the fixed level the caller passes (μ0 for "lin"):
                          // μ = μmin + (μ − μmin)·max(0, 1 − λmin/ε²), λmin = the smallest eigenvalue of the free Gauss–Newton matrix J_Fᵀ J_F of that rate problem, ε = IK.srEps
                          // (Nakamura & Hanafusa 1986; Chiaverini 1997): the validated damped law at the straight-knee singularity (λmin → 0), the resolved rate where the leg is
                          // conditioned. The pelvis-motion part (rP, closed loop through the measured frame) is unchanged. Defect corrected (e2/SWING_LAG_DIAGNOSIS.md): μ0 ≈ λmin at
                          // swing poses scaled the commanded swing's knee / hip rate by 0.26–0.37 (vertical). "srAll" = also rP: REFUTED DIAGNOSTIC (unstable, see the lcVff block)
  touchRestRamp: false,   // EXPERIMENTAL correction C2 of touchRest (touch_semantics/TOUCHREST_RESULTS.md §3; default OFF; needs touchRest): the seat is weighted by the
                          // lifecycle's rest weight smooth(ρ) instead of switching with the swing command / state — ρ ramps (over the lifecycle's `release`) to 1 while
                          // the foot has no swing command and is not AIRBORNE, to 0 otherwise. Measured with C: the one-tick seat removal at a lift command made 0.5 mm
                          // hovers overshoot, graze and bounce (17 / 48; 2 / 48 without the seat).
                          // REFUTED (diagnostic lab, touch_semantics/TOUCHREST_RESULTS.md §3): 18 / 48 with the ramp — the 0.5 mm hover sits AT the 0.5 mm touch-sensing gap; kept as a record
  shareCapC: false,       // EXPERIMENTAL (touch_semantics/; default OFF): B3 with CONTINUOUS engagement — the cap on a foot's commanded share blends from none at
                          // the lifecycle's wantShare to its requested share at loadOff (shareClampC); a step-free alternative to shareCap
  ffLockedAxis: false,    // UNLOAD FIX B1 (unload_fix/UNLOAD_FIX_PREREG.md §1; default OFF until qualified): locked-axis-consistent feed-forward. For a joint with
                          // one locked swing axis, an actuated twist (x) and one actuated swing (knees, elbows), the free swing moves about rot_x(−t)·ŷ in
                          // body-2 axes (the passive layer's G1 locked-axis geometry), so its actuated row must carry T·ŷ − tan t·(T·ẑ) (lockedAxisFF)
  shareCap: false,        // UNLOAD FIX B3 (default OFF until qualified): a foot whose REQUESTED share is below the lifecycle's unloaded level (loadOff) is never
                          // commanded more than its requested share (shareClamp); a foot with a request ≥ loadOff is untouched; nothing is lifted or forced
  timeIK: false,          // DIAGNOSTIC instrumentation (G3 tables): time the leg IK; OFF in production — not part of the controller budget (D5)
  ikRefTwist: false,      // EVALUATED, NOT ADOPTED (G3-A7). Posture IK: the redundant axial-twist DOFs (knee axial rotation, PASSIVE ankle ab/adduction) are solved at their REFERENCE
                          // values instead of their current ones, so the actuated hip / knee rotators turn the leg back until the passive ankle axis is at
                          // neutral (null-space posture). G3 measured deficiency: a ±10° leg-twist mode at the passive ankle ab/adduction (period ≈ 1.2 s,
                          // pelvis yaw ±5–8°) excited by the transfer. MEASURED WORSE: whole-body yaw stiffness fell from 2.8 to 0.1–0.3 N·m/° (the hips then
                          // hold the legs to the pelvis, so the pelvis rotates with the legs on the passive ankles) — the G2 "current" form is kept
  gainSched: false,       // EVALUATED, NOT ADOPTED (G3-A8: no measured benefit — yaw / slip unchanged, tracking slightly worse). leg posture gains scheduled by each leg's SENSED load share (K = κ·(share·m)·g·L, the G2 law with the
                          // actually supported mass; floored at the distal-subtree gains) instead of G2's fixed bilateral share 0.5
  delay: 0,               // observation latency (s) of the balance state (COM position / velocity) — a ring buffer; posture uses the current state
  noise: null,            // motor noise: { seed, sd (N·m), tau (s) } — an Ornstein–Uhlenbeck torque on each ankle's DF and inversion rows,
                          // from a named, seeded stream ("motor", spec §19); Gaussian by Irwin–Hall (no transcendental functions)          // the trunk is a BOUNDED flywheel: the strategy fades linearly to 0 as the pelvis deviates hipMaxDeg from its reference
                          // orientation (measured: an unbounded strategy rotated the trunk 27–33° and reversed its own gain, backward-left 25 N·s) [ENG]
  posture: "ik",          // legs: "ik" = joint-space PD of hips / knees toward the configuration that keeps each foot where it IS with the pelvis at
                          //   its reference orientation and height and its CURRENT horizontal position (leg inverse kinematics each tick);
                          // "task" = pelvis wrench through the legs (measured: a lightly loaded leg goes limp and its foot is dragged, G2 step 3);
                          // "joint" = PD toward the fixed reference angles (measured: fights lateral balance, G2 step 2)
  taskD: 0.1,             // implicit joint damping on the task-space leg rows, as a fraction of the joint's posture damping [ENG]
};
export const CONSUMED = ["every body's position, orientation, linear and angular velocity (exact)", "joint constraint-space rotations (from the body states)", "the boots' geometry (proprioceptive foot model)", "gravity magnitude"];
const G = 9.81, KEYS = ["x", "y", "z"], HIP_LOAD = 0.25, nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export class StandController {
  constructor(spec, passive, stance, opts = {}) {
    this.spec = spec; this.P = passive; this.stance = stance; this.o = { ...STAND, ...(opts.stand || {}) };
    const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n); this.M = B.reduce((s, b) => s + b.mass, 0);
    this.feet = ["foot_L", "foot_R"].map(bi); this.pelvis = bi("pelvis");
    this.kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) this.kids[b.parentIndex].push(i); });
    const sub = (i) => [i, ...this.kids[i].flatMap(sub)];
    this.sub = spec.joints.map(j => sub(j.childIndex)); this.subFeet = this.sub.map(s => this.feet.filter(f => s.includes(f)));
    this.anchor = spec.joints.map(j => V.sub(j.at, B[j.parentIndex].origin));
    this.lockedFix = spec.joints.map(j => (j.locked && j.locked.length === 1 && !j.locked.includes("x") ? (j.locked[0] === "z" ? 2 : j.locked[0] === "y" ? 1 : null) : null));   // B1 scope: knees, elbows
    // the usable sole region of each foot (foot-local x lateral / z forward at the sole plane): default = the boot's plantar contact hull
    // the usable region = the radial 5 mm inset of the CANONICAL hull (strictly convex vertices, canonical order), made convex again: the radial inset
    // turns a nearly straight hull vertex (lateral midfoot) into a shallow REFLEX vertex, and the controller's region operations (projection clampPoly,
    // supervisor polyDist) assume a convex region — on the non-convex inset the CoP projection jumped up to ~9 mm across the dent's bisector
    // (overnight A1, tools/region_study.mjs). Region = canonical convex hull of the inset vertices: every true vertex keeps its 5 mm radial inset,
    // only the dent fills (+1.0 … 1.3 % area); mirrored boots give mirrored regions (user decision 2026-10-04 §1; the earlier hull2-based region
    // differed by 4.8 µm L/R — G3 J2a finding 1). Former constructions preserved in the history and in symmetry_corrections/.
    this.sole = this.feet.map(f => { const s = bootSole(B[f]); return { y0: s.y0, poly: opts.footRegion ? opts.footRegion(f) : usableRegion(s.pts, this.o.footInset) }; });
    // reference pose (posture preference) and body-scaled gains from it
    const S = posedBodies(spec, stance.angles, { pos: null, rot: stance.pelvisRot }), com = (ids) => { let m = 0, c = [0, 0, 0]; for (const i of ids) { c = V.add(c, V.sc(V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), B[i].mass)); m += B[i].mass; } return { m, c: V.sc(c, 1 / m) }; };
    this.qref = passive.jd.map(d => passive.qcs(d, S.map(s => s.rot)));
    const all = B.map((_, i) => i);
    this.gain = spec.joints.map((j, k) => { const base = j.name.replace(/_[LR]$/, ""), at = V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, this.anchor[k]));
      const leg = ["hip", "knee", "ankle"].includes(base), part = leg ? all.filter(i => !this.sub[k].includes(i)) : this.sub[k], L0 = com(part), share = leg ? 0.5 : 1;
      const m = L0.m * share, L = V.dist(L0.c, at), kap = this.o.kappa[leg ? "leg" : base === "neck" ? "neck" : ["shoulder", "elbow"].includes(base) ? "arm" : "trunk"];
      const K = kap * m * G * L, D = 2 * this.o.zeta * Math.sqrt(K * m * L * L); return { base, K, D, m, L }; });
    // task-space leg posture (pelvis orientation in the world + pelvis height above the ankles): gains from the load above the hips
    const legs = all.filter(i => /^(thigh|shank|foot)_/.test(B[i].name)), ub = all.filter(i => !legs.includes(i)), cub = com(ub);
    const hipsMid = V.sc(V.add(this._at(S, "hip_L"), this._at(S, "hip_R")), 0.5), Lub = V.dist(cub.c, hipsMid), Iub = inertiaAbout(B, S, ub, hipsMid);
    const Ko = this.o.kappa.leg * cub.m * G * Lub, ankRef = (this._at(S, "ankle_L")[1] + this._at(S, "ankle_R")[1]) / 2;
    this.pel = { Ko, Do: [0, 1, 2].map(a => 2 * this.o.zeta * Math.sqrt(Ko * Iub[a][a])), hRef: S[this.pelvis].pos[1] - ankRef, Kh: this.o.kappa.leg * this.M * G / (S[this.pelvis].pos[1] - ankRef), mUb: cub.m, Lub };
    this.pel.Dh = 2 * this.o.zeta * Math.sqrt(this.pel.Kh * this.M);
    this.legSide = spec.joints.map(j => (["hip", "knee", "ankle"].includes(j.name.replace(/_[LR]$/, "")) ? (j.side === "L" ? 0 : 1) : -1));
    this.hipK = ["hip_L", "hip_R"].map(n => spec.joints.findIndex(j => j.name === n));
    this.shK = ["shoulder_L", "shoulder_R"].map(n => spec.joints.findIndex(j => j.name === n));
    this.legK = ["L", "R"].map(sd => ["hip_", "knee_", "ankle_"].map(n => spec.joints.findIndex(j => j.name === n + sd)));
    this.info = null; this.n = 0; this.ring = []; this.ou = [0, 0, 0, 0]; this.rng = (this.o.noise ? this.o.noise.seed : 1) >>> 0;
    // G3 state (snapshot): per foot unloaded flag + the pose it is held at; sensed foot loads / contacts (written by the sim each tick)
    this.unl = [false, false]; this.hold = [null, null]; this.sense = { Fz: [this.M * G / 2, this.M * G / 2], touch: [8, 8] };
    this.gainFree = spec.joints.map((j, k) => { const L0 = com(this.sub[k]), at = V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, this.anchor[k])), L = V.dist(L0.c, at), K = this.o.kappa.leg * L0.m * G * L;
      return { K, D: 2 * this.o.zeta * Math.sqrt(K * L0.m * L * L) }; });   // gains for a joint carrying only its distal subtree (an unloaded leg)
    this.legLen = ["L", "R"].map(sd => V.dist(this._at(S, "hip_" + sd), this._at(S, "ankle_" + sd)));   // reference hip–ankle distance (G3 ikFeasible)
    if (this.o.lifecycle) { const lo = { ...LIFECYCLE, ...(typeof this.o.lifecycle === "object" ? this.o.lifecycle : {}) }, w = 2 * Math.PI * lo.swingHz;   // EXPERIMENTAL (G3 → G4 boundary)
      this.lc = new SupportLifecycle(this.M * G, lo);
      // each foot's reference yaw relative to the body heading (its toe-out in the reference stance): a single supporting foot implies the body
      // heading = its forward direction rotated back by that offset — symmetric toe-outs give the same mean heading as G3 in double support (H6)
      { const pf = Q.rot(S[this.pelvis].rot, [0, 0, 1]), py = datan2(pf[0], pf[2]); this.footYawRef = this.feet.map(f => { const ff = Q.rot(S[f].rot, [0, 0, 1]); return datan2(ff[0], ff[2]) - py; }); }
      // swing-leg servo gains: a joint-space PD of bandwidth swingHz on each leg joint, from the inertia of its distal subtree about the joint in the
      // reference pose (largest principal-axis value, a conservative scalar): K = I·ω², D = 2ζ·I·ω — sized for an unloaded leg, not for body weight (H11)
      this.gainSwing = spec.joints.map((j, k) => { if (this.legSide[k] < 0) return null; const at = V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, this.anchor[k])), I = inertiaAbout(B, S, this.sub[k], at), Is = Math.max(I[0][0], I[1][1], I[2][2]);
        return { K: Is * w * w, D: 2 * lo.swingZeta * Is * w, I: Is }; }); }
  }
  _at(S, name) { const k = this.spec.joints.findIndex(j => j.name === name); return this.jointAt(S, k); }
  // world helpers
  jointAt(st, k) { const j = this.spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, this.anchor[k])); }
  footPoly(st, n) { const f = this.feet[n], s = this.sole[n]; return s.poly.map(([x, z]) => { const p = V.add(st[f].pos, Q.rot(st[f].rot, [x, s.y0, z])); return [p[0], p[2]]; }); }
  compute(st, ev, dt) {
    // UNIT-QUATERNION BOUNDARY (overnight A2, narrow scope): the controller's frame algebra (Q.rot of body orientations, small-angle errors
    // 2·vec(q⁻¹·q_ref)) assumes unit quaternions; Jolt's float32-derived orientations and the passive layer's relative rotations carry
    // ‖q‖² − 1 ≈ 3e-7 (with a non-unit q, Q.rot adds an unrotated (1 − ‖q‖²)·v term that differs L/R — G3 J2a finding 3). Normalise HERE, once.
    st = unitStates(st); ev = unitEv(ev);
    const o = this.o, B = this.spec.bodies, P = this.P;
    // 1. state estimation
    let c = [0, 0, 0], v = [0, 0, 0]; st.forEach((s, i) => { c = V.add(c, V.sc(s.com, B[i].mass)); v = V.add(v, V.sc(s.v, B[i].mass)); }); c = V.sc(c, 1 / this.M); v = V.sc(v, 1 / this.M);
    if (o.delay > 0) { this.ring.push([c, v]); const lag = Math.round(o.delay / dt); if (this.ring.length > lag + 1) this.ring.shift(); [c, v] = this.ring[0]; }
    const h = Math.max(0.3, c[1]), w0 = Math.sqrt(G / h), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0];
    // EXPERIMENTAL lifecycle (default off): per-foot support weights from the sensed load / turf contact of the previous step
    // (intent: the transfer request's share per foot gates / starts load acceptance — ctrl/v2_support.js; the request is evaluated here once per
    //  tick and reused below, so the request function is still called exactly once)
    if (o.e2) { this.e2st = st; this.e2ev = ev; this.e2dt = dt; }   // E2 (default off): the planner's IK certification reads this tick's states
    const reqLC = this.lc && o.transfer ? o.transfer(this.n * dt, this) : null, lamLC = reqLC == null ? null : (typeof reqLC === "number" ? reqLC : reqLC.lam);
    const LC = this.lc ? this.lc.update(this.sense, (n) => ({ pos: st[this.feet[n]].pos.slice(), rot: st[this.feet[n]].rot.slice() }), dt, lamLC == null ? [null, null] : [1 - lamLC, lamLC], reqLC && typeof reqLC === "object" && (reqLC.intent || reqLC.acceptDur) ? { intent: reqLC.intent || null, acceptDur: reqLC.acceptDur || null } : null) : null, sw = LC ? LC.map(f => f.s) : null, swSum = sw ? sw[0] + sw[1] : 0;
    if (LC && o.lcTouch && o.lcTouch.reseed) for (const n of [0, 1]) { const f = LC[n]; if (f.s < 1 && !f.swing && ["UNLOADING", "TOUCHING", "TOUCHDOWN", "LOAD_ACCEPT"].includes(f.state)) this.lc.reseed(n, { pos: st[this.feet[n]].pos, rot: st[this.feet[n]].rot }); }   // DIAGNOSTIC (preswing/): resting foot's horizontal place / yaw follow it
    // 1A (d1FloatBase; e2/FB1A_TR1B_PREREG.md §1; default OFF): the pelvis rigid-body motion for the swing-foot task conversion (D1) — COM, COM velocity, angular velocity (Jolt state)
    // and the angular-acceleration estimate α̂ = backward difference of the pelvis angular velocity, used ONLY while the swing foot is genuinely free (AIRBORNE, no touching pieces,
    // no contact since its liftoff: latch set by any touch in AIRBORNE / TOUCHDOWN / LOAD_ACCEPT, cleared at LIFTOFF / SUPPORT) — once it touches, α̂ contains the foot's own contact
    // impulse (measured 18–47 rad/s²), not free-space base motion; otherwise the balance model's angular acceleration 0 (the LIPM's, as A is its linear one)
    let fbPel = null; if (o.d1FloatBase && LC) { const ps0 = st[this.pelvis]; if (!this.fbLatch) this.fbLatch = [false, false];
      for (const n of [0, 1]) { const f = LC[n]; if (f.state === "LIFTOFF" || f.state === "SUPPORT") this.fbLatch[n] = false; else if (this.sense.touch[n] > 0 && (f.state === "AIRBORNE" || f.state === "TOUCHDOWN" || f.state === "LOAD_ACCEPT")) this.fbLatch[n] = true; }
      const al = this.fbWPrev ? V.sc(V.sub(ps0.w, this.fbWPrev), 1 / dt) : null;
      fbPel = [0, 1].map(n => { const on = !!al && LC[n].state === "AIRBORNE" && this.sense.touch[n] === 0 && !this.fbLatch[n]; return { c: ps0.com, v: ps0.v, w: ps0.w, al: on ? al : [0, 0, 0], alOn: on }; }); }
    const fwd = this.feet.map(f => Q.rot(st[f].rot, [0, 0, 1])), fc = sw ? fwd.map((f, n) => { const c = Math.cos(this.footYawRef[n]), sn = Math.sin(this.footYawRef[n]); return [f[0] * c - f[2] * sn, 0, f[0] * sn + f[2] * c]; }) : null;   // lifecycle: forward vectors corrected by each foot's reference toe-out
    const hd = sw && swSum > 1e-9 ? norm2([sw[0] * fc[0][0] + sw[1] * fc[1][0], sw[0] * fc[0][2] + sw[1] * fc[1][2]]) : norm2([fwd[0][0] + fwd[1][0], fwd[0][2] + fwd[1][2]]);   // lifecycle: the heading from the SUPPORTING feet only (H6)
    const ankL = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_L")), ankR = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_R"));
    const mid = sw && swSum > 1e-9 ? [(sw[0] * ankL[0] + sw[1] * ankR[0]) / swSum, (sw[0] * ankL[2] + sw[1] * ankR[2]) / swSum] : [(ankL[0] + ankR[0]) / 2, (ankL[2] + ankR[2]) / 2], lat = [hd[1], -hd[0]];   // lifecycle: balance midpoint of the supporting ankles (H7)   // lat: the character's RIGHT in the turf plane (spec §7.2 CCS: +x anatomical right, +z anterior)
    const off = o.refOffset ? o.refOffset(this.n * dt) : [0, 0];   // DIAGNOSTIC ONLY (G2 step 2 lean ramp): [right, anterior] shift of the target (m); never used by a gate test
    const polys = [0, 1].map(n => this.footPoly(st, n)), cen = polys.map(poly => centroid(poly));
    // G3: requested load split → lateral target (quasi-static: the COM over the λ-weighted point between the region centroids); contact-based support
    const req = this.lc ? reqLC : o.transfer ? o.transfer(this.n * dt, this) : null, lam = req == null ? null : (typeof req === "number" ? req : req.lam), dLat = lam == null ? 0 : ((cen[0][0] * (1 - lam) + cen[1][0] * lam - mid[0]) * lat[0] + (cen[0][1] * (1 - lam) + cen[1][1] * lam - mid[1]) * lat[1]);
    const xiRef = [mid[0] + hd[0] * (this.stance.comAhead + off[1]) + lat[0] * (off[0] + dLat), mid[1] + hd[1] * (this.stance.comAhead + off[1]) + lat[1] * (off[0] + dLat)];
    // G3 DCM tracking of a MOVING target: ξ_ref = x_ref + ẋ_ref/ω0 and p* gains −ξ̇_ref/ω0. The rates come ANALYTICALLY from the request
    // (λ̇, λ̈ × the lateral centroid separation) — the first version differentiated the measured target twice at 240 Hz, which amplified
    // sub-millimetre rocking of the barely loaded foot ~5800× into CoP commands and felled the cycle test (G3-A4, recorded)
    let xiRefFF = [0, 0]; if (lam != null && o.dcmFF && typeof req === "object") { const sep = (cen[1][0] - cen[0][0]) * lat[0] + (cen[1][1] - cen[0][1]) * lat[1], w = Math.sqrt(G / Math.max(0.3, c[1]));
      const vl = sep * (req.dl || 0), al = sep * (req.ddl || 0); xiRef[0] += lat[0] * vl / w; xiRef[1] += lat[1] * vl / w; xiRefFF = [-lat[0] * (vl + al / w) / w, -lat[1] * (vl + al / w) / w]; }
    // E2 (default off): the step sequencer's DCM reference replaces ξ_ref and −ξ̇_ref/ω0 in the same law; qsRef = this tick's quiet-stance reference for both feet supporting at λ 0.5
    let qsRef = null; if (o.e2 && sw) { const hd2 = norm2([fc[0][0] + fc[1][0], fc[0][2] + fc[1][2]]), mid2 = [(ankL[0] + ankR[0]) / 2, (ankL[2] + ankR[2]) / 2], lat2 = [hd2[1], -hd2[0]];
      const dLat2 = (cen[0][0] * (1 - 0.5) + cen[1][0] * 0.5 - mid2[0]) * lat2[0] + (cen[0][1] * (1 - 0.5) + cen[1][1] * 0.5 - mid2[1]) * lat2[1];
      qsRef = [mid2[0] + hd2[0] * (this.stance.comAhead + off[1]) + lat2[0] * (off[0] + dLat2), mid2[1] + hd2[1] * (this.stance.comAhead + off[1]) + lat2[1] * (off[0] + dLat2)]; }
    const e2ref = o.e2 && req && typeof req === "object" && req.xiRef ? req : null;
    if (e2ref) { const w = Math.sqrt(G / Math.max(0.3, c[1])); xiRef[0] = e2ref.xiRef[0]; xiRef[1] = e2ref.xiRef[1]; xiRefFF = [-e2ref.xiRefDot[0] / w, -e2ref.xiRefDot[1] / w]; }
    const inSup = sw ? sw.map(x => x > 0) : [0, 1].map(n => !o.contactSupport || this.sense.touch[n] > 0), supIdx = [0, 1].filter(n => inSup[n]), supFeet = supIdx.length ? supIdx : [0, 1];
    // lifecycle: a foot's support region grows continuously from its centroid with its weight (contact alone never implies support, H5)
    const polysSup = sw ? polys.map((poly, n) => { if (sw[n] >= 1) return poly; const f = Math.max(sw[n], 1e-6); return poly.map(([x, z]) => [cen[n][0] + (x - cen[n][0]) * f, cen[n][1] + (z - cen[n][1]) * f]); }) : polys;   // (weight 0: a 1e-6-scale region at the centroid, excluded from the support; keeps the per-foot clamp well defined)
    if (sw) this.unl = sw.map(x => x < 1);
    if (o.holdUnloaded && !sw) for (const n of [0, 1]) { const Fz = this.sense.Fz[n], W = this.M * G;
      if (!this.unl[n] && Fz < o.loadOff * W) { this.unl[n] = true; this.hold[n] = { pos: st[this.feet[n]].pos.slice(), rot: st[this.feet[n]].rot.slice() }; }
      else if (this.unl[n] && Fz > o.loadOn * W) { this.unl[n] = false; this.hold[n] = null; } }
    const support = hull2(supFeet.flatMap(n => polysSup[n]).map(([x, z]) => [x, 0, z]));
    // 2–3. balance objective → desired CoP (clamped to the support region) → desired foot wrenches
    const pRaw = [xi[0] + o.kXi * (xi[0] - xiRef[0]) + xiRefFF[0], xi[1] + o.kXi * (xi[1] - xiRef[1]) + xiRefFF[1]], p = clampPoly(support, pRaw), r = [pRaw[0] - p[0], pRaw[1] - p[1]];
    const A = [w0 * w0 * (c[0] - p[0]), 0, w0 * w0 * (c[2] - p[1])];
    // load share by the lever rule along the line between the feet's region centroids; each foot's CoP = its centroid + a shift so that the
    // load-weighted CoPs reproduce p (shift shared, the remainder re-assigned to the foot that still has room; both clamped to their regions)
    const a = cen[1], b = cen[0], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
    const fsc = req && typeof req === "object" && req.floorScale != null ? req.floorScale : 1;   // T-A abort transition (abortCapture): the quiet-standing floor scaled 0 → 1 (default 1: unchanged)
    const flL = lam == null ? o.minShare : Math.min(o.minShare * fsc, 1 - lam), flR = lam == null ? o.minShare : Math.min(o.minShare * fsc, lam);   // G3: the floor relaxes to the requested share
    let t = Math.max(flL, Math.min(1 - flR, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); if (!inSup[0] && inSup[1]) t = 0; if (!inSup[1] && inSup[0]) t = 1;
    if (sw && swSum >= 1) t = Math.max(1 - sw[1], Math.min(sw[0], t));   // lifecycle: a foot's load share never exceeds its support weight (continuous load acceptance)
    if (o.shareCap && lam != null) t = shareClamp(t, lam, this.lc ? this.lc.o.loadOff : o.loadOff);   // UNLOAD FIX B3 (default off)
    if (o.shareCapC && lam != null && this.lc) t = shareClampC(t, lam, this.lc.o.loadOff, this.lc.o.wantShare);   // EXPERIMENTAL continuous B3 (default off)
    const share = [t, 1 - t];
    const dl = [p[0] - (t * b[0] + (1 - t) * a[0]), p[1] - (t * b[1] + (1 - t) * a[1])], cop = cen.map((q, n) => clampPoly(polysSup[n], [q[0] + dl[0], q[1] + dl[1]]));
    // ORDER-INDEPENDENT (G2 final-run fix: the first version offered the remainder to the left foot first — an L/R asymmetry, measured as an
    // asymmetric boundary for V2-190-85): the remainder is applied as a COMMON shift to every foot that can still move toward it, scaled by
    // their summed share so the load-weighted CoP moves by the remainder; repeated (each foot clamped to its own region).
    for (let it = 0; it < 6; it++) { const ach = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]], res = [p[0] - ach[0], p[1] - ach[1]], rl = dnorm(res[0], res[1]);
      if (rl < 1e-7) break; const u = [res[0] / rl, res[1] / rl], mov = [0, 1].map(n => { const q = clampPoly(polysSup[n], [cop[n][0] + u[0] * 1e-4, cop[n][1] + u[1] * 1e-4]); return dnorm(q[0] - cop[n][0], q[1] - cop[n][1]) > 1e-6 ? 1 : 0; });
      const S = share[0] * mov[0] + share[1] * mov[1]; if (S < 1e-6) break; for (const n of [0, 1]) if (mov[n]) cop[n] = clampPoly(polysSup[n], [cop[n][0] + res[0] / S, cop[n][1] + res[1] / S]); }
    const pAch = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]]; p[0] = pAch[0]; p[1] = pAch[1]; r[0] = pRaw[0] - p[0]; r[1] = pRaw[1] - p[1];
    A[0] = w0 * w0 * (c[0] - p[0]); A[2] = w0 * w0 * (c[2] - p[1]);
    const F = share.map(s => [s * this.M * A[0], s * this.M * G, s * this.M * A[2]]), geff = [-A[0], -G, -A[2]];
    // DIAGNOSTIC / EXPERIMENTAL lcTouch.seat (fraction of body weight; default off): a RESTING force for a non-supporting foot in contact without a swing command —
    // the foot's own leg presses it onto the turf with seat·M·g·(1 − s)·(1 − a) through its feed-forward (finite actuators; the ground reaction is physical), and the
    // other foot's commanded vertical force is reduced by the same amount so the commanded total stays M·g. Vertical compliance with a small bounded seating force
    const seatFrac = o.touchRest && this.lc ? this.lc.o.loadOff / 2 : o.lcTouch && o.lcTouch.seat > 0 ? o.lcTouch.seat : 0;
    if (sw && seatFrac > 0) for (const n of [0, 1]) { const f = LC[n], rr = o.touchRest && o.touchRestRamp ? smooth01(f.rho) : null;   // C2: continuous rest weight (default off)
      if (rr != null ? sw[n] < 1 && rr > 0 : sw[n] < 1 && !f.swing && ["TOUCHING", "TOUCHDOWN", "LIFTOFF", "UNLOADING", "LOAD_ACCEPT"].includes(f.state)) { const fs = seatFrac * this.M * G * (1 - sw[n]) * (1 - f.a) * (rr ?? 1); F[n][1] += fs; F[1 - n][1] -= fs; } }
    // posture preference for the legs (task space): a desired wrench on the pelvis — orientation toward the reference (heading from the feet)
    // and height above the ankles — that the legs deliver (statics, each leg its load share); horizontal pelvis position is NOT a posture target
    let legW = null, ikT = null;
    if (o.ikTwistBlend != null && o.ikTwistTau > 0) { const now = this.legK.map(ks => ks.map(k => decompose(ev.qs[k]).tw)); if (!this.twFilt) this.twFilt = now; else this.twFilt = this.twFilt.map((f, n) => f.map((v, j) => v + (now[n][j] - v) * Math.min(1, dt / o.ikTwistTau))); }   // DIAGNOSTIC
    if (o.posture === "ik") { const ps = st[this.pelvis], yaw = o.yawCmd ? datan2(hd[0], hd[1]) + o.yawCmd(this.n * dt) : datan2(hd[0], hd[1]), qP = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot), pP = [ps.pos[0], (sw && swSum > 1e-9 ? (sw[0] * ankL[1] + sw[1] * ankR[1]) / swSum : (ankL[1] + ankR[1]) / 2) + this.pel.hRef, ps.pos[2]];   // lifecycle: height above the SUPPORTING ankles (H8)
      // lifecycle: the pose each leg aims its foot at — "where it is" in support (s = 1, the G3 path), the lifecycle target (hold / swing) blended
      // toward the current pose by s otherwise; a non-supporting leg solves from the ACTUAL pelvis frame (world-space foot servo), blended by s
      if (o.pelvisDrop) { const pd = o.pelvisDrop, u = Math.min(1, Math.max(0, (this.n * dt - pd.t0) / pd.dur)); pP[1] -= pd.dz * u * u * u * (10 - 15 * u + 6 * u * u); }   // EXPERIMENTAL planned drop (default off)
      // in a CONTACT state with no commanded swing target the hold is horizontal + yaw only: the target height follows the foot, so the leg never presses
      // a resting foot into the turf (measured: with a bent stance knee the sinking pelvis made the world-space hold load the "unsupported" foot 29 → 58 N
      // after touchdown — the balance model did not count it and the body fell after an abort, 60 N lift + 2.5 cm drop, 8 / 8 bodies)
      const lcT = sw ? [0, 1].map(n => { if (sw[n] >= 1) return null; const f = LC[n], cur = { pos: st[this.feet[n]].pos, rot: st[this.feet[n]].rot }, t0 = this.lc.target(n);
        const vAnch = (o.lcTouch && o.lcTouch.vert === "anchor") || o.touchRest; let t1 = f.swing || vAnch ? t0 : { pos: [t0.pos[0], t0.pos[1] + (1 - f.a) * (cur.pos[1] - t0.pos[1]), t0.pos[2]], rot: t0.rot };
        if (!f.swing && o.lcTouch && (o.lcTouch.hz === "follow" || o.lcTouch.yaw === "follow")) { const w = 1 - f.a, hzF = o.lcTouch.hz === "follow";   // DIAGNOSTIC (preswing/): in contact the horizontal position / yaw target follows the foot
          t1 = { pos: [hzF ? t1.pos[0] + w * (cur.pos[0] - t1.pos[0]) : t1.pos[0], t1.pos[1], hzF ? t1.pos[2] + w * (cur.pos[2] - t1.pos[2]) : t1.pos[2]], rot: o.lcTouch.yaw === "follow" ? yawToward(t1.rot, cur.rot, w) : t1.rot }; }
        return blendPose(t1, cur, sw[n]); }) : null;   // lcTouch.vert "anchor": the surface (contact anchor height)   // height: the foot's own (a = 0, contact) → the anchor's (a = 1, airborne), continuous in a (measured: a state-switched height stepped the target 3.7 mm → 88 N·m τ0 jump at a bounce re-liftoff)
      if (o.ikFeasible) for (const n of [0, 1]) { const ft = lcT ? (lcT[n] || st[this.feet[n]]) : this.unl[n] ? this.hold[n] : st[this.feet[n]], hip = V.add(pP, Q.rot(qP, this.anchor[this.legK[n][0]])), dh = dnorm(hip[0] - ft.pos[0], hip[2] - ft.pos[2]), Ln = this.legLen[n];
        if (dh < Ln) pP[1] = Math.min(pP[1], ft.pos[1] + Math.sqrt(Ln * Ln - dh * dh) - (hip[1] - pP[1])); }
      this.pelHT = pP[1];
      if ((o.vffPelvisAir || o.vffPassiveRef) && LC) { if (o.vffPassive && o.vffPassiveRef) throw new Error("vffPassive (diagnostic) and vffPassiveRef (B) are exclusive"); if (!this.cmdW) this.cmdW = [0, 0];
        const stp = dt / this.lc.o.release; for (const n of [0, 1]) this.cmdW[n] += Math.max(-stp, Math.min(stp, (LC[n].swing ? 1 : 0) - this.cmdW[n])); }   // A / B: continuous commanded-swing weight c
      // the non-supporting leg's frame at airborne weight aU: the ACTUAL pelvis position / orientation (world-space servo) with the posture TARGET height while in contact (a = 0) → actual
      // height once airborne (a = 1); contact height hC = min(target, actual) (diagnostic lcFrameH "target" / "actual"): measured — the ACTUAL height with a pelvis 1 cm above its target
      // made the touching leg a straight strut (knee 0°, ~60 N) that held the pelvis up, rolled the body over the stance foot's edge and felled it (60 N lift + 2.5 cm drop); the
      // TARGET height with the pelvis above target lifted the touching foot to the contact threshold (repeated TOUCHDOWN ↔ AIRBORNE, 12–18 N·m steps). Blended back to the full
      // posture frame by s; diagnostic lcFrame "target": the G3 posture frame in contact
      const lawFrame = (n, aU) => { const a1 = aU, hC = o.lcFrameH === "target" ? pP[1] : o.lcFrameH === "actual" || (o.lcTouch && o.lcTouch.frame === "actual") ? ps.pos[1] : Math.min(pP[1], ps.pos[1]), ns = { pos: [pP[0], hC + a1 * (ps.pos[1] - hC), pP[2]], rot: ps.rot };
        return o.lcFrame === "target" ? blendPose({ pos: pP, rot: qP }, { pos: ps.pos, rot: ps.rot }, a1) : blendPose(ns, { pos: pP, rot: qP }, sw[n]); };
      // the lifecycle's contact-compatible target of a non-supporting foot at a = 0 with no commanded swing target (1B accommodation law): the same expressions as lcT with a := 0, swing := none
      const lcTgtAcc = (n) => { const f = LC[n], cur = { pos: st[this.feet[n]].pos, rot: st[this.feet[n]].rot }, t0 = f.prevHold ? blendPose(f.prevHold, f.hold, 1 - 0) : f.hold;
        const vAnch = (o.lcTouch && o.lcTouch.vert === "anchor") || o.touchRest; let t1 = vAnch ? t0 : { pos: [t0.pos[0], t0.pos[1] + (1 - 0) * (cur.pos[1] - t0.pos[1]), t0.pos[2]], rot: t0.rot };
        if (o.lcTouch && (o.lcTouch.hz === "follow" || o.lcTouch.yaw === "follow")) { const w = 1 - 0, hzF = o.lcTouch.hz === "follow";
          t1 = { pos: [hzF ? t1.pos[0] + w * (cur.pos[0] - t1.pos[0]) : t1.pos[0], t1.pos[1], hzF ? t1.pos[2] + w * (cur.pos[2] - t1.pos[2]) : t1.pos[2]], rot: o.lcTouch.yaw === "follow" ? yawToward(t1.rot, cur.rot, w) : t1.rot }; }
        return blendPose(t1, cur, sw[n]); };
      // the non-supporting leg's servo law at airborne weight aU for the target tgt (swg: the commanded swing target, or null), previous-tick frame / target pv; its desired joint rates go into
      // out.ikW / out.ikWref. The default path evaluates it once at the lifecycle's own a (the original arithmetic); 1B (lcTransition "cmd") evaluates the complete approach (aU = 1) and
      // accommodation (aU = 0) laws and blends their COMMANDS (e2/FB1A_TR1B_PREREG.md §2). diag: DIAGNOSTIC recording (diagRecord) from this law
      const swLaw = (n, aU, tgt, swg, pv, out, diag) => { const fr = lawFrame(n, aU), r = this.legIKBounded(st, ev, n, fr.pos, fr.rot, tgt, { limits: "soft", fallback: "none" });
        // swingAccFF (default off): the inverse-dynamics wrench of the swing subtree for the supplied analytic reference, at this IK solution; d1FloatBase (1A): with the pelvis rigid-body motion
        const ffOn = !!(o.swingAccFF && this.swingRef && this.swingRef[n] && swg), accFF = ffOn ? this.swingAccWrench(st, ev, n, fr, r.x, { ...this.swingRef[n], vPel: ps.v }, o.diagD1PelAcc && this.diagPelV ? V.sc(V.sub(ps.v, this.diagPelV), 1 / dt) : A, fbPel ? fbPel[n] : null) : null;
        if (diag && o.diagRecord) { if (!this.diagRec) this.diagRec = [null, null]; const af = accFF; this.diagRec[n] = { x: r.x.slice(), err: r.err, fr: { pos: fr.pos.slice(), rot: fr.rot.slice() }, xd: af ? af.xd.slice() : null, xdd: af ? af.xdd.slice() : null, wP: {}, wT: {} }; }   // DIAGNOSTIC (recording only)
        let wA = 0, next = null;
        if (o.lcVff === "split" || o.lcVff === "lin" || o.lcVff === "linmin") { const opt = { limits: "soft", fallback: "none" }, now = new Map(r.targets), lg = (qa, qb) => { const sg = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3] < 0 ? -1 : 1, d = Q.mul(Q.conj(qa), qb.map(x => x * sg)); return [2 * d[0] / dt, 2 * d[1] / dt, 2 * d[2] / dt]; };
          // lcVff "split" (DIAGNOSTIC, preswing/): ω* = the joint velocity of the SAME target seen from the previous pelvis frame (pelvis motion only: a still foot is not dragged)
          // + the joint velocity of the COMMANDED swing target's own motion (only while a swing target is set on both ticks: anchor re-captures are never differentiated)
          // damping: a RESTING contact foot (no swing target) uses the solver's terminal damping IK.muMin — the still-foot reference must be exact, and the passivity bound below
          // keeps it safe; otherwise (airborne / commanded) the solver's damped-least-squares level IK.mu0 — robust near the straight-knee singularity
          // CONTINUOUS in the airborne weight a (no switch in the torque path): μ = μmin + a(μ0 − μmin); passivity-bound weight (1 − a)
          const aW = aU, mu = o.lcVff === "lin" ? IK.mu0 : IK.muMin + aW * (IK.mu0 - IK.muMin), cur = { pos: fr.pos, rot: fr.rot, tgt }, bnd = o.lcVff === "split";   // "lin" / "linmin": no passivity bound (DIAGNOSTIC variants)
          // vffRate (default off; e2/VFF_RATE_CORRECTION.md): "sr" = singularity-robust variable damping for the COMMANDED target's own motion (rT: an exogenous feed-forward of the
          // reference, outside any feedback loop); the pelvis-motion term (rP: measured frame motion, closed loop) keeps the caller's validated damping. "srAll" (REFUTED
          // DIAGNOSTIC) also applies it to rP — external-lift harness at drop 2.5 cm: falls, τ0 steps to 11 553 N·m (an explicit, one-tick-delayed copy of the measured pelvis
          // velocity through the leg's weak (vertical) direction, whose Cartesian damping scales as D/σ²; μ0 had bounded that loop gain at D/μ0)
          const srT = o.vffRate === "sr" || o.vffRate === "srAll", srP = o.vffRate === "srAll";
          // e2reanchorVel (default off; e2/E2_HANDOFF.md): at a B1 re-anchor tick the target-motion term is NOT dropped (I-11) but taken from the NEW reference's own pose one tick
          // earlier (e2reanchorPrev, set by the sequencer from the segment's polynomial): the rate stays continuous through the release (measured with vffRate "sr": the dropped
          // term was a one-tick 23 N·m dip of the knee's τ0 at liftoff); without the option the re-anchor tick skips rT exactly as before
          const tPrev = this.e2reanchor === n ? (o.e2reanchorVel ? this.e2reanchorPrev : null) : pv && pv.tgt;
          wA = o.vffPelvisAir && this.cmdW ? aW * this.cmdW[n] : 0;   // A: weight of the singularity-robust treatment of rP
          if (pv) { const rP = new Map(this.legIKRate(st, ev, n, pv.fr.pos, pv.fr.rot, tgt, r, cur, mu, srP, wA)), rT = swg && pv.swing && tPrev ? new Map(this.legIKRate(st, ev, n, fr.pos, fr.rot, tPrev, r, cur, mu, srT)) : null;
            // PASSIVITY BOUND on the pelvis part (drag cancellation): per axis ω*_P is clamped to [min(0, ω), max(0, ω)] of the joint's ACTUAL relative angular velocity
            // (the actuator's own convention), so the implicit damping on (ω − ω*) is never reversed and never does positive work — bounded near the straight-knee
            // singularity / soft-limit switches (measured unbounded there: τ0 steps of 300–31 000 N·m in the external-lift harness)
            for (const [k, q] of now) { const w = rP.has(k) ? lg(rP.get(k), q) : [0, 0, 0], d = P.jd[+k];
              if (d && bnd && aW < 1) { const R2 = Q.mul(st[d.child].rot, d.F2), wr = V.sub(st[d.child].w, st[d.parent].w); for (const i of [0, 1, 2]) { const wa = V.dot(wr, Q.rot(R2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])), wc = Math.min(Math.max(w[i], Math.min(0, wa)), Math.max(0, wa)); w[i] = (1 - aW) * wc + aW * w[i]; } }
              if (diag && o.diagRecord && this.diagRec && this.diagRec[n]) { this.diagRec[n].wP[k] = w.slice(); this.diagRec[n].wT[k] = rT && rT.has(k) ? lg(rT.get(k), q) : [0, 0, 0]; }   // DIAGNOSTIC (recording only)
              if (o.vffPassiveRef) { const w2 = rT && rT.has(k) ? lg(rT.get(k), q) : [0, 0, 0]; out.ikWref[k] = [w2[0] + wA * w[0], w2[1] + wA * w[1], w2[2] + wA * w[2]]; }   // B: the reference rate
              if (rT && rT.has(k)) { const w2 = lg(rT.get(k), q); w[0] += w2[0]; w[1] += w2[1]; w[2] += w2[2]; } out.ikW[k] = w; } }
          next = { fr: { pos: fr.pos.slice(), rot: fr.rot.slice() }, tgt: { pos: tgt.pos.slice(), rot: tgt.rot.slice() }, swing: !!swg }; }   // a non-supporting leg never targets beyond its passive (soft) limits — e.g. no hyperextended knee (measured: the unconstrained IK pressed it −2.8° into hyperextension, 18–20 N·m of tissue torque)
        return { r, fr, ffOn, accFF, wA, next }; };
      // 1B (lcTransition "cmd"; e2/FB1A_TR1B_PREREG.md §2): engagement at the swing foot's TOUCHDOWN entry (a commanded swing), disengagement when the blended command equals the default
      // law again (σ = σ_nom = 0 after a rebound: the approach law is the a = 1 law; σ = 1, a = 0 and no swing target: the accommodation law is the default contact law) or at support
      let T1B = null; if (o.lcTransition === "cmd" && LC) { if (!o.lifecycle || o.lcVff !== "lin") throw new Error("lcTransition \"cmd\" needs the lifecycle and lcVff \"lin\""); T1B = this.tr1B || (this.tr1B = [{ on: false }, { on: false }]);
        for (const n of [0, 1]) { const f = LC[n], T = T1B[n];
          if (!T.on && lcT && lcT[n] && f.state === "TOUCHDOWN" && f.since === this.lc.t && f.swing) { T.on = true; T.sigma = 0; T.sigNom = 0; T.stall = false; T.prevA = this.vffPrev ? this.vffPrev[n] : null; T.prevC = T.accPrev || null; T.tFrozen = null; T.t0 = this.n; }
          else if (T.on && (!lcT || !lcT[n] || (T.sigma <= 0 && f.a >= 1) || (T.sigma >= 1 && f.a <= 0 && !f.swing))) { T.on = false; if (this.vffPrev) this.vffPrev[n] = T.sigma >= 0.5 ? T.prevC : T.prevA; } } }
      const tIK = o.timeIK ? nowMs() : 0; ikT = {}; if (o.vffPassiveRef) this.ikWref = {}; if (o.torqueLedger) this.wAof = [0, 0]; if (o.lcVff === "split" || o.lcVff === "lin" || o.lcVff === "linmin") { this.ikW = {}; this.vffNext = [null, null]; } this.ikRes = [0, 1].map(n => { let r;
        if (lcT && lcT[n] && !(T1B && T1B[n].on)) { const L0 = swLaw(n, LC[n].a, lcT[n], LC[n].swing, this.vffPrev && this.vffPrev[n], { ikW: this.ikW, ikWref: this.ikWref }, true); r = L0.r;
          if (L0.ffOn) { if (!this.accFF) this.accFF = [null, null]; this.accFF[n] = L0.accFF; }
          if (L0.next) { if (o.torqueLedger) this.wAof[n] = L0.wA; this.vffNext[n] = L0.next; }
          if (T1B) T1B[n].accPrev = { fr: lawFrame(n, 0), tgt: null, swing: false }; }   // 1B (unused until engaged): the accommodation law's frame, so its pelvis-motion rate is defined on the first engaged tick
        else if (lcT && lcT[n]) {   // 1B ENGAGED (e2/FB1A_TR1B_PREREG.md §2): the complete approach law (a = 1, the commanded swing target, frozen if cleared) and accommodation law (a = 0, the lifecycle's contact-compatible target)
          const T = T1B[n], f = LC[n], cur = { pos: st[this.feet[n]].pos, rot: st[this.feet[n]].rot }; if (f.swing) T.tFrozen = { pos: f.swing.pos.slice(), rot: f.swing.rot.slice() };
          const outA = { ikW: {}, ikWref: {} }, outC = { ikW: {}, ikWref: {} }, LA = swLaw(n, 1, blendPose(f.swing || T.tFrozen, cur, sw[n]), f.swing, T.prevA, outA, true), LCc = swLaw(n, 0, lcTgtAcc(n), null, T.prevC, outC, false); r = LA.r;
          T.lawA = { ikT: Object.fromEntries(LA.r.targets), ikW: outA.ikW, ikWref: outA.ikWref, accFF: LA.accFF, wA: LA.wA }; T.lawC = { ikT: Object.fromEntries(LCc.r.targets), ikW: outC.ikW, ikWref: outC.ikWref, wA: LCc.wA };
          T.prevA = LA.next; T.prevC = LCc.next; T.accPrev = LCc.next; T.tick = this.n; if (o.torqueLedger) this.wAof[n] = LA.wA; }
        else r = this.legIK(st, ev, n, pP, qP, lcT ? null : this.unl[n] ? this.hold[n] : null);
        for (const [k, q] of r.targets) ikT[k] = q; return r.err; });
      if (o.lcVff === "split" || o.lcVff === "lin" || o.lcVff === "linmin") this.vffPrev = this.vffNext;
      if (o.lcVff === true && sw) { const prev = this.ikPrevT || {}; this.ikW = {}; for (const k in ikT) { const qp = prev[k], qn = ikT[k]; if (!qp) continue; const sg = qp[0] * qn[0] + qp[1] * qn[1] + qp[2] * qn[2] + qp[3] * qn[3] < 0 ? -1 : 1, d = Q.mul(Q.conj(qp), qn.map(x => x * sg)); this.ikW[k] = [2 * d[0] / dt, 2 * d[1] / dt, 2 * d[2] / dt]; }
        this.ikPrevT = {}; for (const k in ikT) this.ikPrevT[k] = ikT[k].slice(); }   // lcVff (DIAGNOSTIC): target joint velocity in the same joint-frame convention as the error e
      if (o.timeIK) this.cpuIK = (this.cpuIK || 0) + nowMs() - tIK; }   // G3: IK cost (timing only — no effect on the physics)
    if (o.posture === "task") { const ps = st[this.pelvis], pe = this.pel, yaw = datan2(hd[0], hd[1]), qref = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot);
      let qe = Q.mul(qref, Q.conj(ps.rot)); if (qe[3] < 0) qe = qe.map(x => -x); const eo = [2 * qe[0], 2 * qe[1], 2 * qe[2]];
      const To = [0, 1, 2].map(a => pe.Ko * eo[a] - pe.Do[a] * ps.w[a]), hp = ps.pos[1] - (ankL[1] + ankR[1]) / 2, Fy = pe.Kh * (pe.hRef - hp) - pe.Dh * ps.v[1];
      legW = [0, 1].map(n => { const hc = this.jointAt(st, this.hipK[n]), Fi = [0, share[n] * Fy, 0]; return { hc, F: Fi, T: V.add(V.sc(To, share[n]), V.cross(V.sub(ps.com, hc), Fi)) }; });
      this.postureInfo = { eo, To, hp, Fy }; }
    // hip / trunk strategy (only when the support cannot deliver p*: r ≠ 0): the stance hips apply L̇ = M·g·(ŷ × r) to the upper body
    // (whole-body angular momentum changes; the ground reaction gains the horizontal force the CoP could not provide). Finite: the hip
    // actuators clamp it; the posture preference (pelvis orientation) remains and returns the trunk afterwards.
    // Applied at the hips only (torque on the pelvis = share·L̇, reaction on the thigh): NOT propagated down the legs — the saturated CoP cannot take it.
    let Ldot = o.hip && (r[0] || r[1]) ? V.sc(V.cross([0, 1, 0], [r[0], 0, r[1]]), this.M * G * o.hipUse) : [0, 0, 0];
    if (Ldot[0] || Ldot[2]) { const yaw = datan2(hd[0], hd[1]), qref = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot); let qe = Q.mul(Q.conj(qref), st[this.pelvis].rot); if (qe[3] < 0) qe = qe.map(x => -x);
      const dev = 2 * dasin(Math.min(1, dnorm(qe[0], qe[2]))) * 180 / Math.PI; Ldot = V.sc(Ldot, Math.max(0, 1 - dev / o.hipMaxDeg)); }
    // only a LOADED leg can pass the trunk's reaction to the ground: the strategy torque is shared by the legs with load share above HIP_LOAD
    // (measured: 10 % of it on an unloaded hip swept that leg's foot 49 cm, backward-left 25 N·s)
    const hw = share.map(x => Math.max(0, x - HIP_LOAD)), hs = hw[0] + hw[1] || 1, hipShare = hw.map(x => x / hs);
    let armL = null, armF = [0, 0]; if (o.arms && (r[0] || r[1])) { armL = V.sc(V.cross([0, 1, 0], [r[0], 0, r[1]]), this.M * G * o.armUse * 0.5);
      armF = this.shK.map(k => { const q = ev.qs[k], qr = this.qref[k]; let qe = Q.mul(Q.conj(qr), q); if (qe[3] < 0) qe = qe.map(x => -x); const dev = 2 * dasin(Math.min(1, dnorm(qe[0], qe[1], qe[2]))) * 180 / Math.PI; return Math.max(0, 1 - dev / o.armMaxDeg); }); }
    if (o.noise) { const nz = o.noise, a = dexp(-dt / nz.tau), b = nz.sd * Math.sqrt(1 - a * a); for (let i = 0; i < 4; i++) this.ou[i] = a * this.ou[i] + b * this.gauss(); }
    // 4. feed-forward torques (inverse statics with d'Alembert) + posture preference → per-axis requests
    const cmd = [], ff = [], T1Bt = o.lcTransition === "cmd" && this.tr1B && LC ? this.tr1B : null, pend1B = T1Bt ? [[], []] : null;   // 1B: the engaged legs' rows, finalised by the governor below
    for (const d of P.jd) { const k = d.k, pj = this.jointAt(st, k); let T = [0, 0, 0];
      for (const i of this.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of this.subFeet[k]) { const n = this.feet.indexOf(f), pc = [cop[n][0], 0, cop[n][1]]; T = V.sub(T, V.cross(V.sub(pc, pj), F[n])); }
      if (o.swingAccFF && this.accFF && this.legSide[k] >= 0 && sw && this.accFF[this.legSide[k]] && this.accFF[this.legSide[k]].T[k]) T = V.add(T, V.sc(this.accFF[this.legSide[k]].T[k], 1 - sw[this.legSide[k]]));   // swingAccFF (default off)
      const side = this.legSide[k]; if (legW && side >= 0) { const w = legW[side]; T = V.sub(T, V.add(w.T, V.cross(V.sub(w.hc, pj), w.F))); }   // deliver the pelvis wrench share
      if (side >= 0 && k === this.hipK[side]) T = V.sub(T, V.sc(Ldot, hipShare[side]));
      if (armL && this.shK.includes(k)) T = V.add(T, V.sc(armL, armF[this.shK.indexOf(k)]));                                         // arm counter-motion                                                   // hip strategy (hips only)
      ff.push(T);
      const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => Q.rot(R2F2, e)), g = this.gain[k], isAnkle = g.base === "ankle";
      const q = ev.qs[k], qr = ikT && ikT[k] ? ikT[k] : this.qref[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const Lk = o.ffLockedAxis ? this.lockedFix[k] : null, tffB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;   // UNLOAD FIX B1 (default off)
      const sdE = this.legSide[k], TE = T1Bt && sdE >= 0 && sw && sw[sdE] < 1 && T1Bt[sdE].on && T1Bt[sdE].tick === this.n ? T1Bt[sdE] : null;   // 1B engaged leg: both laws' position errors and the approach law's D1
      const eOf = TE ? (qt) => { const q2 = qt || this.qref[k], s2 = q[0] * q2[0] + q[1] * q2[1] + q[2] * q2[2] + q[3] * q2[3] < 0 ? -1 : 1, d2 = Q.mul(Q.conj(q), q2.map(x => x * s2)); return [2 * d2[0], 2 * d2[1], 2 * d2[2]]; } : null;
      const eAC = TE ? [eOf(TE.lawA.ikT[k]), eOf(TE.lawC.ikT[k])] : null, D1v = TE && TE.lawA.accFF && TE.lawA.accFF.T[k] ? V.sc(TE.lawA.accFF.T[k], 1 - sw[sdE]) : null;
      cmd.push(KEYS.map((key, i) => { const tff = Lk != null && i === 3 - Lk ? tffB1 : V.dot(T, axW[i]), ak = this.spec.joints[k].def.axes[key];
        if (sw && this.legSide[k] >= 0 && sw[this.legSide[k]] < 1 && ikT && ikT[k]) { const sd = this.legSide[k], s1 = sw[sd], a1 = LC[sd].a, gs = this.gainSwing[k], gf = this.gainFree[k];   // lifecycle: continuous in s (support) and a (airborne)
          if (TE) {   // 1B (e2/FB1A_TR1B_PREREG.md §2): each law complete and coherent — its own gains, target error, desired rate (velocity-error law with its own gain) and feed-forward
            const lawAx = (X, aU, ffX, eX) => { const aG = o.lcTouch && o.lcTouch.gains === "swing" ? 1 : aU, Kn = isAnkle ? gs.K : g.K + aG * (gs.K - g.K), Dn = isAnkle ? gs.D : g.D + aG * (gs.D - g.D);
              const Kb = isAnkle ? (1 - s1) * Kn : s1 * g.K + (1 - s1) * Kn, Db = isAnkle ? s1 * o.ankleD + (1 - s1) * Dn : s1 * g.D + (1 - s1) * Dn, wv = o.lcVff && X.ikW[k] ? (1 - s1) * (Db + dt * Kb + (o.vffPassive ? this.spec.joints[k].damping : 0)) * X.ikW[k][i] : 0;
              const wB = o.vffPassiveRef && isAnkle && X.ikWref[k] ? (1 - s1) * this.spec.joints[k].damping * X.ikWref[k][i] : 0; return { K: Kb, D: Db, tau0: ffX + Kb * eX[i] + wv + wB, kp: Kb * eX[i], wv, wB }; };
            const d1 = D1v ? (Lk != null && i === 3 - Lk ? lockedAxisFF(D1v, axW, decompose(q).tw, Lk) : V.dot(D1v, axW[i])) : 0, RA = lawAx(TE.lawA, 1, tff + d1, eAC[0]), RC = lawAx(TE.lawC, 0, tff, eAC[1]);
            const row = { K: RA.K, D: RA.D, tau0: RA.tau0, ff: tff, vff: RA.wv }; pend1B[sd].push({ row, k, i, RA, RC, d1, tff }); return row; }
          // non-supporting hip / knee: in contact (a = 0) G3's validated hold (posture) gains; airborne (a = 1) the swing servo
          const aG = o.lcTouch && o.lcTouch.gains === "swing" ? 1 : a1, Kn = isAnkle ? gs.K : g.K + aG * (gs.K - g.K), Dn = isAnkle ? gs.D : g.D + aG * (gs.D - g.D);   // lcTouch.gains "swing": the unloaded-limb servo in contact too   // the ankle of a non-supporting foot: the swing ankle gains in every state (G3's free-leg 1.5 N·m/rad let a held foot tilt onto 2 pieces)
          const Kb = isAnkle ? (1 - s1) * Kn : s1 * g.K + (1 - s1) * Kn, Db = isAnkle ? s1 * o.ankleD + (1 - s1) * Dn : s1 * g.D + (1 - s1) * Dn; const wv = o.lcVff && this.ikW && this.ikW[k] ? (1 - s1) * (Db + dt * Kb + (o.vffPassive ? this.spec.joints[k].damping : 0)) * this.ikW[k][i] : 0;
          if (o.vffPassiveRef || o.torqueLedger) { const wB = o.vffPassiveRef && isAnkle && this.ikWref && this.ikWref[k] ? (1 - s1) * this.spec.joints[k].damping * this.ikWref[k][i] : 0, tau0 = o.vffPassiveRef ? tff + Kb * e[i] + wv + wB : tff + Kb * e[i] + wv;
            const L = o.torqueLedger ? { statics: tff - (o.swingAccFF && this.accFF && this.accFF[sd] && this.accFF[sd].T[k] ? (1 - s1) * V.dot(this.accFF[sd].T[k], axW[i]) : 0), d1: o.swingAccFF && this.accFF && this.accFF[sd] && this.accFF[sd].T[k] ? (1 - s1) * V.dot(this.accFF[sd].T[k], axW[i]) : 0, kp: Kb * e[i], vffServo: wv, passiveRef: wB, wA: this.wAof ? this.wAof[sd] : 0, c: this.cmdW ? this.cmdW[sd] : 0 } : undefined;
            return { K: Kb, D: Db, tau0, ff: tff, vff: wv, ...(o.vffPassiveRef ? { vffPas: wB } : {}), ...(L ? { L } : {}) }; }
          return { K: Kb, D: Db, tau0: tff + Kb * e[i] + wv, ff: tff, vff: wv }; }
        if (isAnkle && o.holdUnloaded && this.unl[this.legSide[k]] && ikT && ikT[k]) { const gf = this.gainFree[k]; return { K: gf.K, D: gf.D, tau0: tff + gf.K * e[i], ff: tff }; }   // G3: hold the unloaded foot's pose
        if (isAnkle) { const nz = o.noise && ak && (ak.key === "df" || ak.key === "inv") ? this.ou[(this.spec.joints[k].side === "L" ? 0 : 2) + (ak.key === "df" ? 0 : 1)] : 0; return { K: 0, D: o.ankleD, tau0: tff + nz, ff: tff }; }
        if (legW && this.legSide[k] >= 0 && ak && ak.key !== "rot") return { K: 0, D: o.taskD * g.D, tau0: tff, ff: tff };   // task-space leg rows (flexion / abduction)
        if (o.gainSched && this.legSide[k] >= 0) { const sd = this.legSide[k], Fs = this.sense.Fz, sc = (Fs[0] + Fs[1] > 1 ? Fs[sd] / (Fs[0] + Fs[1]) : 0.5) / 0.5, gf = this.gainFree[k];
          const Ks = Math.max(gf.K, g.K * sc), Ds = Math.max(gf.D, g.D * sc); return { K: Ks, D: Ds, tau0: tff + Ks * e[i], ff: tff }; }
        return { K: g.K, D: g.D, tau0: tff + g.K * e[i], ff: tff }; })); }
    // 1B certifying governor (e2/FB1A_TR1B_PREREG.md §2): per engaged leg, σ = the value closest to σ_nom = 1 − a in [σ_prev, σ_nom] with |τ0(σ) − τ0_prev| ≤ L_cmd (the E1a-7 commanded
    // limit 30·240/hz N·m per tick) on every actuated axis of the leg; none → σ held (stall): the transition term never contributes to a commanded violation. Aggregate per axis
    // τ0 = τ_shared + (1 − σ)(τ0_app − τ_shared) + σ(τ0_acc − τ_shared), K and D blended alike (the applied torque τ0 − (D + dt·K)ω is then the σ-blend of the two laws' applied torques)
    if (T1Bt) { const Lc = 30 * 240 * dt;
      for (const n of [0, 1]) { const T = T1Bt[n], P1 = pend1B[n];
        if (P1.length) { const sNom = Math.max(0, Math.min(1, 1 - LC[n].a)), sP = T.sigma; let lo = Math.min(sP, sNom), hi = Math.max(sP, sNom);
          for (const pq of P1) { const prev = T.tauPrev ? T.tauPrev[pq.k * 3 + pq.i] : undefined; if (prev == null) continue; const b = pq.RA.tau0 - prev, dd = pq.RC.tau0 - pq.RA.tau0;
            if (Math.abs(dd) < 1e-12) { if (Math.abs(b) > Lc) { lo = 1; hi = 0; } continue; } let x1 = (-Lc - b) / dd, x2 = (Lc - b) / dd; if (x1 > x2) { const tt = x1; x1 = x2; x2 = tt; } lo = Math.max(lo, x1); hi = Math.min(hi, x2); }
          const stall = lo > hi, sg = stall ? sP : Math.max(0, Math.min(1, sNom >= sP ? hi : lo)); T.sigma = sg; T.sigNom = sNom; T.stall = stall;
          for (const pq of P1) { const { row, RA, RC } = pq, tf = pq.tff; row.tau0 = tf + (1 - sg) * (RA.tau0 - tf) + sg * (RC.tau0 - tf); row.K = (1 - sg) * RA.K + sg * RC.K; row.D = (1 - sg) * RA.D + sg * RC.D; row.vff = (1 - sg) * RA.wv + sg * RC.wv;
            row.L1B = { sigma: sg, sigNom: sNom, stall, A: { tau0: RA.tau0, K: RA.K, D: RA.D, d1: pq.d1, kp: RA.kp, wv: RA.wv, wB: RA.wB }, C: { tau0: RC.tau0, K: RC.K, D: RC.D, kp: RC.kp, wv: RC.wv, wB: RC.wB } };
            if (o.torqueLedger) row.L = { statics: tf, d1: (1 - sg) * pq.d1, kp: (1 - sg) * RA.kp + sg * RC.kp, vffServo: (1 - sg) * RA.wv + sg * RC.wv, passiveRef: (1 - sg) * RA.wB + sg * RC.wB, wA: this.wAof ? this.wAof[n] : 0, c: this.cmdW ? this.cmdW[n] : 0 }; }
          if (this.vffPrev) this.vffPrev[n] = sg >= 0.5 ? T.prevC : T.prevA; }
        T.tauPrev = {}; for (let j = 0; j < P.jd.length; j++) { const k = P.jd[j].k; if (this.legSide[k] !== n || !cmd[j]) continue; cmd[j].forEach((rw, i) => { if (rw) T.tauPrev[k * 3 + i] = rw.tau0; }); } } }   // every tick: the issued command, the governor's reference
    this.info = { c, v, h, w0, xi, xiRef, pRaw, p, r, A, share, cop, F, support, polys, mid, heading: hd, ff, t, Ldot, lam, inSup, unl: this.unl.slice(), ikRes: this.ikRes ? this.ikRes.slice() : null, pelH: o.posture === "ik" ? this.pelHT : null };
    // E2 (option e2): e2reanchor = the leg whose swing target the sequencer re-anchored this tick (B1: to the measured foot state at liftoff) — like an anchor re-capture,
    // that one-tick target change is not differentiated into the target-motion velocity feed-forward (rT above); cleared every tick. Never set without e2
    if (o.swingAccFF) { this.info.accFF = this.accFF ? this.accFF.map(x => (x ? { T: x.T, xdd: x.xdd } : null)) : null; this.accFF = null; this.swingRef = null; }   // the reference must be supplied every tick
    if (o.diagD1PelAcc) this.diagPelV = st[this.pelvis].v.slice();   // DIAGNOSTIC (counterfactual only)
    if (o.d1FloatBase) { this.fbWPrev = st[this.pelvis].w.slice(); if (fbPel) this.info.fb = fbPel.map(x => ({ alOn: x.alOn, al: x.al.slice() })); }   // 1A: the pelvis angular velocity for the next tick's α̂
    if (T1Bt) this.info.tr1B = T1Bt.map(T => ({ on: !!T.on, sigma: T.sigma ?? 0, sigNom: T.sigNom ?? 0, stall: !!T.stall }));   // 1B (recording)
    if (LC) this.info.lc = LC.map(f => ({ state: f.state, s: f.s })); if (o.e2) { this.e2reanchor = null; this.e2reanchorPrev = null; this.info.qsRef = qsRef; this.info.xiRefDot = e2ref ? e2ref.xiRefDot.slice() : null; this.info.xiRefFF = xiRefFF.slice(); } this.n++;
    return cmd;
  }
}
// seeded PRNG (mulberry32) + Irwin–Hall Gaussian: deterministic across engines (integer ops and + − × ÷ only)
StandController.prototype.gauss = function () { let s2 = 0; for (let i = 0; i < 12; i++) { this.rng = (this.rng + 0x6D2B79F5) >>> 0; let t = this.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); s2 += ((t ^ (t >>> 14)) >>> 0) / 4294967296; } return s2 - 6; };
// ── leg inverse kinematics (posture targets): hip (3) + knee flexion + ankle DF / inversion so that the chain from the pelvis at pose (pP, qP)
//    ends exactly at the foot's CURRENT pose; knee axial rotation, the locked knee axis and the passive foot ab/adduction keep their current
//    values. Newton on the pyramid parameters, finite-difference Jacobian, from the current configuration.
StandController.prototype.getState = function () { return JSON.parse(JSON.stringify({ n: this.n, ring: this.ring, ou: this.ou, rng: this.rng, unl: this.unl, hold: this.hold, sense: this.sense, g3: this.g3 || null, info: this.info, twFilt: this.twFilt, ikPrevT: this.ikPrevT, vffPrev: this.vffPrev, cmdW: this.cmdW, fbWPrev: this.fbWPrev, fbLatch: this.fbLatch, tr1B: this.tr1B, lc: this.lc ? this.lc.getState() : undefined })); };   // info: the G3 supervisor reads the previous tick's controller state; twFilt: the DIAGNOSTIC drifting twist reference (pre-G4 runway; undefined → omitted, so the default state is unchanged)
StandController.prototype.setState = function (x) { const y = JSON.parse(JSON.stringify(x)); if (y.lc && this.lc) { this.lc.setState(y.lc); delete y.lc; } Object.assign(this, y); };   // lc: the EXPERIMENTAL lifecycle (absent by default)
// LEG IK (user decision 2026-10-04 §2; G3 J2a finding 2). Unknowns x = hip (twist, swing-y, swing-z), knee swing-y, ankle (swing-y, swing-z); the knee
// and ankle twists stay at their current values. Residual r(x) = [ankle position − target, foot orientation error] (6 × 6). The former solver
// (one-sided finite-difference Jacobian x_c + h, undamped Newton, stop at 1e-9, ≤ 6 iterations) was not mirror-equivariant: a reflection flips
// the sign of some DOFs, so the mirrored solve sampled different points, and the result was whichever iterate first crossed 1e-9 — or, for an
// unreachable target, wherever 6 undamped steps on a near-singular Jacobian ended. The method now addresses both causes:
//   • CENTRAL differences (x_c ± h): the sample set maps onto itself under the reflection;
//   • Levenberg–Marquardt (Marquardt-scaled damping μ·(1 + H_ii), μ0 = 1e-2, ÷10 on an accepted step, ×10 on a rejected one) converged to a
//     residual of 1e-12 (≤ 12 iterations), so the answer is the solution itself, not a path-dependent iterate; for an unreachable target it
//     converges to the least-squares optimum (stop when the gradient vanishes) and REPORTS the residual — the target is never moved and
//     reachability is never relaxed (classification is the caller's: err ≤ 1e-6 ⇔ reached).
// Method chosen by tools/ik_study.mjs over 10,880 problems × 8 bodies (ordinary, near-single-support, swing-ready held foot, reach-boundary sweep
// s = 0.8 … 1.05 in 13 directions, mirrored, perturbed starts): every reachable target converged ≤ 1e-12, mirror difference ≤ 3e-15 m (≤ 1e-8 m
// at / beyond the boundary), no reachability flip from start perturbations, and — unlike undamped LM — no solution on the hyperextended-knee
// branch from the controller's warm start. Returns { targets, err, it, x }.
// The chain (staged FK, central-difference Jacobian, warm start) is built by legChain, shared with the opt-in bounded variant below.
// lcVff "split" (DIAGNOSTIC, preswing/): the RATE of the bounded IK solution — one damped Gauss–Newton step (the solver's own LM damping IK.mu0) of the problem
// posed with another pelvis frame (pP, qP) or another foot target, taken FROM the current solution `sol`, with its box-active coordinates held: the linearised
// neighbouring solution, i.e. damped least squares (bounded at the straight-knee singularity; no re-solve, so no branch / tolerance noise between solves).
StandController.prototype.legIKRate = function (st, ev, n, pP, qP, footPose, sol, now, mu, sr = false, srW = 0) {   // srW (A, vffPelvisAir): weight of the singularity-robust damping, blended with mu   // sr (vffRate): singularity-robust variable damping of this solve   // now = { pos, rot, tgt }: the CURRENT problem (frame + target) the solution x solves
  const { ks, cur, fk, jac, kTw } = this.legChain(st, ev, n, pP, qP, footPose), x = sol.x, rp = fk(x), rn = this.legChain(st, ev, n, now.pos, now.rot, now.tgt).fk(x), r = rp.map((v, i) => v - rn[i]);   // Δr: only the change of the problem (an unreached target's residual cancels)
  const Jm = jac(x), g = Jm.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]);
  const free = [0, 1, 2, 3, 4, 5].filter(i => !sol.atBound[i]), xn = x.slice();
  if (free.length) { const H = Jm.map(ci => Jm.map(cj => ci[0] * cj[0] + ci[1] * cj[1] + ci[2] * cj[2] + ci[3] * cj[3] + ci[4] * cj[4] + ci[5] * cj[5]));
    // sr (vffRate, default off): singularity-robust variable damping — the caller's level only inside the singular region λmin < ε² (continuous in λmin)
    const m = sr ? IK.muMin + (mu - IK.muMin) * Math.max(0, 1 - Math.max(0, eigMinSym(free.map(i => free.map(c => H[i][c])))) / (IK.srEps * IK.srEps))
      : srW > 0 ? (1 - srW) * mu + srW * (IK.muMin + (mu - IK.muMin) * Math.max(0, 1 - Math.max(0, eigMinSym(free.map(i => free.map(c => H[i][c])))) / (IK.srEps * IK.srEps))) : mu;   // A: continuous in w_A
    const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + m * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i])); if (dx) free.forEach((i, k) => { xn[i] += dx[k]; }); }
  const tg = [[ks[0], pyr(xn[0], xn[1], xn[2])], [ks[1], pyr(kTw(xn), xn[3], cur[1][2])]]; if (footPose) tg.push([ks[2], pyr(cur[2][0], xn[4], xn[5])]); return tg; };
StandController.prototype.legChain = function (st, ev, n, pP, qP, footPose) {
  const P = this.P, ks = this.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => this.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  if (this.o.ikRefTwist) { const rf = ks.map(k => { const v = decompose(this.qref[k]); return v.tw; }); cur[1] = [rf[1], cur[1][1], cur[1][2]]; cur[2] = [rf[2], cur[2][1], cur[2][2]]; }
  if (this.o.ikTwistBlend != null) { const al = this.o.ikTwistBlend, rf = this.o.ikTwistTau > 0 && this.twFilt ? this.twFilt[n] : ks.map(k => decompose(this.qref[k]).tw);   // DIAGNOSTIC (pre-G4 runway)
    cur[1] = [(1 - al) * cur[1][0] + al * rf[1], cur[1][1], cur[1][2]]; cur[2] = [(1 - al) * cur[2][0] + al * rf[2], cur[2][1], cur[2][2]]; }   // twist DOFs at the reference
  // forward kinematics, staged so that a Jacobian column only recomputes the segments its DOF moves (overnight D: exact reuse — every reused value
  // is the identical expression on identical inputs, so results are bit-identical to the unstaged chain; verified on 10,880 problems + J2a)
  const ft = footPose || st[this.feet[n]], A0 = Q.mul(qP, d[0].F1), C0 = Q.conj(d[0].F2), C1 = Q.conj(d[1].F2), C2 = Q.conj(d[2].F2), pt = V.add(pP, Q.rot(qP, a[0]));
  const thigh = (qh) => { const Rt = Q.mul(Q.mul(A0, qh), C0); return { Rt, B1: Q.mul(Rt, d[1].F1), ps: V.add(pt, Q.rot(Rt, a[1])) }; };
  const shank = (T, qk) => { const Rs = Q.mul(Q.mul(T.B1, qk), C1); return { Rs, B2: Q.mul(Rs, d[2].F1), pf: V.add(T.ps, Q.rot(Rs, a[2])) }; };
  const res = (S, qa) => { const Rf = Q.mul(Q.mul(S.B2, qa), C2); let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v); const pf = S.pf;
    return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  // CORRECTED KNEE (v2k, EXPERIMENTAL; knee_correction/KNEE_PARAMETERIZATION.md §8): under the REFERENCE twist policy the knee axial reference is
  // the passive reference path θ0 at the knee flexion being solved — inside the FK, so the IK Jacobian sees it and the hip rotation absorbs the
  // coupled tibial rotation. Otherwise (old knee, or the "current" policy) the twist value exactly as before (bit-identical).
  const kTw = this.o.ikRefTwist && this.P.kneeIsV2K ? (x) => this.P.kneeRefTwistCS(ks[1], x[3]) : () => cur[1][0];
  const qhOf = (x) => pyr(x[0], x[1], x[2]), qkOf = (x) => pyr(kTw(x), x[3], cur[1][2]), qaOf = (x) => pyr(cur[2][0], x[4], x[5]);
  const fk = (x) => res(shank(thigh(qhOf(x)), qkOf(x)), qaOf(x));
  const jac = (x) => { const T0 = thigh(qhOf(x)), qk0 = qkOf(x), S0 = shank(T0, qk0), qa0 = qaOf(x);   // Jm[c][i] = ∂r_i/∂x_c, central differences
    return [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(), xm = x.slice(); xp[c] += IK.h; xm[c] -= IK.h;
      const ev2 = (y) => (c < 3 ? res(shank(thigh(qhOf(y)), qk0), qa0) : c === 3 ? res(shank(T0, qkOf(y)), qa0) : res(S0, qaOf(y)));
      const rp = ev2(xp), rm = ev2(xm); return rp.map((v, i) => (v - rm[i]) / (2 * IK.h)); }); };
  // segment poses at coordinates x (swingAccFF): rotations of thigh / shank / foot and their origins (= hip / knee / ankle joint positions)
  const pose = (x) => { const T = thigh(qhOf(x)), S = shank(T, qkOf(x)); return { R: [T.Rt, S.Rs, Q.mul(Q.mul(S.B2, qaOf(x)), C2)], p: [pt, T.ps, S.pf] }; };
  return { ks, cur, fk, jac, kTw, pose, x0: [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]] };
};
// swingAccFF (E2 D1; e2/SWING_ACCEL_FF_DESIGN.md §3): the inertial part of the Newton–Euler inverse dynamics of leg n's subtree (thigh, shank, foot) for the analytic swing
// reference ref = { vel, acc, w, al, vPel } (world), at the IK solution x of the swing target in frame fr; A = the statics' common acceleration. Resolved acceleration:
// J_f ẋ = [v − v_pelvis; ω], J_f ẍ = [a − A; α] − J̇_f ẋ with J_f the 6×6 foot-pose Jacobian of the IK chain; segment accelerations a_b = J_c ẍ + J̇_c ẋ, α_b = J_ω ẍ + J̇_ω ẋ,
// ω_b = J_ω ẋ (first derivatives by central differences in the coordinates, the velocity products by second differences along ẋ — as the IK computes its Jacobian);
// ΔT_k = Σ_{b distal to k} (c_b − p_k) × m_b a_b + I_b α_b + ω_b × I_b ω_b (world, about joint k; the statics' wrench convention). Returns { T: { k: ΔT_k }, xd, xdd } or null.
// d1FloatBase (1A; e2/FB1A_TR1B_PREREG.md §1): pel = { c, v, w, al } — the pelvis COM, COM velocity, angular velocity and angular-acceleration estimate (world). r_f = p_f − c,
// J_f ẋ = [v − v_p − ω_p × r_f; ω − ω_p]; J_f ẍ = [a − A − α_p × r_f − ω_p × (ω_p × r_f) − 2ω_p × v_rel − J̇_v ẋ; α − α_p − ω_p × ω_rel − J̇_ω ẋ]; segments a_b += α_p × r_b + ω_p × (ω_p × r_b)
// + 2ω_p × v_rel,b, α_b += α_p + ω_p × ω_rel,b, ω_b += ω_p (relative quantities along the chain at the current frame orientation). pel = null: the original arithmetic exactly
StandController.prototype.swingAccWrench = function (st, ev, n, fr, x, ref, A, pel = null) {
  const B = this.spec.bodies, ks = this.legK[n], ch = this.legChain(st, ev, n, fr.pos, fr.rot, null), bodies = ks.map(k => this.spec.joints[k].childIndex);
  const cOff = bodies.map(b => Q.rot(Q.conj(st[b].rot), V.sub(st[b].com, st[b].pos)));
  const kin = (y) => { const P = ch.pose(y); return { R: P.R, p: P.p, c: P.R.map((R, i) => V.add(P.p[i], Q.rot(R, cOff[i]))) }; };
  const angVel = (Ra, Rb, h) => { let q = Q.mul(Ra, Q.conj(Rb)); if (q[3] < 0) q = q.map(v => -v); return [2 * q[0] / h, 2 * q[1] / h, 2 * q[2] / h]; };
  const step = (y, d, s) => y.map((v, i) => v + s * d[i]), eps = IK.h, hT = 1e-3, K0 = kin(x);
  const cols = [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = 1; const kp = kin(step(x, e, eps)), km = kin(step(x, e, -eps));
    return { c: K0.c.map((_, b) => V.sc(V.sub(kp.c[b], km.c[b]), 1 / (2 * eps))), w: K0.R.map((_, b) => angVel(kp.R[b], km.R[b], 2 * eps)), pf: V.sc(V.sub(kp.p[2], km.p[2]), 1 / (2 * eps)) }; });
  const Jf = [0, 1, 2, 3, 4, 5].map(r => [0, 1, 2, 3, 4, 5].map(j => (r < 3 ? cols[j].pf[r] : cols[j].w[2][r - 3]))), bad = (v) => !v || v.some(q => !isFinite(q));
  const rf = pel ? V.sub(K0.p[2], pel.c) : null, xd = solveN(Jf, pel ? [...V.sub(V.sub(ref.vel, ref.vPel || [0, 0, 0]), V.cross(pel.w, rf)), ...V.sub(ref.w, pel.w)] : [...V.sub(ref.vel, ref.vPel || [0, 0, 0]), ...ref.w]); if (bad(xd)) return null;
  const kp = kin(step(x, xd, hT)), km = kin(step(x, xd, -hT)), dd = (b, key) => V.sc(V.add(V.sub(kp[key][b], V.sc(K0[key][b], 2)), km[key][b]), 1 / (hT * hT));
  const wAt = (y) => { const k1 = kin(step(y, xd, eps)), k2 = kin(step(y, xd, -eps)); return k1.R.map((_, b) => angVel(k1.R[b], k2.R[b], 2 * eps)); };
  const wP = wAt(step(x, xd, hT)), wM = wAt(step(x, xd, -hT)), wdot = wP.map((w, b) => V.sc(V.sub(w, wM[b]), 1 / (2 * hT)));
  const lin = (b, key, q) => cols.reduce((s, col, j) => V.add(s, V.sc(col[key][b], q[j])), [0, 0, 0]);
  if (pel) {   // 1A: transport (world) a = a_rel + α_p × r + ω_p × (ω_p × r) + 2ω_p × v_rel, α = α_rel + α_p + ω_p × ω_rel
    const wp = pel.w, ap = pel.al, trA = (r, vr) => V.add(V.add(V.cross(ap, r), V.cross(wp, V.cross(wp, r))), V.sc(V.cross(wp, vr), 2)), trW = (wr) => V.add(ap, V.cross(wp, wr));
    const vRelF = cols.reduce((s, col, j) => V.add(s, V.sc(col.pf, xd[j])), [0, 0, 0]), wRel = [0, 1, 2].map(b => lin(b, "w", xd)), vRel = [0, 1, 2].map(b => lin(b, "c", xd));
    const xdd = solveN(Jf, [...V.sub(V.sub(V.sub(ref.acc, A), dd(2, "p")), trA(rf, vRelF)), ...V.sub(V.sub(ref.al, wdot[2]), trW(wRel[2]))]); if (bad(xdd)) return null;
    const acc = [0, 1, 2].map(b => V.add(V.add(dd(b, "c"), lin(b, "c", xdd)), trA(V.sub(K0.c[b], pel.c), vRel[b]))), alpha = [0, 1, 2].map(b => V.add(V.add(wdot[b], lin(b, "w", xdd)), trW(wRel[b]))), omega = [0, 1, 2].map(b => V.add(wRel[b], wp));
    return { T: this._neWrench(ks, bodies, K0, acc, alpha, omega), xd, xdd }; }
  const xdd = solveN(Jf, [...V.sub(V.sub(ref.acc, A), dd(2, "p")), ...V.sub(ref.al, wdot[2])]); if (bad(xdd)) return null;
  const acc = [0, 1, 2].map(b => V.add(dd(b, "c"), lin(b, "c", xdd))), alpha = [0, 1, 2].map(b => V.add(wdot[b], lin(b, "w", xdd))), omega = [0, 1, 2].map(b => lin(b, "w", xd));
  return { T: this._neWrench(ks, bodies, K0, acc, alpha, omega), xd, xdd };
};
// the Newton–Euler wrench of the leg subtree about each leg joint for segment accelerations acc, angular accelerations alpha, angular velocities omega (world; swingAccWrench)
StandController.prototype._neWrench = function (ks, bodies, K0, acc, alpha, omega) { const B = this.spec.bodies;
  const Iw = (b, v) => { const R = K0.R[b], I = B[bodies[b]].inertia, l = Q.rot(Q.conj(R), v); return Q.rot(R, [0, 1, 2].map(i => I[i][0] * l[0] + I[i][1] * l[1] + I[i][2] * l[2])); };
  const T = {}; ks.forEach((k, idx) => { let w = [0, 0, 0]; for (let b = idx; b < 3; b++) w = V.add(w, V.add(V.add(V.cross(V.sub(K0.c[b], K0.p[idx]), V.sc(acc[b], B[bodies[b]].mass)), Iw(b, alpha[b])), V.cross(omega[b], Iw(b, omega[b])))); T[k] = w; });
  return T; };
StandController.prototype.legIK = function (st, ev, n, pP, qP, footPose = null) {
  if (this.o.ikBounds) return this.legIKBounded(st, ev, n, pP, qP, footPose);
  const { ks, cur, fk, jac, kTw, x0 } = this.legChain(st, ev, n, pP, qP, footPose);
  let x = x0, r = fk(x), err = dnorm(...r), it = 0, mu = IK.mu0, lastJ = null, lastH = null;
  for (; it < IK.maxIt && err > IK.tol; it++) {
    const Jm = jac(x), g = Jm.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]);
    if (dnorm(...g) < IK.gradTol) break;   // stationary: the least-squares optimum of an unreachable target
    const H = Jm.map(ci => Jm.map(cj => ci[0] * cj[0] + ci[1] * cj[1] + ci[2] * cj[2] + ci[3] * cj[3] + ci[4] * cj[4] + ci[5] * cj[5])); lastJ = Jm; lastH = H;
    let accepted = false;
    for (let tries = 0; tries < 8; tries++) { const A = H.map((row, i) => row.map((v, c) => (i === c ? v + mu * (1 + v) : v))), dx = solveN(A, g.map(v => -v)); if (!dx) { mu *= 10; continue; }
      const xn = x.map((v, i) => v + dx[i]), rn = fk(xn), en = dnorm(...rn); if (en < err) { x = xn; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); accepted = true; break; } mu *= 10; }
    if (!accepted) break; }
  // POLISH (overnight A3, adopted): once converged (err ≤ 1e-12), one more LM step with the last iteration's Jacobian, kept if it does not increase
  // the residual — the returned solution then sits at the rounding floor whichever side of the 1e-12 threshold the last iterate fell (J2a v3.1
  // finding: mirrored solves stopping one iteration apart, Δ ≈ 1e-12 rad). No new Jacobian; targets, reachability and the basin are unchanged.
  if (IK.polish === "stale" && err <= IK.tol && err > 0 && lastH) {
    const g = lastJ.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]), A = lastH.map((row, i) => row.map((v, c) => (i === c ? v + mu * (1 + v) : v))), dx = solveN(A, g.map(v => -v));
    if (dx) { const xn = x.map((v, i) => v + dx[i]), rn = fk(xn), en = dnorm(...rn); if (en <= err) { x = xn; r = rn; err = en; } } }
  const tg = [[ks[0], pyr(x[0], x[1], x[2])], [ks[1], pyr(kTw(x), x[3], cur[1][2])]]; if (footPose) tg.push([ks[2], pyr(cur[2][0], x[4], x[5])]);   // held foot: the ankle target too
  return { targets: tg, err, it, x };
};
// BOUNDED leg IK (opt-in, o.ikBounds; overnight Phase C candidate, NOT adopted — which limits and what to do with an anatomically unreachable
// foothold are G4 decisions). The same LM, residual, staged FK, Jacobian and polish as legIK, with the six solved coordinates (hip twist /
// flexion / abduction, knee flexion, ankle DF / inversion) kept inside the joint's ANATOMICAL hard limits (spec joints[k].limits.hard):
//   • the warm start is clamped into the box;
//   • active set: a coordinate on a bound whose descent direction leaves the box is held; the damped Gauss–Newton step is solved on the free
//     coordinates only and the trial point is projected onto the box (accepted iff the residual decreases);
//   • stop at a residual of 1e-12 (anatomically reached); otherwise the target is anatomically unreachable — err REPORTED (> 1e-6), the target
//     never moved — and the returned pose is the box-constrained least-squares optimum, refined by the Newton fallback below (the LM iterate
//     alone stopped up to 3.5° short of it; with the refinement the KKT residual is ≤ 4.4e-9 over the study's 5,368 unreached targets).
// The non-solved twist DOFs (knee axial rotation, passive ankle ab/adduction) stay at their current values, as in legIK. Study evidence
// (tools/ik_g4_study.mjs): on 20,736 targets × 8 bodies, 0 L/R classification mismatches, one valid solution per reachable target from 12
// seeded starts, and the warm-start solution is the closest valid one. Returns { targets, err, it, x, atBound }.
StandController.prototype.legIKBounded = function (st, ev, n, pP, qP, footPose = null, bo = null) {   // bo (EXPERIMENTAL lifecycle only): { limits: "hard" | "soft", fallback: "newton" | "none" }; null = the R4-tested defaults
  const { ks, cur, fk, jac, kTw, x0 } = this.legChain(st, ev, n, pP, qP, footPose), lim = ks.map(k => this.spec.joints[k].limits[bo && bo.limits === "soft" ? "soft" : "hard"]);
  const lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
  const clamp = (y) => y.map((v, i) => Math.min(hi[i], Math.max(lo[i], v))), gOf = (Jm, r) => Jm.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]);
  const step = (H, g, free, mu) => solveN(free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i]));
  let x = clamp(x0), r = fk(x), err = dnorm(...r), it = 0, mu = IK.mu0, lastJ = null, lastH = null, lastFree = null;
  for (; it < IK.maxItBounded && err > IK.tol; it++) {
    const Jm = jac(x), g = gOf(Jm, r), free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= lo[i] && g[i] > 0) || (x[i] >= hi[i] && g[i] < 0)));
    if (!free.length || Math.sqrt(free.reduce((s2, i) => s2 + g[i] * g[i], 0)) < IK.gradTol) break;   // stationary on the box: the constrained optimum
    const H = Jm.map(ci => Jm.map(cj => ci[0] * cj[0] + ci[1] * cj[1] + ci[2] * cj[2] + ci[3] * cj[3] + ci[4] * cj[4] + ci[5] * cj[5])); lastJ = Jm; lastH = H; lastFree = free;
    let accepted = false;
    for (let tries = 0; tries < 8; tries++) { const dx = step(H, g, free, mu); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = fk(xc), en = dnorm(...rn);
      if (en < err) { x = xc; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); accepted = true; break; } mu *= 10; }
    if (!accepted) break; }
  if (IK.polish === "stale" && err <= IK.tol && err > 0 && lastH) { const dx = step(lastH, gOf(lastJ, r), lastFree, mu);   // the adopted polish, on the last free set
    if (dx) { const xn = x.slice(); lastFree.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = fk(xc), en = dnorm(...rn); if (en <= err) { x = xc; r = rn; err = en; } } }
  // FALLBACK REFINEMENT (user decision 2026-10-04, Decision 2; tools/ik_anat_study.mjs method M5): for an anatomically UNREACHED target the
  // Gauss–Newton steps above stop short of the box-constrained optimum (large-residual problem: JᵀJ omits Σ rᵢ∇²rᵢ; KKT residual up to 7.5e-4,
  // up to 3.5° from the optimum). A projected damped Newton method with the FULL Hessian of ½‖r‖² (central differences of the gradient) then
  // converges to it: study over 5,368 unreached targets × 8 bodies — KKT ≤ 4.4e-9, ≤ 11 iterations, never a worse residual than 400 LM
  // iterations, deterministic, mirror Δ ≤ 1.3e-7 rad. Reached targets never enter this branch. IK.boundedFallback = "none" skips it (cheaper
  // classification-only queries).
  let fbIt = 0;
  if (err > 1e-6 && (bo && bo.fallback ? bo.fallback : IK.boundedFallback) === "newton") {
    const grad = (y) => { const Jm = jac(y), r2 = fk(y); return { g: gOf(Jm, r2), r: r2 }; };
    let G = grad(x); const half = (r2) => 0.5 * (r2[0] * r2[0] + r2[1] * r2[1] + r2[2] * r2[2] + r2[3] * r2[3] + r2[4] * r2[4] + r2[5] * r2[5]); let fv = half(G.r);
    for (; fbIt < IK.fallbackMaxIt; fbIt++) { const g = G.g, free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= lo[i] && g[i] > 0) || (x[i] >= hi[i] && g[i] < 0)));
      if (!free.length || Math.sqrt(free.reduce((s2, i) => s2 + g[i] * g[i], 0)) < IK.gradTol) break;
      const H = [0, 1, 2, 3, 4, 5].map(() => [0, 0, 0, 0, 0, 0]); for (let c = 0; c < 6; c++) { const xp = x.slice(), xm = x.slice(); xp[c] += IK.hNewton; xm[c] -= IK.hNewton; const gp = grad(xp).g, gm = grad(xm).g; for (let i = 0; i < 6; i++) H[i][c] = (gp[i] - gm[i]) / (2 * IK.hNewton); }
      for (let i = 0; i < 6; i++) for (let c = i + 1; c < 6; c++) { const m = 0.5 * (H[i][c] + H[c][i]); H[i][c] = m; H[c][i] = m; }
      let moved = false;
      for (let lam = 0, t = 0; t < 12; t++, lam = lam ? lam * 10 : 1e-10) { const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + lam : H[i][c]))), free.map(i => -g[i]));
        if (!dx || free.reduce((s2, i, k) => s2 + g[i] * dx[k], 0) >= 0) continue;   // not a descent direction: more damping
        const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn); if (xc.every((v, i) => v === x[i])) break;
        const Gn = grad(xc), fn = half(Gn.r); if (fn < fv) { x = xc; G = Gn; fv = fn; moved = true; break; } }
      if (!moved) break; }
    r = G.r; err = dnorm(...r); }
  const tg = [[ks[0], pyr(x[0], x[1], x[2])], [ks[1], pyr(kTw(x), x[3], cur[1][2])]]; if (footPose) tg.push([ks[2], pyr(cur[2][0], x[4], x[5])]);
  return { targets: tg, err, it, x, atBound: x.map((v, i) => v <= lo[i] || v >= hi[i]), fallbackIt: fbIt };
};
export const IK = { h: 1e-6, tol: 1e-12, maxIt: 12, maxItBounded: 30, mu0: 1e-2, muMin: 1e-12, gradTol: 1e-14, boundedFallback: "newton", fallbackMaxIt: 25, hNewton: 1e-5,   // bounded (opt-in) solver only
  polish: (typeof process !== "undefined" && process.env && process.env.V2_IK_POLISH) || "stale",   // "stale" (adopted) | "none" (diagnostic env selector, Node only)
  // vffRate "sr" only: width ε of the singular region in σmin of the free rate problem (m/rad-scaled Gauss–Newton units of the foot-pose residual). From the conditioning
  // study (e2/VFF_RATE_CORRECTION.md §2, tools/rate_cond_preload.mjs; swing, hover, lift, resting and straight-leg external-lift problems, 7 bodies, 180–480 Hz): above
  // σmin 0.01 the undamped one-step rate equals the exact per-tick displacement of the IK solution within 4 % (max); below it accuracy degrades (p95 error 3–19 % at
  // 0.003–0.01) and fails at the straight-knee singularity (σmin < 0.001: errors 10²–10⁵). Airborne / commanded poses measured: σmin ≥ 0.03
  srEps: 0.01 };
// smallest eigenvalue of a small symmetric matrix: cyclic Jacobi (vffRate "sr"). Only + − × ÷ √ and comparisons: IEEE-deterministic (browser = Node)
function eigMinSym(A0) { const n = A0.length, A = A0.map(r => r.slice());
  for (let sweep = 0; sweep < 50; sweep++) { let off = 0, dia = 0; for (let p = 0; p < n; p++) { dia += A[p][p] * A[p][p]; for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q]; }
    if (off <= 1e-30 * dia) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) { const apq = A[p][q]; if (apq === 0) continue;
      const th = (A[q][q] - A[p][p]) / (2 * apq), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), sn = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - sn * akq; A[k][q] = sn * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - sn * aqk; A[q][k] = sn * apk + c * aqk; } } }
  let mn = Infinity; for (let p = 0; p < n; p++) mn = Math.min(mn, A[p][p]); return mn; }
export const _eigMinSym = eigMinSym;   // test hook (tools/v2_component_regressions.mjs style checks only)
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
// inertia tensor (world axes) of a set of bodies about point o, in pose S
function inertiaAbout(B, S, ids, o) { const I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const i of ids) { const R = S[i].rot, Il = B[i].inertia, cols = [0, 1, 2].map(c => Q.rot(R, [Il[0][c], Il[1][c], Il[2][c]])), Rm = [0, 1, 2].map(c => Q.rot(R, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][c]));
    // R·I·Rᵀ
    const RI = [0, 1, 2].map(r => [0, 1, 2].map(c => cols[c][r])), RIRt = [0, 1, 2].map(r => [0, 1, 2].map(c => RI[r][0] * Rm[0][c] + RI[r][1] * Rm[1][c] + RI[r][2] * Rm[2][c]));
    const d = V.sub(V.add(S[i].pos, Q.rot(R, B[i].comLocal)), o), m = B[i].mass, dd = V.dot(d, d);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) I[r][c] += RIRt[r][c] + m * ((r === c ? dd : 0) - d[r] * d[c]); }
  return I; }
const norm2 = (a) => { const l = dnorm(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
function centroid(poly) { let A = 0, x = 0, z = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1]; A += cr; x += (p[0] + q[0]) * cr; z += (p[1] + q[1]) * cr; } return [x / (3 * A), z / (3 * A)]; }
// nearest point of a convex polygon (CCW or CW) to q (q itself if inside)
export function clampPoly(poly, q) { if (insidePoly(poly, q)) return q.slice(); let best = null, bd = Infinity;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / L)), x = a[0] + t * ex, z = a[1] + t * ez, d = (q[0] - x) ** 2 + (q[1] - z) ** 2;
    if (d < bd) { bd = d; best = [x, z]; } } return best; }
// INSIDE TEST, exact for any simple polygon (overnight A1 finding). The former sign-consistency test was valid only for CONVEX polygons, but the
// usable foot region (a radial 5 mm inset of the convex contact hull) is not always convex — the inset turns a nearly straight lateral-midfoot hull
// vertex into a shallow reflex vertex — so ~2.7 % of the true region was reported outside and clampPoly / polyDist acted on wrong membership there
// (both the former and the canonical regions; tools/region_study.mjs). Crossing-number test; points on the boundary count as inside, as before;
// identical answers for convex polygons; mirror-invariant (the parity of crossings is the same to either side).
export function insidePoly(poly, q) { let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[j], b = poly[i], cr = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    if (cr === 0 && Math.min(a[0], b[0]) <= q[0] && q[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= q[1] && q[1] <= Math.max(a[1], b[1])) return true;
    if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; }
  return inside; }
// signed distance of q to a simple polygon (+ inside)
export function polyDist(poly, q) { let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = dnorm(ex, ez), t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / (L * L))); d = Math.min(d, dnorm(q[0] - a[0] - t * ex, q[1] - a[1] - t * ez)); } return insidePoly(poly, q) ? d : -d; }
// the usable CoP region of one boot (foot-local [x, z]): canonical hull → radial inset d → canonical convex hull (strictly convex, CCW from min z)
export function usableRegion(pts, d) { return hull2Canonical(insetPoly(hull2Canonical(pts), d).map(([x, z]) => [x, 0, z])); }
export function insetPoly(poly, d) { if (!d) return poly; const c = centroid(poly); return poly.map(([x, z]) => { const dx = x - c[0], dz = z - c[1], L = dnorm(dx, dz) || 1; return [x - dx / L * d, z - dz / L * d]; }); }
