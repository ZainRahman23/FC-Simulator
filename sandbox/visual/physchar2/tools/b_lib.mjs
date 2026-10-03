// ═══ physchar2/tools/b_lib.mjs — INVESTIGATION B (one-step energy blow-up): shared DIAGNOSTIC library. Never used by a gate. ════════════
// User decision 2026-10-03 (sources/2026-10-03_user_decision_b_engine_blowup_investigation.md): a physics-engine / constraint-integrity
// investigation. Nothing here changes the accepted plant: every switch is applied to a diagnostic G1Sim instance only.
//   • event finder (first step whose total mechanical energy rises by more than a threshold);
//   • exact Jolt save / restore of the full physical state (bodies, contact cache, constraint lambdas = warm-start impulses);
//   • per-step IMPULSE LEDGER: every constraint impulse Jolt applied in the step, reconstructed from Jolt's own accumulated lambdas
//     (point constraint, swing / twist limit parts, motor parts) on the axes Jolt used (replicated from SixDOFConstraint /
//     SwingTwistConstraintPart v5.6.0 at the start-of-step pose), plus gravity, the passive explicit torque pairs and Jolt's gyroscopic
//     step; the contact impulse of each body is the exact residual. Work of each source = impulse · mid-step velocity (exact in sum for the
//     velocity update: ΔKE = P·v̄ + L·ω̄ at the start-of-step inertia).
import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
export const P2 = path.resolve(here, "..");
const { V, Q } = await import(P2 + "/core/v2_math.js");
export { V, Q };
const { loadJolt } = await import(P2 + "/core/v2_jolt.js");
const { generateSpec } = await import(P2 + "/spec/v2_spec.js");
const H = await import(P2 + "/spec/v2_human.js");
export const G1 = await import(P2 + "/gates/v2_g1.js");
export const JS = await import(P2 + "/spec/v2_joints.js");
export const D = 180 / Math.PI;
let Jc = null;
export async function jolt() { return Jc || (Jc = await loadJolt(P2 + "/vendor/jolt-physics.wasm-compat.js")); }
export const humanOf = (id) => H.VARIATION_SET.find(h => h.id === id) || H.V2_REF;
export function specOf(id) { return generateSpec(humanOf(id)); }

// a G1 simulation at the G1 validation configuration unless overridden (hz, velSteps, posSteps, ...)
export function makeSim(J, spec, key, cfg = {}, opts = {}) { G1.ensureScenario(key); return new G1.G1Sim(J, spec, key, { cfg: { ...G1.G1_WORLD, ...cfg }, ...opts }); }

// kinetic / potential energy per body from a state array (doubles of Jolt's float32 readback)
export function bodyEnergy(spec, s, i, g = 9.81) { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia, Iw = mat3v(I, wl);
  return { kt: 0.5 * b.mass * V.dot(s.v, s.v), kr: 0.5 * V.dot(wl, Iw), pe: b.mass * g * s.com[1] }; }
export const mat3v = (I, v) => [I[0][0] * v[0] + I[0][1] * v[1] + I[0][2] * v[2], I[1][0] * v[0] + I[1][1] * v[1] + I[1][2] * v[2], I[2][0] * v[0] + I[2][1] * v[1] + I[2][2] * v[2]];
export function inv3(m) { const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const c = (r, k) => { const rs = [0, 1, 2].filter(x => x !== r), cs = [0, 1, 2].filter(x => x !== k); return ((r + k) % 2 ? -1 : 1) * (m[rs[0]][cs[0]] * m[rs[1]][cs[1]] - m[rs[0]][cs[1]] * m[rs[1]][cs[0]]); };
  return [0, 1, 2].map(r => [0, 1, 2].map(k => c(k, r) / det)); }
