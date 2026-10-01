// ═══ physchar/pc_swing.js — GENERIC SWING EXECUTION (opt-in: human.over.swingGen = "v2") ════════════════════════════════════════════════
// The planner owns WHERE and WHEN the foot lands (the target sole centre R.landC, its yaw, the planned touchdown time). This module turns
// that request into a world-space foot trajectory from the ACTUAL state of the leg — it assumes nothing about the foot's shape, its pitch at
// toe-off or which of its points leads:
//   PRE-LIFT  (from the step's start until the foot has actually left the turf): no horizontal travel — a loaded foot cannot be dragged —
//             the foot is lifted from its actual pose (the knee flexes); its pitch is its own.
//   AIR       (anchored at the measured liftoff): horizontal travel = a quintic from the ACTUAL position / velocity at liftoff to the landing
//             pose, arriving at rest; re-planned (C², from the planned state) whenever the planner moves the foothold. Height = a lift
//             profile from the actual liftoff height plus the CLEARANCE GUARD: the lowest point of the foot's own collider outline
//             (spec planBox / shape — the geometry the physics touches), in the planned orientation (and, through mid-swing, in the actual
//             orientation if that hangs lower), is kept a margin above the turf. Pitch = from the actual pitch at liftoff toward level, then
//             to the contact attitude, within what the ankle's range allows under the shank the IK gives (the foot hangs from the shank).
//   DESCENT   the margin closes at a bounded vertical speed so the contact edge (whichever corner is lowest) meets the turf at the planned
//             time with a small downward velocity, pressing slightly so it loads.
// Feasibility is REPORTED, not hidden: the travel's peak speed for the remaining time, and a late liftoff that leaves less than the minimum
// air time (the swing then lands late, by the minimum needed, and says so — the planner / classifier see it).
import { V, Q } from "./pc_math.js";
import { SUP } from "./pc_support.js";
import { minjerk } from "./pc_control.js";

export const SWING2 = { lead: true, preLift: 0.05, aMax: 25, vUp: 0.6, pivotT: 0.10, dLand: 0.06, lift: 0.08, margin: 0.035, vDesc: 0.30, press: 0.005, hEnd: 0.04, vMax: 3.5, airMin: 0.14, pitchLevelW: 0.5, actualUntil: 0.5, actualFade: 0.2, commit: 0.06 };
// quintic with boundary position / velocity / acceleration at s = 0 and s = T
export function quintic(p0, v0, a0, p1, v1, a1, T) { const h = p1 - p0, T2 = T * T, T3 = T2 * T, T4 = T3 * T, T5 = T4 * T;
  return [p0, v0, a0 / 2, (20 * h - (8 * v1 + 12 * v0) * T - (3 * a0 - a1) * T2) / (2 * T3), (-30 * h + (14 * v1 + 16 * v0) * T + (3 * a0 - 2 * a1) * T2) / (2 * T4), (12 * h - 6 * (v1 + v0) * T + (a1 - a0) * T2) / (2 * T5)]; }
export function qEval(c, s) { return [c[0] + s * (c[1] + s * (c[2] + s * (c[3] + s * (c[4] + s * c[5])))), c[1] + s * (2 * c[2] + s * (3 * c[3] + s * (4 * c[4] + s * 5 * c[5]))), 2 * c[2] + s * (6 * c[3] + s * (12 * c[4] + s * 20 * c[5]))]; }
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, pitchOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])); };
const footRot = (yaw, rho) => Q.norm(Q.mul(Q.axis([0, 1, 0], yaw), Q.axis([1, 0, 0], -rho)));   // (+rho = toes up)
const sp = (x, k) => x > 20 * k ? x : k * Math.log1p(Math.exp(x / k));
// smooth minimum (log-sum-exp): the swing path must be C² — the inverse-dynamics feed-forward differentiates it twice, and a kink (a hard
// min / a clamp switching) becomes a torque spike of hundreds of N·m (measured on the first build: ±550 N·m at the swing hip)
const smin = (a, b, k) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp((m - a) / k) + Math.exp((m - b) / k)); };

