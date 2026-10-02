// ═══ physchar/pc_swingx.js — G2b SWING EXECUTOR X (opt-in: human.over.swingGen = "x") ═══════════════════════════════════════════════════
// The planner owns WHERE (a world foothold R.landC, its yaw R.yawT) and WHEN (the single support walkK.Tss from the step's start) the foot
// lands. This executor turns that request into world-space foot TARGETS for the swing leg's IK / inverse-dynamics feed-forward — it never
// moves the foot, the root or the pelvis; the finite motors and Jolt do.
//   CLOCK     the plan runs in PHYSICAL time: a command issued with the view of time t acts at t + dFb (the feedback delay), so the targets a
//             tick applies are the plan's targets at t + dFb, and the step's commands begin at tSw0 + dFb (the inherited swing's own
//             convention — no air time is lost to the delay).
//   STATE     a plan starts from the foot's ACTUAL state at the instant the command acts: the view's position / velocity / attitude advanced
//             over dFb by the foot's own velocity and the plan's acceleration (an internal-model prediction; nothing in the last dFb is seen).
//             Re-planned the same way at liftoff, when the planner moves the foothold or the touchdown time, and when the actual foot has
//             drifted from the plan ("replan": "actual"); or, for foothold / timing changes, from the plan's own state with re-anchoring
//             only on drift ("plan").
//   HORIZONTAL in the step's heading frame (forward / sideways): a quintic from that state (and the current plan's acceleration — no
//             acceleration step) to the landing pose, arriving at rest hEnd before the planned touchdown.
//   HEIGHT    the ankle's path: a C² base from its height at the step's start to the landing pose's height at the arrival, plus an early lift
//             (`lift`, peak at half of fC × the single support: the knee flexes in swing) — and a CLEARANCE GUARD on the LOWEST
//             POINT of the foot's own collider outline (any shape; in the commanded attitude, and in the actual one while that hangs lower, until the gate opens):
//             it is kept above a floor that rises to `clear` in early swing and then lowers along an approach line reaching the turf at the
//             planned touchdown with vTd downward. The floor's descent is GATED by the plan's horizontal arrival (a foot that still has a
//             correction to travel stays up); the plan always arrives by tArr, so the gate always opens; past the planned touchdown the
//             target keeps descending at vTd (pressing) — no hover.
//   PITCH/YAW the pitch from the actual attitude at the step's start toward level by 45 % of the swing, then to the contact attitude from 55 %
//             to the arrival, bounded by what the leg can give (the shank from the IK at the actual hip, the ankle's dorsiflexion range —
//             evaluated on the guard-free path, so no algebraic loop); the yaw a quintic to the landing yaw, re-planned with the horizontal.
//   CAPABILITY the horizontal travel's peak acceleration (forward push / braking, sideways) and speed against the leg's capability (aPush, aBrake, aCapL, vCap —
//             properties of the leg as this controller realises it, measured in the matched-state bench, not raised to pass). reachInterval() is the exact set of final
//             positions a quintic from the state can reach within those bounds — ASYMMETRIC for a moving foot. A request outside it is
//             executed to the nearest reachable point ("clamp") or as asked ("saturate"), and REPORTED (R.swx.infeasible).
// Everything within a plan is C² (the feed-forward differentiates the targets twice).
import { V, Q } from "./pc_math.js";
import { SUP } from "./pc_support.js";
import { quintic, qEval } from "./pc_swing.js";

