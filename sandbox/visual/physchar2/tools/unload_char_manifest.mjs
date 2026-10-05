// ═══ physchar2/tools/unload_char_manifest.mjs — the FROZEN run list of the unloading characterization V2
// (review_artifacts/physical_character_v2/unload_fix/UNLOAD_FIX_PREREG.md §3.2). Deterministic; written before any run.
// usage: node tools/unload_char_manifest.mjs <out.json>
import fs from "fs";
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], FEET = ["L", "R"], DROPS = [0, 0.010, 0.020, 0.025, 0.030], RS = [0, 0.005, 0.02, 0.03, 0.05];
const ARMS = { ORIG: {}, B1: { ffLockedAxis: true }, B3: { shareCap: true }, B1B3: { ffLockedAxis: true, shareCap: true } }, runs = [];
const id = (o) => [o.set, o.body, o.foot, `d${o.drop}`, `r${o.r}`, o.arm, o.push ? `p${o.push.dir}${o.push.J}@${o.push.t}` : "", o.rep ? `rep${o.rep}` : ""].filter(Boolean).join("_");
for (const body of BODIES) for (const foot of FEET) for (const drop of DROPS) for (const r of RS) for (const arm of Object.keys(ARMS)) runs.push({ set: "P", body, foot, drop, r, arm, flags: ARMS[arm], end: 11 });
for (const body of BODIES) for (const foot of FEET) for (const drop of DROPS) for (const arm of Object.keys(ARMS)) runs.push({ set: "R", body, foot, drop, r: 0, arm, flags: ARMS[arm], suppressRelease: true, end: 11 });
for (const arm of ["ORIG", "B1B3"]) for (const body of BODIES) for (const foot of FEET) for (const dir of ["toward", "away"]) for (const J of [2.5, 5]) for (const t of [6.46, 8.0]) runs.push({ set: "X", body, foot, drop: 0.025, r: 0, arm, flags: ARMS[arm], push: { dir, J, t, dur: 0.1, body: "thorax" }, end: 12 });
for (const rep of [1, 2]) { runs.push({ set: "D", body: "V2-REF", foot: "L", drop: 0.025, r: 0, arm: "B1B3", flags: ARMS.B1B3, end: 11, rep }); runs.push({ set: "D", body: "V2-REF", foot: "L", drop: 0.025, r: 0, arm: "B1B3", flags: ARMS.B1B3, push: { dir: "toward", J: 5, t: 8.0, dur: 0.1, body: "thorax" }, end: 12, rep }); }
for (const foot of FEET) runs.push({ set: "W", body: "V2-REF", foot, drop: 0.025, r: 0, arm: "B1B3", flags: ARMS.B1B3, end: 11 });
for (const r of runs) r.id = id(r);
if (new Set(runs.map(r => r.id)).size !== runs.length) throw new Error("duplicate ids");
const counts = runs.reduce((a, r) => ((a[r.set] = (a[r.set] || 0) + 1), a), {});
fs.writeFileSync(process.argv[2], JSON.stringify({ generated: "tools/unload_char_manifest.mjs", prereg: "unload_fix/UNLOAD_FIX_PREREG.md §3.2", counts, total: runs.length, runs }, null, 1));
console.log(`manifest: ${runs.length} runs ${JSON.stringify(counts)}`);
