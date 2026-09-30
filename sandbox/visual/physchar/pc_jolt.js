// ═══ physchar/pc_jolt.js — the THIN SUBSTRATE ADAPTER: Touchline's physical-character spec → Jolt bodies / constraints / contacts ═══
// The only file that knows Jolt exists (so Rapier can replace it behind the same surface). It owns no football logic and no policy
// beyond what it is handed: friction per material pair is decided by the caller (Touchline's contact policy) through `frictionOf`.
import { V, Q } from "./pc_math.js";

export async function loadJolt(url) { const mod = await import(url); return await mod.default(); }

const L_STATIC = 0, L_MOVING = 1, GROUND_UD = 1000, OBST_UD = 2000;    // contact index: turf −1, obstacle k → −(2 + k), character body i → i
export const DEFAULT_WORLD = {
  gravity: -9.81, speculative: 0.02, slop: 0.005, baumgarte: 0.2, velSteps: 10, posSteps: 2,   // Jolt defaults except the penetration slop (default 0.02 m)
  linDamp: 0.05, angDamp: 0.05, maxAngVel: 47.1, allowSleep: true, jointFriction: 1.0,          // jointFriction scales every joint's passive friction torque
  hingeSoftHz: 0, hingeSoftZeta: 1.0,                                                           // knee / elbow end-stops: 0 = hard (Jolt default)
};

