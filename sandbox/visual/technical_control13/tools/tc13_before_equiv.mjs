// technical_control13/tools/tc13_before_equiv.mjs — the BEFORE body is TECHNICAL-CONTROL-1.2's as committed: TECHNICAL-CONTROL-1.3 added default-neutral
// hooks to TECHNICAL-CONTROL-1.1's tc11_body.js (heelStart, heelFinal, reachWeight, pivotOnEdge, the per-simulation contact-pose cache); with none
// set, the posed skeleton must be the committed file's, frame by frame. Run once per module (a fresh process each).
//   node tc13_before_equiv.mjs <tc11_body module path> <out.json>
import fs from "fs"; import { pathToFileURL } from "url"; import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs"; import { tortureIds, specId } from "../tc13_cases.js";
const { LegBody } = await import(pathToFileURL(process.argv[2]).href), out = {};
for (const { spec } of tortureIds()) { const s = specId(spec, [99, 99, 99]), cs = anyCase(s.id, 1), S = makeCarry(cs, { seed: 1, foot: s.foot, style: s.style || undefined, anim: true, Body: LegBody }), n = Math.round(cs.scenario.dur * 240); let h = 2166136261 >>> 0, frames = 0;
  for (let i = 0; i < n && !S.fault; i++) { S.step(); const m = S.A && S.A.skinMats; if (!m) continue; frames++; for (let k = 0; k < m.length; k++) { const q = m[k].toFixed(7); for (let c = 0; c < q.length; c++) { h ^= q.charCodeAt(c); h = Math.imul(h, 16777619) >>> 0; } } }
  out[spec] = { posed: h.toString(16), frames }; }
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1)); console.log(Object.keys(out).length, "cases");
