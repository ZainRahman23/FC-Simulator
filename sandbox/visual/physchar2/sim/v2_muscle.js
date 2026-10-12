// ═══ physchar2/sim/v2_muscle.js — the CANONICAL V2 muscle layer (M1b, adopted 2026-10-12) ══════════════════════════════════════════════════
// Force path (per motorised axis, per muscle group ±):
//   NEURAL (delayed):    u± (controller EXCITATION — the only input) → electrochemical delay (2 steps) → activation a± (15 / 50 ms)
//                        → developed force f± (τc,rise / τc,fall per muscle group) → active torque f⁺·capIso⁺(θ) − f⁻·capIso⁻(θ)
//   MECHANICAL (instant): force–length capIso(θ) · force–velocity cap(θ, ω) (window) · short-range stiffness K = Σ (e − 1)·f·capIso/θ_y on the
//                        history-consistent strain arms (C) · passive B · damping D = 2ζ√(K_tot·I)
// There is NO torque input: compute() accepts only { uP, uM } per axis and throws on anything else, so no controller can impose instantaneous
// physical torque. Muscle state (delay line, a, f, strain-arm forces, rotation history) is character state: state() / setState() for snapshot / hash.
// The legacy ActuatorLayer (v2_actuation.js: a PD request delivered inside an activation envelope) is kept ONLY to reproduce frozen evidence
// (PVP-1A, G1–G3, PPR-1…3); new physical characters use MuscleLayer.
// Qualified in MUSCLE-1 (M1b). MuscleAxis reproduces the qualified fixture model (m1_models.mjs M1bAxis) step for step (muscle1 equivalence test).
import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
import { ActuatorLayer, ACT } from "./v2_actuation.js";
import { activationStep } from "../spec/v2_actuators.js";
import { FORCE_PATH, SHORT_RANGE, STRAIN_ARMS, PASSIVE_B, muscleGroup, hasMuscleGroup, capFamilyOf } from "../spec/v2_muscles.js";

const D2R = Math.PI / 180, E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"];
const lagStep = (y, x, dt, tUp, tDn) => x + (y - x) * Math.exp(-dt / (x > y ? tUp : tDn));
// net-torque intent → excitation at fixed (entry) capacities with activation floors (tone): minimal activations meeting the floors with
// a⁺·c⁺ − a⁻·c⁻ = τ (PPR-3 solveFloors, unchanged). The canonical intent→excitation allocator; it sets excitation only.
export function solveFloors(tau, fP, fM, cP, cM) { if (tau >= 0) { const aP = Math.max(fP, (tau + fM * cM) / cP); return [Math.min(1, aP), Math.min(1, Math.max(fM, (aP * cP - tau) / cM))]; }
  const aM = Math.max(fM, (-tau + fP * cP) / cM); return [Math.min(1, Math.max(fP, (aM * cM + tau) / cP)), Math.min(1, aM)]; }

