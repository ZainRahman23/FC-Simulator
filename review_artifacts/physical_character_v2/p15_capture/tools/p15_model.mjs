// P15 lateral LIPM model (diagnostic; not evidence). From the measured state at the END of the 15 N·s push, integrate ξ̇ = ω(ξ − p) laterally (x) with the
// controller's own constraints: before acceptance p ∈ stance region S; after LOAD_ACCEPT the landed region grows from its centroid with s (smoothstep over
// `accept`); the achievable CoP toward the landed side = t_max·A_out(s) + (1 − t_max)·S_in with t_max = min(s, 1 − floor), floor = min(minShare, λ_S); the
// balance law p* = ξ + kξ(ξ − ξref) + FF (ξref = λ-weighted centroid, analytic rates) clamped to the achievable range. Timing: λ_S = 1 until the first contact
// (H9), then 1 − 0.5·mj((t − t_c)/abortDur); LOAD_ACCEPT when 1 − λ_S ≥ wantShare for acceptDebounce. Validated against the 32 diagnostic runs, then used
// to map the in-place envelope (latest touchdown that still recovers) for the current pipeline and for single-factor counterfactuals.
import fs from "fs"; import zlib from "zlib"; import path from "path";
const D = path.dirname(new URL(import.meta.url).pathname), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f))));
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }, smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
// lateral extent of polygon P at AP coordinate z: [min x, max x] over the slice (convex)
function slice(P, z) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); } } return [lo, hi]; }
const cen = (P) => P.reduce((s, q) => [s[0] + q[0] / P.length, s[1] + q[1] / P.length], [0, 0]);
const K = { kXi: 1 / 3, minShare: 0.10, wantShare: 0.05, acceptDebounce: 0.05, accept: 0.10, abortDur: 0.6, dt: 1 / 240 };
export function setup(R) { const m = R.stance, n = R.lifted, te = R.events.pertT + 0.1, r = R.rows.find(x => x.t >= te - 1e-9 && x.dg), g = r.dg, z = r.xi[1];
  const S = g.polys[m], A = g.polys[n], sgn = Math.sign(cen(A)[0] - cen(S)[0]);   // sgn: direction from stance toward the landed foot (lateral x)
  const [s0, s1] = slice(S, z), [a0, a1] = slice(A, z), Sin = sgn < 0 ? s0 : s1, Aout = sgn < 0 ? a0 : a1, cA = cen(A)[0], cS = cen(S)[0];
  // ξref lateral at λ_S = 1 (logged) and the λ-weighted centroid slope (cS − cA per unit λ_S)
  return { te, ab: R.events.abortT, w: g.w0, xi0: r.xi[0], sgn, Sin, Aout, cA, cS, xr1: g.xiRef[0] }; }
// simulate; opt: { tc (touchdown, abs), latency: "current" | "abort" (λ return starts at the abort; acceptance at contact + debounce) | number (s after contact),
//   floor0 (the stance floor relaxed to 0 in the abort), best (physical best case: p anywhere in the achievable range, no law), rampS (acceptance ramp duration) }
export function sim(P, o) { const { w, sgn } = P, dt = K.dt, T1 = P.te + 2.5; let x = P.xi0, t = P.te, worst = 0;
  const tLam0 = o.latency === "abort" ? P.ab : o.tc;   // λ return start
  const lamS = (tt) => (tt < tLam0 ? 1 : 1 - 0.5 * mj((tt - tLam0) / K.abortDur)), dLam = (tt) => (tt < tLam0 || tt > tLam0 + K.abortDur ? 0 : -0.5 * 30 * ((tt - tLam0) / K.abortDur) ** 2 * (1 - (tt - tLam0) / K.abortDur) ** 2 / K.abortDur);
  // acceptance start: contact AND landed request ≥ wantShare, held acceptDebounce
  let tAcc; if (typeof o.latency === "number") tAcc = o.tc + o.latency; else { let tw = null; for (let tt = Math.max(o.tc, tLam0); tt < T1; tt += dt / 4) if (1 - lamS(tt) >= K.wantShare) { tw = tt; break; } tAcc = Math.max(o.tc, tw) + K.acceptDebounce; }
  const ramp = o.rampS ?? K.accept;
  for (; t < T1; t += dt) { const s = smooth((t - tAcc) / ramp), lS = lamS(t), floor = o.floor0 ? 0 : Math.min(K.minShare, lS), tmax = Math.min(s, 1 - floor);
    const AoutS = P.cA + s * (P.Aout - P.cA), pLim = tmax * AoutS + (1 - tmax) * P.Sin;   // achievable CoP extreme toward the landed side
    const xr = P.cA + (P.cS - P.cA) * lS, xrd = (P.cS - P.cA) * dLam(t), xrE = xr + xrd / w;   // ξref (λ-weighted centroid) + analytic DCM rate term
    let p = o.best ? pLim : x + K.kXi * (x - xrE) - xrd / w;
    // clamp to the achievable range: toward the landed side no further than pLim, toward the stance side no further than the stance outer edge (not binding here)
    if (sgn < 0) p = Math.max(p, pLim); else p = Math.min(p, pLim);
    x += dt * w * (x - p); worst = Math.max(worst, sgn * (x - P.Aout));
    if (sgn * (x - P.Aout) > 0.05) return { fell: true, t: t - P.ab, tAcc: tAcc - P.ab }; }
  return { fell: false, worstBeyondAoutCm: worst * 100, tAcc: tAcc - P.ab, xEnd: x }; }
