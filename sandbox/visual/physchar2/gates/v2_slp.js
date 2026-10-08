// ═══ physchar2/gates/v2_slp.js — SLP-1 SUPPORTED-LOCOMOTION SIMULATOR (DIAGNOSTIC PROTOTYPE; default off; used only by tools/slp1_probe.mjs) ═════════
// Preregistration: review_artifacts/physical_character_v2/slp1/SLP1_PREREGISTRATION.md (frozen 49785b7).
// The accepted G2 plant UNCHANGED (G1 world + passive tissue + contacts + ActuatorLayer; hashing, integrity and energy accounting inherited). Differences, all here:
//   • _ctrl: the SupportedDriver replaces StandController.compute (the StandController instance is used only for geometry, IK and gains);
//   • _disturb (runs immediately before every Jolt step): sets the support constraint's targets / α-scaled limits (ctrl/v2_supported.js SupportLayer) and applies
//     the preregistered disturbance (force pulse at a body-fixed point, or the dynamic impactor's creation / removal);
//   • _measure2 (after every step): reads back the exact support impulse, updates α from the recoverability margin, detects FALLEN, keeps the ledgers and the trace.
// The support never reads contacts / disturbances / foot loads, and nothing here writes a character body's pose or velocity (G2 authorityWrites stays 0).
import { V, Q } from "../core/v2_math.js";
import { G2Sim } from "./v2_g2.js";
import { CFG } from "./v2_e2.js";
import { Trajectory, Schedule, Authority, SupportLayer, SupportedDriver } from "../ctrl/v2_supported.js";
import { decompose } from "../spec/v2_joints.js";
import { kneeEnvelopeV2K } from "../spec/v2_knee.js";

const G = 9.81, D2R = Math.PI / 180, R2D = 180 / Math.PI, IMP_UD = 2050, IMP_IDX = -52, now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
export const SLP_STAND = { ikRefTwist: true, lifecycle: true, ...CFG.PSTAR5CHABV };   // controller construction (geometry / IK / gains only)

