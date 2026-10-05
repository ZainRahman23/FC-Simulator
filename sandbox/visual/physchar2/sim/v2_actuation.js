// ═══ physchar2/sim/v2_actuation.js — the FINITE ACTUATORS of the V2 body (V2-G2): spec §14 capacity, activation, exact capacity limits ═══════
// One actuator per motorised constraint axis (35 axes; the ankle's foot ab/adduction and the locked knee / elbow axes have none).
// Per tick, for each axis and each direction d = + / − (the constraint parameter direction; jointAxisCapacities maps it to the anatomical
// motion):
//   τ_cap,d = s · T_iso,d · M · g_θ,d(θ) · f_ω,d(ω) · a_d          (spec §14.2; fatigue / injury hooks = 1, dynamic enhancement OFF)
//   g_θ: Anderson 2007 young-male cosine for hip / knee / ankle sagittal [H]; ankle plantar-flexion × (1 − 0.26·clamp(knee/60°, 0, 1)) for the
//        gastrocnemius (Billot 2022: 150 of 203 N·m with the knee at 60°) [H]→[ENG]; every other axis 1 [ENG] (spec: flat)
//   f_ω: joint-level concentric Hill / eccentric plateau (spec), with the PREVIOUS tick's joint angular velocity (spec: one-tick lag)
//   a_d: first-order activation, τ_act 15 ms / τ_deact 50 ms (Thelen 2003) [H], driven by an excitation u_d
// The controller asks for an implicit PD per axis: τ = τ0 − (D + dt·K)·ω_end (τ0 = feed-forward + K·error at the current state). The
// excitation of the direction the request points to is u = min(1, |τ_req|·(1 + U_MARGIN)/τ_cap,d(a = 1) + U_TONE); the opposite direction
// rests at U_TONE. The actuator is the joint's PARALLEL actuator constraint (core/v2_jolt.js, cfg.actuators): an implicit Jolt motor whose
// torque limits are EXACTLY [−τ_cap,−, +τ_cap,+] — so the active torque can never exceed the instantaneous capacity (spec 2.3), and its
// impulse readback is the exact active torque for the ledger. Passive tissue stays in the joint's own motor rows (G1, unchanged).
import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
import { CAP_OF_JOINT, ANDERSON_2007, fOmega, gTheta, activationStep } from "../spec/v2_actuators.js";

export const ACT = { U_MARGIN: 0.25, U_TONE: 0.02, D_MIN: 0.02, SAT_TOL: 1e-3 };   // [ENG] excitation headroom over the request, resting tone, smallest implicit damping (N·m·s/rad)
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], KEYS = ["x", "y", "z"], DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Anderson coefficient per (joint family, anatomical axis key, anatomical direction name)
function andersonOf(base, key, dir) {
  if (base === "hip" && key === "flex") return /flexion/.test(dir) && !/extension/.test(dir) ? ANDERSON_2007.HF : ANDERSON_2007.HE;
  if (base === "knee" && key === "flex") return dir === "flexion" ? ANDERSON_2007.KF : ANDERSON_2007.KE;
  if (base === "ankle" && key === "df") return dir === "dorsiflexion" ? ANDERSON_2007.DF : ANDERSON_2007.PF;
  return null;
}

