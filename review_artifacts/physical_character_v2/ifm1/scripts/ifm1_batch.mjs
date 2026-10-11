// IFM-1 determinism (prereg §12): the complete available set once more IN REVERSE ORDER in ONE process, with an explicit canonical world reset
// (a fresh V2 world + plant per trajectory, the previous one destroyed). Writes per-trajectory per-step hashes for comparison with the
// fresh-process runs.  usage: node ifm1_batch.mjs <jobs.json> <runs dir (for W wrench / X nref inputs)> <out.json>
import fs from "fs"; import path from "path";
const { runOne } = await import(new URL("./ifm1_run.mjs", import.meta.url).href);
const [JOBS, RUNS, OUT] = process.argv.slice(2), jobs = JSON.parse(fs.readFileSync(JOBS)).slice().reverse(), res = [];
for (const j of jobs) { const job = { ...j, wrench: j.wrench ? path.join(RUNS, j.wrench) : undefined, nref: j.nref ? path.join(RUNS, j.nref) : undefined }, o = await runOne(job);
  res.push({ name: j.name, status: o.status, steps: o.recs.length, hashes: o.recs.map(r => r.hash), hashR: o.recs.map(r => r.hashR), finalHash: o.finalHash, stop: o.stop }); console.log(`${j.name}: ${o.status} ${o.finalHash}`); }
fs.writeFileSync(OUT, JSON.stringify({ order: "reverse", process: "single", reset: "fresh V2JoltWorld + IFM1Sim per trajectory", res }, null, 1));
