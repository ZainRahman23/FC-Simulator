// BALANCE-1 qualification battery (frozen with BALANCE1_PREREGISTRATION.md). Runner alone from the PPR-3 standing entry on the canonical M1b body;
// the controller runs continuously from t = 0 (history = the entry sample). Families (PPR-3 P2 battery definitions; push MAGNITUDES replaced by
// the independently justified human levels of balance1/research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md §19.3.3, scaled to 73.9 kg):
//   U  quiet standing 60 s with motor noise · P pushes (4 directions × small / moderate / limit / over-limit; 50 ms pelvis pulse at t = 2 s; 4 s
//   window) with causal chronology, neural-torque onset, torque slew, coordination, head, load transfer, energy · M Rietdyk-form human-matched
//   pushes (20 N·s over 350 ms, AP and ML) · T no-step thresholds (bisection up to 1.5 × the zero-delay limit) · D determinism · CPU
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node .../b1_qualify.mjs --body <body.json> --ctrl <ctrl.json> --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), MS = await import(RA + "ppr3/scripts/ppr3_measure.mjs");
const { runOne } = await import(new URL("./b1_run.mjs", import.meta.url).href), CT = await import(new URL("./b1_ctrl.mjs", import.meta.url).href);
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, SPEC = PL.SPEC_R(), PELVIS_COM = SPEC.bodies[0].comLocal, R2D = 180 / Math.PI;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const B1B = Object.freeze({
  U: { steps: 14400, auditSteps: 60, swayFrom: 480 }, onset: 480, window: 960, pulse: 12,
  // human push levels (N·s at 73.9 kg; central of each literature band §19.3.3): small 0.25–0.4 T, moderate 0.55–0.75 T, limit ≈ T (informational:
  // about half of young adults step), over-limit 1.3–1.6 T (humans step or fall; a feet-in-place save would exceed human capability)
  J: { fwd: { small: 6.5, moderate: 12.0, limit: 19.5, over: 28.0 }, back: { small: 4.0, moderate: 8.5, limit: 13.5, over: 19.5 }, left: { small: 7.5, moderate: 15.0, limit: 23.0, over: 32.5 }, right: { small: 7.5, moderate: 15.0, limit: 23.0, over: 32.5 } },
  Jsrc: "BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md §19.3.3: small fwd 5–8 / back 3–5 / lateral 6–9; moderate 10–14 / 7–10 / 13–17; limit 16–23 / 11–16 / 20–26; over-limit ≥ 26–30 / ≥ 18–21 / ≥ 30–35 N·s (lateral: hip-width stance, low confidence)",
  Jlim: { fwd: 24.27, back: 29.01, left: 62.22, right: 62.22 }, matched: { J: 20, steps: 84 }, recovery: { dropFallMm: 150, recTolMm: 10 }, threshold: { dirs: ["fwd", "left"], iters: 7, hiFracJlim: 1.5 } });
