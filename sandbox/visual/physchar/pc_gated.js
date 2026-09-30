// ═══ physchar/pc_gated.js — GATE D (vertical slice): TWO physical characters in ONE Jolt world ══════════════════════════════════════════
// The critical invariant (the user's): when a leg meets a leg the bodies cannot pass through each other, and the contact changes BOTH
// bodies' motion ON THAT contact step — no root nudges, teleports, overlap clean-up or canned reactions.
// Two complete V1.1 characters (the same 14-body spec; B is the spec translated — both face +z so neither controller sees a new frame)
// are created as one 28-body, 26-joint Jolt world. Each character has its OWN sensor, balance controller and stepper/sequencer, and only
// its own motors. Each character's sensor sees the other character's bodies as UNKNOWN external bodies (never as turf, never as self):
// support comes only from turf contacts; the push each one receives from the other is not known to it — it only shows up in its own
// motion. Physics is the only thing that couples them. Nothing here decides a football outcome (possession, foul, tackle success): the
// slice reports the physical contact and each body's response.
import { V, Q, hashNums, rad } from "./pc_math.js";
import { shapeLowestY } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, frictionPolicy, TIMESTEP_CONFIGS } from "./pc_gatea.js";
import { GATE_C1_TSC, GATE_C1_WORLD } from "./pc_gatec1.js";
import { buildPoses, fk, paramTarget } from "./pc_control.js";
import { Sensor } from "./pc_sense.js";
import { BalanceController, budgetLimits, controllerProfile } from "./pc_balance.js";
import { CorrectiveStepper } from "./pc_step.js";
import { SupportSequencer } from "./pc_support.js";

// ── THE REFERENCE SLIDE as JOINT TARGETS (Reference Tackle V1, reference-tackle/sandbox/visual/reftackle/authoring.js, the tackler's measured
// keys f92–f114, 60 Hz): per channel [frame, degrees]. Only JOINT angles are used — the pelvis orientation, the root path and the plants of
// the authored clip are NOT: the body has no root actuator, so its orientation, its slide and where it stops are the physics' answer.
// Mapping (verified against pc_control's POSES conventions): thigh x → hip y (x<0 = flexion) · shin x → knee a · foot x → ankle y (+ = toes
// down) · spine x → lumbar y · chest x → thoracic y · neck x → neck y · upperArm x/z → shoulder y/z · foreArm x → elbow a (sign flipped).
const REF_SLIDE = {
  hip_R: [[92, -40], [94, -34], [96, -32], [98, -48], [100, -44], [104, -42], [106, -48], [108, -58], [110, -68], [114, -72]],
  knee_R: [[92, 25], [94, 10], [96, 6], [98, 25], [100, 18], [104, 15], [106, 30], [108, 55], [110, 70], [114, 75]],
  ankle_R: [[92, -20], [96, -15], [98, -15], [106, -10], [110, -20], [114, -20]],
  hip_L: [[92, -22], [94, -52], [96, -65], [98, -70], [104, -75], [110, -85], [114, -85]],
  knee_L: [[92, 140], [94, 145], [98, 145], [104, 140], [110, 125], [114, 125]],
  ankle_L: [[92, -46], [94, -48], [96, -42], [98, -40], [104, -35], [110, -25], [114, -25]],
  lumbar: [[92, -8], [94, -3], [96, 0], [98, 10], [100, 20], [102, 30], [104, 34], [106, 30], [108, 24], [112, 20], [114, 20]],
  thoracic: [[92, 2], [96, 4], [98, 10], [100, 14], [102, 18], [104, 18], [106, 14], [110, 10], [114, 10]],
  neck: [[92, 32], [94, 38], [96, 40], [98, 40], [100, 42], [102, 45], [104, 45], [108, 40], [112, 35], [114, 35]],
  shoulder_L: { y: [[92, -132], [96, -134], [98, -145], [100, -150], [102, -105], [104, -70], [106, -58], [110, -55], [114, -55]], z: [[92, -15], [96, -12], [98, 5], [100, 25], [102, 25], [104, 15], [106, 10], [110, 5], [114, 5]] },
  shoulder_R: { y: [[92, -10], [96, 0], [98, -5], [102, -30], [106, -15], [110, -10], [114, -10]], z: [[92, 22], [96, 22], [98, 18], [102, 24], [106, 20], [110, 14], [114, 14]] },
  elbow_L: [[92, 5], [96, 5], [98, 25], [100, 35], [102, 10], [104, 5], [110, 10], [114, 12]],
  elbow_R: [[92, 40], [96, 25], [98, 35], [106, 80], [110, 105], [114, 105]],
};
const lerpKeys = (keys, f) => { if (f <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const [f0, a] = keys[i - 1], [f1, b] = keys[i]; return a + (b - a) * (f - f0) / (f1 - f0); } return keys[keys.length - 1][1]; };
// The reference's keys exceed this body's range of motion in places (trail knee 145° vs 140°, trail ankle 48° dorsiflexion vs 30°): an
// initial pose built from them started with the ankle 9.4 mm apart (the limit constraint snapped it on step 1) and the motors pushed into
// the stops all slide long (finding 2026-09-30). The targets are the reference CLAMPED to the body's ROM with a 2° margin — the same rule
// as Gate A's re-authored fixture: the body's anatomy wins over the authored data.
const ROM_MARGIN = 2 * Math.PI / 180, clampR = (v, lo, hi) => Math.max(lo + ROM_MARGIN, Math.min(hi - ROM_MARGIN, v));
export function slideTargets(spec, f) { return spec.joints.map(j => { const c = REF_SLIDE[j.name]; if (!c) return paramTarget(j, null); const d2r = Math.PI / 180, r2d = 180 / Math.PI;
  if (j.type === "hinge") return paramTarget(j, { a: clampR(lerpKeys(c, f) * d2r, j.lo, j.hi) * r2d });
  const y = clampR((Array.isArray(c) ? lerpKeys(c, f) : lerpKeys(c.y, f)) * d2r, j.limits.swingY[0], j.limits.swingY[1]) * r2d, z = Array.isArray(c) ? 0 : clampR(lerpKeys(c.z, f) * d2r, j.limits.swingZ[0], j.limits.swingZ[1]) * r2d;
  return paramTarget(j, { y, z }); }); }
