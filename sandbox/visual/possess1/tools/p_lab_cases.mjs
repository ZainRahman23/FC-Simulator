// possess1/tools/p_lab_cases.mjs — every REVIEW case under every mode (node): the outcome, the authority's transitions, when each player
// perceived the first contact, the claims denied — the same code the page runs (p_run.js); p_browser.cjs compares the page with this
//   node p_lab_cases.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { PCASES } from "../p_cases.js";
import { runMode, outcomeOf, MODE_LIST } from "../p_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = [];
const S = { MISS: "MISS", "CONTACT — ATTACKER RETAINS": "RETAINS", "CONTACT — ATTACKER RECOVERS": "ATT", "CONTACT — DEFENDER RECOVERS": "DEF", "CONTACT — BALL FREE": "FREE" };
console.log(`REVIEW CASES — ${PCASES.length} cases × ${MODE_LIST.length} modes (ATT / DEF = who established control after the contact; times = establishment after the contact)`);
for (const tc of PCASES) { const o = {}, info = {};
  for (const m of MODE_LIST) { const r = runMode(ENV, tc, m), x = outcomeOf(r.W); o[m] = x ? x.kind : null; info[m] = x ? (x.est != null ? `${S[x.kind]} +${x.est.toFixed(2)}` : S[x.kind] || x.kind) : "—"; }
  out.push({ id: tc.id, outcomes: o }); console.log(`  ${tc.id.padEnd(15)} ${MODE_LIST.map((m) => `${m} ${info[m]}`.padEnd(18)).join("")}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
