// ═══ physchar2/tools/b_turf_compare.mjs — FLAT-PLANE DECISION: plane vs historical box, the same G1 runs paired (user decision §7) ═══════════
// Reads two b_sweep.mjs outputs of the same job set (B_TURF=box and B_TURF=plane, k = 0) and compares, per metric, the distributions (median /
// p95 / max) and the PAIRED differences (median Δ, fraction of runs where plane > box). A difference is flagged SYSTEMATIC when ≥ 75 % of the
// paired runs move the same way AND the median |Δ| exceeds the metric's floor (stated per metric); otherwise it is reported as chaotic / noise.
// Final posture: agreement fraction. Nothing is tuned from this; it is a report. DIAGNOSTIC.
// usage: node tools/b_turf_compare.mjs <box.json> <plane.json> [--md]
import fs from "fs";
const [fb, fp] = process.argv.slice(2).filter(a => !a.startsWith("--")), md = process.argv.includes("--md");
const B = JSON.parse(fs.readFileSync(fb)).runs.filter(r => r.k === 0 && !r.err), P = JSON.parse(fs.readFileSync(fp)).runs.filter(r => r.k === 0 && !r.err);
const key = (r) => [r.human, r.key, r.hz, r.vel || 150].join("|"), bm = new Map(B.map(r => [key(r), r])), pairs = P.map(p => [bm.get(key(p)), p]).filter(([b]) => b && b.compare && b.metrics);
const M = [
  ["first turf contact (ms)", r => r.compare.firstContactT == null ? null : r.compare.firstContactT * 1000, 1],
  ["first non-foot contact (ms)", r => r.compare.firstNonFootT == null ? null : r.compare.firstNonFootT * 1000, 25],
  ["turf penetration, transient max (mm)", r => r.metrics.turfPenMaxMm, 0.5],
  ["turf penetration, at rest (mm)", r => r.metrics.turfPenRestMm, 0.5],
  ["turf manifold depth max (mm)", r => (r.turfStats && r.turfStats.depthMaxMm > -1e8 ? r.turfStats.depthMaxMm : null), 0.5],
  ["boot slip path while touching, L + R (mm)", r => r.compare.feet.reduce((a, f) => a + f.slipMm, 0), 5],
  ["boot roll max while touching (°)", r => Math.max(...r.compare.feet.map(f => f.rollMaxDeg)), 2],
  ["boot turf-contact time, L + R (s)", r => r.compare.feet.reduce((a, f) => a + f.touchS, 0), 0.25],
  ["anatomical overshoot max (°)", r => r.compare.hardExcMaxDeg, 0.5],
  ["settled excursion beyond ROM (°)", r => r.compare.hardExcRestDeg, 0.25],
  ["joint separation max (mm)", r => r.metrics.sepMaxMm, 0.5],
  ["energy dissipated E0 − Eend (J)", r => r.compare.dissipatedJ, 5],
  ["viscous damping dissipated (J)", r => r.compare.dampingJ, 5],
  ["resting KE (J)", r => r.metrics.restKE, 0.01],
  ["teleport max (mm)", r => r.posCorr.maxMm, 0.5],
  ["one-step energy rise max (J)", r => r.maxRise, 0.01],
];
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; }, f = (x, n = 2) => (x == null || isNaN(x) ? "—" : (+x).toFixed(n));
const rows = [];
for (const [name, g, floor] of M) { const pr = pairs.map(([b, p]) => [g(b), g(p)]).filter(([x, y]) => x != null && y != null && isFinite(x) && isFinite(y)); if (!pr.length) continue;
  const bx = pr.map(x => x[0]), pl = pr.map(x => x[1]), d = pr.map(([x, y]) => y - x), up = d.filter(x => x > 1e-9).length / d.length, dn = d.filter(x => x < -1e-9).length / d.length, md_ = q(d, 0.5), mabs = q(d.map(Math.abs), 0.5);
  const sys = (up >= 0.75 || dn >= 0.75) && Math.abs(md_) > floor;
  rows.push({ name, n: pr.length, box: [q(bx, 0.5), q(bx, 0.95), Math.max(...bx)], plane: [q(pl, 0.5), q(pl, 0.95), Math.max(...pl)], medDelta: md_, medAbsDelta: mabs, fracPlaneHigher: up, fracPlaneLower: dn, floor, systematic: sys }); }
const posture = pairs.filter(([b, p]) => b.posture && p.posture), agree = posture.filter(([b, p]) => b.posture === p.posture).length, comD = pairs.map(([b, p]) => Math.hypot(b.metrics.comEnd[0] - p.metrics.comEnd[0], b.metrics.comEnd[2] - p.metrics.comEnd[2]));
const fnf = pairs.filter(([b, p]) => b.compare.firstNonFoot || p.compare.firstNonFoot), fnfAgree = fnf.filter(([b, p]) => b.compare.firstNonFoot === p.compare.firstNonFoot).length;
const g1b = pairs.filter(([b]) => (b.g1Fail || []).length).length, g1p = pairs.filter(([, p]) => (p.g1Fail || []).length).length;
const out = { pairs: pairs.length, rows, posture: { agree, of: posture.length }, finalComShiftM: { median: q(comD, 0.5), p95: q(comD, 0.95), max: Math.max(...comD) }, firstNonFootBody: { agree: fnfAgree, of: fnf.length }, runsWithGatingRowFailure: { box: g1b, plane: g1p } };
if (md) { console.log(`Paired runs: ${out.pairs}. Final posture agreement ${agree}/${posture.length}; final COM shift median ${f(out.finalComShiftM.median, 3)} m, p95 ${f(out.finalComShiftM.p95, 3)}, max ${f(out.finalComShiftM.max, 3)} m; first non-foot body agreement ${fnfAgree}/${fnf.length}; runs with any per-run gating-row failure: box ${g1b}, plane ${g1p}.\n`);
  console.log("| metric | box median / p95 / max | plane median / p95 / max | paired median Δ (plane − box) | runs plane higher / lower | systematic? (floor) |"); console.log("|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.name} | ${f(r.box[0])} / ${f(r.box[1])} / ${f(r.box[2])} | ${f(r.plane[0])} / ${f(r.plane[1])} / ${f(r.plane[2])} | ${f(r.medDelta, 3)} | ${(100 * r.fracPlaneHigher).toFixed(0)} % / ${(100 * r.fracPlaneLower).toFixed(0)} % | ${r.systematic ? "**YES**" : "no"} (${r.floor}) |`); }
else console.log(JSON.stringify(out, null, 1));
