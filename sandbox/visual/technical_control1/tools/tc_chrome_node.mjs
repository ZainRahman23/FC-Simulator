// technical_control1/tools/tc_chrome_node.mjs — the Node side of CHROME = NODE: the lab's fingerprint (ball + body centre every tick, the touch ticks)
//   node tc_chrome_node.mjs <out.json> <specs: id_B##_D##_A##[@style[@foot]] ,…>
import fs from "fs"; import { makeTech } from "./tc_env.mjs"; import { anyCase } from "../tc_course.js";
const out = {}; for (const spec of process.argv[3].split(",")) { const [id, style, foot] = spec.split("@"), cs = anyCase(id, 1), S = makeTech(cs, { seed: 1, style: style || "NEUTRAL", ratings: cs.ratings, foot: foot || undefined, opts: { recViewer: true } }); S.run(cs.scenario.dur);
  let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); out[spec] = h.toString(16); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(Object.keys(out).length);
