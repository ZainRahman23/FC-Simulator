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
  constructor(params) { this.p = params; this.ring = new Map(); this.log = { n: [], cmd: [], sensed: [] }; const D = params.delays;
    this.maxD = Math.max(D.com, D.knee, D.joint || 0, ...Object.values(D.seg)); this.filt = null;
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
      // gravitational stiffness: rotate the supported bodies about the pivot around each world axis; G[axisIdx][joint k][i] = ∂τ_static/∂θ (reported)
      S.G = [0, 1, 2].map(a => { const st2 = ST.rotateBodies(st, S.bodies, piv, axW[a], d), t2 = ST.staticsG(c, st2, [0, -9.81, 0]).tff; return S.joints.map(k => t2[k].map((t, i) => (t - base[k][i]) / d)); });
      // static load sensitivity to the supported mass's HORIZONTAL OFFSET from its joint (what gravity acts on): translate the supported bodies by δ
      // along world x / z; Jd[0|1][joint][i] = ∂τ_static/∂d (N·m per m). P2 senses the offset change and supplies κ × the static load change.
      const dd = 1e-4, shift = (v) => st.map((b, i) => (S.bodies.includes(i) ? { ...b, pos: V.add(b.pos, v), com: V.add(b.com, v) } : b));
      S.Jd = [[dd, 0, 0], [0, 0, dd]].map(v => { const t2 = ST.staticsG(c, shift(v), [0, -9.81, 0]).tff; return S.joints.map(k => t2[k].map((t, i) => (t - base[k][i]) / dd)); }); }
    // COM channel acts through the LEGS only (ankle / hip strategies; the spine is governed by the orientation channels)
    const legJ = new Set(["ankle_L", "ankle_R", "knee_L", "knee_R", "hip_L", "hip_R"].map(jk)), comKeys = this.p.comAxes || null;
    this.Jf = this.Jf.map((r, k) => (legJ.has(k) ? r.map((v, i) => (v && (!comKeys || (c.act.ax[k][i] && comKeys.includes(c.act.ax[k][i].key))) ? v : null)) : r.map(() => null)));
    this.entry = this._sample(st, unitEv(c.up.ev)); this.nAx = 0; }
  _com(st, ids) { const B = this.c.spec.bodies; let m = 0, x = [0, 0, 0]; for (const i of ids) { x = V.add(x, V.sc(st[i].com, B[i].mass)); m += B[i].mass; } return V.sc(x, 1 / m); }
  _sample(st, ev) { const B = this.c.spec.bodies, P = this.c.P, M = this.M; let cm = [0, 0, 0], vm = [0, 0, 0]; st.forEach((b, i) => { cm = V.add(cm, V.sc(b.com, B[i].mass)); vm = V.add(vm, V.sc(b.v, B[i].mass)); }); cm = V.sc(cm, 1 / M); vm = V.sc(vm, 1 / M);
    const am = V.sc(V.add(this.c.ctrl.jointAt(st, this.ank[0]), this.c.ctrl.jointAt(st, this.ank[1])), 0.5);
    const seg = {}; for (const [name, S] of Object.entries(this.segDef)) { const piv = S.joints.length === 1 ? this.c.ctrl.jointAt(st, S.joints[0]) : V.sc(V.add(this.c.ctrl.jointAt(st, S.joints[0]), this.c.ctrl.jointAt(st, S.joints[1])), 0.5);
      const r = V.norm(V.sub(this._com(st, S.bodies), piv)); let mm = 0, vv = [0, 0, 0]; for (const i of S.bodies) { vv = V.add(vv, V.sc(st[i].v, B[i].mass)); mm += B[i].mass; }
      const off = V.sub(this._com(st, S.bodies), piv), vRel = V.sub(V.sc(vv, 1 / mm), this._pivVel(st, S));
      seg[name] = { r, vRel, L: V.len(off), d: [off[0], off[2]], dd: [vRel[0], vRel[2]] }; }
    const joint = this.kneeJ.map(k => P.anat(P.jd[k], ev.qs[k], "flex")), ang = this.c.spec.joints.map((j, k) => [0, 1, 2].map(i => { const x = this.c.act.ax[k][i]; return x ? P.anat(P.jd[k], ev.qs[k], x.key) : 0; }));
    return { com: [cm[0] - am[0], cm[2] - am[2]], comV: [vm[0], vm[2]], seg, knee: joint, ang }; }
  _pivVel(st, S) { const vs = S.joints.map(k => { const j = this.c.spec.joints[k], b = st[j.parentIndex], p = this.c.ctrl.jointAt(st, k); return V.add(b.v, V.cross(b.w, V.sub(p, b.com))); }); return vs.length === 1 ? vs[0] : V.sc(V.add(vs[0], vs[1]), 0.5); }
  step(n, st, ev) { st = unitStates(st); ev = unitEv(ev); const s = this._sample(st, ev); this.ring.set(n, s); this.ring.delete(n - this.maxD - 3);
    // the frozen view: per channel, ONLY the sample (and the one before it) at that channel's delay; nothing newer exists in the view
    const D = this.p.delays, at = (dd) => (n - dd >= 0 ? this.ring.get(n - dd) : this.entry), seg = {}, segPrev = {};
    for (const name of Object.keys(D.seg)) { seg[name] = at(D.seg[name]); segPrev[name] = at(D.seg[name] + 1); }
    const view = Object.freeze({ com: at(D.com), comPrev: at(D.com + 1), seg: Object.freeze(seg), segPrev: Object.freeze(segPrev), knee: at(D.knee), kneePrev: at(D.knee + 1), joint: D.joint ? at(D.joint) : null, jointPrev: D.joint ? at(D.joint + 1) : null });
    const cmd = this.control(view), sensed = [n - D.com, ...Object.values(D.seg).map(d => n - d), n - D.knee, ...(D.joint ? [n - D.joint] : [])];
    this.log.n.push(n); this.log.cmd.push(cmd.flat); this.log.sensed.push(sensed); return cmd.dTau; }
  // the control law: a function of the delayed view only
  control(vw) { const p = this.p, e = this.entry, h = this.h, raw = this.c.spec.joints.map(() => [0, 0, 0]), mgh = this.M * 9.81 * 0.892;
    // (1) COM over the feet: virtual force f = K·Δx + B·v (N), K = kP·mgh/h², B = kD·mgh/h² (Peterka's mgh-normalised gains, h = COM height above
    //     the ankles 0.892 m; kP, kD in mgh and mgh·s), mapped to joint torques by the static Jacobian transpose J_f (ppr3_statics.mjs)
    // kP / kD may be [AP, ML]: each direction's gain = its own target minus that direction's measured intrinsic stiffness
    const hc = 0.892, pick = (v, j) => (Array.isArray(v) ? v[j] : v), n2 = mgh / (hc * hc), dx = vw.com.com[0] - e.com[0], dz = vw.com.com[1] - e.com[1];
    // optional integral term (Peterka 2002 PID, K_I in mgh/s): the integral of the DELAYED COM offset (accumulated once per step)
    if (!this.ci) this.ci = [0, 0]; if (p.com.kI) { this.ci[0] += dx * h; this.ci[1] += dz * h; }
    const fx = pick(p.com.kP, 0) * n2 * dx + pick(p.com.kD, 0) * n2 * vw.com.comV[0] + (p.com.kI ? pick(p.com.kI, 0) * n2 * this.ci[0] : 0), fz = pick(p.com.kP, 1) * n2 * dz + pick(p.com.kD, 1) * n2 * vw.com.comV[1] + (p.com.kI ? pick(p.com.kI, 1) * n2 * this.ci[1] : 0);
    this.Jf.forEach((r, k) => r.forEach((jj, i) => { if (jj) raw[k][i] += jj[0] * fx + jj[1] * fz; }));
    // (2) segmental posture: the supported mass's horizontal offset from its joint (relative to entry) and its rate; Δτ = kP·(Jd·Δd) + kD·(Jd·ḋ),
    //     Jd = ∂τ_static/∂d (so kP = 1 supplies exactly the static gravity-load change; kP dimensionless, kD in s)
    for (const [name, S] of Object.entries(this.segDef)) { const g = p.seg[name]; if (!g) continue; const s1 = vw.seg[name].seg[name], s0 = e.seg[name], dx = s1.d[0] - s0.d[0], dz = s1.d[1] - s0.d[1];
      const kP = Array.isArray(g.kP) ? Math.max(...g.kP) : g.kP, kD = Array.isArray(g.kD) ? Math.max(...g.kD) : g.kD;
      // g.axes (optional): the actuated axis keys this channel may command (distinct roles: e.g. the hip posture channel acts in flexion only;
      // frontal-plane hip load/unload belongs to the COM channel)
      S.joints.forEach((k, jI) => S.Jd[0][jI].forEach((jx, i) => { const x = this.c.act.ax[k][i]; if (!x || (g.axes && !g.axes.includes(x.key))) return; const jz = S.Jd[1][jI][i]; raw[k][i] += kP * (jx * dx + jz * dz) + kD * (jx * s1.dd[0] + jz * s1.dd[1]); })); }
    // (3) knee squat mode: knee angle and rate (proprioception); Δτ = −(kP·Gk)·Δθ − (kD·Gk)·θ̇, Gk = squat-mode gravitational stiffness per knee
    if (p.knee) this.kneeJ.forEach((k, jI) => { const s = this.c.act.ax[k][1].s, dth = (vw.knee.knee[jI] - e.knee[jI]) * Math.PI / 180, om = (vw.knee.knee[jI] - vw.kneePrev.knee[jI]) * Math.PI / 180 / h; raw[k][1] += -s * (p.knee.kP * p.knee.G * dth + p.knee.kD * p.knee.G * om); });
    // (3b) joint posture (proprioception): every actuated axis is regulated toward its entry angle with the stiffness its muscles LOSE to stress
    //      relaxation, K_j = kRelax·K_short-range(entry) (kRelax = 1 − fRes), damping 2ζ√(K_j·I); the low-frequency joint stiffness so returns to,
    //      and never exceeds, the muscles' own short-range level. A frozen-pose element by construction — delayed, filtered, muscle-capped.
    if (p.joint && vw.joint) { if (!this.jK) this.jK = this.body.ax.map(ax => ax.rows.map(r => { if (!r || (p.joint.axes && !p.joint.axes.includes(ax.fam + "." + r.key))) return null; const K = p.joint.kRelax * (r.kP * r.u0[0] * r.cP + r.kM * r.u0[1] * r.cM); return { K, D: 2 * p.joint.zeta * Math.sqrt(K * r.I), s: r.s }; }));
      this.jK.forEach((row, k) => row.forEach((g, i) => { if (!g) return; const dth = (vw.joint.ang[k][i] - e.ang[k][i]) * Math.PI / 180, om = (vw.joint.ang[k][i] - vw.jointPrev.ang[k][i]) * Math.PI / 180 / h; raw[k][i] += -g.s * (g.K * dth + g.D * om); })); }
    // (4) EMG → torque dynamics: critically damped second-order filter per axis (ω rad/s) on the neural command (POSTURAL_TIMING §controller delays)
    if (!this.filt) this.filt = raw.map(r => r.map(() => [0, 0])); const out = raw.map(r => [0, 0, 0]), w = p.filter ? p.filter.omega : null;
    raw.forEach((r, k) => r.forEach((u, i) => { if (!w) { out[k][i] = u; return; } const f = this.filt[k][i], acc = w * w * (u - f[0]) - 2 * w * f[1]; f[1] += h * acc; f[0] += h * f[1]; out[k][i] = f[0]; }));
    // (5) motor noise at the force level: signal-dependent, SD = cv·√(F⁺² + F⁻²) per axis (entry forces), low-pass τ; independent of any disturbance
    if (p.noise) { const a = Math.exp(-h / p.noise.tau), g = Math.sqrt(1 - a * a); this.body.ax.forEach(ax => ax.rows.forEach((r, i) => { if (!r || (p.noise.axes && !p.noise.axes.includes(ax.fam + "." + r.key))) return; const sd = p.noise.sdNm != null ? p.noise.sdNm : p.noise.cv * Math.hypot(r.u0[0] * r.cP, r.u0[1] * r.cM), id = ax.k * 3 + i, v = a * (this.nz.get(id) || 0) + g * sd * this.gauss(); this.nz.set(id, v); out[ax.k][i] += v; })); }
    return { dTau: out, flat: Float64Array.from(out.flat()) }; }
  meta() { return { params: this.p, steps: this.log.n.length }; }
}
// S2 alone with the commands a P2 run issued (deafferented replay): the body receives exactly the baseline run's Δτ sequence
export class ReplayController { constructor(log, from = 0) { this.L = log; this.from = from; this.log = { n: [], cmd: [], sensed: [] }; }
  attach(body, plant, c) { this.c = c; this.nj = c.spec.joints.length; }
  step(n) { const f = this.L.cmd[this.L.n.indexOf(n)]; const out = []; for (let k = 0; k < this.nj; k++) out.push(f ? [f[3 * k], f[3 * k + 1], f[3 * k + 2]] : [0, 0, 0]); this.log.n.push(n); this.log.cmd.push(f || null); this.log.sensed.push(null); return out; }
  meta() { return { replay: true, steps: this.log.n.length }; } }
