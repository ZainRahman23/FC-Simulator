// receive_elite1/tools/re1_cur_series.mjs — CURRENT (RECEIVE-MOVING-1) on the elite set at the combined ratings (99 … 50): DRIBBLE-V1's own takeover
// at each rating (the attributes reach DRIBBLE-V1 in both pipelines)   node re1_cur_series.mjs <out.json> [seeds] [shard/n]
import fs from "fs"; import { makeCurrent } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2], seeds = (process.argv[3] || "1,2,3").split(",").map(Number), [si, sn] = (process.argv[4] || "0/1").split("/").map(Number), rows = []; let j = 0;
for (const v of [99, 90, 80, 70, 60, 50]) for (const id of ALL) for (const sd of seeds) { if (j++ % sn !== si) continue; const cs = parseCase(`${id}_B${v}_D${v}_A${v}`), S = makeCurrent(cs, { seed: sd }); S.run(cs.scenario.dur); const m = tight(S, cs); delete m.sep.curve; m.level = v; m.seed = sd; m.series = "ALL"; m.pipeline = "CURRENT"; rows.push(m); }
fs.writeFileSync(out, JSON.stringify(rows)); console.log(rows.length);
