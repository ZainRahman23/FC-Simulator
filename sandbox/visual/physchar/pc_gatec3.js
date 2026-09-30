// ═══ physchar/pc_gatec3.js — GATE C3: PHYSICS-DRIVEN CORRECTIVE STEPPING — deterministic tests, measurement, recording ════════════════
// Loop per 240 Hz step (as C1/C2):  observation → CorrectiveStepper (plan) → BalanceController → finite motors → Jolt → SENSING → record.
// No pelvis support, no root anchor, no state write after t = 0 (asserted). A push at the pelvis (C1's disturbance) starts every test that
// has one; whether a step happens, which foot, where it lands and whether the body is caught are decided by the physics + controller.
import { V, Q, hashNums } from "./pc_math.js";
import { shapeLowestY } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, jointState, frictionPolicy, TIMESTEP_CONFIGS } from "./pc_gatea.js";
import { GATE_C1_TSC, GATE_C1_WORLD } from "./pc_gatec1.js";
import { buildPoses } from "./pc_control.js";
import { Sensor, polyDist } from "./pc_sense.js";
import { BalanceController, budgetLimits, controllerProfile } from "./pc_balance.js";
import { CorrectiveStepper, STEP } from "./pc_step.js";

const S2 = Math.SQRT1_2, DIR = { F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0], FR: [S2, 0, S2], FL: [-S2, 0, S2], BR: [S2, 0, -S2], BL: [-S2, 0, -S2] };
const DIRNAME = { F: "forward", B: "backward", R: "toward his right", L: "toward his left", FR: "forward-right", FL: "forward-left", BR: "backward-right", BL: "backward-left" };
const push = (d, Ns, extra) => Object.assign({ push: { at: 1.0, dur: 0.05, dir: d, Ns }, seconds: 5 }, extra || {});
function buildTests() {
  const T = {};
  // A — in-place control: pushes C1 already recovers without a step (the stepper must NOT step)
  for (const [d, Ns] of [["F", 50], ["B", 30], ["R", 40]]) T[`A_inplace_${d}${Ns}`] = Object.assign({ group: "A in place (no step expected)", title: `${Ns} N·s ${DIRNAME[d]} — inside C1's in-place boundary` }, push(d, Ns));
  // B — corrective steps beyond the in-place boundary, by direction and magnitude
  for (const [d, list] of [["F", [70, 80, 90, 100]], ["B", [40, 50, 60]], ["R", [55, 65, 75]], ["L", [55, 70]], ["FR", [70, 90]], ["BL", [45, 60]]])
    for (const Ns of list) T[`B_${d}${Ns}`] = Object.assign({ group: `B step ${DIRNAME[d]}`, title: `${Ns} N·s ${DIRNAME[d]} at the pelvis` }, push(d, Ns));
  // C — the foothold must be projected (the capture point runs beyond anatomical reach): step anyway, then recover or fall honestly
  for (const [d, Ns] of [["F", 115], ["R", 90], ["B", 75]]) T[`C_proj_${d}${Ns}`] = Object.assign({ group: "C projected foothold", title: `${Ns} N·s ${DIRNAME[d]} — the wanted foothold is beyond reach` }, push(d, Ns));
  // D — reacting too late: the same pushes seen through a 100 / 150 ms sensing delay
  for (const [d, Ns, dl] of [["F", 80, 0.1], ["F", 80, 0.15], ["R", 65, 0.1]]) T[`D_late_${d}${Ns}_${dl * 1000}ms`] = Object.assign({ group: "D late reaction", title: `${Ns} N·s ${DIRNAME[d]}, ${dl * 1000} ms sensing delay`, delay: dl }, push(d, Ns));
  // E — friction: the stance foot cannot hold the horizontal force a step needs
  for (const [d, Ns, mu] of [["F", 80, 0.25], ["R", 65, 0.2]]) T[`E_fric_${d}${Ns}_mu${mu}`] = Object.assign({ group: "E friction", title: `${Ns} N·s ${DIRNAME[d]} on low-friction turf (μ ${mu})`, patches: [{ mu }] }, push(d, Ns));
  // F — no capturing foothold exists: the honest outcome is a fall (no step, or a step that cannot save it)
  for (const [d, Ns] of [["F", 160], ["B", 110]]) T[`F_nofoot_${d}${Ns}`] = Object.assign({ group: "F no reachable foothold", title: `${Ns} N·s ${DIRNAME[d]} — beyond any single step` }, push(d, Ns));
  return T;
}
export const TESTS_C3 = buildTests();
const patchPolicy = (spec, patches) => { const base = frictionPolicy(spec); if (!patches) return base;
  return (i1, i2, p) => { if ((i1 === -1 || i2 === -1) && p) for (const q of patches) { if (q.x0 == null || (p[0] >= q.x0 && p[0] <= q.x1 && p[2] >= q.z0 && p[2] <= q.z1)) return q.mu; } return base(i1, i2); }; };
