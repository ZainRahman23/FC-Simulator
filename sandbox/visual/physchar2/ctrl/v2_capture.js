// ═══ physchar2/ctrl/v2_capture.js — online CAPTURE-TIME model for the single-support abort (T-A; p15_capture/, e1b_ta/; option abortCapture, default off) ════
// A port of the validated offline model (review_artifacts/…/p15_capture/tools/p15_model.mjs: 32 / 32 E1b P15 outcomes predicted): the LIPM DCM along the
// controller's lateral axis u toward the landed foot, ξ̇ = ω(ξ − p), with the controller's OWN constraints — before acceptance the CoP stays in the
// stance region; after LOAD_ACCEPT the landed region grows from its centroid with s (smoothstep over the ramp); the landed share ≤ min(s, 1 − floor); the
// balance law p* = ξ + kξ(ξ − ξ_ref) + rate term with ξ_ref the λ-weighted centroid line; the λ return (min-jerk over abortDur) starts at the first contact (H9).
// Geometry: the line through ξ along u is sliced with the stance and landed usable regions; if it misses either (ξ's AP position outside a foot), in place
// cannot capture along it → "step required". Scope: the lateral (between-feet) recovery of the E1b abort; AP divergence is not modelled beyond that check.
// Pure arithmetic only (no transcendental functions): deterministic, browser = Node. Physics stays authoritative: this only SCHEDULES (durations, intent).
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const mjd = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u));
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
const vmean = (P) => P.reduce((s, q) => [s[0] + q[0] / P.length, s[1] + q[1] / P.length], [0, 0]);
// [min, max] of the line coordinate s where the line x(s) = o + s·u crosses convex polygon P (null if it misses)
function sliceLine(P, o, u) { const vx = -u[1], vz = u[0]; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], da = (a[0] - o[0]) * vx + (a[1] - o[1]) * vz, db = (b[0] - o[0]) * vx + (b[1] - o[1]) * vz;
    if ((da <= 0 && db >= 0) || (da >= 0 && db <= 0)) { if (da === db) { for (const q of [a, b]) { const s = (q[0] - o[0]) * u[0] + (q[1] - o[1]) * u[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); } continue; }
      const f = da / (da - db), x = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])], s = (x[0] - o[0]) * u[0] + (x[1] - o[1]) * u[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); } }
  return lo <= hi ? [lo, hi] : null; }
// capture context from the controller's (previous-tick, causal) state: ξ, ω, commanded CoP p, usable regions; n = the airborne (to-be-landed) foot
// u = the controller's LATERAL axis (from its heading; the axis of its λ / ξ_ref machinery), oriented toward the landed foot — as the validated model (which
// sliced at ξ's AP coordinate). Measured: slicing along the raw ξ − p direction (≈ 3° off lateral) was optimistic by 2.5 mm on one knife-edge run (31 / 32).
export function captureContext(info, n, K) { const m = 1 - n, xi = info.xi, S = info.polys[m], A = info.polys[n], cS0 = vmean(S), cA0 = vmean(A), hd = info.heading;
  let u = [hd[1], -hd[0]]; if ((cA0[0] - cS0[0]) * u[0] + (cA0[1] - cS0[1]) * u[1] < 0) u = [-u[0], -u[1]];
  const sS = sliceLine(S, xi, u), sA = sliceLine(A, xi, u), proj = (q) => (q[0] - xi[0]) * u[0] + (q[1] - xi[1]) * u[1];
  const base = { u, w: info.w0, cS: proj(cS0), cA: proj(cA0), ...K };
  if (!sS || !sA || sA[1] <= sS[1]) return { ...base, miss: true, Sin: sS ? sS[1] : null, Aout: sA ? sA[1] : null };   // the landed foot is not ahead along the divergence → in place cannot capture
  return { ...base, miss: false, Sin: sS[1], Aout: sA[1] }; }
// forward simulation from now (t = 0, ξ_u = 0). o: { tc: first contact (s from now; ≤ 0 if already), tAcc: LOAD_ACCEPT start (s from now), Tr: ramp (s),
//   lamFrom: stance request share at the abort, lam0: λ-return start (s from now; = tc unless contact already happened), floorRule: "ta" | "current" }
export function simulate(cx, o) { if (cx.miss) return { recovers: false, miss: true };
  const dt = cx.dt, T1 = cx.horizon, w = cx.w, lamFrom = o.lamFrom ?? 1, lam0 = o.lam0 ?? o.tc, dv = 0.5 - lamFrom; let x = 0, worst = -Infinity;
  for (let t = 0; t < T1; t += dt) { const ur = (t - lam0) / cx.abortDur, lS = t < lam0 ? lamFrom : lamFrom + dv * mj(ur), dl = t < lam0 ? 0 : dv * mjd(ur) / cx.abortDur;
    const s = t < o.tAcc ? 0 : smooth((t - o.tAcc) / o.Tr), floor = o.floorRule === "current" ? Math.min(cx.minShare, lS) : (t < lam0 ? 0 : cx.minShare * mj(ur)), tmax = Math.min(s, 1 - floor);
    const AoutS = cx.cA + s * (cx.Aout - cx.cA), pLim = tmax * AoutS + (1 - tmax) * cx.Sin;
    const xr = cx.cA + (cx.cS - cx.cA) * lS, xrd = (cx.cS - cx.cA) * dl, xrE = xr + xrd / w;
    const p = Math.min(x + cx.kXi * (x - xrE) - xrd / w, pLim);
    x += dt * w * (x - p); worst = Math.max(worst, x - cx.Aout);
    if (x - cx.Aout > cx.fellBeyond) return { recovers: false, t, worst }; }
  return { recovers: true, worst }; }
