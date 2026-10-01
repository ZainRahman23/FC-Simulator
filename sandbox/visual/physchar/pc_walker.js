// ═══ physchar/pc_walker.js — G2b WALKER: the stepping controllers (opt-in, rhythm.walk.ctrl) ═══════════════════════════════════════════════
// A stepping controller only DECIDES the next step — a reachable foothold (forward df along the heading, width dl toward the swing side, both
// from the stance foot's sole centre) and the single-support duration T — from the measured state the planner's view holds at the step's
// start. It never moves the body: the executor's swing, the support layer and the one actuator arbiter realise the request, Jolt decides.
//
// CONTROLLER A — MEASURED-RESPONSE placement + timing. The state x = the capture point's offset from the stance foot (forward, inward —
// mirrored so a periodic gait maps onto itself) at the decision instant. The step map x' = f(x, u) is MEASURED on this body
// (tools/g2walk_ident.js → a fitted model whose coefficients depend on T: "linT", x' = c + A x + B u + (A_T x + B_T [df, dl])(T − T0)).
// The step solves, for u = [df, dl, T], the coupled two-axis problem
//      f(x, u) = x* + R (x − x*)      (partial convergence: R = ρ I, ρ ≈ 0.3–0.5 — never deadbeat)
// at minimum weighted deviation from the nominal step u* (a small constrained least-norm problem: 2 equations, 3 unknowns), within the
// reachable bounds (width ≥ the boots' limit, forward foothold ≤ the trailing-leg extension limit, T within the human range). x* is the
// model's own periodic state for u*. Forward and sideways are solved TOGETHER (the measured map couples them).
//
// CONTROLLER B — SIMBICON-style baseline (Yin, Loken & van de Panne 2007): the foothold relative to the COM is a fixed linear function of
// the COM's offset d and velocity v, separately per axis (θ_d = θ_d0 + c_d·d + c_v·v becomes a foothold displacement ≈ L·θ), with a fixed
// single-support duration; no model. Implemented as small as possible, in the same architecture (the same inner loop, swing and landing).

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// the model's prediction x' for state x and step u (linT feature order: 1, xf, xl, df, dl, T, xf·dT, xl·dT, df·dT, dl·dT)
export function predictA(M, x, u) { const dT = u[2] - M.T0, f = [1, x[0], x[1], u[0], u[1], u[2], x[0] * dT, x[1] * dT, u[0] * dT, u[1] * dT], W = M.W;
  let y0 = 0, y1 = 0; for (let i = 0; i < f.length; i++) { y0 += f[i] * W[i][0]; y1 += f[i] * W[i][1]; } return [y0, y1]; }
// the model's periodic state for a constant step u: x* = (I − A(T))⁻¹ (c + B(T) u) (the map is linear in x at fixed T)
export function fixedPointA(M, u) { const a = predictA(M, [0, 0], u), e0 = predictA(M, [1, 0], u), e1 = predictA(M, [0, 1], u);
  const A = [[e0[0] - a[0], e1[0] - a[0]], [e0[1] - a[1], e1[1] - a[1]]], m = [[1 - A[0][0], -A[0][1]], [-A[1][0], 1 - A[1][1]]], det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return { x: [(m[1][1] * a[0] - m[0][1] * a[1]) / det, (-m[1][0] * a[0] + m[0][0] * a[1]) / det], A }; }
