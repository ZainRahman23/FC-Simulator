// speed99/tools/s_cpu.mjs — THE PACE CPU BENCHMARK (owner §26), BALL OFF: each pace profile on identical seeded torture input (8 programs × 60 s):
// per simulated second — the whole simulation step, the decision (replan), the movement (mkPlan: the root path integrated by advance()), the
// support plan (gaitFrom), the body (the pose drawn at 60 fps) — and the tick tail (p99, p99.9, the worst). Inclusive times; one wrapper per method
//   node s_cpu.mjs [--pace CURRENT,A,B,C] [--seeds 8] [--dur 60]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { ControlledSim, presetLayers } from "../c_sim.js";
import { PlayBody } from "../u_body.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 8), dur = +opt("dur", 60);
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const T = {}, depth = {}; const wrap = (proto, m, g) => { let o = proto; while (o && !Object.prototype.hasOwnProperty.call(o, m)) o = Object.getPrototypeOf(o); if (!o) return; const f = o[m];
  o[m] = function (...a) { depth[m] = (depth[m] || 0) + 1; const t0 = depth[m] === 1 ? performance.now() : 0; try { return f.apply(this, a); } finally { if (depth[m] === 1) T[g] = (T[g] || 0) + performance.now() - t0; depth[m]--; } }; };
wrap(ControlledSim.prototype, "replan", "decision"); wrap(ControlledSim.prototype, "mkPlan", "movement"); wrap(ControlledSim.prototype, "gaitFrom", "support");
for (const pace of opt("pace", "CURRENT,A,B,C").split(",")) { for (const k of Object.keys(T)) delete T[k]; let whole = 0, body = 0; const ticks = [];
  for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), ballOn: false, pace })), B = new PlayBody(env, sim);
    for (let k = 0; k < Math.round(dur / DT); k++) { const a = performance.now(); sim.step(P.req(k * DT)); const w = performance.now() - a; whole += w; ticks.push(w); if (k % 4 === 0) { const b = performance.now(); B.pose(sim.t); body += performance.now() - b; } } }
  const S = seeds * dur; ticks.sort((a, b) => a - b); const q = (x) => ticks[Math.floor(x * (ticks.length - 1))];
  console.log(`■ ${pace.padEnd(7)} ${(whole / S).toFixed(1)} ms per simulated second (whole step) · decision ${((T.decision || 0) / S).toFixed(1)} · movement ${((T.movement || 0) / S).toFixed(1)} · support ${((T.support || 0) / S).toFixed(1)} · body (60 fps pose) ${(body / S).toFixed(1)} · tick p99 ${q(0.99).toFixed(2)} ms, p99.9 ${q(0.999).toFixed(2)} ms, worst ${ticks[ticks.length - 1].toFixed(1)} ms`); }
