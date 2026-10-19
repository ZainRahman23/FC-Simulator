// technical_control12/tools/tc12_sweep.mjs — the carry metrics over the reference course × players × {TECHNICAL-CONTROL-1 (old), TECHNICAL-CONTROL-1.2}
// × seeds.   node tc12_sweep.mjs <out.jsonl> [ratings 99] [seeds 1,2,3]
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry, carryMetrics } from "./tc12_carry.mjs";
import { CARRY_SECTIONS, PLAYERS, carryId } from "../tc12_cases.js";
const out = process.argv[2], rt = +(process.argv[3] || 99), seeds = (process.argv[4] || "1,2,3").split(",").map(Number), fd = fs.openSync(out, "a");
for (const s of CARRY_SECTIONS) for (const p of PLAYERS) for (const seed of seeds) for (const model of ["old", "new"]) { const id = carryId(s, p, [rt, rt, rt]), cs = anyCase(id, seed), o = { seed, foot: p.foot };
  let r; try { const S = model === "old" ? makeTech(cs, o) : makeCarry(cs, o); S.run(); r = carryMetrics(S, p.foot === "B" ? null : p.foot); } catch (e) { r = { error: String(e).slice(0, 200) }; }
  fs.writeSync(fd, JSON.stringify(Object.assign({ sec: s.key, player: p.key, id, seed, model, ratings: rt }, r)) + "\n"); }
