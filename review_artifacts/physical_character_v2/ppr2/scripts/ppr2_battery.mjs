// PPR-2 qualification battery (frozen with PPR2_PREREGISTRATION.md). The runner ALONE (scene SOLO; PVP-1A-DX sealed), PVP-1A-DX entry pose.
// Families: T1 undisturbed standing · T2 pelvis pushes (AP / ML × small / moderate / large) · T3 isolated displacement responses (ankle platform,
// knee, hip) · T4 release / settling (torque-pair hold, release) · T5 energy · T6 integrity · T7 determinism. Every response quantity of T2 / T3 / T4 is
// the run MINUS the same law's unperturbed run (deterministic, same entry), so the law's own standing drift is removed.
// usage (qualification): see ppr2_qualify.mjs
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { runOne } = await import(new URL("./ppr2_run.mjs", import.meta.url).href), { ankleCurve, I1 } = await import(new URL("./ppr2_ankle_platform.mjs", import.meta.url).href);
const H = 1 / 240, D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const KEY_AXES = Object.freeze([["ankle_L.df", 11, 1], ["ankle_R.df", 12, 1], ["ankle_L.inv", 11, 2], ["ankle_R.inv", 12, 2], ["knee_L.flex", 9, 1], ["knee_R.flex", 10, 1],
  ["hip_L.flex", 7, 1], ["hip_R.flex", 8, 1], ["hip_L.abd", 7, 2], ["hip_R.abd", 8, 2], ["lumbar.flex", 0, 1], ["lumbar.lat", 0, 2]]);
