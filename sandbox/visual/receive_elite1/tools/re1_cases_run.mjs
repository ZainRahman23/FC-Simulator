// receive_elite1/tools/re1_cases_run.mjs — THE 99 / 99 / 99 REFERENCE (owner #4 – #6, #9 – #14): the elite review set × seeds, CURRENT vs NEW — the owner's
// required metrics per action, the separation curves (for the review page's graphs), and the contacts with their times, feet, surfaces, speeds
//   node re1_cases_run.mjs <out.json> [seeds]
import fs from "fs"; import { makeElite, makeCurrent } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2], seeds = (process.argv[3] || "1,2,3").split(",").map(Number), rows = [];
for (const id of ALL) for (const sd of seeds) for (const pipe of ["CURRENT", "NEW"]) { const cs = parseCase(id + "_B99_D99_A99"), S = (pipe === "NEW" ? makeElite : makeCurrent)(cs, { seed: sd }); S.run(cs.scenario.dur);
  const m = tight(S, cs); m.seed = sd; m.pipeline = pipe; if (sd !== seeds[0]) delete m.sep.curve;
  if (pipe === "NEW" && S.rc2 && S.rc2.kind === "ELITE") { const ep = S.rc2.ep; m.elite = ep.summary(); m.elite.path = { Trot: ep.path.Trot, tGo: ep.path.tGo ?? null, Tx: ep.path.Tx ?? null, kind: ep.path.kind };
    m.elite.ex = ep.contacts.map((c) => ({ i: c.i, t: c.t, D: +c.D.toFixed(3), E: +c.E.toFixed(5), err: +Math.hypot(c.vExec[0] - c.vIdeal[0], c.vExec[1] - c.vIdeal[1]).toFixed(3), N: [c.N.damping, c.N.weight, c.N.direction, c.N.vertical].map((x) => +x.toFixed(3)) })); }
  else if (pipe === "NEW") m.declined = S.rc2 && S.rc2.eliteDeclined || null;
  rows.push(m); }
fs.writeFileSync(out, JSON.stringify({ ratings: "99/99/99", seeds, rows }, null, 1)); console.log(rows.length, "runs");
