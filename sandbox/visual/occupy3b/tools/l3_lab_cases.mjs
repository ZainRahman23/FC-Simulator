// occupy3b/tools/l3_lab_cases.mjs — the Limb Contact Lab's numbers computed in node, for the browser check (page ≡ node): every case the Lab lists
// (the flagship, then the §10 matrix with its mirrors), OLD STAGE 3 and STAGE 3B — Stage 3's Lab numbers (o3_lab_cases.mjs labRun: deepest, torso,
// legs, ticks > 5 cm, the outcome, the impacts, each player's severity / balance / action / steps) + Stage 3B's strikes and Σ impulse.
//   node l3_lab_cases.mjs --out f
import { ENV, runO3, arg } from "./l3_common.mjs";
import { labRun } from "../../occupy3/tools/o3_lab_cases.mjs";
import { L3CASES, FLAGSHIP } from "../l3_cases.js";
import fs from "node:fs";
export const LAB_ROWS = (() => { const out = [], base = L3CASES.filter((x) => !x.matrixMirror); out.push(base.find((x) => x.id === FLAGSHIP)); const groups = [...new Set(base.map((x) => x.group))];
  for (const g of groups) for (const r of base.filter((x) => x.group === g)) { out.push(r); const m = L3CASES.find((x) => x.matrixMirror === r.id); if (m) out.push(m); } return out; })();
const rows = []; for (const tc of LAB_ROWS) { if (rows.some((r) => r.id === tc.id)) continue; const runs = {}; for (const m of ["S3", "S3B"]) { const o = labRun(tc, m), W = runO3.last.W; o.strikes = W.l3 ? W.l3.contacts : null; o.lamSum = W.l3 ? +W.l3.apps.reduce((a, x) => a + x.lam, 0).toFixed(6) : null; runs[m] = o; } rows.push({ id: tc.id, runs }); process.stderr.write("."); }
fs.writeFileSync(arg("out", "lab_cases.json"), JSON.stringify(rows, null, 0)); console.log(`\n${rows.length} cases written`);
