// ═══ physchar2/tools/slp1_probe.mjs — SLP-1 harness (DIAGNOSTIC PROTOTYPE; default off; nothing else uses it) ═══════════════════════════════════════════════
// Runs ONE preregistered SLP-1 case (review_artifacts/physical_character_v2/slp1/SLP1_PREREGISTRATION.md, frozen 49785b7) on V2-REF and writes its evidence:
// run configuration, schedule / TD / LO events, disturbance and impactor records, the 60 Hz trace (gates/v2_slp.js SLP_TRACE_COLS), per-tick-accumulated metrics
// for the architecture criteria A1–A6, the authoring metrics L, the disturbance window tests (§6.4 cancellation, §6.5 loss continuity), CPU per component, hashes.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/slp1_probe.mjs --speed=walk|jog|run --case=D0|D1|D2|D3|D4|D5|D2c --f=1|2|4 [--lean] --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath, pathToFileURL } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec } from "../gates/v2_e2.js"; import { SLPSim, SLP_TRACE_COLS } from "../gates/v2_slp.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(here, "../../../.."), SLPDIR = path.join(ROOT, "review_artifacts/physical_character_v2/slp1");
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("="), SPEED = arg("speed", "walk"), CASE = arg("case", "D0"), F = +arg("f", 1), OUT = arg("out", ""), LEAN = process.argv.includes("--lean");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
if (!["walk", "jog", "run"].includes(SPEED) || !["D0", "D1", "D2", "D3", "D4", "D5", "D2c"].includes(CASE) || ![1, 2, 4].includes(F)) throw new Error("args");
const derived = JSON.parse(fs.readFileSync(path.join(SLPDIR, "derived.json"), "utf8")), { GAIT } = await import(pathToFileURL(path.join(SLPDIR, "gait_inputs.mjs")).href);
const der = derived.speeds[SPEED], gait = GAIT[SPEED]; if (!der || !der.feasible) throw new Error("speed not derived");
const T = 2 / gait.stepHz, tsw = T - gait.contactS, tg = 0.5, tSteady = tg + gait.rampS + 1, tMin = tg + gait.rampS + 3;
const kfind = (off) => { for (let k = 0; ; k++) { const t = tg + k * T + off; if (t >= tMin - 1e-9) return t; } }, tdPred = CASE === "D0" ? null : CASE === "D4" ? kfind(tsw / 2) : kfind(tsw + gait.contactS / 2);
const seconds = CASE === "D0" ? tg + gait.rampS + 6 : tdPred + 3;
const J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), spec = e2Spec("V2-REF"), t0w = Date.now();
const sim = new SLPSim(J, spec, { seconds, der, gait, f: F, case: CASE }, LEAN ? { probes: false } : {}), S = sim.S, dt = sim.dt, M = sim.M, B = spec.bodies;
// per-tick accumulators
const A = { n: 0, satSteady: 0, nSteady: 0, errSq: 0, errMax: 0, z0: null, t0: null, z1: null, t1: null, legFz: 0, supFy: 0, nLoad: 0, ikMax: [0, 0], ikSum: [0, 0], actSatSum: 0, actSatMax: 0, hmMin: Infinity, dTauMax: 0, nAll: 0,
  vHist: [], devMaxPost: 0, devPost: [], win: null, slip: [[], []], slipCur: [null, null], alphaSeries: [], postEnd: null };
