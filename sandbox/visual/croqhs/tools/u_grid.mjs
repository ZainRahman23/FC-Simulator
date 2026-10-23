// tc_unified1/tools/u_grid.mjs — WHERE EACH ACTION WINS: snaps at JOG / RUN / SPRINT × 30 … 180° (8 traces each: 4 stride phases × both sides),
// the first action chosen per configuration — to find each named move's (and generic family's) favourable states (simulation only)
//   node u_grid.mjs [--configs FULL] [--json f]
import { survey } from "./u_survey.mjs";
import { scenSpecs } from "../u_tests.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, cfgs = opt("configs", "FULL").split(","), out = {};
for (const cfg of cfgs) { out[cfg] = {}; console.log(`■ ${cfg}`);
  for (const mode of ["JOG", "RUN", "SPRINT"]) for (let ang = 30; ang <= 180; ang += 15) { const H = {}; for (const sp of scenSpecs(mode, ang)) { const r = survey(cfg, sp), k = r.first.replace(/ [RL]$/, ""); H[k] = (H[k] || 0) + 1; }
    out[cfg][mode + " " + ang] = H; console.log(`  ${mode.padEnd(6)} ${String(ang).padStart(3)}°  ${Object.entries(H).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(", ")}`); } }
if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1));
