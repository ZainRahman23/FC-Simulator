// technical_control13/tools/tc13_cpu.mjs — the transition body's cost: TECHNICAL-CONTROL-1.2's simulation (animation off), with TECHNICAL-CONTROL-1.1's
// legs (before) and with TECHNICAL-CONTROL-1.3's FlowBody (after), per simulated second and the worst 240 Hz step, over the transition torture set
// at 99 (second pass, warm).   node tc13_cpu.mjs <out.json>
import fs from "fs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs"; import { LegBody } from "../../technical_control11/tc11_body.js";
import { tortureIds, specId } from "../tc13_cases.js"; import { makeFlow } from "./tc13_phase.mjs"; import { FlowBody } from "../tc13_body.js";
const rows = [], now = () => performance.now();
for (const pass of [0, 1]) for (const j of tortureIds()) for (const m of ["sim", "tc11", "tc13"]) { const s = specId(j.spec, [99, 99, 99]), cs = anyCase(s.id, 1), o = { seed: 1, foot: s.foot, style: s.style || undefined };
  const S = m === "sim" ? makeCarry(cs, o) : m === "tc11" ? makeCarry(cs, Object.assign({ anim: true, Body: LegBody }, o)) : makeFlow(cs, Object.assign({ anim: true, Body: FlowBody }, o)), n = Math.round(cs.scenario.dur * 240); S._tc11cache = S._tc11cache || new Map();
  let worst = 0; const t0 = now(); for (let i = 0; i < n && !S.fault; i++) { const a = now(); S.step(); worst = Math.max(worst, now() - a); } if (pass) rows.push({ spec: j.spec, body: m, msPerSimS: +((now() - t0) / cs.scenario.dur).toFixed(1), worstStepMs: +worst.toFixed(1) }); }
const agg = (m, k) => { const a = rows.filter((r) => r.body === m).map((r) => r[k]).sort((x, y) => x - y); return { median: a[a.length >> 1], max: a[a.length - 1] }; };
const summary = Object.fromEntries(["sim", "tc11", "tc13"].map((m) => [m, { msPerSimS: agg(m, "msPerSimS"), worstStepMs: agg(m, "worstStepMs") }]));
fs.writeFileSync(process.argv[2] || "tc13_cpu.json", JSON.stringify({ note: "sim = TC1.2 simulation, animation off; tc11 = + TC1.1's legs (before); tc13 = FlowSim + FlowBody (after); second pass; one Node process", summary, rows }, null, 1)); console.log(JSON.stringify(summary));
