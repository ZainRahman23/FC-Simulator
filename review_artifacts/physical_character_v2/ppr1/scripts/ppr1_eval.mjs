// PPR-1 evaluation of the preregistered hard criteria (PPR1_PREREGISTRATION.md §6) — read-only on the battery records and probe results.
// usage: V2_KNEE_MODEL=v2k node ppr1_eval.mjs --dirA <battery A> --dirB <battery B> --probesA <json> --probesB <json> --out <json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const { metrics, KEY_AXES } = await import(new URL("./ppr1_metrics.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const H = 1 / 240, R2D = 180 / Math.PI, rd = (d, law, id) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d, `${law}_${id}.json.gz`))));
const dA = arg("dirA"), dB = arg("dirB"), PA = JSON.parse(fs.readFileSync(arg("probesA"))), PB = JSON.parse(fs.readFileSync(arg("probesB")));
const out = { tool: "ppr1_eval.mjs", prereg: "d8849a6b", prerun: "e7afc26c", criteria: {}, reference: {} };
const crit = (id, pass, value, note) => { out.criteria[id] = { pass, value, note }; };
// ── primary: PVP-1A-DX ──
const bN2 = rd(dB, "B", "N2"), bC0 = rd(dB, "B", "C0"), aN2 = rd(dA, "A", "N2"), nFirst = bN2.recs.find(r => r.contacts.some(c => c.kind === "cross" && Math.hypot(...c.J2) >= 1e-3)).n, t0n = nFirst - 1;
const tms = (n) => (n - t0n) * H * 1000, win = (r) => tms(r.n) > 0 && tms(r.n) <= 120;
{ // H1 drive and activation bit-identical N2 vs C0 for n ≤ 32
  let dDrive = 0, dAct = 0, firstDrive = null, firstAct = null;
  for (let q = 0; q < 32; q++) { const a = bN2.recs[q], b = bC0.recs[q];
    a.law.forEach((x, j) => { const y = b.law[j], d = Math.abs(x[2] - y[2]); if (d > dDrive) dDrive = d; if (d > 0 && firstDrive == null) firstDrive = a.n; });
    a.act.forEach((x, j) => { const y = b.act[j], d = Math.max(Math.abs(x[7] - y[7]), Math.abs(x[8] - y[8])); if (d > dAct) dAct = d; if (d > 0 && firstAct == null) firstAct = a.n; }); }
  crit("H1", dDrive === 0 && dAct === 0, { maxDriveDiffNm: dDrive, firstDriveDiffRecord: firstDrive, maxActivationDiff: dAct, firstActivationDiffRecord: firstAct }, "τ_drive and a± bit-identical B-N2 vs B-C0, records ≤ 32"); }
{ // H2 activation change ≤ 0.01 in window
  const a0 = bN2.recs.find(r => r.n === t0n), base = Object.fromEntries(a0.act.map(x => [x[0] + "_" + x[1], [x[7], x[8]]])); let mx = 0, at = null;
  for (const r of bN2.recs.filter(win)) for (const x of r.act) { const b = base[x[0] + "_" + x[1]], d = Math.max(Math.abs(x[7] - b[0]), Math.abs(x[8] - b[1])); if (d > mx) { mx = d; at = { n: r.n, k: x[0], i: x[1] }; } }
  const aA0 = aN2.recs.find(r => r.n === t0n), baseA = Object.fromEntries(aA0.act.map(x => [x[0] + "_" + x[1], [x[7], x[8]]])); let mxA = 0; for (const r of aN2.recs.filter(win)) for (const x of r.act) { const b = baseA[x[0] + "_" + x[1]]; mxA = Math.max(mxA, Math.abs(x[7] - b[0]), Math.abs(x[8] - b[1])); }
  crit("H2", mx <= 0.01, { maxActivationChange: mx, at, A_reference: mxA }, "max |a(n) − a(t=0)| ≤ 0.01 in 0–120 ms"); }
{ // H3 torque beyond the entry activation's capacity
  const a0 = bN2.recs.find(r => r.n === t0n), base = Object.fromEntries(a0.act.map(x => [x[0] + "_" + x[1], [x[7], x[8]]])); let mx = 0, mxA = 0;
  for (const r of bN2.recs.filter(win)) for (const x of r.act) { const b = base[x[0] + "_" + x[1]], a = x[2] >= 0 ? b[0] : b[1]; mx = Math.max(mx, (Math.abs(x[2]) - a * x[3]) / Math.max(1, x[3])); }
  const aA0 = aN2.recs.find(r => r.n === t0n), baseA = Object.fromEntries(aA0.act.map(x => [x[0] + "_" + x[1], [x[7], x[8]]])); for (const r of aN2.recs.filter(win)) for (const x of r.act) { const b = baseA[x[0] + "_" + x[1]], a = x[2] >= 0 ? b[0] : b[1]; mxA = Math.max(mxA, Math.abs(x[2]) - a * x[3]); }
  crit("H3", mx <= 1e-6, { maxBeyondNormalised: mx, A_reference_maxBeyondNm: mxA }, "|τ| − a_entry·cap(θ, ω) ≤ 1e-6·max(1, cap)"); }
{ // H4 integrity + ledgers in window
  const W = bN2.recs.filter(win), I = W.map(r => r.chars.runner.integrity), lin = Math.max(...W.map(r => Math.hypot(...r.chars.runner.linRes))), ang = Math.max(...W.map(r => Math.hypot(...r.chars.runner.angRes)));
  const v = { sepMm: Math.max(...I.map(i => i.sepMaxMm)), selfPenMm: Math.max(...I.map(i => i.selfPenMm)), crossPenMm: Math.max(...I.map(i => i.crossPenMm)), turfPenMm: Math.max(...I.map(i => i.turfPenMm)), finite: I.every(i => i.finite), maxSpeed: Math.max(...I.map(i => i.maxSpeed)), lin, ang };
  crit("H4", v.sepMm <= 1 && v.selfPenMm <= 10 && v.crossPenMm <= 10 && v.turfPenMm <= 10 && v.finite && v.maxSpeed <= 25 && lin <= 0.01 && ang <= 0.01, v, "integrity and ledgers in the window"); }
{ const log = JSON.parse(fs.readFileSync(path.join(dB, "B_battery_log.json"))), det = log.filter(x => x.id.endsWith("_DET")); crit("H5", det.every(x => x.identical), det, "QS and N2 repeats bit-identical"); }
const chatter = (m, n0, n1) => { let worst = 0, ax = null; for (const nm of KEY_AXES) { const j = m.series.joints[nm]; if (!j) continue; const om = j.om, al = om.map((_, q) => (q === 0 || q === om.length - 1 ? 0 : (om[q + 1] - om[q - 1]) * 120)); let run = 0;
    for (let q = Math.max(1, n0); q < Math.min(al.length - 1, n1); q++) { if (Math.sign(al[q]) !== Math.sign(al[q - 1]) && Math.abs(al[q]) > 500 && Math.abs(al[q - 1]) > 500) { run++; if (run > worst) { worst = run; ax = nm; } } else run = 0; } } return { worst, ax }; };
