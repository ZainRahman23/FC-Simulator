// receive11/tools/rx_run.mjs — run receive cases (ids or a matrix block) × seeds in this process; per-step CPU split into the receive phase (until
// the handoff) and after it. Writes one JSON row per run.   usage: node rx_run.mjs <ids,… | @block> <seeds a,b,…> out.json [shard/nshards]
import fs from "fs"; import { makeReceive, DT } from "./rx_env.mjs"; import { parseCase, seedCase, matrix } from "../rx_cases.js"; import { score } from "./rx_metrics.mjs";
const [sel, seedsS, outFile, shard] = process.argv.slice(2), seeds = (seedsS || "1").split(",").map(Number);
let cases = sel.startsWith("@") ? sel.slice(1).split("+").flatMap((b) => matrix(b)) : sel.split(",").map((id) => parseCase(id));
const jobs = []; for (const cs of cases) for (const sd of seeds) jobs.push([cs, sd]);
const [si, sn] = shard ? shard.split("/").map(Number) : [0, 1], mine = jobs.filter((_, i) => i % sn === si), rows = [];
const nowMs = () => performance.now();
for (const [cs0, sd] of mine) {
  const cs = seedCase(cs0, sd), t0 = nowMs(), S = makeReceive(cs, { seed: sd }), tBuild = nowMs() - t0, n = Math.round(cs.scenario.dur / DT);
  let recv = 0, after = 0, worst = 0, worstK = 0, nRecv = 0, nAfter = 0;
  while (S.k < n && !S.fault) { const ph = S.rx.phase, a = nowMs(); S.step(); const dt = nowMs() - a; if (ph === "dribble") { after += dt; nAfter++; } else { recv += dt; nRecv++; } if (dt > worst) { worst = dt; worstK = S.k; } }
  const cpu = { build: Math.round(tBuild), recvMs: Math.round(recv), recvTicks: nRecv, recvPerS: nRecv ? Math.round(recv / (nRecv * DT)) : null, afterMs: Math.round(after), afterTicks: nAfter, afterPerS: nAfter ? Math.round(after / (nAfter * DT)) : null, worst: +worst.toFixed(1), worstK, worstPhase: worstK <= (S.rx.handoff ? S.rx.handoff.k : Infinity) ? "receive" : "dribble" };
  rows.push(score(S, cs, cpu));
}
fs.writeFileSync(outFile, JSON.stringify(rows));
console.log(`${rows.length} runs → ${outFile}`);
