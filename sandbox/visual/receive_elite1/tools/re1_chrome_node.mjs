// receive_elite1/tools/re1_chrome_node.mjs — the Node side of the Chrome = Node check: the lab's fingerprint (ball + body centre every tick, the touch ticks)
//   node re1_chrome_node.mjs <out.json> <ids with ratings>
import fs from "fs"; import { makeElite, makeCurrent } from "./re1_env.mjs"; import { parseCase } from "../re1_cases.js";
const out = {}; for (const spec of process.argv[3].split(",")) { const [id, pipe] = spec.split("@"), cs = parseCase(id), S = (pipe === "CURRENT" ? makeCurrent : makeElite)(cs, { seed: 1, opts: { recViewer: true } }); S.run(cs.scenario.dur);
  let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); out[spec] = h.toString(16); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(Object.keys(out).length);
