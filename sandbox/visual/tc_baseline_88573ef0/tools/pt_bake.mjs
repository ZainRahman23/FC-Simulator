// tc_playtest1/tools/pt_bake.mjs — bakes the two RUN-1 tables PLAYTEST-1 reads at start-up (each RUN-1 gait solve costs 50 – 100 ms; the browser must
// start at once): the step period / duty factor per 0.25 m/s (pt_params.gaitTable) and RUN-1's swing path per 0.25 m/s (tc15_ref's runTemplate).
// The baked numbers are the frozen gait's own (JSON round-trips doubles exactly) — node and the page read the same file.
import { ENV } from "./pt_env.mjs";
import { gaitTable } from "../pt_params.js";
import { RefSim } from "../../technical_control15/tc15_ref.js";
import fs from "node:fs";
const t0 = performance.now(), G = gaitTable(ENV.E, ENV.body, null), gait = [];
for (let i = 0; i <= 40; i++) { const g = G.rows[i]; gait.push([g.v, g.Ts, g.D]); }
const fake = Object.create(RefSim.prototype); fake.E = ENV.E; fake.b = ENV.body; const run = {};
for (let k = 12; k <= 38; k++) { const v = k / 4; run[v.toFixed(2)] = fake.runTemplate(v); }
fs.writeFileSync(new URL("../pt_baked.json", import.meta.url), JSON.stringify({ note: "RUN-1 (run1_gait_v13) tables baked by tools/pt_bake.mjs — gait [v, Ts, D] · run[v] = tc15_ref runTemplate(v)", gait, run }));
console.log(`baked in ${(performance.now() - t0).toFixed(0)} ms`);
