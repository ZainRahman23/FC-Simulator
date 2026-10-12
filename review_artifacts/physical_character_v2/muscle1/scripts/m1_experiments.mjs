// MUSCLE-1 experiments (frozen with MUSCLE1_PREREGISTRATION.md): single-axis fixture at the PPR-3 standing operating point; models V2ENV (CURRENT V2's
// canonical actuator), V2ACT (PPR-3's S2 actuator) and M1 (the candidate). Experiments, per joint (ankle = primary; knee = generalization):
//   A   neural command → physical force: excitation steps (3 amplitudes per agonist group, up then down) and moderate ramps, isometric
//   B   external stretch, excitation constant: stiffness series (5 amplitudes), stretch–hold–return (small / moderate), quick release, shortening
//   BC  C history / energy audit: activation raised after a stretch (passivity), deactivation memory (enhancement abolished at zero force)
//   C   open-loop replay of the frozen PPR-3 P2 command and kinematic histories (m1_capture.mjs)
//   DET, CPU
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node .../m1_experiments.mjs --params <MUSCLE1_CANDIDATE.json> --capture <dir> --out <json> [--models V2ENV,V2ACT,M1] [--joints ankle,knee]
import fs from "fs"; import zlib from "zlib"; import crypto from "crypto";
const M = await import(new URL("./m1_models.mjs", import.meta.url).href), F = await import(new URL("./m1_fixture.mjs", import.meta.url).href), KIT = await import(new URL("./m1_kit.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const PROTOCOL = Object.freeze({
  settle: 480, hold: 360, rampSteps: 48,                                                         // 2 s settle; 1.5 s holds; 200 ms ramps
  A: { ankle: { PF: [0.05, 0.25, 0.50], DF: [0.10, 0.30] }, knee: { KE: [0.05, 0.25, 0.50], KF: [0.10, 0.30] }, rampDu: 0.25 },
  B: { amps: [0.005, 0.01, 0.02, 0.04, 0.08], ramp: 10, small: 0.01, moderate: 0.04, holdSteps: 240, after: 120, release: 240, readMs: [100, 300, 1000], mghLeg: 647.2 / 2,
       ecc: { amp: 0.0175, ramp: 2, holdSteps: 262, readMs: [100, 300, 1000] } },                   // S2's C1 protocol (ppr3_s2_qualify S2B.ecc): near-step 1° stretch, held
  BC: { amp: 0.02, ramp: 10, du: 0.25, hold1: 60, hold2: 240, hold3: 60, tail: 360, mem: { pre: 72, off: 120, on: 240 } },
  C: { runs: ["fwd_small", "fwd_moderate", "fwd_large", "back_moderate", "left_small", "left_moderate"], onset: 480, window: 240, warm: 24 },
  stretchGroup: { ankle: "PF", knee: "KE" },
  axes: { ankle: [["ankle_L.df", 11, 1], ["ankle_R.df", 12, 1]], knee: [["knee_L.flex", 9, 1], ["knee_R.flex", 10, 1]] } });