let done = false;
while (!done && sim.tick()) { const L = S.last, t = L.t, pel = sim.st[S.pel], pr = S.traj.pos(t), eh = Math.hypot(pel.com[0] - pr[0], pel.com[2] - pr[2]);
  A.nAll++; A.vHist.push([t, L.v.slice()]); if (A.vHist.length > 120) A.vHist.shift();
  const steady = t >= tSteady - 1e-9 && (tdPred == null || t < tdPred - 1e-9);
  if (steady) { A.nSteady++; if (L.sat) A.satSteady++; A.errSq += eh * eh; A.errMax = Math.max(A.errMax, eh); if (A.z0 == null) { A.z0 = pel.com[2]; A.t0 = t; } A.z1 = pel.com[2]; A.t1 = t;
    if (!LEAN) { A.legFz += L.Fz[0] + L.Fz[1]; A.supFy += L.F[1]; A.nLoad++; } }
  if (t >= tSteady - 1e-9) { for (const n of [0, 1]) { const e = S.drv.legs[n].ikErr; A.ikMax[n] = Math.max(A.ikMax[n], e); A.ikSum[n] += e; } A.actSatSum += L.satAct; A.actSatMax = Math.max(A.actSatMax, L.satAct); A.hmMin = Math.min(A.hmMin, L.hm.m); A.dTauMax = Math.max(A.dTauMax, S.drv.dTau0); }
  // planted-foot slip: sole-centroid horizontal drift during the flat part of each stance (0.2 ≤ u ≤ 0.6)
  for (const n of [0, 1]) { const lg = S.drv.legs[n], p = lg.phase; if (!p || !p.stance || !isFinite(p.tTD)) { if (A.slipCur[n]) { A.slip[n].push(A.slipCur[n]); A.slipCur[n] = null; } continue; }
    const u = (t - p.tTD) / gait.contactS, f = sim.st[sim.ctrl.feet[n]], cW = V.add(f.pos, Q.rot(Q.norm(f.rot), S.drv.sole[n].c));
    if (u >= 0.2 && u <= 0.6) { if (!A.slipCur[n] || A.slipCur[n].tTD !== p.tTD) { if (A.slipCur[n]) A.slip[n].push(A.slipCur[n]); A.slipCur[n] = { tTD: p.tTD, c0: cW.slice(), max: 0 }; } A.slipCur[n].max = Math.max(A.slipCur[n].max, Math.hypot(cW[0] - A.slipCur[n].c0[0], cW[2] - A.slipCur[n].c0[2])); } }
  // disturbance window (§6.4): support impulse and body lateral momentum over [start, start + 0.10 s]; start = pulse start, or the impactor's first contact
  const D = S.dist; if (D) { const start = D.case === "D2c" ? (S.imp && S.imp.contacts.length ? S.imp.contacts[0].t - dt : (D.impactor && D.impactor.firstContactT != null ? D.impactor.firstContactT - dt : null)) : D.td;
    if (start != null && A.win == null && t >= start - 1e-9) A.win = { start, supJx: 0, supJ: [0, 0, 0], vx0: (A.vHist.length > 1 ? A.vHist[A.vHist.length - 2][1][0] : L.v[0]), vx1: null, done: false };
    if (A.win && !A.win.done) { A.win.supJx += L.F[0] * dt; A.win.supJ = V.add(A.win.supJ, V.sc(L.F, dt)); if (t >= A.win.start + 0.10 - 1e-9) { A.win.vx1 = L.v[0]; A.win.done = true; } }
    if (t >= D.td) { A.devMaxPost = Math.max(A.devMaxPost, eh); if (sim.n % 4 === 0) A.devPost.push([+t.toFixed(4), +eh.toFixed(5), +L.alpha.toFixed(5), +L.mhat.toFixed(5)]); } }
  if (S.lossT != null && A.lossChk == null && t >= S.lossT + 0.1 - 1e-9) { const w = A.vHist.filter(([tt]) => tt >= S.lossT - 0.1 - 1e-9 && tt <= S.lossT + 0.1 + 1e-9); let mx = 0; for (let i = 1; i < w.length; i++) mx = Math.max(mx, V.len(V.sub(w[i][1], w[i - 1][1]))); A.lossChk = { lossT: S.lossT, maxPerTickComDvMs: +mx.toFixed(5), authorityWrites: sim.ledger.authorityWrites }; }
  if (!sim.A.finite) done = true; if (S.fallT != null && t >= S.fallT + 2) done = true; }
