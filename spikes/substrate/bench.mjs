// ═══ spikes/substrate/bench.mjs — SCALE / REST probe (not a humanoid): two chains of 14 jointed capsules (28 bodies, 26 ball joints)
// dropped on the turf; every frame: 26 torque impulses written + 28 transforms read (the JS↔WASM traffic a controller would cause).
// Reports ms per 60 Hz frame at 1 and 4 steps/frame, residual motion after settling (rest stability), and a repeatability hash.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const path = require("path");
const DEPS = process.env.PHYS_SPIKE_DEPS || "/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4/scratchpad/physspike/node_modules";
const AMMO_DIR = path.join(DEPS, "..", "ammo");
const TQ = +(process.env.TQ ?? 0.001); const N = 14, FR = 300, R = 0.05, HALF = 0.15;
const which = process.argv[2];
const hash = (vals) => { let h = 2166136261 >>> 0; for (const x of vals) { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } } return h.toString(16); };
async function make() {
  if (which === "rapier") {
    const RA = require(path.join(DEPS, "@dimforge/rapier3d-deterministic-compat")); await RA.init();
    return (steps) => { const w = new RA.World({ x: 0, y: -9.81, z: 0 }); w.timestep = 1 / 60 / steps;
      const g = w.createRigidBody(RA.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)); w.createCollider(RA.ColliderDesc.cuboid(20, 0.5, 20), g);
      const bodies = [];
      for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
        const b = w.createRigidBody(RA.RigidBodyDesc.dynamic().setTranslation(i * 2 * (HALF + R) * 0.9, 0.6 + 0.02 * i, c * 1.0).setRotation({ x: 0, y: 0, z: -0.7071, w: 0.7071 }).setCanSleep(false));
        w.createCollider(RA.ColliderDesc.capsule(HALF, R).setDensity(1000), b); bodies.push(b);
        if (i) { const j = w.createImpulseJoint(RA.JointData.spherical({ x: 0, y: HALF + R, z: 0 }, { x: 0, y: -(HALF + R), z: 0 }), bodies[bodies.length - 2], b, true); j.setContactsEnabled(false); }
      }
      return { step() { for (let s = 0; s < steps; s++) { for (const b of bodies) b.applyTorqueImpulse({ x: 0, y: TQ, z: 0 }, true); w.step(); } },
        read() { const o = []; for (const b of bodies) { const t = b.translation(), r = b.rotation(), v = b.linvel(); o.push(t.x, t.y, t.z, r.x, r.y, r.z, r.w, v.x, v.y, v.z); } return o; }, free() { w.free(); } }; };
  }
  if (which === "jolt") {
    const J = await (await import(DEPS + "/jolt-physics/dist/jolt-physics.wasm-compat.js")).default();
    return (steps) => { const st = new J.JoltSettings(); const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(0, 1); opf.EnableCollision(1, 1);
      const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
      st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(st.mBroadPhaseLayerInterface, 2, st.mObjectLayerPairFilter, 2);
      const jolt = new J.JoltInterface(st); J.destroy(st); const ps = jolt.GetPhysicsSystem(), bi = ps.GetBodyInterface();
      const gb = new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(20, 0.5, 20), 0.05, null), new J.RVec3(0, -0.5, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0); bi.CreateAndAddBody(gb, J.EActivation_DontActivate);
      const gft = new J.GroupFilterTable(N); for (let i = 1; i < N; i++) gft.DisableCollision(i - 1, i);
      const bodies = [];
      for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
        const s = new J.BodyCreationSettings(new J.CapsuleShape(HALF, R), new J.RVec3(i * 2 * (HALF + R) * 0.9, 0.6 + 0.02 * i, c * 1.0), new J.Quat(0, 0, -0.7071, 0.7071), J.EMotionType_Dynamic, 1);
        s.mAllowSleeping = false; s.mCollisionGroup.SetGroupFilter(gft); s.mCollisionGroup.SetGroupID(c); s.mCollisionGroup.SetSubGroupID(i);
        const b = bi.CreateBody(s); bi.AddBody(b.GetID(), J.EActivation_Activate); bodies.push(b);
        if (i) { const cs = new J.PointConstraintSettings(); cs.mSpace = J.EConstraintSpace_LocalToBodyCOM; cs.mPoint1 = new J.RVec3(0, HALF + R, 0); cs.mPoint2 = new J.RVec3(0, -(HALF + R), 0); ps.AddConstraint(cs.Create(bodies[bodies.length - 2], b)); }
      }
      const tv = new J.Vec3(0, TQ, 0);
      return { step() { for (let s = 0; s < steps; s++) { for (const b of bodies) bi.AddAngularImpulse(b.GetID(), tv); jolt.Step(1 / 60 / steps, 1); } },
        read() { const o = []; for (const b of bodies) { const t = b.GetPosition(), r = b.GetRotation(), v = b.GetLinearVelocity(); o.push(t.GetX(), t.GetY(), t.GetZ(), r.GetX(), r.GetY(), r.GetZ(), r.GetW(), v.GetX(), v.GetY(), v.GetZ()); } return o; }, free() { J.destroy(jolt); } }; };
  }
  if (which === "bullet") {
    const A = await require(path.join(AMMO_DIR, "ammo.wasm.js"))({ locateFile: (f) => path.join(AMMO_DIR, f) });
    return (steps) => { const cfg = new A.btDefaultCollisionConfiguration(), disp = new A.btCollisionDispatcher(cfg), w = new A.btDiscreteDynamicsWorld(disp, new A.btDbvtBroadphase(), new A.btSequentialImpulseConstraintSolver(), cfg);
      w.setGravity(new A.btVector3(0, -9.81, 0)); const T = (x, y, z, q) => { const t = new A.btTransform(); t.setIdentity(); t.setOrigin(new A.btVector3(x, y, z)); t.setRotation(new A.btQuaternion(...q)); return t; };
      w.addRigidBody(new A.btRigidBody(new A.btRigidBodyConstructionInfo(0, new A.btDefaultMotionState(T(0, -0.5, 0, [0, 0, 0, 1])), new A.btBoxShape(new A.btVector3(20, 0.5, 20)), new A.btVector3(0, 0, 0))));
      const bodies = [], shape = new A.btCapsuleShape(R, 2 * HALF), m = 1000 * (Math.PI * R * R * 2 * HALF + 4 / 3 * Math.PI * R ** 3), I = new A.btVector3(0, 0, 0); shape.calculateLocalInertia(m, I);
      for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
        const b = new A.btRigidBody(new A.btRigidBodyConstructionInfo(m, new A.btDefaultMotionState(T(i * 2 * (HALF + R) * 0.9, 0.6 + 0.02 * i, c * 1.0, [0, 0, -0.7071, 0.7071])), shape, I)); b.setActivationState(4); w.addRigidBody(b); bodies.push(b);
        if (i) w.addConstraint(new A.btPoint2PointConstraint(bodies[bodies.length - 2], b, new A.btVector3(0, HALF + R, 0), new A.btVector3(0, -(HALF + R), 0)), true);
      }
      const tv = new A.btVector3(0, TQ, 0), tr = new A.btTransform();
      return { step() { for (let s = 0; s < steps; s++) { for (const b of bodies) b.applyTorqueImpulse(tv); w.stepSimulation(1 / 60 / steps, 1, 1 / 60 / steps); } },
        read() { const o = []; for (const b of bodies) { b.getMotionState().getWorldTransform(tr); const t = tr.getOrigin(), r = tr.getRotation(), v = b.getLinearVelocity(); o.push(t.x(), t.y(), t.z(), r.x(), r.y(), r.z(), r.w(), v.x(), v.y(), v.z()); } return o; }, free() {} }; };
  }
}
const factory = await make();
for (const steps of [1, 4]) {
  const hs = [];
  for (let rep = 0; rep < 2; rep++) {
    const sim = factory(steps); let last = null; const t0 = process.hrtime.bigint(); let restV = 0, maxJump = 0;
    for (let f = 0; f < FR; f++) { sim.step(); const o = sim.read(); if (f >= FR - 60) for (let b = 0; b < 2 * N; b++) restV = Math.max(restV, Math.hypot(o[b * 10 + 7], o[b * 10 + 8], o[b * 10 + 9])); last = o; }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6; hs.push(hash(last));
    if (rep === 1) console.log(`${which.padEnd(7)} steps/frame=${steps}  ${(ms / FR).toFixed(3)} ms/frame (28 bodies, 26 joints)  max body speed in the last second (rest jitter): ${(restV * 1000).toFixed(1)} mm/s  repeatable: ${hs[0] === hs[1]}`);
    sim.free && sim.free();
  }
}