export const BATTERY = Object.freeze({
  t0: 24,                                   // perturbation onset / post-settle reference: step 24 = 100 ms after the entry (start-up settle, PPR2_CRITERIA_AUDIT §5)
  T1: { steps: 960, envMm: 10, envDeg: 3, efoldFrom: 5, efoldTo: 25 },
  // T2: pelvis force pulse at the pelvis COM, 12 steps (50 ms). Impulse = f · J_lim, J_lim = m·ω0·margin = the zero-delay XcoM (Hof 2005) no-step limit of
  // THIS stance (entry geometry: m 73.91 kg, COM height 0.9845 m → ω0 3.157 s⁻¹; flat-sole extents x −0.098…0.150, z ±0.273; COM x 0.0257, z 0):
  // J_lim fwd 29.09 / back 28.96 / lateral 63.63 N·s. f = 0.25 small, 0.4 moderate (the literature's feet-in-place / hip-involvement bands expressed
  // as fractions of the zero-delay limit, PPR-2 STANDING_SUBSTRATE_LITERATURE §perturbations), 1.5 large (beyond any no-step response, even delay-free)
  T2: { pulse: 12, W: 72, dirs: { fwd: [1, 0, 0], back: [-1, 0, 0], left: [0, 0, 1], right: [0, 0, -1] }, f: { small: 0.25, moderate: 0.4, large: 1.5 },
        J: { fwd: { small: 7.3, moderate: 11.6, large: 43.6 }, back: { small: 7.2, moderate: 11.6, large: 43.4 }, left: { small: 15.9, moderate: 25.5, large: 95.4 }, right: { small: 15.9, moderate: 25.5, large: 95.4 } } },
  // T3: I1 ankle platform (ppr2_ankle_platform.mjs, I1 constants); knee / hip: child chain kinematic about the joint centre, parent free (same
  // semi-isolated form as the platform), amplitudes ±0.01 / ±0.04 rad in a 10-step ramp, read at end of ramp, 71 ms and 100 ms after ramp start
  T3: { from: 24, ramp: 10, steps: 60, amps: [0.01, 0.04], joints: { knee: { joint: "knee_R", axis: "flex", k: 10, i: 1, move: ["shank_R", "foot_R"] }, hip: { joint: "hip_R", axis: "flex", k: 8, i: 1, move: ["thigh_R", "shank_R", "foot_R"] } } },
  // T4: torque-pair hold 48 steps (200 ms) from t0, release, 72 steps (300 ms) free; small magnitudes (N·m), both signs
  T4: { hold: 48, after: 72, probes: [{ joint: "ankle_R", axis: "df", parent: "shank_R", child: "foot_R", T: 5 }, { joint: "knee_R", axis: "flex", parent: "thigh_R", child: "shank_R", T: 5 },
    { joint: "hip_R", axis: "flex", parent: "pelvis", child: "thigh_R", T: 5 }, { joint: "lumbar", axis: "flex", parent: "pelvis", child: "abdomen", T: 5 }] },
});
const th = (r, k, i) => r.chars.runner.th[k][i];
const keyDev = (r, r0) => { let m = 0, who = null; for (const [n, k, i] of KEY_AXES) { const d = Math.abs(th(r, k, i) - th(r0, k, i)) * R2D; if (d > m) { m = d; who = n; } } return { deg: m, axis: who }; };
const comVel = (R, q) => (q < 1 ? [0, 0, 0] : V.sc(V.sub(R[q].chars.runner.com, R[q - 1].chars.runner.com), 240));
const run = (FIX, law, params, extra) => runOne({ fixtureObj: FIX, law, params, scene: "SOLO", ...extra });
const ledger = (R, a, b) => { let res = 0, ext = 0, wact = 0, dpas = 0, sep = 0; for (let q = a; q < b && q < R.length; q++) { const c = R[q].chars.runner; res += c.energyRes; ext += Math.abs(c.ext.W); wact += c.Wact; dpas += c.D; sep = Math.max(sep, c.integrity.sepMaxMm); } return { residualJ: res, extWorkAbsJ: ext, actuatorWorkJ: wact, passiveDampingLossJ: dpas, sepMaxMm: sep }; };
// ── T1 undisturbed standing ──
export async function T1(FIX, law, params) { const B = BATTERY.T1, t0 = BATTERY.t0, o = await run(FIX, law, params, { steps: B.steps }), R = o.recs, r0 = R[t0 - 1], y0 = r0.S[0].pos[1], c0 = r0.chars.runner.com;
  const D = R.map(r => Math.max((y0 - r.S[0].pos[1]) * 1000, Math.hypot(r.chars.runner.com[0] - c0[0], r.chars.runner.com[2] - c0[2]) * 1000));
  let exit = null; for (let q = t0; q < R.length; q++) { const j = keyDev(R[q], r0); if (D[q] >= B.envMm || j.deg >= B.envDeg) { exit = { t: R[q].n * H, step: R[q].n, cause: D[q] >= B.envMm ? ((y0 - R[q].S[0].pos[1]) * 1000 >= B.envMm ? "pelvis drop" : "COM horizontal") : "joint " + j.axis, Dmm: D[q], jointDeg: j.deg }; break; } }
  const pts = []; for (let q = t0; q < R.length; q++) if (D[q] >= B.efoldFrom && D[q] <= B.efoldTo) pts.push([R[q].n * H, Math.log(D[q])]);
  let efold = null; if (pts.length >= 4) { const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n, sl = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0); efold = sl > 0 ? 1 / sl : null; }
  const su = keyDev(r0, R[0]), feetN = R.slice(0, t0).map(r => (r.chars.runner.feet.L + r.chars.runner.feet.R) * 240);
  const ser = R.filter(r => r.n % 24 === 0).map(r => ({ t: r.n * H, Dmm: +D[r.n - 1].toFixed(2), pelvisDropMm: +((y0 - r.S[0].pos[1]) * 1000).toFixed(2), keyDevDeg: +keyDev(r, r0).deg.toFixed(2) }));
  return { exit, efoldS: efold, efoldPts: pts.length, startup: { pelvisDropMm: (R[0].S[0].pos[1] - y0) * 1000, maxKeyAxisDeg: su.deg, axis: su.axis, feetLoadN: { min: Math.min(...feetN), max: Math.max(...feetN) } },
    ledger: ledger(R, t0, exit ? exit.step : R.length), startupLedger: ledger(R, 0, t0), restSepMm: r0.chars.runner.integrity.sepMaxMm, series: ser, cpu: o.cpu, steps: R.length, stop: o.stop || null, finalHash: o.finalHash }; }
