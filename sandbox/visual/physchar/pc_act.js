// ═══ physchar/pc_act.js — G1a: THE ACTUATOR ARBITER (one authority per joint axis) + the actuator LEDGER ═══════════════════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §4. Modules REQUEST; nothing gets its own strength. Per joint axis there is ONE Jolt motor with ONE
// finite envelope, and the arbiter decides which request loses when the requests do not fit.
//
//   requests per joint axis (constraint space, N·m):
//     hold     kp·(posture − q)   the posture target's spring — its OWNER is a module (stance IK, swing, replant, posture, protective…)
//     damp     kd·(ω_target − ω)  intrinsic damping (never allocated away)
//     P0/P1    feed-forward: gravity compensation (P0), CoP-law balance Jᵀ, hip strategy (P1)
//     P2..P4   task (football action), style (reference), comfort — ADDED ONLY WITHIN WHAT IS LEFT
//   classes: P0 support > P1 balance > P2 task > P3 style > P4 comfort
//
//   allocation [engineering choice, documented]: the CORE block (hold + damp + P0 + P1) is the approved balance controller's own request and
//   passes unchanged (Jolt's clamp bounds it, exactly as in C1–C3 — parity); every lower class c is scaled by s_c ∈ [0, 1], the largest
//   value that (a) keeps the predicted total inside the envelope and (b) does not reduce the accumulated higher-priority request by more
//   than κ_c of its magnitude when it opposes it (a style request may not bend a loaded knee against its support). Everything that is
//   scaled down is logged as YIELDED, with the reason (envelope or conflict).
//   Jolt enforces the envelope on the single motor (the hard guarantee: the total can never exceed it); the arbiter decides who loses.
//
//   envelope τmax(dir, q̇) = τ_iso(dir) · f_v(q̇) · a(t) — G1a: PERMISSIVE (f_v ≡ 1, activation floor 1): the machinery is present and
//   logged but binds nothing, so the parity scenarios run with exactly the approved limits (it becomes binding in G5).
import { V, Q } from "./pc_math.js";
import { budgetLimits } from "./pc_balance.js";

export const ARB = {
  kappa: { P2: 0.25, P3: 0.05, P4: 0.0 },   // how much of the higher-priority request an opposing lower class may cancel
  fv: { enabled: false, k: 0.25 },          // torque–velocity: τ / τ_iso = (1 − q̇/q̇max)/(1 + q̇/(k·q̇max)) concentric (G5)
  act: { floor: 1.0, riseS: 0.03, fallS: 0.06 },   // activation a ∈ [floor, 1]; floor 1 = not binding (G1a)
  offClamp: 0.7,                            // rad: the balance controller's equilibrium-point offset clamp (unchanged)
};
export const CLS = ["P0", "P1", "P2", "P3", "P4"];
const expmap = (d) => { const a = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); return a < 1e-12 ? [0, 0, 0, 1] : Q.axis([d[0] / a, d[1] / a, d[2] / a], a); };
const logmap = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const s = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, x[3]); return [x[0] / s * a, x[1] / s * a, x[2] / s * a]; };
const clampVec = (d, m) => { const a = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]); return a > m ? V.sc(d, m / a) : d; };