const P = PROTOCOL, dt = 1 / 240, R2D = 180 / Math.PI;
const vlutters = (deg) => 0.93 * Math.pow(deg / 0.29, -0.271), sakanaka = (deg) => 0.94 * Math.pow(deg / 0.2, -0.321);
export function sideOf(kit, params, group) { return params.dirToGroup[kit.fam][kit.x.plus.dir] === group ? 0 : 1; }
function make(id, kit, params) { return id === "V2ENV" ? new M.V2EnvAxis(kit) : id === "V2ACT" ? new M.V2ActAxis(kit) : id === "M1a" ? new M.M1aAxis(kit, params) : id === "M1b" ? new M.M1bAxis(kit, params) : new M.M1Axis(kit, params); }
// steady isometric torque of an excitation pair at the operating point (what each actuator should settle to): u⁺·capIso⁺ − u⁻·capIso⁻ + τ_B0
const tauSS = (kit, u) => u[0] * kit.capFull(1, kit.anat0, 0, kit.kneeDeg0) - u[1] * kit.capFull(-1, kit.anat0, 0, kit.kneeDeg0) - kit.kp * (kit.anat0 - kit.slack) * Math.PI / 180 * kit.s;
const cmdOf = (id, kit, u) => (id === "V2ENV" ? { tau0: tauSS(kit, u), K: 0, D: 0 } : null);
const r6 = (x) => (x == null ? null : +(+x).toPrecision(6));
// ── A: excitation steps and ramps (isometric) ──
function expA(joint, kit, params, models) { const out = { steps: [], ramps: [] };
  for (const [group, amps] of Object.entries(P.A[joint])) { const sd = sideOf(kit, params, group);
    for (const du of amps) { const uB = kit.u0.slice(), uS = kit.u0.slice(); uS[sd] = Math.min(1, uS[sd] + du); const rec = { group, du, side: sd, targetChange: tauSS(kit, uS) - tauSS(kit, uB), models: {} };
      for (const id of models) { const m = make(id, kit, params), fx = F.makeFixture(m, kit), y = [], act = [], fst = []; fx.init(uB, cmdOf(id, kit, uB));
        const sched = (n) => (n < P.settle ? uB : n < P.settle + P.hold ? uS : uB);
        for (let n = 0; n < P.settle + 2 * P.hold; n++) { const t = fx.step({ phi: 0 }, { u: sched(n + 1), cmd: cmdOf(id, kit, sched(n + 1)) }); y.push(t.tau); act.push(m.a ? m.a[sd] : null); fst.push(m.f ? m.f[sd] : null); }
        // y[n] = torque applied in iteration n with the plan built from sched(n): the new excitation first acts at y[settle]; y[settle − 1] is the
        // last unaffected sample (t = 0) and y[settle + i − 1] covers (i − 1)·dt … i·dt after the change
        const i0 = P.settle - 1, upY = y.slice(i0, i0 + P.hold + 1), dnY = y.slice(i0 + P.hold, i0 + 2 * P.hold + 1);
        rec.models[id] = { up: F.timing(upY, upY[0], upY[upY.length - 1], dt), down: F.timing(dnY, dnY[0], dnY[dnY.length - 1], dt), steadyUp: r6(upY[upY.length - 1]), steadyBase: r6(upY[0]),
          trace: { tau: y.slice(i0, i0 + 2 * P.hold + 1).filter((_, i) => i % 2 === 0).map(r6), a: act.slice(i0, i0 + 2 * P.hold + 1).filter((_, i) => i % 2 === 0).map(r6), f: fst.slice(i0, i0 + 2 * P.hold + 1).filter((_, i) => i % 2 === 0).map(r6) } }; }
      out.steps.push(rec); } }
  // moderate ramps (first agonist group): 200 ms up, hold, 200 ms down
  const group = Object.keys(P.A[joint])[0], sd = sideOf(kit, params, group), uB = kit.u0.slice(), uT = kit.u0.slice(); uT[sd] += P.A.rampDu; const rec = { group, du: P.A.rampDu, models: {} };
  for (const id of models) { const m = make(id, kit, params), fx = F.makeFixture(m, kit), y = [], cmd = []; fx.init(uB, cmdOf(id, kit, uB));
    const uAt = (n) => { const r = n < P.settle ? 0 : n < P.settle + P.rampSteps ? (n - P.settle) / P.rampSteps : n < P.settle + P.rampSteps + P.hold ? 1 : n < P.settle + 2 * P.rampSteps + P.hold ? 1 - (n - P.settle - P.rampSteps - P.hold) / P.rampSteps : 0; const u = uB.slice(); u[sd] = uB[sd] + r * P.A.rampDu; return u; };
    const N = P.settle + 2 * P.rampSteps + 2 * P.hold; for (let n = 0; n < N; n++) { const t = fx.step({ phi: 0 }, { u: uAt(n + 1), cmd: cmdOf(id, kit, uAt(n + 1)) }); y.push(t.tau); cmd.push(tauSS(kit, uAt(n + 1))); }
    const i0 = P.settle - 1, y0 = y[i0], y1 = tauSS(kit, uT), seg = y.slice(i0, i0 + P.rampSteps + P.hold), d = y1 - y0, half = (arr, c) => { for (let i = 0; i < arr.length; i++) if ((arr[i] - y0) / d >= 0.5) return i * dt * 1000; return null; };
    let over = 0; for (const v of seg) over = Math.max(over, (v - y0) / d - 1); let m6 = 0; for (let i = i0 + 6; i < N; i++) m6 = Math.max(m6, Math.abs(y[i] - y[i - 6]) / (6 * dt));
    rec.models[id] = { lagAt50ms: half(seg) - half(cmd.slice(i0, i0 + P.rampSteps + P.hold)), overshootFrac: over, finalErrFrac: Math.abs((y[i0 + P.rampSteps + P.hold - 1] - y1) / d), endErrFrac: Math.abs((y[N - 1] - y0) / d), max25msSlew: m6, commandedSlew: Math.abs(d) / (P.rampSteps * dt),
      trace: y.slice(i0, N).filter((_, i) => i % 2 === 0).map(r6), command: cmd.slice(i0, N).filter((_, i) => i % 2 === 0).map(r6) }; }
  out.ramps.push(rec); return out; }
