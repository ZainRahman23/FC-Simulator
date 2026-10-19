// technical_control12/tools/tc12_cpu.mjs — the carry model's cost: TECHNICAL-CONTROL-1's simulation vs TECHNICAL-CONTROL-1.2's (animation off), per simulated second
// and the worst 240 Hz step, over the carry course × the reference players (second pass, warm).   node tc12_cpu.mjs <out.json>
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry } from "./tc12_carry.mjs"; import { CARRY_SECTIONS, PLAYERS, carryId } from "../tc12_cases.js";
const rows = [], now = () => performance.now();
for (const pass of [0, 1]) for (const s of CARRY_SECTIONS) for (const p of PLAYERS) for (const m of ["old", "new"]) { const cs = anyCase(carryId(s, p), 1), S = m === "old" ? makeTech(cs, { seed: 1, foot: p.foot }) : makeCarry(cs, { seed: 1, foot: p.foot }), n = Math.round(cs.scenario.dur * 240);
  let worst = 0; const t0 = now(); for (let i = 0; i < n && !S.fault; i++) { const a = now(); S.step(); worst = Math.max(worst, now() - a); } if (pass) rows.push({ sec: s.key, player: p.key, model: m, msPerSimS: +((now() - t0) / cs.scenario.dur).toFixed(1), worstStepMs: +worst.toFixed(1) }); }
const agg = (m, k) => { const a = rows.filter((r) => r.model === m).map((r) => r[k]).sort((x, y) => x - y); return { median: a[a.length >> 1], max: a[a.length - 1] }; };
const summary = { old: { msPerSimS: agg("old", "msPerSimS"), worstStepMs: agg("old", "worstStepMs") }, new: { msPerSimS: agg("new", "msPerSimS"), worstStepMs: agg("new", "worstStepMs") } };
fs.writeFileSync(process.argv[2] || "tc12_cpu.json", JSON.stringify({ note: "animation off; second pass; one Node process, nothing else running", summary, rows }, null, 1)); console.log(JSON.stringify(summary));
