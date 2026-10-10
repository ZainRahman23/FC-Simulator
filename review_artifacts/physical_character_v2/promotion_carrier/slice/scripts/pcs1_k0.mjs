// PCS-1 §4.4 K0 (official): the law provider vs the recorded simBody at every row / sub-step any run can use (k_p − 2 … the horizon cap), and the skeleton bind
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../.."), LP = await import(path.join(here, "law_provider.mjs"));
const out = { prereg: "PCS1_PREREG.md 8585adc", cases: {} }; let ok = true;
for (const [cs, kp] of [["rx_miss", 47], ["rx_free_leg", 39], ["rx_planted_leg", 38]]) { const R = LP.L.loadAir(path.join(ROOT, "promotion_carrier/evidence/records/on_rx"), cs + "_LOCO.json.gz");
  const cap = Math.min(R.prims.length - 1, kp + 1 + 150), rows = []; for (let r = kp - 2; r <= cap && r < R.rows.length; r++) rows.push(r); const k = LP.k0(R, rows); out.cases[cs] = { rows: [rows[0], rows[rows.length - 1]], ...k }; ok = ok && k.pass;
  console.log(cs.padEnd(15), "rows", rows[0], "…", rows[rows.length - 1], "segments", k.segmentsCompared, "max |Δ|", k.segMaxM, "m, bind max", k.bindMax, "same bones", k.sameBones, k.pass ? "PASS" : "FAIL"); }
out.pass = ok; fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("K0", ok ? "PASS" : "FAIL");
