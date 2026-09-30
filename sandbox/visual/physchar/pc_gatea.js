// ═══ physchar/pc_gatea.js — GATE A: the PASSIVE 14-body humanoid — deterministic drop suite, measurement, recording ═══════════════════
// No motors, no targets, no controller: after release only gravity + inertia + articulation + turf contact + friction move the body.
// The initial condition of each drop is a pose (root placement + joint angles, expressed in the same constraint coordinates the joint
// limits use) and a rigid-body velocity field; everything after that is the solver.
import { V, Q, rad, deg, hashNums, dtan } from "./pc_math.js";
import { shapeLowestY, MATERIALS } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { skinMatrices, meshLowestY } from "./pc_fit.js";

const Rx = (d) => Q.axis([1, 0, 0], rad(d)), Ry = (d) => Q.axis([0, 1, 0], rad(d)), Rz = (d) => Q.axis([0, 0, 1], rad(d));
const mulAll = (...qs) => qs.reduce((a, b) => Q.mul(a, b));
// joint params: SixDOF { t: twist, y: swingY, z: swingZ } (deg, the joint's own constraint coordinates — see pc_body JOINT_DEFS);
// hinge { a } (deg, > 0 = flexion). Unlisted joints stay at 0 (the bind relation).
export const DROPS = {
  A: { title: "A — relaxed upright drop", note: "Standing, joints slightly relaxed, 3 cm above the turf, released from rest. Passive: the legs must buckle and the body collapse.",
    rot: Q.id(), lift: 0.03, v: [0, 0, 0], w: [0, 0, 0],
    j: { knee_L: { a: 4 }, knee_R: { a: 4 }, elbow_L: { a: 12 }, elbow_R: { a: 12 }, shoulder_L: { z: -8 }, shoulder_R: { z: 8 }, hip_L: { y: -4 }, hip_R: { y: -4 } } },
  B: { title: "B — hip / side-first fall", note: "Rolled ~92° onto his right side with the trunk laterally bent up away from the turf, the right arm raised overhead (10° inside its abduction limit) and the legs lightly flexed, so the right thigh / hip is the lowest point (pelvis +28 mm, abdomen +60 mm, upper arm +84 mm, shin +97 mm above it); 20 cm up, 0.5 m/s down.",
    rot: Rz(-92), lift: 0.20, v: [0, -0.5, 0], w: [0, 0, 0],
    j: { lumbar: { z: -20 }, thoracic: { z: -15 }, hip_R: { y: -25, z: -10 }, knee_R: { a: 35 }, hip_L: { y: -60, z: -25 }, knee_L: { a: 70 },
         shoulder_R: { y: -20, z: 140 }, elbow_R: { a: 70 }, shoulder_L: { y: -40, z: -20 }, elbow_L: { a: 40 } } },
  C: { title: "C — shoulder / upper-body-first fall", note: "Pitched forward and rolled to the right with a bend at the hips, so the right shoulder / arm meets the turf first; arms asymmetric (right forward, left back); 30 cm up.",
    rot: mulAll(Rz(-35), Rx(70)), lift: 0.30, v: [0, -0.3, 0.4], w: [0, 0, 0],
    j: { hip_L: { y: -30 }, hip_R: { y: -20 }, knee_L: { a: 15 }, knee_R: { a: 30 }, shoulder_R: { y: -60, z: 10 }, elbow_R: { a: 20 }, shoulder_L: { y: 35, z: -15 }, elbow_L: { a: 60 },
         lumbar: { y: 10 }, neck: { y: -15 } } },
  D: { title: "D — rotating fall", note: "Nearly upright, feet just above the turf, with an initial tumble + yaw (ω = 1.5 / 2.0 / −2.5 rad/s) and a sideways drift of 1.2 m/s.",
    rot: mulAll(Rx(-15)), lift: 0.02, v: [1.2, 0, 0.6], w: [1.5, 2.0, -2.5],
    j: { knee_L: { a: 10 }, knee_R: { a: 25 }, elbow_L: { a: 30 }, elbow_R: { a: 15 }, shoulder_R: { z: 25 }, shoulder_L: { z: -10, y: -20 } } },
  E: { title: "E — awkward asymmetric fall", note: "Deliberately non-symmetric everything: root turned 30° / pitched 25° / rolled −35°; right leg flexed-abducted-twisted, left extended; arms in opposite configurations; spine twisted and bent; 40 cm up with a small tumble.",
    rot: mulAll(Ry(30), Rx(25), Rz(-35)), lift: 0.40, v: [0.3, -0.5, 0.2], w: [0.5, -0.8, 0.3],
    j: { hip_R: { y: -70, z: 20, t: 15 }, hip_L: { y: 15, z: 10, t: -20 }, knee_R: { a: 90 }, knee_L: { a: 20 }, ankle_R: { y: 30 }, ankle_L: { y: -10 },
         lumbar: { t: 10, z: -10, y: 15 }, thoracic: { t: 15 }, neck: { t: 30, y: 10 },
         shoulder_R: { y: -110, z: 20, t: 30 }, shoulder_L: { y: 20, z: -60, t: -20 }, elbow_R: { a: 100 }, elbow_L: { a: 30 } } },
};
// the relative rotation a joint parameter set means, expressed in the parent's bind frame (= world at bind)
export function jointRelRot(j, p) {
  if (!p) return Q.id();
  if (j.type === "hinge") return Q.axis(j.axis, rad(p.a || 0));
  const C = Q.fromAxes(j.X, j.Y, j.Z), qt = Q.axis([1, 0, 0], rad(p.t || 0)), qs = Q.norm([0, dtan(rad(p.y || 0) / 2), dtan(rad(p.z || 0) / 2), 1]);
  return Q.mul(Q.mul(C, Q.mul(qs, qt)), Q.conj(C));
}
// forward kinematics of the body chain: root rotation + joint params → per-body { pos (origin), rot }
export function poseBodies(spec, rootRot, params) {
  const S = spec.bodies.map(() => null);
  S[0] = { pos: spec.bodies[0].origin.slice(), rot: rootRot };
  for (const j of spec.joints) { const P = S[j.parentIndex], pb = spec.bodies[j.parentIndex], cb = spec.bodies[j.childIndex];
    const rot = Q.norm(Q.mul(P.rot, jointRelRot(j, params[j.name]))), pos = V.add(P.pos, Q.rot(P.rot, V.sub(cb.origin, pb.origin)));
    S[j.childIndex] = { pos, rot }; }
  return S;
}
export const lowestOf = (spec, S) => { let m = 1e9, who = -1; spec.bodies.forEach((b, i) => { for (const s of b.shapes) { const y = shapeLowestY(s, S[i].pos, S[i].rot); if (y < m) { m = y; who = i; } } }); return { y: m, body: who }; };
// joint measurement in the constraint's own coordinates (matches Jolt's GetRotationInConstraintSpace / hinge angle)
export function jointState(j, S) {
  const R1 = S[j.parentIndex].rot, R2 = S[j.childIndex].rot, rel = Q.mul(Q.conj(R1), R2);
  if (j.type === "hinge") { const qa = Q.mul(Q.conj(Q.fromAxes(j.axis, j.normal, V.cross(j.axis, j.normal))), Q.mul(rel, Q.fromAxes(j.axis, j.normal, V.cross(j.axis, j.normal))));
    const a = 2 * Math.atan2(qa[0], qa[3]); return { a, viol: Math.max(0, j.lo - a, a - j.hi) }; }
  const C = Q.fromAxes(j.X, j.Y, j.Z), qcs = Q.mul(Q.conj(C), Q.mul(rel, C)), st = Q.swingTwist(qcs), L = j.limits;
  const v = (x, r) => Math.max(0, r[0] - x, x - r[1]);
  return { ...st, viol: Math.max(v(st.twist, L.twist), v(st.swingY, L.swingY), v(st.swingZ, L.swingZ)) };
}
// Touchline's per-pair friction policy (handed to the substrate adapter)
export const frictionPolicy = (spec) => (i1, i2) => {
  const m = (i) => i < 0 ? "turf" : spec.bodies[i].material, a = m(i1), b = m(i2), P = MATERIALS.pairs;
  return P[`${a}|${b}`] ?? P[`${b}|${a}`] ?? (a === "turf" || b === "turf" ? P["body|turf"] : P["body|body"]);
};
// SELF-COLLISION FILTER: only jointed (parent–child) pairs + pelvis↔chest are disabled. Every other pair collides — a hand can never
// pass through a thigh. Instead of filtering pairs that touch in some pose, each drop's STARTING pose is checked for self-overlap here
// (a throwaway zero-gravity world, one tiny step) and the pose is fixed if it overlaps. Returns [{a, b, depthMm}].
// + abdomen↔thigh (two links apart across the hip): during deep hip flexion that contact sits exactly where the hip joint + its flexion
// limit already act, and the contact and the joint fight (measured: 12 J injected, 23 mm overlap in drop A) — the hip limit is the
// anatomical stop. Toggle with cfg.keepAbdomenThigh to reproduce.
export const I = (spec, n) => spec.bodies.findIndex(b => b.name === n);
export function disabledPairs(spec, cfg) { const out = [...spec.joints.map(j => [j.parentIndex, j.childIndex]), [0, 2]];
  if (!(cfg && cfg.keepAbdomenThigh)) out.push([I(spec, "abdomen"), I(spec, "thigh_L")], [I(spec, "abdomen"), I(spec, "thigh_R")]); return out; }
