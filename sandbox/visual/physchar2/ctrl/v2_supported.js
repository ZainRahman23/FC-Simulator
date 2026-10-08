// ═══ physchar2/ctrl/v2_supported.js — SLP-1 SUPPORTED LOCOMOTION (DIAGNOSTIC PROTOTYPE; default off; used only by gates/v2_slp.js) ══════════════
// Preregistration: review_artifacts/physical_character_v2/slp1/SLP1_PREREGISTRATION.md (frozen 49785b7). Nothing here is used by any existing V2 path.
//   SupportLayer  — §2.1: one Jolt SixDOF constraint turf ↔ pelvis (COM), all axes FREE, PositionAndVelocity motors (implicit spring + damper toward the
//                   prescribed pose AND velocity), per-axis force / torque limits = the frozen caps × α. Solved by Jolt with the contacts. It never reads a
//                   contact / collision / foot load and never writes a body pose or velocity; its exact impulse is read back every step.
//   Authority     — §2.2: α from the recoverability margin m̂ = 1 − ‖ξ − ξ_ref‖ / R; no impulse / contact input; never re-rises after FALLEN.
//   Trajectory    — §2.3.1: settle (support height ramp), then a min-jerk speed ramp to v along +z.
//   Schedule      — §2.3.2: time-based footstep schedule (stride, contact, swing).
//   SupportedDriver — §2.3.3 – 2.3.5: foot poses (touchdown target, heel / flat / toe stance roll, stepSegment swing) → the existing bounded leg IK (hard box,
//                   reference pelvis pose — prereg amendment 2) → per-axis {K, D, τ0} for the unchanged ActuatorLayer, with the controller's own gains, statics and locked-axis feed-forward.
import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
import { stepSegment, stepAt, qlog } from "./v2_swing.js";
import { lockedAxisFF } from "./v2_stand.js";
import { decompose } from "../spec/v2_joints.js";
import { bootSole, hull2 } from "../sim/v2_geom.js";

const G = 9.81, KEYS = ["x", "y", "z"], E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], BLEND = 0.03;
export const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const mjD = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u));
const mjI = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * u * (2.5 - 3 * u + u * u); };   // ∫₀ᵘ mj, ∫₀¹ = 0.5
const heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };

