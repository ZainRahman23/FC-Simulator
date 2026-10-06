// ═══ physchar2/ctrl/v2_dcm.js — E2 minimal DCM REFERENCE LAYER (e2/E2_DESIGN_v2.md §3; used only by the default-off E2 option `e2`) ═══════════════════
// PyPnC DCMPlanner STRUCTURE (equations only, no code imported): the DCM reference ξ_ref(t), ξ̇_ref(t) handed to the EXISTING finite-torque balance law
// p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω (ctrl/v2_stand.js) — no second balance controller. Three quantities kept apart:
//   • the feasible CoP region: the controller's own s-weighted support (realisable(): stance region ∪ the share-limited combinations with the landed region,
//     which grows from its centroid with s — exactly the allocation's constraints: landed share ≤ min(s, 1 − stance floor));
//   • the DCM reference: cubic-Hermite transitions (PyPnC double support) and the exponential DCM law ξ̇ = ω(ξ − r) for a VRP r (single support);
//   • the COM reference ẋ_ref = −ω(x_ref − ξ_ref) (logged by the step sequencer; never tracked).
// PyPnC rule: a plan's FIRST segment starts at the MEASURED DCM and its rate. The rate used is the LIPM one, ω(ξ − p) with p the CoP the controller commanded
// on the previous tick, so at a (re)initialisation the commanded CoP p* = ξ − ξ̇_ref/ω equals that CoP: the plan starts without a CoP step.
// Plans (plain data; dcmTick advances them once per tick):
//   "cmd" (commanded step, d = 0 quasi-static stop-step): Hermite from the measured (ξ0, ξ̇0) to (r_s, 0) at the planned touchdown (r_s = the stance VRP), then r_s;
//   "ds"  (re-initialised at measured contact): Hermite from the measured (ξ, ξ̇) to (r_mid, 0) over T_ds, then r_mid (r_mid: the new double-support midpoint);
//   "rec" (recovery step): R1/R2 — the exponential law with the VRP at the margin-shrunk ACHIEVABLE LIMIT along the controller's lateral axis u toward the landed foot,
//         on ξ_ref's line (the stance limit until the landed foot supports, then the growing combined limit — the validated capture model's p_lim, research/
//         E2_REACH_AND_SNAPSHOTS.md §2 "DCM-plan tracking"; nearest region point only if the line misses the region), integrated forward from the measured ξ (explicit
//         Euler at the physics tick: the planner's prediction and the execution use the identical integrator); R3 — once the landed foot supports and ξ_ref is inside
//         the realisable region by the margin, a Hermite to (r_mid, 0) over T_ds.
// Pure arithmetic (no transcendental functions): deterministic, browser = Node.
import { clampPoly, polyDist } from "./v2_stand.js";

const sm = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
// cubic Hermite per component between (x0, v0) at 0 and (x1, v1) at T, evaluated at t (clamped) → { x, v }
export function hermite(x0, v0, x1, v1, T, t) { const u = Math.min(1, Math.max(0, t / T)), u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const d00 = (6 * u2 - 6 * u) / T, d10 = 3 * u2 - 4 * u + 1, d01 = (-6 * u2 + 6 * u) / T, d11 = 3 * u2 - 2 * u, inside = t > 0 && t < T;
  return { x: x0.map((a, i) => h00 * a + h10 * T * v0[i] + h01 * x1[i] + h11 * T * v1[i]), v: x0.map((a, i) => (inside || t <= 0 ? d00 * a + d10 * v0[i] + d01 * x1[i] + d11 * v1[i] : v1[i])) }; }
export function centroid2(P) { let A = 0, x = 0, z = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; A += c; x += (p[0] + q[0]) * c; z += (p[1] + q[1]) * c; } return Math.abs(A) < 1e-14 ? P[0].slice() : [x / (3 * A), z / (3 * A)]; }
const area2 = (P) => { let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } return A; };
export const ccw = (P) => (area2(P) < 0 ? P.slice().reverse() : P);
// convex hull (monotone chain) of 2-D points, CCW
export function hull(pts) { const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
// inward offset of a convex polygon by m (half-plane clipping of the polygon by each edge moved inward; exact for convex input); collapses to the centroid
export function inset(P0, m) { if (!(m > 0)) return P0; const P = ccw(P0); let Q = P.slice();
  for (let i = 0; i < P.length && Q.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.sqrt(ex * ex + ez * ez); if (L < 1e-12) continue;
    const nx = -ez / L, nz = ex / L, f = (q) => (q[0] - a[0]) * nx + (q[1] - a[1]) * nz - m, R = [];   // CCW: the left normal points inward
    for (let j = 0; j < Q.length; j++) { const p = Q[j], q = Q[(j + 1) % Q.length], fp = f(p), fq = f(q); if (fp >= 0) R.push(p); if ((fp >= 0) !== (fq >= 0)) { const s = fp / (fp - fq); R.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1])]); } }
    Q = R; }
  return Q.length >= 3 ? Q : [centroid2(P)]; }
export const scaleAbout = (P, f, c) => P.map(([x, z]) => [c[0] + (x - c[0]) * f, c[1] + (z - c[1]) * f]);
// Minkowski sum of two convex CCW polygons (edge merge)
function minkowski(A, B) { const lowest = (P) => { let k = 0; for (let i = 1; i < P.length; i++) if (P[i][1] < P[k][1] || (P[i][1] === P[k][1] && P[i][0] < P[k][0])) k = i; return k; };
  const n = A.length, m = B.length, ia = lowest(A), ib = lowest(B), out = []; let i = 0, j = 0;
  while (i < n || j < m) { const a = A[(ia + i) % n], b = B[(ib + j) % m]; out.push([a[0] + b[0], a[1] + b[1]]);
    const a2 = A[(ia + i + 1) % n], b2 = B[(ib + j + 1) % m], ea = [a2[0] - a[0], a2[1] - a[1]], eb = [b2[0] - b[0], b2[1] - b[1]], c = ea[0] * eb[1] - ea[1] * eb[0];
    if (j >= m || (i < n && c > 0)) i++; else if (i >= n || c < 0) j++; else { i++; j++; } }
  return out; }
