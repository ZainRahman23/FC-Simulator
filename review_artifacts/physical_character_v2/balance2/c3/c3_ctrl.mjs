// BALANCE-2 successor C3 (owner decision 2026-10-12 22:12: rigid boot-tip support is not legitimate toe support; C3 must respect the current rigid
// foot's legitimate support envelope). It EXTENDS the frozen C2 SuccessorController (successor/b2_ctrl.mjs, imported, not copied or modified),
// which itself extends the frozen BALANCE-1 BalanceController. C3 keeps C2's three mechanisms unchanged — (1) the AP integral confined to the
// quiet-standing band, (2) the support-aware AP internal model, (3) direction-specific contraction constants in the AP efference copy — and adds ONE:
//   (4) p.c3.governor  SUPPORT-ENVELOPE GOVERNOR on the AP COM command. C2's internal model already knows the flat-foot support envelope (COP shift
//       (F + K_i·x)/(M·g/h) within [−back, +front] = [−124.76, +64.8] mm, B2_GEOMETRY.json: heel edge / oblique MTP pivot line; Kim 2009 maximum
//       allowable flat-foot ankle torque) but used it only to PREDICT; the command could exceed it, and the excess pitched the rigid boot onto its tip.
//       C3 uses the SAME envelope and the SAME efference-copy muscle model to bound the COMMAND: the AP COM force command (ankle, knee and hip rows
//       of the COM map together, so the coordination pattern is kept) is reduced to the largest value whose modelled consequence stays inside the
//       envelope at the propagated AP offset. Modes (one is adopted on DEV, C3_DESIGN_LOG.md):
//         "command"     the command itself is clamped to the envelope (C2 design log D5 V5cap analogue; known to remove lead)
//         "activation"  the modelled activation (delay → activation stage) must stay inside the envelope over the horizon
//         "force"       the modelled DEVELOPED force (delay → activation → contraction) must stay inside the envelope over the horizon: the command
//                       may lead the force (as muscle lag requires) but never so far that the developed force leaves the flat-foot envelope
//       Horizon check: the candidate command for this step, then the envelope bound held ("safe continuation", reference-governor logic: Gilbert &
//       Kolmanovsky 2002); bisection for the largest admissible command (the modelled response is monotone in the command). It never increases a
//       command, never reverses one, and never touches the ML axis or any other objective.
// Causality: the governor reads the controller's OWN efference-copy state and the delayed, model-propagated AP offset only (the same inputs C2's
// prediction already uses); no plant, contact, force or outcome input. The COM-map Jacobian, the envelope and the muscle constants are entry / body-
// schema constants. Nothing is tuned: no gain, delay or support constant differs from C2.
const RA = new URL("../../", import.meta.url).href, { SuccessorController } = await import(RA + "balance2/successor/b2_ctrl.mjs");
export class C3Controller extends SuccessorController {
  constructor(params) { super(params); const g = (this.p.c3 || {}).governor || null; this.gov = g; this.diag.g = []; this.diag.gH = []; this.diag.u = []; this.diag.lim = []; this.govStats = { limited: 0, residual: 0, steps: 0 }; }
  // the model's response to candidate command u this step, then the continuation command c held; returns the extreme of the checked stage
  _sim(u, c, K) { const P = this.pred, s0 = P.m ? P.m[0] : { line: [], a: 0, f: 0 }, h = this.h, dm = this.p.b2 && this.p.b2.dirMuscle, base = this.p.predict.muscle[0];
    const line = s0.line.slice(); let a = s0.a, f = s0.f, hi = -Infinity, lo = Infinity;
    for (let k = 0; k < K; k++) { const pushed = k === 0 ? u : c; const mu = dm ? ((a < 0 || (a === 0 && pushed < 0)) ? dm.neg : dm.pos) : base; line.push(pushed); const ud = line.length > 2 ? line.shift() : 0;
      a = ud + (a - ud) * Math.exp(-h / (Math.abs(ud) > Math.abs(a) ? 0.015 : 0.050)); f = a + (f - a) * Math.exp(-h / (Math.abs(a) > Math.abs(f) ? mu.rise : mu.fall));
      const v = this.gov.mode === "activation" ? a : f; if (v > hi) hi = v; if (v < lo) lo = v; }
    return [lo, hi]; }
  // the governed AP COM command for desired total u (N), envelope [L, H] (N) at the propagated offset
  _govern(u, L, H) { const g = this.gov; if (!g) return u; if (g.mode === "command") return Math.max(L, Math.min(H, u));
    const K = g.horizonSteps, tol = g.tolN, ok = (x) => { const c = Math.max(L, Math.min(H, x)), [lo, hi] = this._sim(x, c, K); return hi <= H + tol && lo >= L - tol; };
    if (ok(u)) return u;
    if (u > H) { if (!ok(H)) { this.govStats.residual++; return H; } let a = H, b = u; for (let i = 0; i < g.iters; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; }
    if (u < L) { if (!ok(L)) { this.govStats.residual++; return L; } let a = L, b = u; for (let i = 0; i < g.iters; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; }
    this.govStats.residual++; return u; } // inside the envelope but a queued command still overshoots: never reverse; counted
  control(vw) { if (!this.gov) return super.control(vw);
    this.xg = this._apState(vw.com, this.p.delays.com)[0]; this.govOut = null; const out = super.control(vw);
    if (this.govOut) { const { Ftot, g, FHtot, gH } = this.govOut, eff = (this.p.com.eff || [1, 1])[0], hips = new Set([this.J.hipL, this.J.hipR]);
      this.Jf.forEach((r, k) => r.forEach((jj, i) => { if (!jj) return; out[k][i] -= jj[0] * (hips.has(k) ? FHtot - gH : Ftot - g) / eff; })); }
    return out; }
  // efference copy of the GOVERNED command (C2 adds its AP integral term to F[0]; the governor acts on that total)
  _efference(F, FH) { if (!this.gov) return super._efference(F, FH);
    const fI = this.fI || 0, fIH = this.fIH || 0, Ftot = F[0] + fI, FHtot = FH[0] + fIH, [L, H] = this._cap(this.xg), g = this._govern(Ftot, L, H), gH = this._govern(FHtot, L, H);
    this.govStats.steps++; if (g !== Ftot || gH !== FHtot) this.govStats.limited++; this.govOut = { Ftot, g, FHtot, gH };
    this.diag.u.push(Ftot); this.diag.g.push(g); this.diag.gH.push(gH); this.diag.lim.push(H);
    super._efference([g - fI, F[1]], [gH - fIH, FH[1]]); }
  meta() { return { ...super.meta(), successor: "BALANCE-2 C3", governor: this.gov, govStats: this.govStats }; }
}
