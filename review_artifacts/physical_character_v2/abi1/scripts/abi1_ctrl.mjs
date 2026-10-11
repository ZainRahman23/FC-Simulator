// GBC-1 — the ABI-1 generic balance controller (ABI1_PREREGISTRATION.md §4, frozen 7cf107fe), and C's step law (§5). Outcome-blind by construction:
// it is given only sensory frames {n, S (the runner's 14 body states), F (foot_L / foot_R turf normal force)} and the runner's own V2 components
// (spec, PassiveLayer geometry, the StandController's geometry / gain tables / bounded leg IK). It never sees a simulation record, label, event,
// fixture, the tackler or any cross-contact datum. It acts only by adding feed-forward increments to the runner's SnapshotTone rows (or, for C's
// stepping leg, by replacing that leg's rows with V2's own servo form); every row then passes through the unchanged ActuatorLayer.
// Imports: V2 math / geometry / controller helpers only (V7a).
const P2 = new URL("../../../../sandbox/visual/physchar2/", import.meta.url).href;
const { V, Q, dnorm, dasin, dexp, dsin, unitStates } = await import(P2 + "core/v2_math.js");
const { clampPoly, polyDist, lockedAxisFF } = await import(P2 + "ctrl/v2_stand.js");
const { hull2 } = await import(P2 + "sim/v2_geom.js");
const { LIFECYCLE } = await import(P2 + "ctrl/v2_support.js");
const { decompose } = await import(P2 + "spec/v2_joints.js");
const G = 9.81, E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], DEG = 180 / Math.PI;
export const GBC1 = Object.freeze({ d: 29, kXi: 1 / 3, minShare: 0.10, hipUse: 1.0, hipMaxDeg: 10, hipLoad: 0.25, armUse: 1.0, armMaxDeg: 60,
  loadOff: LIFECYCLE.loadOff, loadOn: LIFECYCLE.loadOn, debounceSteps: 3, acceptS: LIFECYCLE.accept, Tsw: 0.17, b: 0.05, hc: 0.04, crossMargin: 0.15, BLEND: 0.03, yRestLift: 0.0005 });
