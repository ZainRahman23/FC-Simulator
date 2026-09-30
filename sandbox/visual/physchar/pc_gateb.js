// ═══ physchar/pc_gateb.js — GATE B: ACTIVE physical character control — deterministic test suite, measurement, recording ═══════════════
// The Gate A body, joints, colliders, friction and solver configuration are reused unchanged. Added: a finite-strength Jolt motor on every
// joint, joint-space targets from authored key poses (pc_control.js), a temporary finite pelvis support (visible, measured, removable),
// obstacles and impulses. After t = 0 nothing writes a body's position or velocity: every motion is the solver's (audited per run).
import { V, Q, rad, deg, hashNums } from "./pc_math.js";
import { shapeLowestY, shapeSdf } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, jointState, GATE_A_WORLD, TIMESTEP_CONFIGS, frictionPolicy } from "./pc_gatea.js";
import { buildPoses, blendPose, minjerk, targetAt, motorProfile, supportSettings, errAngle, fk } from "./pc_control.js";
import { skinMatrices, meshLowestY } from "./pc_fit.js";

// Gate B keeps Gate A's validated configuration (240 Hz × 1, 30 / 4 iterations, soft hinge end-stops) — only sleeping is disabled,
// because a sleeping body ignores a changing motor target.
export const GATE_B_TSC = "240x1", GATE_B_WORLD = Object.assign({}, GATE_A_WORLD, { allowSleep: false });
const bi = (spec, n) => spec.bodies.findIndex(b => b.name === n), ji = (spec, n) => spec.joints.findIndex(j => j.name === n);
const seg = (t0, t1, a, b, ease, T) => ({ t0, t1, a, b, ease: ease || "minjerk", T });
const hold = (t0, t1, p) => ({ t0, t1, a: p, b: p, ease: "hold" });
const INF = 1e9;

