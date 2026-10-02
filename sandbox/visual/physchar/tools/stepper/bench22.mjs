// ═══ physchar/tools/stepper/bench22.mjs — the Physical Stepper's PLANNING COST, 22-player worst case (Part 19) ═══════════════════════════
// Times StepPlanner.decide on recorded step-start states (the oracle logs), per configuration (horizon 1, 1 + terminal value, 2). Worst case:
// all 22 players decide in the same frame. Also reported: the per-character physics + controller tick (for scale — the planner is a small
// fraction of it). usage: node tools/stepper/bench22.mjs --model m.json [--V v.json] <oracle json files…>
import fs from "fs"; import { StepPlanner } from "../../pc_stepper.js";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const M = JSON.parse(fs.readFileSync(arg("--model"), "utf8")), V = arg("--V", null) ? JSON.parse(fs.readFileSync(arg("--V"), "utf8")) : null;
const files = process.argv.slice(2).filter(a => a.endsWith(".json") && !a.includes(arg("--model")) && (!arg("--V", null) || !a.includes(arg("--V")))), states = [];
for (const f of files) { const D = JSON.parse(fs.readFileSync(f, "utf8")); for (const R of D.results || []) for (const s of R.steps) if (s.z && s.uc) states.push({ z: s.z, uc: s.uc }); }
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; }, out = {};
for (const [name, cfg] of [["h1", { horizon: 1 }], ...(V ? [["h1+V", { horizon: 1, V }]] : []), ["h2 beam3", { horizon: 2, beam: 3 }], ["h2 beam3 center both", { horizon: 2, beam: 3, center: "both" }]]) {
  const SP = new StepPlanner({ model: M, ...cfg }), T = []; for (let rep = 0; rep < 3; rep++) for (const s of states) { const t0 = performance.now(); SP.decide(s.z, { vReq: 0.5, dl0: s.uc[1] }, s.uc); if (rep) T.push(performance.now() - t0); }
  const mean = T.reduce((a, b) => a + b, 0) / T.length, p99 = q(T, 0.99), d = SP.decide(states[0].z, { vReq: 0.5, dl0: states[0].uc[1] }, states[0].uc);
  out[name] = { n: T.length, meanMs: mean, p99Ms: p99, maxMs: Math.max(...T), evals: d.n1 + d.n2, worst22FrameMs: 22 * p99, perSecond22Ms: 22 * 1.8 * mean };
  console.log(`${name.padEnd(22)} | ${d.n1 + d.n2} model evaluations / decision | mean ${mean.toFixed(3)} ms · p99 ${p99.toFixed(3)} ms · max ${Math.max(...T).toFixed(2)} ms | 22 players: same-frame worst ${(22 * p99).toFixed(2)} ms · per second (1.8 steps/s each) ${(22 * 1.8 * mean).toFixed(1)} ms`); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify(out, null, 1));
