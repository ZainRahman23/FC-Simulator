// PI-1 REV2 physics (PI1_REV2_PREREG.md §5 / §6): the accepted G2 plant (G1 world + passive tissue + contacts + ActuatorLayer; 240 Hz, 150 / 2, plane
// turf, v2k knee, ankle K 0.13) promoted ONCE from a handoff state (the 28 counted authority writes), then evolving causally:
//   • PostureDriver — the SLP driver's per-axis {K, D, τ0} law with targets held at the promoted pose (frozen at the fall transition in FALL),
//     stance / swing gains and gravity statics from the PHYSICAL foot contacts; no presentation input;
//   • B (SupportLayer, unchanged class) — toward the AUTHORITATIVE root trajectory, released completely at the authoritative FALL transition;
//   • StandIn — two dynamic segments (torso, slide leg) of the simulation's own primitives, driven per PI-1 §7 (state-independent feed-forward +
//     capped 2 Hz tether) to the authoritative slide pose fitted to the recorded primitives at each sub-step.
import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const { G2Sim, G2_SCENARIOS } = await import(P2 + "gates/v2_g2.js"), { SupportLayer } = await import(P2 + "ctrl/v2_supported.js"), { SLP_STAND } = await import(P2 + "gates/v2_slp.js");   // PI-1 §8: the SLP driver form → the SLP controller construction (geometry / gains only)
const { V, Q, unitStates, unitEv } = await import(P2 + "core/v2_math.js"), { lockedAxisFF } = await import(P2 + "ctrl/v2_stand.js");
const { decompose } = await import(P2 + "spec/v2_joints.js"), { bootSole, hull2 } = await import(P2 + "sim/v2_geom.js");
const G = 9.81, KEYS = ["x", "y", "z"], E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], BLEND = 0.03, L_NOGROUND = 2, OBST_UD = 2000;   // core/v2_jolt.js internal constants (unchanged)
export const sim2r = (p) => [p[0], p[2], -p[1]];
// ── posture tone (§6.1) ──
export class PostureDriver {
  constructor(C, spec) { this.C = C; this.spec = spec; this.M = C.M; const B = spec.bodies;
    this.sole = C.feet.map(f => { const sb = bootSole(B[f]), h = hull2(sb.pts), zs = h.map(p => p[1]), xs = h.map(p => p[0]); return [xs.reduce((a, b) => a + b, 0) / xs.length, sb.y0, zs.reduce((a, b) => a + b, 0) / zs.length]; });
    this.wSt = [1, 1]; this.qT = null; }
  setTargets(qs) { this.qT = qs.map(q => q.slice()); }
  compute(st, ev, dt, contact) { st = unitStates(st); ev = unitEv(ev); const C = this.C, Pp = C.P, B = this.spec.bodies, cmd = [];
    for (const n of [0, 1]) { const tgt = contact[n] ? 1 : 0, d = dt / BLEND; this.wSt[n] = this.wSt[n] < tgt ? Math.min(tgt, this.wSt[n] + d) : Math.max(tgt, this.wSt[n] - d); }
    let c = [0, 0, 0]; st.forEach((b, i) => { c = V.add(c, V.sc(b.com, B[i].mass)); }); c = V.sc(c, 1 / this.M);
    const nC = (contact[0] ? 1 : 0) + (contact[1] ? 1 : 0), F = [null, null], cps = [null, null];
    for (const n of [0, 1]) if (contact[n]) { const f = st[C.feet[n]], cp = V.add(f.pos, Q.rot(f.rot, this.sole[n])), hz = Math.max(0.05, c[1] - cp[1]), u = [(c[0] - cp[0]) / hz, 1, (c[2] - cp[2]) / hz]; F[n] = V.sc(u, this.M * G / nC); cps[n] = cp; }
    const geff = [0, -G, 0];
    for (const d of Pp.jd) { const k = d.k, pj = C.jointAt(st, k); let T = [0, 0, 0];
      for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f); if (F[n]) T = V.sub(T, V.cross(V.sub(cps[n], pj), F[n])); }
      const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), side = C.legSide[k], leg = side >= 0;
      const q = ev.qs[k], qr = this.qT[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const Lk = C.o.ffLockedAxis ? C.lockedFix[k] : null, tB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;
      const g = C.gain[k], gs = leg ? C.gainSwing[k] : null, w = leg ? this.wSt[side] : 1, K = leg ? w * g.K + (1 - w) * gs.K : g.K, Dg = leg ? w * g.D + (1 - w) * gs.D : g.D;
      cmd[k] = KEYS.map((key, i) => { const tff = Lk != null && i === 3 - Lk ? tB1 : V.dot(T, axW[i]); return { K, D: Dg, tau0: tff + K * e[i], ff: tff }; }); }
    return cmd; }
}
// ── stand-in tackler (§5) ──
const yawQ = (th) => [0, Math.sin(th / 2), 0, Math.cos(th / 2)];
// planar rigid fit (yaw + translation; the slide moves in the horizontal plane): local endpoints (centred) → current endpoints
function fitYaw(loc, cur) { const cx = cur.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / cur.length); let sn = 0, cs = 0;
  for (let i = 0; i < loc.length; i++) { const l = loc[i], r = V.sub(cur[i], cx); sn += l[2] * r[0] - l[0] * r[2]; cs += l[0] * r[0] + l[2] * r[2]; }
  const th = Math.atan2(sn, cs), q = yawQ(th); let res = 0; for (let i = 0; i < loc.length; i++) res = Math.max(res, V.dist(V.add(cx, Q.rot(q, loc[i])), cur[i])); return { th, t: cx, q, res }; }
