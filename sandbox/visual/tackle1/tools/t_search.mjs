// tackle1/tools/t_search.mjs — WHAT IS POSSIBLE: for each random set-up (t_matrix's generator), every request time 0 … 1.4 s in 0.1 s steps; the
// outcome distribution over the COMMITTED tackles (not a calibration — fixtures are not a match distribution), and the cases of each kind
//   node t_search.mjs [--n 100] [--seed 7] [--contact POKE] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { runCase, caseReport } from "../t_run.js";
import { trialCase } from "./t_matrix.mjs";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg("n", 100), seed = +arg("seed", 7), tally = {}, ex = {}, rows = [], declines = {}; let committed = 0, runs = 0;
for (let i = 0; i < N; i++) { const tc0 = trialCase(i, seed);
  for (let q = 0; q <= 14; q++) { const tq = +(q * 0.1).toFixed(2), tc = Object.assign({}, tc0, { tackle: [tq] }), r = runCase(ENV, tc, { contact: arg("contact") }), R = caseReport(r.W, r.t0), S = R.action; runs++;
    if (!S) { const q = R.requests[0], why = (q && q.reason || "?").split(":")[0]; declines[why] = (declines[why] || 0) + 1; continue; } committed++; const k = S.outcome.kind; tally[k] = (tally[k] || 0) + 1; (ex[k] || (ex[k] = [])).push({ i, tq, name: tc0.name, why: S.outcome.why, hits: S.hits.length }); rows.push({ i, tq, k, fam: S.family, c: S.c, dv: S.hits[0] ? S.hits[0].dv : null, angle: S.angle, range: S.range, approach: S.approach, foot: S.foot, att: tc0.c.tech + "·" + tc0.c.variant, episodes: S.episodes, commit: S.commit, ctl: S.controlReady, rec: S.recoveryStart }); }
  if (i % 10 === 0) process.stderr.write(`${i} `); }
console.log(`\nSEARCH ${N} set-ups × 15 request times = ${runs} runs; ${committed} committed tackles (seed ${seed}, contact ${arg("contact", "POKE")})`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(36)} ${String(v).padStart(4)}  (${(100 * v / committed).toFixed(1)} %)`);
console.log(`  declined: ${JSON.stringify(declines)}`);
for (const k of ["CONTROLLED WIN", "WON · CONTESTED", "DEFENDER TOUCH", "LOOSE BALL", "LOOSE · DEFENDER SIDE"]) if (ex[k]) console.log(`${k}: ${ex[k].slice(0, 6).map((e) => `#${e.i}@${e.tq}`).join(" ")}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ N, seed, runs, committed, tally, declines, ex, rows }));
