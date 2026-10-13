// PVP-0 tackler motor intent: the SLIDE-A1 K action as BOUNDED POSTURE INTENT through the canonical M1b body (Astra's deferred SLIDE-A1-PHYS design,
// slide_a1/PHYSICAL_DESIGN.html, authority model A "constant finite": authored joint coordinates → bounded posture / velocity intent → canonical
// intent-to-excitation allocator → per-axis excitation → character-owned M1b → rigid-body / contact solve).
// Per actuated axis: intent = K·err + D·(ω_ref − ω) − τ_static, where err / ω are the joint-frame rotation error to the K target and the joint
// rate (the plant's own SnapshotTone formulas, pvp1a_sim.mjs toneCmd), K / D are V2's OWN PostureDriver gains for this character at its entry
// (the plant's tone table, computed once; nothing chosen here), and τ_static cancels M1bBody's standing rest-statics bias (it is not a standing
// body). The intent never becomes a torque except through M1b: activation lag, developed-force dynamics, capacity, force–velocity and the
// eccentric yield of the strain arms all apply (local yielding is the muscles' own). No root drive, no external force, no collision awareness,
// no ragdoll switch, no outcome logic. The clock is the K clip time from the tackler's activation step.
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL;
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export class KTracker {
  constructor(opts) { this.o = opts; this.log = { n: [], errDeg: [], satAxes: [] }; } // opts: { targets: [step][joint] quaternion, activate: step, t0 }
  attach(body, plant, c) { this.body = body; this.c = c; this.plant = plant; this.h = plant.dt; this.tone = c.tone; this.ax = c.act.ax || null;
    this.gains = c.tone.map(T => ({ k: T.k, K: T.K, D: T.D, F2: T.F2, parent: T.parent, child: T.child })); }
  _target(n) { const T = this.o.targets, s = Math.max(0, Math.min(T.length - 1, n - this.o.activate)); return [T[s], T[Math.min(T.length - 1, s + 1)]]; }
  step(n, st, ev) { const [q1, q2] = this._target(n), h = this.h, out = this.c.spec.joints.map(() => [0, 0, 0]); let e2 = 0, ne = 0;
    for (const G of this.gains) { if (!G.K) continue; const k = G.k, q = ev.qs[k], qr = q1[k], sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1;
      const dq = Q.mul(Q.conj(q), qr.map(x => x * sg)), err = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
      // target joint rate in the joint (child F2) frame from the target sequence; current rate from the world body rates projected on the same axes
      const qn = q2[k], sn = qr[0] * qn[0] + qr[1] * qn[1] + qr[2] * qn[2] + qr[3] * qn[3] < 0 ? -1 : 1, dr = Q.mul(Q.conj(qr), qn.map(x => x * sn)), wRef = [2 * dr[0] / h, 2 * dr[1] / h, 2 * dr[2] / h];
      const R2F2 = Q.mul(st[G.child].rot, G.F2), axW = E3.map(e => Q.rot(R2F2, e)), wr = V.sub(st[G.child].w, st[G.parent].w), w = axW.map(a => V.dot(wr, a));
      const rows = this.body.ax.find(a => a.k === k).rows;
      for (let i = 0; i < 3; i++) { if (!rows[i]) continue; out[k][i] = G.K[i] * err[i] + G.D[i] * (wRef[i] - w[i]) - rows[i].tauStatic; e2 += err[i] * err[i]; ne++; } }
    this.log.n.push(n); this.log.errDeg.push(+(Math.sqrt(e2 / Math.max(1, ne)) * 180 / Math.PI).toFixed(3)); return out; }
  meta() { return { tracker: "PVP-0 KTracker (authority model A: V2 PostureDriver gains through canonical M1b)", activate: this.o.activate, t0: this.o.t0, steps: this.o.targets.length }; }
}
