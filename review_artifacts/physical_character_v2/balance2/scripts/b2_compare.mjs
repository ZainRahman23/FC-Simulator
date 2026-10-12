// BALANCE-2 §17 final frozen comparison battery (frozen with the successor preregistration, before any C2 battery run): the SAME frozen matched
// battery B2M (b2_qualify.mjs constants: U 60 s, P 4 × 4 matched pushes, M′, T in four directions, D) on the two non-M1b systems — CURRENT V2
// (law A) and PPR-3 S2 + old P2 (frozen candidates) — by the same measurement functions as b2_qualify.qualify(); the two M1b systems (BALANCE-1 B
// and BALANCE-2 C2) are evaluated by b2_qualify.mjs itself. Verdicts: the OUTCOME criteria
// only (U1, U3, U4, P1, P2, P3, P4′, P8, M1′, T1′, DET) by the frozen formulas (b1_eval / b2_eval), the rest reported "n/a" (U2 / U5 / U6 / P5 /
// P6 / P7 depend on the M1b controllers' channel / law records). PVP is sealed (SOLO only). usage: node b2_compare.mjs --sys A|S2P2 --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), MS = await import(RA + "ppr3/scripts/ppr3_measure.mjs"), P3 = await import(RA + "ppr3/scripts/ppr3_run.mjs");
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, SPEC = PL.SPEC_R(), PELVIS_COM = SPEC.bodies[0].comLocal, Q1 = await import(RA + "balance1/scripts/b1_qualify.mjs");
const { B2M, overshoot } = await import(new URL("./b2_qualify.mjs", import.meta.url).href), E2 = await import(new URL("../criteria/b2_eval.mjs", import.meta.url).href), { p4prime } = await import(new URL("../criteria/b2_p4prime.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, tryv = (f) => { try { return f(); } catch (e) { return null; } };
const S2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_S2_CANDIDATE.json", RA))), P2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_P2_CANDIDATE.json", RA)));
export async function compare(sys) { const B = B2M, run = (extra) => P3.runOne(BT.makeJob(sys, { body: S2, ctrl: P2 }, extra)), out = { sys, battery: B, wall: {} }, t = () => Date.now(); let t0 = t();
  const U = await run({ steps: B.U.steps }), R = U.recs; out.U = { audit: tryv(() => BT.entryAudit(U, B.U.auditSteps)), stop: U.stop || null, finalHash: U.finalHash, steps: R.length };
  const y0 = R[0].S[0].pos[1], c0 = R[0].chars.runner.com; let fall = null; for (const r of R) { const c = r.chars.runner.com; if (!fall && ((y0 - r.S[0].pos[1]) * 1000 > B.recovery.dropFallMm || Math.hypot(c[0] - c0[0], c[2] - c0[2]) > 0.1)) fall = { t: r.n / 240 }; }
  out.U.fall = fall; out.U.sway = R.length >= B.U.swayFrom + 480 ? tryv(() => BT.sway(U, B.U.swayFrom, R.length)) : null;
  if (R.length >= 2400) { const tail = R.slice(R.length - 2400), mean = (f, A) => A.reduce((s, r) => s + f(r), 0) / A.length, early = R.slice(240, 480), R2D = 180 / Math.PI;
    out.U.postureDrift = { maxJointMeanDeg: Math.max(...MS.KEY_AXES.map(([, k, i]) => Math.abs(mean(r => r.chars.runner.th[k][i], tail) - mean(r => r.chars.runner.th[k][i], early)) * R2D)), pelvisMeanDropMm: (mean(r => r.S[0].pos[1], early) - mean(r => r.S[0].pos[1], tail)) * 1000, comMeanShiftMm: Math.hypot(mean(r => r.chars.runner.com[0], tail) - mean(r => r.chars.runner.com[0], early), mean(r => r.chars.runner.com[2], tail) - mean(r => r.chars.runner.com[2], early)) * 1000 }; }
  out.U.sepMax = Math.max(...R.map(r => r.chars.runner.integrity.sepMaxMm)); out.U.penMax = Math.max(...R.map(r => r.chars.runner.integrity.turfPenMm)); out.wall.U = (t() - t0) / 1000;
  t0 = t(); const steps = B.onset + B.window, base = await run({ steps }), edges = BT.bos(base.recs, B.onset - 6, B.onset); out.P = { edges, runs: {} };
  for (const [dir, mags] of Object.entries(B.J)) for (const [mag, J] of Object.entries(mags)) { const o = await run({ steps, perturb: BT.pushJob(dir, J, B.onset, B.pulse) }), rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery);
    const ax = dir === "fwd" || dir === "back" ? 0 : 2, trace = []; for (let q = B.onset; q < Math.min(o.recs.length, B.onset + 480); q += 6) trace.push([+((q - B.onset) / 0.24).toFixed(1), +((o.recs[q].chars.runner.com[ax] - base.recs[q].chars.runner.com[ax]) * 1000).toFixed(2)]);
    out.P.runs[dir + "." + mag] = { J, recovery: rec, chronology: tryv(() => MS.chronology(base, o, B.onset)), human: tryv(() => Q1.humanMetrics(base, o, B.onset, dir)), overshoot: rec.fall ? null : overshoot(base, o, B.onset, B.window, dir), comTrace: trace, stop: o.stop || null, hash: o.finalHash }; }
  out.wall.P = (t() - t0) / 1000; t0 = t(); out.M = {};
  for (const dir of ["fwd", "left"]) { const u = { fwd: [1, 0, 0], left: [0, 0, 1] }[dir], mm = B.matched[dir], o = await run({ steps, perturb: [{ from: B.onset, to: B.onset + mm.steps, body: "pelvis", F: V.sc(u, mm.J / (mm.steps / 240)), pLocal: PELVIS_COM }] });
    out.M[dir] = { J: mm.J, steps: mm.steps, recovery: BT.recovery(base, o, B.onset, B.window, edges, B.recovery) }; }
  out.wall.M = (t() - t0) / 1000; t0 = t(); out.T = {};
  for (const dir of B.threshold.dirs) { let lo = 0, hi = B.threshold.hiFracJlim * B.Jlim[dir]; const tried = []; for (let it = 0; it < B.threshold.iters; it++) { const J = (lo + hi) / 2, o = await run({ steps, perturb: BT.pushJob(dir, J, B.onset, B.pulse) }), rec = BT.recovery(base, o, B.onset, B.window, edges, B.recovery); tried.push([+J.toFixed(2), !!rec.fall]); if (rec.fall) hi = J; else lo = J; }
    out.T[dir] = { thresholdNs: (lo + hi) / 2, bracket: [lo, hi], tried }; }
  out.wall.T = (t() - t0) / 1000; t0 = t(); const d1 = await run({ steps: 960 }), d2 = await run({ steps: 960 }), pj = BT.pushJob("fwd", B.J.fwd.moderate, B.onset, B.pulse), d3 = await run({ steps: 720, perturb: pj }), d4 = await run({ steps: 720, perturb: pj });
  out.D = { standing: [d1.finalHash, d2.finalHash], push: [d3.finalHash, d4.finalHash], identical: d1.finalHash === d2.finalHash && d3.finalHash === d4.finalHash }; out.wall.D = (t() - t0) / 1000; return out; }
