// ═══ physchar2/gates/v2_g1_boot.js — decision C3: the boot contact-manifold experiment (NOT adopted unless a clear winner) ══════════════
// Representations (identical external geometry): R1 the approved single convex hull; R2 two convex pieces (rear / front); R3 four convex
// pieces (rear / front × medial / lateral). Jolt contact settings varied independently: default; manifold reduction off; body-pair contact
// cache off; both off; enhanced internal-edge removal on the boot. Two test families:
//   (a) the LOADED-BOOT RIG: one rigid body = the exact boot collider(s) carrying half the body weight (39.2 kg, COM 10 cm above the AJC,
//       radius of gyration 0.12 m) on the turf — quiet loading, heel / flat / medial-edge / lateral-edge / toe contacts from 2 cm, flat and
//       heel impacts at 3 m/s, and a friction-stability test (a FORE–AFT force = 0.5·μ·N at the COM for 0.5 s after settling: no creep expected;
//       fore–aft because a sideways force at the 19 cm high COM tips the loaded boot over its 5.6 cm half-width — measured, first version);
//   (b) the full-body passive falls (the G1 standing-fall scenarios) on V2-REF.
import { V, Q, rad } from "../core/v2_math.js";
import { V2JoltWorld } from "../core/v2_jolt.js";
import { bodyLowest } from "../sim/v2_geom.js";
import { splitBootHull, splitBootHull4, singleHull, splitBootGrid, BOOT_GRIDS } from "./v2_g1_dx.js";
import { G1_WORLD } from "./v2_g1.js";

export { singleHull };
// the ORIGINAL approved hull vertices: the union of the spec's C3 pieces minus the points on their shared cut plane (the cut points are on that
// plane by construction; the hull of what remains is the approved hull). Rebuilding R2 / R3 from the 387-point union instead made the pairwise
// cut-point construction blow up quadratically (stack overflow and WASM out-of-memory in the v2 run).
export function originalHull(spec) { const s = singleHull(spec); for (const b of s.bodies) { if (!/^foot_/.test(b.name)) continue; const sp = spec.bodies.find(x => x.name === b.name).shapes.filter(x => x.type === "hull");
  if (sp.length !== 2) continue; const zc = Math.max(...sp[0].points.map(p => p[2])), seen = new Set(), h = b.shapes.find(x => x.type === "hull");
  h.points = h.points.filter(p => Math.abs(p[2] - zc) > 1e-9).filter(p => { const k = p.map(v => v.toFixed(9)).join(","); if (seen.has(k)) return false; seen.add(k); return true; }); } return s; }
export const BOOT_REPS = { R1_hull: (s) => originalHull(s), R2_split2: (s) => splitBootHull(originalHull(s), 0.55), R3_split4: (s) => splitBootGrid(originalHull(s), [0.55], [0.5]),   // same pieces as splitBootHull4 (AP 0.55 × ML mid-width), cut points hull-reduced
  // added after the root cause was found (Jolt's supporting-face rule; calc/boot_face_model.py): finer grids of the same hull
  R4_grid10: (s) => splitBootGrid(originalHull(s), ...BOOT_GRIDS.AP5xML2), R5_grid12: (s) => splitBootGrid(originalHull(s), ...BOOT_GRIDS.AP4xML3) };
// explicit (the V2 world default changed to S3 when C3 was adopted): S0 = Jolt defaults (reduction ON, cache ON)
export const BOOT_SETTINGS = { S0_default: { manifoldReduction: true, pairCache: true }, S1_reductionOff: { manifoldReduction: false, pairCache: true }, S2_cacheOff: { manifoldReduction: true, pairCache: false },
  S3_bothOff: { manifoldReduction: false, pairCache: false }, S4_edgeRemoval: { manifoldReduction: true, pairCache: true, enhancedEdge: true } };
