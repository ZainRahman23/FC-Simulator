// ═══ physchar2/core/v2_jolt.js — the THIN SUBSTRATE ADAPTER: V2 spec → Jolt bodies / constraints / contacts (+ readback) ════════════
// Ported from V1 pc_jolt.js (the only file that knows Jolt exists). V2 changes (spec §19 / §21):
//   • body linear + angular damping = 0 (V1: Jolt default 0.05 — a hidden force in the stride balance);
//   • explicit mass properties: full inertia tensor + COM from the spec (colliders never contribute mass);
//   • SixDOF joints with SEPARATE ROM-centred frames on parent / child (F1 ≠ F2) and pyramid swing limits;
//   • motors exist STRUCTURALLY (StiffnessAndDamping spring, per-axis directional torque limits = isometric capacity) but are OFF in G0;
//   • no Coulomb joint friction; no sleeping; mMaxAngularVelocity raised so the engine never clips physiological segment speeds;
//   • per-sub-shape materials for the friction policy (decoded from contacts from G1 on);
//   • readback of every built parameter (G0 0.11).
// G1 additions (passive physics; G0 never calls them):
//   • gyroscopic force ON (mApplyGyroscopicForce) — G1 defect fix G1-D1: without it Jolt keeps a free body's ω constant instead of its
//     angular momentum (Euler's equations violated; measured |ΔL|/|L| = 1.53 over 2 s on a single free asymmetric body vs 2.5e-3 with it);
//   • the approved per-sub-shape contact friction policy (spec §15.4; G0 used a flat 0.5 — it never exercised friction);
//   • contact facts per manifold (bodies, sub-shapes, materials, depth, normal, points on both bodies), velocity writes for initial
//     conditions, constraint impulse readback, passive-drive motor access, equal-and-opposite explicit torques, Jolt SaveState /
//     RestoreState, optional linear-cast CCD and kinematic test rigs.
import { V, Q } from "./v2_math.js";

export async function loadJolt(url) { const mod = await import(url); return await mod.default(); }
const L_STATIC = 0, L_MOVING = 1, GROUND_UD = 1000, OBST_UD = 2000;   // contact index: turf −1, obstacle k → −(2 + k), body i → i
// C3 (adopted 2026-10-03): Jolt manifold reduction OFF and the body-pair contact cache OFF for the V2 world (the boot experiment: both measured
// to matter for the convex boot pieces; the cache also reused stale manifolds on slowly rolling rounded bodies, G1 diagnosis)
export const G0_WORLD = { gravity: -9.81, velSteps: 10, posSteps: 2, linDamp: 0, angDamp: 0, maxAngVel: 100, allowSleep: false, gyroscopic: true, ccd: "discrete", recordContacts: true, manifoldReduction: false, pairCache: false,
  note: "solver iterations are Jolt defaults here; G1's convergence study selects them. maxAngVel 100 rad/s (Jolt default 47.1) so kicks (shank ≈ 39 rad/s) are never clipped. gyroscopic: Euler's rigid-body equations (G1-D1)." };
const MAT_TURF = "turf";

