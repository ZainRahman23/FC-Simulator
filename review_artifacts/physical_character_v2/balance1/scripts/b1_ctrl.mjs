// BALANCE-1: continuous, delayed, coordinated whole-body postural control on the M1b body (successor of PPR-3's P2; P2 is historical evidence).
// It runs every step from t = 0, before and regardless of any disturbance: no trigger, no contact / force / label / outcome / future input.
// CAUSALITY BY CONSTRUCTION. Each step the controller (i) samples the CURRENT physical state into a sensor ring keyed by its step index, then
// (ii) builds, per sensory channel, a frozen observation holding only the samples at that channel's delay, and (iii) answers from those
// observations (plus, in variant B, its OWN past commands through an internal model that never sees the plant). The control law never receives
// st / ev. Every command is logged with the physical step index behind each channel's observation (auditable delay). All geometric maps are
// computed ONCE at the standing entry (no current-state geometry).
// OUTPUT: net-torque INTENT Δτ per actuated axis on top of the tonic rest-statics intent; the body converts intent → EXCITATION (canonical
// allocator); the M1b muscles (delay → activation → developed force) make the physical torque. No torque, no muscle-state access or reset.
// OBJECTIVES (whole body; joints are not individually returned to a pose):
//   body / support  the COM's horizontal state relative to the centre of the feet (AP, ML): a virtual COM force through the legs' static Jacobian
//                   (ankle / knee / hip of both legs together: ankle strategy, ML load transfer) — PID + COM-acceleration feedback
//   upper body      the HAT's (pelvis + trunk + head + arms) lean in space about the hips (graviceptive load + canal rate): hips (sagittal);
//                   the upper trunk's lean about the lumbar joint: lumbar + thoracic (sagittal, frontal) — gravity-load maps × gain
//   head            head lean in space (vestibulocollic): neck
//   support height  the squat mode (both knees)
//   posture         weak, compliant, only on axes with no task and no gravitational role (axial rotations, arms)
// Variant B adds a limited internal model for the COM channel: the delayed COM observation is propagated over the sensory delay with the
// controller's own efference copy (commanded COM force → modelled muscle lag) and the known inverted-pendulum dynamics. It cannot see the
// disturbance before the delayed observation contains it.
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const ST = await import(RA + "ppr3/scripts/ppr3_statics.mjs"), { unitStates, unitEv } = await import(P2 + "core/v2_math.js");
const G0 = 9.81;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export class BalanceController {
  constructor(params) { this.p = params; this.ring = new Map(); this.log = { n: [], cmd: [], sensed: [] }; this.maxD = Math.max(...Object.values(params.delays)) + 8; this.ci = [0, 0];
    if (params.noise) { const r = mulberry32(params.noise.seed >>> 0); this.gauss = () => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; this.nz = new Map(); } }
  attach(body, plant, c) { this.body = body; this.c = c; this.h = plant.dt; if (!body.ax) throw new Error("BalanceController: body entry constants required"); const st = unitStates(c.st), spec = c.spec, B = spec.bodies; this.M = c.ctrl.M;
    const jk = (n) => spec.joints.findIndex(j => j.name === n), kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
    this.J = { ankL: jk("ankle_L"), ankR: jk("ankle_R"), kneeL: jk("knee_L"), kneeR: jk("knee_R"), hipL: jk("hip_L"), hipR: jk("hip_R"), lumbar: jk("lumbar"), thoracic: jk("thoracic"), neck: jk("neck") };
    const legs = ["hip_L", "hip_R"].flatMap(n => sub(spec.joints[jk(n)].childIndex)), pelvis = B.findIndex(b => b.name === "pelvis");
    // the supported-mass groups and their pivots (entry geometry)
    // each spine joint supports a different mass, so each is a group (a single "upper-body lean" group leaves the lumbar-vs-thoracic bending mode
    // unobserved: design iteration D2)
    this.grp = { hat: { joints: [this.J.hipL, this.J.hipR], bodies: B.map((_, i) => i).filter(i => !legs.includes(i)), pivot: "hipMid" }, trunk: { joints: [this.J.lumbar], bodies: sub(spec.joints[this.J.lumbar].childIndex), pivot: this.J.lumbar },
      upper: { joints: [this.J.thoracic], bodies: sub(spec.joints[this.J.thoracic].childIndex), pivot: this.J.thoracic }, head: { joints: [this.J.neck], bodies: sub(spec.joints[this.J.neck].childIndex), pivot: this.J.neck } };
    this.bodyOf = { pelvis, thorax: spec.joints[this.J.thoracic].childIndex, head: spec.joints[this.J.neck].childIndex };
    // each group's BASE segment (the segment its own joint carries): hips → pelvis, lumbar → its child, thoracic → thorax, neck → head
    this.grp.hat.base = pelvis; this.grp.trunk.base = spec.joints[this.J.lumbar].childIndex; this.grp.upper.base = this.bodyOf.thorax; this.grp.head.base = this.bodyOf.head;
    // (1) the legs' COM-force Jacobian (statics with a uniform horizontal field; ppr3_statics.mjs), legs only, task axes only
    // p.com.joints (optional): the joints that share the COM force — default the legs; ["ankle","knee","hip","lumbar","thoracic","neck"] adds the spine,
    // so the commanded pattern is the full rigid-body one (each joint supports the mass above it against the commanded acceleration) and the trunk
    // is carried with the body instead of bent by the hips (design iteration D9)
    const Jf = ST.comForceJacobian(c, st), legJ = this.p.com.joints ? new Set(spec.joints.map((j, k) => (this.p.com.joints.includes(j.name.replace(/_[LR]$/, "")) ? k : -1)).filter(k => k >= 0)) : new Set([this.J.ankL, this.J.ankR, this.J.kneeL, this.J.kneeR, this.J.hipL, this.J.hipR]);
    // optional per-direction actuation sets: axesAP for the x column, axesML for the z column (default: com.axes for both)
    const aAP = this.p.com.axesAP || this.p.com.axes, aML = this.p.com.axesML || this.p.com.axes;
    this.Jf = Jf.map((r, k) => (legJ.has(k) ? r.map((v, i) => { const x = c.act.ax[k][i]; if (!v || !x) return null; const ux = aAP.includes(x.key) ? v[0] : 0, uz = aML.includes(x.key) ? v[1] : 0; return ux || uz ? [ux, uz] : null; }) : r.map(() => null)));
    // (2) gravity-load maps: Jd[g][0|1][joint][axis] = ∂τ_static/∂(horizontal offset of the group's COM along world x | z), N·m per m
    const base = ST.staticsG(c, st, [0, -G0, 0]).tff, dd = 1e-4;
    for (const g of Object.values(this.grp)) { const shift = (v) => st.map((b, i) => (g.bodies.includes(i) ? { ...b, pos: V.add(b.pos, v), com: V.add(b.com, v) } : b));
      g.Jd = [[dd, 0, 0], [0, 0, dd]].map(v => { const t2 = ST.staticsG(c, shift(v), [0, -G0, 0]).tff; return g.joints.map(k => t2[k].map((t, i) => (t - base[k][i]) / dd)); }); }
    this.mode = { ap: this.p.com.G[0], ml: this.p.com.G[1] };
    // posture axes: entry short-range stiffness × kRelax (from the muscle layer's own entry descriptors)
    // entry short-range stiffness of an axis from the ENTRY excitation (the body's entry constants; the muscle state is not read by the controller)
    const u0Of = (k, i) => body.ax.find(a => a.k === k).rows[i].u0, Ksrs = (k, i, m) => { const u = u0Of(k, i); return m.d.kP * u[0] * m.d.cP + m.d.kM * u[1] * m.d.cM; };
    this.post = []; if (this.p.posture) c.act.mx.forEach((row, k) => row.forEach((m, i) => { if (!m) return; const key = spec.joints[k].name.replace(/_[LR]$/, "") + "." + m.d.key; if (!this.p.posture.axes.includes(key)) return;
      const K = this.p.posture.kRelax * Ksrs(k, i, m); this.post.push({ k, i, K, D: 2 * this.p.posture.zeta * Math.sqrt(K * m.d.I), s: m.d.s }); }));
    this.kneeS = [this.J.kneeL, this.J.kneeR].map(k => c.act.ax[k][1].s); this.ax = c.act.ax;
    // (4c) support symmetry (design iteration D11): the COM map drives both ankles together, so the DIFFERENTIAL sagittal lean of the legs (one
    //      leg forward, the other back = pelvis yaw) is regulated by no objective, and under gravity it diverges slowly (each leg carries its share
    //      of the upper body like an inverted pendulum). Its gravitational stiffness per ankle is DERIVED from the entry geometry [E]:
    //      K_d = (M_above / 2)·g·L_hip + m_leg·g·h_legCOM (no fitting); the objective is proprioceptive (ankle angles), like the per-leg knees (D4)
    const legIds = [["hip_L", "ankle_L"], ["hip_R", "ankle_R"]].map(([h]) => sub(spec.joints[jk(h)].childIndex)), mAbove = B.reduce((m, b, i) => (legIds.flat().includes(i) ? m : m + b.mass), 0);
    this.ankS = [this.J.ankL, this.J.ankR].map(k => c.act.ax[k].find(x => x && x.key === "df")); this.ankI = [this.J.ankL, this.J.ankR].map(k => c.act.ax[k].findIndex(x => x && x.key === "df"));
    this.Kdiff = [0, 1].map(l => { const ids = legIds[l], hip = this.c.ctrl.jointAt(st, l ? this.J.hipR : this.J.hipL), ank = this.c.ctrl.jointAt(st, l ? this.J.ankR : this.J.ankL), mc = this._mc(st, ids), mLeg = ids.reduce((m, i) => m + B[i].mass, 0);
      return (mAbove / 2) * G0 * (hip[1] - ank[1]) + mLeg * G0 * (mc.x[1] - ank[1]); });
    this.refl = null; if (this.p.reflex) { this.refl = []; c.act.mx.forEach((row, k) => row.forEach((m, i) => { if (!m) return; const key = spec.joints[k].name.replace(/_[LR]$/, "") + "." + m.d.key; if (!this.p.reflex.axes.includes(key)) return;
      const K = this.p.reflex.gK * Ksrs(k, i, m); this.refl.push({ k, i, K, D: 2 * this.p.reflex.zeta * Math.sqrt(K * m.d.I), s: m.d.s, bar: null }); })); }
    if (this.p.predict) this.pred = { d: this.p.delays.com };
    this.entry = this._sample(st, unitEv(c.up.ev));
    for (const [nm, g] of Object.entries(this.grp)) { g.arm0 = this.entry[nm].arm; g.qInv0 = Q.conj ? Q.conj(st[g.base].rot) : [-st[g.base].rot[0], -st[g.base].rot[1], -st[g.base].rot[2], st[g.base].rot[3]]; }
    this.entry = this._sample(st, unitEv(c.up.ev)); }
  _mc(st, ids) { const B = this.c.spec.bodies; let m = 0, x = [0, 0, 0], v = [0, 0, 0]; for (const i of ids) { x = V.add(x, V.sc(st[i].com, B[i].mass)); v = V.add(v, V.sc(st[i].v, B[i].mass)); m += B[i].mass; } return { x: V.sc(x, 1 / m), v: V.sc(v, 1 / m) }; }
  // the physical sample at this step; each channel reports it only after its own delay
  _sample(st, ev) { const P = this.c.P, J = this.J, ja = (k) => this.c.ctrl.jointAt(st, k), C = this._mc(st, st.map((_, i) => i)), sup = V.sc(V.add(ja(J.ankL), ja(J.ankR)), 0.5);
    // d: the group's COM offset from its pivot (composite, graviceptive load). o: the SEGMENT-FRAME offset — the displacement the group's entry
    //    COM arm would have if carried rigidly by the base segment's current orientation in space (vestibular / graviceptive segment orientation,
    //    gravity-scaled): it observes each segment's own orientation, so internal counter-rotations (pelvis tilt vs lumbar, thorax vs neck) that
    //    leave a composite COM unchanged are not hidden (design iteration D10)
    const off = (g, piv) => { const m = this._mc(st, g.bodies), r = { d: [m.x[0] - piv[0], m.x[2] - piv[2]] }; if (g.arm0) { const q = Q.mul(st[g.base].rot, g.qInv0), a = Q.rot(q, g.arm0); r.o = [a[0] - g.arm0[0], a[2] - g.arm0[2]]; } else { r.arm = V.sub(m.x, piv); } return r; }, hipMid = V.sc(V.add(ja(J.hipL), ja(J.hipR)), 0.5);
    const ang = this.c.spec.joints.map((j, k) => [0, 1, 2].map(i => { const x = this.c.act.ax[k][i]; return x ? P.anat(P.jd[k], ev.qs[k], x.key) : 0; })), pel = st[this.bodyOf.pelvis], tho = st[this.bodyOf.thorax], hd = st[this.bodyOf.head];
    return { com: [C.x[0] - sup[0], C.x[2] - sup[2]], comV: [C.v[0], C.v[2]], hat: off(this.grp.hat, hipMid), trunk: off(this.grp.trunk, ja(J.lumbar)), upper: off(this.grp.upper, ja(J.thoracic)), head: off(this.grp.head, ja(J.neck)),
      wPel: [pel.w[0], pel.w[2]], wTho: [tho.w[0], tho.w[2]], wHead: [hd.w[0], hd.w[2]], knee: [ang[J.kneeL][1], ang[J.kneeR][1]], ang }; }
  step(n, st, ev) { st = unitStates(st); ev = unitEv(ev); this.ring.set(n, this._sample(st, ev)); this.ring.delete(n - this.maxD);
    const D = this.p.delays, at = (d) => (n - d >= 0 ? this.ring.get(n - d) : this.entry), view = {};
    for (const [ch, d] of Object.entries(D)) view[ch] = Object.freeze({ s: at(d), s1: at(d + 1), s6: at(d + 6), sensed: n - d });
    const out = this.control(Object.freeze(view)); this.log.n.push(n); this.log.cmd.push(Float64Array.from(out.flat())); this.log.sensed.push(Object.values(view).map(v => v.sensed)); return out; }
  // the control law: a function of the delayed observations (and, in B, of the controller's own past commands)
  control(vw) { const p = this.p, h = this.h, e = this.entry, out = this.c.spec.joints.map(() => [0, 0, 0]), pk = (v, j) => (Array.isArray(v) ? v[j] : v);
    // (1) body / support. The COM state reaches each destination with that destination's latency (literature §19.2: task-level body state →
    //     ankle (and knee) muscles 100 ms, → hip / trunk muscles 75 ms): p.com.hipChannel (optional) is the channel feeding the hip axes of the map
    const G = [this.mode.ap, this.mode.ml], comF = (O, ci, d) => { let x = [O.s.com[0] - e.com[0], O.s.com[1] - e.com[1]], v = O.s.comV.slice(); const acc = [(O.s.comV[0] - O.s6.comV[0]) / (6 * h), (O.s.comV[1] - O.s6.comV[1]) / (6 * h)];
      // optional per-axis prediction (p.predict.axes: [AP?, ML?]; default both) over THIS channel's delay
      if (this.pred) { const [xp, vp] = this._predict(x, v, d), use = this.p.predict.axes || [true, true]; x = [use[0] ? xp[0] : x[0], use[1] ? xp[1] : x[1]]; v = [use[0] ? vp[0] : v[0], use[1] ? vp[1] : v[1]]; }
      if (p.com.kI) { ci[0] += x[0] * h; ci[1] += x[1] * h; }
      // F: the restoring COM force the controller INTENDS (human-normalised gains)
      return [0, 1].map(j => G[j] * (pk(p.com.kP, j) * x[j] + pk(p.com.kD, j) * v[j] + (p.com.kA ? pk(p.com.kA, j) * acc[j] : 0) + (p.com.kI ? pk(p.com.kI, j) * ci[j] : 0))); };
    const F = comF(vw.com, this.ci, p.delays.com), FH = p.com.hipChannel ? comF(vw[p.com.hipChannel], this.ciH || (this.ciH = [0, 0]), p.delays[p.com.hipChannel]) : F;
    // the command is scaled by the measured effectiveness of the coordination map on this body (p.com.eff: the fraction of a commanded COM force
    // that the J_f torque pattern actually delivers to the COM, identified from the body's own response — design iteration D7)
    const eff = p.com.eff || [1, 1], Fc = [F[0] / eff[0], F[1] / eff[1]], FcH = [FH[0] / eff[0], FH[1] / eff[1]], hips = new Set([this.J.hipL, this.J.hipR]);
    this.Jf.forEach((r, k) => r.forEach((jj, i) => { if (!jj) return; const f = hips.has(k) ? FcH : Fc; out[k][i] += jj[0] * f[0] + jj[1] * f[1]; }));
    if (this.pred) this._efference(F, FH);
    // (2)–(3) gravity-load groups: Δτ = kP·(Jd·Δd) + kD·(Jd·ḋ) — the horizontal offset of the supported COM (graviceptive), rate from the observed offset
    // optional slow integral action on each group's offset (Peterka-type K_I, s⁻¹): removes slow postural drift that proportional action alone
    // leaves (design iteration D6: with M1b's history-consistent muscles there is no hidden pose memory)
    // the offset (graviceptive / task-level) arrives on q.channel; its RATE may arrive on a faster proprioceptive channel q.rateChannel (the in-space
    // rate of a segment chain follows from the joint velocities below it and the known geometry: Goodworth & Peterka 2009 proprioceptive velocity 25 ± 6 ms)
    for (const [name, g] of Object.entries(this.grp)) { const q = p[name]; if (!q) continue; const fld = q.frame === "segment" ? "o" : "d", O = vw[q.channel], OR = vw[q.rateChannel || q.channel], s = O.s[name][fld], s0 = e[name][fld], d = [s[0] - s0[0], s[1] - s0[1]], r = OR.s[name][fld], r1 = OR.s1[name][fld], dd = [(r[0] - r1[0]) / h, (r[1] - r1[1]) / h];
      if (q.kI) { g.I = g.I || [0, 0]; g.I[0] += d[0] * h; g.I[1] += d[1] * h; } const kI = q.kI || 0, Ig = g.I || [0, 0];
      g.joints.forEach((k, jI) => g.Jd[0][jI].forEach((jx, i) => { const ax = this.ax[k][i]; if (!ax || (q.axes && !q.axes.includes(ax.key))) return; const jz = g.Jd[1][jI][i]; out[k][i] += q.kP * (jx * d[0] + jz * d[1]) + q.kD * (jx * dd[0] + jz * dd[1]) + kI * (jx * Ig[0] + jz * Ig[1]); })); }
    // (4) support length per leg (each leg's knee, proprioceptive): both legs hold their own length, which also keeps the pelvis level in roll
    //     (a common squat-mode objective alone leaves the knee DIFFERENCE — pelvis roll — unregulated: design iteration D4)
    if (p.knee) { const K = vw[p.knee.channel || "prop"]; [this.J.kneeL, this.J.kneeR].forEach((k, jI) => { const dth = (K.s.knee[jI] - e.knee[jI]) * Math.PI / 180, om = (K.s.knee[jI] - K.s1.knee[jI]) * Math.PI / 180 / h; out[k][1] += -this.kneeS[jI] * p.knee.G * (p.knee.kP * dth + p.knee.kD * om); }); }
    if (p.support) { const K = vw[p.support.channel], q = p.support, dg = (O) => ((O.ang[this.J.ankL][this.ankI[0]] - e.ang[this.J.ankL][this.ankI[0]]) - (O.ang[this.J.ankR][this.ankI[1]] - e.ang[this.J.ankR][this.ankI[1]])) / 2 * Math.PI / 180;
      const dl = dg(K.s), om = (dl - dg(K.s1)) / h; if (q.kI) this.supI = (this.supI || 0) + dl * h; const u = q.kP * dl + q.kD * om + (q.kI || 0) * (this.supI || 0);
      out[this.J.ankL][this.ankI[0]] += -this.ankS[0].s * this.Kdiff[0] * u; out[this.J.ankR][this.ankI[1]] += this.ankS[1].s * this.Kdiff[1] * u; }
    // (4b) segmental stretch-reflex layer (short-latency proprioception; p.reflex): on each listed axis the muscles resist STRETCH — joint rate and the
    //      deviation from a slowly adapting set-point θ̄ (first-order, τ_adapt), so fast perturbations meet reflex impedance while slow postural change
    //      is free (no frozen pose). τ = −s·(K_r·(θ − θ̄) + D_r·θ˙), K_r = gK × the axis's entry short-range stiffness, D_r = 2ζ_r√(K_r·I)
    if (this.refl) { const S = vw.reflex, a = Math.exp(-h / p.reflex.tauAdapt); for (const q of this.refl) { const th = S.s.ang[q.k][q.i], th1 = S.s1.ang[q.k][q.i]; q.bar = q.bar == null ? e.ang[q.k][q.i] : th + (q.bar - th) * a;
      const dth = (th - q.bar) * Math.PI / 180, om = (th - th1) * Math.PI / 180 / h; out[q.k][q.i] += -q.s * (q.K * dth + q.D * om); } }
    // (5) posture (weak, compliant) on axes with no task or gravitational load
    if (this.post.length) { const S = vw[p.posture.channel || "prop"]; for (const q of this.post) { const dth = (S.s.ang[q.k][q.i] - e.ang[q.k][q.i]) * Math.PI / 180, om = (S.s.ang[q.k][q.i] - S.s1.ang[q.k][q.i]) * Math.PI / 180 / h; out[q.k][q.i] += -q.s * (q.K * dth + q.D * om); } }
    // motor noise (force level, seeded; identical in twin worlds)
    if (p.noise) { const a = Math.exp(-h / p.noise.tau), gg = Math.sqrt(1 - a * a); this.body.ax.forEach(ax => ax.rows.forEach((r, i) => { if (!r) return; const sd = p.noise.cv * Math.hypot(r.u0[0] * r.cP, r.u0[1] * r.cM), id = ax.k * 3 + i, w = a * (this.nz.get(id) || 0) + gg * sd * this.gauss(); this.nz.set(id, w); out[ax.k][i] += w; })); }
    return out; }
  // ── variant B: internal model of the COM channel (efference copy only; no plant access) ──
  // the COM force the muscles actually develop is modelled from the controller's OWN commanded COM force through the M1b cascade (electrochemical
  // delay → activation 15 / 50 ms → contraction τc,rise / τc,fall of the mode's dominant muscle group, p.predict.muscle[axis]) — known body dynamics
  // per axis the efference copy follows the channel that dominates that mode (p.predict.source[j]: "com" = ankle channel, "hip" = hip channel)
  _efference(F, FH) { const P = this.pred, M = this.p.predict.muscle, h = this.h, src = this.p.predict.source || ["com", "com"]; if (!P.m) P.m = [0, 1].map(() => ({ line: [], a: 0, f: 0 }));
    const Fm = [0, 1].map(j => { const s = P.m[j], mu = M[j]; s.line.push(src[j] === "hip" ? FH[j] : F[j]); const ud = s.line.length > 2 ? s.line.shift() : 0; s.a = ud + (s.a - ud) * Math.exp(-h / (Math.abs(ud) > Math.abs(s.a) ? 0.015 : 0.050));
      s.f = s.a + (s.f - s.a) * Math.exp(-h / (Math.abs(s.a) > Math.abs(s.f) ? mu.rise : mu.fall)); return s.f; });
    P.FmHist = (P.FmHist || []).concat([Fm]).slice(-(this.maxD + 2)); }
  // propagate the DELAYED COM state over the sensory delay d with the inverted-pendulum mode model M·x¨ = (G_g − K_i)·x − F_m (G_g: the mode's
  // gravitational stiffness, K_i: the body's low-frequency intrinsic stiffness of the mode, both measured, p.predict), using the modelled developed
  // forces of the last d steps. It is re-anchored on the newest delayed observation every step (no accumulated estimate), so a disturbance enters
  // the prediction only when the delayed observation contains it.
  _predict(x, v, d) { const P = this.pred, h = this.h, Gg = this.p.predict.Gg, Ki = this.p.predict.Ki, Fh = P.FmHist || []; x = x.slice(); v = v.slice();
    for (let s = 0; s < d; s++) { const Fm = Fh.length >= d ? Fh[Fh.length - d + s] : [0, 0]; for (let j = 0; j < 2; j++) { const a = ((Gg[j] - Ki[j]) * x[j] - Fm[j]) / this.M; v[j] += a * h; x[j] += v[j] * h; } } return [x, v]; }
  meta() { return { params: this.p, mode: this.mode }; }
}
