// PPR-3 S2 + P2 qualification (frozen with PPR3_P2_PREREGISTRATION.md). Runner alone from the PPR-3 standing entry; P2 runs continuously from
// t = 0 (history = the entry sample). Families: U undisturbed standing (60 s, motor noise) · P pushes (4 directions × small / moderate / large,
// onset t = 2 s, 4 s window) with causal chronology and the S2-replay twin (same commands as the undisturbed run → mechanics only) · M human-matched
// pushes (Rietdyk 1999 form: 20 N·s over 350 ms, AP and ML) · T no-step failure thresholds (bisection) · D determinism · CPU.
// usage: V2_KNEE_MODEL=v2k node ppr3_p2_qualify.mjs --body <S2.json> --ctrl <P2.json> --label <id> --out <json>
import fs from "fs";
const BT = await import(new URL("./ppr3_battery.mjs", import.meta.url).href), MS = await import(new URL("./ppr3_measure.mjs", import.meta.url).href), { runOne } = await import(new URL("./ppr3_run.mjs", import.meta.url).href);
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V } = PL, PELVIS_COM = PL.SPEC_R().bodies[0].comLocal;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const P2B = Object.freeze({
  U: { steps: 14400, auditSteps: 60, swayFrom: 480 },                                     // 60 s; sway measured from 2 s
  onset: 480, window: 960, pulse: 12,                                                     // pushes at 2.0 s, judged over 4.0 s
  J: { fwd: { small: 6.1, moderate: 9.7, large: 36.4 }, back: { small: 7.3, moderate: 11.6, large: 43.5 }, left: { small: 15.6, moderate: 24.9, large: 93.3 }, right: { small: 15.6, moderate: 24.9, large: 93.3 } },
  Jlim: { fwd: 24.27, back: 29.01, left: 62.22, right: 62.22 },
  matched: { J: 20, steps: 84 },                                                          // Rietdyk 1999: ≈ 20–23 N·s pelvis pushes ≈ 350 ms (84 steps)
  recovery: { dropFallMm: 150, recTolMm: 10 },
  threshold: { dirs: ["fwd", "left"], iters: 7 },                                         // bisection between 0 and the large impulse
});
export async function qualify(CFG) { const B = P2B, out = { battery: B, wall: {} }, t = () => Date.now(); let t0;
  const job = (cond, extra) => BT.makeJob(cond, CFG, extra);
  // ── U: undisturbed standing ──
  t0 = t(); const U = await runOne(job("S2P2", { steps: B.U.steps })), R = U.recs; out.U = { audit: BT.entryAudit(U, B.U.auditSteps), stop: U.stop || null, finalHash: U.finalHash, cpu: U.cpu, steps: R.length };
  const y0 = R[0].S[0].pos[1], c0 = R[0].chars.runner.com; let fall = null; for (const r of R) { const c = r.chars.runner.com; if (!fall && ((y0 - r.S[0].pos[1]) * 1000 > B.recovery.dropFallMm || Math.hypot(c[0] - c0[0], c[2] - c0[2]) > 0.1)) fall = { t: r.n / 240 }; }
  const F0 = MS.frame(R[B.U.swayFrom], R[B.U.swayFrom - 1]), tail = R.slice(R.length - 2400), mean = (f) => tail.reduce((s, r) => s + f(r), 0) / tail.length, early = R.slice(240, 480), meanE = (f) => early.reduce((s, r) => s + f(r), 0) / early.length;
  out.U.fall = fall; out.U.sway = BT.sway(U, B.U.swayFrom, R.length);
  out.U.postureDrift = { maxJointMeanDeg: Math.max(...MS.KEY_AXES.map(([, k, i]) => Math.abs(mean(r => r.chars.runner.th[k][i]) - meanE(r => r.chars.runner.th[k][i])) * 180 / Math.PI)), pelvisMeanDropMm: (meanE(r => r.S[0].pos[1]) - mean(r => r.S[0].pos[1])) * 1000, comMeanShiftMm: Math.hypot(mean(r => r.chars.runner.com[0]) - meanE(r => r.chars.runner.com[0]), mean(r => r.chars.runner.com[2]) - meanE(r => r.chars.runner.com[2])) * 1000 };
  out.U.sepMax = Math.max(...R.map(r => r.chars.runner.integrity.sepMaxMm)); out.U.penMax = Math.max(...R.map(r => r.chars.runner.integrity.turfPenMm)); out.wall.U = (t() - t0) / 1000;
  // ── P: pushes ──
  t0 = t(); const steps = B.onset + B.window, base = await runOne(job("S2P2", { steps })), edges = BT.bos(base.recs, B.onset - 6, B.onset); out.P = { edges, runs: {} };
  for (const [dir, mags] of Object.entries(B.J)) for (const [mag, J] of Object.entries(mags)) { const pj = BT.pushJob(dir, J, B.onset, B.pulse), o = await runOne(job("S2P2", { steps, perturb: pj }));
    const rp = await runOne(job("S2R", { steps, perturb: pj, replayLog: base.ctrlLog }));
    const rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery), ch = MS.chronology(base, o, B.onset), m = BT.pushMetrics(base, o, B.onset, Math.min(B.window, 240), dir, edges), mr = BT.pushMetrics(base, rp, B.onset, Math.min(B.window, 240), dir, edges);
    const ax = dir === "fwd" || dir === "back" ? 0 : 2, trace = []; for (let q = B.onset; q < Math.min(o.recs.length, rp.recs.length, B.onset + 240); q += 6) trace.push([+((q - B.onset) / 0.24).toFixed(1), +((o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000).toFixed(2), +((rp.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000).toFixed(2)]);
    // first neural torque change by joint family (activation × capacity), ms after onset
    const cap = new Map((o.entry.law0 || []).map(e => [e.k + "_" + e.i, e.capIso])), fam = (k) => PL.SPEC_R().joints[k].name.replace(/_[LR]$/, ""), firstBy = {};
    for (let q = B.onset; q < Math.min(o.recs.length, B.onset + 120); q++) for (const [j, r] of (base.recs[q].law || []).entries()) { const s2 = o.recs[q].law[j], c = cap.get(r[0] + "_" + r[1]); if (!c || !s2) continue; const f = fam(r[0]); if (firstBy[f] != null) continue; if (Math.abs((s2[5] - r[5]) * c[0] - (s2[6] - r[6]) * c[1]) > 0.1) firstBy[f] = +((o.recs[q].n - B.onset) / 0.24).toFixed(1); }
    out.P.runs[dir + "." + mag] = { J, recovery: rec, chronology: ch, neuralTorqueOnsetMsByFamily: firstBy, window1s: m, replayWindow1s: mr, comTrace: trace, stop: o.stop || null, sepMax: Math.max(...o.recs.map(r => r.chars.runner.integrity.sepMaxMm)) }; }
  out.wall.P = (t() - t0) / 1000;
  // ── M: human-matched pushes (Rietdyk 1999 form) ──
  t0 = t(); out.M = {}; for (const dir of ["fwd", "left"]) { const u = { fwd: [1, 0, 0], left: [0, 0, 1] }[dir], pj = [{ from: B.onset, to: B.onset + B.matched.steps, body: "pelvis", F: V.sc(u, B.matched.J / (B.matched.steps / 240)), pLocal: PELVIS_COM }];
    const o = await runOne(job("S2P2", { steps, perturb: pj })); out.M[dir] = { recovery: BT.recovery(base, o, B.onset, B.window, edges, B.recovery), chronology: MS.chronology(base, o, B.onset).ms }; }
  out.wall.M = (t() - t0) / 1000;
  // ── T: no-step failure thresholds (bisection on a 50 ms pelvis pulse) ──
  t0 = t(); out.T = {}; for (const dir of B.threshold.dirs) { let lo = 0, hi = B.J[dir].large; const tried = [];
    for (let it = 0; it < B.threshold.iters; it++) { const J = (lo + hi) / 2, o = await runOne(job("S2P2", { steps, perturb: BT.pushJob(dir, J, B.onset, B.pulse) })), rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery); tried.push([+J.toFixed(2), !!rec.fall]); if (rec.fall) hi = J; else lo = J; }
    out.T[dir] = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi], fracOfJlim: (lo + hi) / 2 / B.Jlim[dir], tried }; }
  out.wall.T = (t() - t0) / 1000;
  // ── D: determinism ──
  t0 = t(); const d1 = await runOne(job("S2P2", { steps: 960 })), d2 = await runOne(job("S2P2", { steps: 960 })), pj = BT.pushJob("fwd", B.J.fwd.moderate, B.onset, B.pulse), d3 = await runOne(job("S2P2", { steps: 720, perturb: pj })), d4 = await runOne(job("S2P2", { steps: 720, perturb: pj }));
  out.D = { standing: [d1.finalHash, d2.finalHash], push: [d3.finalHash, d4.finalHash], identical: d1.finalHash === d2.finalHash && d3.finalHash === d4.finalHash }; out.wall.D = (t() - t0) / 1000;
  return out; }
if (process.argv[1] && process.argv[1].endsWith("ppr3_p2_qualify.mjs")) { const CFG = { body: JSON.parse(fs.readFileSync(arg("body"))), ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))) };
  const Q = await qualify(CFG); Q.label = arg("label", "S2+P2"); Q.params = CFG; fs.writeFileSync(arg("out"), JSON.stringify(Q, null, 1)); console.log(Q.label, "wall", JSON.stringify(Q.wall)); }