// world-frame inertia action: I_w·v = R·I·Rᵀ·v ; inverse likewise
export const Iw = (spec, i, rot, v) => Q.rot(rot, mat3v(spec.bodies[i].inertia, Q.rot(Q.conj(rot), v)));
const invCache = new Map();
export const IwInv = (spec, i, rot, v) => { let m = invCache.get(spec.bodies[i]); if (!m) { m = inv3(spec.bodies[i].inertia); invCache.set(spec.bodies[i], m); } return Q.rot(rot, mat3v(m, Q.rot(Q.conj(rot), v))); };
// Jolt MotionProperties::ApplyGyroscopicForceInternal (v5.6.0), in the body frame (basis-independent form of the principal-frame code)
export function gyro(spec, i, rot, w, dt) { const I = spec.bodies[i].inertia, wl = Q.rot(Q.conj(rot), w), L = mat3v(I, wl), n = V.sub(L, V.sc(V.cross(wl, L), dt)), nl = V.dot(n, n);
  const n2 = nl > 0 ? V.sc(n, Math.sqrt(V.dot(L, L) / nl)) : [0, 0, 0]; let m = invCache.get(spec.bodies[i]); if (!m) { m = inv3(I); invCache.set(spec.bodies[i], m); } return Q.rot(rot, mat3v(m, n2)); }

// ── Jolt SwingTwistConstraintPart (v5.6.0) replicated in double precision: the clamp and the world axes of the limit parts ──────────────
export function swingTwist(q) { const [x, y, z, w] = q, s = Math.sqrt(w * w + x * x); return s !== 0 ? { tw: [x / s, 0, 0, w / s], sw: [0, (w * y - x * z) / s, (w * z + x * y) / s, s] } : { tw: [0, 0, 0, 1], sw: q.slice() }; }
const LOCK = 0.5 / D, FREE = 179.5 / D;
export function limitInfo(lo, hi) { const f = { twLock: lo[0] > -LOCK && hi[0] < LOCK, twFree: lo[0] < -FREE && hi[0] > FREE, syLock: lo[1] > -LOCK && hi[1] < LOCK, szLock: lo[2] > -LOCK && hi[2] < LOCK,
  syFree: lo[1] < -FREE && hi[1] > FREE, szFree: lo[2] < -FREE && hi[2] > FREE }; return { lo, hi, f, sTwLo: Math.sin(lo[0] / 2), sTwHi: Math.sin(hi[0] / 2), sSyLo: Math.sin(lo[1] / 2), sSyHi: Math.sin(hi[1] / 2), sSzLo: Math.sin(lo[2] / 2), sSzHi: Math.sin(hi[2] / 2) }; }