const S2 = Math.SQRT1_2, DIR = { F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0], FR: [S2, 0, S2] };
const OTHER = -1000;                         // the other character's body j is seen as contact index OTHER − j (not turf −1, not an obstacle)
// B's placement relative to A (m, world): both face +z; A is at the origin
export const TESTS_D = {
  D1_heel_clip: { group: "D contact", title: "D1 — heel clip: A places his right foot 26 cm forward into the heel of B standing 45 cm in front", seconds: 5,
    B: [0, 0, 0.45], A: { requests: [{ type: "place", foot: "R", forward: 0.26, outward: 0, at: 0.5 }] } },
  D2_shoved_into: { group: "D contact", title: "D2 — shoved into: A is pushed forward 80 N·s; his corrective step runs into B standing 55 cm in front", seconds: 5,
    B: [0, 0, 0.55], A: { push: { at: 1.0, dur: 0.05, dir: "F", Ns: 80 } } },
  D3_shoulder: { group: "D contact", title: "D3 — shoulder to shoulder: A is pushed toward his right 65 N·s into B standing 85 cm to his right (hanging hands 3 cm apart)", seconds: 5,
    B: [0.85, 0, 0], A: { push: { at: 1.0, dur: 0.05, dir: "R", Ns: 65 } } },
  D4_shoved_hard: { group: "D contact", title: "D4 — shoved hard into: A is pushed forward 110 N·s (beyond one step alone) into B standing 55 cm in front", seconds: 5,
    B: [0, 0, 0.55], A: { push: { at: 1.0, dur: 0.05, dir: "F", Ns: 110 } } },
  D5_shoulder_hard: { group: "D contact", title: "D5 — hard shoulder: A is pushed toward his right 110 N·s into B standing 85 cm to his right", seconds: 5,
    B: [0.85, 0, 0], A: { push: { at: 1.0, dur: 0.05, dir: "R", Ns: 110 } } },
  D6_slide: { group: "D reference-tackle step", title: "D6 — slide tackle into a standing player: A's joints track the reference slide (f94→f114); A starts at the seat landing at 5.5 m/s (initial condition — the run-up is not simulated); B stands", seconds: 4,
    B: [0, 0, 0], A: { track: { f0: 94, f1: 114 }, init: { yawDeg: 90, reclineDeg: -48, rollDeg: -4, speed: 5.5, vy: -0.8, leadGap: 0.75, clear: 0.01 } } },
  D0_apart: { group: "D control", title: "D0 — control: both stand 2 m apart for 3 s (no contact expected; each must match its single-character run)", seconds: 3,
    B: [2.0, 0, 0], A: {} },
};

