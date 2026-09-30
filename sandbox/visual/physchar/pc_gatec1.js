// ═══ physchar/pc_gatec1.js — GATE C1: UNSUPPORTED FEET-IN-PLACE BALANCE — deterministic test suite, measurement, recording ═════════════
// Loop per 240 Hz step:  (delayed) observation → BalanceController → joint targets + motor settings → Jolt step → SENSING → record.
// There is NO pelvis support, no obstacle, no root anchor, no state write after t = 0: asserted every run (support absent, constraint
// count, audit counters) and measured (the pelvis's external-force residual from its own Newton equation must be ~0).
import { V, Q, rad, deg, hashNums } from "./pc_math.js";
import { shapeLowestY } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, jointState, frictionPolicy, TIMESTEP_CONFIGS } from "./pc_gatea.js";
import { GATE_B_WORLD } from "./pc_gateb.js";
import { buildPoses, motorProfile, minjerk } from "./pc_control.js";
import { Sensor, polyDist } from "./pc_sense.js";
import { BalanceController, budgetLimits, BAL, LIMITS_C1, STRENGTH_C1 } from "./pc_balance.js";

export const GATE_C1_TSC = "240x1", GATE_C1_WORLD = GATE_B_WORLD;   // Gate A/B solver configuration unchanged (240 Hz × 1, 30/4, soft hinge stops), no sleeping
const DIR = { F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0] }, DIRNAME = { F: "forward", B: "backward", R: "toward his right", L: "toward his left" };
const push = (d, Ns, extra) => Object.assign({ push: { at: 1.0, dur: 0.05, dir: d, Ns }, seconds: 6 }, extra || {});
function buildTests() {
  const T = {
    SV_static: { group: "A sensing", title: "SV1 — static stance (analytic: ΣF = Mg, CoP = COM projection, loads ≈ Mg/2)", seconds: 4 },
    SV_freefall: { group: "A sensing", title: "SV2 — free fall from 25 cm, motors holding the pose (analytic: ΣF = 0, foot loads = 0 until touchdown)", seconds: 1.2, mode: "hold", lift: 0.25 },
    SV_shift: { group: "A sensing", title: "SV3 — commanded lateral weight shift 8 cm toward the left foot (lever-rule cross-check of per-foot loads)", seconds: 5,
      xiShift: (t) => t < 1 ? [0, 0] : t < 3 ? [-0.08 * minjerk((t - 1) / 2), 0] : [-0.08, 0] },
    QS20: { group: "B quiet", title: "QS — unsupported quiet standing, 20 s", seconds: 20 },
    QS20_delay: { group: "B quiet", title: "QS — unsupported quiet standing, 20 s, 100 ms sensing delay", seconds: 20, delay: 0.1 },
    G_fall: Object.assign({ group: "G fall", title: "G — unrecoverable push: 90 N·s forward at the pelvis (a fall is the required outcome)" }, push("F", 90, { seconds: 5 })),
    H_ice_quiet: { group: "H friction", title: "H1 — quiet standing on ice (μ 0.08 under both feet), 5 s", seconds: 5, patches: [{ mu: 0.08 }] },
    H_ice_push: Object.assign({ group: "H friction", title: "H2 — 25 N·s forward push on ice (μ 0.08 under both feet)", patches: [{ mu: 0.08 }] }, push("F", 25)),
    H_patch_right: Object.assign({ group: "H friction", title: "H3 — right foot on a slippery patch (μ 0.05), 30 N·s push toward his right", patches: [{ mu: 0.05, x0: 0.02, x1: 1, z0: -1, z1: 1 }] }, push("R", 30)),
  };
  for (const [d, list] of [["F", [10, 20, 30, 40, 50, 55, 60, 65, 70]], ["B", [10, 20, 30, 35, 40, 50, 60, 70]], ["R", [10, 20, 30, 40, 45, 50, 60, 70]], ["L", [20, 40, 60]]])
    for (const Ns of list) T[`P${d}${Ns}`] = Object.assign({ group: `C–E push ${DIRNAME[d]}`, title: `${Ns} N·s push ${DIRNAME[d]} at the pelvis` }, push(d, Ns));
  for (const [d, list] of [["F", [20, 30, 40, 50, 55, 60]], ["B", [20, 30, 35]], ["R", [30, 40, 45]]])
    for (const Ns of list) T[`D${d}${Ns}`] = Object.assign({ group: "F delay 100 ms", title: `${Ns} N·s push ${DIRNAME[d]}, 100 ms sensing delay`, delay: 0.1 }, push(d, Ns));
  for (const st of ["weak", "strong"]) { const lab = st === "weak" ? "WEAK ×0.5" : "EXCESSIVE ×3";
    T[`S_${st}_QS`] = { group: "I strength", title: `${lab} — quiet standing 10 s`, seconds: 10, strength: st };
    for (const [d, Ns] of [["F", 30], ["F", 50], ["R", 40], ["R", 60]]) T[`S_${st}_P${d}${Ns}`] = Object.assign({ group: "I strength", title: `${lab} — ${Ns} N·s push ${DIRNAME[d]}`, strength: st }, push(d, Ns)); }
  return T;
}
export const TESTS_C1 = buildTests();
// friction policy: Gate A's per-pair table, with optional low-friction turf patches (world x/z box, all turf if no bounds)
const patchPolicy = (spec, patches) => { const base = frictionPolicy(spec); if (!patches) return base;
  return (i1, i2, p) => { if ((i1 === -1 || i2 === -1) && p) for (const q of patches) { if (q.x0 == null || (p[0] >= q.x0 && p[0] <= q.x1 && p[2] >= q.z0 && p[2] <= q.z1)) return q.mu; } return base(i1, i2); }; };