// ── the test suite ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// segs(P, spec) → target segments. support: "candidate" | "reduced" | "off". strength: "candidate" | "weak" | "strong".
export const TESTS = {
  A: { group: "A", title: "A — acquire + hold standing (support: candidate)", note: "Starts in Gate A's relaxed drop-A pose resting on the turf; at t = 0 the motors switch on with the neutral-stance target (a step request). Finite motors must bring the body into the stance and hold it.",
    start: "RELAXED", seconds: 4, segs: (P) => [hold(0, INF, P.N)] },
  A_reduced: { group: "A", title: "A — acquire + hold standing (support: REDUCED ×0.25)", note: "Same as A with the temporary pelvis support at a quarter strength.", start: "RELAXED", seconds: 4, support: "reduced", segs: (P) => [hold(0, INF, P.N)] },
  A_off: { group: "A", title: "A — acquire + hold standing (support: OFF)", note: "Same as A with NO pelvis support: only the joint motors, the feet on the turf and friction.", start: "RELAXED", seconds: 4, support: "off", segs: (P) => [hold(0, INF, P.N)] },
  B: { group: "B", title: "B — slow transition: stance → knee raise → stance (1.5 s each)", note: "Right hip + knee flex, trunk leans, arms counter-swing; the stance foot and the COM target stay over the left foot.",
    start: "N", seconds: 6, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 2.0, P.N, P.K), hold(2.0, 3.5, P.K), seg(3.5, 5.0, P.K, P.N), hold(5.0, INF, P.N)] },
  B_reduced: { group: "B", title: "B — slow transition (support: REDUCED ×0.25)", note: "B with a quarter-strength pelvis support.", start: "N", seconds: 6, support: "reduced",
    segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 2.0, P.N, P.K), hold(2.0, 3.5, P.K), seg(3.5, 5.0, P.K, P.N), hold(5.0, INF, P.N)] },
  B_off: { group: "B", title: "B — slow transition (support: OFF)", note: "B with no pelvis support: single-leg stance with no balance controller.", start: "N", seconds: 6, support: "off",
    segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 2.0, P.N, P.K), hold(2.0, 3.5, P.K), seg(3.5, 5.0, P.K, P.N), hold(5.0, INF, P.N)] },
  C: { group: "C", title: "C — fast transition (0.3 s) — CANDIDATE strength", note: "The same poses as B, five times faster: expect tracking lag and saturation, not unlimited force.",
    start: "N", seconds: 3.6, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 0.8, P.N, P.K), hold(0.8, 2.3, P.K), seg(2.3, 2.6, P.K, P.N), hold(2.6, INF, P.N)] },
  C_weak: { group: "C", title: "C — fast transition — TOO WEAK (×0.25 authority + stiffness)", note: "Strength comparison: the same request with a quarter of the torque limits and stiffness.", start: "N", seconds: 3.6, strength: "weak",
    segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 0.8, P.N, P.K), hold(0.8, 2.3, P.K), seg(2.3, 2.6, P.K, P.N), hold(2.6, INF, P.N)] },
  C_strong: { group: "C", title: "C — fast transition — TOO STRONG (×8 authority + stiffness)", note: "Strength comparison: eight times the torque limits and stiffness.", start: "N", seconds: 3.6, strength: "strong",
    segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 0.8, P.N, P.K), hold(0.8, 2.3, P.K), seg(2.3, 2.6, P.K, P.N), hold(2.6, INF, P.N)] },
  D1: { group: "D", title: "D1 — target REVERSAL mid-motion", note: "The fast knee raise starts (0.35 s min-jerk); at 0.65 s, near peak target velocity, the request reverses and returns linearly to the stance in 0.3 s.",
    start: "N", seconds: 2.5, segs: (P, spec) => { const X = blendPose(spec, P.N, P.K, minjerk(0.15 / 0.35)); return [hold(0, 0.5, P.N), seg(0.5, 0.65, P.N, P.K, "minjerk", 0.35), seg(0.65, 0.95, X, P.N, "linear"), hold(0.95, INF, P.N)]; } },
  D2: { group: "D", title: "D2 — target STEP CHANGE mid-motion", note: "The fast knee raise starts; at 0.70 s the request jumps instantly to a back-swing pose (hip extension, deep knee flexion, arms swapped), held 1 s, then back to the stance.",
    start: "N", seconds: 3.2, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 0.7, P.N, P.K, "minjerk", 0.35), hold(0.7, 1.7, P.BACKSWING), seg(1.7, 2.2, P.BACKSWING, P.N), hold(2.2, INF, P.N)] },
  E: { group: "E", title: "E — BLOCKED LIMB: leg reach through a fixed post, post removed at 3.0 s", note: "The right leg is asked to swing forward to a 60° hip flexion; a fixed, immovable post (r 5.5 cm, a shin-sized obstacle) sits in its path. At 3.0 s the post is removed from the world.",
    start: "N", seconds: 5, obstacle: { hold: "fixed", removeAt: 3.0 }, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 1.1, P.N, P.REACH), hold(1.1, INF, P.REACH)] },
  E_strong: { group: "E", title: "E — blocked limb — TOO STRONG (×8)", note: "The fixed post against eight times the motor authority: contact must still win.", start: "N", seconds: 5, strength: "strong",
    obstacle: { hold: "fixed", removeAt: 3.0 }, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 1.1, P.N, P.REACH), hold(1.1, INF, P.REACH)] },
  E_push_weak: { group: "E", title: "E — movable post — TOO WEAK (×0.25)", note: "The post is movable: 25 kg on a finite spring (2500 N/m, force limit 180 N per axis) — a finite-strength obstacle.", start: "N", seconds: 4, strength: "weak",
    obstacle: { hold: "spring" }, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 1.1, P.N, P.REACH), hold(1.1, INF, P.REACH)] },
  E_push: { group: "E", title: "E — movable post — CANDIDATE", note: "The movable finite-strength post against the candidate motors.", start: "N", seconds: 4,
    obstacle: { hold: "spring" }, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 1.1, P.N, P.REACH), hold(1.1, INF, P.REACH)] },
  E_push_strong: { group: "E", title: "E — movable post — TOO STRONG (×8): bulldozing", note: "The movable post against eight times the motor authority.", start: "N", seconds: 4, strength: "strong",
    obstacle: { hold: "spring" }, segs: (P) => [hold(0, 0.5, P.N), seg(0.5, 1.1, P.N, P.REACH), hold(1.1, INF, P.REACH)] },
  F_chest: { group: "F", title: "F — disturbance: shove at the right shoulder", note: "Holding the stance; at 1.0 s a 50 ms impulse of 47 N·s (≈ a firm shove) acts on the chest at the right shoulder, toward his left and slightly back.",
    start: "N", seconds: 4, impulse: { at: 1.0, dur: 0.05, body: "chest", point: "shoulder_R", J: [-45, 0, -12] }, segs: (P) => [hold(0, INF, P.N)] },
  F_chest_off: { group: "F", title: "F — shove at the right shoulder (support: OFF)", note: "F_chest with no pelvis support: only the joint motors resist; there is no balance controller.",
    start: "N", seconds: 4, support: "off", impulse: { at: 1.0, dur: 0.05, body: "chest", point: "shoulder_R", J: [-45, 0, -12] }, segs: (P) => [hold(0, INF, P.N)] },
  F_pelvis: { group: "F", title: "F — disturbance: shove at the pelvis", note: "Holding the stance; at 1.0 s a 50 ms impulse of 45 N·s acts on the pelvis, backward.",
    start: "N", seconds: 4, impulse: { at: 1.0, dur: 0.05, body: "pelvis", point: "origin", J: [0, 0, -45] }, segs: (P) => [hold(0, INF, P.N)] },
  F_limb: { group: "F", title: "F — disturbance: knock on the left hand", note: "Holding the stance; at 1.0 s a 50 ms impulse of 7 N·s acts on the left hand, upward and forward.",
    start: "N", seconds: 4, impulse: { at: 1.0, dur: 0.05, body: "foreArm_L", point: "hand", J: [0, 5, 5] }, segs: (P) => [hold(0, INF, P.N)] },
};

