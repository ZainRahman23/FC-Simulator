// ═══ physchar2/tools/b_ablate.mjs — INVESTIGATION B: controlled ablations from the EXACT pre-event state (one change at a time) ════════════
// Each ablation: a fresh deterministic run to the last healthy tick (event − 1) — bit-identical to the original — then ONE change, then the
// event step and a following window. Reports the event step's energy change and foot jump, whether a turf manifold is invalid (normal
// pointing into the turf / turf-side points off the turf surface), and the largest one-step energy rise in the window.
// DIAGNOSTIC ONLY: no ablation is a candidate fix and none is adopted.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/b_ablate.mjs --human=V1-matched --key=singleLeg --event=923 [--hz=240 --window=120 --only=<id,...> --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, runTo, V, Q, D, JS } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human", "V1-matched"), key = arg("key", "singleLeg"), hz = +arg("hz", 240), ev = +arg("event"), win = +arg("window", 120), only = arg("only", null), out = arg("out", null);
const J = await jolt(), spec = specOf(human), names = spec.bodies.map(b => b.name), feet = ["foot_L", "foot_R"].map(n => names.indexOf(n));
const jIdx = (n) => spec.joints.findIndex(j => j.name === n), ankles = ["ankle_L", "ankle_R"].map(jIdx);
const settings = (s, f) => { const p = s.w.ps.GetPhysicsSettings(); f(p); s.w.ps.SetPhysicsSettings(p); };
const replan = (s) => { s.up = s.P.compute(s.st, s.dt); };
const disableJoint = (s, k) => { s.w.cons[k].c.SetEnabled(false); s._dis = (s._dis || new Set()).add(k); };
const setTurf = (s, shape, y) => { s.w.bi.SetShape(s.w.ground.GetID(), shape, false, J.EActivation_DontActivate); if (y != null) s.w.bi.SetPosition(s.w.ground.GetID(), new J.RVec3(0, y, 0), J.EActivation_DontActivate); };
const footShape = (s, i, hullPts) => { const b = spec.bodies[i], cs = new J.StaticCompoundShapeSettings(); cs.AddShape(new J.Vec3(0, 0, 0), new J.Quat(0, 0, 0, 1), hullPts, 0);
  const nat = cs.Create().Get().GetCenterOfMass(), c = b.comLocal, oc = new J.OffsetCenterOfMassShapeSettings(new J.Vec3(c[0] - nat.GetX(), c[1] - nat.GetY(), c[2] - nat.GetZ()), cs), sh = oc.Create().Get();
  s.w.bi.SetShape(s.w.bodies[i].GetID(), sh, false, J.EActivation_Activate); };
