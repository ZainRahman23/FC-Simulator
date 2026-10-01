// ═══ physchar/pc_unified.js — G2b UNIFIED WALKING CONTROLLER (opt-in: rhythm.walk.ctrl = { kind: "U", … }) ═════════════════════════════════
// ONE hierarchy serving ONE target, the requested forward velocity vd (the user's architecture, 2026-10-01):
//   desired velocity vd
//   → the REFERENCE ORBIT for vd: step timing (T, Tds) and length L = vd·(T + Tds), and the capture point's path along it relative to the stance
//     foot — its offset at the swing's liftoff x_L(vd), at touchdown ξ_td = L + e(vd), and at the next step's start x_S(vd) (relations measured
//     on this body; the orbit between liftoff and touchdown is made SELF-CONSISTENT: the capture point propagated from x_L under the planned
//     heel → toe roll with one drift term that makes it arrive at L + e at T)
//   → STANCE / GROUND-REACTION regulation: the stance ankle tracks that orbit in single support, the double support's CoP solver tracks x_S
//     (pc_plan _dcmRef / _walkDSxi with the orbit this controller hands them)
//   → the REMAINING predicted error at touchdown (what the ground reaction will not have removed: the measured error now, propagated with the
//     calibrated growth rates of the untracked pre-swing and the tracked single support)
//   → the next FOOTHOLD + TOUCHDOWN TIME: the foothold absorbs the predicted touchdown error (u = L + G·ε_td) — re-decided every planning cycle
//     through the swing from the latest measured state, until a commit time before touchdown
//   → REACHABILITY as a hard constraint: the foothold must be reachable at that touchdown time from the ACTUAL state — the swing leg's reach and
//     hip range from where the pelvis will be (the toolbox's leg-geometry check, the stance toe kept down), and the swing foot's travel from
//     where it actually is, with its actual velocity, in the air time left, within the leg's acceleration capacity. When the absorbing foothold
//     is not reachable at the nominal time, the touchdown time moves (earlier or later, whichever brings the foothold into the reachable set at
//     the least timing change); what still cannot be absorbed is logged as such (never silently clamped)
//   → the physical swing (the executor's swing, retargeted; its delay compensation is the pelvis-rate internal model, walk.swingBase).
//   A slow SPEED LOOP closes on the measured walking speed: a persistent error shifts the whole orbit (integral action on the model's bias), so
//   placement and ground reaction move together and never fight over speed.
// Sideways: Controller A's measured maps (pc_walker.js) decide the width only, with this controller's forward foothold and timing fixed.
// Everything here DECIDES; nothing moves the body (no forces, no state writes).
import { predictA, modelAt } from "./pc_walker.js";

