// SUPPORT-1 CPU benchmark (sequential, one process, nothing else running): per candidate, the lab TWIN (840 steps, instrumented lab plant) and the
// HEAVY lateral sweep G_L_h15_m40_v4; wall ms per 240 Hz step, split into the plant's own CPU buckets (step = Jolt world step, law = body + controller).
// usage (worktree root): node .../s1_cpu.mjs --out <json>
import fs from "fs";
const SW = await import(new URL("../lab/s1_sweep.mjs", import.meta.url).href), CAND = await import(new URL("../lab/s1_candidates.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = {};
const job = SW.gridJobs().find(j => j.label === "G_L_h15_m40_v4");
for (const c of ["V2", "C3SC", "C3UR", "LDG", "LDG_C3UR"]) { const cand = CAND.get(c), r = {};
  for (const [k, run] of [["twin", () => SW.twinOf(cand)], ["heavy", () => SW.runJob(cand, job)]]) { await run(); const o = await run(), n = o.recs.length;
    r[k] = { msPerStep: +(o.wallMs / n).toFixed(3), stepMs: +(o.cpu.step / n).toFixed(3), lawMs: +(o.cpu.law / n).toFixed(3), measureMs: +((o.cpu.measure + o.cpu.instrument) / n).toFixed(3), hash: o.finalHash }; }
  out[c] = r; console.log(c, JSON.stringify(r)); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
