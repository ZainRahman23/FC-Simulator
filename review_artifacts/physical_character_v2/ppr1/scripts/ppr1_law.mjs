// PPR-1 condition B — PHYSIOLOGICAL PRE-REFLEX (preregistration ppr1/PPR1_PREREGISTRATION.md, frozen d8849a6b; written after the freeze, §4 verbatim).
// Two parts, both inside V2's existing actuator architecture (the same capacity, force–length, force–velocity / eccentric plateau, activation
// dynamics and implicit Jolt motor as A):
//   PreReflexLaw (the NEURAL side): the tonic drive τ_drive(n) = bias + [support chain] K_r·err(n−30) − (D_r + h·K_r)·ω(n−30) from the runner's OWN
//     state 125 ms earlier (entry state before activation), and the elastic anchor of each joint with its plastic slip after a saturated step;
//   PreReflexActuator (the MUSCLE side): excitation u± = max(±τ_drive, 0)/capIso± + a_cc (no margin, no same-tick request), V2's activation dynamics,
//     intrinsic K_i = Σ± (e± − 1)·a±·capIso±/θ_y from the activation in effect, D_i = 2ζ√(K_i·I_axis), motor row τ0 = τ_drive + K_i·e_anc inside
//     the unchanged torque window [−a⁻cap⁻(θ, ω), +a⁺cap⁺(θ, ω)].
// Inputs: the runner's own body states and its own actuator readback — nothing else (no contacts, tackler, impact, labels, outcomes, future).
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { IL, V, Q, P2 } = PL;
const { ActuatorLayer, ACT } = await import(P2 + "sim/v2_actuation.js"), { activationStep } = await import(P2 + "spec/v2_actuators.js"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"], D2R = Math.PI / 180;
export const PPR1_B = Object.freeze({ id: "PPR-1 B (preregistration d8849a6b)", L: 30, aCC: 0.02, zeta: 0.2, floor: 1.2, support: Object.freeze(["ankle", "knee", "hip", "lumbar", "thoracic"]),
  thetaYdeg: Object.freeze({ ankle: 0.9673617406041296, knee: 1.0, hip: 1.0, lumbar: 3.0, thoracic: 3.0, neck: 2.0, shoulder: 2.2, elbow: 2.0 }) });
// ── the muscle side ──
export class PreReflexActuator extends ActuatorLayer {
  constructor(spec, world, passive, params) { super(spec, world, passive, {}); this.pp = params; }
  // cmd[k][i] = { drive, eAnc, kP, kM, I } (kP / kM = (e± − 1)/θ_y): K, D, τ0 are computed here from the activation in effect this step
  compute(st, ev, cmd, dt, init = false) {
    st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [], zeta = this.pp.zeta, aCC = this.pp.aCC;
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const kneeDeg = this.kneeOf[k] != null ? P.anat(P.jd[this.kneeOf[k]], ev.qs[this.kneeOf[k]], "flex") : null;
      const rows = KEYS.map((key, i) => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key), isoP = this.capFull(x, 1, anat, 0, kneeDeg), isoM = this.capFull(x, -1, anat, 0, kneeDeg);
        const capP = this.capFull(x, 1, anat, w, kneeDeg), capM = this.capFull(x, -1, anat, -w, kneeDeg);
        const uP = Math.min(1, Math.max(c.drive, 0) / Math.max(1e-9, isoP) + aCC), uM = Math.min(1, Math.max(-c.drive, 0) / Math.max(1e-9, isoM) + aCC);
        const a = this.a[k][i]; if (init) { a[0] = uP; a[1] = uM; } else { a[0] = activationStep(a[0], uP, dt); a[1] = activationStep(a[1], uM, dt); }
        const K = c.kP * a[0] * isoP + c.kM * a[1] * isoM, D = Math.max(ACT.D_MIN, 2 * zeta * Math.sqrt(K * c.I)), tau0 = c.drive + K * c.eAnc, req = tau0 - (D + dt * K) * w;
        return { K, D, tau0, req, capP, capM, hi: a[0] * capP, lo: -a[1] * capM, w, anat, drive: c.drive, uP, uM }; });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); }
}
// ── the neural side ──
export class PreReflexLaw {
  constructor(plant, c, params = PPR1_B) {
    this.plant = plant; this.c = c; this.params = params; this.h = plant.dt; const spec = c.spec, B = spec.bodies, P = c.P, st = c.st, ev = c.up.ev;
    c.act = new PreReflexActuator(spec, c.view, P, params); c.overCap0 = 0;   // the runner's actuator: same model, B's excitation / intrinsic rule
    const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    const jointAt = (k) => { const j = spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); };
    const Iaxis = (ids, o, u) => ids.reduce((s, i) => { const R = st[i].rot, Il = B[i].inertia, ul = Q.rot(Q.conj(R), u), Iu = [0, 1, 2].map(r => Il[r][0] * ul[0] + Il[r][1] * ul[1] + Il[r][2] * ul[2]), d = V.sub(st[i].com, o);
      return s + V.dot(ul, Iu) + B[i].mass * (V.dot(d, d) - V.dot(d, u) ** 2); }, 0);
    this.ax = c.tone.map((T, k) => { const j = spec.joints[k], fam = j.name.replace(/_[LR]$/, ""), d = P.jd[k], R2F2 = Q.mul(st[d.child].rot, d.F2), at = jointAt(k);
      const kneeK = c.act.kneeOf[k], kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null, thY = params.thetaYdeg[fam] * D2R, support = params.support.includes(fam);
      const qr = T.K ? IL.pyr(T.a0[0], T.a0[1], T.a0[2]) : null;
      return { k, fam, support, qr, parent: d.parent, child: d.child, F2: d.F2, rows: [0, 1, 2].map(i => { const x = c.act.ax[k][i]; if (!x || !T.K) return null;
        const anat = P.anat(d, ev.qs[k], x.key), isoP = c.act.capFull(x, 1, anat, 0, kneeDeg), isoM = c.act.capFull(x, -1, anat, 0, kneeDeg), bias = T.bias[i];
        const aP = Math.min(1, Math.max(bias, 0) / isoP + params.aCC), aM = Math.min(1, Math.max(-bias, 0) / isoM + params.aCC), kP = (x.plus.cap.e - 1) / thY, kM = (x.minus.cap.e - 1) / thY;
        const Ki0 = kP * aP * isoP + kM * aM * isoM, I = Iaxis(sub(j.childIndex), at, Q.rot(R2F2, E[i])), KA = T.K[i], DA = T.D[i];
        const Kr = support ? Math.max(KA - Ki0, params.floor * KA / 1.5) : 0, Dr = support ? DA * Kr / KA : 0;
        return { i, bias, kP, kM, I, KA, DA, Ki0, Kr, Dr, aP0: aP, aM0: aM, Di0: 2 * params.zeta * Math.sqrt(Ki0 * I) }; }) }; });
    this.qAnc = this.ax.map(a => ev.qs[a.k].slice());   // elastic anchors = the entry constraint rotations
    this.ring = new Map(); this.nSlip = 0; this.last = null;
  }
  // A's error / rate definitions (pvp1a_sim.mjs toneCmd; ActuatorLayer ω) on one state
  _errOm(st, ev) { return this.ax.map(a => { if (!a.qr) return null; const q = ev.qs[a.k], qr = a.qr, sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg));
      const R2F2 = Q.mul(st[a.child].rot, a.F2), wrel = V.sub(st[a.child].w, st[a.parent].w); return { err: [2 * dq[0], 2 * dq[1], 2 * dq[2]], om: E.map(e => V.dot(wrel, Q.rot(R2F2, e))) }; }); }
  _eAnc(k, q) { const qa = this.qAnc[k], sg = q[0] * qa[0] + q[1] * qa[1] + q[2] * qa[2] + q[3] * qa[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qa.map(x => x * sg)); return [2 * dq[0], 2 * dq[1], 2 * dq[2]]; }
  command(c, st, ev, n) {
    st = unitStates(st); ev = unitEv(ev); this.ring.set(n, this._errOm(st, ev)); this.ring.delete(n - this.params.L - 2);
    const del = n - this.params.L >= 0 ? this.ring.get(n - this.params.L) : null, h = this.h, cmd = [], info = [];   // n − L < 0: the entry state (err = 0, ω = 0)
    for (const a of this.ax) { if (!a.qr) { cmd[a.k] = null; continue; } const eA = this._eAnc(a.k, ev.qs[a.k]);
      cmd[a.k] = a.rows.map(r => { if (!r) return null; let drive = r.bias;
        if (a.support && del) drive += r.Kr * del[a.k].err[r.i] - (r.Dr + h * r.Kr) * del[a.k].om[r.i];
        info.push([a.k, r.i, drive, eA[r.i]]); return { drive, eAnc: eA[r.i], kP: r.kP, kM: r.kM, I: r.I }; }); }
    this.last = info; return { cmd };
  }
  // after a step: plastic slip of the anchor on every saturated axis (τ_drive + K_i·e_anc = the saturated torque); own readback only
  after(c, st, actRes, n) { if (!actRes || !c.aplan) return; st = unitStates(st); const P = c.P, rots = st.map(s => s.rot), byK = new Map();
    for (const r of actRes) if (r.sat) { const pj = c.aplan.joints.find(p => p.k === r.k), row = pj.rows[r.i]; if (!row || row.off || !(row.K > 0)) continue; (byK.get(r.k) || byK.set(r.k, []).get(r.k)).push({ i: r.i, e: (r.tau - row.drive) / row.K }); }
    for (const [k, list] of byK) { const q = Q.norm(P.qcs(P.jd[k], rots)), e = this._eAnc(k, q); for (const x of list) e[x.i] = x.e; const hv = V.sc(e, 0.5), w2 = 1 - V.dot(hv, hv);
      this.qAnc[k] = Q.norm(Q.mul(q, [hv[0], hv[1], hv[2], Math.sqrt(Math.max(0, w2))])); this.nSlip += list.length; } }
  info() { const plan = this.c.aplan, K = plan ? Object.fromEntries(plan.joints.flatMap(p => p.rows.map((r, i) => (r && !r.off ? [p.k + "_" + i, [r.K, r.D]] : null)).filter(Boolean))) : {};
    return (this.last || []).map(([k, i, drive, eA]) => { const kd = K[k + "_" + i] || [0, 0]; return [k, i, +drive.toFixed(9), +kd[0].toFixed(6), +kd[1].toFixed(6), +(kd[0] * eA).toFixed(6)]; }); }   // [k, i, τ_drive, K_i, D_i, elastic torque]
  meta() { return { params: this.params, slips: this.nSlip }; }
  entryInfo() { const plan = this.c.aplan; return this.ax.flatMap(a => a.rows.filter(Boolean).map(r => { const pr = plan.joints.find(p => p.k === a.k).rows[r.i];
    return { joint: this.c.spec.joints[a.k].name, k: a.k, i: r.i, drive: pr.drive, aP: this.c.act.a[a.k][r.i][0], aM: this.c.act.a[a.k][r.i][1], Ki: pr.K, Di: pr.D, Kr: r.Kr, Dr: r.Dr, I: r.I }; })); }
}
