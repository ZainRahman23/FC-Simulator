// ═══ physchar2/gates/v2_g1_tests.js — V2-G1 component tests: passive joint rig, couplings, snapshot / restore, performance breakdown ════
import { V, Q, rad } from "../core/v2_math.js";
import { V2JoltWorld } from "../core/v2_jolt.js";
import { posedBodies, POSES } from "../spec/v2_pose.js";
import { decompose, pyr, passiveTorque } from "../spec/v2_joints.js";
import { PassiveLayer } from "../sim/v2_passive.js";
import { kneeModelEnv, kneeEnvelopeV2K, kneeAxialTorque } from "../spec/v2_knee.js";
import { G1Sim, G1_WORLD } from "./v2_g1.js";

const D = 180 / Math.PI, KEYS = ["x", "y", "z"];
// ── 1. PASSIVE JOINT RIG ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Zero gravity, 2 m up, the tested joint's PARENT held kinematic (fixed), everything else free. The tested joint is set in its own
// constraint space: the tested axis at θ0, the other axes at the ROM centre (0); all other joints neutral. Released from rest (or with
// an initial relative angular velocity for the damping test). Each step the torque Jolt actually applied on the tested axis (drive
// impulse / dt + explicit remainder) is compared with the SPECIFICATION law computed independently by v2_joints.passiveTorque at the
// end-of-step angle, minus the specified viscous term (the drive is implicit: end-of-step θ and ω).
// [joint, anatomical key, direction of the excursion: +1 = the positive anatomical motion (flexion / abduction / internal rotation /
// dorsiflexion / inversion / pronation / right bend / right rotation), −1 = the negative one]
export const RIG_TESTS = [
  ["knee_R", "flex", 1], ["knee_R", "flex", -1], ["knee_L", "flex", 1], ["elbow_R", "flex", 1], ["elbow_R", "flex", -1], ["hip_R", "flex", 1], ["hip_R", "flex", -1], ["hip_R", "abd", 1], ["hip_R", "abd", -1], ["hip_R", "rot", -1],
  ["ankle_R", "df", 1], ["ankle_R", "df", -1], ["ankle_R", "inv", 1], ["ankle_L", "inv", 1], ["ankle_R", "fabd", 1], ["shoulder_R", "abd", 1], ["shoulder_L", "abd", 1], ["shoulder_R", "flex", -1], ["shoulder_R", "rot", -1],
  ["lumbar", "flex", 1], ["lumbar", "flex", -1], ["lumbar", "lat", 1], ["thoracic", "rot", 1], ["neck", "flex", 1], ["neck", "flex", -1], ["neck", "rot", 1], ["elbow_R", "pron", 1], ["knee_R", "rot", -1],
].map(([joint, key, dir]) => ({ joint, key, dir }));
// rig base pose: neutral with the arms 40° abducted and the legs 8° abducted (limbs clear of the trunk and of each other)
const RIG_BASE = { ...POSES.neutral.angles, shoulder_L: { abd: 40 }, shoulder_R: { abd: 40 }, hip_L: { abd: 8 }, hip_R: { abd: 8 } };

