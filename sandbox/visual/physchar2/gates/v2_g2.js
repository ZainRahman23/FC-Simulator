// ═══ physchar2/gates/v2_g2.js — V2-G2: ACTIVE STANDING. Finite internal joint actuation + ground contact only; no stepping. ═══════════════════
// The G1 plant unchanged (same world configuration, passive tissue, contacts) + the parallel actuator constraints (sim/v2_actuation.js) +
// the standing controller (ctrl/v2_stand.js). Authority: Jolt owns the state — after the initial placement nothing writes a body position or
// velocity (counted: authorityWrites); the only external forces are the scenario's TEST disturbances, applied through Jolt as forces /
// torques on a named body and ledgered (impulse, work). Per tick: passive plan → controller → actuator plan → (apply passive, actuators,
// test force) → Jolt step → measurement. Shared by the Node runner and the review page (same code path, same hash).
import { V, Q, hashNums, rad } from "../core/v2_math.js";
import { G1Sim, G1_WORLD } from "./v2_g1.js";
import { ActuatorLayer, ACT } from "../sim/v2_actuation.js";
import { footYawFromSubtalar } from "../spec/v2_actuators.js";
import { StandController, polyDist, insidePoly } from "../ctrl/v2_stand.js";
import { solveStance, STANCE } from "../ctrl/v2_stance.js";
import { AnkleProbe } from "./v2_g1_ankle.js";
import { posedBodies } from "../spec/v2_pose.js";

export const G2_WORLD = { ...G1_WORLD, actuators: true };
const G = 9.81, D = 180 / Math.PI;
// a scenario: stance (quiet stance + optional offsets), duration, optional test disturbance(s)
//   push: { t0, dur, J: [x, y, z] N·s (world; +x = character's right, +z anterior), body, at: "com" }   torque: { t0, dur, H: [x, y, z] N·m·s, body }
export const G2_SCENARIOS = {
  S0: { title: "Quiet stance, untouched (60 s)", seconds: 60 },
  S0short: { title: "Quiet stance, untouched (10 s)", seconds: 10 },
};
// directions in the character frame [x = +RIGHT (spec §7.2 CCS: +X anatomical right, +Z anterior), z = anterior]
export const DIRS = { F: [0, 1], B: [0, -1], R: [1, 0], L: [-1, 0], FR: [Math.SQRT1_2, Math.SQRT1_2], FL: [-Math.SQRT1_2, Math.SQRT1_2], BR: [Math.SQRT1_2, -Math.SQRT1_2], BL: [-Math.SQRT1_2, -Math.SQRT1_2] };
export function pushScenario(dir, Jmag, opts = {}) {   // dir: a DIRS key or a unit horizontal vector [right, anterior]
  const d = Array.isArray(dir) ? dir : DIRS[dir];
  return { title: `Push ${typeof dir === "string" ? dir : "custom"} ${Jmag} N·s at the ${opts.body || "thorax"} COM`, seconds: opts.seconds ?? 6,
    push: { t0: opts.t0 ?? 1.0, dur: opts.dur ?? 0.1, J: [d[0] * Jmag, 0, d[1] * Jmag], body: opts.body || "thorax" }, dir, Jmag };
}
// S4: an angular impulse on the thorax (N·m·s about the character's axes: yaw = vertical, pitch = right axis (+ = forward pitch), roll = anterior axis)
export function torqueScenario(axis, H, opts = {}) { const a = { yaw: [0, 1, 0], pitch: [1, 0, 0], roll: [0, 0, 1] }[axis];
  return { title: `Angular impulse ${H} N·m·s about the thorax ${axis} axis`, seconds: opts.seconds ?? 6, torque: { t0: opts.t0 ?? 1.0, dur: opts.dur ?? 0.1, H: V.sc(a, H), body: "thorax" }, axis, Hmag: H }; }
