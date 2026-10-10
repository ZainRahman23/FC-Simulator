// AST-1E (AST1E_PREREG.md, frozen 7b77dc5): REV2's AST-1 stand-in with the slide LEG segment following the recorded extension.
//   TORSO: AST-1 exactly (REV2 pi1_rev2_sim.mjs StandIn code, copied unchanged).
//   LEG (THIGH + LEG prims): pose = planar Kabsch fit of the RIGID points (THIGH.a, THIGH.b, LEG.a); geometry = THIGH capsule (k_p, fixed) + LEG capsule at the
//   recorded endpoints mapped by the inverse fit, set before every prescribed step (A1: a MutableCompoundShape — THIGH + K = 8 collinear LEG pieces built in the fully extended
//   layout, moved with ModifyShape and no AdjustCenterOfMass, bounds by NotifyShapeChanged(updateMass = false); the COM stays the extended geometry's); mass m_T·legFrac, inertia / COM of the fully extended leg
//   (L_ext = L_LEG(k_p) / ext(k_p)); drive = AST-1 law while prescribed.
//   Relinquish (permanent) at the first of (a) the step after any LEG ↔ runner manifold, (b) τ_n ≥ r_c: feed-forward stops, tether motors Off, geometry frozen.
import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const { V, Q } = await import(P2 + "core/v2_math.js");
const L_NOGROUND = 2, OBST_UD = 2000, KP = 8;   // core/v2_jolt.js internal constants (as pi1_rev2_sim.mjs); A1: LEG pieces
const yawQ = (th) => [0, Math.sin(th / 2), 0, Math.cos(th / 2)];
// REV2 fitYaw, unchanged: planar rigid fit (yaw + translation) of centred local endpoints → current endpoints
function fitYaw(loc, cur) { const cx = cur.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / cur.length); let sn = 0, cs = 0;
  for (let i = 0; i < loc.length; i++) { const l = loc[i], r = V.sub(cur[i], cx); sn += l[2] * r[0] - l[0] * r[2]; cs += l[0] * r[0] + l[2] * r[2]; }
  const th = Math.atan2(sn, cs), q = yawQ(th); let res = 0; for (let i = 0; i < loc.length; i++) res = Math.max(res, V.dist(V.add(cx, Q.rot(q, loc[i])), cur[i])); return { th, t: cx, q, res }; }
