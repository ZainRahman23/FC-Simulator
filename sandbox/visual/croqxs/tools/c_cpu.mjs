// tc_controlled1/tools/c_cpu.mjs — THE CPU BENCHMARK (owner §23): FULL-FREE vs FULL-CONTROLLED on identical seeded torture input (simulation only):
// per simulated second — the whole simulation, the decision (replan), contact planning (carryTouches, genericBuild, instantiate), support planning
// (gaitFrom), the controlled-ball evaluation (contOf, possCost, footReach, the fallback), the opponent collision (opponentStep, with a probe
// every few seconds) — and the worst single tick. Inclusive times (a method's callees inside it); each method timed by a wrapper on the prototype.
//   node c_cpu.mjs [--seeds 8] [--dur 60]
import { makeSim, DT } from "./u_env.mjs";
import { ControlledSim, presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 8), dur = +opt("dur", 60);
const T = {}, depth = {}, proto = ControlledSim.prototype;
const groups = { decision: ["replan"], contacts: ["carryTouches", "genericBuild", "instantiate"], support: ["gaitFrom"], controlled: ["contOf", "possCost", "footReach", "fallback", "possStep"], collision: ["opponentStep"] };
for (const [g, L] of Object.entries(groups)) for (const m of L) { let o = proto; while (o && !Object.prototype.hasOwnProperty.call(o, m)) o = Object.getPrototypeOf(o); if (!o) continue; const f = o[m];
  proto[m] = function (...a) { const k = g + "." + m; depth[k] = (depth[k] || 0) + 1; const t0 = performance.now(); try { return f.apply(this, a); } finally { depth[k]--; if (!depth[k]) T[k] = (T[k] || 0) + performance.now() - t0; } }; }
for (const control of ["FREE", "CONTROLLED"]) { for (const k of Object.keys(T)) delete T[k]; let all = 0, worst = 0; const secs = seeds * (dur - 0);
  for (let s = 1; s <= seeds; s++) { const P = program(500 + s, dur), opp = []; for (let x = 5; x < dur; x += 7) opp.push({ id: "c" + x, kind: "tackle", t0: x, t1: x + 0.3, p0: [52.5, 34], v: [0, 0], r: 0.07, z: 0.1, e: 0.55 });
    const sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control, opponent: opp }));
    for (let k = 0; k < Math.round(dur / DT); k++) { const t0 = performance.now(); sim.step(P.req(k * DT)); const w = performance.now() - t0; all += w; if (w > worst) worst = w; } }
  const per = (x) => (x / secs).toFixed(2); console.log(`■ ${control}: ${per(all)} ms per simulated second (whole step), worst tick ${worst.toFixed(1)} ms · ` + Object.entries(T).sort().map(([k, v]) => `${k} ${per(v)}`).join(" · ")); }
