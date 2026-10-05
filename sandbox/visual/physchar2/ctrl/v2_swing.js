// ═══ physchar2/ctrl/v2_swing.js — swing-foot reference trajectories (E1b put-down; the E2 swing reuses the same machinery) ═══════════════════
// Reuse-first (e1b_fix/research/SWING_PUTDOWN_STUDY.md): the general QUINTIC segment of BLF's SwingFootPlanner (min_jerk, QuinticSpline.h closed
// form, BSD-3 — the equations only, no code copied) between full (p, v, a) boundary states, planned from the CURRENT REFERENCE state (BLF's
// pattern: re-planning from the reference, not the measured foot, so the target never steps by the tracking error). Orientation: R(t) = R_f·exp(θ(t)),
// θ a per-axis quintic of the rotation vector from log(R_fᵀR_0) to 0 (no parallel-velocity restriction). A trajectory only SCHEDULES the
// reference: contact state, touchdown and hand-back are decided by the lifecycle from Jolt's contact / load (physics-authoritative).
import { Q, dsin, dcos, datan2 } from "../core/v2_math.js";

// coefficients c0…c5 of p(t) = Σ c_j t^j with p(0) = x0, ṗ(0) = v0, p̈(0) = a0, p(T) = xf, ṗ(T) = vf, p̈(T) = af (BLF QuinticSpline closed form)
export function quintic(x0, v0, a0, xf, vf, af, T) { const D = xf - x0, T2 = T * T, T3 = T2 * T, T4 = T3 * T, T5 = T4 * T;
  return [x0, v0, a0 / 2, (20 * D - (12 * v0 + 8 * vf) * T - (3 * a0 - af) * T2) / (2 * T3), (-30 * D + (16 * v0 + 14 * vf) * T + (3 * a0 - 2 * af) * T2) / (2 * T4), (12 * D - 6 * (v0 + vf) * T + (af - a0) * T2) / (2 * T5)]; }
export function qeval(c, t) { return [c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] + t * c[5])))), c[1] + t * (2 * c[2] + t * (3 * c[3] + t * (4 * c[4] + t * 5 * c[5]))), 2 * c[2] + t * (6 * c[3] + t * (12 * c[4] + t * 20 * c[5]))]; }

// rotation vector ↔ unit quaternion [x, y, z, w] (deterministic transcendental functions: browser = Node)
export function qlog(q) { let [x, y, z, w] = Q.norm(q); if (w < 0) { x = -x; y = -y; z = -z; w = -w; } const s = Math.sqrt(x * x + y * y + z * z);
  if (s < 1e-12) return [2 * x, 2 * y, 2 * z]; const f = 2 * datan2(s, w) / s; return [x * f, y * f, z * f]; }
export function qexp(v) { const th = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); if (th < 1e-12) return Q.norm([v[0] / 2, v[1] / 2, v[2] / 2, 1]);
  const s = dsin(th / 2), f = s / th; return [v[0] * f, v[1] * f, v[2] * f, dcos(th / 2)]; }

// reference state (p, v, a; θ, θ̇, θ̈ relative to R_f) of a commanded target from its last samples on a uniform tick (second-order backward
// differences of the REFERENCE itself — deterministic, no measured state); fewer samples → the missing derivatives are 0
export function refState(hist, Rf, dt) { const n = hist.length, P = (j) => hist[n - 1 - j].pos, T = (j) => qlog(Q.mul(Q.conj(Rf), hist[n - 1 - j].rot));
  const p0 = P(0), t0 = T(0), z = [0, 0, 0];
  if (n >= 3) { const p1 = P(1), p2 = P(2), t1 = T(1), t2 = T(2), d1 = (a, b, c) => [0, 1, 2].map(i => (3 * a[i] - 4 * b[i] + c[i]) / (2 * dt)), d2 = (a, b, c) => [0, 1, 2].map(i => (a[i] - 2 * b[i] + c[i]) / (dt * dt));
    return { p: p0, v: d1(p0, p1, p2), a: d2(p0, p1, p2), th: t0, w: d1(t0, t1, t2), al: d2(t0, t1, t2) }; }
  if (n === 2) { const p1 = P(1), t1 = T(1); return { p: p0, v: [0, 1, 2].map(i => (p0[i] - p1[i]) / dt), a: z, th: t0, w: [0, 1, 2].map(i => (t0[i] - t1[i]) / dt), al: z }; }
  return { p: p0, v: z, a: z, th: t0, w: z, al: z }; }

// a swing-foot segment from a reference state to a goal pose (goal velocity vz along world vertical, everything else at rest) over T seconds —
// plain data (controller snapshots are JSON: StandController.getState), evaluated by segAt
export function segment(ref, goal, T, vzEnd = 0) {
  return { T, goal: { pos: goal.pos.slice(), rot: goal.rot.slice() }, cp: [0, 1, 2].map(i => quintic(ref.p[i], ref.v[i], ref.a[i], goal.pos[i], i === 1 ? vzEnd : 0, 0, T)), cr: [0, 1, 2].map(i => quintic(ref.th[i], ref.w[i], ref.al[i], 0, 0, 0, T)) }; }
export function segAt(sg, t) { const u = Math.min(Math.max(t, 0), sg.T), p = sg.cp.map(c => qeval(c, u)), th = sg.cr.map(c => qeval(c, u)[0]);
  return { pos: p.map(x => x[0]), vel: p.map(x => x[1]), acc: p.map(x => x[2]), rot: Q.norm(Q.mul(sg.goal.rot, qexp(th))), done: t >= sg.T }; }

// duration from the swing servo's bandwidth (no failure data): with PD + velocity feed-forward the tracking error obeys ë + 2ζω ė + ω² e = p̈_d,
// so |e| ≲ max|p̈_d|/ω²; a rest-to-rest quintic of amplitude Δ peaks at |p̈_d| = (10/√3)·Δ/T² (Flash & Hogan 1985) → relative error ε needs
// T ≥ √(10/(√3·ε))/ω. ε = 0.10 at the lifecycle's swingHz 4 → 0.302 s (≈ 1.2 servo periods)
export const putDownDuration = (swingHz, eps = 0.10) => Math.sqrt(10 / (Math.sqrt(3) * eps)) / (2 * Math.PI * swingHz);