export const FRAME_KEYS = Object.freeze(["n", "S", "F"]);
// the V2-G2 area centroid of a polygon (ctrl/v2_stand.js centroid — not exported there; same expression)
function centroid(poly) { let A = 0, x = 0, z = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1]; A += cr; x += (p[0] + q[0]) * cr; z += (p[1] + q[1]) * cr; } return [x / (3 * A), z / (3 * A)]; }
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
export class GBC1Ctl {
  // plant: the ABI-1 plant (only the runner's own components are read); o: { step, d, hip, arms }
  constructor(plant, o = {}) {
    const c = plant.chars.find(x => x.role === "runner"); this.c = c; this.spec = c.spec; this.P = c.P; this.ctrl = c.ctrl; this.h = plant.dt;
    this.o = { ...GBC1, d: o.d ?? GBC1.d, step: !!o.step, hip: o.hip !== false, arms: o.arms !== false };
    const B = this.spec.bodies; this.B = B; this.M = B.reduce((s, b) => s + b.mass, 0); this.nb = B.length; this.idx = Object.fromEntries(B.map((b, i) => [b.name, i]));
    // Y0: the standing entry state (both feet supporting at M·g / 2) — the history before activation
    const S0 = plant.S0.slice(c.bOff, c.bOff + c.nb).map(s => ({ pos: s.pos.slice(), rot: s.rot.slice(), com: s.com.slice(), v: s.v.slice(), w: s.w.slice() }));
    this.Y0 = { n: 0, S: S0, F: [this.M * G / 2, this.M * G / 2] }; this.frames = [];
    const S0u = unitStates(S0); this.qs0 = this.P.jd.map(d => this.P.qcs(d, S0u.map(s => s.rot))); this.qPel0 = S0u[this.idx.pelvis].rot;
    { const cm = this._com(S0u); const w0 = Math.sqrt(G / Math.max(0.3, cm.c[1])); this.xi0 = [cm.c[0] + cm.v[0] / w0, cm.c[2] + cm.v[2] / w0]; }
    const rgt = Q.rot(this.qPel0, [1, 0, 0]), rl = dnorm(rgt[0], rgt[2]) || 1; this.lat = [rgt[0] / rl, rgt[2] / rl];          // entry pelvis lateral axis (anatomical right), turf plane
    this.footRot0 = this.ctrl.feet.map(f => S0u[f].rot.slice()); this.yRest = this.ctrl.feet.map(f => S0u[f].pos[1] - this.o.yRestLift);
    this.soleCen = this.ctrl.sole.map(s => centroid(s.poly));                                                                   // usable-region centroid, foot-local (x, z)
    // support machine (advanced once per delayed frame) and acceptance ramps
    this.sup = [true, true]; this.cnt = [0, 0]; this.acceptFrom = [null, null];
    // step law state
    this.step = { phase: "IDLE" }; this.override = [null, null]; this.nSteps = 0;
    // τ(Y0): the same law at the entry frame (Δτ ≡ 0 while the delayed frame is Y0)
    this.tau0 = this._law(this.Y0, [true, true], [1, 1], null).tau;
    this._info = null; this.lastFrameKeys = null;
  }
  _com(S) { let c = [0, 0, 0], v = [0, 0, 0]; S.forEach((s, i) => { c = V.add(c, V.sc(s.com, this.B[i].mass)); v = V.add(v, V.sc(s.v, this.B[i].mass)); }); return { c: V.sc(c, 1 / this.M), v: V.sc(v, 1 / this.M) }; }
  // ── sensing: the frame whitelist (V7b) ──
  sense(rec) { const nb = this.nb, h = this.h, fr = { n: rec.n, S: rec.S.slice(0, nb).map(s => ({ pos: s.pos.slice(), rot: s.rot.slice(), com: s.com.slice(), v: s.v.slice(), w: s.w.slice() })), F: [rec.chars.runner.feet.L / h, rec.chars.runner.feet.R / h] };
    this.frames[rec.n] = fr; this.lastFrameKeys = Object.keys(fr); }
  // ── the law (§4.3) on a frame Y with an effective support set and share caps; excl = stepping leg treated as non-support ──
  _law(Y, sup, caps, excl) { const o = this.o, ctrl = this.ctrl, B = this.B, S = unitStates(Y.S), rots = S.map(s => s.rot), qs = this.P.jd.map(d => this.P.qcs(d, rots));
    const { c, v } = this._com(S), w0 = Math.sqrt(G / Math.max(0.3, c[1])), xi = [c[0] + v[0] / w0, c[2] + v[2] / w0];
    const polys = [0, 1].map(f => ctrl.footPoly(S, f)), cen = polys.map(centroid), inSup = [0, 1].map(f => sup[f] && f !== excl), supIdx = [0, 1].filter(f => inSup[f]);
    let F = [null, null], cop = [null, null], geff = [0, -G, 0], share = [0, 0], p = null, pRaw = null, r = [0, 0], A = [0, 0, 0], bos = null, dOut = null;
    if (supIdx.length) {
      bos = hull2(supIdx.flatMap(f => polys[f]).map(([x, z]) => [x, 0, z])); dOut = -polyDist(bos, xi);
      const xiRef = clampPoly(bos, this.xi0); pRaw = [xi[0] + o.kXi * (xi[0] - xiRef[0]), xi[1] + o.kXi * (xi[1] - xiRef[1])]; p = clampPoly(bos, pRaw);
      // V2-G2 load split (lever rule along the region centroids, floor minShare in double support) + per-foot CoPs (common shift, 6 remainder iterations)
      const a = cen[1], b = cen[0], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
      let t = Math.max(o.minShare, Math.min(1 - o.minShare, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2)); if (!inSup[0] && inSup[1]) t = 0; if (!inSup[1] && inSup[0]) t = 1;
      if (inSup[0] && inSup[1]) t = Math.max(1 - caps[1], Math.min(caps[0], t));                                          // acceptance ramp: a foot's share ≤ its cap
      share = [t, 1 - t];
      const dl = [p[0] - (t * b[0] + (1 - t) * a[0]), p[1] - (t * b[1] + (1 - t) * a[1])]; cop = cen.map((q, f) => clampPoly(polys[f], [q[0] + dl[0], q[1] + dl[1]]));
      for (let it = 0; it < 6; it++) { const ach = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]], res = [p[0] - ach[0], p[1] - ach[1]], rl = dnorm(res[0], res[1]);
        if (rl < 1e-7) break; const u = [res[0] / rl, res[1] / rl], mov = [0, 1].map(f => { const q = clampPoly(polys[f], [cop[f][0] + u[0] * 1e-4, cop[f][1] + u[1] * 1e-4]); return dnorm(q[0] - cop[f][0], q[1] - cop[f][1]) > 1e-6 ? 1 : 0; });
        const Ssum = share[0] * mov[0] + share[1] * mov[1]; if (Ssum < 1e-6) break; for (const f of [0, 1]) if (mov[f]) cop[f] = clampPoly(polys[f], [cop[f][0] + res[0] / Ssum, cop[f][1] + res[1] / Ssum]); }
      p = [share[0] * cop[0][0] + share[1] * cop[1][0], share[0] * cop[0][1] + share[1] * cop[1][1]]; r = [pRaw[0] - p[0], pRaw[1] - p[1]];
      A = [w0 * w0 * (c[0] - p[0]), 0, w0 * w0 * (c[2] - p[1])]; F = share.map(s => (s > 0 ? [s * this.M * A[0], s * this.M * G, s * this.M * A[2]] : null)); geff = [-A[0], -G, -A[2]]; }
    // strategies on the CoP residual (V2-G2 laws, entry orientations as references)
    let Ldot = [0, 0, 0], hipShare = [0, 0], armL = null, armF = [0, 0];
    if (supIdx.length && (r[0] || r[1])) { const yr = [r[1], 0, -r[0]];                                                         // ŷ × (r_x, 0, r_z)
      if (o.hip) { let qe = Q.mul(Q.conj(this.qPel0), S[this.idx.pelvis].rot); if (qe[3] < 0) qe = qe.map(x => -x); const dev = 2 * dasin(Math.min(1, dnorm(qe[0], qe[2]))) * DEG;
        Ldot = V.sc(yr, this.M * G * o.hipUse * Math.max(0, 1 - dev / o.hipMaxDeg)); const hw = share.map(x => Math.max(0, x - o.hipLoad)), hs = hw[0] + hw[1] || 1; hipShare = hw.map(x => x / hs); }
      if (o.arms) { armL = V.sc(yr, this.M * G * o.armUse * 0.5); armF = ctrl.shK.map(k => { let qe = Q.mul(Q.conj(this.qs0[k]), qs[k]); if (qe[3] < 0) qe = qe.map(x => -x); const dev = 2 * dasin(Math.min(1, dnorm(qe[0], qe[1], qe[2]))) * DEG; return Math.max(0, 1 - dev / o.armMaxDeg); }); } }
    // inverse statics per joint → per-axis torques (delayed configuration)
    const tau = []; for (const d of this.P.jd) { const k = d.k, pj = ctrl.jointAt(S, k); let T = [0, 0, 0];
      for (const i of ctrl.sub[k]) T = V.sub(T, V.cross(V.sub(S[i].com, pj), V.sc(geff, B[i].mass)));
      for (const f of ctrl.subFeet[k]) { const n = ctrl.feet.indexOf(f); if (F[n]) T = V.sub(T, V.cross(V.sub([cop[n][0], 0, cop[n][1]], pj), F[n])); }
      const side = ctrl.legSide[k]; if (side >= 0 && k === ctrl.hipK[side]) T = V.sub(T, V.sc(Ldot, hipShare[side]));
      if (armL && ctrl.shK.includes(k)) T = V.add(T, V.sc(armL, armF[ctrl.shK.indexOf(k)]));
      const R2F2 = Q.mul(S[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), Lk = ctrl.o.ffLockedAxis ? ctrl.lockedFix[k] : null, tw = Lk != null ? decompose(qs[k]).tw : 0;
      tau[k] = [0, 1, 2].map(i => (Lk != null && i === 3 - Lk ? lockedAxisFF(T, axW, tw, Lk) : V.dot(T, axW[i]))); }
    return { tau, xi, bos, p, pRaw, r, A, share, cop, w0, dOut, cen, polys, inSup, Ldot, armF }; }
  // ── the V2 servo rows for one leg joint (PostureDriver / StandController form): τ0 = ff + K·e, K / D blended stance ↔ swing by w ──
  _servoRows(cmd, k, qT, st, ev, w, ffTau) { const ctrl = this.ctrl, g = ctrl.gain[k], gs = ctrl.gainSwing[k], K = w * g.K + (1 - w) * gs.K, D = w * g.D + (1 - w) * gs.D, q = ev.qs[k];
    const sg = q[0] * qT[0] + q[1] * qT[1] + q[2] * qT[2] + q[3] * qT[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qT.map(x => x * sg)), e = [2 * dq[0], 2 * dq[1], 2 * dq[2]];
    if (cmd[k]) cmd[k] = cmd[k].map((row, i) => (row ? { K, D, tau0: ffTau[i] + K * e[i] } : row)); }
  // gravity-only statics of a joint's distal subtree in the CURRENT configuration (the swing leg's own compensation), per axis
  _gravTau(st, ev, k) { const ctrl = this.ctrl, d = this.P.jd.find(x => x.k === k), pj = ctrl.jointAt(st, k); let T = [0, 0, 0];
    for (const i of ctrl.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc([0, -G, 0], this.B[i].mass)));
    const R2F2 = Q.mul(st[d.child].rot, d.F2), axW = E3.map(e => Q.rot(R2F2, e)), Lk = ctrl.o.ffLockedAxis ? ctrl.lockedFix[k] : null, tw = Lk != null ? decompose(ev.qs[k]).tw : 0;
    return [0, 1, 2].map(i => (Lk != null && i === 3 - Lk ? lockedAxisFF(T, axW, tw, Lk) : V.dot(T, axW[i]))); }
  // ── command (called after step n; acts during step n + 1) ──
  command(cmd, c, stRaw, evRaw, n) { const o = this.o, h = this.h, ctrl = this.ctrl, m = n - o.d, Y = m >= 1 ? this.frames[m] : this.Y0;
    if (m >= 1 && !Y) throw new Error("GBC-1: missing frame " + m);
    // support machine on the delayed frame (V2 lifecycle thresholds, 3-frame debounce)
    if (m >= 1) { const W = this.M * G; for (const f of [0, 1]) { const want = this.sup[f] ? Y.F[f] >= o.loadOff * W : Y.F[f] > o.loadOn * W;
      if (want !== this.sup[f]) { this.cnt[f]++; if (this.cnt[f] >= o.debounceSteps) { this.sup[f] = want; this.cnt[f] = 0; if (want) this.acceptFrom[f] = n; } } else this.cnt[f] = 0; } }
    const caps = [0, 1].map(f => (this.acceptFrom[f] == null ? 1 : Math.min(1, (n - this.acceptFrom[f]) * h / o.acceptS)));
    const st = unitStates(stRaw), ev = { ...evRaw, qs: evRaw.qs.map(q => Q.norm(q)) };
    // step law (C): trigger / swing / touchdown
    let excl = null; const S = this.step;
    if (o.step) {
      if (S.phase === "SWING") { excl = S.leg; if (!this.sup[S.leg]) S.lifted = true;
        if (S.lifted && this.sup[S.leg]) { const ks = ctrl.legK[S.leg]; this.override[S.leg] = { mode: "hold", qHold: ks.map(k => [k, ev.qs[k].slice()]), w: S.w, since: n }; this.step = { phase: "HOLD", leg: S.leg, since: n, w: S.w }; excl = null; } } }
    const L = this._law(Y, this.sup, caps, excl);
    if (o.step && this.step.phase === "IDLE" && L.bos && L.dOut > 0) { const off = [0, 1].filter(f => !this.sup[f]);
      let leg = null; if (off.length === 1) leg = off[0]; else if (off.length === 0) { const cq = clampPoly(L.bos, L.xi), u = [L.xi[0] - cq[0], L.xi[1] - cq[1]]; leg = L.cen[0][0] * u[0] + L.cen[0][1] * u[1] >= L.cen[1][0] * u[0] + L.cen[1][1] * u[1] ? 0 : 1; }
      if (leg != null) { const f = ctrl.feet[leg]; this.step = { phase: "SWING", leg, t0: n, p0: st[f].pos.slice(), yaw0: yawOf(st[f].rot), w: 1, lifted: !this.sup[leg], u: null }; this.nSteps++; this.override[leg] = { mode: "swing" }; } }
    // law with the stepping leg excluded (re-evaluated once if the trigger fired this tick, so the released leg carries no share)
    const LL = this.step.phase === "SWING" && excl !== this.step.leg ? this._law(Y, this.sup, caps, this.step.leg) : L;
    // feed-forward increments on every tone row that is not overridden
    const dtau = []; let dmax = 0;
    for (const d of this.P.jd) { const k = d.k, side = ctrl.legSide[k], ov = side >= 0 ? this.override[side] : null; if (ov || !cmd[k]) continue;
      cmd[k] = cmd[k].map((row, i) => { if (!row) return row; const dv = LL.tau[k][i] - this.tau0[k][i]; if (dv === 0) return row; dtau.push([k, i, dv]); dmax = Math.max(dmax, Math.abs(dv)); return { ...row, tau0: row.tau0 + dv }; }); }
    // stepping-leg rows (SWING: V2 servo toward the IK of the swing reference; HOLD / after: q_hold, stance gains, the full law torque)
    let stepInfo = null;
    if (o.step && this.step.phase === "SWING") { const s = this.step, leg = s.leg, f = ctrl.feet[leg], tauS = Math.min(1, (n + 1 - s.t0) * h / o.Tsw), sm = tauS * tauS * tauS * (10 - 15 * tauS + 6 * tauS * tauS);
      s.w = Math.max(0, s.w - h / o.BLEND);
      // foothold from the delayed frame (stepping leg excluded): ξ_TD = p* + (ξ − p*)·e^{ω0·T_rem}; g = ξ_TD + b·û; no crossover
      let gF = null; if (LL.bos && LL.p) { const Trem = Math.max(0, o.Tsw - (n - s.t0) * h), e = dexp(LL.w0 * Trem), xiTD = [LL.p[0] + (LL.xi[0] - LL.p[0]) * e, LL.p[1] + (LL.xi[1] - LL.p[1]) * e];
        let u; if (LL.dOut > 0) { const cq = clampPoly(LL.bos, LL.xi); u = [LL.xi[0] - cq[0], LL.xi[1] - cq[1]]; } else u = [LL.xi[0] - LL.p[0], LL.xi[1] - LL.p[1]]; const ul = dnorm(u[0], u[1]);
        if (ul > 1e-9) s.u = [u[0] / ul, u[1] / ul]; const uu = s.u || [0, 0]; gF = [xiTD[0] + o.b * uu[0], xiTD[1] + o.b * uu[1]];
        const other = 1 - leg, cst = LL.cen[other], ls = leg === 1 ? this.lat : [-this.lat[0], -this.lat[1]], dd = (gF[0] - cst[0]) * ls[0] + (gF[1] - cst[1]) * ls[1];
        if (dd < o.crossMargin) { gF = [gF[0] + (o.crossMargin - dd) * ls[0], gF[1] + (o.crossMargin - dd) * ls[1]]; } s.g = gF; }
      gF = gF || s.g || [s.p0[0], s.p0[2]];
      const yawE = yawOf(this.footRot0[leg]), qRef = Q.norm(Q.mul(Q.axis([0, 1, 0], s.yaw0 - yawE), this.footRot0[leg])), sc = this.soleCen[leg], off = Q.rot(qRef, [sc[0], ctrl.sole[leg].y0, sc[1]]);
      const gO = [gF[0] - off[0], gF[1] - off[2]], y = this.yRest[leg] + (s.p0[1] - this.yRest[leg]) * (1 - sm) + o.hc * Math.pow(dsin(Math.PI * tauS), 2);
      const ref = { pos: [s.p0[0] + (gO[0] - s.p0[0]) * sm, y, s.p0[2] + (gO[1] - s.p0[2]) * sm], rot: qRef };
      const pel = st[ctrl.pelvis], ik = ctrl.legIKBounded(st, ev, leg, pel.pos, pel.rot, ref);
      for (const [k, qT] of ik.targets) this._servoRows(cmd, k, qT, st, ev, s.w, this._gravTau(st, ev, k));
      stepInfo = { phase: "SWING", leg, since: s.t0, tau: tauS, foothold: gF, ref: ref.pos, ikErr: ik.err, w: s.w }; }
    for (const leg of [0, 1]) { const ov = this.override[leg]; if (!ov || ov.mode !== "hold") continue; ov.w = Math.min(1, ov.w + h / o.BLEND);
      for (const [k, qT] of ov.qHold) this._servoRows(cmd, k, qT, st, ev, ov.w, LL.tau[k]);
      if (this.step.phase === "HOLD" && this.step.leg === leg) { this.step.w = ov.w; stepInfo = { phase: "HOLD", leg, since: ov.since, w: ov.w }; if (ov.w >= 1) this.step = { phase: "IDLE" }; } }
    this._info = { m, sup: this.sup.slice(), caps, xi: LL.xi, bos: LL.bos, p: LL.p, r: LL.r, dOut: LL.dOut, share: LL.share, Ldot: LL.Ldot, armF: LL.armF, dtau, dtauMax: dmax, step: stepInfo, nSteps: this.nSteps };
  }
  info() { return this._info; }
  meta() { return { controller: "GBC-1", prereg: "abi1/ABI1_PREREGISTRATION.md (7cf107fe)", params: this.o, frameKeys: this.lastFrameKeys || [...FRAME_KEYS], inputs: "frames {n, S: runner body states ×14, F: foot_L / foot_R turf normal force}; the runner's own V2 spec / passive geometry / StandController geometry, gain tables and bounded leg IK" }; }
}
