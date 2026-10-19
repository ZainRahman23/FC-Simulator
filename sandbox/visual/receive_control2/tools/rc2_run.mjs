// receive_control2/tools/rc2_run.mjs — RECEIVE-CONTROL-1.1's matrix runner on the INTEGRATED pipeline (same cases, seeds, scorecard: rx_metrics.mjs)
//   node rc2_run.mjs <ids,… | @block> <seeds a,b,…> out.json [shard/nshards]
import fs from "fs"; import { makeReceive2, DT } from "./rc2_env.mjs"; import { parseCase, seedCase, matrix } from "../../receive11/rx_cases.js"; import { score } from "../../receive11/tools/rx_metrics.mjs";
const [sel, seedsS, outFile, shard] = process.argv.slice(2), seeds = (seedsS || "1").split(",").map(Number);
let cases = sel.startsWith("@") ? sel.slice(1).split("+").flatMap((b) => matrix(b)) : sel.split(",").map((id) => parseCase(id));
{ const seen = new Set(); cases = cases.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true))); }   // (the blocks share situations: each once)
const jobs = []; for (const cs of cases) for (const sd of seeds) jobs.push([cs, sd]);
const [si, sn] = shard ? shard.split("/").map(Number) : [0, 1], mine = jobs.filter((_, i) => i % sn === si), rows = [], nowMs = () => performance.now();
for (const [cs0, sd] of mine) {
  const cs = seedCase(cs0, sd), t0 = nowMs(), S = makeReceive2(cs, { seed: sd }), tBuild = nowMs() - t0, n = Math.round(cs.scenario.dur / DT);
  let recv = 0, after = 0, worst = 0, worstK = 0, nRecv = 0, nAfter = 0;
  while (S.k < n && !S.fault) { const ph = S.rx.phase, a = nowMs(); S.step(); const dt = nowMs() - a; if (ph === "dribble") { after += dt; nAfter++; } else { recv += dt; nRecv++; } if (dt > worst) { worst = dt; worstK = S.k; } }
  const cpu = { build: Math.round(tBuild), recvMs: Math.round(recv), recvTicks: nRecv, recvPerS: nRecv ? Math.round(recv / (nRecv * DT)) : null, afterMs: Math.round(after), afterTicks: nAfter, afterPerS: nAfter ? Math.round(after / (nAfter * DT)) : null, worst: +worst.toFixed(1), worstK };
  const row = score(S, cs, cpu), sm2 = S.summary2(); row.rc2 = { mode: sm2.mode, action: sm2.cls ? sm2.cls.action : (row.action ? row.action.fam : null), episode: sm2.episode ? sm2.episode.cls || null : null, rejoin: sm2.rejoin || null, launches: sm2.launches };
  rows.push(row);
}
fs.writeFileSync(outFile, JSON.stringify(rows)); console.log(`${rows.length} runs → ${outFile}`);
