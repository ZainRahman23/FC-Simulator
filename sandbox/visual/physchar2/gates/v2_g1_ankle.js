// ═══ physchar2/gates/v2_g1_ankle.js — FOOT / ANKLE INSTRUMENT for a running G1Sim (measurement only: writes nothing to the simulation) ════════
// PERMANENT INSTRUMENTATION (user decision 2026-10-03, review_artifacts/physical_character_v2/DECISIONS.md): preserve; do not remove.
// Per physics tick, for one foot: kinematics (heel / forefoot / toe heights, foot and shank pitch, ankle anatomical angles, DF angular velocity),
// the EXACT ground-contact wrench on the foot and the exact torque decomposition about the ankle.
//
// Ground reaction. Jolt does not expose per-contact impulses in this binding, but the foot is a leaf body: its only interactions are gravity, the
// ankle constraint (whose impulses Jolt does expose) and contact. So, per tick (impulses over the step):
//   J_contact = m·Δv − m·g·dt − λ_point                         (λ_point: the ankle's translational point-constraint impulse ON THE FOOT)
//   M_contact(about the foot COM C) = ΔL_C − Σ (rotation-row impulses: passive drive rows, emergency limit rows, explicit passive torque) − (A − C)×λ_point
//   M_contact(about the ankle A) = M_contact(C) + (C − A)×J_contact
// with L_C = I_world·ω. The centre of pressure on the turf plane (y = 0) follows from the wrench: p_x = A_x + (M_A,z − A_y·J_x)/J_y,
// p_z = A_z − (M_A,x + A_y·J_z)/J_y (valid while J_y carries load). Its position along the boot (heel → toe) is reported.
// Per-piece contact: which of the boot's convex pieces have a turf manifold (touching ≤ 0.5 mm separation / speculative), their depth, and an
// ESTIMATED normal-impulse share: the non-negative least-squares distribution of the measured vertical impulse over the touching contact points
// that reproduces the measured pitch and roll moments (exact totals, estimated split — Jolt's per-point impulses are not exposed).
//
// Ankle torque decomposition (on the foot, about the foot's pitch axis; + = HEEL-UP / toe-down = plantarflexing the foot relative to the turf):
//   passive drive rows (Jolt motor impulses / dt — the implicit elastic law + C2 end-stop + damping as actually applied), split into
//   elastic law (end-range term −∂U/∂θ at the end state, couplings included), the end-stop part of it (beyond the anatomical hard limit),
//   damping (−c·ω); explicit passive remainder (Texp); Jolt emergency-stop rows (swing–twist limit impulses / dt); the point constraint acts AT
//   the ankle and has no moment about it (it does no work about ankle pitch); gravity on the foot; the ground contact moment.
import { V, Q } from "../core/v2_math.js";

