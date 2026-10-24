// possess1/tools/p_blind.mjs — TOUCHES MADE BLIND over the t_search set (100 set-ups × 15 request times): a touch planned on a ball the player
// believes is where it was (an opponent's contact not yet perceived) meets the real ball only within SHARED.blindTol of where he believes it.
// In OLD the same pre-planned touch played ANY ball within 1.05 m of the body (24 of OLD's 124 quick recoveries).   node p_blind.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { runMode } from "../p_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, S = {};
for (let i = 0; i < 100; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) { const tc = Object.assign({}, t0, { tackle: [+(q * 0.1).toFixed(2)] });
    for (const m of ["SHORT", "MEDIUM", "LONG"]) { const r = runMode(ENV, tc, m), X = S[m] || (S[m] = { runs: 0, blind: 0, hit: 0, miss: 0, believedMiss: 0, byWho: {}, d: [] }); X.runs++;
      for (const p of r.W.players) for (const c of p.contacts) if (c.blind) { X.blind++; X.byWho[p.pid] = (X.byWho[p.pid] || 0) + 1; if (c.missed) X.believedMiss++; else if (c.phys === "HIT") X.hit++; else X.miss++; X.d.push(c.dBlind); } } } process.stderr.write(i % 10 ? "" : i + " "); }
console.log(`\nTOUCHES MADE BLIND — the t_search set (1500 runs per mode); the boot meets the real ball only within ${(0.155 * 100).toFixed(1)} cm of where the player believes it is`);
for (const [m, X] of Object.entries(S)) { const d = X.d.slice().sort((a, b) => a - b); console.log(`  ${m.padEnd(7)} ${X.blind} blind touches (${JSON.stringify(X.byWho)}): HIT ${X.hit} · MISSED the real ball ${X.miss} · out of reach even of his belief ${X.believedMiss} · believed-vs-real distance median ${(d[Math.floor(d.length / 2)] * 100 || 0).toFixed(0)} cm`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(S));