export const UNI = {
  Tr: 0.40,              // s, nominal single support (step start → touchdown, view time)
  Tds: 0.20,             // s, nominal double support (the measured mean replaces it once steps have been seen: TdsMeas)
  k: 0.5,                // stance capture-point tracking gain (p = p_ref + (1 + k)(ξ − ξ_ref) along the walk)
  xL: [-0.114, 0.393],   // x_L(v) = a + b·v: capture point at liftoff ahead of the stance centre (measured, G2b speed work)
  xS: [-0.147, 0.341],   // x_S(v): at a step's start
  dsMap: [0.063, 1.11],  // next-start offset vs the touchdown offset e = ξ_td − u: x' = c0 + c1·e (measured at matched states)
  G: 1.0,                // placement gain on the predicted touchdown error (1 = the foothold absorbs all of it)
  funnel: 0.5,           // fraction of the step-start error the stance reference converges onto the orbit by touchdown (min-jerk; the rest is the foothold's)
  wE: null,              // 1/s, the effective capture-point divergence rate of the prediction (null = ω from the COM height) — calibrated
  dE: 0.0,               // m/s, the effective forward drift of the capture point beyond the CoP's (angular momentum, height motion) — calibrated
  copInset: 0.02,        // m, the realisable CoP stays this far inside the stance sole's extent along the walk
  stanceExt: 0.99,       // the stance leg's extension at which its heel must rise (hip → ankle over the leg length)
  lamPre: 2.0,           // 1/s, growth of a capture-point error before liftoff (untracked pre-swing)
  lamSS: 0.0,            // 1/s, growth under the tracked single support (≈ −k·ω unsaturated; calibrated)
  liftDelay: 0.08,       // s, expected liftoff after the step start (view time) while not yet lifted
  commitRem: 0.10,       // s before the planned touchdown after which the foothold is no longer changed
  aCap: 40,              // m/s², the swing foot's peak horizontal acceleration capacity (calibrated on the reach grid)
  dfMin: -0.10, dfMax: 0.60,
  Tmin: 0.30, Tmax: 0.54, Tstep: 0.02, wT: 4.0, remMin: 0.14,   // timing: bounds, search step, cost weight (per s² vs per m²), minimum air time left
  speedI: { gain: 0.10, max: 0.08, tau: 0.6 },                // the speed loop: orbit shift per (m/s · step), bound, speed low-pass (s)
  lat: { rho: 0.4, xStar: 0.081, sig: 0.05 },                  // sideways: Controller A's measured map, partial convergence toward x*_l
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// the capture point under a CoP moving LINEARLY pa → pb over Tseg (ξ̇ = ω(ξ − p) + d), at s — closed form
export function refXi(x0, pa, pb, Tseg, s, w, d) { const E = Math.exp(w * s), k = (E - 1) / (w * Tseg), dp = pb - pa;
  return E * x0 - pa * (E - 1) + dp * (s / Tseg - k) + (d || 0) * (E - 1) / w; }

// the swing foot's peak horizontal acceleration for a quintic from (0, v0, 0) to (D, 0, 0) in time T
export function peakAcc(D, v0, T) { let m = 0; for (let i = 0; i <= 20; i++) { const s = i / 20, a = (D * (60 * s - 180 * s * s + 120 * s * s * s) + v0 * T * (-36 * s + 96 * s * s - 60 * s * s * s)) / (T * T); m = Math.max(m, Math.abs(a)); } return m; }

export class UnifiedWalker {
  constructor(C, ctx) { this.C = { ...UNI, ...C, speedI: { ...UNI.speedI, ...(C.speedI || {}) }, lat: { ...UNI.lat, ...(C.lat || {}) } }; this.ctx = ctx; this.I = 0; this.vBar = null; this.vT = null; this.dsMeas = []; this.log = []; this.stepLog = []; }
  // the REQUESTED velocity at t: C.vd (or a step profile C.vdProfile [[t, v], …]); during gait initiation (C.ramp = { a } m/s²) it ramps from the
  //  measured walking speed at the first controlled step toward the request at a bounded acceleration — a body at 0.2 m/s is not asked for the
  //  0.5 m/s orbit on its first step
  vd(t) { const C = this.C; let v = C.vd; if (C.vdProfile) { v = C.vdProfile[0][1]; for (const [ts, vs] of C.vdProfile) if (t >= ts) v = vs; }
    if (C.ramp && this.ramp0 != null) { const vr = this.ramp0.v + C.ramp.a * Math.max(0, t - this.ramp0.t); if (vr < v) v = vr; } return v; }
  rampStart(t) { if (this.C.ramp && this.ramp0 == null) this.ramp0 = { t, v: Math.max(this.C.ramp.v0 ?? 0.2, Math.min(this.C.vd, this.vBar ?? 0.2)) }; }
  Tds() { const a = this.dsMeas.slice(-4); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : this.C.Tds; }
  // the speed loop's measurement: the forward COM velocity low-passed over speedI.tau (one stride)
  observe(o, hd) { const v = o.vcom[0] * hd[0] + o.vcom[2] * hd[1]; if (this.vBar == null) { this.vBar = v; this.vT = o.t; return; } const a = Math.min(1, Math.max(0, o.t - this.vT) / this.C.speedI.tau); this.vBar += a * (v - this.vBar); this.vT = o.t; }
  // once per step (at its start): integral action on the walking speed's error — the whole orbit shifts (forward offsets + I)
  stepUpdate(t, i) { const C = this.C, SI = C.speedI; if (i >= (C.from ?? 2) && this.vBar != null) { const e = this.vBar - this.vd(t); this.I = clamp(this.I - SI.gain * e, -SI.max, SI.max); } return this.I; }
  // the reference orbit for the current request at single-support duration T (forward offsets relative to the stance centre)
  orbit(t, T) { const C = this.C, v = this.vd(t), Tds = this.Tds(), xS = C.xS[0] + C.xS[1] * v + this.I, xL = C.xL[0] + C.xL[1] * v + this.I, e = (xS - C.dsMap[0]) / C.dsMap[1], L = v * (T + Tds);
    return { v, T, Tds, xS, xL, e, L, xiTd: L + e }; }
  // the orbit's capture-point path from liftoff (at tauL into the step) to touchdown T, with the drift that makes it arrive at ξ_td(T)
  path(orb, tauL, rollR, w) { const Ts = Math.max(0.05, orb.T - tauL), fr = clamp(tauL / orb.T, 0, 1), pa = -rollR + 2 * rollR * fr, pb = rollR, E = Math.exp(w * Ts);
    const free = refXi(orb.xL, pa, pb, Ts, Ts, w, 0), d = (orb.xiTd - free) * w / (E - 1); return { x0: orb.xL, pa, pb, Ts, d, tauL, at: (s) => refXi(orb.xL, pa, pb, Ts, s, w, d) }; }
  // the predicted forward error at touchdown from the measured capture point now (τ into the step, x = ξ − stance centre along the walk)
  predErr(x, tau, tauL, T, orb, rollR, w) { const C = this.C;
    // before liftoff the orbit runs from x_S (step start) to x_L (liftoff) — the error relative to it grows untracked to liftoff (lamPre),
    // then under the tracked single support to touchdown (lamSS)
    if (tau < tauL) { const ref = orb.xS + (orb.xL - orb.xS) * clamp(tau / Math.max(1e-3, tauL), 0, 1); return (x - ref) * Math.exp(C.lamPre * (tauL - tau)) * Math.exp(C.lamSS * (T - tauL)); }
    const P = this.path(orb, tauL, rollR, w); return (x - P.at(tau - tauL)) * Math.exp(C.lamSS * Math.max(0, T - tau)); }
}
// the STANCE REFERENCE of one step (forward, relative to the stance centre): the orbit o(τ) (x_S → x_L linear before liftoff, the drifted roll
// path after it) plus the step-start error E0 = ξ(0) − o(0), converged by `funnel` of itself by touchdown — continuous at the step's start (the
// stance legs' velocity reference ω(ξ_ref − c) equals the body's own velocity there) and at liftoff; returns τ → { xi, p (the roll point) }
UnifiedWalker.prototype.refFn = function (orb, E0, tauL, rollR, w) { const C = this.C, P = this.path(orb, tauL, rollR, w), T = orb.T, mj = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 - 15 * x + 6 * x * x); };
  return (tau) => { let o, p; if (tau < tauL) { o = orb.xS + (orb.xL - orb.xS) * Math.max(0, Math.min(1, tau / Math.max(1e-3, tauL))); p = -rollR + 2 * rollR * Math.min(1, tau / T); }
    else { const sN = tau - tauL; o = P.at(Math.min(sN, P.Ts + 0.2)); p = P.pa + (P.pb - P.pa) * Math.min(1, sN / P.Ts); }
    return { xi: o + E0 * (1 - C.funnel * mj(tau / T)), p }; }; };
