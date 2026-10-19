// receive_moving1/tools/rm1_run.mjs — the movement matrix (or listed ids) × seeds on a receive pipeline, with RECEIVE-CONTROL-1.1's scorecard and the
// momentum metrics.   node rm1_run.mjs <@matrix | ids> <seeds> <out.json> [shard/n] [pipeline rc2|rm1]
import fs from "fs"; import { makeReceive2, DT } from "../../receive_control2/tools/rc2_env.mjs"; import { matrix, parseCase, seedCase } from "../rm1_cases.js"; import { score } from "../../receive11/tools/rx_metrics.mjs"; import { momentum } from "./rm1_metrics.mjs";
const [sel, seedsS, outFile, shard, pipe] = process.argv.slice(2), seeds = (seedsS || "1").split(",").map(Number); let mk = makeReceive2;
if (pipe === "rm1") mk = (await import("./rm1_env.mjs")).makeReceiveM;
const cases = sel === "@matrix" ? matrix() : sel.split(",").map((id) => parseCase(id)), jobs = []; for (const cs of cases) for (const sd of seeds) jobs.push([cs, sd]);
const [si, sn] = shard ? shard.split("/").map(Number) : [0, 1], rows = [];
for (const [i, [cs0, sd]] of jobs.entries()) { if (i % sn !== si) continue; const cs = seedCase(cs0, sd), S = mk(cs, { seed: sd }), t0 = performance.now(); S.run(cs.scenario.dur); const ms = performance.now() - t0;
  const row = score(S, Object.assign({ angle: cs.turn, side: null }, cs), { recvPerS: null, afterPerS: null, worst: 0 }); row.turn = cs.turn; row.momentum = momentum(S); row.ms = Math.round(ms); row.mode = S.rx.stand ? "stationary" : "moving"; rows.push(row); }
fs.writeFileSync(outFile, JSON.stringify(rows)); console.log(`${rows.length} runs → ${outFile}`);
