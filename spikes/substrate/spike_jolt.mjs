// ═══ spikes/substrate/spike_jolt.mjs — JoltPhysics.js 1.1 (single-threaded wasm-compat build) on the common scene ═══════════════════
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const C = require("./common.js"), { S, v3, q } = C;
const DEPS = process.env.PHYS_SPIKE_DEPS || "/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4/scratchpad/physspike/node_modules";
const initJolt = (await import(DEPS + "/jolt-physics/dist/jolt-physics.wasm-compat.js")).default;
const J = await initJolt();

const L_STATIC = 0, L_MOVING = 1;
const adapter = {
  async build(cs, variant) {
    const settings = new J.JoltSettings();
    const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(L_STATIC, L_MOVING); opf.EnableCollision(L_MOVING, L_MOVING);
    const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(L_STATIC, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(L_MOVING, new J.BroadPhaseLayer(1));
    settings.mObjectLayerPairFilter = opf; settings.mBroadPhaseLayerInterface = bpi;
    settings.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface, 2, settings.mObjectLayerPairFilter, 2);
    const jolt = new J.JoltInterface(settings); J.destroy(settings);
    const ps = jolt.GetPhysicsSystem(), bi = ps.GetBodyInterface();
    ps.SetGravity(new J.Vec3(0, -9.81, 0));
    const pset = ps.GetPhysicsSettings();
    if (variant.spec != null) pset.mSpeculativeContactDistance = variant.spec;            // default 0.02 m
    if (variant.velSteps) pset.mNumVelocitySteps = variant.velSteps;
    if (variant.slop != null) pset.mPenetrationSlop = variant.slop;
    if (variant.posSteps) pset.mNumPositionSteps = variant.posSteps;                        // default 2                          // default 0.02 m (tolerated overlap)
    if (variant.baum != null) pset.mBaumgarte = variant.baum;                               // default 0.2
    ps.SetPhysicsSettings(pset);
    // collision filter: jointed pairs must not collide → a GroupFilterTable (the ragdoll pattern)
    const gft = new J.GroupFilterTable(4); gft.DisableCollision(0, 1); gft.DisableCollision(1, 2); gft.DisableCollision(0, 2);   // hip, thigh, shank
    const mk = (shape, pos, rot, motion, layer, spec, sub) => {
      const bcs = new J.BodyCreationSettings(shape, new J.RVec3(pos[0], pos[1], pos[2]), new J.Quat(rot[0], rot[1], rot[2], rot[3]), motion, layer);
      bcs.mAllowSleeping = false; bcs.mFriction = 0.5; bcs.mRestitution = 0;
      if (sub != null) { bcs.mCollisionGroup.SetGroupFilter(gft); bcs.mCollisionGroup.SetGroupID(0); bcs.mCollisionGroup.SetSubGroupID(sub); }
      if (spec) {
        bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided;
        const mp = bcs.mMassPropertiesOverride; mp.mMass = spec.m; const I = J.Mat44.prototype.sIdentity();
        I.SetAxisX(new J.Vec3(spec.I[0], 0, 0)); I.SetAxisY(new J.Vec3(0, spec.I[1], 0)); I.SetAxisZ(new J.Vec3(0, 0, spec.I[2])); mp.mInertia = I;
        if (variant.linearCast) bcs.mMotionQuality = J.EMotionQuality_LinearCast;
      }
      const b = bi.CreateBody(bcs); bi.AddBody(b.GetID(), J.EActivation_Activate); J.destroy(bcs); return b;
    };
    mk(new J.BoxShape(new J.Vec3(20, 0.5, 20), 0.05, null), [0, -0.5, 0], [0, 0, 0, 1], J.EMotionType_Static, L_STATIC);
    const hip = mk(new J.SphereShape(0.01), S.hip, [0, 0, 0, 1], J.EMotionType_Static, L_STATIC, null, 0);
    const thigh = mk(new J.CapsuleShape(S.thigh.half, S.thigh.r), S.thigh.c, [0, 0, 0, 1], J.EMotionType_Dynamic, L_MOVING, S.thigh, 1);
    const shank = mk(new J.CapsuleShape(S.shank.half, S.shank.r), S.shank.c, [0, 0, 0, 1], J.EMotionType_Dynamic, L_MOVING, S.shank, 2);
    // hip: SixDOF with ASYMMETRIC per-axis rotation limits (pyramid swing) — flex 120 / ext 30, abd 45 / add 30, twist ±40
    const hs = new J.SixDOFConstraintSettings(); hs.mSpace = J.EConstraintSpace_WorldSpace;
    hs.mPosition1 = hs.mPosition2 = new J.RVec3(...S.hip); hs.mAxisX1 = hs.mAxisX2 = new J.Vec3(0, -1, 0); hs.mAxisY1 = hs.mAxisY2 = new J.Vec3(1, 0, 0);
    hs.mSwingType = J.ESwingType_Pyramid;
    for (const ax of [J.SixDOFConstraintSettings_EAxis_TranslationX, J.SixDOFConstraintSettings_EAxis_TranslationY, J.SixDOFConstraintSettings_EAxis_TranslationZ]) hs.MakeFixedAxis(ax);
    hs.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationX, -0.698, 0.698);          // twist (about the femur)
    hs.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationY, -2.094, 0.524);          // flex / ext
    hs.SetLimitedAxis(J.SixDOFConstraintSettings_EAxis_RotationZ, -0.524, 0.785);          // add / abd
    ps.AddConstraint(hs.Create(hip, thigh));
    const ks = new J.HingeConstraintSettings(); ks.mSpace = J.EConstraintSpace_WorldSpace; ks.mPoint1 = ks.mPoint2 = new J.RVec3(...S.knee);
    ks.mHingeAxis1 = ks.mHingeAxis2 = new J.Vec3(1, 0, 0); ks.mNormalAxis1 = ks.mNormalAxis2 = new J.Vec3(0, -1, 0); ks.mLimitsMin = -2.44; ks.mLimitsMax = 0.05;
    ps.AddConstraint(ks.Create(thigh, shank));
    let sweeper;
    if (cs.kind === "rot") {
      const omega = cs.vHit / S.sweep.rHit, rot = C.sweepRot(cs.theta0 != null ? cs.theta0 : S.sweep.theta0), d = q.rot(rot, [0, 1, 0]), pos = v3.add(S.pivot, v3.sc(d, S.sweep.mid));
      const pivot = mk(new J.SphereShape(0.01), S.pivot, [0, 0, 0, 1], J.EMotionType_Static, L_STATIC);
      sweeper = mk(new J.CapsuleShape(S.sweep.half, S.sweep.r), pos, rot, J.EMotionType_Dynamic, L_MOVING, S.sweep, 3);
      const ss = new J.HingeConstraintSettings(); ss.mSpace = J.EConstraintSpace_WorldSpace; ss.mPoint1 = ss.mPoint2 = new J.RVec3(...S.pivot);
      ss.mHingeAxis1 = ss.mHingeAxis2 = new J.Vec3(0, 1, 0); ss.mNormalAxis1 = ss.mNormalAxis2 = new J.Vec3(1, 0, 0);
      ss.mMotorSettings.mMinTorqueLimit = -400; ss.mMotorSettings.mMaxTorqueLimit = 400;
      const hc = J.castObject(ss.Create(pivot, sweeper), J.HingeConstraint); ps.AddConstraint(hc);
      hc.SetMotorState(J.EMotorState_Velocity); hc.SetTargetAngularVelocity(omega);
      bi.SetAngularVelocity(sweeper.GetID(), new J.Vec3(0, omega, 0));
      const lv = v3.cross([0, omega, 0], v3.sub(pos, S.pivot)); bi.SetLinearVelocity(sweeper.GetID(), new J.Vec3(...lv));
    } else {
      sweeper = mk(new J.CapsuleShape(S.lin.half, S.lin.r), cs.c0 || S.lin.c0, C.linRot, J.EMotionType_Dynamic, L_MOVING, S.lin, 3);
      bi.SetLinearVelocity(sweeper.GetID(), new J.Vec3(0, 0, cs.vHit));
    }
    // contact listener: what JS can see (penetration depth, normal, points) — impulses are NOT exposed after the solve
    const seen = []; const idSw = sweeper.GetID().GetIndexAndSequenceNumber(), idSh = shank.GetID().GetIndexAndSequenceNumber();
    const listener = new J.ContactListenerJS();
    listener.OnContactValidate = () => J.ValidateResult_AcceptAllContactsForThisBodyPair;
    const onC = (b1p, b2p, mp) => { const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), i1 = b1.GetID().GetIndexAndSequenceNumber(), i2 = b2.GetID().GetIndexAndSequenceNumber();
      if ((i1 === idSw && i2 === idSh) || (i1 === idSh && i2 === idSw)) { const m = J.wrapPointer(mp, J.ContactManifold); seen.push({ dist: -m.mPenetrationDepth, impulse: null }); } };
    listener.OnContactAdded = onC; listener.OnContactPersisted = onC; listener.OnContactRemoved = () => {};
    ps.SetContactListener(listener);
    const B = { thigh, shank, sweeper };
    const pose = (n) => { const b = B[n], p = b.GetPosition(), r = b.GetRotation(), v = b.GetLinearVelocity(), w = b.GetAngularVelocity();
      return { p: [p.GetX(), p.GetY(), p.GetZ()], q: [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], v: [v.GetX(), v.GetY(), v.GetZ()], w: [w.GetX(), w.GetY(), w.GetZ()] }; };
    const tv = new J.Vec3(0, 0, 0);
    return {
      step(h) {
        const t = C.pdTorques(pose("thigh"), pose("shank"), h);
        tv.Set(t.thigh[0] * h, t.thigh[1] * h, t.thigh[2] * h); bi.AddAngularImpulse(thigh.GetID(), tv);
        tv.Set(t.shank[0] * h, t.shank[1] * h, t.shank[2] * h); bi.AddAngularImpulse(shank.GetID(), tv);
        seen.length = 0; jolt.Step(h, variant.collSteps || 1);
      },
      pose, contacts() { return seen.slice(); },
      free() { J.destroy(jolt); },
    };
  },
};
const variants = [
  { name: "discrete_1" }, { name: "linearcast_1", linearCast: true }, { name: "spec_0.25", spec: 0.25 },
  { name: "collSteps4", collSteps: 4 }, { name: "sub4", sub: 4 }, { name: "adaptive", adaptive: true },
  { name: "adapt_spec.25", adaptive: true, spec: 0.25 }, { name: "lcast_spec.25", linearCast: true, spec: 0.25 },
  { name: "adapt_spec_slop2", adaptive: true, spec: 0.25, slop: 0.002 }, { name: "adapt_spec_slop2_b.5", adaptive: true, spec: 0.25, slop: 0.002, baum: 0.5 },
  { name: "sub2_spec_slop2", sub: 2, spec: 0.25, slop: 0.002 },
  { name: "adapt_spec_slop2_pos8", adaptive: true, spec: 0.25, slop: 0.002, posSteps: 8 },
];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const res = await C.runAll(adapter, only ? variants.filter(v => only.includes(v.name)) : variants);
C.printTable("JOLT jolt-physics 1.1.0 (wasm-compat, single-threaded)", res);
if (process.env.DUMP) for (const r of res.filter(r => r.case === "ROT_15")) { console.log(r.variant, JSON.stringify(r.reported)); for (const row of r.rows.slice(0, 8)) console.log("  ", JSON.stringify(row)); }