// ── B: external stretch with constant excitation ──
function stretchRun(id, kit, params, phiOf, nSteps, releaseAt, sampleEvery = 1) { const m = make(id, kit, params), fx = F.makeFixture(m, kit), u = kit.u0, tone = kit.tone, cmd = (phi) => (id === "V2ENV" ? { tau0: tone.bias - tone.K * phi, K: tone.K, D: tone.D } : null);
  fx.init(u, cmd(0)); const S = { tau: [], el: [], act: [], pas: [], phi: [], w: [], sat: 0, ledger: [] }; let tauOp = null, minLedger = null;
  for (let n = 0; n < nSteps; n++) { const rel = releaseAt != null && n >= releaseAt; const kin = rel ? { release: { load: -tauOp, I: kit.I } } : { phi: phiOf(n + 1) };
    if (n === P.settle && !rel) { const r = m.row, wE = (phiOf(n + 1) - fx.st.phi) / dt; S.firstRequest = -(r.D + dt * (r.Ktot ?? r.K)) * wE; }
    const t = fx.step(kin, { u, cmd: cmd(fx.st.phi) }); if (n === P.settle - 2) tauOp = t.tau; S.tau.push(t.tau); S.el.push(t.elastic); S.act.push(t.active); S.pas.push(t.passive); S.phi.push(fx.st.phi); S.w.push(t.w); S.sat += t.sat;
    if (n === P.settle - 1) minLedger = fx.ledger(); }
  S.ledgerEnd = id === "V2ENV" ? null : fx.ledger(); S.tauOp = tauOp; S.model = m; return S; }