// outcome-only verdicts by the frozen formulas (b1_eval.mjs U1 / U3 / U4 / P1–P3 / DET; b2_eval.mjs P4′ / P8 / M1′ / T1′)
export function evaluateOutcome(Q) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; }, U = Q.U, P = Q.P.runs, dirs = ["fwd", "back", "left", "right"], rcv = (r) => r.recovery.recovered;
  put("U1", !U.fall && !U.stop && U.steps >= Q.battery.U.steps, U.fall || U.stop || "stood 60 s"); const D = U.postureDrift; put("U3", D && D.maxJointMeanDeg <= 3 && D.pelvisMeanDropMm <= 10 && D.comMeanShiftMm <= 15, D || null);
  const sw = U.sway; put("U4", sw && sw.comAPmm.rms >= 1.0 && sw.comAPmm.rms <= 12.9 && sw.comMLmm.rms >= 0.43 && sw.comMLmm.rms <= 6.0, sw ? { comAP: +sw.comAPmm.rms.toFixed(2), comML: +sw.comMLmm.rms.toFixed(2) } : null);
  for (const [id, lv] of [["P1", "small"], ["P2", "moderate"]]) put(id, dirs.every(d => rcv(P[d + "." + lv])), Object.fromEntries(dirs.map(d => [d, { recovered: rcv(P[d + "." + lv]), peakMm: +P[d + "." + lv].recovery.comPeakMm.toFixed(1), fall: P[d + "." + lv].recovery.fall }])));
  put("P3", dirs.every(d => !!P[d + ".over"].recovery.fall), Object.fromEntries(dirs.map(d => [d, P[d + ".over"].recovery.fall]))); const pp = p4prime(Q); put("P4", pp.pass, pp.perDirection);
  const os = dirs.flatMap(d => ["small", "moderate"].map(m => [d + "." + m, P[d + "." + m].overshoot])); put("P8", os.every(([, o]) => o && o.frac <= 0.26), Object.fromEntries(os.map(([k, o]) => [k, o ? +o.frac.toFixed(3) : "fell"])));
  const mOk = (m) => m.recovery.recovered && m.recovery.comPeakMm >= 24 && m.recovery.comPeakMm <= 120 && m.recovery.tPeakS >= 0.25 && m.recovery.tPeakS <= 1.0 && m.recovery.settleS != null && m.recovery.settleS <= 3.5;
  put("M1", Object.values(Q.M).every(mOk), Object.fromEntries(Object.entries(Q.M).map(([k, m]) => [k, { recovered: m.recovery.recovered, peakMm: +m.recovery.comPeakMm.toFixed(1), tPeakS: m.recovery.tPeakS, settleS: m.recovery.settleS }])));
  const band = { fwd: [13.01, 18.22], back: [15.77, 22.08], left: [21.8, 49.8], right: [21.8, 49.8] }; put("T1", Object.entries(band).every(([d, [lo, hi]]) => Q.T[d].thresholdNs >= lo && Q.T[d].thresholdNs <= hi), Object.fromEntries(Object.keys(band).map(d => [d, +Q.T[d].thresholdNs.toFixed(2)])));
  put("DET", Q.D.identical, Q.D); for (const k of ["U2", "U5", "U6", "P5", "P6", "P7"]) res[k] = { pass: null, value: "n/a (defined on the M1b controllers' entry / channel / law records)" };
  const judged = Object.entries(res).filter(([, r]) => r.pass !== null), failed = judged.filter(([, r]) => !r.pass).map(([k]) => k); return { label: Q.sys, outcomeOnly: true, nPass: judged.length - failed.length, n: judged.length, failed, results: res }; }
if (process.argv[1] && process.argv[1].endsWith("b2_compare.mjs")) { const sys = arg("sys"); if (!["A", "S2P2"].includes(sys)) throw new Error("--sys A | S2P2 (the M1b systems run through b2_qualify.mjs)");
  const Q = await compare(sys), V = evaluateOutcome(Q);
  fs.writeFileSync(arg("out"), JSON.stringify({ Q, verdict: V })); console.log(sys, "wall", JSON.stringify(Q.wall), "→", V.nPass + "/" + V.n, V.failed.join(", ")); }
