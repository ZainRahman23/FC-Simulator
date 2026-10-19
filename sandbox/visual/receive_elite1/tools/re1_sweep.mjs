// receive_elite1/tools/re1_sweep.mjs — WORKING BACKWARD FROM 99 (owner §22 – §26): the elite review set × seeds under each attribute series —
//   BC 99 … 50 (Dribbling, Agility 99) · Dribbling 99 … 50 (Ball Control, Agility 99) · Agility 99 … 50 (Ball Control, Dribbling 99) · combined 99 … 50
//   node re1_sweep.mjs <out.json> [seeds] [shard/n] [series list] [ids]
import fs from "fs"; import { makeElite } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2], seeds = (process.argv[3] || "1,2,3").split(",").map(Number), [si, sn] = (process.argv[4] || "0/1").split("/").map(Number), LV = [99, 90, 80, 70, 60, 50];
const SER = { BC: (v) => [v, 99, 99], DRI: (v) => [99, v, 99], AGI: (v) => [99, 99, v], ALL: (v) => [v, v, v] }, series = (process.argv[5] || "BC,DRI,AGI,ALL").split(","), ids = process.argv[6] ? process.argv[6].split(",") : ALL;
const jobs = []; for (const s of series) for (const v of LV) for (const id of ids) for (const sd of seeds) jobs.push([s, v, id, sd]);
const rows = [];
for (const [j, [s, v, id, sd]] of jobs.entries()) { if (j % sn !== si) continue; const [b, d, a] = SER[s](v), cs = parseCase(`${id}_B${b}_D${d}_A${a}`), S = makeElite(cs, { seed: sd }); S.run(cs.scenario.dur);
  const m = tight(S, cs); delete m.sep.curve; m.series = s; m.level = v; m.seed = sd; const ep = S.rc2 && S.rc2.kind === "ELITE" ? S.rc2.ep : null;
  if (ep) { const c = ep.contacts; m.elite = { n: c.length, rec: c.filter((x) => x.recovery).length, failed: ep.failed, miss: c.slice(1).map((x) => x.miss), corr: ep.corr.map((x) => +Math.hypot(x.d[0], x.d[1]).toFixed(3)),
      c0: c[0] ? { dirErr: +(Math.atan2(c[0].vExec[1], c[0].vExec[0]) - Math.atan2(c[0].vIdeal[1], c[0].vIdeal[0])).toFixed(4), speedErr: +(Math.hypot(c[0].vExec[0], c[0].vExec[1]) - Math.hypot(c[0].vIdeal[0], c[0].vIdeal[1])).toFixed(3), D: +c[0].D.toFixed(3), E: c[0].E } : null,
      errs: c.map((x) => +Math.hypot(x.vExec[0] - x.vIdeal[0], x.vExec[1] - x.vIdeal[1]).toFixed(3)), Trot: ep.path.Trot, Tx: ep.path.Tx || null } } rows.push(m); }
fs.writeFileSync(out, JSON.stringify(rows)); console.log(rows.length, "runs →", out);