export class StandIn {
  // segs: [{ name, prims: [names] }]; samples(τ) → { prim: { a, b, r } } in the PHYSICS frame; mT: tackler mass; mFrac: leg mass fraction
  constructor(J, w, samples, tau0, mT, legFrac, isLeg) {
    this.J = J; this.w = w; this.samples = samples; const s0 = samples(tau0), names = Object.keys(s0);
    const legN = names.filter(isLeg), torN = names.filter(n => !isLeg(n)); this.segs = [];
    for (const [name, prims, m] of [["TORSO", torN, mT * (1 - legFrac)], ["LEG", legN, mT * legFrac]]) { if (!prims.length) continue;
      const pts = prims.flatMap(p => [s0[p].a, s0[p].b]), o = pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / pts.length), loc = pts.map(p => V.sub(p, o));
      const cs = new J.StaticCompoundShapeSettings();
      for (const p of prims) { const a = V.sub(s0[p].a, o), b = V.sub(s0[p].b, o), ax = V.sub(b, a), L = V.len(ax), mid = V.sc(V.add(a, b), 0.5), u = V.sc(ax, 1 / L);
        const y = [0, 1, 0], c = V.cross(y, u), cl = V.len(c), dd = V.dot(y, u), q = cl < 1e-9 ? (dd > 0 ? [0, 0, 0, 1] : [1, 0, 0, 0]) : (() => { const ang = Math.atan2(cl, dd), k = V.sc(c, 1 / cl), s = Math.sin(ang / 2); return [k[0] * s, k[1] * s, k[2] * s, Math.cos(ang / 2)]; })();
        cs.AddShape(new J.Vec3(mid[0], mid[1], mid[2]), new J.Quat(q[0], q[1], q[2], q[3]), new J.CapsuleShapeSettings(Math.max(1e-4, L / 2), s0[p].r), 0); }
      const shape = cs.Create().Get(), k = this.segs.length, bcs = new J.BodyCreationSettings(shape, new J.RVec3(o[0], o[1], o[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_NOGROUND);
      bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; bcs.mMassPropertiesOverride.mMass = m; bcs.mGravityFactor = 0; bcs.mUserData = OBST_UD + k; bcs.mFriction = 0.4; bcs.mRestitution = 0;
      bcs.mAllowedDOFs = J.EAllowedDOFs_TranslationX | J.EAllowedDOFs_TranslationY | J.EAllowedDOFs_TranslationZ | J.EAllowedDOFs_RotationY; bcs.mLinearDamping = 0; bcs.mAngularDamping = 0;
      const body = w.bi.CreateBody(bcs); w.bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
      const com = body.GetCenterOfMassPosition(), cW = [com.GetX(), com.GetY(), com.GetZ()], cLoc = V.sub(cW, o), ey = new J.Vec3(0, 1, 0), iw = body.GetMotionProperties().MultiplyWorldSpaceInverseInertiaByVector(body.GetRotation(), ey), Iyy = 1 / Math.max(1e-12, iw.GetY());   // the integrator's effective yaw inertia (world, DOF mask applied)
      // capped tether (PI-1 §7 law at this segment's mass): 2 Hz, ζ = 1; caps 334 N / 82 N·m × mass fraction
      const om = 2 * Math.PI * 2, frac = m / mT, st = new J.SixDOFConstraintSettings(); st.mSpace = J.EConstraintSpace_WorldSpace; st.mPosition1 = new J.RVec3(cW[0], cW[1], cW[2]); st.mPosition2 = new J.RVec3(cW[0], cW[1], cW[2]);
      st.mAxisX1 = new J.Vec3(1, 0, 0); st.mAxisY1 = new J.Vec3(0, 1, 0); st.mAxisX2 = new J.Vec3(1, 0, 0); st.mAxisY2 = new J.Vec3(0, 1, 0);
      const AX = { lin: [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ], rot: [J.SixDOFConstraintSettings_EAxis_RotationX, J.SixDOFConstraintSettings_EAxis_RotationY, J.SixDOFConstraintSettings_EAxis_RotationZ] };
      for (const a of [...AX.lin, AX.rot[1]]) st.MakeFreeAxis(a); st.MakeFixedAxis(AX.rot[0]); st.MakeFixedAxis(AX.rot[2]);
      const con = J.castObject(st.Create(w.ground, body), J.SixDOFConstraint); w.ps.AddConstraint(con); J.destroy(st);
      for (const a of AX.lin) { const ms = con.GetMotorSettings(a), sp = ms.mSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = m * om * om; sp.mDamping = 2 * m * om; ms.mMinForceLimit = -334 * frac; ms.mMaxForceLimit = 334 * frac; con.SetMotorState(a, J.EMotorState_PositionAndVelocity); }
      { const ms = con.GetMotorSettings(AX.rot[1]), sp = ms.mSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = Iyy * om * om; sp.mDamping = 2 * Iyy * om; ms.mMinTorqueLimit = -82 * frac; ms.mMaxTorqueLimit = 82 * frac; con.SetMotorState(AX.rot[1], J.EMotorState_PositionAndVelocity); }
      this.segs.push({ name, prims, m, Iyy, body, con, loc, o0: o, cLoc, cW0: cW, k }); }
    this.v = new J.Vec3(0, 0, 0); this.qq = new J.Quat(0, 0, 0, 1); this.rv = new J.RVec3(0, 0, 0);
  }
  // the authoritative pose of a segment at τ (fit of its k_p endpoints to the recorded primitives)
  poseAt(seg, tau) { const s = this.samples(tau), cur = seg.prims.flatMap(p => [s[p].a, s[p].b]), f = fitYaw(seg.loc, cur); return { ...f, com: V.add(f.t, Q.rot(f.q, seg.cLoc)), cur }; }
  // initial velocity = the authoritative BACKWARD difference over the last step (τ in squad ticks; one 240 Hz step = Δτ 0.25): with the feed-forward
  // m·(p1 − 2p0 + pm)/dt² the semi-implicit integrator then reproduces the authoritative path exactly in the absence of contact
  init(tau0, dtStep) { for (const g of this.segs) { const pm = this.poseAt(g, tau0 - 0.25), p0 = this.poseAt(g, tau0);
      const vel = V.sc(V.sub(p0.com, pm.com), 1 / (dtStep)), om = (p0.th - pm.th) / dtStep; this.v.Set(vel[0], vel[1], vel[2]); this.w.bi.SetLinearVelocity(g.body.GetID(), this.v); this.v.Set(0, om, 0); this.w.bi.SetAngularVelocity(g.body.GetID(), this.v); g.th0 = p0.th; } }
  // drive for the step τ → τ + Δτ (Δτ = 0.25 squad ticks = dt): feed-forward m·a, I·α (state-independent) + tether targets (pose, velocity) at τ + Δτ
  drive(tau, dt) { const out = []; for (const g of this.segs) { const pm = this.poseAt(g, tau - 0.25), p0 = this.poseAt(g, tau), p1 = this.poseAt(g, tau + 0.25);
      const a = V.sc(V.add(V.sub(p1.com, V.sc(p0.com, 2)), pm.com), 1 / (dt * dt)), alpha = (p1.th - 2 * p0.th + pm.th) / (dt * dt), vel = V.sc(V.sub(p1.com, p0.com), 1 / dt), om = (p1.th - p0.th) / dt;
      const F = V.sc(a, g.m), T = g.Iyy * alpha, id = g.body.GetID(), vb = g.body.GetLinearVelocity(), wb = g.body.GetAngularVelocity(); g.pre = { v: [vb.GetX(), vb.GetY(), vb.GetZ()], wy: wb.GetY(), F, T }; this.v.Set(F[0], F[1], F[2]); this.w.bi.AddForce(id, this.v, this.J.EActivation_Activate); this.v.Set(0, T, 0); this.w.bi.AddTorque(id, this.v, this.J.EActivation_Activate);
      const dp = V.sub(p1.com, g.cW0); this.v.Set(dp[0], dp[1], dp[2]); g.con.SetTargetPositionCS(this.v); this.v.Set(vel[0], vel[1], vel[2]); g.con.SetTargetVelocityCS(this.v);
      const q = yawQ(p1.th - g.th0); this.qq.Set(q[0], q[1], q[2], q[3]); g.con.SetTargetOrientationCS(this.qq); this.v.Set(0, om, 0); g.con.SetTargetAngularVelocityCS(this.v); out.push({ name: g.name, F, T, fitRes: p1.res }); } return out; }
  // contact impulse received by each segment over the last step (momentum balance: m·Δv − F_ff·dt − tether motor impulse; yaw likewise)
  contactImpulses(dt) { return this.segs.map(g => { if (!g.pre) return { name: g.name, J: [0, 0, 0], Jy: 0 }; const v = g.body.GetLinearVelocity(), w = g.body.GetAngularVelocity(), lt = g.con.GetTotalLambdaMotorTranslation(), lr = g.con.GetTotalLambdaMotorRotation();
      const J = [0, 1, 2].map(i => g.m * ([v.GetX(), v.GetY(), v.GetZ()][i] - g.pre.v[i]) - g.pre.F[i] * dt - [lt.GetX(), lt.GetY(), lt.GetZ()][i]), Jy = g.Iyy * (w.GetY() - g.pre.wy) - g.pre.T * dt - lr.GetY(); return { name: g.name, J, Jy }; }); }
  // current physical endpoints of every primitive (from the body pose) vs the authoritative ones at τ → tracking error (AST-C1)
  state(tau) { const out = { segs: [] }; let err = 0; for (const g of this.segs) { const b = g.body, P = b.GetPosition(), R = b.GetRotation(), pos = [P.GetX(), P.GetY(), P.GetZ()], rot = [R.GetX(), R.GetY(), R.GetZ(), R.GetW()];
      const pts = g.loc.map(l => V.add(pos, Q.rot(rot, l))), au = this.poseAt(g, tau).cur; for (let i = 0; i < pts.length; i++) err = Math.max(err, V.dist(pts[i], au[i]));
      const v = b.GetLinearVelocity(), wv = b.GetAngularVelocity(), cm = b.GetCenterOfMassPosition(), yaw = 2 * Math.atan2(rot[1], rot[3]), au2 = this.poseAt(g, tau);
      out.segs.push({ name: g.name, pos, rot, pts, prims: g.prims, v: [v.GetX(), v.GetY(), v.GetZ()], w: [wv.GetX(), wv.GetY(), wv.GetZ()], com: [cm.GetX(), cm.GetY(), cm.GetZ()], m: g.m, yaw, yawAuth: au2.th, comAuth: au2.com }); } out.trackErr = err; return out; }
}
// ── the promoted plant ──
export class PI1Sim extends G2Sim {
  // h: { S, vel } handoff state (physics frame), auth: { tauP, rootAt(τ) → { pos, vel, facing }, fallTau (τ of the authoritative FALL transition or null), samples(τ), mT }
  constructor(J, spec, h, auth, opts = {}) {
    super(J, spec, { ...G2_SCENARIOS.S0short, seconds: opts.seconds || 3 }, { cfg: { diagNoGround: true }, probes: false, passiveOpts: { kneeModel: "v2k" }, stand: SLP_STAND });
    this.auth = auth; this.tauP = auth.tauP; this.pel = spec.bodies.findIndex(b => b.name === "pelvis"); this.footI = [spec.bodies.findIndex(b => b.name === "foot_L"), spec.bodies.findIndex(b => b.name === "foot_R")];
    const w0 = this.ledger.authorityWrites; h.S.forEach((s, i) => { this.w.setPose(i, s.pos, s.rot); this.w.setVel(i, h.vel[i].v, h.vel[i].w); }); this.promotionWrites = this.ledger.authorityWrites - w0;
    this.st = this.read();
    this.standIn = new StandIn(J, this.w, auth.samples, this.tauP, auth.mT, auth.legFrac, auth.isLeg); this.standIn.init(this.tauP, this.dt);
    // B: PI-1 §8 (2 Hz, ζ = 1, whole-body mass / standing-pose inertia about the pelvis COM; SLP 3 m/s caps)
    const M = spec.bodies.reduce((s, b) => s + b.mass, 0), om = 2 * Math.PI * 2, I = opts.Ipel || [8, 2, 8];
    this.sup = new SupportLayer(this.w, this.pel, this.st[this.pel].com.slice(), { lin: M * om * om, dlin: 2 * M * om, rot: I.map(x => x * om * om), drot: I.map(x => 2 * x * om) }, { h: 274.95, up: 1161.2, down: 193.5, torque: 81.80 });
    this.root0 = auth.rootAt(this.tauP); this.facing0 = this.root0.facing; this.Bon = true;
    this.pd = new PostureDriver(this.ctrl, spec); this.up = this.P.compute(this.st, this.dt); this.pd.setTargets(this.up.ev.qs); this.contactFlags = [false, false]; this._ctrl(true); this._measure();
    this.log = []; this.phys = []; this.tau = () => this.tauP + this.n / 4;
  }
  _sense() { return this.probeRows ? super._sense() : { Fz: [0, 0], touch: [0, 0] }; }   // as SLPSim: probes off; the PostureDriver never reads the controller sensing hook
  _ctrl(init) { if (!this.pd) return super._ctrl(init); const cmd = this.pd.compute(this.st, this.up.ev, this.dt, this.contactFlags || [false, false]); this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); }
  _disturb() { const out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 }; if (!this.standIn) return out; const tau = this.tauP + this.n / 4, tn = tau + 0.25;
    if (this.Bon && this.auth.fallTau != null && tn > this.auth.fallTau - 1 + 1e-9) { this.Bon = false; this.sup.setAlpha(0); this.pd.setTargets(this.up.ev.qs); this.fallAt = tau; }   // authoritative FALL: the interval ending at that tick
    if (this.Bon) { const r = this.auth.rootAt(tn), dp = V.sub(r.pos, this.root0.pos); dp[1] = 0; this.sup.setTargets(dp, [r.vel[0], 0, r.vel[2]], 0); const dy = r.facing - this.facing0, q = [0, Math.sin(dy / 2), 0, Math.cos(dy / 2)]; this.sup.q.Set(q[0], q[1], q[2], q[3]); this.sup.c.SetTargetOrientationCS(this.sup.q); }
    this.lastDrive = this.standIn.drive(tau, this.dt); return out; }
  tick() { const ok = super.tick(); if (!ok) return false; const tau = this.tauP + this.n / 4, C = this.lastContacts || [];
    this.contactFlags = this.footI.map(fi => C.some(c => ((c.a === -1 && c.b === fi) || (c.b === -1 && c.a === fi)) && c.depth > -0.0005));
    const imp = this.standIn.contactImpulses(this.dt);
    const sc = []; for (const c of C) { const ob = c.a <= -2 ? c.a : c.b <= -2 ? c.b : null, rb = c.a >= 0 ? c.a : c.b >= 0 ? c.b : null; if (ob == null || rb == null) continue;
      const k = -(2 + ob), pts = c.a >= 0 ? c.pts : c.pts2, nrm = c.a >= 0 ? V.sc(c.normal, -1) : c.normal;   // normal pointing from the stand-in into the runner
      sc.push({ tau, seg: this.standIn.segs[k] ? this.standIn.segs[k].name : "?" + k, body: this.spec.bodies[rb].name, bi: rb, depth: c.depth, pts, normal: nrm }); }
    const si = this.standIn.state(tau); let sup = null; if (this.Bon) { const l = this.sup.lambdas(); sup = { F: V.sc(l.lin, 1 / this.dt), T: V.sc(l.rot, 1 / this.dt) }; }
    this.phys.push({ tau, impulses: imp, contacts: sc, trackErr: si.trackErr, standIn: si.segs.map(s => ({ name: s.name, pts: s.pts, v: s.v, w: s.w, com: s.com, yaw: s.yaw, yawAuth: s.yawAuth, comAuth: s.comAuth })), B: sup, Bon: this.Bon, feet: this.contactFlags.slice() }); return true; }
}