// ── T2 pushes ──
// base of support: every sole contact point within 5 mm of the turf (loaded or speculative) over the 6 steps before onset — the support the feet
// can use without rotating more than ≈ 3° (a foot standing on its edge has a smaller base than a flat one)
const bosEdges = (R, a, b) => { const pts = []; for (let q = a; q < b; q++) for (const m of R[q].contacts || []) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0 || p.depth >= -0.005) pts.push(p.p);
  return { fwd: Math.max(...pts.map(p => p[0])), back: Math.min(...pts.map(p => p[0])), left: Math.max(...pts.map(p => p[2])), right: Math.min(...pts.map(p => p[2])), n: pts.length }; };
export async function T2(FIX, law, params, spec = PL.SPEC_R()) { const B = BATTERY.T2, t0 = BATTERY.t0, steps = t0 + B.W + 1, pel = spec.bodies.findIndex(b => b.name === "pelvis"), pLocal = spec.bodies[pel].comLocal;
  const base = await run(FIX, law, params, { steps }), Rb = base.recs, edges = bosEdges(Rb, t0 - 6, t0), g = 9.81, out = { edges, base: { finalHash: base.finalHash }, runs: {} };
  for (const [dir, u] of Object.entries(B.dirs)) for (const mag of ["small", "moderate", "large"]) { const J = B.J[dir][mag], F = V.sc(u, J / (B.pulse * H));
    const o = await run(FIX, law, params, { steps, perturb: [{ from: t0, to: t0 + B.pulse, body: "pelvis", F, pLocal }] }), R = o.recs, ax = u[0] !== 0 ? 0 : 2, sg = u[0] + u[2];
    let maxDev = { deg: 0, axis: null }, drop = 0, loss = null, minMargin = Infinity, comPeak = 0, feetMin = Infinity; const wr = [], dw = [];
    for (let q = t0; q < Math.min(R.length, t0 + B.W); q++) { const r = R[q], b = Rb[q];
      for (const [n, k, i] of KEY_AXES) { const d = Math.abs(th(r, k, i) - th(b, k, i)) * R2D; if (d > maxDev.deg) maxDev = { deg: d, axis: n }; }
      drop = Math.max(drop, (b.S[0].pos[1] - r.S[0].pos[1]) * 1000); const c = r.chars.runner.com, v = comVel(R, q), h = c[1], w0 = Math.sqrt(g / h), xc = c[ax] + v[ax] / w0;
      const margin = sg > 0 ? edges[dir] - xc : xc - edges[dir]; minMargin = Math.min(minMargin, margin); comPeak = Math.max(comPeak, Math.abs(c[ax] - b.chars.runner.com[ax]) * 1000);
      const fL = r.chars.runner.feet.L * 240, fR = r.chars.runner.feet.R * 240; feetMin = Math.min(feetMin, fL, fR);
      if (!loss && margin < 0) loss = { t: (r.n - t0) * H, cause: "XcoM beyond the base of support" }; if (!loss && Math.min(fL, fR) < 5 && q > t0 + 2) loss = { t: (r.n - t0) * H, cause: "a foot unloaded" };
      if (q > t0) wr.push(Math.hypot(...KEY_AXES.map(([, k, i]) => (th(r, k, i) - th(R[q - 1], k, i) - (th(b, k, i) - th(Rb[q - 1], k, i))) * 240))); }
    const rms = (a, b) => { const s = wr.slice(a, b); return Math.sqrt(s.reduce((x, y) => x + y * y, 0) / Math.max(1, s.length)); }, early = rms(12, 36), late = rms(48, 72);
    const qe = Math.min(R.length, t0 + B.W) - 1, comEnd = Math.abs(R[qe].chars.runner.com[ax] - Rb[qe].chars.runner.com[ax]) * 1000, vEnd = comVel(R, qe)[ax] - comVel(Rb, qe)[ax];
    const vPeak = Math.max(...R.slice(t0, qe + 1).map((r, j) => Math.abs(comVel(R, t0 + j)[ax] - comVel(Rb, t0 + j)[ax])));
    const cb = Rb[t0 - 1].chars.runner.com[ax], marginT0 = sg > 0 ? edges[dir] - cb : cb - edges[dir];
    out.runs[dir + "." + mag] = { J, F: J / (B.pulse * H), marginT0, maxDev, pelvisDropMm: drop, comRelPeakMm: comPeak, comRelEndMm: comEnd, comRelVelPeak: vPeak, comRelVelEnd: vEnd, xcomMinMarginM: minMargin, loss, settle: { early, late, ratio: late / Math.max(1e-12, early) },
      feetMinN: feetMin, ledger: ledger(R, t0, qe + 1), restSepEndMm: R[qe].chars.runner.integrity.sepMaxMm, stop: o.stop || null, finalHash: o.finalHash }; }
  return out; }
