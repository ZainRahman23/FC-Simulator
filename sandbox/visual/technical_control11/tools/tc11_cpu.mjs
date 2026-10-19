// technical_control11/tools/tc11_cpu.mjs — the presentation body's cost: the same simulation with animation off, with TECHNICAL-CONTROL-1's body and
// with TECHNICAL-CONTROL-1.1's (per simulated second, and the worst single 240 Hz step — a re-plan builds a body: the contact searches run then)
//   node tc11_cpu.mjs <out.json>
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase } from "../../technical_control1/tc_course.js"; import { bodyClass } from "./tc11_diag.mjs"; import { FEET_SET, caseId } from "../tc11_cases.js";
const B = { off: null, tc1: await bodyClass("tc1"), tc11: await bodyClass("tc11") }, rows = [], now = () => performance.now();
for (const pass of [0, 1]) for (const e of FEET_SET) { const id = caseId(e, [99, 99, 99]); for (const k of ["off", "tc1", "tc11"]) { const cs = anyCase(id, e.seed), S = makeTech(cs, { seed: e.seed, foot: e.foot, anim: k !== "off", Body: B[k] }), n = Math.round(cs.scenario.dur * 240);
    let worst = 0; const t0 = now(); for (let i = 0; i < n && !S.fault; i++) { const a = now(); S.step(); worst = Math.max(worst, now() - a); } const ms = now() - t0; if (pass) rows.push({ key: e.key, body: k, msPerSimS: +(ms / cs.scenario.dur).toFixed(1), worstStepMs: +worst.toFixed(1) }); } }
const agg = (k, f) => { const a = rows.filter((r) => r.body === k).map(f).sort((x, y) => x - y); return { median: a[a.length >> 1], max: a[a.length - 1] }; };
const summary = Object.fromEntries(["off", "tc1", "tc11"].map((k) => [k, { msPerSimS: agg(k, (r) => r.msPerSimS), worstStepMs: agg(k, (r) => r.worstStepMs) }]));
fs.writeFileSync(process.argv[2] || "tc11_cpu.json", JSON.stringify({ note: "second pass (warm caches: the RUN-1 grid, the channel tables); one Node process, nothing else running", summary, rows }, null, 1)); console.log(JSON.stringify(summary));
