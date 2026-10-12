// PPR-3 VISUAL PREPARATION (presentation only): deterministic runs for the review clips, CURRENT V2 | S2 | S2 + P2 (frozen S2 and P2
// candidates, motor noise as frozen). Scenarios: STAND (undisturbed 0–6 s; S2 = S2 alone, constant tone) and three pushes at t = 0.5 s (all
// three bodies still upright then): PUSHF moderate forward 9.7 N·s, PUSHL moderate lateral (left) 24.9 N·s, PUSHX unrecoverable forward 36.4 N·s.
// In push scenarios the S2 panel is S2 with P2's own UNDISTURBED command sequence replayed (no feedback: mechanics only).
// usage: V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node ppr3_save_runs.mjs --out <dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../", import.meta.url), BT = await import(new URL("scripts/ppr3_battery.mjs", R).href), { runOne } = await import(new URL("scripts/ppr3_run.mjs", R).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const CFG = { body: JSON.parse(fs.readFileSync(new URL("params/PPR3_S2_CANDIDATE.json", R))), ctrl: JSON.parse(fs.readFileSync(new URL("params/PPR3_P2_CANDIDATE.json", R))) };
const save = (k, o) => { fs.writeFileSync(path.join(OUT, k + ".json.gz"), zlib.gzipSync(JSON.stringify(o))); console.log(k, o.recs.length, o.finalHash, o.stop ? "stop " + o.stop.reason : ""); };
const base = await runOne(BT.makeJob("S2P2", CFG, { steps: 1440 })); save("STAND_S2P2", base);
save("STAND_A", await runOne(BT.makeJob("A", CFG, { steps: 1440 }))); save("STAND_S2", await runOne(BT.makeJob("S2", CFG, { steps: 1440 })));
const onset = 120, steps = 840;
for (const [key, dir, J] of [["PUSHF", "fwd", 9.7], ["PUSHL", "left", 24.9], ["PUSHX", "fwd", 36.4]]) { const perturb = BT.pushJob(dir, J, onset, 12);
  save(key + "_A", await runOne(BT.makeJob("A", CFG, { steps, perturb }))); save(key + "_S2R", await runOne(BT.makeJob("S2R", CFG, { steps, perturb, replayLog: base.ctrlLog })));
  save(key + "_S2P2", await runOne(BT.makeJob("S2P2", CFG, { steps, perturb }))); }
