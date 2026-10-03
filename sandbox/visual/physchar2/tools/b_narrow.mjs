// ═══ physchar2/tools/b_narrow.mjs — INVESTIGATION B: the smallest reproducer — ONE narrow-phase collision query, no simulation ════════════
// Takes the boot body's exact centre-of-mass transform at the last healthy tick (Jolt float32, read from the body) and issues the same
// convex-vs-convex query the physics step issues for the (boot, turf) body pair: shape 1 = the boot compound (body 1 = the dynamic body,
// PhysicsSystem::ProcessBodyPair swap), shape 2 = the static turf box, CollideShapeSettings as in ProcessBodyPair (collect faces, max
// separation = speculative distance). Also: the single offending hull piece alone; a sensitivity scan of the transform.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/b_narrow.mjs --human=V1-matched --key=singleLeg --event=923 [--foot=foot_L --scan=2000 --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, runTo, V, Q, D, JS } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const turfHE = (arg("turf", "50,1,50")).split(",").map(Number);   // turf box half extents (m); "plane" = a PlaneShape turf (diagnostic)
const human = arg("human", "V1-matched"), key = arg("key", "singleLeg"), hz = +arg("hz", 240), ev = +arg("event"), foot = arg("foot", "foot_L"), nScan = +arg("scan", 0), out = arg("out", null);
const J = await jolt(), spec = specOf(human), fi = spec.bodies.findIndex(b => b.name === foot);
const s = makeSim(J, spec, key, { hz }); runTo(s, ev - 1);
const body = s.w.bodies[fi], T = body.GetCenterOfMassTransform(), shape = s.w.shapeInfo[fi].shape;
const col = (v) => [v.GetX(), v.GetY(), v.GetZ()], M = { x: col(T.GetAxisX()), y: col(T.GetAxisY()), z: col(T.GetAxisZ()), t: col(T.GetTranslation()) };
const rot = [body.GetRotation().GetX(), body.GetRotation().GetY(), body.GetRotation().GetZ(), body.GetRotation().GetW()], com = M.t;
// a minimal world: the static turf box only (as in V2JoltWorld)
const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1; const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(0, 1); opf.EnableCollision(1, 1);
const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, opf, 2);
const ji = new J.JoltInterface(st), ps = ji.GetPhysicsSystem(), bi = ps.GetBodyInterface();
const isPlane = arg("turf", "") === "plane", turfShape = isPlane ? new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, 50) : new J.BoxShape(new J.Vec3(turfHE[0], turfHE[1], turfHE[2]), 0.0, null);
const gs = new J.BodyCreationSettings(turfShape, new J.RVec3(0, isPlane ? 0 : -turfHE[1], 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0); const turf = bi.CreateBody(gs); bi.AddBody(turf.GetID(), J.EActivation_DontActivate);
ps.OptimizeBroadPhase();
const nq = ps.GetNarrowPhaseQuery(), bpf = new J.DefaultBroadPhaseLayerFilter(ji.GetObjectVsBroadPhaseLayerFilter(), 1), olf = new J.DefaultObjectLayerFilter(ji.GetObjectLayerPairFilter(), 1), bf = new J.BodyFilter(), sf = new J.ShapeFilter();
const subBits = Math.ceil(Math.log2(spec.bodies[fi].shapes.length));
function query(shp, q, c, sep = spec.contact.speculative) {
  const cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = sep; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;
  const m = J.RMat44.prototype.sRotationTranslation(new J.Quat(q[0], q[1], q[2], q[3]), new J.RVec3(c[0], c[1], c[2])), coll = new J.CollideShapeAllHitCollisionCollector();
  nq.CollideShape(shp, new J.Vec3(1, 1, 1), m, cs, new J.RVec3(0, 0, 0), coll, bpf, olf, bf, sf);
  const hits = []; for (let k = 0; k < coll.mHits.size(); k++) { const h = coll.mHits.at(k), ax = col(h.mPenetrationAxis), f1 = h.mShape1Face, f2 = h.mShape2Face, face = (f) => { const o = []; for (let i = 0; i < f.size(); i++) o.push(col(f.at(i))); return o; };
    hits.push({ piece: h.mSubShapeID1.GetValue() & ((1 << subBits) - 1), axis: ax, depth: h.mPenetrationDepth, p1: col(h.mContactPointOn1), p2: col(h.mContactPointOn2), face1: face(f1), face2: face(f2) }); }
  J.destroy(coll); J.destroy(cs); return hits; }
const hits = query(shape, rot, com), f = (x, n = 4) => (+x).toFixed(n);
console.log(`boot ${foot} COM ${com.map(x => f(x, 6))} rot ${rot.map(x => f(x, 7))}`);
for (const h of hits) console.log(`  piece ${h.piece}: axis(normalised, foot→turf convention) ${V.norm(h.axis).map(x => f(x, 4))} depth ${f(h.depth * 1000, 3)} mm | turf face y ${h.face2.map(p => f(p[1], 3)).join(",")} | p1.y ${f(h.p1[1] * 1000, 2)} p2.y ${f(h.p2[1] * 1000, 2)} mm`);
const bad = hits.filter(h => V.norm(h.axis)[1] > 0);
console.log(`→ ${bad.length} flipped hit(s): pieces ${bad.map(h => h.piece).join(",") || "none"}`);
// the offending piece alone, as its own convex hull at its exact world transform (compound sub-shape transform composed in double)
const res = { turf: isPlane ? "plane" : turfHE, human, key, hz, event: ev, kNeutral: JS.ankleNeutralKPerDeg(), foot, com, rot, hits, single: null, scan: null };
if (bad.length) { const pc = bad[0].piece, sh = spec.bodies[fi].shapes[pc], hs = new J.ConvexHullShapeSettings(); for (const p of sh.points) hs.mPoints.push_back(new J.Vec3(p[0], p[1], p[2])); hs.mMaxConvexRadius = sh.cr; if (sh.hullTol != null) hs.mHullTolerance = sh.hullTol;
  const hull = hs.Create().Get(), cr = hull.GetConvexRadius ? hull.GetConvexRadius() : null, comL = s.w.shapeInfo[fi].comLocal, hullCom = col(hull.GetCenterOfMass());
  // piece frame: body origin + R·(sub.pos + sub.rot·p); Jolt body COM = origin + R·comL → piece COM world = COM + R·(sub.pos + sub.rot·hullCom − comL)
  const wp = V.add(com, Q.rot(rot, V.sub(V.add(sh.pos, Q.rot(sh.rot, hullCom)), comL))), wq = Q.mul(rot, sh.rot);
  const h1 = query(hull, wq, wp);
  // --dump: the exact float32 inputs of this single query, for the native instrumented Jolt v5.6.0 harness (tools/b_native/)
  const dump = arg("dump", null); if (dump) { const fr = Math.fround; fs.writeFileSync(dump, JSON.stringify({ points: sh.points.map(p => p.map(fr)), cr: fr(sh.cr), hullTol: sh.hullTol != null ? fr(sh.hullTol) : null,
    q: wq.map(fr), p: wp.map(fr), turf: isPlane ? "plane" : turfHE.map(fr), sep: fr(spec.contact.speculative), expect: h1.map(h => ({ axis: h.axis, depth: h.depth })) }, null, 1)); }
  res.single = { piece: pc, points: sh.points.length, crSpec: sh.cr, crJolt: cr, hits: h1 };
  console.log(`single hull piece ${pc} (${sh.points.length} pts, cr spec ${sh.cr}, Jolt convex radius ${cr}): ` + h1.map(h => `axis ${V.norm(h.axis).map(x => f(x, 4))} depth ${f(h.depth * 1000, 3)} mm turf-face y ${h.face2.map(p => f(p[1], 3)).join(",")}`).join(" | "));
  // sensitivity: random perturbations of the piece transform (translation ε m, rotation ε rad), fraction of flipped results
  if (nScan) { let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1; res.scan = [];
    for (const eps of [1e-7, 1e-6, 1e-5, 1e-4, 1e-3]) { let flips = 0, n = 0; for (let k = 0; k < nScan; k++) { const p = V.add(wp, [rnd() * eps, rnd() * eps, rnd() * eps]), q = Q.norm(Q.mul(Q.axis(V.norm([rnd(), rnd(), rnd()]), rnd() * eps), wq)), hh = query(hull, q, p);
        if (hh.length) { n++; if (hh.some(h => V.norm(h.axis)[1] > 0)) flips++; } }
      res.scan.push({ eps, queries: nScan, withHit: n, flipped: flips }); console.log(`  scan ε ${eps}: ${flips}/${n} flipped`); } } }
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
s.destroy(); J.destroy(ji);
