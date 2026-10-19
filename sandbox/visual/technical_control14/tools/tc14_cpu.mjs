// technical_control14/tools/tc14_cpu.mjs — the efficiency layer's cost: TECHNICAL-CONTROL-1.2's simulation and TECHNICAL-CONTROL-1.4's (animation off),
// and each with TECHNICAL-CONTROL-1.3's / 1.4's body, per simulated second and the worst 240 Hz step, the efficiency set at 99 (second pass, warm).
//   node tc14_cpu.mjs <out.json>
import fs from "fs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs"; import { makeFlow } from "../../technical_control13/tools/tc13_phase.mjs";
import { FlowBody } from "../../technical_control13/tc13_body.js"; import { makeEff } from "./tc14_env.mjs"; import { ANGLES } from "./tc14_eff.mjs";
const rows = [], now = () => performance.now(), K = { sim12: (cs, o) => makeCarry(cs, o), sim14: (cs, o) => makeEff(cs, o), anim12: (cs, o) => makeFlow(cs, Object.assign({ anim: true, Body: FlowBody }, o)), anim14: (cs, o) => makeEff(cs, Object.assign({ anim: true }, o)) };
for (const pass of [0, 1]) for (const ang of ANGLES) for (const seed of [1, 2]) for (const [m, mk] of Object.entries(K)) { const cs = anyCase(`CUT${ang}_B99_D99_A99`, seed), S = mk(cs, { seed }), n = Math.round(cs.scenario.dur * 240); S._tc11cache = S._tc11cache || new Map();
  let worst = 0; const t0 = now(); for (let i = 0; i < n && !S.fault; i++) { const a = now(); S.step(); worst = Math.max(worst, now() - a); } if (pass) rows.push({ ang, seed, m, msPerSimS: +((now() - t0) / cs.scenario.dur).toFixed(1), worstStepMs: +worst.toFixed(1) }); }
const agg = (m, k) => { const a = rows.filter((r) => r.m === m).map((r) => r[k]).sort((x, y) => x - y); return { median: a[a.length >> 1], max: a[a.length - 1] }; };
const summary = Object.fromEntries(Object.keys(K).map((m) => [m, { msPerSimS: agg(m, "msPerSimS"), worstStepMs: agg(m, "worstStepMs") }]));
fs.writeFileSync(process.argv[2] || "tc14_cpu.json", JSON.stringify({ note: "sim12/sim14: TC1.2 / TC1.4 simulation, animation off; anim12: TC1.2 + TC1.3 FlowBody; anim14: TC1.4 + ChopBody; second pass; one Node process", summary, rows }, null, 1)); console.log(JSON.stringify(summary));
