// ═══ physchar2/tools/e2_plan_lib.mjs — E2 PLANNING-ONLY prerequisites (e2/E2_DESIGN_v2.md; research tooling, no controller code depends on it)
// (1) body-specific KINEMATIC reach certification of foothold candidates with Touchline's own IK and certifier (analytic rejection → bounded-IK
//     solve in the soft-limit box → branch-and-bound certificate when the solve fails); landing-geometry validity; swing-PATH certification.
// (2) snapshot feasibility audit: timed capture of a recorded state with the validated online capture model (ctrl/v2_capture.js), landing region
//     translated to each candidate, measured margins, explicit partial loading (support grows with s) → CERTIFIED_ONE_STEP | NO_CERTIFIED_ONE_STEP.
import { V, Q, dnorm, dsin, dcos } from "../core/v2_math.js";
import { certLevers, branchAndBound } from "./ik_cert_core.mjs";
import { captureContext, simulate, TA } from "../ctrl/v2_capture.js";
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
// heading-aligned frame of the stance foot: forward f, lateral-outward (toward the swing side) o, both horizontal unit vectors
export function stepFrame(ctrl, st, n) { const m = 1 - n, fw = Q.rot(st[ctrl.feet[m]].rot, [0, 0, 1]), f = V.norm([fw[0], 0, fw[2]]), right = [f[2], 0, -f[0]], o = n === 0 ? V.sc(right, -1) : right; return { f, o }; }
// candidate foot pose: anchor + dx·f + dy·o (flat, anchor height and yaw)
export const candPose = (A, fr, dx, dy) => ({ pos: V.add(V.add(A.pos, V.sc(fr.f, dx)), V.sc(fr.o, dy)), rot: A.rot.slice() });
// footprint (usable sole region) of foot n at an arbitrary pose, in the turf plane
export function footprintAt(ctrl, n, pose) { const s = ctrl.sole[n]; return s.poly.map(([x, z]) => { const p = V.add(pose.pos, Q.rot(pose.rot, [x, s.y0, z])); return [p[0], p[2]]; }); }
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function polysIntersect(A, B) { const axes = []; for (const P of [A, B]) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; axes.push([-(b[1] - a[1]), b[0] - a[0]]); }
  for (const ax of axes) { const pa = A.map(p => p[0] * ax[0] + p[1] * ax[1]), pb = B.map(p => p[0] * ax[0] + p[1] * ax[1]); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false; } return true; }
function polyGap(A, B) { let g = Infinity; for (const P of [[A, B], [B, A]]) for (const p of P[0]) for (let i = 0; i < P[1].length; i++) { const a = P[1][i], b = P[1][(i + 1) % P[1].length], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez))); g = Math.min(g, Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ez)); } return g; }
// landing-geometry validity: no overlap with the stance foot, a minimum gap, and no crossover (the landing foot's centroid stays on its own side of the
// stance foot's centre line by at least half a foot width — IHMC's default: crossover disabled)
export function landingValid(ctrl, st, n, pose, fr, gapMin) { const m = 1 - n, S = ctrl.footPoly(st, m), Lp = footprintAt(ctrl, n, pose), cS = st[ctrl.feet[m]].pos, cL = pose.pos;
  const side = (cL[0] - cS[0]) * fr.o[0] + (cL[2] - cS[2]) * fr.o[2], halfW = (() => { const xs = ctrl.sole[n].poly.map(p => p[0]); return (Math.max(...xs) - Math.min(...xs)) / 2; })();
  if (polysIntersect(S, Lp)) return { ok: false, why: "overlaps the stance foot" }; const gap = polyGap(S, Lp); if (gap < gapMin) return { ok: false, why: `gap ${(gap * 1000).toFixed(1)} mm < ${gapMin * 1000} mm`, gap };
  if (side < halfW) return { ok: false, why: "crossover", side }; return { ok: true, gap, side }; }
// kinematic certification of one foot pose for leg n with pelvis frame (pP, qP): analytic rejection, bounded solve (soft box), certificate on failure
export function certifyPose(ctrl, st, ev, n, pP, qP, pose, cap = 200000) { const ks = ctrl.legK[n], hip = V.add(pP, Q.rot(qP, ctrl.anchor[ks[0]])), { L1, L2, LIP } = certLevers(ctrl, n, 6, false);
  const ankle = V.add(pose.pos, Q.rot(pose.rot, V.sc(ctrl.anchor[ks[2]], 0))), d = V.dist(hip, pose.pos);
  if (d > L1 + L2 + 0.12) return { verdict: "REJECTED (analytic: beyond leg length + foot)", d };
  const B = ctrl.legIKBounded(st, ev, n, pP, qP, pose, { limits: "soft", fallback: "none" }); if (B.err <= 1e-6) return { verdict: "FEASIBLE", err: B.err, x: B.x };
  const lim = ks.map(k => ctrl.spec.joints[k].limits.soft), lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
  const C = ctrl.legChain(st, ev, n, pP, qP, pose), R = branchAndBound(C.fk, lo, hi, LIP, cap, 1e-6); return { verdict: R.verdict, err: B.err, evals: R.evals }; }