function expB(joint, kit, params, models) { const out = { series: {}, hold: {}, release: {}, shortening: {}, contributions: {} }, sg = kit.s, B = P.B, s0 = P.settle;
  const ramp = (amp, from = s0, len = B.ramp) => (n) => (n <= from ? 0 : n >= from + len ? amp : amp * (n - from) / len);
  for (const id of models) { if (id === "V2ENV" && !kit.tone) continue; out.series[id] = [];
    for (const A of B.amps) { const phiA = sg * A, S = stretchRun(id, kit, params, ramp(phiA), s0 + 30), pre = S.tau[s0 - 1], at = (m) => S.tau[s0 - 1 + m] - pre, deg = A * R2D;
      out.series[id].push({ ampRad: A, ampDeg: deg, Kend: Math.abs(at(B.ramp)) / A, KendMghLeg: Math.abs(at(B.ramp)) / A / B.mghLeg, vluttersRatio: Math.abs(at(B.ramp)) / A / B.mghLeg / vlutters(deg), K71: Math.abs(at(17)) / A, sakanakaRatio: Math.abs(at(17)) / A / B.mghLeg / sakanaka(deg) }); }
    out.hold[id] = {}; out.contributions[id] = {};
    for (const [lab, A] of [["small", B.small], ["moderate", B.moderate]]) { const phiA = sg * A, N = s0 + B.ramp + B.holdSteps + B.ramp + B.after;
      const phiOf = (n) => (n <= s0 + B.ramp + B.holdSteps ? ramp(phiA)(n) : phiA - ramp(phiA, s0 + B.ramp + B.holdSteps)(n)), S = stretchRun(id, kit, params, phiOf, N);
      const pre = S.tau[s0 - 1], preE = S.el[s0], iEnd = s0 - 1 + B.ramp, iEl = s0 + B.ramp, dE0 = S.el[iEl] - preE;
      // the intrinsic (unclipped) first-tick response of the same model: −(D + dt·K_tot)·ω_end with the plan-time K and D (S.first, recorded in stretchRun)
      const first = S.tau[s0] - pre, firstExpected = S.firstRequest;
      // energy: absorbed during the stretch ramp, at end of hold, and over the whole cycle (ledger)
      const frac = Object.fromEntries(B.readMs.map(ms => [ms, (S.el[iEl + Math.round(ms * 0.24)] - preE) / dE0]));
      out.hold[id][lab] = { ampRad: A, firstTickTorque: first, firstTickExpected: firstExpected, firstTickRatio: first / firstExpected, endRampTorque: S.tau[iEnd] - pre, holdFraction: frac, ledger: S.ledgerEnd, satSteps: S.sat,
        trace: { tau: S.tau.slice(s0 - 6).filter((_, i) => i % 2 === 0).map(r6), el: S.el.slice(s0 - 6).filter((_, i) => i % 2 === 0).map(r6), phi: S.phi.slice(s0 - 6).filter((_, i) => i % 2 === 0).map(r6) } };
      out.contributions[id][lab] = { forceLength: S.act[iEl] - S.act[s0], strain: S.el[iEl] - preE, passive: S.pas[iEl] - S.pas[s0], satSteps: S.sat }; }
    // C1-protocol eccentric hold (the protocol S2's C1 bands were defined on): fraction of the end-of-stretch strain torque remaining at 100 / 300 / 1000 ms
    // S.el[n] is the strain torque of the plan applied in iteration n (built after iteration n − 1): the plan after the last ramp step is S.el[s0 + ramp]
    { const E = B.ecc, phiA = sg * E.amp, S = stretchRun(id, kit, params, ramp(phiA, s0, E.ramp), s0 + E.ramp + E.holdSteps + 2), q0 = s0 + E.ramp, preE = S.el[s0], e0 = S.el[q0] - preE;
      if (id !== "V2ENV") out.ecc = { ...(out.ecc || {}), [id]: { ampRad: E.amp, endOfStretchNm: e0, fraction: Object.fromEntries(E.readMs.map(ms => [ms, (S.el[q0 + Math.round(ms * 0.24)] - preE) / e0])) } }; }
    // quick release to the operating load after a moderate stretch held 1 s
    { const A = B.moderate, phiA = sg * A, relAt = s0 + B.ramp + B.holdSteps, S = stretchRun(id, kit, params, ramp(phiA), relAt + B.release, relAt), ph = S.phi.slice(relAt - 1);
      // oscillation: the largest |ω| in each half-cycle (between sign changes of ω) — robust to the slow equilibrium drift of the relaxing arms
      const wv = S.w.slice(relAt), half = []; let cur = 0, sgn = Math.sign(wv[0]); for (const v of wv) { if (Math.sign(v) !== sgn && Math.sign(v) !== 0) { half.push(cur); cur = 0; sgn = Math.sign(v); } cur = Math.max(cur, Math.abs(v)); } half.push(cur);
      const sig = half.filter(h => h > 1e-3).slice(0, 6), tailW = S.w.slice(-60).map(Math.abs);
      out.release[id] = { firstTickW: S.w[relAt], recoilTowardReturn: Math.sign(S.w[relAt]) === -Math.sign(phiA), halfCyclePeakW: sig.map(r6), nonGrowing: sig.every((p, i) => i === 0 || p <= sig[0]), tailMaxAbsW: Math.max(...tailW), finalOffsetFrac: ph[ph.length - 1] / phiA, ledger: S.ledgerEnd,
        trace: { phi: ph.filter((_, i) => i % 2 === 0).map(r6), tau: S.tau.slice(relAt - 1).filter((_, i) => i % 2 === 0).map(r6) } }; }
    // shortening of the loaded group (reported)
    out.shortening[id] = [B.small, B.moderate].map(A => { const S = stretchRun(id, kit, params, ramp(-sg * A), s0 + 30), pre = S.tau[s0 - 1]; return { ampRad: A, Kend: Math.abs(S.tau[s0 - 1 + B.ramp] - pre) / A }; }); }
  return out; }
