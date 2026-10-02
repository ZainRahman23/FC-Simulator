// ═══ physchar/tools/stepper/session.mjs — a RESUMABLE simulation session with exact snapshot / restore (OFFLINE TOOLING) ══════════════════
// The same tick as pc_gateg1a.runG1a (copied, not re-derived: controller → motors → physics step → sensor → actuator realisation), for the
// G2 walking tests, but held in an object so the run can be SNAPSHOT and RESTORED:
//   physics — Jolt's own PhysicsSystem SaveState / RestoreState (bodies, constraints, contact cache: EStateRecorderState_All);
//   controller, sensor and loop state — one deep clone of { loco, sensor, obs, states, loop vars } with a shared identity map (internal
//   cross-references preserved; the immutable spec, poses, Jolt module and world wrapper are shared, never cloned).
// Everything the controller writes into Jolt (motor targets, gains, torque limits) is re-set every tick before stepping, so the snapshot is
// complete. It is ACCEPTED only through its validation: a straight session run must hash-equal runG1a, and branches restored from a snapshot
// must equal from-scratch replays bit for bit (tools/stepper/session_check.mjs).
import { V, Q, hashNums } from "../../pc_math.js";
import { JoltCharacterWorld } from "../../pc_jolt.js";
import { disabledPairs, frictionPolicy, TIMESTEP_CONFIGS } from "../../pc_gatea.js";
import { GATE_C1_TSC, GATE_C1_WORLD } from "../../pc_gatec1.js";
import { Sensor } from "../../pc_sense.js";
import { LocoController } from "../../pc_loco.js";
import { TESTS_G2 } from "../../pc_gateg2.js";

// ── deep clone with a shared identity map; `shared` objects (and anything holding a Jolt pointer) are kept by reference ──
export function deepClone(root, shared) { const seen = new Map(), isJolt = (o) => o && typeof o === "object" && ("ptr" in o) && typeof o.ptr === "number";
  const cl = (x) => { if (x === null || typeof x !== "object") return x; if (shared.has(x) || isJolt(x)) return x; if (seen.has(x)) return seen.get(x);
    if (ArrayBuffer.isView(x)) { const y = x.slice(); seen.set(x, y); return y; }
    if (Array.isArray(x)) { const y = new Array(x.length); seen.set(x, y); for (let i = 0; i < x.length; i++) y[i] = cl(x[i]); for (const k of Object.keys(x)) if (!/^\d+$/.test(k)) y[k] = cl(x[k]); return y; }
    if (x instanceof Map) { const y = new Map(); seen.set(x, y); for (const [k, v] of x) y.set(cl(k), cl(v)); return y; }
    if (x instanceof Set) { const y = new Set(); seen.set(x, y); for (const v of x) y.add(cl(v)); return y; }
    const y = Object.create(Object.getPrototypeOf(x)); seen.set(x, y);
    for (const k of Reflect.ownKeys(x)) { const d = Object.getOwnPropertyDescriptor(x, k); if ("value" in d) d.value = cl(d.value); Object.defineProperty(y, k, d); }
    return y; };
  return cl(root); }
// own function-valued properties in a graph (closures that may capture the ORIGINAL objects — rebound or reported)
export function findClosures(root, shared) { const out = [], seen = new Set(), walk = (x, p) => { if (x === null || typeof x !== "object" || seen.has(x) || shared.has(x)) return; seen.add(x);
    for (const k of Reflect.ownKeys(x)) { const d = Object.getOwnPropertyDescriptor(x, k); if (d.get || d.set) out.push(p + "." + String(k) + " (accessor)"); else if (typeof d.value === "function") out.push(p + "." + String(k)); else if (d.value && typeof d.value === "object") walk(d.value, p + "." + String(k)); } };
  walk(root, "root"); return out; }

