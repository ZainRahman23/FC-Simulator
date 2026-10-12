// BALANCE-2 matched qualification battery (B2M; frozen with BALANCE2_MATCHED_CRITERIA.md). The BALANCE-1 battery structure and measurement code,
// unchanged (b1_qualify.mjs humanMetrics / neuralOnset, ppr3 battery recovery / bos / pushMetrics / chronology), with:
//   - AP push magnitudes MATCHED to the fixture (literature §4: duration-corrected "try not to step" fraction × the body's own zero-delay limit at
//     the BALANCE-1 battery support edge, 50 ms factor 1.081); lateral magnitudes unchanged from BALANCE-1;
//   - M1′: the forward Rietdyk A-P pelvis push (thesis Ch. 3: 19.7 N·s over 367 ms, recovered, a lower bound) at its matched fraction over 88 steps;
//     the ML M1 push unchanged (20 N·s over 84 steps);
//   - thresholds in all four directions (frozen bisection: 7 steps over [0, 1.5 × the BALANCE-1 zero-delay limit]);
//   - per push: the COM overshoot fraction (opposite-direction excursion after the peak / the peak), and near-limit effort (reported).
// The controller module is a parameter (BALANCE-1's b1_ctrl.mjs for the historical system; a successor for BALANCE-2). PVP is sealed (SOLO only).
// usage (worktree root): node .../b2_qualify.mjs --body <json> --ctrl <json> [--ctrlModule <path> --ctrlClass <name>] --label <id> --out <json> [--dry]
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), MS = await import(RA + "ppr3/scripts/ppr3_measure.mjs");
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), Q1 = await import(RA + "balance1/scripts/b1_qualify.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, SPEC = PL.SPEC_R(), PELVIS_COM = SPEC.bodies[0].comLocal;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
// matched AP levels [E] (BALANCE2_MATCHED_CRITERIA.md §2): T = f_c · m · ω0 · d · 1.081, f_c = 0.57, m = 73.91 kg, ω0 = 3.1640 s⁻¹ (settled COM height
// 0.97997 m), d = the settled entry's BALANCE-1 battery margins (fwd 0.10295 m, back 0.12476 m); levels small 0.325 T, moderate 0.65 T, limit T, over 1.45 T
const T_FWD = 14.83, T_BACK = 17.98, LV = { small: 0.325, moderate: 0.65, limit: 1.0, over: 1.45 }, r2 = (x) => Math.round(x * 100) / 100;
export const B2M = Object.freeze({
  U: { steps: 14400, auditSteps: 60, swayFrom: 480 }, onset: 480, window: 960, pulse: 12,
  J: { fwd: Object.fromEntries(Object.entries(LV).map(([k, f]) => [k, r2(f * T_FWD)])), back: Object.fromEntries(Object.entries(LV).map(([k, f]) => [k, r2(f * T_BACK)])),
    left: { small: 7.5, moderate: 15.0, limit: 23.0, over: 32.5 }, right: { small: 7.5, moderate: 15.0, limit: 23.0, over: 32.5 } },
  Tmatched: { fwd: T_FWD, back: T_BACK }, Jsrc: "BALANCE2_MATCHED_CRITERIA.md §2 (AP matched; lateral = BALANCE-1 §19.3.3, hip-width human, low confidence)",
  Jlim: { fwd: 24.27, back: 29.01, left: 62.22, right: 62.22 }, matched: { fwd: { J: 10.58, steps: 88 }, left: { J: 20, steps: 84 } }, recovery: { dropFallMm: 150, recTolMm: 10 },
  threshold: { dirs: ["fwd", "back", "left", "right"], iters: 7, hiFracJlim: 1.5 } });
const DRY = Object.freeze({ ...B2M, U: { steps: 720, auditSteps: 60, swayFrom: 120 }, window: 120, J: Object.fromEntries(Object.keys(B2M.J).map(d => [d, { small: 0.5, moderate: 0.6, limit: 0.7, over: 0.8 }])), threshold: { dirs: ["fwd", "back", "left", "right"], iters: 1, hiFracJlim: 0.02 }, matched: { fwd: { J: 0.5, steps: 88 }, left: { J: 0.5, steps: 84 } } });
// COM overshoot: after the peak excursion in the push direction, the largest excursion past the twin in the opposite direction, as a fraction of the peak
export function overshoot(base, o, onset, T, dir) { const ax = dir === "fwd" || dir === "back" ? 0 : 2, sg = dir === "fwd" || dir === "left" ? 1 : -1, n = Math.min(base.recs.length, o.recs.length, onset + T);
  let pk = 0, ipk = onset; for (let q = onset; q < n; q++) { const d = sg * (o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]); if (d > pk) { pk = d; ipk = q; } }
  let mn = 0; for (let q = ipk; q < n; q++) mn = Math.min(mn, sg * (o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax])); return { peakMm: pk * 1000, oppositeMm: -mn * 1000, frac: pk > 0 ? -mn / pk : 0 }; }