// ── BC: C history / energy audit ──
function expBC(joint, kit, params, models) { const out = {}, C = P.BC, s0 = P.settle, sg = kit.s, sd = sideOf(kit, params, P.stretchGroup[joint]);
  for (const id of models.filter(x => x !== "V2ENV")) { out[id] = {};
    { // BC1: stretch, raise the loaded group's excitation during the hold, return, restore excitation — work the strain element absorbs vs returns
      const m = make(id, kit, params), fx = F.makeFixture(m, kit), uB = kit.u0.slice(), uH = kit.u0.slice(); uH[sd] += C.du; fx.init(uB); const phiA = sg * C.amp;
      const t1 = s0 + C.ramp, t2 = t1 + C.hold1, t3 = t2 + C.hold2, t4 = t3 + C.ramp, t5 = t4 + C.hold3, N = t5 + C.tail;
      const phiOf = (n) => (n <= s0 ? 0 : n <= t1 ? phiA * (n - s0) / C.ramp : n <= t3 ? phiA : n <= t4 ? phiA * (1 - (n - t3) / C.ramp) : 0), uOf = (n) => (n > t2 && n <= t5 ? uH : uB);
      let elIn = 0, elOut = 0, elHold = 0; const el = [];
      for (let n = 0; n < N; n++) { const before = fx.led.element; fx.step({ phi: phiOf(n + 1) }, { u: uOf(n + 1) }); const dW = fx.led.element - before; el.push(m.row.tauE); if (n < t1) elIn += dW; else if (n < t3) elHold += dW; else if (n < t4) elOut += -dW; }
      out[id].BC1 = { elementAbsorbedStretch: elIn, elementAbsorbedHold: elHold, elementReturnedOnReturn: elOut, returnOverInput: elOut / elIn, createdByStiffnessChange: m.created || 0, ledger: fx.ledger(), trace: el.slice(s0 - 6).filter((_, i) => i % 4 === 0).map(r6) }; }
    { // BC2: deactivation memory — stretch at a raised excitation, excitation to zero for 0.5 s, back on: strain force before vs after
      const m = make(id, kit, params), fx = F.makeFixture(m, kit), uH = kit.u0.slice(); uH[sd] += C.du; const uZ = [0, 0], phiA = sg * C.amp; fx.init(uH);
      const t1 = s0 + C.ramp, t2 = t1 + C.mem.pre, t3 = t2 + C.mem.off, N = t3 + C.mem.on, el = [];
      for (let n = 0; n < N; n++) { fx.step({ phi: n + 1 <= s0 ? 0 : n + 1 <= t1 ? phiA * (n + 1 - s0) / C.ramp : phiA }, { u: n + 1 > t2 && n + 1 <= t3 ? uZ : uH }); el.push(m.row.tauE); }
      const before = el[t2 - 1], after = el[N - 1]; out[id].BC2 = { strainTorqueBefore: before, strainTorqueAfterReactivation: after, ratio: Math.abs(after / before), trace: el.slice(s0 - 6).filter((_, i) => i % 4 === 0).map(r6) }; } }
  return out; }
