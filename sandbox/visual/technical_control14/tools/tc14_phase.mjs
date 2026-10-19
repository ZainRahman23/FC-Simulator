// technical_control14/tools/tc14_phase.mjs — TECHNICAL-CONTROL-1.3's phasing diagnostics (tools/tc13_phase.mjs, on the posed skeleton) on TECHNICAL-CONTROL-1.4's
// direction changes, the body TECHNICAL-CONTROL-1.3's FlowBody: leg intersections, pelvis / ankle pops, planted-foot slip, support swaps, IK correction —
// every efficiency case (angles × Dribbling 99 / 80 / 50 × seeds, both turn sides).   node tc14_phase.mjs <out.jsonl> [shard/of]
import fs from "fs"; import { runPhase, analysePhase } from "../../technical_control13/tools/tc13_phase.mjs"; import { FlowBody } from "../../technical_control13/tc13_body.js"; import { ChopBody } from "../tc14_body.js"; import { makeEff } from "./tc14_env.mjs"; import { makeFlow } from "../../technical_control13/tools/tc13_phase.mjs"; import { ANGLES } from "./tc14_eff.mjs";
const [out, shard] = process.argv.slice(2), [sh, of] = (shard || "0/1").split("/").map(Number), fd = fs.openSync(out, "a"), jobs = [];
for (const ang of ANGLES) for (const d of [99, 80, 50]) for (const seed of [1, 2, 3]) for (const left of [false, true]) jobs.push({ id: `CUT${ang}${left ? "_L" : ""}_B99_D${d}_A99`, ang, d, seed, left });
for (const [n, J] of jobs.entries()) { if (n % of !== sh) continue; let row;
  try { const run = runPhase(J.id, process.argv.includes("--before") ? FlowBody : ChopBody, { seed: J.seed, make: process.argv.includes("--before") ? makeFlow : makeEff }), A = analysePhase(run), ep = run.S.rc2 && run.S.rc2.ep;
    row = Object.assign({}, J, { actions: ep ? ep.techLog.filter((e) => e.ev === "action").map((e) => e.fam + (e.absorbed ? "@now" : "")) : [], contacts: run.cons.map((c) => c.F + c.surface[0] + "@" + c.t.toFixed(3)).join(" "), earlyFlags: run.tflags, lateFlags: run.flags.length }, A); }
  catch (e) { row = Object.assign({}, J, { error: String(e && e.stack || e).slice(0, 400) }); }
  fs.writeSync(fd, JSON.stringify(row) + "\n"); }