export const RIG_CASES = {
  quiet: { title: "quiet loading (flat, 1 mm)", rot: [0, 0, 0, 1], lift: 0.001, vy: 0, friction: true },
  heel: { title: "heel contact (15° toe-up, 2 cm drop)", rot: Q.axis([1, 0, 0], rad(-15)), lift: 0.02, vy: 0 },
  flat: { title: "flat contact (2 cm drop)", rot: [0, 0, 0, 1], lift: 0.02, vy: 0 },
  medialEdge: { title: "medial-edge loading (rolled 20°, 2 cm drop)", rot: Q.axis([0, 0, 1], rad(20)), lift: 0.02, vy: 0 },
  lateralEdge: { title: "lateral-edge loading (rolled 20°, 2 cm drop)", rot: Q.axis([0, 0, 1], rad(-20)), lift: 0.02, vy: 0 },
  toe: { title: "toe / forefoot loading (20° toe-down, 2 cm drop)", rot: Q.axis([1, 0, 0], rad(20)), lift: 0.02, vy: 0 },
  flatFast: { title: "flat impact at 3 m/s", rot: [0, 0, 0, 1], lift: 0.02, vy: -3 },
  heelFast: { title: "heel impact at 3 m/s (15°)", rot: Q.axis([1, 0, 0], rad(-15)), lift: 0.02, vy: -3 },
  // HELD cases (added after the first C3 run): the loaded boot's ROTATION is locked (translation free), so the edge / toe / heel / side contact
  // carries the full 39.2 kg statically. The unheld edge / toe cases tip over (COM 19 cm up over a 5.6 cm half-width) and never settle.
  medialEdgeHeld: { title: "medial edge, held (rolled 20°, rotation locked)", rot: Q.axis([0, 0, 1], rad(20)), lift: 0.002, vy: 0, hold: true },
  lateralEdgeHeld: { title: "lateral edge, held (rolled 20°, rotation locked)", rot: Q.axis([0, 0, 1], rad(-20)), lift: 0.002, vy: 0, hold: true },
  toeHeld: { title: "toe, held (20° toe-down, rotation locked)", rot: Q.axis([1, 0, 0], rad(20)), lift: 0.002, vy: 0, hold: true },
  heelHeld: { title: "heel, held (15° toe-up, rotation locked)", rot: Q.axis([1, 0, 0], rad(-15)), lift: 0.002, vy: 0, hold: true },
  sideHeld: { title: "boot on its side, held (the singleLeg rest orientation, rotation locked)", rot: Q.norm([-0.100, 0.187, -0.458, 0.863]), lift: 0.002, vy: 0, hold: true },
};
export const FALL_KEYS = ["upright", "leanF", "leanB", "leanL", "leanR", "perturb", "singleLeg", "dropA", "sideFirst", "awkward", "drop1m"];

