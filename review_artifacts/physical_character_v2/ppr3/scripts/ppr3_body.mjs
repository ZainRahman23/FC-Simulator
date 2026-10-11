// PPR-3 body: the physiological substrate S2 (mechanics that exist NOW) and its neural interface. Nothing here reads contacts, external forces,
// labels, outcomes or the future. The only state-dependent terms that act within a step are MECHANICAL properties of muscle and tissue:
//   • force–length / force–velocity capacity at the current angle and rate (V2's capacity model, unchanged);
//   • short-range (intrinsic) elastic stiffness K = Σ± kθ±·a±·capIso±, about a strain anchor that yields beyond its reserve (plastic slip);
//   • intrinsic damping D = 2ζ√(K_tot·I) (+ passive tissue damping);
//   • mid-range passive tissue elasticity τ_p = −k_p (θ − θ_slack) about the anatomical slack angle (B);
//   • persistent eccentric support (C): the strain force does not vanish when the joint velocity reaches zero; it relaxes at constant length
//     (fast and slow arms) to a persistent residual, and is capped at the summed reserves R⁺ + R⁻ (bidirectional short-range stiffness).
// The NEURAL side is excitation only: u± per axis, a function of (i) the tonic target torque fixed at the entry (rest statics minus the passive
// share) and joint-specific activation floors (standing tone T), and (ii) a correction Δτ supplied by an OPTIONAL controller object (P2) that is
// given sensor samples and must answer from delayed samples only (ppr3_ctrl.mjs enforces and logs this). Activation follows V2's first-order
// activation dynamics (15 / 50 ms). With no controller the excitation is constant: S2 alone.
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const L1 = await import(RA + "ppr1/scripts/ppr1_law.mjs"), SUB = await import(RA + "ppr2/scripts/ppr2_substrate.mjs"), STS = await import(new URL("./ppr3_statics.mjs", import.meta.url).href);
const { activationStep } = await import(P2 + "spec/v2_actuators.js"), { ACT } = await import(P2 + "sim/v2_actuation.js"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"], D2R = Math.PI / 180;
// minimal activations meeting the floors with net torque τ: a+·c+ − a−·c− = τ, a± ≥ f± (co-contraction preserved, no extra net torque)
export function solveFloors(tau, fP, fM, cP, cM) { if (tau >= 0) { const aP = Math.max(fP, (tau + fM * cM) / cP); return [Math.min(1, aP), Math.min(1, Math.max(fM, (aP * cP - tau) / cM))]; }
  const aM = Math.max(fM, (-tau + fP * cP) / cM); return [Math.min(1, Math.max(fP, (aM * cM + tau) / cP)), Math.min(1, aM)]; }
export class S2Actuator extends L1.PreReflexActuator {
  compute(st, ev, cmd, dt, init = false) {
    st = unitStates(st); ev = unitEv(ev); const P = this.P, out = [], zeta = this.pp.zeta;
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const kneeDeg = this.kneeOf[k] != null ? P.anat(P.jd[this.kneeOf[k]], ev.qs[this.kneeOf[k]], "flex") : null;
      const rows = KEYS.map((key, i) => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key), isoP = this.capFull(x, 1, anat, 0, kneeDeg), isoM = this.capFull(x, -1, anat, 0, kneeDeg);
        const capP = this.capFull(x, 1, anat, w, kneeDeg), capM = this.capFull(x, -1, anat, -w, kneeDeg);
        const a = this.a[k][i]; if (init) { a[0] = c.uP; a[1] = c.uM; } else { a[0] = activationStep(a[0], c.uP, dt); a[1] = activationStep(a[1], c.uM, dt); }
        const drive = a[0] * isoP - a[1] * isoM;                                   // net active torque at the current angle (force–length: mechanical)
        const K = c.kP * a[0] * isoP + c.kM * a[1] * isoM, Kp = c.kp || 0, Ktot = K + Kp, D = Math.max(ACT.D_MIN, 2 * zeta * Math.sqrt(Ktot * c.I) + (c.dp || 0));
        const tauP = c.tauP || 0, tauE = K * c.eAnc, tau0 = drive + tauE + tauP, req = tau0 - (D + dt * Ktot) * w;
        // short-range stiffness is BIDIRECTIONAL (Huxley & Simmons): a displacement stretches one side (force rises up to its reserve R) and shortens
        // the other (force falls up to ITS reserve); the window is extended only by the stretched side's share (the shortening side's force drop
        // already lies inside [−a⁻cap⁻, +a⁺cap⁺]); the summed strain force is capped at R⁺ + R⁻ in S2Law.after (yield at θ_y in both directions)
        const Kps = c.kP * a[0] * isoP, Kms = c.kM * a[1] * isoM, Rp = (c.ePs - 1) * a[0] * isoP, Rm = (c.eMs - 1) * a[1] * isoM;
        const hiE = Math.min(Math.max(tauE * Kps / Math.max(1e-12, K), 0), Rp), loE = Math.max(Math.min(tauE * Kms / Math.max(1e-12, K), 0), -Rm);   // C: persistent strain force
        return { K: Ktot, Kmus: K, Kp, D, tau0, req, capP, capM, hi: a[0] * capP + tauP + hiE, lo: -a[1] * capM + tauP + loE, w, anat, drive, tauP, tauE, Rp, Rm, uP: c.uP, uM: c.uM, aP: a[0], aM: a[1] }; });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false }); }
}
export class S2Law {
  // params: { id, zeta, thetaYdeg{fam}, floors{ "fam.key": { pos, neg } } (activation floor of the muscles producing the ANATOMICAL positive /
  // negative direction, e.g. hip.abd pos = abductors; mapped to the constraint-parameter sides through the axis sign s), floorDefault,
  // passive{ "fam.key": { k, slackDeg, d } }, ecc: { fRes, wS, wF, tauS, tauF } (C persistence; omitted → PPR-2's indefinite hold, fRes = 1) }
  constructor(plant, c, params, ctrl = null) {
    this.plant = plant; this.c = c; this.sp = params; this.ctrl = ctrl; this.h = plant.dt; const spec = c.spec, B = spec.bodies, P = c.P, st = c.st, ev = c.up.ev, old = c.act;
    c.act = new S2Actuator(spec, c.view, P, { zeta: params.zeta }); c.act.ax = old.ax; c.overCap0 = 0; const act = c.act;
    const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    const jointAt = (k) => { const j = spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); };
    const Iaxis = (ids, o, u) => ids.reduce((s, i) => { const R = st[i].rot, Il = B[i].inertia, ul = Q.rot(Q.conj(R), u), Iu = [0, 1, 2].map(r => Il[r][0] * ul[0] + Il[r][1] * ul[1] + Il[r][2] * ul[2]), d = V.sub(st[i].com, o);
      return s + V.dot(ul, Iu) + B[i].mass * (V.dot(d, d) - V.dot(d, u) ** 2); }, 0);
    // rest statics (PPR-2 A2) with the inward pair between the feet chosen by minimum squared activation (params.frontalPair = "minEffort") or
    // PPR-2's PostureDriver-derived pair ("pd")
    const capsMean = spec.joints.map((j, k) => [0, 1, 2].map(i => { const x = act.ax[k][i]; if (!x) return null; const d = P.jd[k], an = P.anat(d, ev.qs[k], x.key), kk = act.kneeOf[k], kd = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null; return (act.capFull(x, 1, an, 0, kd) + act.capFull(x, -1, an, 0, kd)) / 2; }));
    this.rest = params.frontalPair === "minEffort" ? STS.minEffortStatics(c, st, capsMean) : SUB.restStatics(c, st);
    this.ax = spec.joints.map((j, k) => { const fam = j.name.replace(/_[LR]$/, ""), d = P.jd[k], R2F2 = Q.mul(st[d.child].rot, d.F2), at = jointAt(k), kneeK = act.kneeOf[k], kneeDeg = kneeK != null ? P.anat(P.jd[kneeK], ev.qs[kneeK], "flex") : null;
      const rows = [0, 1, 2].map(i => { const x = act.ax[k][i]; if (!x) return null; const key = x.key, anat = P.anat(d, ev.qs[k], key), cP = act.capFull(x, 1, anat, 0, kneeDeg), cM = act.capFull(x, -1, anat, 0, kneeDeg);
        const pv = (params.passive && params.passive[fam + "." + key]) || null, kp = pv ? pv.k : 0, slack = pv ? pv.slackDeg : 0, dp = pv ? pv.d || 0 : 0, tauPentry = -kp * (anat - slack) * D2R * x.s;
        const fa = (params.floors && params.floors[fam + "." + key]) || { pos: params.floorDefault, neg: params.floorDefault }, fl = x.s > 0 ? [fa.pos, fa.neg] : [fa.neg, fa.pos], thY = params.thetaYdeg[fam] * D2R;
        const tauStatic = this.rest.tff[k][i] - tauPentry, u0 = solveFloors(tauStatic, fl[0], fl[1], cP, cM);
        return { i, key, s: x.s, fam, cP, cM, fl, tauStatic, tauPentry, u0, kp, slack, dp, kP: (x.plus.cap.e - 1) / thY, kM: (x.minus.cap.e - 1) / thY, ePs: x.plus.cap.e, eMs: x.minus.cap.e, I: Iaxis(sub(j.childIndex), at, Q.rot(R2F2, E[i])), anat0: anat }; });
      return { k, fam, name: j.name, rows, any: rows.some(Boolean) }; });
    // C — the strain element as a generalised Maxwell body (ECCENTRIC_PERSISTENCE_DAMPING_LITERATURE §recommendation): instantaneous stiffness K
    // split into a persistent arm (fRes, residual force enhancement) and two relaxing arms (wF, τF; wS, τS) whose stretch-induced force decays at
    // constant length; every arm sees the same joint motion; the summed strain force is capped at the reserve R± = (e± − 1)·a±·capIso± (yield:
    // all arms scaled to the cap — plastic slip). Strains are measured from the entry rotation of each joint (small-angle, 2·vec(q⁻¹q_ref)).
    const ec = params.ecc || { fRes: 1, wS: 0, wF: 0, tauS: 1, tauF: 1 }; this.ecc = ec; this.decayF = Math.exp(-this.h / ec.tauF); this.decayS = Math.exp(-this.h / ec.tauS);
    this.qRef = this.ax.map(a => ev.qs[a.k].slice()); this.arms = this.ax.map(() => [0, 1, 2].map(() => ({ r: 0, s: 0, f: 0 }))); this.ePrev = this.ax.map(() => [0, 0, 0]);
    this.eEff = this.ax.map(() => [0, 0, 0]); this.nSlip = 0; this.last = null;
    if (this.ctrl) this.ctrl.attach(this, plant, c);
  }
  _eAnc(k, q) { const qa = this.qRef[k], sg = q[0] * qa[0] + q[1] * qa[1] + q[2] * qa[2] + q[3] * qa[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qa.map(x => x * sg)); return [2 * dq[0], 2 * dq[1], 2 * dq[2]]; }
  command(c, st, ev, n) { st = unitStates(st); ev = unitEv(ev); const P = c.P, cmd = [], info = [];
    const dTau = this.ctrl ? this.ctrl.step(n, st, ev) : null;          // P2: observes the current sample, answers from delayed samples only (enforced there)
    for (const a of this.ax) { if (!a.any) { cmd[a.k] = null; continue; } const eA = this.eEff[a.k];
      cmd[a.k] = a.rows.map((r, i) => { if (!r) return null; const anat = P.anat(P.jd[a.k], ev.qs[a.k], r.key), tauP = -r.kp * (anat - r.slack) * D2R * r.s;
        const dt = dTau && dTau[a.k] ? dTau[a.k][i] || 0 : 0, tgt = r.tauStatic + dt, u = dt === 0 ? r.u0 : solveFloors(tgt, r.fl[0], r.fl[1], r.cP, r.cM);
        info.push([a.k, i, tgt, u[0], u[1], eA[i], tauP, dt]); return { uP: u[0], uM: u[1], eAnc: eA[i], kP: r.kP, kM: r.kM, I: r.I, kp: r.kp, dp: r.dp, tauP, ePs: r.ePs, eMs: r.eMs }; }); }
    this.last = info; return { cmd }; }
  // after a step (own state + own readback only): every arm takes the joint's strain increment; the relaxing arms decay at constant length; the
  // summed strain force is capped at the reserve (yield → plastic slip of every arm in proportion)
  after(c, st, actRes, n) { if (!c.aplan) return; st = unitStates(st); const P = c.P, rots = st.map(s => s.rot), ec = this.ecc;
    for (const a of this.ax) { if (!a.any) continue; const pj = c.aplan.joints.find(p => p.k === a.k), q = Q.norm(P.qcs(P.jd[a.k], rots)), e = this._eAnc(a.k, q);
      a.rows.forEach((r, i) => { if (!r) return; const row = pj.rows[i], A = this.arms[a.k][i], de = e[i] - this.ePrev[a.k][i]; this.ePrev[a.k][i] = e[i];
        A.r += de; A.s = (A.s + de) * this.decayS; A.f = (A.f + de) * this.decayF; let eff = ec.fRes * A.r + ec.wS * A.s + ec.wF * A.f;
        if (row && !row.off && row.Kmus > 0) { const tauE = row.Kmus * eff, cap = row.Rp + row.Rm; if (Math.abs(tauE) > cap) { const sc = cap / Math.abs(tauE); A.r *= sc; A.s *= sc; A.f *= sc; eff *= sc; this.nSlip++; } }
        this.eEff[a.k][i] = eff; }); }
    if (this.ctrl && this.ctrl.after) this.ctrl.after(n, st); }
  // per axis: [k, i, τ_target, u+, u−, a+, a−, K_mus, D, τ_elastic, τ_passive, drive, Δτ_P2, R+, R−]
  info() { const plan = this.c.aplan, M = plan ? Object.fromEntries(plan.joints.flatMap(p => p.rows.map((r, i) => (r && !r.off ? [p.k + "_" + i, r] : null)).filter(Boolean))) : {};
    return (this.last || []).map(([k, i, tgt, uP, uM, eA, tauP, dt]) => { const r = M[k + "_" + i] || {}; return [k, i, +tgt.toFixed(6), +uP.toFixed(6), +uM.toFixed(6), +(r.aP ?? 0).toFixed(6), +(r.aM ?? 0).toFixed(6), +(r.Kmus ?? 0).toFixed(4), +(r.D ?? 0).toFixed(4), +((r.Kmus ?? 0) * eA).toFixed(5), +tauP.toFixed(5), +(r.drive ?? 0).toFixed(5), +dt.toFixed(6), +(r.Rp ?? 0).toFixed(4), +(r.Rm ?? 0).toFixed(4)]; }); }
  meta() { return { params: this.sp, slips: this.nSlip, ctrl: this.ctrl ? this.ctrl.meta() : null }; }
  entryInfo() { return this.ax.flatMap(a => a.rows.filter(Boolean).map(r => ({ joint: a.name, key: r.key, k: a.k, i: r.i, tauStatic: r.tauStatic, tauPentry: r.tauPentry, u0: r.u0, floors: r.fl, capIso: [r.cP, r.cM], I: r.I }))); }
}