const shorterMin = (a, b) => { a = Math.abs(a); if (a > 1) a = 2 - a; b = Math.abs(b); if (b > 1) b = 2 - b; return a < b; };
export function clampSwingTwist(L, sw0, tw0) {   // returns { sw, tw, clamped: { twMin, twMax, sy, sz, syMin, syMax, szMin, szMax, pyr } }
  let sw = sw0.slice(), tw = tw0.slice(); const c = { twMin: 0, twMax: 0, syMin: 0, syMax: 0, szMin: 0, szMax: 0, pyr: 0 };
  const ns = sw[3] < 0, nt = tw[3] < 0; if (ns) sw = sw.map(x => -x); if (nt) tw = tw.map(x => -x);
  if (L.f.twLock) { if (tw[0] !== 0) c.twMin = c.twMax = 1; tw = [0, 0, 0, 1]; }
  else if (!L.f.twFree) { const dmn = L.sTwLo - tw[0], dmx = tw[0] - L.sTwHi; if (dmn > 0 || dmx > 0) { if (shorterMin(dmn, dmx)) { tw = [L.sTwLo, 0, 0, Math.cos(L.lo[0] / 2)]; c.twMin = 1; } else { tw = [L.sTwHi, 0, 0, Math.cos(L.hi[0] / 2)]; c.twMax = 1; } } }
  if (L.f.syLock && L.f.szLock) { if (sw[1] !== 0) c.syMin = c.syMax = 1; if (sw[2] !== 0) c.szMin = c.szMax = 1; sw = [0, 0, 0, 1]; }
  else if (L.f.syLock) { if (sw[1] !== 0) c.syMin = c.syMax = 1; const dmn = L.sSzLo - sw[2], dmx = sw[2] - L.sSzHi;
    if (dmn > 0 || dmx > 0) { if (shorterMin(dmn, dmx)) { sw = [0, 0, L.sSzLo, Math.cos(L.lo[2] / 2)]; c.szMin = 1; } else { sw = [0, 0, L.sSzHi, Math.cos(L.hi[2] / 2)]; c.szMax = 1; } }
    else if (c.syMin) { const z = sw[2]; sw = [0, 0, z, Math.sqrt(1 - z * z)]; } }
  else if (L.f.szLock) { if (sw[2] !== 0) c.szMin = c.szMax = 1; const dmn = L.sSyLo - sw[1], dmx = sw[1] - L.sSyHi;
    if (dmn > 0 || dmx > 0) { if (shorterMin(dmn, dmx)) { sw = [0, L.sSyLo, 0, Math.cos(L.lo[1] / 2)]; c.syMin = 1; } else { sw = [0, L.sSyHi, 0, Math.cos(L.hi[1] / 2)]; c.syMax = 1; } }
    else if (c.szMin) { const y = sw[1]; sw = [0, y, 0, Math.sqrt(1 - y * y)]; } }
  else { const hy = Math.atan2(sw[1], sw[3]), hz = Math.atan2(sw[2], sw[3]), cy = Math.min(Math.max(hy, L.lo[1] / 2), L.hi[1] / 2), cz = Math.min(Math.max(hz, L.lo[2] / 2), L.hi[2] / 2);
    if (cy !== hy || cz !== hz) { const q = [0, Math.sin(cy) * Math.cos(cz), Math.cos(cy) * Math.sin(cz), Math.cos(cy) * Math.cos(cz)], l = Math.hypot(...q); sw = q.map(x => x / l); c.syMin = c.syMax = c.szMin = c.szMax = 1; c.pyr = 1;
      c.pyrY = cy !== hy ? (hy < cy ? -1 : 1) : 0; c.pyrZ = cz !== hz ? (hz < cz ? -1 : 1) : 0; } }
  if (ns) sw = sw.map(x => -x); if (nt) tw = tw.map(x => -x);
  return { sw, tw, c, any: c.twMin || c.twMax || c.syMin || c.syMax || c.szMin || c.szMax };
}
// SwingTwistConstraintPart::CalculateConstraintProperties: the world-space axes of the three limit parts (null = part deactivated)
export function limitAxes(L, q, c1w) {
  const { sw, tw } = swingTwist(q), cl = clampSwingTwist(L, sw, tw), C = cl.c, tw2w = Q.mul(c1w, sw), ax = { y: null, z: null, x: null, clamp: cl };
  const rY = Q.rot(tw2w, [0, 1, 0]), rZ = Q.rot(tw2w, [0, 0, 1]);
  if (L.f.syLock) { ax.y = rY; if (L.f.szLock) ax.z = rZ; else if (C.szMin || C.szMax) ax.z = C.szMin ? V.sc(rZ, -1) : rZ; }
  else if (L.f.szLock) { if (C.syMin || C.syMax) ax.y = C.syMin ? V.sc(rY, -1) : rY; ax.z = rZ; }
  else if (!(L.f.syFree && L.f.szFree)) { if (C.syMin || C.syMax || C.szMin || C.szMax) { const cur = Q.rot(Q.mul(c1w, sw), [1, 0, 0]), des = Q.rot(Q.mul(c1w, cl.sw), [1, 0, 0]), a = V.cross(des, cur), l = V.len(a);
      if (l !== 0) ax.y = V.sc(a, 1 / l); ax.desCurDeg = Math.acos(Math.max(-1, Math.min(1, V.dot(des, cur)))) * D; } }
  const rX = Q.rot(tw2w, [1, 0, 0]);
  if (L.f.twLock) ax.x = rX; else if (!L.f.twFree && (C.twMin || C.twMax)) ax.x = C.twMin ? V.sc(rX, -1) : rX;
  return ax;
}