export class V2JoltWorld {
  constructor(J, spec, contact, cfg) {
    // undefined option values never override a default (a caller forwarding an unset option must not silently change the world)
    const given = Object.fromEntries(Object.entries(cfg || {}).filter(([, v]) => v !== undefined));
    this.J = J; this.spec = spec; this.cfg = Object.assign({}, G0_WORLD, given); this.contactCfg = contact;
    const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1;
    const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(L_STATIC, L_MOVING); opf.EnableCollision(L_MOVING, L_MOVING);
    const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(L_MOVING, new J.BroadPhaseLayer(1));
    st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, opf, 2);
    this.jolt = new J.JoltInterface(st); J.destroy(st);
    this.ps = this.jolt.GetPhysicsSystem(); this.bi = this.ps.GetBodyInterface();
    this.ps.SetGravity(new J.Vec3(0, this.cfg.gravity, 0));
    const p = this.ps.GetPhysicsSettings(); p.mSpeculativeContactDistance = contact.speculative; p.mPenetrationSlop = contact.slop; p.mBaumgarte = contact.baumgarte;
    p.mNumVelocitySteps = this.cfg.velSteps; p.mNumPositionSteps = this.cfg.posSteps; if (this.cfg.warmStart === false) p.mConstraintWarmStart = false; p.mUseBodyPairContactCache = this.cfg.pairCache !== false; p.mUseManifoldReduction = this.cfg.manifoldReduction !== false; if (this.cfg.contactWarmStart === false) p.mContactPointPreserveLambdaMaxDistSq = 0; this.ps.SetPhysicsSettings(p);
    const turfShape = this.cfg.turf === "plane" ? new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, 50) : this.cfg.turf === "small" ? new J.BoxShape(new J.Vec3(4, 1, 4), 0.0, null) : new J.BoxShape(new J.Vec3(50, 1, 50), 0.0, null);
    const gs = new J.BodyCreationSettings(turfShape, new J.RVec3(0, this.cfg.turf === "plane" ? 0 : -1, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, L_STATIC);
    gs.mUserData = GROUND_UD; gs.mFriction = 0.5; gs.mRestitution = 0; this.ground = this.bi.CreateBody(gs); this.bi.AddBody(this.ground.GetID(), J.EActivation_DontActivate); J.destroy(gs);
    this.mats = spec.bodies.map(b => b.shapes.map(s => s.material || "body"));           // sub-shape index → contact material (spec §15.4)
    this.subBits = spec.bodies.map(b => b.shapes.length > 1 ? Math.ceil(Math.log2(b.shapes.length)) : 0);
    this.frictionOf = (ma, mb) => { const F = contact.friction || {}; return F[ma + "|" + mb] ?? F[mb + "|" + ma] ?? 0.4; };
    this.gft = new J.GroupFilterTable(spec.bodies.length);
    for (const [a, b] of spec.disabledPairs) this.gft.DisableCollision(a, b);
    this.bodies = []; this.shapeInfo = [];
    for (const b of spec.bodies) this._addBody(b);
    this.cons = []; for (const j of spec.joints) this._addJoint(j);
    this.contacts = []; this._listen();
  }
  _shapeSettings(s) {
    const J = this.J;
    if (s.type === "sphere") return new J.SphereShapeSettings(s.r, null);
    if (s.type === "capsule") return new J.CapsuleShapeSettings(s.half, s.r, null);
    if (s.type === "tapered") return new J.TaperedCapsuleShapeSettings(s.half, s.rTop, s.rBot, null);
    if (s.type === "box") return new J.BoxShapeSettings(new J.Vec3(s.he[0], s.he[1], s.he[2]), s.cr, null);
    if (s.type === "hull") { const hs = new J.ConvexHullShapeSettings(); for (const q of s.points) hs.mPoints.push_back(new J.Vec3(q[0], q[1], q[2])); hs.mMaxConvexRadius = s.cr; return hs; }
    throw new Error("shape " + s.type);
  }
  _addBody(b) {
    const J = this.J, cs = new J.StaticCompoundShapeSettings();
    b.shapes.forEach((s, k) => cs.AddShape(new J.Vec3(s.pos[0], s.pos[1], s.pos[2]), new J.Quat(s.rot[0], s.rot[1], s.rot[2], s.rot[3]), this._shapeSettings(s), k));   // sub-shape user data = index
    const r0 = cs.Create(); if (r0.HasError()) throw new Error(b.name + ": " + r0.GetError().c_str());
    const nat = r0.Get().GetCenterOfMass(), c = b.comLocal, off = [c[0] - nat.GetX(), c[1] - nat.GetY(), c[2] - nat.GetZ()];
    const oc = new J.OffsetCenterOfMassShapeSettings(new J.Vec3(off[0], off[1], off[2]), cs), r1 = oc.Create(); if (r1.HasError()) throw new Error(b.name + " com: " + r1.GetError().c_str());
    const shape = r1.Get(), sc = shape.GetCenterOfMass();
    this.shapeInfo.push({ comLocal: [sc.GetX(), sc.GetY(), sc.GetZ()], volume: shape.GetVolume(), shape });
    const bcs = new J.BodyCreationSettings(shape, new J.RVec3(b.origin[0], b.origin[1], b.origin[2]), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, L_MOVING);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided;
    const mp = bcs.mMassPropertiesOverride; mp.mMass = b.mass; const I = J.Mat44.prototype.sIdentity(), T = b.inertia;
    I.SetAxisX(new J.Vec3(T[0][0], T[1][0], T[2][0])); I.SetAxisY(new J.Vec3(T[0][1], T[1][1], T[2][1])); I.SetAxisZ(new J.Vec3(T[0][2], T[1][2], T[2][2])); mp.mInertia = I;
    bcs.mFriction = 0.5; bcs.mRestitution = 0; bcs.mLinearDamping = this.cfg.linDamp; bcs.mAngularDamping = this.cfg.angDamp; bcs.mMaxAngularVelocity = this.cfg.maxAngVel;
    bcs.mAllowSleeping = this.cfg.allowSleep; bcs.mGravityFactor = 1; bcs.mUserData = b.index + 1; bcs.mApplyGyroscopicForce = !!this.cfg.gyroscopic;
    if (this.cfg.ccd === "linearcast" || (this.cfg.ccd === "distal" && /^(foot|shank|forearm)_/.test(b.name))) bcs.mMotionQuality = J.EMotionQuality_LinearCast;
    if (this.cfg.enhancedEdge && /^foot_/.test(b.name)) bcs.mEnhancedInternalEdgeRemoval = true;   // C3 experiment: Jolt internal-edge removal for the (compound) boot
    bcs.mCollisionGroup.SetGroupFilter(this.gft); bcs.mCollisionGroup.SetGroupID(0); bcs.mCollisionGroup.SetSubGroupID(b.index);
    const body = this.bi.CreateBody(bcs); this.bi.AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
    this.bodies.push(body);
  }
  get _axes() { const J = this.J; return this.__ax || (this.__ax = {
    lin: [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ],
    rot: [J.SixDOFConstraintSettings_EAxis_RotationX, J.SixDOFConstraintSettings_EAxis_RotationY, J.SixDOFConstraintSettings_EAxis_RotationZ] }); }
  _addJoint(j) {
    const J = this.J, A = this._axes, s = new J.SixDOFConstraintSettings();
    s.mSpace = J.EConstraintSpace_WorldSpace; s.mPosition1 = new J.RVec3(j.at[0], j.at[1], j.at[2]); s.mPosition2 = new J.RVec3(j.at[0], j.at[1], j.at[2]);
    s.mAxisX1 = new J.Vec3(...j.F1axes.x); s.mAxisY1 = new J.Vec3(...j.F1axes.y); s.mAxisX2 = new J.Vec3(...j.F2axes.x); s.mAxisY2 = new J.Vec3(...j.F2axes.y);
    s.mSwingType = J.ESwingType_Pyramid;
    for (const ax of A.lin) s.MakeFixedAxis(ax);
    const E = j.limits.engine || j.limits.hard;   // C2: the Jolt hard constraint is the emergency stop (anatomical hard ± ENGINE_MARGIN)
    ["x", "y", "z"].forEach((k, i) => { if (j.locked.includes(k)) s.MakeFixedAxis(A.rot[i]); else s.SetLimitedAxis(A.rot[i], E.lo[i], E.hi[i]); });
    const c = J.castObject(s.Create(this.bodies[j.parentIndex], this.bodies[j.childIndex]), J.SixDOFConstraint); this.ps.AddConstraint(c); J.destroy(s);
    if (this.cfg.jointOrder) { let d = 0; for (let b = j.childIndex; this.spec.bodies[b].parentIndex >= 0; b = this.spec.bodies[b].parentIndex) d++;   // solve order (lower priority first): diagnostic
      c.SetConstraintPriority(this.cfg.jointOrder === "leafLast" ? d : 100 - d); }
    // motors: structural only (OFF). Directional torque limits = isometric capacity in that param direction; spring k = c = 0.
    ["x", "y", "z"].forEach((k, i) => { c.SetMaxFriction(A.rot[i], 0); const cap = j.capacity[k]; if (!cap) return;
      const ms = c.GetMotorSettings(A.rot[i]), sp = ms.mSpringSettings; sp.mMode = J.ESpringMode_StiffnessAndDamping; sp.mStiffness = 0; sp.mDamping = 0;
      ms.mMinTorqueLimit = -cap.minus.Nm; ms.mMaxTorqueLimit = cap.plus.Nm; c.SetMotorState(A.rot[i], J.EMotorState_Off); });
    this.cons.push({ j, c });
  }
  _listen() {
    const J = this.J, L = new J.ContactListenerJS(), self = this;
    L.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
    const on = (b1p, b2p, mp, sp) => {
      const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), m = J.wrapPointer(mp, J.ContactManifold), cs = J.wrapPointer(sp, J.ContactSettings);
      const idx = (u) => (u === GROUND_UD ? -1 : u >= OBST_UD ? -(2 + u - OBST_UD) : u - 1), i1 = idx(b1.GetUserData()), i2 = idx(b2.GetUserData());
      const s1 = i1 < 0 ? 0 : self._sub(i1, m.mSubShapeID1.GetValue()), s2 = i2 < 0 ? 0 : self._sub(i2, m.mSubShapeID2.GetValue());
      const mat = (i, sub) => (i === -1 ? MAT_TURF : i < -1 ? "body" : self.mats[i][sub]), m1 = mat(i1, s1), m2 = mat(i2, s2), mu = self.frictionOf(m1, m2);   // obstacles: body-like (post / opponent limb proxy)
      cs.mCombinedFriction = mu; cs.mCombinedRestitution = self.contactCfg.restitution;     // spec §15.4 per-sub-shape friction policy
      if (!self.cfg.recordContacts) return;
      const n = m.mWorldSpaceNormal, np = m.mRelativeContactPointsOn1.size(), pts = [], pts2 = [];
      for (let k = 0; k < np; k++) { const p = m.GetWorldSpaceContactPointOn1(k), q = m.GetWorldSpaceContactPointOn2(k); pts.push([p.GetX(), p.GetY(), p.GetZ()]); pts2.push([q.GetX(), q.GetY(), q.GetZ()]); }
      self.contacts.push({ a: i1, b: i2, sa: s1, sb: s2, ma: m1, mb: m2, mu, normal: [n.GetX(), n.GetY(), n.GetZ()], depth: m.mPenetrationDepth, pts, pts2 });
    };
    L.OnContactAdded = on; L.OnContactPersisted = on; L.OnContactRemoved = () => {};
    this.ps.SetContactListener(L); this.listener = L;
  }
  _sub(i, v) { const b = this.subBits[i]; return b ? (v & ((1 << b) - 1)) : 0; }               // first-level sub-shape index of the body's compound
  subShapeUserData(i, v) { const id = new this.J.SubShapeID(); id.SetValue(v); const u = this.bodies[i].GetShape().GetSubShapeUserData(id); this.J.destroy(id); return u; }
  // G1 / C7 test obstacle: a STATIC capsule (goalpost, an opponent's shin proxy) — never part of the character; contacts report index −(2 + k)
  addStaticCapsule(o) { const J = this.J, k = (this.obstacles = this.obstacles || []).length, q = o.rot || [0, 0, 0, 1];
    const bcs = new J.BodyCreationSettings(new J.CapsuleShape(o.half, o.r, null), new J.RVec3(o.pos[0], o.pos[1], o.pos[2]), new J.Quat(q[0], q[1], q[2], q[3]), J.EMotionType_Static, L_STATIC);
    bcs.mUserData = OBST_UD + k; bcs.mFriction = 0.4; bcs.mRestitution = 0; const body = this.bi.CreateBody(bcs); this.bi.AddBody(body.GetID(), J.EActivation_DontActivate); J.destroy(bcs);
    this.obstacles.push({ body, o }); return k; }
  setPose(i, pos, rot) { this.bi.SetPositionAndRotation(this.bodies[i].GetID(), new this.J.RVec3(pos[0], pos[1], pos[2]), new this.J.Quat(rot[0], rot[1], rot[2], rot[3]), this.J.EActivation_Activate); }
  setGravity(g) { this.ps.SetGravity(new this.J.Vec3(0, g, 0)); }
  step(dt, collisionSteps) { this.contacts = []; if (this.cfg.jointWarmStart === false) for (const { c } of this.cons) c.ResetWarmStart(); this.jolt.Step(dt, collisionSteps || 1); }   // jointWarmStart false: diagnostic (joint-only warm start off)
  // ── G1 surface ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  setVel(i, v, w) { const id = this.bodies[i].GetID(), t = this._t; t.v.Set(v[0], v[1], v[2]); this.bi.SetLinearVelocity(id, t.v); t.v.Set(w[0], w[1], w[2]); this.bi.SetAngularVelocity(id, t.v); }
  get _t() { const J = this.J; return this.__t || (this.__t = { q: new J.Quat(0, 0, 0, 1), v: new J.Vec3(0, 0, 0), w: new J.Vec3(0, 0, 0) }); }
  // passive drive on joint k, constraint axis i (0 twist, 1 swing Y, 2 swing Z): implicit spring k (N·m/rad) + damper c (N·m·s/rad), |τ| ≤ lim
  setDrive(k, i, stiffness, damping, lim) { const ms = this.cons[k].c.GetMotorSettings(this._axes.rot[i]), sp = ms.mSpringSettings, [lo, hi] = Array.isArray(lim) ? lim : [-lim, lim];
    sp.mMode = this.J.ESpringMode_StiffnessAndDamping; sp.mStiffness = stiffness; sp.mDamping = damping; ms.mMinTorqueLimit = lo; ms.mMaxTorqueLimit = hi; }
  driveOn(k, i) { this.cons[k].c.SetMotorState(this._axes.rot[i], this.J.EMotorState_PositionAndVelocity); }
  setDriveTarget(k, q, w) { const t = this._t, c = this.cons[k].c; t.q.Set(q[0], q[1], q[2], q[3]); c.SetTargetOrientationCS(t.q); if (w) t.w.Set(w[0], w[1], w[2]); else t.w.Set(0, 0, 0); c.SetTargetAngularVelocityCS(t.w); }
  // Jolt CLAMPS a target orientation onto the joint's limits (SixDOFConstraint::SetTargetOrientationCS → ClampSwingTwist: locked axes → 0,
  // limited axes → inside the engine stop). The stored target and Jolt's own constraint-space rotation give the exact motor error it will use.
  setDriveVel(k, w) { const t = this._t; t.w.Set(w[0], w[1], w[2]); this.cons[k].c.SetTargetAngularVelocityCS(t.w); }
  driveTarget(k) { const t = this.cons[k].c.GetTargetOrientationCS(); return [t.GetX(), t.GetY(), t.GetZ(), t.GetW()]; }
  rotationCS(k) { const q = this.cons[k].c.GetRotationInConstraintSpace(); return [q.GetX(), q.GetY(), q.GetZ(), q.GetW()]; }
  // equal-and-opposite torque (N·m, world) on a joint's child (+) and parent (−) for the next step — internal, momentum-conserving
  addTorquePair(parent, child, T) { const t = this._t; t.v.Set(T[0], T[1], T[2]); this.bi.AddTorque(this.bodies[child].GetID(), t.v, this.J.EActivation_Activate); t.v.Set(-T[0], -T[1], -T[2]); this.bi.AddTorque(this.bodies[parent].GetID(), t.v, this.J.EActivation_Activate); }
  lambdaPos(k) { const l = this.cons[k].c.GetTotalLambdaPosition(); return [l.GetX(), l.GetY(), l.GetZ()]; }
  lambdaRot(k) { const l = this.cons[k].c.GetTotalLambdaRotation(); return [l.GetX(), l.GetY(), l.GetZ()]; }
  lambdaMotor(k) { const l = this.cons[k].c.GetTotalLambdaMotorRotation(); return [l.GetX(), l.GetY(), l.GetZ()]; }
  rotCS(k) { const q = this.cons[k].c.GetRotationInConstraintSpace(); return [q.GetX(), q.GetY(), q.GetZ(), q.GetW()]; }
  setKinematic(i) { this.bi.SetMotionType(this.bodies[i].GetID(), this.J.EMotionType_Kinematic, this.J.EActivation_Activate); }
  saveState() { const rec = new this.J.StateRecorderImpl(); this.ps.SaveState(rec, this.J.EStateRecorderState_All); return rec; }
  restoreState(rec) { rec.Rewind(); this.ps.RestoreState(rec); this.contacts = []; }
  freeState(rec) { this.J.destroy(rec); }
  read(i) { const b = this.bodies[i], p = b.GetPosition(), r = b.GetRotation(), c = b.GetCenterOfMassPosition(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity();
    return { pos: [p.GetX(), p.GetY(), p.GetZ()], rot: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], com: [c.GetX(), c.GetY(), c.GetZ()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [w.GetX(), w.GetY(), w.GetZ()] }; }
  // ── readback of everything the spec asked for (G0 0.11) ──
  readbackBody(i) {
    const J = this.J, b = this.bodies[i], mp = b.GetMotionProperties(), invM = mp.GetInverseMass(), Ii = mp.GetLocalSpaceInverseInertia();
    const col = (m, k) => { const v = k === 0 ? m.GetAxisX() : k === 1 ? m.GetAxisY() : m.GetAxisZ(); return [v.GetX(), v.GetY(), v.GetZ()]; };
    const invI = [col(Ii, 0), col(Ii, 1), col(Ii, 2)];                                       // columns
    const inv3 = (C) => {                                                                    // C = columns; symmetric 3×3 inverse
      const m = [[C[0][0], C[1][0], C[2][0]], [C[0][1], C[1][1], C[2][1]], [C[0][2], C[1][2], C[2][2]]];
      const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const cof = (r, c) => { const rs = [0, 1, 2].filter(x => x !== r), cs = [0, 1, 2].filter(x => x !== c); return ((r + c) % 2 ? -1 : 1) * (m[rs[0]][cs[0]] * m[rs[1]][cs[1]] - m[rs[0]][cs[1]] * m[rs[1]][cs[0]]); };
      return [0, 1, 2].map(r => [0, 1, 2].map(c => cof(c, r) / det)); };
    const com = b.GetCenterOfMassPosition(), pos = b.GetPosition(), rot = b.GetRotation();
    // Jolt stores the inertia in the body's principal frame internally; GetLocalSpaceInverseInertia returns it in body space (rotation identity at build)
    return { mass: 1 / invM, inertia: inv3(invI), comWorld: [com.GetX(), com.GetY(), com.GetZ()], origin: [pos.GetX(), pos.GetY(), pos.GetZ()], rot: [rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW()],
      linDamp: mp.GetLinearDamping(), angDamp: mp.GetAngularDamping(), maxAngVel: mp.GetMaxAngularVelocity(), volume: this.shapeInfo[i].volume, gravityFactor: mp.GetGravityFactor ? mp.GetGravityFactor() : null };
  }
  readbackJoint(k) {
    const J = this.J, C = this.cons[k], c = C.c, A = this._axes;
    const m4 = (M) => { const ax = [M.GetAxisX(), M.GetAxisY(), M.GetAxisZ()].map(v => [v.GetX(), v.GetY(), v.GetZ()]), t = M.GetTranslation(); return { x: ax[0], y: ax[1], z: ax[2], t: [t.GetX(), t.GetY(), t.GetZ()] }; };
    const lo = c.GetRotationLimitsMin(), hi = c.GetRotationLimitsMax(), q = c.GetRotationInConstraintSpace();
    return { toBody1: m4(c.GetConstraintToBody1Matrix()), toBody2: m4(c.GetConstraintToBody2Matrix()),
      rotLo: [lo.GetX(), lo.GetY(), lo.GetZ()], rotHi: [hi.GetX(), hi.GetY(), hi.GetZ()], qCS: [q.GetX(), q.GetY(), q.GetZ(), q.GetW()],
      fixedLin: A.lin.map(ax => c.IsFixedAxis(ax)), fixedRot: A.rot.map(ax => c.IsFixedAxis(ax)),
      motorState: A.rot.map(ax => c.GetMotorState(ax)), motorOff: J.EMotorState_Off,
      motorLimits: A.rot.map(ax => { const ms = c.GetMotorSettings(ax); return [ms.mMinTorqueLimit, ms.mMaxTorqueLimit]; }),
      friction: A.rot.map(ax => c.GetMaxFriction(ax)) };
  }
  // triangles of one body's compound shape in BODY-LOCAL coordinates (origin = proximal joint) — for the viewer: exactly what Jolt collides with
  bodyTriangles(i) {
    const J = this.J, shape = this.shapeInfo[i].shape, comL = shape.GetCenterOfMass();
    const ctx = new J.ShapeGetTriangles(shape, J.AABox.prototype.sBiggest(), comL, J.Quat.prototype.sIdentity(), new J.Vec3(1, 1, 1));
    const f = new Float32Array(J.HEAPF32.buffer, ctx.GetVerticesData(), ctx.GetVerticesSize() / 4).slice(); J.destroy(ctx); return f;
  }
  destroy() { this.J.destroy(this.jolt); }
}
