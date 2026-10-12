// BALANCE-2 successor controller (C2). It EXTENDS the frozen BALANCE-1 BalanceController (balance1/scripts/b1_ctrl.mjs, imported, not copied or
// modified) with only the mechanisms the BALANCE-2 audit diagnosed (BALANCE2_AUDIT.md §6 / §10 C; successor/C2_DESIGN_LOG.md). Everything else —
// delays, channels, gains, groups, knee / support / posture objectives, ML prediction, motor noise, the excitation-only output through canonical
// M1b — is BALANCE-1 B. Causality is inherited: every term reads only the delayed sensor views the base class builds, entry (body-schema)
// constants and the controller's OWN past commands. Each mechanism is switchable (p.b2.*) so the design log can attribute its effect.
//   (1) p.b2.apI     AP integral confined to the quiet-standing regime (anti-windup): the AP COM integral integrates the AP COM error only while
//                    it lies within the human quiet-stance band |x| ≤ band and HOLDS otherwise. The ML integral is unchanged (base class).
//   (2) p.predict.axes[0]  AP prediction with B's internal model; refinements: p.b2.effSupport — the modelled developed AP force is bounded by
//                    what the support can transmit (COP within the functional support, body schema); p.b2.dirMuscle — the efference copy of a
//                    dorsiflexion-direction (negative) AP force uses the canonical dorsiflexor contraction constants.
//   (3) p.b2.hip     ankle → hip transition: the ankle share of the AP COM command is capped where the expected COP reaches the functional support
//                    edge (Kuo & Zajac 1993 flat-foot constraint; Kim 2009 maximum allowable ankle torque); the unmet ankle moment is commanded at
//                    the hips as a shift of the HAT lean set-point (trunk coordination: the HAT loop then holds the strategy instead of fighting
//                    it), bounded by a maximum trunk-lean shift.
const RA = new URL("../../", import.meta.url).href, { BalanceController } = await import(RA + "balance1/scripts/b1_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL;
const ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates } = await import(PL.P2 + "core/v2_math.js");
const G0 = 9.81;
export class SuccessorController extends BalanceController {
  constructor(params) { params = JSON.parse(JSON.stringify(params)); const kI = params.com.kI; super({ ...params, com: { ...params.com, kI: [0, Array.isArray(kI) ? kI[1] : kI] } }); this.kIap = Array.isArray(kI) ? kI[0] : kI; this.ciAP = 0; this.ciAPH = 0;
    this.diag = { gate: [], fI: [], capA: [], capH: [], delta: [], fm: [] }; }
  attach(body, plant, c) { super.attach(body, plant, c); const b2 = this.p.b2 || {}, st = unitStates(c.st), B = c.spec.bodies;
    // entry body schema: COM height above the ankle joint centres, the COP-shift → COM-force factor M·g/h, the functional support (m from the entry COM)
    let m = 0, y = 0; st.forEach((s, i) => { m += B[i].mass; y += B[i].mass * s.com[1]; }); const ank = [this.J.ankL, this.J.ankR].map(k => c.ctrl.jointAt(st, k)[1]);
    // (4) p.b2.hatMap === "pivot": the HAT lean objective's AP gravity-load map at the hips, recomputed with the hip pivot FIXED (the HAT rotated
    //     about the hip-mid lateral axis). The base class derives it by TRANSLATING the HAT bodies, pelvis and hip joint centres included, so the
    //     HAT COM's lever about the hips does not change and the AP map is ≈ 0 (3.4 / 0.9 N·m/m instead of ≈ −m_HAT·g/2 per hip): BALANCE-1's
    //     declared HAT lean loop (kP 1.3, kD 0.45 s, kI 0.17 s⁻¹) is inactive on the hips in AP. Same declared gains; ML column unchanged.
    if (b2.hatMap === "pivot") { const g = this.grp.hat, su = unitStates(st), ja = (k) => c.ctrl.jointAt(su, k), piv = V.sc(V.add(ja(this.J.hipL), ja(this.J.hipR)), 0.5), ang = 1e-3;
      const mx = (S) => { let mm = 0, xx = 0; for (const i of g.bodies) { mm += B[i].mass; xx += B[i].mass * S[i].com[0]; } return xx / mm; }, t0 = ST.staticsG(c, su, [0, -G0, 0]).tff;
      const s2 = ST.rotateBodies(su, g.bodies, piv, [0, 0, 1], ang), t2 = ST.staticsG(c, s2, [0, -G0, 0]).tff, dx = mx(s2) - mx(su);
      this.hatMapOld = g.Jd[0].map(r => r.slice()); g.Jd[0] = g.joints.map(k => t2[k].map((t, i) => (t - t0[k][i]) / dx)); this.hatMapNew = g.Jd[0]; }
    this.hCom = y / m - (ank[0] + ank[1]) / 2;
    // (5) p.b2.comMapAP === "rigid": the AP column of the COM map with the ankle-strategy (rigid rotation about the ankles) proportions instead of
    //     the uniform-translation (static field) ones: each body's share of the commanded COM acceleration ∝ its height above the ankles
    //     (a_i = a·h_i / h_COM; point masses), so the hips / knees carry the segments above them with the legs' rotation (Kuo & Zajac 1993 rigid
    //     ankle strategy; Alexandrov 2005 ankle eigenmovement). The ankle rows are kept identical to BALANCE-1 (same ankle loop gain); only the
    //     knee and hip rows change. Computed once at the entry by the same statics routine with height-weighted masses.
    if (b2.comMapAP === "rigid") { const ay = (ank[0] + ank[1]) / 2, w = st.map(s => Math.max(0, s.com[1] - ay) / this.hCom), Bw = B.map((b, i) => ({ ...b, mass: b.mass * w[i] })), Mw = Bw.reduce((s2, b) => s2 + b.mass, 0);
      const cw = { ...c, spec: { ...c.spec, bodies: Bw }, ctrl: Object.assign(Object.create(Object.getPrototypeOf(c.ctrl)), c.ctrl, { M: Mw }) }, t0 = ST.staticsG(cw, st, [0, -G0, 0]).tff, tx = ST.staticsG(cw, st, [1 / Mw, -G0, 0]).tff;
      const ankS = new Set([this.J.ankL, this.J.ankR]); this.jfOld = this.Jf.map(r => r.map(x => (x ? x.slice() : null)));
      // normalised so that the rigid pattern's ankle torque equals BALANCE-1's (the rigid pattern for the same ankle torque)
      let sA = 0, sW = 0; for (const k of ankS) this.Jf[k].forEach((x, i) => { if (x && this.ax[k][i].key === "df") { sA += x[0]; sW += tx[k][i] - t0[k][i]; } }); const nrm = sA / sW; this.rigidNorm = nrm;
      this.Jf.forEach((r, k) => { if (ankS.has(k)) return; r.forEach((x, i) => { if (!x) return; x[0] = x[0] === 0 ? 0 : (tx[k][i] - t0[k][i]) * nrm; }); }); this.jfNew = this.Jf.map(r => r.map(x => (x ? x.slice() : null))); } this.Gcop = this.M * G0 / this.hCom; this.sup = b2.support || null;
    if (b2.hip) { const g = this.grp.hat, iFlex = g.joints.map(k => this.ax[k].findIndex(x => x && x.key === "flex")); this.hipFlex = g.joints.map((k, jI) => ({ k, i: iFlex[jI], jx: g.Jd[0][jI][iFlex[jI]] }));
      this.sumJx = this.hipFlex.reduce((s, r) => s + Math.abs(r.jx), 0);
      // the direction of the HAT-lean torque at each hip, from the pivot-fixed map (computed here whether or not (4) replaces the loop's map)
      { const su = unitStates(c.st), ja = (k) => c.ctrl.jointAt(su, k), piv = V.sc(V.add(ja(this.J.hipL), ja(this.J.hipR)), 0.5), t0 = ST.staticsG(c, su, [0, -G0, 0]).tff, s2 = ST.rotateBodies(su, g.bodies, piv, [0, 0, 1], 1e-3), t2 = ST.staticsG(c, s2, [0, -G0, 0]).tff;
        let mm = 0, x0 = 0, x2 = 0; for (const i of g.bodies) { mm += B[i].mass; x0 += B[i].mass * su[i].com[0]; x2 += B[i].mass * s2[i].com[0]; } const dx = (x2 - x0) / mm; this.hipFlexDir = this.hipFlex.map(r => ({ ...r, jx: (t2[r.k][r.i] - t0[r.k][r.i]) / dx })); } const arm = g.arm0, L = Math.hypot(arm[0], arm[1]); this.deltaMax = L * Math.sin(b2.hip.thetaMaxDeg * Math.PI / 180); this.armHat = L; } }
  // AP COM state on a channel (delayed; propagated by the internal model when AP prediction is on)
  _apState(O, d) { const e = this.entry; let x = [O.s.com[0] - e.com[0], O.s.com[1] - e.com[1]], v = O.s.comV.slice(); if (this.pred && (this.p.predict.axes || [true, true])[0]) { const [xp, vp] = this._predict(x, v, d); x = xp; v = vp; } return [x[0], v[0]]; }
  // the AP force interval the support can transmit at AP COM offset x (model units): COP shift (F + Ki·x)/(M·g/h) within [−back, +front]
  _cap(x) { const Ki = this.p.predict ? this.p.predict.Ki[0] : 0; return [-this.Gcop * this.sup.back - Ki * x, this.Gcop * this.sup.front - Ki * x]; }
  control(vw) { const p = this.p, b2 = p.b2 || {}, h = this.h, D = p.delays, G = this.mode.ap, hipCh = p.com.hipChannel, pk = (v, j) => (Array.isArray(v) ? v[j] : v);
    const [x, v] = this._apState(vw.com, D.com), [xH, vH] = hipCh ? this._apState(vw[hipCh], D[hipCh]) : [x, v];
    // (1) AP integral, conditional on the quiet-standing band (or unconditional when no band is given = BALANCE-1 behaviour)
    const band = b2.apI ? b2.apI.band : Infinity, inA = Math.abs(x) <= band, inH = Math.abs(xH) <= band; if (inA) this.ciAP += x * h; if (inH) this.ciAPH += xH * h;
    this.fI = G * this.kIap * this.ciAP; this.fIH = hipCh ? G * this.kIap * this.ciAPH : this.fI;
    const out = super.control(vw), eff = p.com.eff || [1, 1], hips = new Set([this.J.hipL, this.J.hipR]);
    this.Jf.forEach((r, k) => r.forEach((jj, i) => { if (!jj) return; out[k][i] += jj[0] * (hips.has(k) ? this.fIH : this.fI) / eff[0]; }));
    // (3) ankle → hip transition
    let capA = 0, capH = 0, delta = 0;
    if (b2.hip) { const Fa = (G * (pk(p.com.kP, 0) * x + pk(p.com.kD, 0) * v) + this.fI) / eff[0], FaH = (G * (pk(p.com.kP, 0) * xH + pk(p.com.kD, 0) * vH) + this.fIH) / eff[0];
      const [lo, hi] = this._cap(x), [loH, hiH] = this._cap(xH); capA = Fa > hi ? Fa - hi : Fa < lo ? Fa - lo : 0; capH = FaH > hiH ? FaH - hiH : FaH < loH ? FaH - loH : 0;
      // the ankle rows of the COM map deliver at most the transmissible force (the base class added jj·Fa; remove the excess)
      if (capA && b2.hip.cap !== false) this.Jf.forEach((r, k) => { if (k !== this.J.ankL && k !== this.J.ankR) return; r.forEach((jj, i) => { if (jj && this.ax[k][i].key === "df") out[k][i] -= jj[0] * capA; }); });
      // the unmet ankle moment (excess force × COM height) is commanded at the hips as a HAT lean set-point shift δ (hip-channel latency)
      const q = p.hat; delta = Math.max(-this.deltaMax, Math.min(this.deltaMax, capH * this.hCom / (q.kP * this.sumJx)));
      if (b2.hip.mode === "direct") { // the unmet ankle moment as hip torque, split between the hips, in the direction that pitches the HAT toward
        // the push (forward-limited → trunk flexes forward: Runge 1999 hip-flexor torque added to ankle plantarflexor torque); sign from the
        // pivot-fixed HAT map (leaning the HAT by +x needs −jx); bounded by the trunk-lean bound through the HAT's observed lean (hat offset)
        const lean = vw[q.channel].s.hat.d[0] - this.entry.hat.d[0], room = Math.abs(lean) < this.deltaMax || Math.sign(lean) !== Math.sign(capH);
        delta = room ? capH * this.hCom : 0; for (const r of this.hipFlexDir) out[r.k][r.i] += -(b2.hip.sign || 1) * Math.sign(r.jx) * delta / this.hipFlexDir.length; }
      else { for (const r of this.hipFlex) out[r.k][r.i] += -q.kP * r.jx * delta;
        if (q.kI && this.grp.hat.I) this.grp.hat.I[0] -= delta * h; } }
    this.diag.gate.push(inA ? 1 : 0); this.diag.fI.push(this.fI); this.diag.capA.push(capA); this.diag.capH.push(capH); this.diag.delta.push(delta);
    this.diag.fm.push(this.pred && this.pred.FmHist && this.pred.FmHist.length ? this.pred.FmHist[this.pred.FmHist.length - 1][0] : 0);
    return out; }
  // efference copy: the AP force includes the integral term the base class no longer computes for AP, minus the ankle share the support cannot
  // transmit (when (3) caps it); (2) direction-specific contraction constants for the AP mode
  _efference(F, FH) { 
    if (this.p.b2 && this.p.b2.dirMuscle && this.pred) { const M = this.p.predict.muscle, last = this.pred.m ? this.pred.m[0].a : 0, neg = last < 0 || (last === 0 && F[0] + (this.fI || 0) < 0); this.p.predict.muscle = [neg ? this.p.b2.dirMuscle.neg : this.p.b2.dirMuscle.pos, M[1]]; }
    super._efference([F[0] + (this.fI || 0), F[1]], [FH[0] + (this.fIH || 0), FH[1]]); }
  // (2) support-aware prediction: the modelled developed AP force cannot exceed what the support transmits at the propagated offset
  _predict(x, v, d) { if (!(this.p.b2 && this.p.b2.effSupport && this.sup)) return super._predict(x, v, d);
    const P = this.pred, h = this.h, Gg = this.p.predict.Gg, Ki = this.p.predict.Ki, Fh = P.FmHist || []; x = x.slice(); v = v.slice();
    for (let s = 0; s < d; s++) { const Fm = Fh.length >= d ? Fh[Fh.length - d + s] : [0, 0]; for (let j = 0; j < 2; j++) { let f = Fm[j]; if (j === 0) { const [lo, hi] = this._cap(x[0]); f = Math.max(lo, Math.min(hi, f)); }
      const a = ((Gg[j] - Ki[j]) * x[j] - f) / this.M; v[j] += a * h; x[j] += v[j] * h; } } return [x, v]; }
  meta() { return { ...super.meta(), successor: "BALANCE-2 C2", kIap: this.kIap, hCom: this.hCom, Gcop: this.Gcop, deltaMax: this.deltaMax || null, hatMapOld: this.hatMapOld || null, hatMapNew: this.hatMapNew || null, jfOld: this.jfOld || null, jfNew: this.jfNew || null, rigidNorm: this.rigidNorm || null }; }
}
