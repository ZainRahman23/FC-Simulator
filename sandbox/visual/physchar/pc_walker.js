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
// (bias b: the ONLINE, bounded correction of the map's constant term — see decideA)
// (auth = [βf, βl]: the CLOSED-LOOP-measured authority of the inputs relative to the maps — the step-to-step map of the walking itself showed
//  a forward eigenvalue far above the design value; the requested change of the prediction is divided by β: yt' = f0 + (yt − f0)/β)
export function solveStep(M, x, yt, uRef, sg, lo, hi, fixT, b, auth) { const Wi = sg.map(s => s * s); let u = uRef.slice(), free = [true, true, !fixT]; const info = { it: 0, clamped: [] };
  const P = (xx, uu) => { const y = predictA(M, xx, uu); return b ? [y[0] + b[0], y[1] + b[1]] : y; };
  if (auth) { const f0 = P(x, uRef); yt = [f0[0] + (yt[0] - f0[0]) / auth[0], f0[1] + (yt[1] - f0[1]) / auth[1]]; info.ytEff = yt.slice(); }
  for (let pass = 0; pass < 3; pass++) {
    for (let it = 0; it < 4; it++) { info.it++; const y = P(x, u), r = [yt[0] - y[0], yt[1] - y[1]], h = [0.005, 0.005, 0.003], G = [[0, 0, 0], [0, 0, 0]];
      for (let j = 0; j < 3; j++) { const up = u.slice(); up[j] += h[j]; const yp = P(x, up); G[0][j] = (yp[0] - y[0]) / h[j]; G[1][j] = (yp[1] - y[1]) / h[j]; }
      // minimum-norm update in the free inputs, pulled toward uRef: u_free = uRef + W Gᵀ λ with G (u_new − u) = r
      const d = u.map((v, j) => free[j] ? v - uRef[j] : 0), rr = [r[0] + G[0][0] * d[0] + G[0][1] * d[1] + G[0][2] * d[2], r[1] + G[1][0] * d[0] + G[1][1] * d[1] + G[1][2] * d[2]];
      const nFree = free.filter(Boolean).length; if (!nFree) break;
      if (nFree >= 2) { const S = [[0, 0], [0, 0]]; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let j = 0; j < 3; j++) if (free[j]) S[a][b] += G[a][j] * Wi[j] * G[b][j];
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0]; if (Math.abs(det) < 1e-12) break; const lam = [(S[1][1] * rr[0] - S[0][1] * rr[1]) / det, (-S[1][0] * rr[0] + S[0][0] * rr[1]) / det];
        for (let j = 0; j < 3; j++) if (free[j]) u[j] = uRef[j] + Wi[j] * (G[0][j] * lam[0] + G[1][j] * lam[1]); }
      else { const j = free.indexOf(true), g = [G[0][j], G[1][j]], gg = g[0] * g[0] + g[1] * g[1]; if (gg < 1e-12) break; u[j] = uRef[j] + (g[0] * rr[0] + g[1] * rr[1]) / gg; } }
    let worst = -1, wv = 0; for (let j = 0; j < 3; j++) { if (!free[j]) continue; const v = u[j] < lo[j] ? (lo[j] - u[j]) / sg[j] : u[j] > hi[j] ? (u[j] - hi[j]) / sg[j] : 0; if (v > wv) { wv = v; worst = j; } }
    if (worst < 0) break; u[worst] = clamp(u[worst], lo[worst], hi[worst]); free[worst] = false; info.clamped.push(["df", "dl", "T"][worst]); }
  u = u.map((v, j) => clamp(v, lo[j], hi[j])); info.pred = P(x, u); return { u, info }; }
