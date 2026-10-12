// MUSCLE-1 standalone axis models (one actuator axis, prescribed or 1-DOF kinematics). Each model turns the SAME neural command and the SAME
// kinematics into joint torque, so actuators can be compared on identical inputs. Equations are those of the frozen code, re-evaluated here:
//   V2ENV  CURRENT V2's canonical actuator (sandbox/visual/physchar2/sim/v2_actuation.js ActuatorLayer): the controller requests an implicit PD
//          τ = τ0 − (D + dt·K)·ω_end; excitation u = min(1, |req|(1 + 0.25)/cap + 0.02) on the request's side, 0.02 on the other; first-order
//          activation 15 / 50 ms; the motor delivers the request clipped to the activation envelope [−a⁻cap⁻(θ, ω), +a⁺cap⁺(θ, ω)].
//   V2ACT  PPR-3's S2 actuator (ppr3/scripts/ppr3_body.mjs S2Actuator + S2Law.after): excitation u± from the command (solveFloors), first-order
//          activation 15 / 50 ms, active torque a⁺·capIso⁺(θ) − a⁻·capIso⁻(θ); intrinsic K = kP·a⁺·capIso⁺ + kM·a⁻·capIso⁻ on C's Maxwell strain arms
//          (secant: τ_E = K·e_eff); passive B; D = 2ζ√(K_tot·I); window hi / lo; motor τ = clamp(τ0 − (D + dt·K_tot)·ω_end, lo, hi).
//   M1     the MUSCLE-1 candidate (defined in MUSCLE1_DESIGN.md; constants frozen in params/MUSCLE1_CANDIDATE.json).
// Every model returns the torque decomposition per step: active (neural path), elastic (strain arms), passive (B), damping, window clamp.
const RA = new URL("../../", import.meta.url), { solveFloors } = await import(new URL("ppr3/scripts/ppr3_body.mjs", RA).href);
const PL = await import(new URL("pvp1/scripts/pvp1a_lib.mjs", RA).href), AV = await import(PL.P2 + "spec/v2_actuators.js"), { ACT } = await import(PL.P2 + "sim/v2_actuation.js");
const D2R = Math.PI / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), dexp = (x) => Math.exp(x);
export const actStep = AV.activationStep;                                                                     // V2: τ_act 15 ms / τ_deact 50 ms (Thelen 2003)
export { solveFloors };
// first-order step with separate rise / fall constants (exact exponential)
export const lagStep = (y, x, dt, tUp, tDn) => x + (y - x) * dexp(-dt / (x > y ? tUp : tDn));
// ── shared mechanical pathway (immediate): passive B, damping, the window clamp ──
const passiveB = (kit, anat) => -kit.kp * (anat - kit.slack) * D2R * kit.s;
// ═══ V2ACT: S2's actuator, exactly ═══
export class V2ActAxis {
  constructor(kit, opt = {}) { this.kit = kit; this.id = "V2ACT"; this.a = [kit.u0[0], kit.u0[1]]; this.arms = { r: 0, s: 0, f: 0 }; this.eEff = 0; this.ePrev = opt.e0 ?? 0; this.row = null;
    this.Kprev = null; this.diss = { relax: 0, detach: 0, slip: 0 }; this.created = 0; }                       // energy bookkeeping (measurement only)
  // the secant law's stored energy: arm j carries w_j·K·strain_j, so E_j = ½·w_j·K·strain_j²
  _E(K) { const ec = this.kit.ecc, A = this.arms; return 0.5 * K * (ec.fRes * A.r * A.r + ec.wS * A.s * A.s + ec.wF * A.f * A.f); }
  storedElastic() { return this.row ? this._E(this.row.Kmus) : 0; }
  // command → excitation exactly as S2Law.command (Δτ from a controller on top of the tonic target)
  excite(dTau) { const k = this.kit; return dTau === 0 ? k.u0 : solveFloors(k.tauStatic + dTau, k.fl[0], k.fl[1], k.cP, k.cM); }
  plan(inp, init = false) { const k = this.kit, dt = k.dt, a = this.a, u = inp.u || this.excite(inp.dTau || 0);
    if (init) { a[0] = u[0]; a[1] = u[1]; } else { a[0] = actStep(a[0], u[0], dt); a[1] = actStep(a[1], u[1], dt); } return this._row(inp, u, a[0], a[1], a[0], a[1]); }
  // the S2 row for activation-side forces (FP, FM: the force state used for the active torque) and stiffness-side states (SP, SM)
  _row(inp, u, FP, FM, SP, SM) { const k = this.kit, dt = k.dt, w = inp.w, anat = inp.anat, kd = inp.kneeDeg;
    const isoP = k.capFull(1, anat, 0, kd), isoM = k.capFull(-1, anat, 0, kd), capP = k.capFull(1, anat, w, kd), capM = k.capFull(-1, anat, -w, kd);
    const drive = FP * isoP - FM * isoM, Kmus = k.kP * SP * isoP + k.kM * SM * isoM, Ktot = Kmus + k.kp, D = Math.max(k.Dmin, 2 * k.zeta * Math.sqrt(Ktot * k.I) + (k.dp || 0));
    const tauP = passiveB(k, anat), tauE = this._tauE(Kmus), tau0 = drive + tauE + tauP, req = tau0 - (D + dt * Ktot) * w;
    const Kps = k.kP * SP * isoP, Kms = k.kM * SM * isoM, Rp = (k.ePs - 1) * SP * isoP, Rm = (k.eMs - 1) * SM * isoM;
    let hiE = Math.min(Math.max(tauE * Kps / Math.max(1e-12, Kmus), 0), Rp), loE = Math.max(Math.min(tauE * Kms / Math.max(1e-12, Kmus), 0), -Rm);
    // MUSCLE-1 window ("reserve"): a side that is NOT shortening at plan time (isometric or lengthening) has its short-range / eccentric reserve available
    // within the step — bounded by its eccentric plateau e·f·capIso (one reserve, not force–velocity plus strain on top). A shortening side keeps S2's rule
    // (concentric force–velocity clamp unchanged). S2 ("s2"): the stretched side's extension is only the strain torque that existed at plan time.
    if (this.windowMode === "reserve") { if (w <= 0) hiE = Math.max(hiE, Math.min(Rp, k.ePs * FP * isoP - FP * capP)); if (w >= 0) loE = Math.min(loE, -Math.min(Rm, k.eMs * FM * isoM - FM * capM)); }
    return (this.row = { u, FP, FM, SP, SM, isoP, isoM, capP, capM, drive, Kmus, Ktot, D, tauP, tauE, tau0, req, w, Rp, Rm, hi: FP * capP + tauP + hiE, lo: -FM * capM + tauP + loE }); }
  _tauE(Kmus) { return Kmus * this.eEff; }                                                                  // secant: the CURRENT K times the arms' strain
  // the torque the motor delivers during the step, given the end-of-step axis rate (implicit PD, Jolt motor encoding), with its decomposition
  torque(wEnd) { const r = this.row, k = this.kit, raw = r.tau0 - (r.D + k.dt * r.Ktot) * wEnd, tau = clamp(raw, r.lo, r.hi);
    return { tau, active: r.drive, elastic: r.tauE, passive: r.tauP, damping: -(r.D + k.dt * r.Ktot) * wEnd, clamp: tau - raw, sat: tau !== raw ? 1 : 0 }; }
  // after the step: every arm takes the strain increment; relaxing arms decay at constant length; summed strain force capped at R⁺ + R⁻ (yield)
  after(e) { const k = this.kit, ec = k.ecc, A = this.arms, r = this.row, de = e - this.ePrev; this.ePrev = e; let slip = 0; const K = r ? r.Kmus : 0;
    if (this.Kprev != null) this.created += this._E(K) - this._E(this.Kprev);                                  // stored energy changed by a stiffness change with NO motion
    this.Kprev = K; A.r += de; A.s += de; A.f += de; const E1 = this._E(K); A.s *= k.decayS; A.f *= k.decayF; this.diss.relax += E1 - this._E(K);
    let eff = ec.fRes * A.r + ec.wS * A.s + ec.wF * A.f;
    if (r && r.Kmus > 0) { const tE = r.Kmus * eff, cap = r.Rp + r.Rm; if (Math.abs(tE) > cap) { const sc = cap / Math.abs(tE), Eb = this._E(K); A.r *= sc; A.s *= sc; A.f *= sc; eff *= sc; this.diss.slip += Eb - this._E(K); slip = 1; } }
    this.eEff = eff; return { slip }; }
  state() { return [this.a[0], this.a[1], this.arms.r, this.arms.s, this.arms.f, this.eEff, this.ePrev]; }
}
// ═══ V2ENV: CURRENT V2's canonical actuator law (request delivered within the activation envelope) ═══
export class V2EnvAxis {
  constructor(kit, opt = {}) { this.kit = kit; this.id = "V2ENV"; this.a = opt.a0 ? opt.a0.slice() : [ACT.U_TONE, ACT.U_TONE]; this.row = null; }
  // cmd = { tau0, K, D } (the controller's implicit PD request), inp = { anat, w, kneeDeg }
  plan(inp, cmd) { const k = this.kit, dt = k.dt, w = inp.w, K = Math.max(0, cmd.K || 0), D = Math.max(ACT.D_MIN, cmd.D || 0), capP = k.capFull(1, inp.anat, w, inp.kneeDeg), capM = k.capFull(-1, inp.anat, -w, inp.kneeDeg);
    const req = cmd.tau0 - (D + dt * K) * w, uP = req > 0 ? Math.min(1, req * (1 + ACT.U_MARGIN) / Math.max(1e-9, capP) + ACT.U_TONE) : ACT.U_TONE, uM = req < 0 ? Math.min(1, -req * (1 + ACT.U_MARGIN) / Math.max(1e-9, capM) + ACT.U_TONE) : ACT.U_TONE;
    const a = this.a; a[0] = actStep(a[0], uP, dt); a[1] = actStep(a[1], uM, dt); return (this.row = { u: [uP, uM], K, D, tau0: cmd.tau0, req, capP, capM, hi: a[0] * capP, lo: -a[1] * capM, aP: a[0], aM: a[1] }); }
  torque(wEnd) { const r = this.row, raw = r.tau0 - (r.D + this.kit.dt * r.K) * wEnd, tau = clamp(raw, r.lo, r.hi); return { tau, active: tau, elastic: 0, passive: 0, damping: 0, clamp: tau - raw, sat: tau !== raw ? 1 : 0 }; }
  after() { return { slip: 0 }; }
  state() { return [this.a[0], this.a[1]]; }
}
// ═══ M1: the MUSCLE-1 candidate (MUSCLE1_DESIGN.md §3; constants params/MUSCLE1_CANDIDATE.json) ═══
// Neural pathway (delayed): u± → activation a± (V2's 15 / 50 ms, kept) → developed force f± (contraction dynamics: first-order lag, τc,rise while
// f < a, τc,fall while f > a; per muscle group) → active torque f⁺·capIso⁺(θ) − f⁻·capIso⁻(θ).
// Mechanical pathway (immediate, no neural lag): force–length (capIso at the CURRENT angle), force–velocity (window on f·cap(θ, ω)), short-range
// stiffness K = kP·f⁺·capIso⁺ + kM·f⁻·capIso⁻ (proportional to DEVELOPED force, not activation), passive B, damping D = 2ζ√(K_tot·I).
// C redesigned (history-consistent strain arms): each arm holds a FORCE, not a strain. A joint increment Δe loads arm j by w_j·K·Δe (incremental
// stiffness); relaxing arms decay at constant length; when developed force falls, strained bridges detach in proportion (arm forces × f_new/f_old,
// the stored energy dissipated); when developed force rises, new bridges attach UNSTRAINED (arm forces unchanged); the summed arm force is capped at
// R⁺ + R⁻ (yield, plastic slip). Hence: no energy from activation changes; enhancement abolished when force returns to zero.
export class M1Axis extends V2ActAxis {
  constructor(kit, params, opt = {}) { super(kit, opt); this.id = "M1"; this.p = params; this.windowMode = "reserve"; const k = kit, grp = (dir) => params.groups[params.dirToGroup[k.fam][dir]];
    this.tc = [grp(k.x.plus.dir), grp(k.x.minus.dir)].map(g => ({ up: g.tauRiseMs / 1000, dn: g.tauFallMs / 1000 })); this.f = [k.u0[0], k.u0[1]];
    this.F = { r: 0, s: 0, f: 0 }; this.Kf = null; this.energy = { r: 0, s: 0, f: 0 }; this.diss = { relax: 0, detach: 0, slip: 0 }; this.created = 0; }
  plan(inp, init = false) { const k = this.kit, dt = k.dt, a = this.a, f = this.f, u = inp.u || this.excite(inp.dTau || 0);
    if (init) { a[0] = f[0] = u[0]; a[1] = f[1] = u[1]; } else { a[0] = actStep(a[0], u[0], dt); a[1] = actStep(a[1], u[1], dt);
      f[0] = lagStep(f[0], a[0], dt, this.tc[0].up, this.tc[0].dn); f[1] = lagStep(f[1], a[1], dt, this.tc[1].up, this.tc[1].dn); }
    // detachment / attachment by the developed-force state (entry capacities, so force–length changes count as mechanics, not recruitment): when
    // developed force falls, strained bridges detach in proportion (arm forces and their stored energy × f_new/f_old, the energy dissipated);
    // when it rises, new bridges attach unstrained (no change). Applied before the row, so the strain torque that acts this step is post-detachment.
    const Kf = k.kP * f[0] * k.cP + k.kM * f[1] * k.cM; if (this.Kf != null && Kf < this.Kf) { const kap = Kf / this.Kf; for (const j of ["r", "s", "f"]) { this.F[j] *= kap; this.diss.detach += (1 - kap) * this.energy[j]; this.energy[j] *= kap; } } this.Kf = Kf;
    return this._row(inp, u, f[0], f[1], f[0], f[1]); }
  _tauE() { return this.F.r + this.F.s + this.F.f; }                                                       // the arms' forces (history), not K × strain
  after(e) { const k = this.kit, ec = k.ecc, A = this.F, r = this.row, de = e - this.ePrev, W = { r: ec.fRes, s: ec.wS, f: ec.wF }, d = { r: 1, s: k.decayS, f: k.decayF }; this.ePrev = e; let slip = 0;
    const K = r ? r.Kmus : 0;
    for (const j of ["r", "s", "f"]) { const kj = W[j] * K, F0 = A[j], F1 = F0 + kj * de; this.energy[j] += 0.5 * (F0 + F1) * de; A[j] = F1 * d[j]; const loss = (1 - d[j] * d[j]) * this.energy[j]; this.diss.relax += loss; this.energy[j] -= loss; }
    if (r && r.Kmus > 0) { const tE = A.r + A.s + A.f, cap = r.Rp + r.Rm; if (Math.abs(tE) > cap) { const sc = cap / Math.abs(tE); for (const j of ["r", "s", "f"]) { A[j] *= sc; const loss = (1 - sc * sc) * this.energy[j]; this.diss.slip += loss; this.energy[j] -= loss; } slip = 1; } }
    this.eEff = (A.r + A.s + A.f) / Math.max(1e-12, K); return { slip }; }
  storedElastic() { return this.energy.r + this.energy.s + this.energy.f; }
  state() { return [this.a[0], this.a[1], this.f[0], this.f[1], this.F.r, this.F.s, this.F.f, this.ePrev, this.Kf ?? 0]; }
}
// ═══ M1a (ablation, reported only): ONLY the force-production change — V2ACT with active torque, stiffness and window on the developed force f (same
// contraction lags as M1), but S2's window rule and S2's secant strain arms. Separates the force-production layer from M1's two mechanical corrections.
export class M1aAxis extends V2ActAxis {
  constructor(kit, params, opt = {}) { super(kit, opt); this.id = "M1a"; const k = kit, grp = (dir) => params.groups[params.dirToGroup[k.fam][dir]];
    this.tc = [grp(k.x.plus.dir), grp(k.x.minus.dir)].map(g => ({ up: g.tauRiseMs / 1000, dn: g.tauFallMs / 1000 })); this.f = [k.u0[0], k.u0[1]]; }
  plan(inp, init = false) { const k = this.kit, dt = k.dt, a = this.a, f = this.f, u = inp.u || this.excite(inp.dTau || 0);
    if (init) { a[0] = f[0] = u[0]; a[1] = f[1] = u[1]; } else { a[0] = actStep(a[0], u[0], dt); a[1] = actStep(a[1], u[1], dt);
      f[0] = lagStep(f[0], a[0], dt, this.tc[0].up, this.tc[0].dn); f[1] = lagStep(f[1], a[1], dt, this.tc[1].up, this.tc[1].dn); }
    return this._row(inp, u, f[0], f[1], f[0], f[1]); }
  state() { return [...super.state(), this.f[0], this.f[1]]; }
}
// ═══ M1b: the labelled successor (MUSCLE1_AMENDMENT_M1B.md) = M1 + a pure electrochemical delay on the excitation (EMG → fascicle motion, Nordez 2009
// 6.05 ms, rounded up to whole steps). The delayed excitation drives activation; everything else is M1's, unchanged.
export class M1bAxis extends M1Axis {
  constructor(kit, params, opt = {}) { super(kit, params, opt); this.id = "M1b"; this.dSteps = params.electrochemicalDelay.steps; this.line = null; }
  plan(inp, init = false) { const u = inp.u || this.excite(inp.dTau || 0);
    if (init || !this.line) { this.line = Array.from({ length: this.dSteps }, () => u.slice()); return super.plan({ ...inp, u, dTau: undefined }, init); }
    this.line.push(u.slice()); const ud = this.line.shift(); return super.plan({ ...inp, u: ud, dTau: undefined }, false); }
  state() { return [...super.state(), ...this.line.flat()]; }
}
// ═══ CANON (equivalence test only): the canonical V2 MuscleAxis (sandbox/visual/physchar2/sim/v2_muscle.js) driven with the fixture kit's constants,
// with the same excitation interface — must reproduce M1b exactly (canonical integration check, BALANCE-1 §1)
const MUS = await import(PL.P2 + "sim/v2_muscle.js");
export class CanonAxis {
  constructor(kit, params) { this.kit = kit; this.id = "CANON"; const grp = (dir) => params.groups[params.dirToGroup[kit.fam][dir]];
    this.m = new MUS.MuscleAxis({ capFull: kit.capFull, kP: kit.kP, kM: kit.kM, ePs: kit.ePs, ePm: kit.eMs, cP: kit.cP, cM: kit.cM, I: kit.I, kp: kit.kp, slackDeg: kit.slack, dp: kit.dp || 0, s: kit.s, dt: kit.dt, zeta: kit.zeta, Dmin: kit.Dmin,
      tc: [grp(kit.x.plus.dir), grp(kit.x.minus.dir)].map(g => ({ up: g.tauRiseMs / 1000, dn: g.tauFallMs / 1000 })), dSteps: params.electrochemicalDelay.steps });
    this.ePrev = 0; this.created = 0; }
  get a() { return this.m.a; } get f() { return this.m.f; } get row() { return this.m.row; } get diss() { return this.m.diss; }
  excite(dTau) { const k = this.kit; return dTau === 0 ? k.u0 : MUS.solveFloors(k.tauStatic + dTau, k.fl[0], k.fl[1], k.cP, k.cM); }
  plan(inp, init = false) { const u = inp.u || this.excite(inp.dTau || 0); return this.m.plan(u, inp, init); }
  torque(wEnd) { return this.m.torque(wEnd); }
  after(e) { const de = e - this.ePrev; this.ePrev = e; return { slip: this.m.strain(de) }; }
  storedElastic() { return this.m.storedElastic(); }
  state() { return this.m.state(); }
}