// the core solve: u = [df, dl, T] with f(x, u) = yt at minimum weighted deviation from uRef, inputs bounded (clamped one at a time, the rest
// re-solved); fixT keeps T at uRef[2] (an in-swing re-decision cannot change the step's timing any more)
export function solveStep(M, x, yt, uRef, sg, lo, hi, fixT) { const Wi = sg.map(s => s * s); let u = uRef.slice(), free = [true, true, !fixT]; const info = { it: 0, clamped: [] };
  for (let pass = 0; pass < 3; pass++) {
    for (let it = 0; it < 4; it++) { info.it++; const y = predictA(M, x, u), r = [yt[0] - y[0], yt[1] - y[1]], h = [0.005, 0.005, 0.003], G = [[0, 0, 0], [0, 0, 0]];
      for (let j = 0; j < 3; j++) { const up = u.slice(); up[j] += h[j]; const yp = predictA(M, x, up); G[0][j] = (yp[0] - y[0]) / h[j]; G[1][j] = (yp[1] - y[1]) / h[j]; }
      // minimum-norm update in the free inputs, pulled toward uRef: u_free = uRef + W Gᵀ λ with G (u_new − u) = r
      const d = u.map((v, j) => free[j] ? v - uRef[j] : 0), rr = [r[0] + G[0][0] * d[0] + G[0][1] * d[1] + G[0][2] * d[2], r[1] + G[1][0] * d[0] + G[1][1] * d[1] + G[1][2] * d[2]];
      const nFree = free.filter(Boolean).length; if (!nFree) break;
      if (nFree >= 2) { const S = [[0, 0], [0, 0]]; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let j = 0; j < 3; j++) if (free[j]) S[a][b] += G[a][j] * Wi[j] * G[b][j];
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0]; if (Math.abs(det) < 1e-12) break; const lam = [(S[1][1] * rr[0] - S[0][1] * rr[1]) / det, (-S[1][0] * rr[0] + S[0][0] * rr[1]) / det];
        for (let j = 0; j < 3; j++) if (free[j]) u[j] = uRef[j] + Wi[j] * (G[0][j] * lam[0] + G[1][j] * lam[1]); }
      else { const j = free.indexOf(true), g = [G[0][j], G[1][j]], gg = g[0] * g[0] + g[1] * g[1]; if (gg < 1e-12) break; u[j] = uRef[j] + (g[0] * rr[0] + g[1] * rr[1]) / gg; } }
    let worst = -1, wv = 0; for (let j = 0; j < 3; j++) { if (!free[j]) continue; const v = u[j] < lo[j] ? (lo[j] - u[j]) / sg[j] : u[j] > hi[j] ? (u[j] - hi[j]) / sg[j] : 0; if (v > wv) { wv = v; worst = j; } }
    if (worst < 0) break; u[worst] = clamp(u[worst], lo[worst], hi[worst]); free[worst] = false; info.clamped.push(["df", "dl", "T"][worst]); }
  u = u.map((v, j) => clamp(v, lo[j], hi[j])); info.pred = predictA(M, x, u); return { u, info }; }
// the model for a decision instant τ (s into the step, view time): the measured map of the latest instant ≤ τ
export const modelAt = (C, tau) => { if (!C.models) return C.model; let best = null; for (const k of Object.keys(C.models).map(Number).sort((a, b) => a - b)) if (k <= tau + 1e-9) best = k; return C.models[best ?? 0]; };
// Controller A's step decision. C = { model | models: {τ: model}, nom: [df, dl, T], rho, sig, lo, hi, xStar? }
export function decideA(C, x) { const M = modelAt(C, 0), un = C.nom, rho = C.rho ?? 0.4, sg = C.sig || [0.05, 0.05, 0.03], lo = C.lo || [0.10, 0.17, 0.34], hi = C.hi || [0.50, 0.34, 0.50];
  const xs = C.xStar || fixedPointA(M, un).x, yt = [xs[0] + rho * (x[0] - xs[0]), xs[1] + rho * (x[1] - xs[1])];
  const s = solveStep(M, x, yt, un, sg, lo, hi, false); return { df: s.u[0], dl: s.u[1], T: s.u[2], yt, info: { ...s.info, xs, yt, x: x.slice() } }; }
// Controller A's IN-SWING re-decision at τ: the same target yt, the step's timing fixed, the measured map of instant τ, the foothold pulled
// toward the step-start decision (a smooth correction, not a new step)
export function adjustA(C, x, tau, yt, uDec) { const M = modelAt(C, tau), sg = C.sig || [0.05, 0.05, 0.03], lo = C.lo || [0.10, 0.17, 0.34], hi = C.hi || [0.50, 0.34, 0.50];
  const s = solveStep(M, x, yt, uDec, sg, lo, hi, true); return { df: s.u[0], dl: s.u[1], T: uDec[2], info: { ...s.info, tau, x: x.slice() } }; }

// Controller B (SIMBICON-style): foothold = COM-relative linear law per axis, fixed T. d = COM offset from the stance foot (forward, inward),
// v = COM velocity (forward, inward). The foothold relative to the COM: f = f0 + c_d·d + c_v·v per axis; returned relative to the stance foot.
export function decideB(C, s) { const g = C.gains; const relF = g.f0[0] + g.cd[0] * s.d[0] + g.cv[0] * s.v[0], relL = g.f0[1] + g.cd[1] * s.d[1] + g.cv[1] * s.v[1];
  const lo = C.lo || [0.10, 0.17], hi = C.hi || [0.50, 0.34];
  // (stance-relative: the COM is at d from the stance foot; the foothold is relF ahead of the COM and relL beyond it toward the swing side)
  return { df: clamp(s.d[0] + relF, lo[0], hi[0]), dl: clamp(s.d[1] + relL, lo[1], hi[1]), T: C.T, info: { relF, relL, d: s.d, v: s.v } }; }
