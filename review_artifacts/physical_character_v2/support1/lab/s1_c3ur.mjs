// SUPPORT-1 successor controller C3-UR: the frozen C3 + the documented human UNLOADING RESPONSE to sudden ankle rotation (literature §4:
// Konradsen & Ravn 1990 — after a sudden inversion the peroneal reflex is followed by "a central pattern of hip, knee and ankle flexion relieving the
// vertical pressure on the ankle"; Konradsen et al. 1997 — peroneal EMG 54 ms, quadriceps / hamstrings 68 ms, active eversion 176 ms; Kristianslund
// et al. 2011 — attempted unloading of the foot from 80 ms; Konradsen et al. 2005 — initial eversion torque ≈ 30 % of maximum at 135 ms).
//   input   each leg's own ankle frontal-plane (inversion / eversion) angular rate, proprioceptive, on a channel delayed `delay` steps (16 = 67 ms)
//   drive   d = clamp((|θ̇| − r0) / (r1 − r0), 0, 1), r0 = 85 °/s (the largest inversion rate of normal running / cutting / landing, Chu et al. 2010),
//           r1 = 300 °/s (the proposed sprain threshold, Chu et al. 2010); reflex state u = max(u·exp(−h/τ), d), τ = 0.15 s (unloading 80–180 ms)
//   output  on that leg (ankle, knee, hip axes): the stance intent is withdrawn in proportion to u — net intent (1 − u)·(τ_static + Δτ_C3) — so the
//           leg's load share flexes it (unloading); plus the peroneal / tibialis reflex on the ankle frontal axis, opposing the rotation, of
//           0.3·u × that axis's isometric capacity (Konradsen 2005: ≈ 30 % of maximum), shaped by M1b's own activation / contraction dynamics.
//   Eversion is treated like inversion (the unloading evidence is from inversion; football sprains are 48 % inversion / 18 % eversion — an inference,
//   labelled). Generic: no contact, partner, impulse, label or outcome is read; ordinary standing / pushes stay below 85 °/s (then C3 bit for bit).
// option useLoad: multiply by C3-SC's load-based support confidence (the combined candidate).
const { C3SCController } = await import(new URL("./s1_c3sc.mjs", import.meta.url).href);
export const UR_DEFAULT = Object.freeze({ delay: 16, r0: 85, r1: 300, tau: 0.15, peroneal: 0.3, useLoad: false });
export class C3URController extends C3SCController {
  constructor(params, ur = {}, sc = {}) { super(params, sc); this.ur = { ...UR_DEFAULT, ...ur }; this.u = [0, 0]; this.urRing = new Map(); }
  attach(body, plant, c) { super.attach(body, plant, c); this.ankInv = [this.J.ankL, this.J.ankR].map(k => this.ax[k].findIndex(x => x && x.key === "inv")); }
  step(n, st, ev) {
    // the load-based confidence (C3-SC) is always computed (so the sensor state is identical); it is applied only when useLoad
    const N = this._footLoads(), S = this.sc, U = this.ur, cl = (x) => Math.max(0, Math.min(1, x)), P = this.c.P;
    const samp = [0, 1].map(k => { const kk = [this.J.ankL, this.J.ankR][k], a = this.ax[kk][this.ankInv[k]], inv = P.anat(P.jd[kk], ev.qs[kk], a.key); return { N: N[k], inv }; });
    this.urRing.set(n, samp); this.urRing.delete(n - U.delay - 4); const d = this.urRing.get(n - U.delay), d1 = this.urRing.get(n - U.delay - 1);
    if (d && d1) for (let k = 0; k < 2; k++) { const rate = Math.abs(d[k].inv - d1[k].inv) / this.h, drive = cl((rate - U.r0) / (U.r1 - U.r0)); this.u[k] = Math.max(this.u[k] * Math.exp(-this.h / U.tau), drive); this.dir = this.dir || [0, 0]; if (drive > 0) this.dir[k] = Math.sign(d[k].inv - d1[k].inv); }
    // C3-SC's own step computes its load confidence and (with factor cs) scales the legs; here cs is replaced by the reflex factor (× cs when useLoad)
    const csSaved = this.cs.slice(), out = Object.getPrototypeOf(C3SCController.prototype).step.call(this, n, st, ev);   // C3's own step (BalanceController.step → C3 control), bypassing C3-SC's load scaling
    for (let k = 0; k < 2; k++) { const f = (1 - this.u[k]) * (U.useLoad ? this._loadConf(k, n, N, st) : 1); if (f < 1 - 1e-12) for (const jk of this.legK[k]) { const ax = this.body.ax.find(x => x.k === jk); out[jk] = out[jk].map((v, i) => { const r = ax.rows[i]; return r ? f * v - (1 - f) * r.tauStatic : v; }); }
      if (this.u[k] > 0 && this.dir && this.dir[k]) { const kk = [this.J.ankL, this.J.ankR][k], i = this.ankInv[k], r = this.body.ax.find(x => x.k === kk).rows[i], cap = this.dir[k] > 0 ? r.cM : r.cP;
        out[kk][i] += -this.dir[k] * r.s * U.peroneal * this.u[k] * cap; } }
    this.lastSC = { c: this.u.map(x => +(1 - x).toFixed(3)), N: samp.map(x => +x.N.toFixed(1)) }; this.cs = csSaved; return out; }
  // C3-SC's load confidence as a standalone update (used only with useLoad)
  _loadConf(k, n, N, st) { const S = this.sc, cl = (x) => Math.max(0, Math.min(1, x)); this.lc = this.lc || [1, 1]; this.lcRing = this.lcRing || new Map(); if (k === 0) { this.lcRing.set(n, N.slice()); this.lcRing.delete(n - S.delay - 4); }
    const d = this.lcRing.get(n - S.delay); if (d) { const c = cl((d[k] - S.N0frac * this.BW) / ((S.N1frac - S.N0frac) * this.BW)), a = 1 - Math.exp(-this.h / S.tau); this.lc[k] += a * (c - this.lc[k]); } return this.lc[k]; }
  meta() { return { ...super.meta(), successor: "SUPPORT-1 C3-UR (C3 + unloading response to sudden ankle rotation)" + (this.ur.useLoad ? " + load confidence" : ""), ur: this.ur }; }
}