const jk = (n) => SPEC.joints.findIndex(j => j.name === n), JN = { ankL: jk("ankle_L"), ankR: jk("ankle_R"), kneeL: jk("knee_L"), kneeR: jk("knee_R"), hipL: jk("hip_L"), hipR: jk("hip_R"), lumbar: jk("lumbar"), thoracic: jk("thoracic"), neck: jk("neck") };
const HEAD = SPEC.bodies.findIndex(b => b.name === "head"), THORAX = SPEC.joints[JN.thoracic].childIndex;
// applied constraint torque of an axis in a record (rec.act rows [k, i, τ, …])
const tauOf = (rec, k, i) => { const a = (rec.act || []).find(x => x[0] === k && x[1] === i); return a ? a[2] : 0; };
// BALANCE-1 push metrics over the first second after onset (relative to the undisturbed twin)
export function humanMetrics(base, o, onset, dir) { const A = base.recs, P = o.recs, n = Math.min(A.length, P.length, onset + 240), ax = dir === "fwd" || dir === "back" ? 0 : 2;
  const sumAx = (rec, ks, i) => ks.reduce((s, k) => s + tauOf(rec, k, i), 0), series = (ks, i) => { const out = []; for (let q = onset - 6; q < n; q++) out.push(sumAx(P[q], ks, i) - sumAx(A[q], ks, i)); return out; };
  const slew = (x) => { let m = 0; for (let i = 6; i < x.length; i++) m = Math.max(m, Math.abs(x[i] - x[i - 6]) / 0.025); return m; }, peakAbs = (x) => Math.max(...x.map(Math.abs));
  const ankAP = series([JN.ankL, JN.ankR], 1), ankML = series([JN.ankL, JN.ankR], 2), kneeT = series([JN.kneeL, JN.kneeR], 1), hipAP = series([JN.hipL, JN.hipR], 1), hipML = series([JN.hipL, JN.hipR], 2), lumT = series([JN.lumbar], ax === 0 ? 1 : 2);
  // joint excursions (deg, peak |Δ| vs twin) and their timing
  const th = (rec, k, i) => rec.chars.runner.th[k][i] * R2D, exc = (k, i) => { let m = 0, t = 0; for (let q = onset; q < n; q++) { const d = th(P[q], k, i) - th(A[q], k, i); if (Math.abs(d) > Math.abs(m)) { m = d; t = (q - onset) / 0.24; } } return { deg: +m.toFixed(3), ms: +t.toFixed(0) }; };
  // head stabilisation: peak head angular speed vs thorax angular speed (deg/s), relative to twin
  const wpk = (bi) => { let m = 0; for (let q = onset; q < n; q++) { const w = P[q].S[bi].w, w0 = A[q].S[bi].w; m = Math.max(m, Math.hypot(w[0] - w0[0], w[1] - w0[1], w[2] - w0[2]) * R2D); } return m; };
  // load transfer: per-foot vertical load (N), min and max asymmetry
  let fMin = Infinity, asym = 0; for (let q = onset; q < n; q++) { const L = P[q].chars.runner.feet.L * 240, R = P[q].chars.runner.feet.R * 240; fMin = Math.min(fMin, L, R); asym = Math.max(asym, Math.abs(L - R) / Math.max(1, L + R)); }
  // muscle (actuator) work over the window, positive and negative (J): Σ τ·Δθ per axis from the ledger-equivalent readback
  let Wpos = 0, Wneg = 0; for (let q = onset; q < n; q++) for (const a of P[q].act || []) { const k = a[0], i = a[1], dth = P[q].chars.runner.th[k][i] - (P[q - 1] ? P[q - 1].chars.runner.th[k][i] : P[q].chars.runner.th[k][i]); const W = a[2] * dth; if (W > 0) Wpos += W; else Wneg += W; }
  return { torqueSlew: { ankleAP: slew(ankAP), ankleML: slew(ankML), knee: slew(kneeT), hipAP: slew(hipAP), hipML: slew(hipML), lumbar: slew(lumT) }, torquePeak: { ankleAP: peakAbs(ankAP), ankleML: peakAbs(ankML), knee: peakAbs(kneeT), hipAP: peakAbs(hipAP), hipML: peakAbs(hipML), lumbar: peakAbs(lumT) },
    excursion: { ankle: exc(JN.ankL, ax === 0 ? 1 : 2), knee: exc(JN.kneeL, 1), hip: exc(JN.hipL, ax === 0 ? 1 : 2), lumbar: exc(JN.lumbar, ax === 0 ? 1 : 2), neck: exc(JN.neck, ax === 0 ? 1 : 2) },
    head: { headPeakDegS: wpk(HEAD), thoraxPeakDegS: wpk(THORAX) }, load: { footMinN: fMin, maxAsymmetry: asym }, muscleWork: { positiveJ: Wpos, negativeJ: Wneg } }; }