export function bootRig(J, spec, caseKey, cfg0 = {}) {
  const C = RIG_CASES[caseKey], cfg = Object.assign({}, G1_WORLD, cfg0), dt = 1 / cfg.hz, N = Math.round(1.6 * cfg.hz);
  const foot = spec.bodies.find(b => b.name === "foot_R"), m = 39.2, I = m * 0.12 * 0.12;
  const body = { ...foot, index: 0, parentIndex: -1, mass: m, comLocal: [0, 0.10, 0], inertia: [[I, 0, 0], [0, I, 0], [0, 0, I]], holdRotation: !!C.hold };
  const mini = { bodies: [body], joints: [], disabledPairs: [], contact: spec.contact };
  const w = new V2JoltWorld(J, mini, spec.contact, { velSteps: cfg.velSteps, posSteps: cfg.posSteps, manifoldReduction: cfg.manifoldReduction, pairCache: cfg.pairCache, enhancedEdge: cfg.enhancedEdge, recordContacts: true });
  const lr = bodyLowest(body, { pos: [0, 0, 0], rot: C.rot }); w.setPose(0, [0, C.lift - lr.y, 0], C.rot); w.setVel(0, [0, C.vy, 0], [0, 0, 0]);
  const mu = spec.contact.friction["boot|turf"], F = 0.5 * mu * m * 9.81, tF0 = Math.round(1.0 * cfg.hz), tF1 = Math.round(1.5 * cfg.hz);
  const rec = { first: null, maxGeo: 0, settledGeo: 0, settledMan: -1, manifolds: [], points: [], normals: [], speeds: [], maxSpeed: 0, Eprev: null, maxRise: 0, creepStart: null, creep: null };
  let tStep = 0;
  for (let n = 0; n < N; n++) {
    if (C.friction && n >= tF0 && n < tF1) { const id = w.bodies[0].GetID(); w.bi.AddForce(id, new J.Vec3(0, 0, F), J.EActivation_Activate); if (n === tF0) rec.creepStart = w.read(0).pos.slice(); }
    const t0 = performance.now(); w.step(dt, cfg.coll); tStep += performance.now() - t0;
    const s = w.read(0), geo = -bodyLowest(body, s).y, tc = w.contacts.filter(c => c.a < 0 || c.b < 0), deepest = tc.reduce((a, c) => (!a || c.depth > a.depth ? c : a), null);
    if (!rec.first && tc.some(c => c.depth > -0.0005)) rec.first = { n, manifoldMm: Math.max(...tc.map(c => c.depth)) * 1000, geoMm: geo * 1000 };
    rec.maxGeo = Math.max(rec.maxGeo, geo); const v = V.len(s.v), wv = V.len(s.w); rec.maxSpeed = Math.max(rec.maxSpeed, v);
    const E = 0.5 * m * v * v + 0.5 * I * wv * wv + m * 9.81 * s.com[1]; if (rec.Eprev != null) rec.maxRise = Math.max(rec.maxRise, E - rec.Eprev); rec.Eprev = E;
    const settleWin = C.friction ? n >= tF0 - Math.round(0.3 * cfg.hz) && n < tF0 : n >= N - Math.round(0.3 * cfg.hz);
    if (settleWin) { rec.settledGeo = Math.max(rec.settledGeo, geo); rec.settledMan = Math.max(rec.settledMan, deepest ? deepest.depth : -1); rec.manifolds.push(tc.length); rec.points.push(tc.reduce((a, c) => a + c.pts.length, 0));
      if (deepest) rec.normals.push(V.norm(deepest.a < 0 ? deepest.normal : V.sc(deepest.normal, -1))); rec.speeds.push([v, wv]); }
    if (C.friction && n === tF1 - 1) rec.creep = Math.hypot(s.pos[0] - rec.creepStart[0], s.pos[2] - rec.creepStart[2]);
  }
  w.destroy();
  const mean = rec.normals.length ? V.norm(rec.normals.reduce((a, n) => V.add(a, n), [0, 0, 0])) : [0, 1, 0], ang = rec.normals.map(n => Math.acos(Math.max(-1, Math.min(1, V.dot(n, mean)))) * 180 / Math.PI);
  let jump = 0; for (let i = 1; i < rec.normals.length; i++) jump = Math.max(jump, Math.acos(Math.max(-1, Math.min(1, V.dot(rec.normals[i], rec.normals[i - 1])))) * 180 / Math.PI);
  const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / Math.max(1, a.length));
  return { case: caseKey, title: C.title, firstTouchManifoldMm: rec.first ? rec.first.manifoldMm : null, firstTouchGeoMm: rec.first ? rec.first.geoMm : null, maxTransientMm: rec.maxGeo * 1000, settledMm: rec.settledGeo * 1000,
    settledManifoldMm: rec.settledMan * 1000, manifoldsAvg: rec.manifolds.reduce((a, x) => a + x, 0) / Math.max(1, rec.manifolds.length), pointsAvg: rec.points.reduce((a, x) => a + x, 0) / Math.max(1, rec.points.length),
    normalStdDeg: rms(ang), normalMaxJumpDeg: jump, jitterV: rms(rec.speeds.map(x => x[0])), jitterW: rms(rec.speeds.map(x => x[1])), creepMm: rec.creep == null ? null : rec.creep * 1000,
    maxSpeed: rec.maxSpeed, maxEnergyRiseJ: rec.maxRise, msPerStep: tStep / N };
}
// HELD SWEEP (Jolt-side validation of calc/boot_face_model.py): the loaded boot, rotation locked, settled on the turf at n seeded uniformly random
// orientations; the settled depth beyond the slop is the supporting-face sink. Deterministic (xorshift seed → Shoemake uniform quaternion).
export function heldSweep(J, spec, n = 200, cfg0 = {}, seed = 12345) {
  let x = seed >>> 0; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const cfg = Object.assign({}, G1_WORLD, cfg0), dt = 1 / cfg.hz, N = Math.round(0.5 * cfg.hz), foot = spec.bodies.find(b => b.name === "foot_R"), m = 39.2, I = m * 0.12 * 0.12, out = [];
  const body = { ...foot, index: 0, parentIndex: -1, mass: m, comLocal: [0, 0.10, 0], inertia: [[I, 0, 0], [0, I, 0], [0, 0, I]], holdRotation: true };
  const w = new V2JoltWorld(J, { bodies: [body], joints: [], disabledPairs: [], contact: spec.contact }, spec.contact, { velSteps: cfg.velSteps, posSteps: cfg.posSteps, manifoldReduction: cfg.manifoldReduction, pairCache: cfg.pairCache, recordContacts: true });
  for (let k = 0; k < n; k++) {   // one world, re-posed per orientation (a world per orientation exhausted the WASM heap)
    const u1 = rnd(), u2 = rnd(), u3 = rnd(), q = [Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2), Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2), Math.sqrt(u1) * Math.sin(2 * Math.PI * u3), Math.sqrt(u1) * Math.cos(2 * Math.PI * u3)];
    const lr = bodyLowest(body, { pos: [0, 0, 0], rot: q }); w.setPose(0, [0, 0.05 - lr.y, 0], q); w.setVel(0, [0, 0, 0], [0, 0, 0]); w.step(dt, cfg.coll);   // clear the previous contact
    w.setPose(0, [0, 0.002 - lr.y, 0], q); w.setVel(0, [0, 0, 0], [0, 0, 0]); let mx = 0;
    for (let i = 0; i < N; i++) { w.step(dt, cfg.coll); mx = Math.max(mx, -bodyLowest(body, w.read(0)).y); }
    out.push({ k, q, settledMm: -bodyLowest(body, w.read(0)).y * 1000, maxMm: mx * 1000 }); }
  w.destroy();
  const s = out.map(o => o.settledMm).sort((a, b) => a - b), pct = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n, overSlopPlus2: out.filter(o => o.settledMm > 7).length / n, over10: out.filter(o => o.settledMm > 10).length / n, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: s.at(-1), worst: out.reduce((a, o) => (o.settledMm > a.settledMm ? o : a), out[0]) };
}