// ── the event finder ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// steps sim until the first step whose E rises by more than thr (J) or t ≥ tMax; returns { n (tick index of the post-event state), rise }
export function findEvent(sim, { thr = 1.0, tMax = Infinity, onTick } = {}) {
  let Ep = sim.last.E, best = { n: null, rise: -Infinity };
  while (sim.n * sim.dt < tMax && sim.tick()) { const r = sim.last.E - Ep; Ep = sim.last.E; if (onTick) onTick(sim, r); if (r > best.rise) best = { n: sim.n, rise: r }; if (r > thr) return { n: sim.n, rise: r, t: sim.n * sim.dt, best }; }
  return { n: null, rise: best.rise, best };
}
// run to tick n exactly (from the current tick)
export function runTo(sim, n) { while (sim.n < n && sim.tick()); return sim; }
// exact state save / restore of a G1Sim (Jolt StateRecorder All; the passive layer is stateless, re-derived from the restored state)
export function save(sim) { return { rec: sim.w.saveState(), n: sim.n, Dcum: sim.Dcum, prevQ: sim.prevQ }; }
export function restore(sim, S) { sim.w.restoreState(S.rec); sim.n = S.n; sim.Dcum = S.Dcum; sim.prevQ = S.prevQ; sim.st = sim.read(); sim.up = sim.P.compute(sim.st, sim.dt); sim._measure(); }

// ── constraint and impulse readback ────────────────────────────────────────────────────────────────────────────────────────────────
export function jointLimits(sim) { return sim.cons_L || (sim.cons_L = sim.w.cons.map(({ c }) => { const lo = c.GetRotationLimitsMin(), hi = c.GetRotationLimitsMax(); return limitInfo([lo.GetX(), lo.GetY(), lo.GetZ()], [hi.GetX(), hi.GetY(), hi.GetZ()]); })); }
export function lambdas(sim) { return sim.w.cons.map((_, k) => ({ p: sim.w.lambdaPos(k), r: sim.w.lambdaRot(k), m: sim.w.lambdaMotor(k) })); }