// first NEURAL torque change by joint family: the developed-force change × the axis's fixed entry capacities (law cols 7 / 8 = f⁺ / f⁻), so the
// instantaneous mechanical force–length change of the drive is excluded — only the delayed neural pathway counts
export function neuralOnset(base, o, onset) { const firstBy = {}, fam = (k) => SPEC.joints[k].name.replace(/_[LR]$/, ""), cap = new Map(((o.entry && o.entry.law0) || []).map(e => [e.k + "_" + e.i, e.capIso]));
  for (let q = onset; q < Math.min(o.recs.length, onset + 120); q++) { const La = base.recs[q].law || [], Lb = o.recs[q].law || []; for (let j = 0; j < La.length; j++) { const a = La[j], b = Lb[j], c = cap.get(a[0] + "_" + a[1]); if (!b || !c) continue; const f = fam(a[0]); if (firstBy[f] != null) continue;
      if (Math.abs((b[7] - a[7]) * c[0] - (b[8] - a[8]) * c[1]) > 0.1) firstBy[f] = +((o.recs[q].n - onset) / 0.24).toFixed(1); } }
  return firstBy; }
// DRY: a pipeline smoke test with meaningless durations and 0.5 N·s pushes (never judged; exercises every code path without revealing battery outcomes)
const DRY = Object.freeze({ ...B1B, U: { steps: 720, auditSteps: 60, swayFrom: 120 }, window: 120, J: Object.fromEntries(Object.keys(B1B.J).map(d => [d, { small: 0.5, moderate: 0.6, limit: 0.7, over: 0.8 }])), threshold: { dirs: ["fwd", "left"], iters: 1, hiFracJlim: 0.02 }, matched: { J: 0.5, steps: 84 } });
export async function qualify(CFG, dry = false) { const B = dry ? DRY : B1B, out = { battery: B, wall: {}, dry }, t = () => Date.now(); let t0;
  const job = (extra) => ({ law: "M1B", params: CFG.body, ctrl: () => new CT.BalanceController(CFG.ctrl), ...extra });
  t0 = t(); const U = await runOne(job({ steps: B.U.steps })), R = U.recs; out.U = { audit: BT.entryAudit(U, B.U.auditSteps), stop: U.stop || null, finalHash: U.finalHash, cpu: U.cpu, wallMs: U.wallMs, steps: R.length, muscleStateFloats: U.muscleState ? U.muscleState.length : null };
  const y0 = R[0].S[0].pos[1], c0 = R[0].chars.runner.com; let fall = null; for (const r of R) { const c = r.chars.runner.com; if (!fall && ((y0 - r.S[0].pos[1]) * 1000 > B.recovery.dropFallMm || Math.hypot(c[0] - c0[0], c[2] - c0[2]) > 0.1)) fall = { t: r.n / 240 }; }
  out.U.fall = fall; out.U.sway = R.length >= B.U.swayFrom + 480 ? BT.sway(U, B.U.swayFrom, R.length) : null;
  // COP on a 100 ms moving average (human COP data low-passed ≈ 5 Hz; PPR-3 COP-velocity convention), RMS about the mean — reported
  if (out.U.sway) { const cp = R.slice(B.U.swayFrom).map((r, q, a) => MS.frame(r, q ? a[q - 1] : null).cop).filter(Boolean), NA = 24, lp = []; for (let q = NA - 1; q < cp.length; q++) { let x = 0, z = 0; for (let j = q - NA + 1; j <= q; j++) { x += cp[j][0]; z += cp[j][1]; } lp.push([x / NA * 1000, z / NA * 1000]); }
    const rms = (v) => { const m = v.reduce((s, x) => s + x, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length); }; out.U.copLowpassRmsMm = { AP: rms(lp.map(p => p[0])), ML: rms(lp.map(p => p[1])) }; }
  if (R.length >= (dry ? 600 : 2400)) { const tail = R.slice(R.length - (dry ? 240 : 2400)), mean = (f, A) => A.reduce((s, r) => s + f(r), 0) / A.length, early = R.slice(240, 480);
    out.U.postureDrift = { maxJointMeanDeg: Math.max(...MS.KEY_AXES.map(([, k, i]) => Math.abs(mean(r => r.chars.runner.th[k][i], tail) - mean(r => r.chars.runner.th[k][i], early)) * R2D)), pelvisMeanDropMm: (mean(r => r.S[0].pos[1], early) - mean(r => r.S[0].pos[1], tail)) * 1000, comMeanShiftMm: Math.hypot(mean(r => r.chars.runner.com[0], tail) - mean(r => r.chars.runner.com[0], early), mean(r => r.chars.runner.com[2], tail) - mean(r => r.chars.runner.com[2], early)) * 1000 }; }
  out.U.sepMax = Math.max(...R.map(r => r.chars.runner.integrity.sepMaxMm)); out.U.penMax = Math.max(...R.map(r => r.chars.runner.integrity.turfPenMm)); out.wall.U = (t() - t0) / 1000;
  t0 = t(); const steps = B.onset + B.window, base = await runOne(job({ steps })), edges = BT.bos(base.recs, B.onset - 6, B.onset); out.P = { edges, runs: {} };
  for (const [dir, mags] of Object.entries(B.J)) for (const [mag, J] of Object.entries(mags)) { const pj = BT.pushJob(dir, J, B.onset, B.pulse), o = await runOne(job({ steps, perturb: pj }));
    const rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery), ch = MS.chronology(base, o, B.onset), m = BT.pushMetrics(base, o, B.onset, Math.min(B.window, 240), dir, edges);
    const ax = dir === "fwd" || dir === "back" ? 0 : 2, trace = []; for (let q = B.onset; q < Math.min(o.recs.length, B.onset + 480); q += 6) trace.push([+((q - B.onset) / 0.24).toFixed(1), +((o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000).toFixed(2)]);
    out.P.runs[dir + "." + mag] = { J, recovery: rec, chronology: ch, neuralTorqueOnsetMsByFamily: neuralOnset(base, o, B.onset), window1s: m, human: humanMetrics(base, o, B.onset, dir), comTrace: trace, stop: o.stop || null, sepMax: Math.max(...o.recs.map(r => r.chars.runner.integrity.sepMaxMm)) }; }
  out.wall.P = (t() - t0) / 1000;
  t0 = t(); out.M = {}; for (const dir of ["fwd", "left"]) { const u = { fwd: [1, 0, 0], left: [0, 0, 1] }[dir], pj = [{ from: B.onset, to: B.onset + B.matched.steps, body: "pelvis", F: V.sc(u, B.matched.J / (B.matched.steps / 240)), pLocal: PELVIS_COM }];
    const o = await runOne(job({ steps, perturb: pj })); out.M[dir] = { recovery: BT.recovery(base, o, B.onset, B.window, edges, B.recovery), chronology: MS.chronology(base, o, B.onset).ms, human: humanMetrics(base, o, B.onset, dir) }; }
  out.wall.M = (t() - t0) / 1000;
  t0 = t(); out.T = {}; for (const dir of B.threshold.dirs) { let lo = 0, hi = B.threshold.hiFracJlim * B.Jlim[dir]; const tried = [];
    for (let it = 0; it < B.threshold.iters; it++) { const J = (lo + hi) / 2, o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, B.onset, B.pulse) })), rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery); tried.push([+J.toFixed(2), !!rec.fall]); if (rec.fall) hi = J; else lo = J; }
    out.T[dir] = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi], fracOfJlim: (lo + hi) / 2 / B.Jlim[dir], tried }; }
  out.wall.T = (t() - t0) / 1000;
  t0 = t(); const d1 = await runOne(job({ steps: 960 })), d2 = await runOne(job({ steps: 960 })), pj = BT.pushJob("fwd", B.J.fwd.moderate, B.onset, B.pulse), d3 = await runOne(job({ steps: 720, perturb: pj })), d4 = await runOne(job({ steps: 720, perturb: pj }));
  out.D = { standing: [d1.finalHash, d2.finalHash], push: [d3.finalHash, d4.finalHash], identical: d1.finalHash === d2.finalHash && d3.finalHash === d4.finalHash }; out.wall.D = (t() - t0) / 1000;
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b1_qualify.mjs")) { const CFG = { body: JSON.parse(fs.readFileSync(arg("body"))), ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))) };
  const Q = await qualify(CFG, process.argv.includes("--dry")); Q.label = arg("label", "BALANCE-1"); Q.params = CFG; fs.writeFileSync(arg("out"), JSON.stringify(Q)); console.log(Q.label, "wall", JSON.stringify(Q.wall)); }
