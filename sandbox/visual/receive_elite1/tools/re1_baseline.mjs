// receive_elite1/tools/re1_baseline.mjs — CURRENT (RECEIVE-MOVING-1 on RECEIVE-CONTROL-2) on the elite review set at Ball Control 99 / Dribbling 99 /
// Agility 99 (the receive layer reads Ball Control only; DRIBBLE-V1 reads all three): the separation, contacts, speeds, timings.   node re1_baseline.mjs <out.json> [seeds]
import fs from "fs"; import { makeCurrent } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2] || "re1_baseline.json", seeds = (process.argv[3] || "1").split(",").map(Number), rows = [];
for (const id of (process.argv[4] ? process.argv[4].split(",") : ALL)) for (const sd of seeds) { const cs = parseCase(id + "_B99_D99_A99"), S = makeCurrent(cs, { seed: sd }); S.run(cs.scenario.dur); const m = tight(S, cs); m.seed = sd; m.pipeline = "CURRENT"; rows.push(m);
  console.log(id.padEnd(22), (m.family || "").padEnd(14), m.cls5.padEnd(9), "sep recv", JSON.stringify(m.sep.receive), "turn", JSON.stringify(m.sep.turn), "rxC", m.receiveContacts, "gaps", JSON.stringify(m.gaps), "v", JSON.stringify(m.speed), "align", m.tAlign, "stable", m.tStable); }
fs.writeFileSync(out, JSON.stringify({ pipeline: "CURRENT (RECEIVE-MOVING-1 036d60ce)", ratings: "99/99/99", rows }, null, 1));
