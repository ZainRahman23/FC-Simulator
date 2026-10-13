// SUPPORT-1 successor controller C3-SC: the frozen C3 (balance2/c3/c3_ctrl.mjs, imported, not copied or modified) + ONE mechanism:
//   SUPPORT CONFIDENCE (loadability) per leg, from that leg's OWN physical support state, sensed through a delayed foot channel:
//     c_load = clamp((N − N0) / (N1 − N0), 0, 1)   N = the foot's turf normal load (plantar mechanoreceptors / load receptors)
//     c_slip = clamp(1 − (v − v0) / (v1 − v0), 0, 1) v = horizontal velocity of the boot's sole centre (the foot's own state: slip is felt as shear / motion)
//     c_tilt = clamp(1 − (θ − θ0) / (θ1 − θ0), 0, 1) θ = tilt of the sole from horizontal (foot orientation: a boot on its edge has no flat support)
//     c = c_load · c_slip · c_tilt, sensed `delay` steps late, first-order smoothed (τ)
//   and the leg's STANCE INTENT is scaled by c: on that leg's ankle, knee and hip axes the net intent becomes c · (τ_static + Δτ_C3) (+ (1 − c)·0),
//   i.e. Δτ_out = c·Δτ_C3 − (1 − c)·τ_static. A leg that carries no load, slides or stands on its edge is not commanded as a support (C3's COM,
//   HAT, knee-length and support-symmetry objectives all assume a stance leg); the muscle tone floors of the canonical allocator remain (the leg stays
//   toned, not limp). Evidence: load-related modulation of extensor activity (Dietz & Duysens 2000; Duysens, Clarac & Cruse 2000: extensor activity
//   scales with sensed limb load, latencies of tens of ms). It is generic: no contact partner, impulse, event, label or outcome is read; in quiet stance
//   and ordinary pushes both feet carry load (c = 1) and C3 is unchanged bit for bit while c = 1.
// Sensing: the foot's normal load is the sum of the turf normal impulses on that foot's boot pieces in Jolt's post-step contact cache (the same data
// the plant's own measurement decodes), divided by the step; slip and tilt come from the foot body state the controller already receives.
const RA = new URL("../../", import.meta.url).href, { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL;
const TA = await import(PL.P2 + "tools/track_a_lib.mjs");
export const SC_DEFAULT = Object.freeze({ N0frac: 0.03, N1frac: 0.15, v0: 0.05, v1: 0.30, th0Deg: 10, th1Deg: 30, delay: 12, tau: 0.02 });
export class C3SCController extends C3Controller {
  constructor(params, sc = {}) { super(params); this.sc = { ...SC_DEFAULT, ...sc }; this.scRing = new Map(); this.cs = [1, 1]; this.scLog = []; }
  attach(body, plant, c) { super.attach(body, plant, c); this.plant = plant; const spec = c.spec; this.footB = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n));
    this.footId = this.footB.map(i => plant.idOf[c.bOff + i]); this.BW = spec.bodies.reduce((s, b) => s + b.mass, 0) * 9.81;
    const legs = { L: ["ankle_L", "knee_L", "hip_L"], R: ["ankle_R", "knee_R", "hip_R"] }; this.legK = ["L", "R"].map(s => legs[s].map(n => spec.joints.findIndex(j => j.name === n)));
    // sole-centre offset in the boot frame (mean of the boot's lowest hull points) for the slip velocity
    this.sole = this.footB.map(i => { const P = spec.bodies[i].shapes.flatMap(s => s.points), y0 = Math.min(...P.map(p => p[1])), lo = P.filter(p => p[1] < y0 + 0.003); return V.sc(lo.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / lo.length); }); }
  _footLoads() { const P = this.plant, dec = TA.decodeContacts(TA.saveState(P.J, P.w.ps, P.J.EStateRecorderState_Contacts)), N = [0, 0];
    for (const pr of dec.pairs) for (const m of pr.manifolds) { const a = m.key.body1, b = m.key.body2, g = P.groundId; if (a !== g && b !== g) continue; const other = a === g ? b : a, k = this.footId.indexOf(other); if (k < 0) continue;
      N[k] += m.points.reduce((s, p) => s + p.lambda, 0); } return N.map(x => x / P.dt); }
  step(n, st, ev) { const N = this._footLoads(), S = this.sc, sample = [0, 1].map(k => { const s = st[this.footB[k]], c0 = V.add(s.pos, Q.rot(s.rot, this.sole[k])), vp = V.add(s.v, V.cross(s.w, V.sub(c0, s.com))), up = Q.rot(s.rot, [0, 1, 0]);
      return { N: N[k], v: Math.hypot(vp[0], vp[2]), th: Math.acos(Math.max(-1, Math.min(1, up[1]))) * 180 / Math.PI }; });
    this.scRing.set(n, sample); this.scRing.delete(n - S.delay - 4); const d = this.scRing.get(n - S.delay), a = 1 - Math.exp(-this.h / S.tau), cl = (x) => Math.max(0, Math.min(1, x));
    if (d) for (let k = 0; k < 2; k++) { const x = d[k], c = cl((x.N - S.N0frac * this.BW) / ((S.N1frac - S.N0frac) * this.BW)) * cl(1 - (x.v - S.v0) / (S.v1 - S.v0)) * cl(1 - (x.th - S.th0Deg) / (S.th1Deg - S.th0Deg)); this.cs[k] += a * (c - this.cs[k]); }
    const out = super.step(n, st, ev);
    for (let k = 0; k < 2; k++) { const c = this.cs[k]; if (c >= 1 - 1e-12) continue; for (const jk of this.legK[k]) { const ax = this.body.ax.find(x => x.k === jk); out[jk] = out[jk].map((v, i) => { const r = ax.rows[i]; return r ? c * v - (1 - c) * r.tauStatic : v; }); } }
    this.lastSC = { c: this.cs.slice(), N: sample.map(x => +x.N.toFixed(1)), v: sample.map(x => +x.v.toFixed(3)), th: sample.map(x => +x.th.toFixed(1)) }; return out; }
  supportLog() { return this.lastSC ? { c: this.lastSC.c.map(x => +x.toFixed(3)), N: this.lastSC.N } : null; }
  meta() { return { ...super.meta(), successor: "SUPPORT-1 C3-SC (C3 + support confidence)", sc: this.sc }; }
}
