// ═══ physchar/pc_balance.js — GATE C1: FEET-IN-PLACE BALANCE (support state → target composer → finite motors) ════════════════════════
// The controller reads one (possibly delayed) SENSED observation of the solved body and returns joint TARGETS and motor settings for the
// next physics step. It never touches a body. Every stabilising effect it can have is a change of joint targets that makes the finite
// motors push on the ground through the planted feet.
//
//   intent (stand: nominal stance pose, pelvis height, upright trunk, COM over mid-foot)
//     → support state + classification          (feet from SENSING; capture point ξ vs the reliable support polygon)
//     → target composer:
//          nominal     stance legs solved UPWARD from the ACTUAL feet (two-bone IK), trunk held in WORLD orientation via the stance
//                      hips, upper body from the nominal pose
//          gravity     Jᵀ of gravity + the static ground reaction (CoP under the COM) → joint torques → target offsets τ/kp
//          balance     Jᵀ of the extra ground reaction for the capture-point CoP law (ankle strategy) + a trunk torque about the hips
//                      when that CoP saturates at the support edge (hip strategy)          → target offsets τ/kp
//          final       nominal ⊗ exp(gravity + balance offsets)
//     → finite Jolt motors (directional, budgeted torque limits; stance / swing damping)
//
// Deterministic: only + − × ÷ √ and the pc_math deterministic trig / exp are used for anything that reaches a target or a decision.
import { V, Q, rad, deg, datan2, dacos, dexp, dsin, dcos } from "./pc_math.js";
import { csOfRel, relOf, MOTOR_REGIONS, REGION_OF, motorProfile, paramTarget, minjerk } from "./pc_control.js";
import { polyDist, polyClamp, polyNearest } from "./pc_sense.js";

// ── motor strength, revised from Gate B (review items M1/M2/M3) ─────────────────────────────────────────────────────────────────────
// Directional torque limits (N·m), [lo, hi] per constraint axis. Sign convention verified by a one-joint probe: positive motor torque drives
// the axis toward positive angle — ankle Y+ = plantarflexion, hip Y+ = extension, spine / neck Y+ = flexion, shoulder Y− = flexion, hinge
// + = flexion. Approximate adult-male isometric maxima: knee extension 247 N·m (Harbo et al. 2012); the rest typical dynamometry values.
export const LIMITS_C1 = {
  ankle:    { X: [-20, 20], Y: [-45, 150], Z: [-35, 35] },     // dorsiflexion 45 (Gate B had 110), plantarflexion 150, inversion/eversion 35
  knee:     { H: [-250, 130] },                                 // extension 250, flexion 130
  hip:      { X: [-60, 60], Y: [-190, 250], Z: [-140, 140] },   // flexion 190, extension 250, ab/adduction 140, rotation 60
  spine:    { X: [-80, 80], Y: [-250, 180], Z: [-150, 150] },   // extension 250, flexion 180, lateral 150, rotation 80
  neck:     { X: [-20, 20], Y: [-45, 25], Z: [-30, 30] },       // extension 45, flexion 25
  shoulder: { X: [-45, 45], Y: [-70, 80], Z: [-65, 65] },       // flexion 70, extension 80, ab/adduction 65, rotation 45
  elbow:    { H: [-50, 75] },                                   // extension 50, flexion 75
};
// V1.1 torque audit (review_artifacts/physical_character_v1/v1_1/): the C1 profile checked against Harbo et al. 2012 (isometric, men < 30 y:
// knee extension 265 ± 73, hip flexion 167 ± 37, dorsiflexion 44 ± 11, shoulder abduction 60 ± 14, elbow flexion 50 ± 18 N·m; isokinetic hip
// extension 197 ± 58, knee flexion 106, plantarflexion 128) and hip abduction ≈ 1.3–1.9 N·m/kg. Only the values above that evidence change:
// hip flexion 190 → 170, hip extension 250 → 230, shoulder abduction 65 → 60, elbow flexion 75 → 60. Hip abduction stays 140 (not raised).
export const LIMITS_V11 = {
  ankle:    { X: [-20, 20], Y: [-45, 150], Z: [-35, 35] },
  knee:     { H: [-250, 130] },
  hip:      { X: [-60, 60], Y: [-170, 230], Z: [-140, 140] },
  spine:    { X: [-80, 80], Y: [-250, 180], Z: [-150, 150] },
  neck:     { X: [-20, 20], Y: [-45, 25], Z: [-30, 30] },
  shoulder: { X: [-45, 45], Y: [-70, 80], Z: [-60, 60] },
  elbow:    { H: [-50, 60] },
};
export const limitsFor = (spec) => spec.calib && spec.calib.name === "V1.1" ? LIMITS_V11 : LIMITS_C1;
// the WORKING controller of each calibration: V1 = the approved Gate C2 controller (no options); V1.1 = the approved controller plus the
// corrections its anatomy logically requires (R1 anticipateReach, R2 reachToGround — reach geometry of the narrower hips) and the planned,
// physically bounded unloading of a transfer (unloadPlan). The historical V1.1 evidence is reproduced with ctrl "approved" (+ flags).
export const controllerProfile = (spec) => spec.calib && spec.calib.name === "V1.1" ? { anticipateReach: true, reachToGround: true, unloadPlan: true, reachAll: true, ankleReach: true } : {};
export const STRENGTH_C1 = { candidate: 1, weak: 0.5, strong: 3 };
export const BAL = {
  kXi: 0.5,            // capture-point CoP law p* = ξ + kXi·(ξ − ξref): ξ converges at ω0·kXi; total ankle stiffness ≈ (1 + kXi)·mgh (Peterka 2002: ≈ 1.33)
  copInset: 0.015,     // m: the demanded CoP stays 1.5 cm inside the reliable support polygon (keeps the feet flat)
  trunkMaxDeg: 35,     // hip strategy: no further trunk torque beyond 35° of trunk deviation in that direction
  hipUse: 0.8,         // fraction of the stance hips' torque the hip strategy may request
  budgetFloor: 0.25,   // multi-axis budget: a non-dominant axis keeps at least 25 % of its directional limit
  confirmSteps: 15,    // 62.5 ms of STEP_NEEDED / UNRECOVERABLE before the controller releases posture (fall transition)
  fallScale: 0.3, fallTone: 0.6, fallRampSteps: 24,   // released: stiffness → 30 % over 0.1 s, 60 % of the static gravity support kept (tone), no balance / IK
  warmupSteps: 12,     // 50 ms: the first observations only establish the contact state
  stanceKdScale: 0.3,  // intrinsic (undelayed) stance-leg damping = 0.3 × Gate B's stance-load critical damping (ankle ζ ≈ 0.25): the rest of the
                       // sway damping is the capture-point law's velocity term, which the sensing delay affects (C1 finding: at 1.0 the
                       // undelayed motor damping did the stabilising and a 100 ms delay made little difference)
  muBelief: 0.9,       // assumed boot-on-turf friction until a foot is seen sliding
  reengageSteps: 24,
  reachExt: 0.995,      // C2: a stance / landing leg at most 99.5 % extended (knee ≥ ≈ 11°)
  dorsiMarginDeg: 5,    // C2: pelvis lowering stops 5° before any stance ankle reaches its dorsiflexion stop
  settleKp: 0.2,        // C2: ankle stiffness fraction of a foot being loaded after touchdown (compliant heel rocker)
  swingKpDrop: 0.5,    // GATE C2: a swing-controlled leg runs at (1 − 0.5) × stance stiffness — compliant enough that an obstruction wins   // released, but both feet loaded + flat-supported and ξ ≥ 3 cm inside for 100 ms → balance re-engages (ramped back)
  stepTime: 0.3, stepReach: 0.55,
  armShare: 0.5, armUse: 0.8, armGuardDeg: 15,
  protK: 0.6, protKLeg: 0.45, protRestV: 0.3, protFadeSteps: 120,   // C5: bracing lasts while any grounded segment still moves (≥ protRestV m/s), then fades to tone over 120 steps (0.5 s at 240 Hz)
                     // GATE C5 protective response: stiffness of the protective arms / neck / spine and legs (fraction of normal)   // GATE C4 reactive arms: the arms' share of the hip-strategy moment, the fraction of their shoulder torque they may use, range-of-motion guard       // C1 labelling only: a single step of ≤ 0.3 s could capture ξ up to ~0.55 m beyond the support edge
};
const G = 9.81, GV = [0, -9.81, 0];
// GATE C5 protective targets per fall direction (joint parameters in degrees, the Gate A convention: shoulder Y− = flexion, shoulder Z
// abduction = − for L / + for R, neck / spine Y+ = flexion, hip Y+ = extension, knee / elbow + = flexion). Joints not listed keep nominal.
export const PROT = {
  F: { shoulder_L: { y: -75, z: -15 }, shoulder_R: { y: -75, z: 15 }, elbow_L: { a: 25 }, elbow_R: { a: 25 }, neck: { y: -15 }, hip_L: { y: -20 }, hip_R: { y: -20 }, knee_L: { a: 30 }, knee_R: { a: 30 } },
  B: { shoulder_L: { y: 30, z: -35 }, shoulder_R: { y: 30, z: 35 }, elbow_L: { a: 30 }, elbow_R: { a: 30 }, neck: { y: 35 }, thoracic: { y: 15 }, lumbar: { y: 15 }, hip_L: { y: -60 }, hip_R: { y: -60 }, knee_L: { a: 70 }, knee_R: { a: 70 } },
  R: { shoulder_R: { y: -20, z: 75 }, elbow_R: { a: 15 }, shoulder_L: { y: -40, z: -10 }, elbow_L: { a: 45 }, neck: { y: 10 }, knee_L: { a: 25 }, knee_R: { a: 25 } },
  L: { shoulder_L: { y: -20, z: -75 }, elbow_L: { a: 15 }, shoulder_R: { y: -40, z: 10 }, elbow_R: { a: 45 }, neck: { y: 10 }, knee_L: { a: 25 }, knee_R: { a: 25 } } };
const PROT_J = new Set(Object.values(PROT).flatMap(o => Object.keys(o)));
const nlerpQ = (a, b, s) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = d < 0 ? b.map(x => -x) : b; return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * s)); };
const expmap = (d) => { const a = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); return a < 1e-12 ? [0, 0, 0, 1] : Q.axis([d[0] / a, d[1] / a, d[2] / a], a); };
const clampVec = (d, m) => { const a = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); return a > m ? V.sc(d, m / a) : d; };
const logmap = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const s = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, x[3]); return [x[0] / s * a, x[1] / s * a, x[2] / s * a]; };
const yawQ = (psi) => Q.axis([0, 1, 0], psi);