for (const n of [0, 1]) if (A.slipCur[n]) A.slip[n].push(A.slipCur[n]);
// scheduled stances in the steady window vs the 20 N contact log (A6)
const contacts = [0, 1].map(n => { const ev = S.fz20.ev[n], iv = []; let on = true, s0 = 0; for (const [t, v] of ev) { if (v === 1 && !on) { on = true; s0 = t; } else if (v === 0 && on) { on = false; iv.push([s0, t]); } } if (on) iv.push([s0, sim.n * dt]); return iv; });
const stances = [0, 1].flatMap(n => { const out = [], t0f = tg + (n === 1 ? T / 2 : 0); for (let k = 0; ; k++) { const td = t0f + k * T + tsw, lo = td + gait.contactS; if (td > sim.n * dt) break; if (td >= tSteady && (tdPred == null || lo <= tdPred)) out.push({ n, td, lo, contact: contacts[n].some(([a, b]) => b > td && a < lo), contactS: contacts[n].reduce((s, [a, b]) => s + Math.max(0, Math.min(b, lo) - Math.max(a, td)), 0) }); } return out; });
const contactOutside = [0, 1].map(n => contacts[n].filter(([a, b]) => a >= tSteady && (tdPred == null || b <= tdPred)).reduce((s, [a, b]) => { const sch = stances.filter(x => x.n === n); const inS = sch.reduce((q, x) => q + Math.max(0, Math.min(b, x.lo) - Math.max(a, x.td)), 0); return s + (b - a - inS); }, 0));
const r = (x, k = 4) => (x == null || !isFinite(x) ? x : +x.toFixed(k)), slipAll = [0, 1].map(n => A.slip[n].filter(x => x.tTD >= tSteady && (tdPred == null || x.tTD < tdPred)).map(x => x.max));
const cpuTot = sim.cpu.step + sim.cpu.passive + sim.cpu.measure + sim.cpu2.ctrl + sim.cpu2.act + sim.cpu2.probe, us = (x) => r(x / sim.n * 1000, 2);
const W = A.win, D = S.dist, Jd = D ? (D.case === "D2c" ? (D.impactor ? D.impactor.transferredImpulseNs[0] : null) : D.J) : null;
const out = { generated: "tools/slp1_probe.mjs", prereg: "slp1/SLP1_PREREGISTRATION.md @49785b7", run: { body: "V2-REF", speed: SPEED, case: CASE, fHz: F, lean: LEAN, hz: 1 / dt, seconds, tSteady, tdPred, gait, der: { ...der, springs: undefined, spring: der.springs[F + "Hz"] } },
  endT: r(sim.n * dt, 5), hashEnd: (sim.h >>> 0).toString(16).padStart(8, "0"), hashes: S.hashes, wallS: (Date.now() - t0w) / 1000,
  architecture: { A1_realisedSpeed: A.t1 > A.t0 ? r((A.z1 - A.z0) / (A.t1 - A.t0), 5) : null, A1_target: gait.v, A2_pelvisErrRmsM: A.nSteady ? r(Math.sqrt(A.errSq / A.nSteady), 5) : null, A2_pelvisErrMaxM: r(A.errMax, 5),
    A3_satFraction: A.nSteady ? r(A.satSteady / A.nSteady, 5) : null, A4_alphaMinSteady: null, A4_alphaMinRun: r(S.alphaMin, 6), A4_fallT: S.fallT, A4_fallWhy: S.fallWhy,
    A5: { finite: sim.A.finite, authorityWrites: sim.ledger.authorityWrites, maxCapExcessN: r(S.maxCapExcess, 6), posCorrMaxMm: r(sim.A.inv.pcMaxMm, 3), posCorrAt: sim.A.inv.pcAt, posCorrBody: sim.A.inv.pcBody, energyResidualJ: r(S.res, 4), energySumPosJ: r(S.sumPos, 4),
      ledger: { WactJ: r(sim.ledger.Wact, 3), WsupportJ: r(S.Wsup, 3), WpulseJ: r(S.Wpulse, 3), passiveDampingJ: r(sim.ledger.damping, 3) } },
    A6: { scheduledStances: stances.length, stancesWithContact: stances.filter(x => x.contact).length, missed: stances.filter(x => !x.contact).map(x => ({ foot: "LR"[x.n], td: r(x.td) })) } },
  authoring: { legVsSupportVerticalN: A.nLoad ? { legMean: r(A.legFz / A.nLoad, 2), supportMean: r(A.supFy / A.nLoad, 2), legFraction: r(A.legFz / (A.legFz + A.supFy), 4), weightN: r(M * 9.81, 2) } : null,
    contactPattern: { contactInScheduledStanceFrac: stances.length ? r(stances.reduce((s, x) => s + x.contactS, 0) / stances.reduce((s, x) => s + (x.lo - x.td), 0), 4) : null, contactOutsideStanceS: contactOutside.map(x => r(x, 4)) },
    plantedSlipMm: slipAll.map(a => (a.length ? { n: a.length, max: r(1000 * Math.max(...a), 2), mean: r(1000 * a.reduce((s, x) => s + x, 0) / a.length, 2) } : null)),
    ikResidual: { max: A.ikMax.map(x => +x.toExponential(3)), mean: A.ikSum.map(x => +(x / Math.max(1, A.nAll)).toExponential(3)) }, actSatAxesPerTick: { mean: r(A.actSatSum / Math.max(1, A.nAll), 3), max: A.actSatMax },
    legHardMarginMinDeg: r(A.hmMin, 3), dTau0MaxNm: r(A.dTauMax, 3), tdEvents: S.drv.events.filter(e => e.ev === "TD" && e.t >= tSteady).map(e => e.tdErrMm) },
  disturbance: D ? { case: D.case, td: D.td, point: D.point, local: S.points[D.point].local, impulseNs: D.case === "D2c" ? null : D.J, applied: D.applied || null, impactor: D.impactor || null, vi: D.vi || null,
    footPhaseAtTd: (() => { const ph = [0, 1].map(n => S.sched.phase(n, D.td)); return ph.map(p => (p.stance ? "stance" : "swing")); })(),
    window: W ? { start: r(W.start, 5), supportImpulseNs: W.supJ.map(x => r(x, 4)), cancellationRatio: Jd ? r(-W.supJx / Jd, 4) : null, bodyLatMomentumRatio: Jd && W.vx1 != null ? r(M * (W.vx1 - W.vx0) / Jd, 4) : null } : null,
    peakPelvisDevM: r(A.devMaxPost, 5), postSeries: A.devPost, alphaMin: r(S.alphaMin, 6), disruptT: S.disruptT ?? null, lossT: S.lossT ?? null, lossContinuity: A.lossChk || null, fallT: S.fallT, fallWhy: S.fallWhy } : null,
  cpu: { ticks: sim.n, usPerTick: { joltStep: us(sim.cpu.step), passivePlusApply: us(sim.cpu.passive - S.cpuSupport), supportTargets: us(S.cpuSupport), driver: us(sim.cpu2.ctrl), actuators: us(sim.cpu2.act), probes: us(sim.cpu2.probe), measurement: us(sim.cpu.measure), total: us(cpuTot) } },
  events: S.drv.events, fz20: S.fz20.ev, traceCols: SLP_TRACE_COLS, trace: S.trace };
