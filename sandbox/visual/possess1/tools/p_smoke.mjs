// possess1/tools/p_smoke.mjs — one Lab case under every mode: the outcome, the authority's transitions, the perceptions   node p_smoke.mjs [case]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { TCASES } from "../../tackle1/t_cases.js";
import { runMode, modeReport, MODE_LIST } from "../p_run.js";
const ids = process.argv[2] ? process.argv[2].split(",") : ["carry-jog-l"];
for (const id of ids) { const tc = TCASES.find((x) => x.id === id); console.log(`\n══ ${id} — ${tc.name}`);
  for (const m of MODE_LIST) { const c0 = performance.now(), r = runMode(ENV, tc, m), R = modeReport(r.W, r.t0), o = R.outcome; console.log(`  ${m.padEnd(7)} ${o ? o.kind.padEnd(30) : "—".padEnd(30)} ${o ? o.why : ""}  [${(performance.now() - c0).toFixed(0)} ms]`);
    if (R.authority && process.env.V) for (const e of R.authority) console.log(`          ${e.t.toFixed(3)} ${e.to ? e.from + " → " + e.to + " · " + e.why : e.note}`);
    if (R.denied && process.env.V) for (const e of R.denied) console.log(`          ${e.t.toFixed(3)} DENIED ${e.who}: ${e.why}`);
    if (R.checks && (R.checks.dual || R.checks.noTouch)) console.log("          CHECKS", JSON.stringify(R.checks)); } }