const singleHull = (i) => { const hs = new J.ConvexHullShapeSettings(); for (const sh of spec.bodies[i].shapes) for (const p of sh.points) hs.mPoints.push_back(new J.Vec3(p[0], p[1], p[2])); hs.mMaxConvexRadius = 0.005; hs.mHullTolerance = 1e-5; return hs; };
const boxSole = (i) => { let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const sh of spec.bodies[i].shapes) for (const p of sh.points) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const hs = new J.ConvexHullShapeSettings(); for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) hs.mPoints.push_back(new J.Vec3(x, y, z)); hs.mMaxConvexRadius = 0.005; return hs; };
const rejectPair = (s, test) => { s.w.listener.OnContactValidate = (b1p, b2p) => { const u1 = J.wrapPointer(b1p, J.Body).GetUserData(), u2 = J.wrapPointer(b2p, J.Body).GetUserData(); return test(u1, u2) ? J.ValidateResult_RejectAllContactsForThisBodyPair : J.ValidateResult_AcceptAllContactsForThisBodyPair; }; };
const isFootTurf = (u1, u2) => { const f = (u) => feet.includes(u - 1); return (u1 === 1000 && f(u2)) || (u2 === 1000 && f(u1)); };
const A = [
  ["baseline", "none (bit-identical re-run)", () => {}],
  ["k0", "ankle neutral stiffness off (k = 0, both ankles)", (s) => { for (const k of ankles) s.P.jd[k].axes.forEach(a => { if (a) a.kN = 0; }); replan(s); }],
  ["ankDamp0", "ankle damping off", (s) => { for (const k of ankles) s.P.jd[k].c = 0; replan(s); }],
  ["ankStopOff", "ankle engine hard stop off (Jolt rotation limits ±180°)", (s) => { for (const k of ankles) s.w.cons[k].c.SetRotationLimits(new J.Vec3(-Math.PI, -Math.PI, -Math.PI), new J.Vec3(Math.PI, Math.PI, Math.PI)); replan(s); }],
  ["ankOtherAxesOff", "other passive ankle axes off (DF / inversion end-range law + end-stop)", (s) => { for (const k of ankles) [1, 2].forEach(i => { const a = s.P.jd[k].axes[i]; if (a) { a.tauH = [0, 0]; a.kStop = [0, 0]; } }); replan(s); }],
  ["drivesOff", "all passive drives / motors off (no joint tissue at all)", (s) => { s.P.enabled = false; s.w.cons.forEach(({ c }) => [0, 1, 2].forEach(i => c.SetMotorState(s.w._axes.rot[i], J.EMotorState_Off))); replan(s); }],
  ["restitution0", "contact restitution 0 (already 0 in the spec: no-op check)", (s) => { s.w.contactCfg = { ...s.w.contactCfg, restitution: 0 }; }],
  ["friction0", "contact friction 0 (all pairs)", (s) => { s.w.frictionOf = () => 0; }],
  ["specOff", "speculative contact distance 0", (s) => settings(s, p => { p.mSpeculativeContactDistance = 0; })],
  ["warmOff", "warm starting off (constraints and contacts)", (s) => settings(s, p => { p.mConstraintWarmStart = false; })],
  ["jointWarmOff", "joint-only warm start off", (s) => { s.w.cfg.jointWarmStart = false; }],
  ["contactWarmOff", "contact-only warm start off", (s) => settings(s, p => { p.mContactPointPreserveLambdaMaxDistSq = 0; })],
  ["selfColOff", "self-collision off (all body pairs)", (s) => { for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) s.w.gft.DisableCollision(a, b); }],
  ["bootTurfOff", "boot–turf contact removed (pair rejected in OnContactValidate)", (s) => rejectPair(s, isFootTurf)],
  ["singleHullBoot", "single-hull diagnostic boot (the unsplit approved hull, same mass properties)", (s) => feet.forEach(i => footShape(s, i, singleHull(i)))],
  ["boxBoot", "simplified boot: its bounding box as one hull", (s) => feet.forEach(i => footShape(s, i, boxSole(i)))],
  ["turfPlane", "turf = PlaneShape at y = 0 (instead of the 100 × 2 × 100 m box)", (s) => setTurf(s, new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, 50), 0)],
  ["turfBox4", "turf = 8 × 2 × 8 m box (half extents 4, 1, 4)", (s) => setTurf(s, new J.BoxShape(new J.Vec3(4, 1, 4), 0, null))],
  ["turfThin", "turf = 100 × 0.1 × 100 m box (bottom face 0.1 m down)", (s) => setTurf(s, new J.BoxShape(new J.Vec3(50, 0.05, 50), 0, null), -0.05)],
  ["pos0", "position iterations 0", (s) => settings(s, p => { p.mNumPositionSteps = 0; })],
  ["pos1", "position iterations 1", (s) => settings(s, p => { p.mNumPositionSteps = 1; })],
  ["pos4", "position iterations 4", (s) => settings(s, p => { p.mNumPositionSteps = 4; })],
  ["pos10", "position iterations 10", (s) => settings(s, p => { p.mNumPositionSteps = 10; })],
  ["baum0", "Baumgarte 0 (no position correction)", (s) => settings(s, p => { p.mBaumgarte = 0; })],
  ["baum005", "Baumgarte 0.05", (s) => settings(s, p => { p.mBaumgarte = 0.05; })],
  ["maxPen002", "max penetration correction distance 0.2 → 0.02 m", (s) => settings(s, p => { p.mMaxPenetrationDistance = 0.02; })],
  ["maxPen0005", "max penetration correction distance 0.2 → 0.005 m", (s) => settings(s, p => { p.mMaxPenetrationDistance = 0.005; })],
  ["vel30", "velocity iterations 30", (s) => settings(s, p => { p.mNumVelocitySteps = 30; })],
  ["vel600", "velocity iterations 600", (s) => settings(s, p => { p.mNumVelocitySteps = 600; })],
  ["dtHalf", "timestep halved from the saved state (480 Hz)", (s) => { s.dt = s.dt / 2; replan(s); }],
  ["dtThird", "timestep / 3 from the saved state (720 Hz)", (s) => { s.dt = s.dt / 3; replan(s); }],
  ["grav0", "zero gravity from the saved state", (s) => { s.w.setGravity(0); }],
  ["kneeOff", "knee constraint (same side) disabled", (s) => { disableJoint(s, jIdx("knee_" + (s._side))); }],
  ["hipOff", "hip constraint (same side) disabled", (s) => { disableJoint(s, jIdx("hip_" + (s._side))); }],
  ["ankleOff", "ankle constraint (same side) disabled", (s) => { disableJoint(s, jIdx("ankle_" + (s._side))); }],
  ["orderLeafLast", "constraint order: leaf joints solved last", (s) => { s.w.cons.forEach(({ c }, k) => { let d = 0; for (let b = spec.joints[k].childIndex; spec.bodies[b].parentIndex >= 0; b = spec.bodies[b].parentIndex) d++; c.SetConstraintPriority(d); }); }],
  ["orderRootLast", "constraint order: root joints solved last", (s) => { s.w.cons.forEach(({ c }, k) => { let d = 0; for (let b = spec.joints[k].childIndex; spec.bodies[b].parentIndex >= 0; b = spec.bodies[b].parentIndex) d++; c.SetConstraintPriority(100 - d); }); }],
  ["manifoldRed", "Jolt manifold reduction ON (approved OFF)", (s) => settings(s, p => { p.mUseManifoldReduction = true; })],
];
const invalidTurf = (C) => C.filter(c => (c.a === -1) !== (c.b === -1)).filter(c => { const turfFirst = c.a === -1, n = turfFirst ? c.normal : V.sc(c.normal, -1), pT = turfFirst ? c.pts : c.pts2;
  return n[1] < 0.5 || pT.some(p => Math.abs(p[1]) > 0.002); }).map(c => ({ body: names[c.a === -1 ? c.b : c.a], piece: c.a === -1 ? c.sb : c.sa, ny: +(c.a === -1 ? c.normal[1] : -c.normal[1]).toFixed(3) }));