// the CoP region the controller can realise: stance region S (all of it), plus every share-weighted combination (1 − t)·a + t·b, a ∈ S, b ∈ the landed region L
// grown from its centroid by s, t ≤ tmax = min(s, 1 − stance floor) — the allocation's constraints (lever rule, per-foot clamp, landed share ≤ s, floors)
export function realisable(S0, L0, s, floor) { const S = ccw(S0), tmax = Math.min(s, 1 - floor); if (!(s > 0) || !(tmax > 0) || !L0 || L0.length < 3) return S;
  const L = ccw(L0), Ls = scaleAbout(L, s, centroid2(L)), M = minkowski(S.map(([x, z]) => [(1 - tmax) * x, (1 - tmax) * z]), Ls.map(([x, z]) => [tmax * x, tmax * z]));
  return hull(S.concat(M)); }
// ── plans ──
export const cmdPlan = ({ t0, xi0, xid0, rs, tTD }) => ({ kind: "cmd", t0, xi0: xi0.slice(), xid0: xid0.slice(), rs: rs.slice(), tTD });
export const dsPlan = ({ t0, xi0, xid0, Tds }) => ({ kind: "ds", t0, xi0: xi0.slice(), xid0: xid0.slice(), Tds });
export const recPlan = ({ t0, xi0, Tds, u }) => ({ kind: "rec", t0, xr: xi0.slice(), u: u.slice(), phase: "R1", Tds, h: null });
// the achievable limit along u on the line through q: the largest λ with q + λu in the convex polygon R (null if the line misses R)
export function limitAlong(R, q, u) { const vx = -u[1], vz = u[0]; let hi = -Infinity;
  for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length], da = (a[0] - q[0]) * vx + (a[1] - q[1]) * vz, db = (b[0] - q[0]) * vx + (b[1] - q[1]) * vz;
    if ((da <= 0 && db >= 0) || (da >= 0 && db <= 0)) { if (da === db) { for (const p of [a, b]) hi = Math.max(hi, (p[0] - q[0]) * u[0] + (p[1] - q[1]) * u[1]); continue; }
      const f = da / (da - db), x = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]; hi = Math.max(hi, (x[0] - q[0]) * u[0] + (x[1] - q[1]) * u[1]); } }
  return hi > -Infinity ? [q[0] + hi * u[0], q[1] + hi * u[1]] : null; }
export const clonePlan = (P) => JSON.parse(JSON.stringify(P));
// one tick of a plan at time t → { xi, xid, vrp, phase }. env: { w, dt, rMid (the new double-support midpoint; "ds" / "rec" R3), R (the margin-shrunk realisable
// region now; "rec"), Rm (the inside margin that starts R3), s (the landed foot's support weight now; "rec": R3 starts only once it is supporting) }.
// "rec" is stateful: call exactly once per tick.
export function dcmTick(P, t, env) { const w = env.w; let xi, xid, phase = P.kind;
  if (P.kind === "cmd") { if (t < P.tTD) { const H = hermite(P.xi0, P.xid0, P.rs, [0, 0], P.tTD - P.t0, t - P.t0); xi = H.x; xid = H.v; phase = "SS"; } else { xi = P.rs.slice(); xid = [0, 0]; phase = "SS-hold"; } }
  else if (P.kind === "ds") { const H = hermite(P.xi0, P.xid0, env.rMid, [0, 0], P.Tds, t - P.t0); xi = H.x; xid = H.v; phase = t - P.t0 < P.Tds ? "DS" : "end"; }
  else { if (P.phase !== "R3" && (env.s ?? 0) > 0 && polyDist(env.R, P.xr) >= env.Rm) { P.phase = "R3"; const r = limitAlong(env.R, P.xr, P.u) || clampPoly(env.R, P.xr); P.h = { t0: t, x0: P.xr.slice(), v0: [w * (P.xr[0] - r[0]), w * (P.xr[1] - r[1])] }; }
    if (P.phase === "R3") { const H = hermite(P.h.x0, P.h.v0, env.rMid, [0, 0], P.Tds, t - P.h.t0); xi = H.x; xid = H.v; phase = t - P.h.t0 < P.Tds ? "R3" : "end"; }
    else { const r = limitAlong(env.R, P.xr, P.u) || clampPoly(env.R, P.xr); xi = P.xr.slice(); xid = [w * (P.xr[0] - r[0]), w * (P.xr[1] - r[1])]; P.phase = (env.s ?? 0) > 0 ? "R2" : "R1"; phase = P.phase;
      P.xr = [P.xr[0] + env.dt * xid[0], P.xr[1] + env.dt * xid[1]]; } }
  return { xi, xid, vrp: [xi[0] - xid[0] / w, xi[1] - xid[1] / w], phase }; }
// the λ request from the plan's VRP: its fraction along the line between the feet's region centroids (stance → landed), ≤ 1 − the stance floor
export function lamFromVrp(polys, n, vrp, floorStance) { const cS = centroid2(polys[1 - n]), cL = centroid2(polys[n]), d = [cL[0] - cS[0], cL[1] - cS[1]], L2 = d[0] * d[0] + d[1] * d[1];
  const f = L2 > 1e-12 ? ((vrp[0] - cS[0]) * d[0] + (vrp[1] - cS[1]) * d[1]) / L2 : 0; return Math.min(1 - floorStance, Math.max(0, f)); }
export { sm as smooth01 };
