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
import { V, Q, dexp, datan2, dasin, dnorm, unitStates, unitEv } from "../core/v2_math.js";   // deterministic math only in anything that feeds physics (G3 resolution D1)
import { posedBodies } from "../spec/v2_pose.js";
import { bootSole, hull2, hull2Canonical } from "../sim/v2_geom.js";
import { pyr, decompose } from "../spec/v2_joints.js";

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
    const fwd = this.feet.map(f => Q.rot(st[f].rot, [0, 0, 1])), hd = norm2([fwd[0][0] + fwd[1][0], fwd[0][2] + fwd[1][2]]);
    const ankL = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_L")), ankR = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_R"));
    const mid = [(ankL[0] + ankR[0]) / 2, (ankL[2] + ankR[2]) / 2], lat = [hd[1], -hd[0]];   // lat: the character's RIGHT in the turf plane (spec §7.2 CCS: +x anatomical right, +z anterior)
    const off = o.refOffset ? o.refOffset(this.n * dt) : [0, 0];   // DIAGNOSTIC ONLY (G2 step 2 lean ramp): [right, anterior] shift of the target (m); never used by a gate test
    const polys = [0, 1].map(n => this.footPoly(st, n)), cen = polys.map(poly => centroid(poly));
    // G3: requested load split → lateral target (quasi-static: the COM over the λ-weighted point between the region centroids); contact-based support
    const req = o.transfer ? o.transfer(this.n * dt, this) : null, lam = req == null ? null : (typeof req === "number" ? req : req.lam), dLat = lam == null ? 0 : ((cen[0][0] * (1 - lam) + cen[1][0] * lam - mid[0]) * lat[0] + (cen[0][1] * (1 - lam) + cen[1][1] * lam - mid[1]) * lat[1]);
    const xiRef = [mid[0] + hd[0] * (this.stance.comAhead + off[1]) + lat[0] * (off[0] + dLat), mid[1] + hd[1] * (this.stance.comAhead + off[1]) + lat[1] * (off[0] + dLat)];
    // G3 DCM tracking of a MOVING target: ξ_ref = x_ref + ẋ_ref/ω0 and p* gains −ξ̇_ref/ω0. The rates come ANALYTICALLY from the request
    // (λ̇, λ̈ × the lateral centroid separation) — the first version differentiated the measured target twice at 240 Hz, which amplified
    // sub-millimetre rocking of the barely loaded foot ~5800× into CoP commands and felled the cycle test (G3-A4, recorded)
    let xiRefFF = [0, 0]; if (lam != null && o.dcmFF && typeof req === "object") { const sep = (cen[1][0] - cen[0][0]) * lat[0] + (cen[1][1] - cen[0][1]) * lat[1], w = Math.sqrt(G / Math.max(0.3, c[1]));
      const vl = sep * (req.dl || 0), al = sep * (req.ddl || 0); xiRef[0] += lat[0] * vl / w; xiRef[1] += lat[1] * vl / w; xiRefFF = [-lat[0] * (vl + al / w) / w, -lat[1] * (vl + al / w) / w]; }
    const inSup = [0, 1].map(n => !o.contactSupport || this.sense.touch[n] > 0), supIdx = [0, 1].filter(n => inSup[n]), supFeet = supIdx.length ? supIdx : [0, 1];
    if (o.holdUnloaded) for (const n of [0, 1]) { const Fz = this.sense.Fz[n], W = this.M * G;
      if (!this.unl[n] && Fz < o.loadOff * W) { this.unl[n] = true; this.hold[n] = { pos: st[this.feet[n]].pos.slice(), rot: st[this.feet[n]].rot.slice() }; }
      else if (this.unl[n] && Fz > o.loadOn * W) { this.unl[n] = false; this.hold[n] = null; } }
    const support = hull2(supFeet.flatMap(n => polys[n]).map(([x, z]) => [x, 0, z]));
    // 2–3. balance objective → desired CoP (clamped to the support region) → desired foot wrenches
    const pRaw = [xi[0] + o.kXi * (xi[0] - xiRef[0]) + xiRefFF[0], xi[1] + o.kXi * (xi[1] - xiRef[1]) + xiRefFF[1]], p = clampPoly(support, pRaw), r = [pRaw[0] - p[0], pRaw[1] - p[1]];
    const A = [w0 * w0 * (c[0] - p[0]), 0, w0 * w0 * (c[2] - p[1])];
    // load share by the lever rule along the line between the feet's region centroids; each foot's CoP = its centroid + a shift so that the
    // load-weighted CoPs reproduce p (shift shared, the remainder re-assigned to the foot that still has room; both clamped to their regions)
    const a = cen[1], b = cen[0], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
    const flL = lam == null ? o.minShare : Math.min(o.minShare, 1 - lam), flR = lam == null ? o.minShare : Math.min(o.minShare, lam);   // G3: the floor relaxes to the requested share
    let t = Math.max(flL, Math.min(1 - flR, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); if (!inSup[0] && inSup[1]) t = 0; if (!inSup[1] && inSup[0]) t = 1; const share = [t, 1 - t];
    const dl = [p[0] - (t * b[0] + (1 - t) * a[0]), p[1] - (t * b[1] + (1 - t) * a[1])], cop = cen.map((q, n) => clampPoly(polys[n], [q[0] + dl[0], q[1] + dl[1]]));
    // ORDER-INDEPENDENT (G2 final-run fix: the first version offered the remainder to the left foot first — an L/R asymmetry, measured as an
    // asymmetric boundary for V2-190-85): the remainder is applied as a COMMON shift to every foot that can still move toward it, scaled by
    // their summed share so the load-weighted CoP moves by the remainder; repeated (each foot clamped to its own region).
    for (let it = 0; it < 6; it++) { const ach = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]], res = [p[0] - ach[0], p[1] - ach[1]], rl = dnorm(res[0], res[1]);
      if (rl < 1e-7) break; const u = [res[0] / rl, res[1] / rl], mov = [0, 1].map(n => { const q = clampPoly(polys[n], [cop[n][0] + u[0] * 1e-4, cop[n][1] + u[1] * 1e-4]); return dnorm(q[0] - cop[n][0], q[1] - cop[n][1]) > 1e-6 ? 1 : 0; });
      const S = share[0] * mov[0] + share[1] * mov[1]; if (S < 1e-6) break; for (const n of [0, 1]) if (mov[n]) cop[n] = clampPoly(polys[n], [cop[n][0] + res[0] / S, cop[n][1] + res[1] / S]); }
    const pAch = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]]; p[0] = pAch[0]; p[1] = pAch[1]; r[0] = pRaw[0] - p[0]; r[1] = pRaw[1] - p[1];
    A[0] = w0 * w0 * (c[0] - p[0]); A[2] = w0 * w0 * (c[2] - p[1]);
    const F = share.map(s => [s * this.M * A[0], s * this.M * G, s * this.M * A[2]]), geff = [-A[0], -G, -A[2]];
    // posture preference for the legs (task space): a desired wrench on the pelvis — orientation toward the reference (heading from the feet)
    // and height above the ankles — that the legs deliver (statics, each leg its load share); horizontal pelvis position is NOT a posture target
    let legW = null, ikT = null;
    if (o.posture === "ik") { const ps = st[this.pelvis], yaw = datan2(hd[0], hd[1]), qP = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot), pP = [ps.pos[0], (ankL[1] + ankR[1]) / 2 + this.pel.hRef, ps.pos[2]];
      if (o.ikFeasible) for (const n of [0, 1]) { const ft = this.unl[n] ? this.hold[n] : st[this.feet[n]], hip = V.add(pP, Q.rot(qP, this.anchor[this.legK[n][0]])), dh = dnorm(hip[0] - ft.pos[0], hip[2] - ft.pos[2]), Ln = this.legLen[n];
        if (dh < Ln) pP[1] = Math.min(pP[1], ft.pos[1] + Math.sqrt(Ln * Ln - dh * dh) - (hip[1] - pP[1])); }
      this.pelHT = pP[1];
      const tIK = o.timeIK ? nowMs() : 0; ikT = {}; this.ikRes = [0, 1].map(n => { const r = this.legIK(st, ev, n, pP, qP, this.unl[n] ? this.hold[n] : null); for (const [k, q] of r.targets) ikT[k] = q; return r.err; });
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
    const cmd = [], ff = [];
    for (const d of P.jd) { const k = d.k, pj = this.jointAt(st, k); let T = [0, 0, 0];
      for (const i of this.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of this.subFeet[k]) { const n = this.feet.indexOf(f), pc = [cop[n][0], 0, cop[n][1]]; T = V.sub(T, V.cross(V.sub(pc, pj), F[n])); }
      const side = this.legSide[k]; if (legW && side >= 0) { const w = legW[side]; T = V.sub(T, V.add(w.T, V.cross(V.sub(w.hc, pj), w.F))); }   // deliver the pelvis wrench share
      if (side >= 0 && k === this.hipK[side]) T = V.sub(T, V.sc(Ldot, hipShare[side]));
      if (armL && this.shK.includes(k)) T = V.add(T, V.sc(armL, armF[this.shK.indexOf(k)]));                                         // arm counter-motion                                                   // hip strategy (hips only)
      ff.push(T);
      const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => Q.rot(R2F2, e)), g = this.gain[k], isAnkle = g.base === "ankle";
      const q = ev.qs[k], qr = ikT && ikT[k] ? ikT[k] : this.qref[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      cmd.push(KEYS.map((key, i) => { const tff = V.dot(T, axW[i]), ak = this.spec.joints[k].def.axes[key];
        if (isAnkle && o.holdUnloaded && this.unl[this.legSide[k]] && ikT && ikT[k]) { const gf = this.gainFree[k]; return { K: gf.K, D: gf.D, tau0: tff + gf.K * e[i], ff: tff }; }   // G3: hold the unloaded foot's pose
        if (isAnkle) { const nz = o.noise && ak && (ak.key === "df" || ak.key === "inv") ? this.ou[(this.spec.joints[k].side === "L" ? 0 : 2) + (ak.key === "df" ? 0 : 1)] : 0; return { K: 0, D: o.ankleD, tau0: tff + nz, ff: tff }; }
        if (legW && this.legSide[k] >= 0 && ak && ak.key !== "rot") return { K: 0, D: o.taskD * g.D, tau0: tff, ff: tff };   // task-space leg rows (flexion / abduction)
        if (o.gainSched && this.legSide[k] >= 0) { const sd = this.legSide[k], Fs = this.sense.Fz, sc = (Fs[0] + Fs[1] > 1 ? Fs[sd] / (Fs[0] + Fs[1]) : 0.5) / 0.5, gf = this.gainFree[k];
          const Ks = Math.max(gf.K, g.K * sc), Ds = Math.max(gf.D, g.D * sc); return { K: Ks, D: Ds, tau0: tff + Ks * e[i], ff: tff }; }
        return { K: g.K, D: g.D, tau0: tff + g.K * e[i], ff: tff }; })); }
    this.info = { c, v, h, w0, xi, xiRef, pRaw, p, r, A, share, cop, F, support, polys, mid, heading: hd, ff, t, Ldot, lam, inSup, unl: this.unl.slice(), ikRes: this.ikRes ? this.ikRes.slice() : null, pelH: o.posture === "ik" ? this.pelHT : null }; this.n++;
    return cmd;
  }
}
// seeded PRNG (mulberry32) + Irwin–Hall Gaussian: deterministic across engines (integer ops and + − × ÷ only)
StandController.prototype.gauss = function () { let s2 = 0; for (let i = 0; i < 12; i++) { this.rng = (this.rng + 0x6D2B79F5) >>> 0; let t = this.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); s2 += ((t ^ (t >>> 14)) >>> 0) / 4294967296; } return s2 - 6; };
// ── leg inverse kinematics (posture targets): hip (3) + knee flexion + ankle DF / inversion so that the chain from the pelvis at pose (pP, qP)
//    ends exactly at the foot's CURRENT pose; knee axial rotation, the locked knee axis and the passive foot ab/adduction keep their current
//    values. Newton on the pyramid parameters, finite-difference Jacobian, from the current configuration.
StandController.prototype.getState = function () { return JSON.parse(JSON.stringify({ n: this.n, ring: this.ring, ou: this.ou, rng: this.rng, unl: this.unl, hold: this.hold, sense: this.sense, g3: this.g3 || null, info: this.info })); };   // info: the G3 supervisor reads the previous tick's controller state
StandController.prototype.setState = function (x) { const y = JSON.parse(JSON.stringify(x)); Object.assign(this, y); };
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
StandController.prototype.legIK = function (st, ev, n, pP, qP, footPose = null) {
  const P = this.P, ks = this.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => this.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  if (this.o.ikRefTwist) { const rf = ks.map(k => { const v = decompose(this.qref[k]); return v.tw; }); cur[1] = [rf[1], cur[1][1], cur[1][2]]; cur[2] = [rf[2], cur[2][1], cur[2][2]]; }   // twist DOFs at the reference
  // forward kinematics, staged so that a Jacobian column only recomputes the segments its DOF moves (overnight D: exact reuse — every reused value
  // is the identical expression on identical inputs, so results are bit-identical to the unstaged chain; verified on 10,880 problems + J2a)
  const ft = footPose || st[this.feet[n]], A0 = Q.mul(qP, d[0].F1), C0 = Q.conj(d[0].F2), C1 = Q.conj(d[1].F2), C2 = Q.conj(d[2].F2), pt = V.add(pP, Q.rot(qP, a[0]));
  const thigh = (qh) => { const Rt = Q.mul(Q.mul(A0, qh), C0); return { Rt, B1: Q.mul(Rt, d[1].F1), ps: V.add(pt, Q.rot(Rt, a[1])) }; };
  const shank = (T, qk) => { const Rs = Q.mul(Q.mul(T.B1, qk), C1); return { Rs, B2: Q.mul(Rs, d[2].F1), pf: V.add(T.ps, Q.rot(Rs, a[2])) }; };
  const res = (S, qa) => { const Rf = Q.mul(Q.mul(S.B2, qa), C2); let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v); const pf = S.pf;
    return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  const qhOf = (x) => pyr(x[0], x[1], x[2]), qkOf = (x) => pyr(cur[1][0], x[3], cur[1][2]), qaOf = (x) => pyr(cur[2][0], x[4], x[5]);
  const fk = (x) => res(shank(thigh(qhOf(x)), qkOf(x)), qaOf(x));
  const jac = (x) => { const T0 = thigh(qhOf(x)), qk0 = qkOf(x), S0 = shank(T0, qk0), qa0 = qaOf(x);   // Jm[c][i] = ∂r_i/∂x_c, central differences
    return [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(), xm = x.slice(); xp[c] += IK.h; xm[c] -= IK.h;
      const ev2 = (y) => (c < 3 ? res(shank(thigh(qhOf(y)), qk0), qa0) : c === 3 ? res(shank(T0, qkOf(y)), qa0) : res(S0, qaOf(y)));
      const rp = ev2(xp), rm = ev2(xm); return rp.map((v, i) => (v - rm[i]) / (2 * IK.h)); }); };
  let x = [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]], r = fk(x), err = dnorm(...r), it = 0, mu = IK.mu0, lastJ = null, lastH = null;
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
  const tg = [[ks[0], pyr(x[0], x[1], x[2])], [ks[1], pyr(cur[1][0], x[3], cur[1][2])]]; if (footPose) tg.push([ks[2], pyr(cur[2][0], x[4], x[5])]);   // held foot: the ankle target too
  return { targets: tg, err, it, x };
};
export const IK = { h: 1e-6, tol: 1e-12, maxIt: 12, mu0: 1e-2, muMin: 1e-12, gradTol: 1e-14,
  polish: (typeof process !== "undefined" && process.env && process.env.V2_IK_POLISH) || "stale" };   // "stale" (adopted) | "none" (diagnostic env selector, Node only)
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
