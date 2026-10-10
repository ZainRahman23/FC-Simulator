// PCS-1 §2 plant (PCS1_PREREG.md, frozen 8585adc): the REV2 plant (pi1/rev2/scripts/pi1_rev2_sim.mjs, imported unchanged) + the carrier terms, in a subclass.
//   C-Q  posture targets q*(τ) = q_T(τ)·slerp(1, Δ₀, w_b(τ)) on the simulation's own leg law (law_provider.mjs), w_b = 1 − smoothstep((τ − τ_p)/6)
//   C-V  τ0 += (D + dt·K)·ω*, ω* = central difference of q* (h = 1/240 s, same row)
//   C-ID τ0 += inertial Newton–Euler of the reference motion S_T (no gravity), reference joint axes; legs by the law's swing indicator (0.03 s ramp), arms
//   C-T  SLP-2 field F_i = α_A·m_i·a_T, a_T = (v_r − v_{r−1})·60, α_A = 1 while r < r_c and no reaction
//   B    SupportLayer unchanged (caps, gains, release); targets = the reference pelvis (offset decaying like C-Q); vertical axis motor Off
// Carrier off (opts.carrier.on false) = the REV2 plant (+ read-only ankle probes when opts.probes). Nothing in REV2 / physchar2 is modified.
import path from "path"; import { fileURLToPath } from "url"; import crypto from "crypto";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const REV2 = await import(path.resolve(here, "../../../pi1/rev2/scripts/pi1_rev2_sim.mjs")), { PI1Sim, PostureDriver } = REV2;
const { V, Q, unitStates, unitEv } = await import(P2 + "core/v2_math.js"), { lockedAxisFF } = await import(P2 + "ctrl/v2_stand.js"), { decompose } = await import(P2 + "spec/v2_joints.js");
const { AnkleProbe } = await import(P2 + "gates/v2_g1_ankle.js");
const G = 9.81, KEYS = ["x", "y", "z"], E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], BLEND = 0.03, TB = 6, HT = 0.25, HS = 1 / 240;
const now = () => performance.now();
export const rotvec = (q) => { const s = q[3] < 0 ? -1 : 1, v = [q[0] * s, q[1] * s, q[2] * s], n = Math.hypot(...v); if (n < 1e-15) return [2 * v[0], 2 * v[1], 2 * v[2]]; const a = 2 * Math.atan2(n, q[3] * s); return V.sc(v, a / n); };
const slerpI = (q, t) => { const s = q[3] < 0 ? -1 : 1, qq = q.map(x => x * s), th = Math.acos(Math.min(1, qq[3])); if (th < 1e-9) return Q.norm([qq[0] * t, qq[1] * t, qq[2] * t, 1]); const k = Math.sin(t * th) / Math.sin(th); return Q.norm([qq[0] * k, qq[1] * k, qq[2] * k, Math.cos(t * th)]); };
const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const mat3 = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
const mv3 = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
const Iworld = (q, I) => { const R = mat3(q), RI = R.map(row => [0, 1, 2].map(j => row[0] * I[0][j] + row[1] * I[1][j] + row[2] * I[2][j])); return RI.map(row => [0, 1, 2].map(j => row[0] * R[j][0] + row[1] * R[j][1] + row[2] * R[j][2])); };
// ── the posture driver with the carrier feed-forward (carrier off / FALL: exactly REV2's compute) ──
export class CarrierPostureDriver extends PostureDriver {
  compute(st, ev, dt, contact, car) { if (!car) { const cmd = super.compute(st, ev, dt, contact); this.lastCmd = cmd; return cmd; }
    st = unitStates(st); ev = unitEv(ev); const C = this.C, Pp = C.P, B = this.spec.bodies, cmd = [], comp = [];
    for (const n of [0, 1]) { const tgt = contact[n] ? 1 : 0, d = dt / BLEND; this.wSt[n] = this.wSt[n] < tgt ? Math.min(tgt, this.wSt[n] + d) : Math.max(tgt, this.wSt[n] - d); }
    let c = [0, 0, 0]; st.forEach((b, i) => { c = V.add(c, V.sc(b.com, B[i].mass)); }); c = V.sc(c, 1 / this.M);
    const nC = (contact[0] ? 1 : 0) + (contact[1] ? 1 : 0), F = [null, null], cps = [null, null];
    for (const n of [0, 1]) if (contact[n]) { const f = st[C.feet[n]], cp = V.add(f.pos, Q.rot(f.rot, this.sole[n])), hz = Math.max(0.05, c[1] - cp[1]), u = [(c[0] - cp[0]) / hz, 1, (c[2] - cp[2]) / hz]; F[n] = V.sc(u, this.M * G / nC); cps[n] = cp; }
    const geff = [0, -G, 0];
    for (const d of Pp.jd) { const k = d.k, pj = C.jointAt(st, k); let T = [0, 0, 0];
      for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f); if (F[n]) T = V.sub(T, V.cross(V.sub(cps[n], pj), F[n])); }
      const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), side = C.legSide[k], leg = side >= 0;
      const q = ev.qs[k], qr = this.qT[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const Lk = C.o.ffLockedAxis ? C.lockedFix[k] : null, tB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;
      const g = C.gain[k], gs = leg ? C.gainSwing[k] : null, w = leg ? this.wSt[side] : 1, K = leg ? w * g.K + (1 - w) * gs.K : g.K, Dg = leg ? w * g.D + (1 - w) * gs.D : g.D;
      cmd[k] = KEYS.map((key, i) => { const tff = Lk != null && i === 3 - Lk ? tB1 : V.dot(T, axW[i]), vff = (Dg + dt * K) * car.wStar[k][i], tid = car.tauID[k][i];
        return { K, D: Dg, tau0: tff + K * e[i] + vff + tid, ff: tff, vff, id: tid, e: e[i] }; }); }
    return cmd; }
}
export class PI1CarrierSim extends PI1Sim {
  // opts.carrier = { on, law (makeLaw(R)), rows (R.rows), react (R.react), rC (first-contact row or Infinity), off (render − physics offset) }; opts.probes
  constructor(J, spec, h, auth, opts = {}) {
    super(J, spec, h, auth, opts);
    if (opts.probes) this.probes = ["L", "R"].map(s => new AnkleProbe(this, s));
    this.carCpu = { law: 0, ref: 0, id: 0, carrier: 0, Bset: 0, standIn: 0, disturb: 0, pd: 0, act: 0, steps: 0 };
    this.carOn = !!(opts.carrier && opts.carrier.on); this.fallen = false; this.pending = null; this.applied = null;
    if (!this.carOn) { const q0 = this.pd.qT; this.pd = new CarrierPostureDriver(this.ctrl, spec); this.pd.setTargets(q0); this.carInit = true; this._ctrl(true); return; }   // REV2 path (REV2's compute, fresh blend state as at construction; recomputed only to capture the command)
    const c = opts.carrier; this.law = c.law; this.rows = c.rows; this.react = c.react; this.rC = c.rC; this.off = c.off;
    this.armK = spec.joints.map(j => /^(shoulder|elbow)_/.test(j.name)); this.Pjd = this.P.jd;
    this.qProm = this.up.ev.qs.map(q => Q.norm(q.slice()));
    const o0 = this.law.at(this.tauP), qT0 = this._qs(o0.S); this.D0 = qT0.map((q, k) => Q.norm(Q.mul(Q.conj(q), this.qProm[k])));
    this.pelPhys0 = { com: this.st[this.pel].com.slice(), rot: Q.norm(this.st[this.pel].rot.slice()) };
    const comT0 = V.sub(this._comW(o0.S, this.pel), this.off); this.dpel0 = V.sub(this.pelPhys0.com, comT0); this.drot0 = Q.norm(Q.mul(Q.conj(o0.S[this.pel].rot), this.pelPhys0.rot));
    this.wID = [o0.planted.L ? 0 : 1, o0.planted.R ? 0 : 1];
    this.sup.c.SetMotorState(this.sup.ax.lin[1], J.EMotorState_Off);   // B vertical released (PCS-1 §2.6)
    this.pd = new CarrierPostureDriver(this.ctrl, spec); this.pd.setTargets(this.qProm); this.car = null; this.Alast = null; this.Blast = null;
    this.carInit = true; this._ctrl(true);
  }
  _comW(S, i) { return V.add(S[i].pos, Q.rot(S[i].rot, this.spec.bodies[i].comLocal)); }
  _qs(S) { const R = S.map(s => s.rot); return this.P.jd.map(d => this.P.qcs(d, R)); }
  _wb(tau) { return 1 - smooth((tau - this.tauP) / TB); }
  _qStar(tau, center) { const t0 = now(), o = this.law.at(tau, center); this.carCpu.law += now() - t0; const t1 = now(), qT = this._qs(o.S), w = this._wb(tau); const q = qT.map((q, k) => Q.norm(Q.mul(q, slerpI(this.D0[k], w)))); this.carCpu.ref += now() - t1; return { q, o }; }
  // B target (physics frame) at τ from the reference pelvis (same row as `center`)
  _pelStar(tau, center) { const t0 = now(), o = this.law.at(tau, center); this.carCpu.law += now() - t0; const w = this._wb(tau);
    return { com: V.add(V.sub(this._comW(o.S, this.pel), this.off), V.sc(this.dpel0, w)), rot: Q.norm(Q.mul(o.S[this.pel].rot, slerpI(this.drot0, w))) }; }
  tick() { this.applied = this.pending; return super.tick(); }
  _ctrl(init) {
    if (!this.carInit) return super._ctrl(init);
    if (!this.carOn) { const t0 = now(); super._ctrl(init); this.carCpu.pd += now() - t0; this.pending = { cmd: this.pd.lastCmd, car: null }; return; }
    const tc = this.tauP + (this.n + 1) / 4; let car = null;
    if (!this.fallen) {
      const m = this._qStar(tc - HT, tc), z = this._qStar(tc, tc), p = this._qStar(tc + HT, tc);
      const tr = now(), wStar = z.q.map((q, k) => { const a = m.q[k], b = p.q[k], s = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1, d = Q.mul(Q.conj(a), b.map(x => x * s)); return [0, 1, 2].map(i => 2 * d[i] / (2 * HS)); }); this.carCpu.ref += now() - tr;
      const ti = now(); for (const [n, sd] of [[0, "L"], [1, "R"]]) { const tgt = z.o.planted[sd] ? 0 : 1, dd = this.dt / BLEND; this.wID[n] = this.wID[n] < tgt ? Math.min(tgt, this.wID[n] + dd) : Math.max(tgt, this.wID[n] - dd); }
      const tauID = this._invDyn(m.o.S, z.o.S, p.o.S); this.carCpu.id += now() - ti;
      this.pd.setTargets(z.q); car = { wStar, tauID, q: z.q, wID: this.wID.slice(), wb: this._wb(tc), tc };
    }
    const t0 = now(), cmd = this.pd.compute(this.st, this.up.ev, this.dt, this.contactFlags || [false, false], car), t1 = now(); this.aplan = this.act.compute(this.st, this.up.ev, cmd, this.dt, init); const t2 = now();
    this.carCpu.pd += t1 - t0; this.carCpu.act += t2 - t1; this.pending = { cmd, car };
  }
  // inertial Newton–Euler torque of the reference motion (S at τ − h, τ, τ + h), per joint, projected on the REFERENCE joint axes
  _invDyn(Sm, S0, Sp) { const B = this.spec.bodies, C = this.ctrl, NB = B.length, a = [], w = [], al = [], cc = [], Iw = [];
    for (let i = 0; i < NB; i++) { const cm = this._comW(Sm, i), c0 = this._comW(S0, i), cp = this._comW(Sp, i); cc[i] = c0; a[i] = V.sc(V.add(V.sub(cp, V.sc(c0, 2)), cm), 1 / (HS * HS));
      const wp = V.sc(rotvec(Q.mul(Sp[i].rot, Q.conj(S0[i].rot))), 1 / HS), wm = V.sc(rotvec(Q.mul(S0[i].rot, Q.conj(Sm[i].rot))), 1 / HS); w[i] = V.sc(V.add(wp, wm), 0.5); al[i] = V.sc(V.sub(wp, wm), 1 / HS); Iw[i] = Iworld(S0[i].rot, B[i].inertia); }
    return this.P.jd.map(d => { const k = d.k, side = C.legSide[k], wt = side >= 0 ? this.wID[side] : this.armK[k] ? 1 : 0; if (wt === 0) return [0, 0, 0];
      const pj = C.jointAt(S0, k); let T = [0, 0, 0]; for (const i of C.sub[k]) { const Iwi = Iw[i]; T = V.add(T, V.add(V.cross(V.sub(cc[i], pj), V.sc(a[i], B[i].mass)), V.add(mv3(Iwi, al[i]), V.cross(w[i], mv3(Iwi, w[i]))))); }
      const R2F2 = Q.mul(S0[d.child].rot, d.F2); return E3.map(e => wt * V.dot(T, Q.rot(R2F2, e))); }); }
  _disturb() {
    if (!this.carOn) { const t0 = now(), o = super._disturb(); this.carCpu.disturb += now() - t0; this.carCpu.steps++; return o; }
    const td = now(), out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 }; const tau = this.tauP + this.n / 4, tn = tau + 0.25;
    if (this.Bon && this.auth.fallTau != null && tn > this.auth.fallTau - 1 + 1e-9) { this.Bon = false; this.sup.setAlpha(0); this.pd.setTargets(this.up.ev.qs); this.fallAt = tau; this.fallen = true; }   // REV2 rule, unchanged
    let Bt = null;
    if (this.Bon) { const tc = now(), z = this._pelStar(tn, tn), m = this._pelStar(tn - HT, tn), p = this._pelStar(tn + HT, tn);
      const dp = V.sub(z.com, this.pelPhys0.com), vel = V.sc(V.sub(p.com, m.com), 1 / (2 * HS)), qcs = Q.norm(Q.mul(z.rot, Q.conj(this.pelPhys0.rot))), om = V.sc(rotvec(Q.mul(p.rot, Q.conj(m.rot))), 1 / (2 * HS));
      this.carCpu.carrier += now() - tc; const tb = now();
      this.sup.setTargets([dp[0], 0, dp[2]], [vel[0], 0, vel[2]], 0); this.sup.q.Set(qcs[0], qcs[1], qcs[2], qcs[3]); this.sup.c.SetTargetOrientationCS(this.sup.q); this.sup.v.Set(om[0], om[1], om[2]); this.sup.c.SetTargetAngularVelocityCS(this.sup.v);
      this.carCpu.Bset += now() - tb; Bt = { dp: [dp[0], 0, dp[2]], vel: [vel[0], 0, vel[2]], q: qcs, om }; }
    // C-T: the SLP-2 uniform field (2-D), off from the simulation's first-contact interval
    const ta = now(), r = Math.ceil(tn - 1e-9) - 1, alphaA = r < this.rC && !this.react[r] ? 1 : 0, rw = this.rows[r], rp = this.rows[r - 1], aT = [(rw[10] - rp[10]) * 60, 0, -(rw[11] - rp[11]) * 60]; let Af = null;
    if (alphaA && (aT[0] !== 0 || aT[2] !== 0)) { Af = []; for (let i = 0; i < this.spec.bodies.length; i++) { const F = V.sc(aT, this.spec.bodies[i].mass); this.w.addForceAt(i, F, this.st[i].com); Af.push(F); } }
    this.carCpu.carrier += now() - ta; this.Alast = { r, alphaA, aT, F: Af }; this.Blast = Bt;
    const ts = now(); this.lastDrive = this.standIn.drive(tau, this.dt); this.carCpu.standIn += now() - ts; this.carCpu.disturb += now() - td; this.carCpu.steps++; return out;
  }
  // per-step digests (criteria 1, 2, 6, 8)
  digests() { const st = this.st, f = new Float64Array(st.length * 13); st.forEach((b, i) => { f.set([...b.pos, ...b.rot, ...b.v, ...b.w], i * 13); });
    const h = (arr) => crypto.createHash("sha1").update(Buffer.from(new Float64Array(arr).buffer)).digest("hex").slice(0, 16);
    const ap = this.applied || {}, cmd = ap.cmd || [], cf = []; for (const r of cmd) if (r) for (const x of r) cf.push(x.K, x.D, x.tau0);
    const car = ap.car, cs = []; if (car) { for (const q of car.q) cs.push(...q); for (const w of car.wStar) cs.push(...w); for (const t of car.tauID) cs.push(...t); cs.push(...car.wID, car.wb); }
    const A = this.Alast; if (A) { cs.push(A.alphaA, ...A.aT); if (A.F) for (const F of A.F) cs.push(...F); } const Bt = this.Blast; if (Bt) cs.push(...Bt.dp, ...Bt.vel, ...Bt.q, ...Bt.om);
    return { state: crypto.createHash("sha1").update(Buffer.from(f.buffer)).digest("hex").slice(0, 16), cmd: h(cf), carrier: h(cs) }; }
}
