// ═══ physchar/pc_gatec2.js — GATE C2: WEIGHT TRANSFER AND DELIBERATE FOOT PLACEMENT — deterministic suite, measurement, recording ═══════
// Loop per 240 Hz step: observation → SupportSequencer (requests → phase, ξ_ref, swing target) → C1 BalanceController (targets, gains)
// → finite Jolt motors → step → SENSING → record. Same guarantees as C1: no pelvis support, no root anchor, no state write after t = 0
// (asserted, and the pelvis external-force residual measured). No corrective stepping: C1's STEP_NEEDED is never connected to a step.
import { V, Q, rad, deg, hashNums } from "./pc_math.js";
import { shapeLowestY, shapeSdf } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, jointState, frictionPolicy, TIMESTEP_CONFIGS } from "./pc_gatea.js";
import { buildPoses } from "./pc_control.js";
import { Sensor, polyDist } from "./pc_sense.js";
import { BalanceController, budgetLimits, BAL, controllerProfile } from "./pc_balance.js";
import { GATE_C1_WORLD, GATE_C1_TSC } from "./pc_gatec1.js";
import { SupportSequencer, SUP } from "./pc_support.js";

const place = (foot, forward, outward, extra) => Object.assign({ type: "place", foot, forward, outward }, extra || {});
export const TESTS_C2 = {
  A_shift: { group: "A weight shift", title: "A — static weight shift L↔R (no lift): 25 → 10 → 50 → 75 → 90 → 50 % toward R", seconds: 12,
    requests: [{ type: "shift", w: 0.25, T: 1.0, hold: 0.8, at: 0.5 }, { type: "shift", w: 0.10, T: 1.0, hold: 0.8, pause: 0 }, { type: "shift", w: 0.5, T: 1.2, hold: 0.8, pause: 0 },
      { type: "shift", w: 0.75, T: 1.0, hold: 0.8, pause: 0 }, { type: "shift", w: 0.90, T: 1.0, hold: 0.8, pause: 0 }, { type: "shift", w: 0.5, T: 1.2, hold: 0.8, pause: 0 }] },
  B_lift_R: { group: "B single support", title: "B — shift onto L, lift R 8 cm, hold 2 s, set it back down in place", seconds: 8, requests: [{ type: "lift", foot: "R", holdS: 2.0, at: 0.5 }] },
  B_hold_R: { group: "B single support", title: "B — V1.1 comparison: shift onto L, lift R 8 cm and HOLD 20 s (single-leg sustainability)", seconds: 27, requests: [{ type: "lift", foot: "R", holdS: 20.0, at: 0.5 }] },
  B_lift_L: { group: "B single support", title: "B — shift onto R, lift L 8 cm, hold 2 s, set it back down in place", seconds: 8, requests: [{ type: "lift", foot: "L", holdS: 2.0, at: 0.5 }] },
  C_lat_R: { group: "C–E placement", title: "C — place R 10 cm outward (sideways)", seconds: 6, requests: [place("R", 0, 0.10, { at: 0.5 })] },
  D_fwd_R: { group: "C–E placement", title: "D — place R 20 cm forward", seconds: 6, requests: [place("R", 0.20, 0, { at: 0.5 })] },
  E_bwd_R: { group: "C–E placement", title: "E — place R 15 cm backward", seconds: 6, requests: [place("R", -0.15, 0, { at: 0.5 })] },
  F_onfoot: { group: "F other-foot conflict", title: "F — request R ON TOP of the left foot (32 cm inward)", seconds: 6, requests: [place("R", 0, -0.324, { at: 0.5 })] },
  F_cross: { group: "F other-foot conflict", title: "F — request R crossing BEHIND the left foot (40 cm inward, 10 cm back)", seconds: 6, requests: [place("R", -0.10, -0.40, { at: 0.5 })] },
  G_far: { group: "G unreachable", title: "G — request R 1.2 m forward (outside anatomical reach)", seconds: 7, requests: [place("R", 1.2, 0, { at: 0.5 })] },
  G_far_side: { group: "G unreachable", title: "G — request R 0.8 m sideways (outside reach)", seconds: 7, requests: [place("R", 0, 0.8, { at: 0.5 })] },
  H_uneven: { group: "H uneven touchdown", title: "H — place R 25 cm forward onto a 3 cm slab under the forefoot (touchdown differs from the plan)", seconds: 6,
    requests: [place("R", 0.25, 0, { at: 0.5 })], terrain: [{ relTo: "R", forward: 0.25 + 0.13, outward: 0, he: [0.12, 0.015, 0.06] }] },
  I_block: { group: "I obstruction", title: "I — place R 30 cm forward with a 22 cm box in the swing path", seconds: 6,
    requests: [place("R", 0.30, 0, { at: 0.5 })], obstacle: { relTo: "R", forward: 0.29, outward: 0, he: [0.12, 0.11, 0.04] } },
  J_repeat: { group: "J repeated", title: "J — six alternating placements R↑ L↑ R→ R← L↓ R↓ (closed loop: returns to the start)", seconds: 40,
    requests: [place("R", 0.15, 0, { at: 0.5, label: "1 R fwd" }), place("L", 0.15, 0, { pause: 0.6, label: "2 L fwd" }), place("R", 0, 0.08, { pause: 0.6, label: "3 R out" }),
      place("R", 0, -0.08, { pause: 0.6, label: "4 R in" }), place("L", -0.15, 0, { pause: 0.6, label: "5 L back" }), place("R", -0.15, 0, { pause: 0.6, label: "6 R back" })] },
};