// S5: a varied INITIAL state (posture offsets of the initial pose and / or a COM velocity); the controller's reference stays the nominal stance
export function offsetScenario(name, init, opts = {}) { return { title: `Initial offset: ${name}`, seconds: opts.seconds ?? 6, initStance: init.stance || null, v: init.v || null, offset: name }; }
export function buildScenario(spec, key, opts = {}) {
  const base = typeof key === "object" ? key : (G2_SCENARIOS[key] || (() => { const m = /^push_([A-Z]+)_([0-9.]+)$/.exec(key); if (m) return pushScenario(m[1], +m[2], opts); throw new Error("unknown G2 scenario " + key); })());
  const stance = solveStance(spec, { ...STANCE, ...(base.stance || {}), ...(opts.stance || {}) }), init = base.initStance ? solveStance(spec, { ...STANCE, ...base.initStance }) : stance;
  // optional initial offset (S5): a rigid lean of the posed body about the ankles is NOT used (it would tilt the feet); offsets are posture
  // offsets in the reference angles and a COM-velocity offset (rigid velocity field) — see the scenario's `offset`
  const sc = { title: base.title, seconds: base.seconds, pose: init.angles, rot: init.pelvisRot, pivot: "com", lift: 0.0005, v: base.v, w: base.w, g2: { base, stance, init } };
  return sc;
}

