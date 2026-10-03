// ═══ physchar2/tools/b_flipscan.mjs — INVESTIGATION B: statistical narrow-phase validity scan (no simulation) ═══════════════════════════════
// Random resting-like boot poses near the turf (lowest boot point h ∈ [hLo, hHi] above the turf, tilt ≤ tiltMax about the horizontal axes,
// any yaw, horizontal position anywhere in ±xy m), one Jolt CollideShape per pose with the exact physics-step settings (shape 1 = the boot
// compound, shape 2 = the turf, collect faces, max separation = speculative distance). A hit is INVALID when its penetration axis points
// up (in the foot→turf convention it must point down: "move the turf out" = −Y on the top face) or its turf-side face is not the top
// surface (|y| > 1 mm). Reported per turf geometry × boot representation. DIAGNOSTIC ONLY.
// usage: node tools/b_flipscan.mjs [--human=V2-REF --n=20000 --hLo=-0.003 --hHi=0.008 --tilt=15 --xy=3 --seed=1 --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, V, Q, D } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human", "V2-REF"), N = +arg("n", 20000), hLo = +arg("hLo", -0.003), hHi = +arg("hHi", 0.008), tiltMax = +arg("tilt", 15) / D, XY = +arg("xy", 3), out = arg("out", null);
let seed = +arg("seed", 1); const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
const J = await jolt(), spec = specOf(human), s = makeSim(J, spec, "upright"), fiR = spec.bodies.findIndex(b => b.name === "foot_R");
const ptsAll = spec.bodies[fiR].shapes.flatMap(sh => sh.points), comL = s.w.shapeInfo[fiR].comLocal;
const mk = (pieces) => { const cs = new J.StaticCompoundShapeSettings(); pieces.forEach((pts, k) => { const hs = new J.ConvexHullShapeSettings(); for (const p of pts) hs.mPoints.push_back(new J.Vec3(p[0], p[1], p[2])); hs.mMaxConvexRadius = 0.005; hs.mHullTolerance = 1e-5; cs.AddShape(new J.Vec3(0, 0, 0), new J.Quat(0, 0, 0, 1), hs, k); });
  const nat = cs.Create().Get().GetCenterOfMass(), oc = new J.OffsetCenterOfMassShapeSettings(new J.Vec3(comL[0] - nat.GetX(), comL[1] - nat.GetY(), comL[2] - nat.GetZ()), cs); return oc.Create().Get(); };
let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const p of ptsAll) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
const box8 = []; for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) box8.push([x, y, z]);
const BOOTS = { "10-piece (approved)": { shape: s.w.shapeInfo[fiR].shape, pts: ptsAll, pieces: spec.bodies[fiR].shapes.length }, "single hull": { shape: mk([ptsAll]), pts: ptsAll, pieces: 1 }, "box": { shape: mk([box8]), pts: box8, pieces: 1 } };
const TURFS = { "box 100×2×100 m (approved)": () => [new J.BoxShape(new J.Vec3(50, 1, 50), 0, null), -1], "box 100×0.1×100 m": () => [new J.BoxShape(new J.Vec3(50, 0.05, 50), 0, null), -0.05],
  "box 20×2×20 m": () => [new J.BoxShape(new J.Vec3(10, 1, 10), 0, null), -1], "box 8×2×8 m": () => [new J.BoxShape(new J.Vec3(4, 1, 4), 0, null), -1], "plane": () => [new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, 50), 0] };
// --flush: RESTING-type poses — a random face of a random boot piece exactly parallel to the turf (outward normal straight down) at gap
// h ∈ [hLo, hHi], any yaw, anywhere in ±xy (faces: planes through 3 hull points with every other point behind them)
const FLUSH = arg("flush", null) != null;
function faces(pts) { const F = [], key = new Set(); for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) for (let c = b + 1; c < pts.length; c++) {
  let n = V.cross(V.sub(pts[b], pts[a]), V.sub(pts[c], pts[a])); const l = V.len(n); if (l < 1e-9) continue; n = V.sc(n, 1 / l); let d = V.dot(n, pts[a]), pos = 0, neg = 0;
  for (const q of pts) { const e = V.dot(n, q) - d; if (e > 1e-7) pos++; else if (e < -1e-7) neg++; } if (pos && neg) continue; if (pos) { n = V.sc(n, -1); d = -d; }
  const k = n.map(x => Math.round(x * 1e5)).join(","); if (key.has(k)) continue; key.add(k); F.push({ n, d }); } return F; }
