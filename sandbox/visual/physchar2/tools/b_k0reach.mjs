// ═══ physchar2/tools/b_k0reach.mjs — INVESTIGATION B item 8: can the ACCEPTED plant (k = 0) reach the reversed-manifold state? ════════════
// For each G1 scenario of the accepted plant (run in full at the validation configuration), take the final RESTING state and, for each boot,
// scan its exact centre-of-mass transform over vertical offsets δ (µm; a rigid shift of the resting body relative to the turf plane — a
// physically indistinguishable state) with the narrow-phase query of the physics step. For the first δ found to give a reversed / off-face
// turf manifold, re-simulate: the same resting state with the WHOLE body shifted by δ, then step the k = 0 plant and record the one-step
// energy change, the boot's position-solver jump and the ankle. DIAGNOSTIC ONLY (k must be 0: run without V2_ANKLE_NEUTRAL_K).
// usage: node tools/b_k0reach.mjs [--humans=V2-REF,V1-matched --range=300 --step=1 --sim=3 --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, V, Q, D, JS, G1 } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
if (JS.ankleNeutralKPerDeg() !== 0 && !process.argv.includes("--allow-k")) { console.error("k must be 0 (the accepted plant); --allow-k for the k > 0 comparison"); process.exit(2); }
const FAM = arg("families", "y").split(",");   // y = vertical shift (µm steps); x / z = horizontal shift (1 mm steps, ±1 m); yaw = rotation about the vertical through the boot COM (0.01° steps, ±10°)
const humans = arg("humans", "V2-REF,V1-matched").split(","), RANGE = +arg("range", 300) * 1e-6, STEP = +arg("step", 1) * 1e-6, NSIM = +arg("sim", 3), out = arg("out", null);
const keys = arg("keys", G1.SCENARIO_ORDER.filter(k => G1.SCENARIOS[k].group !== "isolated").join(",")).split(",");
const J = await jolt();
// query world: the static turf box only (as in V2JoltWorld)
const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1; const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(0, 1); opf.EnableCollision(1, 1);
const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, opf, 2);
const ji = new J.JoltInterface(st), qps = ji.GetPhysicsSystem(), qbi = qps.GetBodyInterface();
qbi.AddBody(qbi.CreateBody(new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(50, 1, 50), 0.0, null), new J.RVec3(0, -1, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0)).GetID(), J.EActivation_DontActivate); qps.OptimizeBroadPhase();
const nq = qps.GetNarrowPhaseQuery(), bpf = new J.DefaultBroadPhaseLayerFilter(ji.GetObjectVsBroadPhaseLayerFilter(), 1), olf = new J.DefaultObjectLayerFilter(ji.GetObjectLayerPairFilter(), 1), bf = new J.BodyFilter(), sf = new J.ShapeFilter();
const cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = 0.02; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;
const TQ = new J.Quat(0, 0, 0, 1), TP = new J.RVec3(0, 0, 0), ONE = new J.Vec3(1, 1, 1), ZERO = new J.RVec3(0, 0, 0), coll = new J.CollideShapeAllHitCollisionCollector();   // reused (no per-query heap growth)
function invalidHits(shape, q, c) { TQ.Set(q[0], q[1], q[2], q[3]); TP.Set(c[0], c[1], c[2]); const m = J.RMat44.prototype.sRotationTranslation(TQ, TP); coll.Reset();
  nq.CollideShape(shape, ONE, m, cs, ZERO, coll, bpf, olf, bf, sf); const bad = [];
  for (let i = 0; i < coll.mHits.size(); i++) { const r = coll.mHits.at(i), a = r.mPenetrationAxis, f2 = r.mShape2Face; let off = false; for (let j = 0; j < f2.size(); j++) if (Math.abs(f2.at(j).GetY()) > 0.001) off = true;
    const ay = a.GetY() / Math.hypot(a.GetX(), a.GetY(), a.GetZ()); if (ay > 0 || off) bad.push({ piece: r.mSubShapeID1.GetValue() & 15, axisY: +ay.toFixed(4), depthMm: +(r.mPenetrationDepth * 1000).toFixed(3), off }); }
  return bad; }
