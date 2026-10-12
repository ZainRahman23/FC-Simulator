// BALANCE-2 C3 VISUAL PREPARATION (presentation only; frozen with the C3 preregistration): deterministic C3 runs of the SAME seven review
// scenarios as render/b2_save_runs.mjs (copied here, not imported: importing b2_save_runs would re-run all four BALANCE-2 systems), so the C3
// panels sit beside the preserved CURRENT V2 / S2 + P2 / BALANCE-1 B / C2 records (outside Git, SHA256SUMS). Onset step 480, 50 ms pelvis pulse:
//   QUIET 0 · SMALLF fwd 4.82 · F12 fwd 12.0 · BACKM back 11.69 · LATM left 15.0 · NEARF fwd 14.0 · OVERF fwd 21.5 N·s; 1440 steps (6 s)
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node c3_save_runs.mjs --out <records dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs"), C3M = await import(R + "balance2/c3/c3_ctrl.mjs");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, R))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const BP = J("balance1/params/B1_BODY.json"), C3P = J("balance2/c3/params/C3.json");
export const SCEN = [["QUIET", null, 0], ["SMALLF", "fwd", 4.82], ["F12", "fwd", 12.0], ["BACKM", "back", 11.69], ["LATM", "left", 15.0], ["NEARF", "fwd", 14.0], ["OVERF", "fwd", 21.5]], ONSET = 480, STEPS = 1440;
const hashes = []; for (const [key, dir, Jn] of SCEN) { const o = await B1.runOne({ law: "M1B", params: BP, ctrl: () => new C3M.C3Controller(C3P), steps: STEPS, perturb: dir ? BT.pushJob(dir, Jn, ONSET, 12) : [] });
  fs.writeFileSync(path.join(OUT, key + "_C3.json.gz"), zlib.gzipSync(JSON.stringify(o))); console.log(key + "_C3", o.recs.length, o.finalHash, o.stop ? "stop " + o.stop.reason : ""); hashes.push(`${key}_C3 ${o.finalHash}`); }
fs.writeFileSync(path.join(OUT, "FINAL_HASHES_C3.txt"), hashes.join("\n") + "\n");