// the PREDICTED capture point (forward, relative to the stance centre) from x at τ to every t ≤ Tend, under the stance law the controller runs:
// before liftoff the planned roll (untracked), after it the orbit tracked with gain k, the CoP clamped to the stance sole's actual extent
// (sole = [back, front] along the walk relative to the stance centre); returns a function T → ξ̂(T)
// (geo, optional — the stance leg's geometry: { c, hipOff, ankF, hipH, Lr }: the COM (forward, rel. the stance centre), the hip's forward offset
//  from it, the stance ankle's forward position, the hip height above the ankle, the leg's reach ext·L — once the hip is beyond the flat-foot
//  reach √(Lr² − hipH²) ahead of the ankle the heel must rise and the stance foot pivots on its toe: the CoP is pinned at the toe (the
//  forefoot rocker the body's geometry imposes — measured: late single support's CoP +14 cm against a +10 cm command, ξ̇ a third of LIPM's))
UnifiedWalker.prototype.simulate = function (x, tau, tauL, Tend, orbNom, rollR, w, sole, geo, ref) { const C = this.C, wE = C.wE ?? w, h = 0.005, P = this.path(orbNom, tauL, rollR, w), out = [];
  const lo0 = sole[0] + C.copInset, hi = sole[1] - C.copInset, Rf = geo ? Math.sqrt(Math.max(0, geo.Lr * geo.Lr - geo.hipH * geo.hipH)) : null; let xi = x, t = tau, c = geo ? geo.c : null; out.push([t, xi]); this.lastPivotT = null;
  while (t < Tend - 1e-9) { const dt = Math.min(h, Tend - t); let p, lo = lo0;
    if (geo && c + geo.hipOff - geo.ankF > Rf) { lo = hi; if (this.lastPivotT == null) this.lastPivotT = t; }
    if (t < tauL) p = -rollR + 2 * rollR * Math.min(1, t / orbNom.T);
    else if (ref) { const q = ref(t); p = q.p + (1 + C.k) * (xi - q.xi); }
    else { const sN = t - tauL, pr = P.pa + (P.pb - P.pa) * Math.min(1, sN / P.Ts); p = pr + (1 + C.k) * (xi - P.at(Math.min(sN, P.Ts + 0.2))); }
    p = Math.max(lo, Math.min(hi, p)); if (geo) c += dt * w * (xi - c); xi += dt * (wE * (xi - p) + C.dE); t += dt; out.push([t, xi]); }
  return (T) => { if (T <= out[0][0]) return out[0][1]; for (let i = 1; i < out.length; i++) if (out[i][0] >= T - 1e-9) { const a = out[i - 1], b = out[i], f = (T - a[0]) / Math.max(1e-9, b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } return out[out.length - 1][1]; }; };
// the reachable forward range [lo, hi] (sole centre ahead of the stance centre) for touchdown T, from the actual state; the toolbox's leg
// geometry check (swing leg reach + hip range from the predicted pelvis, stance toe down, footprint / path clear of the stance foot) and the
// swing foot's acceleration capacity from its actual position and velocity
export function reachRange(U, q) { const C = U.C, lo0 = C.dfMin, hi0 = C.dfMax;
  const ok = (df) => q.geomOK(df) && q.accOK(df);
  if (!ok(clamp(q.dfRef, lo0, hi0))) { let best = null; for (let df = lo0; df <= hi0 + 1e-9; df += 0.02) if (ok(df) && (best == null || Math.abs(df - q.dfRef) < Math.abs(best - q.dfRef))) best = df; if (best == null) return { lo: null, hi: null, none: true }; q.dfRef = best; }
  const bis = (a, b) => { for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; };
  const r0 = clamp(q.dfRef, lo0, hi0), hi = ok(hi0) ? hi0 : bis(r0, hi0), lo = ok(lo0) ? lo0 : bis(r0, lo0); return { lo, hi };
}
// the sideways width from Controller A's map at instant τ with the forward foothold and timing fixed (one Newton step on the width; the map is
// linear in it at fixed T)
// (ytFix: the step's sideways target, fixed at its start from the step-start state as Controller A does — the in-swing offset is not a step-start state)
export function latWidth(U, Cc, x, tau, df, T, dl0, b, ytFix) { const M = modelAt(Cc, tau), L = U.C.lat, xs = L.xStar, yt = ytFix != null ? ytFix : xs + L.rho * (x[1] - xs);
  const f = (dl) => predictA(M, x, [df, dl, T])[1] + (b ? b[1] : 0), y0 = f(dl0), g = (f(dl0 + 0.01) - y0) / 0.01; if (Math.abs(g) < 1e-6) return { dl: dl0, yt, pred: y0 };
  const dl = dl0 + (yt - y0) / g; return { dl, yt, pred: y0, f, g }; }
// the REGULARISED placement solve: u = argmin Σ ((x'(u) − yt)/q)² + Σ ((u − uRef)/r)², u within [lo, hi] — the next state's target traded
// against the input's deviation from its reference (a large error is corrected partly by this step and partly by the next, instead of a bound-
// to-bound decision); the map is linear in u at fixed T, so the solve is Gauss–Newton with the bounds handled by fixing the worst violator
export function solveReg(M, x, yt, uRef, q, r, lo, hi, fixT, b) { const P = (uu) => { const y = predictA(M, x, uu); return b ? [y[0] + b[0], y[1] + b[1]] : y; };
  let u = uRef.slice(); const free = [true, true, !fixT]; if (fixT) u[2] = uRef[2]; const info = { clamped: [] };
  for (let pass = 0; pass < 4; pass++) {
    for (let it = 0; it < 3; it++) { const y = P(u), h = [0.005, 0.005, 0.003], G = [[0, 0, 0], [0, 0, 0]]; for (let j = 0; j < 3; j++) { const up = u.slice(); up[j] += h[j]; const yp = P(up); G[0][j] = (yp[0] - y[0]) / h[j]; G[1][j] = (yp[1] - y[1]) / h[j]; }
      const idx = [0, 1, 2].filter(j => free[j]); if (!idx.length) break; const n = idx.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), g = new Array(n).fill(0);
      for (let a = 0; a < n; a++) { const ja = idx[a]; for (let c = 0; c < n; c++) { const jc = idx[c]; let s = 0; for (let k = 0; k < 2; k++) s += G[k][ja] * G[k][jc] / (q[k] * q[k]); A[a][c] = s + (a === c ? 1 / (r[ja] * r[ja]) : 0); }
        let s = 0; for (let k = 0; k < 2; k++) s += G[k][ja] * (yt[k] - y[k]) / (q[k] * q[k]); g[a] = s - (u[ja] - uRef[ja]) / (r[ja] * r[ja]); }
      // solve A d = g (n ≤ 3, Gaussian elimination)
      const Mx = A.map((row, i) => [...row, g[i]]); for (let i = 0; i < n; i++) { let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(Mx[k][i]) > Math.abs(Mx[p][i])) p = k; [Mx[i], Mx[p]] = [Mx[p], Mx[i]]; if (Math.abs(Mx[i][i]) < 1e-12) continue; for (let k = 0; k < n; k++) if (k !== i) { const f = Mx[k][i] / Mx[i][i]; for (let c = i; c <= n; c++) Mx[k][c] -= f * Mx[i][c]; } }
      idx.forEach((j, a) => { u[j] += Math.abs(Mx[a][a]) > 1e-12 ? Mx[a][n] / Mx[a][a] : 0; }); }
    let worst = -1, wv = 0; for (let j = 0; j < 3; j++) { if (!free[j]) continue; const v = u[j] < lo[j] ? lo[j] - u[j] : u[j] > hi[j] ? u[j] - hi[j] : 0; if (v / r[j] > wv) { wv = v / r[j]; worst = j; } }
    if (worst < 0) break; u[worst] = Math.max(lo[worst], Math.min(hi[worst], u[worst])); free[worst] = false; info.clamped.push(["df", "dl", "T"][worst]); }
  u = u.map((v, j) => Math.max(lo[j], Math.min(hi[j], v))); info.pred = P(u); return { u, info }; }