// B = A's spec translated by `off` (deep copy: body origins and joint anchors are the only world positions a spec carries)
export function shiftSpec(spec, off) {
  const c = JSON.parse(JSON.stringify(spec)); for (const b of c.bodies) b.origin = V.add(b.origin, off); for (const j of c.joints) j.at = V.add(j.at, off); return c; }
function mergeSpecs(A, B) { const nb = A.bodies.length;
  return { ...A, bodies: [...A.bodies, ...B.bodies.map(b => ({ ...b, index: b.index + nb, parentIndex: b.parentIndex >= 0 ? b.parentIndex + nb : -1 }))],
    joints: [...A.joints, ...B.joints.map(j => ({ ...j, parentIndex: j.parentIndex + nb, childIndex: j.childIndex + nb }))], totalMass: A.totalMass + B.totalMass }; }

class Agent {
  constructor(name, spec, i0, k0, cfg, ctrlExtra, poses) {
    this.name = name; this.spec = spec; this.i0 = i0; this.k0 = k0; this.nb = spec.bodies.length; this.nj = spec.joints.length; this.cfg = cfg || {};
    this.P = poses || buildPoses(spec); this.track = this.cfg.track || null;
    // a TRACKING character (the slider) holds time-varying joint targets with the SAME finite motors and gains (BalanceController "hold" mode:
    // no balance law, no classifier — nothing to balance on); every other character runs the full C1 + C3 stack
    this.ctrl = new BalanceController(spec, this.P, Object.assign({ strength: "candidate" }, controllerProfile(spec), this.track ? { mode: "hold" } : {}, ctrlExtra || {}));
    this.sensor = new Sensor(spec, { supportTouching: true, muSettle: 0.15, externalSupport: !!(ctrlExtra && ctrlExtra.externalSupport) });   // (option) support by the other body
    // a scripted C2 placement (the only voluntary action in the slice) or, by default, C3 reactive stepping on top of C1 balance
    this.seq = this.cfg.requests ? new SupportSequencer(spec, this.P, this.ctrl, this.cfg.requests) : null; this.stepper = this.seq || this.track ? null : new CorrectiveStepper(spec, this.P, this.ctrl);
    const ji = (n) => spec.joints.findIndex(j => j.name === n); this.aL = ji("ankle_L"); this.aR = ji("ankle_R");
    this.pelvisJoints = spec.joints.map((j, k) => j.parentIndex === 0 || j.childIndex === 0 ? k : -1).filter(k => k >= 0);
  }
  own(i) { return i >= this.i0 && i < this.i0 + this.nb; }
  view(c) { const m = (i) => i < 0 ? i : this.own(i) ? i - this.i0 : OTHER - i; return { ...c, a: m(c.a), b: m(c.b) }; }   // this character's view of a contact
  read(w) { const st = []; for (let i = 0; i < this.nb; i++) st.push(w.read(this.i0 + i)); return st; }
}

