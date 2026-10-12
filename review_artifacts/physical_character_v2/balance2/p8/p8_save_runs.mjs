// BALANCE-2 P8 VISUAL PREPARATION (presentation only): the frozen C3, undisturbed twin and B2M back.small push (5.84 N·s, 50 ms, onset step 480),
// 14 s (3360 steps), so the slow post-push upper-body lean (p8/P8_DIAGNOSIS.md) can be seen beside the twin. usage (worktree root): node ... --out <dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs"), { C3Controller } = await import(R + "balance2/c3/c3_ctrl.mjs");
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, R))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const BP = J("balance1/params/B1_BODY.json"), P = J("balance2/c3/params/C3.json"), lines = [];
for (const [k, pj] of [["P8TWIN_C3", []], ["P8BACKS_C3", BT.pushJob("back", 5.84, 480, 12)]]) { const o = await B1.runOne({ law: "M1B", params: BP, ctrl: () => new C3Controller(P), steps: 3360, perturb: pj });
  fs.writeFileSync(path.join(OUT, k + ".json.gz"), zlib.gzipSync(JSON.stringify(o))); lines.push(`${k} ${o.finalHash}`); console.log(k, o.recs.length, o.finalHash); }
fs.writeFileSync(path.join(OUT, "FINAL_HASHES_P8.txt"), lines.join("\n") + "\n");
