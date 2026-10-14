// SLIDE-PHYS-1 tackler motor intent (a controller object for M1bBody: step(n, st, ev) → Δτ intent per joint axis, N·m; never torque).
// Per actuated axis: intent = α(t)·[ K·err + D·(ω_ref − ω) ] + τ_vf (support-chain virtual force, optional) − τ_static
//   err / ω       joint-frame rotation error to the choreography target at t + lead and the joint rate (the plant's own conventions, as KTracker);
//   K, D          per joint family from a declared natural frequency f and damping ratio ζ on the axis' own moment of inertia (M1b's I);
//   α(t)          the authority schedule per joint group (finite: the intent is always further bounded by M1b capacity / activation / force–velocity);
//   τ_static      cancels M1bBody's standing rest statics (this is not a standing body; same rule as PVP-0's KTracker).
// Local yield (opts.yield): when an axis' tracking error exceeds e0 (an obstruction holds it), its stiffness term is scaled by e0/|err| (the
// intent saturates — the joint gives instead of pushing harder). Contacts always win: the controller has no collision awareness at all.
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, JN, B } = L;
const C = await import(new URL("./sp_chor.mjs", import.meta.url).href), ID = await import(new URL("./sp_id.mjs", import.meta.url).href);
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const fam = (n) => n.replace(/_[LR]$/, "");
export class SlideTracker {
  // opts: { chor (compiled), lead (s), gains: { fam: { f, zeta } } | per joint name, authority: (t, jointName) => α, vf: null | fn, yield: { e0Deg } }
  constructor(opts) { this.o = opts; this.log = []; this.lead = opts.lead ?? 0.0; this.ff = (opts.ff || []).map(f => ({ ...f, fn: ID.makeChainID(f.chain, opts.chor) })); }
  attach(body, plant, c) { this.body = body; this.c = c; this.plant = plant; this.h = plant.dt; this.m = c.act.mx;
    this.gain = JN.map((j, k) => [0, 1, 2].map(i => { const mx = this.m[k][i]; if (!mx) return null; const g = this.o.gains[j.name] || this.o.gains[fam(j.name)] || this.o.gains.default, I = mx.d.I, w = 2 * Math.PI * g.f;
      return { K: I * w * w, D: 2 * g.zeta * I * w, I, f: g.f }; })); }
  targetQ(t) { return C.jointTargets(this.o.chor.anatAt(t)); }
  // state-dependent (proprioceptive) coupling: a joint key's target follows the ACTUAL angle of another joint key through a monotone map,
  // inside a time window (SIMBICON-style feedback coordination: e.g. swing-knee extension follows thigh flexion, not a clock)
  _rate(k, key, x) { const id = k + key, p = (this._prevAng = this._prevAng || {})[id], n = this._n; if (!p || p.n !== n - 1) { this._prevAng[id] = { n, x, r: p && p.n === n ? p.r : 0 }; return p ? p.r : 0; } const r = (x - p.x) / this.h; this._prevAng[id] = { n, x, r, xPrev: p.x }; return r; }
  coupledAnat(t, ev) { const an = this.o.chor.anatAt(t); for (const cp of this.o.couple || []) { if (t < cp.window[0] || t > cp.window[1]) continue;
      const k = JN.findIndex(j => j.name === cp.from[0]), x0 = this.c.P.anat(this.c.P.jd[k], ev.qs[k], cp.from[1]), xr = this._rate ? this._rate(k, cp.from[1], x0) : 0, x = x0 + (cp.predict || 0) * xr, m = cp.map, y = x <= m[0][0] ? m[0][1] : x >= m[m.length - 1][0] ? m[m.length - 1][1] : (() => { let i = 0; while (x > m[i + 1][0]) i++; const u = (x - m[i][0]) / (m[i + 1][0] - m[i][0]); return m[i][1] + u * (m[i + 1][1] - m[i][1]); })();
      const wgt = cp.blend ? Math.min(1, (t - cp.window[0]) / cp.blend, (cp.window[1] - t) / cp.blend) : 1; (an[cp.joint] = an[cp.joint] || {})[cp.key] = (1 - wgt) * (an[cp.joint][cp.key] ?? 0) + wgt * y; } return an; }
  step(n, st, ev) { this._n = n; const t = n * this.h + (this.o.t0 || 0), tt = t + this.lead, q1 = this.o.couple ? C.jointTargets(this.coupledAnat(tt, ev)) : this.targetQ(tt), q2 = this.o.couple ? C.jointTargets(this.coupledAnat(tt + this.h, ev)) : this.targetQ(tt + this.h), pd = JN.map(() => [0, 0, 0]), out = JN.map(() => [0, 0, 0]), row = { n, t, err: [] };
    for (let k = 0; k < JN.length; k++) { const j = JN[k], q = ev.qs[k], qr = q1[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      const qn = q2[k], sn = qr[0] * qn[0] + qr[1] * qn[1] + qr[2] * qn[2] + qr[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qr), qn.map(x => x * sn)), wRef = [2 * dr[0] / this.h, 2 * dr[1] / this.h, 2 * dr[2] / this.h];
      const R2F2 = Q.mul(st[j.childIndex].rot, j.F2), axW = E3.map(e => Q.rot(R2F2, e)), wr = V.sub(st[j.childIndex].w, st[j.parentIndex].w), w = axW.map(a => V.dot(wr, a));
      const al = (this.o.authority ? this.o.authority(t, j.name) : 1) * (this.rag ? this.rag.f : 1);
      for (let i = 0; i < 3; i++) { if (!this.gain[k][i]) continue; const g = this.gain[k][i]; let kp = g.K;
        if (this.o.yield && (!this.o.yield.joints || this.o.yield.joints.has(j.name)) && t >= (this.o.yield.from || 0)) { const e0 = this.o.yield.e0Deg * Math.PI / 180, ae = Math.abs(err[i]); if (ae > e0) { kp *= e0 / ae; row.yieldN = (row.yieldN || 0) + 1; } }
        pd[k][i] = al * (kp * err[i] + g.D * (wRef[i] - w[i])); row.err.push(err[i]); } }
    for (const f of this.ff) { const wgt = f.weight(t); const fv = f.fn(st, t + (this.o.ffLead ?? this.lead)); if (!wgt) continue; for (const [k, v] of Object.entries(fv)) { const al = this.o.authority ? this.o.authority(t, JN[k].name) : 1; for (let i = 0; i < 3; i++) if (this.gain[k][i]) pd[k][i] += al * wgt * v[i]; } }
    this.lastIntent = pd; let vf = this.o.vf ? this.o.vf(this, t, st, ev) : null;
    for (const extra of this.o.vfs || []) { const v2 = extra(this, t, st, ev); if (!v2) continue; if (!vf) { vf = v2; continue; } for (let k = 0; k < JN.length; k++) for (let i = 0; i < 3; i++) vf[k][i] += v2[k][i]; vf.info2 = v2.info; }
    for (let k = 0; k < JN.length; k++) { const rows = this.body.ax.find(a => a.k === k).rows; for (let i = 0; i < 3; i++) { if (!rows[i]) continue; out[k][i] = pd[k][i] + (vf && vf[k] ? vf[k][i] || 0 : 0) - rows[i].tauStatic; } }
    row.errDeg = Math.sqrt(row.err.reduce((s, x) => s + x * x, 0) / row.err.length) * 180 / Math.PI; delete row.err; if (row.yieldN) row.yield = row.yieldN;
    if (this.o.ragdoll) { const R = this.o.ragdoll; this.rag = this.rag || { over: 0, on: false, f: 1 }; if (!this.rag.on) { this.rag.over = row.errDeg > R.errDeg ? this.rag.over + this.h : 0; if (this.rag.over >= R.holdS) { this.rag.on = true; this.rag.t = t; } }
      if (this.rag.on) { this.rag.f = R.floor + (this.rag.f - R.floor) * Math.exp(-this.h / R.tauS); row.ragdoll = true; } } if (vf && vf.info) row.vf = { F: vf.info.F.map(x => +x.toFixed(1)), Fraw: vf.info.Fraw ? vf.info.Fraw.map(x => +x.toFixed(1)) : null, T: vf.info.T ? vf.info.T.map(x => +x.toFixed(1)) : null, w: vf.info.w };
    this.log.push(row); return out; }
  meta() { return { tracker: "SLIDE-PHYS-1 SlideTracker", lead: this.lead, gains: this.o.gains, chor: this.o.chor.name, yield: this.o.yield || null }; }
}