// ((G2b overnight, opt-in) TWO-STEP PREVIEW on the measured maps: this step's input u0 (at the decision instant's map M) and the NEXT step's u1
// (at the step-start map M1) chosen together, so that this step leaves a state from which the next step — within ITS bounds — can return to the
// orbit. The single-step solve is greedy: it reached its target with extreme inputs (timing at a bound, a 0.17 m step) that left a state the
// next step could not recover (the stall → runaway pattern measured in the walks). Cost (weighted least squares, boxes by projection):
//   Σ ((x1 − y1)/q1)² + Σ ((x2 − y2)/q2)² + Σ ((u0 − uRef)/r)² + Σ ((u1 − uRef1)/r)²;  x1 = f(M, x, u0), x2 = f(M1, x1, u1)
// u0's timing may be fixed (in the swing); returns u0 (u1 is only the plan's assumption — the next step decides for itself).
export function solvePreview(M, M1, x, y1, y2, uRef, uRef1, r, q1, q2, lo, hi, fixT, b, lo1, hi1) {
  const P = (MM, xx, uu) => { const y = predictA(MM, xx, uu); return b ? [y[0] + b[0], y[1] + b[1]] : y; };
  const res = (z) => { const u0 = z.slice(0, 3), u1 = z.slice(3, 6), x1 = P(M, x, u0), x2 = P(M1, x1, u1);
    return [(x1[0] - y1[0]) / q1[0], (x1[1] - y1[1]) / q1[1], (x2[0] - y2[0]) / q2[0], (x2[1] - y2[1]) / q2[1], ...u0.map((v, j) => (v - uRef[j]) / r[j]), ...u1.map((v, j) => (v - uRef1[j]) / r[j])]; };
  const L = [...lo, ...(lo1 || lo)], H = [...hi, ...(hi1 || hi)], free = [true, true, !fixT, true, true, true]; let z = [...uRef, ...uRef1].map((v, i) => clamp(v, L[i], H[i])); const n = 6, h = 1e-4;
  for (let it = 0; it < 12; it++) { const r0 = res(z), m = r0.length, Jm = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let j = 0; j < n; j++) { if (!free[j]) continue; const zp = z.slice(); zp[j] += h; const rp = res(zp); for (let i = 0; i < m; i++) Jm[i][j] = (rp[i] - r0[i]) / h; }
    // normal equations on the free, unclamped-or-moving-inward variables (projected Gauss–Newton, tiny damping)
    const act = z.map((v, j) => free[j]); const A = Array.from({ length: n }, () => new Array(n).fill(0)), g = new Array(n).fill(0);
    for (let a = 0; a < n; a++) { if (!act[a]) continue; for (let i = 0; i < m; i++) g[a] += Jm[i][a] * r0[i]; for (let c = 0; c < n; c++) { if (!act[c]) continue; for (let i = 0; i < m; i++) A[a][c] += Jm[i][a] * Jm[i][c]; } A[a][a] += 1e-6; }
    const idx = [...Array(n).keys()].filter(j => act[j]), k = idx.length, Mx = idx.map(a => idx.map(c => A[a][c])), rhs = idx.map(a => -g[a]);
    for (let c = 0; c < k; c++) { let pv = c; for (let rr = c + 1; rr < k; rr++) if (Math.abs(Mx[rr][c]) > Math.abs(Mx[pv][c])) pv = rr; [Mx[c], Mx[pv]] = [Mx[pv], Mx[c]]; [rhs[c], rhs[pv]] = [rhs[pv], rhs[c]];
      for (let rr = c + 1; rr < k; rr++) { const f = Mx[rr][c] / Mx[c][c]; for (let cc = c; cc < k; cc++) Mx[rr][cc] -= f * Mx[c][cc]; rhs[rr] -= f * rhs[c]; } }
    const dz = new Array(k).fill(0); for (let c = k - 1; c >= 0; c--) { let sacc = rhs[c]; for (let cc = c + 1; cc < k; cc++) sacc -= Mx[c][cc] * dz[cc]; dz[c] = sacc / Mx[c][c]; }
    let step = 0; idx.forEach((j, q) => { const nv = clamp(z[j] + dz[q], L[j], H[j]); step = Math.max(step, Math.abs(nv - z[j])); z[j] = nv; }); if (step < 1e-5) break; }
  const u0 = z.slice(0, 3), u1 = z.slice(3, 6), x1 = P(M, x, u0); return { u: u0, info: { pred: x1, u1, pred2: P(M1, x1, u1), clamped: u0.map((v, j) => Math.abs(v - lo[j]) < 1e-6 || Math.abs(v - hi[j]) < 1e-6 ? ["df", "dl", "T"][j] : null).filter(Boolean) } }; }
// the model for a decision instant τ (s into the step, view time): the measured map of the latest instant ≤ τ
export const modelAt = (C, tau) => { if (!C.models) return C.model; let best = null; for (const k of Object.keys(C.models).map(Number).sort((a, b) => a - b)) if (k <= tau + 1e-9) best = k; return C.models[best ?? 0]; };
// ((G2b unified, opt-in C.mapBlend) the maps of the two bracketing instants blended LINEARLY in τ — the decision is continuous in time instead of
//  jumping when the active map switches (measured: the in-swing target jumped ±5–9 cm at the switches and the swing could not follow)
export const modelAtBlend = (C, tau) => { if (!C.models || !C.mapBlend) return modelAt(C, tau); const ks = Object.keys(C.models).map(Number).sort((a, b) => a - b); let lo = ks[0], hi = ks[ks.length - 1];
  for (const k of ks) { if (k <= tau + 1e-9) lo = k; } for (const k of ks.slice().reverse()) { if (k >= tau - 1e-9) hi = k; } if (hi <= lo + 1e-9) return C.models[lo];
  const f = (tau - lo) / (hi - lo), A = C.models[lo], B = C.models[hi]; return { T0: A.T0, W: A.W.map((row, i) => row.map((v, j) => v + (B.W[i][j] - v) * f)) }; };