// near-limit effort (reported): peak activation of the sagittal / frontal support muscles, heel / forefoot lift, corrective hip and ankle torque
function effort(base, o, onset, T) { const n = Math.min(base.recs.length, o.recs.length, onset + T), jk = (nm) => SPEC.joints.findIndex(j => j.name === nm); let aMax = 0, hip = 0, ank = 0;
  const ax = [[jk("ankle_L"), 1], [jk("ankle_R"), 1], [jk("hip_L"), 1], [jk("hip_R"), 1], [jk("hip_L"), 2], [jk("hip_R"), 2], [jk("lumbar"), 1]];
  for (let q = onset; q < n; q++) { const L = o.recs[q].law || []; for (const [k, i] of ax) { const r = L.find(x => x[0] === k && x[1] === i); if (r) aMax = Math.max(aMax, r[5], r[6]); }
    const t = (rec, k, i) => { const a = (rec.act || []).find(x => x[0] === k && x[1] === i); return (a ? a[2] : 0) + rec.passive[k][i]; };
    hip = Math.max(hip, Math.abs(t(o.recs[q], jk("hip_L"), 1) + t(o.recs[q], jk("hip_R"), 1) - t(base.recs[q], jk("hip_L"), 1) - t(base.recs[q], jk("hip_R"), 1)));
    ank = Math.max(ank, Math.abs(t(o.recs[q], jk("ankle_L"), 1) + t(o.recs[q], jk("ankle_R"), 1) - t(base.recs[q], jk("ankle_L"), 1) - t(base.recs[q], jk("ankle_R"), 1))); }
  return { peakSupportActivation: aMax, peakHipSagittalDeltaNm: hip, peakAnkleSagittalDeltaNm: ank }; }