export class BalanceController {
  // opts: { strength: "candidate"|"weak"|"strong", mode: "balance"|"hold", xiShift: (t) => [dx, dz] }
  constructor(spec, poses, opts) {
    this.spec = spec; this.P = poses; this.opts = opts || {}; this.mode = this.opts.mode || "balance"; this.M = spec.totalMass; this.limits = limitsFor(spec);
    this.mult = typeof this.opts.strength === "number" ? this.opts.strength : STRENGTH_C1[this.opts.strength || "candidate"];
    const bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n); this.bi = bi; this.ji = ji;
    // gains: Gate B stiffness (kp = τ_GateB / θsat) scaled by strength; stance kd = Gate B kd (stance-load inertia); swing kd from the distal leg
    const base = motorProfile(spec, poses.N.S, 1);
    const sub = (root) => { const out = [root]; for (let i = 0; i < out.length; i++) spec.joints.forEach(j => { if (j.parentIndex === out[i]) out.push(j.childIndex); }); return out; };
    this.subtree = spec.joints.map(j => sub(j.childIndex));
    const S = poses.N.S, inertiaAbout = (set, p) => set.reduce((a, i) => { const b = spec.bodies[i], c = V.add(S[i].pos, Q.rot(S[i].rot, b.com)), d = V.sub(c, p); return a + (b.inertia[0] + b.inertia[1] + b.inertia[2]) / 3 + b.mass * V.dot(d, d); }, 0);
    const kdS = this.opts.stanceKdScale ?? BAL.stanceKdScale;
    this.gain = spec.joints.map((j, k) => { const region = REGION_OF[j.name], kp = base[k].kp * this.mult, kdStance = base[k].kd * Math.sqrt(this.mult) * (/^(hip|knee|ankle)_/.test(j.name) ? kdS : 1);
      const kdSwing = 2 * Math.sqrt(kp * inertiaAbout(this.subtree[k], S[j.childIndex].pos)), L = this.limits[region === "spine" ? "spine" : region];
      const lim = j.type === "hinge" ? { lo: L.H[0] * this.mult, hi: L.H[1] * this.mult } : { lo: [L.X[0], L.Y[0], L.Z[0]].map(x => x * this.mult), hi: [L.X[1], L.Y[1], L.Z[1]].map(x => x * this.mult) };
      return { joint: j.name, region, kp, kdStance, kdSwing, leg: /^(hip|knee|ankle)_/.test(j.name) ? j.name.slice(-1) : null, lim }; });
    // leg geometry (bind) for the ground-up IK
    this.legs = {}; for (const s of ["L", "R"]) { const t = bi("thigh_" + s), sh = bi("shin_" + s), f = bi("foot_" + s), B = spec.bodies;
      const L1 = V.dist(B[sh].origin, B[t].origin), L2 = V.dist(B[f].origin, B[sh].origin);
      this.legs[s] = { thigh: t, shin: sh, foot: f, hip: ji("hip_" + s), knee: ji("knee_" + s), ankle: ji("ankle_" + s), L1, L2,
        a0: V.sc(V.sub(B[sh].origin, B[t].origin), 1 / L1), b0: V.sc(V.sub(B[f].origin, B[sh].origin), 1 / L2), hipOff: V.sub(B[t].origin, B[0].origin),
        kneeAxis: spec.joints[ji("knee_" + s)].axis }; }
    // intent: the nominal stance (Gate B pose N): pelvis height above the ankle joints, root pitch, COM over mid-foot
    const N = poses.N; this.hPelvis = N.rootPos[1] - N.feet.L[1]; this.rootPitch = rad(2);
    const comN = [0, 0, 0]; spec.bodies.forEach((b, i) => { const c = V.add(S[i].pos, Q.rot(S[i].rot, b.com)); comN[0] += c[0] * b.mass / this.M; comN[1] += c[1] * b.mass / this.M; comN[2] += c[2] * b.mass / this.M; });
    this.comFwd = comN[2] - (N.feet.L[2] + N.feet.R[2]) / 2; this.hNom = comN[1];
    // hip-strategy capacity (LIPM + flywheel, Pratt et al. 2006): a bang-bang trunk torque τ for T, −τ for T (trunk turns θmax) shifts the
    // capturable ξ by Δ = d·(1 − e^(−ω0·T))², d = τ/(M·g), T = √(θmax·I_ub/τ). Computed per direction from the stance hips' limits.
    const hipC = V.sc(V.add(S[this.legs.L.thigh].pos, S[this.legs.R.thigh].pos), 0.5), ub = ["pelvis", "abdomen", "chest", "head", "upperArm_L", "foreArm_L", "upperArm_R", "foreArm_R"].map(bi);
    const Iub = inertiaAbout(ub, hipC), w0 = Math.sqrt(G / this.hNom), th = rad(BAL.trunkMaxDeg), hipL = this.limits.hip;
    const cap = (tau) => { const t = tau * BAL.hipUse * this.mult, d = t / (this.M * G), T = Math.sqrt(th * Iub / t), e = 1 - dexp(-w0 * T); return d * e * e; };
    this.hipCap = { fwd: cap(2 * -hipL.Y[0]), bwd: cap(2 * hipL.Y[1]), lat: cap(2 * hipL.Z[1]), Iub };
    this.armI = {}; for (const side of ["L", "R"]) { const k = ji("shoulder_" + side); this.armI[side] = inertiaAbout(this.subtree[k], S[spec.joints[k].childIndex].pos); }   // C4: each arm's inertia about its shoulder
    this.cls = { state: "INIT", cnt: 0, out: 0, back: 0, times: {}, reason: "", fallStep: null }; this.sFoot = { L: 1, R: 1 }; this.nObs = 0;
  }
  // classification from the sensed state (hysteresis + dwell in integer steps)
  _classify(o, r, hipCapHere) {
    const C = this.cls, t = o.t, mark = (k) => { if (C.times[k] == null) C.times[k] = t; };
    if (o.nonFootGround) { C.ground = (C.ground || 0) + 1; if (C.ground >= 2) { C.state = "GROUNDED"; mark("GROUNDED"); if (C.times.FALLING == null) mark("FALLING"); return; } } else C.ground = 0;
    if (C.state === "GROUNDED") return;
    // DIAGNOSTIC ONLY (opts.releaseAt, D6X): the controller gives up at a set time — the fall release (or a limp one, releaseMode "limp")
    // with the same physical body — to measure how much of a response balance control itself provides. Never part of a character.
    if (this.opts.releaseAt != null && t >= this.opts.releaseAt && C.state !== "FALLING") { C.state = "FALLING"; mark("FALLING"); C.fallStep = this.nObs; C.reengageStep = null; C.noReengage = true; C.reason = `diagnostic release at ${this.opts.releaseAt} s`; return; }
    if (C.state === "FALLING" && C.noReengage) return;
    if (C.state === "FALLING") {                                    // re-engage only if the PHYSICS says in-place balance is clearly possible again
      const ok = ["L", "R"].every(s => o.feet[s].loaded && o.feet[s].touching && !o.feet[s].slipping) && o.xiMargin > 2 * BAL.copInset && o.trunkTiltDeg < 30;
      C.reOk = ok ? (C.reOk || 0) + 1 : 0; if (C.reOk >= BAL.reengageSteps) { C.state = "RECOVERABLE_IN_PLACE"; C.out = 0; C.back = 0; C.reOk = 0; C.reengaged = (C.reengaged || 0) + 1; mark("REENGAGED"); C.reengageStep = this.nObs; }
      return; }
    if (o.n <= BAL.warmupSteps) { C.state = "INIT"; return; }            // by the OBSERVATION's time (a delayed controller sees t = 0 for longer)
    const feetAir = ["L", "R"].every(s => !o.feet[s].touching), mXi = o.xiMargin;
    // physical evidence that no in-place (or stepping) solution remains
    let unrec = null; if (feetAir) unrec = "both feet off the ground"; else if (o.trunkTiltDeg > 55) unrec = "trunk tilt > 55°"; else if (o.com[1] < 0.78 * this.hNom) unrec = "COM dropped below 78 % of stance height";
    let beyond = -mXi - hipCapHere;                                 // how far ξ is outside the hip-extended region (m)
    if (this.fricR != null) { const dx = o.xi[0] - o.com[0], dz = o.xi[1] - o.com[2], dxi = Math.sqrt(dx * dx + dz * dz); beyond = Math.max(beyond, dxi - this.fricR - hipCapHere); }   // friction-limited capture
    let raw;
    // GATE C3: a corrective step in progress (plan.stepping) is the response to STEP_NEEDED — it does not count toward the fall release; the
    // stepper decides whether the step is still viable. Physical evidence (both feet off, trunk tilt > 55°, COM dropped) still releases.
    const stepping = !!(this.plan && this.plan.stepping);
    if (stepping && !unrec && !(mXi < -1) && beyond > 0) { C.state = "STEPPING"; C.out = 0; C.back = 0; mark("STEPPING"); C.reason = `stepping: ξ ${(beyond * 100).toFixed(1)} cm beyond the hip-extended support`; return; }
    if (unrec) raw = "UNRECOVERABLE";
    else if (mXi < -1) raw = "UNRECOVERABLE", unrec = "no reliable support polygon";
    else if (beyond > 0) { const grow = beyond * dexp(Math.sqrt(G / Math.max(0.5, o.com[1])) * BAL.stepTime); raw = grow < BAL.stepReach ? "STEP_NEEDED" : "UNRECOVERABLE"; if (raw === "UNRECOVERABLE") unrec = "even one step could not reach the capture point"; }
    else if (Math.sqrt(r[0] * r[0] + r[1] * r[1]) > 0.003 || mXi < BAL.copInset) raw = "RECOVERABLE_HIP";
    else raw = "RECOVERABLE_IN_PLACE";
    if (raw === "UNRECOVERABLE" || raw === "STEP_NEEDED") { C.out++; C.back = 0; if (raw === "STEP_NEEDED") mark("STEP_NEEDED"); else mark("UNRECOVERABLE"); if (raw === "STEP_NEEDED" && C.state !== "UNRECOVERABLE") C.state = "STEP_NEEDED"; if (raw === "UNRECOVERABLE") C.state = "UNRECOVERABLE";
      C.reason = unrec || `ξ ${(beyond * 100).toFixed(1)} cm beyond the hip-extended support`;
      const need = unrec && /feet|tilt|COM dropped/.test(unrec) ? 2 : BAL.confirmSteps;
      if (C.out >= need) { C.state = "FALLING"; mark("FALLING"); C.fallStep = this.nObs; C.reengageStep = null; C.reason = (C.times.STEP_NEEDED != null ? "STEP_NEEDED — no stepping in C1 — " : "") + C.reason; } return; }
    C.out = 0;
    if (raw === "RECOVERABLE_HIP") { C.back = 0; C.state = "RECOVERABLE_HIP"; mark("RECOVERABLE_HIP"); return; }
    if (C.state === "RECOVERABLE_HIP" || C.state === "STEP_NEEDED" || C.state === "UNRECOVERABLE" || C.state === "STEPPING") { C.back++; if (C.back < 12) return; }
    C.state = "RECOVERABLE_IN_PLACE"; C.back = 0;
  }
  // (opts.monitor, G1a locomotion stack) the state comes from the viability monitor (pc_plan.js); the release / re-engage bookkeeping the
  // fall transition needs (fallStep, reengageStep, times) is kept exactly as C1 keeps it. C1's own classifier is not run.
  _monitorApply(o) { const C = this.cls, m = this.monitorState || { state: "RECOVERABLE_IN_PLACE", reason: "" }, prev = C.state; if (C.times[m.state] == null) C.times[m.state] = o.t;
    if (m.state === "FALLING" && prev !== "FALLING" && prev !== "GROUNDED") { C.fallStep = this.nObs; C.reengageStep = null; }
    if (prev === "FALLING" && m.state !== "FALLING" && m.state !== "GROUNDED") { C.reengageStep = this.nObs; C.reengaged = (C.reengaged || 0) + 1; }
    C.state = m.state; C.reason = m.reason || ""; }
  // two-bone IK of a stance leg from the ACTUAL foot to a desired hip-joint position; returns world rotations of thigh + shin and the knee angle
  _legIK(leg, pHip, pAnkle, pole) {
    const { L1, L2, a0, b0, kneeAxis } = leg; let dv = V.sub(pAnkle, pHip), d = Math.sqrt(V.dot(dv, dv)); const u = V.sc(dv, 1 / d);
    d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(L1 + L2 - 1e-4, d));
    const ca = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    let w = V.sub(pole, V.sc(u, V.dot(pole, u))); w = V.norm(w);
    const tdir = V.add(V.sc(u, ca), V.sc(w, sa)), pKnee = V.add(pHip, V.sc(tdir, L1)), sdir = V.norm(V.sub(V.add(pHip, V.sc(u, d)), pKnee));
    const h1 = V.norm(V.cross(w, u));                             // knee hinge axis in world (flexion folds the shin backward)
    const frame = (a, h) => { const hh = V.norm(V.sub(h, V.sc(a, V.dot(h, a)))); return Q.fromAxes(a, hh, V.cross(a, hh)); };
    const Rt = Q.norm(Q.mul(frame(tdir, h1), Q.conj(frame(a0, kneeAxis)))), Rs = Q.norm(Q.mul(frame(sdir, h1), Q.conj(frame(b0, kneeAxis))));
    const bl = Q.rot(Q.conj(Rt), sdir), kx = kneeAxis, kappa = datan2(V.dot(kx, V.cross(b0, bl)), V.dot(b0, bl));
    return { Rt, Rs, kappa, pKnee };
  }
  // GATE C2: the lowest pelvis height at which a stance leg — foot where it is, hip at (hipXZ, y) with hip offset ho — keeps its ankle at
  // least `margin` off the DORSIFLEXION stop (the IK the controller uses). At the stop the ankle cannot move the CoP toward the heel: the
  // joint-limit constraint cancels the motor's dorsiflexion torque (finding 2026-09-29: pelvis lowering for the swing leg's reach bent the
  // stance knee to 33°, the ankle sat on its 20° stop and forward placements fell backward in load acceptance).
  minPelvisY(s, pelvisXZ, Rp, footPos, footRot, yHi, margin) { const L = this.legs[s], j = this.spec.joints[L.ankle], lo = j.limits.swingY[0] + margin, ho = Q.rot(Rp, L.hipOff), fz = Q.rot(footRot, [0, 0, 1]), pole = V.norm([fz[0], 0, fz[2]]);
    const dorsiOk = (y) => { const ik = this._legIK(L, [pelvisXZ[0] + ho[0], y + ho[1], pelvisXZ[1] + ho[2]], footPos, pole), cs = csOfRel(j, Q.mul(Q.conj(ik.Rs), footRot));
      let q = cs[3] < 0 ? cs.map(x => -x) : cs; const tl = Math.sqrt(q[0] * q[0] + q[3] * q[3]), qt = tl > 1e-12 ? [q[0] / tl, 0, 0, q[3] / tl] : [0, 0, 0, 1], qs = Q.mul(q, Q.conj(qt)); return 2 * datan2(qs[1], qs[3]) >= lo; };
    if (!dorsiOk(yHi)) return yHi; let a = yHi - 0.3, b = yHi; if (dorsiOk(a)) return a; for (let it = 0; it < 24; it++) { const m = (a + b) / 2; if (dorsiOk(m)) b = m; else a = m; } return b; }
  // one control step. o: the observation the controller is allowed to see (delayed or not). Returns targets + motor settings + debug.
  update(o) {
    // DIAGNOSTIC ONLY (opts.freezeAt, D6X): from that time on the controller stops reacting — it keeps issuing its last targets and motor
    // settings (the standing posture it had just before, gravity support included) — the same body and contacts without balance feedback
    if (this.opts.freezeAt != null && this.frozenOut && o.t >= this.opts.freezeAt) return this.frozenOut;
    const out0 = this._update(o); if (this.opts.freezeAt != null && o.t < this.opts.freezeAt) this.frozenOut = out0; return out0; }
  _update(o) {
    this.nObs++; const spec = this.spec, P = this.P, nj = spec.joints.length, M = this.M, W = M * G, S = o.states;
    const nominal = P.N.T.map(x => Array.isArray(x) ? x.slice() : x), out = { nominal, gOff: spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]), bOff: spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]) };
    // (G2a, opts.styleNominal — the new locomotion controller only): the trunk / neck / arm posture is the reference gait's (P3 style, set per
    // step by the locomotion layer as this.styleNominal = { jointIndex: target }) instead of the standing pose; legs are still solved below
    if (this.opts.styleNominal && this.styleNominal) for (const ks in this.styleNominal) nominal[+ks] = this.styleNominal[ks];
    // leg damping blend from the MEASURED foot load (stance ↔ swing), low-passed
    for (const s of ["L", "R"]) { const f = o.feet[s], target = f.loaded ? 1 : 0; this.sFoot[s] += 0.2 * (target - this.sFoot[s]); }
    const plan = this.plan || null, swingCtl = plan ? Object.keys(plan.swing || {}) : [];
    // ((G2b) PRE-SWING RELAXATION, plan.unloading.relax: the walking trailing leg's damping follows its PLANNED share, not its measured load —
    // at stance damping the body rolling over the trailing foot was resisted by ≈ 100 N·m at the ankle and 250 N·m at the knee, which pressed
    // the toe into the turf (≈ 250 N to the end of double support) and pushed the capture point sideways; the measured-load blend kept that
    // load and the damping feeding each other)
    const relax = plan && plan.unloading && plan.unloading.relax != null ? plan.unloading : null;
    const motor = this.gain.map((g) => { const s = g.leg ? (relax && relax.foot === g.leg ? Math.min(this.sFoot[g.leg], relax.relax) : this.sFoot[g.leg]) : 1;
      // GATE C2 (only with a support plan): a leg under SWING control runs the swing profile — half the stance stiffness and damping
      // critical for that stiffness and the distal leg (kd_swing·√0.5); blended by the measured foot load like C1's damping
      // (GATE C3: a REACTIVE step's swing keeps the full stance stiffness — plan.swingKpDrop 0 — at half stiffness the 0.35 s swing lagged its
      // trajectory by ≈ 18 cm at mid-swing and landed 28 cm short; the torque limits are unchanged)
      if (plan && g.leg) { const drop = plan.swingKpDrop ?? BAL.swingKpDrop, sw = swingCtl.includes(g.leg) ? 1 - s : 0, kp = g.kp * (1 - drop * sw), kdSw = g.kdSwing * Math.sqrt(1 - drop);
        return { kp, kd: kdSw + (g.kdStance - kdSw) * s, lo: g.lim.lo, hi: g.lim.hi }; }
      return { kp: g.kp, kd: g.kdSwing + (g.kdStance - g.kdSwing) * s, lo: g.lim.lo, hi: g.lim.hi }; });
    // GATE C2: the ankle of a foot being loaded after touchdown is COMPLIANT (heel rocker: body weight on the heel lowers the sole; an active
    // level-the-foot demand at full stiffness was a push-off — it drove the toe into the turf and launched the leg, finding 2026-09-29)
    if (plan && plan.settle) { const m = motor[this.legs[plan.settle.foot].ankle]; m.kp *= BAL.settleKp; m.kd *= Math.sqrt(BAL.settleKp); if (plan.settle.kdF != null) m.kd *= plan.settle.kdF; }
    // ((G2b overnight, walk.rocker.kdF) the rocker's DAMPING as well: measured in the walks, the landed ankle's damping (its velocity target assumes a
    //  foot already flat) opposed the forefoot's lowering by up to −174 N·m and held the ankle torque on the dorsiflexion side — the CoP stayed at the
    //  heel, behind the body, through the first 0.2–0.3 s of stance)
    // GATE C3: LANDING COMPLIANCE — for a moment after a corrective step lands, the landed leg's motors are softer (plan.soften.k): the joint
    // targets carry the gravity / balance torques as equilibrium-point offsets τ/kp, so the static support is unchanged, but the knee can yield
    // to the impact instead of a stiff leg arresting the falling body in one step (finding 2026-09-30: 3.4 kN ≈ 4.4 BW landings bounced the
    // trailing foot off the turf and left the body on the front foot alone)
    if (plan && plan.soften) { const L = this.legs[plan.soften.foot]; for (const k of [L.hip, L.knee, L.ankle]) { motor[k].kp *= plan.soften.k; motor[k].kd *= Math.sqrt(plan.soften.k); } }
    // ((G2b) PRE-SWING RELEASE, plan.unloading.release: the walking trailing leg's stiffness follows its planned share down to `release` — the
    // same equilibrium-point form as the landing compliance (its gravity / commanded torques are kept), so only the posture-error terms that
    // pressed its pinned toe into the turf after its share had reached zero are relaxed, as a human trailing leg releases in pre-swing)
    if (relax && relax.release != null) { const L = this.legs[relax.foot], k = relax.release + (1 - relax.release) * relax.relax; for (const j of [L.hip, L.knee, L.ankle]) { motor[j].kp *= k; motor[j].kd *= Math.sqrt(k); } }
    if (this.cls.reengageStep != null && this.cls.state !== "FALLING" && this.cls.state !== "GROUNDED") { const k = Math.min(1, (this.nObs - this.cls.reengageStep) / BAL.fallRampSteps), sc = BAL.fallScale + (1 - BAL.fallScale) * k;
      for (const m of motor) { m.kp *= sc; m.kd *= Math.sqrt(sc); } }
    if (this.mode === "hold") { out.final = nominal; out.cls = { state: "HOLD", times: {} }; out.motor = motor; return out; }
    // ── support geometry from the sensed feet ──
    const planted = ["L", "R"].filter(s => o.feet[s].touching && !swingCtl.includes(s)), stance = planted.length ? planted : [];   // a foot under swing control is not stance
    const fwdOf = (s) => { const fz = Q.rot(S[this.legs[s].foot].rot, [0, 0, 1]); return V.norm([fz[0], 0, fz[2]]); };
    let hd = stance.length ? stance.map(fwdOf).reduce((a, b) => V.add(a, b), [0, 0, 0]) : Q.rot(S[0].rot, [0, 0, 1]); hd = V.norm([hd[0], 0, hd[2]]);
    // (G2a, opts.headingIntent — the new locomotion controller only): the desired heading is the INTENDED heading this.headingIntent
    // (radians about +y, set by the locomotion layer) — not the instantaneous stance foot's direction, which alternates by each foot's
    // toe-out at every step and drove a growing pelvis-yaw oscillation (G1b finding). Turning = the locomotion layer changing it.
    if (this.opts.headingIntent && this.headingIntent != null) hd = [dsin(this.headingIntent), 0, dcos(this.headingIntent)];
    const psi = datan2(hd[0], hd[2]), lat = [hd[2], 0, -hd[0]];   // lat = the player's right
    const ankles = stance.map(s => S[this.legs[s].foot].pos), ankMid = ankles.length ? V.sc(ankles.reduce((a, b) => V.add(a, b), [0, 0, 0]), 1 / ankles.length) : S[0].pos;
    const shift = this.opts.xiShift ? this.opts.xiShift(o.t) : [0, 0];
    let xiRef = [ankMid[0] + hd[0] * this.comFwd + shift[0], ankMid[2] + hd[2] * this.comFwd + shift[1]];
    if (plan && plan.xiRef) xiRef = plan.xiRef.slice();            // GATE C2: the support sequencer moves the balance reference (weight transfer)
    const c = o.com, h = o.h, comG = [c[0], c[2]];
    let poly = o.polyReliable && o.polyReliable.length >= 3 ? o.polyReliable : (o.polyRaw && o.polyRaw.length >= 3 ? o.polyRaw : null);
    // ── ankle strategy: capture-point CoP law, friction-limited once a foot has been seen slipping ──
    // ((G2b) plan.kXi — a walking single support: the CoP follows the planned heel-to-toe roll and only carries the capture-point error, (1 + k) = 1;
    // the foot placement corrects it — tracking the step-start plan with the ankle braked a body that had more forward momentum than planned)
    // (per axis when plan.kXi = { hd, along, across }: the sideways capture-point error keeps the ankle's feedback — G2b)
    const kE = kXiErr(plan && plan.kXi != null ? plan.kXi : BAL.kXi, [o.xi[0] - xiRef[0], o.xi[1] - xiRef[1]]);
    let pRaw = [o.xi[0] + kE[0], o.xi[1] + kE[1]];
    // GATE C2: a MOVING reference (planned weight transfer) adds the LIPM feed-forward −ξ̇_d/ω0 — the tracking form of the same law
    // (p = ξ_d − ξ̇_d/ω0 + (1 + kXi)(ξ − ξ_d)). It is the anticipatory CoP shift toward the unloading foot that starts a transfer.
    if (plan && plan.xiDot) { const w0 = o.omega0 || Math.sqrt(G / Math.max(0.5, o.com[1])); pRaw = [pRaw[0] - plan.xiDot[0] / w0, pRaw[1] - plan.xiDot[1] / w0]; }
    // ((G2b walker, plan.copShift = [x, z]) the stepping controller's ANKLE term: a bounded shift of the CoP demand under the stance foot (the
    // sole clamp below still applies) — forward = braking; set from the measured map's predicted next state against the controller's target)
    if (plan && plan.copShift) pRaw = [pRaw[0] + plan.copShift[0], pRaw[1] + plan.copShift[1]];
    // friction limit: the horizontal ground force the CoP offset implies, W·|p − c|/h, cannot exceed Σ μᵢ·Nᵢ. A sliding foot contributes its
    // OBSERVED μ (shear / load while sliding); a sticking foot the nominal boot-on-turf belief μ = 0.9 (the controller does not know the
    // turf until a foot slides). Only engaged once a foot has actually been seen sliding.
    const slipping = ["L", "R"].filter(s => o.feet[s].slipping); this.muObs = this.muObs || {};
    for (const s of slipping) if (o.feet[s].muValid !== false) this.muObs[s] = Math.max(0.01, Math.min(this.muObs[s] ?? 1, o.feet[s].muUsed ?? 0.9));
    let fricR = null; if (Object.keys(this.muObs).length) { let cap = 0, nsum = 0; for (const s of ["L", "R"]) { const f = o.feet[s]; if (!f.loaded) continue; const N = Math.max(0, f.load); cap += (this.muObs[s] ?? BAL.muBelief) * N; nsum += N; }
      fricR = nsum > 1 ? h * cap / W : 0; const d = [pRaw[0] - comG[0], pRaw[1] - comG[1]], dm = Math.sqrt(d[0] * d[0] + d[1] * d[1]); if (dm > fricR) pRaw = [comG[0] + d[0] * fricR / Math.max(dm, 1e-9), comG[1] + d[1] * fricR / Math.max(dm, 1e-9)]; }
    this.fricR = fricR;
    // the CoP demand is clamped to the SUPPORT REGION (whole soles of the loaded feet), not to the instantaneous contact points: when a foot
    // is up on its toes and the demand lies behind the toe edge, the smaller ankle torque lets the heel roll back down (Gate C1 finding,
    // PF60: clamping to the toe-edge contact kept the heels up while the body rocked back, and he fell backward)
    const region = o.region && o.region.length >= 3 ? o.region : null; let cpoly = region || poly;
    // GATE C3: while a corrective step is being executed the CoP demand is held on the STANCE foot's sole (the unloading foot is to carry
    // nothing, and in single support the stance sole is all there is) — the ankle pushes against the divergence as hard as that foot allows
    if (plan && plan.copFoot && o.feet[plan.copFoot] && o.feet[plan.copFoot].sole) { const sp = ccw2(hullOf(o.feet[plan.copFoot].sole)); if (sp.length >= 3) cpoly = sp; }
    // (GATE C3, stepping: the CoP goes to the point of the stance sole NEAREST the demand — ξ̇ = ω0(ξ − p), so the nearest point slows the
    // capture point's divergence most; the radial clamp toward the sole centre used for balance in place gave up up to 6 cm of lever)
    let pStar = cpoly ? (plan && plan.copFoot ? nearestInset(cpoly, pRaw, BAL.copInset) : polyClamp(cpoly, pRaw, BAL.copInset)) : pRaw.slice(), r = [pRaw[0] - pStar[0], pRaw[1] - pStar[1]];
    // hip-extended capacity in the direction ξ leaves the polygon
    let hipCapHere = this.hipCap.lat; if (region && o.xiMargin < 0) { const nr = polyNearest(region, o.xi), u = V.norm([o.xi[0] - nr[0], 0, o.xi[1] - nr[1]]), cf = V.dot(u, hd), cl = V.dot(u, lat);
      hipCapHere = Math.abs(cf) * (cf > 0 ? this.hipCap.fwd : this.hipCap.bwd) + Math.abs(cl) * this.hipCap.lat; }
    this.hipCapHere = hipCapHere; if (this.opts.monitor) this._monitorApply(o); else this._classify(o, r, hipCapHere); const cls = this.cls;
    const released = cls.state === "FALLING" || cls.state === "GROUNDED";
    // ── nominal: stance legs solved UPWARD from the actual feet; pelvis in world orientation (heading from the feet, nominal pitch) ──
    // (G2a, opts.pelvisStyle — the new locomotion controller only): the PLANNED pelvis posture of the gait (this.pelvisStyle = { yaw, roll
    // (rad), dy (m) }: the reference's small pelvis yaw and swing-side drop, and the stance knee's loading bend as a lower pelvis) — offsets on
    // the controller's own desired pelvis pose; the stance legs realise them through their finite joints like any posture target
    const ps = this.opts.pelvisStyle && this.pelvisStyle ? this.pelvisStyle : null;
    // ((G2b walker, opts.pelvisYawFollow = β ∈ [0, 1)) a COMPLIANT pelvis yaw: the desired pelvis yaw follows the actual one by β — the stance legs
    // correct (1 − β) of the yaw error per tick instead of all of it. Tracked stiffly, the heading correction went through the planted feet as
    // free moments of ±3.5 kg·m²/s per support phase (≈ 30 N·m), the dominant source of the gait's whole-body yaw momentum; the heading is
    // still regulated (turning unchanged), only more softly, and nothing external is added)
    let psiP = psi + (ps ? ps.yaw : 0); if (this.opts.pelvisYawFollow) { const f0 = Q.rot(S[0].rot, [0, 0, 1]), ya = datan2(f0[0], f0[2]), e = Math.atan2(Math.sin(ya - psiP), Math.cos(ya - psiP)); psiP += this.opts.pelvisYawFollow * e; }
    const Rpd = ps ? Q.norm(Q.mul(Q.mul(yawQ(psiP), Q.axis([1, 0, 0], this.rootPitch)), Q.axis([0, 0, 1], ps.roll))) : Q.norm(Q.mul(yawQ(psi), Q.axis([1, 0, 0], this.rootPitch))), footY = ankles.length ? ankles.reduce((a, p) => a + p[1], 0) / ankles.length : S[0].pos[1] - this.hPelvis;
    // (G2a, with the gait's pelvis posture) the height is referenced to the GROUND under the stance feet — each foot's lowest sole point plus
    // the flat foot's ankle height — not to the ankle: a forefoot landing (heel up, ankle 5 cm above its flat height) raised the planned
    // pelvis by half of that and lifted the landed foot back off the turf
    const gY = ps && stance.length ? stance.reduce((a, s) => { const sh = this.spec.bodies[this.legs[s].foot].planBox || this.spec.bodies[this.legs[s].foot].shapes[0]; return a + Math.min(...o.feet[s].sole.map(c => c[1])) - (sh.pos[1] - sh.he[1]); }, 0) / stance.length : footY;
    const Pd = [S[0].pos[0], gY + this.hPelvis + (ps ? ps.dy : 0), S[0].pos[2]];
    // GATE C2 (only with a plan): in a wide or split stance the nominal pelvis height may be out of the legs' reach — lower it so every stance
    // leg stays within 99.5 % extension (the feasibility check limits how much lowering a placement may need)
    // (a swinging leg counts with its planned touchdown point, so the pelvis is lowered DURING the swing, before the foot needs the reach).
    // The lowered target is never more than 1 cm below the ACTUAL pelvis: the stance legs are solved up to this height, and joint targets
    // for a pelvis the body has not yet reached lift a newly landed foot off the turf (finding 2026-09-29, test D).
    // V1.1 controller (reachAll): EVERY foot the controller intends to have on the ground keeps the pelvis within its reach — a stance foot
    // where it is, a swing foot at its touchdown point, and a foot being RE-PLANTED at its anchor (finding 2026-09-30: a 22 cm forward step
    // bounced its landed foot off the turf; no longer stance, it dropped out of the reach check, the pelvis rose 7 cm back to nominal height,
    // the straight front leg could not reach the ground and the load-acceptance transfer moved ξ toward a foot that was not there)
    const anchorOf = (s) => plan && plan.anchors && plan.anchors[s] ? plan.anchors[s] : plan && plan.anchor && plan.anchor.foot === s ? plan.anchor : o.feet[s].anchor;
    const replantOf = (s) => { const f = o.feet[s]; if (!this.opts.reachAll || stance.includes(s) || swingCtl.includes(s) || !anchorOf(s)) return null; return anchorOf(s).pos; };
    if (plan && !released) { const nomY = Pd[1], reachOf = (s) => stance.includes(s) ? S[this.legs[s].foot].pos : (plan.swing && plan.swing[s] && plan.swing[s].reach) || replantOf(s);
      // V1.1 RECALIBRATION (opt-in, off for V1): during a planned weight transfer the reach is checked where the pelvis is GOING (shifted by
      // the planned COM goal − the COM now), not only where it is — with V1.1's anatomical hips the neutral stance is splayed (feet 32 cm
      // apart, hips 18.4 cm), and a height that only follows the current pelvis left the unloading leg exactly taut: it carried ≈ 90 N as a
      // strut and stalled ξ 1.7 cm short of the stance foot (finding 2026-09-30)
      const ant = this.opts.anticipateReach && plan.comGoal ? [plan.comGoal[0] - o.com[0], plan.comGoal[1] - o.com[2]] : null;
      const px = (sh) => sh ? [Pd[0] + ant[0], Pd[2] + ant[1]] : [Pd[0], Pd[2]];
      if (this.opts.reachAll) {
        // V1.1 controller: a pelvis HEIGHT BAND per horizontal pelvis position — hi = the lowest height every intended foot contact still
        // reaches at 99.5 % extension, lo = the height below which a stance ankle comes within dorsiMarginDeg of its dorsiflexion stop. The
        // target lies in the band of where the pelvis IS; the planned goal position (anticipation) only moves it within that band. (The
        // earlier form took the reach limit of the present and the ankle limit of the goal at once — right after a 22 cm touchdown the rear
        // ankle's FUTURE dorsiflexion raised the pelvis above the height at which the front leg could reach its foot NOW; finding 2026-09-30.)
        const band = (sh) => { const P2 = px(sh); let hi = nomY, lo = -1e9;
          // ((G2b walker, plan.reachExt) a walking double support keeps every stance leg within reachExt (e.g. 0.96) instead of 99.5 % of full
          // extension: at 99.5 % the TRAILING leg ended every double support straight (measured 0.98–1.00) and its swing had to start from a
          // locked knee with the toe dragging — the C8 failures; a human trailing knee is flexed at toe-off)
          for (const s of ["L", "R"]) { const a = reachOf(s); if (!a) continue; const L = this.legs[s], ho = Q.rot(Rpd, L.hipOff), hx = P2[0] + ho[0] - a[0], hz = P2[1] + ho[2] - a[2], Lm = (plan.reachExt && stance.includes(s) ? plan.reachExt : BAL.reachExt) * (L.L1 + L.L2), h2 = hx * hx + hz * hz;
            if (h2 < Lm * Lm) hi = Math.min(hi, a[1] + Math.sqrt(Lm * Lm - h2) - ho[1]); }
          if (hi < nomY) for (const s of stance) lo = Math.max(lo, this.minPelvisY(s, P2, Rpd, S[this.legs[s].foot].pos, S[this.legs[s].foot].rot, nomY, rad(BAL.dorsiMarginDeg)));
          return { lo, hi }; };
        const bN = band(false); let y = Math.max(bN.lo, bN.hi);
        if (ant) { const bG = band(true), yG = Math.max(bG.lo, Math.min(bG.hi, y)); y = bN.lo <= bN.hi ? Math.max(bN.lo, Math.min(bN.hi, yG)) : y; }
        Pd[1] = y; this.pdTrace = { nomY, yReach: bN.hi, yAnkle: bN.lo, y };
      } else {
      for (const sh of ant ? [false, true] : [false]) for (const s of ["L", "R"]) { const a = reachOf(s); if (!a) continue; const P2 = px(sh), L = this.legs[s], ho = Q.rot(Rpd, L.hipOff), hx = P2[0] + ho[0] - a[0], hz = P2[1] + ho[2] - a[2], Lm = BAL.reachExt * (L.L1 + L.L2), h2 = hx * hx + hz * hz;
        if (h2 < Lm * Lm) Pd[1] = Math.min(Pd[1], a[1] + Math.sqrt(Lm * Lm - h2) - ho[1]); }
      const yReach = Pd[1];
      if (Pd[1] < nomY) for (const sh of ant ? [false, true] : [false]) for (const s of stance) Pd[1] = Math.max(Pd[1], this.minPelvisY(s, px(sh), Rpd, S[this.legs[s].foot].pos, S[this.legs[s].foot].rot, nomY, rad(BAL.dorsiMarginDeg)));
      this.pdTrace = { nomY, yReach, yAnkle: Pd[1] }; } Pd[1] = Math.max(S[0].pos[1] - 0.01, Math.min(S[0].pos[1] + 0.01, Pd[1])); }   // both ways: the reach lowering ending must not step the target back up (it launched him)
    // GATE C2: a foot being LOADED after touchdown (plan.settle) is aimed level (its own yaw) — the heel rocker: a boot that lands on its heel
    // is lowered onto its sole by the finite ankle instead of being held on the heel (finding 2026-09-29, test D: held heel-only, the front
    // foot's CoP was pinned at the heel, the COM could not be drawn onto it and he fell backward after "acceptance")
    // ((G2b) plan.heelRise — PRE-SWING: the trailing foot's heel rises about its toe, the ankle plantar-flexing toward the planned pitch, while it
    // still carries its last share of the load on the toe; a stance foot's orientation target is otherwise its own actual orientation)
    const footTgt = (s) => { const R = S[this.legs[s].foot].rot;
      if (plan && plan.heelRise && plan.heelRise.foot === s) { const f = Q.rot(R, [0, 0, 1]), pit = Math.atan2(-f[1], Math.hypot(f[0], f[2])); return plan.heelRise.rad > pit ? Q.norm(Q.mul(yawQ(datan2(f[0], f[2])), Q.axis([1, 0, 0], plan.heelRise.rad))) : R; }
      if (!(plan && plan.settle && plan.settle.foot === s && plan.settle.level)) return R; const f = Q.rot(R, [0, 0, 1]); return yawQ(datan2(f[0], f[2])); };
    // ((G2b) the UNLOADING trailing leg (plan.unloading.relax < 1) is posed from the ACTUAL pelvis HEIGHT in proportion to how far it has been unloaded —
    // posed from the desired pelvis it kept regulating the body's height: 1.4 cm of pelvis sag made the nearly straight trailing knee press the
    // toe with ≈ 250 N to the end of double support; a foot being unloaded hands the height to the other leg, as an airborne foot does)
    const baseOf = (s) => { if (!(relax && relax.foot === s && relax.relax < 1 && this.opts.unloadActualBase !== false)) return { P: Pd, R: Rpd }; const a = 1 - relax.relax; return { P: [Pd[0], Pd[1] + (S[0].pos[1] - Pd[1]) * a, Pd[2]], R: Rpd }; };   // (the HEIGHT only: posed horizontally from the actual pelvis the foot was dragged 7 cm inward with the pelvis's sideways motion)
    if (!released) for (const s of stance) { const L = this.legs[s], B = baseOf(s), pHip = V.add(B.P, Q.rot(B.R, L.hipOff)), ik = this._legIK(L, pHip, S[L.foot].pos, fwdOf(s));
      nominal[L.hip] = csOfRel(spec.joints[L.hip], Q.mul(Q.conj(B.R), ik.Rt)); nominal[L.knee] = ik.kappa;
      nominal[L.ankle] = csOfRel(spec.joints[L.ankle], Q.mul(Q.conj(ik.Rs), footTgt(s))); }
    // GATE C2: during a PLANNED weight transfer the stance legs are given the joint velocities of the planned pelvis motion (the same
    // stance IK, advanced by the planned COM velocity), so their damping resists deviation from the transfer, not the transfer itself
    // (finding: with zero target velocity the stance damping acted as a ≈ 290 N·s/m drag and the CoP lagged the demand by ≈ 0.4 m per m/s)
    this.stanceVel = {}; if (plan && plan.vRef && !released) { const dT = 1 / 60, dP = [plan.vRef[0] * dT, 0, plan.vRef[1] * dT];
      for (const s of stance) { const L = this.legs[s], pHip = V.add(V.add(Pd, dP), Q.rot(Rpd, L.hipOff)), ik = this._legIK(L, pHip, S[L.foot].pos, fwdOf(s));
        this.stanceVel[L.hip] = rotRate(nominal[L.hip], csOfRel(spec.joints[L.hip], Q.mul(Q.conj(Rpd), ik.Rt)), dT); this.stanceVel[L.knee] = (ik.kappa - nominal[L.knee]) / dT;
        this.stanceVel[L.ankle] = rotRate(nominal[L.ankle], csOfRel(spec.joints[L.ankle], Q.mul(Q.conj(ik.Rs), plan.heelRise && plan.heelRise.foot === s ? footTgt(s) : S[L.foot].rot)), dT); } }   // ((G2b) the rising heel's own target, not the actual foot)
    // GATE C2: planned lateral trunk lean over the stance leg (single-support hip-load compensation, sized by the support layer from the
    // body's statics): the whole upper body rotates about the LUMBAR joint (the pivot the statics assume), about the heading axis,
    // relative to the level pelvis target
    if (plan && plan.lean && plan.lean.rad && !released) { const kl = this.ji("lumbar"), a = (plan.lean.side === "L" ? 1 : -1) * plan.lean.rad;
      nominal[kl] = csOfRel(spec.joints[kl], Q.mul(Q.axis(Q.rot(Q.conj(Rpd), hd), a), relOf(spec.joints[kl], nominal[kl]))); }
    // feet-in-place: a foot that has come off the ground is reached back down onto its OWN landed pose (its anchor) — the same place, so
    // the support polygon is restored, not enlarged. This is not a corrective step (C1 finding PR50: a nominal-pose leg hovered for 1.4 s
    // while the stance ankle and hip saturated). The foot target is where it physically was; nothing is placed anywhere new.
    // GATE C2: a foot under SWING control follows the sequencer's world-space trajectory — IK from the ACTUAL hip joint and pelvis (the
    // leg hangs from where the pelvis really is), foot orientation from the trajectory. Gravity support of the free leg comes from Jᵀ below.
    // The swing ankle target is kept inside the ankle's range of motion (margin 5°): the finite motor is never asked to drive into the joint
    // stop — where the requested foot orientation is anatomically impossible (a flat boot under a strongly tilted shin) the foot pitches.
    // Velocity feed-forward = the TRAJECTORY's velocity pushed through the same IK (continuous; a finite difference of successive targets
    // spiked to ≈ 2900°/s when a new trajectory began from the actual foot and slammed the toe into the turf — finding 2026-09-29).
    // ((G2b) plan.swingPredict = d (s) — DELAY COMPENSATION of the swing IK: the sensed state is d old (the feedback view), and joint targets
    // solved from where the hip WAS put the foot ahead of its world target by the pelvis's travel over d (measured: 6–12 cm beyond the
    // foothold at 0.4–0.6 m/s, joints tracking their targets within 1–2°; 2 cm with no delay). The hip point and pelvis orientation are
    // advanced over d by their own measured velocities — an internal-model prediction, as the nervous system compensates its own delays.
    // With it, the moving base of the swing's VELOCITY feed-forward is the hip JOINT's velocity (the pelvis's), not the thigh's centre of mass
    // (which moves with the swinging leg itself: the target joint velocities came out wrong and the damping cancelled the swing's hip
    // abduction / rotation drive — ≈ 90 N·m against ≈ 100 N·m — leaving the foot 2–8 cm outside its target at touchdown).)
    // ((G2b unified, DIAGNOSTIC ONLY — never a controller option: opts.oracleSwing) the swing leg's IK reads the TRUE current state instead of
    //  the feedback view, to ATTRIBUTE swing error to the view's age; a real controller cannot do this)
    const TT = this.swingTruth ? this.swingTruth.states : null, TP = this.swingTruthParts || { rot: true, pos: true, vel: true };
    // ((G2b unified, opt-in plan.swingBase = { w: "zero" | "yaw" | "lp", tau }) the MOVING BASE of the swing's velocity target: which pelvis rotation
    //  rate the leg's joint velocities assume. Measured over the 50 ms delay in walking swings (pelvis frame): the pitch rate's change is as large
    //  as the rate itself (view 0.99 vs zero 1.07 rad/s rms error) — the delayed pitch rate does not predict the current one, and fed into the
    //  hip's velocity target it drove the foot ≈ 0.9 m/s past its command mid-swing (+6.7 cm landing overshoot; true rates: −1.5 ± 1.1 cm).
    //  "zero": a translating base (no pelvis rotation rate); "yaw": only the vertical (yaw) component, which the view does predict (1.0 vs 2.0);
    //  "lp": the rate low-passed over tau. Joint POSITION targets keep the predicted pelvis pose.)
    const SB = plan && plan.swingBase, wBase = (w0) => { if (!SB || !SB.w || SB.use === false) return w0; if (SB.w === "zero") return [0, 0, 0]; if (SB.w === "yaw") { const up = Q.rot(S[0].rot, [0, 1, 0]), k = V.dot(w0, up); return V.sc(up, k); }
      // ("model": an INTERNAL FORWARD MODEL of the swing's own effect on the pelvis — the pelvis rate now = the rate the view measured + the change
      //  the swing's motor program produces over the delay, P(u_now) − P(u_view), P the pelvis-frame rate profile over the swing phase (side-
      //  mirrored yaw / roll), identified or learned online from the delayed measurements; realistic latency: anything else that happened in the
      //  last dFb is still unknown)
      if (SB.w === "model" && SB.P && SB.uNow != null) { const Pf = SB.P, nb = Pf.length, at = (u) => { const x = Math.max(0, Math.min(nb - 1, u * nb - 0.5)), i = Math.min(nb - 2, Math.floor(x)), f = x - i; return [0, 1, 2].map(j => Pf[i][j] + (Pf[i + 1][j] - Pf[i][j]) * f); };
        const a = at(SB.uNow), b = at(SB.uView), dl = [a[0] - b[0], (a[1] - b[1]) * SB.side, (a[2] - b[2]) * SB.side];
        // (SB.pure = [axes]: those pelvis-frame axes take the profile's expected rate at u_now alone — no delayed measurement)
        if (SB.pure) { const wl = Q.rot(Q.conj(S[0].rot), w0), pr = [a[0], a[1] * SB.side, a[2] * SB.side]; for (let j = 0; j < 3; j++) wl[j] = SB.pure.includes(j) ? pr[j] : wl[j] + dl[j]; return Q.rot(S[0].rot, wl); }
        return V.add(w0, Q.rot(S[0].rot, dl)); }
      if (SB.w === "lp") { const a = Math.min(1, (o.t - (this.wLPt ?? o.t - 1)) / (SB.tau ?? 0.1)); this.wLP = this.wLP && this.wLPt != null ? V.add(this.wLP, V.sc(V.sub(w0, this.wLP), a)) : w0.slice(); this.wLPt = o.t; return this.wLP; } return w0; };
    const dP = plan && plan.swingPredict ? plan.swingPredict : 0, wP = TT && (TP.vel || TP.w) ? TT[0].w : TT && TP.wAx != null ? (() => { const a = Q.rot(Q.conj(S[0].rot), S[0].w), b = Q.rot(Q.conj(S[0].rot), TT[0].w); a[TP.wAx] = b[TP.wAx]; return Q.rot(S[0].rot, a); })() : wBase(S[0].w), nwP = Math.hypot(wP[0], wP[1], wP[2]), wS = S[0].w, nwS = Math.hypot(wS[0], wS[1], wS[2]);
    const RpPred = TT && TP.rot ? TT[0].rot : dP && nwS > 1e-9 ? Q.norm(Q.mul(Q.axis(V.sc(wS, 1 / nwS), nwS * dP), S[0].rot)) : S[0].rot;
    const hipPred = (L) => { if (TT && TP.pos) return TT[L.thigh].pos; if (!dP) return S[L.thigh].pos; const hp = S[L.thigh].pos, vh = V.add(S[0].v, V.cross(wS, V.sub(hp, S[0].com))); return V.add(hp, V.sc(vh, dP)); };
    const hipVel = (L) => { if (TT && TP.v && !TP.vel) return V.add(TT[0].v, V.cross(S[0].w, V.sub(TT[L.thigh].pos, TT[0].com))); if (TT && TP.vel) return V.add(TT[0].v, V.cross(TT[0].w, V.sub(TT[L.thigh].pos, TT[0].com))); return dP ? V.add(S[0].v, V.cross(SB && SB.w && SB.use !== false ? wP : wS, V.sub(S[L.thigh].pos, S[0].com))) : S[L.thigh].v; };
    this.swingIK = {}; this.swingVel = {}; if (!released) for (const s of swingCtl) { const L = this.legs[s], tg = plan.swing[s], Rp = RpPred, pole = V.norm(V.sub(Q.rot(Rp, [0, 0, 1]), [0, Q.rot(Rp, [0, 0, 1])[1], 0]));
      const solve = (pos, hipP, RpX) => { hipP = hipP || hipPred(L); RpX = RpX || Rp; const ik = this._legIK(L, hipP, pos, pole); return { ik, hip: csOfRel(spec.joints[L.hip], Q.mul(Q.conj(RpX), ik.Rt)), knee: ik.kappa, ankle: romClamp(spec.joints[L.ankle], csOfRel(spec.joints[L.ankle], Q.mul(Q.conj(ik.Rs), tg.rot)), rad(5)) }; };
      const a = solve(tg.pos); nominal[L.hip] = a.hip; nominal[L.knee] = a.knee; nominal[L.ankle] = a.ankle; this.swingIK[s] = { knee: a.ik.pKnee, target: tg.pos };
      // (G1a, opts.swingMovingBase — the new locomotion controller only; C2 / C3 keep the approved form): the joint velocity that moves the
      // foot along its WORLD trajectory while the hip and pelvis themselves move (hip joint velocity, pelvis angular velocity). The
      // stationary-base form asked the critically damped swing motors to hold the leg's configuration while the pelvis drifted, so the
      // swing foot was carried with the pelvis (G1a finding: 3 cm of pelvis drift in late swing → 5 cm foothold error)
      if (tg.vel) { const dT = 1 / 60, mb = this.opts.swingMovingBase, b = solve(V.add(tg.pos, V.sc(tg.vel, dT)), mb ? V.add(hipPred(L), V.sc(hipVel(L), dT)) : null, mb && nwP > 1e-9 ? Q.norm(Q.mul(Q.axis(wP, nwP * dT), Rp)) : null);
        this.swingVel[L.hip] = rotRate(a.hip, b.hip, dT); this.swingVel[L.knee] = (b.knee - a.knee) / dT; this.swingVel[L.ankle] = rotRate(a.ankle, b.ankle, dT); } }
    this.replant = []; if (!released) for (const s of ["L", "R"]) { const f = o.feet[s], L = this.legs[s]; if (stance.includes(s) || swingCtl.includes(s) || !(f.anchor || (plan && plan.anchors && plan.anchors[s]))) continue;
      // V1.1 controller (unloadPlan): the foot a planned transfer is UNLOADING is not pressed back into the turf when it loses contact — it is
      // meant to carry nothing, and pressing it (4 mm below its anchor) re-loaded it by up to 190 N and reset the liftoff gate (finding
      // 2026-09-30, J_repeat #5); it is held at its anchor height instead (its weight is carried by Jᵀ gravity support, as a free leg's)
      const unl = this.opts.unloadPlan && plan && plan.unloading && plan.unloading.foot === s;
      // (GATE C3: plan.anchors — after a corrective step each foot is re-planted onto its OWN pose at the step's touchdown: a trailing foot up
      // on its toe is reached back onto its toe, not onto its flat pre-step pose 50 cm behind that the leg cannot reach from the new stance)
      // (G1a, opts.replantActual — the new locomotion controller only; C1–C3 keep the approved form): a foot that is OFF the turf is reached
      // from the ACTUAL hip and pelvis, as a swing foot is. From the desired pelvis the IK assumed the pelvis already where balance wants it;
      // with the pelvis displaced the airborne foot hovered above the turf and drifted (G1a findings: D6X_load20 — 15 cm in 1.5 s; S2x)
      const air = this.opts.replantActual && !o.feet[s].touching, RpR = air ? S[0].rot : Rpd;
      const a = anchorOf(s), above = V.add(a.pos, [0, unl ? 0 : -0.004, 0]), pHip = air ? S[L.thigh].pos : V.add(Pd, Q.rot(Rpd, L.hipOff)), ik = this._legIK(L, pHip, above, fwdOf(s));
      nominal[L.hip] = csOfRel(spec.joints[L.hip], Q.mul(Q.conj(RpR), ik.Rt)); nominal[L.knee] = ik.kappa; nominal[L.ankle] = csOfRel(spec.joints[L.ankle], Q.mul(Q.conj(ik.Rs), a.rot));
      this.replant.push(s); }
    // ── desired ground reaction (LIPM line of action through the COM), split between the stance feet by the lever rule ──
    const feetForce = (p) => { const F = [W * (c[0] - p[0]) / h, W, W * (c[2] - p[1]) / h], res = {};
      if (stance.length === 2 && plan) { const cenOf = (s) => { const f = this.legs[s].foot, q = V.add(S[f].pos, Q.rot(S[f].rot, (spec.bodies[f].planBox || spec.bodies[f].shapes[0]).pos)); return [q[0], q[2]]; };
        if (plan.unloading && plan.heelRise && plan.heelRise.toeOnly && plan.heelRise.foot === plan.unloading.foot && !plan.unloading.toeRegion) { const f = this.legs[plan.unloading.foot].foot, sh = spec.bodies[f].planBox || spec.bodies[f].shapes[0], zf = sh.pos[2] + sh.he[2], yb = sh.pos[1] - sh.he[1];
          plan.unloading = { ...plan.unloading, toeRegion: [[-1, zf], [1, zf], [1, zf - 0.05], [-1, zf - 0.05]].map(([sx, z]) => { const q = V.add(S[f].pos, Q.rot(S[f].rot, [sh.pos[0] + sx * sh.he[0], yb, z])); return [q[0], q[2]]; }) }; }
        if (plan.unloading && plan.unloading.bandCap && !plan.unloading.band) { const bi = {}, li = {}; for (const s of ["L", "R"]) { const f = this.legs[s].foot, q = S[f].pos, x = Q.rot(S[f].rot, [1, 0, 0]), n = Math.hypot(x[0], x[2]) || 1; bi[s] = [q[0], q[2]]; li[s] = [x[0] / n, x[2] / n]; }
          plan.unloading = { ...plan.unloading, band: { cap: plan.unloading.bandCap, ank: bi, lat: li } }; }
        const du = this.opts.unloadPlan && plan.unloading && !plan.preload ? split2u(o, p, cenOf, plan.unloading) : this.opts.unloadPlan && plan.loading && !plan.preload ? split2u(o, p, cenOf, plan.loading) : null; if (du && recordUnload) this.unloadInfo = du.info;
        const d2 = du || split2(o, p, cenOf, plan.preload, this.opts.diagUnload ? plan.unload : null);
        for (const s of ["L", "R"]) res[s] = { F: V.sc(F, d2.share[s]), at: [d2.at[s][0], groundY(o.feet[s]), d2.at[s][1]], share: d2.share[s] }; }
      else if (stance.length === 2) { const cen = (s) => { const f = this.legs[s].foot, q = V.add(S[f].pos, Q.rot(S[f].rot, (spec.bodies[f].planBox || spec.bodies[f].shapes[0]).pos)); return [q[0], q[2]]; };
        const cL = cen("L"), cR = cen("R"), e = [cR[0] - cL[0], cR[1] - cL[1]], ee = e[0] * e[0] + e[1] * e[1];
        let aR = Math.max(0, Math.min(1, ((p[0] - cL[0]) * e[0] + (p[1] - cL[1]) * e[1]) / ee)); const proj = [cL[0] + aR * e[0], cL[1] + aR * e[1]], off = [p[0] - proj[0], p[1] - proj[1]];
        // GATE C2: a foot being loaded after touchdown keeps a minimum commanded share (it is pressed onto the turf, not held weightless)
        if (plan && plan.preload) aR = plan.preload.foot === "R" ? Math.max(aR, plan.preload.share) : Math.min(aR, 1 - plan.preload.share);
        for (const [s, a, cc] of [["L", 1 - aR, cL], ["R", aR, cR]]) { const fp = o.feet[s], fpoly = fp.points.length >= 3 ? hullOf(fp.points) : null;
          const cp = fpoly ? polyClamp(fpoly, [cc[0] + off[0], cc[1] + off[1]], BAL.copInset / 2) : [cc[0] + off[0], cc[1] + off[1]];
          res[s] = { F: V.sc(F, a), at: [cp[0], groundY(fp), cp[1]], share: a }; } }
      else if (stance.length === 1) { const s = stance[0]; res[s] = { F, at: [p[0], groundY(o.feet[s]), p[1]], share: 1 }; }
      return res; };
    const torques = (feetF) => spec.joints.map((j, k) => { const pj = S[j.childIndex].pos; let tau = [0, 0, 0];
      for (const i of this.subtree[k]) tau = V.sub(tau, V.cross(V.sub(S[i].com, pj), V.sc(GV, spec.bodies[i].mass)));
      for (const s of ["L", "R"]) if (feetF[s] && this.subtree[k].includes(this.legs[s].foot)) tau = V.sub(tau, V.cross(V.sub(feetF[s].at, pj), feetF[s].F));
      return tau; });                                            // world torque the motor must apply on the CHILD body
    // ((G2b) plan.latCop = { foot, cap } — WALKING SINGLE SUPPORT: sideways the stance ankle can move the CoP only ≈ cap from the ankle (its roll
    // budget shares the motor with plantar flexion: ±9 N·m in late stance ≈ 1.2 cm), well inside the sole. The sideways demand beyond that is
    // the RESIDUAL the hip strategy carries (trunk roll about the stance hip, budgeted and tilt-guarded as for a push) — not a sole-edge CoP
    // demand the ankle cannot deliver. The human lateral hip strategy of single stance.)
    if (plan && plan.latCop && o.feet[plan.latCop.foot] && !released) { const a = S[this.legs[plan.latCop.foot].foot].pos, ld = [hd[2], -hd[0]], off = (pStar[0] - a[0]) * ld[0] + (pStar[1] - a[2]) * ld[1], c = plan.latCop.cap, ex = off > c ? off - c : off < -c ? off + c : 0;
      if (ex) { pStar = [pStar[0] - ld[0] * ex, pStar[1] - ld[1] * ex]; r = [pRaw[0] - pStar[0], pRaw[1] - pStar[1]]; } }
    this.unloadInfo = null; let recordUnload = false; const pStatic = poly ? polyClamp(poly, comG, BAL.copInset) : comG, fStatic = feetForce(pStatic); recordUnload = true; const fBal = feetForce(pStar);
    const tauG = torques(fStatic), tauB0 = torques(fBal), tauB = tauB0.map((t, k) => V.sub(t, tauG[k]));
    // ── hip strategy: when the CoP saturates, a trunk torque about the hips (centroidal moment W·(ŷ × r)), budgeted, tilt-guarded ──
    let tauTrunk = [0, 0, 0];
    if (!released && (r[0] * r[0] + r[1] * r[1]) > 1e-8 && stance.length) { tauTrunk = V.sc([r[1], 0, -r[0]], W);
      const pitchAx = lat, rollAx = hd, tp = V.dot(tauTrunk, pitchAx), tr = V.dot(tauTrunk, rollAx), nH = stance.length, hipL = this.limits.hip;
      const capP = nH * BAL.hipUse * this.mult * (tp > 0 ? -hipL.Y[0] : hipL.Y[1]), capR = nH * BAL.hipUse * this.mult * hipL.Z[1];
      let tpc = Math.max(-capP, Math.min(capP, tp)), trc = Math.max(-capR, Math.min(capR, tr));
      const cu = Q.rot(S[this.bi("chest")].rot, [0, 1, 0]), fl = V.dot(cu, hd), sd = V.dot(cu, lat), lim = dsin(rad(BAL.trunkMaxDeg));
      if (tpc > 0 && fl > lim) tpc = 0; if (tpc < 0 && fl < -lim) tpc = 0; if (trc > 0 && sd < -lim) trc = 0; if (trc < 0 && sd > lim) trc = 0;
      tauTrunk = V.add(V.sc(pitchAx, tpc), V.sc(rollAx, trc));
      for (const s of stance) { const k = this.legs[s].hip, dh = V.sc(tauTrunk, fBal[s] ? fBal[s].share : 1 / nH); tauB[k] = V.sub(tauB[k], dh); if (this.opts.expose) (this._hipPart = this._hipPart || {})[k] = V.sc(dh, -1); }
      // GATE C4 (opts.reactiveArms): the ARMS join the hip strategy — each shoulder torques its arm in the SAME sense as the trunk moment, so
      // part of the upper body's angular-momentum change goes into the light, fast arms instead of tilting the heavy trunk (the hips' moment on
      // the upper body is unchanged; what the arms buy is less trunk excursion before the 35° trunk guard stops the strategy). Each arm's
      // share is capped by its own finite shoulder torque (armUse × directional limit) and stops when the arm nears its range of motion in
      // that direction (like the trunk guard): a finite, physically bounded throw — nothing is scripted by push direction.
      if (this.opts.reactiveArms) { this.armInfo = {}; const need = V.sc([r[1], 0, -r[0]], W);
        for (const side of ["L", "R"]) { const k = this.ji("shoulder_" + side), j = spec.joints[k], L = this.limits.shoulder, cap = BAL.armUse * this.mult;
          const Cw = Q.rot(S[j.parentIndex].rot, Q.rot(Q.fromAxes(j.X, j.Y, j.Z), [1, 0, 0])), axY = Q.rot(S[j.parentIndex].rot, j.Y), axZ = Q.rot(S[j.parentIndex].rot, j.Z);
          const want = V.sc(need, BAL.armShare / 2), my = V.dot(want, axY), mz = V.dot(want, axZ), js = this.jstate ? this.jstate(k, S) : null;
          const cy = Math.max(-cap * -L.Y[0], Math.min(cap * L.Y[1], my)), cz = Math.max(-cap * -L.Z[0], Math.min(cap * L.Z[1], mz));
          const q = csOfRel(j, Q.mul(Q.conj(S[j.parentIndex].rot), S[j.childIndex].rot)), sw = swingOf(q), guard = (a, lim, u) => (u > 0 && a > lim[1] - rad(BAL.armGuardDeg)) || (u < 0 && a < lim[0] + rad(BAL.armGuardDeg));
          // RANGE-AWARE bang-bang: an arm moving toward a range limit whose stopping distance at full shoulder torque (ω²/2α) reaches what is
          // left of its range is BRAKED (full torque against its motion) instead of driven — it must stop inside its range of motion; a throw
          // driven until the guard hit the joint stop and handed its momentum back to the trunk at the wrong moment (finding 2026-09-30: arms
          // turned three recovered forward steps into falls)
          const wRel = Q.rot(Q.conj(Q.fromAxes(j.X, j.Y, j.Z)), Q.rot(Q.conj(S[j.childIndex].rot), V.sub(S[j.childIndex].w, S[j.parentIndex].w))), Ia = this.armI[side];
          const axisCmd = (a, om, lim, want, capLo, capHi) => { const room = om > 0 ? lim[1] - rad(BAL.armGuardDeg) - a : a - (lim[0] + rad(BAL.armGuardDeg)), acc = (om > 0 ? capLo : capHi) / Ia;
            if (Math.abs(om) > 1e-3 && om * om / (2 * acc) >= room) return om > 0 ? -capLo : capHi;          // brake
            return guard(a, lim, want) ? 0 : want; };
          const ty = axisCmd(sw.y, wRel[1], j.limits.swingY, cy, cap * -L.Y[0], cap * L.Y[1]), tz = axisCmd(sw.z, wRel[2], j.limits.swingZ, cz, cap * -L.Z[0], cap * L.Z[1]), M = V.add(V.sc(axY, ty), V.sc(axZ, tz));
          this.armInfo[side] = { y: ty, z: tz, M, k }; } } }
    // ── released (fall transition): no balance, no IK, no hip strategy — posture requests stop escalating. What remains is muscle TONE:
    // stiffness ramps to fallScale of normal and a fraction fallTone of the static gravity support is kept (C1 finding: releasing tone
    // entirely — 15 % stiffness, no gravity support — made the heavy trunk jackknife over straight legs in forward falls). ──
    const limp = this.opts.releaseMode === "limp", fScale = limp ? 0.02 : BAL.fallScale, fTone = limp ? 0 : BAL.fallTone, fRamp = limp ? 1 : BAL.fallRampSteps;   // (limp: DIAGNOSTIC only)
    let relK = 1; if (released) { const k = Math.min(1, (this.nObs - (cls.fallStep || this.nObs)) / fRamp); relK = 1 + (fScale - 1) * k;
      for (const m of motor) { m.kp *= relK; m.kd *= Math.sqrt(relK); } for (let k2 = 0; k2 < nj; k2++) { tauG[k2] = V.sc(tauG[k2], fTone); tauB[k2] = [0, 0, 0]; }
      // GATE C5 (opts.protective): once the fall is unavoidable the posture requests are not merely released — the joints that can protect
      // take a PROTECTIVE target chosen from the actual fall direction (the capture point's direction from the COM, in the body frame):
      // forward → arms reach forward-down with flexed elbows, knees give; backward → chin tucked, trunk curled, hips/knees flex (sit), arms
      // back; sideways → the fall-side arm abducts toward the turf. Blended per direction weight, ramped in over the release ramp (≈ the
      // 0.1 s protective reaction latency), at moderate stiffness (protK) so the arms brace but yield. Physics decides where it lands.
      // Protective bracing is a reaction to the FALL: it is held while any segment of the grounded body still moves, then fades to plain
      // tone with the direction frozen from that moment — the bracing arm otherwise stayed raised while lying on the turf (visual finding
      // 2026-09-30, PR70). (Freezing the direction already at the first ground contact changed the roll-back of sit-down falls: PB60 head
      // impact 0.15 → 0.33 m/s — rejected.)
      if (this.opts.protective) { let d = [o.xi[0] - c[0], o.xi[1] - c[2]]; const dn = Math.hypot(d[0], d[1]); if (dn < 0.02) d = [o.vcom[0], o.vcom[2]];
        const n2 = Math.hypot(d[0], d[1]) || 1, f = (d[0] * hd[0] + d[1] * hd[2]) / n2, rt = (d[0] * lat[0] + d[1] * lat[2]) / n2;
        let wts = { F: Math.max(0, f), B: Math.max(0, -f), R: Math.max(0, rt), L: Math.max(0, -rt) };
        if (cls.state === "GROUNDED" && !this.protGround) this.protGround = { n: this.nObs };
        // at rest = EVERY segment slower than protRestV (the COM alone stops when a sit-down fall's seat lands while the trunk and head are
        // still rolling back — fading then untucked the chin: PB60 head impact 0.15 → 0.33 m/s)
        if (this.protGround && this.protRest == null && Math.max(...S.map(b => Math.hypot(b.v[0], b.v[1], b.v[2]))) < BAL.protRestV) { this.protRest = this.nObs; this.protRestWts = wts; }
        if (this.protRest != null) wts = this.protRestWts;
        const fade = this.protRest == null ? 1 : 1 - minjerk((this.nObs - this.protRest) / BAL.protFadeSteps), kP = k * fade, tgtOf = (dir, k) => { const p = PROT[dir][spec.joints[k].name]; return p ? paramTarget(spec.joints[k], p) : nominal[k]; };
        this.protInfo = { dir: wts, ramp: k, fade };
        spec.joints.forEach((j, kk) => { if (!PROT_J.has(j.name)) return; let acc = null, W0 = 0;
          for (const dir of ["F", "B", "R", "L"]) { const w = wts[dir]; if (w < 1e-3) continue; const t = tgtOf(dir, kk); if (acc == null) { acc = t; W0 = w; continue; }
            const a = w / (W0 + w); acc = j.type === "hinge" ? acc + (t - acc) * a : nlerpQ(acc, t, a); W0 += w; }
          if (acc == null) return; nominal[kk] = j.type === "hinge" ? nominal[kk] + (acc - nominal[kk]) * kP : nlerpQ(nominal[kk], acc, kP);
          const pk = /^(hip|knee|ankle)_/.test(j.name) ? BAL.protKLeg : BAL.protK, sk = 1 + (pk / relK - 1) * fade; motor[kk].kp *= sk; motor[kk].kd *= Math.sqrt(sk); }); } }
    // (G2a, opts.settleAxes — the new locomotion controller's human gait only): the landed foot's ankle compliance is AXIS-SELECTIVE. The heel
    // rocker (plan.settle) and the landing compliance (plan.soften) are sagittal needs — the heel lowering, the impact — but the motor's
    // stiffness is one number per joint, so the ankle's twist and roll went soft with it (× 0.07 in early double support) and the landed
    // foot could not brake the whole-body yaw the landing leg brings in (G2a finding: the pelvis yawed ~9° in every double support). The
    // twist (X) and roll (Z) errors are scaled by 1 / k in the posture target — the equilibrium-point form of their full stiffness.
    // ((G2b) the PRE-SWING RELEASE is axis-selective too, at the hip as well as the ankle: released in every axis the trailing leg let the pelvis
    // yaw ±25–30° about it and its foot twisted 27–40° on its toe in every double support)
    const relKs = (s) => relax && relax.release != null && relax.axisSel && relax.foot === s ? relax.release + (1 - relax.release) * relax.relax : 1;
    if (this.opts.settleAxes && plan && !released) for (const s of ["L", "R"]) { let kS = 1; if (plan.settle && plan.settle.foot === s) kS *= BAL.settleKp; if (plan.soften && plan.soften.foot === s) kS *= plan.soften.k;
      const kR = relKs(s); kS *= kR; if (kS >= 0.999 || !stance.includes(s)) continue;
      for (const [k, kk] of [[this.legs[s].ankle, kS], [this.legs[s].hip, kR]]) { if (kk >= 0.999 || (k === this.legs[s].hip && !(relax && relax.axisSel))) continue; const j = spec.joints[k], qAct = csOfRel(j, Q.mul(Q.conj(S[j.parentIndex].rot), S[j.childIndex].rot));
        let d = Q.mul(Q.conj(qAct), nominal[k]); if (d[3] < 0) d = d.map(x => -x); const e = logmap(d); nominal[k] = Q.norm(Q.mul(qAct, expmap(clampVec([e[0] / kk, e[1], e[2] / kk], 0.7)))); } }
    // ── torques → target offsets in each joint's own constraint space (equilibrium-point shift Δθ = τ / kp) ──
    const final = nominal.map((x, k) => Array.isArray(x) ? x.slice() : x);
    spec.joints.forEach((j, k) => { const Rc = S[j.childIndex].rot, kp = motor[k].kp;
      if (j.type === "hinge") { const ax = Q.rot(Rc, j.axis), g = V.dot(tauG[k], ax) / kp, b = V.dot(tauB[k], ax) / kp, tot = Math.max(-0.7, Math.min(0.7, g + b));
        out.gOff[k] = g; out.bOff[k] = b; final[k] = nominal[k] + tot; }
      else { const Cq = Q.fromAxes(j.X, j.Y, j.Z), toCs = (t) => Q.rot(Q.conj(Cq), Q.rot(Q.conj(Rc), t)), g = V.sc(toCs(tauG[k]), 1 / kp), b = V.sc(toCs(tauB[k]), 1 / kp);
        out.gOff[k] = g; out.bOff[k] = b; final[k] = Q.norm(Q.mul(nominal[k], expmap(clampVec(V.add(g, b), 0.7)))); } });
    // GATE C4: an arm with a reactive moment is driven as a TORQUE source — its target is kept M/kp AHEAD of its actual rotation and its
    // velocity target is its actual velocity, so the finite motor applies ≈ M continuously while the arm accelerates (an equilibrium-point
    // offset from the nominal pose would only step the arm a few degrees and stop — no throw, no momentum; finding 2026-09-30)
    const armVel = {}; if (this.armInfo && !released) for (const side of ["L", "R"]) { const a = this.armInfo[side]; if (!a || Math.hypot(a.y, a.z) < 1) continue;
      const k = a.k, j = spec.joints[k], Pr = S[j.parentIndex].rot, Rc = S[j.childIndex].rot, Cq = Q.fromAxes(j.X, j.Y, j.Z), toCs = (t) => Q.rot(Q.conj(Cq), Q.rot(Q.conj(Rc), t));
      const qAct = csOfRel(j, Q.mul(Q.conj(Pr), Rc)), g = V.sc(toCs(tauG[k]), 1 / motor[k].kp), m = V.sc(toCs(a.M), 1 / motor[k].kp);
      final[k] = Q.norm(Q.mul(qAct, expmap(clampVec(V.add(g, m), 0.7)))); armVel[k] = toCs(V.sub(S[j.childIndex].w, S[j.parentIndex].w)); }
    out.final = final; out.motor = motor; out.cls = { ...cls, times: { ...cls.times } };
    // GATE C2: velocity feed-forward for a swing-controlled leg (finite difference of its own successive targets, in each joint's space), so
    // the swing damping acts on deviation from the intended motion rather than on the motion itself. Stance joints keep a zero target velocity.
    if (plan || Object.keys(armVel).length) { out.vel = spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]); for (const k in this.swingVel) out.vel[k] = this.swingVel[k]; for (const k in this.stanceVel) out.vel[k] = this.stanceVel[k]; for (const k in armVel) out.vel[k] = armVel[k]; }
    // (opts.expose, G1a locomotion stack: the components the actuator arbiter allocates — world torques on the child body, the posture
    // target each joint holds, and the arms' torque-source moment; read-only copies, the default composition above is unchanged)
    if (this.opts.expose) { const hp = this._hipPart || {}; this._hipPart = null;
      out.parts = { tauG: tauG.map(t => t.slice()), tauB: tauB.map((t, k) => hp[k] ? V.sub(t, hp[k]) : t.slice()), tauHip: tauB.map((t, k) => hp[k] || [0, 0, 0]), nominal: nominal.map(x => Array.isArray(x) ? x.slice() : x),
        arms: this.armInfo && !released ? Object.fromEntries(Object.entries(this.armInfo).map(([sd, a]) => [a.k, a.M])) : {}, released, relK, swing: swingCtl.slice(), replant: (this.replant || []).slice(), stance: stance.slice(), lean: !!(plan && plan.lean && plan.lean.rad && !released) }; }
    out.debug = { prot: this.protInfo || null, arms: this.armInfo || null, pdTrace: this.pdTrace || null, unload: this.unloadInfo, xiRef, pRaw, pStar, r, hipCapHere, tauTrunk, feetStatic: fStatic, feetBal: fBal, heading: hd, pelvisTarget: { pos: Pd, rot: Rpd }, stance, replant: this.replant, fricR: this.fricR };
    return out;
  }
}
// a constraint-space target rotation held inside the joint's swing limits (minus a margin): the excess swing about Y / Z is rotated back
function romClamp(j, cs, m) { const L = j.limits; let q = cs[3] < 0 ? cs.map(x => -x) : cs;
  for (const [ax, i, lim] of [[[0, 1, 0], 1, L.swingY], [[0, 0, 1], 2, L.swingZ]]) { const tl = Math.sqrt(q[0] * q[0] + q[3] * q[3]), qt = tl > 1e-12 ? [q[0] / tl, 0, 0, q[3] / tl] : [0, 0, 0, 1], qs = Q.mul(q, Q.conj(qt));
    const a = 2 * datan2(qs[i], qs[3]), c = Math.max(lim[0] + m, Math.min(lim[1] - m, a)); if (c !== a) q = Q.norm(Q.mul(Q.axis(ax, c - a), q)); }
  return q; }
