// PPR-3 P2: continuous delayed postural control (nervous-system feedback on PAST sensed state). It runs every step from t = 0, before and
// regardless of any disturbance; it has no trigger, no contact / force / label / outcome input and no future input.
// CAUSALITY BY CONSTRUCTION: step(n, st, ev) (i) computes the sensor sample of the CURRENT state and stores it in a ring buffer, then (ii) calls the
// control function with a frozen view that exposes ONLY samples n − d_ch (one per channel; samples before t = 0 are the entry sample: the body
// has been standing still in the entry posture). The control function never receives st / ev. Every command is logged with the sample index each
// channel used (the "sensed timestamp"), so causal identity can be audited step by step.
// Sensors (body states only; what proprioception + vestibular estimation can provide):
//   com:   whole-body COM position relative to the ankle midpoint (horizontal), COM velocity (horizontal)
//   seg:   for each orientation channel, the rotation (relative to entry) of the line joint → supported-mass COM, as a rotation vector, and its rate
//   joint: anatomical joint angles and rates (all actuated axes)
// Output: Δτ[k][i] (N·m, constraint-parameter sense) added to the tonic target torque; the body (ppr3_body.mjs) turns it into excitation.
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const ST = await import(new URL("./ppr3_statics.mjs", import.meta.url).href), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// deterministic motor noise (seeded): mulberry32 → Box–Muller, first-order low-pass; part of the neural command (not mechanics)
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rotvec = (q) => { const s = q[3] < 0 ? -1 : 1, x = q.slice(0, 3).map(v => v * s), w = q[3] * s, n = V.len(x); if (n < 1e-12) return [0, 0, 0]; const ang = 2 * Math.atan2(n, w); return V.sc(x, ang / n); };
export class P2Controller {
  // params: { id, delays: { com, seg, joint } (steps), com: { kP, kD } (× gravity normalisation), seg: { lumbar | thoracic | hip | neck: {kP,kD} }, knee: { kP, kD, G } }
  constructor(params) { this.p = params; this.ring = new Map(); this.log = { n: [], cmd: [], sensed: [] }; this.maxD = Math.max(...Object.values(params.delays));
    if (params.noise) { const r = mulberry32(params.noise.seed >>> 0); this.gauss = () => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; this.nz = new Map(); } }
  attach(body, plant, c) { this.body = body; this.c = c; this.h = plant.dt; const st = unitStates(c.st), spec = c.spec, B = spec.bodies, M = c.ctrl.M, P = c.P;
    this.M = M; this.feet = c.ctrl.feet; this.ank = ["ankle_L", "ankle_R"].map(n => spec.joints.findIndex(j => j.name === n));
    const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    const jk = (n) => spec.joints.findIndex(j => j.name === n), J = (n) => spec.joints[jk(n)];
    // orientation channels: joint(s), the supported bodies (rotating about the joint), axes
    const pelvis = B.findIndex(b => b.name === "pelvis"), legs = ["L", "R"].flatMap(s => sub(J("hip_" + s).childIndex)), upper = B.map((_, i) => i).filter(i => !legs.includes(i));
    this.segDef = { lumbar: { joints: [jk("lumbar")], bodies: sub(J("lumbar").childIndex) }, thoracic: { joints: [jk("thoracic")], bodies: sub(J("thoracic").childIndex) }, hip: { joints: [jk("hip_L"), jk("hip_R")], bodies: upper }, neck: { joints: [jk("neck")], bodies: sub(J("neck").childIndex) } };
    this.kneeJ = [jk("knee_L"), jk("knee_R")];
    // static maps at the entry posture (computed once; they are geometry, not state feedback)
    this.Jf = ST.comForceJacobian(c, st);
    const base = ST.staticsG(c, st, [0, -9.81, 0]).tff, d = 1e-3;
    for (const [name, S] of Object.entries(this.segDef)) { const j0 = spec.joints[S.joints[0]], piv = S.joints.length === 1 ? c.ctrl.jointAt(st, S.joints[0]) : V.sc(V.add(c.ctrl.jointAt(st, S.joints[0]), c.ctrl.jointAt(st, S.joints[1])), 0.5);
      const axW = E.map(e => Q.rot(Q.mul(st[j0.childIndex].rot, P.jd[S.joints[0]].F2), e));
      S.pivot0 = piv; S.com0 = this._com(st, S.bodies); S.axW = axW;
      // gravitational stiffness: rotate the supported bodies about the pivot around each world axis; G[axisIdx][joint k][i] = ∂τ_static/∂θ
      S.G = [0, 1, 2].map(a => { const st2 = ST.rotateBodies(st, S.bodies, piv, axW[a], d), t2 = ST.staticsG(c, st2, [0, -9.81, 0]).tff; return S.joints.map(k => t2[k].map((t, i) => (t - base[k][i]) / d)); }); }
    this.entry = this._sample(st, unitEv(c.up.ev)); this.nAx = 0; }
  _com(st, ids) { const B = this.c.spec.bodies; let m = 0, x = [0, 0, 0]; for (const i of ids) { x = V.add(x, V.sc(st[i].com, B[i].mass)); m += B[i].mass; } return V.sc(x, 1 / m); }
  _sample(st, ev) { const B = this.c.spec.bodies, P = this.c.P, M = this.M; let cm = [0, 0, 0], vm = [0, 0, 0]; st.forEach((b, i) => { cm = V.add(cm, V.sc(b.com, B[i].mass)); vm = V.add(vm, V.sc(b.v, B[i].mass)); }); cm = V.sc(cm, 1 / M); vm = V.sc(vm, 1 / M);
    const am = V.sc(V.add(this.c.ctrl.jointAt(st, this.ank[0]), this.c.ctrl.jointAt(st, this.ank[1])), 0.5);
    const seg = {}; for (const [name, S] of Object.entries(this.segDef)) { const piv = S.joints.length === 1 ? this.c.ctrl.jointAt(st, S.joints[0]) : V.sc(V.add(this.c.ctrl.jointAt(st, S.joints[0]), this.c.ctrl.jointAt(st, S.joints[1])), 0.5);
      const r = V.norm(V.sub(this._com(st, S.bodies), piv)); let mm = 0, vv = [0, 0, 0]; for (const i of S.bodies) { vv = V.add(vv, V.sc(st[i].v, B[i].mass)); mm += B[i].mass; }
      seg[name] = { r, vRel: V.sub(V.sc(vv, 1 / mm), this._pivVel(st, S)), L: V.len(V.sub(this._com(st, S.bodies), piv)) }; }
    const joint = this.kneeJ.map(k => P.anat(P.jd[k], ev.qs[k], "flex"));
    return { com: [cm[0] - am[0], cm[2] - am[2]], comV: [vm[0], vm[2]], seg, knee: joint, kneeQ: this.kneeJ.map(k => ev.qs[k].slice()) }; }
  _pivVel(st, S) { const vs = S.joints.map(k => { const j = this.c.spec.joints[k], b = st[j.parentIndex], p = this.c.ctrl.jointAt(st, k); return V.add(b.v, V.cross(b.w, V.sub(p, b.com))); }); return vs.length === 1 ? vs[0] : V.sc(V.add(vs[0], vs[1]), 0.5); }
  step(n, st, ev) { st = unitStates(st); ev = unitEv(ev); const s = this._sample(st, ev); this.ring.set(n, s); this.ring.delete(n - this.maxD - 3);
    const D = this.p.delays, at = (dd) => (n - dd >= 0 ? this.ring.get(n - dd) : this.entry), view = Object.freeze({ com: at(D.com), seg: at(D.seg), joint: at(D.joint), comPrev: at(D.com + 1), segPrev: at(D.seg + 1), jointPrev: at(D.joint + 1) });
    const cmd = this.control(view), sensed = [n - D.com, n - D.seg, n - D.joint];
    this.log.n.push(n); this.log.cmd.push(cmd.flat); this.log.sensed.push(sensed); return cmd.dTau; }
  // the control law: a function of the delayed view only
  control(vw) { const p = this.p, e = this.entry, h = this.h, out = this.c.spec.joints.map(() => [0, 0, 0]);
    // (1) COM over the feet: virtual force f = K·Δx + B·v (N), K = kP·M·g/h_c, B = kD·M·g/h_c (Peterka's mgh-normalised gains per metre of COM), Δτ = J_f·f
    const hc = 0.98, Kc = p.com.kP * this.M * 9.81 / hc, Bc = p.com.kD * this.M * 9.81 / hc, dx = vw.com.com[0] - e.com[0], dz = vw.com.com[1] - e.com[1], fx = Kc * dx + Bc * vw.com.comV[0], fz = Kc * dz + Bc * vw.com.comV[1];
    this.Jf.forEach((r, k) => r.forEach((jj, i) => { if (jj) out[k][i] += jj[0] * fx + jj[1] * fz; }));
    // (2) segmental orientation: rotation of the supported-mass line about its joint; Δτ = (kP·G)·θ + (kD·G)·θ̇ per axis (G = ∂τ_static/∂θ: gravity-normalised; kP > 1 stabilises)
    for (const [name, S] of Object.entries(this.segDef)) { const g = p.seg[name]; if (!g) continue; const s1 = vw.seg.seg[name], s0 = e.seg[name], rv = V.cross(s0.r, s1.r), wv = V.sc(V.cross(s1.r, s1.vRel), 1 / Math.max(1e-6, s1.L));
      for (let a = 0; a < 3; a++) { const th = V.dot(rv, S.axW[a]), om = V.dot(wv, S.axW[a]); S.joints.forEach((k, jI) => S.G[a][jI].forEach((G, i) => { if (Math.abs(G) > 1e-9 && this.c.act.ax[k][i]) out[k][i] += g.kP * G * th + g.kD * G * om; })); } }
    // (3) knee (squat mode): joint angle and rate (proprioception); Δτ = −(kP·Gk)·Δθ − (kD·Gk)·θ̇, Gk = p.knee.G (N·m/rad, squat-mode gravitational stiffness per knee)
    if (p.knee) this.kneeJ.forEach((k, jI) => { const s = this.c.act.ax[k][1].s, dth = (vw.joint.knee[jI] - e.knee[jI]) * Math.PI / 180, om = (vw.joint.knee[jI] - vw.jointPrev.knee[jI]) * Math.PI / 180 / h; out[k][1] += -s * (p.knee.kP * p.knee.G * dth + p.knee.kD * p.knee.G * om); });
    // (4) motor noise: per listed axis "fam.key", low-pass filtered Gaussian (σ N·m after filtering, time constant τ s); independent of any disturbance
    if (p.noise) { const a = Math.exp(-h / p.noise.tau), g = Math.sqrt(1 - a * a); this.c.spec.joints.forEach((j, k) => { const fam = j.name.replace(/_[LR]$/, "");
      [0, 1, 2].forEach(i => { const x = this.c.act.ax[k][i]; if (!x || !p.noise.axes.includes(fam + "." + x.key)) return; const id = k * 3 + i, prev = this.nz.get(id) || 0, v = a * prev + g * p.noise.sigma * this.gauss(); this.nz.set(id, v); out[k][i] += v; }); }); }
    return { dTau: out, flat: Float64Array.from(out.flat()) }; }
  meta() { return { params: this.p, steps: this.log.n.length }; }
}
// S2 alone with the commands a P2 run issued (deafferented replay): the body receives exactly the baseline run's Δτ sequence
export class ReplayController { constructor(log, from = 0) { this.L = log; this.from = from; this.log = { n: [], cmd: [], sensed: [] }; }
  attach(body, plant, c) { this.c = c; this.nj = c.spec.joints.length; }
  step(n) { const f = this.L.cmd[this.L.n.indexOf(n)]; const out = []; for (let k = 0; k < this.nj; k++) out.push(f ? [f[3 * k], f[3 * k + 1], f[3 * k + 2]] : [0, 0, 0]); this.log.n.push(n); this.log.cmd.push(f || null); this.log.sensed.push(null); return out; }
  meta() { return { replay: true, steps: this.log.n.length }; } }
