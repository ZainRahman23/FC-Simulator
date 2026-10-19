// technical_control14/tools/tc14_torture.mjs — TECHNICAL-CONTROL-1.3's transition torture set (receive → turn → dribble) on TECHNICAL-CONTROL-1.4 (its
// efficiency layer + ChopBody): the phasing diagnostics as TECHNICAL-CONTROL-1.3 measured them (owner §18: the transition work preserved).
//   node tc14_torture.mjs <out.jsonl> [ratings 99] [shard/of]
import fs from "fs"; import { runPhase, analysePhase } from "../../technical_control13/tools/tc13_phase.mjs"; import { tortureIds, specId } from "../../technical_control13/tc13_cases.js"; import { ChopBody } from "../tc14_body.js"; import { makeEff } from "./tc14_env.mjs";
const out = process.argv[2], r = +(process.argv[3] || 99), [sh, of] = (process.argv[4] || "0/1").split("/").map(Number), fd = fs.openSync(out, "a");
for (const [n, J] of tortureIds().entries()) { if (n % of !== sh) continue; const s = specId(J.spec, [r, r, r]); let row;
  try { const run = runPhase(s.id, ChopBody, { foot: s.foot, style: s.style || undefined, make: makeEff }), A = analysePhase(run); row = Object.assign({ group: J.group, spec: J.spec, body: "tc14", ratings: r, actions: run.S.rc2 && run.S.rc2.ep && run.S.rc2.ep.techLog ? run.S.rc2.ep.techLog.filter((e) => e.ev === "action").map((e) => e.fam) : [] }, A); }
  catch (e) { row = { spec: J.spec, body: "tc14", ratings: r, error: String(e && e.stack || e).slice(0, 300) }; }
  fs.writeSync(fd, JSON.stringify(row) + "\n"); }
