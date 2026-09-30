// ═══ spikes/substrate/spike_rapier.js — Rapier 0.21 (deterministic-compat build) on the common scene ═══════════════════════════════
"use strict";
const C = require("./common.js"), { S, v3, q } = C;
const PKG = process.env.RAPIER_PKG || "@dimforge/rapier3d-deterministic-compat";
let R = null;
const V = (a) => ({ x: a[0], y: a[1], z: a[2] }), Q = (a) => ({ x: a[0], y: a[1], z: a[2], w: a[3] });
const A = (o) => [o.x, o.y, o.z], AQ = (o) => [o.x, o.y, o.z, o.w];

const adapter = {
  async build(cs, variant) {
    if (!R) { R = C.dep(PKG); await R.init(); }
    const world = new R.World({ x: 0, y: -9.81, z: 0 });
    const ip = world.integrationParameters;
    if (variant.iters) ip.numSolverIterations = variant.iters;
    if (variant.pred != null) ip.normalizedPredictionDistance = variant.pred;          // speculative-contact margin (m, lengthUnit = 1)
    if (variant.cnf) ip.contact_natural_frequency = variant.cnf;                      // contact softness (Hz)
    const body = (desc, shapeDesc) => { const b = world.createRigidBody(desc); const c = world.createCollider(shapeDesc, b); return { b, c }; };
    const ground = body(R.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0), R.ColliderDesc.cuboid(20, 0.5, 20));
    const dyn = (spec, pos, rot, capHalf, r, name) => {
      let d = R.RigidBodyDesc.dynamic().setTranslation(pos[0], pos[1], pos[2]).setRotation(Q(rot)).setCanSleep(false)
        .setAdditionalMassProperties(spec.m, V([0, 0, 0]), V(spec.I), Q([0, 0, 0, 1]));
      if (variant.ccd && (!variant.ccdOnly || variant.ccdOnly.includes(name))) d = d.setCcdEnabled(true);
      if (variant.softCcd && (!variant.softOnly || variant.softOnly.includes(name))) d = d.setSoftCcdPrediction(variant.softCcd);
      return body(d, R.ColliderDesc.capsule(capHalf, r).setDensity(0).setFriction(0.5).setRestitution(0));
    };
    const hip = body(R.RigidBodyDesc.fixed().setTranslation(...S.hip), R.ColliderDesc.ball(0.01).setSensor(true));
    const thigh = dyn(S.thigh, S.thigh.c, [0, 0, 0, 1], S.thigh.half, S.thigh.r, "thigh");
    const shank = dyn(S.shank, S.shank.c, [0, 0, 0, 1], S.shank.half, S.shank.r, "shank");
    const jHip = world.createImpulseJoint(R.JointData.spherical(V([0, 0, 0]), V([0, S.thigh.half, 0])), hip.b, thigh.b, true);
    // ASYMMETRIC anatomical limits per angular axis (hip: flex 120 / ext 30, abd 45 / add 30, twist ±40) via the raw per-axis setter
    const raw = world.impulseJoints.raw;
    raw.jointSetLimits(jHip.handle, R.JointAxis.AngX, -2.094, 0.524);
    raw.jointSetLimits(jHip.handle, R.JointAxis.AngZ, -0.524, 0.785);
    raw.jointSetLimits(jHip.handle, R.JointAxis.AngY, -0.698, 0.698);
    const kd = R.JointData.revolute(V([0, -S.thigh.half, 0]), V([0, S.shank.half, 0]), V([1, 0, 0])); kd.limitsEnabled = true; kd.limits = [-2.44, 0.05];
    const jKnee = world.createImpulseJoint(kd, thigh.b, shank.b, true);
    jHip.setContactsEnabled(false); jKnee.setContactsEnabled(false);
    let sweeper, pivot = null, omega = 0;
    if (cs.kind === "rot") {
      omega = cs.vHit / S.sweep.rHit; const th0 = cs.theta0 != null ? cs.theta0 : S.sweep.theta0, rot = C.sweepRot(th0), d = q.rot(rot, [0, 1, 0]);
      const pos = v3.add(S.pivot, v3.sc(d, S.sweep.mid));
      pivot = body(R.RigidBodyDesc.fixed().setTranslation(...S.pivot), R.ColliderDesc.ball(0.01).setSensor(true));
      sweeper = dyn(S.sweep, pos, rot, S.sweep.half, S.sweep.r, "sweeper");
      const axis2 = q.rot(q.conj(rot), [0, 1, 0]);
      const jd = R.JointData.revoluteWithAxes(V([0, 0, 0]), V([0, -S.sweep.mid, 0]), V([0, 1, 0]), V(axis2));
      const jS = world.createImpulseJoint(jd, pivot.b, sweeper.b, true); jS.setContactsEnabled(false);
      jS.configureMotorModel(R.MotorModel.ForceBased); jS.configureMotorVelocity(omega, 60.0); jS.setMotorMaxForce(400);   // strongly intentional sweep, capped at 400 N·m
      sweeper.b.setAngvel(V([0, omega, 0]), true); sweeper.b.setLinvel(V(v3.cross([0, omega, 0], v3.sub(pos, S.pivot))), true);
    } else {
      sweeper = dyn(S.lin, cs.c0 || S.lin.c0, C.linRot, S.lin.half, S.lin.r, "sweeper"); sweeper.b.setLinvel(V([0, 0, cs.vHit]), true);
    }
    const B = { thigh: thigh.b, shank: shank.b, sweeper: sweeper.b };
    const pose = (n) => { const b = B[n]; return { p: A(b.translation()), q: AQ(b.rotation()), v: A(b.linvel()), w: A(b.angvel()) }; };
    return {
      step(h) {
        world.timestep = h;
        const t = C.pdTorques(pose("thigh"), pose("shank"), h);
        thigh.b.applyTorqueImpulse(V(v3.sc(t.thigh, h)), true); shank.b.applyTorqueImpulse(V(v3.sc(t.shank, h)), true);
        world.step();
      },
      pose,
      contacts() { const out = []; world.contactPair(sweeper.c, shank.c, (m) => { for (let i = 0; i < m.numContacts(); i++) out.push({ dist: m.contactDist(i), impulse: m.contactImpulse(i) }); }); return out; },
      free() { world.free(); },
    };
  },
};
module.exports = adapter;
if (require.main === module) (async () => {
  const variants = [
    { name: "discrete_1" }, { name: "ccd_all", ccd: true }, { name: "ccd_fastOnly", ccd: true, ccdOnly: ["sweeper"] },
    { name: "softccd_0.5", softCcd: 0.5 }, { name: "pred_0.25", pred: 0.25 },
    { name: "sub4", sub: 4 }, { name: "sub4_cnf120", sub: 4, cnf: 120 }, { name: "pred.25_cnf120", pred: 0.25, cnf: 120 },
    { name: "adaptive", adaptive: true }, { name: "adapt_pred.25_120", adaptive: true, pred: 0.25, cnf: 120 },
    { name: "ccdFast_cnf120", ccd: true, ccdOnly: ["sweeper"], cnf: 120 }, { name: "ccdFast_pred_adapt120", ccd: true, ccdOnly: ["sweeper"], pred: 0.25, adaptive: true, cnf: 120 },
    { name: "ccdF_pred_adapt120_it8", ccd: true, ccdOnly: ["sweeper"], pred: 0.25, adaptive: true, cnf: 120, iters: 8 },
  ];
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const res = await C.runAll(adapter, only ? variants.filter(v => only.includes(v.name)) : variants);
  C.printTable("RAPIER " + PKG, res);
  if (process.env.DUMP) console.log(JSON.stringify(res.map(r => ({ case: r.case, variant: r.variant, reported: r.reported, rows: r.rows.slice(0, 10) })), null, 0));
})().catch(e => { console.error(e); process.exit(1); });