const pieceFaces = spec.bodies[fiR].shapes.map(sh => faces(sh.points));
const rotTo = (a, b) => { const c = V.cross(a, b), d = V.dot(a, b); if (d < -0.999999) return Q.axis(Math.abs(a[0]) < 0.9 ? V.norm(V.cross(a, [1, 0, 0])) : V.norm(V.cross(a, [0, 1, 0])), Math.PI); return Q.norm([c[0], c[1], c[2], 1 + d]); };
if (FLUSH) console.log("flush mode: faces per piece", pieceFaces.map(f => f.length).join(","));
const only = arg("turfs", null), onlyB = arg("boots", null), res = [];
for (const [tn, tf] of Object.entries(TURFS)) { if (only && !only.split("|").some(x => tn.startsWith(x))) continue;
  const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1; const opf = new J.ObjectLayerPairFilterTable(2); opf.EnableCollision(0, 1); opf.EnableCollision(1, 1);
  const bpi = new J.BroadPhaseLayerInterfaceTable(2, 2); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bpi.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
  st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi; st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 2, opf, 2);
  const ji = new J.JoltInterface(st), ps = ji.GetPhysicsSystem(), bi = ps.GetBodyInterface(), [tshape, ty] = tf();
  const gs = new J.BodyCreationSettings(tshape, new J.RVec3(0, ty, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0); bi.AddBody(bi.CreateBody(gs).GetID(), J.EActivation_DontActivate); ps.OptimizeBroadPhase();
  const nq = ps.GetNarrowPhaseQuery(), bpf = new J.DefaultBroadPhaseLayerFilter(ji.GetObjectVsBroadPhaseLayerFilter(), 1), olf = new J.DefaultObjectLayerFilter(ji.GetObjectLayerPairFilter(), 1), bf = new J.BodyFilter(), sf = new J.ShapeFilter();
  const cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = spec.contact.speculative; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;
  for (const [bn, B] of Object.entries(BOOTS)) { if (onlyB && !onlyB.split("|").some(x => bn.startsWith(x))) continue;
    seed = +arg("seed", 1); let hits = 0, bad = 0, badPoses = 0; const ex = [], byGap = {};
    for (let k = 0; k < N; k++) {
      let q, org; const h = hLo + rnd() * (hHi - hLo), x = (rnd() * 2 - 1) * XY, z = (rnd() * 2 - 1) * XY;
      if (FLUSH && bn.startsWith("10-piece")) { const pi = Math.floor(rnd() * pieceFaces.length), fl = pieceFaces[pi], f = fl[Math.floor(rnd() * fl.length)], yaw = rnd() * 2 * Math.PI;
        q = Q.norm(Q.mul(Q.axis([0, 1, 0], yaw), rotTo(f.n, [0, -1, 0])));                         // face normal → straight down, then yaw
        const fy = -f.d;                                                                          // face plane height after rotation: n_w·p = d with n_w = −Y → p_y = −d
        org = [x, h - fy, z]; const lowAll = Math.min(...B.pts.map(p => Q.rot(q, p)[1] + org[1])); if (lowAll < h - 1e-9) { k--; continue; } }   // the face must be the boot's lowest feature
      else { const yaw = rnd() * 2 * Math.PI, ax = V.norm([rnd() * 2 - 1, 0, rnd() * 2 - 1]), tilt = rnd() * tiltMax; q = Q.norm(Q.mul(Q.axis(ax, tilt), Q.axis([0, 1, 0], yaw)));
        const low = Math.min(...B.pts.map(p => Q.rot(q, p)[1])); org = [x, h - low, z]; }
      const com = V.add(org, Q.rot(q, comL));
      const m = J.RMat44.prototype.sRotationTranslation(new J.Quat(q[0], q[1], q[2], q[3]), new J.RVec3(com[0], com[1], com[2])), coll = new J.CollideShapeAllHitCollisionCollector();
      nq.CollideShape(B.shape, new J.Vec3(1, 1, 1), m, cs, new J.RVec3(0, 0, 0), coll, bpf, olf, bf, sf); let pb = false;
      for (let i = 0; i < coll.mHits.size(); i++) { const r = coll.mHits.at(i), a = r.mPenetrationAxis, f2 = r.mShape2Face; hits++; let off = false; for (let j = 0; j < f2.size(); j++) if (Math.abs(f2.at(j).GetY()) > 0.001) off = true;
        const ay = a.GetY() / Math.hypot(a.GetX(), a.GetY(), a.GetZ()); if (ay > 0 || off) { bad++; pb = true; if (ex.length < 6) ex.push({ k, piece: r.mSubShapeID1.GetValue() & 15, h: +(h * 1000).toFixed(3), x: +x.toFixed(3), z: +z.toFixed(3), axisY: +ay.toFixed(4), depthMm: +(r.mPenetrationDepth * 1000).toFixed(3), offFace: off }); } }
      const gb = Math.floor(h * 1000); byGap[gb] = byGap[gb] || [0, 0]; byGap[gb][0]++; if (pb) { badPoses++; byGap[gb][1]++; }
      J.destroy(m); J.destroy(coll); }
    const r = { turf: tn, boot: bn, poses: N, hits, invalidHits: bad, invalidPoses: badPoses, ratePerPose: badPoses / N, byGapMm: byGap, examples: ex };
    res.push(r); console.log(`${tn.padEnd(28)} ${bn.padEnd(20)} poses ${N}  hits ${hits}  INVALID ${bad} (${(100 * badPoses / N).toFixed(3)} % of poses)  ${ex.slice(0, 2).map(e => JSON.stringify(e)).join(" ")}`); }
  J.destroy(cs); J.destroy(ji); }
if (out) fs.writeFileSync(out, JSON.stringify({ human, N, hLo, hHi, tiltMaxDeg: tiltMax * D, xy: XY, results: res }, null, 1));
s.destroy();
