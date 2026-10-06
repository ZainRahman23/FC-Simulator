// ═══ physchar2/ctrl/v2_touchdown.js — TOUCHDOWN COORDINATOR (e2/TOUCHDOWN_COORDINATOR_PREREG.md; user decisions 2026-10-06 AB_touchdown / AB2_coordinator) ═══════════════
// A reusable coordinator for a swing foot's terminal phase, with explicit phases SWING / FINAL APPROACH → MEASURED CONTACT / ACCOMMODATION → LOAD TRANSFER → SUPPORT and policy
// objects (approach, accommodation, load) so ordinary walking, recovery or running can supply different policies through the same interface. Used by nothing by default.
// Physics-authoritative: contact is ONLY the measured Jolt contact (the lifecycle's sensed touching pieces / states); a trajectory phase never declares contact.
//
// 1. FINAL APPROACH (tdPlan / tdAt): the E2 swing reference (stepSegment's structure: per-axis quintics from the MEASURED liftoff state, vertical through the apex knot) with its
//    terminal portion replaced by a geometry-consistent, C2 low-speed corridor:
//      • horizontal position and orientation complete at the corridor entry t_e = T − τ_c (quintics over t_e, then held) — tangential motion and orientation correction are done
//        before contact can occur (completing the orientation earlier, e.g. at the apex knot, exceeds the validated angular-acceleration envelope from the measured liftoff rates);
//      • the vertical: rise to the knot (unchanged apex knot, interior state solved for C4 continuity as stepSegment), descent to the corridor entry (z_goal + h_e, −v_e, 0) at t_e,
//        then the corridor quintic (z_goal + h_e, −v_e, 0) → (z_goal, 0, 0) over τ_c: monotone, decelerating, speed ≤ v_e throughout, zero terminal velocity and acceleration;
//      • heights are those of the LOWEST SOLE POINT (the goal pose is the terrain-aligned rest pose whose lowest sole point is on the terrain; with the orientation held at the goal
//        in the corridor, sole height = origin height − goal origin height); before t_e the reference's actual lowest sole point (with its orientation) is checked ≥ h_e;
//      • h_e = u_dn + d_c + v_e·dt_max: the validated downward tracking uncertainty of the lowest sole point, the measured-contact margin (a turf manifold point within d_c = 0.5 mm
//        counts as touching — the probe's definition) and one coarsest solver step of travel — measured contact cannot occur before the speed bound holds; cfg.late keeps the
//        reference inside the validated late-descent conditions of u_dn wherever contact becomes plausible;
//      • τ_c = the LARGEST corridor duration for which the whole reference stays inside the validated servo acceleration envelope (horizontal, vertical, angular) — the lowest
//        bounded approach speed the validated actuator capability allows within the step's timing; v_e = β·h_e/τ_c with β the corridor shape factor below;
//      • CONTACT SEARCH: if the nominal end (h = 0) passes without measured contact, the vertical continues rest-to-rest down by d_s = u_up + v_s·dt_max at peak speed ≤ v_s = v_e,
//        then holds; the search window ends t_s after the nominal end (explicit depth / time limits; reachability of the search pose is the certifier's).
// 2. ACCOMMODATION (accAt): at the first measured contact the free-space reference stops advancing: a C2 transition from the reference state at contact to the CONTACT ANCHOR (the
//    realised landed pose — position and yaw where the foot is, orientation terrain-aligned, flattened about the realised contact point so the contacting sole point does not move)
//    over τ_acc (the lifecycle's own acceptance ramp duration); no target below the realised contact height (no rigid vertical push). The planned foothold is kept separately.
// 3. HOLD / LOAD TRANSFER / SUPPORT: at the end of accommodation the swing target (then at rest at the anchor) is released onto the lifecycle's contact-compatible hold, set exactly
//    to the anchor (SupportLifecycle.setHold): horizontal, yaw and orientation held, vertical following the foot (no push), the existing resting seat force; the target is continuous.
//    The lifecycle's load acceptance then ramps the support weight s only from SUSTAINED measured contact and a load request; the swing-task authority falls with (1 − s) (the
//    controller's existing continuous blend) — no one-tick authority switch; A's weight already decays with the airborne weight, B's with the reference rate and c.
import { Q } from "../core/v2_math.js"; import { quintic, qeval, qlog, qexp } from "./v2_swing.js";