// swing angles (rad) of a constraint-space rotation (the same swing–twist split the joint limits use)
function swingOf(q) { let x = q[3] < 0 ? q.map(v => -v) : q; const tl = Math.sqrt(x[0] * x[0] + x[3] * x[3]), qt = tl > 1e-12 ? [x[0] / tl, 0, 0, x[3] / tl] : [0, 0, 0, 1], qs = Q.mul(x, Q.conj(qt));
  return { y: 2 * datan2(qs[1], qs[3]), z: 2 * datan2(qs[2], qs[3]) }; }
function rotRate(a, b, dT) { let d = Q.mul(Q.conj(a), b); if (d[3] < 0) d = d.map(x => -x); return [2 * d[0] / dT, 2 * d[1] / dT, 2 * d[2] / dT]; }
// GATE C2 two-foot CoP distribution: the C1 lever rule (share = projection of p* on the foot-centre line, the perpendicular remainder added
// to BOTH feet) loses the demand once both per-foot CoPs clamp at their sole edges — in a staggered stance the commanded net CoP sat
// 6–9 cm ahead of p* and he drifted backward and fell (finding 2026-09-29, test D). Here the share a and the per-foot CoPs x ∈ A, y ∈ B
// reproduce p* EXACTLY, (1 − a)·x + a·y = p*, and among those (a on a 2 % grid; x, y from the lever-rule offset, one clamped and the
// other solved) the choice minimises the summed squared ankle moments  ((1 − a)|x − c_L|)² + (a|y − c_R|)²  (load × CoP offset). A foot
// being loaded keeps its preload share as a floor.
// DIAGNOSTIC ONLY (opts.diagUnload, V1.1 anatomy report — not part of any calibration): during a planned TRANSFER the foot being unloaded is
// given zero share whenever p* already lies inside the stance foot's contact polygon (intent instead of minimum ankle effort)
function split2(o, p, cen, preload, unload) {
  const poly = (s) => { const f = o.feet[s]; let P = f.points.length >= 3 ? hullOf(f.points) : []; if (P.length < 3) P = hullOf(f.sole); return ccw2(P); };
  const A = poly("L"), B = poly("R"), cL = cen("L"), cR = cen("R"), sq = (u, v) => (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2, inA = (q) => polyDist(A, q) >= -1e-4, inB = (q) => polyDist(B, q) >= -1e-4;
  let best = null; const take = (a, x, y) => { const c = (1 - a) ** 2 * sq(x, cL) + a * a * sq(y, cR); if (!best || c < best.c - 1e-15) best = { a, x, y, c }; };
  if (inA(p)) take(0, p.slice(), cR); if (inB(p)) take(1, cL, p.slice());
  for (let i = 1; i < 50; i++) { const a = i / 50, off = [p[0] - ((1 - a) * cL[0] + a * cR[0]), p[1] - ((1 - a) * cL[1] + a * cR[1])];
    const x1 = polyClamp(A, [cL[0] + off[0], cL[1] + off[1]], 0), y1 = [(p[0] - (1 - a) * x1[0]) / a, (p[1] - (1 - a) * x1[1]) / a]; if (inB(y1)) take(a, x1, y1);
    const y2 = polyClamp(B, [cR[0] + off[0], cR[1] + off[1]], 0), x2 = [(p[0] - a * y2[0]) / (1 - a), (p[1] - a * y2[1]) / (1 - a)]; if (inA(x2)) take(a, x2, y2); }
  if (!best) { const nL = polyClamp(A, p, 0), nR = polyClamp(B, p, 0); best = sq(p, nL) <= sq(p, nR) ? { a: 0, x: nL, y: cR } : { a: 1, x: cL, y: nR }; }
  if (unload) { const stP = unload === "R" ? A : B; if (polyDist(stP, p) >= -1e-4) best = unload === "R" ? { a: 0, x: p.slice(), y: cR } : { a: 1, x: cL, y: p.slice() }; }
  let aR = best.a; if (preload) aR = preload.foot === "R" ? Math.max(aR, preload.share) : Math.min(aR, 1 - preload.share);
  return { share: { L: 1 - aR, R: aR }, at: { L: best.x, R: best.y } }; }
// V1.1 PLANNED UNLOADING (controller option unloadPlan; the V1.1 working controller). During a planned TRANSFER the support layer
// schedules an UPPER BOUND on the share of body weight the unloading foot may be commanded to carry (from its measured share at the start
// of the transfer to 0 at its end). Double support is statically indeterminate — the joint torques decide how the ground reaction is
// split — and the approved split minimised the summed ankle effort, which in a transfer keeps 4–8 % of the weight on the foot being
// unloaded and made liftoff depend on an unmodelled CoP bias (V1.1 anatomy report §9). Here, among the distributions that reproduce the
// demanded net CoP p* EXACTLY, the least-effort one is chosen subject to swing share ≤ the bound; the bound can never go below the
// PHYSICAL minimum a_min — the smallest swing share for which p* is realisable with the stance CoP inside the stance foot's contact
// polygon ((1 − a)·A ⊕ a·B ∋ p*, found exactly by convex-polygon clipping). So while p* is still outside the stance foot the swing foot
// is commanded exactly the load physics requires, and it is unloaded only as the COM/ξ state makes the stance foot able to carry the whole
// demand. Liftoff is still decided by the MEASURED load (pc_support.js).
// the point of a convex CCW polygon shrunk by `inset` nearest to p (p itself if already inside it)
// the capture-point feedback term kXi·e — a scalar gain, or per axis { hd: heading [x, z], along, across } (G2b walking single support)
export function kXiErr(k, e) { if (typeof k === "number") return [k * e[0], k * e[1]]; const h = k.hd, a = (e[0] * h[0] + e[1] * h[1]) * k.along, l = (e[0] * h[1] - e[1] * h[0]) * k.across;
  return [h[0] * a + h[1] * l, h[1] * a - h[0] * l]; }
export function nearestInset(P, p, inset) { const n = P.length; if (n < 3) return p.slice(); const off = [];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], e = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(e[0], e[1]) || 1, nin = [-e[1] / L, e[0] / L]; off.push([[a[0] + nin[0] * inset, a[1] + nin[1] * inset], e]); }
  const Q2 = []; for (let i = 0; i < n; i++) { const [p1, d1] = off[(i + n - 1) % n], [p2, d2] = off[i], den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-12) { Q2.push(p2); continue; }
    const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den; Q2.push([p1[0] + d1[0] * t, p1[1] + d1[1] * t]); }
  if (polyDist(Q2, p) >= 0) return p.slice(); return polyNearest(Q2, p); }