export function runD(J, spec, key, opts) {
  opts = opts || {}; const TST = TESTS_D[key], T = TIMESTEP_CONFIGS[GATE_C1_TSC], dt = 1 / T.hz, steps = Math.round((opts.seconds || TST.seconds) * T.hz), g = 9.81;
  const nb = spec.bodies.length, nj = spec.joints.length, specB = shiftSpec(spec, TST.B), world = mergeSpecs(spec, specB);
  const w = new JoltCharacterWorld(J, world, opts.world ? { ...GATE_C1_WORLD, ...opts.world } : GATE_C1_WORLD, frictionPolicy(world));   // opts.world: EXPERIMENTS only (the gate config is Gate A's)
  for (const [a, b] of disabledPairs(spec)) { w.disablePair(a, b); w.disablePair(a + nb, b + nb); }         // each character's own filtered pairs; A ↔ B all collide
  const A = new Agent("A", spec, 0, 0, TST.A, opts.ctrlExtraA || opts.ctrlExtra, opts.poses), B = new Agent("B", specB, nb, nj, TST.B_cfg || {}, opts.ctrlExtraB || opts.ctrlExtra), agents = [A, B];
  if (w.support || w.cons.length !== 2 * nj || w.ps.GetNumBodies() !== 2 * nb + 1) throw new Error("D world is not clean");
  for (const ag of agents) { ag.ctrl.gain.forEach((gn, k) => w.setMotor(ag.k0 + k, { kp: gn.kp, kd: gn.kdStance, tau: 1 })); if (!ag.track) ag.P.N.S.forEach((s, i) => w.setPose(ag.i0 + i, s.pos, s.rot)); }
  // the SLIDER's initial condition (t = 0 only, like Gate A's drops): the reference pose at f0 (forward kinematics of its joint targets), facing
  // the slide direction (+x), reclined / rolled as the reference pelvis at f0, its lowest point `clear` above the turf, its LEAD (right) boot
  // aligned with B's left boot and `leadGap` short of it; every body starts with the same velocity (speed along +x, vy down)
  let initInfo = null; if (A.track) { const I = TST.A.init, T0 = slideTargets(spec, A.track.f0), rr = Q.mul(Q.axis([0, 1, 0], rad(I.yawDeg)), Q.mul(Q.axis([1, 0, 0], rad(I.reclineDeg)), Q.axis([0, 0, 1], rad(I.rollDeg))));
    let S = fk(spec, [0, 1, 0], rr, T0); const low = Math.min(...S.flatMap((s, i) => spec.bodies[i].shapes.map(sh => shapeLowestY(sh, s.pos, s.rot))));
    const fR = spec.bodies.findIndex(b => b.name === "foot_R"), fL = fR - 3 >= 0 ? spec.bodies.findIndex(b => b.name === "foot_L") : -1, box = spec.bodies[fR].shapes[0];
    const cen = (st, i) => V.add(st[i].pos, Q.rot(st[i].rot, spec.bodies[i].shapes[0].pos)), bL = cen(B.P.N.S, fL), aR = cen(S, fR), front = aR[0] + box.he[2];
    const shift = [bL[0] - B.spec.bodies[fL].shapes[0].he[0] - I.leadGap - front, I.clear - low, bL[2] - aR[2]];
    S = S.map(s => ({ pos: V.add(s.pos, shift), rot: s.rot })); S.forEach((s, i) => { w.setPose(i, s.pos, s.rot); w.setVel(i, [I.speed, I.vy, 0], [0, 0, 0]); });
    initInfo = { leadBootFrontX: +(front + shift[0]).toFixed(3), bLeftBootX: +(bL[0]).toFixed(3), pelvis: S[0].pos.map(v => +v.toFixed(3)), lowestY: I.clear }; }
  const pu = TST.A.push ? { ...TST.A.push, n0: Math.round(TST.A.push.at * T.hz), n1: Math.round((TST.A.push.at + TST.A.push.dur) * T.hz), J: V.sc(DIR[TST.A.push.dir], TST.A.push.Ns) } : null;
  for (const ag of agents) { ag.states = ag.read(w); ag.obs = ag.sensor.update(0, dt, ag.states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null); ag.prev = ag.states; }
  const recs = [], contactLog = []; let h = 2166136261, hA = 2166136261, hB = 2166136261, cpuJ = 0, cpuC = 0, nan = false; const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  const nm = (i) => i < 0 ? (i === -1 ? "turf" : "obstacle") : (i < nb ? "A." : "B.") + world.bodies[i].name;
  for (let n = 1; n <= steps; n++) {
    const t0 = now(), U = {};
    for (const ag of agents) { const o = ag.obs; let plan = null;
      if (ag.track) { const f = ag.track.f0 + Math.min(ag.track.f1 - ag.track.f0, n * dt * 60); ag.ctrl.P = { ...ag.P, N: { ...ag.P.N, T: slideTargets(ag.spec, f) } }; }
      else plan = ag.seq ? ag.seq.update(o) : ag.stepper.update(o);
      ag.ctrl.plan = plan; ag.plan = plan; const u = ag.ctrl.update(o); U[ag.name] = u; ag.caps = [];
      for (let k = 0; k < nj; k++) { const j = ag.spec.joints[k], m = u.motor[k], vel = u.vel ? u.vel[k] : (j.type === "hinge" ? 0 : [0, 0, 0]), kk = ag.k0 + k;
        if (j.type === "hinge") { w.setJointTarget(kk, u.final[k], vel); w.updateMotor(kk, { kp: m.kp, kd: m.kd, lo: m.lo, hi: m.hi }); ag.caps.push({ lo: m.lo, hi: m.hi }); }
        else { w.setJointTarget(kk, u.final[k], vel); const b = budgetLimits(m, w.sixdofRot(kk), u.final[k]); w.updateMotor(kk, { kp: m.kp, kd: m.kd, lo: b.lo, hi: b.hi }); ag.caps.push(b); } } }
    let ext = null; if (pu && n > pu.n0 && n <= pu.n1) { const Js = V.sc(pu.J, 1 / (pu.n1 - pu.n0)), at = A.prev[0].com.slice(); w.applyImpulse(0, Js, at); ext = { J: Js, at }; }
    const t1 = now(); w.step(dt, opts.coll || T.coll); const t2 = now(); cpuC += t1 - t0; cpuJ += t2 - t1;   // opts.coll: EXPERIMENTS only (collision sub-steps)
    for (const ag of agents) { ag.prev = ag.states; ag.states = ag.read(w); const cts = w.contacts.map(c => ag.view(c));
      ag.obs = ag.sensor.update(n, dt, ag.states, cts, { L: w.jointLambdaPosition(ag.k0 + ag.aL), R: w.jointLambdaPosition(ag.k0 + ag.aR) }, ag === A ? ext : null);
      for (const s of ag.states) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; const q = [...s.pos, ...s.rot, ...s.v, ...s.w]; h = hashNums(q, h); if (ag === A) hA = hashNums(q, hA); else hB = hashNums(q, hB); } }
    // ── the CHARACTER ↔ CHARACTER contacts of this step (Jolt's manifolds, pre-solve depth) ──
    const inter = w.contacts.filter(c => c.a >= 0 && c.b >= 0 && (c.a < nb) !== (c.b < nb)).map(c => { const a = c.a < nb ? c.a : c.b, b = c.a < nb ? c.b : c.a, sgn = c.a < nb ? 1 : -1;
      return { a, b, an: nm(a), bn: nm(b), depth: c.depth, normal: V.sc(c.normal, sgn), pts: c.pts }; });   // normal from A's body toward B's
    // every manifold (Jolt acts on speculative contacts up to 2 cm apart: the solver can start limiting the approach BEFORE geometric touch)
    for (const c of inter) contactLog.push({ n, t: n * dt, a: c.an, b: c.bn, depthMm: +(c.depth * 1000).toFixed(2), touch: c.depth > -0.0005 });
    const per = {}; for (const ag of agents) { const o = ag.obs, u = U[ag.name], R = ag.stepper ? (ag.stepper.R || ag.stepper.done) : null, req = ag.seq ? ag.seq.cur : null;
      // pelvis external-force residual (the hidden-support detector): only on steps with NO manifold at all on the pelvis (turf, own body or the
      // other character — a speculative manifold can carry force before geometric touch)
      let rootRes = null; const pelvisTouch = w.contacts.some(k => k.a === ag.i0 || k.b === ag.i0);
      if (!pelvisTouch) { const mp = ag.spec.bodies[0].mass, a = V.sc(V.sub(ag.states[0].v, ag.prev[0].v), 1 / dt); let F = V.sub(V.sc(a, mp), [0, -g * mp, 0]); for (const k of ag.pelvisJoints) F = V.add(F, V.sc(w.jointLambdaPosition(ag.k0 + k), 1 / dt));
        if (ag === A && ext) F = V.sub(F, V.sc(ext.J, 1 / dt)); rootRes = Math.hypot(...F); }
      let groundPen = 0; for (let i = 0; i < nb; i++) for (const s of ag.spec.bodies[i].shapes) groundPen = Math.max(groundPen, -shapeLowestY(s, ag.states[i].pos, ag.states[i].rot));
      let anchorErr = 0; ag.spec.joints.forEach((j) => { const Pb = ag.states[j.parentIndex], pb = ag.spec.bodies[j.parentIndex]; anchorErr = Math.max(anchorErr, V.dist(V.add(Pb.pos, Q.rot(Pb.rot, V.sub(j.at, pb.origin))), ag.states[j.childIndex].pos)); });
      let sat = 0; ag.spec.joints.forEach((j, k) => { const lm = w.motorLambda(ag.k0 + k), cap = ag.caps[k]; if (j.type === "hinge") { const tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo; if (lim > 0 && Math.abs(tq) >= 0.98 * lim) sat++; }
        else lm.forEach((x, i) => { const tq = x / dt, lim = tq >= 0 ? cap.hi[i] : -cap.lo[i]; if (lim > 0 && Math.abs(tq) >= 0.98 * lim) sat++; }); });
      per[ag.name] = { cls: u.cls.state, com: o.com, vcom: o.vcom, xi: o.xi, xiMargin: o.xiMargin, trunk: o.trunkTiltDeg, nonFootGround: o.nonFootGround,
        feet: { L: { state: o.feet.L.state, load: o.feet.L.load, touching: o.feet.L.touching }, R: { state: o.feet.R.state, load: o.feet.R.load, touching: o.feet.R.touching } },
        stage: ag.track ? "SLIDE" : ag.stepper ? ag.stepper.stage : (req ? req.stage : "IDLE"), stepFoot: R ? R.sw : req ? req.foot : null, swingTgt: ag.plan && ag.plan.swing ? Object.values(ag.plan.swing)[0] || null : null,
        rootRes, groundPen, anchorErr, satAxes: sat }; }
    const rec = { n, t: n * dt, A: per.A, B: per.B, inter: inter.map(c => ({ a: c.an, b: c.bn, depth: c.depth, normal: c.normal })), push: ext };
    if (opts.keepStates) { rec.states = [...A.states, ...B.states].map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w })); rec.cts = w.contacts.map(c => ({ ...c })); }
    recs.push(rec);
  }
  const audit = Object.assign({}, w.audit), support = !!w.support; w.destroy();
  return summarizeD(spec, world, key, TST, T, recs, contactLog, { initInfo, hash: (h >>> 0).toString(16), hashA: (hA >>> 0).toString(16), hashB: (hB >>> 0).toString(16), nan, audit, support, cpuJ, cpuC, steps, agents, pu });
}