const G = 9.81, D = 180 / Math.PI, EYE = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mat = (q) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]; };
const mv = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const Lworld = (q, Iloc, w) => { const R = mat(q), wl = [R[0] * w[0] + R[3] * w[1] + R[6] * w[2], R[1] * w[0] + R[4] * w[1] + R[7] * w[2], R[2] * w[0] + R[5] * w[1] + R[8] * w[2]], Il = [0, 1, 2].map(i => Iloc[i][0] * wl[0] + Iloc[i][1] * wl[1] + Iloc[i][2] * wl[2]); return mv(R, Il); };
// tiny NNLS (Lawson–Hanson) for the per-point share estimate: min ‖A x − b‖, x ≥ 0 (A: m × n, m ≤ 3)
function nnls(A, b, n) {
  const m = b.length, x = new Array(n).fill(0), P = new Set(); const res = () => b.map((bi, i) => bi - A[i].reduce((s, a, j) => s + a * x[j], 0));
  for (let it = 0; it < 3 * n + 10; it++) { const r = res(), wv = Array.from({ length: n }, (_, j) => A.reduce((s, row, i) => s + row[j] * r[i], 0));
    let jmax = -1, best = 1e-12; for (let j = 0; j < n; j++) if (!P.has(j) && wv[j] > best) { best = wv[j]; jmax = j; } if (jmax < 0) break; P.add(jmax);
    for (let inner = 0; inner < 2 * n + 5; inner++) { const idx = [...P], k = idx.length, AtA = idx.map(a => idx.map(c => A.reduce((s, row) => s + row[a] * row[c], 0) + (a === c ? 1e-12 : 0))), Atb = idx.map(a => A.reduce((s, row, i) => s + row[a] * b[i], 0));
      const z = solve(AtA, Atb); if (z.every(v => v > 0)) { idx.forEach((j, t) => (x[j] = z[t])); break; }
      let alpha = 1; idx.forEach((j, t) => { if (z[t] <= 0) alpha = Math.min(alpha, x[j] / Math.max(1e-30, x[j] - z[t])); }); idx.forEach((j, t) => { x[j] += alpha * (z[t] - x[j]); if (x[j] <= 1e-15) { x[j] = 0; P.delete(j); } }); } }
  return x;
}
function solve(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; const d = a[c][c] || 1e-30;
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / d; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / (r[i] || 1e-30)); }