function rigWorld(J, spec, cfg) { return new V2JoltWorld(J, spec, spec.contact, { velSteps: cfg.velSteps, posSteps: cfg.posSteps, gravity: 0, recordContacts: true }); }
// pose with joint j's constraint parameters set to th (rad, [tw, sy, sz]); descendants follow rigidly
function rigPose(spec, j, th) {
  let S = posedBodies(spec, RIG_BASE); S = S.map(s => ({ pos: V.add(s.pos, [0, 2.0, 0]), rot: s.rot }));
  const R1 = S[j.parentIndex].rot, R2old = S[j.childIndex].rot, qcs = pyr(th[0], th[1], th[2]), R2 = Q.norm(Q.mul(Q.mul(R1, j.F1), Q.mul(qcs, Q.conj(j.F2))));
  const dq = Q.norm(Q.mul(R2, Q.conj(R2old))), at = V.add(S[j.parentIndex].pos, Q.rot(R1, V.sub(j.at, spec.bodies[j.parentIndex].origin)));
  const desc = new Set([j.childIndex]); let grew = true; while (grew) { grew = false; for (const jj of spec.joints) if (desc.has(jj.parentIndex) && !desc.has(jj.childIndex)) { desc.add(jj.childIndex); grew = true; } }
  return { S: S.map((s, i) => desc.has(i) ? { pos: V.add(at, Q.rot(dq, V.sub(s.pos, at))), rot: Q.norm(Q.mul(dq, s.rot)) } : s), desc };
}
export function passiveRig(J, spec, test, opts = {}) {
  const cfg = Object.assign({}, G1_WORLD, opts.cfg || {}), dt = 1 / cfg.hz, j = spec.joints.find(x => x.name === test.joint), i = KEYS.findIndex(k => j.def.axes[k] && j.def.axes[k].key === test.key);
  let pp = j.passive[i]; const frac = opts.frac ?? 0.6; if (test.dir) test = { ...test, end: (test.dir > 0) === (j.def.axes[KEYS[i]].s > 0) ? "hi" : "lo" };
  // CORRECTED KNEE (v2k; knee_correction/KNEE_CORRECTION_PREREG.md KV9b(i)): the knee axial rig is checked against the v2k SPECIFICATION law
  // (spec/v2_knee.js kneeAxialTorque — independent of the passive layer) at the rig flexion (constraint swing 0 → anatomical 70°) and, each
  // step, at the actual flexion; capacities = the spec's opposing capacities (tauAtHard / 0.25). Off: the spec law exactly as before.
  const sg = j.def.axes[KEYS[i]].s, v2kOn = (opts.kneeModel !== undefined ? opts.kneeModel : kneeModelEnv()) === "v2k" && /^knee_/.test(j.name), v2k = v2kOn && test.key === "rot";
  // SUPERSEDING criterion G1-5′ (close-decisions stage, QUALIFICATION_V2_PREREG.md; env V2_KNEE_CRIT=v2 or opts.kneeCrit "v2"): under v2k the knee
  // FLEXION row also carries the coupled flexion reaction of the axial term (approved decision 4). Its expected torque is therefore −c·ω + the
  // specification coupling cos(tw)·(−∂U_spec/∂φ) from the independent spec law (kneeAxialTorque), not −c·ω alone (the v1 premise "no elastic torque
  // at the ROM centre" is false under v2k: the rig's centre pose, axial 0 at 70° flexion, lies 14° outside the zero-torque zone).
  const kneeCrit = opts.kneeCrit !== undefined ? opts.kneeCrit : (typeof process !== "undefined" && process.env ? process.env.V2_KNEE_CRIT : null), v2kFlexCouple = v2kOn && test.key === "flex" && kneeCrit === "v2";
  const sxK = /^knee_/.test(j.name) ? j.def.axes.x.s : 1, capKI = /^knee_/.test(j.name) ? (sxK > 0 ? j.passive[0].tauAtHard[1] : j.passive[0].tauAtHard[0]) / 0.25 : 0, capKE = /^knee_/.test(j.name) ? (sxK > 0 ? j.passive[0].tauAtHard[0] : j.passive[0].tauAtHard[1]) / 0.25 : 0;
  let capVsInt = 0, capVsExt = 0;
  if (v2k) { const capLo = pp.tauAtHard[0] / 0.25, capHi = pp.tauAtHard[1] / 0.25, e = kneeEnvelopeV2K(70), cs = (lohi) => (sg > 0 ? lohi.map(v => v / D) : [-lohi[1] / D, -lohi[0] / D]);
    capVsInt = sg > 0 ? capHi : capLo; capVsExt = sg > 0 ? capLo : capHi; pp = { ...pp, soft: cs(e.soft), hard: cs(e.hard), tauAtHard: [0.55 * capLo, 0.55 * capHi] }; }
  const specTau = (q2, thE) => { if (v2kFlexCouple) { const dd = decompose(Q.norm(Q.mul(j.Cm, q2))), fl = dd.sy * j.def.axes.y.s * D, rot = sxK * dd.tw * D, h = 1e-4, Uf = (f) => kneeAxialTorque(f, rot, capKI, capKE).U;
      return passiveTorque(pp, thE) + Math.cos(dd.tw) * -((Uf(fl + h) - Uf(fl - h)) / (2 * h)) * D; }
    if (!v2k) return passiveTorque(pp, thE); const fl = decompose(Q.norm(Q.mul(j.Cm, q2))).sy * j.def.axes.y.s * D; return sg * kneeAxialTorque(fl, sg * thE * D, capVsInt, capVsExt).tau; };
  const th0 = test.end === "hi" ? pp.soft[1] + frac * (pp.hard[1] - pp.soft[1]) : test.end === "lo" ? pp.soft[0] + frac * (pp.hard[0] - pp.soft[0]) : 0;
  let thLo = Infinity, thHi = -Infinity;
  const th = [0, 0, 0]; th[i] = th0; const { S, desc } = rigPose(spec, j, th), w = rigWorld(J, spec, cfg);
  S.forEach((s, b) => w.setPose(b, s.pos, s.rot));
  if (test.w0) { const ax = Q.rot(Q.mul(S[j.childIndex].rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), at = V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, spec.bodies[j.parentIndex].origin)));
    const wv = V.sc(ax, test.w0); for (const b of desc) { const c = V.add(S[b].pos, Q.rot(S[b].rot, spec.bodies[b].comLocal)); w.setVel(b, V.cross(wv, V.sub(c, at)), wv); } }
  w.setKinematic(j.parentIndex);
  const P = new PassiveLayer(spec, w, { couplings: false, ...(opts.kneeModel !== undefined ? { kneeModel: opts.kneeModel } : {}) }), rd = () => spec.bodies.map((b, n) => w.read(n)); if (opts.passiveHook) opts.passiveHook(P, j);   // passiveHook: discrimination tests only (default none)
  const k = j.index, N = Math.round((opts.seconds || 1.5) * cfg.hz); let st = rd(), rows = [], maxRelErr = 0, maxAbsErr = 0, Erise = 0, firstTau = null, contacts = 0;
  const energy = (st, U) => st.reduce((a, s, n) => { if (n === j.parentIndex) return a; const b = spec.bodies[n], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia;
    return a + 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (wl[0] * (I[0][0] * wl[0] + I[0][1] * wl[1] + I[0][2] * wl[2]) + wl[1] * (I[1][0] * wl[0] + I[1][1] * wl[1] + I[1][2] * wl[2]) + wl[2] * (I[2][0] * wl[0] + I[2][1] * wl[1] + I[2][2] * wl[2])); }, 0) + U;
  let up = P.update(st, dt), Eprev = energy(st, up.U), E0 = Eprev, Dsum = 0, returned = false, thMinIn = Infinity, thMaxIn = -Infinity;
  for (let n = 0; n < N; n++) {
    const Texp = up.joints[k].Texp[i]; w.step(dt, cfg.coll); contacts += w.contacts.filter(c => c.a >= 0 && c.b >= 0).length; st = rd();
    const lam = w.lambdaMotor(k)[i], q = Q.norm(Q.mul(Q.conj(j.F1), Q.mul(Q.conj(st[j.parentIndex].rot), Q.mul(st[j.childIndex].rot, j.F2)))), dd = decompose(q), thE = [dd.tw, dd.sy, dd.sz][i];
    const ax = Q.rot(Q.mul(st[j.childIndex].rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), wE = V.dot(V.sub(st[j.childIndex].w, st[j.parentIndex].w), ax);
    const tauApplied = lam / dt + Texp, tauSpec = specTau(q, thE), tauExpect = tauSpec - j.damping * wE;
    const err = Math.abs(tauApplied - tauExpect); maxAbsErr = Math.max(maxAbsErr, err); if (Math.abs(tauExpect) > 0.5) maxRelErr = Math.max(maxRelErr, err / Math.abs(tauExpect));
    if (n === 0) firstTau = { tauApplied, tauSpec, tauExpect, th: thE * D };
    if (thE >= pp.soft[0] && thE <= pp.soft[1]) returned = true; thLo = Math.min(thLo, thE); thHi = Math.max(thHi, thE);
    Dsum += P.dampingLoss(st, dt); up = P.update(st, dt); const E = energy(st, up.U); Erise = Math.max(Erise, E - Eprev); Eprev = E;
    if (n % 6 === 0) rows.push({ t: (n + 1) * dt, th: thE * D, tauApplied, tauSpec, tauExpect, wE, E });
  }
  w.destroy();
  const restoring = test.approach ? null : test.end === "hi" ? firstTau.tauApplied < 0 : test.end === "lo" ? firstTau.tauApplied > 0 : null;
  return { ...test, thMinDeg: thLo * D, thMaxDeg: thHi * D, overshootDeg: test.end === "hi" ? (thHi - pp.hard[1]) * D : test.end === "lo" ? (pp.hard[0] - thLo) * D : null, th0Deg: th0 * D, softDeg: pp.soft.map(x => x * D), hardDeg: pp.hard.map(x => x * D), tauAtHard: pp.tauAtHard, damping: j.damping, firstTau, restoring, returnedToSoft: returned,
    maxAbsErrNm: maxAbsErr, maxRelErr, maxEnergyRiseJ: Erise, E0, Eend: Eprev, dampingJ: Dsum, selfContacts: contacts, rows };
}
// damping-only test: joint at its ROM centre (inside every soft range), child spun about the tested axis at w0 → no elastic torque, the
// applied torque must equal −c·ω and the energy must decay monotonically
export const DAMP_TESTS = [["knee_R", "flex"], ["elbow_R", "flex"], ["hip_R", "flex"], ["shoulder_R", "flex"], ["neck", "rot"], ["ankle_R", "df"]].map(([joint, key]) => ({ joint, key, end: "in", w0: 3 }));