// ── §2.3.1 prescribed trajectory (pelvis COM) ──
export class Trajectory {
  constructor({ v, rampS, dh, p0, tg = 0.5, settleS = 0.5 }) { Object.assign(this, { v, T: rampS, dh, p0: p0.slice(), tg, settleS }); }
  s(t) { if (t <= this.tg) return 0; const u = (t - this.tg) / this.T; return u < 1 ? this.v * this.T * mjI(u) : this.v * this.T * 0.5 + this.v * (t - this.tg - this.T); }
  vz(t) { return t <= this.tg ? 0 : this.v * mj((t - this.tg) / this.T); }
  h(t) { return this.dh * mj(t / this.settleS); }
  vh(t) { return this.dh * mjD(t / this.settleS) / this.settleS; }
  pos(t) { return [this.p0[0], this.p0[1] + this.h(t), this.p0[2] + this.s(t)]; }
  vel(t) { return [0, this.vh(t), this.vz(t)]; }
}
// ── §2.3.2 schedule: foot n's phase at t ──
export class Schedule {
  constructor({ stepHz, contactS, tg = 0.5 }) { this.T = 2 / stepHz; this.tc = contactS; this.tsw = this.T - contactS; this.tg = tg; if (!(this.tsw > 0)) throw new Error("schedule"); }
  phase(n, t) { const t0 = this.tg + (n === 1 ? this.T / 2 : 0);
    if (t < t0) return { stance: true, initial: true, tTD: -Infinity, tLO: t0 };
    const k = Math.floor((t - t0) / this.T + 1e-12), lo = t0 + k * this.T, td = lo + this.tsw;
    return t < td - 1e-12 ? { stance: false, k, tLO: lo, tTD: td } : { stance: true, k, tTD: td, tLO: lo + this.T }; }
}
// ── §2.2 authority ──
export class Authority {
  constructor(omega, R) { this.w = omega; this.R = R; this.alpha = 1; this.mhat = 1; }
  step(xiErr, fallen, dt) { const m = 1 - xiErr / this.R; this.mhat = m;
    const d = -this.alpha * this.w * Math.max(0, -m) + (fallen ? 0 : (1 - this.alpha) * this.w * Math.max(0, m)); this.alpha = Math.min(1, Math.max(0, this.alpha + d * dt)); return this.alpha; }
}
// ── §2.1 support layer ──
export class SupportLayer {
  constructor(w, pelvisIdx, p0, K, caps) {
    const J = w.J; this.w = w; this.J = J; this.K = K; this.caps = caps; this.alpha = null;
    const s = new J.SixDOFConstraintSettings(); s.mSpace = J.EConstraintSpace_WorldSpace; s.mPosition1 = new J.RVec3(p0[0], p0[1], p0[2]); s.mPosition2 = new J.RVec3(p0[0], p0[1], p0[2]);
    s.mAxisX1 = new J.Vec3(1, 0, 0); s.mAxisY1 = new J.Vec3(0, 1, 0); s.mAxisX2 = new J.Vec3(1, 0, 0); s.mAxisY2 = new J.Vec3(0, 1, 0);
    this.ax = { lin: [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ],
      rot: [J.SixDOFConstraintSettings_EAxis_RotationX, J.SixDOFConstraintSettings_EAxis_RotationY, J.SixDOFConstraintSettings_EAxis_RotationZ] };
    for (const a of [...this.ax.lin, ...this.ax.rot]) s.MakeFreeAxis(a);
    this.c = J.castObject(s.Create(w.ground, w.bodies[pelvisIdx]), J.SixDOFConstraint); w.ps.AddConstraint(this.c); J.destroy(s);
    [0, 1, 2].forEach(i => { const ml = this.c.GetMotorSettings(this.ax.lin[i]), sl = ml.mSpringSettings; sl.mMode = J.ESpringMode_StiffnessAndDamping; sl.mStiffness = K.lin; sl.mDamping = K.dlin;
      const mr = this.c.GetMotorSettings(this.ax.rot[i]), sr = mr.mSpringSettings; sr.mMode = J.ESpringMode_StiffnessAndDamping; sr.mStiffness = K.rot[i]; sr.mDamping = K.drot[i];
      this.c.SetMotorState(this.ax.lin[i], J.EMotorState_PositionAndVelocity); this.c.SetMotorState(this.ax.rot[i], J.EMotorState_PositionAndVelocity); });
    this.v = new J.Vec3(0, 0, 0); this.q = new J.Quat(0, 0, 0, 1); this.setAlpha(1); this.c.SetTargetOrientationCS(this.q); this.c.SetTargetAngularVelocityCS(this.v);
  }
  limitsOf(alpha) { const C = this.caps; return { lin: [[-alpha * C.h, alpha * C.h], [-alpha * C.down, alpha * C.up], [-alpha * C.h, alpha * C.h]], rot: [0, 1, 2].map(() => [-alpha * C.torque, alpha * C.torque]) }; }
  setAlpha(alpha) { if (alpha === this.alpha) return; this.alpha = alpha; const L = this.limitsOf(alpha);
    [0, 1, 2].forEach(i => { const ml = this.c.GetMotorSettings(this.ax.lin[i]); ml.mMinForceLimit = L.lin[i][0]; ml.mMaxForceLimit = L.lin[i][1];
      const mr = this.c.GetMotorSettings(this.ax.rot[i]); mr.mMinTorqueLimit = L.rot[i][0]; mr.mMaxTorqueLimit = L.rot[i][1]; }); }
  // targets in constraint space (= displacement from the initial pelvis COM, world axes); ffY: vertical feed-forward force (N) realised by the target offset ffY / K
  setTargets(dp, vel, ffY) { this.v.Set(dp[0], dp[1] + ffY / this.K.lin, dp[2]); this.c.SetTargetPositionCS(this.v); this.v.Set(vel[0], vel[1], vel[2]); this.c.SetTargetVelocityCS(this.v); this.v.Set(0, 0, 0); this.c.SetTargetAngularVelocityCS(this.v); }
  lambdas() { const l = this.c.GetTotalLambdaMotorTranslation(), r = this.c.GetTotalLambdaMotorRotation(); return { lin: [l.GetX(), l.GetY(), l.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ()] }; }
}
// ── §2.3.3 – 2.3.5 locomotion driver ──
export class SupportedDriver {
  constructor(C, spec, st0, cfg) {   // C: a StandController used for geometry / IK / gains only; cfg: { traj, sched, pitchTD, pitchLO (rad), apex, M }
    this.C = C; this.spec = spec; this.cfg = cfg; const B = spec.bodies; this.M = C.M;
    this.sole = C.feet.map(f => { const sb = bootSole(B[f]), h = hull2(sb.pts), zs = h.map(p => p[1]), xs = h.map(p => p[0]), cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      return { c: [cx, sb.y0, zs.reduce((a, b) => a + b, 0) / zs.length], heel: [cx, sb.y0, Math.min(...zs)], toe: [cx, sb.y0, Math.max(...zs)] }; });
    this.foot0 = C.feet.map(f => ({ pos: st0[f].pos.slice(), rot: Q.norm(st0[f].rot) })); this.yaw0 = this.foot0.map(p => heading(p.rot));
    this.hip0z = (C.jointAt(st0, C.hipK[0])[2] + C.jointAt(st0, C.hipK[1])[2]) / 2;
    // leg IK frame = the REFERENCE pelvis pose (prereg amendment 2): origin = p_ref(t) − (initial COM − origin offset), orientation q0 (constant)
    this.pelOff = V.sub(st0[C.pelvis].com, st0[C.pelvis].pos); this.pelQ0 = Q.norm(st0[C.pelvis].rot);
    this.legs = [0, 1].map(n => ({ prevStance: true, planted: { ...this.foot0[n] }, seg: null, segT0: 0, tTD: -Infinity, tLO: null, prevT: null, prevOK: false, ikErr: 0, phaseKey: null }));
    this.tauPrev = null; this.dTau0 = 0; this.fallen = false; this.events = []; this.shares = [0.5, 0.5]; this.wSt = [1, 1]; this.target = [null, null];
  }
  // flat pose of foot n: sole centroid at world forward position zc (initial lateral position, height, yaw); pitched about a sole edge keeping it on the turf
  flatAt(n, zc) { const f = this.foot0[n], cW = V.add(f.pos, Q.rot(f.rot, this.sole[n].c)); return { pos: [f.pos[0], f.pos[1], f.pos[2] + zc - cW[2]], rot: f.rot.slice() }; }
  pitched(n, pose, th, pivot) { if (!(th > 1e-9)) return { pos: pose.pos.slice(), rot: pose.rot.slice() }; const pw = V.add(pose.pos, Q.rot(pose.rot, this.sole[n][pivot])), a = Q.rot(pose.rot, [1, 0, 0]), other = pivot === "heel" ? "toe" : "heel";
    const cand = [1, -1].map(sg => { const q = Q.axis(a, sg * th), p2 = V.add(pw, Q.rot(q, V.sub(pose.pos, pw))), r2 = Q.norm(Q.mul(q, pose.rot)); return { pos: p2, rot: r2, oy: V.add(p2, Q.rot(r2, this.sole[n][other]))[1] }; });
    const b = cand[0].oy >= cand[1].oy ? cand[0] : cand[1]; return { pos: b.pos, rot: b.rot }; }   // the sign that raises the other sole edge (the pivot stays on the turf)
  tdTarget(n, tTD) { const { traj, sched } = this.cfg, zc = this.hip0z + traj.s(tTD + sched.tc / 2); const flat = this.flatAt(n, zc); return { flat, pose: this.pitched(n, flat, this.cfg.pitchTD, "heel") }; }
  stancePose(n, t) { const L = this.legs[n]; if (!isFinite(L.tTD)) return { pose: { pos: L.planted.pos.slice(), rot: L.planted.rot.slice() }, cp: V.add(L.planted.pos, Q.rot(L.planted.rot, this.sole[n].c)) };
    const u = (t - L.tTD) / this.cfg.sched.tc, P = L.planted; let pose, cp;
    if (u < 0.2) { pose = this.pitched(n, P, this.cfg.pitchTD * (1 - mj(u / 0.2)), "heel"); cp = V.add(P.pos, Q.rot(P.rot, this.sole[n].heel)); }
    else if (u <= 0.6) { pose = { pos: P.pos.slice(), rot: P.rot.slice() }; cp = V.add(P.pos, Q.rot(P.rot, this.sole[n].c)); }
    else { pose = this.pitched(n, P, this.cfg.pitchLO * mj((u - 0.6) / 0.4), "toe"); cp = V.add(P.pos, Q.rot(P.rot, this.sole[n].toe)); }
    return { pose, cp }; }
  // schedule events (TD: capture the planted flat pose from the measured heel point / yaw; LO: build the swing segment) + shares and stance gain weights
  _events(t, st) { const S = this.cfg.sched, ph = [0, 1].map(n => S.phase(n, t));
    for (const n of [0, 1]) { const L = this.legs[n], p = ph[n];
      if (p.stance && !L.prevStance) {   // touchdown (scheduled)
        const tg = this.tdTarget(n, p.tTD), fm = st[this.C.feet[n]], hM = V.add(fm.pos, Q.rot(Q.norm(fm.rot), this.sole[n].heel)), hS = V.add(tg.pose.pos, Q.rot(tg.pose.rot, this.sole[n].heel));
        const rot = Q.norm(Q.mul(Q.axis([0, 1, 0], heading(Q.norm(fm.rot)) - this.yaw0[n]), this.foot0[n].rot)), heelW = [hS[0] + hM[0] - hS[0], hS[1], hS[2] + hM[2] - hS[2]];
        L.planted = { pos: V.sub(heelW, Q.rot(rot, this.sole[n].heel)), rot }; L.tTD = p.tTD; L.seg = null;
        this.events.push({ t: +t.toFixed(5), foot: "LR"[n], ev: "TD", tdErrMm: +(1000 * Math.hypot(hM[0] - hS[0], hM[2] - hS[2])).toFixed(2), footContactMeasured: null }); }
      if (!p.stance && L.prevStance) {   // liftoff (scheduled): swing from the stance pose at liftoff (rest) to the next touchdown target
        const start = isFinite(L.tTD) ? this.stancePose(n, p.tLO - 1e-9).pose : { pos: L.planted.pos.slice(), rot: L.planted.rot.slice() }, goal = this.tdTarget(n, p.tTD).pose;
        const ref = { p: start.pos, v: [0, 0, 0], a: [0, 0, 0], th: qlog(Q.mul(Q.conj(goal.rot), start.rot)), w: [0, 0, 0], al: [0, 0, 0] };
        L.seg = stepSegment(ref, goal, S.tsw, { z: Math.max(start.pos[1], goal.pos[1]) + this.cfg.apex, tk: S.tsw / 2 }); L.segT0 = p.tLO; L.tLO = p.tLO;
        this.events.push({ t: +t.toFixed(5), foot: "LR"[n], ev: "LO" }); }
      L.prevStance = p.stance; L.phase = p; }
    // shares (§2.3.5): settle 0.5 / 0.5 → right 1 by t_g; single stance 1 (0.03 s ramps after TD / before LO when the other foot is in flight); DS min-jerk lead / trail; flight 0
    const sh = [0, 0]; if (ph[0].initial && ph[1].initial) { const sL = 0.5 * (1 - mj(t / S.tg)); sh[0] = sL; sh[1] = 1 - sL; }
    else if (ph[0].stance && ph[1].stance) { const lead = ph[0].tTD > ph[1].tTD ? 0 : 1, tr = 1 - lead, a = ph[lead].tTD, b = ph[tr].tLO, x = b > a ? mj((t - a) / (b - a)) : 1; sh[lead] = x; sh[tr] = 1 - x; }
    else for (const n of [0, 1]) if (ph[n].stance) sh[n] = Math.max(0, Math.min(1, ph[n].initial ? 1 : (t - ph[n].tTD) / BLEND, (ph[n].tLO - t) / BLEND));
    this.shares = sh;
    this.wSt = [0, 1].map(n => { const p = ph[n]; return p.stance ? (p.initial ? 1 : Math.min(1, (t - p.tTD) / BLEND)) : 1 - Math.min(1, (t - p.tLO) / BLEND); });
    return ph; }
  compute(t, st, ev, dt) {
    st = unitStates(st); ev = unitEv(ev); const C = this.C, P = C.P, B = this.spec.bodies, cmd = [];
    let c = [0, 0, 0]; st.forEach((b, i) => { c = V.add(c, V.sc(b.com, B[i].mass)); }); c = V.sc(c, 1 / this.M);
    const ph = this.fallen ? null : this._events(t, st), pel = { pos: V.sub(this.cfg.traj.pos(t), this.pelOff), rot: this.pelQ0 }, F = [null, null], cps = [null, null], ikT = {};
    if (!this.fallen) for (const n of [0, 1]) { const L = this.legs[n]; let pose, cp = null;
      if (ph[n].stance) { const sp = this.stancePose(n, t); pose = sp.pose; cp = sp.cp; } else pose = stepAt(L.seg, t - L.segT0);
      this.target[n] = pose; const r = C.legIKBounded(st, ev, n, pel.pos, pel.rot, { pos: pose.pos, rot: pose.rot }, { limits: "hard", fallback: "none" }); L.ikErr = r.err;
      const key = ph[n].stance ? "S" + ph[n].tTD : "W" + ph[n].tLO, sameKey = L.phaseKey === key; L.phaseKey = key; L.wRef = {};
      for (const [k, q] of r.targets) { ikT[k] = q; const qp = L.prevT && L.prevT[k]; if (sameKey && qp) { const s = qp[0] * q[0] + qp[1] * q[1] + qp[2] * q[2] + qp[3] * q[3] < 0 ? -1 : 1, d = Q.mul(Q.conj(qp), q.map(x => x * s)); L.wRef[k] = [2 * d[0] / dt, 2 * d[1] / dt, 2 * d[2] / dt]; } }
      L.prevT = Object.fromEntries(r.targets.map(([k, q]) => [k, q.slice()]));
      if (this.shares[n] > 0 && cp) { const hz = c[1] - cp[1], u = [(c[0] - cp[0]) / hz, 1, (c[2] - cp[2]) / hz]; F[n] = V.sc(u, this.shares[n] * this.M * G); cps[n] = cp; } }
    const geff = [0, -G, 0]; let dMax = 0; const tauNow = {};
    for (const d of P.jd) { const k = d.k, pj = C.jointAt(st, k); let T = [0, 0, 0];
      for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f); if (F[n]) T = V.sub(T, V.cross(V.sub(cps[n], pj), F[n])); }
      const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), side = C.legSide[k], leg = side >= 0 && !this.fallen;
      const q = ev.qs[k], qr = leg && ikT[k] ? ikT[k] : C.qref[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const Lk = C.o.ffLockedAxis ? C.lockedFix[k] : null, tB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;
      const g = C.gain[k], gs = side >= 0 ? C.gainSwing[k] : null, w = leg ? this.wSt[side] : 1, K = leg ? w * g.K + (1 - w) * gs.K : g.K, Dg = leg ? w * g.D + (1 - w) * gs.D : g.D;
      const wR = leg && ikT[k] ? this.legs[side].wRef[k] : null;
      cmd[k] = KEYS.map((key, i) => { const tff = Lk != null && i === 3 - Lk ? tB1 : V.dot(T, axW[i]), wv = wR ? (1 - w) * (Dg + dt * K) * wR[i] : 0, tau0 = tff + K * e[i] + wv;
        const pv = this.tauPrev ? this.tauPrev[k * 3 + i] : undefined; if (pv != null) dMax = Math.max(dMax, Math.abs(tau0 - pv)); tauNow[k * 3 + i] = tau0; return { K, D: Dg, tau0, ff: tff }; }); }
    this.tauPrev = tauNow; this.dTau0 = dMax; this.comNow = c; return cmd; }
  setFallen(t) { if (!this.fallen) { this.fallen = true; this.events.push({ t: +t.toFixed(5), ev: "FALLEN: gait stopped, posture hold (velocities untouched)" }); } }
}
