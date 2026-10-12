// BALANCE-1 VISUAL PREPARATION (presentation only): deterministic runs for the review clips — CURRENT V2 (law A) | S2 + old P2 (PPR-3 frozen) |
// M1b + BALANCE-1 (the qualified / final candidate). Scenarios at t = 0.5 s (all three still upright then): STAND (undisturbed 0–6 s, motor noise
// as each controller's own), SMALLF (small forward), PUSHF (moderate forward), PUSHL (moderate lateral left), PUSHX (over-limit forward) at the
// BALANCE-1 battery's human-level magnitudes (b1_qualify.mjs B1B.J: 6.5 / 12.0 / 15.0 / 28.0 N·s). usage: V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node b1_save_runs.mjs --ctrl <ctrl.json> --body <body.json> --out <dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, { B1B } = await import(R + "balance1/scripts/b1_qualify.mjs"), BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), P3 = await import(R + "ppr3/scripts/ppr3_run.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs"), CT = await import(R + "balance1/scripts/b1_ctrl.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const S2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_S2_CANDIDATE.json", R))), P2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_P2_CANDIDATE.json", R))), CP = JSON.parse(fs.readFileSync(arg("ctrl"))), BP = JSON.parse(fs.readFileSync(arg("body")));
const save = (k, o) => { fs.writeFileSync(path.join(OUT, k + ".json.gz"), zlib.gzipSync(JSON.stringify(o))); console.log(k, o.recs.length, o.finalHash, o.stop ? "stop " + o.stop.reason : ""); return o; };
const jobs = (steps, perturb) => ({ A: () => P3.runOne(BT.makeJob("A", { body: S2, ctrl: P2 }, { steps, perturb })), S2P2: () => P3.runOne(BT.makeJob("S2P2", { body: S2, ctrl: P2 }, { steps, perturb })), B1: () => B1.runOne({ law: "M1B", params: BP, ctrl: () => new CT.BalanceController(CP), steps, perturb }) });
for (const [k, f] of Object.entries(jobs(1440, []))) save("STAND_" + k, await f());
for (const [key, dir, J] of [["SMALLF", "fwd", B1B.J.fwd.small], ["PUSHF", "fwd", B1B.J.fwd.moderate], ["PUSHL", "left", B1B.J.left.moderate], ["PUSHX", "fwd", B1B.J.fwd.over]]) for (const [k, f] of Object.entries(jobs(840, BT.pushJob(dir, J, 120, 12)))) save(key + "_" + k, await f());
