// ═══ physchar2/sim/v2_passive.js — the PASSIVE joint tissue of the V2 body (spec §13.1.5, §13.3): no controller, no posture effort ══════
// Per tick, from the solved body state only (stateless — snapshot / restore needs nothing from here):
//   1. constraint-space rotation of every joint q = F1⁻¹·R1⁻¹·R2·F2 (exactly Jolt's GetRotationInConstraintSpace) → twist / pyramid swing θ;
//   2. the passive POTENTIAL U(all joints) = Σ end-range terms (spec §13.3: τ = A·(e^{B(θ−θs)} − 1) beyond each soft limit, A such that
//      τ(θ_hard) = 0.25·T_iso(opposing)) with the soft limits of the four §13.2 couplings depending on the adjacent joint (biarticular
//      gastrocnemius / hamstrings, screw-home, hip rotation vs flexion). Torques are −∇U by central differences on body-2-frame rotation
//      vectors of every joint the term depends on — the passive field is the exact gradient of one scalar, hence CONSERVATIVE by
//      construction (a biarticular term also loads the adjacent joint, as the muscle–tendon unit does);
//   3. folded into the joint's implicit motor rows (spec §13.1.5): Jolt PositionAndVelocity drive per constraint axis with stiffness =
//      the linearised end-range stiffness (diagonal of Jᵀ·k·J), target = current rotation offset by τ/k, damping = the joint's viscous
//      coefficient (spec §13.3), target velocity 0. The drive's torque limit only bounds it to what the passive law can produce this
//      step (no muscle capacity: activation is 0 in G1). Inside the soft range the stiffness is exactly 0 → only viscous damping acts;
//   4. any part of −∇U the implicit spring cannot carry (an axis with no own end-range stiffness receiving a biarticular cross term, or
//      an offset beyond DELTA_MAX) is applied as an explicit equal-and-opposite torque pair (small stiffness ⇒ explicit is stable).
// Motor rows carry ONLY passive tissue (elastic end range + viscous damping). There are no targets toward any posture.
import { V, Q, dexp, rad } from "../core/v2_math.js";
import { decompose } from "../spec/v2_joints.js";              // Jolt swing–twist split, pyramid components (deterministic atan2)

// H: finite-difference rotation (rad); DELTA_MAX: largest implicit-spring offset (rad); drive bound: the drive may never exceed what the
// passive law + damper could produce this step with generous headroom (DTH_MAX deeper excursion, DW_MAX velocity change) — a guard
// against pathological solver impulses, never a physical clip.
const H = 1e-6, DELTA_MAX = 0.25, K_MIN = 1e-6, LIM_MARGIN = 0.5, DTH_MAX = 0.05, DW_MAX = 20;
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// spec §13.2 pose-dependent passive limits (COUPLINGS in v2_joints.js, same laws, executable form). in = coupling input (anatomical
// degrees of the named joint/axis); returns the new ANATOMICAL soft end, or a scale factor for "scale".
export const COUPLING_LAWS = [
  { joint: "ankle", key: "df", end: "hi", base: 20, input: { joint: "knee", key: "flex" }, f: (k) => 20 + 15 * clamp(k / 90, 0, 1), law: "soft DF limit = 20° + 15°·clamp(kneeFlex/90°, 0, 1)" },
  { joint: "hip", key: "flex", end: "hi", base: 120, input: { joint: "knee", key: "flex" }, f: (k) => 80 + 40 * clamp(k / 90, 0, 1), law: "soft hip-flexion limit = 80° + 40°·clamp(kneeFlex/90°, 0, 1)" },
  { joint: "knee", key: "rot", end: "scale", input: { joint: "knee", key: "flex" }, f: (k) => clamp(k / 60, 0.1, 1), law: "soft axial range × clamp(kneeFlex/60°, 0.1, 1)" },
  { joint: "hip", key: "rot", end: "lo", base: -40, input: { joint: "hip", key: "flex" }, f: (h) => -45 + 5 * clamp(h / 90, 0, 1), law: "soft ER limit −45° (hip extended) → −40° (hip flexed 90°)" },
];