// ── T3 isolated displacement responses ──
const torqueOf = (r, k, i) => { const a = r.act.find(x => x[0] === k && x[1] === i); return a[2] + r.passive[k][i]; };
const lawD = (r, k, i, law, Dtone) => { if (law === "A") return Dtone; const L = (r.law || []).find(x => x[0] === k && x[1] === i); return L ? L[4] : 0; };
export async function T3(FIX, law, params) { const B = BATTERY.T3, out = { ankle: await ankleCurve(FIX, law, params, "I1"), joints: {} };
  for (const [name, J] of Object.entries(B.joints)) { const drv = (amp, sign) => ({ joint: J.joint, axis: J.axis, sign, from: B.from, ramp: B.ramp, amp, hold: [], move: J.move });
    const base = await run(FIX, law, params, { steps: B.steps, drive: drv(0, 1) }), Rb = base.recs, rows = [], Dtone = { knee: 81, hip: 20 }[name];   // law A only (reference): SnapshotTone D at the entry (PPR1_AUDIT_CURRENT_V2.md)
    for (const amp of B.amps) for (const sign of [1, -1]) { const o = await run(FIX, law, params, { steps: B.steps, drive: drv(amp, sign) }), R = o.recs;
      const at = (m) => { const q = B.from + m - 1, dth = th(R[q], J.k, J.i) - th(Rb[q], J.k, J.i), dthP = th(R[q - 1], J.k, J.i) - th(Rb[q - 1], J.k, J.i), dw = (dth - dthP) * 240, dT = torqueOf(R[q], J.k, J.i) - torqueOf(Rb[q], J.k, J.i), Dd = lawD(R[q], J.k, J.i, law, Dtone);
        return { ms: +(m * 1000 / 240).toFixed(1), jointDeg: dth * R2D, dT, K: -dT / dth, Kel: -(dT + Dd * dw) / dth, relVel: dw }; };
      let rate = 0; for (let q = B.from; q < B.from + B.ramp + 4; q++) rate = Math.max(rate, Math.abs(torqueOf(R[q], J.k, J.i) - torqueOf(Rb[q], J.k, J.i) - (torqueOf(R[q - 1], J.k, J.i) - torqueOf(Rb[q - 1], J.k, J.i))) * 240);
      rows.push({ ampRad: amp, sign, endRamp: at(B.ramp), at71: at(17), at100: at(24), peakTorqueRate: rate, stop: o.stop || null }); }
    out.joints[name] = { joint: J.joint, axis: J.axis, rows }; }
  return out; }