// ── C: open-loop replay of PPR-3 P2 commands and kinematics ──
function expC(joint, kits, params, models, capDir) { const out = { runs: {}, validation: {} }, C = P.C, axes = P.axes[joint], load = (r) => JSON.parse(zlib.gunzipSync(fs.readFileSync(`${capDir}/${r}.json.gz`)));
  const replay = (cap, name, id) => { const kit = kits[name], R = cap.axes[name].rows, Fi = Object.fromEntries(cap.fields.map((f, i) => [f, i])), N = Math.min(R.length - 1, C.onset + C.window + 6);
    const s2 = new M.V2ActAxis(kit), m = id === "V2ACT" ? s2 : make(id, kit, params), rows = []; s2.plan({ anat: kit.anat0, w: 0, kneeDeg: kit.kneeDeg0, u: kit.u0 }, true); if (m !== s2 && id !== "V2ENV") m.plan({ anat: kit.anat0, w: 0, kneeDeg: kit.kneeDeg0, u: kit.u0 }, true);
    let envReady = false, uErr = 0, tauErr = 0;
    for (let q = 0; q < N; q++) { const wEnd = R[q][Fi.w], tS = s2.torque(wEnd); let t = tS;
      if (id === "V2ENV") { if (envReady) { t = m.torque(wEnd); t.active = t.tau - (s2.row.tauE + s2.row.tauP - (s2.row.D + kit.dt * s2.row.Ktot) * wEnd); } } else if (m !== s2) t = m.torque(wEnd);
      if (q >= C.warm && id === "V2ACT") tauErr = Math.max(tauErr, Math.abs(tS.tau - R[q][Fi.tauApplied]));
      rows.push({ tau: t.tau, active: t.active, elastic: t.elastic, passive: t.passive, damping: t.damping, clamp: t.clamp, cmd: R[q][Fi.dTauP2], tgt: R[q][Fi.tgt] });
      const inp = { anat: R[q][Fi.anat], w: R[q][Fi.w], kneeDeg: R[q][Fi.kneeDeg], dTau: R[q][Fi.dTauP2] }; s2.after(R[q][Fi.e]); s2.plan(inp);
      if (q >= C.warm) uErr = Math.max(uErr, Math.abs(s2.row.u[0] - R[q][Fi.uP]), Math.abs(s2.row.u[1] - R[q][Fi.uM]));
      if (id === "V2ENV") { m.plan(inp, { tau0: R[q][Fi.tgt] + s2.row.tauE + s2.row.tauP, K: s2.row.Ktot, D: s2.row.D }); envReady = true; } else if (m !== s2) { m.after(R[q][Fi.e]); m.plan(inp); } }
    return { rows, uErr, tauErr }; };
  const base = load("BASE_undisturbed"), baseRep = {}; for (const id of models) for (const [name] of axes) baseRep[id + name] = replay(base, name, id).rows;
  for (const run of C.runs) { const cap = load(run), res = {}, sum = {};
    for (const id of models) { let rowsL = null; for (const [name] of axes) { const r = replay(cap, name, id); if (id === "V2ACT") out.validation[`${run}:${name}`] = { excitationMaxErr: r.uErr, appliedTorqueMaxErr: r.tauErr };
        const b = baseRep[id + name]; const d = r.rows.map((x, q) => Object.fromEntries(Object.keys(x).map(k => [k, x[k] - b[q][k]]))); rowsL = rowsL ? rowsL.map((x, q) => Object.fromEntries(Object.keys(x).map(k => [k, x[k] + d[q][k]]))) : d; }
      sum[id] = rowsL; }
    const W = (arr, k) => arr.slice(C.onset - 6, C.onset + C.window).map(x => x[k]), slew = (x) => { let m = 0, t = 0; for (let i = 6; i < x.length; i++) { const v = Math.abs(x[i] - x[i - 6]) / (6 * dt); if (v > m) { m = v; t = i; } } return { max: m, tEndMs: (t - 6) / 0.24 }; };
    const peak = (x) => x.reduce((a, v) => (Math.abs(v) > Math.abs(a) ? v : a), 0), t50 = (x) => { const p = peak(x); for (let i = 6; i < x.length; i++) if (Math.abs(x[i]) >= 0.5 * Math.abs(p)) return (i - 6) / 0.24; return null; }, integ = (x, ms) => x.slice(6, 6 + Math.round(ms * 0.24)).reduce((s, v) => s + v * dt, 0);
    const cmd = W(sum.V2ACT || sum[models[0]], "cmd"); res.command = { peak: peak(cmd), slew: slew(cmd), t50ms: t50(cmd), impulse400: integ(cmd, 400) };
    for (const id of models) { const a = W(sum[id], "active"), tt = W(sum[id], "tau"), el = W(sum[id], "elastic"); res[id] = { active: { peak: peak(a), slew: slew(a), t50ms: t50(a), impulse400: integ(a, 400) }, total: { peak: peak(tt), slew: slew(tt), impulse400: integ(tt, 400) }, elastic: { peak: peak(el), slew: slew(el) },
        trace: { active: a.filter((_, i) => i % 2 === 0).map(r6), total: tt.filter((_, i) => i % 2 === 0).map(r6) } }; }
    res.trace = { command: cmd.filter((_, i) => i % 2 === 0).map(r6) }; out.runs[run] = res; }
  return out; }