export const SWX = {
  aPush: 30, aBrake: 30, aCapL: 15,     // m/s²: the swing foot's horizontal capability — forward acceleration, braking (backward), sideways (either way)
  vCap: 4.0,                            // m/s: its speed
  infeasible: "clamp",                  // "clamp": aim at the nearest reachable point | "saturate": aim at the request
  replan: "plan",                       // "actual" | "plan" (see STATE)
  hEnd: 0.02,                           // s: the horizontal travel arrives this long before the planned touchdown
  clear: 0.035, clrRamp: 0.12,          // m: the guard's floor for the outline's lowest point (reached over the first clrRamp of the swing)
  lift: 0.15, fC: 0.8,                  // m, —: the ankle's lift; its span (fC × the single support; peak at half of it) — liftShape "bump"
  liftShape: "knots", liftK: [0.12, 0.5, 0.6, 0.9],   // "knots": C² rest-to-rest rise to `lift` by liftK[0] s, to liftK[2]·lift by liftK[1] of the swing, to 0 by liftK[3]
  pitchLvl: 0.45, pitchL: [0.55, 0.95], // the pitch is level by pitchLvl of the swing; it turns to the contact attitude over pitchL
  vTd: 0.20,                            // m/s: the approach line's downward speed (crosses the turf at the planned touchdown), and the press after it
  vertical: "own",                      // "own" | "inherited": the hybrid (pc_loco) takes height / pitch / yaw from the inherited walking swing
  approach: "total",                    // "total": once arrived, the lowest point follows the approach line | "floor": only the guard's floor does
  dGate: 0.08,                          // m: the descent opens as the plan's horizontal distance to the landing closes from dGate to 0
  actPitch: "gate",                     // the actual attitude counts for the clearance (when it hangs lower) until the descent's gate opens
  replanPos: 0.04, replanVel: 0.8,      // drift: re-anchored to the actual foot when it is this far from the plan (m, m/s)
  replanDt: 1 / 60,                     // s: re-plans at most this often (the planner retargets at 60 Hz)
  tMin: 0.05,                           // s: no re-plan with less than this to the arrival (the remaining plan is kept)
  uTd: 0.88,                            // the executor's phase u = 1 at (planned single support)/uTd — its DESCEND / MISSED clock, as the inherited swing
  kLow: 0.002,                          // m: smooth-minimum width over the outline's corners
};
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, pitchOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])); };
const footRot = (yaw, rho) => Q.norm(Q.mul(Q.axis([0, 1, 0], yaw), Q.axis([1, 0, 0], -rho)));   // (+rho = toes up)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const mj = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 - 15 * x + 6 * x * x); };
const smin = (a, b, k) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp((m - a) / k) + Math.exp((m - b) / k)); };
// the lift: 64 s³(1 − s)³, C² at both ends, peak 1 at s = 1/2 — returns [value, d/ds, d²/ds²]
const bump = (s) => { if (s <= 0 || s >= 1) return [0, 0, 0]; const q = s * (1 - s), dq = 1 - 2 * s; return [64 * q * q * q, 192 * q * q * dq, 192 * (2 * q * dq * dq - 2 * q * q)]; };

// The final positions xf reachable by a quintic from (x0, v0, a0) arriving at rest after tau, with |acc| ≤ aCap and |vel| ≤ vCap throughout:
// x(s) = x0 + c0(s) + D·c1(s) is linear in D = xf − x0, so each bound at each instant is a half-line in D and the set is an interval
// (sampled at 41 instants). Asymmetric for a moving foot: it reaches far ahead easily and stops short only with a large deceleration.
// Returns [lo, hi] or null (no quintic from this state stays within the bounds — e.g. a foot too fast to stop in tau).
// (aCap: a bound on |acc|, or [aLo, aHi] with aLo < 0 < aHi — braking and pushing differ)
export function reachInterval(x0, v0, a0, tau, aCap, vCap) { if (!(tau > 1e-3)) return [x0, x0]; let lo = -1e9, hi = 1e9; const aB = Array.isArray(aCap) ? aCap : [-aCap, aCap], vB = [-(vCap ?? 1e9), vCap ?? 1e9];
  const c0 = quintic(0, v0, a0, 0, 0, 0, tau), c1 = quintic(0, 0, 0, 1, 0, 0, tau);
  for (let i = 0; i <= 40; i++) { const s = tau * i / 40, e0 = qEval(c0, s), e1 = qEval(c1, s);
    for (const [k, bd] of [[2, aB], [1, vB]]) { const A = e1[k], B = e0[k]; if (Math.abs(A) < 1e-9) { if (B < bd[0] * 1.0001 || B > bd[1] * 1.0001) return null; continue; }
      const p = (bd[1] - B) / A, m = (bd[0] - B) / A; lo = Math.max(lo, Math.min(p, m)); hi = Math.min(hi, Math.max(p, m)); } }
  return lo <= hi ? [x0 + lo, x0 + hi] : null; }

