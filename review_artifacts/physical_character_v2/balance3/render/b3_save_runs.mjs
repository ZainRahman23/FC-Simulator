// BALANCE-3 VISUAL PREPARATION (presentation only; frozen with the B3 preregistration): deterministic B3 runs of the SAME seven review scenarios as
// balance2/render/c3_save_runs.mjs (QUIET; SMALLF fwd 4.82; F12 fwd 12.0; BACKM back 11.69; LATM left 15.0; NEARF fwd 14.0; OVERF fwd 21.5 N·s;
// 50 ms at step 480; 1440 steps), plus the P8 case at 14 s (P8TWIN = undisturbed, P8BACKS = B2M back.small 5.84 N·s; 3360 steps), so B3 panels sit
// beside the preserved C3 records. usage (worktree root): node .../b3_save_runs.mjs --out <records dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs"), { B3Controller } = await import(R + "balance3/b3/b3_ctrl.mjs");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, R))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const BP = J("balance1/params/B1_BODY.json"), P = J("balance3/b3/params/B3.json"), lines = [];
const SCEN = [["QUIET", null, 0, 1440], ["SMALLF", "fwd", 4.82, 1440], ["F12", "fwd", 12.0, 1440], ["BACKM", "back", 11.69, 1440], ["LATM", "left", 15.0, 1440], ["NEARF", "fwd", 14.0, 1440], ["OVERF", "fwd", 21.5, 1440], ["P8TWIN", null, 0, 3360], ["P8BACKS", "back", 5.84, 3360]];
for (const [key, dir, Jn, steps] of SCEN) { const o = await B1.runOne({ law: "M1B", params: BP, ctrl: () => new B3Controller(P), steps, perturb: dir ? BT.pushJob(dir, Jn, 480, 12) : [] });
  fs.writeFileSync(path.join(OUT, key + "_B3.json.gz"), zlib.gzipSync(JSON.stringify(o))); lines.push(`${key}_B3 ${o.finalHash}`); console.log(key + "_B3", o.recs.length, o.finalHash, o.stop ? "stop " + o.stop.reason : ""); }
fs.writeFileSync(path.join(OUT, "FINAL_HASHES_B3.txt"), lines.join("\n") + "\n");