// ── CPU: per axis-step cost of each model (plan + torque + after) ──
function cpu(kit, params, models) { const out = {}, N = 200000; for (const id of models) { const m = make(id, kit, params), fx = F.makeFixture(m, kit); fx.init(kit.u0, cmdOf(id, kit, kit.u0)); let phi = 0;
    const t0 = performance.now(); for (let n = 0; n < N; n++) { phi = 0.002 * Math.sin(n * 0.05); fx.step({ phi }, { u: kit.u0, cmd: cmdOf(id, kit, kit.u0) }); } out[id] = { usPerAxisStep: (performance.now() - t0) * 1000 / N, stateFloats: m.state().length }; } return out; }
export async function runAll(params, capDir, models, joints) { const allAxes = joints.flatMap(j => P.axes[j]), kits = await KIT.bootKits(allAxes), res = { protocol: P, models, joints: {} };
  for (const j of joints) { const kit = kits[P.axes[j][0][0]]; res.joints[j] = { kit: { name: kit.name, s: kit.s, plus: kit.x.plus.dir, minus: kit.x.minus.dir, u0: kit.u0, cP: kit.cP, cM: kit.cM, I: kit.I, anat0: kit.anat0, tone: kit.tone },
    A: expA(j, kit, params, models), B: expB(j, kit, params, models), BC: expBC(j, kit, params, models), C: capDir ? expC(j, kits, params, models, capDir) : null }; }
  return res; }
if (process.argv[1] && process.argv[1].endsWith("m1_experiments.mjs")) { const params = JSON.parse(fs.readFileSync(arg("params"))), models = arg("models", "V2ENV,V2ACT,M1").split(","), joints = arg("joints", "ankle,knee").split(",");
  const r1 = await runAll(params, arg("capture"), models, joints), r2 = await runAll(params, arg("capture"), models, joints), h = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
  const kits = await KIT.bootKits([P.axes.ankle[0]]); r1.DET = { run1: h(r1.joints), run2: h(r2.joints), identical: h(r1.joints) === h(r2.joints) }; r1.CPU = cpu(kits[P.axes.ankle[0][0]], params, models); r1.params = params;
  fs.writeFileSync(arg("out"), JSON.stringify(r1)); console.log("wrote", arg("out"), "DET", JSON.stringify(r1.DET), "CPU", JSON.stringify(r1.CPU)); }