// swing path (BLF-style explicit quintic in the horizontal plane, min-jerk up / down to the apex at α of the swing) sampled at N points
export function swingPath(start, goal, apex, alpha = 0.5, N = 11) { const out = []; for (let i = 0; i <= N - 1; i++) { const u = i / (N - 1), w = mj(u), z = u <= alpha ? apex * mj(u / alpha) : apex * (1 - mj((u - alpha) / (1 - alpha)));
  const pos = V.add(V.lerp(start.pos, goal.pos, w), [0, z + (1 - w) * (start.pos[1] - goal.pos[1]) * 0, 0]); pos[1] = start.pos[1] + (goal.pos[1] - start.pos[1]) * w + z; out.push({ pos, rot: goal.rot.slice(), u }); } return out; }
export function certifyPath(ctrl, st, ev, n, pP, qP, path) { const res = path.map(p => certifyPose(ctrl, st, ev, n, pP, qP, p, 50000)); return { ok: res.every(r => r.verdict === "FEASIBLE"), verdicts: res.map(r => r.verdict) }; }
// whole-body state from all segments (mass-weighted COM / velocity, centroidal angular momentum)
export function bodyState(spec, st) { let M = 0, c = [0, 0, 0], v = [0, 0, 0]; spec.bodies.forEach((b, i) => { M += b.mass; c = V.add(c, V.sc(st[i].com, b.mass)); v = V.add(v, V.sc(st[i].v, b.mass)); }); c = V.sc(c, 1 / M); v = V.sc(v, 1 / M);
  let L = [0, 0, 0]; spec.bodies.forEach((b, i) => { const r = V.sub(st[i].com, c), dv = V.sub(st[i].v, v); L = V.add(L, V.sc(V.cross(r, dv), b.mass)); const R = st[i].rot, I = b.inertia, wl = Q.rot(Q.conj(R), st[i].w), Iw = [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2]); L = V.add(L, Q.rot(R, Iw)); });
  return { M, c, v, L }; }
// timed one-step capture check of a candidate with the validated online model: landing region translated by the candidate offset along the model axis,
// worst case under the measured landing uncertainty (inward by eLand) and CoP-realisation margin (mCop on both CoP limits), touchdown delayed by the timing margin
// MEASURED planning margins (e2/research/E2_TIMING_LOAD_ASSUMPTIONS.md): adverse CoP-realisation shortfall per phase (stance limit in single support; the
// landed foot's outer limit during the acceptance ramp and after full support), realised-load lag behind the request, landing-position uncertainty
export const PLAN_MARGINS = { copSS: 0.0023, copRamp: 0.0152, copFull: 0.0040, shareLag: 0.008, landBase: 0.00164 };
// the validated capture model (ctrl/v2_capture.js simulate, identical equations) with the measured margins applied by phase — explicit partial loading
export function planSimulate(cx, o, M = PLAN_MARGINS) { if (cx.miss) return { recovers: false, miss: true };
  const mj2 = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }, mjd = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u)), sm = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
  // o.law "dcmPlan" (e2/E2_DESIGN_v2.md §3, recovery plan): a DCM reference integrated FORWARD from the measured ξ (PyPnC rule: the first segment starts at the
  // measured DCM) with the planned CoP / VRP r(t) at the margin-shrunk achievable limit (stance limit before support; growing landed-foot limit with s), tracked
  // by the existing law p = r + (1 + kξ)(ξ − ξ_ref), clamped to the realisable limit. Default (no law): the current λ-return reference (validated model).
  const dt = cx.dt, w = cx.w, lamFrom = o.lamFrom ?? 1, lam0 = o.lam0 ?? o.tc, dv = 0.5 - lamFrom, tAcc = o.tAcc + M.shareLag; let x = 0, xr = 0;
  for (let t = 0; t < cx.horizon; t += dt) { const ur = (t - lam0) / cx.abortDur, lS = t < lam0 ? lamFrom : lamFrom + dv * mj2(ur), dl = t < lam0 ? 0 : dv * mjd(ur) / cx.abortDur;
    const s = t < tAcc ? 0 : sm((t - tAcc) / o.Tr), floor = t < lam0 ? 0 : cx.minShare * mj2(ur), tmax = Math.min(s, 1 - floor), mA = s <= 0 ? 0 : s < 1 ? M.copRamp : M.copFull;
    const Aout = cx.Aout - o.eLand - mA, cA = cx.cA - o.eLand, Sin = cx.Sin - M.copSS, AoutS = cA + s * (Aout - cA), pLim = tmax * AoutS + (1 - tmax) * Sin;
    let p; if (o.law === "dcmPlan") { p = Math.min(pLim + (1 + cx.kXi) * (x - xr), pLim); xr += dt * w * (xr - pLim); }
    else { const xrL = cx.cA + (cx.cS - cx.cA) * lS, xrd = (cx.cS - cx.cA) * dl, xrE = xrL + xrd / w; p = o.best ? pLim : Math.min(x + cx.kXi * (x - xrE) - xrd / w, pLim); }   // o.best: CoP held at the achievable limit (physical best case)
    x += dt * w * (x - p); if (x - cx.Aout > cx.fellBeyond) return { recovers: false, t }; }
  return { recovers: true }; }
export function capturesWith(cx, shiftU, o) { const tc = o.T + TA.margin; return planSimulate({ ...cx, Aout: cx.Aout + shiftU, cA: cx.cA + shiftU }, { tc, tAcc: tc + cx.acceptDebounce, Tr: o.Tr, lamFrom: o.lamFrom, eLand: o.eLand, law: o.law }); }
export { captureContext, TA };
