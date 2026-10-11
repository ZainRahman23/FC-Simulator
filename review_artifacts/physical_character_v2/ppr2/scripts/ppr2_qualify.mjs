// PPR-2 qualification runner: one law through the whole frozen battery (ppr2_battery.mjs) → one evidence JSON (+ wall-clock per family).
// usage: V2_KNEE_MODEL=v2k node ppr2_qualify.mjs --fixture <PVP1A_FIXTURE.json> --law A|S [--params <json>] --label <id> --out <json>
import fs from "fs";
const BT = await import(new URL("./ppr2_battery.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), law = arg("law", "S"), params = arg("params") ? JSON.parse(fs.readFileSync(arg("params"))) : undefined, label = arg("label", law);
const out = { protocol: "PPR-2 qualification battery", label, law, params: params || null, battery: BT.BATTERY, wall: {} };
for (const [fam, fn] of [["T1", BT.T1], ["T2", BT.T2], ["T3", BT.T3], ["T4", BT.T4], ["T7", BT.T7]]) { const t = Date.now(); out[fam] = await fn(FIX, law, params); out.wall[fam] = (Date.now() - t) / 1000; console.log(label, fam, "done", out.wall[fam].toFixed(1), "s"); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log("wrote", arg("out"));