const res = []; let simulated = 0;
for (const human of humans) { const spec = specOf(human), feet = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n));
  for (const key of keys) {
    const s = makeSim(J, spec, key, {}); s.run(); const S = s.st, rest = s.A.restKEmax;
    const row = { human, key, restKE: +rest.toFixed(5), feet: [] };
    for (const fi of feet) { const b = s.w.bodies[fi], r = b.GetRotation(), T = b.GetCenterOfMassTransform().GetTranslation(), q = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], c = [T.GetX(), T.GetY(), T.GetZ()], shape = s.w.shapeInfo[fi].shape;
      const hits = []; let scanned = 0;
      if (FAM.includes("y")) for (let d = -RANGE; d <= RANGE + 1e-12; d += STEP) { scanned++; const bad = invalidHits(shape, q, [c[0], c[1] + d, c[2]]); if (bad.length) hits.push({ fam: "y", dUm: +(d * 1e6).toFixed(2), bad }); }
      for (const ax of ["x", "z"]) if (FAM.includes(ax)) for (let i = -1000; i <= 1000; i++) { if (!i) continue; scanned++; const cc = c.slice(); cc[ax === "x" ? 0 : 2] += i * 1e-3; const bad = invalidHits(shape, q, cc); if (bad.length) hits.push({ fam: ax, dMm: i, bad }); }
      if (FAM.includes("yaw")) for (let i = -1000; i <= 1000; i++) { if (!i) continue; scanned++; const qq = Q.norm(Q.mul(Q.axis([0, 1, 0], i * 0.01 / D), q)); const bad = invalidHits(shape, qq, c); if (bad.length) hits.push({ fam: "yaw", dDeg: +(i * 0.01).toFixed(2), bad }); }
      row.feet.push({ foot: spec.bodies[fi].name, comY: c[1], scanned, invalidOffsets: hits.length, examples: hits.slice(0, 4) }); }
    // re-simulate the first invalid offset found (whole body shifted by δ, velocities kept = rest), k = 0
    const firstFoot = row.feet.find(f => f.invalidOffsets > 0);
    if (firstFoot && simulated < NSIM) { simulated++; const e = firstFoot.examples[0], s2 = makeSim(J, spec, key, {}); s2.run(); s2.N = s2.n + 120;
      // the SAME resting body rigidly moved: vertical / horizontal shift, or yaw about the vertical through that boot's COM (velocities rotated with it)
      const fiP = s2.spec.bodies.findIndex(b => b.name === firstFoot.foot), piv = s2.st[fiP].com, off = e.fam === "y" ? [0, e.dUm * 1e-6, 0] : e.fam === "x" ? [e.dMm * 1e-3, 0, 0] : e.fam === "z" ? [0, 0, e.dMm * 1e-3] : [0, 0, 0], ry = Q.axis([0, 1, 0], e.fam === "yaw" ? e.dDeg / D : 0);
      for (let i = 0; i < s2.nb; i++) { const x = s2.st[i], pp = V.add(V.add(piv, Q.rot(ry, V.sub(x.pos, piv))), off); s2.w.setPose(i, pp, Q.norm(Q.mul(ry, x.rot))); s2.w.setVel(i, Q.rot(ry, x.v), Q.rot(ry, x.w)); }
      s2.st = s2.read(); s2.up = s2.P.compute(s2.st, s2.dt); s2._measure(); const fi = s2.spec.bodies.findIndex(b => b.name === firstFoot.foot); let Ep = s2.last.E, maxRise = -Infinity, at = null, jump = 0, invTicks = 0;
      for (let n = 0; n < 120; n++) { const f0 = s2.st[fi]; if (!s2.tick()) break; const r = s2.last.E - Ep; Ep = s2.last.E; if (r > maxRise) { maxRise = r; at = n + 1; } jump = Math.max(jump, V.dist(s2.st[fi].com, f0.com) * 1000);
        if ((s2.lastContacts || []).some(c0 => { if ((c0.a === -1) === (c0.b === -1) || c0.a < -1 || c0.b < -1) return false; const tf = c0.a === -1, ny = tf ? c0.normal[1] : -c0.normal[1], pT = tf ? c0.pts : c0.pts2; return ny < 0.5 || pT.some(p => Math.abs(p[1]) > 0.002); })) invTicks++; }
      row.resim = { transform: e.fam === "y" ? `vertical ${e.dUm} µm` : e.fam === "yaw" ? `yaw ${e.dDeg}°` : `${e.fam} ${e.dMm} mm`, foot: firstFoot.foot, maxStepRiseJ: +maxRise.toFixed(3), atStep: at, maxBootStepMoveMm: +jump.toFixed(2), invalidTicks: invTicks, sepMaxMm: +(s2.A.sepMax * 1000).toFixed(1) }; s2.destroy(); }
    res.push(row); console.log(`${human} ${key}: rest KE ${row.restKE} J | ` + row.feet.map(f => `${f.foot}: ${f.invalidOffsets}/${f.scanned} offsets invalid${ f.examples.length ? " e.g. " + JSON.stringify({ fam: f.examples[0].fam, d: f.examples[0].dUm ?? f.examples[0].dMm ?? f.examples[0].dDeg }) + " piece " + f.examples[0].bad[0].piece + " axisY " + f.examples[0].bad[0].axisY : ""}`).join(" ; ") + (row.resim ? ` || RESIM k=0 (${row.resim.transform}): max step rise ${row.resim.maxStepRiseJ} J, boot step move ${row.resim.maxBootStepMoveMm} mm, invalid ticks ${row.resim.invalidTicks}, sep ${row.resim.sepMaxMm} mm` : ""));
    s.destroy(); } }
if (out) fs.writeFileSync(out, JSON.stringify({ kNeutral: 0, rangeUm: RANGE * 1e6, stepUm: STEP * 1e6, rows: res }, null, 1));