export function runC1(J, spec, key, opts) {
  opts = opts || {}; const TST = TESTS_C1[key], T = TIMESTEP_CONFIGS[GATE_C1_TSC], dt = 1 / T.hz, steps = Math.round((opts.seconds || TST.seconds) * T.hz), g = 9.81;
  const P = opts.poses || buildPoses(spec), nb = spec.bodies.length, nj = spec.joints.length, M = spec.totalMass;
  const w = new JoltCharacterWorld(J, spec, GATE_C1_WORLD, patchPolicy(spec, TST.patches));
  for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
  const ctrl = new BalanceController(spec, P, { strength: TST.strength || "candidate", mode: TST.mode || "balance", xiShift: TST.xiShift, stanceKdScale: opts.stanceKdScale ?? TST.stanceKdScale });
  ctrl.gain.forEach((gn, k) => w.setMotor(k, { kp: gn.kp, kd: gn.kdStance, tau: 1 }));   // motor mode + spring; limits are set every step
  // ── ASSERT: no pelvis support fixture, no obstacle, only the 13 joints ──
  const nCons = w.cons.length, nBodies = w.ps.GetNumBodies();
  if (w.support || (w.obstacles && w.obstacles.length) || nCons !== nj || nBodies !== nb + 1) throw new Error(`C1 world is not clean: support ${!!w.support}, constraints ${nCons}, bodies ${nBodies}`);
  const lift = TST.lift || 0; P.N.S.forEach((s, i) => w.setPose(i, [s.pos[0], s.pos[1] + lift, s.pos[2]], s.rot));
  const sensor = new Sensor(spec), delaySteps = Math.round((TST.delay || 0) * T.hz), buf = [];
  const ji = (n) => spec.joints.findIndex(j => j.name === n), aL = ji("ankle_L"), aR = ji("ankle_R"), pelvisJoints = spec.joints.map((j, k) => j.parentIndex === 0 ? k : -1).filter(k => k >= 0);
  const pu = TST.push ? { ...TST.push, n0: Math.round(TST.push.at * T.hz), n1: Math.round((TST.push.at + TST.push.dur) * T.hz), J: V.sc(DIR[TST.push.dir], TST.push.Ns) } : null;
  const read = () => { const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i)); return st; };
  let states = read(), obs = sensor.update(0, dt, states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null); buf.push(obs);
  const recs = []; let h = 2166136261, cpuJ = 0, cpuS = 0, cpuC = 0, nan = false, prevStates = states, prevPelvisLam = null;
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  for (let n = 1; n <= steps; n++) {
    const o = buf[Math.max(0, buf.length - 1 - delaySteps)];
    const t0 = now(), u = ctrl.update(o), caps = [];
    for (let k = 0; k < nj; k++) { const j = spec.joints[k], m = u.motor[k];
      if (j.type === "hinge") { w.setJointTarget(k, u.final[k], 0); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: m.lo, hi: m.hi }); caps.push({ lo: m.lo, hi: m.hi }); }
      else { w.setJointTarget(k, u.final[k], [0, 0, 0]); const b = budgetLimits(m, w.sixdofRot(k), u.final[k]); w.updateMotor(k, { kp: m.kp, kd: m.kd, lo: b.lo, hi: b.hi }); caps.push(b); } }
    let ext = null; if (pu && n > pu.n0 && n <= pu.n1) { const Js = V.sc(pu.J, 1 / (pu.n1 - pu.n0)), at = prevStates[0].com.slice(); w.applyImpulse(0, Js, at); ext = { J: Js, at }; }
    const t1 = now(); w.step(dt, T.coll); const t2 = now();
    states = read(); const lam = { L: w.jointLambdaPosition(aL), R: w.jointLambdaPosition(aR) };
    obs = sensor.update(n, dt, states, w.contacts, lam, ext); buf.push(obs); if (buf.length > delaySteps + 2) buf.shift(); const t3 = now();
    cpuC += t1 - t0; cpuJ += t2 - t1; cpuS += t3 - t2;
    for (const s of states) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h); }
    // ── measurement ──
    const J8 = spec.joints.map((j, k) => { const lm = w.motorLambda(k), cap = caps[k];
      if (j.type === "hinge") { const tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo, dirMax = Math.max(Math.abs(ctrl.gain[k].lim.lo), Math.abs(ctrl.gain[k].lim.hi));
        return { lam: lm, tq: Math.abs(tq), eff: lim > 0 ? Math.abs(tq) / lim : 0, sat: lim > 0 && Math.abs(tq) >= 0.98 * lim, budget: Math.abs(tq) / dirMax }; }
      const tq = lm.map(x => x / dt), mag = Math.sqrt(tq[0] ** 2 + tq[1] ** 2 + tq[2] ** 2), dirMax = Math.max(...ctrl.gain[k].lim.lo.map(Math.abs), ...ctrl.gain[k].lim.hi.map(Math.abs));
      let eff = 0, sat = false; tq.forEach((x, i) => { const lim = x >= 0 ? cap.hi[i] : -cap.lo[i]; if (lim > 0) { eff = Math.max(eff, Math.abs(x) / lim); if (Math.abs(x) >= 0.98 * lim) sat = true; } });
      return { lam: lm, tq: mag, eff, sat, budget: mag / dirMax }; });
    // the pelvis's external-force residual: m_p·a_p − m_p·g + Σ(joint impulses on the pelvis)/dt − push = anything else acting on the pelvis
    const pelvisLam = pelvisJoints.map(k => w.jointLambdaPosition(k)); let rootRes = null;
    const pelvisTouch = w.contacts.some(k => (k.a === 0 || k.b === 0) && k.depth > -0.0005);   // any contact on the pelvis (turf or self) → residual not attributable
    if (!pelvisTouch) { const mp = spec.bodies[0].mass, a = V.sc(V.sub(states[0].v, prevStates[0].v), 1 / dt); let F = V.sub(V.sc(a, mp), [0, -g * mp, 0]);
      for (const l of pelvisLam) F = V.add(F, V.sc(l, 1 / dt)); if (ext) F = V.sub(F, V.sc(ext.J, 1 / dt)); rootRes = F; }
    let groundPen = 0; for (let i = 0; i < nb; i++) for (const s of spec.bodies[i].shapes) groundPen = Math.max(groundPen, -shapeLowestY(s, states[i].pos, states[i].rot));
    let anchorErr = 0, hardViol = 0, softViol = 0; spec.joints.forEach((j, k) => { const Pb = states[j.parentIndex], pb = spec.bodies[j.parentIndex]; anchorErr = Math.max(anchorErr, V.dist(V.add(Pb.pos, Q.rot(Pb.rot, V.sub(j.at, pb.origin))), states[j.childIndex].pos));
      const js = jointState(j, states); if (j.type === "sixdof") hardViol = Math.max(hardViol, js.viol); else softViol = Math.max(softViol, js.viol); });
    let selfPen = 0; for (const c of w.contacts) if (c.a >= 0 && c.b >= 0) selfPen = Math.max(selfPen, c.depth);
    let ke = 0; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s = states[i], wl = Q.rot(Q.conj(s.rot), s.w); ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); }
    const f = obs.feet, rec = { n, t: n * dt, cls: u.cls.state, com: obs.com, vcom: obs.vcom, xi: obs.xi, h: obs.h, omega0: obs.omega0, xiMargin: obs.xiMargin, comMargin: obs.comMargin, xiMarginRaw: obs.xiMarginRaw, degraded: obs.supportDegraded,
      grf: obs.grf, cop: obs.cop, copSmooth: obs.copSmooth, copMargin: obs.cop ? polyDist(obs.polyRaw, obs.cop) : null, L: obs.L, trunk: obs.trunkTiltDeg, pelvisTilt: obs.pelvisTiltDeg, spine: obs.spineBendDeg, nonFootGround: obs.nonFootGround,
      feet: { L: slimFoot(f.L), R: slimFoot(f.R) }, ctl: u.debug ? { pStar: u.debug.pStar, pRaw: u.debug.pRaw, xiRef: u.debug.xiRef, r: u.debug.r, hipCap: u.debug.hipCapHere, tauTrunk: u.debug.tauTrunk || null, released: !!u.debug.released } : null,
      footC: { L: [states[spec.bodies.findIndex(b => b.name === "foot_L")].pos[0], states[spec.bodies.findIndex(b => b.name === "foot_L")].pos[2]], R: [states[spec.bodies.findIndex(b => b.name === "foot_R")].pos[0], states[spec.bodies.findIndex(b => b.name === "foot_R")].pos[2]] },
      fricR: u.debug ? u.debug.fricR : null,
      J: J8, rootRes, groundPen, anchorErr, hardViol, softViol, selfPen, ke, push: ext, footSelf: obs.footSelfContact };
    if (opts.keepStates) { rec.states = states.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w, awake: s.awake })); rec.cts = w.contacts.map(c => ({ ...c }));
      rec.polyRaw = obs.polyRaw; rec.polyReliable = obs.polyReliable; rec.region = obs.region; rec.tgt = { T: u.final, rootPos: states[0].pos, rootRot: states[0].rot };
      rec.jt = spec.joints.map((j, k) => ({ nom: u.nominal[k], g: u.gOff[k], b: u.bOff[k], fin: u.final[k], act: j.type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k) }));
      rec.feetF = u.debug && u.debug.feetBal ? Object.fromEntries(Object.entries(u.debug.feetBal).map(([s, v]) => [s, { F: v.F, at: v.at }])) : null; }
    recs.push(rec); prevStates = states;
  }
  const audit = Object.assign({}, w.audit), support = !!w.support; w.destroy();
  return summarizeC1(spec, key, TST, T, recs, { hash: (h >>> 0).toString(16), nan, audit, support, nCons, cpuJ, cpuS, cpuC, steps, ctrl, delaySteps, pu });
}
function slimFoot(f) { return { state: f.state, touching: f.touching, manifold: f.manifold, loaded: f.loaded, slipping: f.slipping, load: f.load, shear: f.shearMag, slipSpeed: f.slipSpeed, slipDist: f.slipDist, fromAnchor: f.fromAnchor, sole: f.sole,
  muUsed: f.muUsed, muAvail: f.muAvail, friction: f.friction, points: f.points, anchor: f.anchor ? f.anchor.pos : null }; }

