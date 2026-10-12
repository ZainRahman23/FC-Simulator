// C3 legitimate-support tool check (frozen with the C3 preregistration): applies c3_support.mjs to the preserved BALANCE-2 review records
// (outside Git; SHA256SUMS there) — expected: quiet / legitimate runs 0, the documented boot-tip saves flagged. usage: node ... --rec <dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const { support, TIP } = await import(new URL("./c3_support.mjs", import.meta.url).href), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const REC = arg("rec"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(REC, k + ".json.gz")))), out = { tip: TIP, runs: {} };
for (const s of ["B1", "C2"]) { const tw = load("QUIET_" + s); out.runs["QUIET_" + s] = support(tw, null, 480, tw.recs.length);
  for (const sc of ["SMALLF", "F12", "BACKM", "LATM", "NEARF", "OVERF"]) out.runs[sc + "_" + s] = support(load(sc + "_" + s), tw, 480, 1440); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); for (const [k, v] of Object.entries(out.runs)) console.log(k.padEnd(10), JSON.stringify(v));