function clipConvex(subject, clip) { let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length], inp = out; out = [];
    const side = (q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    for (let j = 0; j < inp.length; j++) { const P = inp[j], R = inp[(j + 1) % inp.length], sP = side(P), sR = side(R);
      if (sP >= 0) out.push(P); if ((sP >= 0) !== (sR >= 0)) { const t = sP / (sP - sR); out.push([P[0] + (R[0] - P[0]) * t, P[1] + (R[1] - P[1]) * t]); } } }
  return out; }
function nearestIn(poly, c) { if (!poly.length) return null; if (poly.length >= 3 && polyDist(poly, c) >= 0) return c.slice();
  if (poly.length >= 3) return polyNearest(poly, c); let best = poly[0], bd = 1e18; for (const q of poly) { const d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2; if (d < bd) { bd = d; best = q; } } return best.slice(); }
function split2u(o, p, cen, unl) {
  const poly = (s) => { const f = o.feet[s]; let P = f.points.length >= 3 && !(unl.soleFor === s && f.sole && f.sole.length >= 3) ? hullOf(f.points) : []; if (P.length < 3) P = hullOf(f.sole); return ccw2(P); };
  // ((G2b walker, unl.soleFor) the LANDING foot still settling onto its sole (heel or toe contact only) is given its WHOLE SOLE as its support
  // region: with only its contact points the split put its CoP on the heel edge, and the ankle feed-forward that realises that CoP held the
  // toes up — the heel rocker stalled for up to 0.2 s with 60 % of the weight on the heel. The CoP demand on the full sole is a plantar-flexion
  // moment that lowers the forefoot; Jolt decides when the sole is down.)
  // ((G2b) a foot in PRE-SWING carries its load on its TOE edge only (unl.toeRegion): with the heel rising, the rest of the sole is no support)
  // ((G2b) unl.band = { cap, ank: { L, R } (ankle [x, z]), lat: { L, R } (each foot's sideways unit [x, z]) } — each foot's usable CoP region is
  // limited SIDEWAYS to ± cap about its ankle: the roll torque that puts a foot's CoP at its sole edge (≈ 6 cm × 700 N ≈ 42 N·m) exceeds the
  // ankle's limit and shared budget, so a split that relied on it was not realised (measured CoP 5 cm from the demand); the share between the
  // feet then carries the sideways CoP, as it physically must)
  const band = (s, P) => { if (!unl.band || P.length < 3) return P; const a = unl.band.ank[s], l = unl.band.lat[s], c = unl.band.cap, BIG = 5, fw = [-l[1], l[0]];
    const rect = [[a[0] - l[0] * c - fw[0] * BIG, a[1] - l[1] * c - fw[1] * BIG], [a[0] + l[0] * c - fw[0] * BIG, a[1] + l[1] * c - fw[1] * BIG], [a[0] + l[0] * c + fw[0] * BIG, a[1] + l[1] * c + fw[1] * BIG], [a[0] - l[0] * c + fw[0] * BIG, a[1] - l[1] * c + fw[1] * BIG]];
    const Q2 = clipConvex(P, ccw2(rect)); return Q2.length >= 3 ? ccw2(Q2) : P; };
  const sw = unl.foot, st = sw === "R" ? "L" : "R", A = band(st, poly(st)), B = unl.toeRegion ? ccw2(hullOf(unl.toeRegion.map(q => [q[0], 0, q[1]]))) : band(sw, poly(sw)), cA = cen(st), cB = cen(sw), sq = (u, v) => (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2;
  if (A.length < 3 || B.length < 3) return null;
  const TA = (a) => A.map(v => [(p[0] - (1 - a) * v[0]) / a, (p[1] - (1 - a) * v[1]) / a]);          // swing CoPs compatible with a stance CoP in A
  const TB = (a) => B.map(v => [(p[0] - a * v[0]) / (1 - a), (p[1] - a * v[1]) / (1 - a)]);          // stance CoPs compatible with a swing CoP in B
  const feas = (a) => a <= 0 ? polyDist(A, p) >= -1e-5 : a >= 1 ? polyDist(B, p) >= -1e-5 : clipConvex(B, TA(a)).length > 0;
  // the physically realisable interval [aMin, aMax] of this foot's share (convex in a: the CoPs reachable with share a form (1 − a)A ⊕ aB)
  let aMin = 0; if (!feas(0)) { let prev = 0, hit = null; for (let i = 1; i <= 99; i++) { const a = i / 100; if (feas(a)) { hit = a; break; } prev = a; }
    if (hit == null) return null; let lo = prev, hi = hit; for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (feas(m)) hi = m; else lo = m; } aMin = hi; }
  let aMax = aMin; if (unl.minShare != null) { let top = null; for (let i = 99; i >= 1; i--) { const a = i / 100; if (a <= aMin) break; if (feas(a)) { top = a; break; } }
    if (top != null) { let lo = top, hi = Math.min(1, top + 0.01); for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (feas(m) && m < 1) lo = m; else hi = m; } aMax = lo; } }
  // UNLOADING (maxShare): the share may not exceed the scheduled bound unless physics needs it; LOADING (minShare): it may not fall below
  // the scheduled bound unless physics cannot carry it
  const aLo = unl.minShare != null ? Math.max(aMin, Math.min(unl.minShare, aMax)) : aMin, aHi = unl.minShare != null ? Math.max(aLo, aMax) : Math.max(aMin, Math.min(unl.maxShare, 0.99));
  const cand = [aLo]; if (aHi > aLo) for (let i = 1; i <= 20; i++) cand.push(aLo + (aHi - aLo) * i / 20);
  let best = null; const take = (a, x, y) => { const c = (1 - a) ** 2 * sq(x, cA) + a * a * sq(y, cB); if (!best || c < best.c - 1e-15) best = { a, x, y, c }; };
  for (const a of cand) { if (a <= 1e-9) { if (feas(0)) take(0, p.slice(), cB); continue; }
    const Y = clipConvex(B, TA(a)); if (Y.length) { const y = nearestIn(Y, cB); take(a, [(p[0] - a * y[0]) / (1 - a), (p[1] - a * y[1]) / (1 - a)], y); }
    const X = clipConvex(A, TB(a)); if (X.length) { const x = nearestIn(X, cA); take(a, x, [(p[0] - (1 - a) * x[0]) / a, (p[1] - (1 - a) * x[1]) / a]); } }
  if (!best) return null;
  const share = sw === "R" ? { L: 1 - best.a, R: best.a } : { L: best.a, R: 1 - best.a }, at = sw === "R" ? { L: best.x, R: best.y } : { L: best.y, R: best.x };
  return { share, at, info: { foot: sw, mode: unl.minShare != null ? "load" : "unload", bound: unl.minShare != null ? unl.minShare : unl.maxShare, aMin, aMax: unl.minShare != null ? aMax : null, share: best.a } }; }
function ccw2(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? P : P.slice().reverse(); }
function groundY(f) { return f.points.length ? f.points.reduce((a, p) => a + p[1], 0) / f.points.length : 0; }
function hullOf(P) { const p = P.map(q => [q[0], q[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
// the multi-axis effort policy (review M2), applied by the runner with the CURRENT joint state (an actuator property, not delayed):
// each axis keeps its directional limit scaled by the share of the current demand on that axis (floor 25 %), so the vector effort stays
// ≈ within the joint's directional budget (worst case ≈ 1.06×) instead of up to √3× with independent per-axis caps.
export function budgetLimits(lim, qCur, qTarget) {
  let d = Q.mul(Q.conj(qCur), qTarget); if (d[3] < 0) d = d.map(x => -x); const e = [d[0], d[1], d[2]], n = Math.sqrt(V.dot(e, e));
  const w = n > 1e-6 ? e.map(x => Math.max(BAL.budgetFloor, Math.abs(x) / n)) : [0.57735, 0.57735, 0.57735];
  return { lo: lim.lo.map((x, i) => x * w[i]), hi: lim.hi.map((x, i) => x * w[i]), w };
}