// ── T4 release / settling ──
export async function T4(FIX, law, params, spec = PL.SPEC_R()) { const B = BATTERY.T4, t0 = BATTERY.t0, steps = t0 + B.hold + B.after, base = await run(FIX, law, params, { steps }), Rb = base.recs, E = FIX.write.runner.poses, out = [];
  for (const P of B.probes) for (const sgn of [1, -1]) { const k = spec.joints.findIndex(j => j.name === P.joint), j = spec.joints[k], key = ["x", "y", "z"].find(q => j.def.axes[q] && j.def.axes[q].key === P.axis), i = ["x", "y", "z"].indexOf(key);
    const axW = Q.rot(Q.mul(E[j.childIndex].rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), o = await run(FIX, law, params, { steps, perturb: [{ from: t0, to: t0 + B.hold, pair: [P.parent, P.child], T: V.sc(axW, sgn * P.T) }] }), R = o.recs;
    const d = R.map((r, q) => th(r, k, i) - th(Rb[q], k, i)), hold = d[t0 + B.hold - 1], free = d.slice(t0 + B.hold), fin = free[free.length - 1];
    // oscillation about the final value: signed extrema; only a sequence that ALTERNATES in sign (crosses the final value) is an oscillation
    const ext = []; for (let q = 1; q < free.length - 1; q++) { if ((free[q] - free[q - 1]) * (free[q + 1] - free[q]) < 0) ext.push(free[q] - fin); }
    const osc = []; for (const x of ext) { if (!osc.length || Math.sign(x) !== Math.sign(osc[osc.length - 1])) osc.push(x); else if (Math.abs(x) > Math.abs(osc[osc.length - 1])) osc[osc.length - 1] = x; }
    let zeta = null; if (osc.length >= 2 && Math.abs(osc[1]) > 1e-7) { const dl = Math.log(Math.abs(osc[0]) / Math.abs(osc[1])); zeta = dl / Math.sqrt(Math.PI * Math.PI + dl * dl); }   // successive alternating extrema are half a period apart: ln|x0/x1| = ζπ/√(1−ζ²)
    const growing = osc.length >= 3 && osc.some((x, q) => q > 0 && Math.abs(x) > Math.abs(osc[q - 1]) * 1.05);
    let vshare = null; if (law !== "A") { const q = t0 + Math.round(0.05 * 240) - 1, L = (R[q].law || []).find(x => x[0] === k && x[1] === i), w = (d[q] - d[q - 1]) * 240; if (L) { const Dv = L[4] * w, dT = torqueOf(R[q], k, i) - torqueOf(Rb[q], k, i); vshare = Math.abs(Dv) / Math.max(1e-9, Math.abs(dT)); } }
    out.push({ probe: `${P.joint}.${P.axis} ${sgn > 0 ? "+" : "−"}${P.T}`, holdDeg: hold * R2D, finalDeg: fin * R2D, residualFrac: Math.abs(fin) / Math.max(1e-12, Math.abs(hold)), extremaDeg: osc.slice(0, 6).map(x => x * R2D), zeta, growing, viscousShareAt50ms: vshare, stop: o.stop || null }); }
  return out; }
export async function T7(FIX, law, params) { const a = await run(FIX, law, params, { steps: 240 }), b = await run(FIX, law, params, { steps: 240 }), J = BATTERY.T2.J.fwd.moderate, F = [J / (BATTERY.T2.pulse * H), 0, 0];
  const p = { steps: 120, perturb: [{ from: BATTERY.t0, to: BATTERY.t0 + BATTERY.T2.pulse, body: "pelvis", F, pLocal: PL.SPEC_R().bodies[0].comLocal }] }, c = await run(FIX, law, params, p), d = await run(FIX, law, params, p);
  return { standing: [a.finalHash, b.finalHash], push: [c.finalHash, d.finalHash], identical: a.finalHash === b.finalHash && c.finalHash === d.finalHash }; }