export class ActuatorArbiter {
  // opts.ledger (default true): build the per-joint LEDGER (every module's request, allowed share, prediction, yields) — review / debug
  // instrumentation; false = the production path (the same allocation and the same targets, bit for bit, without the ledger objects)
  constructor(spec, opts) { this.ledger = !(opts && opts.ledger === false); this.spec = spec; this.nj = spec.joints.length; this.Cq = spec.joints.map(j => j.type === "hinge" ? null : Q.fromAxes(j.X, j.Y, j.Z)); this.prevQ = null; this.act = spec.joints.map(j => j.type === "hinge" ? 1 : [1, 1, 1]); this.last = null; }
  // one control step. a = {
  //   u        the balance controller's output with u.parts (opts.expose): nominal, tauG, tauB, tauHip, arms, stance/swing/replant, released
  //   S        body states (read after the last physics step); qCur(k) → Jolt's current joint coordinate (angle / constraint-space quaternion)
  //   owner(k) → { module, cls }   who owns joint k's posture target this step
  //   extra    [{ k, module, cls, off }]  lower-class requests as equilibrium-point offsets (rad, constraint space / hinge angle): torque = kp·off
  //   dt, naive  (naive: DIAGNOSTIC ONLY — lower classes added without allocation, to show what the arbiter prevents) }
  // returns per joint: final target, velocity target, kp / kd, [lo, hi], and the ledger entry
  step(a) {
    const { u, S, qCur, dt } = a, spec = this.spec, P = u.parts, out = { final: [], vel: [], motor: [], limits: [], led: [] };
    const extraBy = {}; for (const e of a.extra || []) (extraBy[e.k] = extraBy[e.k] || []).push(e);
    const qNow = spec.joints.map((j, k) => qCur(k)), qPrev = this.prevQ || qNow; this.prevQ = qNow;
    spec.joints.forEach((j, k) => {
      const m = u.motor[k], kp = m.kp, kd = m.kd, own = a.owner(k), ex = extraBy[k] || [], hinge = j.type === "hinge", vt = u.vel ? u.vel[k] : (hinge ? 0 : [0, 0, 0]);
      const Rc = S[j.childIndex].rot, toCs = hinge ? (t) => [V.dot(t, Q.rot(Rc, j.axis)), 0, 0] : (t) => Q.rot(Q.conj(this.Cq[k]), Q.rot(Q.conj(Rc), t));
      // predicted torque components, per axis (hinge: axis 0 only)
      const q = qNow[k], err = hinge ? [P.nominal[k] - q, 0, 0] : logmap(Q.mul(Q.conj(q), P.nominal[k]));
      const om = hinge ? [(q - qPrev[k]) / dt, 0, 0] : (() => { let d = Q.mul(Q.conj(qPrev[k]), q); if (d[3] < 0) d = d.map(x => -x); return [2 * d[0] / dt, 2 * d[1] / dt, 2 * d[2] / dt]; })();
      const vtv = hinge ? [vt, 0, 0] : vt, hold = V.sc(err, kp), damp = [0, 1, 2].map(i => kd * (vtv[i] - om[i]));
      const g = toCs(P.tauG[k]), b = toCs(P.tauB[k]), hp = toCs(P.tauHip[k]), arm = P.arms[k] ? toCs(P.arms[k]) : null;
      // the core offset exactly as the balance controller composes it (τ / kp, clamped at 0.7 rad)
      const coreOff = clampVec(V.sc(V.add(V.add(g, b), hp), 1 / kp), ARB.offClamp), coreFF = V.sc(coreOff, kp);
      const terms = this.ledger ? [{ m: own.module, c: own.cls, kind: "hold", req: hold }, { m: "damping", c: "D", kind: "damp", req: damp }, { m: "gravity", c: "P0", kind: "ff", req: g }, { m: "balance", c: "P1", kind: "ff", req: b }, { m: "hipStrategy", c: "P1", kind: "ff", req: hp }] : null;
      if (arm && terms) terms.push({ m: "arms(C4)", c: "P1", kind: "ff", req: arm });
      let core = V.add(V.add(hold, damp), coreFF); if (arm) core = V.add(core, arm);
      // envelope for this step (the multi-axis budget of the core target, as the approved runners compute it) × f_v × activation (permissive in G1a)
      const coreFinal = u.final[k], bud = hinge ? { lo: m.lo, hi: m.hi } : budgetLimits(m, q, coreFinal), env = this._env(k, hinge, bud, om);
      // lower classes: allocation per axis
      const lower = ex.map(e => ({ m: e.module, c: e.cls, kind: "ff", off: hinge ? [e.off, 0, 0] : e.off, req: V.sc(hinge ? [e.off, 0, 0] : e.off, kp) })), yielded = []; let S1 = core.slice(), H = V.sub(core, damp), anyLower = lower.length > 0;
      // P0 / P1 extras (e.g. the swing feed-forward) are part of the higher-priority request: never scaled, included in the prediction
      for (const t of lower) if (t.c === "P0" || t.c === "P1") { t.alw = t.req; S1 = V.add(S1, t.req); H = V.add(H, t.req); }
      const scale = {}; for (const c of ["P2", "P3", "P4"]) { const L = lower.filter(t => t.c === c); if (!L.length) continue; const tc = L.reduce((acc, t) => V.add(acc, t.req), [0, 0, 0]), s = [1, 1, 1], why = ["", "", ""];
        for (let i = 0; i < (hinge ? 1 : 3); i++) { const t = tc[i]; if (Math.abs(t) < 1e-9 || a.naive) continue; const lo = hinge ? env.lo : env.lo[i], hi = hinge ? env.hi : env.hi[i];
          const cur = Math.max(lo, Math.min(hi, S1[i])), head = t > 0 ? Math.max(0, hi - cur) : Math.max(0, cur - lo), sEnv = Math.min(1, head / Math.abs(t));
          const sCon = t * H[i] < 0 ? Math.min(1, ARB.kappa[c] * Math.abs(H[i]) / Math.abs(t)) : 1; s[i] = Math.max(0, Math.min(sEnv, sCon)); why[i] = s[i] < 1 - 1e-9 ? (sCon < sEnv ? "conflict" : "envelope") : ""; }
        scale[c] = s; for (const t of L) { t.alw = t.req.map((x, i) => x * s[i]); if (this.ledger) { const y = t.req.map((x, i) => Math.abs(x) * (1 - s[i])); if (Math.max(...y) > 1e-6) yielded.push({ m: t.m, c, amt: y, why: why.slice() }); } }
        const add = tc.map((x, i) => x * s[i]); S1 = V.add(S1, add); H = V.add(H, add); }
      // compose: no lower-class request → the approved controller's own target, bit for bit (parity); otherwise the same composition with the
      // allowed lower-class offsets added to the core offset (one equilibrium point, one motor)
      let fin = coreFinal; if (anyLower) { const lowOff = lower.reduce((acc, t) => V.add(acc, V.sc(t.alw || t.req, 1 / kp)), [0, 0, 0]);
        fin = hinge ? P.nominal[k] + Math.max(-ARB.offClamp, Math.min(ARB.offClamp, coreOff[0] + lowOff[0])) : Q.norm(Q.mul(P.nominal[k], expmap(clampVec(V.add(coreOff, lowOff), ARB.offClamp)))); }
      if (arm && !anyLower) fin = coreFinal;   // (C4 torque-source arms: the controller's own composition)
      const lim = anyLower && !hinge ? this._env(k, hinge, budgetLimits(m, q, fin), om) : env;
      out.final.push(fin); out.vel.push(vt); out.motor.push({ kp, kd }); out.limits.push(lim);
      if (this.ledger) out.led.push({ k, joint: j.name, hinge, terms: [...terms.map(t => ({ m: t.m, c: t.c, kind: t.kind, req: hinge ? t.req[0] : t.req })), ...lower.map(t => ({ m: t.m, c: t.c, kind: t.kind, req: hinge ? t.req[0] : t.req, alw: hinge ? (t.alw || t.req)[0] : (t.alw || t.req) }))],
        pred: hinge ? S1[0] : S1, env: lim, yielded, owner: own.module, kp, kd, clampOff: anyLower ? +Math.hypot(...V.add(coreOff, lower.reduce((acc, t) => V.add(acc, V.sc(t.alw || t.req, 1 / kp)), [0, 0, 0]))).toFixed(3) : +Math.hypot(...coreOff).toFixed(3) }); });
    this.last = out; return out; }
  // envelope: the approved directional budget, scaled by the (permissive) torque–velocity factor and activation
  _env(k, hinge, bud, om) { if (!ARB.fv.enabled && ARB.act.floor >= 1) return bud;
    const f = (i) => 1;   // G5: torque–velocity from ARB.fv and the joint's velocity capability
    return hinge ? { lo: bud.lo * f(0), hi: bud.hi * f(0) } : { lo: bud.lo.map((x, i) => x * f(i)), hi: bud.hi.map((x, i) => x * f(i)) }; }
  // after the physics step: the REALIZED motor torque (Jolt's accumulated motor impulse / control dt, summed over substeps by the runner)
  realize(lams, dt) { if (!this.last) return; this.last.led.forEach((e, k) => { const l = lams[k]; e.real = e.hinge ? l / dt : l.map(x => x / dt);
    const lo = e.env.lo, hi = e.env.hi; e.sat = e.hinge ? (e.real >= 0 ? hi > 0 && e.real >= 0.98 * hi : lo < 0 && e.real <= 0.98 * lo) : e.real.map((x, i) => x >= 0 ? hi[i] > 0 && x >= 0.98 * hi[i] : lo[i] < 0 && x <= 0.98 * lo[i]); }); }
}
// ownership of each joint's posture target, from what the balance controller did this step (roles: stance legs P0, swing / replant P1)
export function ownerOf(spec, parts) { const legOf = (n) => /_(L|R)$/.test(n) && /^(hip|knee|ankle)_/.test(n) ? n.slice(-1) : null;
  return (k) => { const n = spec.joints[k].name, s = legOf(n);
    if (parts.released) return { module: "tone (fall release)", cls: "P0" };
    if (s && parts.stance.includes(s)) return { module: "stance", cls: "P0" };
    if (s && parts.swing.includes(s)) return { module: "swing", cls: "P1" };
    if (s && parts.replant.includes(s)) return { module: "replant", cls: "P1" };
    if (n === "lumbar" && parts.lean) return { module: "lean", cls: "P1" };
    return { module: "posture", cls: "P0" }; }; }