// ── one actuator axis: pure state machine (usable on prescribed kinematics and inside the body) ──
// d = { capFull(dir, anatDeg, wDir, kneeDeg), kP, kM, ePs, ePm, cP, cM, I, kp, slackDeg, dp, s, dt, zeta, Dmin, tc: [{up, dn}, {up, dn}], dSteps }
export class MuscleAxis {
  constructor(d) { this.d = d; const ec = STRAIN_ARMS; this.W = { r: ec.fRes, s: ec.wS, f: ec.wF }; this.decay = { r: 1, s: Math.exp(-d.dt / ec.tauS), f: Math.exp(-d.dt / ec.tauF) };
    this.a = [0, 0]; this.f = [0, 0]; this.line = null; this.F = { r: 0, s: 0, f: 0 }; this.Kf = null; this.row = null;
    this.energy = { r: 0, s: 0, f: 0 }; this.diss = { relax: 0, detach: 0, slip: 0 }; }
  passiveB(anat) { const d = this.d; return -d.kp * (anat - d.slackDeg) * D2R * d.s; }
  // excitation u (pair) for the next step; inp = { anat (deg), w (axis rate, rad/s), kneeDeg }
  plan(u, inp, init = false) { const d = this.d, dt = d.dt, a = this.a, f = this.f;
    if (init || !this.line) { this.line = Array.from({ length: d.dSteps }, () => [u[0], u[1]]); }
    let ud = u; if (!init) { this.line.push([u[0], u[1]]); ud = this.line.shift(); }
    if (init) { a[0] = f[0] = ud[0]; a[1] = f[1] = ud[1]; } else { a[0] = activationStep(a[0], ud[0], dt); a[1] = activationStep(a[1], ud[1], dt);
      f[0] = lagStep(f[0], a[0], dt, d.tc[0].up, d.tc[0].dn); f[1] = lagStep(f[1], a[1], dt, d.tc[1].up, d.tc[1].dn); }
    // detachment (developed force fell: strained bridges detach, arm forces and their energy scale down) / attachment (rose: unstrained, no change)
    const Kf = d.kP * f[0] * d.cP + d.kM * f[1] * d.cM; if (this.Kf != null && Kf < this.Kf) { const kap = Kf / this.Kf; for (const j of ["r", "s", "f"]) { this.F[j] *= kap; this.diss.detach += (1 - kap) * this.energy[j]; this.energy[j] *= kap; } } this.Kf = Kf;
    const w = inp.w, anat = inp.anat, kd = inp.kneeDeg, FP = f[0], FM = f[1];
    const isoP = d.capFull(1, anat, 0, kd), isoM = d.capFull(-1, anat, 0, kd), capP = d.capFull(1, anat, w, kd), capM = d.capFull(-1, anat, -w, kd);
    const drive = FP * isoP - FM * isoM, Kmus = d.kP * FP * isoP + d.kM * FM * isoM, Ktot = Kmus + d.kp, D = Math.max(d.Dmin, 2 * d.zeta * Math.sqrt(Ktot * d.I) + (d.dp || 0));
    const tauP = this.passiveB(anat), tauE = this.F.r + this.F.s + this.F.f, tau0 = drive + tauE + tauP, req = tau0 - (D + dt * Ktot) * w;
    const Kps = d.kP * FP * isoP, Kms = d.kM * FM * isoM, Rp = (d.ePs - 1) * FP * isoP, Rm = (d.ePm - 1) * FM * isoM;
    let hiE = Math.min(Math.max(tauE * Kps / Math.max(1e-12, Kmus), 0), Rp), loE = Math.max(Math.min(tauE * Kms / Math.max(1e-12, Kmus), 0), -Rm);
    // window reserve: a side not shortening at plan time has its short-range / eccentric reserve within the step, capped at its eccentric plateau
    if (w <= 0) hiE = Math.max(hiE, Math.min(Rp, d.ePs * FP * isoP - FP * capP)); if (w >= 0) loE = Math.min(loE, -Math.min(Rm, d.ePm * FM * isoM - FM * capM));
    return (this.row = { u: ud, uCmd: u, aP: a[0], aM: a[1], fP: FP, fM: FM, isoP, isoM, capP, capM, drive, Kmus, K: Ktot, Ktot, D, tauP, tauE, tau0, req, w, anat, Rp, Rm, hi: FP * capP + tauP + hiE, lo: -FM * capM + tauP + loE }); }
  // prescribed-kinematics torque for the step (the implicit motor law the body's Jolt motor solves)
  torque(wEnd) { const r = this.row, raw = r.tau0 - (r.D + this.d.dt * r.Ktot) * wEnd, tau = Math.max(r.lo, Math.min(r.hi, raw));
    return { tau, active: r.drive, elastic: r.tauE, passive: r.tauP, damping: -(r.D + this.d.dt * r.Ktot) * wEnd, clamp: tau - raw, sat: tau !== raw ? 1 : 0 }; }
  // after the step: the strain increment de loads every arm (incremental, w_j·K·de); relaxing arms decay at constant length; yield at R⁺ + R⁻
  strain(de) { const r = this.row, A = this.F, K = r ? r.Kmus : 0; let slip = 0;
    for (const j of ["r", "s", "f"]) { const F0 = A[j], F1 = F0 + this.W[j] * K * de; this.energy[j] += 0.5 * (F0 + F1) * de; A[j] = F1 * this.decay[j]; const loss = (1 - this.decay[j] ** 2) * this.energy[j]; this.diss.relax += loss; this.energy[j] -= loss; }
    if (r && r.Kmus > 0) { const tE = A.r + A.s + A.f, cap = r.Rp + r.Rm; if (Math.abs(tE) > cap) { const sc = cap / Math.abs(tE); for (const j of ["r", "s", "f"]) { A[j] *= sc; const loss = (1 - sc * sc) * this.energy[j]; this.diss.slip += loss; this.energy[j] -= loss; } slip = 1; } }
    return slip; }
  storedElastic() { return this.energy.r + this.energy.s + this.energy.f; }
  state() { return [this.a[0], this.a[1], this.f[0], this.f[1], this.F.r, this.F.s, this.F.f, this.Kf ?? 0, ...(this.line ? this.line.flat() : [])]; }
  setState(v) { let n = 0; this.a[0] = v[n++]; this.a[1] = v[n++]; this.f[0] = v[n++]; this.f[1] = v[n++]; this.F.r = v[n++]; this.F.s = v[n++]; this.F.f = v[n++]; this.Kf = v[n++]; this.line = Array.from({ length: this.d.dSteps }, () => [v[n++], v[n++]]); }
}