const res = [];
for (const [id, what, f] of A) { if (only && !only.split(",").includes(id)) continue;
  const s = makeSim(J, spec, key, { hz }); runTo(s, ev - 1); s._side = "L";
  // the event foot = the one with an invalid manifold in the baseline (reported by the caller); default L, R when --foot=foot_R
  if (arg("foot", "foot_L") === "foot_R") s._side = "R";
  f(s); if (s._dis) s.up.joints = s.up.joints.filter(p => !s._dis.has(p.k));
  const fi = names.indexOf("foot_" + s._side), f0 = s.st[fi], E0 = s.last.E;
  s.tick(); if (s._dis) s.up.joints = s.up.joints.filter(p => !s._dis.has(p.k));
  const f1 = s.st[fi], dE1 = s.last.E - E0, inv1 = invalidTurf(s.lastContacts || []), jump = V.dist(f1.com, f0.com) * 1000, rot = Q.angle(Q.mul(f1.rot, Q.conj(f0.rot))) * D;
  let Ep = s.last.E, maxRise = dE1, maxAt = ev, invTicks = inv1.length ? 1 : 0, sepMax = s.last.sepMax;
  for (let n = 1; n < win; n++) { if (!s.tick()) break; if (s._dis) s.up.joints = s.up.joints.filter(p => !s._dis.has(p.k)); const r = s.last.E - Ep; Ep = s.last.E; if (r > maxRise) { maxRise = r; maxAt = s.n; } if (invalidTurf(s.lastContacts || []).length) invTicks++; sepMax = Math.max(sepMax, s.last.sepMax); }
  const r = { id, what, eventStep_dE: +dE1.toFixed(3), eventStep_footJumpMm: +jump.toFixed(2), eventStep_footRotDeg: +rot.toFixed(2), eventStep_invalidTurfManifolds: inv1, windowMaxRiseJ: +maxRise.toFixed(3), windowMaxRiseTick: maxAt, invalidTicksInWindow: invTicks, sepMaxMm: +(sepMax * 1000).toFixed(1) };
  res.push(r); console.log(JSON.stringify(r)); s.destroy(); }
if (out) fs.writeFileSync(out, JSON.stringify({ human, key, hz, event: ev, window: win, kNeutral: JS.ankleNeutralKPerDeg(), ablations: res }, null, 1));
