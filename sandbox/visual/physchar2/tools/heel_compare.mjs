// ═══ physchar2/tools/heel_compare.mjs — heel-rise regression: compare two heel_summary.json files (accepted investigation vs a re-run) ═══
// usage: node tools/heel_compare.mjs <baseline heel_summary.json> <new heel_summary.json> [out.json]
import fs from "fs";
const A = JSON.parse(fs.readFileSync(process.argv[2])), B = JSON.parse(fs.readFileSync(process.argv[3])), mA = new Map(A.summary.map(v => [v.id, v])), rows = [];
for (const b of B.summary) { const a = mA.get(b.id); if (!a) continue; const f = (v, side, k) => { const x = v.feet.find(q => q.side === side); return x ? x[k] : null; };
  rows.push({ id: b.id, label: b.label, sameHash: a.hash === b.hash, heelPeakMm: ["L", "R"].map(s => [f(a, s, "heelPeakMm"), f(b, s, "heelPeakMm")]), pitchAtFreeEndDeg: ["L", "R"].map(s => [f(a, s, "pitchAtFreeEndDeg"), f(b, s, "pitchAtFreeEndDeg")]),
    impactJyNs: ["L", "R"].map(s => [(a.feet.find(q => q.side === s) || {}).impact?.JyNs, (b.feet.find(q => q.side === s) || {}).impact?.JyNs]), maxRiseJ: [a.maxRiseJ, b.maxRiseJ], engineTicks: [a.engineTicks, b.engineTicks] }); }
const d = (p) => Math.max(...rows.flatMap(r => r[p].map(([x, y]) => (x == null || y == null ? 0 : Math.abs(y - x)))));
const out = { variants: rows.length, identicalHashes: rows.filter(r => r.sameHash).length, maxAbsChange: { heelPeakMm: d("heelPeakMm"), pitchAtFreeEndDeg: d("pitchAtFreeEndDeg"), impactJyNs: d("impactJyNs") }, maxRiseJ: rows.map(r => [r.id, r.maxRiseJ]), rows };
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, rows: rows.map(r => `${r.id} ${r.sameHash ? "same" : "diff"} heel R ${r.heelPeakMm[1].map(x => x && x.toFixed(2)).join("→")} mm, pitch R ${r.pitchAtFreeEndDeg[1].map(x => x && x.toFixed(2)).join("→")}°`) }, null, 1));