// corridor shape factor β = v_e·τ_c / h_e of the quintic (h, −v, 0) → (0, 0, 0): monotone (never upward), speed ≤ entry speed and decelerating only for β ∈ [5/3, ≈ 2.06]; β* minimises
// the peak deceleration over that set (derivation: e2/TOUCHDOWN_COORDINATOR_PREREG.md §2; computed, not fitted)
export const TD_BETA = (() => { const pk = (b) => { const c = quintic(1, -b, 0, 0, 0, 0, 1); let m = 0; for (let i = 0; i <= 2000; i++) m = Math.max(m, Math.abs(qeval(c, i / 2000)[2])); return m; };
  let lo = 5 / 3, hi = 2.0; for (let k = 0; k < 60; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (pk(m1) < pk(m2)) hi = m2; else lo = m1; } return (lo + hi) / 2; })();

const jerk5 = (c, t) => 6 * c[3] + 24 * c[4] * t + 60 * c[5] * t * t, snap5 = (c, t) => 24 * c[4] + 120 * c[5] * t;
// vertical: [ref → knot (vk, ak solved for C4 continuity)] [knot → (z1, v1, 0)] — as stepSegment's knotSolve, with a non-rest end state
function knotSolve2(z0, v0, a0, zk, t1, z1, v1, t2) { const seg = (vk, ak) => [quintic(z0, v0, a0, zk, vk, ak, t1), quintic(zk, vk, ak, z1, v1, 0, t2)];
  const res = (vk, ak) => { const [c1, c2] = seg(vk, ak); return [jerk5(c1, t1) - jerk5(c2, 0), snap5(c1, t1) - snap5(c2, 0)]; };
  const r0 = res(0, 0), rv = res(1, 0), ra = res(0, 1), a00 = rv[0] - r0[0], a01 = ra[0] - r0[0], a10 = rv[1] - r0[1], a11 = ra[1] - r0[1], det = a00 * a11 - a01 * a10;
  const vk = (-r0[0] * a11 + a01 * r0[1]) / det, ak = (-a00 * r0[1] + r0[0] * a10) / det, [c1, c2] = seg(vk, ak); return [{ T: t1, c: c1 }, { T: t2, c: c2 }]; }
const hold = (x) => ({ T: 1e9, c: [x, 0, 0, 0, 0, 0] });
function pieceAt(P, t) { let u = t; for (let i = 0; i < P.length; i++) { if (u <= P[i].T || i === P.length - 1) return qeval(P[i].c, Math.min(Math.max(u, 0), P[i].T)); u -= P[i].T; } }
const peakAbs = (P, k, t0, t1, n = 400) => { let m = 0; for (let i = 0; i <= n; i++) m = Math.max(m, Math.abs(pieceAt(P, t0 + (t1 - t0) * i / n)[k])); return m; };
function jerkAt(P, t) { let u = t; for (let i = 0; i < P.length; i++) { if (u <= P[i].T || i === P.length - 1) { const c = P[i].c, x = Math.min(Math.max(u, 0), P[i].T); return 6 * c[3] + 24 * c[4] * x + 60 * c[5] * x * x; } u -= P[i].T; } }
const peakJerk = (P, t0, t1, n = 400) => { let m = 0; for (let i = 0; i <= n; i++) m = Math.max(m, Math.abs(jerkAt(P, t0 + (t1 - t0) * i / n))); return m; };

