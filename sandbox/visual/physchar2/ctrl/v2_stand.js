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
import { V, Q, dexp } from "../core/v2_math.js";
import { posedBodies } from "../spec/v2_pose.js";
import { bootSole, hull2 } from "../sim/v2_geom.js";
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
const G = 9.81, KEYS = ["x", "y", "z"], HIP_LOAD = 0.25;

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
    this.sole = this.feet.map(f => { const s = bootSole(B[f]); return { y0: s.y0, poly: opts.footRegion ? opts.footRegion(f) : insetPoly(hull2(s.pts), this.o.footInset) }; });
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
  }
  _at(S, name) { const k = this.spec.joints.findIndex(j => j.name === name); return this.jointAt(S, k); }
  // world helpers
  jointAt(st, k) { const j = this.spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, this.anchor[k])); }
  footPoly(st, n) { const f = this.feet[n], s = this.sole[n]; return s.poly.map(([x, z]) => { const p = V.add(st[f].pos, Q.rot(st[f].rot, [x, s.y0, z])); return [p[0], p[2]]; }); }
  compute(st, ev, dt) {
    const o = this.o, B = this.spec.bodies, P = this.P;
    // 1. state estimation
    let c = [0, 0, 0], v = [0, 0, 0]; st.forEach((s, i) => { c = V.add(c, V.sc(s.com, B[i].mass)); v = V.add(v, V.sc(s.v, B[i].mass)); }); c = V.sc(c, 1 / this.M); v = V.sc(v, 1 / this.M);
    if (o.delay > 0) { this.ring.push([c, v]); const lag = Math.round(o.delay / dt); if (this.ring.length > lag + 1) this.ring.shift(); [c, v] = this.ring[0]; }
    const h = Math.max(0.3, c[1]), w0 = Math.sqrt(G / h), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0];
    const fwd = this.feet.map(f => Q.rot(st[f].rot, [0, 0, 1])), hd = norm2([fwd[0][0] + fwd[1][0], fwd[0][2] + fwd[1][2]]);
    const ankL = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_L")), ankR = this.jointAt(st, this.spec.joints.findIndex(j => j.name === "ankle_R"));
    const mid = [(ankL[0] + ankR[0]) / 2, (ankL[2] + ankR[2]) / 2], lat = [hd[1], -hd[0]];   // lat: the character's RIGHT in the turf plane (spec §7.2 CCS: +x anatomical right, +z anterior)
    const off = o.refOffset ? o.refOffset(this.n * dt) : [0, 0];   // DIAGNOSTIC ONLY (G2 step 2 lean ramp): [right, anterior] shift of the target (m); never used by a gate test
    const xiRef = [mid[0] + hd[0] * (this.stance.comAhead + off[1]) + lat[0] * off[0], mid[1] + hd[1] * (this.stance.comAhead + off[1]) + lat[1] * off[0]];
    const polys = [0, 1].map(n => this.footPoly(st, n)), support = hull2(polys.flat().map(([x, z]) => [x, 0, z]));
    // 2–3. balance objective → desired CoP (clamped to the support region) → desired foot wrenches
    const pRaw = [xi[0] + o.kXi * (xi[0] - xiRef[0]), xi[1] + o.kXi * (xi[1] - xiRef[1])], p = clampPoly(support, pRaw), r = [pRaw[0] - p[0], pRaw[1] - p[1]];
    const A = [w0 * w0 * (c[0] - p[0]), 0, w0 * w0 * (c[2] - p[1])];
    // load share by the lever rule along the line between the feet's region centroids; each foot's CoP = its centroid + a shift so that the
    // load-weighted CoPs reproduce p (shift shared, the remainder re-assigned to the foot that still has room; both clamped to their regions)
    const cen = polys.map(poly => centroid(poly)), a = cen[1], b = cen[0], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
    const t = Math.max(o.minShare, Math.min(1 - o.minShare, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)), share = [t, 1 - t];
    const dl = [p[0] - (t * b[0] + (1 - t) * a[0]), p[1] - (t * b[1] + (1 - t) * a[1])], cop = cen.map((q, n) => clampPoly(polys[n], [q[0] + dl[0], q[1] + dl[1]]));
    // ORDER-INDEPENDENT (G2 final-run fix: the first version offered the remainder to the left foot first — an L/R asymmetry, measured as an
    // asymmetric boundary for V2-190-85): the remainder is applied as a COMMON shift to every foot that can still move toward it, scaled by
    // their summed share so the load-weighted CoP moves by the remainder; repeated (each foot clamped to its own region).
    for (let it = 0; it < 6; it++) { const ach = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]], res = [p[0] - ach[0], p[1] - ach[1]], rl = Math.hypot(res[0], res[1]);
      if (rl < 1e-7) break; const u = [res[0] / rl, res[1] / rl], mov = [0, 1].map(n => { const q = clampPoly(polys[n], [cop[n][0] + u[0] * 1e-4, cop[n][1] + u[1] * 1e-4]); return Math.hypot(q[0] - cop[n][0], q[1] - cop[n][1]) > 1e-6 ? 1 : 0; });
      const S = share[0] * mov[0] + share[1] * mov[1]; if (S < 1e-6) break; for (const n of [0, 1]) if (mov[n]) cop[n] = clampPoly(polys[n], [cop[n][0] + res[0] / S, cop[n][1] + res[1] / S]); }
    const pAch = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]]; p[0] = pAch[0]; p[1] = pAch[1]; r[0] = pRaw[0] - p[0]; r[1] = pRaw[1] - p[1];
    A[0] = w0 * w0 * (c[0] - p[0]); A[2] = w0 * w0 * (c[2] - p[1]);
    const F = share.map(s => [s * this.M * A[0], s * this.M * G, s * this.M * A[2]]), geff = [-A[0], -G, -A[2]];
    // posture preference for the legs (task space): a desired wrench on the pelvis — orientation toward the reference (heading from the feet)
    // and height above the ankles — that the legs deliver (statics, each leg its load share); horizontal pelvis position is NOT a posture target
    let legW = null, ikT = null;
    if (o.posture === "ik") { const ps = st[this.pelvis], yaw = Math.atan2(hd[0], hd[1]), qP = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot), pP = [ps.pos[0], (ankL[1] + ankR[1]) / 2 + this.pel.hRef, ps.pos[2]];
      ikT = {}; this.ikRes = [0, 1].map(n => { const r = this.legIK(st, ev, n, pP, qP); for (const [k, q] of r.targets) ikT[k] = q; return r.err; }); }
    if (o.posture === "task") { const ps = st[this.pelvis], pe = this.pel, yaw = Math.atan2(hd[0], hd[1]), qref = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot);
      let qe = Q.mul(qref, Q.conj(ps.rot)); if (qe[3] < 0) qe = qe.map(x => -x); const eo = [2 * qe[0], 2 * qe[1], 2 * qe[2]];
      const To = [0, 1, 2].map(a => pe.Ko * eo[a] - pe.Do[a] * ps.w[a]), hp = ps.pos[1] - (ankL[1] + ankR[1]) / 2, Fy = pe.Kh * (pe.hRef - hp) - pe.Dh * ps.v[1];
      legW = [0, 1].map(n => { const hc = this.jointAt(st, this.hipK[n]), Fi = [0, share[n] * Fy, 0]; return { hc, F: Fi, T: V.add(V.sc(To, share[n]), V.cross(V.sub(ps.com, hc), Fi)) }; });
      this.postureInfo = { eo, To, hp, Fy }; }
    // hip / trunk strategy (only when the support cannot deliver p*: r ≠ 0): the stance hips apply L̇ = M·g·(ŷ × r) to the upper body
    // (whole-body angular momentum changes; the ground reaction gains the horizontal force the CoP could not provide). Finite: the hip
    // actuators clamp it; the posture preference (pelvis orientation) remains and returns the trunk afterwards.
    // Applied at the hips only (torque on the pelvis = share·L̇, reaction on the thigh): NOT propagated down the legs — the saturated CoP cannot take it.
    let Ldot = o.hip && (r[0] || r[1]) ? V.sc(V.cross([0, 1, 0], [r[0], 0, r[1]]), this.M * G * o.hipUse) : [0, 0, 0];
    if (Ldot[0] || Ldot[2]) { const yaw = Math.atan2(hd[0], hd[1]), qref = Q.mul(Q.axis([0, 1, 0], yaw), this.stance.pelvisRot); let qe = Q.mul(Q.conj(qref), st[this.pelvis].rot); if (qe[3] < 0) qe = qe.map(x => -x);
      const dev = 2 * Math.asin(Math.min(1, Math.hypot(qe[0], qe[2]))) * 180 / Math.PI; Ldot = V.sc(Ldot, Math.max(0, 1 - dev / o.hipMaxDeg)); }
    // only a LOADED leg can pass the trunk's reaction to the ground: the strategy torque is shared by the legs with load share above HIP_LOAD
    // (measured: 10 % of it on an unloaded hip swept that leg's foot 49 cm, backward-left 25 N·s)
    const hw = share.map(x => Math.max(0, x - HIP_LOAD)), hs = hw[0] + hw[1] || 1, hipShare = hw.map(x => x / hs);
    let armL = null, armF = [0, 0]; if (o.arms && (r[0] || r[1])) { armL = V.sc(V.cross([0, 1, 0], [r[0], 0, r[1]]), this.M * G * o.armUse * 0.5);
      armF = this.shK.map(k => { const q = ev.qs[k], qr = this.qref[k]; let qe = Q.mul(Q.conj(qr), q); if (qe[3] < 0) qe = qe.map(x => -x); const dev = 2 * Math.asin(Math.min(1, Math.hypot(qe[0], qe[1], qe[2]))) * 180 / Math.PI; return Math.max(0, 1 - dev / o.armMaxDeg); }); }
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
        if (isAnkle) { const nz = o.noise && ak && (ak.key === "df" || ak.key === "inv") ? this.ou[(this.spec.joints[k].side === "L" ? 0 : 2) + (ak.key === "df" ? 0 : 1)] : 0; return { K: 0, D: o.ankleD, tau0: tff + nz, ff: tff }; }
        if (legW && this.legSide[k] >= 0 && ak && ak.key !== "rot") return { K: 0, D: o.taskD * g.D, tau0: tff, ff: tff };   // task-space leg rows (flexion / abduction)
        return { K: g.K, D: g.D, tau0: tff + g.K * e[i], ff: tff }; })); }
    this.info = { c, v, h, w0, xi, xiRef, pRaw, p, r, A, share, cop, F, support, polys, mid, heading: hd, ff, t, Ldot }; this.n++;
    return cmd;
  }
}
// seeded PRNG (mulberry32) + Irwin–Hall Gaussian: deterministic across engines (integer ops and + − × ÷ only)
StandController.prototype.gauss = function () { let s2 = 0; for (let i = 0; i < 12; i++) { this.rng = (this.rng + 0x6D2B79F5) >>> 0; let t = this.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); s2 += ((t ^ (t >>> 14)) >>> 0) / 4294967296; } return s2 - 6; };
// ── leg inverse kinematics (posture targets): hip (3) + knee flexion + ankle DF / inversion so that the chain from the pelvis at pose (pP, qP)
//    ends exactly at the foot's CURRENT pose; knee axial rotation, the locked knee axis and the passive foot ab/adduction keep their current
//    values. Newton on the pyramid parameters, finite-difference Jacobian, from the current configuration.
StandController.prototype.legIK = function (st, ev, n, pP, qP) {
  const P = this.P, ks = this.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => this.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  const ft = st[this.feet[n]], fk = (x) => { const qh = pyr(x[0], x[1], x[2]), qk = pyr(cur[1][0], x[3], cur[1][2]), qa = pyr(cur[2][0], x[4], x[5]);
    const Rt = Q.mul(Q.mul(Q.mul(qP, d[0].F1), qh), Q.conj(d[0].F2)), pt = V.add(pP, Q.rot(qP, a[0]));
    const Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), qk), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
    const Rf = Q.mul(Q.mul(Q.mul(Rs, d[2].F1), qa), Q.conj(d[2].F2)), pf = V.add(ps, Q.rot(Rs, a[2]));
    let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v);
    return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  let x = [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]], r = fk(x), err = Math.hypot(...r);
  for (let it = 0; it < 6 && err > 1e-9; it++) { const h = 1e-6, Jm = [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(); xp[c] += h; const rp = fk(xp); return rp.map((v, i) => (v - r[i]) / h); });   // Jm[c][i] = ∂r_i/∂x_c
    const A = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].map(c => Jm[c][i])), dx = solveN(A, r.map(v => -v)); if (!dx) break;
    let step = 1; for (let ls = 0; ls < 6; ls++) { const xn = x.map((v, i) => v + step * dx[i]), rn = fk(xn), en = Math.hypot(...rn); if (en < err) { x = xn; r = rn; err = en; break; } step *= 0.5; } }
  return { targets: [[ks[0], pyr(x[0], x[1], x[2])], [ks[1], pyr(cur[1][0], x[3], cur[1][2])]], err };
};
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
const norm2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
function centroid(poly) { let A = 0, x = 0, z = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1]; A += cr; x += (p[0] + q[0]) * cr; z += (p[1] + q[1]) * cr; } return [x / (3 * A), z / (3 * A)]; }
// nearest point of a convex polygon (CCW or CW) to q (q itself if inside)
export function clampPoly(poly, q) { if (insidePoly(poly, q)) return q.slice(); let best = null, bd = Infinity;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / L)), x = a[0] + t * ex, z = a[1] + t * ez, d = (q[0] - x) ** 2 + (q[1] - z) ** 2;
    if (d < bd) { bd = d; best = [x, z]; } } return best; }
export function insidePoly(poly, q) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], cr = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]); if (cr !== 0) { if (s === 0) s = Math.sign(cr); else if (Math.sign(cr) !== s) return false; } } return true; }
// signed distance of q to a convex polygon (+ inside)
export function polyDist(poly, q) { let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez), t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / (L * L))); d = Math.min(d, Math.hypot(q[0] - a[0] - t * ex, q[1] - a[1] - t * ez)); } return insidePoly(poly, q) ? d : -d; }
export function insetPoly(poly, d) { if (!d) return poly; const c = centroid(poly); return poly.map(([x, z]) => { const dx = x - c[0], dz = z - c[1], L = Math.hypot(dx, dz) || 1; return [x - dx / L * d, z - dz / L * d]; }); }