export function runC2(J, spec, key, opts) {
  opts = opts || {}; const TST = TESTS_C2[key], T = TIMESTEP_CONFIGS[GATE_C1_TSC], dt = 1 / T.hz, steps = Math.round((opts.seconds || TST.seconds) * T.hz), g = 9.81;
  const P = opts.poses || buildPoses(spec), nb = spec.bodies.length, nj = spec.joints.length, M = spec.totalMass, W = M * g;
  const w = new JoltCharacterWorld(J, spec, GATE_C1_WORLD, frictionPolicy(spec));
  for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
  const ctrlOpts = opts.ctrl === undefined ? controllerProfile(spec) : (opts.ctrl || {}), ctrl = new BalanceController(spec, P, Object.assign({ strength: "candidate" }, ctrlOpts));
  ctrl.gain.forEach((gn, k) => w.setMotor(k, { kp: gn.kp, kd: gn.kdStance, tau: 1 }));
  // environment (relative to the initial right-foot sole centre; heading +z, his right +x)
  const fi = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") }, box = spec.bodies[fi.R].shapes[0];
  const c0 = (s) => { const S = P.N.S[fi[s]], c = V.add(S.pos, Q.rot(S.rot, box.pos)); return c; };
  const env = { terrain: [], obstacle: null };
  if (TST.terrain) for (const tr of TST.terrain) { const c = c0(tr.relTo), bx = { he: tr.he, pos: [c[0] + (tr.outward || 0) * (tr.relTo === "R" ? 1 : -1), tr.he[1], c[2] + tr.forward] }; w.addTerrainBox(bx); env.terrain.push(bx); }
  let obst = null; if (TST.obstacle) { const o = TST.obstacle, c = c0(o.relTo); obst = { shape: { type: "box", he: o.he, cr: 0.01, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, pos: [c[0], o.he[1] + 0.003, c[2] + o.forward], mass: 100, hold: "fixed" }; w.addObstacle(obst); env.obstacle = { he: o.he, pos: obst.pos }; }
  // ── ASSERT: no pelvis support fixture, only the 13 joints (+ the obstacle's own lock when a test has one) ──
  const nBodies = w.ps.GetNumBodies(), expectBodies = nb + 1 + (TST.terrain ? TST.terrain.length : 0) + (obst ? 1 : 0);
  if (w.support || w.cons.length !== nj || nBodies !== expectBodies) throw new Error(`C2 world is not clean: support ${!!w.support}, joints ${w.cons.length}, bodies ${nBodies}/${expectBodies}`);
  P.N.S.forEach((s, i) => w.setPose(i, s.pos, s.rot));
  const sensor = new Sensor(spec, { supportTouching: true }), seq = new SupportSequencer(spec, P, ctrl, TST.requests);
  const chestI = spec.bodies.findIndex(b => b.name === "chest"), ji = (n) => spec.joints.findIndex(j => j.name === n), aL = ji("ankle_L"), aR = ji("ankle_R"), pelvisJoints = spec.joints.map((j, k) => j.parentIndex === 0 ? k : -1).filter(k => k >= 0);
  const legShapes = (s) => ["shin_" + s, "foot_" + s].map(n => spec.bodies.findIndex(b => b.name === n));
  const read = () => { const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i)); return st; };
  let states = read(), obs = sensor.update(0, dt, states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null);
  const recs = []; let h = 2166136261, cpuJ = 0, cpuS = 0, cpuC = 0, nan = false, prevStates = states;
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  for (let n = 1; n <= steps; n++) {
    const t0 = now(), plan = seq.update(obs); ctrl.plan = plan; const u = ctrl.update(obs), caps = [];
    for (let k = 0; k < nj; k++) { const j = spec.joints[k], m = u.motor[k], vel = u.vel ? u.vel[k] : (j.type === "hinge" ? 0 : [0, 0, 0]);
      if (j.type === "hinge") { w.setJointTarget(k, u.final[k], vel); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: m.lo, hi: m.hi }); caps.push({ lo: m.lo, hi: m.hi }); }
      else { w.setJointTarget(k, u.final[k], vel); const b = budgetLimits(m, w.sixdofRot(k), u.final[k]); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: b.lo, hi: b.hi }); caps.push(b); } }
    const t1 = now(); w.step(dt, T.coll); const t2 = now();
    states = read(); obs = sensor.update(n, dt, states, w.contacts, { L: w.jointLambdaPosition(aL), R: w.jointLambdaPosition(aR) }, null); const t3 = now();
    cpuC += t1 - t0; cpuJ += t2 - t1; cpuS += t3 - t2;
    for (const s of states) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h); }
    // ── measurement ──
    const J8 = spec.joints.map((j, k) => { const lm = w.motorLambda(k), cap = caps[k];
      if (j.type === "hinge") { const tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo; return { lam: lm, tq: Math.abs(tq), eff: lim > 0 ? Math.abs(tq) / lim : 0, sat: lim > 0 && Math.abs(tq) >= 0.98 * lim }; }
      const tq = lm.map(x => x / dt), mag = Math.sqrt(tq[0] ** 2 + tq[1] ** 2 + tq[2] ** 2); let eff = 0, sat = false; const satAx = [];
      tq.forEach((x, i) => { const lim = x >= 0 ? cap.hi[i] : -cap.lo[i]; if (lim > 0) { eff = Math.max(eff, Math.abs(x) / lim); if (Math.abs(x) >= 0.98 * lim) { sat = true; satAx.push(i); } } }); return { lam: lm, tq: mag, eff, sat, satAx }; });
    // joint-limit margin: the smallest distance of any joint coordinate to its limit (deg; < 0 = beyond)
    let limMargin = 1e9, limJoint = null; const ankY = {}; spec.joints.forEach((j) => { const js = jointState(j, states); let m; if (j.name === "ankle_L" || j.name === "ankle_R") ankY[j.name.slice(-1)] = { df: -js.swingY, dfLimit: -j.limits.swingY[0] };
      if (j.type === "hinge") m = Math.min(js.a - j.lo, j.hi - js.a); else { const L = j.limits; m = Math.min(js.twist - L.twist[0], L.twist[1] - js.twist, js.swingY - L.swingY[0], L.swingY[1] - js.swingY, js.swingZ - L.swingZ[0], L.swingZ[1] - js.swingZ); }
      if (m < limMargin) { limMargin = m; limJoint = j.name; } });
    // the pelvis's external-force residual (C1 detector): anything acting on the pelvis besides gravity and its three joints
    let rootRes = null; const pelvisTouch = w.contacts.some(k => (k.a === 0 || k.b === 0) && k.depth > -0.0005);
    if (!pelvisTouch) { const mp = spec.bodies[0].mass, a = V.sc(V.sub(states[0].v, prevStates[0].v), 1 / dt); let F = V.sub(V.sc(a, mp), [0, -g * mp, 0]); for (const k of pelvisJoints) F = V.add(F, V.sc(w.jointLambdaPosition(k), 1 / dt)); rootRes = F; }
    // per foot: deepest ground contact (penetration), sole height, and (for a swinging foot) clearance to the stance leg
    const footPen = { L: 0, R: 0 }; for (const c of w.contacts) { const oth = c.a === -1 ? c.b : c.b === -1 ? c.a : null; for (const s of ["L", "R"]) if (oth === fi[s]) footPen[s] = Math.max(footPen[s], c.depth); }
    const soleY = { L: shapeLowestY(box, states[fi.L].pos, states[fi.L].rot), R: shapeLowestY(box, states[fi.R].pos, states[fi.R].rot) };
    let legClear = null; const req = plan.request, swingFoot = req && ["SWING", "HOVER", "LOWER", "ALIGN", "DESCEND"].includes(req.stage) ? req.foot : null;
    if (swingFoot) { const st = swingFoot === "L" ? "R" : "L", sf = states[fi[swingFoot]], pts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(V.add(sf.pos, Q.rot(sf.rot, [box.pos[0] + sx * box.he[0], box.pos[1] + sy * box.he[1], box.pos[2] + sz * box.he[2]])));
      legClear = 1e9; for (const bi of legShapes(st)) { const b = states[bi]; for (const p of pts) { const lp = Q.rot(Q.conj(b.rot), V.sub(p, b.pos)); for (const shp of spec.bodies[bi].shapes) legClear = Math.min(legClear, shapeSdf(shp, lp)); } } }
    let obF = null, obDepth = null; if (obst) { const l = w.obstacleImpulse(0); obF = Math.sqrt(l[0] ** 2 + l[1] ** 2 + l[2] ** 2) / dt; for (const c of w.contacts) if (c.a <= -2 || c.b <= -2) obDepth = Math.max(obDepth ?? -1, c.depth); }
    let groundPen = 0; for (let i = 0; i < nb; i++) for (const s of spec.bodies[i].shapes) groundPen = Math.max(groundPen, -shapeLowestY(s, states[i].pos, states[i].rot));
    let anchorErr = 0; spec.joints.forEach((j) => { const Pb = states[j.parentIndex], pb = spec.bodies[j.parentIndex]; anchorErr = Math.max(anchorErr, V.dist(V.add(Pb.pos, Q.rot(Pb.rot, V.sub(j.at, pb.origin))), states[j.childIndex].pos)); });
    let selfPen = 0, legSelf = 0; for (const c of w.contacts) if (c.a >= 0 && c.b >= 0) { selfPen = Math.max(selfPen, c.depth); const legs = [...legShapes("L"), ...legShapes("R"), spec.bodies.findIndex(b => b.name === "thigh_L"), spec.bodies.findIndex(b => b.name === "thigh_R")];
      if (legs.includes(c.a) && legs.includes(c.b) && c.depth > -0.0005) legSelf = Math.max(legSelf, c.depth + 1e-9); }
    let ke = 0; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s = states[i], wl = Q.rot(Q.conj(s.rot), s.w); ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); }
    // V1.1 comparison measurements: pelvis roll (+ = right side up), trunk lateral lean of the chest relative to the pelvis (+ = toward his left)
    const pX = Q.rot(states[0].rot, [1, 0, 0]), pelvisRoll = Math.asin(Math.max(-1, Math.min(1, pX[1]))) * 57.29578, cU = Q.rot(states[chestI].rot, [0, 1, 0]), pU = Q.rot(states[0].rot, [0, 1, 0]);
    const trunkLat = Math.asin(Math.max(-1, Math.min(1, V.dot(V.sub(cU, V.sc(pU, V.dot(cU, pU))), V.norm(Q.rot(states[0].rot, [-1, 0, 0])))))) * 57.29578;
    const f = obs.feet, rec = { n, t: n * dt, ankY, pelvisRoll, trunkLat, cls: u.cls.state, phase: seq.phase, roles: { ...seq.role }, reqId: req ? req.id : null, reqStage: req ? req.stage : null, reqStatus: req ? (req.status || null) : null, ready: req && req.stage === "TRANSFER" ? { n: req.ready, ...req.readyState } : null,
      com: obs.com, vcom: obs.vcom, xi: obs.xi, xiMargin: obs.xiMargin, comMargin: obs.comMargin, xiRef: plan.xiRef, swingTgt: swingFoot && plan.swing[swingFoot] ? { foot: swingFoot, pos: plan.swing[swingFoot].pos, u: plan.swing[swingFoot].u } : null,
      feet: { L: slim(f.L), R: slim(f.R) }, footPos: { L: states[fi.L].pos, R: states[fi.R].pos }, footPen, soleY, legClear, obF, obDepth, grf: obs.grf, J: J8, limMargin, limJoint, rootRes,
      groundPen, anchorErr, selfPen, legSelf, ke, trunk: obs.trunkTiltDeg, spine: obs.spineBendDeg };
    if (opts.keepStates) { rec.states = states.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w, awake: s.awake })); rec.cts = w.contacts.map(c => ({ ...c }));
      rec.region = obs.region; rec.polyReliable = obs.polyReliable; rec.copSmooth = obs.copSmooth; rec.tgt = { T: u.final }; rec.jt = spec.joints.map((j, k) => ({ nom: u.nominal[k], g: u.gOff[k], b: u.bOff[k], fin: u.final[k], act: j.type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k), vt: u.vel ? u.vel[k] : null, kp: u.motor[k].kp, kd: u.motor[k].kd }));
      rec.ctl = u.debug ? { pStar: u.debug.pStar, pRaw: u.debug.pRaw, xiRef: u.debug.xiRef, r: u.debug.r, tauTrunk: u.debug.tauTrunk || null, feetBal: u.debug.feetBal, stance: u.debug.stance, pelvisTarget: u.debug.pelvisTarget, pdTrace: u.debug.pdTrace, unload: u.debug.unload } : null; rec.push = null; }
    recs.push(rec); prevStates = states;
  }
  const audit = Object.assign({}, w.audit), support = !!w.support; w.destroy();
  return summarizeC2(spec, key, TST, T, recs, { hash: (h >>> 0).toString(16), nan, audit, support, cpuJ, cpuS, cpuC, steps, seq, obst, W, env, hipZcap: ctrl.limits.hip.Z[1] * ctrl.mult, recal: Object.keys(ctrlOpts).length ? ctrlOpts : null });
}
function slim(f) { return { state: f.state, touching: f.touching, manifold: f.manifold, loaded: f.loaded, slipping: f.slipping, load: f.load, shear: f.shearMag, slipSpeed: f.slipSpeed, slipDist: f.slipDist, points: f.points, sole: f.sole, anchor: f.anchor ? f.anchor.pos : null }; }

