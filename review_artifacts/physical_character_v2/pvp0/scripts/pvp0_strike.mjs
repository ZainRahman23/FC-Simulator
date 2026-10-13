// PVP-0 strike-window analysis (read-only): for each strength, the first 100 ms after first cross contact — impulse ON the recipient (cross manifolds),
// the recipient's momentum change against the twin, the tackler's momentum change split into cross (player) and turf parts (its own ledger terms),
// the strike window's peak single-step cross impulse / force and peak cross penetration, plus where the tackler's angular-ledger residual peaks and the steps with cross penetration above Jolt's 5 mm slop (pair, duration).
// usage (worktree root): node .../pvp0_strike.mjs --dir <records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const TW = load("TWIN"), out = {};
for (const cse of ["LIGHT", "NOMINAL", "HEAVY"]) { const o = load(cse), R = o.recs, A = o.setup.activate; const q0 = R.findIndex(r => (r.contacts || []).some(m => m.kind === "cross" && m.Jn > 0));
  let Jr = [0, 0, 0], JtC = [0, 0, 0], JtT = [0, 0, 0], pkJ = { J: 0, step: null }, pkPen = 0; for (let q = q0; q < q0 + 24; q++) { const r = R[q], jm = V.len(r.chars.runner.Jcross); if (jm > pkJ.J) pkJ = { J: jm, step: r.n }; pkPen = Math.max(pkPen, r.chars.runner.integrity.crossPenMm); Jr = V.add(Jr, r.chars.runner.Jcross); JtC = V.add(JtC, r.chars.tackler.Jcross); JtT = V.add(JtT, r.chars.tackler.Jturf); }
  const dPr = V.sub(V.sub(R[q0 + 23].chars.runner.P, R[q0 - 1].chars.runner.P), V.sub(TW.recs[q0 + 23].chars.runner.P, TW.recs[q0 - 1].chars.runner.P));
  let angPk = { v: 0, step: null }; for (let q = A + 1; q < R.length; q++) { const a = V.len(R[q].chars.tackler.angRes); if (a > angPk.v) angPk = { v: a, step: R[q].n }; }
  const deep = []; for (const r of R) for (const m of (r.contacts || [])) if (m.kind === "cross") { const d = Math.max(...m.points.map(p => p.depth)); if (d > 0.005) deep.push({ step: r.n, pair: m.a[1] + " × " + m.b[1], mm: +(d * 1000).toFixed(1) }); }
  const byPair = {}; for (const d of deep) { byPair[d.pair] = byPair[d.pair] || { steps: 0, maxMm: 0, first: d.step, last: d.step }; const b = byPair[d.pair]; b.steps++; b.maxMm = Math.max(b.maxMm, d.mm); b.last = d.step; }
  const turfAround = R[angPk.step - 1 - 0] ? (R[angPk.step - 1].contacts || []).filter(m => m.kind === "turf-tackler").reduce((s, m) => s + m.Jn, 0) : null;
  out[cse] = { firstContactStep: R[q0].n, strike100ms: { impulseOnRecipientNs: Jr.map(v => +v.toFixed(2)), recipientDPvsTwinNs: dPr.map(v => +v.toFixed(2)), tacklerCrossNs: JtC.map(v => +v.toFixed(2)), tacklerTurfNs: JtT.map(v => +v.toFixed(2)), peakStepImpulseNs: +pkJ.J.toFixed(3), peakForceN: Math.round(pkJ.J * 240), peakStep: pkJ.step, peakCrossPenMm: +pkPen.toFixed(2) },
    tacklerAngResPeak: { value: +angPk.v.toFixed(3), step: angPk.step, turfNormalImpulseThatStepNs: turfAround != null ? +turfAround.toFixed(2) : null }, penetrationOver5mm: byPair }; }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