const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function summarizeC1(spec, key, TST, T, recs, x) {
  const dt = 1 / T.hz, last = recs[recs.length - 1], M = spec.totalMass, g = 9.81, first = (pred) => recs.find(pred), tOf = (r) => r ? r2(r.t, 3) : null;
  const mag2 = (v) => Math.sqrt(v[0] * v[0] + v[2] * v[2]), mag3 = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const start = recs[Math.min(recs.length - 1, Math.round(0.5 / dt))], pushEnd = x.pu ? x.pu.n1 * dt : null;
  const times = x.ctrl.cls.times, grounded = first(r => r.cls === "GROUNDED"), footRoll = first(r => r.t > 0.2 && ["HEEL", "TOE", "EDGE", "LIFTOFF", "AIR"].some(s => r.feet.L.state === s || r.feet.R.state === s));
  const fell = !!grounded || last.com[1] < 0.6 * start.com[1];
  // recovery: after the push, ξ back ≥ 1.5 cm inside the reliable polygon, |v_com| < 3 cm/s and trunk within 3° of its pre-push value, held 0.25 s
  let recovery = null; if (x.pu && !fell) { const base = recs.find(r => r.t >= x.pu.n0 * dt - 0.02); for (let i = x.pu.n1; i < recs.length; i++) { const ok = (r) => r.xiMargin >= BAL.copInset && mag3(r.vcom) < 0.03 && Math.abs(r.trunk - base.trunk) < 3;
    if (ok(recs[i]) && recs.slice(i, i + Math.round(0.25 / dt)).every(ok) && i + Math.round(0.25 / dt) < recs.length) { recovery = r2(recs[i].t - x.pu.n1 * dt, 3); break; } } }
  const win = x.pu ? recs.filter(r => r.t >= x.pu.n0 * dt) : recs.filter(r => r.t >= 0.5);
  const peak = (f) => Math.max(...win.map(f)), minOf = (f) => Math.min(...win.map(f));
  const steady = recs.filter(r => r.t >= 1.0 && (!x.pu || r.t < x.pu.n0 * dt) && !r.push);
  const comStart = start.com, comDrift = mag2(V.sub(last.com, comStart));
  // sensing validation numbers (quasi-static steps only)
  const qs = recs.filter(r => r.grf && r.t > 0.3 && !r.push && mag3(r.vcom) < 0.05 && !r.nonFootGround);
  const grfErr = qs.length ? qs.reduce((a, r) => a + Math.abs(r.grf[1] - M * g), 0) / qs.length : null;
  const sumErr = qs.filter(r => r.feet.L.touching || r.feet.R.touching).map(r => Math.abs(r.feet.L.load + r.feet.R.load - r.grf[1]));
  const airRes = recs.filter(r => r.t > 0.02).flatMap(r => ["L", "R"].filter(s => !r.feet[s].manifold).map(s => r.feet[s].load));   // truly airborne: no manifold at all
  // lever-rule cross-check (independent estimators): in quasi-static double stance the momentum-derived CoP fixes each foot's share of the
  // vertical load, α_L = ((c_R − CoP)·e)/|e|²; compare with the ankle-impulse per-foot loads
  const lev = qs.filter(r => r.cop && r.feet.L.touching && r.feet.R.touching && r.footC).map(r => { const e = [r.footC.R[0] - r.footC.L[0], r.footC.R[1] - r.footC.L[1]], ee = e[0] * e[0] + e[1] * e[1];
    const aL = ((r.footC.R[0] - r.cop[0]) * e[0] + (r.footC.R[1] - r.cop[1]) * e[1]) / ee, mL = r.feet.L.load / (r.feet.L.load + r.feet.R.load); return Math.abs(aL - mL); });
  const tFall = times.FALLING != null ? times.FALLING : 1e9, pre = recs.filter(r => r.t < tFall);
  const copIn = qs.filter(r => r.cop), rootRes = pre.filter(r => r.rootRes).map(r => mag3(r.rootRes));
  const joints = spec.joints.map((j, k) => ({ joint: j.name, peakNm: r2(Math.max(...recs.map(r => r.J[k].tq)), 1), peakEff: r2(Math.max(...recs.map(r => r.J[k].eff)), 2), satMs: r2(recs.filter(r => r.J[k].sat).length * dt * 1000, 0),
    budgetMax: r2(Math.max(...recs.map(r => r.J[k].budget)), 2) }));
  const ankleShare = (r) => (r.feet.L.load + r.feet.R.load) > 50 ? r.feet.L.load / (r.feet.L.load + r.feet.R.load) : null;
  const shares = win.map(ankleShare).filter(v => v != null);
  const flags = [];
  const preWin = win.filter(r => r.t < tFall), peakPre = (f) => preWin.length ? Math.max(...preWin.map(f)) : 0;
  if (peakPre(r => r.spine) > 30) flags.push(`spine bend ${peakPre(r => r.spine).toFixed(0)}° while balancing (jackknife check)`);
  if (recs.some(r => r.cls === "RECOVERABLE_IN_PLACE" && r.trunk > 20)) flags.push("trunk > 20° while classified in-place");
  const slipMax = Math.max(...pre.map(r => Math.max(r.feet.L.slipDist, r.feet.R.slipDist))); if (slipMax > 0.01) flags.push(`foot slid ${(slipMax * 100).toFixed(1)} cm`);
  const longSat = spec.joints.map((j, k) => { let run = 0, best = 0; for (const r of recs) { run = r.J[k].sat ? run + 1 : 0; best = Math.max(best, run); } return { j: j.name, ms: best * dt * 1000 }; }).filter(o => o.ms > 300);
  if (longSat.length) flags.push("saturation streaks > 300 ms: " + longSat.map(o => `${o.j} ${o.ms.toFixed(0)} ms`).join(", "));
  const maxCls = ["INIT", "RECOVERABLE_IN_PLACE", "RECOVERABLE_HIP", "STEP_NEEDED", "UNRECOVERABLE", "FALLING", "GROUNDED"].reduce((a, c) => recs.some(r => r.cls === c) ? c : a, "INIT");
  const out = { test: key, group: TST.group, title: TST.title, strength: TST.strength || "candidate", delayMs: r2(x.delaySteps * dt * 1000, 0), push: x.pu ? { dir: x.pu.dir, Ns: x.pu.Ns } : null,
    hash: x.hash, nan: x.nan, audit: x.audit, supportFixture: x.support, constraints: x.nCons,
    outcome: fell ? "FELL" : (x.pu ? (recovery != null ? "RECOVERED" : "STANDING (not settled)") : "STOOD"), maxClass: maxCls,
    classTimes: Object.fromEntries(Object.entries(times).map(([k, v]) => [k, r2(v - (x.pu ? x.pu.n0 * dt : 0), 3)])), fallReason: x.ctrl.cls.reason || null,
    tGrounded: grounded ? r2(grounded.t - (x.pu ? x.pu.n0 * dt : 0), 3) : null, tFootRoll: footRoll ? r2(footRoll.t - (x.pu ? x.pu.n0 * dt : 0), 3) : null,
    fallLeadS: grounded && (times.STEP_NEEDED != null || times.UNRECOVERABLE != null) ? r2(grounded.t - Math.min(times.STEP_NEEDED ?? 1e9, times.UNRECOVERABLE ?? 1e9), 3) : null,
    recoveryS: recovery,
    whole: { comMaxExcursionCm: r2(peak(r => mag2(V.sub(r.com, comStart))) * 100, 1), comPeakSpeed: r2(peak(r => mag3(r.vcom)), 3), xiMarginMinCm: r2(minOf(r => r.xiMargin) * 100, 1), comMarginMinCm: r2(minOf(r => r.comMargin) * 100, 1),
      trunkTiltMaxDeg: r2(peak(r => r.trunk), 1), pelvisTiltMaxDeg: r2(peak(r => r.pelvisTilt), 1), spineBendMaxDeg: r2(peak(r => r.spine), 1), angMomPeak: r2(peak(r => mag3(r.L)), 2),
      footSlipMaxCm: r2(slipMax * 100, 2), loadShareL: shares.length ? [r2(Math.min(...shares), 2), r2(Math.max(...shares), 2)] : null, keMaxJ: r2(peak(r => r.ke), 2), keEndJ: r2(last.ke, 4) },
    quiet: steady.length > 20 ? { comDriftCm: r2(comDrift * 100, 2), swayRmsMm: r2(Math.sqrt(steady.reduce((a, r) => a + ((r.com[0] - comStart[0]) ** 2 + (r.com[2] - comStart[2]) ** 2), 0) / steady.length) * 1000, 2),
      copPathMm: r2(steady.slice(1).reduce((a, r, i) => a + (r.copSmooth && steady[i].copSmooth ? Math.sqrt((r.copSmooth[0] - steady[i].copSmooth[0]) ** 2 + (r.copSmooth[1] - steady[i].copSmooth[1]) ** 2) : 0), 0) * 1000, 1),
      ankleEffortPct: r2(100 * Math.max(...steady.map(r => Math.max(r.J[spec.joints.findIndex(j => j.name === "ankle_L")].eff, r.J[spec.joints.findIndex(j => j.name === "ankle_R")].eff))), 1),
      keMax: r2(Math.max(...steady.map(r => r.ke)), 4), stayedInPlace: steady.every(r => r.cls === "RECOVERABLE_IN_PLACE" || r.cls === "INIT") } : null,
    sensing: { grfYErrN: r2(grfErr, 2), footSumErrN: sumErr.length ? r2(sumErr.reduce((a, b) => a + b, 0) / sumErr.length, 2) : null, footSumErrMaxN: sumErr.length ? r2(Math.max(...sumErr), 1) : null,
      airborneFootResidualN: airRes.length ? { mean: r2(airRes.reduce((a, b) => a + b, 0) / airRes.length, 2), maxAbs: r2(Math.max(...airRes.map(Math.abs)), 1), n: airRes.length } : null,
      copInsidePct: copIn.length ? r2(100 * copIn.filter(r => r.copMargin != null && r.copMargin >= -0.005).length / copIn.length, 1) : null,
      leverShareErr: lev.length ? { mean: r2(lev.reduce((a, b) => a + b, 0) / lev.length, 4), max: r2(Math.max(...lev), 3), n: lev.length } : null,
      rootResidualN: rootRes.length ? { mean: r2(rootRes.reduce((a, b) => a + b, 0) / rootRes.length, 3), max: r2(Math.max(...rootRes), 2) } : null },
    stability: { maxJointSepMm: r2(Math.max(...recs.map(r => r.anchorErr)) * 1000, 2), maxHardLimitDeg: r2(deg(Math.max(...recs.map(r => r.hardViol))), 2), maxSoftOvershootDeg: r2(deg(Math.max(...recs.map(r => r.softViol))), 2),
      maxTurfPenMm: r2(Math.max(...recs.map(r => r.groundPen)) * 1000, 2), maxSelfPenMm: r2(Math.max(...recs.map(r => r.selfPen)) * 1000, 2) },
    friction: (() => { const fs = (side) => { const r = recs.find(q => q.feet[side].slipping); return r ? r2(r.t, 3) : null; }, deg = recs.filter(q => q.degraded).length, fr = recs.filter(q => q.fricR != null).map(q => q.fricR);
      return { firstSlipL: fs("L"), firstSlipR: fs("R"), degradedMs: r2(deg * dt * 1000, 0), frictionLimitCmMin: fr.length ? r2(Math.min(...fr) * 100, 1) : null, slidCm: { L: r2(last.feet.L.slipDist * 100, 1), R: r2(last.feet.R.slipDist * 100, 1) },
        muObserved: (() => { const m = recs.filter(q => q.feet.L.slipping || q.feet.R.slipping).flatMap(q => ["L", "R"].filter(sd => q.feet[sd].slipping && q.feet[sd].muUsed != null).map(sd => q.feet[sd].muUsed)); return m.length ? r2(m.reduce((a, b) => a + b, 0) / m.length, 3) : null; })() }; })(),
    joints, flags, cpu: { msPerFrame: r2((x.cpuJ + x.cpuS + x.cpuC) / x.steps * 4, 4), jolt: r2(x.cpuJ / x.steps * 4, 4), sensing: r2(x.cpuS / x.steps * 4, 4), controller: r2(x.cpuC / x.steps * 4, 4) },
    hipCapCm: { fwd: r2(x.ctrl.hipCap.fwd * 100, 1), bwd: r2(x.ctrl.hipCap.bwd * 100, 1), lat: r2(x.ctrl.hipCap.lat * 100, 1) } };
  out.worst = { push: x.pu ? x.pu.n0 : 0, stepNeeded: times.STEP_NEEDED != null ? Math.round(times.STEP_NEEDED / dt) : 0, falling: times.FALLING != null ? Math.round(times.FALLING / dt) : 0,
    grounded: grounded ? grounded.n : 0, minMargin: win.reduce((a, r) => r.xiMargin < a.xiMargin ? r : a, win[0]).n, footRoll: footRoll ? footRoll.n : 0 };
  out.recs = recs; return out;
}