// Gate B friction: Gate A's policy; an obstacle (index ≤ −2) is "body" material
const frictionB = (spec) => { const base = frictionPolicy(spec); return (i1, i2) => base(i1 <= -2 ? 0 : i1, i2 <= -2 ? 0 : i2); };
// the post: a vertical capsule placed just in front of the right shin where the requested swing reaches ~25° hip flexion
export function obstacleFor(spec, P, ob) {
  const B = blendPose(spec, P.N, P.REACH, 0.33), S = fk(spec, B.rootPos, B.rootRot, B.T), k = bi(spec, "shin_R"), sh = spec.bodies[k].shapes[0];
  const c = V.add(S[k].pos, Q.rot(S[k].rot, sh.pos)), r = 0.055, rs = (sh.rTop + sh.rBot) / 2;
  const pos = [c[0], Math.max(0.3, c[1]), c[2] + rs + r + 0.01];
  return { shape: { type: "capsule", half: 0.22, r, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, pos, mass: ob.hold === "fixed" ? 100 : 25,
           hold: ob.hold === "fixed" ? "fixed" : { kLin: 2500, cLin: 2 * Math.sqrt(2500 * 25), fMax: 180 } };
}
// signed distance from the obstacle capsule to the nearest character collider (m; < 0 = penetration) — post-step, geometric, independent of Jolt
function obstacleGap(spec, st, o) {
  let best = 1e9, who = -1; const n = 81;
  for (let s = 0; s < n; s++) { const p = V.add(o.pos, [0, -o.shape.half + 2 * o.shape.half * s / (n - 1), 0]);
    st.forEach((b, i) => { const lp = Q.rot(Q.conj(b.rot), V.sub(p, b.pos)); for (const sh of spec.bodies[i].shapes) { const d = shapeSdf(sh, lp) - o.shape.r; if (d < best) { best = d; who = i; } } }); }
  return { gap: best, body: who };
}

// ── run one test ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// opts: { tsc, world, keepStates, mesh, rig, refList, map, poses (cached), seconds }
export function runTest(J, spec, key, opts) {
  opts = opts || {}; const TST = TESTS[key], T = TIMESTEP_CONFIGS[opts.tsc || GATE_B_TSC], dt = 1 / T.hz, seconds = opts.seconds || TST.seconds, steps = Math.round(seconds * T.hz), g = 9.81;
  const P = opts.poses || buildPoses(spec), segs = TST.segs(P, spec);
  const w = new JoltCharacterWorld(J, spec, Object.assign({}, GATE_B_WORLD, opts.world || {}), frictionB(spec));
  for (const [a, b] of disabledPairs(spec, opts.world)) w.disablePair(a, b);
  // motors (regional profile, scaled by the test's strength) + the temporary support — created at bind, before the initial pose
  const prof = motorProfile(spec, P.N.S, TST.strength || "candidate"); prof.forEach((m, k) => w.setMotor(k, m));
  const sup = supportSettings(spec, P.N.S, TST.support || "candidate"); if (sup) w.addSupport(sup);
  let ob = null; if (TST.obstacle) { ob = obstacleFor(spec, P, TST.obstacle); w.addObstacle(ob); }
  // initial condition: the start pose, soles 0.5 mm above the turf, at rest (the only state writes of the run)
  const S0 = P[TST.start || "N"].S; S0.forEach((s, i) => w.setPose(i, s.pos, s.rot));
  const nb = spec.bodies.length, nj = spec.joints.length, recs = []; let prev = null, h = 2166136261, cpu = 0, cpuStep = 0, nan = false;
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  const imp = TST.impulse ? { ...TST.impulse, i: bi(spec, TST.impulse.body), n0: Math.round(TST.impulse.at * T.hz), n1: Math.round((TST.impulse.at + TST.impulse.dur) * T.hz) } : null;
  const removeN = TST.obstacle && TST.obstacle.removeAt != null ? Math.round(TST.obstacle.removeAt * T.hz) : null;
  let tgt = targetAt(spec, segs, 0, dt);
  for (let n = 0; n <= steps; n++) {
    let impNow = null;
    if (n > 0) {
      const c0 = now();
      // ── the controller: the authored request for the END of this step → finite motors (and the support) — nothing else ──
      tgt = targetAt(spec, segs, n * dt, dt);
      for (let k = 0; k < nj; k++) w.setJointTarget(k, tgt.P.T[k], tgt.W[k]);
      if (sup) w.setSupportTarget(tgt.P.rootPos, tgt.P.rootRot, tgt.rootV, tgt.rootW);
      if (removeN != null && n === removeN) w.removeObstacle(0);
      if (imp && n > imp.n0 && n <= imp.n1) { const b = prev[imp.i], pt = pointOn(spec, imp, prev), J_ = V.sc(imp.J, 1 / (imp.n1 - imp.n0)); w.applyImpulse(imp.i, J_, pt); impNow = { pt, J: J_ }; }
      const c1 = now(); w.step(dt, T.coll); const c2 = now(); cpu += c2 - c0; cpuStep += c2 - c1;
    }
    const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i));
    for (const s of st) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h); }
    // joints: requested target vs solved state (constraint space), motor effort, saturation
    const J8 = spec.joints.map((j, k) => {
      const act = j.type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k), err = errAngle(j, tgt.P.T[k], act);
      const lam = n > 0 ? w.motorLambda(k) : (j.type === "hinge" ? 0 : [0, 0, 0]), m = prof[k];
      const tau = j.type === "hinge" ? Math.abs(lam) / dt : Math.sqrt(lam[0] * lam[0] + lam[1] * lam[1] + lam[2] * lam[2]) / dt;
      const sat = j.type === "hinge" ? Math.abs(lam) >= 0.98 * m.tau * dt : lam.some(x => Math.abs(x) >= 0.98 * m.tau * dt);
      const tauAx = j.type === "hinge" ? Math.abs(lam) / dt : Math.max(...lam.map(Math.abs)) / dt;
      return { act, err, tau, tauAx, sat, lam }; });
    // the support's effort (force in world axes at the pelvis origin, torque about pelvis axes)
    let supR = null; if (sup) { const l = w.supportLambda(), F = V.sc(l.lin, 1 / dt), Tq = V.sc(l.ang, 1 / dt);
      supR = { F, T: Tq, sat: F.some(x => Math.abs(x) >= 0.98 * sup.fMax) || Tq.some(x => Math.abs(x) >= 0.98 * sup.tMax) }; }
    // obstacle: holding force (= what the character pushes with), geometric gap, contact depth + approach speed at the contact
    let obR = null; if (ob) { const os = w.obstacleState(0); let depth = null, appr = null, cb = null;
      for (const c of w.contacts) { if (!(c.a <= -2 || c.b <= -2)) continue; const ci = c.a <= -2 ? c.b : c.a; if (ci < 0) continue; const nC = c.a <= -2 ? c.normal : V.sc(c.normal, -1);
        if (depth == null || c.depth > depth) { depth = c.depth; cb = ci; } const s = st[ci];
        for (const p of c.pts) { const vp = V.add(s.v, V.cross(s.w, V.sub(p, s.com))), a = -V.dot(vp, nC); if (appr == null || a > appr) appr = a; } }
      const og = os.removed ? { gap: null, body: -1 } : obstacleGap(spec, st, Object.assign({}, ob, { pos: os.pos }));
      obR = { pos: os.pos, removed: os.removed, F: n > 0 && !os.removed ? V.sc(w.obstacleImpulse(0), 1 / dt) : [0, 0, 0], depth, appr, body: cb, gap: og.gap, gapBody: og.body }; }
    // Gate A's stability measurements, unchanged
    let groundPen = 0, groundBody = -1; for (let i = 0; i < nb; i++) for (const s of spec.bodies[i].shapes) { const y = shapeLowestY(s, st[i].pos, st[i].rot); if (-y > groundPen) { groundPen = -y; groundBody = i; } }
    let anchorErr = 0, anchorJoint = -1, hardViol = 0, hardJoint = -1, softViol = 0;
    spec.joints.forEach((j, k) => { const Pb = st[j.parentIndex], pb = spec.bodies[j.parentIndex], a1 = V.add(Pb.pos, Q.rot(Pb.rot, V.sub(j.at, pb.origin))), e = V.dist(a1, st[j.childIndex].pos);
      if (e > anchorErr) { anchorErr = e; anchorJoint = k; } const js = jointState(j, st); if (j.type === "sixdof") { if (js.viol > hardViol) { hardViol = js.viol; hardJoint = k; } } else softViol = Math.max(softViol, js.viol); });
    let ke = 0, pe = 0, wRms = 0; for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s = st[i], wl = Q.rot(Q.conj(s.rot), s.w);
      ke += 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); pe += b.mass * g * s.com[1]; wRms += V.dot(s.w, s.w); }
    wRms = Math.sqrt(wRms / nb);
    let pop = 0; if (prev) for (let i = 0; i < nb; i++) pop = Math.max(pop, V.dist(V.sub(st[i].com, prev[i].com), V.sc(st[i].v, dt)));
    let selfPen = 0, selfPair = null; for (const c of w.contacts) if (c.a >= 0 && c.b >= 0 && c.depth > selfPen) { selfPen = c.depth; selfPair = `${spec.bodies[c.a].name}–${spec.bodies[c.b].name}`; }
    const pelvisErr = { pos: V.dist(st[0].pos, tgt.P.rootPos), ang: errAngle({ type: "sixdof" }, tgt.P.rootRot, st[0].rot) };
    let meshPen = null; if (opts.mesh && n % Math.max(1, T.hz / 60) === 0) { const sk = skinMatrices(opts.rig, spec, st, opts.map); meshPen = Math.max(0, -meshLowestY(opts.mesh, sk, opts.refList).minY); }
    const rec = { n, t: n * dt, J: J8, errRms: Math.sqrt(J8.reduce((a, x) => a + x.err * x.err, 0) / nj), sup: supR, ob: obR, imp: impNow, pelvisErr,
      groundPen, groundBody, anchorErr, anchorJoint, hardViol, hardJoint, softViol, ke, pe, wRms, pop, selfPen, selfPair, meshPen, contacts: w.contacts.length };
    if (opts.keepStates) { rec.states = st.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w, awake: s.awake })); rec.cts = w.contacts.map(c => ({ ...c }));
      rec.tgt = { T: tgt.P.T, rootPos: tgt.P.rootPos, rootRot: tgt.P.rootRot }; }
    recs.push(rec); prev = st;
  }
  const audit = Object.assign({}, w.audit); w.destroy();
  return summarizeB(spec, key, TST, T, recs, { cpu, cpuStep, steps, hash: (h >>> 0).toString(16), prof, sup, ob, segs, audit, nan, imp, poses: P });
}
function pointOn(spec, imp, st) { const b = st[imp.i];
  if (imp.point === "origin") return b.pos.slice();
  if (imp.point === "hand") { const sh = spec.bodies[imp.i].shapes[1]; return V.add(b.pos, Q.rot(b.rot, sh.pos)); }
  const j = spec.joints.find(x => x.name === imp.point); return V.add(b.pos, Q.rot(b.rot, V.sub(j.at, spec.bodies[imp.i].origin))); }