export function initialSelfOverlaps(J, spec, dropKey, cfg) {
  const D = DROPS[dropKey], w = new JoltCharacterWorld(J, spec, Object.assign({}, cfg, { gravity: 0 }), () => 0.5);
  for (const [a, b] of disabledPairs(spec, cfg)) w.disablePair(a, b);
  let S = poseBodies(spec, D.rot, D.j); const lo = lowestOf(spec, S), up = D.lift - lo.y + 1.0;   // well above the turf: self contacts only
  S.forEach((s, i) => w.setPose(i, V.add(s.pos, [0, up, 0]), s.rot)); w.setGravity(0); w.step(1 / 6000, 1);
  const out = []; for (const c of w.contacts) if (c.a >= 0 && c.b >= 0 && c.depth > 0.001) out.push({ a: spec.bodies[c.a].name, b: spec.bodies[c.b].name, depthMm: +(c.depth * 1000).toFixed(1) });
  w.destroy(); return out;
}
// GATE A CONFIGURATION (chosen by measurement, see GATE_A_REPORT.md): 240 Hz × 1 collision step,
// 30 velocity / 4 position iterations (Jolt defaults 10 / 2), penetration slop 5 mm, knee / elbow end-stops as 20 Hz
// critically-damped springs, passive joint friction per JOINT_DEFS.
export const GATE_A_TSC = "240x1", GATE_A_WORLD = { hingeSoftHz: 20, hingeSoftZeta: 1.0, velSteps: 30, posSteps: 4 };
export const TIMESTEP_CONFIGS = {
  "60x1": { hz: 60, coll: 1, label: "60 Hz, 1 collision step" },
  "60x2": { hz: 60, coll: 2, label: "60 Hz, 2 collision steps" },
  "120x1": { hz: 120, coll: 1, label: "120 Hz, 1 collision step" },
  "180x1": { hz: 180, coll: 1, label: "180 Hz, 1 collision step" },
  "240x1": { hz: 240, coll: 1, label: "240 Hz, 1 collision step" },
};
// run one drop; returns per-step records + a summary. opts: { seconds, tsc (TIMESTEP_CONFIGS key), world (cfg overrides), mesh, rig, refList, map, keepStates }
export function runDrop(J, spec, dropKey, opts) {
  const D = DROPS[dropKey], T = TIMESTEP_CONFIGS[opts.tsc || "60x1"], dt = 1 / T.hz, steps = Math.round((opts.seconds || 6) * T.hz), g = 9.81;
  const w = new JoltCharacterWorld(J, spec, opts.world || {}, frictionPolicy(spec));
  for (const [a, b] of disabledPairs(spec, opts.world)) w.disablePair(a, b);    // parent–child + pelvis↔chest (the trunk boxes share the spine's bending volume)
  // initial condition: pose, then lift so the lowest collider point sits `lift` above the turf; rigid velocity field about the total COM
  let S = poseBodies(spec, D.rot, D.j); const lo = lowestOf(spec, S), up = D.lift - lo.y; S = S.map(s => ({ pos: V.add(s.pos, [0, up, 0]), rot: s.rot }));
  const comW = (i, s) => V.add(s.pos, Q.rot(s.rot, spec.bodies[i].com)), M = spec.totalMass;
  const pivot = V.sc(S.reduce((a, s, i) => V.add(a, V.sc(comW(i, s), spec.bodies[i].mass)), [0, 0, 0]), 1 / M);
  S.forEach((s, i) => { w.setPose(i, s.pos, s.rot); w.setVel(i, V.add(D.v, V.cross(D.w, V.sub(comW(i, s), pivot))), D.w); });
  const initialLowest = lo.body;
  const recs = [], nb = spec.bodies.length, E0 = { ke: null, pe: null };
  let prev = null, h = 2166136261, cpu = 0;
  const firstGround = new Array(nb).fill(null);
  for (let n = 0; n <= steps; n++) {
    if (n > 0) { const t0 = (typeof performance !== "undefined" ? performance.now() : 0); w.step(dt, T.coll); cpu += (typeof performance !== "undefined" ? performance.now() : 0) - t0; }
    const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i));
    // ── measurements ──
    let groundPen = 0, groundBody = -1; for (let i = 0; i < nb; i++) for (const s of spec.bodies[i].shapes) { const y = shapeLowestY(s, st[i].pos, st[i].rot); if (-y > groundPen) { groundPen = -y; groundBody = i; } }
    let anchorErr = 0, anchorJoint = -1, limitViol = 0, limitJoint = -1, hardViol = 0, hardJoint = -1, softViol = 0; const jstates = [];
    spec.joints.forEach((j, k) => { const P = st[j.parentIndex], pb = spec.bodies[j.parentIndex]; const a1 = V.add(P.pos, Q.rot(P.rot, V.sub(j.at, pb.origin))), a2 = st[j.childIndex].pos, e = V.dist(a1, a2);
      if (e > anchorErr) { anchorErr = e; anchorJoint = k; } const js = jointState(j, st); jstates.push(js); if (js.viol > limitViol) { limitViol = js.viol; limitJoint = k; }
      if (j.type === "sixdof") { if (js.viol > hardViol) { hardViol = js.viol; hardJoint = k; } } else softViol = Math.max(softViol, js.viol); });
    let ke = 0, pe = 0, maxV = 0; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s = st[i];
      const wl = Q.rot(Q.conj(s.rot), s.w); ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2);
      pe += b.mass * g * s.com[1]; maxV = Math.max(maxV, V.len(s.v)); }
    if (E0.ke == null) { E0.ke = ke; E0.pe = pe; }
    let pop = 0, popBody = -1; if (prev) for (let i = 0; i < nb; i++) { const e = V.dist(V.sub(st[i].com, prev[i].com), V.sc(st[i].v, dt)); if (e > pop) { pop = e; popBody = i; } }
    let selfPen = 0, selfPair = null, groundDepthEngine = 0; const cts = w.contacts.map(c => ({ ...c }));
    for (const c of cts) { if (c.a < 0 || c.b < 0) { groundDepthEngine = Math.max(groundDepthEngine, c.depth); const bi = c.a < 0 ? c.b : c.a; if (firstGround[bi] == null) firstGround[bi] = n * dt; }
      else if (c.depth > selfPen) { selfPen = c.depth; selfPair = `${spec.bodies[c.a].name}–${spec.bodies[c.b].name}`; } }
    const keB = st.map((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w); return 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); });
    const awake = st.filter(s => s.awake).length;
    for (const s of st) h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h);
    let meshPen = null, meshBone = null; if (opts.mesh && (n % Math.max(1, T.hz / 60) === 0)) { const sk = skinMatrices(opts.rig, spec, st, opts.map); const r = meshLowestY(opts.mesh, sk, opts.refList); meshPen = Math.max(0, -r.minY);
      if (r.vertex >= 0) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const wv = opts.mesh.weights[r.vertex * 4 + k]; if (wv > bw) { bw = wv; bi = opts.mesh.joints[r.vertex * 4 + k]; } } meshBone = opts.rig.bones[bi].name; } }
    const rec = { n, t: n * dt, groundPen, groundBody, anchorErr, anchorJoint, limitViol, limitJoint, hardViol, hardJoint, softViol, ke, pe, E: ke + pe, pop, popBody, selfPen, selfPair, groundDepthEngine, awake, maxV, meshPen, meshBone, contacts: cts.length, keB };
    if (opts.keepStates) { rec.states = st.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w, awake: s.awake })); rec.cts = cts; rec.jstates = jstates; }
    recs.push(rec); prev = st;
  }
  w.destroy();
  return summarize(spec, D, dropKey, T, recs, { cpu, steps, hash: (h >>> 0).toString(16), firstGround, initialLowest, E0 });
}
function summarize(spec, D, key, T, recs, x) {
  const maxBy = (f) => recs.reduce((best, r) => (f(r) > f(best) ? r : best), recs[0]);
  const wg = maxBy(r => r.groundPen), wa = maxBy(r => r.anchorErr), wl = maxBy(r => r.limitViol), wp = maxBy(r => r.pop), ws = maxBy(r => r.selfPen);
  // energy growth without an external source: total mechanical energy increasing between consecutive steps
  let gainMax = 0, gainAt = 0, gainSteps = 0, gainTotal = 0, peShare = 0; for (let i = 1; i < recs.length; i++) { const d = recs[i].E - recs[i - 1].E; if (d > 0.05) { gainSteps++; gainTotal += d; peShare += Math.max(0, recs[i].pe - recs[i - 1].pe); } if (d > gainMax) { gainMax = d; gainAt = i; } }
  const sleepRec = recs.find(r => r.awake === 0) || null;
  let settleAt = null; for (let i = recs.length - 1; i >= 0; i--) { if (recs[i].ke > 0.2) { settleAt = i + 1 < recs.length ? recs[i + 1].t : null; break; } if (i === 0) settleAt = 0; }
  const lastHalf = recs.filter(r => r.t >= recs[recs.length - 1].t - 0.5);
  const meshPens = recs.filter(r => r.meshPen != null).map(r => r.meshPen);
  const order = x.firstGround.map((t, i) => ({ body: spec.bodies[i].name, t })).filter(o => o.t != null).sort((a, b) => a.t - b.t);
  return { drop: key, title: D.title, tsc: T.label, steps: x.steps, hash: x.hash,
    initialLowestBody: spec.bodies[x.initialLowest].name, E0: { ke: +x.E0.ke.toFixed(2), pe: +x.E0.pe.toFixed(1) },
    maxGroundPenMm: +(wg.groundPen * 1000).toFixed(2), maxGroundPenAt: { n: wg.n, t: +wg.t.toFixed(3), body: wg.groundBody >= 0 ? spec.bodies[wg.groundBody].name : "-" },
    maxEngineGroundDepthMm: +(Math.max(...recs.map(r => r.groundDepthEngine)) * 1000).toFixed(2),
    maxMeshPenMm: meshPens.length ? +(Math.max(...meshPens) * 1000).toFixed(1) : null,
    maxMeshPenPart: meshPens.length ? (recs.filter(r => r.meshPen != null).reduce((a, r) => r.meshPen > a.meshPen ? r : a).meshBone) : null,
    restMeshPenMm: meshPens.length ? +(Math.max(...lastHalf.filter(r => r.meshPen != null).map(r => r.meshPen)) * 1000).toFixed(1) : null,
    restMeshPenPart: meshPens.length ? (lastHalf.filter(r => r.meshPen != null).reduce((a, r) => r.meshPen > a.meshPen ? r : a).meshBone) : null,
    restGroundPenMm: +(Math.max(...lastHalf.map(r => r.groundPen)) * 1000).toFixed(2),
    maxSelfPenMm: +(ws.selfPen * 1000).toFixed(2), maxSelfPenAt: { n: ws.n, t: +ws.t.toFixed(3), pair: ws.selfPair },
    maxAnchorErrMm: +(wa.anchorErr * 1000).toFixed(3), maxAnchorAt: { n: wa.n, t: +wa.t.toFixed(3), joint: wa.anchorJoint >= 0 ? spec.joints[wa.anchorJoint].name : "-" },
    maxLimitViolDeg: +deg(wl.limitViol).toFixed(2), maxLimitAt: { n: wl.n, t: +wl.t.toFixed(3), joint: wl.limitJoint >= 0 ? spec.joints[wl.limitJoint].name : "-" },
    maxHardLimitViolDeg: +deg(Math.max(...recs.map(r => r.hardViol))).toFixed(2), maxHardLimitAt: (() => { const r = recs.reduce((a, r) => r.hardViol > a.hardViol ? r : a); return { n: r.n, t: +r.t.toFixed(3), joint: r.hardJoint >= 0 ? spec.joints[r.hardJoint].name : "-" }; })(),
    hardLimitViolOver2degSteps: recs.filter(r => r.hardViol > rad(2)).length,
    maxSoftStopOvershootDeg: +deg(Math.max(...recs.map(r => r.softViol))).toFixed(2),
    maxPopMm: +(wp.pop * 1000).toFixed(2), maxPopAt: { n: wp.n, t: +wp.t.toFixed(3), body: wp.popBody >= 0 ? spec.bodies[wp.popBody].name : "-" },
    energyGain: { stepsOver50mJ: gainSteps, maxJ: +gainMax.toFixed(3), totalJ: +gainTotal.toFixed(2), fromPE: +peShare.toFixed(2), at: +(recs[gainAt] || recs[0]).t.toFixed(3),
      dPE: gainAt > 0 ? +(recs[gainAt].pe - recs[gainAt - 1].pe).toFixed(3) : 0, dKE: gainAt > 0 ? +(recs[gainAt].ke - recs[gainAt - 1].ke).toFixed(3) : 0,
      body: gainAt > 0 ? spec.bodies[recs[gainAt].keB.map((k, i) => k - recs[gainAt - 1].keB[i]).reduce((bi, d, i, arr) => d > arr[bi] ? i : bi, 0)].name : "-" },
    keCurve: recs.filter((r, i) => i % Math.max(1, Math.round(recs.length / 60)) === 0).map(r => [+r.t.toFixed(2), +r.ke.toFixed(2)]),
    settleT: settleAt, sleepT: sleepRec ? +sleepRec.t.toFixed(3) : null,
    residualMaxSpeedMmS: +(Math.max(...lastHalf.map(r => r.maxV)) * 1000).toFixed(1),
    firstGroundContactOrder: order.slice(0, 8).map(o => `${o.body}@${o.t.toFixed(3)}`),
    cpuMsPerStep: +(x.cpu / Math.max(1, x.steps)).toFixed(4), cpuMsPerFrame: +(x.cpu / Math.max(1, x.steps) * (T.hz / 60)).toFixed(4),
    bodies: spec.bodies.length, constraints: spec.joints.reduce((a, j) => (a[j.type] = (a[j.type] || 0) + 1, a), {}),
    worst: { groundPen: wg.n, anchor: wa.n, limit: wl.n, pop: wp.n, self: ws.n, energy: recs[gainAt] ? recs[gainAt].n : 0 },
    recs };
}