export async function qualify(CFG, dry = false) { const B = dry ? DRY : B2M, out = { battery: B, wall: {}, dry }, t = () => Date.now(); let t0;
  const CM = await import(CFG.ctrlModule || (RA + "balance1/scripts/b1_ctrl.mjs")), Ctrl = CM[CFG.ctrlClass || "BalanceController"], fixtureObj = CFG.entryObj || undefined;
  const job = (extra) => ({ law: "M1B", params: CFG.body, ctrl: () => new Ctrl(CFG.ctrl), fixtureObj, ...extra });
  t0 = t(); const U = await runOne(job({ steps: B.U.steps })), R = U.recs; out.U = { audit: BT.entryAudit(U, B.U.auditSteps), stop: U.stop || null, finalHash: U.finalHash, cpu: U.cpu, wallMs: U.wallMs, steps: R.length, muscleStateFloats: U.muscleState ? U.muscleState.length : null };
  const y0 = R[0].S[0].pos[1], c0 = R[0].chars.runner.com; let fall = null; for (const r of R) { const c = r.chars.runner.com; if (!fall && ((y0 - r.S[0].pos[1]) * 1000 > B.recovery.dropFallMm || Math.hypot(c[0] - c0[0], c[2] - c0[2]) > 0.1)) fall = { t: r.n / 240 }; }
  out.U.fall = fall; out.U.sway = R.length >= B.U.swayFrom + 480 ? BT.sway(U, B.U.swayFrom, R.length) : null;
  if (out.U.sway) { const cp = R.slice(B.U.swayFrom).map((r, q, a) => MS.frame(r, q ? a[q - 1] : null).cop).filter(Boolean), NA = 24, lp = []; for (let q = NA - 1; q < cp.length; q++) { let x = 0, z = 0; for (let j = q - NA + 1; j <= q; j++) { x += cp[j][0]; z += cp[j][1]; } lp.push([x / NA * 1000, z / NA * 1000]); }
    const rms = (v) => { const m = v.reduce((s, x) => s + x, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); }; out.U.copLowpassRmsMm = { AP: rms(lp.map(p => p[0])), ML: rms(lp.map(p => p[1])) }; }
  if (R.length >= (dry ? 600 : 2400)) { const tail = R.slice(R.length - (dry ? 240 : 2400)), mean = (f, A) => A.reduce((s, r) => s + f(r), 0) / A.length, early = R.slice(240, 480), R2D = 180 / Math.PI;
    out.U.postureDrift = { maxJointMeanDeg: Math.max(...MS.KEY_AXES.map(([, k, i]) => Math.abs(mean(r => r.chars.runner.th[k][i], tail) - mean(r => r.chars.runner.th[k][i], early)) * R2D)), pelvisMeanDropMm: (mean(r => r.S[0].pos[1], early) - mean(r => r.S[0].pos[1], tail)) * 1000, comMeanShiftMm: Math.hypot(mean(r => r.chars.runner.com[0], tail) - mean(r => r.chars.runner.com[0], early), mean(r => r.chars.runner.com[2], tail) - mean(r => r.chars.runner.com[2], early)) * 1000 }; }
  out.U.sepMax = Math.max(...R.map(r => r.chars.runner.integrity.sepMaxMm)); out.U.penMax = Math.max(...R.map(r => r.chars.runner.integrity.turfPenMm)); out.wall.U = (t() - t0) / 1000;
  t0 = t(); const steps = B.onset + B.window, base = await runOne(job({ steps })), edges = BT.bos(base.recs, B.onset - 6, B.onset); out.P = { edges, runs: {} };
  for (const [dir, mags] of Object.entries(B.J)) for (const [mag, J] of Object.entries(mags)) { const pj = BT.pushJob(dir, J, B.onset, B.pulse), o = await runOne(job({ steps, perturb: pj }));
    const rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery), ch = MS.chronology(base, o, B.onset), m = BT.pushMetrics(base, o, B.onset, Math.min(B.window, 240), dir, edges);
    const ax = dir === "fwd" || dir === "back" ? 0 : 2, trace = []; for (let q = B.onset; q < Math.min(o.recs.length, B.onset + 480); q += 6) trace.push([+((q - B.onset) / 0.24).toFixed(1), +((o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000).toFixed(2)]);
    out.P.runs[dir + "." + mag] = { J, recovery: rec, chronology: ch, neuralTorqueOnsetMsByFamily: Q1.neuralOnset(base, o, B.onset), window1s: m, human: Q1.humanMetrics(base, o, B.onset, dir), overshoot: rec.fall ? null : overshoot(base, o, B.onset, B.window, dir), effort: effort(base, o, B.onset, B.window), comTrace: trace, stop: o.stop || null, sepMax: Math.max(...o.recs.map(r => r.chars.runner.integrity.sepMaxMm)), hash: o.finalHash }; }
  out.wall.P = (t() - t0) / 1000;
  t0 = t(); out.M = {}; for (const dir of ["fwd", "left"]) { const u = { fwd: [1, 0, 0], left: [0, 0, 1] }[dir], mm = B.matched[dir], pj = [{ from: B.onset, to: B.onset + mm.steps, body: "pelvis", F: V.sc(u, mm.J / (mm.steps / 240)), pLocal: PELVIS_COM }];
    const o = await runOne(job({ steps, perturb: pj })); out.M[dir] = { J: mm.J, steps: mm.steps, recovery: BT.recovery(base, o, B.onset, B.window, edges, B.recovery), chronology: MS.chronology(base, o, B.onset).ms, human: Q1.humanMetrics(base, o, B.onset, dir) }; }
  out.wall.M = (t() - t0) / 1000;
  t0 = t(); out.T = {}; for (const dir of B.threshold.dirs) { let lo = 0, hi = B.threshold.hiFracJlim * B.Jlim[dir]; const tried = [];
    for (let it = 0; it < B.threshold.iters; it++) { const J = (lo + hi) / 2, o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, B.onset, B.pulse) })), rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery); tried.push([+J.toFixed(2), !!rec.fall]); if (rec.fall) hi = J; else lo = J; }
    out.T[dir] = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi], fracOfJlim: (lo + hi) / 2 / B.Jlim[dir], tried }; }
  out.wall.T = (t() - t0) / 1000;
  t0 = t(); const d1 = await runOne(job({ steps: 960 })), d2 = await runOne(job({ steps: 960 })), pj = BT.pushJob("fwd", B.J.fwd.moderate, B.onset, B.pulse), d3 = await runOne(job({ steps: 720, perturb: pj })), d4 = await runOne(job({ steps: 720, perturb: pj }));
  out.D = { standing: [d1.finalHash, d2.finalHash], push: [d3.finalHash, d4.finalHash], identical: d1.finalHash === d2.finalHash && d3.finalHash === d4.finalHash }; out.wall.D = (t() - t0) / 1000;
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b2_qualify.mjs")) { const CFG = { body: JSON.parse(fs.readFileSync(arg("body"))), ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: arg("ctrlModule") ? new URL(arg("ctrlModule"), "file://" + process.cwd() + "/").href : undefined, ctrlClass: arg("ctrlClass") };
  const Q = await qualify(CFG, process.argv.includes("--dry")); Q.label = arg("label", "B2M"); Q.params = { body: CFG.body, ctrl: CFG.ctrl, ctrlModule: arg("ctrlModule") || "balance1/scripts/b1_ctrl.mjs", ctrlClass: CFG.ctrlClass || "BalanceController" }; fs.writeFileSync(arg("out"), JSON.stringify(Q)); console.log(Q.label, "wall", JSON.stringify(Q.wall)); }