export class ActuatorLayer {
  constructor(spec, world, passive, opts = {}) {
    this.spec = spec; this.w = world; this.P = passive; this.M = spec.bodies.reduce((s, b) => s + b.mass, 0); this.strength = opts.strength ?? 1;
    this.kneeOf = {}; spec.joints.forEach((j, k) => { if (/^ankle_/.test(j.name)) this.kneeOf[k] = spec.joints.findIndex(x => x.name === "knee_" + j.side); });
    this.ax = spec.joints.map((j, k) => KEYS.map((key, i) => { const c = j.capacity[key], def = j.def.axes[key]; if (!c) return null;
      const base = j.name.replace(/_[LR]$/, "");
      return { k, i, key: def.key, s: def.s, base, plus: { ...c.plus, g: andersonOf(base, def.key, c.plus.dir) }, minus: { ...c.minus, g: andersonOf(base, def.key, c.minus.dir) } }; }));
    // ACTIVE FOOT-YAW PATH (opts.footYaw = footYawCapacity(...); DEFAULT OFF): an actuator on the ankle's passive-only foot ab/adduction axis, from the actuator layer only (the spec
    // capacity table and the passive layer are untouched). Parameter + direction = s · anatomical (adduction positive), as jointAxisCapacities.
    if (opts.footYaw) spec.joints.forEach((j, k) => { if (!/^ankle_/.test(j.name)) return; KEYS.forEach((key, i) => { const def = j.def.axes[key]; if (!def || def.key !== "fabd" || this.ax[k][i]) return;
      const M = this.M, pos = opts.footYaw.add, neg = opts.footYaw.abd, plus = def.s > 0 ? pos : neg, minus = def.s > 0 ? neg : pos;
      this.ax[k][i] = { k, i, key: "fabd", s: def.s, base: "ankle", plus: { dir: plus.dir, Nm: plus.Tiso * M, cap: plus, g: null }, minus: { dir: minus.dir, Nm: minus.Tiso * M, cap: minus, g: null }, footYaw: true }; }); });
    this.a = this.ax.map(r => r.map(x => (x ? [0, 0] : null)));          // activation [+, −] per axis — controller-state (snapshot / hash)
    this.plan = null; this.led = this.ax.map(r => r.map(x => (x ? { W: 0, satTicks: 0, satPlus: 0, satMinus: 0, peakFrac: 0, sumFrac: 0, n: 0, peakNm: 0, overCap: 0 } : null)));
    this.ticks = 0;
  }
  // full-activation capacity (N·m) of one axis direction at the current anatomical angle (deg) and joint speed in that direction (rad/s)
  capFull(x, dir, anatDeg, wDir, kneeDeg) {
    const c = dir > 0 ? x.plus : x.minus; let g = gTheta(c.g, anatDeg * DEG);
    if (x.base === "ankle" && x.key === "df" && /plantar/.test(c.dir) && kneeDeg != null) g *= 1 - 0.26 * clamp(kneeDeg / 60, 0, 1);
    return this.strength * c.cap.Tiso * this.M * g * fOmega(c.cap, wDir);
  }
  // cmd[k][i] = { K, D, tau0 } (N·m/rad, N·m·s/rad, N·m) for motorised axes; st = body states; init: activations start at their excitation
  compute(st, ev, cmd, dt, init = false) {
    st = unitStates(st); ev = unitEv(ev);   // unit-quaternion boundary (overnight A2): the axis algebra below assumes unit quaternions
    const P = this.P, out = [];
    for (const d of P.jd) { const k = d.k, R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(st[d.child].w, st[d.parent].w);
      const kneeDeg = this.kneeOf[k] != null ? P.anat(P.jd[this.kneeOf[k]], ev.qs[this.kneeOf[k]], "flex") : null;
      const row = (i, share) => { const x = this.ax[k][i]; if (!x) return null; const c = cmd[k] && cmd[k][i]; if (!c) return { off: true };
        const w = V.dot(wrel, axW[i]), anat = P.anat(d, ev.qs[k], x.key) * 1, K = Math.max(0, c.K), D = Math.max(ACT.D_MIN, c.D);
        let capP = this.capFull(x, 1, anat, w, kneeDeg), capM = this.capFull(x, -1, anat, -w, kneeDeg); const req = c.tau0 - (D + dt * K) * w;
        if (share != null) { capP *= share; capM *= share; }
        const uP = req > 0 ? Math.min(1, req * (1 + ACT.U_MARGIN) / Math.max(1e-9, capP) + ACT.U_TONE) : ACT.U_TONE, uM = req < 0 ? Math.min(1, -req * (1 + ACT.U_MARGIN) / Math.max(1e-9, capM) + ACT.U_TONE) : ACT.U_TONE;
        const a = this.a[k][i]; if (init) { a[0] = uP; a[1] = uM; } else { a[0] = activationStep(a[0], uP, dt); a[1] = activationStep(a[1], uM, dt); }
        return { K, D, tau0: c.tau0, req, capP, capM, hi: a[0] * capP, lo: -a[1] * capM, w, anat, ...(share != null ? { share } : {}) }; };
      // the ACTIVE FOOT-YAW axis (opts.footYaw only) is computed AFTER the joint's other axes: it shares the subtalar muscles' capacity with inversion / eversion,
      // |τ_inv|/T_inv + |τ_yaw|/T_yaw ≤ 1 (the conservative sum bound, YAW_PATH_REVIEW), with INVERSION FIRST — the yaw path gets the remainder of the inversion row's
      // budget at its request (clipped to its activation limits), so frontal balance is never starved by yaw; without footYaw the order and values are unchanged
      const rows = KEYS.map((key, i) => (this.ax[k][i] && this.ax[k][i].footYaw ? undefined : row(i, null)));
      KEYS.forEach((key, i) => { if (rows[i] !== undefined) return; const iv = KEYS.findIndex((kk, j) => this.ax[k][j] && this.ax[k][j].key === "inv"), r = iv >= 0 ? rows[iv] : null;
        const used = r && !r.off ? Math.min(1, Math.abs(Math.min(r.hi, Math.max(r.lo, r.req))) / Math.max(1e-9, r.req >= 0 ? r.capP : r.capM)) : 0; rows[i] = row(i, 1 - used); });
      out.push({ k, axW, rows, wrel }); }
    return (this.plan = { joints: out, dt, applied: false });
  }
  // write the actuator motors (immediately before the physics step): target = Jolt's current constraint rotation, the PD encoded in the target
  // angular velocity (the G1 encoding: λ/dt = −K·C − (D + dt·K)(Jv − ω_t) ⇒ ω_t = (τ0 + K·C)/(D + dt·K) gives λ/dt = τ0 − (D + dt·K)·Jv)
  apply(plan = this.plan) {
    if (!plan || plan.applied) return; plan.applied = true; const w = this.w;
    for (const p of plan.joints) { const k = p.k; let any = false;
      p.rows.forEach((r, i) => { if (!r) return; if (r.off) { w.actOn(k, i, false); return; } w.setAct(k, i, r.K, r.D, r.lo, r.hi); w.actOn(k, i, true); any = true; });
      if (!any) continue;
      const q = Q.norm(w.actRotationCS(k)); w.setActTarget(k, q); const T = Q.norm(w.actTarget(k)),   // small-angle motor error below assumes unit quaternions
        sg = q[0] * T[0] + q[1] * T[1] + q[2] * T[2] + q[3] * T[3] > 0 ? 1 : -1, df = Q.mul(Q.conj(q), T.map(x => x * sg)), C = [0, 1, 2].map(i => -2 * df[i]);
      p.C = C; w.setActVel(k, p.rows.map((r, i) => (r && !r.off ? (r.tau0 + r.K * C[i]) / (r.D + plan.dt * r.K) : 0))); }
  }
  // after the step: exact active torque per axis from the actuator constraint's impulse, ledger (work with the mid-step relative ω), saturation
  after(stPrev, st, plan = this.plan) {
    if (!plan) return null; const dt = plan.dt, res = []; this.ticks++;
    for (const p of plan.joints) { const d = this.P.jd[p.k], lam = this.w.lambdaAct(p.k), wrel1 = V.sub(st[d.child].w, st[d.parent].w), wmid = V.sc(V.add(p.wrel, wrel1), 0.5);
      p.rows.forEach((r, i) => { if (!r || r.off) return; const tau = lam[i] / dt, L = this.led[p.k][i], cap = tau >= 0 ? r.capP : r.capM, frac = Math.abs(tau) / Math.max(1e-9, cap);
        const satHi = r.hi - tau < ACT.SAT_TOL * Math.max(1, Math.abs(r.hi)) && tau > 0, satLo = tau - r.lo < ACT.SAT_TOL * Math.max(1, Math.abs(r.lo)) && tau < 0;
        const W = tau * V.dot(wmid, p.axW[i]) * dt; L.W += W; L.n++; L.sumFrac += frac; L.peakFrac = Math.max(L.peakFrac, frac); L.peakNm = Math.max(L.peakNm, Math.abs(tau));
        if (satHi || satLo) { L.satTicks++; if (satHi) L.satPlus++; else L.satMinus++; }
        if (tau > r.hi + 1e-6 * Math.max(1, r.hi) || tau < r.lo - 1e-6 * Math.max(1, -r.lo) || Math.abs(tau) > cap * (1 + 1e-6) + 1e-9) L.overCap++;
        res.push({ k: p.k, i, tau, W, frac, sat: satHi || satLo, a: this.a[p.k][i].slice(), req: r.req, cap }); }); }
    return (this.last = res);
  }
  state() { return this.a.flat().filter(Boolean).flat(); }                 // controller-state numbers for the hash / snapshot
  setState(v) { let n = 0; for (const r of this.a) for (const a of r) if (a) { a[0] = v[n++]; a[1] = v[n++]; } }
}