export class PassiveLayer {
  constructor(spec, world, opts = {}) {
    this.spec = spec; this.w = world; this.opts = opts; this.enabled = opts.enabled !== false; this.couplings = opts.couplings !== false;
    this.predictive = opts.predictive !== false; this.oneSided = opts.oneSided !== false;   // C2 causal fix (default on); switchable for the A/B record
    const J = spec.joints; this.nJ = J.length;
    this.jd = J.map((j, k) => {
      const axes = [0, 1, 2].map(i => { const key = ["x", "y", "z"][i], ax = j.def.axes[key]; const p = j.passive[i];
        return ax && !ax.locked && p ? { i, key: ax.key, s: ax.s, soft: p.soft.slice(), hard: p.hard.slice(), tauH: p.tauAtHard.slice(), B: p.B, kStop: (opts.endStop === false || !p.kStop) ? [0, 0] : p.kStop.slice() } : null; });
      return { k, j, name: j.name, side: j.side, base: j.name.replace(/_[LR]$/, ""), parent: j.parentIndex, child: j.childIndex, F1: j.F1, F2: j.F2, Cm: j.Cm, c: j.damping, axes,
        free: axes.map(a => !!a) };
    });
    // coupling wiring: term (joint k, axis key) ← input (joint m, anatomical key)
    const byName = Object.fromEntries(this.jd.map(d => [d.name, d]));
    this.coup = []; if (this.couplings) for (const L of COUPLING_LAWS) for (const s of ["L", "R"]) {
      const t = byName[L.joint + "_" + s], inp = byName[L.input.joint + "_" + s]; const ax = t.axes.find(a => a && a.key === L.key); if (!ax) continue;
      this.coup.push({ L, t: t.k, axis: ax.i, in: inp.k, inKey: L.input.key }); }
    // dependents[m] = terms (joint k, axis i) whose value depends on joint m's rotation
    this.dep = this.jd.map(() => []);
    for (const d of this.jd) for (const a of d.axes) if (a) this.dep[d.k].push([d.k, a.i]);
    for (const c of this.coup) if (c.in !== c.t && !this.dep[c.in].some(([k, i]) => k === c.t && i === c.axis)) this.dep[c.in].push([c.t, c.axis]);
    this.last = null;
    if (this.enabled) for (const d of this.jd) d.axes.forEach((a, i) => { if (a) { world.driveOn(d.k, i); } });
  }
  // constraint-space rotation of joint d from body rotations (doubles from float32 readback)
  qcs(d, R) { return Q.norm(Q.mul(Q.conj(d.F1), Q.mul(Q.conj(R[d.parent]), Q.mul(R[d.child], d.F2)))); }
  // anatomical angle (deg) of joint d / key from its constraint-space rotation (qFrame = Cm·q_cs; v2_joints anatomicalAngles)
  anat(d, q, key) { const v = decompose(Q.norm(Q.mul(d.Cm, q))), ax = ["x", "y", "z"].find(k => d.j.def.axes[k] && d.j.def.axes[k].key === key), a = d.j.def.axes[ax];
    return (ax === "x" ? v.tw : ax === "y" ? v.sy : v.sz) * a.s * 180 / Math.PI; }
  // soft limits of term (k, i) given the current rotations qs (array of all joint q_cs)
  softOf(k, i, qs) {
    const a = this.jd[k].axes[i]; let lo = a.soft[0], hi = a.soft[1];
    for (const c of this.coup) { if (c.t !== k || c.axis !== i) continue; const din = this.jd[c.in], x = this.anat(din, qs[c.in], c.inKey), L = c.L;
      if (L.end === "scale") { const f = L.f(x); lo *= f; hi *= f; }
      else { const dAn = rad(L.f(x) - L.base), anatHi = L.end === "hi", toHi = anatHi === (a.s > 0); if (toHi) hi += a.s * dAn; else lo += a.s * dAn; } }
    return [lo, hi];
  }
  // one end-range term: U (J), own-axis generalised torque τ (N·m), own-axis stiffness kθ (N·m/rad) at constraint angle th. Beyond the
  // ANATOMICAL hard limit the C2 end-stop adds ½·kStop·(θ − θh)² (a linear spring), so the passive tissue resists ordinary loading at the
  // anatomical boundary and the Jolt engine stop (further out) is only an emergency stop.
  term(k, i, th, soft) {
    const a = this.jd[k].axes[i], B = a.B, [slo, shi] = soft, [hlo, hhi] = a.hard;
    if (th > shi) { const A = a.tauH[1] / (dexp(B * Math.max(1e-4, hhi - shi)) - 1), e = dexp(B * (th - shi)), x = th - hhi, ks = x > 0 ? a.kStop[1] : 0;
      return { U: A * ((e - 1) / B - (th - shi)) + (x > 0 ? 0.5 * ks * x * x : 0), tau: -A * (e - 1) - ks * Math.max(0, x), k: A * B * e + ks, side: 1, stop: x > 0 }; }
    if (th < slo) { const A = a.tauH[0] / (dexp(B * Math.max(1e-4, slo - hlo)) - 1), e = dexp(B * (slo - th)), x = hlo - th, ks = x > 0 ? a.kStop[0] : 0;
      return { U: A * ((e - 1) / B - (slo - th)) + (x > 0 ? 0.5 * ks * x * x : 0), tau: A * (e - 1) + ks * Math.max(0, x), k: A * B * e + ks, side: -1, stop: x > 0 }; }
    return { U: 0, tau: 0, k: 0, side: 0 };
  }
  termU(k, i, qs) { const v = decompose(qs[k]), th = i === 0 ? v.tw : i === 1 ? v.sy : v.sz; return this.term(k, i, th, this.softOf(k, i, qs)).U; }
  // full evaluation at the current body state (also used for energy bookkeeping): returns per joint θ, soft, U terms
  evaluate(R) {
    const qs = this.jd.map(d => this.qcs(d, R)); let U = 0; const per = this.jd.map(d => {
      const v = decompose(qs[d.k]), th = [v.tw, v.sy, v.sz], T = d.axes.map((a, i) => { if (!a) return null; const soft = this.softOf(d.k, i, qs), t = this.term(d.k, i, th[i], soft); U += t.U; return { soft, ...t }; });
      return { q: qs[d.k], th, swing: v.swing, T }; });
    return { qs, per, U };
  }
  // ── per tick: compute −∇U and the drive / explicit-torque plan (no engine writes) ... apply(plan) writes it to the engine and must be
  // called immediately before the physics step (so no stale force accumulator ever survives a snapshot / restore) ──
  update(states, dt) { const plan = this.compute(states, dt); this.apply(plan); return plan; }
  compute(states, dt) {
    const R = states.map(s => s.rot), ev = this.evaluate(R), out = { U: ev.U, ev, joints: [], applied: false };
    if (!this.enabled) { this.last = out; return out; }
    for (const d of this.jd) {
      const q0 = ev.qs[d.k], tau = [0, 0, 0], Jm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];   // Jm[row θ_m][col φ_i]
      const R2F2 = Q.mul(R[d.child], d.F2), axW = E.map(e => Q.rot(R2F2, e)), wrel = V.sub(states[d.child].w, states[d.parent].w), wi = axW.map(a => V.dot(wrel, a));
      // PREDICTIVE linearisation (G1 C2 causal fix): the law is linearised at the predicted end-of-step rotation q0·exp(ω·dt), not at q0.
      // A joint that crosses the stiff anatomical end-stop within one step therefore meets the stop's stiffness in that same step instead
      // of entering it for free (measured: thoracic +9.2 J of U in one step, net +1.1 J, with start-of-step linearisation).
      const phi = [0, 1, 2].map(i => (d.free[i] ? wi[i] * dt : 0)), pl = Math.hypot(phi[0], phi[1], phi[2]);
      const qP = this.predictive && pl > 1e-12 ? Q.norm(Q.mul(q0, Q.axis([phi[0] / pl, phi[1] / pl, phi[2] / pl], pl))) : q0, qsP0 = ev.qs.slice(); qsP0[d.k] = qP;
      for (let i = 0; i < 3; i++) {
        if (!d.free[i]) continue;
        const qp = Q.norm(Q.mul(qP, Q.axis(E[i], H))), qm = Q.norm(Q.mul(qP, Q.axis(E[i], -H)));
        const qsP = qsP0.slice(), qsM = qsP0.slice(); qsP[d.k] = qp; qsM[d.k] = qm; let dU = 0;
        for (const [k, ii] of this.dep[d.k]) dU += this.termU(k, ii, qsP) - this.termU(k, ii, qsM);
        tau[i] = -dU / (2 * H);
        const vp = decompose(qp), vm = decompose(qm), tp = [vp.tw, vp.sy, vp.sz], tm = [vm.tw, vm.sy, vm.sz];
        for (let m = 0; m < 3; m++) { let dd = tp[m] - tm[m]; if (dd > Math.PI) dd -= 2 * Math.PI; if (dd < -Math.PI) dd += 2 * Math.PI; Jm[m][i] = dd / (2 * H); }
      }
      // implicit stiffness per body-2 axis at the predicted rotation: diag(Jᵀ·diag(kθ)·J), own end-range (+ end-stop) stiffness only
      const vP = decompose(qP), thP = [vP.tw, vP.sy, vP.sz], kth = d.axes.map((a, i) => (a ? this.term(d.k, i, thP[i], this.softOf(d.k, i, qsP0)).k : 0));
      const K = [0, 1, 2].map(i => kth.reduce((s, kk, m) => s + Jm[m][i] * Jm[m][i] * kk, 0));
      const delta = [0, 0, 0], Texp = [0, 0, 0], Kset = [0, 0, 0], lim = [[0, 0], [0, 0], [0, 0]];
      for (let i = 0; i < 3; i++) { if (!d.free[i]) { continue; }
        let off = 0; if (K[i] > K_MIN) { off = clamp(tau[i] / K[i], -DELTA_MAX, DELTA_MAX); Kset[i] = K[i]; }
        delta[i] = (this.predictive ? phi[i] : 0) + off; Texp[i] = tau[i] - Kset[i] * off;
        // the elastic tissue only ever RESTORES: the drive may push toward the neutral range with the full linearised law, but in the other
        // direction it carries at most the viscous damper — so an over-predicted step can never pull a joint toward its stop (a soft unilateral
        // constraint, like a contact)
        const big = Math.abs(tau[i]) + Kset[i] * (Math.abs(phi[i]) + DTH_MAX) + d.c * (Math.abs(wi[i]) + DW_MAX) + LIM_MARGIN, anti = d.c * Math.abs(wi[i]) + 0.05, damp = d.c * (Math.abs(wi[i]) + DW_MAX) + LIM_MARGIN;
        lim[i] = !this.oneSided || Math.abs(tau[i]) < 1e-9 ? [-Math.max(big, damp), Math.max(big, damp)] : tau[i] > 0 ? [-anti, big] : [-big, anti]; }
      // target = q0 · exp(δ') with 2·sin(|δ'|/2) = |δ| so Jolt's error approximation (−2·Im(q⁻¹·target)) returns exactly δ per axis
      const dl = Math.hypot(delta[0], delta[1], delta[2]); let tgt = q0;
      if (dl > 0) { const ang = 2 * Math.asin(Math.min(1, dl / 2)); tgt = Q.norm(Q.mul(q0, Q.axis([delta[0] / dl, delta[1] / dl, delta[2] / dl], ang))); }
      const Tw = [0, 1, 2].reduce((acc, i) => V.add(acc, V.sc(axW[i], Texp[i])), [0, 0, 0]);
      out.joints.push({ k: d.k, tau, K: Kset, delta, Texp, wi, axW, lim, tgt, Tw, Jm });
    }
    this.last = out; return out;
  }
  apply(plan) {
    if (!this.enabled || plan.applied) return; plan.applied = true;
    for (const p of plan.joints) { const d = this.jd[p.k];
      for (let i = 0; i < 3; i++) if (d.free[i]) this.w.setDrive(d.k, i, p.K[i], d.c, p.lim[i]);
      this.w.setDriveTarget(d.k, p.tgt);
      if (p.Tw[0] || p.Tw[1] || p.Tw[2]) this.w.addTorquePair(d.parent, d.child, p.Tw); }
  }
  // viscous dissipation of the last step (J): Σ c·|ω_rel|² dt with the post-step relative velocity (the drive is implicit in ω)
  dampingLoss(states, dt) { let D = 0; for (const d of this.jd) { if (!d.axes.some(Boolean)) continue; const w = V.sub(states[d.child].w, states[d.parent].w);
      // locked axes carry no damper: project out the locked directions
      const R2F2 = Q.mul(states[d.child].rot, d.F2); let s = 0; for (let i = 0; i < 3; i++) if (d.free[i]) { const a = Q.rot(R2F2, E[i]), x = V.dot(w, a); s += x * x; }
      D += d.c * s * dt; } return D; }
}