export class JoltCharacterWorld {
  constructor(J, spec, cfg, frictionOf) {
    this.J = J; this.spec = spec; this.cfg = Object.assign({}, DEFAULT_WORLD, cfg || {}); this.frictionOf = frictionOf;
    const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1;
    // MEASUREMENT ONLY (cfg.plateFrom = first body index of the character that stands on a FORCE PLATE; off = the unchanged 2-layer world):
    // JoltPhysics.js exposes no contact impulses, so the turf under that character is its own coincident "turf" — a free body of huge mass,
    // gravity off, no damping — that collides only with that character. The plate's momentum change per step IS the turf impulse on that
    // character (Newton's third law), which separates turf reaction from character↔character contact on a body that touches both
    // (the D6 diagnostic, 2026-09-30). Layers: 0 turf, 1 the other character, 2 the plate character, 3 its plate.
    this.plateFrom = this.cfg.plateFrom ?? null; const nL = this.plateFrom != null ? 4 : 2;
    const opf = new J.ObjectLayerPairFilterTable(nL);
    if (this.plateFrom == null) { opf.EnableCollision(L_STATIC, L_MOVING); opf.EnableCollision(L_MOVING, L_MOVING); }
    else { opf.EnableCollision(0, 1); opf.EnableCollision(1, 1); opf.EnableCollision(1, 2); opf.EnableCollision(2, 2); opf.EnableCollision(2, 3); }
    const bpi = new J.BroadPhaseLayerInterfaceTable(nL, 2); bpi.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0)); for (let l = 1; l < nL; l++) bpi.MapObjectToBroadPhaseLayer(l, new J.BroadPhaseLayer(1));
    st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi;
    st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(st.mBroadPhaseLayerInterface, 2, st.mObjectLayerPairFilter, nL);
    this.jolt = new J.JoltInterface(st); J.destroy(st);
    this.ps = this.jolt.GetPhysicsSystem(); this.bi = this.ps.GetBodyInterface();
    this.ps.SetGravity(new J.Vec3(0, this.cfg.gravity, 0));
    const ps_ = this.ps.GetPhysicsSettings(); ps_.mSpeculativeContactDistance = this.cfg.speculative; ps_.mPenetrationSlop = this.cfg.slop; ps_.mBaumgarte = this.cfg.baumgarte;
    ps_.mNumVelocitySteps = this.cfg.velSteps; ps_.mNumPositionSteps = this.cfg.posSteps;
    if (this.cfg.maxPenCorr != null) ps_.mMaxPenetrationDistance = this.cfg.maxPenCorr;          // Jolt default 0.2 m per position iteration
    this.ps.SetPhysicsSettings(ps_);
    // the turf: a static half-space approximated by a thick box whose top face is y = 0
    const gs = new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(50, 1, 50), 0.0, null), new J.RVec3(0, -1, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, L_STATIC);
    gs.mUserData = GROUND_UD; gs.mFriction = 0.5; gs.mRestitution = 0; this.ground = this.bi.CreateBody(gs); this.bi.AddBody(this.ground.GetID(), J.EActivation_DontActivate); J.destroy(gs);
    this._addPlate = () => { if (this.plateFrom == null || this.plate) return; const M = 1e8, ps = new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(50, 1, 50), 0.0, null), new J.RVec3(0, -1, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, 3);
      ps.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided; ps.mMassPropertiesOverride.mMass = M; const I = J.Mat44.prototype.sIdentity();
      I.SetAxisX(new J.Vec3(M * 1e3, 0, 0)); I.SetAxisY(new J.Vec3(0, M * 1e3, 0)); I.SetAxisZ(new J.Vec3(0, 0, M * 1e3)); ps.mMassPropertiesOverride.mInertia = I;
      ps.mGravityFactor = 0; ps.mLinearDamping = 0; ps.mAngularDamping = 0; ps.mAllowSleeping = false; ps.mUserData = GROUND_UD; ps.mFriction = 0.5; ps.mRestitution = 0;
      this.plate = this.bi.CreateBody(ps); this.bi.AddBody(this.plate.GetID(), J.EActivation_Activate); J.destroy(ps); this.plateMass = M; };
    if (!this.cfg.plateLate) this._addPlate();
    // self-collision filter (ragdoll pattern): one group, sub-group = body index; the caller decides which pairs are disabled
    this.gft = new J.GroupFilterTable(spec.bodies.length);
    this.bodies = []; this.shapeCom = [];
    for (const b of spec.bodies) this._addBody(b);
    if (this.cfg.plateLate) this._addPlate();   // (experiment: the plate created AFTER the character's bodies — body-ID order in the contact pair)
    this.cons = []; for (const j of spec.joints) this._addJoint(j);
    this.contacts = []; this._listen();
  }
  disablePair(i, j) { this.gft.DisableCollision(i, j); }
  _shapeSettings(s) {
    const J = this.J;
    if (s.type === "sphere") return new J.SphereShapeSettings(s.r, null);
    if (s.type === "capsule") return new J.CapsuleShapeSettings(s.half, s.r, null);
    if (s.type === "tapered") return Math.abs(s.rTop - s.rBot) < 0.002 ? new J.CapsuleShapeSettings(s.half, (s.rTop + s.rBot) / 2, null) : new J.TaperedCapsuleShapeSettings(s.half, s.rTop, s.rBot, null);
    if (s.type === "box") return new J.BoxShapeSettings(new J.Vec3(s.he[0], s.he[1], s.he[2]), s.cr, null);
    throw new Error("shape " + s.type);
  }
  _addBody(b) {
    const J = this.J, cs = new J.StaticCompoundShapeSettings();
    for (const s of b.shapes) cs.AddShape(new J.Vec3(s.pos[0], s.pos[1], s.pos[2]), new J.Quat(s.rot[0], s.rot[1], s.rot[2], s.rot[3]), this._shapeSettings(s), 0);
    const r0 = cs.Create(); if (r0.HasError()) throw new Error(b.name + ": " + r0.GetError().c_str());
    const nat = r0.Get().GetCenterOfMass(), off = [b.com[0] - nat.GetX(), b.com[1] - nat.GetY(), b.com[2] - nat.GetZ()];
    const oc = new J.OffsetCenterOfMassShapeSettings(new J.Vec3(off[0], off[1], off[2]), cs), r1 = oc.Create(); if (r1.HasError()) throw new Error(b.name + " com: " + r1.GetError().c_str());
    const shape = r1.Get(), c = shape.GetCenterOfMass(); this.shapeCom.push([c.GetX(), c.GetY(), c.GetZ()]);
    const bcs = new J.BodyCreationSettings(shape, new J.RVec3(b.origin[0], b.origin[1], b.origin[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_MOVING);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided;
    const mp = bcs.mMassPropertiesOverride; mp.mMass = b.mass; const I = J.Mat44.prototype.sIdentity();
    // optional solver-stability INERTIA scaling for light distal bodies (Jolt Ragdoll::Stabilize idea; masses are never changed): cfg.inertiaScaleLight
    const kI = (this.cfg.inertiaScaleLight && /^(foreArm|upperArm|shin|foot)_/.test(b.name)) ? this.cfg.inertiaScaleLight : 1;
    I.SetAxisX(new J.Vec3(b.inertia[0] * kI, 0, 0)); I.SetAxisY(new J.Vec3(0, b.inertia[1] * kI, 0)); I.SetAxisZ(new J.Vec3(0, 0, b.inertia[2] * kI)); mp.mInertia = I;
    bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = this.cfg.linDamp; bcs.mAngularDamping = this.cfg.angDamp; bcs.mMaxAngularVelocity = this.cfg.maxAngVel;
    bcs.mAllowSleeping = this.cfg.allowSleep; bcs.mUserData = b.index + 1;
    bcs.mCollisionGroup.SetGroupFilter(this.gft); bcs.mCollisionGroup.SetGroupID(0); bcs.mCollisionGroup.SetSubGroupID(b.index);
    if (this.plateFrom != null && b.index >= this.plateFrom) bcs.mObjectLayer = 2;
    const body = this.bi.CreateBody(bcs); this.bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
    this.bodies.push(body);
  }
  // (measurement) the force plate's linear momentum (N·s): its change over a step = the turf impulse the plate character received, negated
  plateMomentum() { if (!this.plate) return null; const v = this.plate.GetLinearVelocity(); return [v.GetX() * this.plateMass, v.GetY() * this.plateMass, v.GetZ() * this.plateMass]; }
  _addJoint(j) {
    const J = this.J, b1 = this.bodies[j.parentIndex], b2 = this.bodies[j.childIndex], k = this.cfg.jointFriction;
    if (j.type === "hinge") {
      const s = new J.HingeConstraintSettings(); s.mSpace = J.EConstraintSpace_WorldSpace; s.mPoint1 = s.mPoint2 = new J.RVec3(j.at[0], j.at[1], j.at[2]);
      s.mHingeAxis1 = s.mHingeAxis2 = new J.Vec3(...j.axis); s.mNormalAxis1 = s.mNormalAxis2 = new J.Vec3(...j.normal); s.mLimitsMin = j.lo; s.mLimitsMax = j.hi; s.mMaxFrictionTorque = j.fr * k;
      // anatomical END-STOP as a stiff damped spring (soft tissue), not a rigid wall: a hard limit corrects overshoot with a position-bias
      // velocity that injects energy (measured +14 J at the knee in drop E); the soft stop dissipates instead. cfg.hingeSoftHz = 0 → hard.
      if (this.cfg.hingeSoftHz > 0) { const sp = s.mLimitsSpringSettings; sp.mMode = J.ESpringMode_FrequencyAndDamping; sp.mFrequency = this.cfg.hingeSoftHz; sp.mDamping = this.cfg.hingeSoftZeta; }
      const c = J.castObject(s.Create(b1, b2), J.HingeConstraint); this.ps.AddConstraint(c); this.cons.push({ j, c, kind: "hinge" }); return;
    }
    const s = new J.SixDOFConstraintSettings(); s.mSpace = J.EConstraintSpace_WorldSpace; s.mPosition1 = s.mPosition2 = new J.RVec3(j.at[0], j.at[1], j.at[2]);
    s.mAxisX1 = s.mAxisX2 = new J.Vec3(...j.X); s.mAxisY1 = s.mAxisY2 = new J.Vec3(...j.Y); s.mSwingType = J.ESwingType_Pyramid;
    const A = J; s.MakeFixedAxis(A.SixDOFConstraintSettings_EAxis_TranslationX); s.MakeFixedAxis(A.SixDOFConstraintSettings_EAxis_TranslationY); s.MakeFixedAxis(A.SixDOFConstraintSettings_EAxis_TranslationZ);
    s.SetLimitedAxis(A.SixDOFConstraintSettings_EAxis_RotationX, j.limits.twist[0], j.limits.twist[1]);
    s.SetLimitedAxis(A.SixDOFConstraintSettings_EAxis_RotationY, j.limits.swingY[0], j.limits.swingY[1]);
    s.SetLimitedAxis(A.SixDOFConstraintSettings_EAxis_RotationZ, j.limits.swingZ[0], j.limits.swingZ[1]);
    const c = J.castObject(s.Create(b1, b2), J.SixDOFConstraint); this.ps.AddConstraint(c);
    for (const ax of [A.SixDOFConstraintSettings_EAxis_RotationX, A.SixDOFConstraintSettings_EAxis_RotationY, A.SixDOFConstraintSettings_EAxis_RotationZ]) c.SetMaxFriction(ax, j.fr * k);
    this.cons.push({ j, c, kind: "sixdof" });
  }
  // contact listener: Touchline's per-pair friction policy in, contact facts out (the listener fires BEFORE the solve: depth is the
  // pre-solve / predicted penetration; post-solve impulses are not exposed by JoltPhysics.js — see SUBSTRATE_DECISION §3)
  _listen() {
    const J = this.J, L = new J.ContactListenerJS(), self = this;
    L.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
    const on = (b1p, b2p, mp, sp) => {
      const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), m = J.wrapPointer(mp, J.ContactManifold), cs = J.wrapPointer(sp, J.ContactSettings);
      const u1 = b1.GetUserData(), u2 = b2.GetUserData(), idx = (u) => u === GROUND_UD ? -1 : u >= OBST_UD ? -(2 + u - OBST_UD) : u - 1, i1 = idx(u1), i2 = idx(u2);
      const n = m.mWorldSpaceNormal, np = m.mRelativeContactPointsOn1.size(), pts = [];
      for (let k = 0; k < np; k++) { const p = m.GetWorldSpaceContactPointOn1(k); pts.push([p.GetX(), p.GetY(), p.GetZ()]); }
      // the policy may depend on WHERE the contact is (Gate C1 low-friction patches); Gate A/B policies ignore the third argument
      const mu = self.frictionOf(i1, i2, pts[0]); cs.mCombinedFriction = mu; cs.mCombinedRestitution = 0;
      self.contacts.push({ a: i1, b: i2, normal: [n.GetX(), n.GetY(), n.GetZ()], depth: m.mPenetrationDepth, pts, mu });
    };
    L.OnContactAdded = on; L.OnContactPersisted = on; L.OnContactRemoved = () => {};
    this.ps.SetContactListener(L); this.listener = L;
  }
  // setPose / setVel are INITIAL-CONDITION writes. Once the world has stepped, any call is counted in `audit` (Gate B reports it: the
  // body state must never be overwritten to recover a pose — the counters must stay 0).
  setPose(i, pos, rot) { if (this.stepped) this.audit.teleports++; this.bi.SetPositionAndRotation(this.bodies[i].GetID(), new this.J.RVec3(pos[0], pos[1], pos[2]), new this.J.Quat(rot[0], rot[1], rot[2], rot[3]), this.J.EActivation_Activate); }
  setVel(i, v, w) { if (this.stepped) this.audit.velocityWrites++; const id = this.bodies[i].GetID(); this.bi.SetLinearVelocity(id, new this.J.Vec3(v[0], v[1], v[2])); this.bi.SetAngularVelocity(id, new this.J.Vec3(w[0], w[1], w[2])); }
  setGravity(g) { this.ps.SetGravity(new this.J.Vec3(0, g, 0)); }
  step(dt, collisionSteps) { this.contacts = []; this.stepped = true; this.jolt.Step(dt, collisionSteps || 1); }
  get audit() { return this._audit || (this._audit = { teleports: 0, velocityWrites: 0 }); }
  read(i) { const b = this.bodies[i], p = b.GetPosition(), r = b.GetRotation(), c = b.GetCenterOfMassPosition(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity();
    return { pos: [p.GetX(), p.GetY(), p.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], com: [c.GetX(), c.GetY(), c.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [w.GetX(), w.GetY(), w.GetZ()], awake: b.IsActive() }; }
  hingeAngle(k) { return this.cons[k].c.GetCurrentAngle(); }
  sixdofRot(k) { const q = this.cons[k].c.GetRotationInConstraintSpace(); return [q.GetX(), q.GetY(), q.GetZ(), q.GetW()]; }

  // ═══ GATE B surface (never called by Gate A) ══════════════════════════════════════════════════════════════════════════════════════
  // reusable WASM temporaries: per-step targets must not allocate on the Jolt heap
  get _t() { const J = this.J; return this.__t || (this.__t = { q: new J.Quat(0, 0, 0, 1), v: new J.Vec3(0, 0, 0), r: new J.RVec3(0, 0, 0) }); }
  get _axes() { const J = this.J; return this.__ax || (this.__ax = {
    lin: [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ],
    rot: [J.SixDOFConstraintSettings_EAxis_RotationX, J.SixDOFConstraintSettings_EAxis_RotationY, J.SixDOFConstraintSettings_EAxis_RotationZ] }); }
  // one Jolt MotorSettings → PositionAndVelocity drive with an ABSOLUTE-UNIT implicit spring (ESpringMode::StiffnessAndDamping):
  //   τ = kp·(θ_target − θ) + kd·(ω_target − ω), solved as a soft constraint inside the velocity iterations (the same loop as contacts and
  //   limits), the accumulated impulse per step clamped to [−max·dt, +max·dt] — Jolt's torque (N·m) / force (N) limit.
  _drive(ms, k, c, max, linear) { const sp = ms.mSpringSettings; sp.mMode = this.J.ESpringMode_StiffnessAndDamping; sp.mStiffness = k; sp.mDamping = c;
    if (linear) { ms.mMinForceLimit = -max; ms.mMaxForceLimit = max; } else { ms.mMinTorqueLimit = -max; ms.mMaxTorqueLimit = max; } }
  // finite-strength joint motor on joint k: m = { kp (N·m/rad), kd (N·m·s/rad), tau (N·m per constraint axis) }
  setMotor(k, m) { const J = this.J, C = this.cons[k];
    if (C.kind === "hinge") { this._drive(C.c.GetMotorSettings(), m.kp, m.kd, m.tau); C.c.SetMotorState(J.EMotorState_PositionAndVelocity); }
    else for (const ax of this._axes.rot) { this._drive(C.c.GetMotorSettings(ax), m.kp, m.kd, m.tau); C.c.SetMotorState(ax, J.EMotorState_PositionAndVelocity); }
    C.motor = m; }
  // target in the joint's own constraint space: SixDOF → quaternion q_cs + angular velocity in body-2 constraint space; hinge → angle + rate.
  // Jolt clamps an orientation target to the joint's swing–twist limits (SixDOFConstraint::SetTargetOrientationCS).
  setJointTarget(k, target, vel) { const C = this.cons[k], t = this._t;
    if (C.kind === "hinge") { C.c.SetTargetAngle(target); C.c.SetTargetAngularVelocity(vel); return; }
    t.q.Set(target[0], target[1], target[2], target[3]); C.c.SetTargetOrientationCS(t.q); t.v.Set(vel[0], vel[1], vel[2]); C.c.SetTargetAngularVelocityCS(t.v); }
  // GATE C1: per-step motor re-tuning (gain scheduling, directional + budgeted torque limits). m = { kp, kd, lo, hi } where lo/hi are
  // per-axis arrays for SixDOF (N·m, lo ≤ 0 ≤ hi) or scalars for a hinge. Only fields present are changed.
  updateMotor(k, m) { const C = this.cons[k];
    const upd = (ms, lo, hi) => { const sp = ms.mSpringSettings; if (m.kp != null) sp.mStiffness = m.kp; if (m.kd != null) sp.mDamping = m.kd; if (lo != null) ms.mMinTorqueLimit = lo; if (hi != null) ms.mMaxTorqueLimit = hi; };
    if (C.kind === "hinge") upd(C.c.GetMotorSettings(), m.lo, m.hi);
    else this._axes.rot.forEach((ax, i) => upd(C.c.GetMotorSettings(ax), m.lo ? m.lo[i] : null, m.hi ? m.hi[i] : null)); }
  // the joint's translational constraint impulse of the last step (N·s, world): the force the parent exerts on the CHILD body × dt
  jointLambdaPosition(k) { const l = this.cons[k].c.GetTotalLambdaPosition(); return [l.GetX(), l.GetY(), l.GetZ()]; }
  // motor impulse of the last step (N·m·s): hinge scalar, SixDOF per constraint axis
  motorLambda(k) { const C = this.cons[k]; if (C.kind === "hinge") return C.c.GetTotalLambdaMotor(); const l = C.c.GetTotalLambdaMotorRotation(); return [l.GetX(), l.GetY(), l.GetZ()]; }

  // TEMPORARY GATE B PELVIS SUPPORT: a SixDOF between the turf and the pelvis with all six axes FREE (no limits), each driven by a
  // finite PositionAndVelocity motor toward the authored root target. Must be created while the pelvis is at bind (identity rotation) so
  // that its constraint space is the world frame: position target = pelvis origin − anchor, orientation target = pelvis world rotation.
  // s = { kLin N/m, cLin N·s/m, fMax N per axis, kRot N·m/rad, cRot N·m·s/rad, tMax N·m per axis }
  addSupport(s) { const J = this.J, p = this.bodies[0].GetPosition(), anchor = [p.GetX(), p.GetY(), p.GetZ()], cs = new J.SixDOFConstraintSettings();
    cs.mSpace = J.EConstraintSpace_WorldSpace; cs.mPosition1 = cs.mPosition2 = new J.RVec3(anchor[0], anchor[1], anchor[2]);
    cs.mAxisX1 = cs.mAxisX2 = new J.Vec3(1, 0, 0); cs.mAxisY1 = cs.mAxisY2 = new J.Vec3(0, 1, 0);
    for (const ax of [...this._axes.lin, ...this._axes.rot]) cs.MakeFreeAxis(ax);
    const c = J.castObject(cs.Create(this.ground, this.bodies[0]), J.SixDOFConstraint); this.ps.AddConstraint(c); J.destroy(cs);
    for (const ax of this._axes.lin) { this._drive(c.GetMotorSettings(ax), s.kLin, s.cLin, s.fMax, true); c.SetMotorState(ax, J.EMotorState_PositionAndVelocity); }
    for (const ax of this._axes.rot) { this._drive(c.GetMotorSettings(ax), s.kRot, s.cRot, s.tMax, false); c.SetMotorState(ax, J.EMotorState_PositionAndVelocity); }
    this.support = { c, s, anchor }; }
  setSupportTarget(pos, rot, v, wLocal) { const S = this.support, t = this._t; if (!S) return;
    t.v.Set(pos[0] - S.anchor[0], pos[1] - S.anchor[1], pos[2] - S.anchor[2]); S.c.SetTargetPositionCS(t.v); t.v.Set(v[0], v[1], v[2]); S.c.SetTargetVelocityCS(t.v);
    t.q.Set(rot[0], rot[1], rot[2], rot[3]); S.c.SetTargetOrientationCS(t.q); t.v.Set(wLocal[0], wLocal[1], wLocal[2]); S.c.SetTargetAngularVelocityCS(t.v); }
  // support impulses of the last step: linear (N·s, world axes) and angular (N·m·s, pelvis axes)
  supportLambda() { const S = this.support; if (!S) return null; const a = S.c.GetTotalLambdaMotorTranslation(), b = S.c.GetTotalLambdaMotorRotation();
    return { lin: [a.GetX(), a.GetY(), a.GetZ()], ang: [b.GetX(), b.GetY(), b.GetZ()] }; }

  // OBSTACLE: a dynamic body (gravity factor 0) held to the turf by a SixDOF. hold "fixed" = all six axes locked (immovable; the lock's
  // impulse IS the force the character exerts on it); hold { kLin, cLin, fMax } = translation X/Z on a finite spring motor (a movable,
  // finite-strength obstacle), Y and rotation locked. o = { shape (pc_body shape), pos, mass, hold }
  addObstacle(o) { const J = this.J, k = (this.obstacles = this.obstacles || []).length;
    const ss = this._shapeSettings(o.shape), r = ss.Create(); if (r.HasError()) throw new Error("obstacle: " + r.GetError().c_str());
    const bcs = new J.BodyCreationSettings(r.Get(), new J.RVec3(o.pos[0], o.pos[1], o.pos[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_MOVING);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; bcs.mMassPropertiesOverride.mMass = o.mass;
    bcs.mGravityFactor = 0; bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mAllowSleeping = false; bcs.mUserData = o.asTurf ? GROUND_UD : OBST_UD + k;   // (o.asTurf, G1a: a raised piece of turf whose mount measures the force on it — its contacts report as turf)
    const body = this.bi.CreateBody(bcs); this.bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
    const cs = new J.SixDOFConstraintSettings(); cs.mSpace = J.EConstraintSpace_WorldSpace; cs.mPosition1 = cs.mPosition2 = new J.RVec3(o.pos[0], o.pos[1], o.pos[2]);
    cs.mAxisX1 = cs.mAxisX2 = new J.Vec3(1, 0, 0); cs.mAxisY1 = cs.mAxisY2 = new J.Vec3(0, 1, 0);
    const A = this._axes; for (const ax of [...A.lin, ...A.rot]) cs.MakeFixedAxis(ax);
    if (o.hold !== "fixed") { cs.MakeFreeAxis(A.lin[0]); cs.MakeFreeAxis(A.lin[2]); }
    const c = J.castObject(cs.Create(this.ground, body), J.SixDOFConstraint); this.ps.AddConstraint(c); J.destroy(cs);
    if (o.hold !== "fixed") for (const ax of [A.lin[0], A.lin[2]]) { this._drive(c.GetMotorSettings(ax), o.hold.kLin, o.hold.cLin, o.hold.fMax, true); c.SetMotorState(ax, J.EMotorState_Position); }
    this.obstacles.push({ body, c, o, removed: false }); return k; }
  // the force the character exerts on the obstacle over the last step (N, world): the holding constraint's impulse / dt (fixed: the point
  // lock; movable: the X/Z spring motors + the locked Y)
  obstacleImpulse(k) { const O = this.obstacles[k]; if (O.removed) return [0, 0, 0];
    if (O.o.hold === "fixed") { const l = O.c.GetTotalLambdaPosition(); return [l.GetX(), l.GetY(), l.GetZ()]; }
    const m = O.c.GetTotalLambdaMotorTranslation(), l = O.c.GetTotalLambdaPosition(); return [m.GetX() + l.GetX(), m.GetY() + l.GetY(), m.GetZ() + l.GetZ()]; }
  obstacleState(k) { const O = this.obstacles[k], p = O.body.GetPosition(), v = O.body.GetLinearVelocity(); return { pos: [p.GetX(), p.GetY(), p.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], removed: O.removed }; }
  // the obstruction disappears (an environment change, not a character correction): its lock and its body leave the world
  removeObstacle(k) { const O = this.obstacles[k]; if (O.removed) return; this.ps.RemoveConstraint(O.c); this.bi.RemoveBody(O.body.GetID()); O.removed = true; }
  // GATE C2: a static TERRAIN piece (e.g. a 3 cm slab) that is part of the ground — its contacts report as turf (index −1, turf friction),
  // so sensing treats standing on it exactly like standing on the pitch. box = { he: [x, y, z], pos: [x, y, z], yaw }
  addTerrainBox(box) { const J = this.J, sh = new J.BoxShape(new J.Vec3(box.he[0], box.he[1], box.he[2]), 0.004, null), q = Q.axis([0, 1, 0], box.yaw || 0);
    const bcs = new J.BodyCreationSettings(sh, new J.RVec3(box.pos[0], box.pos[1], box.pos[2]), new J.Quat(q[0], q[1], q[2], q[3]), J.EMotionType_Static, L_STATIC);
    bcs.mUserData = GROUND_UD; bcs.mFriction = 0.5; bcs.mRestitution = 0; const body = this.bi.CreateBody(bcs); this.bi.AddBody(body.GetID(), J.EActivation_DontActivate); J.destroy(bcs);
    (this.terrain = this.terrain || []).push({ body, box }); return this.terrain.length - 1; }
  // an external physical disturbance: an impulse (N·s) at a world point on body i (the solver distributes it through contacts + joints)
  applyImpulse(i, imp, point) { const t = this._t; t.v.Set(imp[0], imp[1], imp[2]); t.r.Set(point[0], point[1], point[2]); this.bi.AddImpulse(this.bodies[i].GetID(), t.v, t.r); }
  destroy() { this.J.destroy(this.jolt); }
}
