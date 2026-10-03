// ═══ physchar2/tools/b_k0resim.mjs — INVESTIGATION B item 8: SIMULATE the accepted plant (k = 0) into the reversed-manifold state ═══════════
// Takes a k = 0 G1 resting state, rigidly moves the WHOLE body (a physically identical state on a flat turf: horizontal shift / yaw about the
// vertical) by offsets near a candidate found by b_k0reach.mjs, reads back the boot's actual float32 centre-of-mass transform from Jolt and
// runs the physics step's narrow-phase query on it; on the first offset whose query is reversed, it steps the k = 0 simulation and records
// the event (one-step energy change, boot position-solver move, ankle, joint separation). DIAGNOSTIC ONLY (k must be 0).
// usage: node tools/b_k0resim.mjs --human=V2-REF --key=drop1m --foot=foot_L --axis=x --center=341 --half=2 --step=0.001 [--out=<json>]   (mm)
//        node tools/b_k0resim.mjs --sweep [--humans=... --keys=... --max=4 --out=<json>]   (x / z ±1 m in 1 mm, yaw ±10° in 0.01°, both boots, every resting state)
import fs from "fs";
import { jolt, specOf, makeSim, ledgerTick, V, Q, D, JS } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
if (JS.ankleNeutralKPerDeg() !== 0) { console.error("k must be 0 (the accepted plant)"); process.exit(2); }
const human = arg("human", "V2-REF"), key = arg("key", "drop1m"), foot = arg("foot", "foot_L"), axis = arg("axis", "x"), C = +arg("center", 341), HALF = +arg("half", 2), STEP = +arg("step", 0.001), out = arg("out", null);
const J = await jolt();
// query world (turf only)
const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1; const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(0, 1); opf.EnableCollision(1, 1);
const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, opf, 2);
const ji = new J.JoltInterface(st), qps = ji.GetPhysicsSystem(), qbi = qps.GetBodyInterface();
qbi.AddBody(qbi.CreateBody(new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(50, 1, 50), 0.0, null), new J.RVec3(0, -1, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0)).GetID(), J.EActivation_DontActivate); qps.OptimizeBroadPhase();
const nq = qps.GetNarrowPhaseQuery(), bpf = new J.DefaultBroadPhaseLayerFilter(ji.GetObjectVsBroadPhaseLayerFilter(), 1), olf = new J.DefaultObjectLayerFilter(ji.GetObjectLayerPairFilter(), 1), bf = new J.BodyFilter(), sf = new J.ShapeFilter();
const cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = 0.02; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;   // = spec.contact.speculative
const TPOS = new J.RVec3(0, 0, 0), TROT = new J.Quat(0, 0, 0, 1), ONE = new J.Vec3(1, 1, 1), ZERO = new J.RVec3(0, 0, 0), COLL = new J.CollideShapeAllHitCollisionCollector();   // reused (no per-query heap growth)
function runState(human, key, foot, axis, C, HALF, STEP) {
const spec = specOf(human), s = makeSim(J, spec, key, {}); s.run(); const S0 = s.st.map(x => ({ ...x })), fi = spec.bodies.findIndex(b => b.name === foot);
const reversed = () => { const b = s.w.bodies[fi], T = b.GetCenterOfMassTransform(); COLL.Reset();
  nq.CollideShape(s.w.shapeInfo[fi].shape, ONE, T, cs, ZERO, COLL, bpf, olf, bf, sf); let r = null; const coll = COLL;
  for (let i = 0; i < coll.mHits.size(); i++) { const h = coll.mHits.at(i); if (h.mPenetrationAxis.GetY() > 0) r = { piece: h.mSubShapeID1.GetValue() & 15, depthMm: h.mPenetrationDepth * 1000 }; } return r; };
const place = (d) => { const off = axis === "x" ? [d * 1e-3, 0, 0] : axis === "z" ? [0, 0, d * 1e-3] : [0, 0, 0], piv = S0[fi].com, ry = Q.axis([0, 1, 0], axis === "yaw" ? d / D : 0);
  for (let i = 0; i < s.nb; i++) { const x = S0[i], pp = V.add(V.add(piv, Q.rot(ry, V.sub(x.pos, piv))), off), qq = Q.norm(Q.mul(ry, x.rot)); TPOS.Set(pp[0], pp[1], pp[2]); TROT.Set(qq[0], qq[1], qq[2], qq[3]);
    s.w.bi.SetPositionAndRotation(s.w.bodies[i].GetID(), TPOS, TROT, J.EActivation_Activate); s.w.setVel(i, Q.rot(ry, x.v), Q.rot(ry, x.w)); } };   // reused temporaries (V2JoltWorld.setPose allocates per call)
let found = null, tried = 0;
for (let d = C - HALF; d <= C + HALF + 1e-12 && !found; d += STEP) { tried++; place(d); const r = reversed(); if (r) found = { d: +d.toFixed(6), ...r }; }
const res = { human, key, foot, axis, kNeutral: 0, scanned: tried, found, event: null };
if (found) { place(found.d); s.st = s.read(); s.up = s.P.compute(s.st, s.dt); s._measure(); s.N = s.n + 240; const f0 = s.st[fi], E0 = s.last.E;
  const L = ledgerTick(s), f1 = s.st[fi], k = spec.joints.findIndex(j => j.name === "ankle_" + foot.slice(-1));
  const inv = (q) => s.P.anat(s.P.jd[k], q, "inv"), q0 = s.P.qcs(s.P.jd[k], L.S0.map(x => x.rot)), q1 = s.P.qcs(s.P.jd[k], L.S1.map(x => x.rot));
  const flippedSeen = L.contacts.filter(c => (c.a === -1) !== (c.b === -1) && c.a >= -1 && c.b >= -1).some(c => (c.a === -1 ? c.normal[1] : -c.normal[1]) < -0.5);
  let Ep = s.last.E, after = -Infinity; for (let n = 0; n < 120; n++) { if (!s.tick()) break; after = Math.max(after, s.last.E - Ep); Ep = s.last.E; }
  res.event = { stepEnergyJ: +(L.dE).toFixed(3), dKE: +(L.KE1 - L.KE0).toFixed(4), dU_positionCorrection: +L.posLedger.dU_positionCorrection.toFixed(3), dPE_positionCorrection: +L.posLedger.dPE_positionCorrection.toFixed(3),
    bootMoveMm: +(V.dist(f1.com, f0.com) * 1000).toFixed(2), bootRotDeg: +(Q.angle(Q.mul(f1.rot, Q.conj(f0.rot))) * D).toFixed(2), ankleInvBefore: +inv(q0).toFixed(2), ankleInvAfter: +inv(q1).toFixed(2), sepMm: +(L.sep1 * 1000).toFixed(1), reversedManifoldInStep: flippedSeen, maxRiseNext120: +after.toFixed(3), joints: L.posLedger.joints.filter(j => Math.abs(j.U1 - j.Upred) > 0.1) }; }
s.destroy(); return res; }
if (!process.argv.includes("--sweep")) { const res = runState(human, key, foot, axis, C, HALF, STEP); console.log(JSON.stringify(res, null, 1)); if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1)); }
else { const { G1 } = await import("./b_lib.mjs"); const humans = arg("humans", "V2-REF,V1-matched").split(","), keys = arg("keys", G1.SCENARIO_ORDER.filter(k => G1.SCENARIOS[k].group !== "isolated").join(",")).split(","), MAX = +arg("max", 4), all = []; let hits = 0;
  outer: for (const h of humans) for (const k of keys) for (const f of ["foot_L", "foot_R"]) for (const [ax, c, half, step] of [["x", 0, 1000, 1], ["z", 0, 1000, 1], ["yaw", 0, 10, 0.01]]) {
    const r = runState(h, k, f, ax, c, half, step); all.push(r); if (r.found) { hits++; console.log("HIT", JSON.stringify(r)); if (hits >= MAX) break outer; } }
  console.log(`states×feet×families scanned: ${all.length}; samples ${all.reduce((a, r) => a + r.scanned, 0)}; hits ${hits}`); if (out) fs.writeFileSync(out, JSON.stringify({ runs: all.filter(r => r.found), scanned: all.length, samples: all.reduce((a, r) => a + r.scanned, 0) }, null, 1)); }
J.destroy(ji);