// ── summary ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function summarizeB(spec, key, TST, T, recs, x) {
  const dt = 1 / T.hz, nj = spec.joints.length, last = recs[recs.length - 1];
  const joints = spec.joints.map((j, k) => { let s2 = 0, sm = 0, pk = 0, pkAt = 0, tpk = 0, sat = 0;
    for (const r of recs) { const e = r.J[k].err; s2 += e * e; sm += e; if (e > pk) { pk = e; pkAt = r.t; } if (r.J[k].tauAx > tpk) tpk = r.J[k].tauAx; if (r.J[k].sat) sat++; }
    return { joint: j.name, rmsDeg: r2(deg(Math.sqrt(s2 / recs.length)), 2), meanDeg: r2(deg(sm / recs.length), 2), peakDeg: r2(deg(pk), 1), peakAt: r2(pkAt, 3),
             peakTauNm: r2(tpk, 1), tauMax: r2(x.prof[k].tau, 0), peakTauPct: r2(100 * tpk / x.prof[k].tau, 0), satMs: r2(sat * dt * 1000, 0), restDeg: r2(deg(last.J[k].err), 2) }; });
  const allRms = Math.sqrt(recs.reduce((a, r) => a + r.errRms * r.errRms, 0) / recs.length), pkR = recs.reduce((a, r) => r.errRms > a.errRms ? r : a);
  const pkJ = joints.reduce((a, j) => j.peakDeg > a.peakDeg ? j : a);
  // hold windows: the last 0.5 s of every hold segment (and of the run) — steady-state error, sway / jitter, energy trend
  const holds = x.segs.filter(s => s.ease === "hold").map(s => { const t1 = Math.min(s.t1, last.t), t0 = Math.max(s.t0, t1 - 0.5); const R = recs.filter(r => r.t >= t0 && r.t <= t1);
    if (!R.length || t1 - s.t0 < 0.4) return null;
    return { t0: r2(t0, 2), t1: r2(t1, 2), errRmsDeg: r2(deg(Math.sqrt(R.reduce((a, r) => a + r.errRms ** 2, 0) / R.length)), 2), keMaxJ: r2(Math.max(...R.map(r => r.ke)), 3),
             bodyAngVelRmsDegS: r2(deg(Math.sqrt(R.reduce((a, r) => a + r.wRms ** 2, 0) / R.length)), 2), satSteps: R.reduce((a, r) => a + r.J.filter(q => q.sat).length, 0) }; }).filter(Boolean);
  const out = { test: key, group: TST.group, title: TST.title, note: TST.note, tsc: T.label, steps: x.steps, seconds: r2(x.steps * dt, 3), hash: x.hash, nan: x.nan, audit: x.audit,
    strength: TST.strength || "candidate", support: TST.support || "candidate",
    errRmsDeg: r2(deg(allRms), 2), errPeakRmsDeg: r2(deg(pkR.errRms), 2), errPeakRmsAt: r2(pkR.t, 3), errPeakJoint: pkJ.joint, errPeakJointDeg: pkJ.peakDeg,
    satMsTotal: r2(joints.reduce((a, j) => a + j.satMs, 0), 0), joints, holds,
    maxAnchorErrMm: r2(Math.max(...recs.map(r => r.anchorErr)) * 1000, 2), maxAnchorJoint: (() => { const r = recs.reduce((a, r) => r.anchorErr > a.anchorErr ? r : a); return spec.joints[r.anchorJoint] ? spec.joints[r.anchorJoint].name : "-"; })(),
    maxHardLimitDeg: r2(deg(Math.max(...recs.map(r => r.hardViol))), 2), maxHardLimitJoint: (() => { const r = recs.reduce((a, r) => r.hardViol > a.hardViol ? r : a); return spec.joints[r.hardJoint] ? spec.joints[r.hardJoint].name : "-"; })(),
    hardLimitOver2degMs: r2(recs.filter(r => r.hardViol > rad(2)).length * dt * 1000, 0), maxSoftOvershootDeg: r2(deg(Math.max(...recs.map(r => r.softViol))), 2),
    maxGroundPenMm: r2(Math.max(...recs.map(r => r.groundPen)) * 1000, 2), restGroundPenMm: r2(Math.max(...recs.filter(r => r.t >= last.t - 0.5).map(r => r.groundPen)) * 1000, 2),
    maxSelfPenMm: r2(Math.max(...recs.map(r => r.selfPen)) * 1000, 2), maxPopMm: r2(Math.max(...recs.map(r => r.pop)) * 1000, 2),
    meshPenMaxMm: recs.some(r => r.meshPen != null) ? r2(Math.max(...recs.filter(r => r.meshPen != null).map(r => r.meshPen)) * 1000, 1) : null,
    keMaxJ: r2(Math.max(...recs.map(r => r.ke)), 2), keEndJ: r2(last.ke, 3),
    pelvisEnd: { posMm: r2(last.pelvisErr.pos * 1000, 1), angDeg: r2(deg(last.pelvisErr.ang), 2) }, pelvisMaxPosMm: r2(Math.max(...recs.map(r => r.pelvisErr.pos)) * 1000, 1),
    cpuMsPerStep: r2(x.cpu / x.steps, 4), cpuMsPerFrame: r2(x.cpu / x.steps * (T.hz / 60), 4), cpuJoltMsPerFrame: r2(x.cpuStep / x.steps * (T.hz / 60), 4),
    cpuControllerMsPerFrame: r2((x.cpu - x.cpuStep) / x.steps * (T.hz / 60), 4),
    profile: x.prof.map(m => ({ joint: m.joint, region: m.region, tau: r2(m.tau, 0), kp: r2(m.kp, 0), kd: r2(m.kd, 1), Iload: r2(m.Iload, 3) })),
    supportSettings: x.sup ? { level: x.sup.level, kLin: r2(x.sup.kLin, 0), cLin: r2(x.sup.cLin, 0), fMax: r2(x.sup.fMax, 0), kRot: r2(x.sup.kRot, 0), cRot: r2(x.sup.cRot, 0), tMax: r2(x.sup.tMax, 0) } : null };
  if (x.sup) { const W = recs.map(r => r.sup), mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    out.supportUse = { peakForceN: r2(Math.max(...W.map(s => mag(s.F))), 0), meanForceN: r2(W.reduce((a, s) => a + mag(s.F), 0) / W.length, 1),
      meanLiftPctBW: r2(100 * W.reduce((a, s) => a + s.F[1], 0) / W.length / (spec.totalMass * 9.81), 1), peakTorqueNm: r2(Math.max(...W.map(s => mag(s.T))), 1),
      meanTorqueNm: r2(W.reduce((a, s) => a + mag(s.T), 0) / W.length, 1), satMs: r2(W.filter(s => s.sat).length * dt * 1000, 0) }; }
  if (x.ob) { const R = recs.filter(r => r.ob && !r.ob.removed), mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    const first = R.find(r => r.ob.depth != null && r.ob.depth > -0.0005), gaps = R.filter(r => r.ob.gap != null).map(r => r.ob.gap);
    const kh = spec.joints.findIndex(j => j.name === "hip_R"), rem = recs.find(r => r.ob && r.ob.removed);
    const window = (t0, t1) => recs.filter(r => r.t >= t0 && r.t <= t1);
    out.block = { obstacle: { pos: x.ob.pos.map(v => r2(v, 3)), r: x.ob.shape.r, mass: x.ob.mass, hold: x.ob.hold === "fixed" ? "fixed" : x.ob.hold },
      firstContactT: first ? r2(first.t, 4) : null, firstContactBody: first ? spec.bodies[first.ob.body].name : null,
      maxPenetrationMm: r2(-Math.min(...gaps) * 1000, 2), maxListenerDepthMm: r2(Math.max(...R.map(r => r.ob.depth == null ? -1 : r.ob.depth)) * 1000, 2),
      maxForceN: r2(Math.max(...R.map(r => mag(r.ob.F))), 0),
      obstacleMaxDisplacementMm: r2(Math.max(...R.map(r => V.dist(r.ob.pos, x.ob.pos))) * 1000, 1),
      // the contact step: gap, approach speed and hip_R state around the first touch
      contactSteps: first ? recs.filter(r => r.n >= first.n - 3 && r.n <= first.n + 4).map(r => ({ n: r.n, t: r2(r.t, 4), gapMm: r2(r.ob.gap * 1000, 2), depthMm: r.ob.depth == null ? null : r2(r.ob.depth * 1000, 2),
        approachMs: r.ob.appr == null ? null : r2(r.ob.appr, 3), forceN: r2(mag(r.ob.F), 0), hipErrDeg: r2(deg(r.J[kh].err), 2), hipTauNm: r2(r.J[kh].tauAx, 1) })) : [],
      removedT: rem ? r2(rem.t, 3) : null };
    if (first) { const blockEnd = rem ? rem.t : last.t, W_ = window(first.t + 0.3, blockEnd - 0.05);
      if (W_.length) { out.block.whileBlocked = { t0: r2(W_[0].t, 2), t1: r2(W_[W_.length - 1].t, 2), hipErrDeg: r2(deg(W_.reduce((a, r) => a + r.J[kh].err, 0) / W_.length), 1),
        hipTauNm: r2(W_.reduce((a, r) => a + r.J[kh].tauAx, 0) / W_.length, 1), hipSatPct: r2(100 * W_.filter(r => r.J[kh].sat).length / W_.length, 0),
        contactForceN: r2(W_.reduce((a, r) => a + mag(r.ob.F), 0) / W_.length, 0), penetrationMm: r2(-Math.min(...W_.map(r => r.ob.gap == null ? 1 : r.ob.gap)) * 1000, 2),
        otherJointsErr: spec.joints.map((j, k) => ({ joint: j.name, deg: r2(deg(W_.reduce((a, r) => a + r.J[k].err, 0) / W_.length), 1) })).filter(o => !/_R$/.test(o.joint) || o.joint === "shoulder_R" || o.joint === "elbow_R"),
        supportForceN: W_[0].sup ? r2(W_.reduce((a, r) => a + mag(r.sup.F), 0) / W_.length, 0) : null }; }
      if (rem) { const after = recs.filter(r => r.t > rem.t), reach = after.find(r => deg(r.J[kh].err) < 5);
        out.block.afterRemoval = { hipErrAtRemovalDeg: r2(deg(rem.J[kh].err), 1), timeToWithin5degS: reach ? r2(reach.t - rem.t, 3) : null, hipErrEndDeg: r2(deg(last.J[kh].err), 2) }; } } }
  if (x.imp) { const t0 = x.imp.n0 * dt, base = recs.filter(r => r.t >= t0 - 0.5 && r.t < t0), b = base.reduce((a, r) => a + r.errRms, 0) / Math.max(1, base.length);
    const after = recs.filter(r => r.t >= t0), pk = after.reduce((a, r) => r.errRms > a.errRms ? r : a), thr = b + Math.max(rad(0.5), 0.1 * (pk.errRms - b));
    let rec = null; for (let i = after.indexOf(pk); i < after.length; i++) { if (after[i].errRms <= thr && after.slice(i, i + Math.round(0.25 / dt)).every(r => r.errRms <= thr)) { rec = after[i]; break; } }
    const worst = spec.joints.map((j, k) => ({ joint: j.name, deg: Math.max(...after.map(r => r.J[k].err)) })).sort((a, b_) => b_.deg - a.deg).slice(0, 5).map(o => ({ joint: o.joint, deg: r2(deg(o.deg), 1) }));
    out.disturbance = { at: r2(t0, 3), impulseNs: r2(Math.sqrt(x.imp.J.reduce((a, v) => a + v * v, 0)), 1), baselineRmsDeg: r2(deg(b), 2), peakRmsDeg: r2(deg(pk.errRms), 2), peakAt: r2(pk.t - t0, 3),
      recoveryS: rec ? r2(rec.t - t0, 3) : null, thresholdDeg: r2(deg(thr), 2), worstJoints: worst, pelvisMaxDisplacementMm: r2(Math.max(...after.map(r => r.pelvisErr.pos)) * 1000, 1),
      supportPeakN: after[0].sup ? r2(Math.max(...after.map(r => Math.sqrt(r.sup.F.reduce((a, v) => a + v * v, 0)))), 0) : null }; }
  out.fell = last.pelvisErr.pos > 0.25;                     // the pelvis ended > 25 cm from its requested place: the body went down
  out.worst = { err: pkR.n, limit: recs.reduce((a, r) => r.hardViol > a.hardViol ? r : a).n, anchor: recs.reduce((a, r) => r.anchorErr > a.anchorErr ? r : a).n,
    ground: recs.reduce((a, r) => r.groundPen > a.groundPen ? r : a).n, self: recs.reduce((a, r) => r.selfPen > a.selfPen ? r : a).n,
    penetration: x.ob ? recs.reduce((a, r) => (r.ob && r.ob.gap != null && (a.ob.gap == null || r.ob.gap < a.ob.gap)) ? r : a).n : 0,
    contact: out.block && out.block.firstContactT != null ? Math.round(out.block.firstContactT / dt) : 0, disturbance: x.imp ? x.imp.n0 : 0 };
  out.recs = recs;
  return out;
}