export class SwingV2 {
  // loco: the LocoController (its planner geometry, balance controller legs / IK, the human parameters for the contact attitude)
  constructor(loco, P) { this.loco = loco; this.P = { ...SWING2, ...(P || {}) }; }
  // the foot's collider outline in its own frame: the bottom corners of the planning outline (the rigid outline, incl. an articulated toe)
  _corners() { const b = this.loco.planner.exec.geo.box; return [-1, 1].flatMap(sx => [-1, 1].map(sz => [b.pos[0] + sx * b.he[0], b.pos[1] - b.he[1], b.pos[2] + sz * b.he[2]])); }
  // (smooth: log-sum-exp over the corners, so the guard does not kink where the lowest corner changes from the toe edge to the heel edge)
  _lowest(pos, rot) { const ys = this._corners().map(c => pos[1] + Q.rot(rot, c)[1]), m = Math.min(...ys), k = 0.004; return { y: m - k * Math.log(ys.reduce((a, y) => a + Math.exp(-(y - m) / k), 0)) }; }
  // the landing pose: the foot at the target sole centre, pitched rhoL about its contact edge (back edge for a toes-up contact, front edge
  // for a toes-down one), the contact edge pressed P.press below the turf
  _landing(R, rhoL) { const g = this.loco.planner.exec.geo, b = g.box, a = g._ankleFromCenter(R.landC, R.yawT), H = this.loco.human, flat = [a[0], g.yFlat + SUP.touchDepth - (H && H.P.landPress != null ? H.P.landPress : this.P.press), a[1]];
    const rotF = footRot(R.yawT, 0), pv = [b.pos[0], b.pos[1] - b.he[1], b.pos[2] + (rhoL > 0 ? -1 : 1) * b.he[2]], pvW = V.add(flat, Q.rot(rotF, pv)), rotL = footRot(R.yawT, rhoL);
    return { pos: V.sub(pvW, Q.rot(rotL, pv)), rot: rotL }; }
  _rhoL(R) { const H = this.loco.human, P = H ? H.P : {}, b = this.loco.planner.exec.geo.box, d2r = Math.PI / 180; if (R.sw2 && R.sw2.rhoL != null) return R.sw2.rhoL;
    return P.landToeH != null ? Math.asin(P.landToeH / (2 * b.he[2])) : P.landHeelH != null ? -Math.asin(P.landHeelH / (2 * b.he[2])) : ((-(P.kneeStance ?? 0) + (P.ankleHS ?? 0)) * d2r); }
  // the planned touchdown time (the planner's single support from the step's start)
  _tTd(R) { return R.tSw0 + (R.walkK && R.walkK.Tss ? R.walkK.Tss : R.T); }
  // ── state update, once per control tick (the executor's main call): liftoff anchoring and foothold re-plans ──
  update(R, t, o) { const g = this.loco.planner.exec.geo, fi = g.foot[R.sw], S = o.states[fi], Z = this.P;
    if (!R.sw2) { const rhoL = this._rhoL(R), H = this.loco.human, P = H ? H.P : {}, b = g.box, d2r = Math.PI / 180;
      // PRE-SWING pivot: the foot rolls about its FORWARD-MOST actual contact point (the sensor's contact points; the outline's front edge if
      // none), heel rising toward the toe-off attitude, so the ankle moves up and forward on the arc and the leg shortens — a loaded foot
      // held still could not unload (measured: stuck at 0.2–0.4 BW for 0.5 s)
      const hdv = Q.rot(S.rot, [0, 0, 1]), hn = Math.hypot(hdv[0], hdv[2]) || 1, hd = [hdv[0] / hn, 0, hdv[2] / hn], pts = o.feet[R.sw].points || [];
      let piv = null, best = -1e9; for (const q of pts) { const a = (q[0] - S.pos[0]) * hd[0] + (q[2] - S.pos[2]) * hd[2]; if (a > best) { best = a; piv = q.slice(); } }
      if (!piv) piv = V.add(S.pos, Q.rot(S.rot, [b.pos[0], b.pos[1] - b.he[1], b.pos[2] + b.he[2]]));
      const rhoTO = P.toeOffHeelH != null ? -Math.asin(P.toeOffHeelH / (2 * b.he[2])) : -(P.ankleTO ?? 10) * d2r;
      R.sw2 = { phase: "PRE", t0: t, p0: S.pos.slice(), q0: S.rot.slice(), y0: S.pos[1], rho0: Math.min(0, pitchOf(S.rot)), yaw0: yawOf(S.rot), piv, rhoTO, rhoL, tTd: this._tTd(R), land: null, seg: null, info: { replans: 0 } }; }
    const W = R.sw2;
    // AIR: anchored at the executor's measured liftoff (three ticks without contact or load — a single airborne tick flickered back)
    if (W.phase === "PRE" && R.liftoff) {
      const air = W.tTd - t; let tTd = W.tTd; if (air < Z.airMin) { tTd = t + Z.airMin; W.info.lateLift = { t, need: Z.airMin, had: air }; }
      W.phase = "AIR"; W.tL = t; W.tTd = tTd; W.yL = S.pos[1]; W.vyL = S.v[1]; W.rhoA = Math.min(0, pitchOf(S.rot)); W.yawA = yawOf(S.rot);
      this._plan(R, t, S.pos, [S.v[0], S.v[2]], [0, 0]); }
    // a TIMING change from the planner (the in-swing re-decision moved the touchdown): the new planned touchdown, never earlier than the
    // swing's own feasibility extension allows
    const tReq = this._tTd(R); if (Math.abs(tReq - (W.tTdReq ?? tReq)) > 1e-6 || W.tTdReq == null) { const ch = W.tTdReq != null && Math.abs(tReq - W.tTdReq) > 1e-6; W.tTdReq = tReq;
      if (ch && W.tTd - t > Z.commit) { W.tTd = Math.max(tReq, t + Z.commit + 0.02); if (W.phase === "AIR") { const s2 = t - W.seg.t0, xq = qEval(W.seg.cx, Math.min(s2, W.seg.T)), zq = qEval(W.seg.cz, Math.min(s2, W.seg.T)); this._plan(R, t, [xq[0], 0, zq[0]], [xq[1], zq[1]], [xq[2], zq[2]]); W.info.retimed = (W.info.retimed || 0) + 1; } } }
    // a foothold change from the planner: re-plan the horizontal travel from the PLANNED state (continuous position, velocity, acceleration)
    if (W.phase === "AIR" && W.land && (Math.abs(W.landC[0] - R.landC[0]) > 1e-6 || Math.abs(W.landC[1] - R.landC[1]) > 1e-6) && W.tTd - t > Z.commit) {
      const s = t - W.seg.t0, x = qEval(W.seg.cx, Math.min(s, W.seg.T)), z = qEval(W.seg.cz, Math.min(s, W.seg.T)); this._plan(R, t, [x[0], 0, z[0]], [x[1], z[1]], [x[2], z[2]]); W.info.replans++; }
    return W; }
  // (FEASIBILITY: the travel's peak acceleration ≈ 5.77·D/T² must stay within what the swing leg's finite hip / knee torques give it (aMax,
  //  a property of the leg, not of the foot): if not, the air phase is lengthened by the minimum needed — the foot lands LATE where it was
  //  asked to, and the plan records it (info.extended), instead of the leg saturating and flinging the foot past its target)
  _plan(R, t, p, v, a) { const W = R.sw2, Z = this.P, L0 = this._landing(R, W.rhoL), D0 = Math.hypot(L0.pos[0] - p[0], L0.pos[2] - p[2]), Tn = W.tTd - Z.hEnd - t, Tmin = Math.sqrt(5.77 * D0 / Z.aMax);
    if (Tn < Tmin && W.phase === "AIR" && !W.info.replans) { const dT = Tmin - Tn; W.tTd += dT; W.info.extended = (W.info.extended || 0) + dT; }
    const L = L0, Th = Math.max(0.05, W.tTd - Z.hEnd - t);
    W.land = L; W.landC = R.landC.slice(); W.seg = { t0: t, T: Th, cx: quintic(p[0], v[0], a[0], L.pos[0], 0, 0, Th), cz: quintic(p[2], v[1], a[1], L.pos[2], 0, 0, Th) };
    const D = Math.hypot(L.pos[0] - p[0], L.pos[2] - p[2]); W.info.peak = 1.875 * D / Th; W.info.feasible = W.info.peak <= Z.vMax; }
  // ── the foot's target pose at time t (a pure function of the stored plan) ──
  eval(R, t, o) { const W = R.sw2, Z = this.P, g = this.loco.planner.exec.geo, S0 = o.states[0], ctrl = this.loco.ctrl, Lg = ctrl.legs[R.sw], d2r = Math.PI / 180;
    const T0 = W.tTd - W.t0, u = Math.max(0, Math.min(1, (t - W.t0) / Math.max(1e-3, T0)));
    let pos, yaw, rho, wA;
    if (W.phase === "PRE") { // the pivot: rotate the actual pose about the contact point, heel rising toward the toe-off attitude (never lowering it)
      const x = Math.max(0, Math.min(1, (t - W.t0) / Z.pivotT)), dr = Math.min(0, W.rhoTO - W.rho0) * minjerk(x), lat = Q.rot(W.q0, [1, 0, 0]), qr = Q.axis(lat, -dr);
      // (and the whole foot RISES preLift over pivotT: the executor confirms liftoff only ≈ 60 ms after it happens (the 50 ms view + 3 ticks) —
      //  a pivot held on the turf commanded the already airborne foot back down: early-swing re-contacts)
      pos = V.add(V.add(W.piv, Q.rot(qr, V.sub(W.p0, W.piv))), [0, Z.preLift * minjerk(x), 0]); yaw = W.yaw0; rho = W.rho0 + dr; wA = 0;
      return { pos, rot: Q.norm(Q.mul(qr, W.q0)), rho, yaw, u, wA }; }
    // (s may be negative: the quintic is extended backward smoothly — the feed-forward's backward sample on a re-plan tick must not see a
    //  clamp, which read as ≈ 240 m/s² of foot acceleration)
    else { const s = Math.min(W.seg.T, t - W.seg.t0), x = qEval(W.seg.cx, s)[0], z = qEval(W.seg.cz, s)[0], Ta = Math.max(1e-3, W.tTd - W.tL); wA = Math.max(0, Math.min(1, (t - W.tL) / Ta));
      // height: from the liftoff height toward the landing height, plus the lift (an early bump, as a human knee flexes in initial swing)
      const yB = W.yL + (W.land.pos[1] - W.yL) * minjerk(wA), bump = Z.lift * wA * wA * Math.pow(1 - wA, 3) / (0.16 * 0.216);   // (C², peak at 40 % of the air phase)
      yaw = W.yawA + (R.yawT - W.yawA) * minjerk(wA);
      rho = W.rhoA * (1 - minjerk(wA / Z.pitchLevelW)) + W.rhoL * minjerk((wA - Z.pitchLevelW) / (1 - Z.pitchLevelW));
      pos = [x, yB + bump, z]; }
    // the pitch the leg can give: the shank (IK from the actual hip) tilted back by β leaves the foot at most −(β − dorsi) toes-up
    const hip = o.states[Lg.thigh].pos, hdw = [Math.sin(yaw), 0, Math.cos(yaw)], dorsi = (this.loco.ankDorsi ?? 25 * d2r);
    const rhoMax = (pp) => { const ik = ctrl._legIK(Lg, hip, pp, hdw), sv = V.sub(pp, ik.pKnee), beta = Math.atan2(-(sv[0] * hdw[0] + sv[2] * hdw[2]), -sv[1]); return -(beta - dorsi); };
    const kR = 3 * d2r; if (W.phase === "AIR") rho = smin(rho, rhoMax(pos), kR);
    // CLEARANCE GUARD on the foot's own outline: the lowest corner in the planned orientation — and, through mid-swing, in the actual
    // orientation when that hangs lower — at least `margin` above the turf; the margin closes at vDesc toward the planned touchdown
    // (the guard uses the foot's ACTUAL pitch when it hangs lower than planned, and the margin only closes — the descent — once the ACTUAL
    //  foot is within dLand of its landing point horizontally: a lagging foot lowered on the clock caught its toe at 72 % of the swing; it
    //  lands late instead, and the late touchdown is visible to the planner)
    if (W.phase === "AIR") { const yg = g.yFlat + SUP.touchDepth + g.box.pos[1] - g.box.he[1], tRem = W.tTd - t, fA = o.states[g.foot[R.sw]], dP = this.loco.dFb || 0, fP = [fA.pos[0] + fA.v[0] * dP, fA.pos[2] + fA.v[2] * dP], dAct = Math.hypot(fP[0] - W.land.pos[0], fP[1] - W.land.pos[2]);   // (the view is dFb old: the foot advanced by its own velocity — the internal-model prediction swingPredict uses for the hip)
      const gate = minjerk(Math.max(0, Math.min(1, (dAct - Z.dLand) / Z.dLand))), mT = Z.vDesc * tRem - Z.press, mUp = Z.margin * minjerk(Math.min(1, (t - W.tL) * Z.vUp / Z.margin)), m = smin(mUp, mT + gate * Math.max(0, Z.margin - mT), 0.004);
      const rhoAct = pitchOf(fA.rot), rhoC = smin(rho, rhoAct, kR);
      const p0 = pos; for (let it = 0; it < 2; it++) { const lo = this._lowest(pos, footRot(yaw, rhoC)); pos = [p0[0], p0[1] + sp(yg + m - lo.y, 0.01), p0[2]]; rho = smin(rho, rhoMax(pos), kR); } }
    return { pos, rot: footRot(yaw, rho), rho, yaw, u, wA }; }
  // the executor's interface (as pc_loco _refSwingAt): { pos, rot, u, reach, rho, vel }
  // (DELAY COMPENSATION of the trajectory's TIME: the view is dFb old, the commands act now — the plan (anchored in the time of the observed
  //  state) is evaluated at view time + dFb, for the targets AND the feed-forward that differentiates it. Evaluated at the view time, every
  //  target and every feed-forward torque arrived 50 ms late: the leg was driven late (mid-swing lag) and braked late (a 10.9 cm overshoot;
  //  1.7 cm with no delay at all). The internal-model compensation swingPredict already applies to the hip and pelvis.)
  at(R, t, o, noVel) { if (!noVel) this.update(R, t, o); const tq = t + (this.P.lead ? (this.loco.dFb || 0) : 0), c = this.eval(R, tq, o), out = { pos: c.pos, rot: c.rot, u: c.u, reach: R.sw2.land ? R.sw2.land.pos : this._landing(R, R.sw2.rhoL).pos, rho: c.rho, sw2: R.sw2.phase };
    if (!noVel) { const h = 1 / 240, a = this.eval(R, tq - h, o), b = this.eval(R, tq + h, o); out.vel = c.u < 1 ? V.sc(V.sub(b.pos, a.pos), 1 / (2 * h)) : [0, 0, 0]; }
    return out; }
}
