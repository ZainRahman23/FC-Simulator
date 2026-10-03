// ═══ physchar2/tools/b_k0turf.mjs — INVESTIGATION B item 8: the ACCEPTED plant (k = 0) driven into the event by an identity-preserving TURF shift ═══
// A G1 resting state of the accepted plant is left bit-for-bit untouched; only the static 100 m turf box is slid horizontally under it (x / z
// offsets ≤ ±1 m, 1 mm steps). On a flat turf that is physically the same state; numerically it changes the narrow phase. For each offset
// the simulation's OWN narrow phase is queried (boot shape at its exact body transform vs the turf body); on the first reversed result the
// k = 0 simulation is stepped and the event recorded (ledger: energy, position correction, boot move, ankle). DIAGNOSTIC ONLY (k must be 0).
// usage: node tools/b_k0turf.mjs [--humans=V2-REF,V1-matched --keys=... --max=3 --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, ledgerTick, V, Q, D, JS, G1 } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
if (JS.ankleNeutralKPerDeg() !== 0) { console.error("k must be 0 (the accepted plant)"); process.exit(2); }
const humans = arg("humans", "V2-REF,V1-matched").split(","), keys = arg("keys", G1.SCENARIO_ORDER.filter(k => G1.SCENARIOS[k].group !== "isolated").join(",")).split(","), MAX = +arg("max", 3), out = arg("out", null);
const J = await jolt(), ONE = new J.Vec3(1, 1, 1), ZERO = new J.RVec3(0, 0, 0), TP = new J.RVec3(0, 0, 0), COLL = new J.CollideShapeAllHitCollisionCollector(); const res = []; let hits = 0;
outer: for (const human of humans) for (const key of keys) {
  const spec = specOf(human), s = makeSim(J, spec, key, {}); s.run(); s.N = s.n + 240;
  const nq = s.w.ps.GetNarrowPhaseQuery(), cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = spec.contact.speculative; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;
  const bpf = new J.BroadPhaseLayerFilter(), olf = new J.ObjectLayerFilter(), bf = new J.BodyFilter(), sf = new J.ShapeFilter(), gid = s.w.ground.GetID().GetIndexAndSequenceNumber();
  const reversedAt = (fi) => { const b = s.w.bodies[fi]; COLL.Reset(); nq.CollideShape(s.w.shapeInfo[fi].shape, ONE, b.GetCenterOfMassTransform(), cs, ZERO, COLL, bpf, olf, bf, sf);
    for (let i = 0; i < COLL.mHits.size(); i++) { const h = COLL.mHits.at(i); if (h.mBodyID2.GetIndexAndSequenceNumber() === gid && h.mPenetrationAxis.GetY() > 0) return { piece: h.mSubShapeID1.GetValue() & 15, depthMm: +(h.mPenetrationDepth * 1000).toFixed(3) }; } return null; };
  const feet = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n)); let found = null, scanned = 0;
  for (const ax of ["x", "z"]) { for (let i = -1000; i <= 1000 && !found; i++) { if (!i) continue; scanned++; TP.Set(ax === "x" ? i * 1e-3 : 0, -1, ax === "z" ? i * 1e-3 : 0); s.w.bi.SetPosition(s.w.ground.GetID(), TP, J.EActivation_DontActivate);
      for (const fi of feet) { const r = reversedAt(fi); if (r) { found = { axis: ax, dMm: i, foot: spec.bodies[fi].name, ...r }; break; } } } if (found) break; }
  const row = { human, key, scanned, found, event: null };
  if (found) { hits++; s.st = s.read(); s.up = s.P.compute(s.st, s.dt); s._measure(); const fi = spec.bodies.findIndex(b => b.name === found.foot), f0 = s.st[fi];
    const L = ledgerTick(s), f1 = s.st[fi], k = spec.joints.findIndex(j => j.name === "ankle_" + found.foot.slice(-1)), qs = (S) => s.P.qcs(s.P.jd[k], S.map(x => x.rot));
    const ang = (q) => ["fabd", "df", "inv"].map(kk => kk + " " + s.P.anat(s.P.jd[k], q, kk).toFixed(1)).join(" "), rev = L.contacts.some(c => (c.a === -1) !== (c.b === -1) && c.a >= -1 && c.b >= -1 && (c.a === -1 ? c.normal[1] : -c.normal[1]) < -0.5);
    let Ep = s.last.E, after = -Infinity; for (let n = 0; n < 120; n++) { if (!s.tick()) break; after = Math.max(after, s.last.E - Ep); Ep = s.last.E; }
    row.event = { stepEnergyJ: +L.dE.toFixed(3), dKE: +(L.KE1 - L.KE0).toFixed(4), dU_positionCorrection: +L.posLedger.dU_positionCorrection.toFixed(3), bootMoveMm: +(V.dist(f1.com, f0.com) * 1000).toFixed(2),
      bootRotDeg: +(Q.angle(Q.mul(f1.rot, Q.conj(f0.rot))) * D).toFixed(2), ankleBefore: ang(qs(L.S0)), ankleAfter: ang(qs(L.S1)), sepMm: +(L.sep1 * 1000).toFixed(1), reversedManifoldInStep: rev, maxRiseNext120: +after.toFixed(3) }; }
  res.push(row); console.log(`${human} ${key}: scanned ${scanned} turf offsets` + (found ? ` | REVERSED at turf ${found.axis} ${found.dMm} mm (${found.foot}[${found.piece}], depth ${found.depthMm} mm) → STEP: ${JSON.stringify(row.event)}` : " | none"));
  s.destroy(); if (hits >= MAX) break outer; }
if (out) fs.writeFileSync(out, JSON.stringify({ kNeutral: 0, rows: res }, null, 1));