const mBN2 = metrics(bN2); { const c = chatter(mBN2, nFirst, nFirst + 29); crit("H6", c.worst <= 2, c, "≤ 2 consecutive α alternations (|α| > 500 rad/s²) on any key axis in the window"); }
{ const acc = JSON.parse(fs.readFileSync(new URL("../evidence/PPR1_ACCEPTANCE.json", import.meta.url))); crit("H7", acc.entry.H7.pass, acc.entry.H7, "physiological entry magnitudes"); }
// ── validation ──
const bQS = rd(dB, "B", "QS"); { let mx = 0; for (let q = 0; q < bC0.recs.length; q++) { const a = bC0.recs[q].S.slice(0, 14), b = bQS.recs[q].S; for (let j = 0; j < 14; j++) for (const k of ["pos", "rot", "v", "w"]) for (let e = 0; e < a[j][k].length; e++) mx = Math.max(mx, Math.abs(a[j][k][e] - b[j][k][e])); } crit("V1", mx === 0, { maxStateDiff: mx }, "B-C0 runner bit-identical to B-QS over 260 steps"); }
const mQS = metrics(bQS), s = mQS.series, n1s = 240, fwdV = (q) => { const c1 = s.com[q + 1], c0 = s.com[q - 1]; return ((c1[0] - c0[0]) / (2 * H)); };
{ const trunk = Math.max(...s.thorax.slice(0, n1s + 1).map(t => Math.hypot(t[0], t[1]))), pel = Math.max(...bQS.recs.slice(0, n1s).map(r => bQS.recs[0].S[0].pos[1] - r.S[0].pos[1])) * 1000, com = Math.max(...s.com.slice(0, n1s + 1).map(c => Math.hypot(c[0] - s.com[0][0], c[2] - s.com[0][2]))) * 1000;
  crit("QS1", trunk <= 5 && pel <= 10 && com <= 60, { trunkDeg: trunk, pelvisDropMm: pel, comDriftMm: com }, "through 1.0 s"); }
{ let w = 0; for (const nm of KEY_AXES) { const j = s.joints[nm]; if (j) for (let q = 120; q <= 240; q++) w = Math.max(w, Math.abs(j.om[q])); }
  let zc = 0, prev = null; for (let q = 121; q < 240; q++) { const v = fwdV(q); if (Math.abs(v) <= 0.005) continue; if (prev != null && Math.sign(v) !== Math.sign(prev)) zc++; prev = v; }
  crit("QS2", w <= 0.5 && zc <= 4, { maxOmega: w, zeroCrossings: zc }, "0.5–1.0 s: no spontaneous oscillation"); }
{ const q = s.thorax.findIndex(t => Math.hypot(t[0], t[1]) > 20), t = q < 0 ? null : q * H; crit("QS3", t == null || t >= 1.2, { fallTimeS: t, standsFull4s: t == null }, "trunk > 20° not before 1.20 s (A: 1.45 s)"); }
{ const slip = metrics({ ...bQS, recs: bQS.recs.slice(0, n1s) }).support.slipMm; crit("QS4", slip.every(x => x <= 2), { slipMm: slip }, "slip ≤ 2 mm through 1.0 s"); }
{ const e = bQS.recs.slice(0, n1s).reduce((a, r) => a + r.chars.runner.energyRes, 0); crit("QS5", e <= 0.5, { sumEnergyResJ: e }, "Σ energy residual 0–1 s ≤ +0.5 J"); }
const dev = (m, b, q) => Math.hypot(m.series.com[q][0] - b.series.com[q][0], m.series.com[q][2] - b.series.com[q][2]) * 1000, tdev = (m, b, q) => Math.hypot(m.series.thorax[q][0] - b.series.thorax[q][0], m.series.thorax[q][1] - b.series.thorax[q][1]);
const pushPeak = (id) => { const m = metrics(rd(dB, "B", id)), W = [...Array(96)].map((_, j) => 120 + j); return { com: Math.max(...W.map(q => dev(m, mQS, q))), trunk: Math.max(...W.map(q => tdev(m, mQS, q))), verdict: m.verdict, fall: (() => { const q = m.series.thorax.findIndex(t => Math.hypot(t[0], t[1]) > 20); return q < 0 ? null : q * H; })() }; };
{ const r = Object.fromEntries([0, 45, 90, 135, 180, 225, 270, 315].map(d => [d, pushPeak(`PUSH_d${d}_10`)])); crit("P1", Object.values(r).every(x => x.com <= 60 && x.trunk <= 6), r, "8 × 10 N·s: peak COM dev ≤ 60 mm, trunk ≤ 6°"); }
{ const map = { fwd: 0, back: 180, right: 270 }, r = {}; for (const [g, d] of Object.entries(map)) r[g] = [5, 10, 20, 40, 60, 90].map(N => [N, pushPeak(N === 10 ? `PUSH_d${d}_10` : `PUSHG_${g}_${N}`).com]);
  crit("P2", Object.values(r).every(a => a.every((x, j) => j === 0 || x[1] > a[j - 1][1])), r, "graded: peak COM dev strictly increasing"); }
{ const r = Object.fromEntries(["fwd", "back", "right"].map(g => [g, pushPeak(`PUSHG_${g}_90`)])); crit("P3", Object.values(r).every(x => x.verdict === "LOST_BALANCE"), r, "90 N·s → LOST_BALANCE within 2 s"); }
{ const r = {}; let ok = true; for (const id of ["IMP_shankR_back", "IMP_shankL_side", "IMP_deltoidL_side"]) { const run = rd(dB, "B", id), m = metrics(run), I = run.recs.map(x => x.chars.runner.integrity), c = chatter(m, 1, 29);
    r[id] = { finite: I.every(i => i.finite), maxSpeed: Math.max(...I.map(i => i.maxSpeed)), sepMm: Math.max(...I.map(i => i.sepMaxMm)), chatter: c, verdict: m.verdict }; ok = ok && r[id].finite && r[id].maxSpeed <= 25 && r[id].sepMm <= 1 && c.worst <= 2; }
  crit("IMP1", ok, r, "impacts: integrity and no chatter"); }
{ const J4 = ["ankle_R.df", "knee_R.flex", "hip_R.flex", "lumbar.flex"], r = {}; let ok1 = true, ok2 = true, ok3 = true;
  for (const nm of J4) for (const sg of [1, -1]) { const P = PB.probes.find(p => p.joint + "." + p.axis === nm), f = (T) => PB.results.find(x => x.joint + "." + x.axis === nm && x.T === T && x.sign === sg), sm = f(P.T[0]), lg = f(P.T[2]);
    const ratio = (lg.dthDeg.at100 / lg.T) / (sm.dthDeg.at100 / sm.T); r[nm + (sg > 0 ? "+" : "−")] = { ratio, dampShareSmall: sm.fit.dampShareAt50ms }; ok1 = ok1 && ratio >= 1.5; ok2 = ok2 && sm.fit.dampShareAt50ms < 0.5; }
  const dA3 = Math.max(...PB.results.map(x => x.dAct30)), worst3 = PB.results.reduce((a, x) => (x.dAct30 > a.v ? { v: x.dAct30, at: `${x.joint}.${x.axis} ${x.sign > 0 ? "+" : "−"}${x.T}` } : a), { v: 0 });
  crit("PR1", ok1, r, "yield ratio ≥ 1.5, 4 joints × 2 signs"); crit("PR2", ok2, Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.dampShareSmall])), "damping share < 50 %"); crit("PR3", dA3 <= 1e-9, worst3, "|Δa| ≤ 1e-9 for 30 steps after onset"); }
out.pass = Object.values(out.criteria).every(c => c.pass); out.failed = Object.entries(out.criteria).filter(([, c]) => !c.pass).map(([k]) => k);
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
for (const [k, c] of Object.entries(out.criteria)) console.log(`${k.padEnd(5)} ${c.pass ? "PASS" : "FAIL"}  ${JSON.stringify(c.value).slice(0, 260)}`); console.log("B preregistration verdict:", out.pass ? "PASSED" : "FAILED " + out.failed.join(", "));