// plan: ref = liftoff reference state { p, v, a, th, w, al } (θ relative to goal.rot), goal = { pos, rot } (terrain-aligned rest pose), T, knot = { z, tk }, sole = foot-local sole points,
// cfg = { uDn, uUp, dC (m), dtMax (s), env: { aH, aV, al, jH, jV } (validated acceleration / jerk envelope), late: { h, aV, vV, jV, jH } (validated late-descent domain of u_dn), tauMax } → a plan
//   or { feasible: false, why }. Jerk is part of the capability envelope because the torque-continuity contract (E1a-7) bounds the commanded torque RATE
export function tdPlan(ref, goal, T, knot, sole, cfg) {
  const lowAt = (pos, rot) => Math.min(...sole.map(p => pos[1] + Q.rot(rot, p)[1])), zg = goal.pos[1], gLow = lowAt(goal.pos, goal.rot);
  const build = (tauC) => { const te = T - tauC, band = cfg.uDn + cfg.dC, ve = TD_BETA * band / (tauC - TD_BETA * cfg.dtMax), hE = band + ve * cfg.dtMax;   // h_e = u_dn + d_c + v_e·dt_max, v_e = β·h_e/τ_c (solved jointly)
    if (!(ve > 0) || !isFinite(ve)) return null; const zE = zg + hE;
    const hor = (i) => [{ T: te, c: quintic(ref.p[i], ref.v[i], ref.a[i], goal.pos[i], 0, 0, te) }, hold(goal.pos[i])];
    const ver = [...knotSolve2(ref.p[1], ref.v[1], ref.a[1], knot.z, knot.tk, zE, -ve, te - knot.tk), { T: tauC, c: quintic(zE, -ve, 0, zg, 0, 0, tauC) }];
    const rot = [0, 1, 2].map(i => [{ T: te, c: quintic(ref.th[i], ref.w[i], ref.al[i], 0, 0, 0, te) }, hold(0)]);   // orientation complete at the corridor entry (completing earlier leaves the validated angular envelope)
    return { T, te, tauC, ve, hE, cp: [hor(0), ver, hor(2)], cr: rot }; };
  // late-descent validity domain of the uncertainty: wherever the reference sole is at or below cfg.late.h (the height below which every validated run was in its late-descent window),
  // its vertical acceleration and speed stay inside the validated late-descent envelope (cfg.late.aV, cfg.late.vV) — the conditions under which u_dn was measured
  const lateOK = (pl) => { let aL = 0, vL = 0, jL = 0, jHL = 0; for (let i = 0; i <= 600; i++) { const t = knot.tk + (T - knot.tk) * i / 600, q = pieceAt(pl.cp[1], t); if (q[0] - zg <= cfg.late.h + 1e-12) { aL = Math.max(aL, Math.abs(q[2])); vL = Math.max(vL, Math.abs(q[1])); jL = Math.max(jL, Math.abs(jerkAt(pl.cp[1], t))); jHL = Math.max(jHL, Math.hypot(jerkAt(pl.cp[0], t), jerkAt(pl.cp[2], t))); } }
    pl.late = { aV: aL, vV: vL, jV: jL, jH: jHL }; return aL <= cfg.late.aV && vL <= cfg.late.vV && jL <= cfg.late.jV && jHL <= cfg.late.jH; };
  const fits = (pl) => { if (!pl) return false; const aH = Math.max(peakAbs(pl.cp[0], 2, 0, pl.te), peakAbs(pl.cp[2], 2, 0, pl.te)), aV = peakAbs(pl.cp[1], 2, 0, T), al = Math.max(...pl.cr.map(P => peakAbs(P, 2, 0, pl.te)));
    let jH = 0; for (let i = 0; i <= 400; i++) { const t = pl.te * i / 400; jH = Math.max(jH, Math.hypot(jerkAt(pl.cp[0], t), jerkAt(pl.cp[2], t))); } const jV = peakJerk(pl.cp[1], 0, T);
    pl.peak = { aH, aV, al, jH, jV }; const late = lateOK(pl); return aH <= cfg.env.aH && aV <= cfg.env.aV && al <= cfg.env.al && jH <= cfg.env.jH && jV <= cfg.env.jV && late; };
  const tauMin = 2 * TD_BETA * cfg.dtMax + 1e-4, tauMax = Math.min(cfg.tauMax ?? 0.5 * (T - knot.tk), T - knot.tk - 1e-3);
  if (!(knot && knot.tk > 0 && knot.tk < T)) return { feasible: false, why: "no apex knot" };
  let best = null; for (let i = 0; i <= 400; i++) { const tc = tauMax - (tauMax - tauMin) * i / 400, pl = build(tc); if (fits(pl)) { best = pl; break; } }   // the largest τ_c inside the envelope
  if (!best) { const pl = build(tauMin); return { feasible: false, why: "no corridor inside the validated acceleration envelope", peakAtMin: pl ? (fits(pl), pl.peak) : null }; }
  // geometry check before the corridor: during the descent (apex knot → t_e) the reference's actual lowest sole point (with its orientation) stays ≥ h_e
  let minPre = Infinity; for (let i = 0; i < 300; i++) { const t = knot.tk + (best.te - knot.tk) * i / 300, s = tdAt({ ...best, goal }, t); minPre = Math.min(minPre, lowAt(s.pos, s.rot) - gLow); }   // the descent after the apex knot, before t_e
  const vS = best.ve, dS = cfg.uUp + vS * cfg.dtMax, tauS = (15 / 8) * dS / vS;   // search: rest-to-rest quintic of depth d_s = u_up + v_s·dt_max, peak speed (15/8)·d_s/τ_s = v_s
  return { feasible: minPre >= best.hE - 1e-6, why: minPre >= best.hE - 1e-6 ? null : `reference sole below the corridor entry before t_e (${(minPre * 1000).toFixed(2)} mm)`, T, te: best.te, tauC: best.tauC, vMax: best.ve, hE: best.hE, peak: best.peak, late: best.late,
    search: { dS, vS, tauS, tEnd: T + tauS }, goal: { pos: goal.pos.slice(), rot: goal.rot.slice() }, gLow, cp: [best.cp[0], [...best.cp[1].slice(0, 3), { T: tauS, c: quintic(zg, 0, 0, zg - dS, 0, 0, tauS) }, hold(zg - dS)], best.cp[2]], cr: best.cr }; }
