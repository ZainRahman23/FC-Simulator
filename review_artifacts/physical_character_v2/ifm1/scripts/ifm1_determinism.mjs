// IFM-1 determinism comparison (prereg §12): every base trajectory's two fresh-process runs and the single-process reverse-order batch must give
// bit-identical per-step hashes (physical state of every receiver body and the impactor, actuator activations, SnapshotTone commands).
// usage: node ifm1_determinism.mjs <jobs.json> <runs dir> <batch.json> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const [JOBS, RUNS, BATCH, OUT] = process.argv.slice(2), jobs = JSON.parse(fs.readFileSync(JOBS)), batch = JSON.parse(fs.readFileSync(BATCH)).res;
const rd = (f) => (fs.existsSync(path.join(RUNS, f)) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f)))) : null), rows = [];
for (const j of jobs) { const a = rd(j.file), b = rd(j.file.replace(".json.gz", "_rep.json.gz")), c = batch.find(x => x.name === j.name), ha = a ? a.recs.map(r => r.hash) : null, hb = b ? b.recs.map(r => r.hash) : null;
  rows.push({ name: j.name, steps: ha ? ha.length : 0, freshTwiceIdentical: !!(ha && hb && JSON.stringify(ha) === JSON.stringify(hb)), batchIdentical: !!(ha && c && JSON.stringify(ha) === JSON.stringify(c.hashes)), finalHash: a ? a.finalHash : null }); }
const ok = rows.every(r => r.freshTwiceIdentical && r.batchIdentical);
fs.writeFileSync(OUT, JSON.stringify({ allIdentical: ok, rows }, null, 1)); for (const r of rows) console.log(`${r.name}: fresh ×2 ${r.freshTwiceIdentical ? "identical" : "DIFFER"} · batch ${r.batchIdentical ? "identical" : "DIFFER"} · ${r.steps} steps · ${r.finalHash}`);
console.log(ok ? "DETERMINISM: all identical" : "DETERMINISM: DIFFERENCES");
