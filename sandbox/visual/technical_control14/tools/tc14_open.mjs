// technical_control14/tools/tc14_open.mjs — OPEN AND TIGHT CARRYING (owner §7, §8): touches per second, the median gap, the footfalls between touches,
// straight 5.5 m/s · open sprint 7.5 m/s · acceleration into space · the tight left-right sequence, Dribbling 99 / 80 / 50, TECHNICAL-CONTROL-1.2 vs 1.4.
//   node tc14_open.mjs <out.json>
import fs from "fs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeEff } from "./tc14_env.mjs"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs";
const rows = [];
for (const base of ["STRAIGHT", "TURN0_V7.5", "ACCEL", "LR"]) for (const d of [99, 80, 50]) for (const [nm, mk] of [["tc12", makeCarry], ["tc14", makeEff]]) {
  const cs = anyCase(`${base}_B99_D${d}_A99`, 1), S = mk(cs, { seed: 1 }); S.run(); const ep = S.rc2.ep, C = ep.contacts.filter((c) => c.t >= 0.5), dur = cs.scenario.dur - 0.525;
  const gaps = C.slice(1).map((c, i) => c.t - C[i].t).sort((a, b) => a - b), steps = (ep.carryLog || []).filter((x) => x.t >= 0.5).map((x) => x.n).sort((a, b) => a - b);
  rows.push({ section: base, dri: d, model: nm, touchesPerS: +(C.length / dur).toFixed(2), medianGapS: gaps.length ? +gaps[gaps.length >> 1].toFixed(2) : null, footfallsBetween: steps.length ? steps[steps.length >> 1] : null, feet: C.map((c) => c.F).join("") }); }
fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1)); console.log(rows.length);