export class G2Sim extends G1Sim {
  constructor(J, spec, key, opts = {}) {
    const sc = buildScenario(spec, key, opts);
    super(J, spec, typeof key === "string" ? key : "custom", { ...opts, scenario: sc, cfg: { ...G2_WORLD, ...(opts.cfg || {}) } });
    this.g2 = sc.g2; this.stance = sc.g2.stance; this.base = sc.g2.base;
    const fy = opts.stand && opts.stand.footYaw ? opts.stand.footYaw : null;   // stand.footYaw (E1b work; default off): true = the evidence-based capacity, a number = its axial share k, or a capacity object
    this.act = new ActuatorLayer(spec, this.w, this.P, { ...(opts.act || {}), ...(fy ? { footYaw: fy === true ? footYawFromSubtalar() : typeof fy === "number" ? footYawFromSubtalar(fy) : fy } : {}) });
    this.ctrl = new StandController(spec, this.P, this.stance, opts);
    if (this.ctrl.o.d1Guard) this.ctrl.d1gAct = { act: this.act, uMargin: ACT.U_MARGIN };   // D1G (e2/D1G_TD2C_PREREG.md A1; default off): the torque-feasibility item reads the actuator layer's capacities
    this.probes = opts.probes === false ? null : ["L", "R"].map(s => new AnkleProbe(this, s));
    this.ledger = { Wact: 0, Wext: 0, Jext: [0, 0, 0], Hext: [0, 0, 0], damping: 0, E0: null, residual: 0, authorityWrites: 0 };
    this.trace = opts.trace ? [] : null; this.g2acc = { phase: [], slip: [0, 0], footRef: null, comMin: Infinity, sway: [], copNet: [] };
    this.thoraxI = spec.bodies.findIndex(b => b.name === "thorax");
    this.thoraxRef = (() => { const S = posedBodies(spec, this.stance.angles, { pos: null, rot: this.stance.pelvisRot }); return S[this.thoraxI].rot; })();   // thorax orientation in the reference stance (heading +z)
    this.cpu2 = { ctrl: 0, act: 0, probe: 0 }; this._wrapAuthority(); this._ctrl(true); this._measure2(); this.ledger.E0 = this.last.E;
  }
  // SNAPSHOT / RESTORE (spec §19): Jolt SaveState + the explicit controller-state struct (actuator activations, controller tick counter, the
  // already-computed passive / actuator plans for the next step, the hash chain). Measurement accumulators are not dynamics state.
  _sense() { const pr = this.probeRows, s = { Fz: pr.map(r => (r ? Math.max(0, r.JyN) : 0)), touch: pr.map(r => (r ? r.pieces.filter(p => p.touch).length : 0)) };
    if (this.ctrl && this.ctrl.o.lifecycle) s.other = pr.map(r => (r ? (r.otherContacts || []).some(x => !x.endsWith("~")) : false));   // EXPERIMENTAL lifecycle: a non-turf contact touches the foot (self-contact guard, H4)
    return s; }
  snapshot() { return { jolt: this.w.saveState(), act: this.act.state(), ctrlState: this.ctrl.getState(), ctrlN: this.ctrl.n, ctrlRing: JSON.parse(JSON.stringify(this.ctrl.ring)), ctrlOu: this.ctrl.ou.slice(), ctrlRng: this.ctrl.rng, n: this.n, h: this.h, up: this.up, aplan: JSON.parse(JSON.stringify(this.aplan)), st: JSON.parse(JSON.stringify(this.st)) }; }
  restore(snap) { this.w.restoreState(snap.jolt); this.act.setState(snap.act); this.ctrl.setState(snap.ctrlState); this.ctrl.n = snap.ctrlN; this.ctrl.ring = JSON.parse(JSON.stringify(snap.ctrlRing)); this.ctrl.ou = snap.ctrlOu.slice(); this.ctrl.rng = snap.ctrlRng; this.n = snap.n; this.h = snap.h; this.up = { ...snap.up, applied: false }; this.aplan = JSON.parse(JSON.stringify(snap.aplan)); this.aplan.applied = false; this.st = JSON.parse(JSON.stringify(snap.st)); }
  _wrapAuthority() { const w = this.w, L = this.ledger; for (const f of ["setPose", "setVel"]) { const g = w[f].bind(w); w[f] = (...a) => { L.authorityWrites++; return g(...a); }; } }
  _ctrl(init) { let t0 = now(); const cmd = this.ctrl.compute(this.st, this.up.ev, this.dt), t1 = now(); this.cpu2.ctrl += t1 - t0; this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); const t2 = now(); this.cpu2.act += t2 - t1;
    (this.cpuSamples || (this.cpuSamples = [])).push(t2 - t0); }
  _pre() { let t0 = now(); this.up = this.P.compute(this.st, this.dt); this.cpu.passive += now() - t0; if (this.ctrl) this._ctrl(false); t0 = now(); this._measure(); if (this.ctrl) this._measure2(); this.cpu.measure += now() - t0; }
  _disturb() { const b = this.base, t = this.n * this.dt, out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 };
    if (b.push && t >= b.push.t0 - 1e-9 && t < b.push.t0 + b.push.dur - 1e-9) { const i = this.spec.bodies.findIndex(x => x.name === b.push.body), F = V.sc(b.push.J, 1 / b.push.dur), at = this.st[i].com;
      this.w.addForceAt(i, F, at); out.F = F; out.at = at; out.body = i; }
    if (b.torque && t >= b.torque.t0 - 1e-9 && t < b.torque.t0 + b.torque.dur - 1e-9) { const i = this.spec.bodies.findIndex(x => x.name === b.torque.body), T = V.sc(b.torque.H, 1 / b.torque.dur); this.w.addTorqueExt(i, T); out.T = T; out.body = i; }
    return out; }
  tick() {
    if (this.n >= this.N) return false;
    let t0 = now(); this.P.apply(this.up); this.act.apply(this.aplan); const dist = this._disturb(); this.cpu.passive += now() - t0;
    if (this.probes) this.probes.forEach(p => p.before());
    const st0 = this.st; t0 = now(); this.w.step(this.dt, this.cfg.coll); this.cpu.step += now() - t0;
    t0 = now(); this._contacts(this.w.contacts); this.cpu.measure += now() - t0;
    this.n++; this.st = this.read(); this._posCorr(st0);   // investigation B teleport invariant (observation only)
    const Dstep = this.P.enabled ? this.P.dampingLoss(this.st, this.dt) : 0; this.A.Dstep.push(Dstep); this.Dcum += Dstep;
    t0 = now(); this.actRes = this.act.after(st0, this.st, this.aplan); this.cpu2.act += now() - t0;
    t0 = now(); this.probeRows = this.probes ? this.probes.map(p => { const r = p.after(); p.rows.length = 0; return r; }) : null; this.cpu2.probe += now() - t0;
    // ledger: active work, external (test) impulse and work (force at the body COM: work = F·v_mid·dt; torque: T·ω_mid·dt), damping
    const L = this.ledger; L.Wact += this.actRes.reduce((s, r) => s + r.W, 0); L.damping += Dstep;
    if (dist.body >= 0) { const i = dist.body, vm = V.sc(V.add(st0[i].v, this.st[i].v), 0.5), wm = V.sc(V.add(st0[i].w, this.st[i].w), 0.5);
      L.Wext += V.dot(dist.F, vm) * this.dt + V.dot(dist.T, wm) * this.dt; L.Jext = V.add(L.Jext, V.sc(dist.F, this.dt)); L.Hext = V.add(L.Hext, V.sc(dist.T, this.dt)); }
    if (this.ctrl.o.contactSupport || this.ctrl.o.holdUnloaded || this.ctrl.o.gainSched || this.ctrl.o.lifecycle) this.ctrl.sense = this._sense();   // G3: sensed foot loads / contacts (exact foot wrench, contact truth)
    this.lastDist = dist; this._pre(); return true;
  }
  // ── G2 measurement (per tick, after the controller has seen the new state) ──
  // phase per tick: QUIET (ξ within 1.5 cm of its target, |v_COM| < 3 cm/s, CoP request inside the support), RECOVERY (active correction,
  // ξ inside the support), EXHAUSTED (ξ outside the support polygon: no-step recovery beyond the support — a step would be required),
  // FALLEN (COM below 70 % of its start height, or any body other than the boots touching the turf)
  _measure2() {
    const I = this.ctrl.info, t = this.n * this.dt, a = this.g2acc, h = hashNums(this.act.state(), this.h); this.h = h;
    if (!I) return; const support = I.support, mXi = polyDist(support, I.xi), mCom = polyDist(support, [I.c[0], I.c[2]]), rMag = Math.hypot(I.r[0], I.r[1]), sat = rMag > 1e-4;
    const pr = this.probeRows, ld = pr ? pr.filter(r => r && r.cop && r.JyN > 20) : [], W = ld.reduce((a2, r) => a2 + r.JyN, 0), cop = ld.length ? [ld.reduce((a2, r) => a2 + r.cop[0] * r.JyN, 0) / W, ld.reduce((a2, r) => a2 + r.cop[2] * r.JyN, 0) / W] : null;   // net CoP of the loaded feet (exact per-foot wrenches)
    if (!a.init) { a.init = true; a.h0 = I.c[1]; a.foot0 = this.ctrl.feet.map(f => [this.st[f].pos[0], this.st[f].pos[2]]); a.slip = [0, 0]; a.tilt = [0, 0]; a.heelMax = [0, 0]; a.foreMax = [0, 0]; a.marginMin = Infinity; a.exitT = null;
      a.outT = 0; a.rT = 0; a.rMax = 0; a.fallT = null; a.firstOther = null; a.Lmax = 0; a.phaseT = { QUIET: 0, RECOVERY: 0, EXHAUSTED: 0, FALLEN: 0 }; a.recent = []; a.quietSince = null; a.xiDevMax = 0; a.vMax = 0;
      a.slipSpeedMax = 0; a.cause = null; a.pushEnd = this.base.push ? this.base.push.t0 + this.base.push.dur : this.base.torque ? this.base.torque.t0 + this.base.torque.dur : 0; a.quietUse = null; }
    const feet = this.ctrl.feet, dev = Math.hypot(I.xi[0] - I.xiRef[0], I.xi[1] - I.xiRef[1]), vh = Math.hypot(I.v[0], I.v[2]);
    feet.forEach((f, n) => { const d = Math.hypot(this.st[f].pos[0] - a.foot0[n][0], this.st[f].pos[2] - a.foot0[n][1]); a.slip[n] = Math.max(a.slip[n], d);
      const u = Q.rot(this.st[f].rot, [0, 1, 0]); a.tilt[n] = Math.max(a.tilt[n], Math.acos(Math.min(1, u[1])) * D);
      if (pr && pr[n]) { a.heelMax[n] = Math.max(a.heelMax[n], pr[n].heelMm); a.foreMax[n] = Math.max(a.foreMax[n], pr[n].foreMm);
        if (pr[n].JyN > 50 && pr[n].cop) { const vc = V.add(this.st[f].v, V.cross(this.st[f].w, V.sub(pr[n].cop, this.st[f].com))); a.slipSpeedMax = Math.max(a.slipSpeedMax, Math.hypot(vc[0], vc[2])); } } });
    let other = null; for (const c of this.lastContacts || []) if ((c.a < 0 || c.b < 0) && c.depth > -0.0005) { const nm = this.spec.bodies[c.a < 0 ? c.b : c.a].name; if (!/^foot_/.test(nm)) { other = nm; break; } }
    if (a.fallT == null && (I.c[1] < 0.7 * a.h0 || other)) { a.fallT = t; a.firstOther = other; }
    const phase = a.fallT != null ? "FALLEN" : mXi < 0 ? "EXHAUSTED" : dev < 0.015 && vh < 0.03 && !sat ? "QUIET" : "RECOVERY"; a.phaseT[phase] += this.dt;
    if (phase === "QUIET") { if (a.quietSince == null) a.quietSince = t; } else a.quietSince = null;
    if (mXi < 0) { a.outT += this.dt; if (a.exitT == null) { a.exitT = t; a.cause = this._cause(a.recent, t); } }
    if (sat) a.rT += this.dt; a.rMax = Math.max(a.rMax, rMag); a.marginMin = Math.min(a.marginMin, mXi); if (a.fallT == null) { a.xiDevMax = Math.max(a.xiDevMax, dev); a.vMax = Math.max(a.vMax, vh); }
    a.Lmax = Math.max(a.Lmax, V.len(this.last.L));
    if (a.fallT != null && !a.cause) a.cause = this._cause(a.recent, t);
    // recent window (0.25 s) for the causal failure classification
    const satAx = (this.actRes || []).filter(x => x.sat).map(x => this.spec.joints[x.k].name + "." + "xyz"[x.i]);
    a.recent.push({ t, r: rMag, satAx, tilt: feet.map(f => { const u = Q.rot(this.st[f].rot, [0, 1, 0]); return Math.acos(Math.min(1, u[1])) * D; }), slip: a.slip.slice(), hard: this.last.hardExc * D }); if (a.recent.length > Math.round(0.25 / this.dt)) a.recent.shift();
    if (t >= (this.base.swayFrom ?? 2) && a.fallT == null && !(this.base.push || this.base.torque)) { (a.sw || (a.sw = [])).push([I.c[0], I.c[2], cop ? cop[0] : NaN, cop ? cop[1] : NaN, I.heading[0], I.heading[1]]); }
    { const th = this.st[this.thoraxI], yaw = Math.atan2(I.heading[0], I.heading[1]), qref = Q.mul(Q.axis([0, 1, 0], yaw), this.thoraxRef); let qe = Q.mul(Q.conj(qref), th.rot); if (qe[3] < 0) qe = qe.map(x => -x);
      const dev = 2 * Math.asin(Math.min(1, Math.hypot(qe[0], qe[1], qe[2]))) * D; a.trunkDevMax = Math.max(a.trunkDevMax || 0, a.fallT == null ? dev : 0); a.trunkDev = dev; }
    const row = { t, com: I.c, v: I.v, xi: I.xi, xiRef: I.xiRef, pCmd: I.p, pRaw: I.pRaw, r: I.r, marginXi: mXi, marginCom: mCom, sat, cop, share: I.share, Fy: pr ? pr.map(r => r ? r.JyN : 0) : null, h: I.h, phase, L: this.last.L, Ldot: I.Ldot };
    if (this.trace) this.trace.push(row);
    this.lastRow = row;
  }
  // causal failure classification from the last 0.25 s (spec 2.4 / brief 15): which physical limits were binding when ξ left the support / the body fell
  _cause(win, t) { const c = new Set(), n = win.length || 1;
    if (win.filter(w => w.r > 0.001).length > 0.3 * n) c.add("CoP at the support boundary");
    const ax = {}; for (const w of win) for (const s of w.satAx) ax[s] = (ax[s] || 0) + 1; const top = Object.entries(ax).filter(([, k]) => k > 0.2 * n).map(([s]) => s);
    if (top.some(s => /^ankle/.test(s))) c.add("ankle torque saturated"); if (top.some(s => /^hip/.test(s))) c.add("hip torque saturated"); if (top.some(s => /^knee/.test(s))) c.add("knee torque saturated");
    if (top.some(s => /^(lumbar|thoracic)/.test(s))) c.add("trunk torque saturated");
    const last = win[win.length - 1] || { tilt: [0, 0], slip: [0, 0], hard: 0 }; if (Math.max(...last.slip) > 0.01) c.add("foot slipped"); if (Math.max(...last.tilt) > 2) c.add("heel / toe / edge contact lost (foot rotated)");
    if (last.hard > 0) c.add("joint ROM exhausted (beyond an anatomical hard limit)");
    if (!c.size) c.add("unclassified"); return { t, causes: [...c], saturated: top }; }
  g2summary() {
    const a = this.g2acc, L = this.ledger, r = this.lastRow, end = this.n * this.dt, E = this.last.E, dE = E - L.E0, closure = dE - (L.Wact + L.Wext - L.damping);
    const relocated = Math.max(...a.slip) > 0.02, fell = a.fallT != null;
    const recovered = !fell && !relocated && a.quietSince != null && end - a.quietSince >= 0.5 - 1e-9;
    const stepRequired = fell && a.exitT != null && a.exitT <= a.fallT;
    const ax = []; this.act.led.forEach((row, k) => row.forEach((x, i) => { if (!x || !x.n) return; ax.push({ axis: this.spec.joints[k].name + "." + "xyz"[i], key: this.spec.joints[k].def.axes["xyz"[i]].key, satTicks: x.satTicks, satS: x.satTicks * this.dt, peakFrac: x.peakFrac, meanFrac: x.sumFrac / x.n, peakNm: x.peakNm, W: x.W, overCap: x.overCap }); }));
    return { key: this.key, human: this.spec.human.id, title: this.base.title, seconds: end, hash: this.h.toString(16).padStart(8, "0"), push: this.base.push || null, torque: this.base.torque || null,
      outcome: fell ? (stepRequired ? "step required → fell" : "fell") : relocated ? "foot relocated" : recovered ? (this.base.push || this.base.torque ? "recovered" : "stood") : "not settled",
      fell, fallT: a.fallT, firstOther: a.firstOther, stepRequired, exitT: a.exitT, cause: a.cause, recovered, recoveryT: recovered && a.quietSince != null ? Math.max(0, a.quietSince - a.pushEnd) : null,
      xiDevMaxCm: a.xiDevMax * 100, vMaxCm: a.vMax * 100, marginMinCm: a.marginMin * 100, outS: a.outT, residualS: a.rT, residualMaxCm: a.rMax * 100, phaseS: a.phaseT,
      feet: { slipMaxMm: a.slip.map(x => x * 1000), tiltMaxDeg: a.tilt, heelMaxMm: a.heelMax, foreMaxMm: a.foreMax, contactSlipSpeedMaxMmS: a.slipSpeedMax * 1000 },
      trunk: { devMaxDeg: a.trunkDevMax || 0, devFinalDeg: a.trunkDev || 0 }, sway: swayStats(a.sw, this.dt),
      cpuCtrl: (() => { const x = (this.cpuSamples || []).slice().sort((p, q) => p - q); return x.length ? { meanMs: x.reduce((p, q) => p + q, 0) / x.length, p99Ms: x[Math.floor(0.99 * (x.length - 1))] } : null; })(),
      Lmax: a.Lmax, ledger: { Wact: L.Wact, Wext: L.Wext, Jext: L.Jext, Hext: L.Hext, damping: L.damping, dE, closure, authorityWrites: L.authorityWrites },
      actuators: { overCapTicks: ax.reduce((s2, x) => s2 + x.overCap, 0), top: ax.slice().sort((x, y) => y.peakFrac - x.peakFrac).slice(0, 6), axes: ax },
      final: r ? { xiDevCm: Math.hypot(r.xi[0] - r.xiRef[0], r.xi[1] - r.xiRef[1]) * 100, vCm: Math.hypot(r.v[0], r.v[2]) * 100, phase: r.phase } : null,
      g1: (() => { const g = this.summary(); return { joints: g.joints, contacts: { turfPenMaxMm: g.contacts.turfPenMaxMm, turfPenRestMm: g.contacts.turfPenRestMm, selfPenMaxMm: g.contacts.selfPenMaxMm, missedTurfSteps: g.contacts.missedTurfSteps }, engine: g.engine, finite: g.finite, invariants: g.invariants }; })(),   // + physics-integrity counters (turf-contact validity 1.4m / envelope 1.4n, teleport, passivity: report)
      cpu: { stepMs: this.cpu.step / this.n, passiveMs: this.cpu.passive / this.n, ctrlMs: this.cpu2.ctrl / this.n, actMs: this.cpu2.act / this.n, probeMs: this.cpu2.probe / this.n, measureMs: this.cpu.measure / this.n } };
  }
}
// quiet-stance sway (heading frame: AP along the feet's heading, ML to the right), detrended by the mean: RMS, range, mean CoP speed, and a
// characteristic frequency from the zero-crossing rate of the detrended AP CoP (f ≈ crossings / 2T)
function swayStats(sw, dt) { if (!sw || sw.length < 50) return null; const n = sw.length, h = [sw[0][4], sw[0][5]], lat = [h[1], -h[0]];
  const ap = (x, z) => x * h[0] + z * h[1], ml = (x, z) => x * lat[0] + z * lat[1], ser = (k) => sw.map(r => [ap(r[k], r[k + 1]), ml(r[k], r[k + 1])]).filter(p => Number.isFinite(p[0]));
  const st = (P) => { const m = [0, 1].map(i => P.reduce((a, p) => a + p[i], 0) / P.length), d = P.map(p => [p[0] - m[0], p[1] - m[1]]), rms = [0, 1].map(i => Math.sqrt(d.reduce((a, p) => a + p[i] * p[i], 0) / d.length) * 1000);
    const rng = [0, 1].map(i => (Math.max(...d.map(p => p[i])) - Math.min(...d.map(p => p[i]))) * 1000); let path = 0, zc = 0; for (let i = 1; i < d.length; i++) { path += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]); if (d[i][0] * d[i - 1][0] < 0) zc++; }
    return { rmsApMm: rms[0], rmsMlMm: rms[1], rangeApMm: rng[0], rangeMlMm: rng[1], meanSpeedMmS: path / (d.length * dt) * 1000, freqHz: zc / (2 * d.length * dt) }; };
  return { seconds: n * dt, com: st(ser(0)), cop: st(ser(2)) }; }
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