export class SimSession {
  // key: a TESTS_G2 walking test; opts as runG2a: { poses, rhythmOver, humanOver, pushChar, seconds }
  constructor(J, spec, key, opts) { opts = opts || {}; let test = TESTS_G2[key]; const ro = opts.rhythmOver;
    if (ro) { const rh = test.loco.rhythm; test = { ...test, loco: { ...test.loco, rhythm: { ...rh, ...ro, ...(ro.walk ? { walk: { ...rh.walk, ...ro.walk } } : {}) } } }; }
    const ho = opts.humanOver; if (ho) test = { ...test, loco: { ...test.loco, human: { ...test.loco.human, over: { ...(test.loco.human.over || {}), ...ho } } } };
    if (opts.pushChar) test = { ...test, pushChar: opts.pushChar };
    const TST = test, T = TIMESTEP_CONFIGS[GATE_C1_TSC], hz = T.hz, dt = 1 / hz, P = opts.poses, nb = spec.bodies.length, nj = spec.joints.length;
    if (TST.slab || TST.obstacle || TST.push || TST.pushOn) throw new Error("SimSession: obstacles / timed pushes are not replicated (walking tests only)");
    const worldCfg = Object.assign({}, GATE_C1_WORLD, { plateFrom: 0, plateLate: true }, TST.world || {});
    const w = new JoltCharacterWorld(J, spec, worldCfg, frictionPolicy(spec)); for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
    const locoOpts = Object.assign({}, TST.loco); const loco = new LocoController(spec, P, locoOpts, hz), ctrl = loco.ctrl;
    ctrl.gain.forEach((gn, k) => w.setMotor(k, { kp: gn.kp, kd: gn.kdStance, tau: 1 }));
    P.N.S.forEach((s, i) => w.setPose(i, [s.pos[0], s.pos[1] + (TST.lift || 0), s.pos[2]], s.rot));
    const fI = (s) => spec.bodies.findIndex(b => b.name === "foot_" + s), ji = (n) => spec.joints.findIndex(j => j.name === n);
    const sensor = new Sensor(spec, { supportTouching: true, muSettle: 0.15 });
    const read = () => { const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i)); return st; };
    const states = read(), obs = sensor.update(0, dt, states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null);
    Object.assign(this, { J, spec, TST, w, hz, dt, nj, nb, aL: ji("ankle_L"), aR: ji("ankle_R"), read, maxSteps: Math.round((opts.seconds || TST.seconds) * hz), shared: new Set([spec, P, J, w, TST, opts]) });
    this.st = { loco, sensor, states, obs, n: 0, h: 2166136261, puOn: null, nan: false }; }   // (the controller's config objects are CLONED with it: the planner may write into them)
  get loco() { return this.st.loco; } get obs() { return this.st.obs; } get t() { return this.st.n * this.dt; }
  // ONE TICK — the body of runG1a's loop (bookkeeping not needed for control omitted; the state hash kept)
  tick() { const S = this.st, w = this.w, spec = this.spec, dt = this.dt, nj = this.nj, TST = this.TST; S.n++; const n = S.n, truth = S.obs, loco = S.loco;
    const u = loco.control(truth, { dt, n, qCur: (k) => spec.joints[k].type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k) });
    for (let k = 0; k < nj; k++) { w.setJointTarget(k, u.final[k], u.vel[k]); w.updateMotor(k, { kp: u.motor[k].kp, kd: u.motor[k].kd, lo: u.limits[k].lo, hi: u.limits[k].hi }); }
    if (TST.pushChar && !S.puOn) { const R = loco.planner.exec.R, q = TST.pushChar; if (R && R.kind === "rhythmic" && R.stepIndex === q.step && (R.u || 0) >= (q.u || 0)) {
      const h0 = loco.planner.rhythm && loco.planner.rhythm.wk ? loco.planner.rhythm.wk.h0 : 0, hd = [Math.sin(h0), 0, Math.cos(h0)], lt = [hd[2], 0, -hd[0]], sd = R.sw === "R" ? 1 : -1, Jv = q.J || [0, 0];
      S.puOn = { n0: n - 1, n1: n - 1 + Math.round(0.05 * this.hz), J: V.add(V.sc(hd, Jv[0]), V.sc(lt, Jv[1] * sd)), Lz: q.Lz || 0, t: n * dt, sw: R.sw, side: "char" }; } }
    const P_ = S.puOn; let ext = null; if (P_ && n > P_.n0 && n <= P_.n1) { ext = { J: V.sc(P_.J, 1 / (P_.n1 - P_.n0)), at: S.states[0].com.slice() }; if (P_.Lz) ext.couple = { Jc: P_.Lz / (2 * 0.15) / (P_.n1 - P_.n0), r: 0.15 }; }
    const cts = [], lamA = { L: [0, 0, 0], R: [0, 0, 0] }, lamM = spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]);
    { if (ext) { w.applyImpulse(0, ext.J, ext.at);
        if (ext.couple) { const R0 = S.states[0].rot, fx = Q.rot(R0, [0, 0, 1]), lx = Q.rot(R0, [1, 0, 0]), f = V.norm([fx[0], 0, fx[2]]), l = V.norm([lx[0], 0, lx[2]]), c = ext.couple, jv = V.sc(f, c.Jc);
          const sgn = (l[2] * f[0] - l[0] * f[2]) >= 0 ? 1 : -1; w.applyImpulse(0, V.sc(jv, sgn), V.add(ext.at, V.sc(l, c.r))); w.applyImpulse(0, V.sc(jv, -sgn), V.sub(ext.at, V.sc(l, c.r))); } }
      w.step(dt, 1); cts.push(...w.contacts);
      lamA.L = V.add(lamA.L, w.jointLambdaPosition(this.aL)); lamA.R = V.add(lamA.R, w.jointLambdaPosition(this.aR));
      for (let k = 0; k < nj; k++) { const l = w.motorLambda(k); lamM[k] = spec.joints[k].type === "hinge" ? lamM[k] + l : V.add(lamM[k], l); } }
    S.states = this.read(); S.obs = S.sensor.update(n, dt, S.states, cts, lamA, ext); loco.arb.realize(lamM, dt);
    for (const s of S.states) { for (const x of s.pos) if (!Number.isFinite(x)) S.nan = true; S.h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], S.h); }
    // (the controller's observation buffer is never trimmed in pc_loco — its trim sits inside a comment — so it grows by one observation per
    //  tick; the controller only ever reads the newest max(delayFb, delayPlan)·hz + 1 entries (view()). The session keeps a margin above that,
    //  so every read is identical and a snapshot no longer clones the whole run's history.)
    const keep = Math.round(Math.max(loco.dFb, loco.dPl) * this.hz) + 8; if (loco.buf.length > 2 * keep) loco.buf.splice(0, loco.buf.length - keep);
    return u; }
  get hash() { return (this.st.h >>> 0).toString(16); }
  snapshot() { const J = this.J, rec = new J.StateRecorderImpl(); this.w.ps.SaveState(rec, J.EStateRecorderState_All); return { rec, st: deepClone(this.st, this.shared) }; }
  // (closures in the graph: exec.refSwing captures the controller that created it → rebound to the clone; walkK.dcm (old-walker in-swing law,
  //  unused on the unified path) and the balance controller's bi / ji are pure functions of constants; loco.stepper's compatibility getters
  //  are recreated by rebinding)
  restore(snap) { snap.rec.Rewind(); this.w.ps.RestoreState(snap.rec); this.st = deepClone(snap.st, this.shared); this.w.contacts = []; const L = this.st.loco;
    if (L.human) L.planner.exec.refSwing = (R, t, o, noVel) => L._refSwingAt(R, t, o, noVel); }
  free(snap) { this.J.destroy(snap.rec); }
  destroy() { this.w.destroy(); }
}