const capQ = (u) => { const y = [0, 1, 0], c = V.cross(y, u), cl = V.len(c), dd = V.dot(y, u); if (cl < 1e-9) return dd > 0 ? [0, 0, 0, 1] : [1, 0, 0, 0]; const ang = Math.atan2(cl, dd), k = V.sc(c, 1 / cl), s = Math.sin(ang / 2); return [k[0] * s, k[1] * s, k[2] * s, Math.cos(ang / 2)]; };
export class StandInE {
  // ctx: { sim (lastContacts), rC (authoritative first-contact row or Infinity), ext0 (min(1, launchT(k_p)/extT)) }
  constructor(J, w, samples, tau0, mT, legFrac, isLeg, ctx) {
    this.J = J; this.w = w; this.samples = samples; this.ctx = ctx; this.kind = "AST-1E"; const s0 = samples(tau0), names = Object.keys(s0);
    const legN = names.filter(isLeg), torN = names.filter(n => !isLeg(n)); this.segs = []; this.log = []; this.release = null; this.writes = 0;
    for (const [name, prims, m] of [["TORSO", torN, mT * (1 - legFrac)], ["LEG", legN, mT * legFrac]]) { if (!prims.length) continue;
      const leg = name === "LEG", k = this.segs.length;
      let o, loc, shape, ext = null;
      if (!leg) { const pts = prims.flatMap(p => [s0[p].a, s0[p].b]); o = pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / pts.length); loc = pts.map(p => V.sub(p, o));
        const cs = new J.StaticCompoundShapeSettings();
        for (const p of prims) { const a = V.sub(s0[p].a, o), b = V.sub(s0[p].b, o), ax = V.sub(b, a), Lc = V.len(ax), mid = V.sc(V.add(a, b), 0.5), q = capQ(V.sc(ax, 1 / Lc));
          cs.AddShape(new J.Vec3(mid[0], mid[1], mid[2]), new J.Quat(q[0], q[1], q[2], q[3]), new J.CapsuleShapeSettings(Math.max(1e-4, Lc / 2), s0[p].r), 0); }
        shape = cs.Create().Get(); }
      else { const T = s0.THIGH, Lg = s0.LEG, rig = [T.a, T.b, Lg.a]; o = rig.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / 3); loc = rig.map(p => V.sub(p, o));
        const aL = V.sub(Lg.a, o), bL = V.sub(Lg.b, o), L0 = V.dist(aL, bL), u = V.sc(V.sub(bL, aL), 1 / L0), Lext = L0 / ctx.ext0;
        ext = { thigh: { a: V.sub(T.a, o), b: V.sub(T.b, o), r: T.r }, rLeg: Lg.r, aExt: aL, bExt: V.add(aL, V.sc(u, Lext)), Lext, L0, u, K: KP, ell: Lext / KP };
        shape = this._legShape(ext); }
      const bcs = new J.BodyCreationSettings(shape, new J.RVec3(o[0], o[1], o[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_NOGROUND);
      bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; bcs.mMassPropertiesOverride.mMass = m; bcs.mGravityFactor = 0; bcs.mUserData = OBST_UD + k; bcs.mFriction = 0.4; bcs.mRestitution = 0;
      bcs.mAllowedDOFs = J.EAllowedDOFs_TranslationX | J.EAllowedDOFs_TranslationY | J.EAllowedDOFs_TranslationZ | J.EAllowedDOFs_RotationY; bcs.mLinearDamping = 0; bcs.mAngularDamping = 0;
      const body = w.bi.CreateBody(bcs); w.bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
      const com = body.GetCenterOfMassPosition(), cW = [com.GetX(), com.GetY(), com.GetZ()], cLoc = V.sub(cW, o), ey = new J.Vec3(0, 1, 0), iw = body.GetMotionProperties().MultiplyWorldSpaceInverseInertiaByVector(body.GetRotation(), ey), Iyy = 1 / Math.max(1e-12, iw.GetY());
      const om = 2 * Math.PI * 2, frac = m / mT, st = new J.SixDOFConstraintSettings(); st.mSpace = J.EConstraintSpace_WorldSpace; st.mPosition1 = new J.RVec3(cW[0], cW[1], cW[2]); st.mPosition2 = new J.RVec3(cW[0], cW[1], cW[2]);
      st.mAxisX1 = new J.Vec3(1, 0, 0); st.mAxisY1 = new J.Vec3(0, 1, 0); st.mAxisX2 = new J.Vec3(1, 0, 0); st.mAxisY2 = new J.Vec3(0, 1, 0);
      const AX = { lin: [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ], rot: [J.SixDOFConstraintSettings_EAxis_RotationX, J.SixDOFConstraintSettings_EAxis_RotationY, J.SixDOFConstraintSettings_EAxis_RotationZ] };
      for (const a of [...AX.lin, AX.rot[1]]) st.MakeFreeAxis(a); st.MakeFixedAxis(AX.rot[0]); st.MakeFixedAxis(AX.rot[2]);
      const con = J.castObject(st.Create(w.ground, body), J.SixDOFConstraint); w.ps.AddConstraint(con); J.destroy(st);
      for (const a of AX.lin) { const ms = con.GetMotorSettings(a), sp = ms.mSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = m * om * om; sp.mDamping = 2 * m * om; ms.mMinForceLimit = -334 * frac; ms.mMaxForceLimit = 334 * frac; con.SetMotorState(a, J.EMotorState_PositionAndVelocity); }
      { const ms = con.GetMotorSettings(AX.rot[1]), sp = ms.mSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = Iyy * om * om; sp.mDamping = 2 * Iyy * om; ms.mMinTorqueLimit = -82 * frac; ms.mMaxTorqueLimit = 82 * frac; con.SetMotorState(AX.rot[1], J.EMotorState_PositionAndVelocity); }
      const g = { name, prims, m, Iyy, body, con, loc, o0: o, cLoc, cW0: cW, k, AX, leg, ext, released: false };
      if (leg) { g.mc = J.castObject(shape, J.MutableCompoundShape); g.comExtLocal = (() => { const c = shape.GetCenterOfMass(); return [c.GetX(), c.GetY(), c.GetZ()]; })(); const L1 = this._legLocal(g, tau0); this._setLegShape(g, L1.a, L1.b); }
      this.segs.push(g); }
    this.v = new J.Vec3(0, 0, 0); this.qq = new J.Quat(0, 0, 0, 1); this.rv = new J.RVec3(0, 0, 0);
    this.consts = { L_NOGROUND, OBST_UD, tetherHz: 2, zeta: 1, capN: 334, capNm: 82, legFrac, mT, ext0: ctx.ext0, rC: ctx.rC, release: "first of (a) LEG-runner manifold in the previous step, (b) tau_n >= r_c" };
  }
  // A1: THIGH capsule (sub-shape 0) + K collinear LEG pieces (sub-shapes 1 … K), built in the fully extended layout (mass properties / COM of the extended leg)
  _legShape(ext) { const J = this.J, cs = new J.MutableCompoundShapeSettings(), add = (pa, pb, r, hh) => { const ax = V.sub(pb, pa), Lc = V.len(ax), mid = V.sc(V.add(pa, pb), 0.5), q = capQ(Lc > 1e-9 ? V.sc(ax, 1 / Lc) : [0, 1, 0]);
      cs.AddShape(new J.Vec3(mid[0], mid[1], mid[2]), new J.Quat(q[0], q[1], q[2], q[3]), new J.CapsuleShapeSettings(Math.max(1e-4, hh != null ? hh : Lc / 2), r), 0); };
    add(ext.thigh.a, ext.thigh.b, ext.thigh.r); for (let i = 0; i < ext.K; i++) add(V.add(ext.aExt, V.sc(ext.u, i * ext.ell)), V.add(ext.aExt, V.sc(ext.u, (i + 1) * ext.ell)), ext.rLeg, ext.ell / 2); return cs.Create().Get(); }
  // move the pieces so that their union is the capsule [a, b] (body-local); no AdjustCenterOfMass; bounds only
  _setLegShape(g, a, b) { const J = this.J, ext = g.ext, ax = V.sub(b, a), L = V.len(ax), u = L > 1e-9 ? V.sc(ax, 1 / L) : ext.u, q = capQ(u), qj = new J.Quat(q[0], q[1], q[2], q[3]);
    for (let i = 0; i < ext.K; i++) { const s0 = Math.max(0, Math.min(i * ext.ell, L - ext.ell)), mid = V.add(a, V.sc(u, s0 + ext.ell / 2)); g.mc.ModifyShape(1 + i, new J.Vec3(mid[0], mid[1], mid[2]), qj); }
    const c = g.body.GetCenterOfMassPosition(); this.w.bi.NotifyShapeChanged(g.body.GetID(), g.mc.GetCenterOfMass(), false, J.EActivation_Activate); g.cur = { a, b, L }; }
  // LEG body-local endpoints of the recorded LEG primitive at τ (inverse of the rigid-point fit)
  _legLocal(g, tau) { const s = this.samples(tau), f = fitYaw(g.loc, [s.THIGH.a, s.THIGH.b, s.LEG.a]), qi = Q.conj(f.q); return { a: Q.rot(qi, V.sub(s.LEG.a, f.t)), b: Q.rot(qi, V.sub(s.LEG.b, f.t)) }; }
  // the authoritative pose of a segment at τ; cur = the recorded endpoints in the segment's prim order (for AST-C1)
  poseAt(seg, tau) { const s = this.samples(tau);
    if (!seg.leg) { const cur = seg.prims.flatMap(p => [s[p].a, s[p].b]), f = fitYaw(seg.loc, cur); return { ...f, com: V.add(f.t, Q.rot(f.q, seg.cLoc)), cur }; }
    const f = fitYaw(seg.loc, [s.THIGH.a, s.THIGH.b, s.LEG.a]); return { ...f, com: V.add(f.t, Q.rot(f.q, seg.cLoc)), cur: seg.prims.flatMap(p => [s[p].a, s[p].b]) }; }
  // body-local endpoints of the segment's prims in prim order (the LEG uses its current geometry)
  _local(seg) { if (!seg.leg) return seg.loc; const T = seg.ext.thigh; return seg.prims.flatMap(p => p === "LEG" ? [seg.cur.a, seg.cur.b] : [T.a, T.b]); }
  init(tau0, dtStep) { for (const g of this.segs) { const pm = this.poseAt(g, tau0 - 0.25), p0 = this.poseAt(g, tau0);
      const vel = V.sc(V.sub(p0.com, pm.com), 1 / (dtStep)), om = (p0.th - pm.th) / dtStep; this.v.Set(vel[0], vel[1], vel[2]); this.w.bi.SetLinearVelocity(g.body.GetID(), this.v); this.v.Set(0, om, 0); this.w.bi.SetAngularVelocity(g.body.GetID(), this.v); g.th0 = p0.th; } }
  _bodyState(g) { const b = g.body, P = b.GetPosition(), R = b.GetRotation(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity(); return [P.GetX(), P.GetY(), P.GetZ(), R.GetX(), R.GetY(), R.GetZ(), R.GetW(), v.GetX(), v.GetY(), v.GetZ(), w.GetX(), w.GetY(), w.GetZ()]; }
  _maybeRelease(g, tau) { if (g.released || !g.leg) return; const kk = -(2 + g.k), C = (this.ctx.sim && this.ctx.sim.lastContacts) || [];
    const man = C.some(c => (c.a === kk && c.b >= 0) || (c.b === kk && c.a >= 0)), auth = tau >= this.ctx.rC - 1e-9; if (!man && !auth) return;
    const before = this._bodyState(g); for (const a of [...g.AX.lin, g.AX.rot[1]]) g.con.SetMotorState(a, this.J.EMotorState_Off); const after = this._bodyState(g);
    g.released = true; this.release = { tau, why: man ? "manifold" : "authoritative", stateUnchanged: before.every((x, i) => x === after[i]), before, after }; }
  // drive for the step τ → τ + Δτ (Δτ = 0.25 squad ticks = dt)
  drive(tau, dt) { const out = []; for (const g of this.segs) { this._maybeRelease(g, tau); const id = g.body.GetID(), vb = g.body.GetLinearVelocity(), wb = g.body.GetAngularVelocity();
      if (g.released) { g.pre = { v: [vb.GetX(), vb.GetY(), vb.GetZ()], wy: wb.GetY(), F: [0, 0, 0], T: 0 }; this.log.push({ tau, seg: g.name, released: 1 }); out.push({ name: g.name, F: [0, 0, 0], T: 0, fitRes: 0, released: true }); continue; }
      const pm = this.poseAt(g, tau - 0.25), p0 = this.poseAt(g, tau), p1 = this.poseAt(g, tau + 0.25);
      const a = V.sc(V.add(V.sub(p1.com, V.sc(p0.com, 2)), pm.com), 1 / (dt * dt)), alpha = (p1.th - 2 * p0.th + pm.th) / (dt * dt), vel = V.sc(V.sub(p1.com, p0.com), 1 / dt), om = (p1.th - p0.th) / dt;
      const F = V.sc(a, g.m), T = g.Iyy * alpha; g.pre = { v: [vb.GetX(), vb.GetY(), vb.GetZ()], wy: wb.GetY(), F, T }; this.v.Set(F[0], F[1], F[2]); this.w.bi.AddForce(id, this.v, this.J.EActivation_Activate); this.v.Set(0, T, 0); this.w.bi.AddTorque(id, this.v, this.J.EActivation_Activate);
      const dp = V.sub(p0.com, g.cW0); this.v.Set(dp[0], dp[1], dp[2]); g.con.SetTargetPositionCS(this.v); this.v.Set(vel[0], vel[1], vel[2]); g.con.SetTargetVelocityCS(this.v);   // A2: spring position / orientation target at the START-of-step pose p0 (Jolt evaluates spring error at the step start)
      const q = yawQ(p0.th - g.th0); this.qq.Set(q[0], q[1], q[2], q[3]); g.con.SetTargetOrientationCS(this.qq); this.v.Set(0, om, 0); g.con.SetTargetAngularVelocityCS(this.v);
      if (g.leg) { const L1 = this._legLocal(g, tau + 0.25); this._setLegShape(g, L1.a, L1.b); }
      this.log.push({ tau, seg: g.name, released: 0 }); out.push({ name: g.name, F, T, fitRes: p1.res }); } return out; }
  contactImpulses(dt) { return this.segs.map(g => { if (!g.pre) return { name: g.name, J: [0, 0, 0], Jy: 0 }; const v = g.body.GetLinearVelocity(), w = g.body.GetAngularVelocity(), lt = g.con.GetTotalLambdaMotorTranslation(), lr = g.con.GetTotalLambdaMotorRotation();
      const J = [0, 1, 2].map(i => g.m * ([v.GetX(), v.GetY(), v.GetZ()][i] - g.pre.v[i]) - g.pre.F[i] * dt - [lt.GetX(), lt.GetY(), lt.GetZ()][i]), Jy = g.Iyy * (w.GetY() - g.pre.wy) - g.pre.T * dt - lr.GetY();
      g.lastDrive = { F: g.pre.F, T: g.pre.T, lt: [lt.GetX(), lt.GetY(), lt.GetZ()], lr: lr.GetY(), released: g.released }; return { name: g.name, J, Jy }; }); }
  state(tau) { const out = { segs: [] }; let err = 0; for (const g of this.segs) { const b = g.body, P = b.GetPosition(), R = b.GetRotation(), pos = [P.GetX(), P.GetY(), P.GetZ()], rot = [R.GetX(), R.GetY(), R.GetZ(), R.GetW()];
      const pts = this._local(g).map(l => V.add(pos, Q.rot(rot, l))), au = this.poseAt(g, tau); const prescribed = !g.released;
      if (prescribed) for (let i = 0; i < pts.length; i++) err = Math.max(err, V.dist(pts[i], au.cur[i]));
      const v = b.GetLinearVelocity(), wv = b.GetAngularVelocity(), cm = b.GetCenterOfMassPosition(), yaw = 2 * Math.atan2(rot[1], rot[3]);
      out.segs.push({ name: g.name, pos, rot, pts, prims: g.prims, v: [v.GetX(), v.GetY(), v.GetZ()], w: [wv.GetX(), wv.GetY(), wv.GetZ()], com: [cm.GetX(), cm.GetY(), cm.GetZ()], m: g.m, yaw, yawAuth: au.th, comAuth: au.com, released: g.released, drive: g.lastDrive || null }); } out.trackErr = err; return out; }
}
// replace a constructed sim's AST-1 stand-in by AST-1E before any step (harness-level; the plant code is not modified)
export function replaceStandIn(sim, J, samples, tau0, mT, legFrac, isLeg, ctx) { const old = sim.standIn;
  for (const g of old.segs) { sim.w.ps.RemoveConstraint(g.con); const id = g.body.GetID(); sim.w.bi.RemoveBody(id); sim.w.bi.DestroyBody(id); }
  sim.standIn = new StandInE(J, sim.w, samples, tau0, mT, legFrac, isLeg, { ...ctx, sim }); sim.standIn.init(tau0, sim.dt); return sim.standIn; }