const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
function summarizeD(spec, world, key, TST, T, recs, contactLog, x) {
  const dt = 1 / T.hz, last = recs[recs.length - 1];
  // FIRST CONTACT between the characters (touching: pre-solve depth > −0.5 mm) and the per-step momentum change of the two bodies involved
  const first = contactLog[0] || null, touch1 = contactLog.find(c => c.touch) || null; let invariant = null;
  // THE INVARIANT, around the first geometric TOUCH of the first touching pair: per step the pair's gap (−depth of its manifold; null = no
  // manifold), the relative normal velocity v_n of the two bodies (+ = closing; normal from A's body toward B's) and each body's Δv along the
  // normal on that step. The contact must arrest the closing motion ON the step it happens (or one step earlier through a speculative manifold)
  if (touch1 && recs[0].states && touch1.n > 5) { const bi = (full) => world.bodies.findIndex((b, i) => ((i < spec.bodies.length ? "A." : "B.") + b.name) === full), ia = bi(touch1.a), ib = bi(touch1.b);
    const iT = recs.findIndex(r => r.n === touch1.n), cT = recs[iT].inter.find(c => c.a === touch1.a && c.b === touch1.b), nrm = cT.normal;
    const v = (k, i) => recs[k].states[i].v, series = [];
    for (let k = iT - 5; k <= Math.min(recs.length - 1, iT + 4); k++) { const c = recs[k].inter.find(q => q.a === touch1.a && q.b === touch1.b);
      series.push({ step: recs[k].n, gapMm: c ? r2(-c.depth * 1000, 2) : null, vn: r2(V.dot(V.sub(v(k, ia), v(k, ib)), nrm), 3), dvA: r2(V.dot(V.sub(v(k, ia), v(k - 1, ia)), nrm), 3), dvB: r2(V.dot(V.sub(v(k, ib), v(k - 1, ib)), nrm), 3) }); }
    const pre = series[0].vn, arrest = series.find(q => pre > 0.05 && q.vn < 0.5 * pre) || null;
    invariant = { pair: `${touch1.a} ↔ ${touch1.b}`, touchStep: touch1.n, t: r2(touch1.t, 4), normal: nrm.map(x => r2(x, 3)), closingBefore: pre, arrestStep: arrest ? arrest.step : null,
      arrestVsTouch: arrest ? arrest.step - touch1.n : null, series }; }
  const maxDepth = contactLog.reduce((m, c) => Math.max(m, c.depthMm), -20), pairs = {}; for (const c of contactLog) { const k = `${c.a} ↔ ${c.b}`; (pairs[k] = pairs[k] || { manifoldSteps: 0, touchSteps: 0, maxMm: -20, first: r2(c.t, 4) }); pairs[k].manifoldSteps++; if (c.touch) pairs[k].touchSteps++; pairs[k].maxMm = Math.max(pairs[k].maxMm, c.depthMm); }
  const who = (nmX, ag) => { const r = recs.map(q => q[nmX]), fell = r.some(q => q.nonFootGround) || ["FALLING", "GROUNDED"].includes(r[r.length - 1].cls), tFall = recs.find(q => q[nmX].cls === "FALLING");
    const st = ag.stepper, R = st ? (st.done || st.R) : null, seq = ag.seq, req = seq ? (seq.reports[0] || seq.cur) : null;
    // a TRACKING character (the slider) is on the turf by design: report the slide instead of a "fall"
    const slide = ag.track ? (() => { const sp = r.map(q => Math.hypot(q.vcom[0], q.vcom[2])), stop = r.findIndex((q, i) => i > 10 && sp[i] < 0.2);
      return { startSpeed: r2(sp[0], 2), travelM: r2(Math.hypot(r[r.length - 1].com[0] - r[0].com[0], r[r.length - 1].com[2] - r[0].com[2]), 2), stopT: stop >= 0 ? r2(recs[stop].t, 2) : null }; })() : null;
    return { fell: ag.track ? null : fell, slide, tFalling: tFall ? r2(tFall.t, 3) : null, finalCls: r[r.length - 1].cls, step: R ? { foot: R.sw, status: R.status || R.stage, fail: R.fail || null, liftoff: !!R.liftoff, touchdown: !!R.td } : null,
      refused: st ? st.refused || null : null, request: req ? { foot: req.foot, status: req.status || req.stage, why: req.why || null } : null,
      maxRootResN: r2(Math.max(0, ...r.map(q => q.rootRes ?? 0)), 2), maxTurfPenMm: r2(Math.max(...r.map(q => q.groundPen)) * 1000, 1), maxJointSepMm: r2(Math.max(...r.map(q => q.anchorErr)) * 1000, 2),
      trunkMaxDeg: r2(Math.max(...r.map(q => q.trunk)), 1), events: st ? st.log : seq ? seq.log : [] }; };
  return { test: key, group: TST.group, title: TST.title, hash: x.hash, hashA: x.hashA, hashB: x.hashB, nan: x.nan, audit: x.audit, supportFixture: x.support, B: TST.B,
    init: x.initInfo, contact: { any: !!first, firstT: first ? r2(first.t, 4) : null, firstPair: first ? `${first.a} ↔ ${first.b}` : null, firstTouchT: touch1 ? r2(touch1.t, 4) : null, firstTouchPair: touch1 ? `${touch1.a} ↔ ${touch1.b}` : null,
      maxDepthMm: r2(maxDepth, 2), pairs, invariant },
    A: who("A", x.agents[0]), Bres: who("B", x.agents[1]),
    worst: { contact: first ? first.n - 1 : 0, touch: touch1 ? touch1.n - 1 : 0, arrest: invariant && invariant.arrestStep ? invariant.arrestStep - 1 : 0,
      fallA: Math.max(0, recs.findIndex(q => q.A.cls === "FALLING")), fallB: Math.max(0, recs.findIndex(q => q.B.cls === "FALLING")), push: x.pu ? x.pu.n0 : 0 },
    cpu: { msPerFrame: r2((x.cpuJ + x.cpuC) / x.steps * 4, 4), jolt: r2(x.cpuJ / x.steps * 4, 4), controllers: r2(x.cpuC / x.steps * 4, 4) }, recs };
}
