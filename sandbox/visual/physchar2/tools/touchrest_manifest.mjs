// ═══ physchar2/tools/touchrest_manifest.mjs — the FROZEN run list of the touch-rest validation (touch_semantics/TOUCHREST_PREREG.md §2). Deterministic.
// usage: node tools/touchrest_manifest.mjs <out.json>
import fs from "fs";
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], FEET = ["L", "R"], DROPS = [0, 0.010, 0.020, 0.025, 0.030], RS = [0, 0.005, 0.02, 0.03, 0.05], RAMPS = [2, 4, 8];
const BASE = { ikRefTwist: true }, ARMS = { B1TR: { ffLockedAxis: true, touchRest: true }, B1: { ffLockedAxis: true }, TR: { touchRest: true }, ORIG: {} }, runs = [];
const id = (o) => [o.set, o.body, o.foot, `d${o.drop}`, `r${o.r}`, `R${o.ramp}`, o.arm, o.lift ? `L${o.lift.h}` : "", o.bump ? `B${o.bump.dz}` : "", o.push ? `p${o.push.dir}${o.push.J}@${o.push.t}` : "", o.hz && o.hz !== 240 ? `hz${o.hz}` : "", o.rep ? `rep${o.rep}` : ""].filter(Boolean).join("_");
const add = (o) => runs.push({ ...o, flags: ARMS[o.arm], end: o.end ?? (3 + o.ramp + (o.lift ? 9 : 4)) });
for (const body of BODIES) for (const foot of FEET) for (const drop of DROPS) for (const r of RS) for (const ramp of RAMPS) add({ set: "P", body, foot, drop, r, ramp, arm: "B1TR" });
for (const body of BODIES) for (const foot of FEET) for (const drop of DROPS) for (const ramp of RAMPS) add({ set: "P-B1", body, foot, drop, r: 0, ramp, arm: "B1" });
for (const body of BODIES) for (const foot of FEET) for (const drop of DROPS) add({ set: "P-TR", body, foot, drop, r: 0, ramp: 4, arm: "TR" });
for (const body of BODIES) for (const foot of FEET) for (const drop of [0.010, 0.025, 0.030]) for (const [h, hover] of [[0.0005, 2], [0.001, 2], [0.005, 0.5]]) add({ set: "L", body, foot, drop, r: 0, ramp: 4, arm: "B1TR", lift: { h, hover } });
for (const body of BODIES) for (const foot of FEET) for (const drop of [0.010, 0.025, 0.030]) add({ set: "L-B1", body, foot, drop, r: 0, ramp: 4, arm: "B1", lift: { h: 0.005, hover: 0.5 } });
for (const arm of ["B1TR", "B1"]) for (const body of BODIES) for (const foot of FEET) for (const dz of [0.002, -0.002, 0.005, -0.005]) add({ set: "XB", body, foot, drop: 0.025, r: 0, ramp: 4, arm, bump: { dz, t: 8.0 } });
for (const arm of ["B1TR", "ORIG"]) for (const body of BODIES) for (const foot of FEET) for (const dir of ["toward", "away"]) for (const J of [2.5, 5]) for (const t of [6.46, 8.0]) add({ set: "XP", body, foot, drop: 0.025, r: 0, ramp: 4, arm, push: { dir, J, t, dur: 0.1, body: "thorax" }, end: 12 });
for (const hz of [180, 480]) for (const body of BODIES) for (const foot of FEET) add({ set: "HZ", body, foot, drop: 0.025, r: 0, ramp: 4, arm: "B1TR", lift: { h: 0.005, hover: 0.5 }, hz });
for (const rep of [1, 2]) { add({ set: "D", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, arm: "B1TR", rep }); add({ set: "D", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, arm: "B1TR", lift: { h: 0.005, hover: 0.5 }, rep }); add({ set: "D", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, arm: "B1TR", push: { dir: "toward", J: 5, t: 8.0, dur: 0.1, body: "thorax" }, end: 12, rep }); }
for (const foot of FEET) add({ set: "W", body: "V2-REF", foot, drop: 0.025, r: 0, ramp: 4, arm: "B1TR" }); add({ set: "W", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, arm: "B1TR", lift: { h: 0.005, hover: 0.5 } });
for (const body of BODIES) add({ set: "O", body, foot: "L", drop: 0.025, r: 0, ramp: 4, arm: "ORIG", end: 11 }); add({ set: "O", body: "V2-REF", foot: "R", drop: 0.025, r: 0, ramp: 4, arm: "ORIG", end: 11 });
for (const r of runs) r.id = id(r);
if (new Set(runs.map(r => r.id)).size !== runs.length) throw new Error("duplicate ids");
const counts = runs.reduce((a, r) => ((a[r.set] = (a[r.set] || 0) + 1), a), {});
fs.writeFileSync(process.argv[2], JSON.stringify({ generated: "tools/touchrest_manifest.mjs", prereg: "touch_semantics/TOUCHREST_PREREG.md §2", counts, total: runs.length, runs }, null, 1));
console.log(`manifest: ${runs.length} runs ${JSON.stringify(counts)}`);
