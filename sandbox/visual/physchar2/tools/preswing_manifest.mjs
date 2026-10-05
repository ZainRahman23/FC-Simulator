// ═══ physchar2/tools/preswing_manifest.mjs — the FROZEN run list of the pre-swing / contact-boundary validation (preswing/PRESWING_VALIDATION_PREREG.md §2). Deterministic.
// usage: node tools/preswing_manifest.mjs <out.json>
import fs from "fs";
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], FEET = ["L", "R"];
const PSTAR = { ffLockedAxis: true, touchRest: true, lcVff: "lin", lcTouch: { reseed: true } }, CBASE = { ffLockedAxis: true, touchRest: true }, runs = [];
const LIFTS = { X2: { h: 0.002, hover: 1.0, T: 2.0 }, E5: { h: 0.005, hover: 0.5, T: 0.4 }, M10: { h: 0.01, hover: 1.0, T: 0.5 }, E20: { h: 0.02, hover: 1.5, T: 0.6 } };
const FAST = { PF4: { push: { dir: "F", J: 4, t: 9.0, dur: 0.1 } }, PB4: { push: { dir: "B", J: 4, t: 9.0, dur: 0.1 } }, PT4: { push: { dir: "toward", J: 4, t: 9.0, dur: 0.1 } }, PA4: { push: { dir: "away", J: 4, t: 9.0, dur: 0.1 } },
  TUp15: { turn: { deg: 15, t: 9.0, dur: 1.0 } }, TUn15: { turn: { deg: -15, t: 9.0, dur: 1.0 } }, BU3: { bump: { dz: 0.003, t: 9.0 } }, BD3: { bump: { dz: -0.003, t: 9.0 } } };
const add = (o) => runs.push(o);
for (const body of BODIES) for (const foot of FEET) for (const drop of [0.010, 0.015, 0.020, 0.025, 0.030]) for (const ramp of [3, 4, 6]) for (const r of [0, 0.02])
  add({ set: "REL", id: `REL_${body}_${foot}_d${drop}_R${ramp}_r${r}`, body, foot, drop, r, ramp, end: 3 + ramp + 4, flags: PSTAR });
for (const body of BODIES) for (const foot of FEET) add({ set: "REL0", id: `REL0_${body}_${foot}_d0_R2`, body, foot, drop: 0, r: 0, ramp: 2, end: 9, flags: PSTAR });
for (const body of BODIES) for (const foot of FEET) for (const drop of [0.015, 0.025]) for (const [ln, lift] of Object.entries(LIFTS))
  add({ set: "LIFT", id: `LIFT_${body}_${foot}_d${drop}_${ln}`, body, foot, drop, r: 0, ramp: 4, lift, liftName: ln, end: 13.5 + 2 * lift.T + lift.hover + 1, flags: PSTAR });
for (const [arm, flags] of [["P", PSTAR], ["C", CBASE]]) for (const body of BODIES) for (const foot of FEET) for (const [fn, sc] of Object.entries(FAST))
  add({ set: "FAST", arm, fast: fn, id: `FAST_${body}_${foot}_${fn}_${arm}`, body, foot, drop: 0.025, r: 0, ramp: 4, end: 13, ...sc, flags });
for (const hz of [180, 480]) for (const body of BODIES) { add({ set: "RATE", id: `RATE_${body}_L_E5_hz${hz}`, body, foot: "L", drop: 0.025, r: 0, ramp: 4, lift: LIFTS.E5, liftName: "E5", hz, end: 13.5 + 0.8 + 0.5 + 1, flags: PSTAR });
  add({ set: "RATE", id: `RATE_${body}_L_TUp15_hz${hz}`, body, foot: "L", drop: 0.025, r: 0, ramp: 4, ...FAST.TUp15, hz, end: 13, flags: PSTAR }); }
for (const rep of [1, 2]) { add({ set: "DET", id: `DET_E5_V2-REF_L_rep${rep}`, body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, lift: LIFTS.E5, liftName: "E5", end: 15.8, flags: PSTAR });
  add({ set: "DET", id: `DET_TUp15_V2-REF_L_rep${rep}`, body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, ...FAST.TUp15, end: 13, flags: PSTAR });
  add({ set: "DET", id: `DET_PA4_V2-REF_R_rep${rep}`, body: "V2-REF", foot: "R", drop: 0.025, r: 0, ramp: 4, ...FAST.PA4, end: 13, flags: PSTAR }); }
add({ set: "W", id: "W_E5_V2-REF_L", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, lift: LIFTS.E5, liftName: "E5", end: 15.8, flags: PSTAR });
add({ set: "W", id: "W_TUn15_V2-REF_R", body: "V2-REF", foot: "R", drop: 0.025, r: 0, ramp: 4, ...FAST.TUn15, end: 13, flags: PSTAR });
add({ set: "W", id: "W_PT4_V2-REF_L", body: "V2-REF", foot: "L", drop: 0.025, r: 0, ramp: 4, ...FAST.PT4, end: 13, flags: PSTAR });
// REPRO (scope): official touch-rest entries re-run with their own (C) flags — the new code must be inactive without its flags (hash-identical to touch_semantics/evidence)
const TR = JSON.parse(fs.readFileSync(new URL("../../../../review_artifacts/physical_character_v2/touch_semantics/manifest.json", import.meta.url)));
for (const id of ["L_V2-REF_L_d0.025_r0_R4_B1TR_L0.005", "XP_V2-198-92_R_d0.025_r0_R4_B1TR_paway5@8", "P_V2-short-legs_R_d0.03_r0_R8_B1TR"]) { const tr = TR.runs.find(r => r.id === id); add({ ...tr, set: "REPRO", id: `REPRO_${id}`, touchrestId: id }); }
if (new Set(runs.map(r => r.id)).size !== runs.length) throw new Error("duplicate ids");
const counts = runs.reduce((a, r) => ((a[r.set] = (a[r.set] || 0) + 1), a), {});
fs.writeFileSync(process.argv[2], JSON.stringify({ generated: "tools/preswing_manifest.mjs", prereg: "preswing/PRESWING_VALIDATION_PREREG.md §2", candidate: PSTAR, baselineC: CBASE, counts, total: runs.length, runs }, null, 1));
console.log(`manifest: ${runs.length} runs ${JSON.stringify(counts)}`);