const slimFoot = (f) => ({ state: f.state, touching: f.touching, loaded: f.loaded, slipping: f.slipping, load: f.load, slipDist: f.slipDist, sole: f.sole, points: f.points, anchor: f.anchor ? f.anchor.pos : null, heel: f.heel, toe: f.toe });

export function runC3(J, spec, key, opts) {
  opts = opts || {}; const TST = TESTS_C3[key], T = TIMESTEP_CONFIGS[GATE_C1_TSC], dt = 1 / T.hz, steps = Math.round((opts.seconds || TST.seconds) * T.hz), g = 9.81;
  const P = opts.poses || buildPoses(spec), nb = spec.bodies.length, nj = spec.joints.length, M = spec.totalMass;
  const w = new JoltCharacterWorld(J, spec, GATE_C1_WORLD, patchPolicy(spec, TST.patches)); for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
  const ctrlOpts = Object.assign({}, opts.ctrl === undefined ? controllerProfile(spec) : (opts.ctrl || {}), opts.ctrlExtra || {}), ctrl = new BalanceController(spec, P, Object.assign({ strength: "candidate" }, ctrlOpts));
  ctrl.gain.forEach((gn, k) => w.setMotor(k, { kp: gn.kp, kd: gn.kdStance, tau: 1 }));
  if (w.support || w.cons.length !== nj || w.ps.GetNumBodies() !== nb + 1) throw new Error("C3 world is not clean");
  P.N.S.forEach((s, i) => w.setPose(i, s.pos, s.rot));
  const sensor = new Sensor(spec, { supportTouching: true, muSettle: 0.15 }), stepper = opts.noStep ? null : new CorrectiveStepper(spec, P, ctrl, opts.step), delaySteps = Math.round((TST.delay || 0) * T.hz), buf = [];
  const ji = (n) => spec.joints.findIndex(j => j.name === n), aL = ji("ankle_L"), aR = ji("ankle_R"), chestI = spec.bodies.findIndex(b => b.name === "chest");
  const pu = TST.push ? { ...TST.push, n0: Math.round(TST.push.at * T.hz), n1: Math.round((TST.push.at + TST.push.dur) * T.hz), J: V.sc(DIR[TST.push.dir], TST.push.Ns) } : null;
  const read = () => { const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i)); return st; };
  let states = read(), obs = sensor.update(0, dt, states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null); buf.push(obs);
  const recs = []; let h = 2166136261, cpuJ = 0, cpuS = 0, cpuC = 0, nan = false, prevStates = states; const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  for (let n = 1; n <= steps; n++) {
    const o = buf[Math.max(0, buf.length - 1 - delaySteps)];
    const t0 = now(), plan = stepper ? stepper.update(o) : null; ctrl.plan = plan; const u = ctrl.update(o), caps = [];
    for (let k = 0; k < nj; k++) { const j = spec.joints[k], m = u.motor[k], vel = u.vel ? u.vel[k] : (j.type === "hinge" ? 0 : [0, 0, 0]);
      if (j.type === "hinge") { w.setJointTarget(k, u.final[k], vel); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: m.lo, hi: m.hi }); caps.push({ lo: m.lo, hi: m.hi }); }
      else { w.setJointTarget(k, u.final[k], vel); const b = budgetLimits(m, w.sixdofRot(k), u.final[k]); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: b.lo, hi: b.hi }); caps.push(b); } }
    let ext = null; if (pu && n > pu.n0 && n <= pu.n1) { const Js = V.sc(pu.J, 1 / (pu.n1 - pu.n0)), at = prevStates[0].com.slice(); w.applyImpulse(0, Js, at); ext = { J: Js, at }; }
    const t1 = now(); w.step(dt, T.coll); const t2 = now();
    states = read(); obs = sensor.update(n, dt, states, w.contacts, { L: w.jointLambdaPosition(aL), R: w.jointLambdaPosition(aR) }, ext); buf.push(obs); if (buf.length > delaySteps + 2) buf.shift(); const t3 = now();
    cpuC += t1 - t0; cpuJ += t2 - t1; cpuS += t3 - t2;
    for (const s of states) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h); }
    const J8 = spec.joints.map((j, k) => { const lm = w.motorLambda(k), cap = caps[k];
      if (j.type === "hinge") { const tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo; return { lam: lm, tq: Math.abs(tq), eff: lim > 0 ? Math.abs(tq) / lim : 0, sat: lim > 0 && Math.abs(tq) >= 0.98 * lim }; }
      const tq = lm.map(x => x / dt), mag = Math.sqrt(tq[0] ** 2 + tq[1] ** 2 + tq[2] ** 2); let eff = 0, sat = false; const satAx = [];
      tq.forEach((x, i) => { const lim = x >= 0 ? cap.hi[i] : -cap.lo[i]; if (lim > 0) { eff = Math.max(eff, Math.abs(x) / lim); if (Math.abs(x) >= 0.98 * lim) { sat = true; satAx.push(i); } } }); return { lam: lm, tq: mag, eff, sat, satAx }; });
    let groundPen = 0; for (let i = 0; i < nb; i++) for (const s of spec.bodies[i].shapes) groundPen = Math.max(groundPen, -shapeLowestY(s, states[i].pos, states[i].rot));
    let anchorErr = 0, limMargin = 1e9, limJoint = null, hardViol = 0; spec.joints.forEach((j, k) => { const Pb = states[j.parentIndex], pb = spec.bodies[j.parentIndex]; anchorErr = Math.max(anchorErr, V.dist(V.add(Pb.pos, Q.rot(Pb.rot, V.sub(j.at, pb.origin))), states[j.childIndex].pos));
      const js = jointState(j, states); if (j.type === "sixdof") hardViol = Math.max(hardViol, js.viol); let m; if (j.type === "hinge") m = Math.min(js.a - j.lo, j.hi - js.a); else { const L = j.limits; m = Math.min(js.twist - L.twist[0], L.twist[1] - js.twist, js.swingY - L.swingY[0], L.swingY[1] - js.swingY, js.swingZ - L.swingZ[0], L.swingZ[1] - js.swingZ); }
      if (m < limMargin) { limMargin = m; limJoint = j.name; } });
    let selfPen = 0; for (const c of w.contacts) if (c.a >= 0 && c.b >= 0) selfPen = Math.max(selfPen, c.depth);
    let ke = 0; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s0 = states[i], wl = Q.rot(Q.conj(s0.rot), s0.w); ke += 0.5 * b.mass * V.dot(s0.v, s0.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); }
    const f = obs.feet, R = stepper ? (stepper.R || stepper.done) : null;
    const rec = { n, t: n * dt, cls: u.cls.state, com: obs.com, vcom: obs.vcom, xi: obs.xi, h: obs.h, xiMargin: obs.xiMargin, comMargin: obs.comMargin, degraded: obs.supportDegraded, copSmooth: obs.copSmooth,
      trunk: obs.trunkTiltDeg, spine: obs.spineBendDeg, grf: obs.grf, ke, hardViol, rootRes: null, nonFootGround: obs.nonFootGround, feet: { L: slimFoot(f.L), R: slimFoot(f.R) }, push: ext, J: J8, groundPen, anchorErr, limMargin: limMargin * 57.2958, limJoint, selfPen,
      ctl: u.debug ? { pStar: u.debug.pStar, pRaw: u.debug.pRaw, xiRef: u.debug.xiRef, r: u.debug.r, tauTrunk: u.debug.tauTrunk || null, feetBal: u.debug.feetBal, stance: u.debug.stance, pelvisTarget: u.debug.pelvisTarget, fricR: u.debug.fricR, hipCap: u.debug.hipCapHere, muObs: ctrl.muObs ? { ...ctrl.muObs } : null, reason: u.cls.reason } : null,
      stepStage: stepper ? stepper.stage : null, step: R && plan && plan.step ? { sw: R.sw, st: R.st, stage: R.stage, target: R.cand && R.cand.target, want: R.cand && R.cand.want, xtd: R.cand && R.cand.xtd, pst: R.cand && R.cand.pst, margin: R.cand && R.cand.margin, projected: R.cand && R.cand.projected, yaw: R.cand && R.cand.yaw } : null,
      swingTgt: plan && plan.swing ? Object.values(plan.swing)[0] || null : null };
    if (opts.keepStates) { rec.states = states.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w, awake: s.awake })); rec.cts = w.contacts.map(c => ({ ...c })); rec.region = obs.region; rec.polyReliable = obs.polyReliable;
      rec.tgt = { T: u.final }; rec.jt = spec.joints.map((j, k) => ({ nom: u.nominal[k], g: u.gOff[k], b: u.bOff[k], fin: u.final[k], act: j.type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k) })); }
    recs.push(rec); prevStates = states;
  }
  const audit = Object.assign({}, w.audit), support = !!w.support; w.destroy();
  return summarizeC3(spec, key, TST, T, recs, { hash: (h >>> 0).toString(16), nan, audit, support, cpuJ, cpuS, cpuC, steps, stepper, delaySteps, pu, ctrlOpts });
}
const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function summarizeC3(spec, key, TST, T, recs, x) {
  const last = recs[recs.length - 1], first = (p) => recs.find(p), hyp = (v) => Math.hypot(v[0], v[2] ?? v[1]);
  const st = x.stepper, R = st ? (st.done || st.R) : null, fell = recs.some(r => r.nonFootGround) || last.cls === "FALLING" || last.cls === "GROUNDED";
  const tNeed = first(r => r.cls === "STEP_NEEDED" || r.cls === "STEPPING"), tFall = first(r => r.cls === "FALLING"), tGround = first(r => r.nonFootGround);
  const pushT = x.pu ? x.pu.at : null, stepped = !!(R && R.liftoff);
  let outcome; if (fell) outcome = stepped ? (R.td ? "STEPPED_FELL" : "STEP_FAILED_FELL") : "FELL_NO_STEP"; else outcome = stepped ? (R.accepted ? "RECOVERED_WITH_STEP" : "STEPPED_UPRIGHT") : "RECOVERED_IN_PLACE";
  const win = pushT != null ? recs.filter(r => r.t >= pushT) : recs, com0 = recs[0].com;
  const ssWin = recs.filter(r => r.stepStage === "SWING" || r.stepStage === "DESCEND");
  const satMs = Object.fromEntries(spec.joints.map((j, k) => [j.name, r2(win.filter(q => q.J[k].sat).length / T.hz * 1000, 0)]).filter(e => e[1] > 0));
  const stepInfo = R ? { foot: R.sw, stage: R.stage, status: R.status || null, fail: R.fail || null,
    tStepNeeded: r2(R.tNeed, 3), liftoffAfterNeedS: R.liftoff ? r2(R.liftoff.dtFromNeed, 3) : null, touchdownAfterNeedS: R.td ? r2(R.td.fromNeed, 3) : null, recoveredAfterNeedS: R.accepted ? r2(R.accepted.fromNeed, 2) : null,
    planned: R.plannedAt ? { target: R.plannedAt.target.map(v => r2(v, 3)), want: R.plannedAt.want.map(v => r2(v, 3)), projected: R.plannedAt.projected, reasons: R.plannedAt.reasons, predictedXiMarginCm: r2(R.plannedAt.margin * 100, 1), predictedT: r2(R.plannedAt.T, 3), tSwing: r2(R.plannedAt.tSw, 3) } : null,
    touchdown: R.td ? { center: R.td.center.map(v => r2(v, 3)), errCm: r2(Math.hypot(R.td.center[0] - R.td.planned[0], R.td.center[1] - R.td.planned[1]) * 100, 1), uAt: r2(R.td.uAt, 2) } : null,
    xiMarginAtTouchdownCm: R.td ? r2((recs.find(r => r.t >= R.td.t - 1e-9) || last).xiMargin * 100, 1) : null } : null;
  return { test: key, group: TST.group, title: TST.title, hash: x.hash, nan: x.nan, audit: x.audit, supportFixture: x.support, outcome, fell, stepped, refused: st ? st.refused || null : null,
    push: x.pu ? { dir: x.pu.dir, Ns: x.pu.Ns, at: x.pu.at } : null, delayMs: r2(x.delaySteps / T.hz * 1000, 0), friction: TST.patches ? TST.patches[0].mu : null,
    tStepNeeded: tNeed ? r2(tNeed.t, 3) : null, tFalling: tFall ? r2(tFall.t, 3) : null, tGrounded: tGround ? r2(tGround.t, 3) : null, step: stepInfo, events: st ? st.log : [],
    whole: { comExcursionCm: r2(Math.max(...win.map(r => Math.hypot(r.com[0] - com0[0], r.com[2] - com0[2]))) * 100, 1), trunkMaxDeg: r2(Math.max(...win.map(r => r.trunk)), 1), comDropCm: r2((com0[1] - Math.min(...win.map(r => r.com[1]))) * 100, 1),
      stanceSlidCm: R ? r2(Math.max(0, ...ssWin.map(r => r.feet[R.st].slipDist || 0)) * 100, 2) : null, finalXiMarginCm: r2(last.xiMargin * 100, 1), finalV: r2(hyp(last.vcom), 3) },
    stability: { maxJointSepMm: r2(Math.max(...recs.map(r => r.anchorErr)) * 1000, 2), minJointLimitMarginDeg: r2(Math.min(...recs.map(r => r.limMargin)), 1), limJoint: recs.reduce((a, r) => r.limMargin < a.m ? { m: r.limMargin, j: r.limJoint } : a, { m: 1e9, j: null }).j,
      maxTurfPenMm: r2(Math.max(...recs.map(r => r.groundPen)) * 1000, 2), maxSelfPenMm: r2(Math.max(...recs.map(r => r.selfPen)) * 1000, 2) },
    worst: { push: x.pu ? x.pu.n0 : 0, stepNeeded: tNeed ? tNeed.n : 0, liftoff: R && R.liftoff ? Math.round(R.liftoff.t * T.hz) : 0, touchdown: R && R.td ? Math.round(R.td.t * T.hz) : 0,
      recovered: R && R.accepted ? Math.round(R.accepted.t * T.hz) : 0, falling: tFall ? tFall.n : 0, grounded: tGround ? tGround.n : 0 },
    classTimes: Object.fromEntries(["STEP_NEEDED", "STEPPING", "FALLING", "GROUNDED"].map(k => [k, (recs.find(r => r.cls === k) || {}).t]).filter(e => e[1] != null).map(([k, v]) => [k, r2(v, 2)])),
    saturationMs: satMs, cpu: { msPerFrame: r2((x.cpuJ + x.cpuS + x.cpuC) / x.steps * 4, 4), jolt: r2(x.cpuJ / x.steps * 4, 4), controller: r2(x.cpuC / x.steps * 4, 4) }, ctrl: x.ctrlOpts, recs };
}