// latest touchdown (after the abort) that still recovers, by bisection on tc
export function latestTD(P, o) { let lo = 0, hi = 1.2; if (sim(P, { ...o, tc: P.ab + lo }).fell) return 0; if (!sim(P, { ...o, tc: P.ab + hi }).fell) return hi;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (sim(P, { ...o, tc: P.ab + mid }).fell) hi = mid; else lo = mid; } return lo; }
if (process.argv[1] && process.argv[1].endsWith("p15_model.mjs")) {
  const bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"]; let agree = 0, tot = 0; const out = [];
  console.log("VALIDATION (actual touchdown times; model vs simulation):");
  for (const b of bodies) for (const sd of ["L", "R"]) for (const mode of ["pd", "drop"]) { const R = rd(`cap_${b}_${sd}_${mode}.json.gz`), P = setup(R), n = R.lifted, td = R.lcLog[n].find(e => e.t >= R.events.abortT - 1e-9 && e.to === "TOUCHDOWN"), res = sim(P, { tc: td.t, latency: "current" }), real = /fell/.test(R.summary.outcome);
    const acc = R.lcLog[n].find(e => e.t >= R.events.abortT - 1e-9 && e.to === "LOAD_ACCEPT"); tot++; if (res.fell === real) agree++;
    out.push({ b, sd, mode, real, model: res.fell, accReal: acc ? acc.t - R.events.abortT : null, accModel: res.tAcc });
    console.log(`  ${b} ${sd} ${mode.padEnd(4)} TD +${(td.t - R.events.abortT).toFixed(3)} | LOAD_ACCEPT real +${acc ? (acc.t - R.events.abortT).toFixed(3) : "—"} model +${res.tAcc.toFixed(3)} | sim ${real ? "FELL" : "recovered"} | model ${res.fell ? "FELL" : "recovered"}${res.fell === real ? "" : "  ✗ MISMATCH"}`); }
  console.log(`agreement ${agree}/${tot}\n`);
  console.log("ENVELOPE: latest touchdown after the abort that still recovers (model) — body side | current pipeline | λ intent at abort | floor 0 | intent at abort + floor 0 | physical best case (no latency beyond debounce, no floor, p at the limit)");
  for (const b of bodies) for (const sd of ["L", "R"]) { const R = rd(`cap_${b}_${sd}_pd.json.gz`), P = setup(R);
    const e = [latestTD(P, { latency: "current" }), latestTD(P, { latency: "abort" }), latestTD(P, { latency: "current", floor0: true }), latestTD(P, { latency: "abort", floor0: true }), latestTD(P, { latency: 0, floor0: true, best: true, rampS: 1e-3 })];
    out.push({ b, sd, envelope: e }); console.log(`  ${b} ${sd} | ${e.map(v => v.toFixed(3) + " s").join(" | ")}`); }
  fs.writeFileSync(path.join(D, "p15_model.json"), JSON.stringify(out, null, 1)); }