// ── 2. COUPLINGS (spec §13.2 pose-dependent passive limits) ─────────────────────────────────────────────────────────────────────────────
// The coupled soft limit and the biarticular cross torque, read from the passive layer at a held pose (no stepping needed: the layer is a
// function of the pose). Expected: hip-flexion resistance starts at 80° with the knee straight and 120° with the knee at 90° (and the
// hamstring cross torque flexes the knee); ankle DF resistance starts at 20° knee straight / 35° knee 90° (gastrocnemius); knee axial
// range shrinks to 10 % at extension (screw-home); hip ER limit −45° extended → −40° flexed 90°.
export function couplingProbe(J, spec) {
  const w = new V2JoltWorld(J, spec, spec.contact, { gravity: 0 }), P = new PassiveLayer(spec, w, {}), dt = 1 / 240, out = [];
  const at = (angles) => { const S = posedBodies(spec, angles).map(s => ({ ...s, v: [0, 0, 0], w: [0, 0, 0] })); return P.compute(S, dt); };
  const jk = (n) => spec.joints.findIndex(j => j.name === n), ax = (n, key) => KEYS.findIndex(k => spec.joints[jk(n)].def.axes[k] && spec.joints[jk(n)].def.axes[k].key === key);
  // the coupled soft limit, expressed as the anatomical value of that end: base anatomical end + (coupled − base constraint end)/sign —
  // exact, because a coupling shifts one constraint-space end by sign · Δanatomical (no anatomical ↔ constraint conversion of the hull)
  const softAnat = (up, n, key) => { const k = jk(n), i = ax(n, key), j = spec.joints[k], s = up.ev.per[k].T[i].soft, base = [j.limits.soft.lo[i], j.limits.soft.hi[i]], sg = j.def.axes[KEYS[i]].s, rom = j.def.rom[key].active;
    const loA = sg > 0 ? rom[0] + (s[0] - base[0]) * D : rom[0] - (s[1] - base[1]) * D, hiA = sg > 0 ? rom[1] + (s[1] - base[1]) * D : rom[1] - (s[0] - base[0]) * D; return [loA, hiA]; };
  for (const kf of [0, 45, 90]) { const up = at({ knee_R: { flex: kf }, hip_R: { flex: 100 } }), sHip = softAnat(up, "hip_R", "flex"), sDf = softAnat(up, "ankle_R", "df");
    const tHip = up.joints[jk("hip_R")].tau[ax("hip_R", "flex")], tKnee = up.joints[jk("knee_R")].tau[ax("knee_R", "flex")];
    out.push({ case: `knee ${kf}°, hip flexed 100°`, hipFlexSoftHiDeg: sHip[1], ankleDfSoftHiDeg: sDf[1], hipFlexTorqueNm: tHip, kneeFlexCrossTorqueNm: tKnee }); }
  for (const kf of [0, 30, 60]) { const up = at({ knee_R: { flex: kf, rot: 0 } }), s = softAnat(up, "knee_R", "rot"); out.push({ case: `knee ${kf}° (screw-home)`, kneeRotSoftDeg: s }); }
  for (const hf of [0, 90]) { const up = at({ hip_R: { flex: hf } }), s = softAnat(up, "hip_R", "rot"); out.push({ case: `hip flex ${hf}°`, hipRotSoftDeg: s }); }
  w.destroy(); return out;
}