export class AnkleProbe {
  constructor(sim, side) {
    const spec = sim.spec; this.sim = sim; this.side = side; this.fi = spec.bodies.findIndex(b => b.name === "foot_" + side); this.si = spec.bodies.findIndex(b => b.name === "shank_" + side);
    this.k = spec.joints.findIndex(j => j.name === "ankle_" + side); this.kn = spec.joints.findIndex(j => j.name === "knee_" + side);
    const fb = spec.bodies[this.fi]; this.m = fb.mass; this.I = fb.inertia; this.comLocal = fb.comLocal;
    this.pieces = fb.shapes.map((s, i) => ({ i, s })).filter(x => x.s.type === "hull").map(({ i, s }) => { const P = s.points.map(p => V.add(p, s.pos || [0, 0, 0])); return { sub: i, P, cz: P.reduce((a, p) => a + p[2], 0) / P.length, cx: P.reduce((a, p) => a + p[0], 0) / P.length }; });
    const all = this.pieces.flatMap(p => p.P), zs = all.map(p => p[2]); this.z0 = Math.min(...zs); this.z1 = Math.max(...zs); this.len = this.z1 - this.z0;
    this.heelPts = all.filter(p => p[2] < this.z0 + 0.2 * this.len); this.forePts = all.filter(p => p[2] > this.z0 + 0.65 * this.len); this.heelRear = [0, Math.min(...all.map(p => p[1])), this.z0];
    const d = sim.P.jd[this.k]; this.c = d.c; this.sDF = d.j.def.axes.y.s; this.prev = null; this.rows = [];
  }
  // call immediately BEFORE sim.tick()
  before() { const s = this.sim, f = s.st[this.fi], pl = s.up.joints.find(p => p.k === this.k); this.pre = { st: JSON.parse(JSON.stringify(f)), sh: JSON.parse(JSON.stringify(s.st[this.si])), pl: pl ? JSON.parse(JSON.stringify({ axW: pl.axW, Tw: pl.Tw, K: pl.K, delta: pl.delta, lim: pl.lim, wi: pl.wi })) : null, t: s.n * s.dt }; }
  // call immediately AFTER sim.tick(): returns one row
  after() {
    const s = this.sim, dt = s.dt, f0 = this.pre.st, f1 = s.st[this.fi], pl = this.pre.pl, w = s.w, P = s.P, d = P.jd[this.k];
    const R1 = mat(f1.rot), toW = (p) => V.add(f1.pos, mv(R1, p)), C = toW(this.comLocal), A = f1.pos.slice();   // foot origin = AJC
    // kinematics
    const lowY = (pts) => Math.min(...pts.map(p => toW(p)[1])), fwd = mv(R1, [0, 0, 1]), lat = mv(R1, [1, 0, 0]);
    const pitch = Math.atan2(-fwd[1], Math.hypot(fwd[0], fwd[2])) * D;                       // + = heel up / toe down
    const Rs = mat(s.st[this.si].rot), sAx = mv(Rs, [0, 1, 0]), shankPitch = Math.atan2(V.dot(sAx, V.norm([fwd[0], 0, fwd[2]])), sAx[1]) * D;   // shank long axis vs vertical, + = top tilted forward (toward the toes)
    const ev = s.up.ev, q = ev.qs[this.k], df = P.anat(d, q, "df"), inv = P.anat(d, q, "inv"), knee = P.anat(P.jd[this.kn], ev.qs[this.kn], "flex");
    const wrel = V.sub(f1.w, s.st[this.si].w), R2F2 = Q.mul(f1.rot, d.F2), axW = [0, 1, 2].map(i => Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])), wDF = V.dot(wrel, axW[1]) * this.sDF;   // rad/s, + = dorsiflexing
    // impulses on the foot
    const lp = w.lambdaPos(this.k), lr = w.lambdaRot(this.k), lm = w.lambdaMotor(this.k);
    const Jc = V.sub(V.sub(V.sc(V.sub(f1.v, f0.v), this.m), [0, -G * this.m * dt, 0]), lp);
    const L0 = Lworld(f0.rot, this.I, f0.w), L1 = Lworld(f1.rot, this.I, f1.w), dL = V.sub(L1, L0);
    const ax0 = pl ? pl.axW : axW, motorImp = [0, 1, 2].reduce((a, i) => V.add(a, V.sc(ax0[i], lm[i])), [0, 0, 0]);
    const limImp = [0, 1, 2].reduce((a, i) => V.add(a, V.sc(ax0[i], lr[i])), [0, 0, 0]);   // swing–twist limit rows (approximate axes; emergency stop)
    // G2: the joint's parallel ACTUATOR constraint (active muscle torque, same row axes) also acts on the foot — subtract it like the drive rows
    const la = w.acts ? w.lambdaAct(this.k) : [0, 0, 0], actImp = [0, 1, 2].reduce((a, i) => V.add(a, V.sc(ax0[i], la[i])), [0, 0, 0]);
    const explImp = pl && pl.Tw ? V.sc(pl.Tw, dt) : [0, 0, 0];
    const Mc_C = V.sub(V.sub(V.sub(V.sub(V.sub(dL, motorImp), limImp), explImp), actImp), V.cross(V.sub(A, C), lp)), Mc_A = V.add(Mc_C, V.cross(V.sub(C, A), Jc));
    // centre of pressure on y = 0 and its position along the boot (from the heel's rear edge, along the boot's horizontal long axis)
    let cop = null, copAlong = null; if (Jc[1] > 0.02 * this.m * G * dt + 1e-9 && Jc[1] > 1e-6) { cop = [A[0] + (Mc_A[2] - A[1] * Jc[0]) / Jc[1], 0, A[2] - (Mc_A[0] + A[1] * Jc[2]) / Jc[1]];
      const h = toW(this.heelRear); copAlong = V.dot(V.sub(cop, h), fwd); }   // along the foot's own long axis (3D), from the heel's rear edge
    // pitch-axis projections (+ = heel-up moment on the foot)
    const e = lat, pr = (v) => V.dot(v, e);
    const gravM = pr(V.cross(V.sub(C, A), [0, -G * this.m, 0]));
    // passive decomposition in the DF DOF (generalised torque on the foot, sign: + = dorsiflexing): law torque at the end state
    const T = ev.per[this.k].T[1], lawTau = T ? T.tau * this.sDF : 0, a = d.axes[1], th = ev.per[this.k].th[1];
    let stopTau = 0; if (a) { const [hlo, hhi] = a.hard; if (th > hhi) stopTau = -a.kStop[1] * (th - hhi); else if (th < hlo) stopTau = a.kStop[0] * (hlo - th); stopTau *= this.sDF; }
    const motorDF = lm[1] / dt * this.sDF, dampDF = -this.c * wDF, explDF = pl ? V.dot(pl.Tw, ax0[1]) * this.sDF : 0, limDF = lr[1] / dt * this.sDF;
    const U_ankle = ev.per[this.k].T.reduce((s2, t) => s2 + (t ? t.U : 0), 0);
    // pieces in contact this tick
    const pcs = this.pieces.map(p => ({ sub: p.sub, along: (p.cz - this.z0) / this.len, ml: p.cx, depth: null, touch: false, spec: false, pts: [] }));
    for (const c of (s.lastContacts || [])) { if (!((c.a < 0 && c.b === this.fi) || (c.b < 0 && c.a === this.fi))) continue; const sub = c.a < 0 ? c.sb : c.sa, pc = pcs.find(x => x.sub === sub); if (!pc) continue;
      pc.depth = Math.max(pc.depth ?? -1, c.depth); const ptsF = c.a < 0 ? c.pts2 : c.pts; for (let i = 0; i < ptsF.length; i++) { const p = ptsF[i], sep = p[1]; if (sep <= 0.0005) { pc.touch = true; pc.pts.push(p); } else pc.spec = true; } }
    // estimated vertical-impulse share per piece (NNLS: Σ f = J_y, Σ f·(x−A_x) and Σ f·(z−A_z) reproduce the measured moment components of the vertical part)
    const tp = pcs.flatMap(pc => pc.pts.map(p => ({ pc, p })));
    if (tp.length && Jc[1] > 0) { const Mvert = [Mc_A[0] + Jc[2] * A[1] * 0, 0, 0];   // (horizontal-force moments enter via the CoP identity; use the CoP directly)
      const tx = cop ? cop[0] : A[0], tz = cop ? cop[2] : A[2], Am = [tp.map(() => 1), tp.map(o => o.p[0] - tx), tp.map(o => o.p[2] - tz)], fsh = nnls(Am, [Jc[1], 0, 0], tp.length);
      tp.forEach((o, i) => { o.pc.share = (o.pc.share || 0) + fsh[i] / Jc[1]; }); }
    const vA = V.add(f1.v, V.cross(f1.w, V.sub(A, C))), toeW = toW([0, this.heelRear[1], this.z1]), vToe = V.add(f1.v, V.cross(f1.w, V.sub(toeW, C))), ws = s.st[this.si].w;
    // any non-turf manifold on the foot this tick (touching or speculative): its impulse is lumped into "contact" above (flagged)
    const other = (s.lastContacts || []).filter(c => (c.a === this.fi && c.b >= 0) || (c.b === this.fi && c.a >= 0)).map(c => s.spec.bodies[c.a === this.fi ? c.b : c.a].name + (c.depth > -0.0005 ? "" : "~"));
    // WORK over this step by source (J), with mid-step velocities (exact for the kinetic-energy change of an impulse under Jolt's symplectic
    // Euler step: ½m(v1² − v0²) = J·(v0 + v1)/2) and the start-of-step lever arms (where the solver evaluates the constraints):
    //   W_point (the shank pushing / pulling the foot at the ankle), W_rows (ankle rotation rows: passive drive + emergency limit + explicit),
    //   W_grav = −ΔPE (information), W_ext = Δ(KE + PE) − W_point − W_rows = all other external work (turf contact + any self-contact; exact residual —
    //   verified: rotational ΔKE = Σ M·ω_mid and linear ΔKE = Σ J·v_mid to < 1e-4 J per tick in free flight),
    //   W_contact = the CoP-based direct estimate of the turf part (comparable with W_ext only while no self-contact manifold exists).
    const R0 = mat(f0.rot), C0 = V.add(f0.pos, mv(R0, this.comLocal)), A0 = f0.pos, vmid = V.sc(V.add(f0.v, f1.v), 0.5), wmid = V.sc(V.add(f0.w, f1.w), 0.5), vAt = (p) => V.add(vmid, V.cross(wmid, V.sub(p, C0)));
    const vC1 = f1.v, vCop = cop ? vAt(cop) : vAt(toeW);
    const W_point = V.dot(lp, vAt(A0)), W_rows = V.dot(V.add(V.add(V.add(motorImp, limImp), explImp), actImp), wmid), W_contact = V.dot(Jc, vCop), W_grav = -G * this.m * (C[1] - C0[1]);
    const Ef = (st, Cy) => 0.5 * this.m * V.dot(st.v, st.v) + 0.5 * V.dot(Lworld(st.rot, this.I, st.w), st.w) + this.m * G * Cy, Efoot = Ef(f1, C[1]), Efoot0 = Ef(f0, C0[1]), W_ext = Efoot - Efoot0 - W_point - W_rows;   // E includes the potential energy: ΔE = W_point + W_rows + W_ext (W_grav = −ΔPE is reported, not added)
    const fwdH = V.norm([fwd[0], 0, fwd[2]]), copUnderAnkleMm = cop ? V.dot(V.sub(A, cop), fwdH) * 1000 : null;   // horizontal offset ankle − CoP along the foot (+ = ankle ahead of the CoP)
    const sh0 = this.pre.sh, wrelMid = V.sc(V.add(V.sub(f0.w, sh0.w), wrel), 0.5);
    const row = { t: s.n * dt, dt, W_point, W_rows, W_contact, W_grav, W_ext, Efoot, dEfoot: Efoot - Efoot0, copUnderAnkleMm, ankleYmm: A[1] * 1000, vAnkle: vA, vToe, footPitchRate: V.dot(f1.w, lat), shankPitchRate: V.dot(ws, lat), otherContacts: [...new Set(other)], heelMm: lowY(this.heelPts) * 1000, foreMm: lowY(this.forePts) * 1000, pitchDeg: pitch, shankPitchDeg: shankPitch, dfDeg: df, invDeg: inv, kneeDeg: knee,
      wDF, Jc, JyN: Jc[1] / dt, JxzN: Math.hypot(Jc[0], Jc[2]) / dt, McA: Mc_A, McA_pitch: pr(Mc_A) / dt, copAlong, copFrac: copAlong != null ? copAlong / this.len : null, cop,
      lawTau, stopTau, motorDF, dampDF, elasticDF: motorDF - dampDF, explDF, limDF, limAny: Math.max(...lr.map(Math.abs)) > 1e-9, gravPitch: gravM,
      motorPitch: pr(motorImp) / dt, limPitch: pr(limImp) / dt, explPitch: pr(explImp) / dt, U_ankle, footKE: 0.5 * this.m * V.dot(f1.v, f1.v),
      P_motor: [0, 1, 2].reduce((a2, i) => a2 + lm[i] * V.dot(wrelMid, ax0[i]), 0) / dt, P_lim: [0, 1, 2].reduce((a2, i) => a2 + lr[i] * V.dot(wrelMid, ax0[i]), 0) / dt, P_expl: pl && pl.Tw ? V.dot(pl.Tw, wrelMid) : 0, activeDF: la[1] / dt * this.sDF, activeInv: la[2] / dt, P_active: [0, 1, 2].reduce((a2, i) => a2 + la[i] * V.dot(wrelMid, ax0[i]), 0) / dt,
      pieces: pcs.map(p => ({ sub: p.sub, along: +p.along.toFixed(3), ml: +p.ml.toFixed(3), touch: p.touch, spec: p.spec, depthMm: p.depth != null ? +(p.depth * 1000).toFixed(2) : null, share: p.share != null ? +p.share.toFixed(3) : 0 })) };
    this.rows.push(row); return row;
  }
}