// reference at time t from the measured liftoff: pose, world velocity / acceleration, world angular velocity / acceleration, phase
export function tdAt(pl, t) { const u = Math.max(t, 0), p = pl.cp.map(P => pieceAt(P, u)), r = pl.cr.map(P => pieceAt(P, u)), th = r.map(x => x[0]);
  const phase = u < pl.te - 1e-12 ? "swing" : u < pl.T - 1e-12 ? "corridor" : pl.search && u < pl.search.tEnd - 1e-12 ? "search" : "searchHold";
  return { pos: p.map(x => x[0]), vel: p.map(x => x[1]), acc: p.map(x => x[2]), rot: Q.norm(Q.mul(pl.goal.rot, qexp(th))), w: Q.rot(pl.goal.rot, r.map(x => x[1])), al: Q.rot(pl.goal.rot, r.map(x => x[2])), phase }; }
export function tdRef(pl, t, goalRot = null) { const u = Math.max(t, 0), p = pl.cp.map(P => pieceAt(P, u)), r = pl.cr.map(P => pieceAt(P, u)); let th = r.map(x => x[0]);
  if (goalRot) th = qlog(Q.mul(Q.conj(goalRot), Q.norm(Q.mul(pl.goal.rot, qexp(th))))); return { p: p.map(x => x[0]), v: p.map(x => x[1]), a: p.map(x => x[2]), th, w: r.map(x => x[1]), al: r.map(x => x[2]) }; }
export function tdPrev(pl, h) { const p = pl.cp.map(P => qeval(P[0].c, -h)[0]), th = pl.cr.map(P => qeval(P[0].c, -h)[0]); return { pos: p, rot: Q.norm(Q.mul(pl.goal.rot, qexp(th))) }; }

// ACCOMMODATION: from the reference state at the first measured contact (expressed against the anchor orientation) to the contact anchor at rest over tau (C2, per-axis quintics).
// anchor = { pos, rot }: the realised landed position / yaw with terrain-aligned orientation, flattened about the realised contact point c (world): the anchor origin is placed so that
// c keeps its position when the foot rotates from its measured orientation qm to the anchor orientation: pos = c + R_anchor·R_mᵀ·(p_m − c).
export function contactAnchor(footPos, footRot, contactPoint, terrainRot) { const yaw = (() => { const f = Q.rot(footRot, [0, 0, 1]); return Math.atan2(f[0], f[2]); })(), fw = Q.rot(terrainRot, [0, 0, 1]), yaw0 = Math.atan2(fw[0], fw[2]);
  const qa = Q.norm(Q.mul(Q.axis([0, 1, 0], yaw - yaw0), terrainRot)), rel = Q.mul(qa, Q.conj(footRot)), d = [footPos[0] - contactPoint[0], footPos[1] - contactPoint[1], footPos[2] - contactPoint[2]], dr = Q.rot(rel, d);
  return { pos: [contactPoint[0] + dr[0], contactPoint[1] + dr[1], contactPoint[2] + dr[2]], rot: qa }; }