// ── 3. SNAPSHOT / RESTORE (spec 1.6; the V1 session_check method on the passive body) ───────────────────────────────────────────────
// run A: from scratch to the end; run B: same start, Jolt SaveState at tick K, continue to the end, RestoreState, continue again — every
// branch must end with A's per-tick hash (the passive layer is stateless, so the physics state is the whole simulation state).
export function snapshotRestore(J, spec, key, opts = {}) {
  const K = opts.K || 240, a = new G1Sim(J, spec, key, opts); while (a.tick()); const hA = a.h; a.destroy();
  const b = new G1Sim(J, spec, key, opts); while (b.n < K) b.tick(); const h0 = b.h, rec = b.w.saveState(), st0 = b.st, A0 = JSON.stringify(b.A.E.length);
  while (b.tick()); const hB1 = b.h;
  b.w.restoreState(rec); b.h = h0; b.n = K; b.st = b.read(); b.up = b.P.compute(b.st, b.dt); while (b.tick()); const hB2 = b.h;
  b.w.restoreState(rec); b.h = h0; b.n = K; b.st = b.read(); b.up = b.P.compute(b.st, b.dt); while (b.tick()); const hB3 = b.h;
  b.w.freeState(rec); b.destroy();
  const hex = (h) => h.toString(16).padStart(8, "0");
  return { key, K, scratch: hex(hA), continued: hex(hB1), restored1: hex(hB2), restored2: hex(hB3), pass: hA === hB1 && hB1 === hB2 && hB2 === hB3 };
}