// T-A CONSTANTS (preregistered in e1b_ta/E1B_TA_PREREG.md before any official run)
export const TA = {
  TputMin: 0.20,      // s — the shortest emergency descent: Khadiv et al. 2020 minimum step duration (T ∈ [0.2, 0.6] s)
  TrMin: 0.10,        // s — the shortest load-acceptance ramp: the lifecycle's validated `accept` (0.10 s)
  TrMax: 0.225,       // s — the longest: PyPnC Atlas contact-transition ramp α·T_ds = 0.5 × 0.45 s
  margin: 0.04,       // s — timing safety margin: the largest LOAD_ACCEPT timing discrepancy of the validated model (p15_capture §2)
  kStep: 0.01, TrStep: 0.005, horizon: 2.5, fellBeyond: 0.05,   // grids / model horizon and divergence test (as the validated model)
};
// equal-fraction split: a single k scales both maxima (descent max = the servo-bandwidth duration), each clamped to its minimum
export const splitK = (k, TputMax) => ({ Tput: Math.min(TputMax, Math.max(TA.TputMin, k * TputMax)), Tr: Math.min(TA.TrMax, Math.max(TA.TrMin, k * TA.TrMax)) });
export const kMin = (TputMax) => Math.max(TA.TputMin / TputMax, TA.TrMin / TA.TrMax);
// descent plan: the largest k (grid from kFrom down to kMin) whose descent touches down (remaining time from now = Tput(k) − elapsed, delayed by the margin) early
// enough that the model predicts recovery with acceptance at contact + acceptDebounce (intent from the abort plan), ramp Tr(k), floor rule "ta"
export function planDescent(cx, { elapsed, kFrom, TputMax, lamFrom, dt, remNow = Infinity }) {
  const n = Math.round((kFrom - kMin(TputMax)) / TA.kStep);
  for (let i = 0; i <= n; i++) { const k = kFrom - i * TA.kStep, sp = splitK(Math.max(k, kMin(TputMax)), TputMax), rem = sp.Tput - elapsed;
    if (rem < 2 * dt || rem > remNow + 1e-9) continue; const tc = rem + TA.margin;
    if (simulate(cx, { tc, tAcc: tc + cx.acceptDebounce, Tr: sp.Tr, lamFrom, floorRule: "ta" }).recovers) return { k, ...sp, rem, verdict: "in place" }; }
  const sp = splitK(kMin(TputMax), TputMax); return { k: kMin(TputMax), ...sp, rem: Math.max(2 * dt, sp.Tput - elapsed), verdict: "step required" }; }
// acceptance ramp after measured contact: the LONGEST Tr on the grid [TrMax … TrMin] that the model predicts recovers with LOAD_ACCEPT at the remaining debounce
// (delayed by the margin); λ return already started at the first contact (lam0 ≤ 0)
// rule revision 2 (e1b_close/; abortCapture: 2): margin = 0 here — the timing margin covers the touchdown / acceptance-time uncertainty BEFORE measured contact;
// after measured contact LOAD_ACCEPT follows at exactly the debounce (measured: contact → accept = acceptDebounce in 23 / 23 T-A P15 runs), so revision 1's extra
// margin double-counted it and declared feasible ramps infeasible (audit: e1b_close/research/TA_RULE_AUDIT.md)
export function planRamp(cx, { debounceLeft, lam0, lamFrom, margin = TA.margin }) { const n = Math.round((TA.TrMax - TA.TrMin) / TA.TrStep);
  for (let i = 0; i <= n; i++) { const Tr = TA.TrMax - i * TA.TrStep, tAcc = debounceLeft + margin;
    if (simulate(cx, { tc: Math.min(0, lam0), lam0, tAcc, Tr, lamFrom, floorRule: "ta" }).recovers) return { Tr, verdict: "in place" }; }
  return { Tr: TA.TrMin, verdict: "step required" }; }