const steadyRows = S.trace.filter(x => x[0] >= tSteady && (tdPred == null || x[0] < tdPred)); out.architecture.A4_alphaMinSteady = steadyRows.length ? r(Math.min(...steadyRows.map(x => x[1])), 6) : null;
if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
const a = out.architecture; console.log(`SLP-1 ${SPEED} ${CASE} f=${F}${LEAN ? " lean" : ""}: end ${out.endT}s hash ${out.hashEnd} | A1 v ${a.A1_realisedSpeed}/${gait.v} A2 rms ${a.A2_pelvisErrRmsM} max ${a.A2_pelvisErrMaxM} A3 sat ${a.A3_satFraction} A4 αmin ${a.A4_alphaMinSteady} fall ${a.A4_fallT} A5 Σ+ ${a.A5.energySumPosJ} pc ${a.A5.posCorrMaxMm} A6 ${a.A6.stancesWithContact}/${a.A6.scheduledStances}${D ? ` | dist αmin ${out.disturbance.alphaMin} loss ${out.disturbance.lossT} fall ${out.disturbance.fallT} cancel ${out.disturbance.window && out.disturbance.window.cancellationRatio}` : ""} | ${out.cpu.usPerTick.total} µs/tick, wall ${out.wallS}s`);
sim.w.destroy();