// ── 4. PERFORMANCE BREAKDOWN (diagnostic) ──────────────────────────────────────────────────────────────────────────────────────────────
// per 240 Hz tick, one player, single-threaded WASM: (a) 14 free bodies, no joints, airborne (integration only); (b) + 13 joints with
// motors OFF, airborne (constraints); (c) + passive drives (motor rows) airborne; (d) on the turf lying (contacts); plus the JS passive
// layer and the G1 instrumentation, timed separately inside G1Sim.
export function perfBreakdown(J, spec, opts = {}) {
  const cfg = Object.assign({}, G1_WORLD, opts.cfg || {}), dt = 1 / cfg.hz, N = opts.ticks || 2400, t = () => performance.now(), res = {};
  const mk = (gravity) => new V2JoltWorld(J, spec, spec.contact, { velSteps: cfg.velSteps, posSteps: cfg.posSteps, gravity, recordContacts: false });
  const S = posedBodies(spec, POSES.neutral.angles).map(s => ({ pos: V.add(s.pos, [0, 5, 0]), rot: s.rot }));
  // (a) bodies only: build a world, then remove its constraints
  { const w = mk(0); S.forEach((s, i) => w.setPose(i, s.pos, s.rot)); for (const c of w.cons) w.ps.RemoveConstraint(c.c); spec.bodies.forEach((b, i) => w.setVel(i, [0, 0, 0], [0.3, 0.2, 0.1]));
    let t0 = t(); for (let n = 0; n < N; n++) w.step(dt, cfg.coll); res.bodiesOnlyMs = (t() - t0) / N; w.destroy(); }
  { const w = mk(0); S.forEach((s, i) => w.setPose(i, s.pos, s.rot)); spec.bodies.forEach((b, i) => w.setVel(i, [0, 0, 0], [0.3, 0.2, 0.1]));
    let t0 = t(); for (let n = 0; n < N; n++) w.step(dt, cfg.coll); res.jointsMotorsOffMs = (t() - t0) / N; w.destroy(); }
  { const w = mk(0); S.forEach((s, i) => w.setPose(i, s.pos, s.rot)); const P = new PassiveLayer(spec, w, {}); const rd = () => spec.bodies.map((b, i) => w.read(i)); let st = rd(), tp = 0;
    let t0 = t(); for (let n = 0; n < N; n++) { const a = t(); P.update(st, dt); tp += t() - a; w.step(dt, cfg.coll); st = rd(); } res.jointsPassiveMs = (t() - t0 - tp) / N; res.passiveLayerJsMs = tp / N; w.destroy(); }
  // (d) lying on the turf (contacts): run the flat supine scenario to rest, then time 2400 resting ticks with passive drives
  { const s = new G1Sim(J, spec, "flatSupine", { cfg }); while (s.tick()); const w = s.w; let st = s.st, tp = 0, t0 = t(); for (let n = 0; n < N; n++) { const a = t(); s.P.update(st, dt); tp += t() - a; w.step(dt, cfg.coll); st = s.read(); }
    res.lyingOnTurfMs = (t() - t0 - tp) / N; s.destroy(); }
  return res;
}