// Controller A's step decision. C = { model | models: {τ: model}, nom: [df, dl, T], rho, sig, lo, hi, xStar? }
// ONLINE REFINEMENT (opt-in, C.adapt = { gain γ, max }): the measured maps' constant term is corrected by b, the exponentially averaged
// prediction error of the previous steps (b ← b + γ (e − b), |b| ≤ max per axis) — integral action on a persistent model bias (an
// execution overshoot, a regime with little identification data). Deterministic, bounded, logged; the maps' gains are never re-fitted online.
// The periodic state x* keeps its identified value (the target does not drift with b).
export function decideA(C, x, b) { const M = modelAt(C, 0), un = C.nom, rho = C.rho ?? 0.4, sg = C.sig || [0.05, 0.05, 0.03], lo = C.lo || [0.10, 0.17, 0.34], hi = C.hi || [0.50, 0.34, 0.50];
  const xs = C.xStar || fixedPointA(M, un).x, yt = [xs[0] + rho * (x[0] - xs[0]), xs[1] + rho * (x[1] - xs[1])];
  // (C.startNominal: the step starts on the NOMINAL step and timing — the step-start map (the noisiest: the whole step ahead of it) does not
  //  decide; the foothold is decided in the swing by the maps of the later instants, toward the same target)
  if (C.startNominal) return { df: un[0], dl: un[1], T: un[2], yt, info: { xs, yt, x: x.slice(), b: b ? b.slice() : null, pred: predictA(M, x, un).map((v, i) => v + (b ? b[i] : 0)), clamped: [], startNominal: true } };
  const s = solveStep(M, x, yt, un, sg, lo, hi, false, b, C.auth); return { df: s.u[0], dl: s.u[1], T: s.u[2], yt, info: { ...s.info, xs, yt, x: x.slice(), b: b ? b.slice() : null } }; }
export const adaptBias = (C, b, e) => { const g = C.adapt.gain ?? 0.3, m = C.adapt.max ?? 0.06; return b.map((v, i) => Math.max(-m, Math.min(m, v + g * (e[i] - v)))); };
// Controller A's IN-SWING re-decision at τ: the same target yt, the step's timing fixed, the measured map of instant τ, the foothold pulled
// toward the step-start decision (a smooth correction, not a new step)
// (G2b speed work, opt-in: C.inSwingT — the in-swing re-decision may also move the TIMING (T, the single support from the step's start),
//  never to less than lim.tMin (s, set by the executor: the time now + a minimum swing remainder); lim.dfHi(T) — the REACHABLE forward
//  foothold at that touchdown time (the swing hip's predicted position + the leg's reach at its height) replaces the fixed forward bound)
export function adjustA(C, x, tau, yt, uDec, b, lim) { const M = modelAt(C, tau), sg = C.sig || [0.05, 0.05, 0.03], lo = (C.lo || [0.10, 0.17, 0.34]).slice(), hi = (C.hi || [0.50, 0.34, 0.50]).slice();
  const freeT = !!C.inSwingT; if (freeT && lim && lim.tMin != null) lo[2] = Math.max(lo[2], lim.tMin); if (lo[2] > hi[2]) lo[2] = hi[2];
  let s = null, uR = uDec.slice(); if (freeT) uR[2] = Math.max(lo[2], Math.min(hi[2], uR[2]));
  for (let it = 0; it < 3; it++) { const h = hi.slice(); if (lim && lim.dfHi) h[0] = Math.max(lo[0], Math.min(hi[0], lim.dfHi(s ? s.u[2] : uR[2]))); s = solveStep(M, x, yt, uR, sg, lo, h, !freeT, b, C.auth); if (!(lim && lim.dfHi) || s.u[0] <= lim.dfHi(s.u[2]) + 1e-4) break; }
  return { df: s.u[0], dl: s.u[1], T: freeT ? s.u[2] : uDec[2], info: { ...s.info, tau, x: x.slice() } }; }

// Controller B (SIMBICON-style): foothold = COM-relative linear law per axis, fixed T. d = COM offset from the stance foot (forward, inward),
// v = COM velocity (forward, inward). The foothold relative to the COM: f = f0 + c_d·d + c_v·v per axis; returned relative to the stance foot.
export function decideB(C, s) { const g = C.gains; const relF = g.f0[0] + g.cd[0] * s.d[0] + g.cv[0] * s.v[0], relL = g.f0[1] + g.cd[1] * s.d[1] + g.cv[1] * s.v[1];
  const lo = C.lo || [0.10, 0.17], hi = C.hi || [0.50, 0.34];
  // (stance-relative: the COM is at d from the stance foot; the foothold is relF ahead of the COM and relL beyond it toward the swing side)
  return { df: clamp(s.d[0] + relF, lo[0], hi[0]), dl: clamp(s.d[1] + relL, lo[1], hi[1]), T: C.T, info: { relF, relL, d: s.d, v: s.v } }; }
