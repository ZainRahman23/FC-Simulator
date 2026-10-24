// occupy1/tools/o_lab_cases.mjs — the Review Lab's cases computed in node (the same runs, the same live poses): per case and mode the deepest
// resolved penetration, the ticks beyond the hard limit, the outcome, the ball contacts THROUGH a body, the touches / boots blocked — the browser
// check (o_browser.cjs) compares the page's numbers with these.   node o_lab_cases.mjs --out f.json
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO, outcomeO } from "../o_run.js";
import { measureRun, summary } from "./o_measure.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = [];
for (const tc of OCASES) { const row = { id: tc.id, runs: {} };
  for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m), S = summary(measureRun(ENV, r.W, r.clip), r.t0), o = outcomeO(r.W); row.runs[m] = { best: +Math.max(0, S.best ? S.best.pen : 0).toFixed(5), over5: S.nHard, out: o ? o.kind : null, through: S.through.length, blocked: r.W.occOn ? r.W.occ.blocked : 0 }; }
  out.push(row); process.stderr.write("."); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(`\n${out.length} cases → ${arg("out")}`);