// descriptor for one body axis from the canonical tables (throws on an unparameterized muscle group — no silent generalization)
export function axisDescriptor(layer, k, i, x, opts = {}) { const spec = layer.spec, j = spec.joints[k], fam = j.name.replace(/_[LR]$/, ""), capFam = capFamilyOf(j.name), thY = SHORT_RANGE.thetaYdeg[fam] * D2R;
  // groupOverrides: preregistered sensitivity values for an existing group, or an explicitly LABELLED entry for a group without canonical data
  // (an override for a missing group must carry its own label, e.g. "[SENS] …"); anything else still throws
  const ov = opts.groupOverrides || {}, grp = (dir) => { const key = `${capFam}.${dir}`, o = ov[key]; if (o && !hasMuscleGroup(capFam, dir)) { if (!o.label) throw new Error(`override for unparameterized group ${key} needs a label`); return o; } const g = muscleGroup(capFam, dir); return o ? { ...g, ...o } : g; };
  const gP = grp(x.plus.dir), gM = grp(x.minus.dir), pb = PASSIVE_B[`${fam}.${x.key}`] || null;
  return { name: `${j.name}.${x.key}`, fam, key: x.key, capFam, groups: [`${capFam}.${x.plus.dir}`, `${capFam}.${x.minus.dir}`], kP: (x.plus.cap.e - 1) / thY, kM: (x.minus.cap.e - 1) / thY, ePs: x.plus.cap.e, ePm: x.minus.cap.e,
    kp: pb && opts.passiveB !== false ? pb.k : 0, slackDeg: pb ? pb.slackDeg : 0, dp: 0, s: x.s, zeta: SHORT_RANGE.zeta, Dmin: ACT.D_MIN, dSteps: FORCE_PATH.electrochemicalDelay.steps240,
    tc: [gP, gM].map(g => ({ up: g.tauRiseMs / 1000, dn: g.tauFallMs / 1000 })) }; }