export function accPlan(refState, anchor, tau) { return { T: tau, goal: { pos: anchor.pos.slice(), rot: anchor.rot.slice() }, cp: [0, 1, 2].map(i => [{ T: tau, c: quintic(refState.p[i], refState.v[i], refState.a[i], anchor.pos[i], 0, 0, tau) }, hold(anchor.pos[i])]),
  cr: [0, 1, 2].map(i => [{ T: tau, c: quintic(refState.th[i], refState.w[i], refState.al[i], 0, 0, 0, tau) }, hold(0)]), te: tau }; }
export function accAt(ap, t) { const s = tdAt({ ...ap, T: ap.T, te: ap.T, search: null }, t); return { ...s, phase: t < ap.T ? "accommodate" : "anchor" }; }

// the coordinator's phase machine (per swing foot). It never sets contact; it reads it.
//   APPROACH (swing + corridor + search) → CONTACT (first measured touch: accommodation starts) → HOLD (accommodation complete: the swing target is released onto the lifecycle's
//   contact-compatible hold, set to the contact anchor — horizontal / yaw / orientation held, vertical following the foot, no push) → TRANSFER (lifecycle LOAD_ACCEPT, only from
//   sustained measured contact and a load request) → SUPPORT (lifecycle SUPPORT). NO_CONTACT if the search window ends without measured contact.
export class TouchdownCoordinator {
  constructor(policy) { this.policy = policy; this.phase = "APPROACH"; this.plan = null; this.acc = null; this.t0 = null; this.tC = null; this.anchor = null; this.planned = null; this.log = []; }
  start(plan, tLiftoff, plannedFoothold) { this.plan = plan; this.t0 = tLiftoff; this.planned = plannedFoothold; this.phase = "APPROACH"; this._log(tLiftoff, "APPROACH"); }
  _log(t, ph) { this.log.push({ t, phase: ph }); }
  // ctx = { t, touching (measured touching pieces of the swing foot, turf only), state (lifecycle state), footPos, footRot, contactPoint (world, measured), terrainRot, tauAcc }
  // returns { target (swing reference or null once released), phase, release (true on the tick the swing target is handed to the lifecycle hold) }
  update(ctx) { const t = ctx.t;
    if (this.phase === "APPROACH") { const u = t - this.t0;
      if (ctx.touching > 0) { this.anchor = contactAnchor(ctx.footPos, ctx.footRot, ctx.contactPoint, ctx.terrainRot); const rs = tdRef(this.plan, u, this.anchor.rot);
        this.acc = accPlan(rs, this.anchor, ctx.tauAcc); this.tC = t; this.phase = "CONTACT"; this._log(t, "CONTACT"); return { target: accAt(this.acc, 0), phase: this.phase }; }
      if (this.plan.search && u >= this.plan.search.tEnd + this.policy.searchHold) { this.phase = "NO_CONTACT"; this._log(t, "NO_CONTACT"); }
      return { target: tdAt(this.plan, u), phase: this.phase }; }
    if (this.phase === "NO_CONTACT") return { target: tdAt(this.plan, t - this.t0), phase: this.phase };
    if (this.phase === "CONTACT") { const ua = t - this.tC; if (ua < this.acc.T - 1e-9) return { target: accAt(this.acc, ua), phase: this.phase };
      this.phase = "HOLD"; this._log(t, "HOLD"); return { target: null, phase: this.phase, release: true, anchor: this.anchor }; }
    if (this.phase === "HOLD" && ctx.state === "LOAD_ACCEPT") { this.phase = "TRANSFER"; this._log(t, "TRANSFER"); }
    if ((this.phase === "TRANSFER" || this.phase === "HOLD") && ctx.state === "SUPPORT") { this.phase = "SUPPORT"; this._log(t, "SUPPORT"); }
    return { target: null, phase: this.phase }; }
}
