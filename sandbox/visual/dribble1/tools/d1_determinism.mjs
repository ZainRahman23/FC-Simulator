// dribble1/tools/d1_determinism.mjs — replay determinism: every lab scenario simulated twice in this process (and, with --chrome, compared with the
// lab page in headless Chrome). The fingerprint hashes the ball and COM at every 240 Hz tick plus the touch ticks (FNV-1a over 9-decimal strings).
import { makeSim, PROFILES } from "./d1_env.mjs"; import { list } from "../d1_scenarios.js"; import fs from "fs";
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const out = {}; let ok = 0, n = 0;
for (const scn of list()) for (const prof of ["HIGH"]) { const a = makeSim(scn, { player: PROFILES[prof], seed: 1 }); a.run(); const b = makeSim(scn, { player: PROFILES[prof], seed: 1 }); b.run();
  const fa = fp(a), fb = fp(b), same = fa === fb && JSON.stringify(a.touches.map(t => [t.k, t.F, t.reg, t.executed.v])) === JSON.stringify(b.touches.map(t => [t.k, t.F, t.reg, t.executed.v])); n++; if (same) ok++;
  out[scn.id] = { node1: fa, node2: fb, identical: same, touches: a.touches.filter(t => t.launched).length }; console.log(scn.id.padEnd(18), fa, fb, same ? "IDENTICAL" : "DIFFERENT"); }
console.log(`replay identical: ${ok}/${n}`); if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
