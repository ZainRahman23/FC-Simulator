// ═══ physchar2/tools/b_plane_events.mjs — FLAT-PLANE VALIDATION: every known reversed-manifold event state, box (control) vs production plane ═══
// For one recorded Investigation-B event: run the historical BOX trajectory to the last healthy tick, (a) control: one step on the box (must
// reproduce the reversed manifold / energy jump), (b) restore the exact state, replace the turf by the PRODUCTION plane (TURF in core/v2_jolt.js)
// and step + a 0.5 s window, (c) local perturbations of the same state on the plane: the turf slid x / z ±1 m (1 mm) and lifted ±300 µm (1 µm),
// each boot queried with the simulation's own narrow phase — every result classified (reversed / tilted / off-surface). DIAGNOSTIC + validation.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/b_plane_events.mjs --human=.. --key=.. --hz=.. [--vel=150] --event=<tick> --foot=foot_L|foot_R [--label=..]
import fs from "fs";
import { jolt, specOf, makeSim, runTo, save, restore, V, Q, D, JS } from "./b_lib.mjs";
const { TURF } = await import("../core/v2_jolt.js");
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human"), key = arg("key"), hz = +arg("hz", 240), vel = +arg("vel", 150), ev = +arg("event"), foot = arg("foot", "foot_L"), label = arg("label", ""), out = arg("out", null);
const J = await jolt(), spec = specOf(human), names = spec.bodies.map(b => b.name), fi = names.indexOf(foot);
const classify = (C) => { const o = { reversed: 0, tilted: 0, off: 0 }; for (const c of C) { if ((c.a === -1) === (c.b === -1) || c.a < -1 || c.b < -1) continue; const tf = c.a === -1, ny = tf ? c.normal[1] : -c.normal[1], pT = tf ? c.pts : c.pts2;
  if (ny <= -0.5) o.reversed++; else if (ny < 0.999) o.tilted++; else if (pT.some(p => Math.abs(p[1]) > 1e-4)) o.off++; } return o; };
const s = makeSim(J, spec, key, { hz, velSteps: vel, turf: "box" }); runTo(s, ev - 1); const S = save(s), E0 = s.last.E, f0 = s.st[fi];
s.tick(); const ctl = { dE: +(s.last.E - E0).toFixed(3), manifolds: classify(s.lastContacts || []), bootMoveMm: +(V.dist(s.st[fi].com, f0.com) * 1000).toFixed(2) };
restore(s, S);
const TP = new J.RVec3(0, 0, 0); s.w.bi.SetShape(s.w.ground.GetID(), new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, TURF.halfExtent), false, J.EActivation_DontActivate); s.w.bi.SetPosition(s.w.ground.GetID(), TP, J.EActivation_DontActivate); s.w.turf = { kind: "plane", halfExtent: TURF.halfExtent };
// (c) local perturbations with the plane (before stepping; the state is untouched, only the static plane is moved)
const nq = s.w.ps.GetNarrowPhaseQuery(), cs = new J.CollideShapeSettings(); cs.mCollectFacesMode = J.ECollectFacesMode_CollectFaces; cs.mMaxSeparationDistance = spec.contact.speculative; cs.mActiveEdgeMode = J.EActiveEdgeMode_CollideOnlyWithActive;
const ONE = new J.Vec3(1, 1, 1), ZERO = new J.RVec3(0, 0, 0), COLL = new J.CollideShapeAllHitCollisionCollector(), bpf = new J.BroadPhaseLayerFilter(), olf = new J.ObjectLayerFilter(), bf = new J.BodyFilter(), sf = new J.ShapeFilter(), gid = s.w.ground.GetID().GetIndexAndSequenceNumber();
const feet = ["foot_L", "foot_R"].map(n => names.indexOf(n)); let queries = 0, bad = { reversed: 0, tilted: 0, off: 0 }, hits = 0;
const probe = () => { for (const i of feet) { COLL.Reset(); nq.CollideShape(s.w.shapeInfo[i].shape, ONE, s.w.bodies[i].GetCenterOfMassTransform(), cs, ZERO, COLL, bpf, olf, bf, sf); queries++;
  for (let k = 0; k < COLL.mHits.size(); k++) { const h = COLL.mHits.at(k); if (h.mBodyID2.GetIndexAndSequenceNumber() !== gid) continue; hits++; const a = h.mPenetrationAxis, ay = a.GetY() / Math.hypot(a.GetX(), a.GetY(), a.GetZ());
    // shape 1 = boot, shape 2 = turf: a valid turf axis is "move the turf down" = −Y
    if (ay > 0.5) bad.reversed++; else if (ay > -0.999) bad.tilted++; const f2 = h.mShape2Face, py = TP.GetY(); for (let j = 0; j < f2.size(); j++) if (Math.abs(f2.at(j).GetY() - py) > 1e-4) { bad.off++; break; } } } };   // relative to the (probe-lifted) plane height
for (const ax of ["x", "z"]) for (let i = -1000; i <= 1000; i++) { TP.Set(ax === "x" ? i * 1e-3 : 0, 0, ax === "z" ? i * 1e-3 : 0); s.w.bi.SetPosition(s.w.ground.GetID(), TP, J.EActivation_DontActivate); probe(); }
for (let i = -300; i <= 300; i++) { TP.Set(0, i * 1e-6, 0); s.w.bi.SetPosition(s.w.ground.GetID(), TP, J.EActivation_DontActivate); probe(); }
TP.Set(0, 0, 0); s.w.bi.SetPosition(s.w.ground.GetID(), TP, J.EActivation_DontActivate);
// (b) the event step and a 0.5 s window on the plane
s.st = s.read(); s.up = s.P.compute(s.st, s.dt); s._measure(); s.N = Math.max(s.N, s.n + Math.round(0.5 * hz) + 1); const E1 = s.last.E, g0 = s.st[fi];
s.tick(); const pl = { dE: +(s.last.E - E1).toFixed(4), manifolds: classify(s.lastContacts || []), bootMoveMm: +(V.dist(s.st[fi].com, g0.com) * 1000).toFixed(3) };
let Ep = s.last.E, maxRise = pl.dE, winBad = { reversed: 0, tilted: 0, off: 0 }; for (let n = 0; n < Math.round(0.5 * hz); n++) { if (!s.tick()) break; maxRise = Math.max(maxRise, s.last.E - Ep); Ep = s.last.E; const c = classify(s.lastContacts || []); for (const k in winBad) winBad[k] += c[k]; }
const res = { label, human, key, hz, vel, k: JS.ankleNeutralKPerDeg(), event: ev, foot, boxControl: ctl, plane: { ...pl, windowMaxRiseJ: +maxRise.toFixed(4), windowInvalid: winBad }, localPerturbationsOnPlane: { queries, turfHits: hits, invalid: bad } };
console.log(JSON.stringify(res)); if (out) fs.appendFileSync(out, JSON.stringify(res) + "\n"); s.destroy();
