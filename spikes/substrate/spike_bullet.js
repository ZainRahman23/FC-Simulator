// ═══ spikes/substrate/spike_bullet.js — Bullet via ammo.js (kripken builds, 2026-09 wasm) on the common scene ═══════════════════════
"use strict";
const path = require("path");
const C = require("./common.js"), { S, v3, q } = C;
const AMMO_DIR = process.env.AMMO_DIR || "/private/tmp/claude-501/-Users-zainrahman-Downloads-FC-Simulator/6a70b682-ea7e-4ecb-991b-1bb65e5cd9c4/scratchpad/physspike/ammo";
let A = null;
const adapter = {
  async build(cs, variant) {
    if (!A) A = await require(path.join(AMMO_DIR, "ammo.wasm.js"))({ locateFile: (f) => path.join(AMMO_DIR, f) });
    const cfg = new A.btDefaultCollisionConfiguration(), disp = new A.btCollisionDispatcher(cfg), bp = new A.btDbvtBroadphase(), solver = new A.btSequentialImpulseConstraintSolver();
    const world = new A.btDiscreteDynamicsWorld(disp, bp, solver, cfg); world.setGravity(new A.btVector3(0, -9.81, 0));
    const si = world.getSolverInfo(); if (variant.iters) si.set_m_numIterations(variant.iters);
    const V = (a) => new A.btVector3(a[0], a[1], a[2]);
    const T = (p, r) => { const t = new A.btTransform(); t.setIdentity(); t.setOrigin(V(p)); t.setRotation(new A.btQuaternion(r[0], r[1], r[2], r[3])); return t; };
    const mk = (shape, p, r, spec, idx) => {
      const m = spec ? spec.m : 0, I = spec ? V(spec.I) : V([0, 0, 0]);
      const b = new A.btRigidBody(new A.btRigidBodyConstructionInfo(m, new A.btDefaultMotionState(T(p, r)), shape, I));
      b.setFriction(0.5); b.setRestitution(0); b.setActivationState(4); b.setUserIndex(idx);
      if (spec && variant.ccd) { b.setCcdMotionThreshold(0.5 * spec.r); b.setCcdSweptSphereRadius(0.8 * spec.r); }   // Bullet CCD: swept SPHERE of the body's centre
      world.addRigidBody(b); return b;
    };
    mk(new A.btBoxShape(V([20, 0.5, 20])), [0, -0.5, 0], [0, 0, 0, 1], null, 0);
    const hip = mk(new A.btSphereShape(0.01), S.hip, [0, 0, 0, 1], null, 1);
    const thigh = mk(new A.btCapsuleShape(S.thigh.r, 2 * S.thigh.half), S.thigh.c, [0, 0, 0, 1], S.thigh, 2);
    const shank = mk(new A.btCapsuleShape(S.shank.r, 2 * S.shank.half), S.shank.c, [0, 0, 0, 1], S.shank, 3);
    // hip: generic 6-DOF with ASYMMETRIC angular limits (x = flex/ext, y = twist, z = abd/add) — Bullet's per-axis (Euler) limits
    if (variant.hingeHip) { const p2p = new A.btPoint2PointConstraint(hip, thigh, V([0, 0, 0]), V([0, S.thigh.half, 0])); world.addConstraint(p2p, true); } else {
    const g6 = new A.btGeneric6DofConstraint(hip, thigh, T([0, 0, 0], [0, 0, 0, 1]), T([0, S.thigh.half, 0], [0, 0, 0, 1]), true);
    g6.setLinearLowerLimit(V([0, 0, 0])); g6.setLinearUpperLimit(V([0, 0, 0]));
    g6.setAngularLowerLimit(V([-2.094, -0.698, -0.524])); g6.setAngularUpperLimit(V([0.524, 0.698, 0.785]));
    world.addConstraint(g6, true); }
    const knee = new A.btHingeConstraint(thigh, shank, V([0, -S.thigh.half, 0]), V([0, S.shank.half, 0]), V([1, 0, 0]), V([1, 0, 0]), true);
    knee.setLimit(-2.44, 0.05, 0.9, 0.3, 1.0); world.addConstraint(knee, true);
    let sweeper, omega = 0;
    if (cs.kind === "rot") {
      omega = cs.vHit / S.sweep.rHit; const rot = C.sweepRot(cs.theta0 != null ? cs.theta0 : S.sweep.theta0), d = q.rot(rot, [0, 1, 0]), pos = v3.add(S.pivot, v3.sc(d, S.sweep.mid));
      const pivot = mk(new A.btSphereShape(0.01), S.pivot, [0, 0, 0, 1], null, 4);
      sweeper = mk(new A.btCapsuleShape(S.sweep.r, 2 * S.sweep.half), pos, rot, S.sweep, 5);
      const axis2 = q.rot(q.conj(rot), [0, 1, 0]);
      const hc = new A.btHingeConstraint(pivot, sweeper, V([0, 0, 0]), V([0, -S.sweep.mid, 0]), V([0, 1, 0]), V(axis2), true);
      world.addConstraint(hc, true);
      hc.enableAngularMotor(true, omega, 400 * C.DT);                                 // max motor IMPULSE per step (≈ 400 N·m at 60 Hz)
      sweeper.setAngularVelocity(V([0, omega, 0])); sweeper.setLinearVelocity(V(v3.cross([0, omega, 0], v3.sub(pos, S.pivot))));
      sweeper._hc = hc;
    } else {
      sweeper = mk(new A.btCapsuleShape(S.lin.r, 2 * S.lin.half), cs.c0 || S.lin.c0, C.linRot, S.lin, 5); sweeper.setLinearVelocity(V([0, 0, cs.vHit]));
    }
    const B = { thigh, shank, sweeper }, tmp = new A.btTransform();
    const pose = (n) => { const b = B[n]; b.getMotionState().getWorldTransform(tmp); const o = tmp.getOrigin(), r = tmp.getRotation(), v = b.getLinearVelocity(), w = b.getAngularVelocity();
      return { p: [o.x(), o.y(), o.z()], q: [r.x(), r.y(), r.z(), r.w()], v: [v.x(), v.y(), v.z()], w: [w.x(), w.y(), w.z()] }; };
    const tv = new A.btVector3(0, 0, 0);
    return {
      step(h) {
        const t = variant.noPD ? { thigh: [0, 0, 0], shank: [0, 0, 0] } : C.pdTorques(pose("thigh"), pose("shank"), h);
        tv.setValue(t.thigh[0] * h, t.thigh[1] * h, t.thigh[2] * h); thigh.applyTorqueImpulse(tv);
        tv.setValue(t.shank[0] * h, t.shank[1] * h, t.shank[2] * h); shank.applyTorqueImpulse(tv);
        if (sweeper._hc) sweeper._hc.enableAngularMotor(true, omega, 400 * h);
        world.stepSimulation(h, 1, h);                                                 // exactly one internal step of length h
      },
      pose,
      contacts() { const out = []; const n = disp.getNumManifolds();
        for (let i = 0; i < n; i++) { const m = disp.getManifoldByIndexInternal(i), a = m.getBody0().getUserIndex(), b = m.getBody1().getUserIndex();
          if (!((a === 5 && b === 3) || (a === 3 && b === 5))) continue;
          for (let j = 0; j < m.getNumContacts(); j++) { const p = m.getContactPoint(j); out.push({ dist: p.getDistance(), impulse: p.getAppliedImpulse() }); } }
        return out; },
      free() { A.destroy(world); },
    };
  },
};
module.exports = adapter;
if (require.main === module) (async () => {
  const variants = [{ name: "discrete_1" }, { name: "ccd_1", ccd: true }, { name: "sub4", sub: 4 }, { name: "adaptive", adaptive: true },
    { name: "ccd_adaptive", ccd: true, adaptive: true }, { name: "adaptive_it20", adaptive: true, iters: 20 },
    { name: "discrete_noPD", noPD: true }, { name: "discrete_hingeHip", hingeHip: true }];
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const res = await C.runAll(adapter, only ? variants.filter(v => only.includes(v.name)) : variants);
  C.printTable("BULLET ammo.js (kripken builds 2026-09-22, Bullet 2.82-based)", res);
})().catch(e => { console.error(e); process.exit(1); });