export class SLPSim extends G2Sim {
  constructor(J, spec, slp, opts = {}) { super(J, spec, { title: "SLP-1 supported locomotion (DIAGNOSTIC)", seconds: slp.seconds }, { ...opts, slp, stand: SLP_STAND, passiveOpts: { kneeModel: "v2k" } }); }
  _slpInit() {
    const o = this.opts.slp, d = o.der, g = o.gait, B = this.spec.bodies, M = this.M, st = this.st, pel = this.ctrl.pelvis, w = this.w;
    const p0 = st[pel].com.slice(), traj = new Trajectory({ v: g.v, rampS: g.rampS, dh: d.supportDhM, p0 }), sched = new Schedule({ stepHz: g.stepHz, contactS: g.contactS });
    const sp = d.springs[o.f + "Hz"]; if (!sp) throw new Error("spring " + o.f);
    const caps = { h: d.caps.horizontalN, up: d.caps.verticalUpN, down: d.caps.verticalDownN, torque: d.caps.torqueNm };
    const sup = new SupportLayer(w, pel, p0, { lin: sp.Klin, dlin: sp.Dlin, rot: sp.Krot, drot: sp.Drot }, caps);
    const drv = new SupportedDriver(this.ctrl, this.spec, st, { traj, sched, pitchTD: d.touchdownPitchDeg * D2R, pitchLO: d.liftoffPitchDeg * D2R, apex: g.apexM });
    let com0 = [0, 0, 0]; st.forEach((b, i) => { com0 = V.add(com0, V.sc(b.com, B[i].mass)); }); com0 = V.sc(com0, 1 / M);
    // body-fixed disturbance points (§2.4): thorax-left = min-x vertex in the top 25 % of the thorax collider's local y-range; shank-left = min-x vertex within ±10 % of mid-height
    const bi = (nm) => B.findIndex(b => b.name === nm), pts = (i) => { const f = w.bodyTriangles(i), P = []; for (let k = 0; k < f.length; k += 3) P.push([f[k], f[k + 1], f[k + 2]]); return P; };
    // candidates = collider vertices inside the band + triangle-edge crossings of the band's centre plane (prereg amendment 1: the tapered-capsule shank mesh has no vertex within ±10 % of mid-height)
    const pick = (i, band, yc) => { const P = pts(i), ys = P.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), y0 = yc(lo, hi), sel = P.filter(p => band(p[1], lo, hi));
      for (let k = 0; k + 2 < P.length; k += 3) for (const [a, b] of [[P[k], P[k + 1]], [P[k + 1], P[k + 2]], [P[k + 2], P[k]]]) if ((a[1] - y0) * (b[1] - y0) < 0) { const u = (y0 - a[1]) / (b[1] - a[1]); sel.push([a[0] + u * (b[0] - a[0]), y0, a[2] + u * (b[2] - a[2])]); }
      return sel.reduce((a, b) => (b[0] < a[0] ? b : a)); };
    const thorax = bi("thorax"), shankL = bi("shank_L");
    const points = { "thorax-left": { body: thorax, local: pick(thorax, (y, lo, hi) => y >= hi - 0.25 * (hi - lo), (lo, hi) => hi - 0.125 * (hi - lo)) }, "shank-left": { body: shankL, local: pick(shankL, (y, lo, hi) => Math.abs(y - (lo + hi) / 2) <= 0.1 * (hi - lo), (lo, hi) => (lo + hi) / 2) } };
    // the disturbance time (§2.4): first left mid-stance (or mid-swing for D4) at or after t_g + T_ramp + 3 s
    const tMin = sched.tg + g.rampS + 3, ksearch = (off) => { for (let k = 0; ; k++) { const t = sched.tg + k * sched.T + off; if (t >= tMin - 1e-9) return t; } };
    const C = o.case, dist = C === "D0" ? null : { case: C, ...(o.dist || {}) };
    if (dist) { dist.td = C === "D4" ? ksearch(sched.tsw / 2) : ksearch(sched.tsw + sched.tc / 2); dist.point = C === "D4" || C === "D5" ? "shank-left" : "thorax-left";
      dist.J = C === "D1" ? d.impulses.small : C === "D3" ? d.impulses.large : d.impulses.moderate;
      if (C === "D2c") { dist.vi = 1.5 * d.impulses.moderate / 20; dist.ts = dist.td - 0.20 / dist.vi; } }
    this.S = { o, d, g, traj, sched, sup, drv, auth: new Authority(d.omega, d.R), p0, com0, c0p0: V.sub(com0, p0), points, dist, M, pel, caps,
      Wsup: 0, Wpulse: 0, Jpulse: [0, 0, 0], pulseLast: null, imp: null, impLog: [], fallT: null, fallWhy: null, alphaMin: 1, alphaLog: [], supImpulse: [0, 0, 0], supT: [0, 0, 0],
      E0: this.A.E[this.A.E.length - 1], resPrev: 0, sumPos: 0, res: 0, satTicks: 0, ticks: 0, fz20: { on: [true, true], ev: [[], []] }, trace: [], hashes: {}, cpuSupport: 0, maxCapExcess: 0, stPrev: null, last: null, q0: Q.norm(st[pel].rot) };
    this.cpu2.slp = 0;
  }
  _ctrl(init) { if (!this.S) this._slpInit(); let t0 = now(); const cmd = this.S.drv.compute(this.n * this.dt, this.st, this.up.ev, this.dt), t1 = now(); this.cpu2.ctrl += t1 - t0;
    this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); const t2 = now(); this.cpu2.act += t2 - t1; (this.cpuSamples || (this.cpuSamples = [])).push(t2 - t0); }
  _disturb() { const S = this.S, t = this.n * this.dt, dt = this.dt, t0 = now();
    S.sup.setAlpha(S.auth.alpha); const sh = S.drv.shares, ffY = S.auth.alpha * Math.max(0, 1 - sh[0] - sh[1]) * S.M * G;
    S.sup.setTargets(V.sub(S.traj.pos(t + dt), S.p0), S.traj.vel(t + dt), ffY); S.ffY = ffY; S.cpuSupport += now() - t0;
    S.pulseLast = null; const D = S.dist;
    if (D && D.case !== "D2c" && t >= D.td - 1e-9 && t < D.td + 0.03 - 1e-9) { const P = S.points[D.point], b = this.st[P.body], at = V.add(b.pos, Q.rot(Q.norm(b.rot), P.local)), F = [D.J / 0.03, 0, 0];
      this.w.addForceAt(P.body, F, at); S.pulseLast = { body: P.body, F, local: P.local, at }; if (D.applied == null) D.applied = { t, at: at.slice(), body: this.spec.bodies[P.body].name, local: P.local.slice() }; }
    if (D && D.case === "D2c") this._impactor(t);
    return { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 }; }
  _impactor(t) { const S = this.S, D = S.dist, J = this.w.J, bi = this.w.bi;
    if (!S.imp && !D.spawned && t >= D.ts - 1e-9) { const P = S.points["thorax-left"], b = this.st[P.body], tp = V.add(b.pos, Q.rot(Q.norm(b.rot), P.local)), r = 0.12, cen = [tp[0] - (r + 0.20), tp[1], tp[2]], vz = S.traj.vz(t);
      const bcs = new J.BodyCreationSettings(new J.CapsuleShape(0.15, r, null), new J.RVec3(cen[0], cen[1], cen[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, 1);
      bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; bcs.mMassPropertiesOverride.mMass = 20; bcs.mGravityFactor = 0; bcs.mMotionQuality = J.EMotionQuality_LinearCast;
      bcs.mFriction = 0.4; bcs.mRestitution = 0; bcs.mLinearDamping = 0; bcs.mAngularDamping = 0; bcs.mAllowSleeping = false; bcs.mApplyGyroscopicForce = true; bcs.mMaxAngularVelocity = 100; bcs.mUserData = IMP_UD;
      const body = bi.CreateBody(bcs); bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs); const vv = new J.Vec3(D.vi, 0, vz); bi.SetLinearVelocity(body.GetID(), vv); J.destroy(vv);
      const m = 1 / body.GetMotionProperties().GetInverseMass(); S.imp = { body, t0: t, v0: [D.vi, 0, vz], mass: m, spawnCentre: cen, targetPoint: tp, contacts: [], vLast: [D.vi, 0, vz] }; D.spawned = t;
      S.E0 += 0.5 * m * (D.vi * D.vi + vz * vz); }   // the impactor's kinetic energy enters the closed system at its creation (it is not character work)
    if (S.imp && t >= S.imp.t0 + 0.5 - 1e-9) { const id = S.imp.body.GetID(); D.impactor = this._impSummary(); bi.RemoveBody(id); bi.DestroyBody(id); S.imp = null; } }
  _impRead() { const b = this.S.imp.body, v = b.GetLinearVelocity(), p = b.GetCenterOfMassPosition(); return { v: [v.GetX(), v.GetY(), v.GetZ()], p: [p.GetX(), p.GetY(), p.GetZ()] }; }
  _impSummary() { const I = this.S.imp, dv = V.sub(I.vLast, I.v0), m = I.mass; const segs = {}; for (const c of I.contacts) { const s = segs[c.body] || (segs[c.body] = { first: c.t, last: c.t, ticks: 0, maxDepthMm: -1e9, firstPoint: c.pt }); s.last = c.t; s.ticks++; s.maxDepthMm = Math.max(s.maxDepthMm, c.depthMm); }
    return { massKg: m, spawnT: I.t0, v0: I.v0, vEnd: I.vLast, transferredImpulseNs: V.sc(dv, -m), struckSegments: segs, firstContactT: I.contacts.length ? I.contacts[0].t : null, lastContactT: I.contacts.length ? I.contacts[I.contacts.length - 1].t : null }; }
  // per-tick leg hard-limit margin (deg; the harness formula of tools/loco_probe.mjs hardMargin, all leg axes)
  _hardMin() { const P = this.P, sp = this.spec, st = this.st, qs = P.jd.map(d => P.qcs(d, st.map(b => b.rot))); let m = Infinity, who = null;
    for (const nm of ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"]) { const k = sp.joints.findIndex(j => j.name === nm), d = P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz];
      d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(P.anat(d, qs[k], "flex")), r = P.anat(d, qs[k], "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); } else { const h = P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * R2D; } if (x < m) { m = x; who = nm; } }); }
    return { m, who }; }
  _measure2() { super._measure2(); const S = this.S; if (!S) return; const t = this.n * this.dt, dt = this.dt, st = this.st, B = this.spec.bodies, pel = S.pel;
    // support readback (the impulse of the step just taken; zero before the first step)
    const lam = S.sup.lambdas(), F = V.sc(lam.lin, 1 / dt), T = V.sc(lam.rot, 1 / dt), L = S.sup.limitsOf(S.sup.alpha), prev = S.stPrev;
    let sat = false; const tol = 1e-6; for (let i = 0; i < 3; i++) { if (S.sup.alpha > 0.01 && (F[i] >= L.lin[i][1] - tol || F[i] <= L.lin[i][0] + tol || Math.abs(T[i]) >= L.rot[i][1] - tol)) sat = true;   // at a limit (per axis)
      S.maxCapExcess = Math.max(S.maxCapExcess, F[i] - L.lin[i][1], L.lin[i][0] - F[i], Math.abs(T[i]) - L.rot[i][1]); }
    if (prev) { const vm = V.sc(V.add(prev[pel].v, st[pel].v), 0.5), wm = V.sc(V.add(prev[pel].w, st[pel].w), 0.5); S.Wsup += (V.dot(F, vm) + V.dot(T, wm)) * dt; S.supImpulse = V.add(S.supImpulse, lam.lin); }
    if (S.pulseLast && prev) { const P = S.pulseLast, b0 = prev[P.body], b1 = st[P.body], at = P.at, vp = (b) => V.add(b.v, V.cross(b.w, V.sub(at, b.com))), vm = V.sc(V.add(vp(b0), vp(b1)), 0.5); S.Wpulse += V.dot(P.F, vm) * dt; S.Jpulse = V.add(S.Jpulse, V.sc(P.F, dt)); }
    // whole-body COM, DCM error, FALLEN, authority (α for the NEXT step)
    let c = [0, 0, 0], v = [0, 0, 0]; st.forEach((b, i) => { c = V.add(c, V.sc(b.com, B[i].mass)); v = V.add(v, V.sc(b.v, B[i].mass)); }); c = V.sc(c, 1 / S.M); v = V.sc(v, 1 / S.M);
    const w0 = S.d.omega, pr = S.traj.pos(t), vr = S.traj.vel(t), cr = V.add(pr, S.c0p0), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0], xr = [cr[0] + vr[0] / w0, cr[2] + vr[2] / w0], xiErr = Math.hypot(xi[0] - xr[0], xi[1] - xr[1]);
    let other = null; for (const ct of this.lastContacts || []) if ((ct.a === -1 || ct.b === -1) && ct.depth > -0.0005) { const nm = B[ct.a === -1 ? ct.b : ct.a].name; if (!/^foot_/.test(nm)) { other = nm; break; } }
    if (S.fallT == null && (c[1] < 0.7 * S.com0[1] || other)) { S.fallT = t; S.fallWhy = other ? "non-boot turf contact: " + other : "COM below 70 % of its start height"; S.drv.setFallen(t); }
    const aPrev = S.auth.alpha, alpha = S.auth.step(xiErr, S.fallT != null, dt); S.alphaMin = Math.min(S.alphaMin, alpha);
    if (S.lossT == null && alpha < 0.05) { S.lossT = t; } if (alpha < 0.99 && S.disruptT == null) S.disruptT = t;
    // foot loads (ankle-probe ground reaction) + the pack's 20 N contact log; impactor contacts / velocity
    const Fz = this.probeRows ? this.probeRows.map(r => (r ? Math.max(0, r.JyN) : 0)) : [NaN, NaN];
    for (const n of [0, 1]) { const on = Fz[n] >= 20; if (on !== S.fz20.on[n]) { S.fz20.on[n] = on; S.fz20.ev[n].push([+t.toFixed(5), on ? 1 : 0]); } }
    if (S.imp) { const r = this._impRead(); S.imp.vLast = r.v; for (const ct of this.lastContacts || []) if (ct.a === IMP_IDX || ct.b === IMP_IDX) { const bi = ct.a === IMP_IDX ? ct.b : ct.a; if (bi >= 0) S.imp.contacts.push({ t: +t.toFixed(5), body: B[bi].name, depthMm: +(ct.depth * 1000).toFixed(3), pt: (ct.a === IMP_IDX ? ct.pts2 : ct.pts)[0].map(x => +x.toFixed(4)) }); } }
    // energy ledger: E (+ impactor KE) − E0 vs W_act + W_support + W_pulse − passive damping; Σ+ of the residual's positive increments
    let E = this.A.E[this.A.E.length - 1]; if (S.imp) { const r = this._impRead(); E += 0.5 * S.imp.mass * V.dot(r.v, r.v); } else if (S.dist && S.dist.impactor) { const ve = S.dist.impactor.vEnd; E += 0.5 * S.dist.impactor.massKg * V.dot(ve, ve); }
    const res = E - S.E0 - (this.ledger.Wact + S.Wsup + S.Wpulse - this.ledger.damping); if (S.ticks > 0 && res > S.resPrev) S.sumPos += res - S.resPrev; S.resPrev = res; S.res = res;
    const hm = this._hardMin(), satAct = (this.actRes || []).filter(r => r.sat).length;
    S.ticks++; if (sat) S.satTicks++; S.last = { t, alpha, mhat: S.auth.mhat, xiErr, F, T, sat, c, v, Fz, hm, satAct };
    if (this.n % 4 === 0) { const pe = V.sub(st[pel].com, pr), qr = S.q0, qd = Q.mul(Q.conj(qr), Q.norm(st[pel].rot)), angR = 2 * Math.atan2(Math.hypot(qd[0], qd[1], qd[2]), Math.abs(qd[3])) * R2D;
      const r5 = (x) => +x.toFixed(5), ph = S.drv.legs.map(l => (l.phase ? (l.phase.stance ? "S" : "W") : "-"));
      S.trace.push([r5(t), r5(alpha), r5(S.auth.mhat), r5(xiErr), F.map(r5), T.map(r5), sat ? 1 : 0, pe.map(r5), r5(angR), c.map(r5), v.map(r5), Fz.map(x => +x.toFixed(2)), ph.join(""), S.drv.legs.map(l => +l.ikErr.toExponential(2)), satAct, +hm.m.toFixed(3), r5(res), +S.drv.dTau0.toFixed(3), S.drv.shares.map(r5), r5(S.ffY || 0), st[S.points["thorax-left"].body].com.map(r5)]); }
    if (this.n % 240 === 0) S.hashes[String(Math.round(t))] = (this.h >>> 0).toString(16).padStart(8, "0");
    S.stPrev = st.map(b => ({ pos: b.pos.slice(), rot: b.rot.slice(), com: b.com.slice(), v: b.v.slice(), w: b.w.slice() })); }
}
export const SLP_TRACE_COLS = ["t", "alpha", "mhat", "xiErrM", "supF_N[x,y,z]", "supT_Nm[x,y,z]", "supSat", "pelvisPosErrM[x,y,z]", "pelvisRotFromInitialDeg", "com", "comV", "footFzN[L,R]", "phase[LR]", "ikErr[L,R]", "actSatAxes", "legHardMarginMinDeg", "energyResidualJ", "dTau0Nm", "shares[L,R]", "supFFyN", "thoraxCom"];