export class SwingX {
  constructor(loco, P) { this.loco = loco; this.P = { ...SWX, ...(P || {}) }; }
  get geo() { return this.loco.planner.exec.geo; }
  get dFb() { return this.loco.dFb || 0; }
  _corners() { const b = this.geo.box; return this._cc || (this._cc = [-1, 1].flatMap(sx => [-1, 1].map(sz => [b.pos[0] + sx * b.he[0], b.pos[1] - b.he[1], b.pos[2] + sz * b.he[2]]))); }
  // the lowest point of the outline relative to the foot origin, for an attitude (smooth minimum over the corners: C² where the lowest corner changes)
  _lowOff(rot) { const ys = this._corners().map(c => Q.rot(rot, c)[1]), m = Math.min(...ys), k = this.P.kLow; return m - k * Math.log(ys.reduce((a, y) => a + Math.exp(-(y - m) / k), 0)); }
  // the turf surface for the outline's lowest point
  _ySurf() { const g = this.geo, b = g.box; return g.yFlat + SUP.touchDepth + b.pos[1] - b.he[1]; }
  _rhoL() { const H = this.loco.human, P = H ? H.P : {}, b = this.geo.box, d2r = Math.PI / 180;
    return P.landToeH != null ? Math.asin(P.landToeH / (2 * b.he[2])) : P.landHeelH != null ? -Math.asin(P.landHeelH / (2 * b.he[2])) : ((-(P.kneeStance ?? 0) + (P.ankleHS ?? 0)) * d2r); }
  // the landing pose: the foot at the target sole centre, pitched rhoL about its contact edge, the contact edge ON the turf surface
  _landing(R, rhoL, landC) { const g = this.geo, b = g.box, a = g._ankleFromCenter(landC || R.landC, R.yawT), rotF = footRot(R.yawT, 0), flat = [a[0], g.yFlat + SUP.touchDepth, a[1]];
    const pv = [b.pos[0], b.pos[1] - b.he[1], b.pos[2] + (rhoL > 0 ? -1 : 1) * b.he[2]], pvW = V.add(flat, Q.rot(rotF, pv)), rotL = footRot(R.yawT, rhoL); return { pos: V.sub(pvW, Q.rot(rotL, pv)), rot: rotL, yaw: R.yawT, rho: rhoL }; }
  // physical times: the step's commands begin at tSw0 + dFb; the planned touchdown is tSw0 + Tss + dFb
  _tStart(R) { return R.tSw0 + this.dFb; }
  _tTd(R) { return R.tSw0 + (R.walkK && R.walkK.Tss ? R.walkK.Tss : R.T) + this.dFb; }
  _frame(yaw) { return { f: [Math.sin(yaw), Math.cos(yaw)], l: [Math.cos(yaw), -Math.sin(yaw)] }; }
  // the actual foot state at the physical time the command acts (the view advanced over dFb with its velocity and the plan's acceleration)
  _actual(R, o) { const fi = this.geo.foot[R.sw], S = o.states[fi], d = this.dFb, w = S.w || [0, 0, 0], W = R.swx, a = W && W.seg ? this._evalH(W.seg, o.t + d).a : [0, 0, 0];
    const pos = [S.pos[0] + S.v[0] * d + 0.5 * a[0] * d * d, S.pos[1] + S.v[1] * d, S.pos[2] + S.v[2] * d + 0.5 * a[2] * d * d], vel = [S.v[0] + a[0] * d, S.v[1], S.v[2] + a[2] * d];
    const nw = Math.hypot(...w), rot = nw > 1e-9 ? Q.norm(Q.mul(Q.axis(V.sc(w, 1 / nw), nw * d), S.rot)) : S.rot; return { pos, vel, rot, w }; }
  // ── horizontal: the heading-frame quintics, evaluated in the world (s < 0 extends the quintic backward smoothly: the feed-forward's
  //    backward sample on a re-plan tick must not see a clamp) ──
  _evalH(seg, t) { const s = Math.min(seg.tau, t - seg.t0), F = seg.F, ef = qEval(seg.cf, Math.max(s, -0.05)), el = qEval(seg.cl, Math.max(s, -0.05)), hold = s >= seg.tau;
    const p = [F.f[0] * ef[0] + F.l[0] * el[0], 0, F.f[1] * ef[0] + F.l[1] * el[0]], v = hold ? [0, 0, 0] : [F.f[0] * ef[1] + F.l[0] * el[1], 0, F.f[1] * ef[1] + F.l[1] * el[1]], a = hold ? [0, 0, 0] : [F.f[0] * ef[2] + F.l[0] * el[2], 0, F.f[1] * ef[2] + F.l[1] * el[2]];
    return { p, v, a }; }
  // the ankle's height path: [y, ẏ, ÿ] = base quintic + the early lift
  _evalY(W, t) { const vb = W.vb, s = Math.min(vb.tau, t - vb.t0), b = s >= vb.tau ? [vb.yEnd, 0, 0] : qEval(vb.c, Math.max(s, -0.05)), l = this._lift(W, t); return [b[0] + l[0], b[1] + l[1], b[2] + l[2]]; }
  // the lift [h, ḣ, ḧ]: "bump" (one C² bump over fC of the swing) or "knots" (a chain of rest-to-rest quintics between knots fixed in time at the
  // step's start — a timing change moves the descent (the approach line), not the lift)
  _lift(W, t) { const Z = this.P, L = Z.lift; if (Z.liftShape !== "knots") { const Tc = W.tC - W.tStart, bp = bump((t - W.tStart) / Tc); return [L * bp[0], L * bp[1] / Tc, L * bp[2] / (Tc * Tc)]; }
    const K = W.lk; let i = 0; while (i < K.length - 1 && t > K[i + 1][0]) i++; if (t <= K[0][0]) return [K[0][1], 0, 0]; if (i >= K.length - 1) return [K[K.length - 1][1], 0, 0];
    const [t0, h0] = K[i], [t1, h1] = K[i + 1], T = t1 - t0, x = (t - t0) / T, s5 = x * x * x * (10 - 15 * x + 6 * x * x), d5 = 30 * x * x * (1 - x) * (1 - x) / T, a5 = 60 * x * (1 - x) * (1 - 2 * x) / (T * T);
    return [h0 + (h1 - h0) * s5, (h1 - h0) * d5, (h1 - h0) * a5]; }
  _evalB(W, t) { const vb = W.vb, s = Math.min(vb.tau, t - vb.t0); return s >= vb.tau ? [vb.yEnd, 0, 0] : qEval(vb.c, Math.max(s, -0.05)); }
  _yaw(W, t) { const a = W.aseg, s = Math.min(a.tau, t - a.t0), done = s >= a.tau, y = qEval(a.cy, Math.max(s, -0.05)); return { yaw: a.yaw0 + (done ? a.dyaw : y[0]), dyaw: done ? 0 : y[1] }; }
  // the planned pitch: from the actual attitude at the step's start, level by pitchLvl of the swing, then to the contact attitude over pitchL
  _rhoP(W, t) { const Z = this.P, u = (t - W.tStart) / Math.max(1e-3, W.tTd - W.tStart); return W.rho0 * (1 - mj(u / Z.pitchLvl)) + W.rhoL * mj((u - Z.pitchL[0]) / (Z.pitchL[1] - Z.pitchL[0])); }
  // the plan's own state at time t, in the form a re-plan starts from
  _planState(R, t) { const W = R.swx, h = this._evalH(W.seg, t), y = this._yaw(W, t); return { pos: h.p, vel: h.v, acc: h.a, yaw: y.yaw, dyaw: y.dyaw }; }
  // the reachable interval of the landing position (forward / sideways in the heading frame of yaw) from a horizontal state, arriving at tArr
  reachFrom(t, pos, vel, acc, tArr, yaw) { const Z = this.P, F = this._frame(yaw), tau = tArr - t, pf = pos[0] * F.f[0] + pos[2] * F.f[1], pl = pos[0] * F.l[0] + pos[2] * F.l[1];
    const vf = vel[0] * F.f[0] + vel[2] * F.f[1], vl = vel[0] * F.l[0] + vel[2] * F.l[1], af = acc[0] * F.f[0] + acc[2] * F.f[1], al = acc[0] * F.l[0] + acc[2] * F.l[1];
    return { F, f: reachInterval(pf, vf, af, tau, [-Z.aBrake, Z.aPush], Z.vCap), l: reachInterval(pl, vl, al, tau, Z.aCapL, Z.vCap), tau }; }
  // the planner's query during the swing: the reachable FOOTHOLD (sole-centre) intervals for a touchdown at tTdPhys, from the actual foot now,
  // forward / sideways in the frame of the current landing yaw: { F, f: [lo, hi] | null, l: …, c: [f, l] of the current target }
  reach(R, o, tTdPhys) { const Z = this.P, A = this._actual(R, o), W = R.swx, acc = W && W.seg ? this._evalH(W.seg, o.t + this.dFb).a : [0, 0, 0], L = this._landing(R, W ? W.rhoL : this._rhoL());
    const r = this.reachFrom(o.t + this.dFb, A.pos, A.vel, acc, (tTdPhys ?? this._tTd(R)) - Z.hEnd, R.yawT), F = r.F, off = [L.pos[0] - R.landC[0], L.pos[2] - R.landC[1]], of = off[0] * F.f[0] + off[1] * F.f[1], ol = off[0] * F.l[0] + off[1] * F.l[1];
    return { F, f: r.f ? [r.f[0] - of, r.f[1] - of] : null, l: r.l ? [r.l[0] - ol, r.l[1] - ol] : null, c: [R.landC[0] * F.f[0] + R.landC[1] * F.f[1], R.landC[0] * F.l[0] + R.landC[1] * F.l[1]], tau: r.tau }; }
  // ── (re)plan at physical time t0 from a state { pos, vel, acc, yaw, dyaw, y?: [y, ẏ, ÿ] (the ankle height: at the start only) } ──
  _plan(R, t0, st, why) { const Z = this.P, W = R.swx, tArr = W.tTd - Z.hEnd, tau = Math.max(Z.tMin, tArr - t0), L0 = this._landing(R, W.rhoL), F = this._frame(R.yawT);
    const pf = st.pos[0] * F.f[0] + st.pos[2] * F.f[1], pl = st.pos[0] * F.l[0] + st.pos[2] * F.l[1], vf = st.vel[0] * F.f[0] + st.vel[2] * F.f[1], vl = st.vel[0] * F.l[0] + st.vel[2] * F.l[1];
    const af = st.acc[0] * F.f[0] + st.acc[2] * F.f[1], al = st.acc[0] * F.l[0] + st.acc[2] * F.l[1];
    let Lf = L0.pos[0] * F.f[0] + L0.pos[2] * F.f[1], Ll = L0.pos[0] * F.l[0] + L0.pos[2] * F.l[1]; const reqF = Lf, reqL = Ll, rf = reachInterval(pf, vf, af, tau, [-Z.aBrake, Z.aPush], Z.vCap), rl = reachInterval(pl, vl, al, tau, Z.aCapL, Z.vCap);
    // capability: the request against the reachable interval; "clamp" lands at the nearest reachable point; the shortfall is reported
    const out = (x, r) => r ? (x < r[0] ? x - r[0] : x > r[1] ? x - r[1] : 0) : null, short = [out(Lf, rf), out(Ll, rl)], infeas = short[0] !== 0 || short[1] !== 0;
    // (no reachable point at all — a foot too fast to stop within the bounds: the end that needs the least braking, where the foot will go anyway)
    const least = (x0, v, a, cap) => { let best = null, bv = 1e9; for (let i = 0; i <= 40; i++) { const D = v * tau * (0.2 + 0.8 * i / 40), c = quintic(0, v, a, D, 0, 0, tau); let pk = 0; for (let j = 0; j <= 20; j++) pk = Math.max(pk, Math.abs(qEval(c, tau * j / 20)[2])); if (pk < bv) { bv = pk; best = x0 + D; } } return best; };
    if (infeas && Z.infeasible === "clamp") { Lf = rf ? Math.max(rf[0], Math.min(rf[1], Lf)) : least(pf, vf, af); Ll = rl ? Math.max(rl[0], Math.min(rl[1], Ll)) : least(pl, vl, al); }
    W.seg = { t0, tau, F, cf: quintic(pf, vf, af, Lf, 0, 0, tau), cl: quintic(pl, vl, al, Ll, 0, 0, tau), end: [F.f[0] * Lf + F.l[0] * Ll, F.f[1] * Lf + F.l[1] * Ll] };
    // the ankle's base height path: to the landing pose's height at the arrival — from the actual ankle at the start, from the plan's own
    // height state when the arrival time or the landing height moves (the vertical is continuous; the guard below acts on the actual attitude)
    if (!W.vb || Math.abs(W.vb.t0 + W.vb.tau - (t0 + tau)) > 1e-6 || Math.abs(W.vb.yEnd - L0.pos[1]) > 1e-3) { const y0 = st.y || this._evalB(W, t0);
      W.vb = { t0, tau, yEnd: L0.pos[1], c: quintic(y0[0], y0[1], y0[2], L0.pos[1], 0, 0, tau) }; }
    // yaw: a quintic from the given yaw (and rate) to the landing yaw, arriving with the horizontal travel
    const cl12 = (x) => Math.max(-12, Math.min(12, x)), dy = wrap(R.yawT - st.yaw);
    W.aseg = { t0, tau, cy: quintic(0, cl12(st.dyaw), 0, dy, 0, 0, tau), yaw0: st.yaw, dyaw: dy };
    // the plan's peak demands (forward / sideways acceleration, speed)
    let aF = 0, aL = 0, vM = 0; for (let i = 0; i <= 20; i++) { const s = tau * i / 20, a1 = qEval(W.seg.cf, s), a2 = qEval(W.seg.cl, s); aF = Math.max(aF, Math.abs(a1[2])); aL = Math.max(aL, Math.abs(a2[2])); vM = Math.max(vM, Math.hypot(a1[1], a2[1])); }
    W.landC = R.landC.slice(); W.nPlans++; const r4 = (x) => x == null ? null : +x.toFixed(4);
    const rec = { t: r4(t0), why, tau: +tau.toFixed(3), aF: +aF.toFixed(1), aL: +aL.toFixed(1), v: +vM.toFixed(2), req: [r4(reqF), r4(reqL)], from: [r4(pf), r4(pl)], vFrom: [r4(vf), r4(vl)], reachF: rf ? rf.map(r4) : null, reachL: rl ? rl.map(r4) : null, short: short.map(r4) };
    W.log.push(rec); if (infeas) W.infeasible.push(rec); }
  // ── the plan at physical time t ──
  _eval(R, t, o) { const Z = this.P, W = R.swx, g = this.geo, h = this._evalH(W.seg, t), yaw = this._yaw(W, t).yaw, d2r = Math.PI / 180, ctrl = this.loco.ctrl, Lg = ctrl.legs[R.sw], ys = this._ySurf();
    const u = (t - W.tStart) / Math.max(1e-3, W.tTd - W.tStart), yb = this._evalY(W, t)[0];
    // the commanded pitch: the planned one, within what the leg can give at the guard-free path (the shank from the IK at the actual hip)
    const hip = o.states[Lg.thigh].pos, hdw = [Math.sin(yaw), 0, Math.cos(yaw)], dorsi = this.loco.ankDorsi ?? 25 * d2r, pp = [h.p[0], yb, h.p[2]];
    const ik = ctrl._legIK(Lg, hip, pp, hdw), sv = V.sub(pp, ik.pKnee), beta = Math.atan2(-(sv[0] * hdw[0] + sv[2] * hdw[2]), -sv[1]), rho = smin(this._rhoP(W, t), -(beta - dorsi), 3 * d2r), rot = footRot(yaw, rho);
    // the clearance guard: the outline's lowest point (commanded attitude; the actual one while it hangs lower, until the gate opens) above the floor
    const dist = Math.hypot(h.p[0] - W.seg.end[0], h.p[2] - W.seg.end[1]), G = mj((Z.dGate - dist) / Z.dGate), fa = Z.actPitch === "gate" ? 1 - G : 0, lowP = this._lowOff(rot), lo = lowP + fa * (smin(lowP, this._lowOff(o.states[g.foot[R.sw]].rot), Z.kLow) - lowP), m0 = Z.clear * mj(u / Z.clrRamp), hAp = Z.vTd * (W.tTd - t);
    const sp = (x, k) => x > 20 * k ? x : k * Math.log1p(Math.exp(x / k)); let y, m;
    if (Z.approach === "floor") { m = m0 + G * (smin(m0, hAp, 0.004) - m0); y = yb + sp(ys + m - (yb + lo), 0.003) - Z.vTd * sp(t - W.tTd, 0.005); }
    else { // ("total", default) the free path (ankle path + guard over the clearance floor); once the plan has arrived its LOWEST POINT follows the approach line (never raised by it)
      m = m0; const yF = yb + sp(ys + m0 - (yb + lo), 0.003), hF = yF + lo - ys, hT = hF + G * (smin(hF, hAp, 0.004) - hF); y = ys + hT - lo - Z.vTd * sp(t - W.tTd, 0.005); }
    return { pos: [h.p[0], y, h.p[2]], rot, rho, yaw, G, m, dist, u }; }
  // ── the executor's call (pc_loco _refSwingAt): once per control tick with the view time (plus the executor's own lead, removed here), and from
  //    the feed-forward at nearby times with the same view (the state is updated only on the first full call of a view) ──
  at(R, t, o, noVel) { const Z = this.P, tv = t - (R.leadNow || 0), tr = tv + this.dFb;
    if (!R.swx) { const W = R.swx = { rhoL: this._rhoL(), tStart: this._tStart(R), tTd: this._tTd(R), nPlans: 0, log: [], infeasible: [], lastView: o.t }; R.heelStrike = W.rhoL > 0;
      W.tC = W.tStart + Z.fC * (W.tTd - W.tStart); const A = this._actual(R, o); W.rho0 = pitchOf(A.rot);
      { const k = Z.liftK, Ts = W.tTd - W.tStart; W.lk = [[W.tStart, 0], [W.tStart + k[0], Z.lift], [W.tStart + Math.max(k[0] + 0.02, k[1] * Ts), k[2] * Z.lift], [W.tStart + Math.max(k[0] + 0.04, k[3] * Ts), 0]]; }
      this._plan(R, tr, { pos: A.pos, vel: A.vel, acc: [0, 0, 0], y: [A.pos[1], A.vel[1], 0], yaw: yawOf(A.rot), dyaw: A.w[1] }, "start"); W.tLast = tr; }
    const W = R.swx;
    if (W.lastView !== o.t && !noVel) { W.lastView = o.t; const tReq = this._tTd(R); let why = null;
      const dT = Math.abs(tReq - W.tTd) > 0.003, dL = Math.abs(R.landC[0] - W.landC[0]) > 0.001 || Math.abs(R.landC[1] - W.landC[1]) > 0.001;
      if (dT) why = "timing"; else if (dL) why = "foothold";
      if (R.liftoff && !W.lifted) { W.lifted = true; W.tLift = tr; if (Z.liftAnchor !== false) why = "liftoff"; }
      const A = this._actual(R, o), c = this._planState(R, tr), e = Math.hypot(A.pos[0] - c.pos[0], A.pos[2] - c.pos[2]), ev = Math.hypot(A.vel[0] - c.vel[0], A.vel[2] - c.vel[2]);
      if (!why && W.lifted && (e > Z.replanPos || ev > Z.replanVel)) why = "drift";
      const tArr = (dT ? tReq : W.tTd) - Z.hEnd;
      if (why && tArr - tr > Z.tMin && (tr - W.tLast >= Z.replanDt - 1e-9 || why === "liftoff")) {
        if (dT) W.tTd = tReq;
        const fromAct = Z.replan === "actual" || why === "liftoff" || why === "drift";
        const st = fromAct ? { pos: A.pos, vel: A.vel, acc: c.acc, yaw: yawOf(A.rot), dyaw: A.w[1] } : c;
        this._plan(R, tr, st, why); W.tLast = tr; } }
    const c = this._eval(R, tr, o), out = { pos: c.pos, rot: c.rot, u: Math.max(0, Math.min(1.5, ((tr - W.tStart) / Math.max(1e-3, W.tTd - W.tStart)) * Z.uTd)), reach: [W.seg.end[0], 0, W.seg.end[1]], rho: c.rho, swx: { G: c.G, dist: c.dist, m: c.m } };
    if (!noVel) { const h = 1 / 240, a = this._eval(R, tr - h, o).pos, b = this._eval(R, tr + h, o).pos; out.vel = V.sc(V.sub(b, a), 1 / (2 * h)); }
    return out; }
}