// ── 5. FREE-BODY NUMERICAL FLOOR (decision C6) ───────────────────────────────────────────────────────────────────────────────────────────
// Each V2 segment's exact mass and full inertia tensor as ONE free rigid body (sphere shape, mass properties overridden, gyroscopic force ON,
// zero damping, gravity off, nothing else in the world) at |ω| = 1 / 3 / 6 rad/s about a generic axis with v = (0.3, 0, −0.2) m/s, 2 s at the
// G1 rate. The drift of a body that nothing acts on is the engine's own floor (float32 state + first-order gyroscopic step).
export function freeBodyFloor(J, spec, opts = {}) {
  const hz = opts.hz || G1_WORLD.hz, dt = 1 / hz, N = Math.round((opts.seconds || 2) * hz), rows = [];
  for (const b of spec.bodies) for (const wmag of [1, 3, 6]) {
    const st = new J.JoltSettings(); st.mMaxWorkerThreads = 1; const opf = new J.ObjectLayerPairFilterTable(1); opf.EnableCollision(0, 0);
    const bpi = new J.BroadPhaseLayerInterfaceTable(1, 1); bpi.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); st.mObjectLayerPairFilter = opf; st.mBroadPhaseLayerInterface = bpi;
    st.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bpi, 1, opf, 1); const jolt = new J.JoltInterface(st); J.destroy(st); const ps = jolt.GetPhysicsSystem(); ps.SetGravity(new J.Vec3(0, 0, 0));
    const bcs = new J.BodyCreationSettings(new J.SphereShape(0.05, null), new J.RVec3(0, 0, 0), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, 0);
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_MassAndInertiaProvided; bcs.mMassPropertiesOverride.mMass = b.mass; const I = J.Mat44.prototype.sIdentity(), T = b.inertia;
    I.SetAxisX(new J.Vec3(T[0][0], T[1][0], T[2][0])); I.SetAxisY(new J.Vec3(T[0][1], T[1][1], T[2][1])); I.SetAxisZ(new J.Vec3(T[0][2], T[1][2], T[2][2])); bcs.mMassPropertiesOverride.mInertia = I;
    bcs.mLinearDamping = 0; bcs.mAngularDamping = 0; bcs.mAllowSleeping = false; bcs.mMaxAngularVelocity = 100; bcs.mApplyGyroscopicForce = true;
    const body = ps.GetBodyInterface().CreateBody(bcs); ps.GetBodyInterface().AddBody(body.GetID(), J.EActivation_Activate); J.destroy(bcs);
    const ax = V.norm([0.6, 0.5, -0.62]); body.SetLinearVelocity(new J.Vec3(0.3, 0, -0.2)); body.SetAngularVelocity(new J.Vec3(ax[0] * wmag, ax[1] * wmag, ax[2] * wmag));
    const read = () => { const w = body.GetAngularVelocity(), v = body.GetLinearVelocity(), r = body.GetRotation(), q = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()], wv = [w.GetX(), w.GetY(), w.GetZ()];
      const wl = Q.rot(Q.conj(q), wv), Il = [T[0][0] * wl[0] + T[0][1] * wl[1] + T[0][2] * wl[2], T[1][0] * wl[0] + T[1][1] * wl[1] + T[1][2] * wl[2], T[2][0] * wl[0] + T[2][1] * wl[1] + T[2][2] * wl[2]];
      return { L: Q.rot(q, Il), P: V.sc([v.GetX(), v.GetY(), v.GetZ()], b.mass), KE: 0.5 * V.dot(wl, Il) }; };
    const s0 = read(); let dL = 0, dP = 0, dK = 0; for (let n = 0; n < N; n++) { jolt.Step(dt, 1); const s = read(); dL = Math.max(dL, V.len(V.sub(s.L, s0.L))); dP = Math.max(dP, V.len(V.sub(s.P, s0.P))); dK = Math.max(dK, Math.abs(s.KE - s0.KE)); }
    rows.push({ body: b.name, w: wmag, L0: V.len(s0.L), dL, dLrel: dL / V.len(s0.L), P0: V.len(s0.P), dP, dPrel: dP / V.len(s0.P), KE0: s0.KE, dKErel: dK / s0.KE }); J.destroy(jolt); }
  return rows;
}
