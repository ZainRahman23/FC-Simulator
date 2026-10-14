// SLIDE-PHYS-1 candidate muscle successor M1c ("velocity-consistent intrinsic mechanics") — a labelled successor of canonical M1b for fast
// voluntary motion, NOT adopted (owner decision). Everything is M1b (sandbox/visual/physchar2/sim/v2_muscle.js MuscleAxis) except ONE rule:
//   a muscle group's short-range (cross-bridge) stiffness — and the intrinsic damping D = 2ζ√(K·I) derived from it — is weighted by
//   λ = 1 / (1 + (v_sh / ω_c)²), v_sh = that group's OWN shortening speed (rad/s, 0 when isometric or lengthening), ω_c = θ_y / τ_cb.
// Rationale: short-range stiffness exists while attached bridges are strained within θ_y (Rack & Westbury 1974; Hunter & Kearney 1983); a group
// shortening faster than θ_y per cross-bridge attachment time τ_cb cannot keep bridges strained, and its force is then its force–velocity
// capacity (Hill), which already is the measured isokinetic torque. M1b applies the full short-range K / D on the full joint velocity, so a
// fully driven group cannot exceed ≈ 3–4 rad/s (hip / knee flexion effective torque → 0; SLIDE-PHYS-1 audit evidence/m1b_effective_fv.json).
//   Lengthening groups (eccentric, perturbation stretch) and every state with |ω| ≪ ω_c are bit-identical to M1b (λ = 1).
//   τ_cb = 20 ms [MODEL: cross-bridge cycle time scale, order of magnitude only]; θ_y = M1b's own SHORT_RANGE.thetaYdeg (unchanged).
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href);
const MUS = await import(L.PL.P2 + "sim/v2_muscle.js"), MG = await import(L.PL.P2 + "spec/v2_muscles.js"), ACTS = await import(L.PL.P2 + "spec/v2_actuators.js");
const D2R = Math.PI / 180, lagStep = (y, x, dt, tUp, tDn) => x + (y - x) * Math.exp(-dt / (x > y ? tUp : tDn));
export const M1C = Object.freeze({ id: "M1c", tauCbMs: 20, note: "short-range K / D of a group weighted by λ = 1/(1 + (v_sh/ω_c)²), ω_c = θ_y/τ_cb; everything else M1b" });
export class MuscleAxisC extends MUS.MuscleAxis {
  constructor(d, tauCb = M1C.tauCbMs / 1000) { super(d); this.wc = (MG.SHORT_RANGE.thetaYdeg[d.fam] * D2R) / tauCb; }
  plan(u, inp, init = false) { const d = this.d, dt = d.dt, a = this.a, f = this.f;
    if (init || !this.line) { this.line = Array.from({ length: d.dSteps }, () => [u[0], u[1]]); }
    let ud = u; if (!init) { this.line.push([u[0], u[1]]); ud = this.line.shift(); }
    if (init) { a[0] = f[0] = ud[0]; a[1] = f[1] = ud[1]; } else { a[0] = ACTS.activationStep(a[0], ud[0], dt); a[1] = ACTS.activationStep(a[1], ud[1], dt);
      f[0] = lagStep(f[0], a[0], dt, d.tc[0].up, d.tc[0].dn); f[1] = lagStep(f[1], a[1], dt, d.tc[1].up, d.tc[1].dn); }
    const Kf = d.kP * f[0] * d.cP + d.kM * f[1] * d.cM; if (this.Kf != null && Kf < this.Kf) { const kap = Kf / this.Kf; for (const j of ["r", "s", "f"]) { this.F[j] *= kap; this.diss.detach += (1 - kap) * this.energy[j]; this.energy[j] *= kap; } } this.Kf = Kf;
    const w = inp.w, anat = inp.anat, kd = inp.kneeDeg, FP = f[0], FM = f[1];
    const isoP = d.capFull(1, anat, 0, kd), isoM = d.capFull(-1, anat, 0, kd), capP = d.capFull(1, anat, w, kd), capM = d.capFull(-1, anat, -w, kd);
    // ▸ M1c: per-group short-range weights from each group's own shortening speed (+ group shortens for w > 0, − group for w < 0)
    const lamP = 1 / (1 + (Math.max(0, w) / this.wc) ** 2), lamM = 1 / (1 + (Math.max(0, -w) / this.wc) ** 2);
    const Kps = lamP * d.kP * FP * isoP, Kms = lamM * d.kM * FM * isoM;
    const drive = FP * isoP - FM * isoM, Kmus = Kps + Kms, Ktot = Kmus + d.kp, D = Math.max(d.Dmin, 2 * d.zeta * Math.sqrt(Ktot * d.I) + (d.dp || 0));
    const tauP = this.passiveB(anat), tauE = this.F.r + this.F.s + this.F.f, tau0 = drive + tauE + tauP, req = tau0 - (D + dt * Ktot) * w;
    const Rp = (d.ePs - 1) * FP * isoP, Rm = (d.ePm - 1) * FM * isoM;
    let hiE = Math.min(Math.max(tauE * Kps / Math.max(1e-12, Kmus), 0), Rp), loE = Math.max(Math.min(tauE * Kms / Math.max(1e-12, Kmus), 0), -Rm);
    if (w <= 0) hiE = Math.max(hiE, Math.min(Rp, d.ePs * FP * isoP - FP * capP)); if (w >= 0) loE = Math.min(loE, -Math.min(Rm, d.ePm * FM * isoM - FM * capM));
    return (this.row = { u: ud, uCmd: u, aP: a[0], aM: a[1], fP: FP, fM: FM, isoP, isoM, capP, capM, drive, Kmus, K: Ktot, Ktot, D, tauP, tauE, tau0, req, w, anat, Rp, Rm, lamP, lamM, hi: FP * capP + tauP + hiE, lo: -FM * capM + tauP + loE }); }
}
// swap a body's canonical M1b axes for M1c axes (same descriptors, same state) — call right after the M1b body is constructed
export function useM1c(act, tauCbMs = M1C.tauCbMs) { let n = 0; act.mx.forEach((row, k) => row.forEach((m, i) => { if (!m) return; const c = new MuscleAxisC(m.d, tauCbMs / 1000); c.a = m.a.slice(); c.f = m.f.slice(); c.line = m.line ? m.line.map(x => x.slice()) : null; c.F = { ...m.F }; c.energy = { ...m.energy }; c.diss = { ...m.diss }; c.Kf = m.Kf; c.row = m.row; row[i] = c; n++; })); act.muscleModel = "M1c"; return n; }