// one instrumented tick: returns the full ledger of step n → n+1
export function ledgerTick(sim) {
  const spec = sim.spec, nb = sim.nb, dt = sim.dt, g = sim.g, S0 = sim.st, plan = sim.up, E0 = sim.last, lamPrev = lambdas(sim), Ls = jointLimits(sim);
  const anchorsW = spec.joints.map((j, k) => { const a = sim.anchors[k]; return { p: V.add(S0[j.parentIndex].pos, Q.rot(S0[j.parentIndex].rot, a.p)), c: V.add(S0[j.childIndex].pos, Q.rot(S0[j.childIndex].rot, a.c)) }; });
  // axes Jolt will use this step (start-of-step pose)
  const axes = spec.joints.map((j, k) => { const d = sim.P.jd[k], R1 = S0[j.parentIndex].rot, R2 = S0[j.childIndex].rot, c1w = Q.mul(R1, d.F1), c2w = Q.mul(R2, d.F2), q = Q.mul(Q.conj(c1w), c2w);
    return { lim: limitAxes(Ls[k], q, c1w), mot: [0, 1, 2].map(i => Q.rot(c2w, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])), q }; });
  const contactsBefore = null;
  sim.tick();
  const S1 = sim.st, lam = lambdas(sim), E1 = sim.last, C = sim.lastContacts || [];
  // per-body impulses by source
  const z3 = () => [0, 0, 0], src = () => ({ P: z3(), L: z3() }), B = [];
  for (let i = 0; i < nb; i++) B.push({ grav: src(), joint: src(), limit: src(), motor: src(), texp: src(), contact: src(), gyroDw: z3() });
  const addP = (o, i, P, r) => { o.P = V.add(o.P, P); if (r) o.L = V.add(o.L, V.cross(r, P)); }, addL = (o, L) => { o.L = V.add(o.L, L); };
  const perJoint = [];
  spec.joints.forEach((j, k) => { const p = j.parentIndex, c = j.childIndex, l = lam[k], ax = axes[k], r1 = V.sub(anchorsW[k].c, S0[p].com), r2 = V.sub(anchorsW[k].c, S0[c].com);
    // point constraint: Jolt mR1 / mR2 from local positions (both at the joint anchor; the child's anchor = the parent's after the step)
    const r1J = V.sub(anchorsW[k].p, S0[p].com), r2J = V.sub(anchorsW[k].c, S0[c].com);
    addP(B[c].joint, c, l.p, r2J); addP(B[p].joint, p, V.sc(l.p, -1), r1J);
    const limL = z3(); ["x", "y", "z"].forEach((a, ii) => { const A = ax.lim[a], lv = l.r[ii]; if (!lv) return; if (!A) { perJoint.push({ k, warn: "lambda on inactive limit part " + a, lv }); return; } const Lv = V.sc(A, lv); addL(B[c].limit, Lv); addL(B[p].limit, V.sc(Lv, -1)); limL[ii] = lv; });
    for (let i = 0; i < 3; i++) { const lv = l.m[i]; if (!lv) continue; const Lv = V.sc(ax.mot[i], lv); addL(B[c].motor, Lv); addL(B[p].motor, V.sc(Lv, -1)); }
    const pj = plan.joints.find(x => x.k === k); if (pj && (pj.Tw[0] || pj.Tw[1] || pj.Tw[2])) { addL(B[c].texp, V.sc(pj.Tw, dt)); addL(B[p].texp, V.sc(pj.Tw, -dt)); }
  });
  // gravity + gyroscopic step + contact residual; work per source at the mid-step velocity (start-of-step inertia)
  const bodies = [];
  for (let i = 0; i < nb; i++) { const b = spec.bodies[i], s0 = S0[i], s1 = S1[i], o = B[i]; o.grav.P = [0, -g * b.mass * dt, 0];
    const wg = gyro(spec, i, s0.rot, s0.w, dt); o.gyroDw = V.sub(wg, s0.w);
    const Ptot = V.sc(V.sub(s1.v, s0.v), b.mass), Ltot = Iw(spec, i, s0.rot, V.sub(s1.w, wg));   // angular impulse after the gyroscopic step
    const known = ["grav", "joint", "limit", "motor", "texp"]; let Pk = z3(), Lk = z3(); for (const kk of known) { Pk = V.add(Pk, o[kk].P); Lk = V.add(Lk, o[kk].L); }
    o.contact.P = V.sub(Ptot, Pk); o.contact.L = V.sub(Ltot, Lk);
    const vb = V.sc(V.add(s0.v, s1.v), 0.5), wb = V.sc(V.add(wg, s1.w), 0.5), W = {};
    for (const kk of [...known, "contact"]) W[kk] = V.dot(o[kk].P, vb) + V.dot(o[kk].L, wb);
    const e0 = bodyEnergy(spec, s0, i, g), e1 = bodyEnergy(spec, s1, i, g), krG = 0.5 * V.dot(wg, Iw(spec, i, s0.rot, wg)), kr1at0 = 0.5 * V.dot(s1.w, Iw(spec, i, s0.rot, s1.w));
    W.gyro = krG - e0.kr; W.frame = e1.kr - kr1at0;     // gyroscopic step (≈ 0 by construction) / inertia-frame change over the step (integration)
    bodies.push({ i, name: b.name, dKt: e1.kt - e0.kt, dKr: e1.kr - e0.kr, dPE: e1.pe - e0.pe, kt1: e1.kt, kr1: e1.kr, W, v0: s0.v, v1: s1.v, w0: s0.w, w1: s1.w, Pc: o.contact.P, Lc: o.contact.L, Pj: o.joint.P, Pl: o.limit.L, Pm: o.motor.L });
  }
  // per joint: net work of each constraint part on its two bodies (positive = energy injected by that part)
  const vbar = (i) => V.sc(V.add(S0[i].v, S1[i].v), 0.5), wbar = (i) => V.sc(V.add(gyro(spec, i, S0[i].rot, S0[i].w, dt), S1[i].w), 0.5);
  const joints = spec.joints.map((j, k) => { const p = j.parentIndex, c = j.childIndex, l = lam[k], ax = axes[k], r1J = V.sub(anchorsW[k].p, S0[p].com), r2J = V.sub(anchorsW[k].c, S0[c].com);
    const vp = V.add(vbar(p), V.cross(wbar(p), r1J)), vc = V.add(vbar(c), V.cross(wbar(c), r2J)), wr = V.sub(wbar(c), wbar(p));
    const Wpoint = V.dot(l.p, V.sub(vc, vp)), Wlim = ["x", "y", "z"].map((a, ii) => (ax.lim[a] && l.r[ii] ? l.r[ii] * V.dot(ax.lim[a], wr) : 0)), Wmot = [0, 1, 2].map(i => l.m[i] * V.dot(ax.mot[i], wr));
    const pj = plan.joints.find(x => x.k === k), Wtexp = pj ? V.dot(pj.Tw, wr) * dt : 0;
    return { k, name: j.name, Wpoint, Wlim, Wmot, Wtexp, lam: l, lamPrev: lamPrev[k], limActive: { x: !!ax.lim.x, y: !!ax.lim.y, z: !!ax.lim.z }, clamp: ax.lim.clamp.c, desCurDeg: ax.lim.desCurDeg, axes: ax, q: ax.q };
  });
  // POSITION-LEVEL split (Jolt JobIntegrateVelocity: COM += v₁·dt, R ← rot(ω₁·dt)·R, then the position solver moves bodies WITHOUT changing
  // velocities): the predicted end-of-step pose from the final velocities vs the actual one. ΔU, ΔPE of the position correction = actual − predicted.
  const pred = S0.map((s0, i) => { const s1 = S1[i], com = V.add(s0.com, V.sc(s1.v, dt)), wl = V.len(s1.w) * dt, rot = wl > 1e-6 ? Q.norm(Q.mul(Q.axis(V.sc(s1.w, 1 / V.len(s1.w)), wl), s0.rot)) : s0.rot.slice(); return { com, rot }; });
  const evP = sim.P.evaluate(pred.map(x => x.rot)), ev1 = sim.P.evaluate(S1.map(x => x.rot)), ev0 = sim.P.evaluate(S0.map(x => x.rot)), PEof = (A) => A.reduce((a, x, i) => a + spec.bodies[i].mass * g * x.com[1], 0);
  const jU = (ev) => ev.per.map(pj => pj.T.reduce((a, t) => a + (t ? t.U : 0), 0));
  const u0 = jU(ev0), uP = jU(evP), u1 = jU(ev1);
  const posLedger = { Upred: evP.U, PEpred: PEof(pred), dU_integration: evP.U - ev0.U, dU_positionCorrection: ev1.U - evP.U, dPE_integration: PEof(pred) - PEof(S0), dPE_positionCorrection: PEof(S1) - PEof(pred),
    joints: spec.joints.map((j, k) => ({ name: j.name, U0: u0[k], Upred: uP[k], U1: u1[k] })).filter(x => Math.abs(x.U1 - x.U0) > 1e-3 || Math.abs(x.U1 - x.Upred) > 1e-3),
    bodies: S1.map((s1, i) => ({ name: spec.bodies[i].name, corrMm: V.dist(s1.com, pred[i].com) * 1000, corrDeg: Q.angle(Q.mul(s1.rot, Q.conj(pred[i].rot))) * D })).filter(x => x.corrMm > 0.01 || x.corrDeg > 0.01) };
  return { posLedger, n0: sim.n - 1, n1: sim.n, t1: sim.n * dt, E0: E0.E, E1: E1.E, dE: E1.E - E0.E, KE0: E0.ke, KE1: E1.ke, PE0: E0.pe, PE1: E1.pe, U0: E0.U, U1: E1.U, sep1: E1.sepMax, bodies, joints, contacts: C, plan, S0, S1 };
}
// compact per-body / per-joint summary of a ledger entry
export function ledgerSummary(L, spec, { topBodies = 6, topJoints = 6 } = {}) {
  const b = L.bodies.map(x => ({ name: x.name, dK: x.dKt + x.dKr, dKt: x.dKt, dKr: x.dKr, Wc: x.W.contact, Wj: x.W.joint, Wl: x.W.limit, Wm: x.W.motor, Wt: x.W.texp, Wg: x.W.grav, Wgy: x.W.gyro + x.W.frame })).sort((a, c) => Math.abs(c.dK) - Math.abs(a.dK)).slice(0, topBodies);
  const j = L.joints.map(x => ({ name: x.name, Wp: x.Wpoint, Wl: x.Wlim.reduce((s, v) => s + v, 0), Wm: x.Wmot.reduce((s, v) => s + v, 0), Wt: x.Wtexp })).sort((a, c) => Math.abs(c.Wp) + Math.abs(c.Wl) + Math.abs(c.Wm) - Math.abs(a.Wp) - Math.abs(a.Wl) - Math.abs(a.Wm)).slice(0, topJoints);
  return { b, j };
}
