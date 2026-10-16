// dribble1/tools/d1_fingerprint.mjs — the lab page's determinism fingerprint (FNV-1a over ball + COM at every tick and the touch ticks), in Node.
// usage: node d1_fingerprint.mjs <SCENARIO> [arch] [profile] [seed]  → must equal the page's "fingerprint" for the same URL parameters
import { makeSim, PROFILES } from "./d1_env.mjs"; import { get } from "../d1_scenarios.js";
const [id = "STRAIGHT_RUN", arch = "B", prof = "HIGH", seed = "1"] = process.argv.slice(2);
const S = makeSim(get(id), { arch, player: PROFILES[prof], seed: +seed, opts: { recViewer: !!process.env.VIEWER } }); S.run();
let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k);
console.log(id, arch, prof, seed, "fingerprint", h.toString(16), "touches", S.touches.filter(t => t.launched).length);