const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function summarizeC2(spec, key, TST, T, recs, x) {
  const dt = 1 / T.hz, W = x.W, first = recs[0], last = recs[recs.length - 1], d2 = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  const reqs = x.seq.reports.concat(x.seq.cur && !x.seq.reports.includes(x.seq.cur) ? [x.seq.cur] : []).filter((r, i, a) => a.indexOf(r) === i);
  const perReq = reqs.map((R) => { const win = recs.filter(q => q.reqId === R.id), sw = R.foot, st = sw === "L" ? "R" : "L";
    const pr = R.proj || null, out = { id: R.id, label: R.label || null, type: R.type, foot: sw || null, status: R.status || "RUNNING", why: R.why || null };
    if (R.type === "shift") { out.w = R.w; return out; }
    if (pr) Object.assign(out, { requested: pr.requested.map(v => r2(v, 3)), feasible: pr.target ? pr.target.map(v => r2(v, 3)) : null, correctedCm: pr.correction != null ? r2(pr.correction * 100, 1) : null,
      projectionReasons: pr.reasons, stanceClearanceCm: pr.clearance != null ? r2(pr.clearance * 100, 1) : null });
    if (R.liftoff) Object.assign(out, { liftoff: { commandT: r2(R.liftoff.t, 3), physicalT: r2(R.liftoff.physicalT, 3), swingLoadN: r2(R.liftoff.swingLoadN, 1), swingLoadPctBW: r2(100 * R.liftoff.swingLoadFrac, 1),
      stanceXiMarginCm: r2(R.liftoff.stanceMarginXi * 100, 1), stanceComMarginCm: r2(R.liftoff.comMarginStance * 100, 1), vcom: r2(R.liftoff.vcom, 3), transferS: r2(R.liftoff.transferS, 3) } });
    if (R.td) { const tdRec = recs.find(q => q.t >= R.td.t - 1e-9), vy = R.td.v[1], vh = Math.sqrt(R.td.v[0] ** 2 + R.td.v[2] ** 2);
      Object.assign(out, { touchdown: { t: r2(R.td.t, 3), singleSupportS: R.liftoff && R.liftoff.physicalT != null ? r2(R.td.t - R.liftoff.physicalT, 3) : null, actualCenter: R.td.center.map(v => r2(v, 3)),
        landingErrorCm: pr && pr.target ? r2(d2(R.td.center, pr.target) * 100, 1) : null, verticalVelocity: r2(vy, 3), horizontalVelocity: r2(vh, 3), early: R.td.early, uAt: r2(R.td.uAt, 2),
        plannedAnkleY: r2(R.td.plannedAnkle[1], 4), actualAnkleY: r2(R.td.pos[1], 4), footTiltDeg: r2(deg(Math.acos(Math.max(-1, Math.min(1, Q.rot(R.td.rot, [0, 1, 0])[1])))), 1) } }); }
    if (R.accepted) Object.assign(out, { accepted: { t: r2(R.accepted.t, 3), fromTouchdownS: r2(R.accepted.dtFromTouchdown, 3), loadN: r2(R.accepted.load, 0), finalCenter: R.accepted.center.map(v => r2(v, 3)),
      finalErrorCm: pr && pr.target ? r2(d2(R.accepted.center, pr.target) * 100, 1) : null, driftAfterTouchdownCm: R.td ? r2(d2(R.accepted.center, R.td.center) * 100, 2) : null } });
    if (R.blocked) Object.assign(out, { blocked: { t: r2(R.blocked.t, 3), lagCm: r2(R.blocked.lag * 100, 1), obstacleMaxForceN: r2(Math.max(...win.map(q => q.obF || 0)), 0),
      obstaclePenetrationMm: r2(Math.max(0, ...win.map(q => q.obDepth ?? -1)) * 1000, 2), firstObstacleContactT: (() => { const q = win.find(z => z.obDepth != null && z.obDepth > -0.0005); return q ? r2(q.t, 3) : null; })() } });
    // sole clearance: the lowest point of the swing boot while it PROGRESSES (u 0.3–0.7; the instants just after liftoff and before
    // touchdown are trivially near the turf), and the peak over the swing
    if (win.length) { const swingWin = win.filter(q => q.swingTgt && q.swingTgt.u >= 0.3 && q.swingTgt.u <= 0.7 && q.reqStage !== "HOVER"), allSwing = win.filter(q => q.swingTgt), stSl0 = win[0].feet[st].slipDist, stSl1 = win[win.length - 1].feet[st].slipDist;
      const tdWin = R.td ? win.filter(q => q.t >= R.td.t - 0.02 && q.t <= R.td.t + 0.3) : [];
      out.metrics = { minSoleClearanceCm: swingWin.length ? r2(Math.min(...swingWin.map(q => q.soleY[sw])) * 100, 1) : null, peakSoleClearanceCm: allSwing.length ? r2(Math.max(...allSwing.map(q => q.soleY[sw])) * 100, 1) : null, minClearanceToStanceLegCm: swingWin.length ? r2(Math.min(...swingWin.filter(q => q.legClear != null).map(q => q.legClear)) * 100, 1) : null,
        peakSwingFootPenetrationMm: tdWin.length ? r2(Math.max(0, ...tdWin.map(q => q.footPen[sw])) * 1000, 2) : null, stanceFootSlidMm: r2((stSl1 - stSl0) * 1000, 2),
        stanceMaxSlipSpeed: r2(Math.max(...win.map(q => q.feet[st].slipSpeed)), 3), legSelfContactMm: r2(Math.max(0, ...win.map(q => q.legSelf)) * 1000, 2),
        saturationMs: Object.fromEntries(spec.joints.map((j, k) => [j.name, r2(win.filter(q => q.J[k].sat).length * dt * 1000, 0)]).filter(e => e[1] > 0)),
        jointLimitMarginDeg: r2(deg(Math.min(...win.map(q => q.limMargin))), 1), jointLimitMarginJoint: win.reduce((a, q) => q.limMargin < a.limMargin ? q : a).limJoint,
        rootResidualMaxN: r2(Math.max(0, ...win.filter(q => q.rootRes).map(q => Math.sqrt(q.rootRes[0] ** 2 + q.rootRes[1] ** 2 + q.rootRes[2] ** 2))), 2),
        ankle: Object.fromEntries(["L", "R"].map(s => { const dfs = win.map(q => q.ankY[s].df), lim = win[0].ankY[s].dfLimit, mg = dfs.map(d => lim - d);
          return [s === st ? "stance" : "swing", { foot: s, maxDorsiDeg: r2(Math.max(...dfs) * 57.29578, 1), limitDeg: r2(lim * 57.29578, 1), minMarginDeg: r2(Math.min(...mg) * 57.29578, 1), atStopMs: r2(mg.filter(m => m < rad(1)).length * dt * 1000, 0) }]; })), classMax: ["INIT", "RECOVERABLE_IN_PLACE", "RECOVERABLE_HIP", "STEP_NEEDED", "UNRECOVERABLE", "FALLING", "GROUNDED"].reduce((a, c) => win.some(q => q.cls === c) ? c : a, "INIT") }; }
    // SINGLE-LEG support (lift-and-hold): measured over the hold, from 0.5 s after the foot is up until it is lowered
    if (R.type === "lift" && R.tAir != null) { const t0 = R.tAir + 0.5, tEnd = (win.find(q => q.t > t0 && q.reqStage !== "HOVER") || win[win.length - 1]).t, hw = win.filter(q => q.t >= t0 && q.t < tEnd && q.reqStage === "HOVER");
      if (hw.length) { const hk = spec.joints.findIndex(j => j.name === "hip_" + st), dZ = (q) => Math.abs(q.J[hk].lam[2] / dt), mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, lat = st === "L" ? -1 : 1;
        const abd = hw.map(dZ), comOff = hw.map(q => (q.com[0] - q.footPos[st][0]) * lat), roll = hw.map(q => q.pelvisRoll), lean = hw.map(q => q.trunkLat), xim = hw.map(q => q.xiMargin), cap = x.hipZcap;
        out.singleLeg = { stance: st, holdS: r2(tEnd - R.tAir, 2), heldToPlan: !(R.status && R.status !== "DONE") && (tEnd - R.tAir) >= (R.holdS || 1) + (R.T1 || 0) - 0.01,
          hipAbductionNm: { mean: r2(mean(abd), 1), max: r2(Math.max(...abd), 1) }, hipAbductionPctOfLimit: r2(100 * mean(abd) / cap, 1), hipZcapNm: cap,
          hipEffortPct: r2(100 * mean(hw.map(q => q.J[hk].eff)), 1), hipSatPct: r2(100 * hw.filter(q => q.J[hk].sat).length / hw.length, 1),
          comLateralOfStanceAnkleCm: { mean: r2(100 * mean(comOff), 1), min: r2(100 * Math.min(...comOff), 1), max: r2(100 * Math.max(...comOff), 1) },
          pelvisRollDeg: { mean: r2(mean(roll), 2), min: r2(Math.min(...roll), 2), max: r2(Math.max(...roll), 2) }, trunkLateralLeanDeg: { mean: r2(mean(lean), 1) },
          xiMarginCm: { mean: r2(100 * mean(xim), 1), min: r2(100 * Math.min(...xim), 1) } }; } }
    return out; });
  // load transfer continuity (test A): per-step change of each foot's load; total vs body weight
  const qs = recs.filter(r => r.grf && r.t > 0.3), dL = []; for (let i = 1; i < recs.length; i++) dL.push(Math.max(Math.abs(recs[i].feet.L.load - recs[i - 1].feet.L.load), Math.abs(recs[i].feet.R.load - recs[i - 1].feet.R.load)));
  const shares = recs.filter(r => r.feet.L.load + r.feet.R.load > 100).map(r => r.feet.R.load / (r.feet.L.load + r.feet.R.load));
  const rootRes = recs.filter(r => r.rootRes).map(r => Math.sqrt(r.rootRes[0] ** 2 + r.rootRes[1] ** 2 + r.rootRes[2] ** 2));
  const fell = recs.some(r => r.cls === "GROUNDED");
  const out = { test: key, group: TST.group, title: TST.title, hash: x.hash, nan: x.nan, audit: x.audit, supportFixture: x.support, fell, finalClass: last.cls, requests: perReq,
    loads: { totalVsBodyWeightN: r2(qs.reduce((a, r) => a + Math.abs(r.feet.L.load + r.feet.R.load - W), 0) / Math.max(1, qs.length), 2), maxStepChangeN: r2(Math.max(...dL.slice(24)), 1),
      shareR: shares.length ? [r2(Math.min(...shares), 3), r2(Math.max(...shares), 3)] : null },
    drift: { footL: r2(Math.sqrt((last.footPos.L[0] - first.footPos.L[0]) ** 2 + (last.footPos.L[2] - first.footPos.L[2]) ** 2) * 100, 2), footR: r2(Math.sqrt((last.footPos.R[0] - first.footPos.R[0]) ** 2 + (last.footPos.R[2] - first.footPos.R[2]) ** 2) * 100, 2),
      com: r2(Math.sqrt((last.com[0] - first.com[0]) ** 2 + (last.com[2] - first.com[2]) ** 2) * 100, 2), slidL: r2(last.feet.L.slipDist * 1000, 1), slidR: r2(last.feet.R.slipDist * 1000, 1) },
    root: { residualMeanN: rootRes.length ? r2(rootRes.reduce((a, b) => a + b, 0) / rootRes.length, 3) : null, residualMaxN: rootRes.length ? r2(Math.max(...rootRes), 2) : null },
    stability: { maxJointSepMm: r2(Math.max(...recs.map(r => r.anchorErr)) * 1000, 2), minJointLimitMarginDeg: r2(deg(Math.min(...recs.map(r => r.limMargin))), 1), maxTurfPenMm: r2(Math.max(...recs.map(r => r.groundPen)) * 1000, 2),
      maxSelfPenMm: r2(Math.max(...recs.map(r => r.selfPen)) * 1000, 2), keMaxJ: r2(Math.max(...recs.map(r => r.ke)), 2) },
    cpu: { msPerFrame: r2((x.cpuJ + x.cpuS + x.cpuC) / x.steps * 4, 4), jolt: r2(x.cpuJ / x.steps * 4, 4), sensing: r2(x.cpuS / x.steps * 4, 4), controller: r2(x.cpuC / x.steps * 4, 4) },
    events: x.seq.log.map(e => ({ t: r2(e.t, 3), kind: e.kind, what: e.what })) };
  out.marks = Object.fromEntries(x.seq.log.filter(e => ["liftoff", "touchdown", "DONE", "REJECTED", "FAILED", "FAILED_BLOCKED"].includes(e.kind)).map((e, i) => [`${e.kind}#${i}`, Math.round(e.t / dt)]));
  out.worst = { liftoff: (x.seq.log.find(e => e.kind === "liftoff") || { t: 0 }).t / dt | 0, touchdown: (x.seq.log.find(e => e.kind === "touchdown") || { t: 0 }).t / dt | 0,
    done: (x.seq.log.find(e => ["DONE", "REJECTED", "FAILED", "FAILED_BLOCKED"].includes(e.kind)) || { t: 0 }).t / dt | 0 };
  // for the review harness: the per-request geometry (requested / feasible / touchdown / final footprints, reach boundary, stance
  // exclusion), the environment boxes, the sequencer's statics, the foot box
  out.calib = spec.calib ? spec.calib.name : "V1"; out.recal = x.recal || null; out.env = x.env; out.box = { he: spec.bodies[spec.bodies.findIndex(b => b.name === "foot_L")].shapes[0].he, pos: spec.bodies[spec.bodies.findIndex(b => b.name === "foot_L")].shapes[0].pos };
  out.lean = x.seq.leanInfo; out.sup = { footClear: SUP.footClear, latMin: SUP.latMin };
  out.reqRaw = reqs.map(R => ({ id: R.id, type: R.type, foot: R.foot || null, label: R.label || null, status: R.status || "RUNNING", why: R.why || null,
    proj: R.proj ? { requested: R.proj.requested, target: R.proj.target, yaw: R.proj.yaw, rejected: !!R.proj.rejected, reasons: R.proj.reasons, current: R.proj.current } : null,
    reach: R.reach || null, excl: R.excl || null, td: R.td ? { center: R.td.center, rot: R.td.rot, pos: R.td.pos, t: R.td.t } : null, accepted: R.accepted ? { center: R.accepted.center, rot: R.accepted.rot, t: R.accepted.t } : null,
    blocked: R.blocked || null, align: R.align || null, fwdBias: R.fwdBias ?? null, clear: R.clear ?? null, T: R.T ?? null }));
  out.recs = recs; return out;
}
