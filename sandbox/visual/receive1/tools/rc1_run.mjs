// receive1/tools/rc1_run.mjs — run a chunk of the receive matrix: node rc1_run.mjs <block> <chunk> <nChunks> <seeds e.g. "1,2"> <out.json>
// (RC1OVR passes adapter parameter overrides for experiments)
import fs from "fs"; import { makeReceive, PROFILES } from "./rc1_env.mjs"; import { matrix, seedCase } from "./rc1_cases.mjs"; import { score } from "./rc1_metrics.mjs";
const [block, ci, nc, seedsS, out] = process.argv.slice(2), seeds = seedsS.split(",").map(Number), cases = matrix(block).filter((_, i) => i % +nc === +ci), rows = [];
for (const cs0 of cases) for (const seed of seeds) {
  const cs = seedCase(cs0, seed), S = makeReceive(cs.scenario, { seed, player: PROFILES.HIGH, opts: { record: true } }), t0 = performance.now(); let err = null;
  // (CPU: the whole run, and the receive phase alone — until the first touch launched, or the end)
  let tRecv = null; try { while (S.k < Math.round(cs.scenario.dur / (1 / 240)) && !S.fault) { S.step(); if (tRecv == null && S.rc.phase !== "approach") tRecv = { ms: performance.now() - t0, k: S.k }; } } catch (e) { err = String(e && e.stack || e).slice(0, 400); }
  const ms = performance.now() - t0, r = score(S, cs, { totalMs: +ms.toFixed(1), msPerSimS: +(ms / (S.k / 240)).toFixed(1), recvMs: tRecv ? +tRecv.ms.toFixed(1) : +ms.toFixed(1), recvSimS: tRecv ? +(tRecv.k / 240).toFixed(3) : +(S.k / 240).toFixed(3), plans: S.cpu.plans });
  if (err) r.error = err; rows.push(r);
}
fs.writeFileSync(out, JSON.stringify(rows));