// ── the body's muscle layer: one MuscleAxis per motorised axis, written through V2's implicit Jolt motor (ActuatorLayer.apply / after unchanged) ──
export class MuscleLayer extends ActuatorLayer {
  // opts: { axes: optional filter (k, i) => bool for axes that get muscles (others are switched off), groupOverrides, passiveB (default true) }
  constructor(spec, world, passive, opts = {}) { super(spec, world, passive, {}); this.mopts = opts; this.mx = this.ax.map(r => r.map(() => null)); this.qPrev = null; this.ready = false; }
  // initialise at the current body state with the controller's initial excitation u0[k][i] = [u⁺, u⁻] (the muscles start AT that steady state:
  // delay line, activation and developed force all equal u0 — "as if standing there"); entry capacities fix the allocator / detachment scale
  init(st, ev, u0, dt) { if (!(dt > 0)) throw new Error("MuscleLayer.init: dt required"); st = unitStates(st); ev = unitEv(ev); const P = this.P, spec = this.spec, B = spec.bodies;
    const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    const jointAt = (k) => { const j = spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); };
    const Iaxis = (ids, o, u) => ids.reduce((s, i) => { const R = st[i].rot, Il = B[i].inertia, ul = Q.rot(Q.conj(R), u), Iu = [0, 1, 2].map(r => Il[r][0] * ul[0] + Il[r][1] * ul[1] + Il[r][2] * ul[2]), dd = V.sub(st[i].com, o);
      return s + V.dot(ul, Iu) + B[i].mass * (V.dot(dd, dd) - V.dot(dd, u) ** 2); }, 0);
    this.ax.forEach((row, k) => row.forEach((x, i) => { if (!x || (this.mopts.axes && !this.mopts.axes(k, i))) return; const d = P.jd[k], R2F2 = Q.mul(st[d.child].rot, d.F2), anat = P.anat(d, ev.qs[k], x.key), kk = this.kneeOf[k], kd = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null;
      const desc = axisDescriptor(this, k, i, x, this.mopts); Object.assign(desc, { capFull: (dir, an, wd, kn) => this.capFull(x, dir, an, wd, kn), cP: this.capFull(x, 1, anat, 0, kd), cM: this.capFull(x, -1, anat, 0, kd), I: Iaxis(sub(spec.joints[k].childIndex), jointAt(k), Q.rot(R2F2, E3[i])), dt, anat0: anat });
      this.mx[k][i] = new MuscleAxis(desc); }));
    this.qPrev = spec.joints.map((j, k) => Q.norm(P.qcs(P.jd[k], st.map(s => s.rot)))); this.u0 = u0; this.ready = true; return this; }
  entryCaps(k, i) { const m = this.mx[k][i]; return m ? [m.d.cP, m.d.cM] : null; }
  // cmd[k][i] = { uP, uM } — EXCITATION ONLY
  compute(st, ev, cmd, dt, init = false) { if (!this.ready) throw new Error("MuscleLayer.init() first"); st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [];
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w), kk = this.kneeOf[k], kneeDeg = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null;
      const rows = KEYS.map((key, i) => { const x = this.ax[k][i], m = this.mx[k][i]; if (!x) return null; if (!m) return { off: true }; const c = cmd[k] && cmd[k][i];
        if (!c) throw new Error(`MuscleLayer: missing excitation for ${m.d.name}`); if (c.tau0 !== undefined || c.K !== undefined || c.D !== undefined || c.tau !== undefined) throw new Error("MuscleLayer: torque commands are not accepted (excitation only)");
        if (!(c.uP >= 0 && c.uP <= 1 && c.uM >= 0 && c.uM <= 1)) throw new Error(`MuscleLayer: excitation out of [0, 1] for ${m.d.name}`);
        if (dt !== m.d.dt) throw new Error("MuscleLayer: dt differs from init"); const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key), row = m.plan([c.uP, c.uM], { anat, w, kneeDeg }, init);
        this.a[k][i][0] = m.a[0]; this.a[k][i][1] = m.a[1]; return row; });                                       // keep the legacy activation readback (ActuatorLayer.after) truthful
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); }
  // after the step: the exact constraint torque readback / ledger (ActuatorLayer.after), then each axis's strain increment from the joint rotation
  after(stPrev, st, plan = this.plan) { const res = super.after(stPrev, st, plan); st = unitStates(st); const P = this.P, rots = st.map(s => s.rot); let slips = 0;
    this.spec.joints.forEach((j, k) => { const q = Q.norm(P.qcs(P.jd[k], rots)), qp = this.qPrev[k], sg = q[0] * qp[0] + q[1] * qp[1] + q[2] * qp[2] + q[3] * qp[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qp.map(x => x * sg)); this.qPrev[k] = q;
      for (let i = 0; i < 3; i++) { const m = this.mx[k][i]; if (m) slips += m.strain(2 * dq[i]); } });
    this.slips = (this.slips || 0) + slips; return res; }
  state() { const out = []; this.mx.forEach(r => r.forEach(m => { if (m) out.push(...m.state()); })); this.qPrev.forEach(q => out.push(...q)); return out; }
  setState(v) { let n = 0; this.mx.forEach(r => r.forEach(m => { if (m) { const L = 8 + 2 * m.d.dSteps; m.setState(v.slice(n, n + L)); n += L; } })); this.qPrev = this.qPrev.map(() => [v[n++], v[n++], v[n++], v[n++]]); }
  stateSize() { return this.state().length; }
  ledgerEnergy() { let E = 0, relax = 0, detach = 0, slip = 0; this.mx.forEach(r => r.forEach(m => { if (m) { E += m.storedElastic(); relax += m.diss.relax; detach += m.diss.detach; slip += m.diss.slip; } })); return { stored: E, relax, detach, slip }; }
}
